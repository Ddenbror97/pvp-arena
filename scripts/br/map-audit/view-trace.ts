/**
 * Map audit: one run of view-smooth.ts frame by frame.
 *   node scripts/br/map-audit/run.mjs view-trace <model> <door> <heading 0-7> <fps> [from frame] [frames]
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
const [model, index, h, fpsArg, fromArg, nArg] = process.argv.slice(2);
const fps = Number(fpsArg);
const d = isl.doors.doors.find((q) => q.model === model && q.index === Number(index))!;
const yaw = (Number(h) / 8) * Math.PI * 2 + 0.05;
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
let acc = 0,
  lx = NaN,
  lz = NaN;
const rows: string[] = [];
const bad: number[] = [];
for (let f = 0; f < 4 * fps; f++) {
  acc += 1000 / fps;
  let steps = 0;
  while (acc >= TICK_MS) {
    stepDrop(world, meta, route, body, input, 0, TICK_MS);
    acc -= TICK_MS;
    steps++;
  }
  const v = view.sample(world, meta, route, body, input, 0, acc, 1000 / fps, { x: 0, y: 0, z: 0 });
  const mx = v.x - lx,
    mz = v.z - lz;
  const al = mx * hx + mz * hz,
    ac = mx * hz - mz * hx;
  if (f > 8 && al < -0.001) bad.push(f);
  rows.push(
    `${String(f).padStart(3)} steps ${steps} acc ${acc.toFixed(1).padStart(4)}  body ${(body.x - d.x).toFixed(3)}, ${(body.z - d.z).toFixed(3)}  preview ${(v.body.x - d.x).toFixed(3)}, ${(v.body.z - d.z).toFixed(3)}  view ${(v.x - d.x).toFixed(3)}, ${(v.z - d.z).toFixed(3)}  along ${(al * 1000).toFixed(1)} mm across ${(ac * 1000).toFixed(1)} mm`,
  );
  lx = v.x;
  lz = v.z;
}
console.log(
  `heading ${hx.toFixed(2)}, ${hz.toFixed(2)}; view goes back at frames ${bad.slice(0, 30).join(", ")}`,
);
const from = Number(fromArg ?? Math.max(0, (bad[0] ?? 0) - 6));
console.log(rows.slice(from, from + Number(nArg ?? 24)).join("\n"));
