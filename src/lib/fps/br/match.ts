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
import { fallDamage, holdAtLedge } from "./movement";
import { applyBrAct, layDown, type ActEvent, type BrAct } from "./actions";
import { dropFromZip, zipFree, zipLineAt } from "./zipline";
import { dropFromLadder, LADDER, ladderReachable, ropeRelease, startClimb } from "./ladders";
import { liftCall, lifts, startRide } from "./lifts";
import { panesOf, withPanes } from "./panes";
import {
  COMBAT,
  BrProjectiles,
  fire,
  knifeSwing,
  newHands,
  PoseHistory,
  startReload,
  updateHands,
  type Fighter,
  type ShotEvent,
} from "./combat";
import { GRENADES } from "../grenades/rules";
import { airdropContents, planAirdrops, type Airdrop } from "./airdrops";
import { botThink, newBotMind, type BotMind } from "./bots";
import {
  GAS_EXPOSURE,
  LEGACY_ZONE_PHASES,
  gasDps,
  outside,
  planZone,
  ZONE_PRESETS,
  zoneAt,
  zonePresetFor,
  type ZonePlan,
  type ZoneState,
} from "./zone";
import {
  crashDamage,
  exitSpot,
  seatOf,
  spec,
  stepVehicle,
  invalidateVehicleQueries,
  TYRES,
  tyreAt,
  VEHICLES,
  withVehicles,
  type Vehicle,
} from "./vehicles";
import {
  brHeDamage,
  brNadeAdvance,
  brNadeStart,
  brThrowStart,
  nadeSteps,
  type BrNadeSim,
} from "./grenades";
import {
  activeGun,
  capacity,
  countOf,
  dropAll,
  finishHeal,
  newLoadout,
  selectGun,
  tabletOf,
  takeStack,
} from "./inventory";
import { eyeHeight } from "../map";
import { KNIFE } from "../combat";
import { PERK_EFFECT, perkOn, type TabletState } from "./perks";
import type { Loose } from "./inventory";
import type { WorldItem } from "./loot";
import { LootSync, LootWorld, itemCode } from "./loot-world";
import type { StaticWorld } from "./static-world";
import { WORLD_ASSETS, type WorldMeta } from "./world";
import { INVENTORY, ITEMS, type ItemId, type WeaponDef } from "./items";
import { DOOR_REACH, doorsNear, doorsOf, hullOnDoor, initialDoors, withDoors } from "./doors";

/** Level 1–3 of a worn helmet, vest or backpack (0: none). */
const wornLevel = (id: ItemId | null | undefined) =>
  id ? Math.min(3, (ITEMS[id] as { level?: number }).level ?? 0) : 0;

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
  /**
   * Countdown once the first human is seated (owner, 2026-11-04: one minute). Humans who join
   * meanwhile take bot seats in the same match; bots fill every seat left at take-off.
   */
  countdownMs: 60_000,
  /**
   * Warm-up before take-off (owner, 2026-11-04): real players and this many bots on the airfield
   * runway with a rifle and endless ammunition; hits show, nobody is hurt; everyone is reset
   * and boards the plane at take-off.
   */
  warmupBots: 24,
  warmupCentre: [3152.5, 3940.7] as const,
  /** Along the runway (unit vector) and the spread along / across it (m). */
  warmupAxis: [0.9014, -0.4329] as const,
  warmupSpread: [220, 32] as const,
  /** Interest management (PLAN §6.4). */
  alwaysSendM: 300,
  sightSendM: 1000,
  sightRecheckMs: 100,
  /**
   * A pair in sight of each other is traced again only this often (performance audit
   * 2026-11-11). A clear ray runs its whole length, up to 1 km, so these are the dear ones, and
   * waiting costs nothing a player can see: someone who steps behind cover is sent a little
   * longer (they are drawn behind that cover anyway). A hidden pair keeps `sightRecheckMs`, so
   * nobody comes into view later than before.
   */
  sightHoldMs: 300,
} as const;

export type BrPhase = "waiting" | "starting" | "plane" | "active" | "ending" | "completed";
/**
 * Player rows in a view: [seat, x, y, z, phase code]; phase codes follow PHASE_CODES. Code 5 is
 * "eliminated" (rows test it first), so the zip-line is 6, a ladder 7 and a lift 8.
 */
export const PHASE_CODES: readonly DropPhase[] = [
  "plane",
  "freefall",
  "parachute",
  "swim",
  "ground",
  "ground",
  "zip",
  "ladder",
  "lift",
];

export type BrSeat = Fighter & {
  id: string;
  name: string;
  bot: boolean;
  /** Last applied input sequence (humans). */
  seq: number;
  /** When they last stepped off a ladder (server ms): E again only after a moment. */
  ladderOffAt?: number;
  /** Last look direction (others see where a player faces). */
  yaw: number;
  pitch: number;
  /** Finishing place (1 = winner), set when eliminated or when the match ends. */
  place?: number;
  /** Server time of elimination. */
  diedAt?: number;
  /** Whom an eliminated player watches (their eliminator, then whoever is left). */
  spectate?: number;
  /** The vehicle this player drives. */
  vehicle?: number;
  /** Time spent in the gas (ms, decays inside the circle): raises its damage (zone.ts). */
  gasMs?: number;
  /** When they last took damage, and last hurt someone (server ms): "in combat" for perks. */
  hurtAt?: number;
  dealtAt?: number;
  /** Sprinting on the last input (Silent Steps quiets a run, never a sprint). */
  sprinting?: boolean;
  /**
   * Last Stand (perks.ts): armed by an elimination (`armAt`), then a heal in pulses (`left`
   * health still to give, the next pulse at `nextAt`); `readyAt` is the cooldown's end.
   */
  stand?: { armAt?: number; readyAt: number; left?: number; nextAt?: number };
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
  /** Items on the island (rolled loot, drops, eliminated players' gear). */
  loot: LootWorld;
  history: PoseHistory;
  projectiles: BrProjectiles;
  /** Shots, hits, eliminations and action results this tick. */
  combat: Array<ShotEvent | ActEvent | NadeEvent>;
  /**
   * Footprints per seat for the Tracker perk, oldest first: x, y, z, yaw, server ms (five a
   * print). Seconds of history, not part of a checkpoint (a restarted room starts them over).
   */
  trails?: Map<number, number[]>;
  /** Grenades in flight or burning (the arenas' rules on the island, grenades.ts). */
  nades: BrNade[];
  nextNade: number;
  /** Seconds each seat has stood in flames (damage ramps up), and when last. */
  burning: Map<number, { since: number; last: number }>;
  /** The zone (circles and times from the seed) and when it started (the plane's take-off). */
  zone: ZonePlan;
  planeAt: number;
  /** The zone this tick (null before take-off). */
  zoneNow: ZoneState | null;
  minds: BotMind[];
  /** The warm-up runs (countdown before take-off); not checkpointed. */
  warmup?: { heightAt: (x: number, z: number) => number };
  /** The winner's seat once the match ends (−1: nobody survived). */
  winner: number;
  vehicles: Vehicle[];
  /** Supply drops (airdrops.ts), planned at take-off. */
  drops: Airdrop[];
  /** The island with this match's doors and vehicles (withDoors, withVehicles), made on first use. */
  solid: StaticWorld | null;
  /** Door states, 1 = open (doors.ts ids); made on first use from the seed. */
  doorOpen: Uint8Array | null;
  /** Door changes in order (id · 2 + open), so each connection is sent what it missed. */
  doorLog: number[];
  /** Panes broken this match (panes.ts: a byte per pane), and the order they broke in. */
  paneBroken: Uint8Array | null;
  paneLog: number[];
  /** From a checkpoint: the open door ids to apply on the first tick. */
  restoredDoors?: number[];
  /** When the last rider took the zip-line's handle (server ms): the next waits (zipFree). */
  zipLastAt?: number;
  /** The same for the other lines (ZIPLINES, by id; the first line keeps zipLastAt). */
  zipLinesAt?: Record<number, number>;
};
export type BrNade = {
  id: number;
  seat: number;
  type: "he" | "smoke" | "fire";
  sim: BrNadeSim;
  /** Server time it left the hand. */
  at: number;
  /** Smoke cloud / flames: where and until when (after the pop). */
  area?: { x: number; y: number; z: number; until: number };
  done?: boolean;
};
export type NadeEvent =
  | {
      type: "nade";
      id: number;
      seat: number;
      nade: "he" | "smoke" | "fire";
      o: [number, number, number];
      v: [number, number, number];
      at: number;
    }
  | { type: "boom"; id: number; x: number; y: number; z: number }
  | {
      type: "area";
      id: number;
      nade: "smoke" | "fire";
      x: number;
      y: number;
      z: number;
      until: number;
    }
  | {
      type: "hurt";
      seat: number;
      victim: number;
      damage: number;
      cause: "he" | "fire" | "vehicle" | "fall";
    };

export type BrInput = DropInput & {
  seq: number;
  /** The playback delay the client drew the others with (lag.ts), bounded by the room. */
  playbackMs?: number;
  /**
   * The whole lag-compensation rewind, set by the room from its own measurements when it
   * takes the input off its queue. Not an input key: validateBrInput rejects a client's.
   */
  rewindMs?: number;
  /** Look pitch (radians, up positive) for shots. */
  pitch?: number;
  fire?: boolean;
  /** Aim down sights / scope (right mouse). */
  aim?: boolean;
  reload?: boolean;
  /**
   * Weapon slot to switch to: 0 / 1 the main guns (keys 1 / 2), 3 the pistol (key 3), 2 the
   * Karambit (key 4; the wire value predates the pistol slot).
   */
  slot?: 0 | 1 | 2 | 3;
};

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
  loot: readonly WorldItem[] = [],
  options: {
    zoneTimeScale?: number;
    vehicles?: Vehicle[];
    /** Open ground (not inside a building), for placing the last circles (zone.ts). */
    open?: (x: number, z: number) => boolean;
  } = {},
): BrMatchState {
  // The zone's preset follows the seat count, fixed for the whole match (zone.ts).
  const zone = planZone(meta, seed, heightAt, {
    timeScale: options.zoneTimeScale ?? 1,
    phases: ZONE_PRESETS[zonePresetFor(BR_RULES.seats)],
    open: options.open,
  });
  // The plane flies over the first circle (players and bots can drop where the match is).
  const first = zone.circles[1]!;
  const route = planeRoute(seed, [first.x, first.z]);
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
      yaw: 0,
      pitch: 0,
      kit: newLoadout(),
      hands: newHands(),
      dead: false,
      kills: 0,
      kitVersion: 0,
      damage: 0,
    })),
    bots: planDropBots(
      meta,
      route,
      seed,
      BR_RULES.seats,
      heightAt,
      first,
      loot.filter((i) => ITEMS[i.item].category === "weapon"),
    ),
    events: [],
    loot: new LootWorld(loot),
    history: new PoseHistory(),
    projectiles: new BrProjectiles(),
    combat: [],
    nades: [],
    nextNade: 0,
    burning: new Map(),
    zone,
    planeAt: 0,
    zoneNow: null,
    minds: Array.from({ length: BR_RULES.seats }, (_, seat) => newBotMind(seat, seed)),
    winner: -1,
    vehicles: options.vehicles ?? [],
    drops: [],
    solid: null,
    doorOpen: null,
    doorLog: [],
    paneBroken: null,
    paneLog: [],
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
  if (state.warmup) toWarmup(state, state.seats[seat]!, state.warmup);
  return seat;
}

