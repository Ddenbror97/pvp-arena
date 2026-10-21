import { bitcoinTxid } from "../btc-trace";
import {
  BtcpayError,
  approvePayout,
  cancelPayout,
  createPayout,
  getBtcUsdRate,
  getPayout,
  getPayoutWallet,
  listPayouts,
} from "./client.server";
import { readBtcpayPayoutConfig, type BtcpayPayoutConfig } from "./config.server";
import {
  PAYOUT_QUOTE_MS,
  isBtcPayoutAddress,
  payoutMatchesQuote,
  readBtcUsdMicro,
  readPaymentProof,
  readPayoutList,
  readPayoutView,
  readWalletSats,
  satsForUsdCents,
  satsToBtcAmount,
  shouldAutoSendPayout,
  type PayoutView,
} from "./policy";

type Enabled = Extract<BtcpayPayoutConfig, { enabled: true }>;

type PayoutRow = {
  id: string;
  user_id: string;
  btcpay_payout_id: string | null;
  usd_cents: number | string;
  fee_usd_cents: number;
  address: string;
  status: string;
  quote_sats?: number | string | null;
  created_at?: string | null;
  payout_txid?: string | null;
};

export type HoldLookup = "lookup_failed" | "none" | "one" | "many" | "attached";

/**
 * What an operator should do with a hold that has left the 24-hour cap.
 * Every action keeps the reservation. An empty or failed lookup is not
 * proof the payout was never created.
 */
export function agedHoldRecovery(input: {
  hasProviderId: boolean;
  hasTxid: boolean;
  lookup: HoldLookup;
  providerState: string | null;
}): {
  action:
    | "UNKNOWN_OUTCOME"
    | "AMBIGUOUS"
    | "CONFIRMED_FAILED"
    | "CONFIRMED_BROADCAST"
    | "CONFIRMED_CREATED";
  next: string;
} {
  if (!input.hasProviderId && input.lookup === "lookup_failed") {
    return {
      action: "UNKNOWN_OUTCOME",
      next: "retry the provider lookup; do not release",
    };
  }
  if (!input.hasProviderId && (input.lookup === "none" || input.lookup === "attached")) {
    return {
      action: "UNKNOWN_OUTCOME",
      next: "an empty list does not prove the payout was not created; do not release",
    };
  }
  if (input.lookup === "many") {
    return {
      action: "AMBIGUOUS",
      next: "more than one provider payout matches this order; do not release or create another",
    };
  }
  if (input.providerState === "Cancelled") {
    return {
      action: "CONFIRMED_FAILED",
      next: "release only through the existing cancel path after the provider reports Cancelled",
    };
  }
  if (
    input.providerState === "Completed" ||
    input.providerState === "InProgress" ||
    input.hasTxid
  ) {
    return {
      action: "CONFIRMED_BROADCAST",
      next: "settle only after this row's quote matches and its transaction id is stored",
    };
  }
  if (input.hasProviderId || input.lookup === "one") {
    return {
      action: "CONFIRMED_CREATED",
      next: "keep the reservation until the provider reports a terminal state",
    };
  }
  return { action: "UNKNOWN_OUTCOME", next: "keep the reservation" };
}

type RowResult<T> = { data: T; error: { message: string } | null };

type Filter = {
  eq: (column: string, value: string) => Filter;
  in: (column: string, values: readonly string[]) => Filter;
  order: (column: string, options: { ascending: boolean }) => Filter;
  limit: (count: number) => Filter;
  maybeSingle: () => Promise<RowResult<unknown>>;
  then: Promise<RowResult<unknown[]>>["then"];
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (table: string) => {
      select: (columns: string) => Filter;
      update: (row: Record<string, unknown>) => Filter;
    };
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
}

/** Latest cashout for this user. A missing id means the send is not on-chain yet. */
export async function loadLatestPayoutTxid(userId: string): Promise<string | null> {
  const admin = await db();
  const { data } = await admin
    .from("btcpay_payouts")
    .select("payout_txid")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = data as { payout_txid?: unknown } | null;
  return bitcoinTxid(row?.payout_txid);
}

