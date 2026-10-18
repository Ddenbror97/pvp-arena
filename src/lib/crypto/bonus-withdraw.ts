import { formatUsd } from "@/lib/jackpot/math";

/** Snapshot from crypto_my_activity.withdraw (server-computed cash-out room). */
export type WithdrawCashSnapshot = {
  room_cents: number;
  bonus_cents: number;
  deposit_cents: number;
  deposit_floor_cents: number;
};

export function parseWithdrawCashSnapshot(raw: unknown): WithdrawCashSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const room = Number(row["room_cents"] ?? 0);
  const bonus = Number(row["bonus_cents"] ?? 0);
  const deposits = Number(row["deposit_cents"] ?? 0);
  const floor = Number(row["deposit_floor_cents"] ?? 2000);
  if (![room, bonus, deposits, floor].every((n) => Number.isFinite(n) && n >= 0)) return null;
  return {
    room_cents: Math.floor(room),
    bonus_cents: Math.floor(bonus),
    deposit_cents: Math.floor(deposits),
    deposit_floor_cents: Math.floor(floor) || 2000,
  };
}

/** User-facing copy when promo/bonus balance cannot be cashed out yet. */
export function bonusWithdrawBlockedMessage(
  snap: WithdrawCashSnapshot,
  amountCents?: number,
): string {
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
