/**
 * Native Bitcoin deposits and cashouts through BTCPay. This module decides
 * when an invoice may credit the USD ledger and when a cashout matches its
 * quote. It never sees a seed, xprv, or signing key.
 *
 * Cashouts are automatic only after the returned bitcoin amount matches the
 * satoshi quote. A missing amount or currency fails closed.
 */
export const BTC_WITHDRAWAL_APPROVAL = "automatic" as const;

/** Below this, a cashout is dust and is not quoted. */
export const BTC_DUST_SATS = 546n;
/** $1,000 per BTC. A rate under this is refused. */
export const BTC_RATE_MICRO_MIN = 1_000_000_000n;
/** $10,000,000 per BTC. A rate over this is refused. */
export const BTC_RATE_MICRO_MAX = 10_000_000_000_000n;
/** Quoted sats above this are refused. Ten bitcoin. */
export const BTC_QUOTE_SATS_MAX = 1_000_000_000n;
export const PAYOUT_QUOTE_MS = 3 * 60 * 1000;

/** Mainnet native Segwit / Taproot. Lightning invoices and testnet addresses are refused. */
export function isBtcPayoutAddress(address: string): boolean {
  return /^bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38,87}$/i.test(address.trim());
}

/** BIP21 link so a wallet scan includes the exact BTC amount. */
export function bitcoinPaymentUri(address: string, btcDue: string): string {
  const amount = btcDue.trim();
  if (/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(amount) && Number(amount) > 0) {
    return `bitcoin:${address}?amount=${amount}`;
  }
  return `bitcoin:${address}`;
}

/** Auto-send only when a positive cap is set and the cashout is at or under it. 0 keeps every send waiting in BTCPay. */
export function shouldAutoSendPayout(usdCents: number, autoCents: number): boolean {
  if (!Number.isInteger(usdCents) || usdCents <= 0) return false;
  if (!Number.isInteger(autoCents) || autoCents <= 0) return false;
  return usdCents <= autoCents;
}

export function parseUsdCentsEnv(raw: string | undefined, fallback: number): number | null {
  if (raw == null || raw.trim() === "") return fallback;
  if (!/^[0-9]{1,9}$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value < 0 || value > 100_000_000) return null;
  return value;
}

export type BtcInvoicePhase = "pay" | "confirming" | "crediting" | "credited" | "closed" | "review";

/** What the wallet should show. Crediting still waits on the confirmation floor. */
export function btcInvoicePhase(status: string): BtcInvoicePhase {
  if (status === "NEW") return "pay";
  if (status === "PROCESSING") return "confirming";
  if (status === "SETTLED") return "crediting";
  if (status === "CREDITED") return "credited";
  if (status === "REVIEW") return "review";
  return "closed";
}

export const DEFAULT_REQUIRED_CONFIRMATIONS = 2;

/** Confirmations BTCPay waits before it marks that speed policy settled. */
export const SPEED_FLOOR = {
  MediumSpeed: 1,
  LowMediumSpeed: 2,
  LowSpeed: 6,
} as const;

export type SpeedPolicyName = keyof typeof SPEED_FLOOR;

const ONCHAIN_METHOD = /^[A-Z0-9-]{3,32}$/;

/** Env names this app must refuse. An xpub/seed belongs on BTCPay, not here. */
export function forbiddenBtcKey(names: readonly string[]): string | null {
  for (const name of names) {
    if (!/^(BTC|BTCPAY)_/.test(name)) continue;
    if (/(SEED|XPRV|WIF|MNEMONIC|PRIVATE_KEY|HOT_WALLET)/i.test(name)) return name;
  }
  return null;
}

