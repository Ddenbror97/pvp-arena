import type { Player, Weapon } from "./protocol";
export const COMBAT_VERSION = 2 as const;
export type HitZone = "head" | "chest" | "stomach" | "legs";
export const HIT_DAMAGE = {
  rifle: { head: 34, chest: 34, stomach: 30, legs: 20 },
  pistol: { head: 34, chest: 25, stomach: 22, legs: 15 },
} as const;
/**
 * Seat rifles: Police (A) carry the suppressed M4A1-S, Terrorists (B) the AK-47. Both use the
 * one `rifle` damage table, fire rate, magazine, recoil pattern and vest rule above.
 *
 * Balance (2026-11-01): in CS2 the AK-47 (36 dmg, 77.5% armour penetration, ×4 head, 30
 * rounds) and M4A1-S (38 dmg, 70% penetration, ×3.475 head, 20 rounds, more accurate, quieter)
 * trade per-bullet numbers so armoured body shots-to-kill come out equal (4 / 5 / 6 at
 * 100 / 125 / 150 HP); CS balances the rest through price, side and map. A 1v1 duel with fixed
 * seats has none of those levers: porting CS's per-bullet ratios to this table (36/36/32/21 at
 * 70%) changes the hits-to-kill of 154 of 1,064 hit sequences, almost all in the M4's favour
 * (tests/fps-weapon-balance.test.ts). So the M4 is identical in damage, and only its
 * presentation (model, suppressed report, casings, reloads) differs.
 */
export const SEAT_RIFLE = { A: "M4A1-S", B: "AK-47" } as const;

/** CS-style vest penetration, applied to this game's existing damage tuning.
 * Headshots take three hits at full health; legs bypass the vest. */
export function applyVestDamage(target: Player, weapon: Weapon, zone: HitZone): number {
  const base = HIT_DAMAGE[weapon][zone];
  if (zone === "head" || zone === "legs" || !(target.armor! > 0)) return base;
  const blocked = Math.min(base * (1 - 0.775), target.armor! * 2);
  target.armor = Math.max(0, target.armor! - blocked / 2);
  return Math.floor(base - blocked);
}
/** Original, learnable angular pattern: initial climb, then alternating lateral sweeps.
 * Inspired by CS:GO's tap/burst/spray distinction; these are this game's tuning values. */
const AK_PATTERN = [
  [0, 0],
  [0.65, 0.03],
  [1.4, -0.06],
  [2.2, 0.08],
  [3.1, 0.12],
  [4.1, -0.08],
  [5.15, -0.28],
  [6.2, -0.5],
  [7.1, -0.25],
  [7.9, 0.25],
  [8.6, 0.95],
  [9.1, 1.65],
  [9.5, 2.05],
  [9.8, 1.45],
  [10.0, 0.55],
  [10.15, -0.55],
  [10.3, -1.75],
  [10.4, -2.7],
  [10.5, -3.35],
  [10.6, -3.05],
  [10.65, -2.25],
  [10.7, -1.05],
  [10.75, 0.35],
  [10.8, 1.7],
  [10.85, 2.7],
  [10.9, 3.45],
  [10.95, 3.05],
  [11.0, 2.05],
  [11.05, 0.75],
  [11.1, -0.6],
  [11.15, -1.8],
] as const;
const rad = Math.PI / 180;
export function sprayOffset(weapon: Weapon, shots: number) {
  const n = Math.max(0, Math.min(30, Math.floor(shots)));
  const [pitch, yaw] = weapon === "rifle" ? AK_PATTERN[n]! : [Math.min(n, 5) * 0.6, 0];
  return { pitch: pitch! * rad, yaw: yaw! * rad };
}
/** Valve describes separate initial/final recovery: bursts settle sooner than a long spray.
 * https://blog.counter-strike.net/second-shot/ */
export function recoveryProfile(shots: number) {
  const long = Math.min(1, Math.max(0, (shots - 3) / 12));
  return { delayMs: 130 + long * 50, rate: 18 - long * 10, resetMs: 280 + long * 370 };
}
export function recoverCombatRecoil(p: Player, now: number) {
  const profile = recoveryProfile(p.sprayCount ?? 0),
    previous = p.recoilUpdatedAt ?? now;
  const elapsed = Math.max(0, now - Math.max(previous, p.lastShotAt + profile.delayMs));
  const factor = Math.exp((-profile.rate * elapsed) / 1000);
  p.recoilPitch = (p.recoilPitch ?? 0) * factor;
  p.recoilYaw = (p.recoilYaw ?? 0) * factor;
  p.recoilUpdatedAt = now;
  if (now - p.lastShotAt >= profile.resetMs) {
    p.recoilPitch = 0;
    p.recoilYaw = 0;
    p.sprayCount = 0;
  }
}
export function advanceCombatRecoil(p: Player) {
  const count = p.sprayCount ?? 0,
    before = sprayOffset(p.weapon, count),
    after = sprayOffset(p.weapon, count + 1);
  p.recoilPitch = Math.max(0, Math.min(0.24, (p.recoilPitch ?? 0) + after.pitch - before.pitch));
  p.recoilYaw = Math.max(-0.08, Math.min(0.08, (p.recoilYaw ?? 0) + after.yaw - before.yaw));
  p.sprayCount = Math.min(30, count + 1);
}
export function combatSpread(shots: number, moving: boolean, airborne: boolean, crouched: boolean) {
  return (
    (1 + Math.min(24, Math.max(0, shots - 1)) * 0.08) *
    (airborne ? 6 : moving ? 2.8 : 1) *
    (crouched ? 0.75 : 1)
  );
}
