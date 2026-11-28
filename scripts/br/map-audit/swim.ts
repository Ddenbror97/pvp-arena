/**
 * Map audit: swimming in a water body and against what stands in it (owner, 2026-11-27, the
 * prison's moat). Swimmers start on a grid over the water (where it is deeper than wading) and
 * swim at sixteen headings for 6 s, as the game steps them (stepDrop). Counted per tick:
 *   inside   a swimmer's head and shoulders (0.6 m under the surface to 0.3 m over it) in a box
 *            or a wall, or a walker's hull in one
 *   flips    swim → ground → swim within ten ticks (the body put on the bed and back)
 *   drops    the feet jump more than 1 m in one tick
 *   under    a swimmer under a floor (a box over the water within 2.5 m over the surface, over
 *            its head: inside a building, under its ground floor)
 * And per run: whether it left the water (on its feet at the end), and where it stopped.
 *   node scripts/br/map-audit/run.mjs swim <water body id> [grid m]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import {
  DROP,
  newDropBody,
  stepDrop,
  waterSurface,
  type DropInput,
  type Route,
} from "@/lib/fps/br/drop";
import { withDoors } from "@/lib/fps/br/doors";
import { withPanes } from "@/lib/fps/br/panes";
import { WORLD_ASSETS, type WorldMeta } from "@/lib/fps/br/world";

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
const water = meta.waterBodies.find((w) => w.id === process.argv[2]);
if (!water) throw new Error(`no such water: ${process.argv[2]}`);
const GRID = Number(process.argv[3] ?? 4);
// node … swim <id> trace <x> <z> <heading>: one run tick by tick (x, z from the bounds' corner).
const trace = process.argv[3] === "trace" ? process.argv.slice(4).map(Number) : null;
const [bx0, bz0, bx1, bz1] = water.bounds;
const TICK = 1000 / 30;
const t = { runs: 0, ticks: 0, inside: 0, flips: 0, drops: 0, under: 0, out: 0, intoWall: 0 };
const worst = new Map<string, number>();
for (let x = trace ? bx0 + trace[0]! : bx0 + GRID / 2; x < bx1; x += trace ? Infinity : GRID)
  for (let z = trace ? bz0 + trace[1]! : bz0 + GRID / 2; z < bz1; z += trace ? Infinity : GRID) {
    const ground = hf.heightAt(x, z);
    const surface = waterSurface(meta, ground, x, z);
    if (surface === null || surface - ground <= DROP.wadeDepth + 0.3) continue;
    // Not inside something already (a pier's leg, the keep's foundation).
    if (world.blocked(x, surface - 0.6, z, 0.9, 0.35)) continue;
    for (let h = trace ? trace[2]! : 0; h < (trace ? trace[2]! + 1 : 16); h++) {
      const yaw = (h / 16) * Math.PI * 2 + 0.05;
      const input = { forward: 1, strafe: 0, yaw, jump: false, sprint: true } as DropInput;
      const b = Object.assign(newDropBody(), { x, y: surface, z, phase: "swim" as const });
      const phases: string[] = [];
      let bad = 0;
      for (let i = 0; i < 180; i++) {
        const y0 = b.y;
        stepDrop(world, meta, route, b, input, 0, TICK);
        phases.push(b.phase);
        if (trace)
          console.log(
            `${String(i).padStart(3)} ${b.phase.padEnd(6)} ${(b.x - bx0).toFixed(2)}, ${(b.y - water.level).toFixed(2)}, ${(b.z - bz0).toFixed(2)}  ground ${(hf.heightAt(b.x, b.z) - water.level).toFixed(2)} water ${waterSurface(meta, hf.heightAt(b.x, b.z), b.x, b.z) === null ? "no" : "yes"} in ${world.blocked(b.x, b.y - 0.6, b.z, 0.9, 0.35) ? "WALL" : "-"}`,
          );
        const n = phases.length;
        if (b.phase === "swim") {
          if (world.blocked(b.x, b.y - 0.6, b.z, 0.9, 0.35)) {
            t.inside++;
            bad++;
          }
          // A floor over the head, low: under a building.
          const over = world.supportAt(b.x, b.z, 0.05, b.y + 2.5);
          if (over > b.y + 0.3) {
            t.under++;
            bad++;
          }
        } else if (b.phase === "ground" && world.blocked(b.x, b.y + 1e-4, b.z, 1.8, 0.35)) {
          t.inside++;
          bad++;
        }
        if (
          n >= 3 &&
          phases[n - 1] === "swim" &&
          phases.slice(Math.max(0, n - 11), n - 1).includes("ground") &&
          phases.slice(Math.max(0, n - 11), n - 1).includes("swim")
        ) {
          // (Counted once per return to the water.)
          if (phases[n - 2] !== "swim") {
            t.flips++;
            bad++;
          }
        }
        if (Math.abs(b.y - y0) > 1) {
          t.drops++;
          bad++;
        }
        t.ticks++;
      }
      t.runs++;
      if (b.phase === "ground") t.out++;
      if (bad) {
        const key = `${(x - bx0).toFixed(0)}, ${(z - bz0).toFixed(0)} heading ${h}`;
        worst.set(key, bad);
      }
    }
  }
console.log(
  `${water.id}: ${t.runs} swims, ${t.ticks} ticks: inside ${t.inside}, flips ${t.flips}, drops ${t.drops}, under ${t.under}; ${t.out} ended out of the water`,
);
for (const [k, v] of [...worst].sort((a, b) => b[1] - a[1]).slice(0, 10))
  console.log(`  ${k} (from the bounds' corner): ${v}`);
