/**
 * Map audit: one run of wall-slide.ts tick by tick (the ticks round each backward move).
 *   node scripts/br/map-audit/run.mjs wall-trace <model> <door index> <heading 0-15> <sprint 0|1>
 */
import { readFileSync } from "node:fs";
import { decodeHeightfield } from "@/lib/fps/br/heightfield";
import { buildIsland } from "@/lib/fps/br/island";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
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
const [model, index, h, sprint] = process.argv.slice(2);
const d = isl.doors.doors.find((q) => q.model === model && q.index === Number(index))!;
const yaw = (Number(h) / 16) * Math.PI * 2 + 0.05;
const b: BrBody = {
  x: d.x,
  y: world.supportAt(d.x, d.z, 0.35, d.y0 + 0.3),
  z: d.z,
  velocityY: 0,
  grounded: true,
  crouched: false,
};
const rows: string[] = [];
const bad: number[] = [];
for (let i = 0; i < Math.round(5000 / TICK_MS); i++) {
  const x0 = b.x,
    z0 = b.z;
  stepBody(
    world,
    b,
    { forward: 1, strafe: 0, yaw, jump: false, sprint: sprint === "1" } as never,
    TICK_MS,
  );
  const mx = b.x - x0,
    mz = b.z - z0;
  if (mx * -Math.sin(yaw) + mz * -Math.cos(yaw) < -0.005) bad.push(i);
  rows.push(
    `${String(i).padStart(3)} at ${(b.x - d.x).toFixed(3)}, ${b.y.toFixed(3)}, ${(b.z - d.z).toFixed(3)}  moved ${mx.toFixed(3)}, ${mz.toFixed(3)}`,
  );
}
console.log(
  `door at ${d.x}, ${d.z} along ${d.along}; heading ${(-Math.sin(yaw)).toFixed(2)}, ${(-Math.cos(yaw)).toFixed(2)}; backward at ticks ${bad.join(", ")}`,
);
for (const i of bad.slice(0, 3))
  console.log(rows.slice(Math.max(0, i - 4), i + 3).join("\n"), "\n");
// "stall" as the 5th argument: the first stretch held up and then through (wall-slide.ts).
if (process.argv[6] === "stall") {
  const lens = rows.map((r) => {
    const m = r.split("moved ")[1]!.split(", ").map(Number);
    return Math.hypot(m[0]!, m[1]!);
  });
  const pace = Math.max(...lens);
  const at = lens.findIndex(
    (l, i) => i > 3 && l < pace * 0.2 && lens.slice(i + 1, i + 31).reduce((a, v) => a + v, 0) > 1.5,
  );
  console.log(`first stall at tick ${at}`);
  if (at >= 0) console.log(rows.slice(Math.max(0, at - 3), at + 24).join("\n"));
}
