import { shatterAlong } from "./panes";
import {
  advanceCombatRecoil,
  isBackstab,
  KNIFE,
  recoverCombatRecoil,
  type HitZone,
  type RecoilPattern,
} from "../combat";
import type { KnifeAttack } from "../protocol";
import { rayBox } from "../collision";
import { eyeHeight } from "../map";
import { combatVolumes } from "../player-volumes";
import { BR_LAG, BR_MAX_REWIND_MS } from "./lag";
import type { Player } from "../protocol";
import { applyBrDamage } from "./armor";
import { activeGun, finishReload, ammoFor, loadShell, perksOf, type Loadout } from "./inventory";
import { PERK_EFFECT, perkOn } from "./perks";
import { ITEMS, magSize, type MuzzleDef, type WeaponDef, type WeaponId } from "./items";
import type { DropBody } from "./drop";
import type { StaticWorld } from "./static-world";
import { newFlight, sweepFlight, type Flight } from "./ballistics";
import type { Vector } from "../collision";
import { hash32, pelletDirections } from "../pellets";

export { pelletDirections };

/** BR-only authoritative spread and swept gravity trajectories. */
export type Hands = {
  lastShotAt: number;
  shotsFired?: number;
  sprayCount: number;
  recoilPitch: number;
  recoilYaw: number;
  recoilUpdatedAt?: number;
  /** The fire button was down on the previous input (semi-automatic trigger edge). */
  triggerDown?: boolean;
  /** The spray pattern of the gun that fired last (its recovery speed applies). */
  recoilPattern?: RecoilPattern;
  /**
   * Reload completes at this server time (0: not reloading). A shell-by-shell reload (`shells`)
   * runs in stages, and this is when the current one ends.
   */
  reloadUntil: number;
  /**
   * A tube magazine being loaded (items.ts `shells`), meaningful only while `reloadUntil` is
   * set: stage 0 the start, 1 a shell going in (it is in the gun when the stage ends), 2 the
   * end; `since` is when the stage began.
   */
  shells?: { stage: 0 | 1 | 2; since: number };
  /** Weapon ready after a switch at this time. */
  drawUntil: number;
  /** Aiming down sights since (0: not aiming). */
  aimSince: number;
  /** Last grenade throw (recovery before the next). */
  throwAt?: number;
  /** The Karambit's next swing is allowed at this server time (its cooldown). */
  knifeAt?: number;
  /** A healing item in use (LOOT-SPEC §10.4): completes at `until`. */
  heal: { item: "bandage" | "medkit"; until: number } | null;
};
export const newHands = (): Hands => ({
  lastShotAt: -1e9,
  shotsFired: 0,
  sprayCount: 0,
  recoilPitch: 0,
  recoilYaw: 0,
  reloadUntil: 0,
  drawUntil: 0,
  aimSince: 0,
  heal: null,
});
export const COMBAT = {
  /** Time to raise a gun after switching. */
  drawMs: 450,
  /** Lag compensation never rewinds further than this (lag.ts: view + server wait). */
  maxRewindMs: BR_MAX_REWIND_MS,
  /** 667 ms of poses: the furthest rewind and two ticks to interpolate in. */
  historyTicks: 20,
} as const;

export type Fighter = {
  seat: number;
  body: DropBody;
  kit: Loadout;
  hands: Hands;
  dead: boolean;
  kills: number;
  /** Bumped whenever the loadout changes, so the room resends it. */
  kitVersion: number;
  /** Damage dealt to others this match (result row). */
  damage: number;
};