/** 1–6, or the default of 2 when unset. Anything else is a bad config. */
export function parseRequiredConfirmations(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return DEFAULT_REQUIRED_CONFIRMATIONS;
  if (!/^[1-6]$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

/**
 * Slowest BTCPay speed policy that is still at least `required` confirmations.
 * 3–5 use LowSpeed (6) so a Settled invoice is never early.
 */
export function speedPolicyFor(required: number): SpeedPolicyName | null {
  if (!Number.isInteger(required) || required < 1 || required > 6) return null;
  if (required === 1) return "MediumSpeed";
  if (required === 2) return "LowMediumSpeed";
  return "LowSpeed";
}

/** Invoice USD with at most two decimal places. "50.00" → 5000. */
export function usdAmountToCents(amount: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) return null;
  const [whole, frac = ""] = amount.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

export function centsToUsdAmount(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

/**
 * Satoshis for a USD-cent amount at a micro-USD-per-BTC rate.
 * Floors so the send is never larger than the authorized dollars.
 * Returns null when the rate or the result is outside the safe band.
 */
export function satsForUsdCents(cents: number, rateMicro: bigint): bigint | null {
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  if (rateMicro < BTC_RATE_MICRO_MIN || rateMicro > BTC_RATE_MICRO_MAX) return null;
  const sats = (BigInt(cents) * 1_000_000_000_000n) / rateMicro;
  if (sats < BTC_DUST_SATS || sats > BTC_QUOTE_SATS_MAX) return null;
  return sats;
}

/** Exact 8-decimal BTC string. "1210" sats is "0.00001210", never "1.00". */
export function satsToBtcAmount(sats: bigint): string | null {
  if (sats <= 0n || sats > 2_100_000_000_000_000n) return null;
  const whole = sats / 100_000_000n;
  const frac = (sats % 100_000_000n).toString().padStart(8, "0");
  return `${whole.toString()}.${frac}`;
}

/** Exact decimal string to integer base units, extra digits truncated. "0.123456789" at 8 → 12345678n. */
export function decimalToUnits(value: unknown, decimals: number): bigint | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const [whole, frac = ""] = text.split(".");
  return (
    BigInt(whole!) * 10n ** BigInt(decimals) +
    BigInt(frac.slice(0, decimals).padEnd(decimals, "0") || "0")
  );
}

/** Confirmed on-chain balance of a store wallet, in sats. */
export function readWalletSats(body: unknown): bigint | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  return decimalToUnits(row["confirmedBalance"] ?? row["balance"], 8);
}

/** One top-up is at most the daily cashout cap. A day of top-ups can cover two of those. */
export const SWEEP_MIN_CENTS = 1_000;
export const SWEEP_MAX_CENTS = 100_000;
export const SWEEP_DAILY_MAX_CENTS = 200_000;
/** Quiet-day float. Real cashout demand can raise the target up to the daily cap. */
export const SWEEP_TARGET_FLOOR_CENTS = 5_000;
/** Confirmed deposit balance that starts a sweep. Five percent stays behind. */
export const SWEEP_TRIGGER_CENTS = 5_000;
/** Share of received Bitcoin that stays in the deposit wallet. */
export const SWEEP_RESERVE_BPS = 500n;
/** Left in the deposit wallet so the miner fee is not taken from the amount sent. */
export const SWEEP_FEE_BUFFER_SATS = 10_000n;

/** Current receive address of a BTCPay on-chain wallet. A new address is never requested. */
export function readWalletAddress(body: unknown): string | null {
  const raw =
    typeof body === "string"
      ? body
      : body && typeof body === "object"
        ? (body as Record<string, unknown>)["address"]
        : null;
  if (typeof raw !== "string") return null;
  const address = raw.trim();
  return isBtcPayoutAddress(address) ? address : null;
}

export function readSweepTxid(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const raw =
    (body as Record<string, unknown>)["transactionHash"] ??
    (body as Record<string, unknown>)["txid"];
  if (typeof raw !== "string" || !/^[0-9a-f]{64}$/i.test(raw)) return null;
  return raw.toLowerCase();
}

/** USD cents implied by satoshis at a micro-USD-per-BTC rate. */
export function satsToUsdCents(sats: bigint, rateMicro: bigint): number | null {
  if (sats < 0n || rateMicro < BTC_RATE_MICRO_MIN || rateMicro > BTC_RATE_MICRO_MAX) return null;
  const cents = (sats * rateMicro) / 1_000_000_000_000n;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(cents);
}

/** Total wallet balance, including Bitcoin that has been sent but is not confirmed yet. */
export function readWalletTotalSats(body: unknown): bigint | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  return decimalToUnits(row["balance"] ?? row["confirmedBalance"], 8);
}

