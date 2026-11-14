/**
 * Map audit: how much ground loot a match rolls, by place (seed 5), and the checkpoint's size.
 *   npx tsx scripts/br/map-audit/loot-count.ts
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
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
const loot = rollLoot(5, isl.layout, col, isl.solid, meta);
const near = (x: number, z: number) => {
  let best = "",
    d = Infinity;
  for (const p of meta.pois) {
    const q = Math.hypot(p.x - x, p.z - z);
    if (q < d) [best, d] = [p.id, q];
  }
  return d < 700 ? best : "country";
};
const by = new Map<string, number>();
for (const i of loot) by.set(near(i.x, i.z), (by.get(near(i.x, i.z)) ?? 0) + 1);
console.log(`${loot.length} items, ${(JSON.stringify(loot).length / 1024).toFixed(0)} KiB as JSON`);
console.log(
  [...by]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(", "),
);
