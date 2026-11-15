/**
 * Map audit: the models placed within r of a point, nearest first.
 *   node scripts/br/map-audit/run.mjs near-models <x> <z> [r]
 */
import { readFileSync } from "node:fs";
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
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const [x, z, r = 40] = process.argv.slice(2).map(Number) as [number, number, number?];
const list = isl.layout
  .map((p) => ({ p, d: Math.hypot(p.x - x, p.z - z) }))
  .filter((e) => e.d < r)
  .sort((a, b) => a.d - b.d);
for (const { p, d } of list)
  console.log(
    `${d.toFixed(1)} m  ${p.model}  ${p.poi ?? ""}  (${p.x.toFixed(1)}, ${p.y.toFixed(2)}, ${p.z.toFixed(1)}) turn ${p.turn}  ground ${hf.heightAt(p.x, p.z).toFixed(2)}`,
  );
