import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WET_DEPTH_STEPS, WET_FILM_M, wetCoverage } from "@/lib/fps/br/shore-sink";
import {
  createWater,
  LAKE_CELL_M,
  SEA_CELL_M,
  seaLines,
  SHORE_FAR_FOOT_M,
  SHORE_FAR_SHARE,
} from "@/lib/fps/br/water";
import { LAND_COVER, WORLD_ASSETS, WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (file: string) => {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const worldMeta = () => JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const mask = () =>
  new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat) as THREE.Texture;

/**
 * Owner, 2026-11-22: "still flicker for long distances directly in the airplane when game
 * starting and when jumped out of the airplane in the parachute" (the water's and the rivers'
 * edges). Two causes, neither visible to the software renderer the captures run on:
 * the sea as one 40 km sheet, and a far pixel's wet-or-dry asked at one point.
 */
describe("the water is drawn in cells (water.ts SEA_CELL_M)", () => {
  const triangles = (meta: WorldMeta) => {
    const water = createWater(meta, mask());
    const g = (water.root.children[0] as THREE.Mesh).geometry;
    const p = g.getAttribute("position"),
      lake = g.getAttribute("aLake"),
      index = g.getIndex()!;
    const out: Array<{ x: number[]; z: number[]; y: number; lake: number }> = [];
    for (let i = 0; i < index.count; i += 3) {
      const v = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      out.push({
        x: v.map((k) => p.getX(k)),
        z: v.map((k) => p.getZ(k)),
        y: p.getY(v[0]!),
        lake: lake.getX(v[0]!),
      });
    }
    water.dispose();
    return out;
  };
  const span = (v: number[]) => Math.max(...v) - Math.min(...v);

  it("no sea triangle over the map is wider than a cell, and the sea is whole", () => {
    const sea = triangles({ waterBodies: [], bridges: [] } as unknown as WorldMeta);
    expect(sea.length).toBeGreaterThan(2000);
    let area = 0;
    for (const t of sea) {
      const [x0, x1, x2] = t.x as [number, number, number],
        [z0, z1, z2] = t.z as [number, number, number];
      // Facing up, like the one sheet it replaces.
      const a = ((x1 - x0) * (z2 - z0) - (x2 - x0) * (z1 - z0)) / 2;
      expect(a).toBeLessThan(0);
      area -= a;
      const inMap =
        t.x.every((x) => Math.abs(x) <= WORLD_HALF) && t.z.every((z) => Math.abs(z) <= WORLD_HALF);
      const limit = inMap ? SEA_CELL_M : 2500;
      expect(span(t.x)).toBeLessThanOrEqual(limit + 1e-6);
      expect(span(t.z)).toBeLessThanOrEqual(limit + 1e-6);
    }
    // The same sea as before: every square metre out past the far plane, once.
    const lines = seaLines();
    const far = lines[lines.length - 1]!;
    expect(far).toBeGreaterThanOrEqual(WORLD_HALF + 14_000);
    expect(lines[0]).toBe(-far);
    expect(area).toBeCloseTo((2 * far) ** 2, -2);
    // The lines are the map's own edges too (no cell straddles the edge of the height map).
    expect(lines).toContain(WORLD_HALF);
    expect(lines).toContain(-WORLD_HALF);
    for (let i = 1; i < lines.length; i++) expect(lines[i]!).toBeGreaterThan(lines[i - 1]!);
  });

  it("the real world's lakes are in cells too, each still whole inside its outline", () => {
    const meta = worldMeta();
    const all = triangles(meta).filter((t) => t.lake > 0);
    for (const w of meta.waterBodies) {
      const mine = all.filter(
        (t) =>
          Math.abs(t.y - w.level) < 1e-3 &&
          t.x.every((x) => x >= w.bounds[0] - 20.01 && x <= w.bounds[2] + 20.01) &&
          t.z.every((z) => z >= w.bounds[1] - 20.01 && z <= w.bounds[3] + 20.01),
      );
      expect(mine.length, w.id).toBeGreaterThanOrEqual(2);
      for (const t of mine) {
        expect(span(t.x), w.id).toBeLessThanOrEqual(LAKE_CELL_M + 1e-6);
        expect(span(t.z), w.id).toBeLessThanOrEqual(LAKE_CELL_M + 1e-6);
      }
    }
  });
});

describe("far shorelines from the averaged coverage (shore-sink.ts wetCoverage)", () => {
  let hf: Heightfield, meta: WorldMeta, wet: ReturnType<typeof wetCoverage>;
  let alpha: { data: Uint8Array; width: number; height: number };
  beforeAll(async () => {
    hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
    const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
    meta = worldMeta();
    // The mask as terrain.ts hands it to the water: here simply "water" where the land
    // cover says water (unsoftened; the rule under test is the same).
    const data = new Uint8Array(cover.width * cover.height * 4);
    const water = LAND_COVER.indexOf("water");
    for (let i = 0; i < cover.data.length; i++) data[i * 4 + 3] = cover.data[i] === water ? 255 : 0;
    alpha = { data, width: cover.width, height: cover.height };
    wet = wetCoverage(hf, meta, alpha);
  });
  const texel = (x: number, z: number) => {
    const i = Math.round((x + WORLD_HALF) / hf.spacing / 2),
      j = Math.round((z + WORLD_HALF) / hf.spacing / 2);
    const o = (j * wet.size + i) * 2;
    return { share: wet.data[o]! / 255, depth: wet.data[o + 1]! / WET_DEPTH_STEPS };
  };

  it("is a texel every second height sample: all water at sea and in a lake, none inland", () => {
    expect(wet.size).toBe((hf.width - 1) / 2 + 1);
    expect(wet.data.length).toBe(wet.size * wet.size * 2);
    // Open sea in the map's corner; the middle of the reservoir; dry land well away from both.
    let sea = 0,
      dry = 0;
    for (let i = 0; i < wet.size * wet.size; i += 37) {
      const share = wet.data[i * 2]!;
      if (share === 255) sea++;
      if (share === 0) dry++;
    }
    const n = Math.ceil((wet.size * wet.size) / 37);
    expect(sea / n).toBeGreaterThan(0.1);
    expect(dry / n).toBeGreaterThan(0.5);
    // (Shorelines: some texels are partly wet.)
    expect((n - sea - dry) / n).toBeGreaterThan(0.001);
    const lake = meta.waterBodies.find((w) => w.id === "lake-4")!;
    // (Its deepest place: well inside its banks and its dam.)
    let deep = 0,
      at: [number, number] = [0, 0];
    for (let x = lake.bounds[0]; x < lake.bounds[2]; x += 20)
      for (let z = lake.bounds[1]; z < lake.bounds[3]; z += 20) {
        const d = lake.level - hf.heightAt(x, z);
        if (d > deep) [deep, at] = [d, [x, z]];
      }
    const t = texel(...at);
    expect(t.share).toBe(1);
    // (Below the dam the rectangle's deepest ground is the lower lake's: its depth there.)
    expect(deep).toBeGreaterThan(6);
    expect(t.depth).toBeGreaterThan(4);
  });

  it("answers as the water's own rule does at every sample it averages", () => {
    // A texel is all wet only where all nine samples round it are, by the sea's rule.
    let checked = 0;
    for (let j = 1; j < wet.size - 1; j += 11)
      for (let i = 1; i < wet.size - 1; i += 13) {
        let sea = 0;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++)
            if (hf.data[(2 * j + dj) * hf.width + 2 * i + di]! < -WET_FILM_M) sea++;
        const share = wet.data[(j * wet.size + i) * 2]!;
        if (sea === 9) expect(share).toBe(255);
        // (A lake can add water where the sea has none; it never takes any away.)
        if (share === 0) expect(sea).toBe(0);
        checked++;
      }
    expect(checked).toBeGreaterThan(5000);
  });

  it("the water reads it far away and the exact height near by", () => {
    const material = (
      createWater({ waterBodies: [], bridges: [] } as unknown as WorldMeta, mask(), {
        texture: mask(),
        spacing: hf.spacing,
        grid: hf.width - 1,
        offset: 100,
        wet: mask(),
      }).root.children[0] as THREE.Mesh
    ).material as THREE.MeshStandardMaterial;
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: THREE.ShaderLib.physical.vertexShader,
      fragmentShader: THREE.ShaderLib.physical.fragmentShader,
    };
    material.onBeforeCompile(shader as never, null as never);
    const f = shader.fragmentShader;
    expect(shader.uniforms["uWet"]).toBeDefined();
    // By the width of ground a pixel covers, its gradients taken outside any branch.
    expect(f).toContain(
      `wFar = smoothstep(${SHORE_FAR_FOOT_M[0].toFixed(1)}, ${SHORE_FAR_FOOT_M[1].toFixed(1)}, narrow);`,
    );
    expect(f).toContain("vec2 wDx = dFdx(vMapUv), wDy = dFdy(vMapUv);");
    expect(f).toContain("textureGrad(uWet,");
    // The exact height is not read where the coverage answers alone.
    expect(f).toContain("wTrue = wFar < 1.0 ? vWaterY - groundAt(uv) : wFarDepth;");
    // A pixel partly water is partly drawn: a narrow river is a faint line, not dots.
    expect(f).toContain(
      `smoothstep(${SHORE_FAR_SHARE[0].toFixed(2)}, ${SHORE_FAR_SHARE[1].toFixed(2)}, c.r)`,
    );
    expect(f).toContain("diffuseColor.a *= wFarAlpha;");
    expect(SHORE_FAR_FOOT_M[0]).toBeLessThan(hf.spacing);
    expect(SHORE_FAR_FOOT_M[1]).toBeGreaterThan(hf.spacing);
  });
});