const OPEN = ["HOLD", "AWAITING_APPROVAL", "QUEUED"];
const CAP_WINDOW_MS = 24 * 60 * 60 * 1000;
const PAYOUT_COLUMNS =
  "id, user_id, btcpay_payout_id, usd_cents, fee_usd_cents, address, status, quote_sats, created_at, payout_txid";

/** A hold older than the rolling cap window no longer counts, but the balance stays reserved. */
export function holdLeavesDailyCap(
  createdAt: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  return Number.isFinite(created) && now - created >= CAP_WINDOW_MS;
}

function quoteSatsOf(row: PayoutRow): bigint | null {
  if (row.quote_sats == null || row.quote_sats === "") return null;
  try {
    const sats = BigInt(row.quote_sats);
    return sats > 0n ? sats : null;
  } catch {
    return null;
  }
}

function payoutAlert(code: string, fields: Record<string, string | number | null>) {
  console.error("[btcpay]", code, fields);
}

export async function requestBtcPayout(
  userId: string,
  usdCents: number,
  address: string,
): Promise<{ ok: true; id: string; status: string } | { ok: false; error: string }> {
  const config = readBtcpayPayoutConfig();
  if (!config.ok) return { ok: false, error: "Bitcoin cashouts are unavailable right now." };
  if (!config.enabled) return { ok: false, error: "Bitcoin cashouts are unavailable right now." };
  const dest = address.trim();
  if (!isBtcPayoutAddress(dest))
    return { ok: false, error: "Enter a Bitcoin address that starts with bc1." };
  if (!Number.isInteger(usdCents) || usdCents < config.minCents || usdCents > 100_000_000) {
    return { ok: false, error: "Amount is below the minimum for Bitcoin cashouts." };
  }
  let rateMicro: bigint | null = null;
  try {
    rateMicro = readBtcUsdMicro(await getBtcUsdRate(config));
  } catch {
    rateMicro = null;
  }
  const sats = rateMicro == null ? null : satsForUsdCents(usdCents, rateMicro);
  const btcAmount = sats == null ? null : satsToBtcAmount(sats);
  if (rateMicro == null || sats == null || btcAmount == null) {
    return { ok: false, error: "Bitcoin cashouts are unavailable right now." };
  }
  const admin = await db();
  const held = await admin.rpc("btcpay_request_payout", {
    p_user: userId,
    p_usd_cents: usdCents,
    p_address: dest.toLowerCase(),
    p_quote_sats: sats.toString(),
    p_rate_micro: rateMicro.toString(),
    p_quote_expires_at: new Date(Date.now() + PAYOUT_QUOTE_MS).toISOString(),
  });
  if (held.error || !held.data || typeof held.data !== "object") {
    return { ok: false, error: payoutError(held.error?.message ?? "") };
  }
  const created = held.data as { id?: string; status?: string };
  if (typeof created.id !== "string") {
    return { ok: false, error: "Bitcoin cashouts are unavailable right now." };
  }
  const row: PayoutRow = {
    id: created.id,
    user_id: userId,
    btcpay_payout_id: null,
    usd_cents: usdCents,
    fee_usd_cents: 0,
    address: dest.toLowerCase(),
    status: "HOLD",
    quote_sats: sats.toString(),
  };
  let payout: unknown;
  try {
    payout = await createPayout(config, dest, btcAmount, created.id);
  } catch (error) {
    // Only a definite rejection proves no payout exists. Anything else may have created one,
    // so the hold stays until an operator resolves it. Do not create a second payout.
    if (createRejected(error)) {
      await admin.rpc("btcpay_fail_payout", { p_id: created.id, p_reason: "BTCPAY_CREATE" });
      return { ok: false, error: "Bitcoin cashouts are unavailable right now." };
    }
    payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: created.id, stage: "create" });
    return { ok: true, id: created.id, status: "ACCEPTED" };
  }
  const view = readPayoutView(payout);
  if (!view) {
    payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: created.id, stage: "unreadable" });
    return { ok: true, id: created.id, status: "ACCEPTED" };
  }
  return finishCreatedPayout(config, admin, row, view, usdCents);
}

