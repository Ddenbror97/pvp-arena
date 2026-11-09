import type { HitZone } from "./combat";
import type { Player } from "./protocol";

/**
 * Primary weapons. The primary slot (input weapon "rifle") holds either the side's rifle (Police
 * M4A1-S / Terrorist AK-47, one shared table) or the AWP, bought at spawn (buy.ts). The server
 * owns which one a player holds (`Player.primary`), its ammunition, the bolt cycle and the scope.
 *
 * AWP values are CS:GO's (weapon script / community references, 2026-11-03):
 *  - damage 115, armour penetration 97.5 %, hit groups head ×4, stomach ×1.25, legs ×0.75:
 *    459 / 115 / 143 / 85 unarmoured, 448 / 112 / 140 / 85 against a vest and helmet;
 *  - 41 rounds per minute (cycle 1.463 s), 10 + 30 rounds, reload 3.67 s;
 *  - movement 200 u/s unscoped, 100 u/s scoped (rifles 215–225, knife 250);
 *  - a single 4× zoom here (CS:GO has two, 40° and 10°; the owner asked for one 4× level);
 *  - shot after shot unzooms; zoom resumes after the bolt is cycled if the player still holds it;
 *  - unscoped ("no-scope") shots are very inaccurate, scoped standing shots near-perfect, and
 *    scoped accuracy is lost above ~34 % of the weapon's full speed (walking stays accurate).
 * Distances here are metres; the CS:GO range modifier (0.99 per 500 u) is left out like the
 * rifle's, so damage does not fall off inside these maps.
 */
export type Primary = "rifle" | "awp" | "mp5";

export const AWP = {
  name: "AWP",
  damage: { head: 459, chest: 115, stomach: 143, legs: 85 } satisfies Record<HitZone, number>,
  armorPenetration: 0.975,
  magazine: 5,
  reserve: 30,
  /** Bolt cycle: 60 000 / 41 rpm. No shot, and no zoom, until it completes. */
  cycleMs: 1463,
  reloadMs: 3670,
  /** Player speed relative to the rifles' MOVE_SPEED (CS: 200 / 215 and 100 / 215). */
  moveScale: 200 / 215,
  scopedMoveScale: 100 / 215,
  /** True 4× angular magnification of the camera's field of view (client only). */
  zoom: 4,
  /** Zooming in is not instant: shots in the first moments still use the unscoped cone. */
  scopeSettleMs: 120,
  /** Accuracy cones (radians, half-width of the square spread used by every primary). */
  spread: {
    unscoped: 0.085,
    scoped: 0.0006,
    /** Added when moving faster than `accurateSpeed` of full speed (scaled up to running). */
    moving: 0.06,
    airborne: 0.12,
    crouchScale: 0.75,
  },
  /** CS:GO's accurate-movement threshold: 34 % of the weapon's maximum speed. */
  accurateSpeed: 0.34,
} as const;

export const primaryOf = (p: Pick<Player, "primary">): Primary => p.primary ?? "rifle";

/**
 * The MP5 (bought from the spawn menu, 2026-11-09). CS2's MP5-SD (weapon script / community
 * references: csdb.gg, metabot.gg, 2026-11-09):
 *  - damage 28, armour penetration 62.5 %, head ×4, stomach ×1.25, legs ×0.75:
 *    112 / 28 / 35 / 21 unarmoured; against a vest chest 17, stomach 21 (head and legs bypass
 *    it here: there are no helmets);
 *  - 750 rounds per minute (80 ms), 30 / 120 rounds; recoil magnitude 16 (the AK's 30): the
 *    rifle's spray shape at 16/30 (combat.ts "mp5");
 *  - reload: CS's 3.13 s against the AK's 2.43 s, on this game's 1.8 s rifle reload → 2.3 s;
 *  - the range modifier (0.87 per 500 u) is left out like the rifles', and the SMG's accuracy
 *    on the move (CS moving inaccuracy 0.030, the AK's 0.2) is kept: walking and running cost
 *    the MP5 much less than a rifle.
 */
export const MP5 = {
  name: "MP5",
  damage: { head: 112, chest: 28, stomach: 35, legs: 21 } satisfies Record<HitZone, number>,
  base: 28,
  armorPenetration: 0.625,
  magazine: 30,
  reserve: 120,
  cycleMs: 80,
  reloadMs: 2300,
  spread: { base: 0.0018, bloom: 0.06, moving: 1.6, airborne: 5, crouchScale: 0.75 },
} as const;

/**
 * CS-style damage through a vest for a gun with its own table and penetration: CS applies the
 * vest to the unrounded hit-group damage (base × 1.25 on the stomach) and truncates, so the
 * armoured numbers match the game's (Deagle 49 / 61, MP5 17 / 21); head and legs are not
 * covered (no helmets here).
 */