/**
 * 5% of Bitcoin that reached the deposit wallet and is still there or was moved
 * to the payout wallet by a recorded top-up. Fees already paid are not added back.
 */
export function coldReserveSats(confirmedSats: bigint, sweptSats: bigint): bigint {
  if (confirmedSats < 0n || sweptSats < 0n) return 0n;
  return ((confirmedSats + sweptSats) * SWEEP_RESERVE_BPS) / 10_000n;
}

function saneCents(cents: number): number {
  if (!Number.isSafeInteger(cents) || cents < 0) return 0;
  return cents;
}

/**
 * Hot-wallet target. Open Bitcoin cashouts and the last day of Bitcoin cashouts
 * both count. A quiet day still keeps $50. The target never passes the daily cap.
 */
export function payoutFloatTargetCents(pendingCents: number, demandCents: number): number {
  return Math.min(
    SWEEP_DAILY_MAX_CENTS,
    Math.max(saneCents(pendingCents), saneCents(demandCents), SWEEP_TARGET_FLOOR_CENTS),
  );
}

/**
 * Player USD that would be uncovered after the payout wallet reaches its target
 * and the ETH and USDC wallets are counted. That amount stays in the deposit wallet.
 */
export function uncoveredLiabilityCents(
  owedCents: number,
  otherCoverCents: number,
  targetCents: number,
): number {
  return Math.max(0, saneCents(owedCents) - saneCents(otherCoverCents) - saneCents(targetCents));
}

/** Satoshis that must stay for the uncovered liability. Too large or unquotable blocks a send. */
export function liabilityKeepSats(uncoveredCents: number, rateMicro: bigint): bigint | null {
  if (uncoveredCents < 100) return 0n;
  return satsForUsdCents(uncoveredCents, rateMicro);
}

/** Confirmed coins that can move without spending the larger of the 5% floor and the liability. */
export function spendableDepositSats(
  confirmedSats: bigint,
  sweptSats: bigint,
  liabilitySats = 0n,
): bigint {
  const cold = coldReserveSats(confirmedSats, sweptSats);
  const liability = liabilitySats > 0n ? liabilitySats : 0n;
  const floor = cold > liability ? cold : liability;
  const keep = floor + SWEEP_FEE_BUFFER_SATS;
  if (confirmedSats <= keep) return 0n;
  return confirmedSats - keep;
}

/** Confirmed coins must cover the send, the reserve, and the fee buffer. */
export function sweepWithinBalance(
  confirmedSats: bigint,
  sendSats: bigint,
  sweptSats = 0n,
  liabilitySats = 0n,
): boolean {
  return (
    sendSats >= BTC_DUST_SATS &&
    sendSats <= spendableDepositSats(confirmedSats, sweptSats, liabilitySats)
  );
}

/**
 * Dollars still needed to reach the target. A gap under $10 still sends $10.
 * One send stops at $1,000 even when the target is higher.
 */
export function autoTopUpCents(payoutCents: number, targetCents: number): number | null {
  if (!Number.isSafeInteger(payoutCents) || payoutCents < 0) return null;
  if (!Number.isSafeInteger(targetCents) || targetCents < SWEEP_MIN_CENTS) return null;
  if (payoutCents >= targetCents) return null;
  return Math.min(SWEEP_MAX_CENTS, Math.max(targetCents - payoutCents, SWEEP_MIN_CENTS));
}

/**
 * Surplus to move once the deposit wallet holds $50. The caller already removed
 * the 5% reserve and the miner-fee buffer from spendableCents.
 * One send stops at $1,000.
 */
export function depositSweepCents(depositCents: number, spendableCents: number): number | null {
  if (!Number.isSafeInteger(depositCents) || depositCents < SWEEP_TRIGGER_CENTS) return null;
  if (!Number.isSafeInteger(spendableCents) || spendableCents < SWEEP_MIN_CENTS) return null;
  return Math.min(SWEEP_MAX_CENTS, spendableCents);
}

