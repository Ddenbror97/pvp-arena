import { describe, expect, it } from "vitest";
import {
  wheelEase,
  wheelRotateFrames,
  wheelSpeed,
  wheelTimingFunction,
  wheelTimingStops,
  WHEEL_EASE_STEPS,
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
    const frames = wheelRotateFrames(target);
    expect(frames[0]).toEqual({ rotate: "0.000deg", offset: 0 });
    expect(frames.at(-1)?.rotate).toBe(`${target.toFixed(3)}deg`);
    expect(frames.at(-1)?.offset).toBe(1);
  });
});
