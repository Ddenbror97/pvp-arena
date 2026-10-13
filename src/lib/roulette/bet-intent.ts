export type BetIntent = { key: string; color: string; amount: number };

/** Reuse the key for the same wager so a retry cannot create a second bet. */
export function betIntentFor(
  current: BetIntent | null,
  color: string,
  amount: number,
  newKey: () => string,
): BetIntent {
  if (current && current.color === color && current.amount === amount) return current;
  return { key: newKey(), color, amount };
}
