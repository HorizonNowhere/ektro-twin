import { describe, it, expect, vi } from "vitest";
import { createTwin } from "../index.js";
import type { SignalExtractor, TwinSignal, Message } from "../types.js";

/** Mock extractor — simulates AI signal extraction */
function createMockProvider(signals: TwinSignal[]): SignalExtractor {
  return {
    extract: vi.fn().mockResolvedValue(signals),
  };
}

describe("createTwin → feed → getProfile integration", () => {
  it("full lifecycle: create → feed → profile → correct → reset", async () => {
    const mockSignals: TwinSignal[] = [
      {
        dimension: "personality",
        insight: "冷静务实",
        confidence: 0.9,
        xp: 12,
        source: "conversation",
      },
      {
        dimension: "aesthetics",
        insight: "极简风格",
        confidence: 0.85,
        xp: 10,
        source: "conversation",
      },
    ];

    const twin = createTwin({
      provider: createMockProvider(mockSignals),
      storage: "memory",
    });

    // 1. Feed conversation
    const messages: Message[] = [
      { role: "user", content: "I like clean, minimal design." },
      { role: "assistant", content: "Got it." },
    ];

    const signals = await twin.feed("user_1", messages);
    expect(signals).toHaveLength(2);

    // 2. Get profile
    const profile = await twin.getProfile("user_1");
    expect(profile).not.toBeNull();
    expect(profile!.level).toBeGreaterThanOrEqual(1);
    expect(profile!.tier).toBe(1);
    expect(profile!.tierName).toBe("初见");
    expect(profile!.tierNameEn).toBe("Stranger");
    expect(profile!.totalXp).toBe(22); // 12 + 10
    expect(profile!.dimensions.personality).toBeGreaterThan(0);
    expect(profile!.dimensions.aesthetics).toBeGreaterThan(0);
    expect(profile!.profile.personality).toBe("冷静务实");
    expect(profile!.profile.aesthetics).toBe("极简风格");

    // 3. Correct
    await twin.correct("user_1", [
      { dimension: "personality", newValue: "冷静但有温度" },
    ]);

    const corrected = await twin.getProfile("user_1");
    expect(corrected!.profile.personality).toBe("冷静但有温度");
    expect(corrected!.totalXp).toBe(47); // 22 + 25

    // 4. Reset
    await twin.reset("user_1");

    const reset = await twin.getProfile("user_1");
    expect(reset!.level).toBe(1);
    expect(reset!.tier).toBe(1);
    expect(reset!.totalXp).toBe(0);
    expect(Object.keys(reset!.profile)).toHaveLength(0);
  });

  it("feed auto-creates twin for new user", async () => {
    const twin = createTwin({
      provider: createMockProvider([
        {
          dimension: "values",
          insight: "效率优先",
          confidence: 0.8,
          xp: 10,
          source: "conversation",
        },
      ]),
      storage: "memory",
    });

    // First call should auto-create twin
    const signals = await twin.feed("new_user", [
      { role: "user", content: "hello" },
    ]);
    expect(signals).toHaveLength(1);

    const profile = await twin.getProfile("new_user");
    expect(profile).not.toBeNull();
    expect(profile!.totalXp).toBe(10);
  });

  it("getProfile returns null for unknown user", async () => {
    const twin = createTwin({
      provider: createMockProvider([]),
      storage: "memory",
    });

    const profile = await twin.getProfile("nobody");
    expect(profile).toBeNull();
  });

  it("supports custom dimensions", async () => {
    const twin = createTwin({
      provider: createMockProvider([
        {
          dimension: "taste",
          insight: "辣味爱好者",
          confidence: 0.9,
          xp: 10,
          source: "conversation",
        },
      ]),
      storage: "memory",
      dimensions: ["taste", "cuisine", "dietary"],
    });

    await twin.feed("foodie", [
      { role: "user", content: "I love spicy food!" },
    ]);

    const profile = await twin.getProfile("foodie");
    expect(profile!.dimensions).toHaveProperty("taste");
    expect(profile!.dimensions).toHaveProperty("cuisine");
    expect(profile!.dimensions).toHaveProperty("dietary");
  });

  it("fires onSignal callback", async () => {
    const onSignal = vi.fn();
    const twin = createTwin({
      provider: createMockProvider([
        {
          dimension: "personality",
          insight: "test",
          confidence: 0.9,
          xp: 10,
          source: "conversation",
        },
      ]),
      storage: "memory",
      onSignal,
    });

    await twin.feed("user_cb", [
      { role: "user", content: "hello" },
    ]);

    expect(onSignal).toHaveBeenCalledTimes(1);
  });

  it("accumulates XP across multiple feeds", async () => {
    const twin = createTwin({
      provider: createMockProvider([
        {
          dimension: "knowledge",
          insight: "TypeScript 专家",
          confidence: 0.9,
          xp: 15,
          source: "conversation",
        },
      ]),
      storage: "memory",
    });

    await twin.feed("dev", [{ role: "user", content: "msg 1" }]);
    await twin.feed("dev", [{ role: "user", content: "msg 2" }]);
    await twin.feed("dev", [{ role: "user", content: "msg 3" }]);

    const profile = await twin.getProfile("dev");
    expect(profile!.totalXp).toBe(45); // 15 * 3
  });
});
