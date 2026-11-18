/**
 * Map audit: walk routes through the Old Fortress (fortress-plan.ts, collision from
 * art/br/procedural/<id>.boxes.json) on flat ground at the ledge's level, with the real movement
 * code; report each leg (stalls, the height reached).
 *   ROUTES=file.json node scripts/br/map-audit/run.mjs walkfort
 * The file: { "name": [[x, z], …], … } in fortress coordinates; the first point's y is found
 * at or under the optional third number (default: the ground).
 */
import { readFileSync } from "node:fs";
import type { Heightfield } from "@/lib/fps/br/heightfield";
import type { Placement } from "@/lib/fps/br/layout";
import { FORTRESS } from "@/lib/fps/br/fortress-plan";
import { stepBody, type BrBody } from "@/lib/fps/br/movement";
import { StaticWorld, type CollisionData } from "@/lib/fps/br/static-world";

const models: Record<string, number[][]> = {};
for (const [m] of FORTRESS)
  models[m] ??= JSON.parse(readFileSync(`art/br/procedural/${m}.boxes.json`, "utf8"));
const collision = { voxel: 0.1, models } as CollisionData;
const hf = { heightAt: () => 0, raycast: () => null } as unknown as Heightfield;
const placements: Placement[] = FORTRESS.map(([model, x, y, z, turn]) => ({ model, x, y, z, turn, poi: "test" }));
const world = new StaticWorld(hf, placements, collision, null);
const routes = JSON.parse(readFileSync(process.env.ROUTES!, "utf8")) as Record<string, number[][]>;
let bad = 0;
for (const [name, route] of Object.entries(routes)) {
  const [sx, sz, sy] = route[0]!;
  const body = {
    x: sx,
    y: world.supportAt(sx!, sz!, 0.3, sy ?? 0.5),
    z: sz,
    velocityY: 0,
    grounded: true,
  } as unknown as BrBody;
  Object.assign(body, { crouching: false, health: 100, alive: true, yaw: 0, pitch: 0 });
  const out: string[] = [];
  let ok = true;
  for (const [i, [x, z]] of route.entries()) {
    if (i === 0) continue;
    let stall = 0,
      ticks = 0,
      last = Infinity;
    for (; ticks < 600 && Math.hypot(body.x - x!, body.z - z!) > 0.2; ticks++) {
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
      if (stall > 12) break;
    }
    const s = stall > 12 || ticks >= 600;
    if (s) ok = false;
    out.push(`${s ? "STALL" : "ok"}→${x},${z}@y${body.y.toFixed(1)}${s ? `(at ${body.x.toFixed(1)},${body.z.toFixed(1)})` : ""}`);
  }
  if (!ok) bad++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}: ${out.join(" ")}`);
}
console.log(bad ? `${bad} routes failed` : "all routes walked");
