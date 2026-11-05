import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover, type LandCoverMap } from "@/lib/fps/br/landcover";
import {
  CELL_SIZE,
  CELLS,
  cellTrees,
  forEachTrunkNear,
  TREE_STRIDE,
  vegetationWorld,
  type VegetationWorld,
} from "@/lib/fps/br/vegetation";
import { LAND_COVER, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
let hf: Heightfield, cover: LandCoverMap, meta: WorldMeta, world: VegetationWorld;
beforeAll(async () => {
  hf = await decodeHeightfield(buffer("public/fps/br/height.v1.hf"));
  cover = await decodeLandCover(buffer("public/fps/br/landcover.v1.lc"));
  meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
  world = vegetationWorld(hf, cover, meta);
});

describe("Project Island vegetation (shared by client and server)", () => {
  it("decodes the land cover the terrain was built with", () => {
    expect([cover.width, cover.height]).toEqual([1280, 1280]);
    expect(cover.classAt(-4990, -4990)).toBe("water");
    // Every building pad is partly built-up (the rest is yards, lots, lawns and fields).
    for (const p of meta.pois.filter((poi) => poi.padRadius)) {
      let urban = 0,
        all = 0;
      for (let dz = -p.padRadius!; dz <= p.padRadius!; dz += 10)
        for (let dx = -p.padRadius!; dx <= p.padRadius!; dx += 10) {
          if (dx * dx + dz * dz > p.padRadius! ** 2) continue;
          all++;
          // Towns: paved fronts and streets (housing blocks are lawns and gardens); the
          // superstore's car parks are asphalt (the road shade).
          const c = cover.classAt(p.x + dx, p.z + dz);
          if (c === "urban" || ((p.town || p.kind === "superstore") && c === "road")) urban++;
        }
      expect(urban / all, p.id).toBeGreaterThan(p.town ? 0.15 : 0.2);
    }
  });

  it("is deterministic: a fresh world places exactly the same trees", () => {
    const other = vegetationWorld(hf, cover, meta);
    for (const [ci, cj] of [
      [5, 5],
      [12, 9],
      [20, 30],
      [33, 14],
    ] as const)
      expect(Array.from(cellTrees(other, ci, cj))).toEqual(Array.from(cellTrees(world, ci, cj)));
  });

  it("keeps trees off water, beaches, roads, towns, building pads and runways", () => {
    const forbidden = new Set(
      ["water", "sand", "urban", "road"].map((c) => LAND_COVER.indexOf(c as never)),
    );
    let trees = 0,
      bad = 0;
    for (let cj = 0; cj < CELLS; cj += 3)
      for (let ci = 0; ci < CELLS; ci += 3) {
        const t = cellTrees(world, ci, cj);
        for (let k = 0; k < t.length; k += TREE_STRIDE) {
          trees++;
          const x = t[k]!,
            z = t[k + 2]!;
          if (forbidden.has(cover.classIdAt(x, z)) || t[k + 1]! < 1.6) bad++;
          for (const p of meta.pois)
            if (p.padRadius && Math.hypot(x - p.x, z - p.z) < p.padRadius) bad++;
          for (const r of meta.runways) {
            const ax = r.b[0] - r.a[0],
              az = r.b[1] - r.a[1];
            const u = Math.max(
              0,
              Math.min(1, ((x - r.a[0]) * ax + (z - r.a[1]) * az) / (ax * ax + az * az)),
            );
            if (Math.hypot(x - r.a[0] - ax * u, z - r.a[1] - az * u) < r.width / 2) bad++;
          }
        }
      }
    expect(trees).toBeGreaterThan(5000);
    expect(bad).toBe(0);
  });

  it("gives forests a playable density and open land scattered groves", () => {
    const forest = LAND_COVER.indexOf("forest"),
      grass = LAND_COVER.indexOf("grass");
    const perHa = (cls: number) => {
      let trees = 0,
        texels = 0;
      for (let cj = 0; cj < CELLS; cj += 2)
        for (let ci = 0; ci < CELLS; ci += 2) {
          const t = cellTrees(world, ci, cj);
          for (let k = 0; k < t.length; k += TREE_STRIDE)
            if (cover.classIdAt(t[k]!, t[k + 2]!) === cls) trees++;
          // Area of this class in the cell, from the land-cover texels.
          const x0 = ci * CELL_SIZE,
            z0 = cj * CELL_SIZE,
            per = (cover.width * CELL_SIZE) / 10_000;
          for (let j = 0; j < per; j++)
            for (let i = 0; i < per; i++) {
              const ti = Math.floor((x0 / 10_000) * cover.width) + i,
                tj = Math.floor((z0 / 10_000) * cover.height) + j;
              if (cover.data[tj * cover.width + ti] === cls) texels++;
            }
        }
      const ha = (texels * (10_000 / cover.width) ** 2) / 10_000;
      return trees / ha;
    };
    const f = perHa(forest),
      g = perHa(grass);
    // About one tree per 10 m in forest (minus steep and high ground), sparse groves on grass.
    expect(f).toBeGreaterThan(60);
    expect(f).toBeLessThan(140);
    expect(g).toBeGreaterThan(0.5);
    expect(g).toBeLessThan(12);
  });

  it("generates a cell in about a millisecond and finds trunks for collision", () => {
    const fresh = vegetationWorld(hf, cover, meta);
    const t0 = performance.now();
    let n = 0;
    for (let cj = 10; cj < 20; cj++)
      for (let ci = 10; ci < 20; ci++) n += cellTrees(fresh, ci, cj).length;
    const perCell = (performance.now() - t0) / 100;
    expect(n).toBeGreaterThan(0);
    expect(perCell).toBeLessThan(5);
    // A tree's trunk is found from a point next to it.
    const t = cellTrees(world, 15, 15);
    expect(t.length).toBeGreaterThan(0);
    const x = t[0]!,
      z = t[2]!;
    let found = false;
    forEachTrunkNear(world, x + 1, z, 3, (tx, tz, radius) => {
      if (tx === x && tz === z && radius > 0.1) found = true;
    });
    expect(found).toBe(true);
  });
});
