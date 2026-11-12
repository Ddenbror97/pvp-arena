import { describe, expect, it } from "vitest";
import { BOMB_MAPS } from "@/lib/fps/bomb/maps";
import { PLAYER_RADIUS } from "@/lib/fps/map";
import { MAP_IDS, getMap } from "@/lib/fps/maps/registry";
import type { GameMap } from "@/lib/fps/maps/types";
import { boxesNear, movementSolidsNear, NEAR_REACH } from "@/lib/fps/solid-index";
import { MOVE_SPEED, TICK_MS } from "@/lib/fps/simulation";
import { segmentOccluded, segmentOccludedScan } from "@/lib/fps/visibility-occlusion";

/**
 * The spatial index (solid-index.ts) must never change an answer: sight rays agree with the full
 * scan on every map, and the movement lists hold every solid a step could touch.
 */
const maps: Array<[string, GameMap]> = [
  ...MAP_IDS.map((id) => [id, getMap(id)] as [string, GameMap]),
  ...Object.entries(BOMB_MAPS).map(([id, m]) => [`5v5 ${id}`, m.map] as [string, GameMap]),
];
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

describe("solid index", () => {
  it.each(maps)("sight rays on %s match the full scan", (_, map) => {
    const r = rng(7);
    const w = map.arena.width,
      d = map.arena.depth;
    let blocked = 0;
    for (let i = 0; i < 30000; i++) {
      // Mostly eye-height points inside the arena; some outside it, some axis-aligned rays.
      const wide = i % 10 === 0 ? 1.3 : 1;
      const ox = (r() - 0.5) * w * wide,
        oz = (r() - 0.5) * d * wide,
        oy = r() * 8;
      let ex = (r() - 0.5) * w * wide,
        ez = (r() - 0.5) * d * wide,
        ey = r() * 8;
      if (i % 7 === 0) ex = ox;
      if (i % 11 === 0) ez = oz;
      if (i % 13 === 0) ey = oy;
      const dx = ex - ox,
        dy = ey - oy,
        dz = ez - oz;
      const len = Math.hypot(dx, dy, dz);
      if (len < 0.01) continue;
      const args = [
        map,
        ox,
        oy,
        oz,
        dx / len,
        dy / len,
        dz / len,
        Math.max(0, len - 0.025),
      ] as const;
      const want = segmentOccludedScan(...args);
      if (want) blocked++;
      expect(segmentOccluded(...args)).toBe(want);
    }
    // The sample is not trivially all-clear or all-blocked.
    expect(blocked).toBeGreaterThan(1000);
    expect(blocked).toBeLessThan(29500);
  });

  it.each(maps)("movement lists on %s hold every solid within reach", (_, map) => {
    const r = rng(11);
    for (let i = 0; i < 20000; i++) {
      const x = (r() - 0.5) * map.arena.width * 1.1,
        z = (r() - 0.5) * map.arena.depth * 1.1;
      for (const [all, near] of [
        [map.movementSolids, movementSolidsNear(map, x, z)],
        [map.boxes, boxesNear(map, x, z)],
      ] as const) {
        const got = new Set(near);
        for (const b of all)
          if (
            Math.abs(x - b.x) <= b.w / 2 + PLAYER_RADIUS + NEAR_REACH &&
            Math.abs(z - b.z) <= b.d / 2 + PLAYER_RADIUS + NEAR_REACH
          )
            expect(got.has(b)).toBe(true);
      }
    }
  });

  it("a step is shorter than the movement lists' reach", () => {
    // predictMovement moves at most this far in a tick (sprint), per axis.
    expect((MOVE_SPEED * 1.5 * TICK_MS) / 1000).toBeLessThan(NEAR_REACH / 2);
  });
});
