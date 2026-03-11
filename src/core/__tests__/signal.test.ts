import { describe, it, expect, vi } from "vitest";
import { extractAndFeed, feedCorrection } from "../signal.js";
import { MemoryAdapter } from "../../storage/memory.js";
import type { SignalExtractor, TwinSignal, Message } from "../../types.js";

/** Mock extractor that returns configurable signals */
function createMockExtractor(signals: TwinSignal[]): SignalExtractor {
  return {
    extract: vi.fn().mockResolvedValue(signals),
  };
}

describe("extractAndFeed", () => {
  const messages: Message[] = [
    { role: "user", content: "I prefer minimal design." },
    { role: "assistant", content: "Got it." },
  ];

  it("extracts signals and dual-writes to twin", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      dimensionKeys: ["personality", "aesthetics"],
    });

    const extractor = createMockExtractor([
      {
        dimension: "aesthetics",
        insight: "极简风格偏好",
        confidence: 0.85,
        xp: 10,
        source: "conversation",
      },
    ]);

    const signals = await extractAndFeed(adapter, extractor, "u1", messages);

    expect(signals).toHaveLength(1);
    expect(signals[0].dimension).toBe("aesthetics");

    // Verify XP was added
    const updated = await adapter.getTwin(twin.id);
    expect(updated!.totalXp).toBe(10);
    expect(updated!.dimensions.aesthetics).toBeGreaterThan(0);

    // Verify profile was updated
    expect(updated!.profile.aesthetics).toBe("极简风格偏好");
  });

  it("returns empty array when twin does not exist", async () => {
    const adapter = new MemoryAdapter();
    const extractor = createMockExtractor([
      {
        dimension: "personality",
        insight: "test",
        confidence: 0.9,
        xp: 10,
        source: "conversation",
      },
    ]);

    const signals = await extractAndFeed(adapter, extractor, "nonexistent", messages);
    expect(signals).toHaveLength(0);
  });

  it("returns empty array when extractor returns no signals", async () => {
    const adapter = new MemoryAdapter();
    await adapter.createTwin({
      userId: "u1",
      dimensionKeys: ["personality"],
    });

    const extractor = createMockExtractor([]);
    const signals = await extractAndFeed(adapter, extractor, "u1", messages);
    expect(signals).toHaveLength(0);
  });

  it("calls onSignal hook for each signal", async () => {
    const adapter = new MemoryAdapter();
    await adapter.createTwin({
      userId: "u1",
      dimensionKeys: ["personality", "values"],
    });

    const extractor = createMockExtractor([
      { dimension: "personality", insight: "直接", confidence: 0.9, xp: 10, source: "conversation" },
      { dimension: "values", insight: "效率", confidence: 0.8, xp: 8, source: "conversation" },
    ]);

    const onSignal = vi.fn();
    await extractAndFeed(adapter, extractor, "u1", messages, undefined, onSignal);

    expect(onSignal).toHaveBeenCalledTimes(2);
    expect(onSignal).toHaveBeenCalledWith(
      expect.objectContaining({ dimension: "personality" })
    );
  });

  it("handles multiple signals across dimensions", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      dimensionKeys: ["personality", "values", "decision"],
    });

    const extractor = createMockExtractor([
      { dimension: "personality", insight: "内向", confidence: 0.9, xp: 12, source: "conversation" },
      { dimension: "values", insight: "公平", confidence: 0.7, xp: 8, source: "conversation" },
      { dimension: "decision", insight: "数据驱动", confidence: 0.85, xp: 10, source: "conversation" },
    ]);

    const signals = await extractAndFeed(adapter, extractor, "u1", messages);
    expect(signals).toHaveLength(3);

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.totalXp).toBe(30); // 12 + 8 + 10
    expect(updated!.dimensions.personality).toBeGreaterThan(0);
    expect(updated!.dimensions.values).toBeGreaterThan(0);
    expect(updated!.dimensions.decision).toBeGreaterThan(0);
  });

  it("passes existing profile to extractor", async () => {
    const adapter = new MemoryAdapter();
    await adapter.createTwin({
      userId: "u1",
      profile: { personality: "冷静" },
      dimensionKeys: ["personality"],
    });

    const extractor = createMockExtractor([]);
    await extractAndFeed(adapter, extractor, "u1", messages);

    expect(extractor.extract).toHaveBeenCalledWith(
      messages,
      expect.objectContaining({ personality: "冷静" }),
      undefined
    );
  });
});

describe("feedCorrection", () => {
  it("adds 25 XP per correction and overwrites profile", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      profile: { personality: "外向活泼" },
      dimensionKeys: ["personality"],
    });

    await feedCorrection(adapter, twin.id, [
      { dimension: "personality", newValue: "其实很内向" },
    ]);

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.totalXp).toBe(25);
    expect(updated!.profile.personality).toBe("其实很内向");
  });

  it("handles multiple corrections", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({
      userId: "u1",
      dimensionKeys: ["personality", "values"],
    });

    await feedCorrection(adapter, twin.id, [
      { dimension: "personality", newValue: "内向" },
      { dimension: "values", newValue: "自由" },
    ]);

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.totalXp).toBe(50); // 25 * 2
    expect(updated!.profile.personality).toBe("内向");
    expect(updated!.profile.values).toBe("自由");
  });

  it("does nothing with empty corrections", async () => {
    const adapter = new MemoryAdapter();
    const twin = await adapter.createTwin({ userId: "u1" });

    await feedCorrection(adapter, twin.id, []);

    const updated = await adapter.getTwin(twin.id);
    expect(updated!.totalXp).toBe(0);
  });

  it("throws for non-existent twin", async () => {
    const adapter = new MemoryAdapter();
    await expect(
      feedCorrection(adapter, "fake-id", [
        { dimension: "personality", newValue: "test" },
      ])
    ).rejects.toThrow("Twin not found");
  });
});
