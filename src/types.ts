/** 理解维度类型 */
export type Dimension = string;

/** 对话消息 */
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Twin 信号 — 从对话中提取的用户特征 */
export interface TwinSignal {
  dimension: string;
  insight: string;
  confidence: number;
  xp: number;
  source: string;
}

/** Twin 记录 */
export interface Twin {
  id: string;
  userId: string;
  type: string;
  profile: Record<string, string>;
  level: number;
  tier: number;
  totalXp: number;
  dimensions: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/** 创建 Twin 的输入 */
export interface CreateTwinInput {
  userId: string;
  type?: string;
  profile?: Record<string, string>;
  dimensionKeys?: string[];
}

/** XP 日志条目 */
export interface XpLogEntry {
  twinId: string;
  xpGained: number;
  source: string;
  dimension: string;
  detail?: string;
  multiplier: number;
  createdAt: string;
}

/** 进化日志条目 */
export interface EvolutionEntry {
  twinId: string;
  fromTier: number;
  toTier: number;
  fromLevel: number;
  toLevel: number;
  triggerDimensions: Record<string, number>;
  dimensionSnapshot: Record<string, number>;
  createdAt: string;
}

/** 段位定义 */
export interface TierDef {
  tier: number;
  name: string;
  nameEn: string;
  minLevel: number;
  maxLevel: number;
  xpPerLevel: number;
  dimCondition: {
    count: number;
    threshold: number;
  };
  extraCondition?: string;
}

/** Twin 画像（getProfile 返回值） */
export interface TwinProfile {
  profile: Record<string, string>;
  level: number;
  tier: number;
  tierName: string;
  tierNameEn: string;
  dimensions: Record<string, number>;
  totalXp: number;
}

/** 用户纠正输入 */
export interface CorrectionInput {
  dimension: string;
  newValue: string;
}

/** createTwin 配置 */
export interface TwinConfig {
  /** AI provider: 字符串快捷方式或 SignalExtractor 实例 */
  provider: "openai" | "anthropic" | "ollama" | SignalExtractor;
  /** 存储: 字符串快捷方式或 StorageAdapter 实例 (默认 'memory') */
  storage?: "memory" | "sqlite" | StorageAdapter;
  /** 理解维度 (默认 8 维度) */
  dimensions?: string[];
  /** 信号提取后的钩子 */
  onSignal?: (signal: TwinSignal) => void;
  /** Provider 配置 (apiKey, model 等) */
  providerOptions?: Record<string, unknown>;
  /** Storage 配置 (path 等) */
  storageOptions?: Record<string, unknown>;
}

/** 存储适配器接口 */
export interface StorageAdapter {
  getTwin(id: string): Promise<Twin | null>;
  getTwinByUser(userId: string, type?: string): Promise<Twin | null>;
  createTwin(input: CreateTwinInput): Promise<Twin>;
  updateTwin(id: string, updates: Partial<Twin>): Promise<void>;
  logXp(entry: XpLogEntry): Promise<void>;
  logEvolution(entry: EvolutionEntry): Promise<void>;
}

/** 信号提取器接口 */
export interface SignalExtractor {
  extract(
    messages: Message[],
    existingProfile?: Record<string, string>,
    dimensions?: string[]
  ): Promise<TwinSignal[]>;
}