/** Ring buffer of every seat's pose per tick, for rewinding targets. */
export class PoseHistory {
  private frames: Array<{ at: number; pose: Float32Array }> = [];
  clear() {
    this.frames.length = 0;
  }
  record(at: number, fighters: readonly Fighter[]) {
    const pose = new Float32Array(fighters.length * 4);
    for (const f of fighters) {
      const o = f.seat * 4;
      pose[o] = f.body.x;
      pose[o + 1] = f.body.y;
      pose[o + 2] = f.body.z;
      pose[o + 3] = f.body.crouched ? 1 : 0;
    }
    this.frames.push({ at, pose });
    if (this.frames.length > COMBAT.historyTicks) this.frames.shift();
  }
  bounds(seat: number, fallback: DropBody) {
    let minX = fallback.x,
      maxX = fallback.x,
      minZ = fallback.z,
      maxZ = fallback.z;
    for (const frame of this.frames) {
      const o = seat * 4;
      if (o + 3 >= frame.pose.length) continue;
      minX = Math.min(minX, frame.pose[o]!);
      maxX = Math.max(maxX, frame.pose[o]!);
      minZ = Math.min(minZ, frame.pose[o + 2]!);
      maxZ = Math.max(maxZ, frame.pose[o + 2]!);
    }
    return { minX, maxX, minZ, maxZ };
  }
  /** Interpolate retained server samples; use current pose when history is unavailable. */
  at(seat: number, at: number, fallback: DropBody) {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const f = this.frames[i]!;
      if (f.at <= at + 1e-6) {
        const o = seat * 4;
        if (o + 3 >= f.pose.length) break;
        const next = this.frames[i + 1];
        const k =
          next && o + 3 < next.pose.length && next.at > f.at
            ? Math.min(1, Math.max(0, (at - f.at) / (next.at - f.at)))
            : 0;
        return {
          x: f.pose[o]! + (k ? (next!.pose[o]! - f.pose[o]!) * k : 0),
          y: f.pose[o + 1]! + (k ? (next!.pose[o + 1]! - f.pose[o + 1]!) * k : 0),
          z: f.pose[o + 2]! + (k ? (next!.pose[o + 2]! - f.pose[o + 2]!) * k : 0),
          crouched: f.pose[o + 3] === 1,
        };
      }
    }
    // Older than everything kept (the room stalled): the oldest pose is the nearest to what
    // the shooter saw; the current one would be the furthest from it.
    const oldest = this.frames[0];
    const o = seat * 4;
    if (oldest && oldest.at > at && o + 3 < oldest.pose.length)
      return {
        x: oldest.pose[o]!,
        y: oldest.pose[o + 1]!,
        z: oldest.pose[o + 2]!,
        crouched: oldest.pose[o + 3] === 1,
      };
    return { x: fallback.x, y: fallback.y, z: fallback.z, crouched: fallback.crouched };
  }
}

export type ShotEvent =
  | {
      type: "shot";
      seat: number;
      gun: WeaponDef["model"];
      origin: [number, number, number];
      dir: [number, number, number];
      hearM: number;
      silenced: boolean;
      flash: boolean;
      impact?: [number, number, number];
    }
  | {
      type: "hit";
      seat: number;
      victim: number;
      zone: HitZone;
      damage: number;
      broke: string[];
      point: [number, number, number];
    }
  | {
      /** A Karambit swing (hit or miss): its sound and the third-person sweep. */
      type: "melee";
      seat: number;
      attack: KnifeAttack;
      origin: [number, number, number];
      hearM: number;
    }
  | {
      type: "elim";
      seat: number;
      by: number;
      gun: WeaponDef["model"] | "knife" | "he" | "fire" | "gas" | "vehicle" | "fall";
      /** Display names, filled in by the match (kill feed). */
      name?: string;
      byName?: string;
    };

export type ShotInput = {
  yaw: number;
  pitch: number;
  forward: number;
  strafe: number;
  walk?: boolean;
  playbackMs?: number;
  /** Set by the room (never by a client): the whole rewind for this input. */
  rewindMs?: number;
};

/**
 * How far a shot's targets rewind: the room's figure (measured round trip + bounded playback +
 * its own wait) when there is one, else the bounded playback delay alone (bots, tests).
 */
