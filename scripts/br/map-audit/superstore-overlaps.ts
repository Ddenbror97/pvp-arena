/**
 * Map audit: props, vehicles and structures at the Island Superstore whose collision footprints
 * intersect (a trolley inside a car, a drum inside a truck), and new props standing on a building.
 * Flat markings (lot-lines) and stacked placements are ignored.
 *
 *   node scripts/br/map-audit/run.mjs superstore-overlaps
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { Placement } from "@/lib/fps/br/layout";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

const meta = JSON.parse(readFileSync("public" + WORLD_ASSETS.meta, "utf8")) as WorldMeta;
const models = JSON.parse(readFileSync("public" + WORLD_ASSETS.models, "utf8")) as {
  models: Record<string, { size: number[] }>;
};
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const collision = JSON.parse(
  readFileSync("public" + WORLD_ASSETS.collision, "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buf("public" + WORLD_ASSETS.height));
const cover = await decodeLandCover(buf("public" + WORLD_ASSETS.landcover));
const layout = buildIsland(hf, cover, meta, collision).layout.filter(
  (p) => p.poi === "island-superstore",
);
const FLAT = new Set(["lot-lines", "street-lamp", "lot-light"]);
const foot = (p: Placement) => {
  const s = models.models[p.model]!.size;
  const [w, d] = p.turn % 2 ? [s[2]!, s[0]!] : [s[0]!, s[2]!];
  return [p.x - w / 2, p.z - d / 2, p.x + w / 2, p.z + d / 2, p.y, p.y + s[1]!] as const;
};
const items = layout.filter((p) => !FLAT.has(p.model));
const hits: string[] = [];
for (let i = 0; i < items.length; i++)
  for (let j = i + 1; j < items.length; j++) {
    const a = items[i]!,
      b = items[j]!;
    // Trolleys nest in their corral rows; fence sections butt end to end.
    if (a.model === b.model && (a.model === "shop-cart" || a.model === "chainlink")) continue;
    const fa = foot(a),
      fb = foot(b);
    const m = 0.05;
    if (
      fa[0] < fb[2] - m &&
      fb[0] < fa[2] - m &&
      fa[1] < fb[3] - m &&
      fb[1] < fa[3] - m &&
      fa[4] < fb[5] - 0.05 &&
      fb[4] < fa[5] - 0.05
    )
      hits.push(
        `${a.model}@${a.x.toFixed(1)},${a.z.toFixed(1)} × ${b.model}@${b.x.toFixed(1)},${b.z.toFixed(1)}`,
      );
  }
const poi = meta.pois.find((p) => p.id === "island-superstore")!;
console.log(
  `${items.length} placements at the superstore; ${hits.length} overlaps (store-relative):`,
);
for (const h of hits)
  console.log(
    " ",
    h.replace(
      /@(-?[\d.]+),(-?[\d.]+)/g,
      (_, x, z) => `@${(+x - poi.x).toFixed(1)},${(+z - poi.z).toFixed(1)}`,
    ),
  );
const count: Record<string, number> = {};
for (const p of items) count[p.model] = (count[p.model] ?? 0) + 1;
console.log(JSON.stringify(count));
