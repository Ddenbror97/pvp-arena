/**
 * Map audit: what the local player's movement costs a frame (the fixed steps and the camera's
 * frame-view.ts over them, as the client runs them at 144 frames a second), in the open and
 * sprinting into the walls of a few dense buildings; and what a reconciliation costs there
 * (twelve pending inputs replayed, as after a snapshot on a 400 ms connection).
 *   node scripts/br/map-audit/run.mjs frame-cost
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
const FPS = 144;

function run(label: string, x: number, z: number, yaw: number) {
  const input = { forward: 1, strafe: 0, yaw, jump: false, sprint: true } as DropInput;
  let frame = Infinity,
    replay = Infinity;
  for (let rep = 0; rep < 5; rep++) {
    const body = Object.assign(newDropBody(), {
      x,
      y: world.supportAt(x, z, 0.35, hf.heightAt(x, z) + 0.5),
      z,
      grounded: true,
      phase: "ground" as const,
    });
    const view = new BrFrameView();
    const zero = { x: 0, y: 0, z: 0 };
    let acc = 0;
    // Two seconds in (against whatever stops it by then), then three seconds measured.
    const frames = 5 * FPS;
    let t0 = 0;
    for (let f = 0; f < frames; f++) {
      if (f === 2 * FPS) t0 = performance.now();
      acc += 1000 / FPS;
      while (acc >= TICK_MS) {
        stepDrop(world, meta, route, body, input, 0, TICK_MS);
        acc -= TICK_MS;
      }
      view.sample(world, meta, route, body, input, 0, acc, 1000 / FPS, zero);
    }
    frame = Math.min(frame, (performance.now() - t0) / (3 * FPS));
    const t1 = performance.now();
    for (let k = 0; k < 200; k++) {
      const copy = { ...body };
      for (let i = 0; i < 12; i++) stepDrop(world, meta, route, copy, input, 0, TICK_MS);
    }
    replay = Math.min(replay, (performance.now() - t1) / 200);
  }
  console.log(
    `${label.padEnd(34)} ${(frame * 1000).toFixed(1).padStart(7)} µs a frame   ${(replay * 1000).toFixed(0).padStart(6)} µs a reconciliation`,
  );
}

run("open country", 0, -1700, 0.3);
for (const model of [
  "condo-floor",
  "prison-block",
  "bauhaus-block",
  "apartment",
  "house",
  "bw-keep",
]) {
  const p = isl.layout.find((q) => q.model === model);
  const d = p && isl.doors.doors.find((q) => Math.hypot(q.x - p.x, q.z - p.z) < 30);
  if (!p || !d) continue;
  run(`${model}: into its walls`, d.x, d.z, Math.atan2(-(p.x - d.x), -(p.z - d.z)));
}
