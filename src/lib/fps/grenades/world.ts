import type { Vector } from "../collision";
import { eyeHeight } from "../map";
import type { GameMap } from "../maps/types";
import type { Player } from "../protocol";
import {
  extinguish,
  fireCells,
  inFire,
  insideSmoke,
  smokeBlocks,
  smokePhase,
  smokePuffs,
  type Fire,
  type Smoke,
} from "./effects";
import { simStart, simTo, stepsAt, throwStart, type NadeSim } from "./physics";
import { GRENADES, isGrenadeType, throwKindOf, type GrenadeType, type ThrowKind } from "./rules";

/**
 * Grenade state shared by both match servers: what each player is doing with a grenade (draw,
 * pin, release) and the grenades in the world (in flight, smoke clouds, fires). Mode-specific
 * consequences (damage, kills, events) go through the hooks.
 */

/** Holding the throw button: since when, and which buttons were held (bit 1 left, 2 right). */
export type NadeHold = { type: GrenadeType; since: number; mask: number };
/** Released: the throw clip started at `release`; the grenade leaves at `spawn`. */
export type NadeThrow = {
  type: GrenadeType;
  kind: ThrowKind;
  release: number;
  spawn: number;
  /** Thrown while in the air (the jump-throw clip). */
  air?: boolean;
  /** The grenade has left the hand (its projectile id). */
  id?: number;
};

/** A grenade in flight. `o`, `v` and `at` fully determine its path (see physics.ts). */
export type Projectile = {
  id: number;
  type: GrenadeType;
  owner: number;
  kind: ThrowKind;
  /** Server time it left the hand (ms). */
  at: number;
  o: [number, number, number];
  v: [number, number, number];
  /** Server-only: the replayed flight (never sent). */
  sim?: NadeSim;
  /** Server-only: first floor contact (fire), steps. */
  floorN?: number;
  floorAt?: [number, number, number];
  /** Server-only: step it came to rest (smoke). */
  restN?: number;
};
export type GrenadeWorld = {
  next: number;
  /** Server time of the last world step (sight checks read the clouds at this time). */
  now?: number;
  flying: Projectile[];
  smokes: (Smoke & { owner: number })[];
  fires: (Fire & { owner: number })[];
};
export const emptyGrenadeWorld = (next = 1): GrenadeWorld => ({
  next,
  flying: [],
  smokes: [],
  fires: [],
});

export type Detonation = {
  id: number;
  type: GrenadeType;
  owner: number;
  /** When it went off (server ms; at most one tick before the step that reports it). */
  at: number;
  x: number;
  y: number;
  z: number;
  /** Incendiary: burst without fire (in the air, or put out by smoke). */
  dud?: "air" | "smoke";
};

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Equip a grenade type (from another weapon or another grenade). False when not carried. */
export function equipGrenade(p: Player, type: unknown, now: number): boolean {
  if (!isGrenadeType(type) || !((p.grenades?.[type] ?? 0) > 0)) return false;
  if (p.weapon === "grenade" && p.nade === type) return true;
  // A released grenade is committed: it leaves the hand before anything else is drawn.
  if (p.nadeThrow && p.nadeThrow.id === undefined) return false;
  if (p.weapon !== "grenade")
    p.nadeBack = p.weapon === "knife" || p.weapon === "sidearm" ? p.weapon : "rifle";
  p.weapon = "grenade";
  p.nade = type;
  p.weaponReadyAt = now + GRENADES.equipMs;
  delete p.nadeHold;
  delete p.nadeThrow;
  return true;
}

/** Leave the grenade slot (weapon switch, death, round reset). */
export function clearGrenadeHandling(p: Player) {
  delete p.nade;
  delete p.nadeHold;
  delete p.nadeThrow;
  delete p.nadeBack;
}

/** May the player switch away now? A released grenade must leave the hand first. */
export const grenadeSwitchLocked = (p: Player) => !!p.nadeThrow && p.nadeThrow.id === undefined;

/**
 * One tick of grenade handling for a player holding a grenade: the hold (pin) on press, the
 * release on letting go (left only → overhand, right only → underhand, both at any point →
 * medium), the grenade leaving the hand `releaseMs` later, and the switch back to the previous
 * weapon once the throw has followed through. `held` is the input's buttons this tick (null: no
 * new input). `spawn` launches the projectile (the caller supplies the thrower's velocity).
 * Returns true when the weapon changed back.
 */