export function shotRewindMs(input: Pick<ShotInput, "playbackMs" | "rewindMs">) {
  return Number.isFinite(input.rewindMs)
    ? Math.min(COMBAT.maxRewindMs, Math.max(0, input.rewindMs!))
    : Number.isFinite(input.playbackMs)
      ? Math.min(BR_LAG.playbackMaxMs, Math.max(0, input.playbackMs!))
      : 0;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
/** Original angular tuning; optical zoom does not grant extra accuracy over iron sights. */
export function brSpread(d: WeaponDef, h: Hands, body: DropBody, input: ShotInput, now: number) {
  const settle =
    h.aimSince > 0 && now >= h.aimSince ? Math.min(1, (now - h.aimSince) / d.adsSettleMs) : 0;
  const base = d.hipSpreadDeg + (d.adsSpreadDeg - d.hipSpreadDeg) * settle;
  const moving =
    Math.hypot(input.forward, input.strafe) > 0.1 || Math.hypot(body.vx, body.vz) > 0.15;
  const motion = moving ? (input.walk ? 1.5 : body.crouched ? 1.6 : 2.5) : 1;
  const stance = !body.grounded ? 5 : body.crouched ? 0.75 : 1;
  return (
    (base *
      motion *
      stance *
      (1 + Math.min(30, Math.max(0, h.sprayCount)) * d.burstSpread) *
      Math.PI) /
    180
  );
}

type BrBullet = {
  shooter: Fighter;
  weapon: WeaponDef;
  flight: Flight;
  firedAt: number;
  rewindMs: number;
  damageScale: number;
};
type BulletCollision = { target: Fighter; zone: HitZone } | { vehicle: number | undefined };

/** One pool per match; advance after recording server poses, clear on match end/reset. */
export class BrProjectiles {
  private bullets: BrBullet[] = [];
  static readonly capacity = 1536;
  get size() {
    return this.bullets.length;
  }
  get full() {
    return this.size >= BrProjectiles.capacity;
  }
  clear() {
    this.bullets.length = 0;
  }
  add(bullet: BrBullet) {
    if (this.full) return false;
    this.bullets.push(bullet);
    return true;
  }
  advance(
    fighters: readonly Fighter[],
    world: StaticWorld,
    history: PoseHistory,
    now: number,
    onElim: (victim: Fighter, by: Fighter) => void,
    onVehicle?: (id: number, damage: number, at?: { x: number; y: number; z: number }) => void,
  ): ShotEvent[] {
    if (!this.size || !Number.isFinite(now)) return [];
    const events: ShotEvent[] = [];
    const index = new TargetIndex(fighters, history);
    let live = 0;
    for (const b of this.bullets) {
      const seconds = Math.max(0, (now - b.firedAt) / 1000 - b.flight.age);
      if (seconds > 0)
        events.push(...resolveBullet(b, seconds, index, world, history, onElim, onVehicle));
      if (b.flight.age < b.flight.lifetime) this.bullets[live++] = b;
    }
    this.bullets.length = live;
    return events;
  }
}

/** Shared per-tick broadphase covers current and retained historical positions. */
class TargetIndex {
  private cells = new Map<string, Fighter[]>();
  private global: Fighter[] = [];
  private found: Fighter[] = [];
  private seen = new Map<Fighter, number>();
  private stamp = 0;
  constructor(fighters: readonly Fighter[], history: PoseHistory) {
    for (const t of fighters) {
      if (t.dead || t.body.phase === "plane") continue;
      const bounds = history.bounds(t.seat, t.body);
      const x0 = Math.floor((bounds.minX - 1) / 16),
        x1 = Math.floor((bounds.maxX + 1) / 16);
      const z0 = Math.floor((bounds.minZ - 1) / 16),
        z1 = Math.floor((bounds.maxZ + 1) / 16);
      if ((x1 - x0 + 1) * (z1 - z0 + 1) > 64) {
        this.global.push(t);
        continue;
      }
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          const key = `${x},${z}`,
            cell = this.cells.get(key);
          if (cell) cell.push(t);
          else this.cells.set(key, [t]);
        }
    }
  }
  query(from: Vector, dir: Vector, length: number): Fighter[] {
    const endX = from.x + dir.x * length,
      endZ = from.z + dir.z * length;
    const x0 = Math.floor(Math.min(from.x, endX) / 16),
      x1 = Math.floor(Math.max(from.x, endX) / 16);
    const z0 = Math.floor(Math.min(from.z, endZ) / 16),
      z1 = Math.floor(Math.max(from.z, endZ) / 16);
    const result = this.found;
    result.length = 0;
    const stamp = ++this.stamp;
    for (const t of this.global) {
      result.push(t);
      this.seen.set(t, stamp);
    }
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++)
        for (const t of this.cells.get(`${x},${z}`) ?? [])
          if (this.seen.get(t) !== stamp) {
            result.push(t);
            this.seen.set(t, stamp);
          }
    return result;
  }
}

