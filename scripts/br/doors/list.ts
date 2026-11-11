/**
 * Door bake, step 1 (node): every model with doors, each door with the opening it closes and
 * the source to photograph. Authored doors (building-access*.json) close a cut in a painted
 * door: their panel is photographed from the untouched import. Inferred doors (procedural
 * buildings with real openings) get a drawn door in the building's style.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { modelDoors } from "@/lib/fps/br/doors";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const manifest = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")) as {
  models: Record<string, { class?: string; lods: Array<{ file: string }> }>;
};
const originals = JSON.parse(
  readFileSync("public/fps/br/models/models.json", "utf8"),
) as typeof manifest;
type Spec = {
  models: Record<string, { doors?: unknown[]; cuts?: number[][]; collisionOnly?: boolean }>;
};
// Later specs win: a model re-cut in v3 uses v3's cuts.
const cuts: Record<string, number[][]> = {};
for (const f of [
  "building-access.json",
  "building-access-v2.json",
  "building-access-v3.json",
  "building-access-v4.json",
  "building-access-v5.json",
  "building-access-v6.json",
  "building-access-v7.json",
  "building-access-v8.json",
  "building-access-v9.json",
  "building-access-v10.json",
  "building-access-v11.json",
  "building-access-v12.json",
  "building-access-v14.json",
]) {
  const spec = JSON.parse(readFileSync(`art/br/${f}`, "utf8")) as Spec;
  for (const [id, m] of Object.entries(spec.models))
    if (!m.collisionOnly && m.cuts) cuts[id] = m.cuts;
}
/** Drawn styles: buildings whose cut is not on a painted door, and every inferred doorway. */
const STYLE: Record<string, string> = {
  bungalow: "house",
  townhouse: "house",
  apartment: "house",
  "strip-mall": "shop",
  "police-station": "shop",
  "bauhaus-block": "shop",
  garage: "metal",
  superstore: "metal",
  terminal: "shop",
  "ruined-cabin": "plank",
  hospital: "shop",
  school: "shop",
  "rail-depot": "metal",
  "brick-substation": "metal",
  chapel: "plank",
  warehouse: "metal",
  "military-hq": "metal",
  windmill: "plank",
  // The import shows an open, dark doorway there, not a door.
  "rural-house": "plank",
  // Their doors were separate parts (left out) or never modelled: plank doors.
  "log-cabin": "plank",
  "old-hut": "plank",
  // The industrial shells' doors are painted on: drawn steel doors in the new cuts.
  "ind-terminal": "metal",
  "ind-building-1": "metal",
  "ind-building-10": "metal",
  "ind-factory": "metal",
  "hangar-j": "metal",
  // The Millhaven works halls (2026-11-09).
  "factory-hall": "metal",
  "ind-warehouse-4": "metal",
  "ind-warehouse-5": "metal",
  "ind-smith": "metal",
  // Blackwater Prison's cell block (2026-11-09).
  "prison-block": "metal",
  // Southern Military Base's control and command posts (2026-11-09).
  "control-post": "metal",
  "command-post": "metal",
  "modern-house": "house",
  "pool-villa": "house",
  "lux-yacht": "house",
};
const jobs = [];
for (const [model, m] of Object.entries(manifest.models)) {
  if (!collision.models[model]?.length) continue;
  const doors = modelDoors(collision, model);
  if (!doors.length) continue;
  const boxes = collision.models[model]!;
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b[0]!);
    x1 = Math.max(x1, b[3]!);
    z0 = Math.min(z0, b[2]!);
    z1 = Math.max(z1, b[5]!);
  }
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  doors.forEach((d, index) => {
    const a = d.along === "x" ? 0 : 2;
    const centre = a === 0 ? d.x : d.z;
    const cut = (cuts[model] ?? []).find(
      (c) =>
        c[0]! - 0.05 <= d.x &&
        d.x <= c[3]! + 0.05 &&
        c[2]! - 0.05 <= d.z &&
        d.z <= c[5]! + 0.05 &&
        Math.abs(c[1]! - d.y0) < 0.2,
    );
    // The opening along the wall: the cut (authored), else the detected gap.
    const lo = cut ? cut[a]! : centre - d.width / 2,
      hi = cut ? cut[a + 3]! : centre + d.width / 2;
    // Outward: away from the building's middle across the wall.
    const out = d.along === "x" ? (d.z >= cz ? 1 : -1) : d.x >= cx ? 1 : -1;
    jobs.push({
      model,
      index,
      along: d.along,
      x: d.x,
      z: d.z,
      y0: d.y0,
      y1: d.y1,
      lo,
      hi,
      centre,
      out,
      style: cut && !STYLE[model] ? "photo" : (STYLE[model] ?? "house"),
      original: (originals.models[model] ?? m).lods[0]!.file,
      current: m.lods[0]!.file,
    });
  });
}
writeFileSync(process.argv[2]!, JSON.stringify(jobs, null, 1));
console.log(jobs.length, "doors on", new Set(jobs.map((j) => j.model)).size, "models");
