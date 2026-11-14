import { WORLD_ASSETS } from "@/lib/fps/br/world";
/** node scripts/br/map-audit/run.mjs poi <id>: what a place's layout holds (counts by model). */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import type { WorldMeta } from "@/lib/fps/br/world";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const id = process.argv[2]!;
const mine = island.layout.filter((l) => l.poi === id);
const by: Record<string, number> = {};
for (const l of mine) by[l.model] = (by[l.model] ?? 0) + 1;
console.log(mine.length, JSON.stringify(Object.entries(by).sort((a, b) => b[1] - a[1])));
const tops = mine
  .filter((l) => l.model.startsWith("condo-roof"))
  .map((l) => [Math.round(l.x), Math.round(l.y), Math.round(l.z)]);
console.log("roofs", JSON.stringify(tops));