// ------------------------------------------------------------------ warm-up (before take-off)

const NO_LOOT = new LootWorld([]);

/** A warm-up spot on the runway for a seat (deterministic, spread along and across it). */
function warmupSpot(seat: number, seed: number, heightAt: (x: number, z: number) => number) {
  const r = (n: number) => {
    const x = Math.sin((seat + 1) * 12.9898 + (seed % 1000) * 78.233 + n * 37.719) * 43758.5453;
    return x - Math.floor(x);
  };
  const [cx, cz] = BR_RULES.warmupCentre;
  const [ax, az] = BR_RULES.warmupAxis;
  const along = (r(1) - 0.5) * 2 * BR_RULES.warmupSpread[0],
    across = (r(2) - 0.5) * 2 * BR_RULES.warmupSpread[1];
  const x = cx + ax * along - az * across,
    z = cz + az * along + ax * across;
  return { x, y: heightAt(x, z) + 0.05, z, yaw: r(3) * Math.PI * 2 };
}

/** On the warm-up ground with a rifle (AK or M4) and plenty of rounds. */
function toWarmup(
  state: BrMatchState,
  s: BrSeat,
  warm: { heightAt: (x: number, z: number) => number },
) {
  const at = warmupSpot(s.seat, state.seed, warm.heightAt);
  s.body = { ...newDropBody(), x: at.x, y: at.y, z: at.z, phase: "ground", grounded: true };
  s.yaw = at.yaw;
  s.kit = newLoadout();
  s.kit.guns[0] = { item: s.seat % 2 ? "m4" : "ak47", mag: 30, optic: null, muzzle: null };
  s.kit.active = 0;
  s.kit.bag.push({ item: "ammo-rifle", qty: 240 });
  s.hands = newHands();
  s.dead = false;
  s.kitVersion++;
}

/** The countdown starts: the warm-up opens with the humans and some bots. */
function startWarmup(state: BrMatchState, heightAt: (x: number, z: number) => number) {
  state.warmup = { heightAt };
  let bots = 0;
  for (const s of state.seats)
    if (!s.bot || (bots < BR_RULES.warmupBots && ++bots)) toWarmup(state, s, state.warmup);
}

/**
 * One warm-up step: movement, aiming and firing as in the match (hits and markers show), but
 * nobody loses health or dies, rounds never run out, and nothing is picked up or entered.
 */
/** In the warm-up a bot fires only this long after a human shot it. */
const WARMUP_ANSWER_MS = 3000;

function stepWarmup(
  state: BrMatchState,
  world: StaticWorld,
  meta: WorldMeta,
  inputs: ReadonlyMap<number, BrInput>,
  now: number,
  dtMs: number,
) {
  const [cx, cz] = BR_RULES.warmupCentre;
  const area = { now: { x: cx, z: cz, r: 260 }, next: { x: cx, z: cz, r: 200 } };
  const used = new Map<number, BrInput | undefined>();
  // A quiet warm-up (owner, 2026-11-05: "the bots use the AK too much"): bots see only human
  // players (to each other they are not there, so no bot-vs-bot firefights) and fire only to
  // answer a human who shot them in the last WARMUP_ANSWER_MS.
  const humansOnly = state.seats.map((o) => (o.bot ? { ...o, dead: true } : o));
  for (const s of state.seats) {
    if (s.body.phase !== "ground" && s.body.phase !== "swim") continue;
    let input = s.bot ? undefined : inputs.get(s.seat);
    if (s.bot) {
      const mind = state.minds[s.seat]!;
      const think = botThink(mind, s, humansOnly, NO_LOOT, world, area, false, now);
      const by = mind.hurtBy >= 0 ? state.seats[mind.hurtBy] : undefined;
      const answering = !!by && !by.bot && now - mind.hurtAt < WARMUP_ANSWER_MS;
      // Bots move plainly (movement.ts `plain`: no corner assist; nobody predicts them).
      input = { seq: 0, ...think.input, plain: true, ...(answering ? {} : { fire: false }) };
    }
    if (input) {
      s.yaw = input.yaw;
      s.pitch = input.pitch ?? 0;
    }
    stepDrop(world, meta, state.route, s.body, input ?? null, 0, dtMs);
    used.set(s.seat, input);
  }
  // Nobody can be hurt: health stays far above any hit during the shots, then back to full.
  state.history.record(now, state.seats);
  for (const seat of used.keys()) state.seats[seat]!.kit.hp = 1e6;
  for (const [seat, input] of used) stepHands(state, world, state.seats[seat]!, input, [], now);
  state.combat.push(...state.projectiles.advance(state.seats, world, state.history, now, () => {}));
  for (const seat of used.keys()) {
    const s = state.seats[seat]!;
    s.kit.hp = INVENTORY.maxHealth;
    const ammo = s.kit.bag.find((b) => b.item === "ammo-rifle");
    if (ammo && ammo.qty < 120) {
      ammo.qty = 240;
      s.kitVersion++;
    }
  }
  state.combat = state.combat.filter((e) => e.type !== "elim");
  senseBots(state, now);
}

/** Take-off: everyone back to an empty loadout and a seat on the plane. */
function endWarmup(state: BrMatchState) {
  state.projectiles.clear();
  state.history.clear();
  delete state.warmup;
  for (const s of state.seats) {
    Object.assign(s, {
      body: newDropBody(),
      kit: newLoadout(),
      hands: newHands(),
      dead: false,
      kills: 0,
      damage: 0,
      pitch: 0,
    });
    s.kitVersion++;
    state.minds[s.seat] = newBotMind(s.seat, state.seed);
  }
  state.nades = [];
  state.burning.clear();
}

/** A human who left: back to a bot (its body, phase and position stay as they are). */
export function releaseSeat(state: BrMatchState, seat: number) {
  const s = state.seats[seat];
  if (!s || s.bot) return;
  leaveVehicle(state, s, null);
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
  "canopyYaw",
  "playbackMs",
  "pitch",
  "fire",
  "aim",
  "reload",
  "slot",
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
  for (const k of [
    "jump",
    "crouch",
    "sprint",
    "walk",
    "jumpOut",
    "deploy",
    "dive",
    "fire",
    "aim",
    "reload",
  ] as const)
    if (r[k] !== undefined && typeof r[k] !== "boolean") return null;
  if (r.playbackMs !== undefined && !num(r.playbackMs, 0, 1000)) return null;
  if (r.pitch !== undefined && !num(r.pitch, -1.6, 1.6)) return null;
  if (r.canopyYaw !== undefined && !num(r.canopyYaw, -Math.PI, Math.PI)) return null;
  if (r.slot !== undefined && r.slot !== 0 && r.slot !== 1 && r.slot !== 2 && r.slot !== 3)
    return null;
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
    ...(r.canopyYaw !== undefined ? { canopyYaw: r.canopyYaw as number } : {}),
    ...(r.playbackMs !== undefined ? { playbackMs: r.playbackMs as number } : {}),
    pitch: (r.pitch as number | undefined) ?? 0,
    fire: r.fire === true,
    aim: r.aim === true,
    reload: r.reload === true,
    ...(r.slot !== undefined ? { slot: r.slot as 0 | 1 | 2 | 3 } : {}),
  };
}

/**
 * What bots notice this tick (bots.ts): who hurt them (shots and grenades), and gunfire within
 * earshot (a silenced shot carries less than half as far), as a player would.
 */
