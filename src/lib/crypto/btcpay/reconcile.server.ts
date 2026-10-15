import { createInvoice, getBtcUsdRate, getInvoice, getPaymentMethods } from "./client.server";
import { readBtcpayConfig, readBtcpayPayoutConfig, type BtcpayConfig } from "./config.server";
import {
  centsToUsdAmount,
  readBtcUsdMicro,
  readInvoiceView,
  readOnchainDestination,
  readPayments,
  receivedOnchain,
  settledOutputs,
} from "./policy";

type Enabled = Extract<BtcpayConfig, { enabled: true }>;

type InvoiceRow = {
  id: string;
  user_id: string;
  btcpay_invoice_id: string;
  usd_cents: number;
  required_confirmations: number;
  status: string;
  credited_cents?: number | string | null;
};

type RowResult<T> = { data: T; error: { message: string } | null; count?: number | null };

type Filter = {
  eq: (column: string, value: string | number) => Filter;
  neq: (column: string, value: string) => Filter;
  not: (column: string, operator: string, value: string | null) => Filter;
  in: (column: string, values: readonly string[]) => Filter;
  gte: (column: string, value: string) => Filter;
  lt: (column: string, value: string) => Filter;
  order: (column: string, options: { ascending: boolean }) => Filter;
  limit: (count: number) => Filter;
  maybeSingle: <T>() => Promise<RowResult<T>>;
  then: Promise<RowResult<unknown[]>>["then"];
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (table: string) => {
      select: (columns: string, options?: { count: "exact"; head: true }) => Filter;
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      update: (row: Record<string, unknown>) => Filter;
    };
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
}

const OPEN = ["NEW", "PROCESSING", "SETTLED"];
const WATCH = ["NEW", "PROCESSING", "SETTLED", "EXPIRED", "CREDITED"];
/** Invoice expiry (60 min) plus BTCPay monitoring (24 h), with slack for confirmations. */
const WATCH_HOURS = 27;

/** BTCPay store BTC/USD in micro-USD, read with the payout key (the deposit key has no rate access). */
async function storeRateMicro(): Promise<bigint | null> {
  const payout = readBtcpayPayoutConfig();
  if (!payout.ok || !payout.enabled) return null;
  try {
    return readBtcUsdMicro(await getBtcUsdRate(payout));
  } catch {
    return null;
  }
}

function terminalStatus(status: string): "EXPIRED" | "INVALID" | null {
  if (status === "Expired") return "EXPIRED";
  if (status === "Invalid") return "INVALID";
  return null;
}

function covered(row: InvoiceRow): boolean {
  if (row.status !== "CREDITED") return false;
  const credited = Number(row.credited_cents ?? 0);
  return Number.isFinite(credited) && credited >= row.usd_cents;
}