export function stepGrenadeHandling(
  p: Player,
  held: { fire: boolean; alt: boolean } | null,
  now: number,
  spawn: (p: Player, t: NadeThrow) => number | null,
): boolean {
  if (p.weapon !== "grenade" || !p.nade) return false;
  const t = p.nadeThrow;
  if (t) {
    if (t.id === undefined && now >= t.spawn) {
      const id = spawn(p, t);
      if (id === null) {
        // Could not leave (no stock: never expected). Keep the grenade.
        delete p.nadeThrow;
        return false;
      }
      t.id = id;
      p.grenades![t.type] = Math.max(0, (p.grenades![t.type] ?? 0) - 1);
    }
    if (t.id !== undefined && now >= t.release + GRENADES.recoverMs) {
      const back = p.nadeBack ?? "rifle";
      clearGrenadeHandling(p);
      p.weapon = back;
      if (back === "knife") p.weaponReadyAt = now;
      else delete p.weaponReadyAt;
      return true;
    }
    return false;
  }
  if (!held) return false;
  const mask = (held.fire ? 1 : 0) | (held.alt ? 2 : 0);
  if (!p.nadeHold) {
    if (mask && now >= (p.weaponReadyAt ?? 0) && (p.grenades?.[p.nade] ?? 0) > 0)
      p.nadeHold = { type: p.nade, since: now, mask };
    return false;
  }
  p.nadeHold.mask |= mask;
  if (mask) return false;
  // Released: the throw starts once the pin is out and the arm wound up.
  const kind = throwKindOf(p.nadeHold.mask);
  const release = Math.max(now, p.nadeHold.since + GRENADES.primeMs);
  p.nadeThrow = {
    type: p.nadeHold.type,
    kind,
    release,
    spawn: release + GRENADES.releaseMs[kind],
    ...((p.velocityY ?? 0) !== 0 ? { air: true } : {}),
  };
  delete p.nadeHold;
  return false;
}

/** Launch a grenade from a player's eye (server). Returns its id. */
export function launchGrenade(
  world: GrenadeWorld,
  map: GameMap,
  owner: number,
  p: Player,
  t: NadeThrow,
  velocity: Vector,
  now: number,
): Projectile {
  const eye = { x: p.x, y: p.y + eyeHeight(p), z: p.z };
  const { origin, velocity: v } = throwStart(eye, p.yaw, p.pitch, velocity, t.kind, map);
  const projectile: Projectile = {
    id: world.next++,
    type: t.type,
    owner,
    kind: t.kind,
    // Sub-tick accurate: the grenade left at `spawn` (≤ one tick ago).
    at: Math.min(now, t.spawn),
    o: [round3(origin.x), round3(origin.y), round3(origin.z)],
    v: [round3(v.x), round3(v.y), round3(v.z)],
  };
  world.flying.push(projectile);
  return projectile;
}

/**
 * Advance the world's grenades to `now`: flights, detonations (HE blast, smoke cloud, fire),
 * burnt-out fires, faded clouds. Smoke landing on fire puts the covered flames out; an
 * incendiary landing in smoke fizzles. Returns what went off this step (the caller applies HE
 * damage and reports events).
 */
