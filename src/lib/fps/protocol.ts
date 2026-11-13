import { MIN_PLAYBACK_MS, REMOTE_DELAY_MS } from "./network";
import { isGrenadeType } from "./grenades/rules";
export type Seat = "A" | "B";
/**
 * Drawn weapon: the primary ("rifle" slot: the side's rifle, the AWP or the MP5), the sidearm
 * (the Desert Eagle, 2026-11-09: given in 1v1, bought in 5v5), the Karambit, or a grenade. The
 * Karambit once replaced a pistol: inputs from cached clients that still send "pistol" are read
 * as the knife (see validateInput), and states saved before then are normalised on load
 * (normalizeLegacyWeapons). The Deagle is therefore "sidearm" on the wire, never "pistol".
 */
export type Weapon = "rifle" | "knife" | "grenade" | "sidearm";
/** Knife attack: primary slash (fire) or secondary stab (fire + alt). */
export type KnifeAttack = "slash" | "stab";
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
  /** Secondary attack (knife stab). Optional for cached clients; ignored with the rifle. */
  alt?: boolean;
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
  /** AWP zoom held (right mouse). The server decides whether the player is actually scoped. */
  scope?: boolean;
  /** With weapon "grenade": the type drawn (the server checks it is carried). */
  nade?: import("./grenades/rules").GrenadeType;
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
  /** Server-owned: attacks are refused until the drawn weapon is ready (knife deploy). */
  weaponReadyAt?: number;
  /** Server-owned knife cooldown (slash and stab share one swing clock). */
  nextAttackAt?: number;
  reloadUntil: number;
  /**
   * Server-owned stage of the SPAS-12's shell-by-shell reload while `reloadUntil` is set: 0 the
   * start, 1 a shell going in (it is in the tube when the stage ends), 2 the end.
   */
  shellStage?: 0 | 1 | 2;
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
  /** Airborne duck raises the feet, not the jump impulse; cleared on landing. */
  airCrouchOffset?: number;
  /** Primary weapon in the "rifle" slot (absent: the side's rifle). Bought at spawn (buy.ts). */
  primary?: import("./primary").Primary;
  /** Server-owned sidearm carried (the Desert Eagle) and its own magazine and reserve. */
  sidearm?: import("./sidearm").Sidearm;
  sidearmAmmo?: number;
  sidearmReserve?: number;
  /** Server-owned AWP zoom state and when it engaged (scoped accuracy needs it to settle). */
  scoped?: boolean;
  scopedAt?: number;
  /** Server-owned grenades carried (refilled at every spawn). */
  grenades?: import("./grenades/rules").GrenadeInventory;
  /** With weapon "grenade": the type drawn, the hold (pin out), the throw, the weapon to go back to. */
  nade?: import("./grenades/rules").GrenadeType;
  nadeHold?: import("./grenades/world").NadeHold;
  nadeThrow?: import("./grenades/world").NadeThrow;
  nadeBack?: "rifle" | "knife" | "sidearm";
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
    /** Rifle-slot shots: which primary fired (absent: the side's rifle). */
    primary?: import("./primary").Primary;
    /** Knife events: which attack was swung. */
    attack?: KnifeAttack;
    /** Grenade events: the type, and the throw / detonation (see grenades/world.ts). */
    nade?: import("./grenades/rules").GrenadeType;
    projectile?: import("./grenades/world").Projectile;
    detonation?: import("./grenades/world").Detonation;
    /** Knife hit from behind (stronger damage table). */
    backstab?: boolean;
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
      kind: "shot" | "step" | "reload" | "knife";
      surface?: import("./footstep-surfaces").FootstepSurface;
      position?: import("./collision").Vector;
      gain?: number;
      pan?: number;
      /** Coarse audible direction only; never an opponent world position. */
      bearing?: number;
      occluded?: boolean;
      distance?: number;
      soft?: boolean;
    };
  }>;
  /** Grenades in flight, smoke clouds and fires (public; see grenades/world.ts). */
  grenades?: import("./grenades/world").GrenadeWorld;
  /** Persist with snapshots on the server; never accept this from a client. */
  server?: {
    lastStepAt: number;
    draws: number;
    spreadSeed?: number;
    roundStats?: Record<Seat, RoundStats>;
    /** Fire exposure per seat. */
    burns?: Partial<Record<Seat, import("./grenades/world").Burn>>;
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
    (Object.hasOwn(data, "combatVersion") ? 1 : 0) +
    (Object.hasOwn(data, "alt") ? 1 : 0) +
    (Object.hasOwn(data, "scope") ? 1 : 0) +
    (Object.hasOwn(data, "nade") ? 1 : 0);
  if (
    Object.keys(data).length !== expected ||
    !KEYS.every((key) => Object.hasOwn(data, key)) ||
    (Object.hasOwn(data, "combatVersion") && data["combatVersion"] !== 2) ||
    (Object.hasOwn(data, "crouch") && typeof data["crouch"] !== "boolean") ||
    (Object.hasOwn(data, "alt") && typeof data["alt"] !== "boolean") ||
    (Object.hasOwn(data, "scope") && typeof data["scope"] !== "boolean") ||
    (Object.hasOwn(data, "nade") && !isGrenadeType(data["nade"])) ||
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
    !["rifle", "knife", "pistol", "grenade", "sidearm"].includes(data["weapon"] as string) ||
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
    // "pistol" is what clients from before the Karambit send for the secondary slot.
    weapon:
      data["weapon"] === "rifle"
        ? "rifle"
        : data["weapon"] === "grenade"
          ? "grenade"
          : data["weapon"] === "sidearm"
            ? "sidearm"
            : "knife",
    fire: data["fire"] as boolean,
    ...(data["alt"] === true ? { alt: true } : {}),
    reload: data["reload"] as boolean,
    jump: data["jump"] as boolean,
    sprint: data["sprint"] as boolean,
    ...(typeof data["walk"] === "boolean" ? { walk: data["walk"] } : {}),
    ...(typeof data["playbackMs"] === "number" ? { playbackMs: data["playbackMs"] } : {}),
    ...(typeof data["crouch"] === "boolean" ? { crouch: data["crouch"] } : {}),
    ...(data["scope"] === true ? { scope: true } : {}),
    ...(isGrenadeType(data["nade"]) ? { nade: data["nade"] } : {}),
  };
}

/**
 * States saved before the Karambit can carry the retired "pistol" weapon. Map it to the knife
 * in place (the rifle's ammunition is untouched). Returns the same state for chaining.
 */
export function normalizeLegacyWeapons<T extends Pick<MatchState, "players">>(state: T): T {
  for (const seat of ["A", "B"] as const) {
    const player = state.players[seat] as Player & { weapon: string };
    if (
      player &&
      player.weapon !== "rifle" &&
      player.weapon !== "knife" &&
      player.weapon !== "sidearm"
    )
      player.weapon = "knife";
  }
  return state;
}
