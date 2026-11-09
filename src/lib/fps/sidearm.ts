import type { HitZone } from "./combat";

/**
 * The sidearm slot (2026-11-09): the Desert Eagle. Given to both players in 1v1 (CS's pistol
 * round habit: everyone carries one) and bought from the spawn menu (B) in 5v5, where it is kept
 * through rounds like the AWP. The server owns it, its magazine and reserve (Player.sidearm*).
 *
 * CS2 / CS:GO values (Counter-Strike wiki, csdb.gg, 2026-11-09):
 *  - damage 53, armour penetration 93.2 %, head ×3.9, stomach ×1.25, legs ×0.75: head 206,
 *    chest 53, stomach 66, legs 39 unarmoured; chest 49 and stomach 61 against a vest (the
 *    wiki's armoured figures; its unarmoured 205 / 52 / 65 include a little range fall-off,
 *    left out here like the rifles'). No helmets here, so a headshot is always 206: one tap,
 *    as in CS against a bare head;
 *  - 267 rounds per minute (225 ms), semi-automatic (one shot per trigger pull); 7 / 35 rounds;
 *  - recoil magnitude 48.2 (the AK's 30) and a 0.81 s standing recovery (combat.ts "deagle"):
 *    a big kick per shot that stacks when tapped fast; spread jumps after every shot;
 *  - reload: CS's 2.17 s; here 1.9 s, the length the overhand-rack clip is posed for
 *    (deagle-animation.ts);
 *  - the range modifier (0.85 per 500 u) is left out like the rifles'.
 */
export type Sidearm = "deagle";

export const DEAGLE = {
  name: "Desert Eagle",
  damage: { head: 206, chest: 53, stomach: 66, legs: 39 } satisfies Record<HitZone, number>,
  base: 53,
  armorPenetration: 0.932,
  magazine: 7,
  reserve: 35,
  cycleMs: 225,
  reloadMs: 1900,
  spread: { base: 0.0012, bloom: 0.55, moving: 4.5, airborne: 8, crouchScale: 0.75 },
} as const;

/** The Deagle's cone for one shot (radians): accurate first shot, heavy bloom, poor on the move. */
export function deagleSpread(shots: number, moving: boolean, airborne: boolean, crouched: boolean) {
  const s = DEAGLE.spread;
  return (
    s.base *
    (1 + Math.min(6, Math.max(0, shots - 1)) * s.bloom) *
    (airborne ? s.airborne : moving ? s.moving : 1) *
    (crouched ? s.crouchScale : 1)
  );
}

/** Give the player a fresh Deagle (7 / 35). */
export function giveDeagle(p: {
  sidearm?: Sidearm;
  sidearmAmmo?: number;
  sidearmReserve?: number;
}) {
  p.sidearm = "deagle";
  p.sidearmAmmo = DEAGLE.magazine;
  p.sidearmReserve = DEAGLE.reserve;
}
