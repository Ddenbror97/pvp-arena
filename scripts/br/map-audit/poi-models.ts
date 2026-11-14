/**
 * Map audit: what a place is built of (model counts) and how its placements sit.
 *   npx tsx scripts/br/map-audit/poi-models.ts <poi id>
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
const id = process.argv[2]!;
const mine = isl.layout.filter((p) => p.poi === id);
const counts = new Map<string, number>();
for (const p of mine) counts.set(p.model, (counts.get(p.model) ?? 0) + 1);
console.log(`${id}: ${mine.length} placements`);
console.log(
  [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `${m} ${n}`)
    .join(", "),
);
const missing = [...counts.keys()].filter((m) => !(m in col.models));
if (missing.length) console.log("NOT IN COLLISION/MANIFEST:", missing.join(", "));
