import { formatUsd } from "@/lib/jackpot/math";
import {
  bonusWithdrawBlockedMessage,
  depositWagerBlockedMessage,
  depositWagerShortfall,
  type WithdrawCashSnapshot,
} from "@/lib/crypto/bonus-withdraw";

export function BonusCashoutNotice({
  snap,
  availableCents,
}: {
  snap: WithdrawCashSnapshot;
  availableCents: number;
}) {
  if (depositWagerShortfall(snap) > 0) {
    return (
      <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs leading-snug text-muted-foreground">
        <span className="font-semibold text-foreground">Wager half of your deposits first. </span>
        {depositWagerBlockedMessage(snap)}
      </p>
    );
  }
  if (snap.room_cents >= availableCents || snap.bonus_cents <= 0) return null;
  if (snap.deposit_cents >= snap.deposit_floor_cents && snap.room_cents > 0) return null;
  return (
    <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs leading-snug text-muted-foreground">
      <span className="font-semibold text-foreground">Bonus balance — not withdrawable yet. </span>
      {bonusWithdrawBlockedMessage(snap)}
    </p>
  );
}

export function cashoutMaxCents(
  availableCents: number,
  heldCents: number,
  snap: WithdrawCashSnapshot | null,
): number {
  const afterHold = Math.max(0, availableCents - heldCents);
  if (!snap) return afterHold;
  return Math.min(afterHold, Math.max(0, snap.room_cents));
}

export function cashoutMaxLabel(snap: WithdrawCashSnapshot | null, maxCents: number): string | null {
  if (!snap) return null;
  if (depositWagerShortfall(snap) > 0) return depositWagerBlockedMessage(snap);
  if (snap.room_cents >= maxCents) return null;
  return `Up to ${formatUsd(maxCents)} can be cashed out now (${formatUsd(snap.bonus_cents)} is bonus until you deposit ${formatUsd(snap.deposit_floor_cents)}).`;
}
