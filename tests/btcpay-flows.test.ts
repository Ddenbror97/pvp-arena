/**
 * The Bitcoin deposit and cashout flows end to end against a scripted BTCPay and database
 * (audit, 2026-11-11: only the pure rules had tests). What matters in each: what is credited,
 * what is released, and that an unknown outcome never releases or pays twice.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env: Record<string, string> = {
  BTCPAY_NETWORK: "mainnet",
  BTCPAY_URL: "https://btcpay.example",
  BTCPAY_DEPOSITS_ENABLED: "true",
  BTCPAY_STORE_ID: "deposit-store",
  BTCPAY_API_KEY: "deposit-key",
  BTCPAY_WEBHOOK_SECRET: "hook",
  BTCPAY_PAYOUTS_ENABLED: "true",
  BTCPAY_PAYOUT_STORE_ID: "payout-store",
  BTCPAY_PAYOUT_API_KEY: "payout-key",
  BTC_WITHDRAWAL_AUTO_CENTS: "5000",
};
vi.mock("@/lib/worker-env", () => ({ workerEnv: (key: string) => env[key] }));

type Call = { table: string; op: string; values?: Record<string, unknown>; filters: unknown[][] };
const db = {
  rpcs: [] as Array<[string, Record<string, unknown>]>,
  writes: [] as Call[],
  rpcResult: {} as Record<string, { data?: unknown; error?: { message: string } | null }>,
  counts: {} as Record<string, number>,
  rows: {} as Record<string, unknown>,
};
vi.mock("@/integrations/supabase/client.server", () => {
  const from = (table: string) => {
    const start = (op: string, values?: Record<string, unknown>) => {
      const call: Call = { table, op, filters: [], ...(values ? { values } : {}) };
      if (op !== "select") db.writes.push(call);
      const result = () =>
        Promise.resolve({
          data: op === "select" ? (db.rows[table] ?? null) : null,
          error: null,
          count: db.counts[table] ?? 0,
        });
      const q: Record<string, unknown> = {};
      for (const f of ["eq", "neq", "not", "in", "gte", "lt", "order", "limit"])
        q[f] = (...args: unknown[]) => {
          call.filters.push([f, ...args]);
          return q;
        };
      q["maybeSingle"] = result;
      q["then"] = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
        result().then(ok, bad);
      return q;
    };
    return {
      select: () => start("select"),
      update: (values: Record<string, unknown>) => start("update", values),
      insert: (values: Record<string, unknown>) => {
        db.writes.push({ table, op: "insert", values, filters: [] });
        return Promise.resolve({ error: null });
      },
    };
  };
  return {
    supabaseAdmin: {
      from,
      rpc: async (name: string, args: Record<string, unknown>) => {
        db.rpcs.push([name, args]);
        return { data: null, error: null, ...db.rpcResult[name] };
      },
    },
  };
});

type Req = { method: string; path: string; body: Record<string, unknown> | null };
let requests: Req[];
let btcpay: (req: Req) => Response | Promise<Response>;
const noAnswer = () => Promise.reject(new DOMException("timed out", "TimeoutError"));
const rpc = (name: string) => db.rpcs.filter((c) => c[0] === name).map((c) => c[1]);
const incidents = () => rpc("crypto_raise_incident").map((a) => a["p_check"]);
const statusWrites = (table: string) =>
  db.writes.filter((w) => w.table === table && w.op === "update").map((w) => w.values?.["status"]);

beforeEach(() => {
  vi.resetModules();
  requests = [];
  db.rpcs = [];
  db.writes = [];
  db.rpcResult = {};
  db.counts = {};
  db.rows = {};
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { method: string; body?: string }) => {
      const req = {
        method: init.method,
        path: url.replace("https://btcpay.example/api/v1/stores/", ""),
        body: init.body ? (JSON.parse(init.body) as Record<string, unknown>) : null,
      };
      requests.push(req);
      return btcpay(req);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ------------------------------------------------------------------------------- deposits
const TX = "ab".repeat(32);
const EXPIRES = 1_800_000_000;
const row = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "user-1",
  btcpay_invoice_id: "INV1",
  usd_cents: 2000,
  required_confirmations: 2,
  status: "NEW",
};
const depositConfig = async () => {
  const { readBtcpayConfig } = await import("../src/lib/crypto/btcpay/config.server");
  const config = readBtcpayConfig();
  if (!config.ok || !config.enabled) throw new Error("deposit config");
  return config;
};
function invoiceServer(
  invoice: Record<string, unknown>,
  payments: Array<Record<string, unknown>>,
  method = "BTC-CHAIN",
) {
  btcpay = (req) => {
    if (req.path.endsWith("/payment-methods"))
      return Response.json([{ paymentMethodId: method, payments }]);
    if (req.path.includes("/rates"))
      return Response.json([{ currencyPair: "BTC_USD", rate: "100000" }]);
    return Response.json({
      id: "INV1",
      status: "Settled",
      currency: "USD",
      amount: "20.00",
      metadata: { orderId: row.id },
      expirationTime: EXPIRES,
      ...invoice,
    });
  };
}
const paid = (over: Record<string, unknown> = {}) => ({
  id: `${TX}-0`,
  status: "Settled",
  value: "0.00020000",
  receivedDate: EXPIRES - 60,
  ...over,
});

describe("Bitcoin deposit reconcile", () => {
  const reconcile = async (r = row) =>
    (await import("../src/lib/crypto/btcpay/reconcile.server")).reconcileInvoiceSeen(
      await depositConfig(),
      r,
    );

  it("credits settled sats against their transaction output, at the invoice rate", async () => {
    invoiceServer({}, [paid()]);
    db.rpcResult["btcpay_credit_received"] = { data: { status: "CREDITED", delta: 2000 } };
    expect(await reconcile()).toEqual({ outcome: "CREDITED", txid: TX });
    expect(rpc("btcpay_credit_received")).toEqual([
      {
        p_id: row.id,
        p_ontime_sats: "20000",
        p_late_sats: "0",
        p_rate_micro: null,
        p_onchain_settled: true,
        p_lightning_seen: false,
        p_order_id: row.id,
        p_currency: "USD",
        p_outputs: [{ txid: TX, vout: 0, sats: "20000", status: "Settled" }],
      },
    ]);
    // The store rate is only read for a late payment.
    expect(requests.some((r) => r.path.includes("/rates"))).toBe(false);
    expect(incidents()).toEqual([]);
  });

  it("prices a payment that arrived after expiry at the current store rate", async () => {
    invoiceServer({ status: "Expired" }, [paid({ receivedDate: EXPIRES + 600 })]);
    db.rpcResult["btcpay_credit_received"] = { data: { status: "CREDITED", delta: 2000 } };
    expect((await reconcile({ ...row, status: "EXPIRED" })).outcome).toBe("CREDITED");
    expect(rpc("btcpay_credit_received")[0]).toMatchObject({
      p_ontime_sats: "0",
      p_late_sats: "20000",
      p_rate_micro: "100000000000",
    });
    expect(requests.find((r) => r.path.includes("/rates"))?.path).toContain("payout-store");
  });

  it("does not credit a payment that is still confirming", async () => {
    invoiceServer({ status: "Processing" }, [paid({ status: "Processing" })]);
    expect((await reconcile()).outcome).toBe("OPEN");
    expect(rpc("btcpay_credit_received")).toEqual([]);
    expect(statusWrites("btcpay_invoices")).toEqual(["PROCESSING"]);
  });

  it("never credits Lightning or another order's invoice: review, and an alert", async () => {
    invoiceServer({}, [paid()], "BTC-LN");
    expect((await reconcile()).outcome).toBe("REVIEW");
    invoiceServer({ metadata: { orderId: "someone-else" } }, [paid()]);
    expect((await reconcile()).outcome).toBe("REVIEW");
    expect(rpc("btcpay_credit_received")).toEqual([]);
    expect(statusWrites("btcpay_invoices")).toEqual(["REVIEW", "REVIEW"]);
    expect(incidents()).toEqual(["crypto_btc_deposit_review", "crypto_btc_deposit_review"]);
  });

  it("does not credit settled sats that name no transaction output", async () => {
    invoiceServer({}, [paid({ id: "not-an-output" })]);
    expect((await reconcile()).outcome).toBe("OPEN");
    expect(rpc("btcpay_credit_received")).toEqual([]);
    expect(rpc("crypto_raise_incident")[0]).toMatchObject({
      p_fp: `crypto_btc_deposit_review:${row.id}`,
      p_details: { reason: "IDENTITY_MISSING" },
    });
  });

  it("closes an unpaid expired invoice and leaves an unreadable one open", async () => {
    invoiceServer({ status: "Expired" }, []);
    expect((await reconcile()).outcome).toBe("CLOSED");
    expect(statusWrites("btcpay_invoices")).toEqual(["EXPIRED"]);
    btcpay = () => new Response("down", { status: 502 });
    await expect(reconcile()).rejects.toThrow();
    expect(rpc("btcpay_credit_received")).toEqual([]);
  });

  it("refuses a new invoice past the hourly limit without asking BTCPay", async () => {
    const { createBtcInvoiceForUser, INVOICE_RATE_MAX } =
      await import("../src/lib/crypto/btcpay/reconcile.server");
    db.counts["btcpay_invoices"] = 0;
    btcpay = (req) =>
      req.method === "POST"
        ? Response.json({ id: "INV2", status: "New", currency: "USD", amount: "20.00" })
        : Response.json([
            {
              paymentMethodId: "BTC-CHAIN",
              destination: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
              due: "0.00020000",
            },
          ]);
    expect(await createBtcInvoiceForUser("user-1", 2000)).toMatchObject({
      ok: true,
      address: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    });
    requests = [];
    db.counts["btcpay_invoices"] = INVOICE_RATE_MAX;
    const refused = await createBtcInvoiceForUser("user-1", 2000);
    expect(refused).toMatchObject({ ok: false });
    expect(requests).toEqual([]);
  });
});

// ------------------------------------------------------------------------------- cashouts
const ADDRESS = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4";
const PAYOUT_ID = "22222222-2222-4222-8222-222222222222";
// $20 at $100,000 a bitcoin.
const QUOTE_SATS = 20_000n;
const payoutBody = (over: Record<string, unknown> = {}) => ({
  id: "PO1",
  state: "AwaitingApproval",
  payoutMethodId: "BTC-CHAIN",
  destination: ADDRESS,
  payoutCurrency: "BTC",
  payoutAmount: "0.00020000",
  metadata: { orderId: PAYOUT_ID },
  ...over,
});
function payoutServer(handlers: {
  create?: () => Response | Promise<Response>;
  get?: () => Response;
  list?: () => Response;
  state?: (state: unknown) => Response;
}) {
  btcpay = (req) => {
    if (req.path.includes("/rates"))
      return Response.json([{ currencyPair: "BTC_USD", rate: "100000" }]);
    if (req.path.includes("/wallet")) return Response.json({ confirmedBalance: "1.00000000" });
    if (req.method === "POST" && req.path.endsWith("/payouts"))
      return handlers.create?.() ?? Response.json(payoutBody());
    if (req.method === "POST")
      return handlers.state?.(req.body?.["state"]) ?? Response.json(payoutBody());
    if (req.path.includes("/payouts?")) return handlers.list?.() ?? Response.json([]);
    return handlers.get?.() ?? Response.json(payoutBody());
  };
}
const posts = () => requests.filter((r) => r.method === "POST");

describe("Bitcoin cashout request", () => {
  const request = async (cents = 2000) => {
    db.rpcResult["btcpay_request_payout"] = { data: { id: PAYOUT_ID, status: "HOLD" } };
    return (await import("../src/lib/crypto/btcpay/payout.server")).requestBtcPayout(
      "user-1",
      cents,
      ADDRESS,
    );
  };

  it("holds the balance first, creates the quoted payout unapproved, then sends it", async () => {
    payoutServer({});
    expect(await request()).toEqual({ ok: true, id: PAYOUT_ID, status: "PROCESSING" });
    expect(db.rpcs.map((c) => c[0])).toEqual([
      "btcpay_request_payout",
      "btcpay_attach_payout",
      "btcpay_mark_queued",
    ]);
    expect(rpc("btcpay_request_payout")[0]).toMatchObject({
      p_usd_cents: 2000,
      p_quote_sats: QUOTE_SATS.toString(),
      p_rate_micro: "100000000000",
    });
    expect(posts()[0]!.body).toMatchObject({
      destination: ADDRESS,
      amount: "0.00020000",
      approved: false,
      metadata: { orderId: PAYOUT_ID },
    });
    expect(posts()[1]!.body).toEqual({ state: "AwaitingPayment" });
  });

  it("leaves a cashout above the auto-send cap for an operator", async () => {
    payoutServer({ create: () => Response.json(payoutBody({ payoutAmount: "0.00100000" })) });
    expect(await request(10_000)).toMatchObject({ ok: true, status: "AWAITING_APPROVAL" });
    expect(posts()).toHaveLength(1);
    expect(rpc("btcpay_mark_queued")).toEqual([]);
  });

  it("releases the hold only when BTCPay refused the payout", async () => {
    payoutServer({ create: () => new Response("bad", { status: 422 }) });
    expect(await request()).toMatchObject({ ok: false });
    expect(rpc("btcpay_fail_payout")).toEqual([{ p_id: PAYOUT_ID, p_reason: "BTCPAY_CREATE" }]);
  });

  it("keeps the hold when BTCPay did not answer or failed: the payout may exist", async () => {
    for (const create of [noAnswer, () => new Response("oops", { status: 500 })]) {
      db.rpcs = [];
      payoutServer({ create });
      expect(await request()).toEqual({ ok: true, id: PAYOUT_ID, status: "ACCEPTED" });
      expect(rpc("btcpay_fail_payout")).toEqual([]);
      expect(posts().filter((r) => r.path.endsWith("/payouts"))).toHaveLength(1);
      expect(incidents()).toEqual(["crypto_btc_payout_unresolved"]);
      requests = [];
    }
  });

  it("cancels a payout for the wrong amount, and releases only once BTCPay says Cancelled", async () => {
    const wrong = payoutBody({ payoutAmount: "1.00000000" });
    let state = "AwaitingApproval";
    payoutServer({
      create: () => Response.json(wrong),
      state: (next) => {
        state = String(next);
        return Response.json({});
      },
      get: () => Response.json({ ...wrong, state }),
    });
    expect(await request()).toMatchObject({ ok: false });
    expect(posts().at(-1)!.body).toEqual({ state: "Cancelled" });
    expect(rpc("btcpay_fail_payout")).toEqual([{ p_id: PAYOUT_ID, p_reason: "CANCELLED" }]);
    expect(incidents()).toEqual(["crypto_btc_payout_amount_mismatch"]);

    // BTCPay will not cancel it: the balance stays reserved for an operator.
    db.rpcs = [];
    payoutServer({
      create: () => Response.json(wrong),
      state: () => new Response("no", { status: 422 }),
      get: () => Response.json(wrong),
    });
    const held = await request();
    expect(held).toMatchObject({ ok: false });
    expect(rpc("btcpay_fail_payout")).toEqual([]);
    expect(rpc("btcpay_mark_queued")).toEqual([]);
  });
});

describe("Bitcoin cashout reconcile", () => {
  const open = (over: Record<string, unknown> = {}) => ({
    id: PAYOUT_ID,
    user_id: "user-1",
    btcpay_payout_id: "PO1" as string | null,
    usd_cents: 2000,
    fee_usd_cents: 0,
    address: ADDRESS,
    status: "QUEUED",
    quote_sats: QUOTE_SATS.toString(),
    created_at: new Date().toISOString(),
    payout_txid: null,
    ...over,
  });
  const run = async (rows: unknown[]) => {
    db.rows["btcpay_payouts"] = rows;
    return (await import("../src/lib/crypto/btcpay/payout.server")).reconcileBtcpayPayouts();
  };
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

  it("settles a completed payout only with its transaction id", async () => {
    payoutServer({
      get: () => Response.json(payoutBody({ state: "Completed", paymentProof: { id: TX } })),
    });
    expect(await run([open()])).toEqual({ ok: true, checked: 1 });
    expect(rpc("btcpay_note_payout_txid")).toEqual([{ p_id: PAYOUT_ID, p_txid: TX }]);
    expect(rpc("btcpay_settle_payout")).toEqual([{ p_id: PAYOUT_ID, p_state: "Completed" }]);

    db.rpcs = [];
    payoutServer({ get: () => Response.json(payoutBody({ state: "Completed" })) });
    await run([open()]);
    expect(rpc("btcpay_settle_payout")).toEqual([]);
    expect(incidents()).toEqual(["crypto_btc_payout_proof_missing"]);
  });

  it("releases a payout BTCPay reports as cancelled", async () => {
    payoutServer({ get: () => Response.json(payoutBody({ state: "Cancelled" })) });
    await run([open()]);
    expect(rpc("btcpay_fail_payout")).toEqual([{ p_id: PAYOUT_ID, p_reason: "CANCELLED" }]);
  });

  it("finds a payout whose create call was never answered, reading the list once", async () => {
    const other = { ...open({ id: "33333333-3333-4333-8333-333333333333" }) };
    payoutServer({ list: () => Response.json([payoutBody()]) });
    await run([
      open({ btcpay_payout_id: null, status: "HOLD" }),
      { ...other, btcpay_payout_id: null, status: "HOLD" },
    ]);
    expect(requests.filter((r) => r.path.includes("/payouts?"))).toHaveLength(1);
    expect(rpc("btcpay_attach_payout")).toEqual([{ p_id: PAYOUT_ID, p_btcpay_id: "PO1" }]);
    // No payout is ever created by the reconcile.
    expect(posts().filter((r) => r.path.endsWith("/payouts"))).toEqual([]);
    expect(rpc("btcpay_fail_payout")).toEqual([]);
  });

  it("never picks between two provider payouts for one order", async () => {
    payoutServer({ list: () => Response.json([payoutBody(), payoutBody({ id: "PO2" })]) });
    await run([open({ btcpay_payout_id: null, status: "HOLD" })]);
    expect(rpc("btcpay_attach_payout")).toEqual([]);
    expect(rpc("btcpay_fail_payout")).toEqual([]);
    expect(rpc("crypto_raise_incident")[0]).toMatchObject({
      p_check: "crypto_btc_payout_unresolved",
      p_details: { stage: "list", matches: 2 },
    });
  });

  it("tells an operator about a cashout that waits: approval, an unsent send, an old hold", async () => {
    payoutServer({ get: () => Response.json(payoutBody()) });
    env["BTC_WITHDRAWAL_AUTO_CENTS"] = "0";
    await run([open({ status: "AWAITING_APPROVAL", created_at: hoursAgo(1) })]);
    env["BTC_WITHDRAWAL_AUTO_CENTS"] = "5000";
    expect(incidents()).toEqual(["crypto_btc_payout_waiting"]);

    db.rpcs = [];
    payoutServer({ get: () => Response.json(payoutBody({ state: "AwaitingPayment" })) });
    await run([open({ created_at: hoursAgo(1) })]);
    expect(incidents()).toEqual([]);
    await run([open({ created_at: hoursAgo(4) })]);
    expect(incidents()).toEqual(["crypto_btc_payout_waiting"]);

    db.rpcs = [];
    payoutServer({ list: () => Response.json([]) });
    await run([open({ btcpay_payout_id: null, status: "HOLD", created_at: hoursAgo(25) })]);
    expect(incidents()).toEqual(["crypto_btc_payout_unresolved", "crypto_btc_payout_hold_aged"]);
    expect(rpc("btcpay_fail_payout")).toEqual([]);
  });

  it("a BTCPay outage raises nothing for a fresh cashout and changes nothing", async () => {
    btcpay = noAnswer;
    expect(await run([open(), open({ btcpay_payout_id: null, status: "HOLD" })])).toEqual({
      ok: true,
      checked: 2,
    });
    expect(incidents()).toEqual([]);
    expect(db.rpcs.filter((c) => c[0].startsWith("btcpay_"))).toEqual([]);
  });
});

describe("Bitcoin outage: the operator is told why (production, 2026-11-02 to 11-11)", () => {
  it("records why a player could not get an address", async () => {
    const { createBtcInvoiceForUser } = await import("../src/lib/crypto/btcpay/reconcile.server");
    const cases: Array<[() => Response | Promise<Response>, Record<string, string>]> = [
      [() => new Response("no", { status: 401 }), { stage: "create", reason: "http_401" }],
      [noAnswer, { stage: "create", reason: "no_answer" }],
      [() => new Response("oops", { status: 503 }), { stage: "create", reason: "http_503" }],
    ];
    for (const [answer, details] of cases) {
      db.rpcs = [];
      btcpay = answer;
      expect(await createBtcInvoiceForUser("user-1", 2000)).toEqual({
        ok: false,
        error: "Bitcoin deposits are unavailable right now.",
      });
      expect(rpc("crypto_raise_incident")[0]).toMatchObject({
        p_check: "crypto_btc_invoice_failed",
        p_details: details,
      });
    }
    // The invoice is made but the store has no on-chain wallet to give an address from.
    db.rpcs = [];
    btcpay = (req) =>
      req.method === "POST"
        ? Response.json({ id: "INV2", status: "New", currency: "USD", amount: "20.00" })
        : Response.json([]);
    await createBtcInvoiceForUser("user-1", 2000);
    expect(rpc("crypto_raise_incident")[0]!["p_details"]).toMatchObject({
      stage: "address",
      reason: "no_onchain_method",
    });
    expect(db.writes.filter((w) => w.op === "insert")).toEqual([]);
  });

  it("records a treasury reading that cannot be taken, once a day, and none when it can", async () => {
    const { refreshBtcTreasury } = await import("../src/lib/crypto/btcpay/payout.server");
    btcpay = () => new Response("no", { status: 403 });
    expect(await refreshBtcTreasury()).toBe("failed");
    expect(await refreshBtcTreasury()).toBe("failed");
    const raised = rpc("crypto_raise_incident");
    expect(raised).toHaveLength(2);
    expect(raised[0]).toMatchObject({
      p_check: "crypto_btc_treasury_unread",
      p_details: { reason: "http_403" },
    });
    // The same incident both times: it counts up instead of piling up.
    expect(raised[0]!["p_fp"]).toBe(raised[1]!["p_fp"]);
    expect(String(raised[0]!["p_fp"])).toMatch(/^crypto_btc_treasury_unread:\d{4}-\d\d-\d\d$/);

    db.rpcs = [];
    payoutServer({});
    expect(await refreshBtcTreasury()).toBe("recorded");
    expect(rpc("treasury_record_btc")).toEqual([
      { p_sats: "100000000", p_price_micro: "100000000000" },
    ]);
    expect(incidents()).toEqual([]);
  });
});
