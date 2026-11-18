/** Map audit: kit models the island never places (debug). */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const island = buildIsland(
  await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`)),
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  collision,
);
const used = new Set(island.layout.map((p) => p.model));
const ids = (process.argv[2] ?? "").split(",").filter(Boolean);
console.log("unplaced:", ids.filter((i) => !used.has(i)).join(", ") || "none");
