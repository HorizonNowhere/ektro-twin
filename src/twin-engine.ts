/**
 * TwinEngine — 高层 API，统一入口
 *
 * 开发者只需要和这个类交互。
 */

import type {
  StorageAdapter,
  SignalExtractor,
  Message,
  TwinSignal,
  TwinProfile,
  CorrectionInput,
} from "./types.js";
import { extractAndFeed, feedCorrection } from "./core/signal.js";
import { getTierForLevel } from "./core/engine.js";

export class TwinEngine {
  private adapter: StorageAdapter;
  private extractor: SignalExtractor;
  private dimensions: string[];
  private onSignal?: (signal: TwinSignal) => void;

  constructor(
    adapter: StorageAdapter,
    extractor: SignalExtractor,
    dimensions: string[],
    onSignal?: (signal: TwinSignal) => void
  ) {
    this.adapter = adapter;
    this.extractor = extractor;
    this.dimensions = dimensions;
    this.onSignal = onSignal;
  }

  /**
   * 喂入对话，提取信号，双写到 Twin
   *
   * 如果用户没有 Twin，自动创建。
   */
  async feed(userId: string, messages: Message[]): Promise<TwinSignal[]> {
    // 确保 Twin 存在
    let twin = await this.adapter.getTwinByUser(userId, "core");
    if (!twin) {
      twin = await this.adapter.createTwin({
        userId,
        type: "core",
        dimensionKeys: this.dimensions,
      });
    }

    return extractAndFeed(
      this.adapter,
      this.extractor,
      userId,
      messages,
      this.dimensions,
      this.onSignal
    );
  }

  /**
   * 获取用户画像
   */
  async getProfile(userId: string): Promise<TwinProfile | null> {
    const twin = await this.adapter.getTwinByUser(userId, "core");
    if (!twin) return null;

    const tierDef = getTierForLevel(twin.level);

    return {
      profile: twin.profile,
      level: twin.level,
      tier: twin.tier,
      tierName: tierDef.name,
      tierNameEn: tierDef.nameEn,
      dimensions: twin.dimensions,
      totalXp: twin.totalXp,
    };
  }

  /**
   * 用户纠正画像
   */
  async correct(
    userId: string,
    corrections: CorrectionInput[]
  ): Promise<void> {
    const twin = await this.adapter.getTwinByUser(userId, "core");
    if (!twin) return;

    await feedCorrection(this.adapter, twin.id, corrections);
  }

  /**
   * 重置 Twin 到初始状态
   */
  async reset(userId: string): Promise<void> {
    const twin = await this.adapter.getTwinByUser(userId, "core");
    if (!twin) return;

    const dimensions: Record<string, number> = {};
    for (const key of this.dimensions) {
      dimensions[key] = 0;
    }

    await this.adapter.updateTwin(twin.id, {
      level: 1,
      tier: 1,
      totalXp: 0,
      dimensions,
      profile: {},
      updatedAt: new Date().toISOString(),
    });
  }
}
