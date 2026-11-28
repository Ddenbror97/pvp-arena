import * as THREE from "three";
/**
 * Battle royale client check without a server deployment: the page runs the real shared match
 * (match.ts) as an in-page stand-in for BrRoom, with a second human seat that mirrors the local
 * player, and connects the real client (br-arena.ts) to it through a fake socket. Driven by
 * scripts/br/client-sim/capture.mjs (Playwright): countdown, plane, jump, freefall, parachute,
 * landing; screenshots and prediction error against the server's state.
 */
import { validateBrAct, type BrAct } from "../../../src/lib/fps/br/actions";
import { createBrArena, type BrArenaControls, type BrView } from "../../../src/lib/fps/br/br-arena";
import { decodeHeightfield } from "../../../src/lib/fps/br/heightfield";
import { buildIsland } from "../../../src/lib/fps/br/island";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
import { ITEMS } from "../../../src/lib/fps/br/items";
import { pickUp } from "../../../src/lib/fps/br/inventory";
import { rollLoot } from "../../../src/lib/fps/br/loot";
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
import { spawnVehicles } from "../../../src/lib/fps/br/vehicles";
import { WORLD_ASSETS, type WorldMeta } from "../../../src/lib/fps/br/world";
import { ZIP_HEADING, ZIP_STAND, ZIPLINES, zipLanding } from "../../../src/lib/fps/br/zipline";
import { climbPoint, ladders } from "../../../src/lib/fps/br/ladders";
import { lifts } from "../../../src/lib/fps/br/lifts";
import {
  HOP_MS,
  RAPPEL,
  rappelEnd,
  stepRappel,
  type RappelState,
} from "../../../src/lib/fps/br/rappel";
import { SNAPSHOT_INTERVAL_MS } from "../../../src/lib/fps/network";
import { BrInputQueue } from "../../../workers/fps/br-input";
import { TICK_MS } from "../../../src/lib/fps/simulation";