function resolveBullet(
  b: BrBullet,
  seconds: number,
  index: TargetIndex,
  world: StaticWorld,
  history: PoseHistory,
  onElim: (victim: Fighter, by: Fighter) => void,
  onVehicle?: (id: number, damage: number, at?: { x: number; y: number; z: number }) => void,
): ShotEvent[] {
  const { flight, shooter, weapon } = b;
  const hit = sweepFlight<BulletCollision>(flight, seconds, (from, dir, length, start, end) => {
    const wall = world.raycast(from.x, from.y, from.z, dir.x, dir.y, dir.z, length);
    let distance = wall && wall.distance >= 0 && wall.distance <= length ? wall.distance : Infinity;
    let value: BulletCollision | null = Number.isFinite(distance)
      ? { vehicle: (wall as { vehicle?: number }).vehicle }
      : null;
    for (const t of index.query(from, dir, length)) {
      if (t === shooter || t.dead) continue;
      const a = combatVolumes(history.at(t.seat, b.firedAt - b.rewindMs + start * 1000, t.body));
      const z = combatVolumes(history.at(t.seat, b.firedAt - b.rewindMs + end * 1000, t.body));
      for (const zone of ["head", "chest", "stomach", "legs"] as const) {
        const center = a[zone].center;
        const motion = {
          x: z[zone].center.x - center.x,
          y: z[zone].center.y - center.y,
          z: z[zone].center.z - center.z,
        };
        const size = {
          x: Math.max(a[zone].size.x, z[zone].size.x),
          y: Math.max(a[zone].size.y, z[zone].size.y),
          z: Math.max(a[zone].size.z, z[zone].size.z),
        };
        // Relative motion catches targets crossing between server samples.
        const relative = {
          x: dir.x - motion.x / length,
          y: dir.y - motion.y / length,
          z: dir.z - motion.z / length,
        };
        const d = rayBox(from, relative, center, size);
        if (d <= length && d < distance) {
          distance = d;
          value = { target: t, zone };
        }
      }
    }
    // Glass on the way (panes.ts): the bullet breaks every whole pane it crosses up to what it
    // hits, and flies on.
    shatterAlong(world, from.x, from.y, from.z, dir.x, dir.y, dir.z, Math.min(distance, length));
    return value ? { distance, value } : null;
  });
  if (!hit) return [];
  if (!("target" in hit.value)) {
    if (hit.value.vehicle !== undefined)
      onVehicle?.(hit.value.vehicle, weapon.damage.chest, hit.point);
    return [];
  }
  const point: [number, number, number] = [r3(hit.point.x), r3(hit.point.y), r3(hit.point.z)];
  const { target: t, zone } = hit.value;
  const result = applyBrDamage(t.kit.armour, weapon, zone, {
    // Deadly Precision (the scale the bullet left with): never on the head. A shotgun's
    // pellet has lost some of its damage by now.
    damage:
      (zone === "head" ? 1 : b.damageScale) *
      pelletFalloff(
        weapon,
        Math.hypot(
          hit.point.x - flight.origin.x,
          hit.point.y - flight.origin.y,
          hit.point.z - flight.origin.z,
        ),
      ),
    wear: perkOn(perksOf(t.kit), "iron-plates") ? PERK_EFFECT.armorWear : 1,
  });
  shooter.damage += Math.min(t.kit.hp, result.damage);
  t.kit.hp = Math.max(0, t.kit.hp - result.damage);
  t.kitVersion++;
  t.hands.heal = null;
  const events: ShotEvent[] = [
    {
      type: "hit",
      seat: shooter.seat,
      victim: t.seat,
      zone,
      damage: result.damage,
      broke: result.broke,
      point,
    },
  ];
  if (t.kit.hp <= 0) {
    t.dead = true;
    shooter.kills++;
    events.push({ type: "elim", seat: t.seat, by: shooter.seat, gun: weapon.model });
    onElim(t, shooter);
  }
  return events;
}

