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
  forward: number;
  strafe: number;
  yaw: number;
  pitch: number;
  fire: boolean;
  reload: boolean;
  weapon: Weapon;
  jump: boolean;
  sprint: boolean;
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
  crouched?: boolean;
  /** Server-owned jump velocity, included in snapshots for prediction. y is feet height. */
  velocityY?: number;
}

export interface MatchState {
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
    (Object.hasOwn(data, "combatVersion") ? 1 : 0);
  if (
    Object.keys(data).length !== expected ||
    !KEYS.every((key) => Object.hasOwn(data, key)) ||
    (Object.hasOwn(data, "combatVersion") && data["combatVersion"] !== 2) ||
    (Object.hasOwn(data, "crouch") && typeof data["crouch"] !== "boolean")
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
  return {
    v: 1,
    type: "input",
    seq: data["seq"],
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
    ...(typeof data["crouch"] === "boolean" ? { crouch: data["crouch"] } : {}),
  };
}
