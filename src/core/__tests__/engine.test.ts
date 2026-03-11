import { describe, it, expect } from "vitest";
import {
  calculateLevel,
  getTierForLevel,
  getLevelProgress,
  checkEvolutionCondition,
  addXp,
  updateProfile,
} from "../engine.js";
import { MemoryAdapter } from "../../storage/memory.js";
import { TIERS } from "../constants.js";

/* ─── calculateLevel ─── */

describe("calculateLevel", () => {
  it("returns level 1 for 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("returns level 1 for XP less than first tier threshold", () => {
    expect(calculateLevel(50)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
  });

  it("returns level 2 at exactly 100 XP (T1 xpPerLevel=100)", () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it("reaches level 10 (T2 start) at 900 XP", () => {
    // T1: levels 1-9, 9 levels * 100 xp = 900 xp
    expect(calculateLevel(900)).toBe(10);
  });

  it("progresses through T2 correctly", () => {
    // T2: levels 10-29, xpPerLevel=150
    // Level 11 = 900 (T1) + 150 (one T2 level) = 1050
    expect(calculateLevel(1050)).toBe(11);
  });

  it("handles large XP values", () => {
    const level = calculateLevel(100000);
    expect(level).toBeGreaterThan(50);
  });
});

/* ─── getTierForLevel ─── */

describe("getTierForLevel", () => {
  it("returns T1 for level 1", () => {
    const tier = getTierForLevel(1);
    expect(tier.tier).toBe(1);
    expect(tier.name).toBe("初见");
  });

  it("returns T1 for level 9", () => {
    expect(getTierForLevel(9).tier).toBe(1);
  });

  it("returns T2 for level 10", () => {
    const tier = getTierForLevel(10);
    expect(tier.tier).toBe(2);
    expect(tier.name).toBe("轮廓");
  });

  it("returns T3 for level 30", () => {
    expect(getTierForLevel(30).tier).toBe(3);
  });

  it("returns T7 for very high levels", () => {
    expect(getTierForLevel(200).tier).toBe(7);
    expect(getTierForLevel(999).tier).toBe(7);
  });

  it("returns last tier for edge cases", () => {
    const tier = getTierForLevel(Infinity);
    expect(tier.tier).toBe(7);
  });
});

/* ─── getLevelProgress ─── */

describe("getLevelProgress", () => {
  it("returns 0 progress at 0 XP", () => {
    const progress = getLevelProgress(0);
    expect(progress.level).toBe(1);
    expect(progress.currentXp).toBe(0);
    expect(progress.requiredXp).toBe(100);
  });

  it("shows partial progress within a level", () => {
    const progress = getLevelProgress(50);
    expect(progress.level).toBe(1);
    expect(progress.currentXp).toBe(50);
    expect(progress.requiredXp).toBe(100);
  });

  it("shows correct T2 requirements", () => {
    // At 900 XP = level 10 (T2), xpPerLevel = 150
    const progress = getLevelProgress(900);
    expect(progress.level).toBe(10);
    expect(progress.currentXp).toBe(0);
    expect(progress.requiredXp).toBe(150);
  });
});

/* ─── checkEvolutionCondition ─── */

describe("checkEvolutionCondition", () => {
  it("T1 has no conditions (always met)", () => {
    const result = checkEvolutionCondition({}, 1);
    expect(result.met).toBe(true);
  });

  it("T2 requires 3 dimensions at 20+", () => {
    const dims = { personality: 25, values: 22, decision: 21 };
    const result = checkEvolutionCondition(dims, 2);
    expect(result.met).toBe(true);
    expect(result.qualifiedDims).toHaveLength(3);
  });

  it("T2 fails with only 2 dimensions qualified", () => {
    const dims = { personality: 25, values: 22, decision: 10 };
    const result = checkEvolutionCondition(dims, 2);
    expect(result.met).toBe(false);
    expect(result.qualifiedDims).toHaveLength(2);
  });

  it("T3 requires 5 dimensions at 35+", () => {
    const dims = {
      personality: 40,
      values: 38,
      decision: 36,
      aesthetics: 35,
      communication: 35,
    };
    const result = checkEvolutionCondition(dims, 3);
    expect(result.met).toBe(true);
  });

  it("returns false for unknown tier", () => {
    const result = checkEvolutionCondition({}, 99);
    expect(result.met).toBe(false);
  });
});

/* ─── addXp (IO, uses MemoryAdapter) ─── */

describe("addXp", () => {
  it("adds XP and updates level", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      dimensionKeys: ["personality", "values"],
    });

    const result = await addXp(adapter, twin.id, 10, "conversation", "personality", "test");

    expect(result.newLevel).toBe(1);
    expect(result.evolved).toBe(false);

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.totalXp).toBe(10);
    expect(updated!.dimensions.personality).toBeGreaterThan(0);
  });

  it("levels up when XP threshold crossed", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      dimensionKeys: ["personality"],
    });

    // Add enough XP to level up (100 for T1)
    const result = await addXp(adapter, twin.id, 110, "conversation", "personality");

    expect(result.newLevel).toBe(2);
  });

  it("throws for non-existent twin", async () => {
    const adapter = new MemoryAdapter();
    await expect(
      addXp(adapter, "fake-id", 10, "test", "personality")
    ).rejects.toThrow("Twin not found");
  });

  it("caps dimension at 100", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      dimensionKeys: ["personality"],
    });

    // Add XP many times to push dimension high
    for (let i = 0; i < 50; i++) {
      await addXp(adapter, twin.id, 10, "test", "personality");
    }

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.dimensions.personality).toBeLessThanOrEqual(100);
  });

  it("creates dimension entry for new dimensions", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      dimensionKeys: [],
    });

    await addXp(adapter, twin.id, 10, "test", "newdim");

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.dimensions.newdim).toBeGreaterThan(0);
  });
});

/* ─── updateProfile ─── */

describe("updateProfile", () => {
  it("adds new profile entries", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      dimensionKeys: [],
    });

    await updateProfile(adapter, twin.id, {
      personality: "直接务实",
    });

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.profile.personality).toBe("直接务实");
  });

  it("appends to existing profile with separator", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      profile: { personality: "直接务实" },
      dimensionKeys: [],
    });

    await updateProfile(adapter, twin.id, {
      personality: "不喜欢废话",
    });

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.profile.personality).toContain("直接务实");
    expect(updated!.profile.personality).toContain("不喜欢废话");
    expect(updated!.profile.personality).toContain("；");
  });

  it("deduplicates by first 6 chars", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      profile: { personality: "直接务实，不喜欢废话" },
      dimensionKeys: [],
    });

    // "直接务实，不" matches first 6 chars of existing — should skip
    await updateProfile(adapter, twin.id, {
      personality: "直接务实，不太外向",
    });

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.profile.personality).toBe("直接务实，不喜欢废话");
  });

  it("truncates at 200 chars", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      profile: { personality: "a".repeat(195) },
      dimensionKeys: [],
    });

    await updateProfile(adapter, twin.id, {
      personality: "new insight that will exceed limit",
    });

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.profile.personality!.length).toBeLessThanOrEqual(200);
  });

  it("does nothing for non-existent twin", async () => {
    const adapter = new MemoryAdapter();
    // Should not throw
    await updateProfile(adapter, "fake-id", { personality: "test" });
  });
});
