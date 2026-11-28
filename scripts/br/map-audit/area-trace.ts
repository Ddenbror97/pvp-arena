/**
 * Map audit: one run of area-slide.ts frame by frame, from a point given from the place's
 * centre (x, y above its pad, z) at one of the sixteen headings.
 *   node scripts/br/map-audit/run.mjs area-trace <poi id> <x> <y> <z> <heading 0-15> [fps] [all]
 * Prints the frames the view goes back or turns across on (every frame with `all`).
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { newDropBody, stepDrop, type DropInput, type Route } from "@/lib/fps/br/drop";
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
const [id, gx, gy, gz, h, fpsArg, all] = process.argv.slice(2);
const poi = meta.pois.find((p) => p.id === id)!;
const FPS = Number(fpsArg ?? 144);
const x = poi.x + Number(gx),
  z = poi.z + Number(gz);
const y = world.supportAt(x, z, 0.35, (poi.padHeight ?? 0) + Number(gy) + 0.3);
const yaw = (Number(h) / 16) * Math.PI * 2 + 0.05;
const hx = -Math.sin(yaw),
  hz = -Math.cos(yaw);
const input = { forward: 1, strafe: 0, yaw, jump: false, sprint: true } as DropInput;
const body = Object.assign(newDropBody(), { x, y, z, grounded: true, phase: "ground" as const });
const view = new BrFrameView();
const zero = { x: 0, y: 0, z: 0 };
let acc = 0,
  lx = NaN,
  lz = NaN,
  tick = 0,
  last = 0;
const n = (v: number, w = 7) => v.toFixed(4).padStart(w);
for (let f = 0; f < 3 * FPS; f++) {
  acc += 1000 / FPS;
  let stepped = "";
  while (acc >= TICK_MS) {
    const bx = body.x,
      bz = body.z,
      by = body.y;
    stepDrop(world, meta, route, body, input, 0, TICK_MS);
    acc -= TICK_MS;
    tick++;
    stepped = ` step ${tick}: body ${n((body.x - bx) * hx + (body.z - bz) * hz)} along ${n((body.x - bx) * hz - (body.z - bz) * hx)} across ${n(body.y - by)} up ${body.grounded ? "ground" : "AIR"} ${body.phase}`;
  }
  const v = view.sample(world, meta, route, body, input, 0, acc, 1000 / FPS, zero);
  if (Number.isFinite(lx)) {
    const mx = v.x - lx,
      mz = v.z - lz;
    const al = mx * hx + mz * hz,
      ac = mx * hz - mz * hx;
    const flip =
      Math.abs(ac) > 0.0004 && Math.abs(last) > 0.0004 && Math.sign(ac) !== Math.sign(last);
    if (all || al < -0.001 || flip || stepped)
      console.log(
        `f${String(f).padStart(3)} view ${n(al)} along ${n(ac)} across  off body ${n(Math.hypot(v.x - body.x, v.z - body.z))} at ${(body.x - poi.x).toFixed(2)}, ${(body.y - (poi.padHeight ?? 0)).toFixed(2)}, ${(body.z - poi.z).toFixed(2)}${al < -0.001 ? "  BACK" : ""}${flip ? "  FLIP" : ""}${stepped}`,
      );
    last = ac;
  }
  lx = v.x;
  lz = v.z;
}
