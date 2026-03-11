import { describe, it, expect } from "vitest";
import { MemoryAdapter } from "../memory.js";

describe("MemoryAdapter", () => {
  it("creates and retrieves a twin by id", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "user_1",
      dimensionKeys: ["personality", "values"],
    });

    expect(twin.id).toBeTruthy();
    expect(twin.userId).toBe("user_1");
    expect(twin.type).toBe("core");
    expect(twin.level).toBe(1);
    expect(twin.tier).toBe(1);
    expect(twin.totalXp).toBe(0);
    expect(twin.dimensions.personality).toBe(0);
    expect(twin.dimensions.values).toBe(0);

    const fetched = await adapter.getTwin(twin.id);
    expect(fetched).toEqual(twin);
  });

  it("retrieves twin by userId", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({ userId: "user_2" });

    const fetched = await adapter.getTwinByUser("user_2");
    expect(fetched!.id).toBe(twin.id);
  });

  it("returns null for non-existent twin", async () => {
    const adapter = new MemoryAdapter();
    expect(await adapter.getTwin("nope")).toBeNull();
    expect(await adapter.getTwinByUser("nope")).toBeNull();
  });

  it("updates twin fields", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({ userId: "user_3" });

    await adapter.updateTwin(twin.id, { level: 5, totalXp: 400 });

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.level).toBe(5);
    expect(updated!.totalXp).toBe(400);
    expect(updated!.userId).toBe("user_3"); // unchanged
  });

  it("handles update on non-existent twin gracefully", async () => {
    const adapter = new MemoryAdapter();
    // Should not throw
    await adapter.updateTwin("fake", { level: 99 });
  });

  it("logs XP entries", async () => {
    const adapter = new MemoryAdapter();
    await adapter.logXp({
      twinId: "t1",
      xpGained: 10,
      source: "conversation",
      dimension: "personality",
      multiplier: 1,
      createdAt: new Date().toISOString(),
    });
    // No assertion — just verifying no errors
  });

  it("logs evolution entries", async () => {
    const adapter = new MemoryAdapter();
    await adapter.logEvolution({
      twinId: "t1",
      fromTier: 1,
      toTier: 2,
      fromLevel: 9,
      toLevel: 10,
      triggerDimensions: { personality: 25 },
      dimensionSnapshot: { personality: 25 },
      createdAt: new Date().toISOString(),
    });
    // No assertion — just verifying no errors
  });

  it("supports multiple twins per user with different types", async () => {
    const adapter = new MemoryAdapter();
    const core = await adapter.createTwin({ userId: "user_4", type: "core" });
    const work = await adapter.createTwin({ userId: "user_4", type: "work" });

    expect(core.id).not.toBe(work.id);

    const fetchedCore = await adapter.getTwinByUser("user_4", "core");
    const fetchedWork = await adapter.getTwinByUser("user_4", "work");

    expect(fetchedCore!.id).toBe(core.id);
    expect(fetchedWork!.id).toBe(work.id);
  });

  it("initializes profile from input", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "user_5",
      profile: { personality: "冷静", values: "效率优先" },
    });

    expect(twin.profile.personality).toBe("冷静");
    expect(twin.profile.values).toBe("效率优先");
  });
});
