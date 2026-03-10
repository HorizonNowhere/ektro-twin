/**
 * Twin Signal Pipeline — 信号提取与双写
 *
 * 从 Ektro 平台 src/lib/twin/signal.ts 提取，
 * AI 直连已替换为 SignalExtractor 接口，OWNER_ID 硬编码已移除。
 */

import type {
  StorageAdapter,
  SignalExtractor,
  TwinSignal,
  Message,
} from "../types.js";
import { addXp, updateProfile } from "./engine.js";

/** 维度 → Profile key 映射（默认一对一，可扩展） */
const DIM_TO_PROFILE: Record<string, string> = {
  personality: "personality",
  values: "values",
  decision: "decision_style",
  aesthetics: "aesthetics",
  communication: "communication",
  knowledge: "knowledge",
  prediction: "prediction",
  boundaries: "boundaries",
};

/**
 * 从对话中提取信号并双写到 Twin
 *
 * 组合：提取信号 → addXp（量化）+ updateProfile（质化）
 */
export async function extractAndFeed(
  adapter: StorageAdapter,
  extractor: SignalExtractor,
  userId: string,
  messages: Message[],
  dimensions?: string[],
  onSignal?: (signal: TwinSignal) => void
): Promise<TwinSignal[]> {
  // 查找用户 Twin
  let twin = await adapter.getTwinByUser(userId, "core");
  if (!twin) return [];

  // 提取信号
  const profile = twin.profile || {};
  const signals = await extractor.extract(messages, profile, dimensions);

  if (signals.length === 0) return [];

  // 双写
  const profileUpdates: Record<string, string> = {};

  for (const signal of signals) {
    // ① 量化更新：XP + 维度分
    await addXp(
      adapter,
      twin.id,
      signal.xp,
      signal.source,
      signal.dimension,
      signal.insight
    );

    // ② 收集 profile 更新
    const profileKey = DIM_TO_PROFILE[signal.dimension] || signal.dimension;
    if (profileUpdates[profileKey]) {
      profileUpdates[profileKey] += `；${signal.insight}`;
    } else {
      profileUpdates[profileKey] = signal.insight;
    }

    // 触发钩子
    onSignal?.(signal);
  }

  // ③ 质化更新：Profile 文本
  if (Object.keys(profileUpdates).length > 0) {
    await updateProfile(adapter, twin.id, profileUpdates);
  }

  return signals;
}

/**
 * 处理用户纠正信号
 *
 * 用户主动修正 = 最高质量信号（confidence=1.0, xp=25）
 */
export async function feedCorrection(
  adapter: StorageAdapter,
  twinId: string,
  corrections: { dimension: string; newValue: string }[]
): Promise<void> {
  if (corrections.length === 0) return;

  for (const correction of corrections) {
    await addXp(
      adapter,
      twinId,
      25,
      "correction",
      correction.dimension,
      correction.newValue
    );
  }

  // 纠正直接覆盖 profile（不是追加）
  const twin = await adapter.getTwin(twinId);
  if (!twin) return;

  const profile = { ...twin.profile };
  for (const correction of corrections) {
    const profileKey =
      DIM_TO_PROFILE[correction.dimension] || correction.dimension;
    profile[profileKey] = correction.newValue;
  }

  await adapter.updateTwin(twinId, {
    profile,
    updatedAt: new Date().toISOString(),
  });
}