const HELD_FOR_REVIEW =
  "This cashout was not sent. The amount stays reserved until it is cancelled.";

type Admin = Awaited<ReturnType<typeof db>>;

function quoteFor(row: PayoutRow, onchainMethod: string) {
  const sats = quoteSatsOf(row);
  if (sats == null) return null;
  return { sats, address: row.address, orderId: row.id, onchainMethod };
}

async function finishCreatedPayout(
  config: Enabled,
  admin: Admin,
  row: PayoutRow,
  view: PayoutView,
  usdCents: number,
): Promise<{ ok: true; id: string; status: string } | { ok: false; error: string }> {
  const quote = quoteFor(row, config.onchainMethod);
  const checked = await viewWithAmount(config, view, quote);
  view = checked.view;
  const match = checked.match;
  const attached = await admin.rpc("btcpay_attach_payout", {
    p_id: row.id,
    p_btcpay_id: view.id,
  });
  if (attached.error) {
    if (!(await confirmCancelled(config, view.id))) {
      payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: row.id, stage: "attach" });
    }
    return { ok: false, error: "Bitcoin cashouts are unavailable right now." };
  }
  if (view.state === "Cancelled") {
    await admin.rpc("btcpay_fail_payout", { p_id: row.id, p_reason: "CANCELLED" });
    return { ok: false, error: "Bitcoin cashouts are unavailable right now." };
  }
  if (!match.ok) {
    // Create often omits the amount. That is not a wrong payout, and cancelling it
    // would stop a cashout the next read can send. Tell the user it is processing.
    if (match.reason === "AMOUNT_MISSING") {
      payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: row.id, stage: "amount" });
      return { ok: true, id: row.id, status: "PROCESSING" };
    }
    payoutAlert("BTC_PAYOUT_AMOUNT_MISMATCH", {
      payout: row.id,
      reason: match.reason,
      quotedSats: quote?.sats.toString() ?? null,
      payoutSats: view.payoutSats?.toString() ?? null,
      payoutCurrency: view.payoutCurrency,
      originalCurrency: view.originalCurrency,
    });
    if (
      view.state !== "Completed" &&
      view.state !== "InProgress" &&
      (await confirmCancelled(config, view.id))
    ) {
      await admin.rpc("btcpay_fail_payout", { p_id: row.id, p_reason: "CANCELLED" });
      return { ok: false, error: "Bitcoin cashouts are unavailable right now." };
    }
    return { ok: false, error: HELD_FOR_REVIEW };
  }
  if (view.txid) {
    const noted = await admin.rpc("btcpay_note_payout_txid", { p_id: row.id, p_txid: view.txid });
    if (noted.error) {
      payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: row.id, stage: "txid" });
      return { ok: true, id: row.id, status: "ACCEPTED" };
    }
  }
  if (
    shouldAutoSendPayout(usdCents, config.autoCents) &&
    (view.state === "AwaitingApproval" || view.state === "AwaitingPayment")
  ) {
    if (view.state === "AwaitingApproval") {
      try {
        await approvePayout(config, view.id);
      } catch {
        return { ok: true, id: row.id, status: "AWAITING_APPROVAL" };
      }
    }
    await admin.rpc("btcpay_mark_queued", { p_id: row.id });
    return { ok: true, id: row.id, status: view.txid ? "BROADCAST" : "PROCESSING" };
  }
  return { ok: true, id: row.id, status: "AWAITING_APPROVAL" };
}

/** BTCPay answered with a client error, so it created nothing. Timeouts and 5xx are not proof. */
function createRejected(error: unknown): boolean {
  return (
    error instanceof BtcpayError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408
  );
}

/**
 * The create call can return the payout before its amount is filled in.
 * Read it once more before treating a missing amount as a mismatch.
 */
