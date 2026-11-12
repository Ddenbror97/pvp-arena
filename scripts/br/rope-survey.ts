/**
 * Where a climbing rope can run on the zip-line summit (rope.ts ROPES), every 5° of bearing from
 * the watchtower:
 *
 *   npx tsx scripts/br/rope-survey.ts [--step=5] [--only=150,125,25,320]
 *
 * Per bearing: the summit's edge (where the plateau breaks into a face steeper than 45°), the
 * foot (the first ground below it that is 40° or less for 6 m, or the bottom of a saddle, and
 * can be walked to from the lowlands by movement.ts's rule with a fifth to spare), the drop and the rope's length between them, the face's
 * angle along the rope, and what stands in a climber's way (rocks, trees, structures).
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { MAX_SLOPE } from "@/lib/fps/br/movement";
import { ROPE, ROPES, ropeAt, ropePath, ropeTangent } from "@/lib/fps/br/rope";
import type { CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { walkable } from "./walkable";
import { ZIPLINE } from "@/lib/fps/br/zipline";

const arg = (n: string, d: string) =>
  process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const buffer = (path: string) => {
  const b = readFileSync(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
const island = buildIsland(hf, cover, meta, collision);
const T = ZIPLINE.tower;

const reached = walkable(hf, T, MAX_SLOPE * 0.8);
const deg = (x: number, z: number) => (Math.atan(hf.slopeAt(x, z)) * 180) / Math.PI;
const step = Number(arg("step", "5"));
const only = arg("only", "");
const bearings = only
  ? only.split(",").map(Number)
  : Array.from({ length: Math.ceil(360 / step) }, (_, i) => i * step);
console.log(`summit walkable from the lowlands: ${reached(T.x, T.z)}`);
console.log("bearing  edge  rTop  foot  drop  rope  angle (min–max)  in the way");
const o = { x: 0, y: 0, z: 0 },
  t = { x: 0, y: 0, z: 0 };
for (const d of bearings) {
  const b = (d * Math.PI) / 180;
  const P = (r: number) => [T.x + Math.sin(b) * r, T.z + Math.cos(b) * r] as const;
  let edge = 0;
  for (let r = 4; r < 45; r += 0.5)
    if (deg(...P(r)) > 45) {
      edge = r;
      break;
    }
  let foot = -1;
  const hAt = (r: number) => hf.heightAt(...P(r));
  for (let r = edge + 4; r < 400 && foot < 0; r += 1) {
    let ok = reached(...P(r + ROPE.standOut));
    for (let k = -3; k <= 3 && ok; k++) if (deg(...P(r + k)) > 40) ok = false;
    // Or the bottom of a saddle: the ground beyond rises again.
    if (ok || (hAt(r + 2.5) > hAt(r + 1.5) && reached(...P(r + ROPE.standOut)))) foot = r;
  }
  if (foot < 0) {
    console.log(`${String(d).padStart(5)}  no foot within 400 m`);
    continue;
  }
  const def = { name: "", bearing: d, rBottom: foot, rTop: edge - 1.5 };
  const p = ropePath(hf, def);
  let lo = 90,
    hi = 0;
  for (let s = 0; s < p.length - 4; s += 1) {
    ropeTangent(p, s, t);
    const a = (Math.atan2(t.y, Math.hypot(t.x, t.z)) * 180) / Math.PI;
    lo = Math.min(lo, a);
    hi = Math.max(hi, a);
  }
  const hits: string[] = [];
  for (let s = 0; s <= p.length; s += 0.5) {
    ropeAt(p, s, o);
    if (island.solid.blocked(o.x, o.y + 0.3, o.z, 1.2, 0.3)) hits.push(s.toFixed(0));
  }
  for (const [name, [x, y, z]] of [
    ["foot", p.foot],
    ["exit", p.exit],
  ] as const)
    if (island.solid.blocked(x, y + 0.05, z, 1.75, 0.35)) hits.push(name);
  const drop = p.exit[1] - p.foot[1];
  console.log(
    `${String(d).padStart(5)}  ${edge.toFixed(1).padStart(5)} ${def.rTop.toFixed(1).padStart(5)} ${String(foot).padStart(5)} ${drop.toFixed(0).padStart(5)} ${p.length.toFixed(0).padStart(5)}  ${lo.toFixed(0)}°–${hi.toFixed(0)}°  ${hits.length ? [...new Set(hits)].join(",") : "clear"}`,
  );
}
console.log("\nThe ropes as built:");
for (const def of ROPES) {
  const p = ropePath(hf, def);
  console.log(
    `${def.name}: ${def.bearing}°, ${p.length.toFixed(1)} m, ${(p.exit[1] - p.foot[1]).toFixed(1)} m up, ` +
      `${(0.7 + p.length / ROPE.speed + 1.1).toFixed(0)} s; foot ${p.foot.map((v) => v.toFixed(1))} ` +
      `walkable ${reached(p.foot[0], p.foot[2])}, exit ${p.exit.map((v) => v.toFixed(1))}`,
  );
}
