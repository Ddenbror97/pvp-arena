/**
 * Vehicle client check: the real client against the in-page match (as loot-sim), on the main
 * runway with the four drivable vehicles parked side by side and a second player driving the
 * pickup in circles (a remote driver, sat in the seat). Driven by capture.mjs: walk to each
 * vehicle, get in with E, drive with W/A/D and the handbrake, get out; screenshots.
 */
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { validateBrAct, type BrAct } from "../../../src/lib/fps/br/actions";
import { createBrArena, type BrHud, type BrView } from "../../../src/lib/fps/br/br-arena";
import { decodeHeightfield } from "../../../src/lib/fps/br/heightfield";
import { buildIsland } from "../../../src/lib/fps/br/island";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
import { rollLoot } from "../../../src/lib/fps/br/loot";
import { spec, spawnVehicles, type Vehicle } from "../../../src/lib/fps/br/vehicles";
import {
  BrSeatSync,
  BrSight,
  brViewFor,
  createBrMatch,
  seatHuman,
  stepBrMatch,
  validateBrInput,
  type BrInput,
} from "../../../src/lib/fps/br/match";
import type { CollisionData } from "../../../src/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "../../../src/lib/fps/br/world";
import { TICK_MS } from "../../../src/lib/fps/simulation";
import { BrCentre, BrStatus } from "../../../src/components/fps/BrHud";

