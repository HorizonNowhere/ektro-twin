/**
 * SupabaseAdapter — 生产级存储
 *
 * 接受 Supabase 客户端实例，表结构兼容 Ektro 平台的 006_digital_twin.sql。
 */

import type {
  StorageAdapter,
  Twin,
  CreateTwinInput,
  XpLogEntry,
  EvolutionEntry,
} from "../types.js";

/** Supabase 行 → Twin 对象映射 */
function rowToTwin(row: any): Twin {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    profile: row.profile || {},
    level: row.level,
    tier: row.tier,
    totalXp: row.total_xp,
    dimensions: row.dimensions || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseAdapter implements StorageAdapter {
  private supabase: any;

  constructor(supabaseClient: any) {
    if (!supabaseClient) {
      throw new Error(
        "SupabaseAdapter requires a Supabase client instance. Install: npm install @supabase/supabase-js"
      );
    }
    this.supabase = supabaseClient;
  }

  async getTwin(id: string): Promise<Twin | null> {
    const { data } = await this.supabase
      .from("user_twins")
      .select("*")
      .eq("id", id)
      .single();
    return data ? rowToTwin(data) : null;
  }

  async getTwinByUser(userId: string, type?: string): Promise<Twin | null> {
    const { data } = await this.supabase
      .from("user_twins")
      .select("*")
      .eq("user_id", userId)
      .eq("type", type || "core")
      .single();
    return data ? rowToTwin(data) : null;
  }

  async createTwin(input: CreateTwinInput): Promise<Twin> {
    const dimensionKeys = input.dimensionKeys || [];
    const dimensions: Record<string, number> = {};
    for (const key of dimensionKeys) dimensions[key] = 0;

    const { data, error } = await this.supabase
      .from("user_twins")
      .insert({
        user_id: input.userId,
        type: input.type || "core",
        profile: input.profile || {},
        level: 1,
        tier: 1,
        total_xp: 0,
        dimensions,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return rowToTwin(data);
  }

  async updateTwin(id: string, updates: Partial<Twin>): Promise<void> {
    const dbUpdates: Record<string, any> = {};
    if (updates.profile !== undefined) dbUpdates.profile = updates.profile;
    if (updates.level !== undefined) dbUpdates.level = updates.level;
    if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
    if (updates.totalXp !== undefined) dbUpdates.total_xp = updates.totalXp;
    if (updates.dimensions !== undefined)
      dbUpdates.dimensions = updates.dimensions;
    if (updates.updatedAt !== undefined)
      dbUpdates.updated_at = updates.updatedAt;

    if (Object.keys(dbUpdates).length === 0) return;

    await this.supabase.from("user_twins").update(dbUpdates).eq("id", id);
  }

  async logXp(entry: XpLogEntry): Promise<void> {
    await this.supabase.from("twin_xp_logs").insert({
      twin_id: entry.twinId,
      xp_gained: entry.xpGained,
      source: entry.source,
      dimension: entry.dimension,
      detail: entry.detail || null,
      multiplier: entry.multiplier,
    });
  }

  async logEvolution(entry: EvolutionEntry): Promise<void> {
    await this.supabase.from("twin_evolutions").insert({
      twin_id: entry.twinId,
      from_tier: entry.fromTier,
      to_tier: entry.toTier,
      from_level: entry.fromLevel,
      to_level: entry.toLevel,
      trigger_dimensions: entry.triggerDimensions,
      dimension_snapshot: entry.dimensionSnapshot,
    });
  }
}