declare global {
  interface Window {
    sim: {
      ready: Promise<void>;
      arena: BrArenaControls;
      look?: (pitch: number) => void;
      /** UI check only: stand the local player on the nearest weapon (the room has no such hook). */
      toLoot?: () => void;
      /** UI check only: stand the local player 40 m outside the circle (to see the gas HUD). */
      toGas?: () => void;
      /**
       * Knife check only: stand the local player on open ground where it is, the other player
       * still an arm's length ahead (`behind`: facing away), no longer mirroring the input.
       */
      knifeSetup?: (behind?: boolean) => void;
      /**
       * Swim check only: you in a lake, `depth` m of water under you (shallower than 1.2: stood
       * on the bottom there, to walk in), facing out to the deep. Returns that heading.
       */
      toWater?: (depth?: number, lake?: string) => number;
      /**
       * Swim check only: the other player swimming near you: `ahead`/`right` m from you (by your
       * heading), swimming `turn` rad off your heading (`still`: treading water there; `circle`: round a
       * circle of that radius, m, so every side of them comes past).
       */
      otherSwim?: (
        ahead: number,
        right: number,
        turn: number,
        still?: boolean,
        circle?: number,
      ) => void;
      /** Swim check only: the countdown ends now (the plane takes off on the next step). */
      takeOff?: () => void;
      /** Swim check only: your view (yaw, pitch). */
      face?: (yaw: number, pitch: number) => void;
      /** Swim check only: you are eliminated and watch the other player (first person). */
      die?: () => void;
      /**
       * Spectator lab (spectate-lab.mjs): the match runs on a steady clock (catching up after a
       * slow frame, as a room does not wait for a client) and its snapshots reach the client
       * through this connection: `hz` snapshots a second, each `latencyMs` late plus a random
       * `jitterMs` (uniform), one in `spikeEvery` held `spikeMs` more (a retransmission); in
       * order, as on a WebSocket (a late one holds the next back). null: back to the direct feed.
       */
      net?: (
        o: {
          hz?: number;
          latencyMs?: number;
          jitterMs?: number;
          spikeEvery?: number;
          spikeMs?: number;
          seed?: number;
          /** The caller pumps the match itself (sim.pump, once a frame of its own clock). */
          manual?: boolean;
        } | null,
      ) => void;
      pump?: () => void;
      /** Spectator lab: the connection's delay changes by `ms` from now on. */
      netShift?: (ms: number) => void;
      otherActLog?: () => string[];
      /** Spectator lab: the other player's input each tick (null: as before). */
      otherScript?: (fn: ((tick: number) => Partial<BrInput> | null) | null) => void;
      /** Spectator lab: an act of the other player's (enter, exit, zip, ladder…). */
      otherAct?: (a: BrAct) => void;
      /** Spectator lab: you are eliminated and watch `seat` (default: the other player). */
      spectate?: (seat?: number) => void;
      /** Spectator lab: the match's clock (ms) and the wall clock it started at. */
      clock?: () => { clock: number; t0: number };
      /** Profiling: `count` more players on the ground in view (see the definition). */
      crowd?: (count?: number) => number;
      /**
       * Knife and gun checks: a gun into the local player's hands (default the AK-47) with
       * attachments, and rounds for it in the bag.
       */
      giveGun?: (item?: string, optic?: string | null, muzzle?: string | null) => void;
      /** Gun checks: the gun in hand on the server (rounds, reload, a shell reload's stage). */
      gun?: () => {
        item: string;
        mag: number;
        reserve: number;
        reloading: boolean;
        stage: number | null;
      } | null;
      /** Zip-line check only: stand the local player on the Iron Peaks deck at the handle. */
      toZip?: () => number;
      /** Zip-line check only: the other player takes the line (server act), the local player
       * standing beside the Pine Ridge landing to watch them come in. */
      zipOther?: () => void;
      /** Zip-line check only: the other player's ride time (ms; -1 off the line). */
      otherZip?: () => number;
      /** Ladder check only: the local player at the foot of the Iron Peaks watchtower's ladder
       * (returns the way to face it). */
      toLadder?: () => { yaw: number; bottom: number; top: number };
      /** Ladder check only: the other player climbs it, the local player watching from the east. */
      ladderOther?: () => number;
      /** Ladder check only: the other climber holds still (0) or climbs on (1). */
      otherClimb?: (forward: number) => void;
      /** Second zip-line check only: stand the local player on the broadcast tower's platform
       * at its handle (returns the line's heading). */
      toZip2?: () => number;
      /** Second zip-line check only: the other player takes the second line, the local player
       * watching from beside its landing platform by the watchtower. */
      zip2Other?: () => number;
      /** Zip-line checks: hold your ride at `ms` (null lets it run on). Software WebGL draws a
       * frame a second or slower while the in-page server keeps time: the camera's views are
       * taken with the rider held mid-line. */
      holdZip?: (ms: number | null) => void;
      /** Rope check only: the local player at the Iron Peaks climbing rope's foot (returns the
       * way to face the face, the climb's length and the foot's and exit's heights). */
      toRope?: () => { yaw: number; length: number; bottom: number; top: number };
      /** Rope check only: the other player climbs the rope, the local player watching from the
       * slope below its foot (`side` m along the contour). Returns the rope's yaw. */
      ropeOther?: (side?: number) => number;
      /** Rope check only: how far up the rope you (or the other player) are (m; -1 off it). */
      ropeS?: (who?: "me" | "other") => number;
      ropeNearTop?: (below?: number) => number;
      /** Rappel check only: you (or the other player, you watching from the ground `watch` m
       * out from the wall and `along` m along it) at a roof's edge, facing out over it. */
      rappelStand?: (
        who: "me" | "other",
        x: number,
        y: number,
        z: number,
        yaw: number,
        watch?: number,
        along?: number,
      ) => void;
      /** Rappel check only: the other player throws their rope (E). */
      rappelOther?: () => void;
      /** Rappel check only: your (or their) rope's state, null off it. */
      rappel?: (who?: "me" | "other") => RappelState | null;
      /** Rappel check only: hold a rope at a moment (software WebGL draws a frame a second
       * while the in-page server keeps time): the stage and how far into it (0..1; hanging:
       * `of` of a hop, −1 braced on the wall), `s` m below the edge when hanging. null lets go. */
      rappelHold?: (
        hold: { who: "me" | "other"; stage: RappelState["stage"]; of: number; s?: number } | null,
      ) => void;
      /** Inventory check only: a helmet, vest and backpack of `level` (1–3), worn. */
      giveGear?: (level: number) => void;
      /** Shader check only: you throw a grenade of this type at your feet. */
      throwNade?: (type: "he" | "smoke" | "fire") => void;
      /** Shader check only: the other player picks this gun up (and holds it). */
      /** Gun checks: the other player holds only `item` (null: the knife). */
      otherHold?: (item: string | null) => void;
      /** Gun checks: the other player's two main guns (slots 1 and 2) and the slot in hand
       * (−1: the knife). */
      otherLoadout?: (guns: [string | null, string | null], active: number) => void;
      /** Gun checks: turn the other player by `by` rad (seen from the side). */
      otherTurn?: (by: number) => void;
      /**
       * Hit-effects check (hit-capture.mjs): the other player `ahead` m in front of you and
       * `right` m to your right, facing you, each of you with an AK-47, standing still.
       */
      fightSetup?: (ahead?: number, right?: number) => void;
      /** Hit-effects check: the other player holds the trigger, aimed at your chest (or lets go). */
      otherFire?: (on: boolean) => void;
      /** Hit-effects check: your health and the other player's, on the server (null: as it is). */
      health?: (mine: number | null, theirs?: number | null) => { mine: number; theirs: number };
      otherGun?: (item: string) => void;
      /** Spot checks (spot-capture.mjs): stand the local player at world (x, y, z), the other
       * player 60 m away; no input mirrored. `y` omitted: on whatever is under (x, z) below
       * `above` (default the terrain + 50 m). */
      place?: (
        x: number,
        z: number,
        y?: number,
        above?: number,
      ) => { x: number; y: number; z: number };
      /** Performance lab (scripts/br/perf-lab): the match itself, to stand seats anywhere. */
      internals?: () => {
        state: ReturnType<typeof createBrMatch>;
        world: ReturnType<typeof buildIsland>["solid"];
        hf: { heightAt: (x: number, z: number) => number };
        meta: WorldMeta;
        island: ReturnType<typeof buildIsland>;
        me: number;
        other: number;
        act: (a: BrAct) => void;
      };
      /** Lift checks: the island's lifts (lifts.ts). */
      lifts?: () => unknown;
      status: () => {
        phase: string;
        me: { phase: string; x: number; y: number; z: number };
        predicted: { phase: string; x: number; y: number; z: number };
        error: number;
        pending: number;
        otherSeen: number[] | null;
      };
    };
  }
}

