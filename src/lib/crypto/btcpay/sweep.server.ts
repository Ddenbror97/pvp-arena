import { BtcpayError, createOnChainTransfer, getBtcUsdRate, getOnChainAddress, getOnChainWallet, getPayoutWallet } from "./client.server";
import { readBtcpayPayoutConfig, readBtcpaySweepConfig } from "./config.server";
import {
  SWEEP_DAILY_MAX_CENTS,
  SWEEP_MAX_CENTS,
  SWEEP_MIN_CENTS,
  SWEEP_TRIGGER_CENTS,
  btcSweepTransaction,
  depositSweepCents,
  payoutFloatTargetCents,
  readBtcUsdMicro,
  readSweepTxid,
  readWalletAddress,
  readWalletSats,
  satsForUsdCents,
  satsToBtcAmount,
  satsToUsdCents,
  spendableDepositSats,
  sweepWithinBalance,
} from "./policy";

export type HotWalletTransfer = {
  createdAt: string;
  usdCents: number;
  sats: string;
  status: string;
  txid: string | null;
};

export type HotWalletPreview = {
  payoutSats: string | null;
  payoutCents: number | null;
  depositSats: string | null;
  depositCents: number | null;
  destination: string | null;
  targetCents: number | null;
  pendingCents: number | null;
  demandCents: number | null;
  owedCents: number | null;
  otherCoverCents: number | null;
  transfers: HotWalletTransfer[];
  reason: string | null;
};

const EMPTY: HotWalletPreview = {
  payoutSats: null,
  payoutCents: null,
  depositSats: null,
  depositCents: null,
  destination: null,
  targetCents: null,
  pendingCents: null,
  demandCents: null,
  owedCents: null,
  otherCoverCents: null,
  transfers: [],
  reason: null,
};

type FloatBooks = {
  owed_cents?: number | string;
  pending_btc_cents?: number | string;
  demand_btc_cents?: number | string;
  other_cover_cents?: number | string;
  transfers?: {
    created_at?: string;
    usd_cents?: number | string;
    sats?: number | string;
    status?: string;
    txid?: string | null;
  }[];
};

