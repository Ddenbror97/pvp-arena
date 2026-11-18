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
let world = new StaticWorld(hf, placements, collision, null);
// REAL=1: the island's own layout (the dressing in place) and collision, at the POI.
let OX = 0,
  OY = 0,
  OZ = 0;
if (process.env.REAL) {
  const { decodeHeightfield } = await import("@/lib/fps/br/heightfield");
  const { decodeLandCover } = await import("@/lib/fps/br/landcover");
  const { buildIsland } = await import("@/lib/fps/br/island");
  const { WORLD_ASSETS } = await import("@/lib/fps/br/world");
  const buf = (p: string) => {
    const f = readFileSync(p);
    return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
  };
  const meta = JSON.parse(readFileSync(`public${WORLD_ASSETS.meta}`, "utf8"));
  const col = JSON.parse(readFileSync(`public${WORLD_ASSETS.collision}`, "utf8"));
  const rhf = await decodeHeightfield(buf(`public${WORLD_ASSETS.height}`));
  const cover = await decodeLandCover(buf(`public${WORLD_ASSETS.landcover}`));
  const island = buildIsland(rhf, cover, meta, col);
  const poi = meta.pois.find((p: { id: string }) => p.id === "old-fortress");
  [OX, OY, OZ] = [poi.x, poi.padHeight, poi.z];
  const near = island.layout.filter((p) => Math.abs(p.x - OX) < 260 && Math.abs(p.z - OZ) < 260);
  world = new StaticWorld(rhf, near, col, null);
}
const routes = Object.fromEntries(
  Object.entries(JSON.parse(readFileSync(process.env.ROUTES!, "utf8")) as Record<string, number[][]>)
    .filter(([k]) => !k.startsWith("_"))
    .map(([k, r]) => [k, r.map(([x, z, y], i) => (i ? [x! + OX, z! + OZ] : [x! + OX, z! + OZ, (y ?? 0.5) + OY]))]),
);
const BACK = !!process.env.BACK;
let bad = 0;
for (const [name, fwd] of Object.entries(routes)) {
  // BACK=1: there and back again (the way back from where the way there ended).
  const route = BACK ? [...fwd, ...[...fwd].reverse().slice(1)] : fwd;
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
    let note = "";
    let stall = 0,
      ticks = 0,
      last = Infinity;
    for (; ticks < 600 && Math.hypot(body.x - x!, body.z - z!) > 0.2; ticks++) {
      stepBody(
        world,
        body,
        { forward: 1, strafe: 0, yaw: Math.atan2(body.x - x!, body.z - z!), sprint: !!process.env.SPRINT } as never,
        34,
      );
      const d = Math.hypot(body.x - x!, body.z - z!);
      if (last - d < 0.005) stall++;
      else stall = 0;
      last = d;
      if (stall > 12) break;
      if (stall > 4 && !note) note = ` (stall at ${(body.x - OX).toFixed(1)},${(body.y - OY).toFixed(1)},${(body.z - OZ).toFixed(1)})`;
    }
    const s = stall > 12 || ticks >= 600;
    if (s) ok = false;
    out.push(`${s ? "STALL" : "ok"}→${(x! - OX).toFixed(1)},${(z! - OZ).toFixed(1)}@y${(body.y - OY).toFixed(1)}${s ? `(at ${(body.x - OX).toFixed(1)},${(body.z - OZ).toFixed(1)})` : note}`);
    if (note) ok = false;
  }
  if (!ok) bad++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}: ${out.join(" ")}`);
}
console.log(bad ? `${bad} routes failed` : "all routes walked");
