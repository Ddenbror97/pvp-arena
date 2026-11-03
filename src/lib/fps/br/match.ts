import { dropBotInput, planDropBots, type DropBot } from "./drop-bots";
import {
  newDropBody,
  planeRoute,
  routeMs,
  stepDrop,
  type DropBody,
  type DropInput,
  type DropPhase,
  type Route,
} from "./drop";
import type { StaticWorld } from "./static-world";
import type { WorldMeta } from "./world";

/**
 * A Project Island match (PLAN §7 Phase 2, §11.2 state machine), pure and deterministic for the
 * seed and inputs, run by the BrRoom Durable Object (authority) and replayed by tests.
 *
 *   waiting → starting (countdown) → plane (route flown, everyone drops) → active
 *
 * 100 seats, all bots until humans take them over (practice, PLAN §6.1). `ending` and
 * `completed` arrive with the zone and elimination in Phase 3.
 */
export const BR_RULES = {
  seats: 100,
  /** Countdown once the first human is seated (the lobby fills the rest with bots). */
  countdownMs: 15_000,
  /** Interest management (PLAN §6.4). */
  alwaysSendM: 300,
  sightSendM: 1000,
  sightRecheckMs: 100,
} as const;

export type BrPhase = "waiting" | "starting" | "plane" | "active";
/** Player rows in a view: [seat, x, y, z, phase code]; phase codes follow PHASE_CODES. */
export const PHASE_CODES: readonly DropPhase[] = [
  "plane",
  "freefall",
  "parachute",
  "swim",
  "ground",
];

export type BrSeat = {
  seat: number;
  id: string;
  name: string;
  bot: boolean;
  body: DropBody;
  /** Last applied input sequence (humans). */
  seq: number;
};

export type BrMatchState = {
  seed: number;
  phase: BrPhase;
  route: Route;
  /** When the current phase ends (starting) or began (plane), server ms. */
  phaseAt: number;
  tick: number;
  seats: BrSeat[];
  bots: DropBot[];
  /** Transitions this tick, for the snapshot's event list (landing sounds, chute opening). */
  events: Array<{ seat: number; phase: DropPhase }>;
};

export type BrInput = DropInput & { seq: number; playbackMs?: number };

const BOT_NAMES = [
  "Hawk",
  "Viper",
  "Nomad",
  "Atlas",
  "Rook",
  "Sable",
  "Dune",
  "Flint",
  "Mako",
  "Onyx",
];
const botSeat = (seat: number) => ({
  id: `bot-${seat}`,
  name: `BOT ${BOT_NAMES[seat % BOT_NAMES.length]!}-${seat}`,
  bot: true,
});

export function createBrMatch(
  meta: WorldMeta,
  seed: number,
  heightAt: (x: number, z: number) => number,
): BrMatchState {
  const route = planeRoute(seed);
  return {
    seed,
    phase: "waiting",
    route,
    phaseAt: 0,
    tick: 0,
    seats: Array.from({ length: BR_RULES.seats }, (_, seat) => ({
      seat,
      ...botSeat(seat),
      body: newDropBody(),
      seq: -1,
    })),
    bots: planDropBots(meta, route, seed, BR_RULES.seats, heightAt),
    events: [],
  };
}

/**
 * Seat a human: their own seat back if they reconnect, otherwise a bot's seat. Only allowed
 * before the plane takes off (a seat taken mid-air would teleport someone into a bot's body).
 */
export function seatHuman(state: BrMatchState, id: string, name: string): number {
  const own = state.seats.findIndex((s) => !s.bot && s.id === id);
  if (own >= 0) return own;
  if (state.phase !== "waiting" && state.phase !== "starting") return -1;
  const seat = state.seats.findIndex((s) => s.bot);
  if (seat < 0) return -1;
  Object.assign(state.seats[seat]!, { id, name, bot: false, seq: -1 });
  return seat;
}

/** A human who left: back to a bot (its body, phase and position stay as they are). */
export function releaseSeat(state: BrMatchState, seat: number) {
  const s = state.seats[seat];
  if (!s || s.bot) return;
  Object.assign(s, botSeat(seat), { seq: -1 });
}

/** Strict schema for client inputs: anything else closes the socket (as in 1v1/5v5). */
const INPUT_KEYS = [
  "v",
  "type",
  "seq",
  "forward",
  "strafe",
  "yaw",
  "jump",
  "crouch",
  "sprint",
  "walk",
  "jumpOut",
  "deploy",
  "dive",
  "playbackMs",
] as const;
const ALLOWED = new Set<string>(INPUT_KEYS);

export function validateBrInput(raw: unknown): BrInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (Object.keys(raw).some((k) => !ALLOWED.has(k))) return null;
  const r = raw as Partial<Record<(typeof INPUT_KEYS)[number], unknown>>;
  if (r.v !== 1 || r.type !== "br-input") return null;
  const num = (v: unknown, lo: number, hi: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
  if (!num(r.seq, 0, 2 ** 31) || !Number.isInteger(r.seq)) return null;
  if (!num(r.forward, -1, 1) || !num(r.strafe, -1, 1) || !num(r.yaw, -1e3, 1e3)) return null;
  for (const k of ["jump", "crouch", "sprint", "walk", "jumpOut", "deploy", "dive"] as const)
    if (r[k] !== undefined && typeof r[k] !== "boolean") return null;
  if (r.playbackMs !== undefined && !num(r.playbackMs, 0, 1000)) return null;
  return {
    seq: r.seq as number,
    forward: r.forward as number,
    strafe: r.strafe as number,
    yaw: r.yaw as number,
    jump: r.jump === true,
    crouch: r.crouch === true,
    sprint: r.sprint === true,
    walk: r.walk === true,
    jumpOut: r.jumpOut === true,
    deploy: r.deploy === true,
    dive: r.dive === true,
    ...(r.playbackMs !== undefined ? { playbackMs: r.playbackMs as number } : {}),
  };
}

