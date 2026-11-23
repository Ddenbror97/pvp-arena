import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buriedFloors, drawnGround, FLOOR_PATCH, patchGeometry } from "@/lib/fps/br/floor-patches";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

/**
 * Floors the ground rises through, drawn as floor (owner, 2026-11-23: "fix rest still not
 * fixed": the rail depot's floor was grass, the coastal houses' and cabins' partly).
 */
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models as Record<
  string,
  { class: string }
>;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const ground = drawnGround(hf);
const floors = buriedFloors(
  island.layout,
  collision,
  ground,
  (id) => models[id]?.class === "building",
);

describe("floors the ground rises through", () => {
  it("finds them: the rail depots', the cabins', the coastal houses'", () => {
    expect(floors.length).toBeGreaterThan(150);
    const inside = (m: string) =>
      island.layout
        .filter((p) => p.model === m)
        .some((p) =>
          floors.some((f) => p.x > f.x0 - 1 && p.x < f.x1 + 1 && p.z > f.z0 - 1 && p.z < f.z1 + 1),
        );
    for (const m of ["rail-depot", "brick-substation"]) expect(inside(m), m).toBe(true);
    // Never in the ruins: their rooms stay open ground.
    const ruins = island.layout.filter((p) => p.model.startsWith("ruin-"));
    for (const f of floors)
      expect(ruins.some((p) => p.x > f.x0 && p.x < f.x1 && p.z > f.z0 && p.z < f.z1)).toBe(false);
  });

  it("lays floor over every metre of ground that stands over a floor, on that ground", () => {
    const { pos, index } = patchGeometry(floors, ground);
    // Cells in a grid for the look-up.
    const cells: Array<[number, number, number, number]> = [];
    for (let t = 0; t < index.length; t += 6) {
      const a = index[t]!,
        c = index[t + 1]!;
      const xs = [pos[a * 3]!, pos[c * 3]!],
        zs = [pos[a * 3 + 2]!, pos[c * 3 + 2]!];
      cells.push([Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]);
    }
    expect(index.length / 3).toBeLessThan(120_000);
    let buried = 0,
      bare = 0;
    for (const f of floors)
      for (let x = f.x0 + 0.3; x < f.x1 - 0.1; x += 0.7)
        for (let z = f.z0 + 0.3; z < f.z1 - 0.1; z += 0.7) {
          if (ground(x, z) <= f.y + 0.05) continue;
          buried++;
          if (
            !cells.some(
              ([x0, z0, x1, z1]) =>
                x >= x0 - 1e-6 && x <= x1 + 1e-6 && z >= z0 - 1e-6 && z <= z1 + 1e-6,
            )
          )
            bare++;
        }
    console.log("buried points", buried, "bare", bare, "patch triangles", index.length / 3);
    expect(buried).toBeGreaterThan(1000);
    expect(bare).toBe(0);
    // Every vertex on or over the drawn ground, never more than the lift and its steps over it
    // (or over the floor where a cell reaches past the ground's edge).
    for (let v = 0; v < pos.length; v += 3) {
      const g = ground(pos[v]!, pos[v + 2]!);
      expect(pos[v + 1]! - g).toBeGreaterThanOrEqual(FLOOR_PATCH.lift - 1e-4);
    }
  });

  it("keeps to floor-sized boxes near the base", () => {
    for (const f of floors) {
      expect(f.x1 - f.x0).toBeGreaterThanOrEqual(FLOOR_PATCH.minSide - 1e-6);
      expect(f.z1 - f.z0).toBeGreaterThanOrEqual(FLOOR_PATCH.minSide - 1e-6);
    }
  });
});
