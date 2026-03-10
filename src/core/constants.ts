import type { TierDef } from "../types.js";

/** 默认 8 理解维度 */
export const DIMENSIONS = [
  "personality",
  "values",
  "decision",
  "aesthetics",
  "communication",
  "knowledge",
  "prediction",
  "boundaries",
] as const;

/** 维度中文名 */
export const DIMENSION_LABELS: Record<string, string> = {
  personality: "人格",
  values: "价值观",
  decision: "决策",
  aesthetics: "审美",
  communication: "沟通",
  knowledge: "知识",
  prediction: "预测",
  boundaries: "边界",
};

/** 7 层段位定义 */
export const TIERS: TierDef[] = [
  {
    tier: 1,
    name: "初见",
    nameEn: "Stranger",
    minLevel: 1,
    maxLevel: 9,
    xpPerLevel: 100,
    dimCondition: { count: 0, threshold: 0 },
  },
  {
    tier: 2,
    name: "轮廓",
    nameEn: "Sketch",
    minLevel: 10,
    maxLevel: 29,
    xpPerLevel: 150,
    dimCondition: { count: 3, threshold: 20 },
  },
  {
    tier: 3,
    name: "理解",
    nameEn: "Understand",
    minLevel: 30,
    maxLevel: 49,
    xpPerLevel: 250,
    dimCondition: { count: 5, threshold: 35 },
  },
  {
    tier: 4,
    name: "默契",
    nameEn: "Sync",
    minLevel: 50,
    maxLevel: 74,
    xpPerLevel: 400,
    dimCondition: { count: 6, threshold: 50 },
  },
  {
    tier: 5,
    name: "镜像",
    nameEn: "Mirror",
    minLevel: 75,
    maxLevel: 99,
    xpPerLevel: 600,
    dimCondition: { count: 8, threshold: 60 },
  },
  {
    tier: 6,
    name: "共生",
    nameEn: "Symbiosis",
    minLevel: 100,
    maxLevel: 149,
    xpPerLevel: 1000,
    dimCondition: { count: 8, threshold: 75 },
    extraCondition: "预测准确率 >= 70%",
  },
  {
    tier: 7,
    name: "超越",
    nameEn: "Transcend",
    minLevel: 150,
    maxLevel: Infinity,
    xpPerLevel: 1500,
    dimCondition: { count: 8, threshold: 85 },
    extraCondition: "自主进化被用户采纳 >= 10 次",
  },
];

/** 蜕变加速倍率 */
export const EVOLUTION_MULTIPLIERS: Record<
  number,
  { multiplier: number; maxJump: number }
> = {
  2: { multiplier: 3, maxJump: 5 },
  3: { multiplier: 3, maxJump: 8 },
  4: { multiplier: 4, maxJump: 10 },
  5: { multiplier: 4, maxJump: 12 },
  6: { multiplier: 5, maxJump: 15 },
  7: { multiplier: 5, maxJump: 20 },
};

/** XP 来源范围 */
export const XP_RANGES: Record<string, { min: number; max: number }> = {
  conversation: { min: 5, max: 15 },
  correction: { min: 20, max: 30 },
  preference: { min: 10, max: 10 },
  prediction: { min: 25, max: 50 },
  decision: { min: 15, max: 25 },
  self_eval: { min: 10, max: 10 },
};
