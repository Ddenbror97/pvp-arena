import { describe, expect, it } from "vitest";
import type { DropBody } from "@/lib/fps/br/drop";
import { BR_RULES, BrSight } from "@/lib/fps/br/match";
import type { StaticWorld } from "@/lib/fps/br/static-world";

/**
 * Line of sight between far players (BrSight): the shortcuts of the performance audit
 * (2026-11-11) never make a player come into view later than a plain ray every
 * `sightRecheckMs` would, and "hidden" is always a real blocker on the line.
 */
/** A wall on the plane x = 0, from z = −50 to 50, 30 m high; `rays` records each trace's length. */
function wallWorld() {
  const rays: number[] = [];
  const raycast = (
    ox: number,
    oy: number,
    oz: number,
    dx: number,
    dy: number,
    dz: number,
    max: number,
  ) => {
    rays.push(max);
    const len = Math.hypot(dx, dy, dz);
    const ux = dx / len,
      uy = dy / len,
      uz = dz / len;
    if (Math.abs(ux) < 1e-9) return null;
    const t = -ox / ux;
    if (t < 0 || t > max) return null;
    const y = oy + uy * t,
      z = oz + uz * t;
    return Math.abs(z) <= 50 && y <= 30 ? { distance: t, kind: "box" as const } : null;
  };
  return { world: { raycast } as unknown as StaticWorld, rays, raycast };
}
const body = (x: number, z: number) => ({ x, y: 0, z }) as DropBody;
const truth = (w: ReturnType<typeof wallWorld>, a: DropBody, b: DropBody) => {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    dist = Math.hypot(dx, dz);
  const hit = w.raycast(a.x, 1.6, a.z, dx, 0, dz, dist);
  w.rays.pop();
  return !hit || hit.distance >= dist - 0.5;
};

describe("BR line of sight", () => {
  it("confirms a pair that is still hidden with a short ray", () => {
    const w = wallWorld(),
      sight = new BrSight();
    const a = body(-300, 0),
      b = body(300, 10);
    expect(sight.visible(w.world, a, b, 1, 2, 0)).toBe(false);
    expect(w.rays).toHaveLength(1);
    expect(w.rays[0]).toBeGreaterThan(590);
    // Both walk on; the wall still stands between them.
    a.z += 0.5;
    b.z += 0.5;
    expect(sight.visible(w.world, a, b, 1, 2, BR_RULES.sightRecheckMs)).toBe(false);
    expect(w.rays).toHaveLength(2);
    expect(w.rays[1]).toBeLessThanOrEqual(30);
  });

  it("shows a player who comes out from behind cover at the next recheck, as before", () => {
    const w = wallWorld(),
      sight = new BrSight();
    const a = body(-300, 0),
      b = body(300, 0);
    expect(sight.visible(w.world, a, b, 1, 2, 0)).toBe(false);
    // Out past the end of the wall (the short ray finds nothing, the whole ray is traced).
    b.z = 400;
    a.z = 400;
    expect(sight.visible(w.world, a, b, 1, 2, BR_RULES.sightRecheckMs - 1)).toBe(false); // cached
    expect(sight.visible(w.world, a, b, 1, 2, BR_RULES.sightRecheckMs)).toBe(true);
  });

  it("keeps a pair in sight for sightHoldMs, then hides one who took cover", () => {
    const w = wallWorld(),
      sight = new BrSight();
    const a = body(-300, 400),
      b = body(300, 400);
    expect(sight.visible(w.world, a, b, 1, 2, 0)).toBe(true);
    a.z = 0;
    b.z = 0;
    const traced = w.rays.length;
    expect(sight.visible(w.world, a, b, 1, 2, BR_RULES.sightHoldMs - 1)).toBe(true);
    expect(w.rays).toHaveLength(traced);
    expect(sight.visible(w.world, a, b, 1, 2, BR_RULES.sightHoldMs)).toBe(false);
    expect(BR_RULES.sightHoldMs).toBeGreaterThanOrEqual(BR_RULES.sightRecheckMs);
  });

  it("never calls a pair hidden without a blocker, nor leaves one hidden past a recheck", () => {
    const w = wallWorld(),
      sight = new BrSight();
    let seed = 5;
    const r = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const a = body(-200, 0),
      b = body(200, 0);
    let hiddenSince = -1,
      checked = 0;
    for (let now = 0; now < 600_000; now += 1000 / 15) {
      // Both wander along the wall and past its ends, sometimes crossing sides.
      a.z += (r() - 0.5) * 8;
      b.z += (r() - 0.5) * 8;
      a.z = Math.max(-80, Math.min(80, a.z));
      b.z = Math.max(-80, Math.min(80, b.z));
      if (r() < 0.002) a.x = -a.x;
      const want = truth(w, a, b);
      const got = sight.visible(w.world, a, b, 1, 2, now);
      if (!got && want) {
        // A stale "hidden" may stand until the recheck is due, never longer.
        if (hiddenSince < 0) hiddenSince = now;
        expect(now - hiddenSince).toBeLessThan(BR_RULES.sightRecheckMs + 1000 / 15);
      } else hiddenSince = -1;
      checked++;
    }
    expect(checked).toBeGreaterThan(8000);
  });
});