/**
 * Broadcast body for a deposit-wallet top-up. The destination is the payout wallet
 * address already checked by the caller. The fee is paid by the deposit wallet.
 */
export function btcSweepTransaction(destination: string, btcAmount: string) {
  if (!isBtcPayoutAddress(destination)) return null;
  if (!/^(?:0|[1-9]\d*)\.\d{8}$/.test(btcAmount)) return null;
  return {
    destinations: [{ destination, amount: btcAmount, subtractFromAmount: false }],
    proceedWithBroadcast: true,
    excludeUnconfirmed: true,
  };
}

/** BTCPay store rate for BTC_USD, in micro-USD per BTC. */
export function readBtcUsdMicro(body: unknown): bigint | null {
  if (!Array.isArray(body)) return null;
  const row = body.find(
    (r) =>
      r && typeof r === "object" && (r as Record<string, unknown>)["currencyPair"] === "BTC_USD",
  ) as Record<string, unknown> | undefined;
  if (!row || (Array.isArray(row["errors"]) && row["errors"].length > 0)) return null;
  const micro = decimalToUnits(row["rate"], 6);
  return micro && micro > 0n ? micro : null;
}

export function isOnchainMethod(method: string, expected: string): boolean {
  if (isLightningMethod(method)) return false;
  return method === expected || method === "BTC" || method.endsWith("-CHAIN");
}

export function isLightningMethod(method: string): boolean {
  return /LN|LIGHTNING/i.test(method);
}

export type BtcPayment = {
  method: string;
  status: string;
  sats?: bigint | null;
  receivedAt?: number | null;
  txid?: string | null;
  vout?: number | null;
};

export type DepositOutput = {
  txid: string;
  vout: number;
  sats: bigint;
  status: string;
};

const OUTPUT_ID = /^([0-9a-f]{64})-(\d+)$/i;

/** BTCPay on-chain payment ids are `txid-vout`. Anything else is not an output. */
export function readOutputId(id: string): { txid: string; vout: number } | null {
  const match = OUTPUT_ID.exec(id.trim());
  if (!match) return null;
  const vout = Number(match[2]);
  if (!Number.isSafeInteger(vout) || vout < 0 || vout > 100_000) return null;
  return { txid: match[1]!.toLowerCase(), vout };
}

export type CreditInput = {
  status: string;
  additionalStatus: string | null;
  speedPolicy: string | null;
  requiredConfirmations: number;
  currency: string;
  amount: string;
  expectedCents: number;
  orderId: string | null;
  expectedOrderId: string;
  payments: readonly BtcPayment[] | null;
  onchainMethod: string;
};

export type CreditDecision = { credit: true; cents: number } | { credit: false; reason: string };

/** Credit the invoice's USD amount, or refuse. Never prices BTC a second time. */
export function decideBtcCredit(input: CreditInput): CreditDecision {
  if (!ONCHAIN_METHOD.test(input.onchainMethod)) return { credit: false, reason: "METHOD_INVALID" };
  if (input.orderId !== input.expectedOrderId) return { credit: false, reason: "ORDER_MISMATCH" };
  if (input.currency.toUpperCase() !== "USD") return { credit: false, reason: "CURRENCY" };
  const cents = usdAmountToCents(input.amount);
  if (cents == null || cents !== input.expectedCents) return { credit: false, reason: "AMOUNT" };
  if (input.status !== "Settled") return { credit: false, reason: "NOT_SETTLED" };
  const extra = input.additionalStatus ?? "None";
  if (extra !== "None" && extra !== "PaidOver")
    return { credit: false, reason: "ADDITIONAL_STATUS" };
  const floor = SPEED_FLOOR[input.speedPolicy as SpeedPolicyName];
  if (floor == null || floor < input.requiredConfirmations)
    return { credit: false, reason: "CONFIRMATIONS" };
  if (!input.payments) return { credit: false, reason: "PAYMENTS_UNVERIFIED" };
  if (
    input.payments.some(
      (payment) => isLightningMethod(payment.method) && payment.status !== "Invalid",
    )
  ) {
    return { credit: false, reason: "LIGHTNING" };
  }
  const onchainSettled = input.payments.some(
    (payment) =>
      isOnchainMethod(payment.method, input.onchainMethod) && payment.status === "Settled",
  );
  if (!onchainSettled) return { credit: false, reason: "ONCHAIN_UNSETTLED" };
  return { credit: true, cents };
}

