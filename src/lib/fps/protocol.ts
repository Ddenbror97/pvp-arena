import { MIN_PLAYBACK_MS, REMOTE_DELAY_MS } from "./network";
export type Seat = "A" | "B";
export type Weapon = "rifle" | "pistol";
export type RoundStats = {
  shots: number;
  hits: number;
  headHits: number;
  damage: number;
  health: number;
};
export type RoundRecap = { round: number; winner: Seat | null; players: Record<Seat, RoundStats> };

export interface Input {
  /** Combat input semantics, negotiated independently of the wire envelope. */
  combatVersion?: 2;
  v: 1;
  type: "input";
  seq: number;
  /** Respawn epoch: late packets from the previous round cannot affect the new one. */
  round?: number;
  forward: number;
  strafe: number;
  yaw: number;
  pitch: number;
  fire: boolean;
  reload: boolean;
  weapon: Weapon;
  jump: boolean;
  sprint: boolean;
  /** Slow movement with server-suppressed footsteps; optional for cached clients. */
  walk?: boolean;
  /** Actual drawn opponent delay; server bounds this independently of RTT. */
  playbackMs?: number;
  /** A trigger edge carries no movement time. */
  combatOnly?: true;
  crouch?: boolean;
}

export interface Player {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  hp: number;
  /** Server-owned vest durability. Head and legs are unprotected. */
  armor?: number;
  ammo: number;
  reserve: number;
  weapon: Weapon;
  reloadUntil: number;
  lastShotAt: number;
  lastSeq: number;
  kills: number;
  headshots: number;
  /** Server-owned burst length; cosmetic snapshots must never supply this in input. */
  sprayCount?: number;
  recoilPitch?: number;
  recoilYaw?: number;
  recoilUpdatedAt?: number;
  stepDistance?: number;
  triggerHeld?: boolean;
  /** Last authoritative movement intent, used by zero-time combat inputs. */
  moving?: boolean;
  sprinting?: boolean;
  crouched?: boolean;
  /** Server-owned jump velocity, included in snapshots for prediction. y is feet height. */
  velocityY?: number;
}

export interface MatchState {
  /**
   * Registry map id (maps/registry.ts), fixed when the match is created and carried to every
   * client in snapshots. Absent means Dustfront (all matches created before the registry).
   */
  mapId?: string;
  /** Missing on legacy checkpoints, which retain their original spawn rules. */
  sideVersion?: 1;
  lastRound?: RoundRecap;
  /** Missing in pre-upgrade checkpoints: retain their original combat rules. */
  combatVersion?: 1 | 2;
  /** Absent in older checkpoints; their damage rules remain unchanged. */
  armorVersion?: 1;
  v: 1;
  phase: "waiting" | "countdown" | "live" | "round-end" | "completed" | "cancelled";
  players: Record<Seat, Player>;
  score: Record<Seat, number>;
  bestOf: 5 | 9 | 13;
  round: number;
  phaseEndsAt: number;
  winner: Seat | null;
  tick: number;
  events: Array<{
    type: string;
    seat?: Seat;
    text: string;
    id?: number;
    /** Server simulation time, used to align footsteps with opponent playback. */
    at?: number;
    impact?: import("./collision").WorldHit;
    weapon?: Weapon;
    shotSeq?: number;
    hit?: {
      victim: Seat;
      zone: import("./combat").HitZone;
      damage: number;
      point: import("./collision").Vector;
      direction: import("./collision").Vector;
      splatter?: import("./collision").WorldHit;
    };
    audio?: {
      kind: "shot" | "step" | "reload";
      surface?: import("./map").Surface;
      position?: import("./collision").Vector;
      gain?: number;
      pan?: number;
      /** Coarse audible direction only; never an opponent world position. */
      bearing?: number;
      occluded?: boolean;
      soft?: boolean;
    };
  }>;
  /** Persist with snapshots on the server; never accept this from a client. */
  server?: {
    lastStepAt: number;
    draws: number;
    spreadSeed?: number;
    roundStats?: Record<Seat, RoundStats>;
  };
}