function senseBots(state: BrMatchState, now: number) {
  for (const e of state.combat) {
    if (e.type === "hit" || e.type === "hurt") {
      const v = state.seats[e.victim];
      if (v?.bot && !v.dead && e.seat !== e.victim) {
        const m = state.minds[e.victim]!;
        m.hurtBy = e.seat;
        m.hurtAt = now;
      }
    } else if (e.type === "shot") {
      const reach = e.hearM * (e.silenced ? 0.4 : 1);
      for (const s of state.seats) {
        if (!s.bot || s.dead || s.seat === e.seat || s.body.phase === "plane") continue;
        if (Math.hypot(s.body.x - e.origin[0], s.body.z - e.origin[2]) > reach) continue;
        const m = state.minds[s.seat]!;
        m.heardX = e.origin[0];
        m.heardZ = e.origin[2];
        m.heardAt = now;
      }
    }
  }
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
  acts: ReadonlyMap<number, readonly BrAct[]> = new Map(),
) {
  state.tick++;
  state.events = [];
  state.combat = [];
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
    startWarmup(state, (x, z) => world.hf.heightAt(x, z));
    return;
  }
  if (state.phase === "starting") {
    if (now < state.phaseAt) {
      if (state.warmup) stepWarmup(state, world, meta, inputs, now, dtMs);
      return;
    }
    endWarmup(state);
    state.phase = "plane";
    state.phaseAt = now;
    state.planeAt = now;
    state.drops = planAirdrops(state.zone, world, meta, state.seed, now);
  }
  if (state.phase === "completed") {
    state.projectiles.clear();
    return;
  }
  const island = world;
  const doors = doorsOf(island);
  if (doors && !state.doorOpen) {
    state.doorOpen = initialDoors(state.seed, doors.doors.length);
    if (state.restoredDoors) {
      state.doorOpen.fill(0);
      for (const id of state.restoredDoors) if (id < state.doorOpen.length) state.doorOpen[id] = 1;
      delete state.restoredDoors;
    }
  }
  const panes = panesOf(island);
  if (panes && !state.paneBroken) state.paneBroken = new Uint8Array(panes.panes.length);
  const glazed =
    panes && state.paneBroken
      ? withPanes(island, panes, state.paneBroken, (id) => state.paneLog.push(id))
      : island;
  world = state.solid ??= withVehicles(
    doors && state.doorOpen ? withDoors(glazed, doors, state.doorOpen) : glazed,
    () => state.vehicles,
    () => state.tick,
  );
  const planeMs = now - state.planeAt;
  // The zone runs from the take-off (RESEARCH.md: PUBG's first circle 120 s after the start).
  const zone = (state.zoneNow = zoneAt(state.zone, now - state.planeAt));
  const botActs = new Map<number, BrAct[]>();
  const botInputs = new Map<number, BrInput>();
  const alive = state.seats.reduce((n, s) => n + (s.dead ? 0 : 1), 0);
  const heightAt = (x: number, z: number) => world.hf.heightAt(x, z);
  for (const s of state.seats) {
    if (s.dead) continue;
    if (s.vehicle !== undefined) {
      if (s.bot) leaveVehicle(state, s, world);
      continue; // driven below
    }
    let human = s.bot ? undefined : inputs.get(s.seat);
    // Landed bots play like everyone else (bots.ts): the same input and actions.
    if (
      s.bot &&
      (s.body.phase === "ground" || s.body.phase === "swim") &&
      state.bots[s.seat]!.landed
    ) {
      const think = botThink(
        state.minds[s.seat]!,
        s,
        state.seats,
        state.loot,
        world,
        zone,
        !!s.hands.heal,
        now,
        alive,
      );
      human = { seq: 0, ...think.input };
      botInputs.set(s.seat, human);
      if (think.acts.length) botActs.set(s.seat, think.acts);
    }
    let input: DropInput | null =
      s.bot && !human
        ? dropBotInput(state.bots[s.seat]!, s.body, state.route, planeMs, heightAt)
        : (human ?? null);
    if (human) {
      s.yaw = human.yaw;
      s.pitch = human.pitch ?? 0;
    }
    // Healing: walk only (LOOT-SPEC §10: the player keeps moving, slowly).
    if (input && s.hands.heal) input = { ...input, sprint: false, walk: true };
    // Lightweight and Quick Vault: the scales come from the carried tablet here, never from
    // the wire (parseInput builds its own object), so a client cannot grant itself either.
    if (input && !s.bot) input = perkInput(input, tabletOf(s.kit));
    s.sprinting = !!input?.sprint;
    // Bots on foot (just landed or playing) stop at ledges a fall would hurt from.
    if (s.bot && input && s.body.phase === "ground")
      input = { ...holdAtLedge(world, s.body, input), plain: true };
    const climbing = s.body.phase === "ladder";
    const change = stepDrop(world, meta, state.route, s.body, input, planeMs, dtMs);
    if (change) state.events.push({ seat: s.seat, phase: change });
    if (climbing && change) s.ladderOffAt = now;
    // A hard landing on foot (movement.ts FALL_DAMAGE): the player's own, armour aside.
    if (s.body.phase === "ground" && s.body.impact) {
      const damage = fallDamage(s.body.impact);
      if (damage > 0) nadeDamage(state, world, s, s, damage, "fall");
    }
  }
  stepVehicles(state, island, world, meta, inputs, now, dtMs);
  botDoors(state, world);
  state.history.record(now, state.seats);
  for (const s of state.seats) {
    if (s.dead) continue;
    if (s.bot && !botInputs.has(s.seat)) continue;
    stepHands(
      state,
      world,
      s,
      s.bot ? botInputs.get(s.seat) : inputs.get(s.seat),
      (s.bot ? botActs.get(s.seat) : acts.get(s.seat)) ?? [],
      now,
    );
  }
  if (state.phase === "active" || state.phase === "plane") {
    const impacts = state.projectiles.advance(
      state.seats,
      world,
      state.history,
      now,
      (victim) => dropGear(state, world, victim as BrSeat),
      (id, damage, at) => hurtVehicle(state, world, id, damage, at),
    );
    for (const e of impacts)
      if (e.type === "elim") {
        e.name = state.seats[e.seat]!.name;
        e.byName = state.seats[e.by]!.name;
      }
    state.combat.push(...impacts);
  } else state.projectiles.clear();
  stepNades(state, world, now);
  senseBots(state, now);
  // Supply drops: when a crate lands, its loot is laid out around it (nothing to open).
  for (const d of state.drops)
    if (!d.landed && now >= d.landAt) {
      d.landed = true;
      const items = airdropContents(state.seed, d.id);
      items.forEach((it, i) => {
        const a = (i / items.length) * Math.PI * 2;
        const x = d.x + Math.cos(a) * 1.6,
          z = d.z + Math.sin(a) * 1.6;
        state.loot.add(it, x, world.supportAt(x, z, 0.15, d.ground + 0.6), z);
      });
    }
  // Gas: outside the circle, the phase's damage per second (armour does not stop it), raised by
  // the time already spent in it (capped, zone.ts); inside, that exposure decays. Server time
  // only (dtMs is the fixed tick), so frame rate and latency never change the damage.
  for (const s of state.seats) {
    if (s.dead || s.body.phase === "plane") continue;
    const out = outside(zone.now, s.body.x, s.body.z);
    if (!out || zone.dps <= 0) {
      if (s.gasMs) s.gasMs = Math.max(0, s.gasMs - dtMs * GAS_EXPOSURE.decay);
      continue;
    }
    s.gasMs = Math.min(GAS_EXPOSURE.rampMs, (s.gasMs ?? 0) + dtMs);
    s.hurtAt = now;
    s.kit.hp = Math.max(0, s.kit.hp - (gasDps(zone.dps, s.gasMs) * dtMs) / 1000);
    s.kitVersion++;
    if (s.kit.hp <= 0) {
      s.dead = true;
      state.combat.push({
        type: "elim",
        seat: s.seat,
        by: s.seat,
        gun: "gas",
        name: s.name,
        byName: "the gas",
      });
      dropGear(state, world, s);
    }
  }
  perkEvents(state, now);
  settle(state, now);
  if ((state.phase as BrPhase) === "ending" || (state.phase as BrPhase) === "completed")
    state.projectiles.clear();
  // Everyone off the plane and down: the match is live.
  if (
    state.phase === "plane" &&
    planeMs > routeMs(state.route) &&
    state.seats.every(
      (s) =>
        s.dead ||
        s.body.phase === "ground" ||
        s.body.phase === "swim" ||
        s.body.phase === "zip" ||
        s.body.phase === "ladder" ||
        s.body.phase === "lift",
    )
  )
    state.phase = "active";
}

/** The movement scales a carried tablet gives (the server's step and the owner's prediction). */
export function perkInput<T extends DropInput>(
  input: T,
  tablet: TabletState | null | undefined,
): T {
  const sprint = perkOn(tablet, "lightweight"),
    climb = perkOn(tablet, "quick-vault");
  if (!sprint && !climb) return input;
  return {
    ...input,
    ...(sprint ? { sprintScale: PERK_EFFECT.sprint } : {}),
    ...(climb ? { climbScale: PERK_EFFECT.climb } : {}),
  };
}

/**
 * Perk bookkeeping each tick: who is in combat, Last Stand's heal and everyone's footprints
 * (for the Tracker perk).
 */
function perkEvents(state: BrMatchState, now: number) {
  const L = PERK_EFFECT.lastStand,
    T = PERK_EFFECT.tracker;
  for (const e of state.combat) {
    if (e.type === "hit" || e.type === "hurt") {
      const v = state.seats[e.victim],
        by = state.seats[e.seat];
      if (v) v.hurtAt = now;
      if (by && e.seat !== e.victim) by.dealtAt = now;
    }
    if (e.type === "elim" && e.by !== e.seat) {
      const by = state.seats[e.by]!;
      // Last Stand: armed by the elimination, at most once a cooldown.
      if (perkOn(tabletOf(by.kit), "last-stand") && !by.dead && now >= (by.stand?.readyAt ?? 0))
        by.stand = { armAt: now, readyAt: now + L.cooldownMs };
    }
  }
  for (const s of state.seats) {
    const st = s.stand;
    if (st && (st.armAt !== undefined || st.left !== undefined)) {
      const fought = Math.max(s.hurtAt ?? -1e9, s.dealtAt ?? -1e9);
      if (s.dead || !perkOn(tabletOf(s.kit), "last-stand")) {
        // Eliminated, or the tablet dropped or the perk taken out: nothing pending survives.
        delete st.armAt;
        delete st.left;
      } else if (st.left !== undefined) {
        // Healing: damage ends it; otherwise a pulse every half second, never over the maximum.
        if ((s.hurtAt ?? -1e9) >= (st.nextAt ?? 0) - L.pulseMs) delete st.left;
        else if (now >= (st.nextAt ?? 0)) {
          const give = Math.min(st.left, L.heal / (L.overMs / L.pulseMs));
          const hp = Math.min(INVENTORY.maxHealth, s.kit.hp + give);
          if (hp > s.kit.hp) {
            s.kit.hp = hp;
            s.kitVersion++;
          }
          st.left -= give;
          st.nextAt = now + L.pulseMs;
          if (st.left <= 1e-6 || s.kit.hp >= INVENTORY.maxHealth) delete st.left;
        }
      } else if (now - st.armAt! > L.expireMs) delete st.armAt;
      else if (now - Math.max(st.armAt!, fought) >= L.delayMs) {
        // Out of combat long enough: the heal starts (nothing at once).
        delete st.armAt;
        if (s.kit.hp < INVENTORY.maxHealth) {
          st.left = L.heal;
          st.nextAt = now + L.pulseMs;
        }
      }
    }
    // Footprints: a print each stride on foot, the last few kept, the old ones dropped.
    if (s.dead || s.body.phase !== "ground" || !s.body.grounded || s.vehicle !== undefined)
      continue;
    const trails = (state.trails ??= new Map<number, number[]>());
    let tr = trails.get(s.seat);
    if (!tr) trails.set(s.seat, (tr = []));
    const n = tr.length;
    if (n && (s.body.x - tr[n - 5]!) ** 2 + (s.body.z - tr[n - 3]!) ** 2 < T.strideM ** 2) continue;
    tr.push(cm(s.body.x), cm(s.body.y), cm(s.body.z), Math.round(s.yaw * 100) / 100, now);
    while (tr.length > T.keep * 5 || (tr.length && now - tr[4]! > T.lifeMs)) tr.splice(0, 5);
  }
}

/**
 * The footprints a Tracker sees: other players' prints within its radius, at least a second old
 * (never where someone stands now) and at most its lifetime (half of it for a Ghost Protocol
 * holder), the newest first, capped. Flat: x, y, z, yaw, age in tenths of a second.
 */
export function trackerPrints(state: BrMatchState, me: BrSeat, now: number): number[] {
  const T = PERK_EFFECT.tracker;
  const found: Array<[number, number, number, number, number]> = [];
  for (const s of state.seats) {
    const tr = state.trails?.get(s.seat);
    if (s === me || !tr?.length) continue;
    // (Nobody within reach of the trail's newest print: skip the seat.)
    const n = tr.length;
    if (Math.abs(tr[n - 5]! - me.body.x) > T.radiusM + T.keep * T.strideM * 2) continue;
    const life =
      T.lifeMs * (perkOn(tabletOf(s.kit), "ghost-protocol") ? PERK_EFFECT.ghostTrack : 1);
    for (let i = 0; i < n; i += 5) {
      const age = now - tr[i + 4]!;
      if (age < T.minAgeMs || age > life) continue;
      const dx = tr[i]! - me.body.x,
        dz = tr[i + 2]! - me.body.z;
      if (dx * dx + dz * dz > T.radiusM ** 2 || Math.abs(tr[i + 1]! - me.body.y) > 6) continue;
      found.push([tr[i]!, tr[i + 1]!, tr[i + 2]!, tr[i + 3]!, age]);
    }
  }
  found.sort((a, b) => a[4] - b[4]);
  const out: number[] = [];
  for (const [x, y, z, yaw, age] of found.slice(0, T.max))
    out.push(x, y, z, yaw, Math.round(age / 100));
  return out;
}

/** How long the result shows before the room closes the match. */
export const ENDING_MS = 15_000;

/**
 * Places for this tick's eliminations (those eliminated together share the place), whom they
 * watch, and the end: one player (or nobody) left → `ending`, then `completed`.
 */
