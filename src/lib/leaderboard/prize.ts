/** Integer cents. The server recomputes this; the wizard uses it only for preview. */

export const LEADERBOARD_PRIZE_MIN_CENTS = 100;
export const LEADERBOARD_PRIZE_MAX_CENTS = 150_000;

export function prizePoolAllowed(pool: number | null, capCents = LEADERBOARD_PRIZE_MAX_CENTS): boolean {
  if (pool == null) return false;
  const cap = Math.min(capCents, LEADERBOARD_PRIZE_MAX_CENTS);
  return pool >= LEADERBOARD_PRIZE_MIN_CENTS && pool <= cap;
}

export type PrizeTier = {
  rank_start: number;
  rank_end: number;
  reward_cents: number;
};

export function prizePoolCents(tiers: PrizeTier[]): number | null {
  if (tiers.length < 1) return null;
  const sorted = [...tiers].sort((a, b) => a.rank_start - b.rank_start);
  let pool = 0;
  let previousEnd = 0;
  for (const tier of sorted) {
    if (
      !Number.isInteger(tier.rank_start) ||
      !Number.isInteger(tier.rank_end) ||
      !Number.isInteger(tier.reward_cents)
    )
      return null;
    if (tier.rank_start < 1 || tier.rank_end < tier.rank_start || tier.rank_end > 1000) return null;
    if (tier.reward_cents <= 0 || tier.reward_cents > 10_000_000_000) return null;
    if (tier.rank_start <= previousEnd) return null;
    const span = tier.rank_end - tier.rank_start + 1;
    pool += tier.reward_cents * span;
    if (!Number.isSafeInteger(pool)) return null;
    previousEnd = tier.rank_end;
  }
  return pool > 0 ? pool : null;
}
