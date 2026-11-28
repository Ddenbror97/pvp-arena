/**
 * The rebuilt towns' houses walked before they go into a revision: each design's routes
 * (art/br/towns/blender/<id>.json, from build_towns.py) at all four turns on flat ground, in and
 * back out, with the game's movement and its own collision and doors, as
 * tests/br-building-access.test.ts walks them once they are placed. Also: indoor loot spots per
 * storey and the roof's standing room.
 *
 *   node scripts/br/map-audit/run.mjs towns-walk [id …]
 */
import { readdirSync, readFileSync } from "node:fs";
import { islandDoors, withDoors } from "@/lib/fps/br/doors";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import type { Placement } from "@/lib/fps/br/layout";
import { modelSpots, turnPoint } from "@/lib/fps/br/loot-spots";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";

const DIR = "art/br/towns/blender";
const want = process.argv.slice(2);
const ids = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5))
  .filter((id) => !want.length || want.includes(id));

type Meta = {
  boxes: number[][];
  entrances: CollisionData["entrances"] extends Record<string, infer E> | undefined ? E : never;
  routes: number[][][];
  floors: number;
};

function walk(world: StaticWorld, body: BrBody, points: number[][]) {
  let maxY = body.y;
  for (const [x, z] of points) {
    let tick = 0;
    for (; tick < 220 && Math.hypot(body.x - x!, body.z - z!) > 0.18; tick++) {
      const before = { ...body };
      stepBody(
        world,
        body,
        { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x!, body.z - z!) },
        34,
      );
      if (Math.hypot(body.x - before.x, body.z - before.z) >= 0.18)
        return `teleport near ${x},${z}`;
      if (body.y - before.y > 0.351)
        return `jumped ${(body.y - before.y).toFixed(2)} near ${x},${z}`;
      maxY = Math.max(maxY, body.y);
    }
    if (Math.hypot(body.x - x!, body.z - z!) >= 0.19)
      return `stuck at ${body.x.toFixed(2)},${body.y.toFixed(2)},${body.z.toFixed(2)} going to ${x},${z}`;
  }
  return { maxY };
}

let bad = 0;
for (const id of ids) {
  const meta = JSON.parse(readFileSync(`${DIR}/${id}.json`, "utf8")) as Meta;
  const collision = {
    voxel: 0.3,
    models: { [id]: meta.boxes },
    entrances: { [id]: meta.entrances },
  } as unknown as CollisionData;
  const out: string[] = [];
  for (const [ri, local] of meta.routes.entries()) {
    for (const turn of [0, 1, 2, 3] as const) {
      const placement: Placement = { model: id, turn, x: 100, y: 12, z: -100, poi: "test" };
      const hf = { heightAt: () => placement.y } as unknown as Heightfield;
      const solid = new StaticWorld(hf, [placement], collision, null);
      const set = islandDoors([placement], collision);
      const open = withDoors(solid, set, new Uint8Array(set.doors.length).fill(1));
      const path = local.map(([x, z]) => {
        const p = turnPoint(x!, z!, turn);
        return [p[0] + placement.x, p[1] + placement.z];
      });
      const body: BrBody = {
        x: path[0]![0]!,
        z: path[0]![1]!,
        y: placement.y,
        velocityY: 0,
        grounded: true,
        crouched: false,
      };
      const up = walk(open, body, path.slice(1));
      if (typeof up === "string") {
        out.push(`route ${ri} turn ${turn} in: ${up}`);
        continue;
      }
      const down = walk(open, body, [...path].reverse().slice(1));
      if (typeof down === "string") out.push(`route ${ri} turn ${turn} out: ${down}`);
      else if (turn === 0) out.push(`route ${ri}: up to ${(up.maxY - placement.y).toFixed(2)} m`);
    }
  }
  const spots = modelSpots(collision, id, "indoor", 2.5, 60).length;
  const failed = out.some((l) => l.includes(" in:") || l.includes(" out:"));
  if (failed) bad++;
  console.log(`${failed ? "FAIL" : "ok  "} ${id.padEnd(24)} spots ${spots}  ${out.join(" | ")}`);
}
if (bad) process.exitCode = 1;
