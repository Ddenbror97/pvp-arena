/**
 * Map audit: camera views at the doors of every enterable model type (one island placement
 * each, the flattest), plus a 3/4 view of building types without doors. Writes argv[2]: the
 * multi-view spec [[name, [x, z, up], [lx, lz, lup]], …] and a door table.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { modelDoors } from "@/lib/fps/br/doors";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { indoorLootPoint, modelSpots, turnPoint } from "@/lib/fps/br/loot-spots";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync("public/fps/br/world.v1.json", "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const models = JSON.parse(readFileSync(`public${WORLD_ASSETS.models}`, "utf8")).models;
const hf = await decodeHeightfield(buf("public/fps/br/height.v1.hf"));
const cover = await decodeLandCover(buf("public/fps/br/landcover.v1.lc"));
const island = buildIsland(hf, cover, meta, collision);
const only = process.argv[3]?.split(",");
function centre(model: string) {
  const bs = collision.models[model]!;
  let x0 = Infinity,
    x1 = -Infinity,
    z0 = Infinity,
    z1 = -Infinity;
  for (const b of bs) {
    x0 = Math.min(x0, b[0]!);
    x1 = Math.max(x1, b[3]!);
    z0 = Math.min(z0, b[2]!);
    z1 = Math.max(z1, b[5]!);
  }
  return [(x0 + x1) / 2, (z0 + z1) / 2];
}
const views: unknown[] = [];
const table: unknown[] = [];
const byModel = new Map<string, typeof island.layout>();
for (const p of island.layout) {
  const cls = models[p.model]?.class;
  if (cls !== "building" && !(cls === "structure" && (collision.models[p.model]?.length ?? 0) > 20))
    continue;
  if (only && !only.includes(p.model)) continue;
  (byModel.get(p.model) ?? byModel.set(p.model, []).get(p.model)!).push(p);
}
for (const [model, ps] of byModel) {
  // The placement whose ground is flattest around it (a clean view).
  const flat = (p: (typeof ps)[number]) =>
    Math.max(
      ...[-8, 8].flatMap((a) => [-8, 8].map((b) => Math.abs(hf.heightAt(p.x + a, p.z + b) - p.y))),
    );
  const p = [...ps].sort((a, b) => flat(a) - flat(b))[
    Math.min(ps.length - 1, Number(process.env.PICK ?? 0))
  ]!;
  const doors = modelDoors(collision, model);
  const indoor = modelSpots(collision, model, "indoor", 2.5, 60).length;
  table.push({
    model,
    n: ps.length,
    indoor,
    doors: doors.map((d) => ({ ...d })),
    at: [p.x, p.z, p.turn, p.poi],
  });
  doors.slice(0, Number(process.env.MAXD ?? 3)).forEach((d, k) => {
    // Outside: the side of the doorway that is not inside a room.
    const n = d.along === "x" ? [0, 1] : [1, 0];
    const yIn = d.y0 + 0.05;
    const inside = (s: number) =>
      indoorLootPoint(collision, model, d.x + n[0]! * s * 1.5, yIn, d.z + n[1]! * s * 1.5);
    // Outside: not in a room; failing that, away from the model's centre.
    const [mx, mz] = centre(model);
    const away = (d.x - mx) * n[0]! + (d.z - mz) * n[1]! >= 0 ? 1 : -1;
    const s = inside(1) !== inside(-1) ? (inside(1) ? -1 : 1) : away;
    const dist = Number(process.env.DIST ?? 4.5);
    const ox = d.x + n[0]! * s * dist,
      oz = d.z + n[1]! * s * dist;
    const [cx, cz] = turnPoint(ox, oz, p.turn);
    const [dx, dz] = turnPoint(d.x, d.z, p.turn);
    views.push([
      `${model}-door${k}`,
      [p.x + cx, p.z + cz, p.y + d.y0 + 1.6 - hf.heightAt(p.x + cx, p.z + cz)],
      [p.x + dx, p.z + dz, p.y + d.y0 + 1.1 - hf.heightAt(p.x + dx, p.z + dz)],
    ]);
  });
  if (!doors.length) {
    const boxes = collision.models[model]!;
    const r = Math.max(
      ...boxes.map((b) =>
        Math.max(Math.abs(b[0]!), Math.abs(b[3]!), Math.abs(b[2]!), Math.abs(b[5]!)),
      ),
    );
    // Four sides, square on (model axes turned with the placement).
    const [mx, mz] = centre(model);
    for (const [k, [ax, az]] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ].entries()) {
      const [cx, cz] = turnPoint(mx + ax! * (r + 6), mz + az! * (r + 6), p.turn);
      const [tx, tz] = turnPoint(mx, mz, p.turn);
      views.push([`${model}-side${k}`, [p.x + cx, p.z + cz, 2.5], [p.x + tx, p.z + tz, 2]]);
    }
  }
}
writeFileSync(process.argv[2]!, JSON.stringify({ views, table }, null, 1));
console.log(views.length, "views", table.length, "models");
