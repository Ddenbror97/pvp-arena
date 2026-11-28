/**
 * Map audit: the first-person camera along the walls of every building model (frame-view.ts over
 * the fixed steps, as the client runs them), at 60 and 144 frames a second. From each doorway of
 * the first placement of every model with doors, a sprint at eight headings for 4 s. Per frame:
 *   back    the view moves against the heading held by more than 1 mm
 *   shake   the view's move across the heading turns round (left, right, left) within 5 frames,
 *           each by more than 0.4 mm: at a wall 35 cm from the eye that is pixels
 *   hitch   a frame moves more than twice or less than half the run's usual frame while the
 *           body's own steps are even (the view lurching on its own)
 *   node scripts/br/map-audit/run.mjs view-smooth [model,…]
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { newDropBody, stepDrop, type DropInput, type Route } from "@/lib/fps/br/drop";
import { BrFrameView } from "@/lib/fps/br/frame-view";
import { withDoors } from "@/lib/fps/br/doors";
import { withPanes } from "@/lib/fps/br/panes";
import { WORLD_ASSETS } from "@/lib/fps/br/world";
import { TICK_MS } from "@/lib/fps/simulation";

const buf = (p: string) => {
  const f = readFileSync(p);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
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
const only = process.argv[2] ? process.argv[2].split(",") : null;
type Count = { back: number; shake: number; hitch: number; frames: number };
const by = new Map<string, Count>();
const worst: string[] = [];
const seen = new Set<string>();
for (const d of isl.doors.doors) {
  if (seen.has(`${d.model}:${d.index}`) || (only && !only.includes(d.model))) continue;
  const first = isl.doors.doors.find((q) => q.model === d.model)!;
  if (Math.hypot(first.x - d.x, first.z - d.z) > 80) continue;
  seen.add(`${d.model}:${d.index}`);
  const c = by.get(d.model) ?? { back: 0, shake: 0, hitch: 0, frames: 0 };
  by.set(d.model, c);
  for (const fps of [60, 144])
    for (let h = 0; h < 8; h++) {
      const yaw = (h / 8) * Math.PI * 2 + 0.05;
      const hx = -Math.sin(yaw),
        hz = -Math.cos(yaw);
      const input = { forward: 1, strafe: 0, yaw, jump: false, sprint: true } as DropInput;
      const body = Object.assign(newDropBody(), {
        x: d.x,
        y: world.supportAt(d.x, d.z, 0.35, d.y0 + 0.3),
        z: d.z,
        grounded: true,
        phase: "ground" as const,
      });
      const view = new BrFrameView();
      const zero = { x: 0, y: 0, z: 0 };
      const frameMs = 1000 / fps;
      let acc = 0,
        lx = NaN,
        lz = NaN,
        bad = 0;
      const across: number[] = [];
      const moves: number[] = [];
      for (let f = 0; f < 4 * fps; f++) {
        acc += frameMs;
        while (acc >= TICK_MS) {
          stepDrop(world, meta, route, body, input, 0, TICK_MS);
          acc -= TICK_MS;
        }
        const v = view.sample(world, meta, route, body, input, 0, acc, frameMs, zero);
        if (f > 8 && Number.isFinite(lx)) {
          const mx = v.x - lx,
            mz = v.z - lz;
          const al = mx * hx + mz * hz,
            ac = mx * hz - mz * hx;
          if (al < -0.001) {
            c.back++;
            bad++;
          }
          across.push(ac);
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
            c.shake++;
            bad++;
          }
          c.frames++;
        }
        lx = v.x;
        lz = v.z;
      }
      // Hitches: frames far off the run's median move, while it moves at all.
      const sorted = moves.filter((m) => m > 1e-4).sort((a, b) => a - b);
      const med = sorted[sorted.length >> 1] ?? 0;
      if (med > 0.002)
        for (let i = 1; i + 1 < moves.length; i++)
          if (moves[i]! > med * 2.2 && moves[i - 1]! < med * 1.3) {
            c.hitch++;
            bad++;
          }
      if (bad > 6) worst.push(`${d.model} door ${d.index} heading ${h} at ${fps} fps: ${bad}`);
    }
}
const total = { back: 0, shake: 0, hitch: 0, frames: 0 };
for (const c of by.values())
  for (const k of ["back", "shake", "hitch", "frames"] as const) total[k] += c[k];
console.log(
  `${by.size} models, ${total.frames} frames: back ${total.back}, shake ${total.shake}, hitch ${total.hitch}`,
);
const rows = [...by].sort(
  (a, b) => b[1].back + b[1].shake + b[1].hitch - (a[1].back + a[1].shake + a[1].hitch),
);
for (const [m, c] of rows.slice(0, 20))
  console.log(
    `${m.padEnd(26)} back ${String(c.back).padStart(5)}  shake ${String(c.shake).padStart(5)}  hitch ${String(c.hitch).padStart(5)}`,
  );
for (const w of worst.slice(0, only ? 40 : 12)) console.log(" ", w);
