/** node scripts/br/map-audit/run.mjs roads — trees, props and vehicles on roads and bridges, roads through buildings (2026-11-11 audit; N=… lists more per kind). */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { cellTrees } from "@/lib/fps/br/vegetation";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models as Record<
  string,
  { class: string; size: number[] }
>;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
type Seg = [number, number, number, number, number];
const segs: Seg[] = [];
for (const r of meta.roads)
  for (let k = 1; k < r.points.length; k++)
    segs.push([...r.points[k - 1]!, ...r.points[k]!, r.width / 2] as Seg);
const G = 50,
  grid = new Map<number, Seg[]>();
for (const s of segs) {
  const [ax, az, bx, bz, hw] = s;
  for (
    let cz = Math.floor((Math.min(az, bz) - hw - 30) / G);
    cz <= Math.floor((Math.max(az, bz) + hw + 30) / G);
    cz++
  )
    for (
      let cx = Math.floor((Math.min(ax, bx) - hw - 30) / G);
      cx <= Math.floor((Math.max(ax, bx) + hw + 30) / G);
      cx++
    ) {
      const k = cz * 10000 + cx;
      (grid.get(k) ?? grid.set(k, []).get(k)!).push(s);
    }
}
/** How far inside the nearest road's edge (m; negative: outside). */
const intoRoad = (x: number, z: number) => {
  let best = -Infinity;
  for (const [ax, az, bx, bz, hw] of grid.get(Math.floor(z / G) * 10000 + Math.floor(x / G)) ??
    []) {
    const vx = bx - ax,
      vz = bz - az,
      l2 = vx * vx + vz * vz || 1;
    const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
    best = Math.max(best, hw - Math.hypot(x - ax - vx * u, z - az - vz * u));
  }
  return best;
};
const intoBridge = (x: number, z: number, r: number) => {
  let best = -Infinity,
    id = "";
  for (const b of meta.bridges) {
    const vx = b.b[0] - b.a[0],
      vz = b.b[1] - b.a[1],
      l2 = vx * vx + vz * vz;
    const u = ((x - b.a[0]) * vx + (z - b.a[1]) * vz) / l2;
    if (u < -0.02 || u > 1.02) continue;
    const d = Math.abs((x - b.a[0]) * vz - (z - b.a[1]) * vx) / Math.sqrt(l2);
    const v = b.width / 2 + r - d;
    if (v > best) {
      best = v;
      id = b.id;
    }
  }
  return [best, id] as const;
};
const report: Record<string, string[]> = {};
const add = (k: string, s: string) => (report[k] ??= []).push(s);
// Trees: trunk within the road surface.
let trees = 0;
for (let cj = 0; cj < 40; cj++)
  for (let ci = 0; ci < 40; ci++) {
    const t = cellTrees(island.vegetation, ci, cj);
    for (let k = 0; k < t.length; k += 6) {
      const x = t[k]!,
        z = t[k + 2]!;
      trees++;
      const v = intoRoad(x, z);
      if (v > -0.6) add("tree on road", `${x.toFixed(0)},${z.toFixed(0)} into ${v.toFixed(1)}`);
      const [bv, bid] = intoBridge(x, z, 0.6);
      if (bv > 0) add("tree on bridge", `${bid} ${x.toFixed(0)},${z.toFixed(0)}`);
    }
  }
const SKIP = new Set(["small"]);
for (const p of island.layout) {
  const m = models[p.model];
  const cls = m?.class ?? "?";
  if (SKIP.has(cls)) continue;
  const half = m ? Math.min(m.size[0]!, m.size[2]!) / 2 : 1;
  const v = intoRoad(p.x, p.z);
  if (v + half > 0.5 && !["bridge", "road"].includes(p.poi))
    add(
      `${cls} on road`,
      `${p.model} ${p.poi} ${p.x.toFixed(0)},${p.z.toFixed(0)} into ${(v + half).toFixed(1)}`,
    );
  const [bv, bid] = intoBridge(p.x, p.z, half);
  if (bv > 0)
    add(
      `${cls} on bridge`,
      `${p.model} ${p.poi} ${bid} ${p.x.toFixed(0)},${p.z.toFixed(0)} y=${p.y} into ${bv.toFixed(1)}`,
    );
}
console.log("trees", trees);
for (const [k, list] of Object.entries(report)) {
  console.log(`== ${k}: ${list.length}`);
  for (const s of list.slice(0, Number(process.env.N ?? 15))) console.log("  ", s);
}
// Roads running through a building's footprint (in one side, out the other; a driveway that
// ends inside, at a hangar door, is not counted).
const clipLen = (
  ax: number,
  az: number,
  bx: number,
  bz: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
) => {
  let t0 = 0,
    t1 = 1;
  const dx = bx - ax,
    dz = bz - az;
  for (const [p, q] of [
    [-dx, ax - x0],
    [dx, x1 - ax],
    [-dz, az - z0],
    [dz, z1 - az],
  ] as const) {
    if (p === 0) {
      if (q < 0) return 0;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
  }
  return t1 > t0 ? (t1 - t0) * Math.hypot(dx, dz) : 0;
};
const through: string[] = [];
for (const p of island.layout) {
  const m = models[p.model];
  if (!m || !["building", "structure", "hero"].includes(m.class)) continue;
  let [w, d] = [m.size[0]!, m.size[2]!];
  if (p.turn % 2) [w, d] = [d, w];
  const x0 = p.x - w / 2 + 0.5,
    x1 = p.x + w / 2 - 0.5,
    z0 = p.z - d / 2 + 0.5,
    z1 = p.z + d / 2 - 0.5;
  for (const r of meta.roads) {
    let inside = 0;
    for (let k = 1; k < r.points.length; k++) {
      const [ax, az] = r.points[k - 1]!,
        [bx, bz] = r.points[k]!;
      // The road's half width widens the footprint.
      const hw = (Number(process.env.HW ?? 0) * r.width) / 2;
      inside += clipLen(ax, az, bx, bz, x0 - hw, z0 - hw, x1 + hw, z1 + hw);
    }
    if (inside < 4) continue;
    const ends = [r.points[0]!, r.points[r.points.length - 1]!].filter(
      ([x, z]) => x > x0 - 3 && x < x1 + 3 && z > z0 - 3 && z < z1 + 3,
    ).length;
    if (ends === 0)
      through.push(
        `${p.model} ${p.poi} ${p.x.toFixed(0)},${p.z.toFixed(0)} road w${r.width} inside ${inside.toFixed(0)} m`,
      );
    else if (process.env.ENDS)
      through.push(
        `(end) ${p.model} ${p.poi} ${p.x.toFixed(0)},${p.z.toFixed(0)} inside ${inside.toFixed(0)}`,
      );
  }
}
console.log(`== road through building: ${through.length}`);
for (const s of through) console.log("  ", s);
