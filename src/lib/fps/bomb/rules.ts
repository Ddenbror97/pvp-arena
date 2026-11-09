import type { Input, Player } from "../protocol";

/**
 * Practice Bomb Defusal (5v5): best of 13, no economy, fixed team rifles (Police
 * M4A1-S, Terrorist AK-47 — combat.ts SIDE_RIFLE), optional free Police equipment during freeze.
 */
export const BOMB_RULES = {
  teamSize: 5,
  roundsPerHalf: 6,
  maxRounds: 13,
  /** First to seven, with sides switching after the first six completed rounds. */
  winRounds: 7,
  freezeMs: 15_000,
  roundMs: 115_000,
  bombMs: 40_000,
  defuseMs: 10_000,
  /** Defuse with a kit (free Police equipment during freeze time). */
  defuseKitMs: 5_000,
  /** Same as Counter-Strike's C4. */
  plantMs: 3_200,
  halftimeMs: 15_000,
  roundEndMs: 5_000,
  /** A Terrorist walking within this distance of a dropped bomb picks it up (metres). */
  pickupRadius: 1.0,
  /** Defuse reach from the planted bomb (metres, horizontal) and height tolerance. */
  defuseRadius: 1.6,
  /** Explosion: lethal inside `lethal`, linear falloff to zero at `radius` (metres), walls block. */
  explosion: { lethal: 8, radius: 22, damage: 500 },
  /** Damage a player must deal to a victim killed by someone else to earn an assist. */
  assistDamage: 40,
} as const;

export type Team = "police" | "terrorist";
/**
 * Groups are fixed for the whole match (they own the score); teams are the side a group plays.
 * Alpha starts as Police, Bravo as Terrorists; they swap at halftime.
 */
export type Group = "alpha" | "bravo";
/** Slots 0–4 are Alpha, 5–9 Bravo. */
export const SLOT_COUNT = BOMB_RULES.teamSize * 2;
export const groupOfSlot = (slot: number): Group =>
  slot < BOMB_RULES.teamSize ? "alpha" : "bravo";
export const teamOfGroup = (group: Group, half: 1 | 2): Team =>
  (group === "alpha") === (half === 1) ? "police" : "terrorist";

export type Bombsite = "A" | "B";
export type RoundEndReason = "elimination" | "bomb" | "defuse" | "time";

export interface BombPlayer extends Player {
  slot: number;
  group: Group;
  /** Display name (bots: "BOT <name>"). */
  name: string;
  bot: boolean;
  deaths: number;
  assists: number;
  /** Server-owned: this round's damage dealt to each victim slot (assists). */
  damageTo?: Record<number, number>;
  /** Dead this round (hp 0). Spectating is resolved by the room from teammates. */
  dead?: boolean;
  /** Police defuse kit (halves the defuse; selected during freeze time). */
  defuseKit?: boolean;
}

export type BombObjective =
  | { state: "carried"; carrier: number }
  | { state: "dropped"; x: number; y: number; z: number }
  | {
      state: "planting";
      carrier: number;
      site: Bombsite;
      startedAt: number;
    }
  | {
      state: "planted";
      x: number;
      y: number;
      z: number;
      site: Bombsite;
      plantedAt: number;
      explodesAt: number;
      /** Slot of the Police player currently defusing, when they started and how long it takes. */
      defuser?: number;
      defuseStartedAt?: number;
      defuseMs?: number;
    }
  | { state: "defused"; x: number; y: number; z: number; site: Bombsite }
  | { state: "exploded"; x: number; y: number; z: number; site: Bombsite };

export interface BombEvent {
  /** Room-assigned, increasing (clients present each event once). */
  id?: number;
  type: string;
  slot?: number;
  text: string;
  at?: number;
  victim?: number;
  zone?: string;
  damage?: number;
  headshot?: boolean;
  /** Shots fired with the AWP or the MP5 (the sound and tracer differ). */
  primary?: "awp" | "mp5";
  weapon?: "rifle" | "knife" | "sidearm";
  attack?: "slash" | "stab";
  /** Grenade events: the type, and the throw / detonation (see grenades/world.ts). */
  nade?: import("../grenades/rules").GrenadeType;
  projectile?: import("../grenades/world").Projectile;
  detonation?: import("../grenades/world").Detonation;
  point?: { x: number; y: number; z: number };
  direction?: { x: number; y: number; z: number };
  impact?: import("../collision").WorldHit;
  audio?: {
    kind: "shot" | "step" | "reload" | "bomb" | "knife";
    position?: { x: number; y: number; z: number };
    surface?: import("../footstep-surfaces").FootstepSurface;
    soft?: boolean;
    occluded?: boolean;
  };
}

export interface BombMatchState {
  v: 1;
  mode: "bomb";
  mapId: "sandgate";
  phase: "warmup" | "freeze" | "live" | "round-end" | "halftime" | "completed";
  phaseEndsAt: number;
  /** 1-based; rounds 1–6 are the first half. */
  round: number;
  half: 1 | 2;
  score: Record<Group, number>;
  /** First-half result, kept for the halftime and final scoreboards. */
  firstHalf?: Record<Group, number>;
  players: BombPlayer[];
  bomb: BombObjective;
  /** Round deadline while the bomb is not planted (the bomb clock takes over once planted). */
  roundEndsAt: number;
  lastRound?: { round: number; winner: Team; group: Group; reason: RoundEndReason };
  winner: Group | "draw" | null;
  tick: number;
  events: BombEvent[];
  /** Grenades in flight, smoke clouds and fires (public; see grenades/world.ts). */
  grenades?: import("../grenades/world").GrenadeWorld;
  server?: {
    lastStepAt: number;
    spreadSeed: number;
    rng: number;
    /** Fire exposure per slot. */
    burns?: Record<number, import("../grenades/world").Burn>;
  };
}

/** Wire input: the shared FPS input plus the use key (plant / defuse). */
export type BombInput = Input & { use?: boolean };

/** How long `player`'s defuse takes (ms): 5 s with a kit, 10 s without. */
export const defuseTime = (player: { defuseKit?: boolean } | undefined) =>
  player?.defuseKit ? BOMB_RULES.defuseKitMs : BOMB_RULES.defuseMs;
