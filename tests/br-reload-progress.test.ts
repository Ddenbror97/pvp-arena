import { describe, expect, it } from "vitest";
import { AWP_TIMELINE } from "@/lib/fps/awp-timeline";
import { boltPose, RELOAD_BOLT } from "@/lib/fps/awp-animation";
import { ITEMS, type WeaponDef } from "@/lib/fps/br/items";
import { PERK_EFFECT } from "@/lib/fps/br/perks";
import { reloadClip, reloadLengthMs, reloadProgress } from "@/lib/fps/br/reload-progress";

/**
 * The battle royale's first-person reloads run like 1v1/5v5's (owner, 2026-11-11: "reload
 * animation is laggy compared to 1v1/5v5 … the AWP"): the clip time goes forwards from 0 to 1
 * over the reload's real length, and the AWP's bolt is worked at the end of an empty reload.
 */
describe("BR reload clips", () => {
  const awp = ITEMS.awp as WeaponDef;
  it("run forwards over the reload, from the start", () => {
    const length = reloadLengthMs(awp.reloadMs, null);
    const until = 10_000 + length;
    const at = (ms: number) => reloadClip(reloadProgress(until, 10_000 + ms, length), awp.reloadMs);
    expect(at(1).t).toBeLessThan(0.01);
    expect(at(length / 2).t).toBeCloseTo(0.5, 5);
    expect(at(length - 1).t).toBeGreaterThan(0.99);
    let last = 0;
    for (let ms = 1; ms < length; ms += 16) {
      const t = at(ms).t;
      expect(t).toBeGreaterThanOrEqual(last);
      last = t;
    }
    // Done: back at rest.
    expect(at(length + 5).t).toBe(0);
  });

  it("use the reload's real length with Quick Hands", () => {
    const tablet = {
      data: 0,
      unlocked: ["quick-hands" as const],
      active: ["quick-hands" as const],
    };
    const length = reloadLengthMs(awp.reloadMs, tablet);
    expect(length).toBeCloseTo(awp.reloadMs * PERK_EFFECT.reload);
    // The first frame of a shortened reload is the clip's start, not a fifth of the way in.
    expect(reloadProgress(1000 + length, 1000 + 1, length)).toBeLessThan(0.01);
  });

  it("work the AWP's bolt late in an empty reload, as in 1v1/5v5", () => {
    const at = (ms: number) =>
      boltPose(reloadClip(ms / awp.reloadMs, awp.reloadMs).boltMs, RELOAD_BOLT);
    const T = AWP_TIMELINE.empty;
    // Home at the start (the magazine comes out first), drawn back after the new one is in,
    // home again before the settle. Played backwards it ran the other way round.
    expect(at(100).back).toBe(0);
    expect(at((T.back[1] + T.forward[0]) / 2).back).toBeGreaterThan(0.9);
    expect(at(T.settle[0] + 50).back).toBe(0);
  });
});