/**
 * The Karambit in the battle royale: always carried, in the hand whenever no gun is drawn
 * (Loadout.active -1). The 1v1/5v5 knife rules (combat.ts KNIFE): left mouse slashes, right
 * mouse stabs, each within its reach along a small fan of rays from the eye, against the
 * target's lag-compensated hit boxes and never through a wall; from behind it is a backstab.
 * The damage goes through the target's helmet, vest and plates like any other hit.
 */
export const BR_KNIFE = {
  /** How far a swing is heard (metres). */
  hearM: 22,
} as const;
const knifeWeapon = (damage: number) =>
  ({
    model: "knife",
    damage: { head: damage, chest: damage, stomach: damage, legs: damage },
    armorPierce: 0,
  }) as unknown as WeaponDef;
export function knifeSwing(
  f: Fighter & { yaw: number },
  input: ShotInput,
  fighters: readonly (Fighter & { yaw: number })[],
  world: StaticWorld,
  history: PoseHistory,
  now: number,
  attack: KnifeAttack,
  onElim: (victim: Fighter, by: Fighter) => void,
): ShotEvent[] {
  const h = f.hands,
    spec = KNIFE[attack];
  if (f.dead || f.kit.active !== -1 || now < h.drawUntil || now < (h.knifeAt ?? 0)) return [];
  if (![input.yaw, input.pitch, now].every(Number.isFinite)) return [];
  h.knifeAt = now + spec.cooldownMs;
  if (h.heal) {
    h.heal = null; // a swing interrupts healing, like a shot
    f.kitVersion++;
  }
  const origin = { x: f.body.x, y: f.body.y + eyeHeight(f.body), z: f.body.z };
  const events: ShotEvent[] = [
    {
      type: "melee",
      seat: f.seat,
      attack,
      origin: [r3(origin.x), r3(origin.y), r3(origin.z)],
      hearM: BR_KNIFE.hearM,
    },
  ];
  const rewind = shotRewindMs(input);
  let best: { t: Fighter & { yaw: number }; zone: HitZone; distance: number } | null = null;
  const reach = spec.range + 1.5;
  const candidates = fighters.filter(
    (t) =>
      t !== f &&
      !t.dead &&
      (t.body.phase === "ground" || t.body.phase === "swim") &&
      Math.hypot(t.body.x - f.body.x, t.body.z - f.body.z) < reach,
  );
  for (const [dyaw, dpitch] of spec.fan) {
    const yaw = input.yaw + dyaw,
      pitch = input.pitch + dpitch;
    const dir = {
      x: -Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    };
    const hitWall = world.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, spec.range);
    const wall =
      hitWall && hitWall.distance >= 0 && hitWall.distance <= spec.range
        ? hitWall.distance
        : Infinity;
    for (const t of candidates) {
      const volumes = combatVolumes(history.at(t.seat, now - rewind, t.body));
      for (const zone of ["head", "chest", "stomach", "legs"] as const) {
        const d = rayBox(origin, dir, volumes[zone].center, volumes[zone].size);
        if (d <= spec.range && d < wall && (!best || d < best.distance))
          best = { t, zone, distance: d };
      }
    }
  }
  if (!best) return events;
  const { t, zone } = best;
  const at = history.at(t.seat, now - rewind, t.body);
  const backstab = isBackstab(f.body, { x: at.x, z: at.z, yaw: t.yaw });
  const base = backstab ? spec.backstab : spec.damage;
  const result = applyBrDamage(t.kit.armour, knifeWeapon(base), zone, {
    wear: perkOn(perksOf(t.kit), "iron-plates") ? PERK_EFFECT.armorWear : 1,
  });
  f.damage += Math.min(t.kit.hp, result.damage);
  t.kit.hp = Math.max(0, t.kit.hp - result.damage);
  t.kitVersion++;
  t.hands.heal = null;
  const volume = combatVolumes(at)[zone];
  events.push({
    type: "hit",
    seat: f.seat,
    victim: t.seat,
    zone,
    damage: result.damage,
    broke: result.broke,
    point: [r3(volume.center.x), r3(volume.center.y), r3(volume.center.z)],
  });
  if (t.kit.hp <= 0) {
    t.dead = true;
    f.kills++;
    events.push({ type: "elim", seat: t.seat, by: f.seat, gun: "knife" });
    onElim(t, f);
  }
  return events;
}

