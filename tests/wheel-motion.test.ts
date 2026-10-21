import { describe, expect, it } from "vitest";
import {
  wheelClockDrift,
  wheelEase,
  wheelShouldSeek,
  wheelSpeed,
  wheelStartTime,
  wheelTimingFunction,
  wheelTimingStops,
  WHEEL_EASE_STEPS,
  WHEEL_RING_HOLD_MS,
  WHEEL_SEEK_MS,
} from "../src/lib/jackpot/wheel-motion";

describe("jackpot wheel motion", () => {
  it("starts at the release speed and is stopped only at the end", () => {
    expect(wheelEase(0)).toBe(0);
    expect(wheelEase(1)).toBe(1);
    expect(wheelEase(0.5)).toBe(0.75);
    expect(wheelSpeed(0)).toBe(1);
    expect(wheelSpeed(1)).toBe(0);
    expect(wheelSpeed(0.25)).toBeCloseTo(0.75);
  });

  it("keeps a straight segment of the curve under a degree on a full spin", () => {
    const target = 9 * 360;
    const stops = wheelTimingStops();
    let gap = 0;
    let widest = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i]!;
      const b = stops[i + 1]!;
      widest = Math.max(widest, (b.y - a.y) * target);
      const mid = (a.t + b.t) / 2;
      const linear = (a.y + b.y) / 2;
      gap = Math.max(gap, Math.abs(wheelEase(mid) - linear) * target);
    }
    expect(stops).toHaveLength(WHEEL_EASE_STEPS + 1);
    expect(widest).toBeLessThan(160);
    expect(gap).toBeLessThan(1);
    expect(wheelTimingFunction()).toMatch(/^linear\(0\.0000,/);
    expect(wheelTimingFunction()).toMatch(/,1\.0000\)$/);
  });

  it("anchors the spin to the server clock and ignores small drift", () => {
    const startAt = 2_000;
    const startTime = wheelStartTime(1_000, 5_000, startAt);
    expect(startTime).toBe(-2_000);
    expect(wheelClockDrift(1_000, startTime, 5_000, startAt)).toBe(0);
    expect(wheelClockDrift(2_000, startTime, 6_200, startAt)).toBe(200);
    expect(wheelShouldSeek(80, 8_000)).toBe(false);
    expect(wheelShouldSeek(200, 400)).toBe(false);
    expect(wheelShouldSeek(WHEEL_SEEK_MS, 8_000)).toBe(true);
    expect(wheelShouldSeek(WHEEL_SEEK_MS, 0)).toBe(false);
    expect(WHEEL_RING_HOLD_MS).toBeGreaterThan(400);
  });
});
