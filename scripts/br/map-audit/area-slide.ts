/**
 * Map audit: movement along the walls and corners of a whole place (owner, 2026-11-27: "check
 * the fortress … a lot laggy running with the walls and corners"). wall-slide and view-smooth
 * start in doorways; a place without doors (the Old Fortress: open arches) or with long outer
 * walls is walked from here instead. Standing points are every walkable surface on a grid over
 * the place (all its levels) that has something solid within reach; from each a sprint at
 * sixteen headings for 3 s, stepped as the game steps a body and drawn as the client draws it
 * (144 frames a second).
 *   body   back / bounce / stutter as wall-slide; stall = ticks at under a fifth of the pace
 *          followed within a second by 1.5 m of going
 *   view   back / shake / hitch as view-smooth
 *   cost   µs a step (mean and the worst standing point), boxes in the fullest cell
 *   node scripts/br/map-audit/run.mjs area-slide <poi id> [half extent m] [grid m]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { newDropBody, stepDrop, waterSurface, type DropInput, type Route } from "@/lib/fps/br/drop";
import { BrFrameView } from "@/lib/fps/br/frame-view";
import { withDoors } from "@/lib/fps/br/doors";
import { withPanes } from "@/lib/fps/br/panes";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8")) as WorldMeta;
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const isl = buildIsland(
  hf,
  await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`)),
  meta,
  col,
);
const world = withPanes(
  withDoors(isl.solid, isl.doors, new Uint8Array(isl.doors.doors.length).fill(1)),
  isl.panes,
  new Uint8Array(isl.panes.count),
);
const route: Route = { a: [0, 0], b: [1, 0], dir: [1, 0], length: 1 };
const poi = meta.pois.find((p) => p.id === process.argv[2]);
if (!poi) throw new Error(`no such place: ${process.argv[2]} (${meta.pois.map((p) => p.id)})`);
const HALF = Number(process.argv[3] ?? 110),
  GRID = Number(process.argv[4] ?? 3);
const R = 0.35,
  HULL = 1.8,
  FPS = 144;

// Standing points: each surface under a grid point, from the top down, a hull fits on and
// that has something solid at chest height within 1.2 m (a wall, a pier, a corner).
type Spot = { x: number; y: number; z: number };
const spots: Spot[] = [];
for (let gx = -HALF; gx <= HALF; gx += GRID)
  for (let gz = -HALF; gz <= HALF; gz += GRID) {
    const x = poi.x + gx + 0.17,
      z = poi.z + gz + 0.23;
    let max = 1e4;
    for (let level = 0; level < 8; level++) {
      const y = world.supportAt(x, z, R, max);
      max = y - 2;
      const water = waterSurface(meta, hf.heightAt(x, z), x, z);
      if (!world.blocked(x, y, z, HULL, R) && (water === null || y >= water)) {
        let near = false;
        for (let a = 0; a < 8 && !near; a++)
          near = world.blocked(
            x + Math.cos((a * Math.PI) / 4) * 1.2,
            y + 0.5,
            z + Math.sin((a * Math.PI) / 4) * 1.2,
            1,
            R,
          );
        if (near) spots.push({ x, y, z });
      }
      if (y <= hf.heightAt(x, z) + 1e-3) break;
    }
  }

const total = {
  back: 0,
  bounce: 0,
  stutter: 0,
  stall: 0,
  ticks: 0,
  vback: 0,
  shake: 0,
  hitch: 0,
  frames: 0,
  swum: 0,
  held: 0,
  slow: 0,
};
const zero = { x: 0, y: 0, z: 0 };
type Row = { spot: Spot; us: number; bad: number; stall: number; worst: string };
const rows: Row[] = [];
for (const spot of spots) {
  const row: Row = { spot, us: 0, bad: 0, stall: 0, worst: "" };
  let steps = 0,
    spent = 0;
  for (let h = 0; h < 16; h++) {
    const yaw = (h / 16) * Math.PI * 2 + 0.05;
    const hx = -Math.sin(yaw),
      hz = -Math.cos(yaw);
    const input = { forward: 1, strafe: 0, yaw, jump: false, sprint: true } as DropInput;
    const body = Object.assign(newDropBody(), spot, { grounded: true, phase: "ground" as const });
    const view = new BrFrameView();
    const flips: Array<[number, number]> = [];
    const prog: number[] = [],
      across: number[] = [],
      moves: number[] = [];
    let acc = 0,
      lx = NaN,
      lz = NaN,
      still = 0,
      moving = false,
      bad = 0,
      i = 0,
      swam = false;
    const mark = { ...total };
    for (let f = 0; f < 3 * FPS; f++) {
      acc += 1000 / FPS;
      while (acc >= TICK_MS) {
        const x0 = body.x,
          z0 = body.z;
        const t0 = performance.now();
        stepDrop(world, meta, route, body, input, 0, TICK_MS);
        spent += performance.now() - t0;
        if (body.phase !== "ground") swam = true;
        steps++;
        acc -= TICK_MS;
        const mx = body.x - x0,
          mz = body.z - z0,
          len = Math.hypot(mx, mz);
        prog.push(len);
        const al = mx * hx + mz * hz,
          ac = mx * hz - mz * hx;
        if (al < -0.005 && i > 2) {
          total.back++;
          bad++;
        }
        if (Math.abs(ac) > 0.01) {
          const sgn = Math.sign(ac);
          if (!flips.length || flips[flips.length - 1]![1] !== sgn) flips.push([i, sgn]);
          else flips[flips.length - 1]![0] = i;
          if (flips.length >= 3 && i - flips[flips.length - 3]![0] <= 6) {
            total.bounce++;
            bad++;
            flips.length = 0;
          }
        }
        if (len < 1e-4) still++;
        else {
          if (moving && still > 0 && still <= 3) {
            total.stutter++;
            bad++;
          }
          still = 0;
          moving = true;
        }
        total.ticks++;
        i++;
      }
      const v = view.sample(world, meta, route, body, input, 0, acc, 1000 / FPS, zero);
      if (f > 8 && Number.isFinite(lx)) {
        const mx = v.x - lx,
          mz = v.z - lz;
        if (mx * hx + mz * hz < -0.001) {
          total.vback++;
          bad++;
        }
        across.push(mx * hz - mz * hx);
        moves.push(Math.hypot(mx, mz));
        const n = across.length;
        if (
          n >= 3 &&
          Math.abs(across[n - 1]!) > 0.0004 &&
          Math.abs(across[n - 2]!) > 0.0004 &&
          Math.abs(across[n - 3]!) > 0.0004 &&
          Math.sign(across[n - 1]!) !== Math.sign(across[n - 2]!) &&
          Math.sign(across[n - 2]!) !== Math.sign(across[n - 3]!)
        ) {
          total.shake++;
          bad++;
        }
        total.frames++;
      }
      lx = v.x;
      lz = v.z;
    }
    const sorted = moves.filter((m) => m > 1e-4).sort((a, b) => a - b);
    const med = sorted[sorted.length >> 1] ?? 0;
    if (med > 0.002)
      for (let k = 1; k + 1 < moves.length; k++)
        if (moves[k]! > med * 2.2 && moves[k - 1]! < med * 1.3) {
          total.hitch++;
          bad++;
        }
    // A run that reached water is the swim's, not the walls': counted apart.
    if (swam) {
      Object.assign(total, mark, { swum: total.swum + 1 });
      continue;
    }
    const pace = Math.max(...prog);
    // Snags: a tick at under half the pace between ticks at four fifths of it or more (the
    // one before, and one of the three after): going, caught, going again. A wall drawn
    // straight and stood as a staircase of boxes does this at every tread.
    for (let k = 1; k + 1 < prog.length; k++)
      if (
        prog[k]! < pace * 0.5 &&
        prog[k - 1]! >= pace * 0.8 &&
        Math.max(prog[k + 1]!, prog[k + 2] ?? 0, prog[k + 3] ?? 0) >= pace * 0.8
      )
        total.slow++;
    total.held += prog.length;
    let stalled = 0;
    for (let k = 3; k < prog.length; k++) {
      if (prog[k]! >= pace * 0.2) continue;
      let ahead = 0;
      for (let q = k + 1; q < Math.min(prog.length, k + 31); q++) ahead += prog[q]!;
      if (ahead > 1.5) stalled++;
    }
    total.stall += stalled;
    row.stall += stalled;
    if (bad + stalled > row.bad) {
      row.bad = bad + stalled;
      row.worst = `heading ${h} (yaw ${yaw.toFixed(2)}): ${bad} bad, ${stalled} stalled`;
    }
  }
  row.us = (spent / steps) * 1000;
  rows.push(row);
}
const at = (s: Spot) =>
  `${(s.x - poi.x).toFixed(1)}, ${(s.y - (poi.padHeight ?? 0)).toFixed(1)}, ${(s.z - poi.z).toFixed(1)}`;
const us = rows.map((r) => r.us).sort((a, b) => a - b);
console.log(
  `${poi.id}: ${spots.length} standing points by walls, ${total.ticks} ticks, ${total.frames} frames`,
);
console.log(`  (${total.swum} runs reached water and are left out)`);
console.log(
  `  body  back ${total.back}, bounce ${total.bounce}, stutter ${total.stutter}, stall ${total.stall}`,
);
console.log(
  `  snags ${total.slow} (one in ${Math.round(total.held / Math.max(1, total.slow))} ticks)`,
);
console.log(`  view  back ${total.vback}, shake ${total.shake}, hitch ${total.hitch}`);
console.log(
  `  cost  mean ${(us.reduce((a, b) => a + b, 0) / us.length).toFixed(1)} µs a step, median ${us[us.length >> 1]!.toFixed(1)}, p95 ${us[Math.floor(us.length * 0.95)]!.toFixed(1)}, worst ${us[us.length - 1]!.toFixed(1)}`,
);
console.log("  dearest standing points (x, y, z from the place's centre):");
for (const r of [...rows].sort((a, b) => b.us - a.us).slice(0, 8))
  console.log(`    ${at(r.spot).padEnd(22)} ${r.us.toFixed(1)} µs a step`);
console.log("  roughest standing points:");
for (const r of [...rows].sort((a, b) => b.bad - a.bad).slice(0, 12))
  console.log(`    ${at(r.spot).padEnd(22)} ${r.worst}`);
