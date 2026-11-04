import { advanceCombatRecoil, combatSpread, recoverCombatRecoil, type HitZone } from "../combat";
import { rayBox } from "../collision";
import { eyeHeight } from "../map";
import { combatVolumes } from "../player-volumes";
import { AWP, awpSpread } from "../primary";
import type { Player } from "../protocol";
import { applyBrDamage, type DamageResult } from "./armor";
import { activeGun, finishReload, ammoFor, tabletOf, type Loadout } from "./inventory";
import { PERK_EFFECT, perkOn } from "./perks";
import { ITEMS, type MuzzleDef, type OpticDef, type WeaponDef } from "./items";
import type { DropBody } from "./drop";
import type { StaticWorld } from "./static-world";

/**
 * Shooting on the island (LOOT-SPEC §6): the 1v1/5v5 guns with their own rules — fire
 * interval, magazine, reload time, the AK spray pattern and recovery (combat.ts), the rifle
 * cone (combatSpread) and the AWP's cones and scope settle (primary.ts) — resolved by the
 * server against the island's solid world and every other player's hit volumes, rewound to
 * what the shooter saw (lag compensation, as in 1v1/5v5). Damage goes through armor.ts.
 */
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
  /** Semi-automatic guns: the trigger is still held since the last shot (released → false). */
  trigger?: boolean;
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
  /** Spread multiplier while aiming down a rifle optic. */
  aimSpread: 0.8,
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
  /** Pose of a seat at (or just before) `at`; the current pose when no frame is that old. */
  at(seat: number, at: number, fallback: DropBody) {
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const f = this.frames[i]!;
      if (f.at <= at + 1e-6) {
        const o = seat * 4;
        return {
          x: f.pose[o]!,
          y: f.pose[o + 1]!,
          z: f.pose[o + 2]!,
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
 * One trigger pull. Returns the events (shot, hit, elimination); `onElim` runs for a victim
 * reduced to zero health (the match drops their gear).
 */
export function fire(
  f: Fighter,
  input: ShotInput,
  fighters: readonly Fighter[],
  world: StaticWorld,
  history: PoseHistory,
  now: number,
  tick: number,
  onElim: (victim: Fighter, by: Fighter) => void,
  /** A shot that stops in a vehicle's body (vehicles.ts) damages the vehicle. */
  onVehicle?: (id: number, damage: number) => void,
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
  // Semi-automatic: one shot per pull (the match clears `trigger` when the button is up).
  if (d.semi && h.trigger) return [];
  const awp = g.item === "awp";
  const optic = g.optic ? (ITEMS[g.optic] as OpticDef) : null,
    muzzle = g.muzzle ? (ITEMS[g.muzzle] as MuzzleDef) : null;
  const moving = Math.hypot(input.forward, input.strafe) > 0.1;
  const airborne = !f.body.grounded;
  const aimed = h.aimSince > 0 && now >= h.aimSince;
  const spread = awp
    ? awpSpread({
        scoped: aimed && now - h.aimSince >= AWP.scopeSettleMs,
        speedFraction: moving ? (input.walk ? 0.45 : f.body.crouched ? 0.48 : 1) : 0,
        airborne,
        crouched: f.body.crouched,
      })
    : 0.0015 *
      combatSpread(h.sprayCount + 1, moving, airborne, f.body.crouched) *
      (d.spread ?? 1) *
      (aimed && (optic || d.pellets || d.handgun) ? COMBAT.aimSpread : 1);
  // Ammo Efficiency: a server-rolled chance that this shot keeps its round.
  const free =
    perkOn(tabletOf(f.kit), "ammo-efficiency") &&
    hash32(f.seat * 7 + 1, tick, g.mag) % 1000 < PERK_EFFECT.freeShotChance * 1000;
  if (!free) g.mag--;
  f.kitVersion++;
  h.lastShotAt = now;
  if (d.semi) h.trigger = true;
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
    const k = (muzzle?.recoilScale ?? 1) * (d.recoil ?? 1);
    h.recoilPitch += (p.recoilPitch - h.recoilPitch) * k;
    h.recoilYaw += (p.recoilYaw - h.recoilYaw) * k;
    h.sprayCount = p.sprayCount;
  }
  const origin = { x: f.body.x, y: f.body.y + eyeHeight(f.body), z: f.body.z };
  const back = now - Math.min(COMBAT.maxRewindMs, Math.max(0, input.playbackMs ?? 0));
  /** One ray: the first wall and the nearest hit volume in front of it. */
  const trace = (ry: number, rp: number) => {
    const dir = {
      x: -Math.sin(ry) * Math.cos(rp),
      y: Math.sin(rp),
      z: -Math.cos(ry) * Math.cos(rp),
    };
    const wallHit = world.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, d.rangeM);
    const wall = wallHit?.distance ?? Infinity;
    let best: { t: Fighter; zone: HitZone; distance: number } | null = null;
    for (const t of fighters) {
      if (t === f || t.dead || t.body.phase === "plane") continue;
      const dx = t.body.x - origin.x,
        dz = t.body.z - origin.z;
      if (dx * dx + dz * dz > (d.rangeM + 5) ** 2) continue;
      const pose = history.at(t.seat, back, t.body);
      for (const [zone, v] of Object.entries(combatVolumes(pose)) as Array<
        [
          HitZone,
          {
            center: { x: number; y: number; z: number };
            size: { x: number; y: number; z: number };
          },
        ]
      >) {
        const distance = rayBox(origin, dir, v.center, v.size);
        if (distance < wall && distance <= d.rangeM && (!best || distance < best.distance))
          best = { t, zone, distance };
      }
    }
    return { dir, wallHit, wall, best };
  };
  // Shotguns fire a ring of pellets round the aim (deterministic from the tick); other guns one.
  const count = d.pellets?.count ?? 1;
  const rays: Array<ReturnType<typeof trace>> = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      rays.push(trace(yaw, pitch));
      continue;
    }
    const ph = hash32(f.seat * 31 + i, tick, g.mag);
    const a = ((ph % 1000) / 1000) * Math.PI * 2,
      r = d.pellets!.spread * (aimed ? 0.8 : 1) * Math.sqrt(((ph >>> 10) % 1000) / 1000 + 0.15);
    rays.push(trace(yaw + Math.cos(a) * r, pitch + Math.sin(a) * r));
  }
  const centre = rays[0]!;
  const events: ShotEvent[] = [];
  const shot: ShotEvent = {
    type: "shot",
    seat: f.seat,
    gun: d.model,
    origin: [r3(origin.x), r3(origin.y), r3(origin.z)],
    dir: [r3(centre.dir.x), r3(centre.dir.y), r3(centre.dir.z)],
    hearM: Math.round(d.hearM * (muzzle?.hearScale ?? 1)),
    silenced: g.muzzle === "silencer",
    flash: !muzzle?.hideFlash,
  };
  events.push(shot);
  const at = (ray: ReturnType<typeof trace>, distance: number): [number, number, number] => [
    r3(origin.x + ray.dir.x * distance),
    r3(origin.y + ray.dir.y * distance),
    r3(origin.z + ray.dir.z * distance),
  ];
  if (!centre.best && Number.isFinite(centre.wall)) shot.impact = at(centre, centre.wall);
  // Damage per target: pellets add up into one hit event (zone: the worst hit).
  const ZONE_RANK: Record<HitZone, number> = { head: 3, chest: 2, stomach: 1, legs: 0 };
  const hits = new Map<
    Fighter,
    { zone: HitZone; damage: number; broke: string[]; point: [number, number, number] }
  >();
  for (const ray of rays) {
    if (!ray.best) {
      const v = (ray.wallHit as { vehicle?: number } | null)?.vehicle;
      if (v !== undefined) onVehicle?.(v, d.damage.chest);
      continue;
    }
    const { t, zone, distance } = ray.best;
    if (t.dead) continue;
    const fall = d.falloff
      ? 1 -
        (1 - d.falloff.min) *
          Math.min(1, Math.max(0, (distance - d.falloff.from) / (d.falloff.to - d.falloff.from)))
      : 1;
    const result = applyBrDamage(t.kit.armour, d, zone, {
      damage: (perkOn(tabletOf(f.kit), "deadly-bullets") ? PERK_EFFECT.damage : 1) * fall,
      wear: perkOn(tabletOf(t.kit), "armor-specialist") ? PERK_EFFECT.armorWear : 1,
    });
    f.damage += Math.min(t.kit.hp, result.damage);
    t.kit.hp = Math.max(0, t.kit.hp - result.damage);
    t.kitVersion++;
    if (t.hands.heal) t.hands.heal = null; // damage interrupts healing
    const point = at(ray, distance);
    if (ray === centre) shot.impact = point;
    const sum = hits.get(t);
    if (!sum) hits.set(t, { zone, damage: result.damage, broke: [...result.broke], point });
    else {
      sum.damage += result.damage;
      sum.broke.push(...result.broke);
      if (ZONE_RANK[zone] > ZONE_RANK[sum.zone]) sum.zone = zone;
    }
    if (t.kit.hp <= 0) t.dead = true;
  }
  if (!shot.impact) {
    const first = rays.find((r) => r.best) ?? centre;
    if (first.best) shot.impact = at(first, first.best.distance);
  }
  for (const [t, sum] of hits) {
    events.push({
      type: "hit",
      seat: f.seat,
      victim: t.seat,
      zone: sum.zone,
      damage: sum.damage,
      broke: sum.broke as DamageResult["broke"],
      point: sum.point,
    });
    if (t.kit.hp <= 0) {
      f.kills++;
      events.push({ type: "elim", seat: t.seat, by: f.seat, gun: d.model });
      onElim(t, f);
    }
  }
  return events;
}