function settle(state: BrMatchState, now: number) {
  const alive = state.seats.filter((s) => !s.dead);
  // Everyone eliminated this tick shares the places below those still in, ranked by kills,
  // then damage dealt, then seat (deterministic): two players killed by the same gas tick, or
  // by each other's last shots, never tie. If nobody is left, the best of them wins.
  const fallen = state.seats
    .filter((s) => s.dead && s.place === undefined)
    .sort((a, b) => b.kills - a.kills || b.damage - a.damage || a.seat - b.seat);
  fallen.forEach((s, i) => (s.place = alive.length + 1 + i));
  for (const s of fallen) {
    s.diedAt = now;
    // Watch the eliminator if still standing.
    const by = [...state.combat].reverse().find((e) => e.type === "elim" && e.seat === s.seat);
    const killer = by && by.type === "elim" ? state.seats[by.by] : undefined;
    if (killer && !killer.dead) s.spectate = killer.seat;
  }
  // Spectators of someone eliminated move on to whoever is still in.
  for (const s of state.seats)
    if (s.dead && (s.spectate === undefined || state.seats[s.spectate]!.dead)) {
      const next = alive.find((a) => !a.bot)?.seat ?? alive[0]?.seat;
      if (next !== undefined) s.spectate = next;
      else delete s.spectate;
    }
  if ((state.phase === "active" || state.phase === "plane") && alive.length <= 1 && state.planeAt) {
    state.phase = "ending";
    state.phaseAt = now;
    // The last one standing, or (everyone down at once) the best of the last to fall.
    const top = alive[0] ?? fallen[0];
    state.winner = top?.seat ?? -1;
    if (top) top.place = 1;
  } else if (state.phase === "ending" && now - state.phaseAt >= ENDING_MS)
    state.phase = "completed";
}

/** The match's result rows (written once by the room when it ends). */
export function brResult(state: BrMatchState) {
  return {
    winner: state.winner,
    players: state.seats.map((s) => ({
      seat: s.seat,
      id: s.id,
      name: s.name,
      bot: s.bot,
      place: s.place ?? 1,
      kills: s.kills,
      damage: Math.round(s.damage),
      survivedMs: Math.max(0, (s.diedAt ?? state.phaseAt) - state.planeAt),
    })),
  };
}

/** Actions, healing, weapon switch, aim, reload and fire for one human seat on foot. */
function stepHands(
  state: BrMatchState,
  world: StaticWorld,
  s: BrSeat,
  input: BrInput | undefined,
  acts: readonly BrAct[],
  now: number,
) {
  if (state.phase === "ending" || state.phase === "completed") return;
  // E on the climbing rope: step off at an end, let go anywhere else (ladders.ts ropeRelease).
  if (s.body.phase === "ladder" && acts.some((a) => a.act === "ladder"))
    state.combat.push(ropeLetGo(state, world, s, now));
  // On the zip-line both hands hold the handle, on a ladder the rungs; in a lift the doors are
  // shut: no actions until off.
  if (s.body.phase === "zip" || s.body.phase === "ladder" || s.body.phase === "lift") return;
  for (const a of acts.slice(0, 4))
    state.combat.push(
      a.act === "throw"
        ? throwNade(state, world, s, a, now)
        : a.act === "enter" || a.act === "exit"
          ? vehicleAct(state, world, s, a)
          : a.act === "door"
            ? doorAct(state, world, s, a)
            : a.act === "zip"
              ? zipAct(state, s, now)
              : a.act === "ladder"
                ? ladderAct(state, world, s, now)
                : a.act === "lift"
                  ? liftAct(state, world, s, a)
                  : applyBrAct(s, a, state.loot, world, now),
    );
  // Took the handle (or a ladder, a lift) this tick: nothing else (no shot or reload as it
  // starts).
  const took = s.body.phase as DropPhase;
  if (took === "zip" || took === "ladder" || took === "lift") return;
  if (s.vehicle !== undefined) return; // driving: no weapons until out
  const onFoot = s.body.phase === "ground" || s.body.phase === "swim";
  if (!onFoot) return;
  const h = s.hands;
  updateHands(s, now);
  if (h.heal && now >= h.heal.until) {
    finishHeal(s.kit, h.heal.item);
    h.heal = null;
    s.kitVersion++;
  }
  if (!input) return;
  // Switch: a main gun (0, 1), the pistol (3: guns[2]), or the Karambit (2), which is in the
  // hand whenever no gun is drawn.
  const switched =
    input.slot === 2
      ? s.kit.active !== -1 && ((s.kit.active = -1), true)
      : input.slot !== undefined && selectGun(s.kit, input.slot === 3 ? 2 : input.slot);
  if (switched) {
    h.recoilPitch = h.recoilYaw = h.sprayCount = 0;
    h.recoilUpdatedAt = now;
    h.drawUntil =
      now +
      (input.slot === 2 ? KNIFE.drawMs : COMBAT.drawMs) *
        (perkOn(tabletOf(s.kit), "combat-ready") ? PERK_EFFECT.switch : 1);
    h.reloadUntil = 0;
    h.aimSince = 0;
    h.heal = null;
    s.kitVersion++;
  }
  // The Karambit: left mouse slashes, right mouse stabs (held buttons repeat at its cooldown).
  if (s.kit.active === -1 && (input.fire || input.aim) && s.body.phase === "ground") {
    const events = knifeSwing(
      s,
      { ...input, pitch: input.pitch ?? 0 },
      state.seats,
      world,
      state.history,
      now,
      input.fire ? "slash" : "stab",
      (victim) => dropGear(state, world, victim as BrSeat),
    );
    for (const e of events)
      if (e.type === "elim") {
        e.name = state.seats[e.seat]!.name;
        e.byName = state.seats[e.by]!.name;
      }
    state.combat.push(...events);
    return;
  }
  const gun = activeGun(s.kit);
  // Aim down sights: on foot, gun up, not reloading or healing.
  const canAim = !!gun && input.aim && !h.reloadUntil && !h.heal && s.body.phase === "ground";
  if (!canAim) h.aimSince = 0;
  else if (!h.aimSince) h.aimSince = Math.max(now, h.drawUntil);
  if (input.reload && startReload(s, now)) s.kitVersion++;
  // Semi-automatic guns (the Deagle) fire once per trigger pull: a held button is one shot.
  const pull = !!input.fire && !h.triggerDown;
  h.triggerDown = !!input.fire;
  const semi = !!gun && (ITEMS[gun.item] as WeaponDef).semiAuto;
  if (input.fire && gun && s.body.phase === "ground" && (!semi || pull)) {
    if (h.heal) {
      h.heal = null; // firing interrupts healing (nothing is used up)
      s.kitVersion++;
    }
    const events = fire(
      s,
      { ...input, pitch: input.pitch ?? 0 },
      state.seats,
      world,
      state.history,
      now,
      state.tick,
      (victim) => dropGear(state, world, victim as BrSeat),
      (id, damage, at) => hurtVehicle(state, world, id, damage, at),
      state.projectiles,
    );
    for (const e of events)
      if (e.type === "elim") {
        e.name = state.seats[e.seat]!.name;
        e.byName = state.seats[e.by]!.name;
      }
    state.combat.push(...events);
  }
}

/** An eliminated player's gear falls where they stood (LOOT-SPEC §18). */
function dropGear(state: BrMatchState, world: StaticWorld, victim: BrSeat) {
  leaveVehicle(state, victim, null);
  // Eliminated on the zip-line: off the cable, down to the ground below (gear and body there).
  if (victim.body.phase === "zip") {
    dropFromZip(world, victim.body);
    victim.body.phase = "ground";
    victim.body.grounded = true;
  }
  // Eliminated in a lift: on the floor of the stop it was leaving or nearest below the cab.
  if (victim.body.phase === "lift") {
    const st = victim.body.lift;
    const l = st && lifts(world.hf)[st.id];
    if (l) {
      const below = l.stops.filter((y) => y <= victim.body.y + 0.01);
      victim.body.y = below.length ? below[below.length - 1]! : l.stops[0]!;
    }
    delete victim.body.lift;
    victim.body.phase = "ground";
    victim.body.grounded = true;
  }
  // Eliminated on a ladder: down to the foot of it (or the floor below).
  if (victim.body.phase === "ladder") {
    dropFromLadder(world, victim.body);
    victim.body.phase = "ground";
    victim.body.grounded = true;
  }
  layDown(state.loot, world, victim, dropAll(victim.kit));
  victim.hands = newHands();
  victim.kitVersion++;
}

// ------------------------------------------------------------------ vehicles (LOOT-SPEC §19–33)

/** Leave the driver's seat (on foot at a free spot; `world` null: where the vehicle is). */
function leaveVehicle(state: BrMatchState, s: BrSeat, world: StaticWorld | null) {
  if (s.vehicle === undefined) return true;
  const v = state.vehicles[s.vehicle];
  if (v) {
    const spot = world ? exitSpot(world, v) : { x: s.body.x, y: s.body.y, z: s.body.z };
    if (!spot) return false;
    Object.assign(s.body, {
      x: spot.x,
      y: spot.y,
      z: spot.z,
      velocityY: 0,
      vx: 0,
      vz: 0,
      grounded: true,
    });
    if (v.driver === s.seat) v.driver = -1;
  }
  s.body.crouched = false;
  delete s.vehicle;
  return true;
}

/** Set a door open or closed and log the change for the snapshots. */
function setDoor(state: BrMatchState, id: number, open: boolean) {
  if (!state.doorOpen || state.doorOpen[id] === (open ? 1 : 0)) return;
  state.doorOpen[id] = open ? 1 : 0;
  state.doorLog.push(id * 2 + (open ? 1 : 0));
}

/** E at a door: open or close it (validated: on foot, within reach, nobody in the doorway). */
function doorAct(
  state: BrMatchState,
  world: StaticWorld,
  s: BrSeat,
  a: Extract<BrAct, { act: "door" }>,
): ActEvent {
  const res = (ok: boolean, reason?: string): ActEvent => ({
    type: "act",
    seat: s.seat,
    act: "door",
    ok,
    ...(reason ? { reason } : {}),
  });
  const set = doorsOf(world);
  const d = set?.doors[a.id];
  if (!d || !state.doorOpen) return res(false, "Gone");
  if (s.vehicle !== undefined || s.body.phase !== "ground") return res(false, "Not here");
  const b = s.body;
  if (Math.hypot(d.x - b.x, d.z - b.z) > DOOR_REACH + 0.5 || b.y > d.y1 || b.y < d.y0 - 1.5)
    return res(false, "Too far");
  const open = state.doorOpen[a.id] === 1;
  if (open)
    for (const o of state.seats)
      if (!o.dead && hullOnDoor(d, o.body.x, o.body.y, o.body.z, eyeHeight(o.body) + 0.2, 0.35))
        return res(false, "Blocked");
  setDoor(state, a.id, !open);
  return res(true);
}

/** Bots open a closed door they walk into (they have no use key; never stuck at a door). */
const botDoorIds: number[] = [];
function botDoors(state: BrMatchState, world: StaticWorld) {
  const set = doorsOf(world);
  if (!set || !state.doorOpen) return;
  for (const s of state.seats) {
    if (!s.bot || s.dead || s.body.phase !== "ground" || s.vehicle !== undefined) continue;
    for (const id of doorsNear(set, s.body.x, s.body.z, 1.2, botDoorIds))
      if (!state.doorOpen[id] && Math.abs(set.doors[id]!.y0 - s.body.y) < 1.5)
        setDoor(state, id, true);
  }
}