async function viewWithAmount(
  config: Enabled,
  view: PayoutView,
  quote: { sats: bigint; address: string; orderId: string; onchainMethod: string } | null,
): Promise<{
  view: PayoutView;
  match: { ok: true; sats: bigint } | { ok: false; reason: string };
}> {
  let match =
    quote == null ? { ok: false as const, reason: "QUOTE" } : payoutMatchesQuote(view, quote);
  if (match.ok || match.reason !== "AMOUNT_MISSING" || quote == null) return { view, match };
  try {
    const refreshed = readPayoutView(await getPayout(config, view.id));
    if (refreshed && refreshed.id === view.id) {
      view = refreshed;
      match = payoutMatchesQuote(view, quote);
    }
  } catch {
    // Keep the create view. A failed read is not proof the amount is wrong.
  }
  return { view, match };
}

/** Asks BTCPay to cancel, then refunds only if BTCPay itself reports the payout as Cancelled. */
async function confirmCancelled(config: Enabled, payoutId: string): Promise<boolean> {
  await cancelPayout(config, payoutId).catch(() => undefined);
  try {
    const view = readPayoutView(await getPayout(config, payoutId));
    return view?.id === payoutId && view.state === "Cancelled";
  } catch {
    return false;
  }
}

export async function cancelBtcPayout(
  userId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const config = readBtcpayPayoutConfig();
  const admin = await db();
  const { data } = await admin
    .from("btcpay_payouts")
    .select(PAYOUT_COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as PayoutRow | null;
  if (!row) return { ok: false, error: "Cashout not found." };
  if (row.status === "HOLD")
    return { ok: false, error: "This cashout is still being created. Try again in a moment." };
  if (row.status !== "AWAITING_APPROVAL" || !row.btcpay_payout_id) {
    return { ok: false, error: "This cashout can no longer be cancelled." };
  }
  if (!config.ok || !config.enabled || !(await confirmCancelled(config, row.btcpay_payout_id))) {
    return { ok: false, error: "This cashout can no longer be cancelled." };
  }
  const released = await admin.rpc("btcpay_fail_payout", {
    p_id: row.id,
    p_reason: "cancelled by user",
  });
  if (released.error) return { ok: false, error: "This cashout can no longer be cancelled." };
  return { ok: true };
}

async function recoverUnattached(
  config: Enabled,
  admin: Admin,
  row: PayoutRow,
): Promise<HoldLookup> {
  let listed: PayoutView[] | null = null;
  try {
    listed = readPayoutList(await listPayouts(config));
  } catch {
    listed = null;
  }
  if (!listed) {
    payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: row.id, stage: "list" });
    return "lookup_failed";
  }
  const hits = listed.filter((view) => view.orderId === row.id);
  if (hits.length !== 1) {
    payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: row.id, stage: "list", matches: hits.length });
    return hits.length === 0 ? "none" : "many";
  }
  const cents = Number(row.usd_cents);
  if (!Number.isSafeInteger(cents)) return "one";
  await finishCreatedPayout(config, admin, row, hits[0]!, cents);
  return "one";
}

function reportAgedHold(row: PayoutRow, lookup: HoldLookup, providerState: string | null): void {
  if (row.status !== "HOLD" || !holdLeavesDailyCap(row.created_at)) return;
  const created = row.created_at ? Date.parse(row.created_at) : Number.NaN;
  const ageHours = Number.isFinite(created)
    ? Math.floor((Date.now() - created) / (60 * 60 * 1000))
    : null;
  const report = agedHoldRecovery({
    hasProviderId: !!row.btcpay_payout_id,
    hasTxid: !!row.payout_txid && !!readPaymentProof(row.payout_txid),
    lookup,
    providerState,
  });
  payoutAlert("BTC_PAYOUT_HOLD_AGED", {
    payout: row.id,
    created_at: row.created_at ?? null,
    age_hours: ageHours,
    lookup,
    has_provider_id: row.btcpay_payout_id ? 1 : 0,
    has_txid: row.payout_txid ? 1 : 0,
    provider_state: providerState,
    action: report.action,
    next: report.next,
  });
}

