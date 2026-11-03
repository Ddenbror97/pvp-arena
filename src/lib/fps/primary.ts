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
export type Primary = "rifle" | "awp";
export const PRIMARIES: readonly Primary[] = ["rifle", "awp"];

export const AWP = {
  name: "AWP",
  damage: { head: 459, chest: 115, stomach: 143, legs: 85 } satisfies Record<HitZone, number>,
  armorPenetration: 0.975,
  magazine: 10,
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

/** Magazine size of a player's current primary (the rifle's is passed in to avoid a cycle). */
export function primaryMagazine(p: Pick<Player, "primary">, rifleMagazine: number) {
  return primaryOf(p) === "awp" ? AWP.magazine : rifleMagazine;
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
  const blocked = Math.min(base * (1 - AWP.armorPenetration), target.armor! * 2);
  target.armor = Math.max(0, target.armor! - blocked / 2);
  return Math.floor(base - blocked);
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