/**
 * E at a zip-line's handle (the Iron Peaks watchtower's deck, the broadcast tower's platform):
 * validated here from the server's own
 * state (alive, on foot, not driving, at the stand, the line free), then the ride is the body's
 * (drop.ts phase "zip", zipline.ts). Healing, reloading and aiming stop; the gun stays as it is.
 */
function zipAct(state: BrMatchState, s: BrSeat, now: number): ActEvent {
  const res = (ok: boolean, reason?: string): ActEvent => ({
    type: "act",
    seat: s.seat,
    act: "zip",
    ok,
    ...(reason ? { reason } : {}),
  });
  if (s.dead || s.vehicle !== undefined || s.body.phase !== "ground") return res(false, "Not here");
  // Whichever line's stand they are at (each line keeps its own spacing between riders).
  const line = zipLineAt(s.body.x, s.body.y, s.body.z);
  if (!line) return res(false, "Too far");
  const last = line.id === 0 ? state.zipLastAt : state.zipLinesAt?.[line.id];
  if (!zipFree(now, last)) return res(false, "Busy");
  if (line.id === 0) state.zipLastAt = now;
  else (state.zipLinesAt ??= {})[line.id] = now;
  const b = s.body;
  b.phase = "zip";
  b.zip = line.id === 0 ? { ms: 0 } : { ms: 0, id: line.id };
  b.grounded = false;
  b.crouched = false;
  b.velocityY = b.vx = b.vz = 0;
  const h = s.hands;
  h.heal = null;
  h.reloadUntil = 0;
  h.aimSince = 0;
  h.triggerDown = false;
  s.kitVersion++;
  state.events.push({ seat: s.seat, phase: "zip" });
  return res(true);
}

/**
 * A floor button in a lift's cab (lifts.ts): validated from the server's own state (alive, on
 * foot, not driving, standing in a cab, a stop of that lift other than this one), then the ride
 * is the body's (drop.ts phase "lift"). Healing, reloading and aiming stop.
 */
function liftAct(
  state: BrMatchState,
  world: StaticWorld,
  s: BrSeat,
  a: Extract<BrAct, { act: "lift" }>,
): ActEvent {
  const res = (ok: boolean, reason?: string): ActEvent => ({
    type: "act",
    seat: s.seat,
    act: "lift",
    ok,
    ...(reason ? { reason } : {}),
  });
  if (s.dead || s.vehicle !== undefined || s.body.phase !== "ground") return res(false, "Not here");
  // In the cab, or at its door on the landing (the call: you step in as the doors close).
  const at = liftCall(lifts(world.hf), s.body.x, s.body.y, s.body.z);
  if (!at) return res(false, "Too far");
  if (a.floor < 0 || a.floor >= at.lift.stops.length || a.floor === at.stop)
    return res(false, "Not a floor");
  const b = s.body;
  startRide(b, at.lift, at.stop, a.floor);
  b.phase = "lift";
  b.crouched = false;
  const h = s.hands;
  h.heal = null;
  h.reloadUntil = 0;
  h.aimSince = 0;
  h.triggerDown = false;
  s.kitVersion++;
  state.events.push({ seat: s.seat, phase: "lift" });
  return res(true);
}

/**
 * E at a ladder (its foot on the ground, its exit at the top, or anywhere along a rope): validated from the server's own
 * state (alive, on foot, not driving, within reach), then the climb is the body's (drop.ts phase
 * "ladder", ladders.ts). Healing, reloading and aiming stop; the gun goes on the back.
 */
function ladderAct(state: BrMatchState, world: StaticWorld, s: BrSeat, now: number): ActEvent {
  const res = (ok: boolean, reason?: string): ActEvent => ({
    type: "act",
    seat: s.seat,
    act: "ladder",
    ok,
    ...(reason ? { reason } : {}),
  });
  if (s.dead || s.vehicle !== undefined || s.body.phase !== "ground") return res(false, "Not here");
  const at = ladderReachable(world.hf, s.body.x, s.body.y, s.body.z);
  if (!at) return res(false, "Too far");
  // Just off one: a held or repeated E does not put you straight back on.
  if (now - (s.ladderOffAt ?? -Infinity) < LADDER.againMs) return res(false, "Not yet");
  const b = s.body;
  startClimb(b, at.ladder, at.end, at.s);
  b.phase = "ladder";
  b.grounded = false;
  b.crouched = false;
  b.velocityY = b.vx = b.vz = 0;
  const h = s.hands;
  h.heal = null;
  h.reloadUntil = 0;
  h.aimSince = 0;
  h.triggerDown = false;
  s.kitVersion++;
  state.events.push({ seat: s.seat, phase: "ladder" });
  return res(true);
}

/**
 * E while on the climbing rope (owner's spec: "E while climbing: detach where safe"): within a
 * stride of an end the climber steps off there; anywhere else lets go and falls (fall damage as
 * any fall). A ladder's E is not a release (jump lets go of a ladder).
 */
function ropeLetGo(state: BrMatchState, world: StaticWorld, s: BrSeat, now: number): ActEvent {
  const res = (ok: boolean, reason?: string): ActEvent => ({
    type: "act",
    seat: s.seat,
    act: "ladder",
    ok,
    ...(reason ? { reason } : {}),
  });
  if (s.dead) return res(false, "Not here");
  const out = ropeRelease(world.hf, s.body);
  if (!out) return res(false, "Not here");
  if (out === "ground") {
    s.body.phase = "ground";
    s.body.airCrouchOffset = 0;
    s.ladderOffAt = now;
    state.events.push({ seat: s.seat, phase: "ground" });
  }
  return res(true);
}

/** E at a vehicle: in (validated: near, alive, free seat, not destroyed) or out (a free spot). */
function vehicleAct(
  state: BrMatchState,
  world: StaticWorld,
  s: BrSeat,
  a: Extract<BrAct, { act: "enter" } | { act: "exit" }>,
): ActEvent {
  const res = (ok: boolean, reason?: string): ActEvent => ({
    type: "act",
    seat: s.seat,
    act: a.act,
    ok,
    ...(reason ? { reason } : {}),
  });
  if (a.act === "exit") {
    if (s.vehicle === undefined) return res(false, "Not in a vehicle");
    return leaveVehicle(state, s, world) ? res(true) : res(false, "No room to get out");
  }
  if (s.vehicle !== undefined) return res(false, "Already driving");
  if (s.body.phase !== "ground") return res(false, "Land first");
  const v = state.vehicles[a.id];
  if (!v) return res(false, "Gone");
  if (v.destroyed) return res(false, "Destroyed");
  if (v.driver >= 0) return res(false, "Occupied");
  if (Math.hypot(v.x - s.body.x, v.z - s.body.z) > VEHICLES.enterReach + spec(v.kind).length / 2)
    return res(false, "Too far");
  if (Math.abs(v.y - s.body.y) > 2) return res(false, "Too far");
  v.driver = s.seat;
  s.vehicle = v.id;
  s.hands.heal = null;
  s.hands.reloadUntil = 0;
  s.hands.aimSince = 0;
  s.kitVersion++;
  placeDriver(s, v);
  return res(true);
}

function placeDriver(s: BrSeat, v: Vehicle) {
  const seat = seatOf(v);
  Object.assign(s.body, {
    x: seat.x,
    y: seat.y,
    z: seat.z,
    vx: 0,
    vz: 0,
    velocityY: 0,
    grounded: true,
    crouched: true, // seated: the lower hit volumes
    phase: "ground" as const,
  });
}

function hurtVehicle(
  state: BrMatchState,
  world: StaticWorld,
  id: number,
  damage: number,
  /** Where a shot hit it: on a wheel, the tyre bursts (and the body takes less). */
  at?: { x: number; y: number; z: number },
) {
  const v = state.vehicles[id];
  if (!v || v.destroyed || damage <= 0) return;
  const tyre = at ? tyreAt(v, at) : 0;
  if (tyre && !((v.flat ?? 0) & tyre)) {
    v.flat = (v.flat ?? 0) | tyre;
    damage *= TYRES.bodyShare;
  }
  v.health = Math.max(0, v.health - damage);
  if (v.health > 0) return;
  // Destroyed: it stops for good and the driver is put out beside it (no blast).
  v.destroyed = true;
  v.speed = 0;
  state.combat.push({ type: "boom", id: -1 - v.id, x: v.x, y: v.y + 0.8, z: v.z });
  const d = v.driver >= 0 ? state.seats[v.driver] : undefined;
  if (d && !leaveVehicle(state, d, world)) leaveVehicle(state, d, null);
}

const heldInputs = new Map<number, { input: BrInput; at: number }>();
/** Drive every vehicle one step; crashes cost health; running into players hurts them. */
function stepVehicles(
  state: BrMatchState,
  island: StaticWorld,
  world: StaticWorld,
  meta: WorldMeta,
  inputs: ReadonlyMap<number, BrInput>,
  now: number,
  dtMs: number,
) {
  for (const v of state.vehicles) {
    if (v.destroyed) continue;
    const driver = v.driver >= 0 ? state.seats[v.driver] : undefined;
    if (driver && (driver.dead || driver.vehicle !== v.id)) v.driver = -1;
    if (v.driver < 0 && v.speed === 0 && !v.slip) continue;
    // A tick without the driver's input (network jitter) keeps the last one for a moment,
    // as the client predicted, instead of braking.
    let input = driver && v.driver >= 0 ? (inputs.get(driver.seat) ?? null) : null;
    if (input) heldInputs.set(v.id, { input, at: now });
    else if (driver && v.driver >= 0) {
      const held = heldInputs.get(v.id);
      if (held && now - held.at <= 250) input = held.input;
      else input = { seq: 0, forward: 0, strafe: 0, yaw: driver.yaw };
    }
    const impact = stepVehicle(island, meta, v, input, dtMs, state.vehicles);
    invalidateVehicleQueries(world);
    if (impact) hurtVehicle(state, world, v.id, crashDamage(v.kind, impact));
    if (driver && driver.vehicle === v.id) {
      placeDriver(driver, v);
      if (input) {
        driver.yaw = input.yaw;
        driver.pitch = input.pitch ?? 0;
      }
    }
    // Running into someone on foot.
    const speed = Math.abs(v.speed);
    if (speed > VEHICLES.crash.playerThreshold) {
      const s = spec(v.kind);
      for (const p of state.seats) {
        if (p.dead || p.vehicle !== undefined || p.body.phase !== "ground") continue;
        const dx = p.body.x - v.x,
          dz = p.body.z - v.z;
        if (dx * dx + dz * dz > (s.length / 2 + 0.6) ** 2 || Math.abs(p.body.y - v.y) > 1.5)
          continue;
        // Inside the footprint (vehicle frame).
        const c = Math.cos(v.yaw),
          sn = Math.sin(v.yaw);
        const lx = dx * c - dz * sn,
          lz = dx * sn + dz * c;
        if (Math.abs(lx) > s.width / 2 + 0.35 || Math.abs(lz) > s.length / 2 + 0.35) continue;
        const by = driver ?? p;
        nadeDamage(
          state,
          world,
          p,
          by,
          (speed - VEHICLES.crash.playerThreshold) * VEHICLES.crash.playerPerMs,
          "vehicle",
        );
        // Knocked aside out of the vehicle's path.
        const push = Math.sign(lx || 1) * (s.width / 2 + 0.5);
        p.body.x = v.x + push * Math.cos(v.yaw);
        p.body.z = v.z - push * Math.sin(v.yaw);
        hurtVehicle(state, world, v.id, speed * 2);
      }
    }
  }
}

