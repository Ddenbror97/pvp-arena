/**
 * Map audit: what a tick of walking costs (stepBody, µs) in the open, inside buildings and
 * pressed against their walls, and how many collision boxes a hull's queries read there.
 *   node scripts/br/map-audit/run.mjs collision-bench
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
const doorsOpen = new Uint8Array(isl.doors.doors.length).fill(1);
const world: StaticWorld = withPanes(
  withDoors(isl.solid, isl.doors, doorsOpen),
  isl.panes,
  new Uint8Array(isl.panes.count),
);

/** Boxes read by one hull query at (x, z). */
function boxesAt(x: number, z: number) {
  let n = 0;
  isl.solid.forEachBox(x - 0.35, z - 0.35, x + 0.35, z + 0.35, () => n++);
  return n;
}

function run(label: string, x: number, z: number, yaw: number, ticks = 600) {
  const y = world.supportAt(x, z, 0.35, hf.heightAt(x, z) + 30);
  const start = (): BrBody => ({
    x,
    y: world.supportAt(x, z, 0.35, hf.heightAt(x, z) + 0.5),
    z,
    velocityY: 0,
    grounded: true,
    crouched: false,
  });
  void y;
  let best = Infinity,
    boxes = 0,
    moved = 0;
  for (let rep = 0; rep < 5; rep++) {
    const b = start();
    const t0 = performance.now();
    for (let i = 0; i < ticks; i++)
      stepBody(
        world,
        b,
        { forward: 1, strafe: 0, yaw, jump: false, sprint: true } as never,
        TICK_MS,
      );
    best = Math.min(best, (performance.now() - t0) / ticks);
    boxes = boxesAt(b.x, b.z);
    moved = Math.hypot(b.x - x, b.z - z);
  }
  console.log(
    `${label.padEnd(44)} ${(best * 1000).toFixed(1).padStart(7)} µs/tick  ${String(boxes).padStart(4)} boxes at the end  moved ${moved.toFixed(1)} m`,
  );
}

// Open ground, and a few buildings: through the middle, and slanting into a wall from inside.
run("open country", 0, -1700, 0.3, 300);
const pick = (model: string) => isl.layout.find((p) => p.model === model);
for (const model of process.argv[2]?.split(",") ?? [
  "house",
  "apartment",
  "bauhaus-block",
  "hosp-main",
  "condo-floor",
  "prison-block",
  "fort-keep",
  "bay-apartments",
  "superstore",
]) {
  const p = pick(model);
  if (!p) continue;
  const ent = isl.doors.doors.find((d) => Math.hypot(d.x - p.x, d.z - p.z) < 30);
  const [sx, sz] = ent ? [ent.x, ent.z] : [p.x, p.z];
  // From the doorway toward the building's middle (it meets walls and furniture on the way and
  // then keeps pushing against whatever stops it), and at 30° off that.
  const yaw = Math.atan2(-(p.x - sx), -(p.z - sz));
  run(`${model}: door → middle, then pressed`, sx, sz, yaw);
  run(`${model}: 30° off`, sx, sz, yaw + 0.52);
}
