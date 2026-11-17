import { readFileSync } from "node:fs";
import type * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { pavedLots } from "@/lib/fps/br/layout";
import { createStructures, pavedHeight, PAVED_LIFT } from "@/lib/fps/br/structures-renderer";
import { WORLD_ASSETS, WORLD_HALF } from "@/lib/fps/br/world";

/**
 * The roads, runways and lots as drawn, measured over the whole island (owner, 2026-11-16:
 * "still some flicker / render issues on roads in different camera angles / positions, audit
 * and fix across the map"). Every square metre of paved surface is looked at from above: how
 * far it stands over the ground as the terrain draws it, and what other paved surface lies in
 * the same place. Before: 2,150 m² of ground through the surface, 30 % of the roads under
 * another piece of road (a quarter of a million m² within a centimetre, lit differently), the
 * runways' paint a centimetre over the asphalt and roads through the runways in their plane.
 */
const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};

type Kind = "road" | "runway" | "paint";
let hf: Heightfield;
let geometry: THREE.BufferGeometry;
/** Per 1 m cell: the surfaces over its centre (height, kind). */
const cells = new Map<number, Array<[number, Kind]>>();
let least = Infinity;
let under = 0,
  buried = 0;

beforeAll(async () => {
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
  const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
  hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
  const island = buildIsland(hf, cover, meta, collision);
  const structures = createStructures(meta, hf, pavedLots(island.layout, meta));
  geometry = (structures.root.getObjectByName("br-runways") as THREE.Mesh).geometry;
  const pos = geometry.getAttribute("position").array;
  const col = geometry.getAttribute("color").array;
  const skirt = geometry.getAttribute("skirt").array;
  const index = geometry.index!.array;
  // The ground as the terrain draws it at full detail: a cell's two triangles, either way.
  const drawn = (x: number, z: number) => {
    const gx = (x + WORLD_HALF) / hf.spacing,
      gz = (z + WORLD_HALF) / hf.spacing;
    const i = Math.floor(gx),
      j = Math.floor(gz);
    const fx = gx - i,
      fz = gz - j;
    const o = j * hf.width + i;
    const h00 = hf.data[o]!,
      h10 = hf.data[o + 1]!,
      h01 = hf.data[o + hf.width]!,
      h11 = hf.data[o + hf.width + 1]!;
    return Math.max(
      fx + fz <= 1
        ? h00 + (h10 - h00) * fx + (h01 - h00) * fz
        : h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz),
      fx >= fz
        ? h00 + (h10 - h00) * fx + (h11 - h10) * fz
        : h00 + (h11 - h01) * fx + (h01 - h00) * fz,
    );
  };
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t]!, index[t + 1]!, index[t + 2]!];
    if (skirt[a]! || skirt[b]! || skirt[c]!) continue;
    const [ax, ay, az] = [pos[a * 3]!, pos[a * 3 + 1]!, pos[a * 3 + 2]!];
    const [bx, by, bz] = [pos[b * 3]!, pos[b * 3 + 1]!, pos[b * 3 + 2]!];
    const [cx, cy, cz] = [pos[c * 3]!, pos[c * 3 + 1]!, pos[c * 3 + 2]!];
    const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(den) < 1e-9) continue;
    const red = col[a * 3]!;
    const kind: Kind = red > 0.5 ? "paint" : red < 0.17 ? "runway" : "road";
    for (let i = Math.ceil(Math.min(ax, bx, cx) - 0.5); i + 0.5 <= Math.max(ax, bx, cx); i++)
      for (let j = Math.ceil(Math.min(az, bz, cz) - 0.5); j + 0.5 <= Math.max(az, bz, cz); j++) {
        const x = i + 0.5,
          z = j + 0.5;
        const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / den,
          v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / den;
        if (u < 0 || v < 0 || u + v > 1) continue;
        const y = u * ay + v * by + (1 - u - v) * cy;
        const clear = y - drawn(x, z);
        least = Math.min(least, clear);
        if (clear < 0.03) under++;
        if (clear < 0) buried++;
        const key = (i + 20000) * 40000 + j + 20000;
        const list = cells.get(key);
        if (list) list.push([y, kind]);
        else cells.set(key, [[y, kind]]);
      }
  }
}, 240_000);

describe("BR roads, runways and lots as drawn (road audit 2026-11-16)", () => {
  it("stand clear of the ground everywhere", () => {
    expect(cells.size).toBeGreaterThan(1_900_000);
    // Never under the ground; within 3 cm of it on a few square metres at most.
    expect(buried).toBe(0);
    expect(under).toBeLessThan(40);
    expect(least).toBeGreaterThanOrEqual(0);
  });

  it("never lay two greys in one plane (paint, runway, road)", () => {
    let paintOnAsphalt = 0,
      close = 0;
    for (const list of cells.values()) {
      if (list.length < 2) continue;
      for (let a = 0; a < list.length; a++)
        for (let b = a + 1; b < list.length; b++) {
          const [ya, ka] = list[a]!,
            [yb, kb] = list[b]!;
          if (ka === kb) continue;
          if (ka !== "road" && kb !== "road") paintOnAsphalt++;
          else if (Math.abs(ya - yb) < 0.01) close++;
        }
    }
    // The paint is cells of the runway's own grid, not strips over it.
    expect(paintOnAsphalt).toBe(0);
    // A road under a runway lies well under it.
    expect(close).toBe(0);
  });

  it("overlap road on road only at junctions and round joints", () => {
    let doubled = 0,
      roads = 0;
    for (const list of cells.values()) {
      const n = list.filter(([, k]) => k === "road").length;
      if (n) roads++;
      if (n > 1) doubled++;
    }
    // Was 30 %: every polyline segment its own strip, 1.75 m over its neighbours at each end.
    expect(doubled / roads).toBeLessThan(0.1);
  });

  it("is one indexed mesh whose skirts are lit and coloured as the surface", () => {
    const pos = geometry.getAttribute("position");
    const nor = geometry.getAttribute("normal").array;
    const col = geometry.getAttribute("color").array;
    const skirt = geometry.getAttribute("skirt").array;
    // (1.44 million vertices before, none shared.)
    expect(pos.count).toBeLessThan(600_000);
    expect(geometry.index!.count / 3).toBeGreaterThan(500_000);
    let feet = 0;
    for (let i = 0; i < pos.count; i++) {
      // The ground's normal, never a wall's (a skirt shades as the road it hangs from), and
      // never a cliff's beside the road.
      expect(nor[i * 3 + 1]!).toBeGreaterThan(0.89);
      // Asphalt, road or paint: no darker skirt colour (a dark line along the roads from the air).
      const red = col[i * 3]!;
      expect([0.13, 0.2, 0.8].some((c) => Math.abs(red - c) < 0.005)).toBe(true);
      if (skirt[i]!) feet++;
    }
    expect(feet).toBeGreaterThan(100_000);
  });

  it("takes a surface's height from the position alone", () => {
    const at = (x: number, z: number) => hf.heightAt(x, z);
    const h = pavedHeight(at, 17.3, -1280.4, PAVED_LIFT.road);
    expect(pavedHeight(at, 17.3, -1280.4, PAVED_LIFT.road)).toBe(h);
    expect(h).toBeGreaterThanOrEqual(at(17.3, -1280.4) + PAVED_LIFT.road);
    // Never far over the ground: the highest ground within 2 m.
    expect(h).toBeLessThan(at(17.3, -1280.4) + PAVED_LIFT.road + 1);
    expect(PAVED_LIFT.runway - (PAVED_LIFT.road - PAVED_LIFT.under)).toBeGreaterThanOrEqual(0.07);
  });
});
