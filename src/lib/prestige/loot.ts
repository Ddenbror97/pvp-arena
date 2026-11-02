import type { LootOdd } from "./api";

export type LootTier = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Reveal strength for a paid amount (cents). Tiers describe the prize, never the odds of the next open. */
export function lootTier(cents: number): LootTier {
  if (cents >= 10000) return "legendary";
  if (cents >= 2000) return "epic";
  if (cents >= 500) return "rare";
  if (cents >= 200) return "uncommon";
  return "common";
}

export function oddsTotal(odds: LootOdd[]): number {
  return odds.reduce((s, o) => s + o.weight, 0);
}

/** Exact chance as a percentage with up to two decimals; never rounds a real chance down to 0. */
export function formatChance(weight: number, total: number): string {
  if (total <= 0 || weight <= 0) return "0%";
  const pct = (weight / total) * 100;
  const shown = Math.max(Number(pct.toFixed(2)), 0.01);
  return `${shown.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}
