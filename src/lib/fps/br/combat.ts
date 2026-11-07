import { advanceCombatRecoil, recoverCombatRecoil, type HitZone } from "../combat";
import { rayBox } from "../collision";
import { eyeHeight } from "../map";
import { combatVolumes } from "../player-volumes";
import type { Player } from "../protocol";
import { applyBrDamage } from "./armor";
import { activeGun, finishReload, ammoFor, tabletOf, type Loadout } from "./inventory";
import { PERK_EFFECT, perkOn } from "./perks";
import { ITEMS, type MuzzleDef, type WeaponDef } from "./items";
import type { DropBody } from "./drop";
import type { StaticWorld } from "./static-world";
import { newFlight, sweepFlight, type Flight } from "./ballistics";
import type { Vector } from "../collision";

/** BR-only authoritative spread and swept gravity trajectories. */
export type Hands = {
  lastShotAt: number;
  sprayCount: number;
  recoilPitch: number;
  recoilYaw: number;
  recoilUpdatedAt?: number;
  /** Reload completes at this server time (0: not reloading). */
  reloadUntil: number;
  /** Weapon ready after a switch at this time. */
  drawUntil: number;
  /** Aiming down sights since (0: not aiming). */
  aimSince: number;
  /** Last grenade throw (recovery before the next). */
  throwAt?: number;
  /** A healing item in use (LOOT-SPEC §10.4): completes at `until`. */
  heal: { item: "bandage" | "medkit"; until: number } | null;
};
export const newHands = (): Hands => ({
  lastShotAt: -1e9,
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
  /** Lag compensation never rewinds further than this. */
  maxRewindMs: 200,
  historyTicks: 12,
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
      type: "elim";
      seat: number;
      by: number;
      gun: WeaponDef["model"] | "he" | "fire" | "gas" | "vehicle";
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
};

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
    (base * motion * stance * (1 + Math.min(30, Math.max(0, h.sprayCount)) * 0.075) * Math.PI) / 180
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
    onVehicle?: (id: number, damage: number) => void,
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
  onVehicle?: (id: number, damage: number) => void,
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
    return value ? { distance, value } : null;
  });
  if (!hit) return [];
  if (!("target" in hit.value)) {
    if (hit.value.vehicle !== undefined) onVehicle?.(hit.value.vehicle, weapon.damage.chest);
    return [];
  }
  const point: [number, number, number] = [r3(hit.point.x), r3(hit.point.y), r3(hit.point.z)];
  const { target: t, zone } = hit.value;
  const result = applyBrDamage(t.kit.armour, weapon, zone, {
    damage: b.damageScale,
    wear: perkOn(tabletOf(t.kit), "armor-specialist") ? PERK_EFFECT.armorWear : 1,
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
const hash32 = (a: number, b: number, c: number) => {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ c;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  return (h ^ (h >>> 15)) >>> 0;
};

/** Recoil recovery and reload/heal completion, every tick. */
export function updateHands(f: Fighter, now: number) {
  const h = f.hands;
  recoverCombatRecoil(h as unknown as Player, now);
  if (h.reloadUntil && now >= h.reloadUntil) {
    h.reloadUntil = 0;
    const g = activeGun(f.kit);
    if (g && finishReload(f.kit, g) > 0) f.kitVersion++;
  }
}

/** Start a reload if the active gun can take rounds and there are rounds in the bag. */
export function startReload(f: Fighter, now: number): boolean {
  const g = activeGun(f.kit),
    h = f.hands;
  if (!g || h.reloadUntil || h.heal || now < h.drawUntil) return false;
  const d = ITEMS[g.item] as WeaponDef;
  if (g.mag >= d.magazine || ammoFor(f.kit, g) <= 0) return false;
  h.reloadUntil =
    now + d.reloadMs * (perkOn(tabletOf(f.kit), "faster-reload") ? PERK_EFFECT.reload : 1);
  h.aimSince = 0;
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
  _onVehicle: ((id: number, damage: number) => void) | undefined,
  projectiles: BrProjectiles,
): ShotEvent[] {
  const g = activeGun(f.kit),
    h = f.hands;
  if (!g || f.dead || h.heal || h.reloadUntil || now < h.drawUntil) return [];
  const d = ITEMS[g.item] as WeaponDef;
  if (now - h.lastShotAt < d.intervalMs) return [];
  if (g.mag <= 0) {
    startReload(f, now);
    return [];
  }
  if (![input.yaw, input.pitch, now].every(Number.isFinite) || projectiles.full) return [];
  recoverCombatRecoil(h as unknown as Player, now);
  const awp = g.item === "awp";
  const muzzle = g.muzzle ? (ITEMS[g.muzzle] as MuzzleDef) : null;
  const spread = brSpread(d, h, f.body, input, now);
  // Ammo Efficiency: a server-rolled chance that this shot keeps its round.
  const free =
    perkOn(tabletOf(f.kit), "ammo-efficiency") &&
    hash32(f.seat * 7 + 1, tick, g.mag) % 1000 < PERK_EFFECT.freeShotChance * 1000;
  if (!free) g.mag--;
  f.kitVersion++;
  h.lastShotAt = now;
  const hash = hash32(f.seat, tick, g.mag);
  const yaw = input.yaw + h.recoilYaw + ((hash % 1001) / 500 - 1) * spread;
  const pitch = input.pitch + h.recoilPitch + (((hash >>> 10) % 1001) / 500 - 1) * spread;
  if (awp) {
    // Bolt action: the zoom drops for the cycle and settles again afterwards if still held.
    if (h.aimSince) h.aimSince = now + d.intervalMs;
  } else {
    const p = {
      weapon: "rifle",
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
  projectiles.add({
    shooter: f,
    weapon: d,
    flight: newFlight(origin, dir, d.muzzleVelocityMps, d.gravityMps2, d.rangeM),
    firedAt: now,
    rewindMs: Number.isFinite(input.playbackMs)
      ? Math.min(COMBAT.maxRewindMs, Math.max(0, input.playbackMs!))
      : 0,
    damageScale: perkOn(tabletOf(f.kit), "deadly-bullets") ? PERK_EFFECT.damage : 1,
  });
  return events;
}
