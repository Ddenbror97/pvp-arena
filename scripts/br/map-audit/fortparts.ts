/** Map audit: which of fortress-plan.ts's buildings made it into the island's layout (debug). */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { FORTRESS } from "@/lib/fps/br/fortress-plan";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8")) as CollisionData;
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const poi = meta.pois.find((p) => p.id === "old-fortress")!;
for (const [m, x, , z] of FORTRESS)
  if (!island.layout.some((p) => p.model === m && Math.abs(p.x - poi.x - x) < 0.05 && Math.abs(p.z - poi.z - z) < 0.05))
    console.log("missing", m, x, z);
const near = island.layout.filter((p) => p.poi !== poi.id && Math.abs(p.x - poi.x) < 140 && Math.abs(p.z - poi.z) < 140);
console.log("other placements within 140 m:", near.length);
for (const p of near.slice(0, 30)) console.log(" ", p.model, (p.x - poi.x).toFixed(1), (p.z - poi.z).toFixed(1), p.poi);