/** A pellet's share of its damage after flying `metres` (1 for guns without pellets). */
export function pelletFalloff(weapon: WeaponDef, metres: number) {
  const p = weapon.pellets;
  if (!p || metres <= p.fullM) return 1;
  if (metres >= p.endM) return p.min;
  return 1 - ((metres - p.fullM) / (p.endM - p.fullM)) * (1 - p.min);
}

/** Recoil recovery and reload/heal completion, every tick. */
export function updateHands(f: Fighter, now: number) {
  const h = f.hands;
  recoverCombatRecoil(h as unknown as Player, now);
  if (h.reloadUntil && now >= h.reloadUntil) {
    const g = activeGun(f.kit);
    const tube = g && (ITEMS[g.item] as WeaponDef).shells;
    if (g && tube && h.shells) {
      // A tube magazine: the shell that was going in is in; another one, or the end.
      const scale = perkOn(perksOf(f.kit), "quick-hands") ? PERK_EFFECT.reload : 1;
      if (h.shells.stage === 2) {
        h.reloadUntil = 0;
        delete h.shells;
      } else {
        if (h.shells.stage === 1) loadShell(f.kit, g);
        const more = g.mag < magSize(g) && ammoFor(f.kit, g) > 0;
        // The next stage runs from when this one was due, not from the tick that noticed
        // (a tick late on every shell would add up to a quarter second over a full tube).
        const from = h.reloadUntil;
        h.shells = { stage: more ? 1 : 2, since: from };
        h.reloadUntil = from + (more ? tube.insertMs : tube.endMs) * scale;
      }
      f.kitVersion++;
    } else {
      h.reloadUntil = 0;
      delete h.shells;
      if (g && finishReload(f.kit, g) > 0) f.kitVersion++;
    }
  }
  // An empty magazine reloads by itself, as in 1v1/5v5 (simulation.ts), once the last shot's
  // kick has played (owner, 2026-11-13: "lag with desert eagle reload animation when shooting
  // untill out of the bullets": the gun sat slide-locked until the next trigger pull, then waited
  // a round trip for the server to start the reload).
  if (!h.reloadUntil && !f.dead) {
    const g = activeGun(f.kit);
    if (g && g.mag <= 0) {
      const d = ITEMS[g.item] as WeaponDef;
      if (now - h.lastShotAt >= Math.min(d.intervalMs, AUTO_RELOAD_AFTER_MS) && startReload(f, now))
        f.kitVersion++;
    }
  }
}

/** How long after the last round an empty gun starts its reload (the shot's kick first). */
const AUTO_RELOAD_AFTER_MS = 150;

/** Start a reload if the active gun can take rounds and there are rounds in the bag. */
export function startReload(f: Fighter, now: number): boolean {
  const g = activeGun(f.kit),
    h = f.hands;
  if (!g || h.reloadUntil || h.heal || now < h.drawUntil) return false;
  const d = ITEMS[g.item] as WeaponDef;
  if (g.mag >= magSize(g) || ammoFor(f.kit, g) <= 0) return false;
  const scale = perkOn(perksOf(f.kit), "quick-hands") ? PERK_EFFECT.reload : 1;
  if (d.shells) {
    h.shells = { stage: 0, since: now };
    h.reloadUntil = now + d.shells.startMs * scale;
  } else {
    delete h.shells;
    h.reloadUntil = now + d.reloadMs * scale;
  }
  h.aimSince = 0;
  return true;
}

/**
 * Whether a shot is asked for in the middle of a shell-by-shell reload with a shell in the gun:
 * the reload stops there (the shells loaded stay loaded, the one in the hand goes back) and the
 * gun comes up again; the shot itself is the next pull's.
 */
function breakShellReload(f: Fighter, g: { mag: number; item: WeaponId }, now: number) {
  const h = f.hands,
    tube = (ITEMS[g.item] as WeaponDef).shells;
  if (!tube || !h.shells || !h.reloadUntil || g.mag <= 0) return false;
  h.reloadUntil = 0;
  delete h.shells;
  h.drawUntil = Math.max(h.drawUntil, now + tube.breakMs);
  f.kitVersion++;
  return true;
}

