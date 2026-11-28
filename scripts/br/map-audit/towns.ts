/**
 * Map audit: what the four first towns (Northstar, Millhaven, Crossroads, Riverwood) are built
 * of, per model, with their indoor loot spots and rolled loot. Writes JSON to argv[2] if given.
 *
 *   node scripts/br/map-audit/run.mjs towns [out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
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
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models as Record<
  string,
  { class: string; lods: { tris: number }[] }
>;
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const layout = island.layout;
const loot = rollLoot(1, layout, collision, island.solid, meta);

const TOWNS = ["northstar-town", "millhaven", "crossroads", "riverwood"];
const report: Record<string, unknown> = {};
for (const id of TOWNS) {
  const poi = meta.pois.find((p) => p.id === id)!;
  const mine = layout.filter((l) => l.poi === id);
  const byModel: Record<string, number> = {};
  for (const l of mine) byModel[l.model] = (byModel[l.model] ?? 0) + 1;
  const buildings = Object.entries(byModel)
    .filter(([m]) => models[m]?.class === "building")
    .sort((a, b) => b[1] - a[1]);
  const r = poi.radius * 1.0 + 600;
  const near = loot.filter((it) => Math.hypot(it.x - poi.x, it.z - poi.z) < r);
  report[id] = {
    placements: mine.length,
    buildings: buildings.reduce((s, [, n]) => s + n, 0),
    byBuilding: Object.fromEntries(buildings),
    lootNear: near.length,
    fences: mine.filter((l) => l.model === "yard-fence" || l.model === "yard-picket").length,
  };
}
report.totalLoot = loot.length;
report.totalPlacements = layout.length;
console.log(JSON.stringify(report, null, 1));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(report, null, 1));
