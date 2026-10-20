import { formatUsd } from "@/lib/jackpot/math";

/** Snapshot from crypto_my_activity.withdraw (server-computed cash-out room). */
export type WithdrawCashSnapshot = {
  room_cents: number;
  bonus_cents: number;
  deposit_cents: number;
  deposit_floor_cents: number;
  wagered_cents: number;
  wager_required_cents: number;
};

export function parseWithdrawCashSnapshot(raw: unknown): WithdrawCashSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const room = Number(row["room_cents"] ?? 0);
  const bonus = Number(row["bonus_cents"] ?? 0);
  const deposits = Number(row["deposit_cents"] ?? 0);
  const floor = Number(row["deposit_floor_cents"] ?? 2000);
  const wagered = Number(row["wagered_cents"] ?? 0);
  const wagerRequired = Number(row["wager_required_cents"] ?? 0);
  if (![room, bonus, deposits, floor, wagered, wagerRequired].every((n) => Number.isFinite(n) && n >= 0))
    return null;
  return {
    room_cents: Math.floor(room),
    bonus_cents: Math.floor(bonus),
    deposit_cents: Math.floor(deposits),
    deposit_floor_cents: Math.floor(floor) || 2000,
    wagered_cents: Math.floor(wagered),
    wager_required_cents: Math.floor(wagerRequired),
  };
}

/** Dollars still to bet before a cashout is allowed. Half of deposits, rounded down to the cent. */
export function depositWagerShortfall(snap: WithdrawCashSnapshot): number {
  return Math.max(0, snap.wager_required_cents - snap.wagered_cents);
}

export function depositWagerBlockedMessage(snap: WithdrawCashSnapshot): string {
  const need = depositWagerShortfall(snap);
  return `Wager ${formatUsd(need)} more before cashout. Cashouts open after you have wagered half of what you deposited (${formatUsd(snap.wagered_cents)} of ${formatUsd(snap.wager_required_cents)} so far).`;
}

/** User-facing copy when promo/bonus balance cannot be cashed out yet. */
export function bonusWithdrawBlockedMessage(
  snap: WithdrawCashSnapshot,
  amountCents?: number,
): string {
  if (depositWagerShortfall(snap) > 0) return depositWagerBlockedMessage(snap);
  const floor = snap.deposit_floor_cents;
  const need = Math.max(0, floor - snap.deposit_cents);
  const amount = amountCents ?? snap.bonus_cents;
  if (snap.deposit_cents < floor && snap.bonus_cents > 0) {
    if (need > 0) {
      return `Your ${formatUsd(amount)} balance is mostly promo or bonus credit. Deposit at least ${formatUsd(floor)} on Base first (${formatUsd(need)} more than you have deposited so far). After that, bonus winnings can be withdrawn, subject to the ${formatUsd(floor)} minimum cashout.`;
    }
  }
  if (amountCents != null && amountCents > snap.room_cents) {
    return `You can withdraw up to ${formatUsd(snap.room_cents)} right now. ${formatUsd(amountCents - snap.room_cents)} is bonus credit that is not withdrawable yet.`;
  }
  return `Bonus credit cannot be withdrawn until you have deposited at least ${formatUsd(floor)} with crypto. Your playable balance is unchanged.`;
}

export const BONUS_NOT_WITHDRAWABLE_SHORT =
  "Bonus credit needs a crypto deposit before cashout. See the note under Withdraw for details.";
