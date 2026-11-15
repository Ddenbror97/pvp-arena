/**
 * Map audit: the island's enterable buildings, for an interior pass. For each building model
 * (class building, with doors), how many stand on the island and one placement of it; writes
 * explorer views from inside each (camera in the middle of the ground floor, 1.7 m up, looking
 * at a corner) to argv[2] (VIEW_FILE for scripts/br/explorer/capture.mjs).
 *
 *   node scripts/br/map-audit/run.mjs interiors <views.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { DOOR_ASSETS, WORLD_ASSETS } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models;
const doors = JSON.parse(readFileSync(`public${DOOR_ASSETS.meta}`, "utf8")).models;
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const by = new Map<string, typeof isl.layout>();
for (const p of isl.layout) {
  const m = models[p.model];
  if (!m || !(p.model in doors)) continue;
  if (!by.has(p.model)) by.set(p.model, []);
  by.get(p.model)!.push(p);
}
const views: Record<string, [number[], number[]]> = {};
const rows = [...by].sort((a, b) => b[1].length - a[1].length);
for (const [id, ps] of rows) {
  // Two placements of each (the interior style differs between them).
  for (const [k, p] of [ps[Math.floor(ps.length / 2)]!, ps[Math.floor(ps.length / 3)]!].entries()) {
    const s = models[id].size as number[];
    const hx = (p.turn % 2 ? s[2]! : s[0]!) / 2,
      hz = (p.turn % 2 ? s[0]! : s[2]!) / 2;
    const floor = p.y + 0.3;
    views[k ? `${id}~2` : id] = [
      [p.x - hx * 0.55, floor + 1.6, p.z - hz * 0.55],
      [p.x + hx, floor + 1.0, p.z + hz],
    ];
  }
  console.log(
    `${id.padEnd(26)} ${String(ps.length).padStart(4)}  ${models[id].class}  ${models[id].source ?? models[id].licence}`,
  );
}
writeFileSync(process.argv[2]!, JSON.stringify(views, null, 1));
