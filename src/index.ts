/**
 * ektro-twin — Digital Twin SDK
 *
 * Every AI remembers. None of them understand. Until now.
 *
 * @example
 * ```ts
 * import { createTwin } from 'ektro-twin'
 *
 * const twin = createTwin({ provider: 'openai' })
 * const signals = await twin.feed('user_1', messages)
 * const profile = await twin.getProfile('user_1')
 * ```
 */

import type { TwinConfig, StorageAdapter, SignalExtractor } from "./types.js";
import { TwinEngine } from "./twin-engine.js";
import { MemoryAdapter } from "./storage/memory.js";
import { SQLiteAdapter } from "./storage/sqlite.js";
import { OpenAIExtractor } from "./providers/openai.js";
import { AnthropicExtractor } from "./providers/anthropic.js";
import { OllamaExtractor } from "./providers/ollama.js";
import { DIMENSIONS } from "./core/constants.js";

/**
 * 创建 TwinEngine 实例 — 唯一入口
 */
export function createTwin(config: TwinConfig): TwinEngine {
  const adapter = resolveStorage(config);
  const extractor = resolveProvider(config);
  const dimensions = config.dimensions || [...DIMENSIONS];

  return new TwinEngine(adapter, extractor, dimensions, config.onSignal);
}

/* ─── 内部：解析 storage 配置 ─── */

function resolveStorage(config: TwinConfig): StorageAdapter {
  const { storage, storageOptions } = config;

  if (storage && typeof storage === "object" && "getTwin" in storage) {
    return storage as StorageAdapter;
  }

  const storageType = (storage as string) || "memory";

  switch (storageType) {
    case "memory":
      return new MemoryAdapter();
    case "sqlite":
      return new SQLiteAdapter(storageOptions as any || {});
    case "supabase":
      throw new Error(
        "For Supabase, pass a SupabaseAdapter instance: storage: new SupabaseAdapter(client)"
      );
    default:
      throw new Error(`Unknown storage type: ${storageType}`);
  }
}

/* ─── 内部：解析 provider 配置 ─── */

function resolveProvider(config: TwinConfig): SignalExtractor {
  const { provider, providerOptions } = config;

  if (provider && typeof provider === "object" && "extract" in provider) {
    return provider as SignalExtractor;
  }

  const providerType = provider as string;

  switch (providerType) {
    case "openai":
      return new OpenAIExtractor(providerOptions as any || {});
    case "anthropic":
      return new AnthropicExtractor(providerOptions as any || {});
    case "ollama":
      return new OllamaExtractor(providerOptions as any || {});
    default:
      throw new Error(`Unknown provider: ${providerType}`);
  }
}

/* ─── 公共导出 ─── */

export { TwinEngine } from "./twin-engine.js";

export type {
  Twin,
  TwinSignal,
  TwinProfile,
  TwinConfig,
  Message,
  CorrectionInput,
  StorageAdapter,
  SignalExtractor,
  TierDef,
  Dimension,
} from "./types.js";

export {
  DIMENSIONS,
  DIMENSION_LABELS,
  TIERS,
  EVOLUTION_MULTIPLIERS,
  XP_RANGES,
} from "./core/constants.js";

export {
  calculateLevel,
  getTierForLevel,
  getLevelProgress,
  checkEvolutionCondition,
} from "./core/engine.js";

export { MemoryAdapter } from "./storage/memory.js";
export { SQLiteAdapter } from "./storage/sqlite.js";
export { SupabaseAdapter } from "./storage/supabase.js";
export { OpenAIExtractor } from "./providers/openai.js";
export { AnthropicExtractor } from "./providers/anthropic.js";
export { OllamaExtractor } from "./providers/ollama.js";