/** Credit settled on-chain sats at the invoice rate, including partial and late payments. */
export async function reconcileInvoice(
  config: Enabled,
  row: InvoiceRow,
): Promise<"CREDITED" | "OPEN" | "CLOSED" | "REVIEW"> {
  const admin = await db();
  const [invoiceBody, methodBody] = await Promise.all([
    getInvoice(config, row.btcpay_invoice_id),
    getPaymentMethods(config, row.btcpay_invoice_id),
  ]);
  const invoice = readInvoiceView(invoiceBody);
  const payments = readPayments(methodBody);
  if (!invoice || invoice.id !== row.btcpay_invoice_id) return "OPEN";
  if (invoice.currency.toUpperCase() !== "USD") return "OPEN";
  const now = new Date().toISOString();
  if (invoice.orderId && invoice.orderId !== row.id) {
    await admin
      .from("btcpay_invoices")
      .update({ status: "REVIEW", closed_reason: "ORDER_MISMATCH", updated_at: now })
      .eq("id", row.id)
      .in("status", WATCH);
    return "REVIEW";
  }
  if (invoice.status === "Invalid") {
    await admin
      .from("btcpay_invoices")
      .update({ status: "INVALID", updated_at: now })
      .eq("id", row.id)
      .in("status", ["NEW", "PROCESSING", "SETTLED", "EXPIRED"]);
    return "CLOSED";
  }
  const received = receivedOnchain(payments, config.onchainMethod, invoice.expiresAtUnix);
  if (!received) return "OPEN";
  if (received.lightning) {
    await admin
      .from("btcpay_invoices")
      .update({ status: "REVIEW", closed_reason: "LIGHTNING", updated_at: now })
      .eq("id", row.id)
      .in("status", WATCH);
    return "REVIEW";
  }
  const outputs = settledOutputs(payments, config.onchainMethod);
  if (outputs && (row.status === "CREDITED" || row.status === "DISPUTED")) {
    const noted = await admin.rpc("btcpay_note_deposit_regression", {
      p_id: row.id,
      p_outputs: outputs.map((output) => ({
        txid: output.txid,
        vout: output.vout,
        sats: output.sats.toString(),
        status: output.status,
      })),
    });
    const notedStatus = (noted.data as { status?: string } | null)?.status;
    if (notedStatus === "DISPUTED") return "REVIEW";
  }
  if (received.sats > 0n) {
    const settled = outputs?.filter((output) => output.status === "Settled") ?? null;
    if (!settled || settled.length === 0) {
      console.error("[btcpay] BTC_DEPOSIT_IDENTITY_MISSING", { invoice: row.id });
      return "OPEN";
    }
    const rateMicro = received.lateSats > 0n ? await storeRateMicro() : null;
    const credited = await admin.rpc("btcpay_credit_received", {
      p_id: row.id,
      p_ontime_sats: received.ontimeSats.toString(),
      p_late_sats: received.lateSats.toString(),
      p_rate_micro: rateMicro == null ? null : rateMicro.toString(),
      p_onchain_settled: true,
      p_lightning_seen: false,
      p_order_id: invoice.orderId ?? row.id,
      p_currency: "USD",
      p_outputs: settled.map((output) => ({
        txid: output.txid,
        vout: output.vout,
        sats: output.sats.toString(),
        status: output.status,
      })),
    });
    if (credited.error) return "OPEN";
    const body = credited.data as { status?: string; delta?: number | string } | null;
    const status = body?.status;
    const delta = Number(body?.delta ?? 0);
    if (status === "CREDITED") return delta > 0 ? "CREDITED" : "OPEN";
    if (status === "REVIEW") return "REVIEW";
    if (status !== "DUST") return "OPEN";
  }
  if (received.confirming) {
    await admin
      .from("btcpay_invoices")
      .update({ status: "PROCESSING", updated_at: now })
      .eq("id", row.id)
      .in("status", ["NEW", "EXPIRED"]);
    return "OPEN";
  }
  const closed = terminalStatus(invoice.status);
  if (closed) {
    await admin
      .from("btcpay_invoices")
      .update({ status: closed, updated_at: now })
      .eq("id", row.id)
      .in("status", OPEN);
    return "CLOSED";
  }
  if (invoice.status === "Processing" && row.status === "NEW") {
    await admin
      .from("btcpay_invoices")
      .update({ status: "PROCESSING", updated_at: now })
      .eq("id", row.id)
      .eq("status", "NEW");
  }
  if (invoice.status === "Settled" && row.status !== "SETTLED" && row.status !== "CREDITED") {
    await admin
      .from("btcpay_invoices")
      .update({ status: "SETTLED", updated_at: now })
      .eq("id", row.id)
      .in("status", ["NEW", "PROCESSING"]);
  }
  return "OPEN";
}

export async function reconcileBtcpayInvoices(): Promise<
  { ok: true; checked: number; credited: number } | { ok: false; reason: string }
> {
  const config = readBtcpayConfig();
  if (!config.ok) return { ok: false, reason: config.reason };
  if (!config.enabled) return { ok: true, checked: 0, credited: 0 };
  const admin = await db();
  await admin
    .from("btcpay_invoices")
    .update({
      status: "EXPIRED",
      closed_reason: "QUOTE_EXPIRED",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "NEW")
    .lt("expires_at", new Date().toISOString());
  const cols =
    "id, user_id, btcpay_invoice_id, usd_cents, credited_cents, required_confirmations, status";
  const openSince = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const watchSince = new Date(Date.now() - WATCH_HOURS * 60 * 60 * 1000).toISOString();
  const [open, watched] = await Promise.all([
    admin
      .from("btcpay_invoices")
      .select(cols)
      .in("status", OPEN)
      .gte("created_at", openSince)
      .order("updated_at", { ascending: true })
      .limit(20),
    admin
      .from("btcpay_invoices")
      .select(cols)
      .in("status", ["EXPIRED", "CREDITED"])
      .gte("created_at", watchSince)
      .order("updated_at", { ascending: true })
      .limit(20),
  ]);
  if (open.error || watched.error) return { ok: false, reason: "INVOICE_LIST_FAILED" };
  const watchedRows = (watched.data ?? []) as InvoiceRow[];
  const rows = [
    ...((open.data ?? []) as InvoiceRow[]),
    ...watchedRows.filter((row) => !covered(row)).slice(0, 8),
  ];
  const touched = new Set(rows.map((row) => row.id));
  let credited = 0;
  for (const row of [...rows, ...watchedRows.filter((row) => covered(row))]) {
    if (!covered(row)) {
      try {
        if ((await reconcileInvoice(config, row)) === "CREDITED") credited += 1;
      } catch {
        // One BTCPay miss leaves the row for the next minute.
      }
    } else touched.add(row.id);
    await admin
      .from("btcpay_invoices")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", row.status);
  }
  return { ok: true, checked: touched.size, credited };
}

export async function createBtcInvoiceForUser(
  userId: string,
  usdCents: number,
): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      id: string;
      address: string;
      btcDue: string;
      usdCents: number;
      expiresAt: string | null;
      network: "mainnet";
      requiredConfirmations: number;
    }
