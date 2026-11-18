/**
 * Map audit: things under the roads (owner, 2026-11-18: "no objects under the road"). For every
 * placement whose footprint's middle is on a road's carriageway (within its half width), what
 * the road's surface is there (road-grade.ts, as the road is drawn): a placement whose top lies
 * under the surface is buried under the asphalt; one whose foot lies more than SUNK under it
 * pokes up through it. Bridge pieces and the rails (their crossings) are left out.
 *
 *   node scripts/br/map-audit/run.mjs roadobjects [sunk = 0.3]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { createRoadGrade, OFF_ROAD_SURFACE } from "@/lib/fps/br/road-grade";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const SUNK = Number(process.argv[2] ?? 0.3);
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
const grade = createRoadGrade(meta, (x, z) => hf.heightAt(x, z));
const buried: string[] = [];
const sunk: string[] = [];
const byModel = new Map<string, number>();
for (const p of island.layout) {
  if (OFF_ROAD_SURFACE.has(p.model) || /bridge|pylon|rail/.test(p.model)) continue;
  const surface = grade.at(p.x, p.z, false, 0);
  if (surface === null || surface === undefined) continue;
  const size = manifest.models[p.model]?.size ?? [1, 1, 1];
  const top = p.y + size[1]! * (p.scale ?? 1);
  const at = `${p.model} (${p.x.toFixed(1)}, ${p.y.toFixed(2)}, ${p.z.toFixed(1)}) road ${surface.toFixed(2)}`;
  if (top < surface - 0.02) buried.push(at);
  else if (p.y < surface - SUNK) sunk.push(at);
  else continue;
  byModel.set(p.model, (byModel.get(p.model) ?? 0) + 1);
}
console.log(`under the road (top below the surface): ${buried.length}`);
for (const s of buried.slice(0, 40)) console.log("  " + s);
console.log(`through the road (foot over ${SUNK} m under it): ${sunk.length}`);
for (const s of sunk.slice(0, 40)) console.log("  " + s);
console.log(
  [...byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `${m}: ${n}`)
    .join(", "),
);
