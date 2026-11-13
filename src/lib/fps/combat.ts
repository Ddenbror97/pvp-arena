import type { KnifeAttack, Player, Weapon } from "./protocol";
export const COMBAT_VERSION = 2 as const;
export type HitZone = "head" | "chest" | "stomach" | "legs";
export const HIT_DAMAGE = {
  rifle: { head: 34, chest: 34, stomach: 30, legs: 20 },
} as const;

/**
 * Karambit (secondary slot; it replaced the pistol). Server-authoritative: the server alone
 * decides when a swing is allowed (draw time, cooldown), what it reaches and what it does; the
 * first-person animation never sets the clock. Values follow CS2's knife table (slash 40 /
 * backstab 90, stab 65 / backstab 180; no hit-zone multiplier; vests absorb 15%).
 *
 * Reach is measured from the eye to the target's hit volume; each attack sweeps a small fan of
 * traces (yaw, pitch offsets in radians) so a swing does not need pixel aim, and world geometry
 * in front of the volume blocks it.
 */
export const KNIFE = {
  /** Draw time after switching to the knife before the first swing. */
  drawMs: 450,
  slash: {
    range: 1.6,
    cooldownMs: 420,
    damage: 40,
    backstab: 90,
    fan: [
      [0, 0],
      [-0.14, 0],
      [0.14, 0],
      [-0.28, 0.03],
      [0.28, -0.03],
      [0, 0.08],
      [0, -0.08],
    ],
  },
  stab: {
    range: 1.3,
    cooldownMs: 1000,
    damage: 65,
    backstab: 180,
    fan: [
      [0, 0],
      [-0.08, 0],
      [0.08, 0],
      [0, 0.05],
      [0, -0.05],
    ],
  },
  /** Share of the damage a vest stops (CS2 knife armour ratio 0.85). */
  vestBlock: 0.15,
  /** cos of the half-angle behind the victim that counts as a backstab (~±60°). */
  backstabCos: 0.5,
} as const satisfies Record<string, unknown>;

/** Damage of one knife hit after the vest; wears the vest like a bullet does. */
export function knifeDamage(target: Player, attack: KnifeAttack, backstab: boolean): number {
  const base = backstab ? KNIFE[attack].backstab : KNIFE[attack].damage;
  if (!(target.armor! > 0)) return base;
  const blocked = Math.min(base * KNIFE.vestBlock, target.armor! * 2);
  target.armor = Math.max(0, target.armor! - blocked / 2);
  return Math.floor(base - blocked);
}

/**
 * Backstab: the attacker stands behind the victim, judged from the victim's facing (yaw 0 faces
 * -z) and the horizontal line from the victim to the attacker.
 */
export function isBackstab(
  attacker: { x: number; z: number },
  victim: { x: number; z: number; yaw: number },
): boolean {
  const dx = attacker.x - victim.x,
    dz = attacker.z - victim.z,
    length = Math.hypot(dx, dz);
  if (length < 1e-6) return false;
  const facing = -Math.sin(victim.yaw) * dx - Math.cos(victim.yaw) * dz;
  return facing / length < -KNIFE.backstabCos;
}
/**
 * Side rifles: the Police side (A) carries the suppressed M4A1-S, the Terrorist side (B) the
 * AK-47 (sides swap at halftime; see sides.ts). Both use the
 * one `rifle` damage table, fire rate, magazine, recoil pattern and vest rule above.
 *
 * Balance (2026-11-01): in CS2 the AK-47 (36 dmg, 77.5% armour penetration, ×4 head, 30
 * rounds) and M4A1-S (38 dmg, 70% penetration, ×3.475 head, 20 rounds, more accurate, quieter)
 * trade per-bullet numbers so armoured body shots-to-kill come out equal (4 / 5 / 6 at
 * 100 / 125 / 150 HP); CS balances the rest through price, economy and map. A 1v1 duel has none
 * of those levers (halftime only splits the rounds evenly): porting CS's per-bullet ratios to this table (36/36/32/21 at
 * 70%) changes the hits-to-kill of 154 of 1,064 hit sequences, almost all in the M4's favour
 * (tests/fps-weapon-balance.test.ts). So the M4 is identical in damage, and only its
 * presentation (model, suppressed report, casings, reloads) differs.
 */
export const SIDE_RIFLE = { A: "M4A1-S", B: "AK-47" } as const;

/** CS-style vest penetration, applied to this game's existing damage tuning.
 * Headshots take three hits at full health; legs bypass the vest. */
