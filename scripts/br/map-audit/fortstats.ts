/** Map audit: the Old Fortress's placements by model and their triangles per LOD (debug). */
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
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { lods: Array<{ tris: number }> }>;
};
const island = buildIsland(
  await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`)),
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  collision,
);
const here = island.layout.filter((p) => p.poi === "old-fortress");
const by = new Map<string, number>();
for (const p of here) by.set(p.model, (by.get(p.model) ?? 0) + 1);
const tris = [0, 1, 2].map((l) =>
  here.reduce((s, p) => s + manifest.models[p.model]!.lods[l]!.tris, 0),
);
console.log(`${here.length} placements; triangles by LOD ${tris.join(" / ")}`);
console.log(
  [...by]
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `${m} ${n}`)
    .join(", "),
);