export function stepGrenadeWorld(world: GrenadeWorld, map: GameMap, now: number): Detonation[] {
  world.now = now;
  const out: Detonation[] = [];
  const keep: Projectile[] = [];
  for (const p of world.flying) {
    const sim = (p.sim ??= simStart(
      { x: p.o[0], y: p.o[1], z: p.o[2] },
      { x: p.v[0], y: p.v[1], z: p.v[2] },
    ));
    const age = Math.max(0, now - p.at);
    const step = GRENADES.physics.step;
    let goesAt: number | null = null; // seconds after the throw
    if (p.type === "he") {
      const fuse = GRENADES.he.fuseMs / 1000;
      simTo(sim, map, Math.min(age / 1000, fuse));
      if (age / 1000 >= fuse) goesAt = fuse;
    } else if (p.type === "fire") {
      const limit = GRENADES.fire.maxAirMs / 1000;
      simTo(sim, map, Math.min(age / 1000, limit), (impact) => {
        if (impact.floor && p.floorN === undefined) {
          p.floorN = stepsAt(impact.t);
          p.floorAt = [impact.x, impact.y, impact.z];
        }
      });
      if (p.floorN !== undefined) goesAt = p.floorN * step;
      else if (age / 1000 >= limit) goesAt = limit;
    } else {
      const min = GRENADES.smoke.minMs / 1000,
        max = GRENADES.smoke.maxMs / 1000;
      simTo(sim, map, Math.min(age / 1000, max));
      if (sim.rest && p.restN === undefined) p.restN = restStep(sim);
      if (p.restN !== undefined && age / 1000 >= Math.max(min, p.restN * step))
        goesAt = Math.max(min, p.restN * step);
      else if (age / 1000 >= max) goesAt = max;
    }
    // Lost out of the world (never expected with closed maps): drop it silently.
    if (sim.y < -20) continue;
    if (goesAt === null) {
      keep.push(p);
      continue;
    }
    const at = p.at + Math.round(goesAt * 1000);
    const where =
      p.type === "fire" && p.floorAt
        ? { x: p.floorAt[0], y: p.floorAt[1], z: p.floorAt[2] }
        : { x: sim.x, y: sim.y, z: sim.z };
    const pos = { x: round3(where.x), y: round3(where.y), z: round3(where.z) };
    const det: Detonation = { id: p.id, type: p.type, owner: p.owner, at, ...pos };
    if (p.type === "smoke") {
      const smoke = { id: p.id, owner: p.owner, at, puffs: smokePuffs(pos, map) };
      world.smokes.push(smoke);
      for (const fire of world.fires) extinguish(fire, smoke, now);
    } else if (p.type === "fire") {
      if (p.floorN === undefined) det.dud = "air";
      else if (insideSmoke({ x: pos.x, y: pos.y + 0.3, z: pos.z }, world.smokes, now))
        det.dud = "smoke";
      else {
        const cells = fireCells(pos, map, world.smokes, now);
        if (cells.length) world.fires.push({ id: p.id, owner: p.owner, at, cells });
        else det.dud = "smoke";
      }
    }
    out.push(det);
  }
  world.flying = keep;
  world.smokes = world.smokes.filter((s) => !smokePhase(s, now).over);
  world.fires = world.fires.filter((f) => now - f.at < GRENADES.fire.durationMs);
  return out;
}

/** The step a resting simulation stopped at (it stops counting motion, not time). */
function restStep(sim: NadeSim) {
  return sim.restN ?? sim.n;
}

/** Fire exposure per player (server-only bookkeeping). */
export type Burn = { since: number; last: number; carry: number; owner: number; lastTick: number };

/**
 * Burn damage for one player this tick: standing in flames builds exposure (8 HP/s rising);
 * damage is dealt in GRENADES.fire.tickMs pulses. Returns the whole points to deal (0 most
 * ticks) and the fire's owner.
 */
export function burnStep(
  feet: Vector,
  burn: Burn | undefined,
  fires: GrenadeWorld["fires"],
  now: number,
): { burn: Burn | undefined; damage: number; owner: number } {
  const F = GRENADES.fire;
  const fire = inFire(feet, fires, now) as (Fire & { owner: number }) | null;
  if (!fire) {
    if (burn && now - burn.last > F.resetMs) return { burn: undefined, damage: 0, owner: -1 };
    return { burn, damage: 0, owner: burn?.owner ?? -1 };
  }
  const b = burn ?? {
    since: now,
    last: now,
    carry: 0,
    owner: fire.owner,
    lastTick: now - F.tickMs,
  };
  b.last = now;
  b.owner = fire.owner;
  if (now - b.lastTick < F.tickMs) return { burn: b, damage: 0, owner: b.owner };
  const exposed = (now - b.since) / 1000;
  const dps = Math.min(F.maxDps, F.dps + F.ramp * exposed);
  b.carry += (dps * (now - b.lastTick)) / 1000;
  b.lastTick = now;
  const damage = Math.floor(b.carry);
  b.carry -= damage;
  return { burn: b, damage, owner: b.owner };
}

/** Sight line a → b hidden by the world's smoke at its last step. */
export function smokeHides(
  world: Pick<GrenadeWorld, "smokes" | "now"> | undefined,
  a: Vector,
  b: Vector,
): boolean {
  return !!world?.smokes.length && smokeBlocks(a, b, world.smokes, world.now ?? 0);
}

/** Public copy of the world for snapshots (no server-only simulation state). */
export function publicGrenadeWorld(world: GrenadeWorld | undefined) {
  if (!world) return undefined;
  return {
    next: world.next,
    ...(world.now !== undefined ? { now: world.now } : {}),
    flying: world.flying.map(({ sim: _s, floorN: _f, floorAt: _a, restN: _r, ...p }) => p),
    smokes: world.smokes,
    fires: world.fires,
  };
}
export type PublicGrenadeWorld = NonNullable<ReturnType<typeof publicGrenadeWorld>>;