const CREDIT_CAP_CENTS = 100_000_000n;

/**
 * Cents owed for settled on-chain sats at the invoice's own USD/BTC rate.
 * A full cover is never short of the invoice amount. No second BTC price.
 */
export function creditCentsForSats(
  usdCents: number,
  dueSats: bigint,
  paidSats: bigint,
): { ok: true; cents: number } | { ok: false; reason: "NO_RATE" | "DUST" | "OVER_CAP" } {
  if (!Number.isSafeInteger(usdCents) || usdCents <= 0 || dueSats <= 0n || paidSats <= 0n) {
    return { ok: false, reason: "NO_RATE" };
  }
  let cents = (paidSats * BigInt(usdCents)) / dueSats;
  if (paidSats >= dueSats && cents < BigInt(usdCents)) cents = BigInt(usdCents);
  if (cents < 1n) return { ok: false, reason: "DUST" };
  if (cents > CREDIT_CAP_CENTS) return { ok: false, reason: "OVER_CAP" };
  return { ok: true, cents: Number(cents) };
}

/**
 * Settled on-chain sats, split by whether BTCPay received them before the invoice expired.
 * A payment with no receive time, or an invoice with no expiry, counts as late.
 * Null when a settled payment has no readable value.
 */
export function receivedOnchain(
  payments: readonly BtcPayment[] | null,
  onchainMethod: string,
  expiresAt: number | null = null,
): {
  lightning: boolean;
  confirming: boolean;
  sats: bigint;
  ontimeSats: bigint;
  lateSats: bigint;
} | null {
  if (!payments || !ONCHAIN_METHOD.test(onchainMethod)) return null;
  let lightning = false;
  let confirming = false;
  let ontimeSats = 0n;
  let lateSats = 0n;
  let missing = false;
  const seen = new Map<string, bigint>();
  for (const payment of payments) {
    if (isLightningMethod(payment.method) && payment.status !== "Invalid") lightning = true;
    if (!isOnchainMethod(payment.method, onchainMethod)) continue;
    if (payment.status === "Processing") confirming = true;
    if (payment.status !== "Settled") continue;
    if (payment.sats == null || payment.sats < 0n) {
      missing = true;
      continue;
    }
    if (payment.txid && payment.vout != null) {
      const key = `${payment.txid}:${payment.vout}`;
      const prior = seen.get(key);
      if (prior != null) {
        if (prior !== payment.sats) return null;
        continue;
      }
      seen.set(key, payment.sats);
    }
    const ontime =
      expiresAt != null && payment.receivedAt != null && payment.receivedAt <= expiresAt;
    if (ontime) ontimeSats += payment.sats;
    else lateSats += payment.sats;
  }
  if (missing) return null;
  return { lightning, confirming, sats: ontimeSats + lateSats, ontimeSats, lateSats };
}

function unixSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d{9,11}$/.test(value)) return Number(value);
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
  }
  return null;
}

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function scalarText(value: unknown): string | null {
  return (
    text(value) ?? (typeof value === "number" && Number.isFinite(value) ? String(value) : null)
  );
}

export type InvoiceView = {
  id: string;
  status: string;
  additionalStatus: string | null;
  currency: string;
  amount: string;
  orderId: string | null;
  speedPolicy: string | null;
  expiresAt: string | null;
  expiresAtUnix: number | null;
};

