/**
 * Map audit: the match's ground loot (loot.ts rollLoot) over several seeds, as the room rolls it.
 *  - items per category, per location class and per location, and the special items' counts;
 *  - where they lie: ground floor (under 1.5 m over the building's foot), upper floors (higher,
 *    with something over them), rooftops (nothing over them within 30 m);
 *  - buildings: placements of loot classes that rolled nothing, and building models that hold
 *    no loot class at all although a player can walk into them (their indoor spots);
 *  - every item checked: on something (not floating), not inside a wall, not under water;
 *  - parked vehicles: any whose footprint stands inside a building (under a roof of one).
 *   node scripts/br/map-audit/run.mjs loot-audit [seeds=5]
 */
import { readFileSync } from "node:fs";
import { waterSurface } from "@/lib/fps/br/drop";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { lootClassOf, rollLoot } from "@/lib/fps/br/loot";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import { ITEMS, type ItemId } from "@/lib/fps/br/items";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { spawnVehicles } from "@/lib/fps/br/vehicles";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models as Record<
  string,
  { class?: string; size: number[] }
>;
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const isl = buildIsland(
  hf,
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  col,
);
const world = isl.solid;
const SEEDS = Number(process.argv[2] ?? 5);

const t0 = performance.now();
type Tally = Record<string, number>;
const inc = (t: Tally, k: string, n = 1) => (t[k] = (t[k] ?? 0) + n);
const byCat: Tally = {},
  byClass: Tally = {},
  byPoi: Tally = {},
  byFloor: Tally = {},
  special: Tally = {};
let total = 0,
  floating = 0,
  inWall = 0,
  wet = 0;
// Items per placement (index), over the seeds.
const perPlacement = new Map<number, number>();
const placementOf = (x: number, y: number, z: number) => {
  // The loot-class placement whose footprint and height hold the point (a tower's storeys
  // share x and z: the one the item's height is in).
  let best = -1,
    bestD = Infinity;
  for (const i of lootPlacements) {
    const p = isl.layout[i]!;
    const size = models[p.model]?.size ?? [10, 4, 10];
    const half = Math.max(size[0]!, size[2]!) / 2 + 1;
    if (Math.abs(p.x - x) > half || Math.abs(p.z - z) > half) continue;
    if (y < p.y - 0.5 || y > p.y + size[1]! + 0.5) continue;
    const d = Math.hypot(p.x - x, p.z - z) + Math.abs(y - p.y) * 0.01;
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  }
  return best;
};
const lootPlacements = isl.layout.flatMap((p, i) => (lootClassOf(p.model) ? [i] : []));
const SPECIAL = new Set<string>([
  "tablet",
  "awp",
  "helmet-3",
  "vest-3",
  "backpack-3",
  "scope-6x",
  "hunting",
  "silencer",
]);
let rollMs = 0,
  lastMs = 0;