/**
 * Launch one shot immediately. Damage/elimination is resolved by the match's pool tick.
 * The positional arguments preserve the prior firing call shape; collision callbacks
 * are supplied again to BrProjectiles.advance so impacts use the current match world.
 */
export function fire(
  f: Fighter,
  input: ShotInput,
  _fighters: readonly Fighter[],
  _world: StaticWorld,
  _history: PoseHistory,
  now: number,
  tick: number,
  _onElim: (victim: Fighter, by: Fighter) => void,
  /** A shot that stops in a vehicle's body (vehicles.ts) damages the vehicle. */
  _onVehicle:
    ((id: number, damage: number, at?: { x: number; y: number; z: number }) => void) | undefined,
  projectiles: BrProjectiles,
): ShotEvent[] {
  const g = activeGun(f.kit),
    h = f.hands;
  if (g && !f.dead && !h.heal && breakShellReload(f, g, now)) return [];
  if (!g || f.dead || h.heal || h.reloadUntil || now < h.drawUntil) return [];
  const d = ITEMS[g.item] as WeaponDef;
  if (now - h.lastShotAt + 1e-6 < d.intervalMs) return [];
  if (g.mag <= 0) {
    startReload(f, now);
    return [];
  }
  if (![input.yaw, input.pitch, now].every(Number.isFinite) || projectiles.full) return [];
  recoverCombatRecoil(h as unknown as Player, now);
  const awp = !d.recoil;
  const muzzle = g.muzzle ? (ITEMS[g.muzzle] as MuzzleDef) : null;
  const spread = brSpread(d, h, f.body, input, now);
  g.mag--;
  f.kitVersion++;
  h.lastShotAt = now;
  h.shotsFired = (h.shotsFired ?? 0) + 1;
  const hash = hash32(f.seat, tick, g.mag);
  const yaw = input.yaw + h.recoilYaw + ((hash % 1001) / 500 - 1) * spread;
  const pitch = input.pitch + h.recoilPitch + (((hash >>> 10) % 1001) / 500 - 1) * spread;
  if (awp) {
    // Bolt action: the zoom drops for the cycle and settles again afterwards if still held.
    if (h.aimSince) h.aimSince = now + d.intervalMs;
  } else {
    h.recoilPattern = d.recoil!;
    const p = {
      weapon: "rifle",
      recoilPattern: d.recoil!,
      sprayCount: h.sprayCount,
      recoilPitch: h.recoilPitch,
      recoilYaw: h.recoilYaw,
    };
    advanceCombatRecoil(p as unknown as Player);
    const k = muzzle?.recoilScale ?? 1;
    h.recoilPitch += (p.recoilPitch - h.recoilPitch) * k;
    h.recoilYaw += (p.recoilYaw - h.recoilYaw) * k;
    h.sprayCount = p.sprayCount;
  }
  const dir = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch),
  };
  const origin = { x: f.body.x, y: f.body.y + eyeHeight(f.body), z: f.body.z };
  const events: ShotEvent[] = [];
  const shot: ShotEvent = {
    type: "shot",
    seat: f.seat,
    gun: d.model,
    origin: [r3(origin.x), r3(origin.y), r3(origin.z)],
    dir: [r3(dir.x), r3(dir.y), r3(dir.z)],
    hearM: Math.round(d.hearM * (muzzle?.hearScale ?? 1)),
    silenced: g.muzzle === "silencer",
    flash: !muzzle?.hideFlash,
  };
  events.push(shot);
  // Deadly Precision: not on the AWP (8 % more would make its body shot a one-shot kill
  // through a level 2 vest and a plate, where it takes two).
  const damageScale =
    !awp && perkOn(perksOf(f.kit), "deadly-precision") ? PERK_EFFECT.bodyDamage : 1;
  const launch = (toward: Vector) =>
    projectiles.add({
      shooter: f,
      weapon: d,
      flight: newFlight(origin, toward, d.muzzleVelocityMps, d.gravityMps2, d.rangeM, d.dragPerS),
      firedAt: now,
      rewindMs: shotRewindMs(input),
      damageScale,
    });
  if (!d.pellets) launch(dir);
  else
    for (const pellet of pelletDirections(dir, d.pellets, hash32(f.seat + 31, tick, g.mag)))
      launch(pellet);
  return events;
}
