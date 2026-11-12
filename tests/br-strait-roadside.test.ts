import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland, type Island } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { turnPoint } from "@/lib/fps/br/loot-spots";
import type { CollisionData } from "@/lib/fps/br/static-world";
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
});
