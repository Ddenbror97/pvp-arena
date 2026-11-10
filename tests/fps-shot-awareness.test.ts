import { describe, expect, it } from "vitest";
import { NEAR_MISS_M, passBy } from "@/lib/fps/shot-awareness";

/** "You are being shot at" (2026-11-10): a bullet's path going close by. */
describe("shot awareness", () => {
  const eye = [0, 1.6, 0] as const;
  it("measures how close a shot's path passes, ahead of the shooter only", () => {
    // Shot along x, 1 m to the side of the eye.
    expect(passBy([-30, 1.6, 1], [30, 1.6, 1], eye)).toBeCloseTo(1);
    expect(passBy([-30, 1.6, 1], [30, 1.6, 1], eye)).toBeLessThan(NEAR_MISS_M);
    // 3 m wide: not a near miss.
    expect(passBy([-30, 1.6, 3], [30, 1.6, 3], eye)).toBeGreaterThan(NEAR_MISS_M);
    // The player behind the shooter: never.
    expect(passBy([5, 1.6, 0.5], [40, 1.6, 0.5], eye)).toBe(Infinity);
    // A bullet stopped by a wall before reaching the player: distance to its impact.
    expect(passBy([-30, 1.6, 0], [-10, 1.6, 0], eye)).toBeCloseTo(10);
  });
});
