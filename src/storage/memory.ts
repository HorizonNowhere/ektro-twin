/**
 * MemoryAdapter — 零配置内存存储
 *
 * 数据存在 Map 中，进程结束即丢失。适合开发和测试。
 */

import type {
  StorageAdapter,
  Twin,
  CreateTwinInput,
  XpLogEntry,
  EvolutionEntry,
} from "../types.js";

let idCounter = 0;
function genId(): string {
  return `twin_${Date.now()}_${++idCounter}`;
}

export class MemoryAdapter implements StorageAdapter {
  private twins = new Map<string, Twin>();
  private twinsByUser = new Map<string, string>(); // userId → twinId
  private xpLogs: XpLogEntry[] = [];
  private evolutions: EvolutionEntry[] = [];

  async getTwin(id: string): Promise<Twin | null> {
    return this.twins.get(id) ?? null;
  }

  async getTwinByUser(userId: string, type?: string): Promise<Twin | null> {
    const twinId = this.twinsByUser.get(`${userId}:${type || "core"}`);
    if (!twinId) return null;
    return this.twins.get(twinId) ?? null;
  }

  async createTwin(input: CreateTwinInput): Promise<Twin> {
    const id = genId();
    const now = new Date().toISOString();

    const dimensionKeys = input.dimensionKeys || [];
    const dimensions: Record<string, number> = {};
    for (const key of dimensionKeys) {
      dimensions[key] = 0;
    }

    const twin: Twin = {
      id,
      userId: input.userId,
      type: input.type || "core",
      profile: input.profile || {},
      level: 1,
      tier: 1,
      totalXp: 0,
      dimensions,
      createdAt: now,
      updatedAt: now,
    };

    this.twins.set(id, twin);
    this.twinsByUser.set(`${input.userId}:${twin.type}`, id);
    return twin;
  }

  async updateTwin(id: string, updates: Partial<Twin>): Promise<void> {
    const existing = this.twins.get(id);
    if (!existing) return;
    this.twins.set(id, { ...existing, ...updates });
  }

  async logXp(entry: XpLogEntry): Promise<void> {
    this.xpLogs.push(entry);
  }

  async logEvolution(entry: EvolutionEntry): Promise<void> {
    this.evolutions.push(entry);
  }
}
