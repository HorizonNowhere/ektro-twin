/**
 * SQLiteAdapter — 文件级持久化存储
 *
 * 使用 better-sqlite3，自动建表，可配路径。
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

export interface SQLiteAdapterOptions {
  path?: string;
}

export class SQLiteAdapter implements StorageAdapter {
  private db: any; // better-sqlite3 Database instance

  constructor(options: SQLiteAdapterOptions = {}) {
    const dbPath = options.path || "./ektro-twin.db";
    try {
      // Dynamic import to keep it optional
      const Database = require("better-sqlite3");
      this.db = new Database(dbPath);
      this.init();
    } catch {
      throw new Error(
        "SQLiteAdapter requires better-sqlite3. Install it: npm install better-sqlite3"
      );
    }
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS twins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'core',
        profile TEXT NOT NULL DEFAULT '{}',
        level INTEGER NOT NULL DEFAULT 1,
        tier INTEGER NOT NULL DEFAULT 1,
        total_xp INTEGER NOT NULL DEFAULT 0,
        dimensions TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_twins_user_type ON twins(user_id, type);

      CREATE TABLE IF NOT EXISTS xp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        twin_id TEXT NOT NULL,
        xp_gained INTEGER NOT NULL,
        source TEXT NOT NULL,
        dimension TEXT NOT NULL,
        detail TEXT,
        multiplier REAL NOT NULL DEFAULT 1.0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evolutions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        twin_id TEXT NOT NULL,
        from_tier INTEGER NOT NULL,
        to_tier INTEGER NOT NULL,
        from_level INTEGER NOT NULL,
        to_level INTEGER NOT NULL,
        trigger_dimensions TEXT NOT NULL,
        dimension_snapshot TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  private rowToTwin(row: any): Twin {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      profile: JSON.parse(row.profile),
      level: row.level,
      tier: row.tier,
      totalXp: row.total_xp,
      dimensions: JSON.parse(row.dimensions),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getTwin(id: string): Promise<Twin | null> {
    const row = this.db.prepare("SELECT * FROM twins WHERE id = ?").get(id);
    return row ? this.rowToTwin(row) : null;
  }

  async getTwinByUser(userId: string, type?: string): Promise<Twin | null> {
    const row = this.db
      .prepare("SELECT * FROM twins WHERE user_id = ? AND type = ?")
      .get(userId, type || "core");
    return row ? this.rowToTwin(row) : null;
  }

  async createTwin(input: CreateTwinInput): Promise<Twin> {
    const id = genId();
    const now = new Date().toISOString();
    const dimensionKeys = input.dimensionKeys || [];
    const dimensions: Record<string, number> = {};
    for (const key of dimensionKeys) dimensions[key] = 0;

    this.db
      .prepare(
        `INSERT INTO twins (id, user_id, type, profile, level, tier, total_xp, dimensions, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 1, 0, ?, ?, ?)`
      )
      .run(
        id,
        input.userId,
        input.type || "core",
        JSON.stringify(input.profile || {}),
        JSON.stringify(dimensions),
        now,
        now
      );

    return {
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
  }

  async updateTwin(id: string, updates: Partial<Twin>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.profile !== undefined) {
      sets.push("profile = ?");
      values.push(JSON.stringify(updates.profile));
    }
    if (updates.level !== undefined) {
      sets.push("level = ?");
      values.push(updates.level);
    }
    if (updates.tier !== undefined) {
      sets.push("tier = ?");
      values.push(updates.tier);
    }
    if (updates.totalXp !== undefined) {
      sets.push("total_xp = ?");
      values.push(updates.totalXp);
    }
    if (updates.dimensions !== undefined) {
      sets.push("dimensions = ?");
      values.push(JSON.stringify(updates.dimensions));
    }
    if (updates.updatedAt !== undefined) {
      sets.push("updated_at = ?");
      values.push(updates.updatedAt);
    }

    if (sets.length === 0) return;
    values.push(id);
    this.db
      .prepare(`UPDATE twins SET ${sets.join(", ")} WHERE id = ?`)
      .run(...values);
  }

  async logXp(entry: XpLogEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO xp_logs (twin_id, xp_gained, source, dimension, detail, multiplier, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.twinId,
        entry.xpGained,
        entry.source,
        entry.dimension,
        entry.detail || null,
        entry.multiplier,
        entry.createdAt
      );
  }

  async logEvolution(entry: EvolutionEntry): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO evolutions (twin_id, from_tier, to_tier, from_level, to_level, trigger_dimensions, dimension_snapshot, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.twinId,
        entry.fromTier,
        entry.toTier,
        entry.fromLevel,
        entry.toLevel,
        JSON.stringify(entry.triggerDimensions),
        JSON.stringify(entry.dimensionSnapshot),
        entry.createdAt
      );
  }
}