export function readInvoiceView(body: unknown): InvoiceView | null {
  const row = record(body);
  if (!row) return null;
  const id = text(row["id"]);
  const status = text(row["status"]);
  const currency = text(row["currency"]);
  const amount = text(row["amount"]);
  if (!id || !status || !currency || !amount) return null;
  const metadata = record(row["metadata"]);
  const checkout = record(row["checkout"]);
  const expiresAtUnix = unixSeconds(row["expirationTime"]);
  return {
    id,
    status,
    additionalStatus: text(row["additionalStatus"]),
    currency,
    amount,
    orderId: metadata ? text(metadata["orderId"]) : null,
    speedPolicy: checkout ? text(checkout["speedPolicy"]) : null,
    expiresAt: expiresAtUnix == null ? null : new Date(expiresAtUnix * 1000).toISOString(),
    expiresAtUnix,
  };
}

/** Pull on-chain and other payments off the payment-methods payload. */
export function readPayments(body: unknown): BtcPayment[] | null {
  const list = Array.isArray(body) ? body : null;
  if (!list) return null;
  const payments: BtcPayment[] = [];
  for (const item of list) {
    const method = record(item);
    if (!method) return null;
    const methodId = text(method["paymentMethodId"]) ?? text(method["paymentMethod"]);
    if (!methodId) return null;
    const rawPayments = method["payments"];
    if (rawPayments == null) continue;
    if (!Array.isArray(rawPayments)) return null;
    for (const payment of rawPayments) {
      const row = record(payment);
      const status = row ? text(row["status"]) : null;
      if (!status) return null;
      const value = row ? (scalarText(row["value"]) ?? scalarText(row["amount"])) : null;
      const sats = value == null ? null : decimalToUnits(value, 8);
      if (value != null && sats == null) return null;
      const output = row && text(row["id"]) ? readOutputId(text(row["id"])!) : null;
      payments.push({
        method: methodId,
        status,
        sats,
        receivedAt: row ? unixSeconds(row["receivedDate"]) : null,
        txid: output?.txid ?? null,
        vout: output?.vout ?? null,
      });
    }
  }
  return payments;
}

export function readOnchainDestination(
  body: unknown,
  onchainMethod: string,
): { address: string; btcDue: string } | null {
  if (!Array.isArray(body)) return null;
  for (const item of body) {
    const method = record(item);
    if (!method) continue;
    const methodId = text(method["paymentMethodId"]) ?? text(method["paymentMethod"]);
    if (!methodId || !isOnchainMethod(methodId, onchainMethod)) continue;
    const address = text(method["destination"]);
    const btcDue = scalarText(method["due"]) ?? scalarText(method["amount"]);
    if (!address || !btcDue) return null;
    return { address, btcDue };
  }
  return null;
}

export type PayoutView = {
  id: string;
  state: string;
  method: string | null;
  destination: string | null;
  orderId: string | null;
  /** Authoritative send currency. Null when BTCPay omits it. Never defaulted to USD. */
  payoutCurrency: string | null;
  originalCurrency: string | null;
  payoutSats: bigint | null;
  originalSats: bigint | null;
  txid: string | null;
};

function btcSats(value: unknown): bigint | null {
  const raw = scalarText(value);
  if (!raw) return null;
  return decimalToUnits(raw, 8);
}

function explicitBtcCurrency(value: unknown): string | null {
  const raw = text(value);
  return raw ? raw.toUpperCase() : null;
}

/** Transaction id from a BTCPay payment proof. A missing proof is not a txid. */
export function readPaymentProof(value: unknown): string | null {
  if (typeof value === "string" && /^[0-9a-f]{64}$/i.test(value.trim())) {
    return value.trim().toLowerCase();
  }
  const row = record(value);
  if (!row) return null;
  for (const [key, entry] of Object.entries(row)) {
    if (!/^(transactionid|txid|id)$/i.test(key)) continue;
    const found = readPaymentProof(entry);
    if (found) return found;
  }
  return null;
}

/**
 * Reads the fields this BTCPay server actually stores.
 * `amount` and `currency` are ignored unless currency is explicitly BTC.
 * A missing payout amount stays null.
 */