(globalThis as { __brAssumeLock?: boolean }).__brAssumeLock = true;
const base = new URL(".", location.href).href;
const get = (p: string) => fetch(new URL(p.replace(/^\//, ""), base));
const arena = createBrArena(document.getElementById("game")!, base, () => {});

function Hud() {
  const [hud, setHud] = useState<BrHud | null>(null);
  useEffect(() => arena.onHud(setHud), []);
  if (!hud) return null;
  return (
    <div className="br-game" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <BrCentre hud={hud} hit={null} />
      <BrStatus hud={hud} />
    </div>
  );
}
createRoot(document.getElementById("hud")!).render(<Hud />);

declare global {
  interface Window {
    sim: Record<string, unknown>;
  }
}
window.sim = {};
window.sim.ready = (async () => {
  const [hfBuf, lcBuf, meta, collision] = await Promise.all([
    get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    get(WORLD_ASSETS.collision).then((r) => r.json() as Promise<CollisionData>),
  ]);
  const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
  const island = buildIsland(hf, cover, meta, collision);
  const world = island.solid;
  const seed = 20261108;
  const loot = rollLoot(seed, island.layout, collision, world, meta);
  const vehicles = spawnVehicles(meta, world, seed, island.layout);
  window.sim.spawned = vehicles.map((v) => [v.kind, Math.round(v.x), Math.round(v.z)]);
  const state = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, { vehicles });
  const me = seatHuman(state, "local", "Me");
  const other = seatHuman(state, "other", "Other");
  const [ax, az] = meta.runways[0]!.a,
    [bx, bz] = meta.runways[0]!.b;
  const len = Math.hypot(bx - ax, bz - az),
    ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const put = (seat: number, t: number, side = 0) => {
    const b = state.seats[seat]!.body;
    b.x = ax + ux * t - uz * side;
    b.z = az + uz * t + ux * side;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    Object.assign(b, { phase: "ground", grounded: true, velocityY: 0, vx: 0, vz: 0 });
  };
  for (const s of state.seats) put(s.seat, 200 + s.seat * 7, 900);
  put(me, 400);
  state.phase = "active";
  const yaw = Math.atan2(-ux, -uz);
  const park = (kind: Vehicle["kind"], t: number, side: number) => {
    const x = ax + ux * t + uz * side,
      z = az + uz * t - ux * side;
    const v: Vehicle = {
      id: state.vehicles.length,
      kind,
      condition: "good",
      x,
      y: world.supportAt(x, z, 0.2, 1e4),
      z,
      yaw,
      speed: 0,
      pitch: 0,
      roll: 0,
      health: spec(kind).health,
      maxHealth: spec(kind).health,
      driver: -1,
      destroyed: false,
    };
    state.vehicles.push(v);
    return v;
  };
  const parked = {
    sedan: park("sedan", 420, 8),
    suv: park("suv", 420, 13),
    pickup: park("pickup", 420, 18),
    bike: park("bike", 420, 23),
  };
  // The other player drives a second pickup in a wide circle, further along the runway.
  const theirs = park("pickup", 520, 0);
  const os = state.seats[other]!;
  put(other, 520, 0);
  theirs.driver = other;
  os.vehicle = theirs.id;
  const queue: BrInput[] = [];
  const acts: BrAct[] = [];
  arena.setSender((message) => {
    const raw = JSON.parse(message);
    if (raw.type === "br-act") {
      const a = validateBrAct(raw);
      if (a) acts.push(a);
      return;
    }
    const input = validateBrInput(raw);
    if (!input) throw new Error("client sent an invalid input " + message);
    queue.push(input);
    while (queue.length > 8) queue.shift();
  });
  await arena.ready;
  arena.look(yaw, -0.2);
  const sight = new BrSight(),
    sync = new BrSeatSync();
  let clock = 0,
    oseq = 0,
    otherDrives = true;
  setInterval(() => {
    const inputs = new Map<number, BrInput>();
    const input = queue.shift();
    if (input) inputs.set(me, input);
    if (otherDrives)
      inputs.set(other, { seq: ++oseq, forward: 1, strafe: -0.6, yaw: theirs.yaw } as BrInput);
    clock += TICK_MS;
    stepBrMatch(state, world, meta, inputs, clock, TICK_MS, new Map([[me, acts.splice(0, 4)]]));
    arena.snapshot(brViewFor(state, world, sight, me, clock, sync) as unknown as BrView);
    state.loot.flush();
  }, TICK_MS);
  const meB = state.seats[me]!.body;
  window.sim.yaw = yaw;
  window.sim.look = (y: number, p: number) => arena.look(y, p);
  window.sim.stopOther = () => (otherDrives = false);
  // Beside a parked vehicle's driver door, looking at it.
  window.sim.toVehicle = (kind: keyof typeof parked) => {
    const v = parked[kind];
    if (v.driver === other) {
      v.driver = -1;
      delete os.vehicle;
    }
    meB.x = v.x - uz * 2.2;
    meB.z = v.z + ux * 2.2;
    meB.y = world.supportAt(meB.x, meB.z, 0.35, v.y + 1);
    arena.look(Math.atan2(-(v.x - meB.x), -(v.z - meB.z)), -0.2);
    return { id: v.id };
  };
  // On foot near the other driver, looking at their vehicle.
  window.sim.watchOther = () => {
    const x = theirs.x + 9,
      z = theirs.z + 9;
    Object.assign(meB, { x, z, y: world.supportAt(x, z, 0.35, 1e4), velocityY: 0 });
    arena.look(Math.atan2(-(theirs.x - x), -(theirs.z - z)), -0.12);
    return { x: theirs.x, z: theirs.z, speed: theirs.speed };
  };
  // The other player sat in a parked vehicle (stopped), you on foot beside its driver's side.
  window.sim.seatOther = (kind: keyof typeof parked, side = 1) => {
    otherDrives = false;
    for (const v of state.vehicles) if (v.driver === other) v.driver = -1;
    const v = parked[kind];
    v.driver = other;
    os.vehicle = v.id;
    const fx = -Math.sin(v.yaw),
      fz = -Math.cos(v.yaw);
    // Left of the vehicle (the driver's side) and a little ahead, or straight to its right.
    const x = v.x + fz * 3.6 * side + fx * 1.2,
      z = v.z - fx * 3.6 * side + fz * 1.2;
    Object.assign(meB, { x, z, y: world.supportAt(x, z, 0.35, v.y + 1), velocityY: 0 });
    arena.look(Math.atan2(-(v.x - x), -(v.z - z)), -0.18);
    return { id: v.id };
  };
  window.sim.vehicle = (kind: keyof typeof parked) => {
    const v = parked[kind];
    return {
      speed: +v.speed.toFixed(2),
      driver: v.driver,
      steer: v.steer,
      slip: v.slip,
      moved: +Math.hypot(v.x - (ax + ux * 420), v.z - (az + uz * 420)).toFixed(1),
    };
  };
  return true;
})();
