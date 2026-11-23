import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { sinkAtlas, sinkLevels, SINK_UNDER_M, wetLevels } from "@/lib/fps/br/shore-sink";
import { TERRAIN } from "@/lib/fps/br/terrain";
import { WORLD_ASSETS, WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";

const buffer = (file: string) => {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

describe("the far terrain stays under the water along every bank", () => {
  let hf: Heightfield, wet: Float32Array, levels: ReturnType<typeof sinkLevels>, meta: WorldMeta;
  beforeAll(async () => {
    hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
    const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
    meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
    wet = wetLevels(hf, cover, meta);
    levels = sinkLevels(hf, wet, TERRAIN.levels);
  });

  it("knows the sea, the rivers and the lakes", () => {
    const at = (x: number, z: number) =>
      wet[
        Math.round((z + WORLD_HALF) / hf.spacing) * hf.width +
          Math.round((x + WORLD_HALF) / hf.spacing)
      ]!;
    // The middle of each lake that is deep there: its own level.
    let lakes = 0;
    for (const w of meta.waterBodies) {
      // (The moat rings the prison: its middle is the prison's yard, not water.)
      if (!w.id.startsWith("lake-")) continue;
      const x = (w.bounds[0] + w.bounds[2]) / 2,
        z = (w.bounds[1] + w.bounds[3]) / 2;
      if (hf.heightAt(x, z) > w.level - 1) continue;
      expect(at(x, z), w.id).toBeLessThanOrEqual(w.level + 1e-3);
      lakes++;
    }
    expect(lakes).toBeGreaterThan(8);
    // Dry land is dry: most of the map.
    let dry = 0;
    for (let i = 0; i < wet.length; i += 97) if (wet[i] === Infinity) dry++;
    expect(dry / (wet.length / 97)).toBeGreaterThan(0.5);
  });

  it("every corner of a coarse quad with water in it is under that water", () => {
    const n = hf.width - 1;
    let checked = 0;
    for (let i = 0; i < wet.length; i += 53) {
      const level = wet[i]!;
      if (level === Infinity) continue;
      const gx = i % hf.width,
        gz = Math.floor(i / hf.width);
      for (const l of levels) {
        const s = 1 << l.level;
        // (A sample on a quad's edge belongs to both quads.)
        for (const qx of new Set([Math.floor(gx / s), Math.max(0, Math.ceil(gx / s) - 1)]))
          for (const qz of new Set([Math.floor(gz / s), Math.max(0, Math.ceil(gz / s) - 1)])) {
            if (qx * s >= n || qz * s >= n) continue;
            for (const [cx, cz] of [
              [qx, qz],
              [qx + 1, qz],
              [qx, qz + 1],
              [qx + 1, qz + 1],
            ] as const)
              expect(l.heights[cz * l.size + cx]!).toBeLessThanOrEqual(level - SINK_UNDER_M + 1e-4);
          }
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(10_000);
  });

  it("leaves the ground away from water as it is, and never raises it", () => {
    for (const l of levels) {
      const s = 1 << l.level;
      let same = 0,
        total = 0;
      for (let j = 0; j < l.size; j++)
        for (let i = 0; i < l.size; i++) {
          const true_ = hf.data[j * s * hf.width + i * s]!,
            h = l.heights[j * l.size + i]!;
          expect(h).toBeLessThanOrEqual(true_);
          total++;
          if (h === true_) same++;
        }
      // (Coarser levels reach further from each bank; the finest touches only its edge.)
      expect(same / total, `level ${l.level}`).toBeGreaterThan(l.level <= 2 ? 0.6 : 0.3);
    }
  });

  it("packs into one texture the shader can index", () => {
    const atlas = sinkAtlas(levels, 100);
    expect(atlas.width).toBe(levels.reduce((s, l) => s + l.size, 0));
    expect(atlas.height).toBe(levels[0]!.size);
    expect(atlas.x.length).toBe(TERRAIN.levels + 1);
    const l = levels[2]!;
    const i = 7,
      j = 11;
    expect(atlas.data[j * atlas.width + atlas.x[l.level]! + i]).toBe(
      Math.round((l.heights[j * l.size + i]! + 100) * 100),
    );
  });
});
