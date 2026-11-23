import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { lotHeight, pavedLots } from "@/lib/fps/br/layout";
import { drawnGround, LOT_LIFT, pavedHeight, RUNWAY_LIFT } from "@/lib/fps/br/paved";
import { createRoadGrade, ROAD_GRADE } from "@/lib/fps/br/road-grade";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { spawnVehicles, VEHICLES } from "@/lib/fps/br/vehicles";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Wheels and boots on the asphalt, not in it (owner, 2026-11-23: "make so the drivble veicles
 * eg motorbike wheel is correctly on the asfalt road, its slightly to sink down so the wheels
 * is under the ground"): the world's ground on a road, a runway or a roadside lot is the
 * height the structures renderer lays it at (paved.ts).
 */
describe("the paved ground", async () => {
  const buffer = (path: string) => {
    const b = readFileSync(path);
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  };
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
  const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  const collision = JSON.parse(
    readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
  ) as CollisionData;
  const island = buildIsland(hf, cover, meta, collision);
  const world = island.solid;
  const drawn = drawnGround(hf);
  /** The ground a body stands on, with nothing built over it. */
  const ground = (x: number, z: number) => world.supportAt(x, z, 0, 1e4);
  /** Points with no box (a bridge, a kerb, a pump island) or deck within half a metre. */
  const open = (x: number, z: number) =>
    world.supportAt(x, z, 0.5, 1e4) <= Math.max(hf.heightAt(x, z), world.roadTop!(x, z) ?? -1e9);

  it("on the runways, is the runway as drawn (10 cm over the highest ground within 2 m)", () => {
    let n = 0;
    for (const r of meta.runways)
      for (let t = 0.05; t < 1; t += 0.05) {
        const x = r.a[0] + (r.b[0] - r.a[0]) * t,
          z = r.a[1] + (r.b[1] - r.a[1]) * t;
        if (!open(x, z)) continue;
        expect(ground(x, z)).toBeCloseTo(pavedHeight(drawn, x, z, RUNWAY_LIFT), 4);
        n++;
      }
    expect(n).toBeGreaterThan(30);
  });

  it("on the roadside stops' lots, is the lot as drawn", () => {
    const lots = pavedLots(island.layout, meta);
    const roads = createRoadGrade(meta, drawn);
    expect(lots.length).toBeGreaterThan(50);
    let n = 0;
    for (const c of lots) {
      // The middle of the cell: the mean of its corners as drawn.
      const x = (c[0]! + c[4]!) / 2,
        z = (c[1]! + c[5]!) / 2;
      if (!open(x, z) || roads.at(x, z, true, 0) !== null) continue;
      const mean =
        [0, 2, 4, 6].reduce((s, i) => s + lotHeight(drawn, c[i]!, c[i + 1]!), 0) / 4 + LOT_LIFT;
      // (Where the ground rises through the cell's middle, the ground: a crest pokes through.)
      expect(ground(x, z)).toBeCloseTo(Math.max(mean, hf.heightAt(x, z)), 3);
      n++;
    }
    expect(n).toBeGreaterThan(50);
  });

  it("on the roads, is the road grade over the ground as drawn", () => {
    const grade = createRoadGrade(meta, drawn);
    let n = 0,
      off = 0;
    for (const road of meta.roads.slice(0, 200))
      for (const [x, z] of road.points) {
        if (!open(x, z)) continue;
        const g = grade.at(x, z, true, 0);
        if (g === null) continue;
        n++;
        if (Math.abs(ground(x, z) - Math.max(g + ROAD_GRADE.lift, ground(x, z))) > 1e-4) off++;
        expect(ground(x, z)).toBeGreaterThanOrEqual(g + ROAD_GRADE.lift - 1e-4);
      }
    expect(n).toBeGreaterThan(500);
    expect(off).toBe(0);
  });

  it("a parked vehicle's wheels stand on it, not under it", () => {
    const vehicles = spawnVehicles(meta, world, 7, island.layout);
    let checked = 0;
    for (const v of vehicles) {
      const s = VEHICLES.kinds[v.kind] as { wheelbase: number; track: number; bike: boolean };
      const fx = -Math.sin(v.yaw),
        fz = -Math.cos(v.yaw);
      // Each tyre's contact.
      for (const along of [-1, 1])
        for (const side of s.bike ? [0] : [-1, 1]) {
          const a = (along * s.wheelbase) / 2,
            c = side * s.track;
          const x = v.x + fx * a - fz * c,
            z = v.z + fz * a + fx * c;
          if (!open(x, z)) continue;
          // (+roll lifts the right side, +c.)
          const plane = v.y + Math.sin(v.pitch) * a + Math.sin(v.roll) * c;
          // (What it stands on: under a bridge, the ground, not the deck.)
          const under = world.supportAt(x, z, 0, plane + 1);
          expect(plane, `${v.kind} at ${v.x.toFixed(1)},${v.z.toFixed(1)}`).toBeGreaterThan(
            under - 0.04,
          );
          checked++;
        }
    }
    expect(checked).toBeGreaterThan(150);
  });
});
