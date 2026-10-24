import { describe, expect, it } from "vitest";
import { buildTokenStats, formatTokenStats } from "./tokenStats";

describe("buildTokenStats", () => {
  it("returns null without output tokens", () => {
    expect(buildTokenStats({ usage: { inputTokens: 10 }, ttftMs: 100, durationMs: 1000 })).toBe(
      null
    );
    expect(buildTokenStats({ usage: null, ttftMs: 100, durationMs: 1000 })).toBe(null);
  });

  it("returns null without a duration", () => {
    expect(buildTokenStats({ usage: { outputTokens: 50 }, ttftMs: 100, durationMs: null })).toBe(
      null
    );
  });

  it("computes tokens/sec over generation time (excludes TTFT)", () => {
    const stats = buildTokenStats({
      usage: { inputTokens: 200, outputTokens: 100, totalTokens: 300 },
      ttftMs: 500,
      durationMs: 3000,
    });
    expect(stats.tokensPerSecond).toBe(40);
    expect(stats.ttftMs).toBe(500);
    expect(stats.inputTokens).toBe(200);
    expect(stats.outputTokens).toBe(100);
  });

  it("falls back to full duration when TTFT is missing", () => {
    const stats = buildTokenStats({
      usage: { outputTokens: 50 },
      ttftMs: null,
      durationMs: 2000,
    });
    expect(stats.tokensPerSecond).toBe(25);
    expect(stats.ttftMs).toBe(null);
  });

  it("guards against zero generation time", () => {
    const stats = buildTokenStats({
      usage: { outputTokens: 10 },
      ttftMs: 1000,
      durationMs: 1000,
    });
    expect(stats.tokensPerSecond).toBe(10000);
  });
});

describe("formatTokenStats", () => {
  it("formats sub-second TTFT in ms and seconds above", () => {
    expect(formatTokenStats({ ttftMs: 420, outputTokens: 100 })).toBe("TTFT 420ms · 100 tokens");
    expect(formatTokenStats({ ttftMs: 2500, outputTokens: 100 })).toContain("TTFT 2.5s");
  });

  it("shows in/out counts when both are known", () => {
    const line = formatTokenStats({
      ttftMs: 300,
      tokensPerSecond: 42.1,
      inputTokens: 1240,
      outputTokens: 156,
    });
    expect(line).toBe("TTFT 300ms · 42.1 tok/s · 1,240 in · 156 out");
  });

  it("omits missing values and handles null stats", () => {
    expect(formatTokenStats(null)).toBe("");
    expect(formatTokenStats({ tokensPerSecond: 12.5 })).toBe("12.5 tok/s");
  });
});