export async function reconcilePayout(config: Enabled, row: PayoutRow): Promise<void> {
  const admin = await db();
  // No stored BTCPay id means create may already have succeeded. Find that payout.
  // Never create another one. An old hold is not released here: BTCPay may already have paid it.
  if (!row.btcpay_payout_id) {
    const lookup = await recoverUnattached(config, admin, row);
    reportAgedHold(row, lookup, null);
    return;
  }
  let body: unknown;
  try {
    body = await getPayout(config, row.btcpay_payout_id);
  } catch {
    payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: row.id, stage: "get" });
    reportAgedHold(row, "lookup_failed", null);
    return;
  }
  const view = readPayoutView(body);
  if (!view || view.id !== row.btcpay_payout_id) {
    reportAgedHold(row, "lookup_failed", null);
    return;
  }
  reportAgedHold(row, "attached", view.state);
  const quote = quoteFor(row, config.onchainMethod);
  const match =
    quote == null ? { ok: false as const, reason: "QUOTE" } : payoutMatchesQuote(view, quote);
  if (view.state === "Cancelled") {
    await admin.rpc("btcpay_fail_payout", { p_id: row.id, p_reason: "CANCELLED" });
    return;
  }
  if (!match.ok) {
    payoutAlert("BTC_PAYOUT_AMOUNT_MISMATCH", {
      payout: row.id,
      reason: match.reason,
      quotedSats: quote?.sats.toString() ?? null,
      payoutSats: view.payoutSats?.toString() ?? null,
      payoutCurrency: view.payoutCurrency,
    });
    if (
      view.state !== "Completed" &&
      view.state !== "InProgress" &&
      (await confirmCancelled(config, view.id))
    ) {
      await admin.rpc("btcpay_fail_payout", { p_id: row.id, p_reason: "CANCELLED" });
    }
    return;
  }
  if (view.state === "Completed") {
    if (!view.txid || !readPaymentProof(view.txid)) {
      payoutAlert("BTC_PAYOUT_PROOF_MISSING", { payout: row.id });
      return;
    }
    // Quote match and this provider payout id were checked above. The database
    // stores a 64-hex id and cannot see Bitcoin. service_role can still call
    // btcpay_note_payout_txid directly; that remains the database trust boundary.
    const noted = await admin.rpc("btcpay_note_payout_txid", { p_id: row.id, p_txid: view.txid });
    if (noted.error) {
      payoutAlert("BTC_PAYOUT_UNRESOLVED", { payout: row.id, stage: "txid" });
      return;
    }
    await admin.rpc("btcpay_settle_payout", { p_id: row.id, p_state: "Completed" });
    return;
  }
  const cents = Number(row.usd_cents);
  if (
    Number.isSafeInteger(cents) &&
    view.state === "AwaitingApproval" &&
    shouldAutoSendPayout(cents, config.autoCents)
  ) {
    try {
      await approvePayout(config, view.id);
    } catch {
      return;
    }
    await admin.rpc("btcpay_mark_queued", { p_id: row.id });
    return;
  }
  if (view.state === "AwaitingPayment" || view.state === "InProgress") {
    await admin.rpc("btcpay_mark_queued", { p_id: row.id });
  }
}

export async function reconcileBtcpayPayouts(): Promise<
  { ok: true; checked: number } | { ok: false; reason: string }
> {
  const config = readBtcpayPayoutConfig();
  if (!config.ok) return { ok: false, reason: config.reason };
  if (!config.enabled) return { ok: true, checked: 0 };
  const admin = await db();
  await recordBtcTreasury(config).catch(() => undefined);
  const { data, error } = await admin
    .from("btcpay_payouts")
    .select(PAYOUT_COLUMNS)
    .in("status", OPEN);
  if (error) {
    console.error("[btcpay] list", error.message.replace(/https?:\/\/\S+/g, "[rpc]").slice(0, 160));
    return { ok: false, reason: "PAYOUT_LIST_FAILED" };
  }
  const rows = (data ?? []) as PayoutRow[];
  for (const row of rows) {
    try {
      await reconcilePayout(config, row);
    } catch {
      // Leave the row open for the next minute.
    }
  }
  return { ok: true, checked: rows.length };
}

