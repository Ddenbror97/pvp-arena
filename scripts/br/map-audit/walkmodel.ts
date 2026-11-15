/**
 * Map audit: walk a model's route (one placement at the origin, turn 0) with the real movement
 * code and report each leg's stalls (no progress for 10 ticks) and the height reached.
 *   ROUTE='[[x,z],…]' node scripts/br/map-audit/run.mjs walkmodel <model>
 */
import { readFileSync } from "node:fs";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import type { Placement } from "@/lib/fps/br/layout";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";
import { WORLD_ASSETS } from "@/lib/fps/br/world";

const collision = JSON.parse(
  readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"),
) as CollisionData;
const model = process.argv[2]!;
const route = JSON.parse(process.env.ROUTE!) as number[][];
const hf = { heightAt: () => 0 } as unknown as Heightfield;
const placement: Placement = { model, turn: 0, x: 0, y: 0, z: 0, poi: "test" };
const world = new StaticWorld(hf, [placement], collision, null);
const [sx, sz] = route[0]!;
const body = {
  x: sx,
  y: world.supportAt(sx!, sz!, 0.3, Number(process.env.Y0 ?? 1)),
  z: sz,
  velocityY: 0,
  grounded: true,
} as unknown as BrBody;
Object.assign(body, { crouching: false, health: 100, alive: true, yaw: 0, pitch: 0 });
for (const [i, [x, z]] of route.entries()) {
  if (i === 0) continue;
  let stall = 0,
    ticks = 0,
    last = Infinity;
  for (; ticks < 400 && Math.hypot(body.x - x!, body.z - z!) > 0.2; ticks++) {
    stepBody(
      world,
      body,
      { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x!, body.z - z!), sprint: false } as never,
      34,
    );
    const d = Math.hypot(body.x - x!, body.z - z!);
    if (last - d < 0.005) stall++;
    else stall = 0;
    last = d;
    if (stall > 10) break;
  }
  console.log(
    `leg ${i} → ${x},${z}: ${stall > 10 ? "STALLED" : "ok"} at ${body.x.toFixed(2)},${body.y.toFixed(2)},${body.z.toFixed(2)} after ${ticks}`,
  );
}