export function vestDamage(
  target: Player,
  zone: HitZone,
  gun: { damage: Record<HitZone, number>; base: number; armorPenetration: number },
): number {
  const full = gun.damage[zone];
  if (zone === "head" || zone === "legs" || !(target.armor! > 0)) return full;
  const raw = gun.base * (zone === "stomach" ? 1.25 : 1);
  const blocked = Math.min(raw * (1 - gun.armorPenetration), target.armor! * 2);
  target.armor = Math.max(0, target.armor! - blocked / 2);
  return Math.floor(raw - blocked + 1e-9);
}

/**
 * When the MP5's next shot is due. Its 80 ms cycle is shorter than three 33.3 ms server ticks,
 * so a held trigger keeps the schedule (shot k at k × 80 ms, taken on the first tick at or after
 * it) instead of restarting it from the tick that fired: about 750 rpm, as in CS, not the 600 a
 * tick-rounded cycle would give. A fresh pull starts a new schedule.
 */
export function mp5ShotAt(lastShotAt: number, now: number, tickMs: number) {
  return now - lastShotAt < MP5.cycleMs + tickMs ? lastShotAt + MP5.cycleMs : now;
}

/** The MP5's cone for one shot (radians), like the rifles' but kinder on the move. */
export function mp5Spread(shots: number, moving: boolean, airborne: boolean, crouched: boolean) {
  const s = MP5.spread;
  return (
    s.base *
    (1 + Math.min(24, Math.max(0, shots - 1)) * s.bloom) *
    (airborne ? s.airborne : moving ? s.moving : 1) *
    (crouched ? s.crouchScale : 1)
  );
}

/**
 * Movement speed multiplier from the held weapon (knife and rifle 1, AWP slower, scoped AWP
 * half again). Shared by the server step and client prediction through `predictMovement`.
 */
export function weaponMoveScale(p: Pick<Player, "primary" | "weapon" | "scoped">) {
  if (p.weapon !== "rifle" || primaryOf(p) !== "awp") return 1;
  return p.scoped ? AWP.scopedMoveScale : AWP.moveScale;
}

/**
 * The AWP's accuracy cone for one shot. `speedFraction` is the intended horizontal speed as a
 * share of the AWP's own unscoped maximum (0 standing, ~0.45 walking, 1 running).
 */
export function awpSpread(options: {
  scoped: boolean;
  speedFraction: number;
  airborne: boolean;
  crouched: boolean;
}) {
  const s = AWP.spread;
  let cone = options.scoped ? s.scoped : s.unscoped;
  if (options.speedFraction > AWP.accurateSpeed)
    cone += s.moving * Math.min(1, (options.speedFraction - AWP.accurateSpeed) / 0.3);
  if (options.airborne) cone += s.airborne;
  return cone * (options.crouched ? s.crouchScale : 1);
}

/** Intended speed as a share of the AWP's unscoped maximum, from one input. */
export function awpSpeedFraction(
  input: { forward: number; strafe: number; walk?: boolean | undefined },
  p: Pick<Player, "crouched" | "scoped">,
) {
  if (Math.hypot(input.forward, input.strafe) <= 0.1) return 0;
  const gait = input.walk ? 0.45 : p.crouched ? 0.48 : 1;
  return gait * (p.scoped ? AWP.scopedMoveScale / AWP.moveScale : 1);
}

/** AWP damage after the vest (head and legs are not covered, as for the rifles). */
export function awpDamage(target: Player, zone: HitZone): number {
  const base = AWP.damage[zone];
  if (zone === "head" || zone === "legs" || !(target.armor! > 0)) return base;
  // CS applies the vest to the unrounded hitbox damage (115 × 1.25 = 143.75 on the stomach), so
  // the armoured hits are chest 112 and stomach 140, as in CS:GO.
  const raw = 115 * (zone === "stomach" ? 1.25 : 1);
  const blocked = Math.min(raw * (1 - AWP.armorPenetration), target.armor! * 2);
  target.armor = Math.max(0, target.armor! - blocked / 2);
  return Math.round(raw - blocked);
}

/**
 * Server scope state for one accepted input: zoomed only with the AWP drawn, not reloading and
 * not while the bolt is being cycled (the zoom resumes afterwards if the player still holds it).
 * Returns true when the zoom state changed.
 */
export function updateScope(p: Player, wanted: boolean, now: number): boolean {
  const allowed =
    wanted &&
    p.hp > 0 &&
    p.weapon === "rifle" &&
    primaryOf(p) === "awp" &&
    !p.reloadUntil &&
    now - p.lastShotAt >= AWP.cycleMs;
  if (allowed === !!p.scoped) return false;
  if (allowed) {
    p.scoped = true;
    p.scopedAt = now;
  } else {
    delete p.scoped;
    delete p.scopedAt;
  }
  return true;
}

/** Scoped long enough for the scoped cone (quick-scopes earlier than this are no-scopes). */
export const scopeSettled = (p: Pick<Player, "scoped" | "scopedAt">, now: number) =>
  !!p.scoped && now - (p.scopedAt ?? now) >= AWP.scopeSettleMs;
