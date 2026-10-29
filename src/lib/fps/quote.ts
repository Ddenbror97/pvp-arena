/** USD minor units, identical 500-basis-point floor rounding to the game ledger. */
export function duelQuote(stake: number) {
  if (!Number.isSafeInteger(stake) || stake < 0 || stake > 5000) throw new Error("INVALID_STAKE");
  const pot = stake * 2;
  const fee = Math.floor((pot * 500) / 10_000);
  return { stake, pot, fee, payout: pot - fee };
}

export const duelMoney = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export type DuelView = {
  id: string;
  status: string;
  creator_id: string;
  opponent_id: string | null;
  stake: number;
  best_of: 5 | 9;
  private: boolean;
  expires_at: string;
  invite?: string | null;
  rematch_id?: string | null;
  winner_id?: string | null;
  score_a?: number;
  score_b?: number;
  payout_amount?: number | null;
  fee_amount?: number | null;
};

export type DuelLobbyData = {
  enabled: boolean;
  cash_enabled: boolean;
  practice_allowed: boolean;
  stakes: number[];
  open: Array<DuelView & { username: string }>;
  live?: Array<DuelView & { username: string }>;
  mine?: DuelView | null;
};
