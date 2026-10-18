import { formatUsd } from "@/lib/jackpot/math";

/**
 * How long a healthy deposit takes to reach the balance.
 * Base credits after the confirmation policy and a second provider agree.
 * The watcher runs once a minute, so a mainnet deposit lands within about
 * two minutes. Testnet stays on the longer window already shown in the wallet.
 */
export function depositWaitPhrase(networkMode: string | null | undefined): string {
  if (networkMode === "testnet") return "about 6 minutes";
  if (networkMode === "bitcoin") return "about 20 minutes";
  return "about 2 minutes";
}

/** Switch the waiting copy once the usual window has passed. */
export const DEPOSIT_WAIT_MS = 2 * 60 * 1000;
/** Two Bitcoin confirmations, then the minute watcher. */
export const BITCOIN_DEPOSIT_WAIT_MS = 20 * 60 * 1000;
/** Keep a just-sent notice up while the watcher is still looking. */
export const DEPOSIT_FOLLOW_MS = 6 * 60 * 1000;
/** Ignore deposits already sitting in history. */
export const DEPOSIT_FRESH_MS = 15 * 60 * 1000;
/** A Bitcoin payment can still be confirming after the Base window. */
export const BITCOIN_DEPOSIT_FRESH_MS = 2 * 60 * 60 * 1000;

export function depositWaitMs(networkMode: string | null | undefined): number {
  return networkMode === "bitcoin" ? BITCOIN_DEPOSIT_WAIT_MS : DEPOSIT_WAIT_MS;
}

export type DepositNoticeRow = {
  id: string;
  status: string;
  usd_cents: number;
  asset_key: string;
  at: string | null;
  networkMode: string | null;
};

export type SubmittedDeposit = {
  usdCents: number;
  asset: string;
  networkMode: string;
  at: number;
};

export type DepositNotice = {
  key: string;
  phase: "waiting" | "added" | "review";
  title: string;
  body: string;
  amount: string | null;
};

const PENDING = new Set(["DETECTED", "CONFIRMED"]);
const REVIEW = new Set(["UNMATCHED", "REJECTED"]);

function fresh(row: DepositNoticeRow, now: number): boolean {
  if (!row.at) return false;
  const time = Date.parse(row.at);
  const limit = row.networkMode === "bitcoin" ? BITCOIN_DEPOSIT_FRESH_MS : DEPOSIT_FRESH_MS;
  return Number.isFinite(time) && now - time >= 0 && now - time < limit;
}

function waitingBody(networkMode: string | null, late: boolean): string {
  if (networkMode === "bitcoin") {
    return late
      ? "We received your Bitcoin payment. It's taking a little longer. Your balance updates once it confirms."
      : "We received your Bitcoin payment. It will be added after 2 confirmations, usually within about 20 minutes.";
  }
  if (late) return "Taking a little longer. Your balance updates once the transfer is confirmed.";
  return `Your funds will be added within ${depositWaitPhrase(networkMode)}.`;
}

/**
 * What the deposit card should say. Deposits already credited when this
 * session started stay quiet. Newest rows win; pass them newest-first.
 */
export function selectDepositNotice(input: {
  deposits: readonly DepositNoticeRow[];
  baselineCredited: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
  submitted: SubmittedDeposit | null;
  now: number;
}): DepositNotice | null {
  const live = input.deposits.filter(
    (row) => fresh(row, input.now) && !input.dismissed.has(row.id),
  );
  const credit = live.find(
    (row) => row.status === "CREDITED" && !input.baselineCredited.has(row.id),
  );
  if (credit) {
    const amount = formatUsd(credit.usd_cents);
    return {
      key: `added:${credit.id}`,
      phase: "added",
      title: "Deposit credited",
      body: `${amount} is in your balance.`,
      amount: `${amount} ${credit.asset_key}`,
    };
  }
  const pending = live.find((row) => PENDING.has(row.status));
  if (pending) {
    const seenAt = Date.parse(pending.at ?? "");
    const late = Number.isFinite(seenAt) && input.now - seenAt > depositWaitMs(pending.networkMode);
    return {
      key: `wait:${pending.id}`,
      phase: "waiting",
      title: "Deposit pending",
      amount: `${formatUsd(pending.usd_cents)} ${pending.asset_key}`,
      body: waitingBody(pending.networkMode, late),
    };
  }
  const review = live.find((row) => REVIEW.has(row.status));
  if (review) {
    return {
      key: `review:${review.id}`,
      phase: "review",
      title: "Deposit needs review",
      amount: `${formatUsd(review.usd_cents)} ${review.asset_key}`,
      body: "We'll review this transfer before adding it to your balance.",
    };
  }
  if (input.submitted && !input.dismissed.has("submitted")) {
    const age = input.now - input.submitted.at;
    const followMs =
      input.submitted.networkMode === "bitcoin" ? BITCOIN_DEPOSIT_FRESH_MS : DEPOSIT_FOLLOW_MS;
    if (age >= 0 && age < followMs) {
      return {
        key: "submitted",
        phase: "waiting",
        title:
          input.submitted.networkMode === "bitcoin" ? "Deposit pending" : "Transaction submitted",
        amount: `${formatUsd(input.submitted.usdCents)} ${input.submitted.asset}`,
        body: waitingBody(
          input.submitted.networkMode,
          age > depositWaitMs(input.submitted.networkMode),
        ),
      };
    }
  }
  return null;
}