/**
 * Damage from a grenade (blast or flames), a vehicle or a fall: kevlar absorbs half of a blast
 * (arena rule).
 */
function nadeDamage(
  state: BrMatchState,
  world: StaticWorld,
  victim: BrSeat,
  by: BrSeat,
  raw: number,
  cause: "he" | "fire" | "vehicle" | "fall",
) {
  if (victim.dead || raw <= 0) return;
  let damage = raw;
  // Explosive Expert: less from your own grenades (blast and flames), never more to others.
  if (
    victim === by &&
    (cause === "he" || cause === "fire") &&
    perkOn(tabletOf(victim.kit), "explosive-expert")
  )
    damage *= PERK_EFFECT.selfBlast;
  const vest = victim.kit.armour.vest;
  if (cause === "he" && vest && vest.durability > 0) {
    const absorbed = Math.min(damage * GRENADES.he.vestAbsorb, vest.durability);
    vest.durability -= absorbed;
    if (vest.durability <= 1e-6) victim.kit.armour.vest = null;
    damage -= absorbed;
  }
  damage = Math.round(damage * 10) / 10;
  victim.kit.hp = Math.max(0, victim.kit.hp - damage);
  victim.kitVersion++;
  if (victim.hands.heal) victim.hands.heal = null;
  state.combat.push({ type: "hurt", seat: by.seat, victim: victim.seat, damage, cause });
  if (victim.kit.hp <= 0) {
    victim.dead = true;
    if (by !== victim) by.kills++;
    state.combat.push({
      type: "elim",
      seat: victim.seat,
      by: by.seat,
      gun: cause,
      name: victim.name,
      byName: by.name,
    });
    dropGear(state, world, victim);
  }
}

/** A throw (the 1v1/5v5 rules): one grenade from the bag, from the eye along the look. */
function throwNade(
  state: BrMatchState,
  world: StaticWorld,
  s: BrSeat,
  a: Extract<BrAct, { act: "throw" }>,
  now: number,
): ActEvent {
  const res = (ok: boolean, reason?: string): ActEvent => ({
    type: "act",
    seat: s.seat,
    act: "throw",
    ok,
    ...(reason ? { reason } : {}),
    item: `grenade-${a.nade}`,
  });
  if (s.body.phase !== "ground") return res(false, "Land first");
  if (s.hands.heal) return res(false, "Healing");
  if (
    s.hands.throwAt !== undefined &&
    now - s.hands.throwAt < GRENADES.recoverMs + GRENADES.equipMs
  )
    return res(false, "Not ready");
  const id = `grenade-${a.nade}` as const;
  if (countOf(s.kit, id) <= 0) return res(false, "No grenade");
  if (
    state.nades.filter((n) => n.seat === s.seat && !n.done).length >=
    GRENADES.maxProjectilesPerPlayer
  )
    return res(false, "Not ready");
  takeStack(s.kit, id, 1);
  s.kitVersion++;
  s.hands.throwAt = now;
  s.hands.reloadUntil = 0;
  const eye = { x: s.body.x, y: s.body.y + eyeHeight(s.body), z: s.body.z };
  const { origin, velocity } = brThrowStart(
    eye,
    s.yaw,
    s.pitch,
    a.kind,
    world,
    perkOn(tabletOf(s.kit), "explosive-expert") ? PERK_EFFECT.throwRange : 1,
  );
  const nade: BrNade = {
    id: state.nextNade++,
    seat: s.seat,
    type: a.nade,
    sim: brNadeStart(origin, velocity),
    at: now,
  };
  state.nades.push(nade);
  state.combat.push({
    type: "nade",
    id: nade.id,
    seat: s.seat,
    nade: a.nade,
    o: [origin.x, origin.y, origin.z],
    v: [velocity.x, velocity.y, velocity.z],
    at: now,
  });
  return res(true);
}

/** Fly every grenade to now; detonate, pop smoke, light and burn fires. */
function stepNades(state: BrMatchState, world: StaticWorld, now: number) {
  const F = GRENADES.fire,
    S = GRENADES.smoke;
  for (const n of state.nades) {
    if (n.done) continue;
    const by = state.seats[n.seat]!;
    if (!n.area) {
      let floorHit: { x: number; y: number; z: number } | null = null;
      brNadeAdvance(n.sim, world, nadeSteps((now - n.at) / 1000) - n.sim.n, (i) => {
        if (i.floor && !floorHit) floorHit = { x: i.x, y: i.y, z: i.z };
      });
      const age = now - n.at;
      if (n.type === "he" && age >= GRENADES.he.fuseMs) {
        n.done = true;
        const c = { x: n.sim.x, y: n.sim.y, z: n.sim.z };
        state.combat.push({ type: "boom", id: n.id, x: c.x, y: c.y, z: c.z });
        for (const v of state.seats)
          if (!v.dead && v.body.phase !== "plane")
            nadeDamage(state, world, v, by, brHeDamage(c, v.body, world), "he");
      } else if (n.type === "smoke" && ((n.sim.rest && age >= S.minMs) || age >= S.maxMs)) {
        n.area = { x: n.sim.x, y: n.sim.y, z: n.sim.z, until: now + S.durationMs };
      } else if (n.type === "fire") {
        const hit = floorHit as { x: number; y: number; z: number } | null;
        if (hit) n.area = { ...hit, until: now + F.durationMs };
        else if (age >= F.maxAirMs) {
          n.done = true; // burst in the air: no fire
          state.combat.push({ type: "boom", id: n.id, x: n.sim.x, y: n.sim.y, z: n.sim.z });
        }
      }
      if (n.area)
        state.combat.push({
          type: "area",
          id: n.id,
          nade: n.type as "smoke" | "fire",
          x: Math.round(n.area.x * 100) / 100,
          y: Math.round(n.area.y * 100) / 100,
          z: Math.round(n.area.z * 100) / 100,
          until: n.area.until,
        });
      continue;
    }
    if (now >= n.area.until) {
      n.done = true;
      continue;
    }
    if (n.type !== "fire") continue;
    // Flames: standing within the radius (on the same floor) burns, ramping up with time.
    for (const v of state.seats) {
      if (v.dead || v.body.phase !== "ground") continue;
      const d = Math.hypot(v.body.x - n.area.x, v.body.z - n.area.z);
      if (d > F.radius || Math.abs(v.body.y - n.area.y) > 1.2) continue;
      const b = state.burning.get(v.seat);
      const since = b && now - b.last <= F.resetMs ? b.since : now;
      state.burning.set(v.seat, { since, last: now });
      const dps = Math.min(F.maxDps, F.dps + (F.ramp * (now - since)) / 1000);
      nadeDamage(state, world, v, by, (dps * 1000) / 30 / 1000, "fire");
    }
  }
  if (state.nades.length > 64) state.nades = state.nades.filter((n) => !n.done);
}

const PHASE_CODE: Record<DropPhase, number> = {
  plane: 0,
  freefall: 1,
  parachute: 2,
  swim: 3,
  ground: 4,
  zip: 6,
  ladder: 7,
  lift: 8,
};

/**
 * Line-of-sight cache for interest management (PLAN §6.4): pairs between 300 m and 1 km are
 * re-checked at most every 100 ms against the terrain and buildings.
 */