/**
 * One 30 Hz step. `inputs` holds this tick's input for human seats (bots decide here). The plane
 * clock is the time since the plane phase began.
 */
export function stepBrMatch(
  state: BrMatchState,
  world: StaticWorld,
  meta: WorldMeta,
  inputs: ReadonlyMap<number, BrInput>,
  now: number,
  dtMs: number,
) {
  state.tick++;
  state.events = [];
  // Acknowledge humans' inputs in every phase (the client drops what the server has seen, so
  // nothing piles up during the countdown); they move nobody before the plane takes off.
  for (const [seat, input] of inputs) {
    const s = state.seats[seat];
    if (s && !s.bot) s.seq = input.seq;
  }
  const humans = state.seats.some((s) => !s.bot);
  if (state.phase === "waiting") {
    if (!humans) return;
    state.phase = "starting";
    state.phaseAt = now + BR_RULES.countdownMs;
    return;
  }
  if (state.phase === "starting") {
    if (now < state.phaseAt) return;
    state.phase = "plane";
    state.phaseAt = now;
  }
  const planeMs = now - state.phaseAt;
  const heightAt = (x: number, z: number) => world.hf.heightAt(x, z);
  for (const s of state.seats) {
    const human = s.bot ? undefined : inputs.get(s.seat);
    const input = s.bot
      ? dropBotInput(state.bots[s.seat]!, s.body, state.route, planeMs, heightAt)
      : (human ?? null);
    const change = stepDrop(world, meta, state.route, s.body, input, planeMs, dtMs);
    if (change) state.events.push({ seat: s.seat, phase: change });
  }
  // Everyone off the plane and down: the match is live (Phase 3 adds the zone from here).
  if (
    state.phase === "plane" &&
    planeMs > routeMs(state.route) &&
    state.seats.every((s) => s.body.phase === "ground" || s.body.phase === "swim")
  )
    state.phase = "active";
}

const PHASE_CODE: Record<DropPhase, number> = {
  plane: 0,
  freefall: 1,
  parachute: 2,
  swim: 3,
  ground: 4,
};

/**
 * Line-of-sight cache for interest management (PLAN §6.4): pairs between 300 m and 1 km are
 * re-checked at most every 100 ms against the terrain and buildings.
 */
export class BrSight {
  private cache = new Map<number, { at: number; visible: boolean }>();
  visible(world: StaticWorld, a: DropBody, b: DropBody, ia: number, ib: number, now: number) {
    const key = Math.min(ia, ib) * 1000 + Math.max(ia, ib);
    const hit = this.cache.get(key);
    if (hit && now - hit.at < BR_RULES.sightRecheckMs) return hit.visible;
    const eye = 1.6;
    const dx = b.x - a.x,
      dy = b.y + eye - (a.y + eye),
      dz = b.z - a.z;
    const dist = Math.hypot(dx, dy, dz);
    const ray = world.raycast(a.x, a.y + eye, a.z, dx, dy, dz, dist);
    const visible = !ray || ray.distance >= dist - 0.5;
    this.cache.set(key, { at: now, visible });
    return visible;
  }
  forget() {
    this.cache.clear();
  }
}

/**
 * The view one seat receives: its own full state and the other participants it may know about
 * (PLAN §6.4): everyone within 300 m; from 300 m to 1 km with a clear line of sight; everyone
 * in the plane or in the air (seen against the sky from anywhere). Hidden players never leave
 * the server. Compact rows: [seat, x, y, z, phase].
 */
export function brViewFor(
  state: BrMatchState,
  world: StaticWorld,
  sight: BrSight,
  seat: number,
  now: number,
) {
  const me = state.seats[seat]!;
  const rows: number[][] = [];
  for (const s of state.seats) {
    if (s.seat === seat) continue;
    const b = s.body;
    const d = Math.hypot(b.x - me.body.x, b.z - me.body.z);
    const airborne = b.phase === "plane" || b.phase === "freefall" || b.phase === "parachute";
    const send =
      airborne ||
      d <= BR_RULES.alwaysSendM ||
      (d <= BR_RULES.sightSendM && sight.visible(world, me.body, b, seat, s.seat, now));
    // In the plane only the plane matters: aboard players are not drawn individually.
    if (!send || b.phase === "plane") continue;
    rows.push([s.seat, +b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2), PHASE_CODE[b.phase]]);
  }
  return {
    v: 1,
    type: "br-snapshot",
    tick: state.tick,
    phase: state.phase,
    phaseAt: state.phaseAt,
    route: state.route,
    you: {
      seat,
      x: me.body.x,
      y: me.body.y,
      z: me.body.z,
      vy: me.body.velocityY,
      vx: me.body.vx,
      vz: me.body.vz,
      grounded: me.body.grounded,
      crouched: me.body.crouched,
      phase: me.body.phase,
      seq: me.seq,
    },
    aboard: state.seats.filter((s) => s.body.phase === "plane").length,
    players: rows,
    events: state.events.filter((e) => e.seat === seat || rows.some((r) => r[0] === e.seat)),
  };
}
