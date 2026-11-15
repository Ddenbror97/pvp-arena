/**
 * Map audit: where a model is placed.
 *   node scripts/br/map-audit/run.mjs where <model> [poi]
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
const [model, poi] = process.argv.slice(2);
for (const p of isl.layout)
  if (p.model === model && (!poi || p.poi === poi))
    console.log(JSON.stringify({ x: p.x, y: p.y, z: p.z, turn: p.turn, poi: p.poi }));
