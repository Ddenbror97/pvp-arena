/**
 * Map audit: the collision boxes (and the placements they come from) around a point.
 *   node scripts/br/map-audit/run.mjs boxes-at <x> <z> [radius]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { turnBox } from "@/lib/fps/br/static-world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const [x, z, r = 4] = process.argv.slice(2).map(Number) as [number, number, number?];
console.log("ground", hf.heightAt(x, z).toFixed(2));
for (const p of isl.layout) {
  if (Math.hypot(p.x - x, p.z - z) > 80) continue;
  for (const b of col.models[p.model] ?? []) {
    const [x0, y0, z0, x1, y1, z1] = turnBox(b, p.turn);
    if (x0 + p.x - r < x && x < x1 + p.x + r && z0 + p.z - r < z && z < z1 + p.z + r) {
      console.log(
        p.model,
        p.poi ?? "",
        `at ${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)} turn ${p.turn}`,
        "box y",
        (y0 + p.y).toFixed(2),
        (y1 + p.y).toFixed(2),
      );
      break;
    }
  }
}
const b = isl.solid.boxes;
let n = 0;
for (let i = 0; i < b.length; i += 6)
  if (b.get(i) - r < x && x < b.get(i + 3) + r && b.get(i + 2) - r < z && z < b.get(i + 5) + r) n++;
console.log("boxes within r:", n);