/** A pair that has not moved this far (m, summed over the axes) keeps its sight answer… */
const SIGHT_STILL_M = 0.1;
/** …for this many recheck intervals (0.5 s), then it is traced again whatever happened. */
const SIGHT_STILL_CHECKS = 5;
/** Half the stretch traced first for a pair that was hidden (m, either side of the last stop). */
const SIGHT_PROBE_M = 15;
export class BrSight {
  private cache = new Map<
    number,
    {
      at: number;
      visible: boolean;
      ax: number;
      ay: number;
      az: number;
      bx: number;
      by: number;
      bz: number;
      /** Hidden pairs: where the ray was stopped (world). */
      hx: number;
      hy: number;
      hz: number;
    }
  >();
  visible(world: StaticWorld, a: DropBody, b: DropBody, ia: number, ib: number, now: number) {
    const key = Math.min(ia, ib) * 1000 + Math.max(ia, ib);
    const hit = this.cache.get(key);
    if (hit) {
      const age = now - hit.at;
      if (age < (hit.visible ? BR_RULES.sightHoldMs : BR_RULES.sightRecheckMs)) return hit.visible;
      // Two players who have both stayed where they were (camping, looting, a bot holding an
      // angle) give the same ray against the same world: the answer stands a while longer
      // (performance audit 2026-11-11; these rays were 28 % of a full room's CPU time).
      if (age < BR_RULES.sightRecheckMs * SIGHT_STILL_CHECKS) {
        // The pair is keyed without order: compare each end with the nearer stored end.
        const same = (p: DropBody, x: number, y: number, z: number) =>
          Math.abs(p.x - x) + Math.abs(p.y - y) + Math.abs(p.z - z) < SIGHT_STILL_M;
        if (
          (same(a, hit.ax, hit.ay, hit.az) && same(b, hit.bx, hit.by, hit.bz)) ||
          (same(a, hit.bx, hit.by, hit.bz) && same(b, hit.ax, hit.ay, hit.az))
        )
          return hit.visible;
      }
    }
    const eye = 1.6;
    const dx = b.x - a.x,
      dy = b.y + eye - (a.y + eye),
      dz = b.z - a.z;
    const dist = Math.hypot(dx, dy, dz);
    const ux = dx / dist,
      uy = dy / dist,
      uz = dz / dist;
    let stop = -1;
    // A pair that was hidden is usually still hidden by the same hill or building. The stretch
    // of the new ray beside where the last one stopped is traced first: a hit there is a hit on
    // the whole ray (the answer is exactly "hidden"), found in 30 m instead of up to 1 km. No
    // hit says nothing, and the whole ray is traced as before.
    if (hit && !hit.visible && dist > 0) {
      const t = (hit.hx - a.x) * ux + (hit.hy - (a.y + eye)) * uy + (hit.hz - a.z) * uz;
      const t0 = Math.max(0, t - SIGHT_PROBE_M),
        t1 = Math.min(dist - 0.5, t + SIGHT_PROBE_M);
      if (t1 > t0) {
        const probe = world.raycast(
          a.x + ux * t0,
          a.y + eye + uy * t0,
          a.z + uz * t0,
          ux,
          uy,
          uz,
          t1 - t0,
        );
        if (probe) stop = t0 + probe.distance;
      }
    }
    if (stop < 0) {
      const ray = world.raycast(a.x, a.y + eye, a.z, dx, dy, dz, dist);
      if (ray && ray.distance < dist - 0.5) stop = ray.distance;
    }
    const visible = stop < 0;
    const hx = a.x + ux * stop,
      hy = a.y + eye + uy * stop,
      hz = a.z + uz * stop;
    if (hit) {
      hit.at = now;
      hit.visible = visible;
      hit.hx = hx;
      hit.hy = hy;
      hit.hz = hz;
      hit.ax = a.x;
      hit.ay = a.y;
      hit.az = a.z;
      hit.bx = b.x;
      hit.by = b.y;
      hit.bz = b.z;
    } else
      this.cache.set(key, {
        at: now,
        visible,
        ax: a.x,
        ay: a.y,
        az: a.z,
        bx: b.x,
        by: b.y,
        bz: b.z,
        hx,
        hy,
        hz,
      });
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
/** The zone for the client: the circle now, the next one, and when this step ends (server ms). */
function zoneView(state: BrMatchState, z: ZoneState) {
  const r = (v: number) => Math.round(v * 10) / 10;
  return {
    phase: z.phase,
    shrinking: z.shrinking,
    x: r(z.now.x),
    z: r(z.now.z),
    r: r(z.now.r),
    nx: z.next.x,
    nz: z.next.z,
    nr: z.next.r,
    until: Number.isFinite(z.until) ? state.planeAt + z.until : null,
    dps: z.dps,
    /** Phases in the plan (the last one is the final circle). */
    of: z.phases,
  };
}
export type BrZoneView = ReturnType<typeof zoneView>;

/** What one connection has been sent: loot it knows and the loadout version it has. */
export class BrSeatSync {
  readonly loot = new LootSync();
  kitVersion = -1;
  routeSent = false;
  /** Vehicles: the row last sent per id (only changes are sent again). */
  readonly vehicles = new Map<number, string>();
  /** Doors: how much of the match's door log this connection has (−1: nothing yet). */
  doorsSent = -1;
  /** Panes: how much of the match's broken-pane log this connection has (−1: nothing yet). */
  panesSent = -1;
  /**
   * Half rate for far players (off unless the room turns it on): a player beyond the
   * always-send range goes out in every other view, the views in between name them in `held`
   * and the client carries them forward. A change of stance, weapon or state is never held.
   */
  farHalf = false;
  /** Views built for this connection (far players alternate on it, staggered by seat). */
  round = 0;
  /** The row last sent per far player. */
  readonly farSent = new Map<number, number[]>();
  /** Combat events this connection already has (sent at once, brFastEvents): not sent again. */
  readonly early = new WeakSet<object>();
  /** Tracker: the tick the footprints were last sent on, and whether any were. */
  tracksTick = -1e9;
  tracksShown = false;
}

/**
 * The combat events a player should not wait up to a snapshot interval (67 ms) for: their own
 * hits and the hits on them, and their own eliminations (netcode audit 2026-11-11). By seat;
 * the room sends each list at once and the next view leaves those events out (BrSeatSync.early).
 * Everything else, and everyone else's copy of these, goes out with the snapshot as before.
 */
export function brFastEvents(events: readonly BrMatchState["combat"][number][]) {
  const bySeat = new Map<number, BrMatchState["combat"][number][]>();
  const add = (seat: number, e: BrMatchState["combat"][number]) => {
    const list = bySeat.get(seat);
    if (list) list.push(e);
    else bySeat.set(seat, [e]);
  };
  for (const e of events) {
    if (e.type === "hit" || e.type === "hurt") {
      add(e.seat, e);
      if (e.victim !== e.seat) add(e.victim, e);
    } else if (e.type === "elim" && e.by !== e.seat) add(e.by, e);
  }
  return bySeat;
}

/** The parts of a player row that are not position or facing: a change is sent at once. */
const ROW_STATE = [4, 6, 7, 8, 9, 10, 11] as const;

const VEHICLE_KINDS = ["sedan", "suv", "pickup", "bike"] as const;
/**
 * Vehicle rows: [id, kind (0 sedan, 1 suv, 2 pickup, 3 bike), x, y, z, yaw, pitch, roll,
 * speed, health, max health, driver seat or −1, destroyed 0/1, condition (0 good, 1 used, 2 damaged),
 * steering wheel (−1…1), sideways slide (m/s), flat tyres (bits, vehicles.ts TYRES)]: the
 * wheel and slide let the driver's prediction resume a slide exactly where the server has it.
 */
function vehicleRow(v: Vehicle) {
  const r = (n: number, k = 100) => Math.round(n * k) / k;
  return [
    v.id,
    VEHICLE_KINDS.indexOf(v.kind),
    r(v.x),
    r(v.y),
    r(v.z),
    r(v.yaw, 1000),
    r(v.pitch, 1000),
    r(v.roll, 1000),
    r(v.speed),
    Math.round(v.health),
    v.maxHealth,
    v.driver,
    v.destroyed ? 1 : 0,
    ["good", "used", "damaged"].indexOf(v.condition),
    r(v.steer ?? 0, 1000),
    r(v.slip ?? 0, 1000),
    v.flat ?? 0,
  ];
}

/** The loadout as the owner sees it (inventory screen, HUD, hotbar). */
export function kitView(s: BrSeat) {
  const k = s.kit,
    h = s.hands;
  const worn = (w: { item: string; durability: number } | null) =>
    w && { item: w.item, durability: Math.round(w.durability * 10) / 10 };
  return {
    hp: Math.round(k.hp * 10) / 10,
    active: k.active,
    guns: k.guns.map((g) => g && { ...g }),
    helmet: worn(k.armour.helmet),
    vest: worn(k.armour.vest),
    plates: k.armour.plates.map(worn),
    backpack: k.backpack,
    capacity: capacity(k),
    bag: k.bag.map((b) => ({ ...b })),
    heal: h.heal && { ...h.heal },
    reloadUntil: h.reloadUntil,
    drawUntil: h.drawUntil,
    kills: s.kills,
    dead: s.dead,
    tablet: tabletOf(k),
  };
}
export type BrKitView = ReturnType<typeof kitView>;

/**
 * What every view built at one moment shares (performance audit 2026-11-11): a player's row,
 * a vehicle's row and the head counts are the same for all hundred recipients, and building
 * them per recipient was a third of a full room's snapshot time. The room makes one frame per
 * publication and passes it to each brViewFor; nothing may step the match in between. Without
 * a frame every view builds its own (the same values).
 */
export type BrViewFrame = {
  rows: Array<number[] | undefined>;
  vehicles: Map<number, { row: number[]; key: string }>;
  aboard: number;
  alive: number;
  humans: number;
};
export function brViewFrame(state: BrMatchState): BrViewFrame {
  let aboard = 0,
    alive = 0,
    humans = 0;
  for (const s of state.seats) {
    if (s.body.phase === "plane") aboard++;
    if (!s.dead) alive++;
    if (!s.bot) humans++;
  }
  return { rows: [], vehicles: new Map(), aboard, alive, humans };
}
const cm = (v: number) => Math.round(v * 100) / 100;
/** One player as others see them (see the row layout at ROW_STATE and the client's reader). */
function playerRow(s: BrSeat) {
  const b = s.body;
  const gun = activeGun(s.kit);
  return [
    s.seat,
    cm(b.x),
    cm(b.y),
    cm(b.z),
    s.dead ? 5 : PHASE_CODE[b.phase],
    Math.round(s.yaw * 1000) / 1000,
    gun ? itemCode(gun.item) : -1,
    // Bit 1: crouched. Bit 2: Silent Steps on a run (the client hears it less far).
    (b.crouched ? 1 : 0) + (!s.sprinting && perkOn(tabletOf(s.kit), "silent-steps") ? 2 : 0),
    s.vehicle ?? -1,
    // Attachments are visible on other players' guns (a scope or a silencer is information
    // everyone gets the same way).
    gun?.optic ? itemCode(gun.optic) : -1,
    gun?.muzzle ? itemCode(gun.muzzle) : -1,
    // Worn gear shown on the character: helmet + 4 × vest + 16 × backpack level (0 = none).
    wornLevel(s.kit.armour.helmet?.item) +
      4 * wornLevel(s.kit.armour.vest?.item) +
      16 * wornLevel(s.kit.backpack),
  ];
}

export function brViewFor(
  state: BrMatchState,
  world: StaticWorld,
  sight: BrSight,
  seat: number,
  now: number,
  sync?: BrSeatSync,
  frame: BrViewFrame = brViewFrame(state),
) {
  const me = state.seats[seat]!;
  // An eliminated player sees what the player they watch sees (spectating).
  const watched = me.dead && me.spectate !== undefined ? state.seats[me.spectate]! : me;
  const eye = watched.body;
  const rows: number[][] = [];
  /** Far players this view (half rate on), and those of them left out of it. */
  const far = new Set<number>(),
    held: number[] = [];
  for (const s of state.seats) {
    if (s.seat === seat) continue;
    const b = s.body;
    // (Math.sqrt, not Math.hypot: this runs seats × recipients a snapshot, and hypot is slow.)
    const d = Math.sqrt((b.x - eye.x) ** 2 + (b.z - eye.z) ** 2);
    // Riders on the zip-line hang high over the valley, seen against the sky like fliers.
    const airborne =
      b.phase === "plane" || b.phase === "freefall" || b.phase === "parachute" || b.phase === "zip";
    const send =
      s === watched ||
      airborne ||
      d <= BR_RULES.alwaysSendM ||
      (d <= BR_RULES.sightSendM && sight.visible(world, eye, b, watched.seat, s.seat, now));
    // In the plane only the plane matters: aboard players are not drawn individually.
    if (!send || b.phase === "plane") continue;
    const row = (frame.rows[s.seat] ??= playerRow(s));
    if (sync?.farHalf && s !== watched && !airborne && d > BR_RULES.alwaysSendM) {
      far.add(s.seat);
      const last = sync.farSent.get(s.seat);
      if (last && (sync.round + s.seat) % 2 !== 0 && ROW_STATE.every((i) => last[i] === row[i])) {
        held.push(s.seat);
        continue;
      }
      sync.farSent.set(s.seat, row);
    }
    rows.push(row);
  }
  if (sync) {
    sync.round++;
    // A player who left the far range (or sight) starts over: their next far row is sent.
    for (const known of sync.farSent.keys()) if (!far.has(known)) sync.farSent.delete(known);
  }
  const seen = new Set([...rows.map((r) => r[0]), ...held]);
  const combat = state.combat.filter((e) => {
    if (sync?.early.has(e)) return false;
    if (e.type === "act") return e.seat === seat;
    if (e.type === "elim") return true;
    if (e.type === "hit") return e.seat === seat || e.victim === seat || seen.has(e.victim);
    if (e.type === "hurt") return e.seat === seat || e.victim === seat;
    // Grenades: their flight and effects are public within the interest range.
    if (e.type === "nade") return Math.hypot(e.o[0] - eye.x, e.o[2] - eye.z) <= BR_RULES.sightSendM;
    if (e.type === "boom" || e.type === "area")
      return Math.hypot(e.x - eye.x, e.z - eye.z) <= BR_RULES.sightSendM;
    return (
      e.seat === seat ||
      Math.hypot(e.origin[0] - eye.x, e.origin[2] - eye.z) <= e.hearM ||
      seen.has(e.seat)
    );
  });
  const areas = state.nades
    .filter(
      (n) =>
        n.area && !n.done && Math.hypot(n.area.x - eye.x, n.area.z - eye.z) <= BR_RULES.sightSendM,
    )
    .map((n) => [n.id, n.type === "smoke" ? 0 : 1, n.area!.x, n.area!.y, n.area!.z, n.area!.until]);
  const withRoute = !sync?.routeSent;
  if (sync) sync.routeSent = true;
  let loot: { add: unknown[]; del: number[] } | undefined;
  let vehicles: { rows: number[][]; gone: number[] } | undefined;
  let doors: { open?: number[]; changes?: number[] } | undefined;
  let panes: { broken: number[]; fresh?: boolean } | undefined;
  let kit: BrKitView | undefined;
  let tracks: number[] | undefined;
  if (sync) {
    loot = sync.loot.diff(state.loot, eye.x, eye.z);
    const rows: number[][] = [],
      gone: number[] = [];
    const reach2 = (BR_RULES.sightSendM + 100) ** 2;
    for (const v of state.vehicles) {
      if ((v.x - eye.x) ** 2 + (v.z - eye.z) ** 2 > reach2) {
        if (sync.vehicles.size && sync.vehicles.delete(v.id)) gone.push(v.id);
        continue;
      }
      const known = sync.vehicles.get(v.id);
      let shared = frame.vehicles.get(v.id);
      if (!shared) {
        const row = vehicleRow(v);
        frame.vehicles.set(v.id, (shared = { row, key: row.join(",") }));
      }
      const { row, key } = shared;
      if (key !== known) {
        sync.vehicles.set(v.id, key);
        rows.push(row);
      }
    }
    if (rows.length || gone.length) vehicles = { rows, gone };
    // Doors: every open door on the first view, then only the changes (id · 2 + open).
    if (state.doorOpen) {
      if (sync.doorsSent < 0) {
        const open: number[] = [];
        state.doorOpen.forEach((o, id) => o && open.push(id));
        doors = { open };
      } else if (state.doorLog.length > sync.doorsSent)
        doors = { changes: state.doorLog.slice(sync.doorsSent) };
      sync.doorsSent = state.doorLog.length;
    }
    // Panes: every broken one on the first view (if any), then the newly broken.
    if (state.paneBroken) {
      if (sync.panesSent < 0) {
        if (state.paneLog.length) panes = { broken: [...state.paneLog] };
      } else if (state.paneLog.length > sync.panesSent)
        panes = { broken: state.paneLog.slice(sync.panesSent), fresh: true };
      sync.panesSent = state.paneLog.length;
    }
    if (sync.kitVersion !== me.kitVersion) {
      sync.kitVersion = me.kitVersion;
      kit = kitView(me);
    }
    // Tracker: the footprints near the carrier, a few times a second (never every tick); one
    // empty list when the perk stops or nothing is left, so the client clears its marks.
    if (state.tick - sync.tracksTick >= PERK_EFFECT.tracker.everyTicks) {
      sync.tracksTick = state.tick;
      const on = !me.dead && me.body.phase === "ground" && perkOn(tabletOf(me.kit), "tracker");
      const prints = on ? trackerPrints(state, me, now) : [];
      if (prints.length || sync.tracksShown) tracks = prints;
      sync.tracksShown = prints.length > 0;
    }
  }
  return {
    v: 1,
    type: "br-snapshot",
    tick: state.tick,
    phase: state.phase,
    phaseAt: state.phaseAt,
    // The route never changes: sent once per connection.
    ...(withRoute ? { route: state.route } : {}),
    you: {
      seat,
      // Your own body exactly as the room keeps it (owner, 2026-11-12: "stairs in tight spaces
      // feel laggy"): the client replays its unacknowledged inputs from this state, and from
      // millimetres the replay drifted from the room's wherever the feet stood exactly on a
      // tread or the hull touched a wall (the rounded copy half a millimetre inside it, unstuck
      // a quarter metre sideways, corrected back every snapshot). Other players' rows stay mm.
      x: me.body.x,
      y: me.body.y,
      z: me.body.z,
      vy: me.body.velocityY,
      vx: me.body.vx,
      vz: me.body.vz,
      grounded: me.body.grounded,
      airCrouchOffset: me.body.airCrouchOffset ?? 0,
      crouched: me.body.crouched,
      phase: me.body.phase,
      ...(me.body.zip ? { zip: me.body.zip.ms } : {}),
      ...(me.body.zip?.id ? { zipLine: me.body.zip.id } : {}),
      ...(me.body.ladder ? { ladder: { ...me.body.ladder } } : {}),
      ...(me.body.lift ? { lift: { ...me.body.lift } } : {}),
      seq: me.seq,
      recoil: {
        pitch: me.hands.recoilPitch,
        yaw: me.hands.recoilYaw,
        spray: me.hands.sprayCount,
        shotAt: me.hands.lastShotAt,
        updatedAt: me.hands.recoilUpdatedAt ?? now,
        shots: me.hands.shotsFired ?? 0,
      },
    },
    aboard: frame.aboard,
    // Before take-off: real players seated (the rest of the 100 are bots).
    ...(state.phase === "waiting" || state.phase === "starting" ? { humans: frame.humans } : {}),
    players: rows,
    ...(held.length ? { held } : {}),
    events: state.events.filter((e) => e.seat === seat || seen.has(e.seat)),
    now,
    combat,
    ...(loot && (loot.add.length || loot.del.length) ? { loot } : {}),
    alive: frame.alive,
    // Announced supply drops (everyone sees them on the map): [id, x, z, ground, at, landAt].
    ...(state.drops.some((d) => now >= d.at)
      ? {
          drops: state.drops
            .filter((d) => now >= d.at)
            .map((d) => [d.id, d.x, d.z, d.ground, d.at, d.landAt]),
        }
      : {}),
    ...(vehicles ? { vehicles } : {}),
    ...(doors ? { doors } : {}),
    ...(panes ? { panes } : {}),
    ...(me.vehicle !== undefined ? { driving: me.vehicle } : {}),
    ...(state.zoneNow && now - state.planeAt >= routeMs(state.route)
      ? {
          zone: {
            ...zoneView(state, state.zoneNow),
            // This player's gas damage per second now (the exposure bonus included).
            hurt: Math.round(gasDps(state.zoneNow.dps, me.gasMs ?? 0) * 10) / 10,
          },
        }
      : {}),
    ...(me.dead && me.spectate !== undefined
      ? { watch: { seat: watched.seat, name: watched.name, kills: watched.kills } }
      : {}),
    ...(state.phase === "ending" || state.phase === "completed"
      ? {
          result: {
            winner: state.winner,
            winnerName: state.winner >= 0 ? state.seats[state.winner]!.name : null,
            place: me.place ?? 1,
            kills: me.kills,
            damage: Math.round(me.damage),
          },
        }
      : {}),
    // Smoke and flames burning now (so a reconnecting player sees them too).
    ...(areas.length ? { areas } : {}),
    ...(kit ? { kit } : {}),
    ...(tracks ? { tracks } : {}),
  };
}

// ------------------------------------------------------------------ checkpoints (PLAN §11.2)

/**
 * A checkpoint of a running match for Durable Object storage, so a restarted room resumes the
 * same match (positions, health, loadouts, loot on the ground, vehicles, zone, drops). The
 * route and zone plan are stored so pacing changes cannot retime running matches; bot landing targets are
 * retained because regenerating them from the remaining loot can redirect swimmers after a restart. Short-lived
 * state (grenades/projectiles in flight, lag-compensation history, bot decisions) starts fresh.
 */
export function checkpointBrMatch(state: BrMatchState, includeLoot = true) {
  return {
    v: 1 as const,
    worldRevision: WORLD_ASSETS.revision,
    seed: state.seed,
    phase: state.phase,
    phaseAt: state.phaseAt,
    planeAt: state.planeAt,
    route: { ...state.route, durationMs: routeMs(state.route) },
    zone: state.zone,
    tick: state.tick,
    winner: state.winner,
    seats: state.seats,
    landed: state.bots.map((b) => b.landed),
    bots: state.bots,
    /**
     * Ground loot as rows [id, x, y, z, rest] (2026-11-08: ~15k items; the per-item key names
     * alone took ~0.3 MB of the 2 MB Durable Object value).
     */
    // The room stores loot in separate chunks. When those chunks are unchanged,
    // avoid copying the whole island merely to discard it in splitCheckpoint.
    lootRows: (includeLoot ? [...state.loot.items.values()] : []).map(
      ({ id, x, y, z, ...rest }) =>
        [id, x, Math.round(y * 1000) / 1000, z, rest] as [number, number, number, number, Loose],
    ),
    vehicles: state.vehicles,
    drops: state.drops,
    minds: state.minds,
    /** Open door ids (null before the first tick made the door states). */
    doors: state.doorOpen ? [...state.doorOpen.keys()].filter((i) => state.doorOpen![i]) : null,
  };
}
export type BrCheckpoint = Omit<
  ReturnType<typeof checkpointBrMatch>,
  "route" | "zone" | "lootRows"
> & {
  route?: Route;
  zone?: ZonePlan;
  lootRows?: Array<[number, number, number, number, Loose]>;
  /** Checkpoints before 2026-11-08 kept whole item objects. */
  loot?: WorldItem[];
};

/** The checkpoint's ground loot, from either format. */
function checkpointLoot(c: BrCheckpoint): WorldItem[] {
  if (c.lootRows) return c.lootRows.map(([id, x, y, z, rest]) => ({ ...rest, id, x, y, z }));
  return c.loot ?? [];
}

export function restoreBrMatch(
  meta: WorldMeta,
  heightAt: (x: number, z: number) => number,
  c: BrCheckpoint,
  options: { zoneTimeScale?: number; open?: (x: number, z: number) => boolean } = {},
): BrMatchState {
  const loot = checkpointLoot(c);
  const state = createBrMatch(meta, c.seed, heightAt, loot, {
    ...options,
    vehicles: c.vehicles,
  });
  // Checkpoints predating saved plans used a 30 s flight and the 1,330 s full schedule.
  state.zone =
    c.zone ??
    planZone(meta, c.seed, heightAt, {
      timeScale: options.zoneTimeScale ?? 1,
      phases: LEGACY_ZONE_PHASES,
      open: options.open,
    });
  const first = state.zone.circles[1]!;
  state.route = c.route
    ? { ...c.route, durationMs: c.route.durationMs ?? 30_000 }
    : { ...planeRoute(c.seed, [first.x, first.z]), durationMs: 30_000 };
  if (!c.bots)
    state.bots = planDropBots(
      meta,
      state.route,
      c.seed,
      BR_RULES.seats,
      heightAt,
      first,
      loot.filter((i) => ITEMS[i.item].category === "weapon"),
    );
  Object.assign(state, {
    phase: c.phase,
    phaseAt: c.phaseAt,
    planeAt: c.planeAt,
    tick: c.tick,
    winner: c.winner,
    drops: c.drops,
    minds: c.minds,
  });
  c.seats.forEach((s, i) => Object.assign(state.seats[i]!, s));
  c.landed.forEach((l, i) => {
    if (state.bots[i]) state.bots[i]!.landed = l;
  });
  // Older checkpoints have only `landed`; new ones retain the original target even if a
  // weapon used to select it has since been picked up. Swimmers still steer toward it.
  if (c.bots)
    c.bots.forEach((bot, i) => {
      if (state.bots[i]) Object.assign(state.bots[i]!, bot);
    });
  // Doors: the open set is applied when the first tick knows how many doors there are.
  if (c.worldRevision === WORLD_ASSETS.revision && c.doors) state.restoredDoors = c.doors;
  return state;
}
