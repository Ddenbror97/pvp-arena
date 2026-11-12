import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { pavedLots } from "@/lib/fps/br/layout";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { modelSpots, turnPoint } from "@/lib/fps/br/loot-spots";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Highway stops (owner, 2026-11-12: "audit the rest of the map if any gas station / motel can be
 * placed out along the road to look more realistic to fill out the map"): filling stations,
 * motor courts and motels by the roads between the towns, every one enterable (the walks in
 * art/br/building-access-routes.json, run by br-building-access, go into each placed one).
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
let hf: Heightfield, island: Island;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  island = buildIsland(hf, cover, meta, collision);
}, 120_000);

const roadDistance = (x: number, z: number) => {
  let best = Infinity;
  for (const r of meta.roads)
    for (let k = 0; k + 1 < r.points.length; k++) {
      const [ax, az] = r.points[k]!,
        [bx, bz] = r.points[k + 1]!;
      const vx = bx! - ax!,
        vz = bz! - az!,
        u = Math.max(0, Math.min(1, ((x - ax!) * vx + (z - az!) * vz) / (vx * vx + vz * vz || 1)));
      best = Math.min(best, Math.hypot(x - ax! - vx * u, z - az! - vz * u));
    }
  return best;
};

// Each building: its half footprint (x, z at turn 0), front (model +z) edge, the ground's
// tolerance under it, its doors.
const SPEC = {
  "roadside-gas": { w: 6.45, d: 8.7, front: 8.7, rough: 0.28, doors: 1 },
  "modular-motel": { w: 12.25, d: 5.47, front: 5.47, rough: 0.15, doors: 3 },
  "roadside-motel": { w: 18.5, d: 8.55, front: 8.55, rough: 0.25, doors: 12 },
} as const;

describe("highway stops", () => {
  const stops = () => island.layout.filter((p) => p.poi === "highway-stops" && p.model in SPEC);

  it("put filling stations, motor courts and motels along the roads between the towns", () => {
    const all = stops();
    const count = (m: string) => all.filter((p) => p.model === m).length;
    expect(count("roadside-gas")).toBeGreaterThanOrEqual(6);
    expect(count("modular-motel")).toBeGreaterThanOrEqual(1);
    expect(count("roadside-motel")).toBeGreaterThanOrEqual(1);
    // Spread out: buildings of different stops 1 km or more apart (a stop's pair stands side
    // by side), and none in a town's streets.
    const groups: Array<{ x: number; z: number }> = [];
    for (const p of all) {
      const g = groups.find((g) => Math.hypot(g.x - p.x, g.z - p.z) < 120);
      if (!g) groups.push({ x: p.x, z: p.z });
    }
    expect(groups.length).toBeGreaterThanOrEqual(9);
    for (const a of groups)
      for (const b of groups)
        if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1000);
    for (const p of all)
      for (const poi of meta.pois) {
        const t = poi.town;
        if (!t) continue;
        const inside =
          p.x > t.xs[0]! - 150 &&
          p.x < t.xs[t.xs.length - 1]! + 150 &&
          p.z > t.zs[0]! - 150 &&
          p.z < t.zs[t.zs.length - 1]! + 150;
        expect(inside, `${p.model} in ${poi.id}`).toBe(false);
      }
  });

  it("face each one to its road over a lot, on ground its floors and sills allow", () => {
    for (const p of stops()) {
      const s = SPEC[p.model as keyof typeof SPEC];
      const [fx, fz] = turnPoint(0, s.front, p.turn);
      const [bx, bz] = turnPoint(0, -s.d, p.turn);
      const front = roadDistance(p.x + fx, p.z + fz);
      expect(front, p.model).toBeLessThan(roadDistance(p.x + bx, p.z + bz));
      expect(front, `${p.model} ${p.x},${p.z}`).toBeLessThan(20);
      expect(front, p.model).toBeGreaterThan(7);
      const hs: number[] = [];
      for (let i = -1; i <= 1; i += 0.25)
        for (let j = -1; j <= 1; j += 0.25) {
          const [dx, dz] = turnPoint(i * s.w, j * s.d, p.turn);
          hs.push(hf.heightAt(p.x + dx, p.z + dz));
        }
      expect(Math.max(...hs) - p.y, `${p.model} ${p.x},${p.z}`).toBeLessThanOrEqual(s.rough + 0.01);
      expect(p.y - Math.min(...hs)).toBeLessThan(0.05);
    }
  });

  it("make every one enterable: its fitted doors and indoor loot", () => {
    for (const p of stops()) {
      const s = SPEC[p.model as keyof typeof SPEC];
      const near = island.doors.doors.filter(
        (d) => d.model === p.model && Math.hypot(d.x - p.x, d.z - p.z) < 25,
      );
      expect(near.length, `${p.model} ${p.x},${p.z}`).toBe(s.doors);
    }
    // The filling station's shop: loot inside it (x -5.45..4.9, z -8.05..2.25), none on its
    // forecourt.
    const spots = modelSpots(collision, "roadside-gas", "indoor", 2.5, 40);
    expect(spots.length).toBeGreaterThan(2);
    for (const sp of spots) {
      expect(sp.x).toBeGreaterThan(-5.45);
      expect(sp.x).toBeLessThan(4.9);
      expect(sp.z).toBeGreaterThan(-8.05);
      expect(sp.z).toBeLessThan(2.25);
    }
  });

  it("give the motor courts their pumps and every stop a lot paved out to the road", () => {
    const pumps = island.layout.filter(
      (p) => p.poi === "highway-stops" && p.model === "fuel-dispenser",
    );
    const courts = stops().filter((p) => p.model === "modular-motel");
    expect(pumps).toHaveLength(courts.length * 2);
    const cells = pavedLots(island.layout, meta);
    for (const p of stops()) {
      const mine = cells.filter((c) => Math.hypot(c[0]! - p.x, c[1]! - p.z) < 45);
      expect(mine.length, p.model).toBeGreaterThan(15);
      const mids = mine.map((c) => [(c[0]! + c[4]!) / 2, (c[1]! + c[5]!) / 2] as const);
      expect(Math.min(...mids.map(([x, z]) => roadDistance(x, z))), p.model).toBeLessThan(5.5);
    }
    // The stops' cars stand on the asphalt.
    for (const c of island.layout.filter(
      (p) => p.poi === "highway-stops" && p.model.startsWith("car-"),
    ))
      expect(c.y).toBeGreaterThanOrEqual(hf.heightAt(c.x, c.z) + 0.07);
  });
});