function centsField(value: number | string | undefined): number {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

async function floatBooks(): Promise<FloatBooks | null> {
  const db = await transferDb();
  const { data, error } = await db.rpc("btc_float_books");
  if (error || !data || typeof data !== "object") return null;
  return data as FloatBooks;
}

function listedTransfers(books: FloatBooks | null): HotWalletTransfer[] {
  if (!books?.transfers) return [];
  return books.transfers.flatMap((row) => {
    if (!row.created_at || !row.status) return [];
    return [
      {
        createdAt: row.created_at,
        usdCents: centsField(row.usd_cents),
        sats: String(row.sats ?? "0"),
        status: row.status,
        txid: row.txid ?? null,
      },
    ];
  });
}

function centsOf(sats: bigint | null, rate: bigint | null): number | null {
  if (sats == null || rate == null) return null;
  return satsToUsdCents(sats, rate);
}

function bookFields(books: FloatBooks | null) {
  if (!books) {
    return {
      targetCents: null,
      pendingCents: null,
      demandCents: null,
      owedCents: null,
      otherCoverCents: null,
      transfers: [] as HotWalletTransfer[],
    };
  }
  const pendingCents = centsField(books.pending_btc_cents);
  const demandCents = centsField(books.demand_btc_cents);
  return {
    targetCents: payoutFloatTargetCents(pendingCents, demandCents),
    pendingCents,
    demandCents,
    owedCents: centsField(books.owed_cents),
    otherCoverCents: centsField(books.other_cover_cents),
    transfers: listedTransfers(books),
  };
}

export async function previewBtcHotWallet(): Promise<HotWalletPreview> {
  const books = await floatBooks();
  const fields = bookFields(books);
  const payout = readBtcpayPayoutConfig();
  if (!payout.ok || !payout.enabled) {
    return { ...EMPTY, ...fields, reason: "Bitcoin cashouts are not configured." };
  }
  const sweep = readBtcpaySweepConfig();
  let rate: bigint | null = null;
  let payoutSats: bigint | null = null;
  let destination: string | null = null;
  try {
    const [wallet, rates, address] = await Promise.all([
      getPayoutWallet(payout),
      getBtcUsdRate(payout),
      getOnChainAddress(payout, payout.onchainMethod),
    ]);
    rate = readBtcUsdMicro(rates);
    payoutSats = readWalletSats(wallet);
    destination = readWalletAddress(address);
  } catch {
    return { ...EMPTY, ...fields, reason: "Could not read the payout wallet." };
  }

  if (!sweep.ok) {
    return { ...EMPTY, ...fields, destination, reason: "The deposit spend key is not valid." };
  }
  if (!sweep.enabled) {
    return {
      ...EMPTY,
      ...fields,
      payoutSats: payoutSats?.toString() ?? null,
      payoutCents: centsOf(payoutSats, rate),
      destination,
      reason:
        "The deposit wallet cannot spend yet. Add BTCPAY_SWEEP_API_KEY for the deposit store.",
    };
  }

  let depositSats: bigint | null = null;
  try {
    depositSats = readWalletSats(await getOnChainWallet(sweep, sweep.onchainMethod));
  } catch (error) {
    const denied = error instanceof BtcpayError && (error.status === 401 || error.status === 403);
    return {
      ...EMPTY,
      ...fields,
      payoutSats: payoutSats?.toString() ?? null,
      payoutCents: centsOf(payoutSats, rate),
      destination,
      reason: denied
        ? "That key cannot read the deposit wallet. It needs view, create, sign, and broadcast on the deposit store."
        : "Could not read the deposit wallet.",
    };
  }

  return {
    ...fields,
    payoutSats: payoutSats?.toString() ?? null,
    payoutCents: centsOf(payoutSats, rate),
    depositSats: depositSats?.toString() ?? null,
    depositCents: centsOf(depositSats, rate),
    destination,
    reason: destination == null ? "The payout wallet has no receive address." : null,
  };
}

async function transferDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function transferHistory(): Promise<{ sweptSats: bigint; coolingDown: boolean } | null> {
  const db = await transferDb();
  const { data, error } = await db.rpc("btc_wallet_transfer_state");
  if (error || !data || typeof data !== "object") return null;
  const row = data as { swept_sats?: number | string; cooling_down?: boolean };
  try {
    return { sweptSats: BigInt(row.swept_sats ?? 0), coolingDown: row.cooling_down === true };
  } catch {
    return null;
  }
}

async function broadcastTopUp(
  usdCents: number,
  sweptSats: bigint,
  liabilitySats: bigint | null,
) {
  if (!Number.isInteger(usdCents) || usdCents < SWEEP_MIN_CENTS || usdCents > SWEEP_MAX_CENTS) {
    return { ok: false as const, error: "Enter from $10 to $1,000." };
  }
  const payout = readBtcpayPayoutConfig();
  const sweep = readBtcpaySweepConfig();
  if (!payout.ok || !payout.enabled) {
    return { ok: false as const, error: "Bitcoin cashouts are not configured." };
  }
  if (!sweep.ok || !sweep.enabled) {
    return { ok: false as const, error: "The deposit wallet cannot spend yet." };
  }

  let destination: string | null;
  let rate: bigint | null;
  let depositSats: bigint | null;
  try {
    const [address, rates, wallet] = await Promise.all([
      getOnChainAddress(payout, payout.onchainMethod),
      getBtcUsdRate(payout),
      getOnChainWallet(sweep, sweep.onchainMethod),
    ]);
    destination = readWalletAddress(address);
    rate = readBtcUsdMicro(rates);
    depositSats = readWalletSats(wallet);
  } catch {
    return { ok: false as const, error: "Could not read the wallets. Nothing was sent." };
  }
  if (!destination || rate == null || depositSats == null) {
    return { ok: false as const, error: "Could not price the top-up. Nothing was sent." };
  }
  let sats = satsForUsdCents(usdCents, rate);
  const cap =
    liabilitySats == null ? 0n : spendableDepositSats(depositSats, sweptSats, liabilitySats);
  if (sats != null && sats > cap) sats = cap;
  const amount = sats == null ? null : satsToBtcAmount(sats);
  const body = amount == null || sats == null ? null : btcSweepTransaction(destination, amount);
  const recordedCents = sats == null ? null : satsToUsdCents(sats, rate);
  if (
    liabilitySats == null ||
    sats == null ||
    body == null ||
    recordedCents == null ||
    recordedCents < SWEEP_MIN_CENTS ||
    !sweepWithinBalance(depositSats, sats, sweptSats, liabilitySats)
  ) {
    return {
      ok: false as const,
      error: "That would take the deposit wallet under 5% of received Bitcoin. Nothing was sent.",
    };
  }

  const db = await transferDb();
  const begun = await db.rpc("btc_wallet_transfer_begin", {
    p_admin: null,
    p_usd_cents: recordedCents,
    p_sats: Number(sats),
    p_destination: destination,
  });
  if (begun.error || typeof begun.data !== "string") {
    const message = begun.error?.message ?? "";
    if (message.includes("TRANSFER_IN_PROGRESS")) {
      return { ok: false as const, error: "A top-up is already in progress." };
    }
    if (message.includes("DAILY_SWEEP_LIMIT")) {
      return {
        ok: false as const,
        error: `That would pass the $${SWEEP_DAILY_MAX_CENTS / 100} daily top-up limit.`,
      };
    }
    return { ok: false as const, error: "Could not start the top-up. Nothing was sent." };
  }
  const id = begun.data;

  let txid: string | null = null;
  try {
    const sent = await createOnChainTransfer(sweep, sweep.onchainMethod, body);
    txid = readSweepTxid(sent);
    if (!txid) {
      await db.rpc("btc_wallet_transfer_finish", { p_id: id, p_txid: null, p_ok: false });
      return {
        ok: false as const,
        error:
          "The broadcast did not return a transaction id. Check the deposit wallet before trying again.",
      };
    }
    await db.rpc("btc_wallet_transfer_finish", { p_id: id, p_txid: txid, p_ok: true });
    return { ok: true as const, txid, sats: sats.toString() };
  } catch (error) {
    if (txid) return { ok: true as const, txid, sats: sats.toString() };
    await db.rpc("btc_wallet_transfer_finish", { p_id: id, p_txid: null, p_ok: false });
    if (error instanceof BtcpayError && (error.status === 401 || error.status === 403)) {
      return { ok: false as const, error: "That key cannot spend the deposit wallet. Nothing was sent." };
    }
    if (error instanceof BtcpayError && error.status === 503) {
      return {
        ok: false as const,
        error: "BTCPay is not allowing this key to sign. Nothing was sent.",
      };
    }
    return { ok: false as const, error: "BTCPay refused the top-up. Nothing new was recorded as sent." };
  }
}

/** Once the deposit wallet holds $50, move the surplus and leave 5% of received Bitcoin. */
export async function maintainBtcHotWallet(): Promise<string> {
  const payout = readBtcpayPayoutConfig();
  const sweep = readBtcpaySweepConfig();
  if (!payout.ok || !payout.enabled || !sweep.ok || !sweep.enabled) return "not-configured";
  const history = await transferHistory();
  if (!history) return "history-unavailable";
  if (history.coolingDown) return "cooldown";
  let depositSats: bigint | null = null;
  let rate: bigint | null = null;
  try {
    const [wallet, rates] = await Promise.all([
      getOnChainWallet(sweep, sweep.onchainMethod),
      getBtcUsdRate(payout),
    ]);
    depositSats = readWalletSats(wallet);
    rate = readBtcUsdMicro(rates);
  } catch {
    return "wallets-unreadable";
  }
  if (depositSats == null || rate == null) return "wallets-unreadable";
  const depositCents = satsToUsdCents(depositSats, rate);
  if (depositCents == null) return "wallets-unreadable";
  if (depositCents < SWEEP_TRIGGER_CENTS) return "below-threshold";
  const spendableCents = satsToUsdCents(spendableDepositSats(depositSats, history.sweptSats), rate) ?? 0;
  const cents = depositSweepCents(depositCents, spendableCents);
  if (cents == null) return "reserve";
  const sent = await broadcastTopUp(cents, history.sweptSats, 0n);
  if (!sent.ok) {
    if (sent.error.includes("5%")) return "reserve";
    if (sent.error.includes("not allowing")) return "hot-wallet-policy";
    if (sent.error.includes("in progress")) return "cooldown";
    if (sent.error.includes("daily")) return "daily-limit";
    return "refused";
  }
  return "sent";
}
