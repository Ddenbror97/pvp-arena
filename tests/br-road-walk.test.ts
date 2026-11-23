import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { deadRoadEnds, inPoiArea, isPlace } from "@/lib/fps/br/layout";
import { createRoadGrade, ROAD_GRADE } from "@/lib/fps/br/road-grade";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * The final road audit (owner, 2026-11-22: "no random deadends, asfalt road that can be walk
 * into/thro, well connected cross the map, smooth transitions"; "the characters legs disapears
 * becuase he sinks into the road").
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const grade = createRoadGrade(meta, (x, z) => hf.heightAt(x, z));

/** Points on every road's carriageway, every `step` m, at `across` m from the centreline. */
function carriageway(step: number, across: number[]) {
  const out: Array<[number, number]> = [];
  for (const r of meta.roads)
    for (let k = 0; k + 1 < r.points.length; k++) {
      const [ax, az] = r.points[k]!,
        [bx, bz] = r.points[k + 1]!;
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 0.01) continue;
      const ux = (bx - ax) / l,
        uz = (bz - az) / l;
      for (let t = 0; t < l; t += step)
        for (const a of across) out.push([ax + ux * t - uz * a, az + uz * t + ux * a]);
    }
  return out;
}

describe("roads to walk and drive on (road audit 2026-11-22)", () => {
  it("stands players on the asphalt, never in it", () => {
    let checked = 0,
      sunk = 0,
      floated = 0;
    for (const [x, z] of carriageway(9, [-3, -1.5, 0, 1.5, 3])) {
      const top = island.solid.roadTop?.(x, z);
      if (top === null || top === undefined) continue;
      checked++;
      if (top - hf.heightAt(x, z) > 0.25) floated++;
      // A player coming along the road (feet at the surface, a step up allowed) stands on it.
      const stand = island.solid.supportAt(x, z, 0.3, top + 0.35);
      if (stand < top - 0.01) sunk++;
    }
    expect(checked).toBeGreaterThan(80_000);
    // (Where the road is level across a side slope it lies a quarter metre or more over the
    // ground on 9 % of its carriageway: there the legs went into the asphalt.)
    expect(floated).toBeGreaterThan(1000);
    expect(sunk).toBe(0);
  });

  it("rises from a side road onto a main road as a ramp, not a step", () => {
    let ends = 0,
      steps = 0;
    for (const r of meta.roads)
      for (const [p0, p1] of [
        [r.points[0]!, r.points[1]!],
        [r.points[r.points.length - 1]!, r.points[r.points.length - 2]!],
      ] as const) {
        const l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        if (l < 0.01) continue;
        const ux = (p1[0] - p0[0]) / l,
          uz = (p1[1] - p0[1]) / l;
        ends++;
        let prev: number | null = null;
        for (let t = 0; t < Math.min(l, 20); t += 0.5) {
          const g = grade.at(p0[0] + ux * t, p0[1] + uz * t, true, 0);
          if (g !== null && prev !== null && Math.abs(g - prev) > 0.45) steps++;
          prev = g;
        }
      }
    expect(ends).toBeGreaterThan(2000);
    // (308 road ends rose 0.3–1 m within half a metre where they met a road before.)
    expect(steps).toBe(0);
    expect(ROAD_GRADE.ramp).toBeLessThanOrEqual(0.35);
  });

  it("leads every road that meets no other somewhere", () => {
    const ends = deadRoadEnds(meta);
    expect(ends.length).toBeGreaterThan(40);
    const lost = ends.filter(
      ([x, z]) =>
        Math.abs(x) < 4800 &&
        Math.abs(z) < 4800 &&
        !inPoiArea(meta, x, z) &&
        !island.layout.some((p) => isPlace(p, x, z)),
    );
    expect(lost.map(([x, z]) => `${Math.round(x)},${Math.round(z)}`)).toEqual([]);
  });
});