export function applyVestDamage(target: Player, weapon: "rifle", zone: HitZone): number {
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

/**
 * Spray patterns. "rifle" is the AK/M4 table above; the MP5 and Desert Eagle (2026-11-09) take
 * their size from CS:GO's weapon scripts (recoil magnitude AK-47 30, MP5-SD 16, Desert Eagle
 * 48.2; standing recovery ≈ 0.37 s, 0.44 s and 0.81 s):
 *  - MP5: the AK's learnable shape at 16/30 of its climb and a softer side sway, recovering a
 *    little slower;
 *  - Deagle: a big near-vertical kick on every shot (≈ 1.6× the AK's per-shot climb) with a
 *    small alternating side flick, recovering in about twice the time, so fast taps stack.
 */
export type RecoilPattern = "rifle" | "mp5" | "deagle" | "spas12";
const MP5_PATTERN = AK_PATTERN.map(([p, y]) => [p * (16 / 30), y * 0.6] as const);
const DEAGLE_FLICK = [0, 0.3, -0.2, 0.4, -0.25, 0.35, -0.3, 0.2];
const DEAGLE_PATTERN = Array.from(
  { length: 31 },
  (_, n) => [Math.min(n, 12) * 1.3, DEAGLE_FLICK[n % DEAGLE_FLICK.length]!] as const,
);
/**
 * SPAS-12 (battle royale, 2026-11-13): a 12-gauge shove on every shell, about twice the
 * Deagle's climb for the first shots and levelling off (the gas action and the gun's 4.4 kg
 * soak up a long string), with a slow side wander.
 */
const SPAS12_FLICK = [0, 0.5, -0.35, 0.6, -0.5, 0.3, -0.25, 0.45];
const SPAS12_PATTERN = Array.from(
  { length: 31 },
  (_, n) => [Math.min(n, 6) * 2.4, SPAS12_FLICK[n % SPAS12_FLICK.length]!] as const,
);
const PATTERNS: Record<RecoilPattern, readonly (readonly [number, number])[]> = {
  rifle: AK_PATTERN,
  mp5: MP5_PATTERN,
  deagle: DEAGLE_PATTERN,
  spas12: SPAS12_PATTERN,
};
/** Recovery speed and the spray-reset delay relative to the rifles. */
const RECOVERY: Record<RecoilPattern, { rate: number; reset: number }> = {
  rifle: { rate: 1, reset: 1 },
  mp5: { rate: 0.84, reset: 1.2 },
  deagle: { rate: 0.45, reset: 2.2 },
  spas12: { rate: 0.5, reset: 2.0 },
};
/** The pattern a player's held gun sprays with (BR hands carry it explicitly). */
export function recoilPatternOf(p: {
  weapon?: string;
  primary?: string;
  recoilPattern?: RecoilPattern;
}): RecoilPattern {
  if (p.recoilPattern) return p.recoilPattern;
  if (p.weapon === "sidearm") return "deagle";
  if (p.weapon === "rifle" && p.primary === "mp5") return "mp5";
  if (p.weapon === "rifle" && p.primary === "spas12") return "spas12";
  return "rifle";
}
export function sprayOffset(weapon: Weapon | RecoilPattern, shots: number) {
  const n = Math.max(0, Math.min(30, Math.floor(shots)));
  const table =
    weapon === "rifle" || weapon === "mp5" || weapon === "deagle" || weapon === "spas12"
      ? PATTERNS[weapon]
      : null;
  const [pitch, yaw] = table ? table[n]! : [Math.min(n, 5) * 0.6, 0];
  return { pitch: pitch! * rad, yaw: yaw! * rad };
}
/** Valve describes separate initial/final recovery: bursts settle sooner than a long spray.
 * https://blog.counter-strike.net/second-shot/ */
export function recoveryProfile(shots: number, pattern: RecoilPattern = "rifle") {
  const long = Math.min(1, Math.max(0, (shots - 3) / 12));
  const r = RECOVERY[pattern];
  return {
    delayMs: 130 + long * 50,
    rate: (18 - long * 10) * r.rate,
    resetMs: (280 + long * 370) * r.reset,
  };
}
export function recoverCombatRecoil(p: Player, now: number) {
  const profile = recoveryProfile(p.sprayCount ?? 0, recoilPatternOf(p)),
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
  const pattern = recoilPatternOf(p);
  const count = p.sprayCount ?? 0,
    before = sprayOffset(pattern === "rifle" ? p.weapon : pattern, count),
    after = sprayOffset(pattern === "rifle" ? p.weapon : pattern, count + 1);
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
