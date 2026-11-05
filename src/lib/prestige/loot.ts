export type LootTier = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** Reveal strength for a paid amount (cents). Tiers describe the prize, never the odds of the next open. */
export function lootTier(cents: number): LootTier {
  if (cents >= 10000) return "legendary";
  if (cents >= 2000) return "epic";
  if (cents >= 500) return "rare";
  if (cents >= 200) return "uncommon";
  return "common";
}