const KEYS = [
  "v",
  "type",
  "seq",
  "forward",
  "strafe",
  "yaw",
  "pitch",
  "fire",
  "reload",
  "weapon",
  "jump",
  "sprint",
] as const;
const finiteBounded = (x: unknown, limit: number): x is number =>
  typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= limit;

/** Exact shape also bounds message size: no strings, arrays or arbitrary nested data. */
export function validateInput(raw: unknown): Input | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  const expected =
    KEYS.length +
    (Object.hasOwn(data, "crouch") ? 1 : 0) +
    (Object.hasOwn(data, "walk") ? 1 : 0) +
    (Object.hasOwn(data, "playbackMs") ? 1 : 0) +
    (Object.hasOwn(data, "combatOnly") ? 1 : 0) +
    (Object.hasOwn(data, "round") ? 1 : 0) +
    (Object.hasOwn(data, "combatVersion") ? 1 : 0);
  if (
    Object.keys(data).length !== expected ||
    !KEYS.every((key) => Object.hasOwn(data, key)) ||
    (Object.hasOwn(data, "combatVersion") && data["combatVersion"] !== 2) ||
    (Object.hasOwn(data, "crouch") && typeof data["crouch"] !== "boolean") ||
    (Object.hasOwn(data, "walk") && typeof data["walk"] !== "boolean") ||
    (Object.hasOwn(data, "combatOnly") && data["combatOnly"] !== true) ||
    (Object.hasOwn(data, "round") &&
      (typeof data["round"] !== "number" ||
        !Number.isSafeInteger(data["round"]) ||
        data["round"] < 1)) ||
    (Object.hasOwn(data, "playbackMs") &&
      (typeof data["playbackMs"] !== "number" ||
        !Number.isFinite(data["playbackMs"]) ||
        data["playbackMs"] < MIN_PLAYBACK_MS ||
        data["playbackMs"] > REMOTE_DELAY_MS))
  )
    return null;
  if (
    data["v"] !== 1 ||
    data["type"] !== "input" ||
    !Number.isSafeInteger(data["seq"]) ||
    typeof data["seq"] !== "number" ||
    data["seq"] < 0 ||
    !finiteBounded(data["forward"], 1) ||
    !finiteBounded(data["strafe"], 1) ||
    !finiteBounded(data["yaw"], Math.PI * 2) ||
    !finiteBounded(data["pitch"], Math.PI / 2) ||
    (data["weapon"] !== "rifle" && data["weapon"] !== "pistol") ||
    !["fire", "reload", "jump", "sprint"].every((key) => typeof data[key] === "boolean")
  )
    return null;
  // Copy whitelisted primitives; retain no reference to an untrusted payload.
  if (
    data["combatOnly"] &&
    (data["fire"] !== true ||
      data["forward"] !== 0 ||
      data["strafe"] !== 0 ||
      data["jump"] ||
      data["reload"] ||
      data["sprint"] ||
      data["walk"])
  )
    return null;
  return {
    v: 1,
    type: "input",
    seq: data["seq"],
    ...(typeof data["round"] === "number" ? { round: data["round"] } : {}),
    ...(data["combatOnly"] === true ? { combatOnly: true as const } : {}),
    ...(data["combatVersion"] === 2 ? { combatVersion: 2 as const } : {}),
    forward: data["forward"],
    strafe: data["strafe"],
    yaw: data["yaw"],
    pitch: data["pitch"],
    weapon: data["weapon"],
    fire: data["fire"] as boolean,
    reload: data["reload"] as boolean,
    jump: data["jump"] as boolean,
    sprint: data["sprint"] as boolean,
    ...(typeof data["walk"] === "boolean" ? { walk: data["walk"] } : {}),
    ...(typeof data["playbackMs"] === "number" ? { playbackMs: data["playbackMs"] } : {}),
    ...(typeof data["crouch"] === "boolean" ? { crouch: data["crouch"] } : {}),
  };
}