export function readPayoutView(body: unknown): PayoutView | null {
  const row = record(body);
  if (!row) return null;
  const id = text(row["id"]);
  const state = text(row["state"]);
  if (!id || !state) return null;
  const metadata = record(row["metadata"]);
  const legacyCurrency = explicitBtcCurrency(row["currency"]);
  const legacyIsBtc = legacyCurrency === "BTC";
  return {
    id,
    state,
    method: text(row["payoutMethodId"]) ?? text(row["paymentMethodId"]),
    destination: text(row["destination"]),
    orderId: metadata ? text(metadata["orderId"]) : null,
    payoutCurrency: explicitBtcCurrency(row["payoutCurrency"]) ?? (legacyIsBtc ? "BTC" : null),
    originalCurrency: explicitBtcCurrency(row["originalCurrency"]),
    payoutSats: btcSats(row["payoutAmount"]) ?? (legacyIsBtc ? btcSats(row["amount"]) : null),
    originalSats: btcSats(row["originalAmount"]),
    txid: readPaymentProof(row["paymentProof"]),
  };
}

export type QuoteCheck = { ok: true; sats: bigint } | { ok: false; reason: string };

/**
 * The payout BTCPay will send must be the quoted satoshis, in BTC, to the
 * quoted address. A $1 quote must not match a 1 BTC payout.
 */
export function payoutMatchesQuote(
  view: PayoutView,
  quote: { sats: bigint; address: string; orderId: string; onchainMethod: string },
): QuoteCheck {
  if (quote.sats < BTC_DUST_SATS) return { ok: false, reason: "QUOTE" };
  if (view.orderId && view.orderId !== quote.orderId) return { ok: false, reason: "ORDER" };
  if (!payoutIsOnchain(view.method, quote.onchainMethod)) return { ok: false, reason: "METHOD" };
  if (!view.destination || view.destination.toLowerCase() !== quote.address.toLowerCase()) {
    return { ok: false, reason: "DESTINATION" };
  }
  if (view.payoutCurrency !== "BTC") return { ok: false, reason: "CURRENCY" };
  if (view.originalCurrency && view.originalCurrency !== "BTC") return { ok: false, reason: "CURRENCY" };
  if (view.payoutSats == null) return { ok: false, reason: "AMOUNT_MISSING" };
  if (view.payoutSats !== quote.sats) return { ok: false, reason: "AMOUNT" };
  if (view.originalSats != null && view.originalSats !== quote.sats) return { ok: false, reason: "AMOUNT" };
  return { ok: true, sats: view.payoutSats };
}

export function readPayoutList(body: unknown): PayoutView[] | null {
  const row = record(body);
  const list = Array.isArray(body) ? body : row ? (row["payouts"] ?? row["data"]) : null;
  if (!Array.isArray(list)) return null;
  const views: PayoutView[] = [];
  for (const item of list) {
    const view = readPayoutView(item);
    if (!view) return null;
    views.push(view);
  }
  return views;
}

/**
 * Settled and invalid on-chain outputs, one row per txid and vout.
 * Null when a settled or invalid output has no transaction identity.
 */
export function settledOutputs(
  payments: readonly BtcPayment[] | null,
  onchainMethod: string,
): DepositOutput[] | null {
  if (!payments || !ONCHAIN_METHOD.test(onchainMethod)) return null;
  const map = new Map<string, DepositOutput>();
  for (const payment of payments) {
    if (!isOnchainMethod(payment.method, onchainMethod)) continue;
    if (payment.status !== "Settled" && payment.status !== "Invalid") continue;
    if (!payment.txid || payment.vout == null || payment.sats == null || payment.sats < 0n) {
      return null;
    }
    const key = `${payment.txid}:${payment.vout}`;
    const prior = map.get(key);
    if (prior && prior.sats !== payment.sats) return null;
    if (!prior) {
      map.set(key, {
        txid: payment.txid,
        vout: payment.vout,
        sats: payment.sats,
        status: payment.status,
      });
    } else if (payment.status === "Invalid") {
      prior.status = "Invalid";
    }
  }
  return [...map.values()];
}

export function payoutIsOnchain(method: string | null, expected: string): boolean {
  if (!method) return false;
  if (isLightningMethod(method)) return false;
  return isOnchainMethod(method, expected);
}
