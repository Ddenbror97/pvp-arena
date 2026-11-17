/**
 * Map audit: a top-down plan of a square of the island, 1 px per `scale` m: the ground's height
 * (sea blue by depth, land green to brown, roads and town pads from the land cover) with every
 * placed model's footprint drawn over it (buildings dark red, structures orange, props yellow,
 * boats/vehicles blue). Written as a binary PPM; convert it with any image tool.
 *   node scripts/br/map-audit/run.mjs town-plan <cx> <cz> <half> <out.ppm> [scale]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { class?: string; size?: number[] }>;
};
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const [cx, cz, half] = process.argv.slice(2, 5).map(Number) as [number, number, number];
const file = process.argv[5]!;
const scale = Number(process.argv[6] ?? 1);
const N = Math.round((2 * half) / scale);
const px = new Uint8Array(N * N * 3);
const put = (i: number, j: number, c: number[]) => {
  if (i < 0 || j < 0 || i >= N || j >= N) return;
  px.set(c, (j * N + i) * 3);
};
for (let j = 0; j < N; j++)
  for (let i = 0; i < N; i++) {
    const x = cx - half + (i + 0.5) * scale;
    const z = cz - half + (j + 0.5) * scale;
    const h = hf.heightAt(x, z);
    const c = cover.classAt(x, z);
    let rgb: number[];
    if (h < 0) {
      const t = Math.min(1, -h / 12);
      rgb = [40 - 30 * t, 120 - 60 * t, 200 - 60 * t];
    } else if (c === "road") rgb = [120, 120, 120];
    else if (c === "urban") rgb = [175, 170, 155];
    else if (c === "sand") rgb = [220, 205, 150];
    else {
      const t = Math.min(1, h / 60);
      rgb = [90 + 90 * t, 150 - 30 * t, 70 + 20 * t];
    }
    // Contours every 2 m.
    if (h > 0 && Math.floor(h / 2) !== Math.floor(hf.heightAt(x + scale, z) / 2))
      rgb = rgb.map((v) => v * 0.8);
    put(i, j, rgb);
  }
const colourOf = (cls?: string) =>
  cls === "building" || cls === "hero"
    ? [150, 30, 30]
    : cls === "structure"
      ? [230, 120, 20]
      : cls === "vehicle"
        ? [30, 60, 220]
        : cls === "tree" || cls === "bush"
          ? [20, 90, 20]
          : [250, 230, 40];
for (const p of isl.layout) {
  if (Math.abs(p.x - cx) > half + 60 || Math.abs(p.z - cz) > half + 60) continue;
  const m = manifest.models[p.model];
  const s = m?.size ?? [2, 2, 2];
  const a = (p.turn ?? 0) * (Math.PI / 2);
  const ca = Math.cos(a),
    sa = Math.sin(a);
  const rgb = colourOf(m?.class);
  for (let u = -s[0]! / 2; u <= s[0]! / 2; u += scale / 2)
    for (let v = -s[2]! / 2; v <= s[2]! / 2; v += scale / 2) {
      const edge =
        Math.abs(Math.abs(u) - s[0]! / 2) < scale || Math.abs(Math.abs(v) - s[2]! / 2) < scale;
      const x = p.x + u * ca + v * sa;
      const z = p.z - u * sa + v * ca;
      put(
        Math.floor((x - cx + half) / scale),
        Math.floor((z - cz + half) / scale),
        edge ? [0, 0, 0] : rgb,
      );
    }
}
writeFileSync(file, Buffer.concat([Buffer.from(`P6\n${N} ${N}\n255\n`), Buffer.from(px)]));
console.log(`${file}: ${N}x${N}, ${isl.layout.length} placements on the island`);