/** Payout wallet balance and BTCPay's rate. An unreadable value records nothing, so BTC goes stale and closes. */
async function recordBtcTreasury(config: Enabled): Promise<"recorded" | "unread"> {
  const [wallet, rates] = await Promise.all([getPayoutWallet(config), getBtcUsdRate(config)]);
  const sats = readWalletSats(wallet);
  const priceMicro = readBtcUsdMicro(rates);
  if (sats == null || priceMicro == null) return "unread";
  const admin = await db();
  const { error } = await admin.rpc("treasury_record_btc", {
    p_sats: sats.toString(),
    p_price_micro: priceMicro.toString(),
  });
  if (error) throw new Error("TREASURY_RECORD_FAILED");
  return "recorded";
}

/** Record the BTC treasury before other minute jobs can use up the Worker subrequest budget. */
export async function refreshBtcTreasury(): Promise<"recorded" | "unread" | "disabled" | "failed"> {
  const config = readBtcpayPayoutConfig();
  if (!config.ok || !config.enabled) return "disabled";
  try {
    return await recordBtcTreasury(config);
  } catch {
    return "failed";
  }
}

export async function reconcileByPayoutId(payoutId: string, storeId: string): Promise<void> {
  const config = readBtcpayPayoutConfig();
  if (!config.ok || !config.enabled || storeId !== config.storeId) return;
  const admin = await db();
  const { data } = await admin
    .from("btcpay_payouts")
    .select(PAYOUT_COLUMNS)
    .eq("btcpay_payout_id", payoutId)
    .maybeSingle();
  const row = data as PayoutRow | null;
  if (!row || !OPEN.includes(row.status)) return;
  await reconcilePayout(config, row);
}

function payoutError(message: string): string {
  if (message.includes("WITHDRAWALS_PAUSED")) return "Cashouts are paused right now.";
  if (message.includes("BELOW_MINIMUM")) return "Amount is below the minimum for Bitcoin cashouts.";
  if (message.includes("SELF_EXCLUDED")) return "Cashouts are unavailable while self-excluded.";
  if (message.includes("WITHDRAWAL_PENDING"))
    return "You already have a Bitcoin cashout in progress.";
  if (message.includes("DAILY_LIMIT") || message.includes("GLOBAL_DAILY_LIMIT"))
    return "This would exceed the daily cashout limit.";
  if (message.includes("INSUFFICIENT_BALANCE")) return "Not enough balance.";
  if (message.includes("REFERRAL_PLAYTHROUGH"))
    return "Your $10 referral reward has to be wagered on Jackpot, Coinflip, Roulette, Slott, or Poker before that reward can be withdrawn.";
  if (message.includes("PROMO_PLAYTHROUGH"))
    return "Promotional credit has to be wagered on Jackpot, Coinflip, Roulette, Slott, or Poker before that amount can be withdrawn.";
  if (message.includes("DEPOSIT_WAGER_REQUIRED"))
    return "Wager half of what you have deposited before cashout. The minimum cashout is $20.";
  if (message.includes("BONUS_NOT_WITHDRAWABLE"))
    return "Your balance includes promo or bonus credit that cannot be cashed out yet. Deposit at least $20 on Base first; after that, bonus winnings can be withdrawn (minimum cashout $20).";
  if (message.includes("LEADERBOARD_PLAYTHROUGH"))
    return "Leaderboard prize money has to be wagered on Jackpot, Coinflip, Roulette, Slott, or Poker before that amount can be withdrawn.";
  if (message.includes("PARTNER_WITHDRAWAL_BLOCKED"))
    return "You cant withdraw right now, try again later";
  if (message.includes("PARTNER_FUNDS_HELD"))
    return "Balance from your partner period stays on the account. You can withdraw up to what you've deposited since.";
  if (message.includes("PARTNER_PROFIT_REVIEW"))
    return "Part of your balance came from promotional partner-funded gameplay and is held for review. You can withdraw the rest.";
  if (message.includes("TREASURY_UNAVAILABLE"))
    return "Bitcoin cashouts are temporarily unavailable. Choose another asset or try again later.";
  if (message.includes("TREASURY_LIQUIDITY"))
    return "There isn't enough Bitcoin available to send this amount right now. Try a smaller amount or another asset.";
  if (message.includes("ADDRESS")) return "Enter a Bitcoin address that starts with bc1.";
  return "Bitcoin cashouts are unavailable right now.";
}
