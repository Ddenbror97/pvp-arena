import { formatUsd } from "@/lib/jackpot/math";

/** How long a just-requested cashout stays on the card before activity replaces it. */
export const WITHDRAWAL_FOLLOW_MS = 15 * 60 * 1000;
/** An open cashout older than this is left to the activity list. */
export const WITHDRAWAL_FRESH_MS = 2 * 60 * 60 * 1000;

export type WithdrawalNoticeRow = {
  id: string;
  status: string;
  usd_cents: number;
  asset: string;
  network: "bitcoin" | "base";
  at: string | null;
};

export type SubmittedWithdrawal = {
  usdCents: number;
  asset: string;
  network: "bitcoin" | "base";
  at: number;
};

export type WithdrawalNotice = {
  key: string;
  phase: "waiting" | "sent";
  title: string;
  body: string;
  amount: string | null;
};

const OPEN_BTC = new Set(["HOLD", "AWAITING_APPROVAL", "QUEUED"]);
const OPEN_BASE = new Set(["PENDING", "APPROVED", "SUBMITTING", "SUBMITTED", "LIQUIDITY_PENDING"]);

function fresh(at: string | null, now: number, limit: number): boolean {
  if (!at) return false;
  const time = Date.parse(at);
  return Number.isFinite(time) && now - time >= 0 && now - time < limit;
}

function open(row: WithdrawalNoticeRow): boolean {
  return row.network === "bitcoin" ? OPEN_BTC.has(row.status) : OPEN_BASE.has(row.status);
}

function sent(row: WithdrawalNoticeRow): boolean {
  return row.network === "bitcoin" ? row.status === "COMPLETED" : row.status === "CONFIRMED";
}

function pendingBody(network: "bitcoin" | "base"): string {
  return network === "bitcoin"
    ? "Your Bitcoin cashout is being sent. The amount stays reserved until it confirms."
    : "Your cashout is being sent on Base. The amount stays reserved until it confirms.";
}

function sentBody(network: "bitcoin" | "base"): string {
  return network === "bitcoin" ? "Your Bitcoin cashout was sent." : "Your cashout was sent.";
}

/**
 * One withdrawal card. Cashouts already finished when this session started stay
 * quiet. Newest rows win; pass them newest-first.
 */
export function selectWithdrawalNotice(input: {
  withdrawals: readonly WithdrawalNoticeRow[];
  baselineSent: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
  submitted: SubmittedWithdrawal | null;
  now: number;
}): WithdrawalNotice | null {
  const live = input.withdrawals.filter(
    (row) => fresh(row.at, input.now, WITHDRAWAL_FRESH_MS) && !input.dismissed.has(row.id),
  );
  const done = live.find((row) => sent(row) && !input.baselineSent.has(row.id));
  if (done) {
    return {
      key: `sent:${done.id}`,
      phase: "sent",
      title: "Withdrawal sent",
      amount: `${formatUsd(done.usd_cents)} ${done.asset}`,
      body: sentBody(done.network),
    };
  }
  const pending = live.find((row) => open(row));
  if (pending) {
    return {
      key: `wait:${pending.id}`,
      phase: "waiting",
      title: "Withdrawal pending",
      amount: `${formatUsd(pending.usd_cents)} ${pending.asset}`,
      body: pendingBody(pending.network),
    };
  }
  if (input.submitted && !input.dismissed.has("submitted")) {
    const age = input.now - input.submitted.at;
    if (age >= 0 && age < WITHDRAWAL_FOLLOW_MS) {
      return {
        key: "submitted",
        phase: "waiting",
        title: "Withdrawal pending",
        amount: `${formatUsd(input.submitted.usdCents)} ${input.submitted.asset}`,
        body: pendingBody(input.submitted.network),
      };
    }
  }
  return null;
}
