/**
 * Map audit: a top-down plan of a region of the map (land cover, roads, every placement as its
 * footprint) as a PNG, to find empty ground and odd placements.
 *
 *   node scripts/br/map-audit/run.mjs island-map <out.png> <x0> <z0> <x1> <z1> [m/px]
 *
 * Colours: water blue, sand tan, grass green, field yellow-green, forest dark green, rock grey,
 * urban light grey, road dark grey; placements in red (buildings), orange (structures), white
 * (props), magenta (vehicles); trees as dark dots. POI pads outlined in cyan.
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

const [out, ...nums] = process.argv.slice(2);
const [x0, z0, x1, z1] = nums.slice(0, 4).map(Number) as [number, number, number, number];
const mpp = Number(nums[4] ?? 2);
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public" + WORLD_ASSETS.meta, "utf8")) as WorldMeta;
const models = JSON.parse(readFileSync("public" + WORLD_ASSETS.models, "utf8")).models as Record<
  string,
  { size: number[]; class: string }
>;
const collision = JSON.parse(
  readFileSync("public" + WORLD_ASSETS.collision, "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buf("public" + WORLD_ASSETS.height));
const cover = await decodeLandCover(buf("public" + WORLD_ASSETS.landcover));
const island = buildIsland(hf, cover, meta, collision);
const W = Math.round((x1 - x0) / mpp),
  H = Math.round((z1 - z0) / mpp);
const img = new Uint8Array(W * H * 3);
const COL: Record<string, number[]> = {
  water: [60, 110, 170],
  sand: [210, 195, 150],
  grass: [120, 160, 90],
  field: [170, 175, 90],
  forest: [55, 95, 55],
  rock: [140, 140, 140],
  urban: [185, 185, 180],
  road: [80, 80, 80],
};
for (let j = 0; j < H; j++)
  for (let i = 0; i < W; i++) {
    const x = x0 + (i + 0.5) * mpp,
      z = z0 + (j + 0.5) * mpp;
    const y = hf.heightAt(x, z);
    const c = y < 0 ? COL.water! : (COL[cover.classAt(x, z)] ?? [255, 0, 255]);
    // Hill shade.
    const s = Math.max(0.6, Math.min(1.3, 1 + (hf.heightAt(x - 2, z - 2) - y) * 0.15));
    img.set(
      c.map((v) => Math.min(255, v * s)),
      (j * W + i) * 3,
    );
  }
const dot = (x: number, z: number, c: number[]) => {
  const i = Math.floor((x - x0) / mpp),
    j = Math.floor((z - z0) / mpp);
  if (i >= 0 && j >= 0 && i < W && j < H) img.set(c, (j * W + i) * 3);
};
const rect = (cx: number, cz: number, w: number, d: number, c: number[], fill = true) => {
  for (let x = cx - w / 2; x <= cx + w / 2; x += mpp / 2)
    for (let z = cz - d / 2; z <= cz + d / 2; z += mpp / 2) {
      const edge =
        x - (cx - w / 2) < mpp ||
        cx + w / 2 - x < mpp ||
        z - (cz - d / 2) < mpp ||
        cz + d / 2 - z < mpp;
      if (fill || edge) dot(x, z, c);
    }
};
// Trees.
const trees = (island.vegetation as unknown as { trees?: Array<{ x: number; z: number }> }).trees;
if (Array.isArray(trees)) for (const t of trees) dot(t.x, t.z, [20, 45, 20]);
for (const p of island.layout) {
  const m = models[p.model];
  if (!m) continue;
  const [w, d] = p.turn % 2 ? [m.size[2]!, m.size[0]!] : [m.size[0]!, m.size[2]!];
  const c =
    m.class === "building" || m.class === "hero"
      ? [220, 60, 50]
      : m.class === "structure"
        ? [240, 150, 40]
        : m.class === "vehicle"
          ? [220, 60, 220]
          : [250, 250, 250];
  rect(p.x, p.z, Math.max(w, mpp), Math.max(d, mpp), c);
}
for (const poi of meta.pois) {
  const r = (poi as { padRadius?: number }).padRadius;
  if (!r) continue;
  for (let a = 0; a < Math.PI * 2; a += mpp / r)
    dot(poi.x + Math.cos(a) * r, poi.z + Math.sin(a) * r, [0, 230, 230]);
}
await sharp(Buffer.from(img), { raw: { width: W, height: H, channels: 3 } })
  .png()
  .toFile(out!);
console.log(`${out}: ${W}×${H}, ${mpp} m/px; ${island.layout.length} placements on the map`);
console.log("vegetation keys:", Object.keys(island.vegetation as object).join(","));