> {
  const config = readBtcpayConfig();
  if (!config.ok) return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  if (!config.enabled) return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  if (!Number.isInteger(usdCents) || usdCents < config.minCents || usdCents > 100_000_000) {
    return { ok: false, error: "Amount is below the minimum for Bitcoin." };
  }
  const admin = await db();
  const openCount = () =>
    admin
      .from("btcpay_invoices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["NEW", "PROCESSING"]);
  const { count: paying, error: payingError } = await admin
    .from("btcpay_invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "PROCESSING");
  if (payingError) return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  if ((paying ?? 0) > 0)
    return { ok: false, error: "You already have a Bitcoin deposit in progress." };
  const reusable = await admin
    .from("btcpay_invoices")
    .select("id, address, btc_due, usd_cents, expires_at, network, required_confirmations, status")
    .eq("user_id", userId)
    .eq("status", "NEW")
    .eq("usd_cents", usdCents)
    .not("address", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      address: string | null;
      btc_due: string | null;
      usd_cents: number;
      expires_at: string | null;
      network: string;
      required_confirmations: number;
      status: string;
    }>();
  const live = reusable.data;
  if (
    live?.address &&
    live.address.toLowerCase().startsWith("bc1") &&
    (live.expires_at == null || new Date(live.expires_at).getTime() > Date.now() + 60_000)
  ) {
    return {
      ok: true,
      id: live.id,
      address: live.address,
      btcDue: live.btc_due ?? "",
      usdCents: live.usd_cents,
      expiresAt: live.expires_at,
      network: "mainnet",
      requiredConfirmations: live.required_confirmations,
    };
  }
  let open = await openCount();
  if (open.error) return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  if ((open.count ?? 0) >= 3) {
    const cleared = await admin
      .from("btcpay_invoices")
      .update({
        status: "EXPIRED",
        closed_reason: "REPLACED",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("status", "NEW");
    if (cleared.error) return { ok: false, error: "Bitcoin deposits are unavailable right now." };
    open = await openCount();
    if (open.error) return { ok: false, error: "Bitcoin deposits are unavailable right now." };
    if ((open.count ?? 0) >= 3)
      return { ok: false, error: "You already have a Bitcoin deposit in progress." };
  }
  const id = crypto.randomUUID();
  let created: unknown;
  try {
    created = await createInvoice(config, id, centsToUsdAmount(usdCents));
  } catch {
    return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  }
  const invoice = readInvoiceView(created);
  if (!invoice) return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  let methods: unknown;
  try {
    methods = await getPaymentMethods(config, invoice.id);
  } catch {
    return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  }
  const destination = readOnchainDestination(methods, config.onchainMethod);
  if (!destination || !destination.address.toLowerCase().startsWith("bc1")) {
    return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  }
  const { error } = await admin.from("btcpay_invoices").insert({
    id,
    user_id: userId,
    btcpay_invoice_id: invoice.id,
    usd_cents: usdCents,
    required_confirmations: config.requiredConfirmations,
    speed_policy: config.speedPolicy,
    network: config.network,
    status: "NEW",
    address: destination.address,
    btc_due: destination.btcDue,
    expires_at: invoice.expiresAt,
  });
  if (error) return { ok: false, error: "Bitcoin deposits are unavailable right now." };
  await admin
    .from("btcpay_invoices")
    .update({
      status: "EXPIRED",
      closed_reason: "REPLACED",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "NEW")
    .neq("id", id);
  return {
    ok: true,
    id,
    address: destination.address,
    btcDue: destination.btcDue,
    usdCents,
    expiresAt: invoice.expiresAt,
    network: config.network,
    requiredConfirmations: config.requiredConfirmations,
  };
}

export async function loadLatestOpenBtcInvoice(userId: string) {
  const admin = await db();
  const { data } = await admin
    .from("btcpay_invoices")
    .select(
      "id, user_id, btcpay_invoice_id, status, address, btc_due, usd_cents, expires_at, network, required_confirmations",
    )
    .eq("user_id", userId)
    .in("status", ["NEW", "PROCESSING", "SETTLED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as
    | (InvoiceRow & {
        address: string | null;
        btc_due: string | null;
        expires_at: string | null;
        network: string;
      })
    | null;
}

export async function loadBtcInvoice(userId: string, id: string) {
  const admin = await db();
  const { data } = await admin
    .from("btcpay_invoices")
    .select(
      "id, user_id, btcpay_invoice_id, status, address, btc_due, usd_cents, expires_at, network, required_confirmations",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return data as
    | (InvoiceRow & {
        address: string | null;
        btc_due: string | null;
        expires_at: string | null;
        network: string;
      })
    | null;
}

export async function reconcileByBtcpayId(invoiceId: string, storeId: string): Promise<void> {
  const config = readBtcpayConfig();
  if (!config.ok || !config.enabled || storeId !== config.storeId) return;
  const admin = await db();
  const { data } = await admin
    .from("btcpay_invoices")
    .select(
      "id, user_id, btcpay_invoice_id, usd_cents, credited_cents, required_confirmations, status",
    )
    .eq("btcpay_invoice_id", invoiceId)
    .maybeSingle();
  const row = data as InvoiceRow | null;
  if (!row || row.status === "INVALID" || row.status === "REVIEW") return;
  await reconcileInvoice(config, row);
}
