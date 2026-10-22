import { winLevel, type WinLevel } from "./hits";

/**
 * Presentation only. Tiers describe how a resolved spin is shown.
 * They read the score the server already stored and never change it.
 *
 * 75 and 250 are the existing big-win and mega-win bands in `winLevel`.
 * Line hits under 20 stay small (a short common run). Longer runs are medium.
 */
export type FxTier = "none" | "small" | "medium" | "large" | "exceptional";

export function fxTier(lineScore: number, bonus: boolean): FxTier {
  const level = winLevel(lineScore, bonus);
  if (level >= 3) return "exceptional";
  if (level >= 2) return "large";
  if (level === 1) return lineScore >= 20 ? "medium" : "small";
  return "none";
}

/** Legacy intensity used by shake and the older hit audio. */
export function tierLevel(tier: FxTier): WinLevel {
  if (tier === "exceptional") return 3;
  if (tier === "large") return 2;
  if (tier === "medium" || tier === "small") return 1;
  return 0;
}

/** Six accents, one per spin in the cycle. The cycle repeats; it does not escalate. */
const SPIN_ACCENTS = [
  "168 120 255",
  "74 168 255",
  "255 207 74",
  "255 90 209",
  "125 255 106",
  "63 224 255",
] as const;

export function spinAccent(spinNo: number): string {
  const i = Math.abs(Math.trunc(spinNo)) % SPIN_ACCENTS.length;
  return SPIN_ACCENTS[i]!;
}

/** Four stop timbres. The reel still stops on the same clock. */
export function stopVariant(spinNo: number, reel: number): number {
  return (Math.abs(Math.trunc(spinNo)) * 3 + reel * 5) % 4;
}

/** 1-based index of this player's spin. Seats alternate, A on the odd numbers. */
export function playerSpinIndex(spinNo: number): number {
  return Math.ceil(spinNo / 2);
}

/** The last of the scheduled spins for that seat. Sudden-death spins are later. */
export function isBaseFinalSpin(spinNo: number, perSeat: number): boolean {
  if (perSeat <= 0 || spinNo <= 0) return false;
  return spinNo <= perSeat * 2 && playerSpinIndex(spinNo) === perSeat;
}

export function prefersReducedMotion(): boolean {
  if (typeof globalThis.matchMedia !== "function") return false;
  return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