for (let seed = 1; seed <= SEEDS; seed++) {
  const r0 = performance.now();
  const loot = rollLoot(seed * 7919, isl.layout, col, world, meta);
  lastMs = performance.now() - r0;
  rollMs += lastMs;
  for (const it of loot) {
    total++;
    const d = ITEMS[it.item as ItemId];
    inc(byCat, d.category);
    if (SPECIAL.has(it.item)) inc(special, it.item);
    // Checks: something under it, nothing through it, not in water.
    const top = world.supportAt(it.x, it.z, 0.05, it.y + 0.05);
    if (it.y - top > 0.08) floating++;
    if (world.blocked(it.x, it.y + 0.06, it.z, 0.3, 0.1)) inWall++;
    const water = waterSurface(meta, world.hf.heightAt(it.x, it.z), it.x, it.z);
    if (water !== null && it.y < water) wet++;
    const pi = placementOf(it.x, it.y, it.z);
    if (pi >= 0) {
      const p = isl.layout[pi]!;
      perPlacement.set(pi, (perPlacement.get(pi) ?? 0) + 1);
      inc(byClass, lootClassOf(p.model)!);
      inc(byPoi, p.poi ?? "(none)");
      // Over the ground (a tower's storeys are placements of their own).
      const up = it.y - world.hf.heightAt(it.x, it.z);
      const sky = world.raycast(it.x, it.y + 0.3, it.z, 0, 1, 0, 30);
      inc(byFloor, !sky ? "rooftop / open" : up < 2 ? "ground floor" : "upper floors");
    } else inc(byPoi, "(perches, outside buildings)");
  }
}
const per = (n: number) => (n / SEEDS).toFixed(0);
console.log(
  `ground loot, mean of ${SEEDS} seeds: ${per(total)} items a match (roll ${(rollMs / SEEDS).toFixed(0)} ms mean incl. the first's spot search, ${lastMs.toFixed(0)} ms warmed)`,
);
console.log(
  "  by category:",
  Object.entries(byCat)
    .sort()
    .map(([k, v]) => `${k} ${per(v)}`)
    .join(", "),
);
console.log(
  "  by class:   ",
  Object.entries(byClass)
    .sort()
    .map(([k, v]) => `${k} ${per(v)}`)
    .join(", "),
);
console.log(
  "  by floor:   ",
  Object.entries(byFloor)
    .sort()
    .map(([k, v]) => `${k} ${per(v)}`)
    .join(", "),
);
console.log(
  "  special:    ",
  Object.entries(special)
    .sort()
    .map(([k, v]) => `${k} ${(v / SEEDS).toFixed(1)}`)
    .join(", "),
);
console.log(`  checks: floating ${floating}, in a wall ${inWall}, in water ${wet}`);
console.log("  by location:");
for (const [k, v] of Object.entries(byPoi).sort((a, b) => b[1] - a[1]))
  console.log(`    ${k.padEnd(28)} ${per(v)}`);

// Buildings with nothing.
const empty: Tally = {};
let lootBuildings = 0;
for (const i of lootPlacements) {
  lootBuildings++;
  if (!perPlacement.get(i)) inc(empty, isl.layout[i]!.model);
}
const emptyN = Object.values(empty).reduce((a, b) => a + b, 0);
console.log(
  `loot-class placements ${lootBuildings}, ${emptyN} rolled nothing in ${SEEDS} matches:`,
);
for (const [k, v] of Object.entries(empty)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25))
  console.log(`    ${k.padEnd(28)} ${v}`);
// Building models with no loot class that a player can walk into.
const noClass: Array<[string, number, number]> = [];
const placed = new Map<string, number>();
for (const p of isl.layout) placed.set(p.model, (placed.get(p.model) ?? 0) + 1);
for (const [id, m] of Object.entries(models)) {
  if (m.class !== "building" || lootClassOf(id) || !placed.get(id)) continue;
  const spots = modelSpots(col, id, "indoor", 2.5, 99).length;
  noClass.push([id, placed.get(id)!, spots]);
}
noClass.sort((a, b) => b[2] * b[1] - a[2] * a[1]);
console.log(
  `building models placed with no loot class: ${noClass.length}; with walkable indoor floors:`,
);
for (const [id, n, s] of noClass.filter((r) => r[2] > 0))
  console.log(`    ${id.padEnd(28)} ${n} placed, ${s} indoor spots`);
// Parked vehicles inside buildings (something solid over the seat, low enough to be a roof).
let cars = 0,
  carsInside = 0;
const insideAt: string[] = [];
for (let seed = 1; seed <= SEEDS; seed++)
  for (const v of spawnVehicles(meta, world, seed * 7919, isl.layout)) {
    cars++;
    const roof = world.raycast(v.x, v.y + 1.2, v.z, 0, 1, 0, 12);
    if (roof && roof.kind === "box") {
      carsInside++;
      if (insideAt.length < 12) {
        const near = isl.layout
          .filter((p) => Math.hypot(p.x - v.x, p.z - v.z) < 30)
          .sort((a, b) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(b.x - v.x, b.z - v.z))[0];
        insideAt.push(
          `${v.kind} at ${v.x.toFixed(0)}, ${v.z.toFixed(0)} under ${roof.distance.toFixed(1)} m (${near?.model ?? "?"}, ${near?.poi ?? ""})`,
        );
      }
    }
  }
console.log(
  `parked vehicles ${per(cars)} a match, with a box over the seat within 12 m: ${(carsInside / SEEDS).toFixed(1)}`,
);
for (const s of insideAt) console.log("    " + s);
console.log(`audit ${((performance.now() - t0) / 1000).toFixed(0)} s`);