const base = new URL(".", location.href).href;
const get = (p: string) => fetch(new URL(p.replace(/^\//, ""), base));
const params = new URLSearchParams(location.search);
// The UI harness (ui.tsx) mounts the arena in its own host; the plain check uses the body.
const host = document.getElementById("arena") ?? document.body;
const arena = createBrArena(host, base, () => {});
const ready = (async () => {
  const [hfBuf, lcBuf, meta, collision] = await Promise.all([
    get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    get(WORLD_ASSETS.collision).then((r) => r.json() as Promise<CollisionData>),
  ]);
  const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
  const island = buildIsland(hf, cover, meta, collision);
  const world = island.solid;
  const seed = 20261103;
  // ?zone=0.2 runs the zone faster (to see the gas); ?loot=1 rolls the match's loot, as the room does.
  const scale = Number(params.get("zone") ?? 1);
  const loot = params.get("loot") ? rollLoot(seed, island.layout, collision, world, meta) : [];
  const state = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, {
    zoneTimeScale: scale > 0 && scale <= 1 ? scale : 1,
    // ?vehicles=1: the match's vehicles where the room parks them (workers/fps/br.ts).
    ...(params.get("vehicles")
      ? { vehicles: spawnVehicles(meta, island.solid, seed, island.layout) }
      : {}),
    open: (x, z) => !world.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
  });
  const me = seatHuman(state, "local", "Me");
  const other = seatHuman(state, "remote", "Buddy");
  const queue: BrInput[] = [];
  /**
   * Over a lab's connection (net): the room's own input queue (workers/fps/br-input.ts), which
   * drains a backlog. The plain queue above keeps one for good once it has one (a slow start
   * leaves eight inputs, 267 ms: every key then acts a quarter of a second late, and the
   * prediction is corrected by that much at every change of phase).
   */
  const roomQueue = new BrInputQueue();
  const actQueue: BrAct[] = [];
  let mirror: BrInput | null = null;
  let mirroring = true;
  /** The other player's turn rate (rad/s) while it swims a circle (otherSwim), else 0. */
  let orbit = 0;
  let lastInput: BrInput | null = null;
  arena.setSender((message) => {
    const raw = JSON.parse(message);
    if (raw?.type === "br-act") {
      const act = validateBrAct(raw);
      if (!act) throw new Error("client sent an invalid action");
      actQueue.push(act);
      return;
    }
    const input = validateBrInput(raw);
    if (!input) throw new Error("client sent an invalid input");
    lastInput = input;
    queue.push(input);
    while (queue.length > 8) queue.shift();
    roomQueue.push(input, performance.now());
  });
  await arena.ready;
  const sight = new BrSight();
  // Per-connection state, as the room keeps it: loot, vehicles, doors and the kit go by it.
  const sync = new BrSeatSync();
  let clock = 0,
    lastSnap = 0;
  let lastView: BrView | null = null;
  let pendingCombat: typeof state.combat = [];
  type Net = {
    every: number;
    latencyMs: number;
    jitterMs: number;
    spikeEvery: number;
    spikeMs: number;
    rand: () => number;
    manual: boolean;
    t0: number;
    last: number;
    queue: Array<{ at: number; view: BrView }>;
  };
  let net: Net | null = null;
  /** The other player's acts as the match answered them (the spectator lab's scenarios). */
  const otherActLog: string[] = [],
    actSeen = new WeakSet<object>();
  window.sim.otherActLog = () => otherActLog.splice(0);
  let otherScript: ((tick: number) => Partial<BrInput> | null) | null = null;
  const step = () => {
    const mine = queue.shift();
    const input = net ? roomQueue.take(clock, performance.now()) : mine;
    if (input && mirroring) mirror = { ...input, yaw: input.yaw + 0.3 };
    // (Swim check: the other player swims a circle, so every side of the stroke comes past.)
    if (orbit && mirror) mirror = { ...mirror, yaw: mirror.yaw + (orbit * TICK_MS) / 1000 };
    const inputs = new Map<number, BrInput>();
    if (input) inputs.set(me, input);
    if (mirror) inputs.set(other, mirror);
    if (otherScript) {
      const scripted = otherScript(state.tick);
      if (scripted)
        inputs.set(other, { seq: state.tick + 1, forward: 0, strafe: 0, yaw: 0, ...scripted });
    }
    clock += TICK_MS;
    const acts = new Map<number, BrAct[]>();
    if (actQueue.length) acts.set(me, actQueue.splice(0, 4));
    if (otherActs.length) acts.set(other, otherActs.splice(0, 4));
    const held = state.seats[me]!.body;
    if (zipHold !== null && held.phase === "zip" && held.zip) held.zip.ms = zipHold - TICK_MS;
    stepBrMatch(state, world, meta, inputs, clock, TICK_MS, acts);
    for (const e of state.combat)
      if (e.type === "act" && e.seat === other && !actSeen.has(e)) {
        actSeen.add(e);
        otherActLog.push(`${e.act}:${e.ok ? "ok" : (e.reason ?? "no")}`);
      }
    if (rappelHold) {
      const hb = state.seats[rappelHold.who === "me" ? me : other]!.body;
      const st = hb.phase === "rappel" ? hb.rappel : undefined;
      if (st) {
        const h = rappelHold;
        st.stage = h.stage;
        if (h.stage === "hang") {
          if (h.s !== undefined) st.s = st.from = h.s;
          st.hop = h.of < 0 ? -1 : h.of * HOP_MS;
          if (h.of < 0) st.from = st.s;
        } else {
          if (h.stage === "land") st.s = rappelEnd(st);
          st.t =
            h.of *
            (h.stage === "on" ? RAPPEL.onMs : h.stage === "up" ? RAPPEL.upMs : RAPPEL.landMs);
        }
        // (Where that moment has the body: a step of no time. Braced on the wall, S held
        // keeps it from starting the next hop.)
        stepRappel(world, hb, h.stage === "hang" && h.of < 0 ? -1 : 0, 0, 0);
      }
    }
    // ?immortal=1: long checks (the climbing rope at software WebGL's pace) outlast the zone;
    // both players are kept alive in the gas.
    if (params.get("immortal")) for (const seat of [me, other]) state.seats[seat]!.kit.hp = 100;
    // As the room does (workers/fps/br.ts pendingCombat): a view carries every event since the
    // last one, not only the events of the step it is built after. (Snapshots go out about
    // every second step here, so a shot's hit was lost half the time.)
    pendingCombat.push(...state.combat);
    if (net) {
      // The lab's connection: every `every` ticks, delivered late and in order.
      if (state.tick % net.every === 0) {
        state.combat = pendingCombat;
        pendingCombat = [];
        lastView = brViewFor(state, world, sight, me, clock, sync) as unknown as BrView;
        const sent = net.t0 + clock;
        let late = net.latencyMs + net.rand() * net.jitterMs;
        if (net.spikeEvery > 0 && net.rand() < 1 / net.spikeEvery) late += net.spikeMs;
        net.last = Math.max(net.last, sent + late);
        net.queue.push({ at: net.last, view: lastView });
      }
    } else if (performance.now() - lastSnap >= SNAPSHOT_INTERVAL_MS) {
      lastSnap = performance.now();
      state.combat = pendingCombat;
      pendingCombat = [];
      lastView = brViewFor(state, world, sight, me, clock, sync) as unknown as BrView;
      arena.snapshot(lastView);
    }
  };
  // A room keeps its own time: after a slow frame here the match catches up, and what was
  // due on the connection is delivered.
  const pump = () => {
    if (!net) return;
    const wall = performance.now();
    let guard = 0;
    while (net.t0 + clock + TICK_MS <= wall && guard++ < 30) step();
    if (guard >= 30) net.t0 = wall - clock;
    while (net.queue.length && net.queue[0]!.at <= wall) arena.snapshot(net.queue.shift()!.view);
  };
  window.sim.pump = pump;
  setInterval(() => {
    if (net && !net.manual) pump();
  }, 4);
  let direct = setInterval(step, TICK_MS);
  window.sim.net = (o) => {
    clearInterval(direct);
    if (!o) {
      net = null;
      direct = setInterval(step, TICK_MS);
      return;
    }
    // (mulberry32: the same connection for the runs compared.)
    let a = (o.seed ?? 1) >>> 0;
    const rand = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    net = {
      every: Math.max(1, Math.round(1000 / TICK_MS / (o.hz ?? 15))),
      latencyMs: o.latencyMs ?? 0,
      jitterMs: o.jitterMs ?? 0,
      spikeEvery: o.spikeEvery ?? 0,
      spikeMs: o.spikeMs ?? 0,
      rand,
      manual: !!o.manual,
      t0: performance.now() - clock,
      last: 0,
      queue: [],
    };
  };
  window.sim.netShift = (ms) => {
    if (net) net.latencyMs += ms;
  };
  window.sim.otherScript = (fn) => {
    mirroring = false;
    mirror = null;
    otherScript = fn;
  };
  window.sim.clock = () => ({ clock, t0: net?.t0 ?? performance.now() - clock });
  window.sim.toLoot = () => {
    const b = state.seats[me]!.body;
    let best: { x: number; y: number; z: number } | null = null,
      bd = Infinity;
    // A weapon outdoors (on the ground, not under a roof) with more loot beside it: the
    // inventory's Nearby list then shows several rows, the world stays in view.
    const items = [...state.loot.items.values()];
    for (const i of items) {
      if (ITEMS[i.item]?.category !== "weapon") continue;
      if (Math.abs(i.y - hf.heightAt(i.x, i.z)) > 0.6) continue;
      const near = items.filter((o) => Math.hypot(o.x - i.x, o.z - i.z) < 3).length;
      const d = Math.hypot(i.x - b.x, i.z - b.z) + (near >= 2 ? 0 : 2000);
      if (d < bd) [bd, best] = [d, i];
    }
    if (!best) return;
    b.x = best.x + 0.6;
    b.z = best.z;
    b.y = best.y;
    b.vx = b.vy = b.vz = 0;
  };
  let seaYaw = 0;
  window.sim.toWater = (depth = 5, lake = "lake-3") => {
    const b = state.seats[me]!.body;
    mirroring = false;
    mirror = null;
    const w = meta.waterBodies.find((l) => l.id === lake)!;
    const [x0, z0, x1, z1] = w.bounds;
    const deep = (x: number, z: number) => {
      const g = hf.heightAt(x, z);
      return x > x0 && x < x1 && z > z0 && z < z1 && g < w.level ? w.level - g : 0;
    };
    // Deep water in the lake, and from it toward a shore: where the water is that deep.
    let mx = 0,
      mz = 0,
      most = 0;
    const ox = (x0 + x1) / 2,
      oz = (z0 + z1) / 2;
    // (Deep water nearest the lake's middle: open water all round it.)
    let far = Infinity;
    for (let x = x0; x <= x1; x += 6)
      for (let z = z0; z <= z1; z += 6) {
        const d = deep(x, z),
          from = Math.hypot(x - ox, z - oz);
        if (d > 3 && from < far) [far, most, mx, mz] = [from, d, x, z];
      }
    b.x = mx;
    b.z = mz;
    seaYaw = 0;
    search: for (let k = 0; k < 32 && depth < most; k++) {
      const a = k * 2.4,
        cx = Math.cos(a),
        cz = Math.sin(a);
      for (let r = 0; r < 800; r += 0.2) {
        const d = deep(mx + cx * r, mz + cz * r);
        if (d === 0) break;
        if (d > depth) continue;
        // (A shore that shelves: wading depth within 30 m, and not a ledge.)
        if (r < 25 || deep(mx + cx * (r + 30), mz + cz * (r + 30)) > 0.4) break;
        // (And nothing in the way of walking in: no wall, pier or rock on the bed there.)
        let clear = true;
        for (let d = -12; d <= 8 && clear; d += 0.5) {
          const x = mx + cx * (r + d),
            z = mz + cz * (r + d);
          clear = !world.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6);
        }
        if (!clear) break;
        b.x = mx + cx * r;
        b.z = mz + cz * r;
        // (Heading out to the deep: forward is (−sin yaw, −cos yaw).)
        seaYaw = Math.atan2(cx, cz);
        break search;
      }
    }
    const g = hf.heightAt(b.x, b.z);
    Object.assign(
      b,
      w.level - g > 1.3
        ? { phase: "swim", grounded: false, y: w.level }
        : { phase: "ground", grounded: true, y: g },
    );
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: b.x + 300, z: b.z + 300 });
    o.y = hf.heightAt(o.x, o.z);
    stop(o);
    arena.look(seaYaw, 0);
    return seaYaw;
  };
  window.sim.otherSwim = (ahead, right, turn, still = false, circle = 0) => {
    // (A circle of that radius at the swimming speed, to the left.)
    orbit = circle > 0 && !still ? 2.5 / circle : 0;
    const b = state.seats[me]!.body,
      o = state.seats[other]!;
    const fx = -Math.sin(seaYaw),
      fz = -Math.cos(seaYaw);
    Object.assign(o.body, {
      phase: "swim",
      grounded: false,
      x: b.x + fx * ahead - fz * right,
      z: b.z + fz * ahead + fx * right,
      y: b.y,
    });
    stop(o.body);
    o.yaw = seaYaw + turn;
    o.kit.hp = 100;
    o.dead = false;
    mirroring = false;
    mirror = { seq: 1, forward: still ? 0 : 1, strafe: 0, yaw: seaYaw + turn };
  };
  window.sim.face = (yaw, pitch) => arena.look(yaw, pitch);
  window.sim.takeOff = () => {
    if (state.phase === "starting") state.phaseAt = clock;
  };
  window.sim.die = () => {
    const s = state.seats[me]!;
    s.kit.hp = 0;
    s.dead = true;
  };
  window.sim.spectate = (seat = other) => {
    const s = state.seats[me]!;
    s.kit.hp = 0;
    s.dead = true;
    s.spectate = seat;
    s.kitVersion++;
  };
  window.sim.otherAct = (a) => void otherActs.push(a);
  window.sim.knifeSetup = (behind = false) => {
    const b = state.seats[me]!.body,
      o = state.seats[other]!;
    mirroring = false;
    mirror = null;
    b.phase = "ground";
    // Open dry ground: the first clear spot on a spiral from the island's centre.
    const yaw = lastInput?.yaw ?? 0;
    const clear = (x: number, z: number) => {
      const y = hf.heightAt(x, z);
      return (
        y > 3 &&
        !world.blocked(x, y + 0.1, z, 1.8, 0.6) &&
        Math.abs(world.supportAt(x, z, 0.35, y + 0.5) - y) < 0.01
      );
    };
    for (let i = 0; i < 4000; i++) {
      const r = 40 + i * 2,
        a = i * 0.7;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const ox = x - Math.sin(yaw) * 1.1,
        oz = z - Math.cos(yaw) * 1.1;
      if (clear(x, z) && clear(ox, oz) && Math.abs(hf.heightAt(x, z) - hf.heightAt(ox, oz)) < 0.3) {
        b.x = x;
        b.z = z;
        break;
      }
    }
    b.y = hf.heightAt(b.x, b.z);
    b.vx = b.vy = b.vz = 0;
    o.body.phase = "ground";
    o.body.x = b.x - Math.sin(yaw) * 1.1;
    o.body.z = b.z - Math.cos(yaw) * 1.1;
    o.body.y = hf.heightAt(o.body.x, o.body.z);
    o.body.vx = o.body.vy = o.body.vz = 0;
    o.yaw = behind ? yaw : yaw + Math.PI;
    o.kit.hp = 100;
    o.dead = false;
  };
  const CROWD_GUNS = ["m4", "awp", "mp5", "deagle", "spas12"] as const;
  /**
   * A fight's worth of players in view (profile.mjs --scene=crowd): you on open ground and the
   * next `count` seats standing in rings 6–60 m ahead of you, alive, on the ground.
   */
  window.sim.crowd = (count = 24) => {
    window.sim.knifeSetup!(false);
    const b = state.seats[me]!.body;
    const yaw = lastInput?.yaw ?? 0;
    let placed = 0;
    for (const s of state.seats) {
      if (s.seat === me || s.seat === other || placed >= count) continue;
      const ring = 6 + (placed % 6) * 10,
        a = yaw + Math.PI + ((Math.floor(placed / 6) - 1.5) * Math.PI) / 7;
      s.body.phase = "ground";
      s.body.grounded = true;
      s.body.x = b.x + Math.sin(a) * ring;
      s.body.z = b.z + Math.cos(a) * ring;
      s.body.y = hf.heightAt(s.body.x, s.body.z);
      s.body.vx = s.body.vy = s.body.vz = 0;
      s.dead = false;
      s.kit.hp = 100;
      // Standing where they are put (a bot would open fire on its neighbours).
      s.bot = false;
      // Armed, with a mix of guns (every second seat the same rifle, as in a real fight).
      const item = placed % 2 ? CROWD_GUNS[(placed >> 1) % CROWD_GUNS.length]! : "ak47";
      pickUp(s.kit, { item, qty: 1, mag: (ITEMS[item] as { magazine: number }).magazine });
      s.kitVersion++;
      placed++;
    }
    return placed;
  };
  const otherActs: BrAct[] = [];
  let zipHold: number | null = null;
  let rappelHold: Parameters<NonNullable<typeof window.sim.rappelHold>>[0] = null;
  window.sim.rappelHold = (h) => {
    rappelHold = h;
  };
  window.sim.rappel = (who = "me") => {
    const b = state.seats[who === "me" ? me : other]!.body;
    return b.phase === "rappel" && b.rappel ? { ...b.rappel } : null;
  };
  window.sim.rappelStand = (who, x, y, z, yaw, watch = 7, along = 0) => {
    const b = state.seats[me]!.body,
      o = state.seats[other]!.body;
    mirroring = false;
    mirror = null;
    rappelHold = null;
    for (const body of [b, o]) {
      delete body.rappel;
      delete body.ladder;
      stop(body);
    }
    const fx = -Math.sin(yaw),
      fz = -Math.cos(yaw);
    const stander = who === "me" ? b : o,
      watcher = who === "me" ? o : b;
    Object.assign(stander, { phase: "ground", grounded: true, x, y, z });
    // The watcher: out from the wall on the ground below (far off when it is you on the roof).
    const d = who === "me" ? 60 : watch;
    Object.assign(watcher, {
      phase: "ground",
      grounded: true,
      x: x + fx * (d + 1) - fz * along,
      z: z + fz * (d + 1) + fx * along,
    });
    watcher.y = world.supportAt(watcher.x, watcher.z, 0.35, hf.heightAt(watcher.x, watcher.z) + 2);
    if (who === "other") mirror = { seq: 1, forward: 0, strafe: 0, yaw };
  };
  window.sim.rappelOther = () => {
    otherActs.push({ act: "rappel" });
  };
  const stop = (b: { vx: number; vz: number; velocityY: number }) => {
    b.vx = b.vz = b.velocityY = 0;
  };
  window.sim.toZip = () => {
    const b = state.seats[me]!.body;
    mirroring = false;
    mirror = null;
    Object.assign(b, {
      phase: "ground",
      grounded: true,
      x: ZIP_STAND.x,
      y: ZIP_STAND.y,
      z: ZIP_STAND.z,
    });
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: ZIP_STAND.x + 30, z: ZIP_STAND.z + 30 });
    o.y = hf.heightAt(o.x, o.z);
    stop(o);
    return ZIP_HEADING;
  };
  window.sim.holdZip = (ms) => {
    zipHold = ms;
  };
  window.sim.toZip2 = () => {
    const l = ZIPLINES[1]!;
    const b = state.seats[me]!.body;
    mirroring = false;
    mirror = null;
    Object.assign(b, { phase: "ground", grounded: true, x: l.stand.x, y: l.stand.y, z: l.stand.z });
    delete b.ladder;
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: l.stand.x + 40, z: l.stand.z + 40 });
    o.y = hf.heightAt(o.x, o.z);
    stop(o);
    return l.heading;
  };
  window.sim.zip2Other = () => {
    const l = ZIPLINES[1]!;
    const land = l.landing((x, z) => hf.heightAt(x, z));
    const b = state.seats[me]!.body;
    // Beside the landing, a few metres off the line, toward the watchtower.
    Object.assign(b, {
      phase: "ground",
      grounded: true,
      x: land.x + l.side[0] * 6 + l.dir[0] * 4,
      z: land.z + l.side[1] * 6 + l.dir[1] * 4,
    });
    delete b.zip;
    b.y = world.supportAt(b.x, b.z, 0.35, hf.heightAt(b.x, b.z) + 1);
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: l.stand.x, y: l.stand.y, z: l.stand.z });
    delete o.ladder;
    stop(o);
    mirror = null;
    mirroring = false;
    otherActs.push({ act: "zip" });
    return l.heading;
  };
  window.sim.toLadder = () => {
    const l = ladders(hf)[0]!;
    const foot = climbPoint(l, 0);
    const b = state.seats[me]!.body;
    mirroring = false;
    mirror = null;
    Object.assign(b, { phase: "ground", grounded: true, x: foot.x + 0.6, y: foot.y, z: foot.z });
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: foot.x + 25, z: foot.z + 25 });
    o.y = hf.heightAt(o.x, o.z);
    stop(o);
    return { yaw: l.yaw, bottom: l.bottom, top: l.top };
  };
  window.sim.ladderOther = () => {
    const l = ladders(hf)[0]!;
    const foot = climbPoint(l, 0);
    const b = state.seats[me]!.body;
    Object.assign(b, { phase: "ground", grounded: true, x: foot.x + 4.5, z: foot.z + 1.2 });
    b.y = world.supportAt(b.x, b.z, 0.35, hf.heightAt(b.x, b.z) + 1);
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: foot.x + 0.4, y: foot.y, z: foot.z });
    stop(o);
    otherActs.push({ act: "ladder" });
    mirroring = false;
    mirror = { seq: 1, forward: 1, strafe: 0, yaw: l.yaw };
    return l.yaw;
  };
  window.sim.otherZip = () => state.seats[other]!.body.zip?.ms ?? -1;
  // Which rope (rope.ts ROPES): ?rope=0…3, by default the shortest (the south-south-east one).
  const ropeIndex = Number(new URLSearchParams(location.search).get("rope") ?? 2);
  const ropeLadder = () => ladders(hf).filter((l) => l.rope)[ropeIndex]!;
  window.sim.toRope = () => {
    const l = ropeLadder();
    const [fx, fy, fz] = l.rope!.foot;
    const b = state.seats[me]!.body;
    mirroring = false;
    mirror = null;
    Object.assign(b, { phase: "ground", grounded: true, x: fx, y: fy, z: fz });
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: fx + 40, z: fz + 40 });
    o.y = hf.heightAt(o.x, o.z);
    stop(o);
    return { yaw: l.yaw, length: l.rope!.length, bottom: fy, top: l.top };
  };
  // Rope check only: the local player `below` m under the rope's top, climbing (the quick way
  // to the step over the edge).
  window.sim.ropeNearTop = (below = 4) => {
    const l = ropeLadder();
    const b = state.seats[me]!.body;
    const at = l.rope!.length - below;
    const p = climbPoint(l, at);
    Object.assign(b, { phase: "ladder", grounded: false, x: p.x, y: p.y, z: p.z });
    b.ladder = { id: l.id, s: at, stage: "climb", t: 0 };
    stop(b);
    return at;
  };
  window.sim.ropeS = (who = "me") => {
    const b = state.seats[who === "me" ? me : other]!.body;
    return b.phase === "ladder" && b.ladder && ropeLadder().id === b.ladder.id ? b.ladder.s : -1;
  };
  window.sim.ropeOther = (side = 7) => {
    const l = ropeLadder();
    const [fx, fy, fz] = l.rope!.foot;
    // Along the contour (across the fall line), a little down the slope.
    const ax = Math.cos(l.yaw),
      az = -Math.sin(l.yaw);
    const b = state.seats[me]!.body;
    // A little out down the slope from the stand, to the other side of the rope (the slope
    // above is too steep to stand on: you slide).
    Object.assign(b, {
      phase: "ground",
      grounded: true,
      x: fx - ax * side + Math.sin(l.yaw) * 2.5,
      z: fz - az * side + Math.cos(l.yaw) * 2.5,
    });
    delete b.ladder;
    b.y = world.supportAt(b.x, b.z, 0.35, hf.heightAt(b.x, b.z) + 1);
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: fx, y: fy, z: fz });
    delete o.ladder;
    stop(o);
    otherActs.push({ act: "ladder" });
    mirroring = false;
    mirror = { seq: 1, forward: 1, strafe: 0, yaw: l.yaw };
    return l.yaw;
  };
  window.sim.otherClimb = (forward) => {
    const l = ladders(hf)[0]!;
    mirror = { seq: 1, forward, strafe: 0, yaw: l.yaw };
  };
  window.sim.zipOther = () => {
    const end = zipLanding((x, z) => hf.heightAt(x, z));
    const b = state.seats[me]!.body;
    Object.assign(b, { phase: "ground", grounded: true, x: end.x + 9, z: end.z + 9 });
    b.y = world.supportAt(b.x, b.z, 0.35, hf.heightAt(b.x, b.z) + 2);
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, {
      phase: "ground",
      grounded: true,
      x: ZIP_STAND.x,
      y: ZIP_STAND.y,
      z: ZIP_STAND.z,
    });
    delete o.ladder;
    stop(o);
    mirror = null;
    otherActs.push({ act: "zip" });
  };
  window.sim.giveGear = (level) => {
    const kit = state.seats[me]!.kit;
    for (const slot of ["helmet", "vest", "backpack"] as const) {
      const item = `${slot}-${level}` as keyof typeof ITEMS;
      const d = ITEMS[item] as { durability?: number };
      // Replace what is worn (straight on, as the inventory's equip does).
      if (slot === "backpack") kit.backpack = item;
      else kit.armour[slot] = { item, durability: d.durability ?? 100 };
    }
    state.seats[me]!.kitVersion++;
  };
  window.sim.giveGun = (item = "ak47", optic = null, muzzle = null) => {
    const kit = state.seats[me]!.kit;
    const d = ITEMS[item as keyof typeof ITEMS] as { magazine: number; ammo: string };
    pickUp(kit, {
      item: item as keyof typeof ITEMS,
      qty: 1,
      mag: d.magazine,
      optic: optic as keyof typeof ITEMS | null,
      muzzle: muzzle as keyof typeof ITEMS | null,
    });
    pickUp(kit, { item: d.ammo as keyof typeof ITEMS, qty: 60 });
    state.seats[me]!.kitVersion++;
  };
  /** The gun in hand on the server: rounds in it and in the bag, and its reload's state. */
  window.sim.gun = () => {
    const s = state.seats[me]!,
      g = s.kit.active >= 0 ? s.kit.guns[s.kit.active] : null;
    if (!g) return null;
    const ammo = (ITEMS[g.item] as { ammo: string }).ammo;
    return {
      item: g.item,
      mag: g.mag,
      reserve: s.kit.bag.reduce((n, b) => n + (b && b.item === ammo ? b.qty : 0), 0),
      reloading: s.hands.reloadUntil > 0,
      stage: s.hands.shells?.stage ?? null,
    };
  };
  window.sim.throwNade = (type) => {
    const s = state.seats[me]!;
    pickUp(s.kit, { item: `grenade-${type}`, qty: 1 });
    s.kitVersion++;
    actQueue.push({ act: "throw", nade: type, kind: "under" });
  };
  window.sim.otherGun = (item) => {
    const o = state.seats[other]!;
    const d = ITEMS[item as keyof typeof ITEMS] as { magazine: number };
    pickUp(o.kit, { item: item as keyof typeof ITEMS, qty: 1, mag: d.magazine });
    o.kitVersion++;
  };
  window.sim.otherHold = (item) => {
    const o = state.seats[other]!;
    o.kit.guns = o.kit.guns.map(() => null) as typeof o.kit.guns;
    o.kit.active = -1;
    if (item) {
      const d = ITEMS[item as keyof typeof ITEMS] as { magazine: number };
      pickUp(o.kit, { item: item as keyof typeof ITEMS, qty: 1, mag: d.magazine });
      o.kit.active = o.kit.guns.findIndex((g) => g?.item === item);
    }
    o.kitVersion++;
  };
  window.sim.otherLoadout = (guns, active) => {
    const o = state.seats[other]!;
    o.kit.guns = o.kit.guns.map(() => null) as typeof o.kit.guns;
    guns.forEach((item, i) => {
      if (!item) return;
      const d = ITEMS[item as keyof typeof ITEMS] as { magazine: number };
      o.kit.guns[i] = {
        item: item as keyof typeof ITEMS,
        mag: d.magazine,
        optic: null,
        muzzle: null,
      } as (typeof o.kit.guns)[number];
    });
    o.kit.active = active;
    o.kitVersion++;
  };
  window.sim.otherTurn = (by) => {
    state.seats[other]!.yaw += by;
  };
  window.sim.fightSetup = (ahead = 6, right = 0) => {
    window.sim.knifeSetup!(false);
    const b = state.seats[me]!.body,
      o = state.seats[other]!;
    const yaw = lastInput?.yaw ?? 0;
    // (Forward is (−sin yaw, −cos yaw); right of it (cos yaw, −sin yaw).)
    o.body.x = b.x - Math.sin(yaw) * ahead + Math.cos(yaw) * right;
    o.body.z = b.z - Math.cos(yaw) * ahead - Math.sin(yaw) * right;
    o.body.y = world.supportAt(o.body.x, o.body.z, 0.35, hf.heightAt(o.body.x, o.body.z) + 0.5);
    o.yaw = Math.atan2(-(b.x - o.body.x), -(b.z - o.body.z));
    window.sim.giveGun!("ak47");
    window.sim.otherHold!("ak47");
  };
  window.sim.otherFire = (on) => {
    const b = state.seats[me]!.body,
      o = state.seats[other]!.body;
    mirroring = false;
    const d = Math.hypot(b.x - o.x, b.z - o.z);
    mirror = on
      ? {
          seq: 1,
          forward: 0,
          strafe: 0,
          yaw: Math.atan2(-(b.x - o.x), -(b.z - o.z)),
          // (From their eyes to your chest.)
          pitch: Math.atan2(b.y + 1.2 - (o.y + 1.6), d),
          fire: true,
        }
      : null;
  };
  window.sim.health = (mine, theirs = null) => {
    const a = state.seats[me]!,
      o = state.seats[other]!;
    if (mine !== null) {
      a.kit.hp = mine;
      a.kitVersion++;
    }
    if (theirs !== null) {
      o.kit.hp = theirs;
      o.kitVersion++;
    }
    return { mine: a.kit.hp, theirs: o.kit.hp };
  };
  window.sim.toGas = () => {
    const b = state.seats[me]!.body;
    const c = state.zoneNow?.now;
    if (!c) return;
    const a = Math.atan2(b.z - c.z, b.x - c.x);
    b.x = c.x + Math.cos(a) * (c.r + 40);
    b.z = c.z + Math.sin(a) * (c.r + 40);
    b.y = hf.heightAt(b.x, b.z);
    b.vx = b.vy = b.vz = 0;
  };
  window.sim.lifts = () => lifts(hf);
  window.sim.internals = () => {
    // (A measurement places people itself: nobody mirrors the local player from here on.)
    mirroring = false;
    mirror = null;
    return { state, world, hf, meta, island, me, other, act: (a: BrAct) => void actQueue.push(a) };
  };
  window.sim.place = (x, z, y, above) => {
    const b = state.seats[me]!.body;
    mirroring = false;
    mirror = null;
    const top = above ?? hf.heightAt(x, z) + 50;
    Object.assign(b, {
      phase: "ground",
      grounded: true,
      x,
      z,
      y: y ?? world.supportAt(x, z, 0.35, top),
    });
    stop(b);
    const o = state.seats[other]!.body;
    Object.assign(o, { phase: "ground", grounded: true, x: x + 60, z: z + 60 });
    o.y = hf.heightAt(o.x, o.z);
    stop(o);
    return { x: b.x, y: b.y, z: b.z };
  };
  window.sim.status = () => {
    const b = state.seats[me]!.body;
    const p = arena.debug().body;
    return {
      phase: state.phase,
      me: { phase: b.phase, x: b.x, y: b.y, z: b.z },
      ground: world.supportAt(b.x, b.z, 0.35, b.y),
      groundAtCam: (() => {
        const c = arena.debug().camera;
        return hf.heightAt(c[0]!, c[2]!);
      })(),
      cam: arena.debug().camera.map((v) => Math.round(v * 10) / 10),
      camY: arena.debug().camera[1]!,
      camDist: (() => {
        const d = arena.debug();
        return (
          Math.round(
            Math.hypot(
              d.camera[0] - d.shown[0],
              d.camera[1] - d.shown[1],
              d.camera[2] - d.shown[2],
            ) * 10,
          ) / 10
        );
      })(),
      shown: arena.debug().shown,
      /** Where your drawn character's root and its head land on screen (NDC). */
      ndc: (() => {
        const v = arena.debug().view as { camera: THREE.Camera; me: THREE.Object3D } | undefined;
        if (!v) return null;
        const at = (o: THREE.Vector3) =>
          o
            .project(v.camera)
            .toArray()
            .map((n) => Math.round(n * 100) / 100);
        const root = v.me.getWorldPosition(new THREE.Vector3());
        const head = v.me.getObjectByName("mixamorigHead")?.getWorldPosition(new THREE.Vector3());
        const dir = (v.camera as THREE.Camera).getWorldDirection(new THREE.Vector3());
        const cam = v.camera as THREE.PerspectiveCamera;
        return {
          root: at(root.clone()),
          head: head ? at(head) : null,
          rootY: root.y,
          pitchDeg: Math.round((Math.asin(dir.y) * 180) / Math.PI),
          fov: Math.round(cam.fov),
          blend: (arena.debug().view as { zipBlend: number }).zipBlend,
          ropeBlend: (arena.debug().view as { ropeBlend: number }).ropeBlend,
          rappelBlend: (arena.debug().view as { rappelBlend: number }).rappelBlend,
        };
      })(),
      predicted: { phase: p.phase, x: p.x, y: p.y, z: p.z },
      error: Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z),
      pending: arena.debug().pending,
      input: lastInput,
      velocity: [b.vx, b.vz],
      otherSeen: lastView?.players.find((r) => r[0] === other) ?? null,
      otherHp: state.seats[other]!.kit.hp,
      myActive: state.seats[me]!.kit.active,
      zip: state.seats[me]!.body.zip?.ms ?? null,
      otherPhase: state.seats[other]!.body.phase,
      otherPos: [
        state.seats[other]!.body.x,
        state.seats[other]!.body.y,
        state.seats[other]!.body.z,
      ],
    };
  };
})();
window.sim = {
  ready,
  arena,
  look: (p: number) => {
    const b = arena.debug().body;
    arena.look(Math.atan2(-b.vx, -b.vz) || 0, p);
  },
  status: () => {
    throw new Error("not ready");
  },
};
/** For the UI harness (ui.tsx): importing a binding keeps this module (the package is side-effect free). */
export const sim = window.sim;
