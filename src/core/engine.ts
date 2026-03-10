/**
 * Twin Core Engine — XP、段位、维度、Profile 核心计算 + 持久化
 *
 * 从 Ektro 平台 src/lib/twin/engine.ts 提取，
 * 所有 Supabase 直连已替换为 StorageAdapter 接口调用。
 */

import type { StorageAdapter, Twin } from "../types.js";
import { TIERS, EVOLUTION_MULTIPLIERS } from "./constants.js";

/* ─── 纯计算函数（零依赖）─── */

/** 根据总 XP 计算等级 */
export function calculateLevel(totalXp: number): number {
  let xp = totalXp;
  let level = 1;

  for (const tierDef of TIERS) {
    const levelsInTier =
      tierDef.maxLevel === Infinity
        ? Infinity
        : tierDef.maxLevel - tierDef.minLevel + 1;

    for (let i = 0; i < levelsInTier; i++) {
      if (xp < tierDef.xpPerLevel) return level;
      xp -= tierDef.xpPerLevel;
      level++;
    }
  }

  return level;
}

/** 根据等级获取当前 Tier 定义 */
export function getTierForLevel(level: number) {
  for (const tierDef of TIERS) {
    if (level >= tierDef.minLevel && level <= tierDef.maxLevel) {
      return tierDef;
    }
  }
  return TIERS[TIERS.length - 1];
}

/** 计算当前等级的 XP 进度 */
export function getLevelProgress(totalXp: number) {
  let xp = totalXp;
  let level = 1;

  for (const tierDef of TIERS) {
    const levelsInTier =
      tierDef.maxLevel === Infinity
        ? Infinity
        : tierDef.maxLevel - tierDef.minLevel + 1;

    for (let i = 0; i < levelsInTier; i++) {
      if (xp < tierDef.xpPerLevel) {
        return { level, currentXp: xp, requiredXp: tierDef.xpPerLevel };
      }
      xp -= tierDef.xpPerLevel;
      level++;
    }
  }

  const t7 = TIERS[TIERS.length - 1];
  return { level, currentXp: xp, requiredXp: t7.xpPerLevel };
}

/** 检查维度是否满足蜕变条件 */
export function checkEvolutionCondition(
  dimensions: Record<string, number>,
  targetTier: number
): { met: boolean; qualifiedDims: string[] } {
  const tierDef = TIERS.find((t) => t.tier === targetTier);
  if (!tierDef) return { met: false, qualifiedDims: [] };

  const qualifiedDims = Object.keys(dimensions).filter(
    (d) => dimensions[d] >= tierDef.dimCondition.threshold
  );

  return {
    met: qualifiedDims.length >= tierDef.dimCondition.count,
    qualifiedDims,
  };
}

/* ─── IO 函数（通过 StorageAdapter）─── */

/** 给分身增加 XP，自动处理升级和蜕变 */
export async function addXp(
  adapter: StorageAdapter,
  twinId: string,
  xpGained: number,
  source: string,
  dimension: string,
  detail?: string
): Promise<{
  newLevel: number;
  newTier: number;
  evolved: boolean;
  evolutionFrom?: number;
}> {
  const twin = await adapter.getTwin(twinId);
  if (!twin) throw new Error(`Twin not found: ${twinId}`);

  const currentTier = twin.tier;
  const dims = { ...twin.dimensions };

  // 检查蜕变加速期
  let multiplier = 1.0;
  const nextTier = currentTier + 1;
  if (nextTier <= 7) {
    const evoCheck = checkEvolutionCondition(dims, nextTier);
    if (evoCheck.met) {
      const evoMult = EVOLUTION_MULTIPLIERS[nextTier];
      if (evoMult) multiplier = evoMult.multiplier;
    }
  }

  const effectiveXp = Math.round(xpGained * multiplier);
  const newTotalXp = twin.totalXp + effectiveXp;

  // 更新维度分数（每次 +1-3，上限 100）
  const dimBoost = Math.min(3, Math.max(1, Math.round(xpGained / 10)));
  dims[dimension] = Math.min(100, (dims[dimension] || 0) + dimBoost);

  // 计算新等级和 Tier
  const newLevel = calculateLevel(newTotalXp);
  let newTier = currentTier;

  // 检查蜕变
  if (nextTier <= 7) {
    const nextTierDef = TIERS.find((t) => t.tier === nextTier)!;
    const evoCheck = checkEvolutionCondition(dims, nextTier);
    if (newLevel >= nextTierDef.minLevel && evoCheck.met) {
      newTier = nextTier;
    }
  }

  const evolved = newTier > currentTier;

  // 记录 XP 日志
  await adapter.logXp({
    twinId,
    xpGained: effectiveXp,
    source,
    dimension,
    detail,
    multiplier,
    createdAt: new Date().toISOString(),
  });

  // 更新分身
  await adapter.updateTwin(twinId, {
    totalXp: newTotalXp,
    level: newLevel,
    tier: newTier,
    dimensions: dims,
    updatedAt: new Date().toISOString(),
  });

  // 记录蜕变
  if (evolved) {
    const evoCheck = checkEvolutionCondition(dims, newTier);
    await adapter.logEvolution({
      twinId,
      fromTier: currentTier,
      toTier: newTier,
      fromLevel: twin.level,
      toLevel: newLevel,
      triggerDimensions: Object.fromEntries(
        evoCheck.qualifiedDims.map((d) => [d, dims[d]])
      ),
      dimensionSnapshot: { ...dims },
      createdAt: new Date().toISOString(),
    });
  }

  return {
    newLevel,
    newTier,
    evolved,
    evolutionFrom: evolved ? currentTier : undefined,
  };
}

/**
 * 更新分身 Profile（追加式，不覆盖）
 *
 * - 相同维度的多次 insight 用分号连接
 * - 前 6 字符匹配去重
 * - 单维度上限 200 字符
 */
export async function updateProfile(
  adapter: StorageAdapter,
  twinId: string,
  updates: Record<string, string>
): Promise<void> {
  const twin = await adapter.getTwin(twinId);
  if (!twin) return;

  const profile = { ...twin.profile };
  let changed = false;

  for (const [key, newInsight] of Object.entries(updates)) {
    const existing = profile[key] || "";

    // 去重：前 6 字符匹配
    if (existing && existing.includes(newInsight.slice(0, 6))) continue;

    // 追加
    const updated = existing ? `${existing}；${newInsight}` : newInsight;
    profile[key] =
      updated.length > 200 ? updated.slice(0, 197) + "..." : updated;
    changed = true;
  }

  if (!changed) return;

  await adapter.updateTwin(twinId, {
    profile,
    updatedAt: new Date().toISOString(),
  });
}
