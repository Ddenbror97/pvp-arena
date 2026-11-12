import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { modelSpots, turnPoint } from "@/lib/fps/br/loot-spots";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { pavedLots } from "@/lib/fps/br/layout";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Stops along the strait's roads (owner, 2026-11-11: "see what 3D objects we can add around the
 * roads here to make it like a real world"): the motel on the coast road (its rooms walked by
 * br-building-access), its sign, payphones and cars, and two picnic rest stops.
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

describe("the strait's roadside stops", () => {
  it("put the motel by the coast road, its front to the road, with its sign and cars", () => {
    const at = island.layout.filter((p) => p.poi === "strait-roadside");
    const motel = at.filter((p) => p.model === "roadside-motel");
    expect(motel).toHaveLength(1);
    const m = motel[0]!;
    // West of the west bridge's mainland end, between it and Murder Cabins.
    expect(m.x).toBeGreaterThan(-2400);
    expect(m.x).toBeLessThan(-1100);
    // Its front (model +z, the doors) is nearer the road than its back.
    const [fx, fz] = turnPoint(0, 12, m.turn);
    const [bx, bz] = turnPoint(0, -12, m.turn);
    expect(roadDistance(m.x + fx, m.z + fz)).toBeLessThan(roadDistance(m.x + bx, m.z + bz));
    expect(roadDistance(m.x + fx, m.z + fz)).toBeLessThan(20);
    // The ground under it is within the pad's kerb, so no floor is dug in.
    const hs: number[] = [];
    for (let i = -18; i <= 18; i += 2)
      for (let j = -8; j <= 8; j += 2) {
        const [dx, dz] = turnPoint(i, j, m.turn);
        hs.push(hf.heightAt(m.x + dx, m.z + dz));
      }
    expect(Math.max(...hs) - m.y).toBeLessThan(0.28);
    expect(at.filter((p) => p.model === "motel-sign")).toHaveLength(1);
    expect(at.filter((p) => p.model.startsWith("car-")).length).toBeGreaterThanOrEqual(2);
    // Its twelve doors (eleven rooms and the office).
    expect(
      island.doors.doors.filter(
        (d) => d.model === "roadside-motel" && Math.hypot(d.x - m.x, d.z - m.z) < 25,
      ),
    ).toHaveLength(12);
  });

  it("put a picnic rest stop with a payphone on each side of the strait", () => {
    const at = island.layout.filter((p) => p.poi === "strait-roadside");
    const shelters = at.filter((p) => p.model === "rest-shelter");
    expect(shelters).toHaveLength(2);
    expect(shelters.some((p) => p.z > 3000)).toBe(true);
    expect(shelters.some((p) => p.z < 2600)).toBe(true);
    for (const p of shelters) expect(roadDistance(p.x, p.z)).toBeLessThan(16);
    expect(at.filter((p) => p.model === "payphone-booth").length).toBeGreaterThanOrEqual(3);
  });

  it("put the motor court on the coast road's east stretch, its pumps under its canopy", () => {
    const at = island.layout.filter((p) => p.poi === "strait-roadside");
    const court = at.filter((p) => p.model === "modular-motel");
    expect(court).toHaveLength(1);
    const m = court[0]!;
    // North of the mainland coast road's east stretch, across from the rest stop.
    expect(m.x).toBeGreaterThan(1600);
    expect(m.x).toBeLessThan(2000);
    expect(m.z).toBeLessThan(2330);
    // Its front (the canopy and the doors, model +z) to the road, over a forecourt.
    const [fx, fz] = turnPoint(0, 5.5, m.turn);
    const [bx, bz] = turnPoint(0, -5.5, m.turn);
    expect(roadDistance(m.x + fx, m.z + fz)).toBeLessThan(roadDistance(m.x + bx, m.z + bz));
    expect(roadDistance(m.x + fx, m.z + fz)).toBeLessThan(22);
    expect(roadDistance(m.x + fx, m.z + fz)).toBeGreaterThan(8);
    // The ground under it within 0.15 m of its base: under its 0.1 m floors and 2.04 m
    // ceilings a 1.8 m player stands upright anywhere inside.
    const hs: number[] = [];
    for (let i = -12; i <= 12; i += 1.5)
      for (let j = -5.4; j <= 5.4; j += 1.2) {
        const [dx, dz] = turnPoint(i, j, m.turn);
        hs.push(hf.heightAt(m.x + dx, m.z + dz));
      }
    expect(Math.max(...hs) - m.y).toBeLessThanOrEqual(0.15 + 1e-6);
    expect(m.y - Math.min(...hs)).toBeLessThan(0.05);
    // Its three doors (the reception and the cabin block's two rooms).
    expect(
      island.doors.doors.filter(
        (d) => d.model === "modular-motel" && Math.hypot(d.x - m.x, d.z - m.z) < 15,
      ),
    ).toHaveLength(3);
    // Two fuel dispensers on the pump island under the canopy (local x -11.1..-8.1, z
    // 1.45..2.75, its top 0.18 m up).
    const pumps = at.filter((p) => p.model === "fuel-dispenser");
    expect(pumps).toHaveLength(2);
    for (const p of pumps) {
      const [lx, lz] = turnPoint(p.x - m.x, p.z - m.z, ((4 - m.turn) & 3) as typeof m.turn);
      expect(lx).toBeGreaterThan(-11.1);
      expect(lx).toBeLessThan(-8.1);
      expect(lz).toBeGreaterThan(1.45);
      expect(lz).toBeLessThan(2.75);
      expect(p.y).toBeCloseTo(m.y + 0.18, 2);
    }
    // Solid (voxel collision): cover on the island.
    expect(collision.models["fuel-dispenser"]?.length).toBeGreaterThan(0);
    // Indoor loot in each of its three rooms (the reception, the two cabin rooms), none under
    // the open canopy.
    const spots = modelSpots(collision, "modular-motel", "indoor", 2.5, 40);
    const rooms = [
      [-11.85, -5.43, -4.85, -1.92],
      [1.98, 6.915, -4.85, 1.7],
      [6.915, 11.85, -4.85, 1.7],
    ];
    const inRoom = (x: number, z: number) =>
      rooms.findIndex(([x0, x1, z0, z1]) => x > x0! && x < x1! && z > z0! && z < z1!);
    for (const sp of spots)
      expect(inRoom(sp.x, sp.z), JSON.stringify(sp)).toBeGreaterThanOrEqual(0);
    expect(new Set(spots.map((sp) => inRoom(sp.x, sp.z))).size).toBe(3);
  });

  it("line the strait's roads with reflector poles on their verges", () => {
    const poles = island.layout.filter((p) => p.model === "road-pole");
    // Both verges every 50 m over about 9.7 km of road, less bridges, junctions and water.
    expect(poles.length).toBeGreaterThan(250);
    expect(poles.length).toBeLessThan(500);
    for (const p of poles) {
      // On the verge, 1 m off the 7 m road's edge (the nearest road; at a bend's inside the
      // road's own chord sits a little nearer).
      const d = roadDistance(p.x, p.z);
      expect(d).toBeGreaterThan(3.9);
      expect(d).toBeLessThan(4.7);
      // Standing on the ground, above the sea.
      expect(p.y).toBeCloseTo(hf.heightAt(p.x, p.z), 1);
      expect(p.y).toBeGreaterThan(0);
    }
    // Never on the bridges.
    for (const b of meta.bridges)
      for (const p of poles) {
        const [ax, az] = b.a,
          [bx, bz] = b.b;
        const vx = bx - ax,
          vz = bz - az;
        const u = Math.max(
          0,
          Math.min(1, ((p.x - ax) * vx + (p.z - az) * vz) / (vx * vx + vz * vz)),
        );
        expect(Math.hypot(p.x - ax - vx * u, p.z - az - vz * u)).toBeGreaterThan(20);
      }
  });

  it("pave both motels' fronts out to the road, never under the buildings", () => {
    const cells = pavedLots(island.layout, meta);
    for (const model of ["roadside-motel", "modular-motel"]) {
      const m = island.layout.find((p) => p.model === model && p.poi === "strait-roadside")!;
      const [w, d] = model === "roadside-motel" ? [37.1, 17.1] : [24.5, 11];
      const mine = cells.filter((c) => Math.hypot(c[0]! - m.x, c[1]! - m.z) < 50);
      expect(mine.length, model).toBeGreaterThan(30);
      const mids = mine.map((c) => [(c[0]! + c[4]!) / 2, (c[1]! + c[5]!) / 2] as const);
      // Out to the road (its 7 m carriageway) ...
      expect(Math.min(...mids.map(([x, z]) => roadDistance(x, z))), model).toBeLessThan(5.5);
      // ... from the building's front, and none under it (local coordinates).
      const inv = ((4 - m.turn) & 3) as typeof m.turn;
      const local = mids.map(([x, z]) => turnPoint(x - m.x, z - m.z, inv));
      expect(Math.min(...local.map(([, z]) => z)), model).toBeLessThan(d / 2 + 2);
      // The front line: the motel's sidewalk pad (z 8.51); the motor court's cabin block and
      // reception walls (z 2.03), its canopy and apron west of x -5.35 (z 5.47).
      const front = (x: number) => (model === "roadside-motel" ? 8.51 : x > -5.35 ? 2.03 : 5.47);
      for (const [x, z] of local)
        expect(Math.abs(x) < w / 2 && z - 1 < front(x), `${model} ${x},${z}`).toBe(false);
    }
    // The cars on the lots stand on the asphalt (8 cm over the ground), not in it.
    for (const c of island.layout.filter(
      (p) => p.poi === "strait-roadside" && p.model.startsWith("car-"),
    ))
      expect(c.y).toBeGreaterThanOrEqual(hf.heightAt(c.x, c.z) + 0.07);
  });
});
