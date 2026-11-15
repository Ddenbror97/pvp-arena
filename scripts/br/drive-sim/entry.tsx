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
import type { ItemId } from "../../../src/lib/fps/br/items";
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
import { BrInputQueue } from "../../../workers/fps/br-input";
import { BrCentre, BrLobbyCard, BrStatus } from "../../../src/components/fps/BrHud";

(globalThis as { __brAssumeLock?: boolean }).__brAssumeLock = true;
const base = new URL(".", location.href).href;
const get = (p: string) => fetch(new URL(p.replace(/^\//, ""), base));
// Each frame's own work (ms) and when it ran (smooth.mjs): the client's loop asks for its next
// frame through this.
const frameWork: number[][] = [];
const raf = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = (cb) =>
  raf((t) => {
    const start = performance.now();
    cb(t);
    frameWork.push([t, performance.now() - start]);
    if (frameWork.length > 4000) frameWork.shift();
  });
const arena = createBrArena(document.getElementById("game")!, base, () => {});

function Hud() {
  const [hud, setHud] = useState<BrHud | null>(null);
  useEffect(() => arena.onHud(setHud), []);
  if (!hud) return null;
  return (
    <div className="br-game" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <BrCentre hud={hud} hit={null} />
      <BrStatus hud={hud} />
      <BrLobbyCard hud={hud} />
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
  // ?line=ax,az,bx,bz: along this line (a road) instead of the runway, from its start
  // (smooth.mjs --line: real ground under the wheels; the runway is level).
  const line = new URLSearchParams(location.search).get("line")?.split(",").map(Number);
  const [ax, az] = line ? [line[0]!, line[1]!] : meta.runways[0]!.a,
    [bx, bz] = line ? [line[2]!, line[3]!] : meta.runways[0]!.b;
  // On a road everything starts at its head and keeps to its width.
  const T0 = line ? -395 : 0,
    SIDE = line ? 0.12 : 1;
  const len = Math.hypot(bx - ax, bz - az),
    ux = (bx - ax) / len,
    uz = (bz - az) / len;
  const put = (seat: number, t: number, side = 0) => {
    const b = state.seats[seat]!.body;
    b.x = ax + ux * (t + T0) - uz * side;
    b.z = az + uz * (t + T0) + ux * side;
    b.y = world.supportAt(b.x, b.z, 0.35, 1e4);
    Object.assign(b, { phase: "ground", grounded: true, velocityY: 0, vx: 0, vz: 0 });
  };
  // (On a road the others stand far off: the place is measured, not a crowd.)
  for (const s of state.seats) put(s.seat, 200 + s.seat * 7, line ? 3000 : 900);
  // ?walk: on foot ahead of the queue; otherwise beside it.
  if (line && location.search.includes("walk")) put(me, 445, 0);
  else put(me, 400, line ? 2.5 : 0);
  // ?lobby: stay in the warm-up (the countdown card) instead of starting the match.
  if (!location.search.includes("lobby")) state.phase = "active";
  const yaw = Math.atan2(-ux, -uz);
  const park = (kind: Vehicle["kind"], t: number, side: number) => {
    const x = ax + ux * (t + T0) + uz * side * SIDE,
      z = az + uz * (t + T0) - ux * side * SIDE;
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
  // On a road they stand in a queue, the one to be driven (?first=<kind>) at its head.
  const first = new URLSearchParams(location.search).get("first") ?? "sedan";
  let queued = 0;
  const spot = (kind: Vehicle["kind"], side: number) =>
    line ? park(kind, kind === first ? 430 : 420 - 9 * queued++, 0) : park(kind, 420, side);
  const parked = {
    sedan: spot("sedan", 8),
    suv: spot("suv", 13),
    pickup: spot("pickup", 18),
    bike: spot("bike", 23),
  };
  // The other player drives a second pickup in a wide circle, further along the runway.
  const theirs = park("pickup", 520, line ? -900 : 0);
  const os = state.seats[other]!;
  put(other, 520, line ? 108 : 0);
  theirs.driver = other;
  os.vehicle = theirs.id;
  const queue: BrInput[] = [];
  const acts: BrAct[] = [];
  // ?net=<ms>: the room's own input queue (workers/fps/br-input.ts: one input a tick, a held
  // one through a gap, a skip to drain a backlog) behind a connection whose packets arrive up to
  // <ms> late, each way (smooth.mjs: what a driver sees on a real connection).
  const netMs = Number(new URLSearchParams(location.search).get("net") ?? NaN);
  const room = Number.isFinite(netMs) ? new BrInputQueue() : null;
  let netSeed = 12345;
  // In order, as a WebSocket delivers: a packet never overtakes the one before it.
  const lastAt = { up: 0, down: 0 };
  const deliver = (way: "up" | "down", fn: () => void) => {
    netSeed = (Math.imul(netSeed, 1664525) + 1013904223) >>> 0;
    const at = Math.max(lastAt[way], performance.now() + (netSeed / 2 ** 32) * netMs);
    lastAt[way] = at;
    setTimeout(fn, at - performance.now());
  };
  arena.setSender((message) => {
    const raw = JSON.parse(message);
    if (raw.type === "br-act") {
      const a = validateBrAct(raw);
      if (a) acts.push(a);
      return;
    }
    const input = validateBrInput(raw);
    if (!input) throw new Error("client sent an invalid input " + message);
    if (room) {
      deliver("up", () => room.push(input, Date.now()));
      return;
    }
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
    const input = room ? room.take(clock, Date.now()) : queue.shift();
    if (input) inputs.set(me, input);
    if (otherDrives)
      inputs.set(other, { seq: ++oseq, forward: 1, strafe: -0.6, yaw: theirs.yaw } as BrInput);
    clock += TICK_MS;
    stepBrMatch(state, world, meta, inputs, clock, TICK_MS, new Map([[me, acts.splice(0, 4)]]));
    const view = brViewFor(state, world, sight, me, clock, sync) as unknown as BrView;
    if (room) deliver("down", () => arena.snapshot(view));
    else arena.snapshot(view);
    state.loot.flush();
  }, TICK_MS);
  const meB = state.seats[me]!.body;
  // The camera's place and facing every frame for `ms` (smooth.mjs): [time, x, y, z, fx, fy, fz].
  window.sim.trace = (ms: number) =>
    new Promise<number[][]>((resolve) => {
      const rows: number[][] = [];
      let t0 = NaN;
      // The frame's own time (what the client's loop advances by), not when this ran.
      const frame = (t: number) => {
        if (Number.isNaN(t0)) t0 = t;
        const d = arena.debug();
        rows.push([t - t0, ...d.camera, ...d.facing]);
        if (t - t0 < ms) requestAnimationFrame(frame);
        else resolve(rows);
      };
      requestAnimationFrame(frame);
    });
  // Stop drawing (smooth.mjs): the software renderer manages a frame a second, and the trace
  // is of where the client puts the camera, not of what is drawn.
  window.sim.noDraw = () => {
    const r = arena.debug().renderer as { render: () => void; compile?: unknown };
    r.render = () => {};
  };
  // What the client reports when the browser takes the graphics away (context-loss.mjs).
  const graphics: unknown[] = [];
  arena.onGraphics((g) => graphics.push({ ...g, at: Math.round(performance.now()) }));
  window.sim.graphics = () => graphics;
  window.sim.calls = () => arena.debug().calls;
  window.sim.roots = () => arena.debugRoots();
  // Everyone else in a helmet, vest and pack of this level (capture.mjs --lobby --dress=2):
  // each seat a level further, so the three levels stand side by side.
  window.sim.dress = (level: number) => {
    for (const seat of state.seats) {
      if (seat.seat === me) continue;
      const lv = ((seat.seat + level) % 3) + 1;
      seat.kit.armour.helmet = { item: `helmet-${lv}` as ItemId, durability: 100 };
      seat.kit.armour.vest = { item: `vest-${lv}` as ItemId, durability: 100 };
      seat.kit.backpack = `backpack-${lv}` as ItemId;
    }
  };
  /** Drop the graphics context as a driver reset does, and give it back after `holdMs`. */
  window.sim.loseContext = (holdMs: number) => {
    const gl = (arena.debug().renderer as { getContext(): WebGL2RenderingContext }).getContext();
    const ext = gl.getExtension("WEBGL_lose_context");
    if (!ext) return false;
    ext.loseContext();
    setTimeout(() => ext.restoreContext(), holdMs);
    return true;
  };
  window.sim.work = (sinceMs: number) => {
    const from = performance.now() - sinceMs;
    return frameWork.filter(([t]) => t! >= from).map(([, ms]) => ms!);
  };
  window.sim.yaw = yaw;
  // A steady mouse: `pixels` to the right over `ms`, as mouse events every frame.
  window.sim.mouse = (pixels: number, ms: number) =>
    new Promise<void>((resolve) => {
      (globalThis as { __brAssumeLock?: boolean }).__brAssumeLock = true;
      let sent = 0,
        t0 = NaN;
      const frame = (t: number) => {
        if (Number.isNaN(t0)) t0 = t;
        const due = Math.round(Math.min(1, (t - t0) / ms) * pixels);
        if (due > sent)
          document.dispatchEvent(
            new MouseEvent("mousemove", { movementX: due - sent, bubbles: true }),
          );
        sent = due;
        if (t - t0 < ms) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
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
