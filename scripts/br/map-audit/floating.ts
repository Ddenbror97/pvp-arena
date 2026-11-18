/**
 * Map audit: placements standing over the ground (debug). For each POI (or all), models whose
 * footprint's middle and quarter points all lie under the placement by more than `gap` m and are
 * not resting on another placement or a building's floor.
 *   node scripts/br/map-audit/run.mjs floating [poi] [gap = 0.15]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
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
  models: Record<string, { size: number[]; class: string }>;
};
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const island = buildIsland(
  hf,
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  collision,
);
const [poiArg, gapArg] = process.argv.slice(2);
const gap = Number(gapArg ?? 0.15);
const poi = meta.pois.find((p) => p.id === poiArg);
const sel = island.layout.filter(
  (p) => !poi || Math.hypot(p.x - poi.x, p.z - poi.z) < poi.radius + 100,
);
const world = new StaticWorld(hf, island.layout, collision, null);
const rows: Array<[string, number, string]> = [];
for (const p of sel) {
  const m = manifest.models[p.model];
  if (!m || /tree|bush/.test(m.class)) continue;
  const [w, d] = p.turn % 2 ? [m.size[2]!, m.size[0]!] : [m.size[0]!, m.size[2]!];
  const pts = [
    [0, 0],
    [-w / 4, -d / 4],
    [w / 4, -d / 4],
    [-w / 4, d / 4],
    [w / 4, d / 4],
  ];
  const under = Math.min(...pts.map(([a, b]) => p.y - hf.heightAt(p.x + a!, p.z + b!)));
  if (under <= gap || under > 1.6) continue;
  // Resting on something (a floor, a deck, another placement's collision)?
  const s = world.supportAt(p.x, p.z, 0.3, p.y + 0.05);
  if (p.y - s < gap) continue;
  rows.push([p.model, under, `${p.x.toFixed(1)},${p.y.toFixed(2)},${p.z.toFixed(1)} ${p.poi}`]);
}
rows.sort((a, b) => b[1] - a[1]);
for (const [m, u, w] of rows.slice(0, Number(process.env.TOP ?? 60)))
  console.log(`${m} ${u.toFixed(2)} m over the ground at ${w}`);
console.log(`${rows.length} floating`);
