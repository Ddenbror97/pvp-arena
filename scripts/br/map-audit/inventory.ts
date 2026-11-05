/**
 * Map audit, step 1: what the island actually contains, measured from the same data the game
 * runs on (heightfield, land cover, layout, vegetation, collision, loot). Writes JSON to argv[2].
 *
 *   node scripts/br/map-audit/run.mjs inventory <out.json>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { rollLoot } from "@/lib/fps/br/loot";
import { modelSpots } from "@/lib/fps/br/loot-spots";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { cellTrees, CELLS, TREE_STRIDE } from "@/lib/fps/br/vegetation";
import { LAND_COVER, WORLD_HALF, type WorldMeta } from "@/lib/fps/br/world";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync("public/fps/br/models/collision.json", "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync("public/fps/br/models/models.json", "utf8"))
  .models as Record<
  string,
  { class: string; use?: string; size: number[]; lods: { tris: number }[] }
>;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const layout = island.layout;
const loot = rollLoot(1, island.layout, collision, island.solid, meta);

const COLS = "ABCDEFGHIJ";
const cellRef = (x: number, z: number) => {
  const c = Math.floor((x + WORLD_HALF) / 1000),
    r = Math.floor((z + WORLD_HALF) / 1000);
  return c >= 0 && c < 10 && r >= 0 && r < 10 ? `${COLS[c]}${r + 1}` : null;
};
const isBuilding = (m: string) => models[m]?.class === "building";
const indoor = (m: string) => modelSpots(collision, m, "indoor", 2.5, 60).length;

// ---------------------------------------------------------------- per POI
const pois = meta.pois.map((p) => {
  const mine = layout.filter((l) => l.poi === p.id);
  const byModel: Record<string, number> = {};
  for (const l of mine) byModel[l.model] = (byModel[l.model] ?? 0) + 1;
  const buildings = mine.filter((l) => isBuilding(l.model));
  const buildingModels = [...new Set(buildings.map((b) => b.model))];
  const enterable = buildings.filter((b) => indoor(b.model) > 0);
  // Terrain inside the POI radius.
  let lo = Infinity,
    hi = -Infinity;
  for (let a = 0; a < 64; a++)
    for (const f of [0.15, 0.35, 0.55, 0.75, 0.95]) {
      const x = p.x + Math.cos((a / 64) * Math.PI * 2) * p.radius * f,
        z = p.z + Math.sin((a / 64) * Math.PI * 2) * p.radius * f;
      const h = hf.heightAt(x, z);
      if (h > 0.5) {
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    }
  const lootHere = loot.filter((it) => Math.hypot(it.x - p.x, it.z - p.z) <= p.radius).length;
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    cell: cellRef(p.x, p.z),
    x: p.x,
    z: p.z,
    radius: p.radius,
    placements: mine.length,
    buildings: buildings.length,
    buildingModels,
    enterableBuildings: enterable.length,
    enterableModels: [...new Set(enterable.map((b) => b.model))],
    tallestBuildingM: Math.max(0, ...buildings.map((b) => models[b.model]?.size[1] ?? 0)),
    byModel,
    terrain: { low: +lo.toFixed(1), high: +hi.toFixed(1), relief: +(hi - lo).toFixed(1) },
    loot: lootHere,
  };
});

// ---------------------------------------------------------------- per grid cell
const step = 20;
const cells: Record<string, Record<string, number>> = {};
for (let r = 0; r < 10; r++)
  for (let c = 0; c < 10; c++) {
    const x0 = -WORLD_HALF + c * 1000,
      z0 = -WORLD_HALF + r * 1000;
    let n = 0,
      land = 0,
      sum = 0,
      sum2 = 0,
      lo = Infinity,
      hi = -Infinity,
      slopeSum = 0,
      steep = 0,
      flat = 0;
    const classes: Record<string, number> = {};
    for (let z = z0 + step / 2; z < z0 + 1000; z += step)
      for (let x = x0 + step / 2; x < x0 + 1000; x += step) {
        n++;
        const h = hf.heightAt(x, z);
        const cl = LAND_COVER[cover.classIdAt(x, z)] ?? "grass";
        classes[cl] = (classes[cl] ?? 0) + 1;
        if (cl === "water" || h <= 0.3) continue;
        land++;
        sum += h;
        sum2 += h * h;
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
        const gx = (hf.heightAt(x + 4, z) - hf.heightAt(x - 4, z)) / 8,
          gz = (hf.heightAt(x, z + 4) - hf.heightAt(x, z - 4)) / 8;
        const s = (Math.atan(Math.hypot(gx, gz)) * 180) / Math.PI;
        slopeSum += s;
        if (s > 15) steep++;
        if (s < 2) flat++;
      }
    const mean = land ? sum / land : 0;
    const ref = `${COLS[c]}${r + 1}`;
    let trees = 0;
    for (let cj = r * 4; cj < r * 4 + 4; cj++)
      for (let ci = c * 4; ci < c * 4 + 4; ci++)
        if (ci < CELLS && cj < CELLS)
          trees += cellTrees(island.vegetation, ci, cj).length / TREE_STRIDE;
    const inCell = layout.filter((l) => cellRef(l.x, l.z) === ref);
    let road = 0;
    for (const rd of meta.roads)
      for (let k = 1; k < rd.points.length; k++) {
        const a = rd.points[k - 1]!,
          b = rd.points[k]!;
        if (cellRef((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) === ref)
          road += Math.hypot(b[0] - a[0], b[1] - a[1]);
      }
    cells[ref] = {
      land: +(land / n).toFixed(2),
      low: land ? +lo.toFixed(1) : 0,
      high: land ? +hi.toFixed(1) : 0,
      relief: land ? +(hi - lo).toFixed(1) : 0,
      stdHeight: land ? +Math.sqrt(Math.max(0, sum2 / land - mean * mean)).toFixed(1) : 0,
      meanSlopeDeg: land ? +(slopeSum / land).toFixed(1) : 0,
      steepShare: land ? +(steep / land).toFixed(2) : 0,
      flatShare: land ? +(flat / land).toFixed(2) : 0,
      forest: +((classes.forest ?? 0) / n).toFixed(2),
      urban: +((classes.urban ?? 0) / n).toFixed(2),
      field: +((classes.field ?? 0) / n).toFixed(2),
      rock: +((classes.rock ?? 0) / n).toFixed(2),
      buildings: inCell.filter((l) => isBuilding(l.model)).length,
      props: inCell.filter((l) => !isBuilding(l.model)).length,
      trees,
      roadKm: +(road / 1000).toFixed(2),
      loot: loot.filter((it) => cellRef(it.x, it.z) === ref).length,
    };
  }

// ---------------------------------------------------------------- water, bridges, runways
const rivers = meta.rivers.map((rv, i) => {
  const pts = (rv as unknown as { points: [number, number][] }).points ?? [];
  const beds = pts.map(([x, z]) => +hf.heightAt(x, z).toFixed(1));
  let len = 0;
  for (let k = 1; k < pts.length; k++)
    len += Math.hypot(pts[k]![0] - pts[k - 1]![0], pts[k]![1] - pts[k - 1]![1]);
  return { i, keys: Object.keys(rv), points: pts.length, lengthKm: +(len / 1000).toFixed(2), beds };
});
const bridges = meta.bridges.map((b) => {
  const len = Math.hypot(b.b[0] - b.a[0], b.b[1] - b.a[1]);
  const under: number[] = [];
  for (let k = 1; k < 10; k++) {
    const x = b.a[0] + ((b.b[0] - b.a[0]) * k) / 10,
      z = b.a[1] + ((b.b[1] - b.a[1]) * k) / 10;
    under.push(+hf.heightAt(x, z).toFixed(1));
  }
  return {
    ...b,
    lengthM: +len.toFixed(0),
    ends: [+hf.heightAt(b.a[0], b.a[1]).toFixed(1), +hf.heightAt(b.b[0], b.b[1]).toFixed(1)],
    groundUnder: under,
    cellA: cellRef(b.a[0], b.a[1]),
    cellB: cellRef(b.b[0], b.b[1]),
  };
});
const families: Record<string, string[]> = {};
for (const [id, m] of Object.entries(models)) (families[m.class] ??= []).push(id);
const countryside = layout.filter((l) => !meta.pois.some((p) => p.id === l.poi));
const countrysideBuildings: Record<string, number> = {};
for (const l of countryside)
  if (isBuilding(l.model)) countrysideBuildings[l.model] = (countrysideBuildings[l.model] ?? 0) + 1;

writeFileSync(
  process.argv[2] ?? "inventory.json",
  JSON.stringify(
    {
      world: meta.world,
      stats: meta.stats,
      totals: {
        placements: layout.length,
        buildings: layout.filter((l) => isBuilding(l.model)).length,
        loot: loot.length,
        roadsKm: +(
          meta.roads.reduce((s, r) => {
            let d = 0;
            for (let k = 1; k < r.points.length; k++)
              d += Math.hypot(
                r.points[k]![0] - r.points[k - 1]![0],
                r.points[k]![1] - r.points[k - 1]![1],
              );
            return s + d;
          }, 0) / 1000
        ).toFixed(1),
        lakes: meta.waterBodies.length,
        modelsByClass: Object.fromEntries(Object.entries(families).map(([k, v]) => [k, v.length])),
      },
      families,
      countrysidePois: [...new Set(countryside.map((l) => l.poi))],
      countrysideBuildings,
      pois,
      cells,
      rivers,
      bridges,
      runways: meta.runways,
      perches: meta.perches,
    },
    null,
    1,
  ),
);
console.log("ok");
