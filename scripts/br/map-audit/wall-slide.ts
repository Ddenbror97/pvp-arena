/**
 * Map audit: how a body moves along the walls of every building model (owner, 2026-11-27:
 * "movement becomes laggy, jittery, stiff … close to building geometry"). From each doorway of
 * the first placement of every model with doors, a sprint and a walk at sixteen headings for
 * 5 s, as the game steps a body (stepBody, doors open, panes whole). Counted per run:
 *   back     ticks that move against the heading held (a jerk backward: > 5 mm)
 *   bounce   moves from side to side across the heading (left, right, left within 6 ticks)
 *   stutter  ticks that stand still between ticks that move (stick, slip, stick)
 *   stall    ticks at under a fifth of the pace before the body gets past what held it
 *   jolt     ticks whose feet rise or fall more than 0.12 m with no flight or drop under them
 *   node scripts/br/map-audit/run.mjs wall-slide [model,…] [--list]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { withDoors } from "@/lib/fps/br/doors";
import { withPanes } from "@/lib/fps/br/panes";
import type { StaticWorld } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
const hf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
const isl = buildIsland(hf, cover, meta, col);
const world: StaticWorld = withPanes(
  withDoors(isl.solid, isl.doors, new Uint8Array(isl.doors.doors.length).fill(1)),
  isl.panes,
  new Uint8Array(isl.panes.count),
);
const only =
  process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2].split(",") : null;
const list = process.argv.includes("--list");
const TICKS = Math.round(5000 / TICK_MS);

type Count = {
  back: number;
  bounce: number;
  stutter: number;
  stall: number;
  jolt: number;
  runs: number;
  ticks: number;
};
const rows: Array<[string, Count, string]> = [];
const seen = new Set<string>();
for (const d of isl.doors.doors) {
  if (seen.has(`${d.model}:${d.index}`) || (only && !only.includes(d.model))) continue;
  // (Every doorway of the model's first placement: the door set lists placements in order.)
  const first = isl.doors.doors.find((q) => q.model === d.model)!;
  if (Math.hypot(first.x - d.x, first.z - d.z) > 80) continue;
  seen.add(`${d.model}:${d.index}`);
  const c: Count = { back: 0, bounce: 0, stutter: 0, stall: 0, jolt: 0, runs: 0, ticks: 0 };
  let worst = "";
  for (let h = 0; h < 16; h++)
    for (const sprint of [true, false]) {
      const yaw = (h / 16) * Math.PI * 2 + 0.05;
      const b: BrBody = {
        x: d.x,
        y: world.supportAt(d.x, d.z, 0.35, d.y0 + 0.3),
        z: d.z,
        velocityY: 0,
        grounded: true,
        crouched: false,
      };
      const hx = -Math.sin(yaw),
        hz = -Math.cos(yaw);
      const flips: Array<[number, number]> = [];
      let still = 0,
        moving = false,
        bad = 0;
      const prog: number[] = [];
      for (let i = 0; i < TICKS; i++) {
        const x0 = b.x,
          y0 = b.y,
          z0 = b.z,
          was = b.grounded;
        stepBody(world, b, { forward: 1, strafe: 0, yaw, jump: false, sprint } as never, TICK_MS);
        const mx = b.x - x0,
          mz = b.z - z0,
          len = Math.hypot(mx, mz);
        // Against the heading held (a wall never sends a body back the way it came), or from
        // side to side across it (left, right, left within a few ticks: a bounce).
        prog.push(len);
        const along = mx * hx + mz * hz,
          across = mx * hz - mz * hx;
        // (Not the first ticks: a start in a doorway's frame is put right by `unstick`.)
        if (along < -0.005 && i > 2) {
          c.back++;
          bad++;
        }
        if (Math.abs(across) > 0.01) {
          const sgn = Math.sign(across);
          if (flips.length && flips[flips.length - 1]![1] !== sgn) flips.push([i, sgn]);
          else if (!flips.length) flips.push([i, sgn]);
          else flips[flips.length - 1]![0] = i;
          if (flips.length >= 3 && i - flips[flips.length - 3]![0] <= 6) {
            c.bounce++;
            bad++;
            flips.length = 0;
          }
        }
        if (len < 1e-4) still++;
        else {
          if (moving && still > 0 && still <= 3) {
            c.stutter++;
            bad++;
          }
          still = 0;
          moving = true;
        }
        // A step up or down the stepper took on level going (no fall, no flight of stairs: a
        // flight rises a little every tick, a jolt is one tick of many).
        if (was && b.grounded && Math.abs(b.y - y0) > 0.12) {
          c.jolt++;
          bad++;
        }
        c.ticks++;
      }
      // Held up and then through: ticks at under a fifth of the pace that are followed, within
      // a second, by a metre and a half of going (a jamb, a post or a corner crept round).
      const pace = Math.max(...prog);
      for (let i = 3; i < prog.length; i++) {
        if (prog[i]! >= pace * 0.2) continue;
        let ahead = 0;
        for (let k = i + 1; k < Math.min(prog.length, i + 31); k++) ahead += prog[k]!;
        if (ahead > 1.5) c.stall++;
      }
      c.runs++;
      if (bad > 3 && !worst) worst = `yaw ${yaw.toFixed(2)} ${sprint ? "sprint" : "walk"}`;
    }
  rows.push([`${d.model} door ${d.index}`, c, worst]);
}
const by = new Map<string, Count>();
for (const [name, c] of rows) {
  const m = name.split(" door ")[0]!;
  const t = by.get(m) ?? { back: 0, bounce: 0, stutter: 0, stall: 0, jolt: 0, runs: 0, ticks: 0 };
  for (const k of ["back", "bounce", "stutter", "stall", "jolt", "runs", "ticks"] as const)
    t[k] += c[k];
  by.set(m, t);
}
const bad = (c: Count) => c.back + c.bounce + c.stutter + c.stall;
const sorted = [...by].sort((a, b) => bad(b[1]) - bad(a[1]));
const total = { back: 0, bounce: 0, stutter: 0, stall: 0, jolt: 0, runs: 0, ticks: 0 };
for (const [, c] of sorted)
  for (const k of ["back", "bounce", "stutter", "stall", "jolt", "runs", "ticks"] as const)
    total[k] += c[k];
console.log(
  `${by.size} building models, ${total.runs} runs, ${total.ticks} ticks: back ${total.back}, bounce ${total.bounce}, stutter ${total.stutter}, stall ${total.stall}, jolt ${total.jolt}`,
);
for (const [m, c] of sorted.slice(0, list ? 400 : 25))
  console.log(
    `${m.padEnd(26)} back ${String(c.back).padStart(5)}  bounce ${String(c.bounce).padStart(5)}  stutter ${String(c.stutter).padStart(5)}  stall ${String(c.stall).padStart(5)}  jolt ${String(c.jolt).padStart(5)}  (${c.runs} runs)`,
  );
if (only) for (const [name, c, worst] of rows) console.log(" ", name, JSON.stringify(c), worst);
