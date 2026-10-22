import { afterEach, describe, expect, it, vi } from "vitest";
import { winLevel } from "@/components/slott/hits";
import {
  fxTier,
  isBaseFinalSpin,
  playerSpinIndex,
  prefersReducedMotion,
  spinAccent,
  stopVariant,
  tierLevel,
} from "@/components/slott/presentation";
import { presentSpinStart, reelStops } from "@/components/slott/timing";
import { SYMBOLS, WEIGHT_TOTAL } from "@/lib/slott/paytable";

describe("slot presentation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the paytable weight contract", () => {
    expect(SYMBOLS.reduce((sum, s) => sum + s.weight, 0)).toBe(WEIGHT_TOTAL);
    expect(SYMBOLS.map((s) => s.id)).toEqual(SYMBOLS.map((_, i) => i));
  });

  it("keeps the existing win bands", () => {
    expect(winLevel(0, false)).toBe(0);
    expect(winLevel(74, false)).toBe(1);
    expect(winLevel(75, false)).toBe(2);
    expect(winLevel(249, false)).toBe(2);
    expect(winLevel(250, false)).toBe(3);
    expect(winLevel(0, true)).toBe(3);
  });

  it("maps those bands onto presentation tiers", () => {
    expect(fxTier(0, false)).toBe("none");
    expect(fxTier(5, false)).toBe("small");
    expect(fxTier(19, false)).toBe("small");
    expect(fxTier(20, false)).toBe("medium");
    expect(fxTier(74, false)).toBe("medium");
    expect(fxTier(75, false)).toBe("large");
    expect(fxTier(249, false)).toBe("large");
    expect(fxTier(250, false)).toBe("exceptional");
    expect(fxTier(1, true)).toBe("exceptional");
    expect(tierLevel("exceptional")).toBe(3);
    expect(tierLevel("none")).toBe(0);
  });

  it("stops every reel on the same curve", () => {
    expect(reelStops([0], 3200)).toEqual([1462, 1810, 2158, 2506, 2923]);
    const stops = reelStops([1, 2, 3], 2400);
    expect(stops).toHaveLength(5);
    expect(stops.every((t, i) => i === 0 || t > stops[i - 1]!)).toBe(true);
  });

  it("cycles spin color and stop timbre without a rising curve", () => {
    expect(spinAccent(1)).toBe(spinAccent(7));
    expect(new Set([0, 1, 2, 3, 4, 5].map(spinAccent)).size).toBe(6);
    expect(stopVariant(3, 1)).toBe(stopVariant(3, 1));
    expect(stopVariant(4, 0)).toBeGreaterThanOrEqual(0);
    expect(stopVariant(4, 0)).toBeLessThan(4);
  });

  it("marks only the sixth spin of each seat as the base final spin", () => {
    expect(playerSpinIndex(1)).toBe(1);
    expect(playerSpinIndex(2)).toBe(1);
    expect(playerSpinIndex(11)).toBe(6);
    expect(playerSpinIndex(12)).toBe(6);
    expect(isBaseFinalSpin(11, 6)).toBe(true);
    expect(isBaseFinalSpin(12, 6)).toBe(true);
    expect(isBaseFinalSpin(10, 6)).toBe(false);
    expect(isBaseFinalSpin(13, 6)).toBe(false);
  });

  it("plays a live spin forward and skips one that already finished", () => {
    const now = 10_000;
    expect(presentSpinStart(now - 9000, 3200, now, null, false)).toBeNull();
    const live = presentSpinStart(now, 3200, now, now, true);
    expect(live).toEqual({ startAt: now, durationMs: 3200 });
  });

  it("shortens the visible spin when reduced motion is on", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }));
    expect(prefersReducedMotion()).toBe(true);
    const now = 5_000;
    expect(presentSpinStart(now, 3200, now, now, true)).toEqual({
      startAt: now,
      durationMs: 720,
    });
  });
});
