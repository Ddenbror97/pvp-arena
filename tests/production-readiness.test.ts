import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BASE_MAINNET,
  clearsDepositMinimum,
  usdcUnitsToCents,
  weiToCents,
} from "../src/lib/crypto/allowlist";
import { verifyBtcpaySignature } from "../src/lib/crypto/btcpay/hmac";
import {
  creditCentsForSats,
  decideBtcCredit,
  forbiddenBtcKey,
  receivedOnchain,
  satsForUsdCents,
  settledOutputs,
  speedPolicyFor,
  type BtcPayment,
  type CreditInput,
} from "../src/lib/crypto/btcpay/policy";

const HISTORICAL_V2 = "0xd990b82e2da31461b046e79debc4abced05909e7";
const TXID = "ab".repeat(32);

function payment(overrides: Partial<BtcPayment> = {}): BtcPayment {
  return {
    method: "BTC",
    status: "Settled",
    sats: 100_000n,
    receivedAt: 1_700_000_000,
    txid: TXID,
    vout: 0,
    ...overrides,
  };
}

function creditInput(overrides: Partial<CreditInput> = {}): CreditInput {
  return {
    status: "Settled",
    additionalStatus: "None",
    speedPolicy: "LowMediumSpeed",
    requiredConfirmations: 2,
    currency: "USD",
    amount: "2.00",
    expectedCents: 200,
    orderId: "order-1",
    expectedOrderId: "order-1",
    payments: [payment()],
    onchainMethod: "BTC",
    ...overrides,
  };
}

describe("BTCPay decision layer", () => {
  const secret = "webhook-test-secret";
  const body = JSON.stringify({
    type: "InvoiceSettled",
    invoiceId: "inv-1",
    storeId: "store-1",
  });

  it("accepts the raw-body HMAC and rejects a changed body, secret, or header", async () => {
    const { btcpaySignature } = await import("../src/lib/crypto/btcpay/hmac");
    const header = await btcpaySignature(secret, body);
    expect(header.startsWith("sha256=")).toBe(true);
    expect(await verifyBtcpaySignature(secret, body, header)).toBe(true);
    expect(await verifyBtcpaySignature(secret, body, ` ${header} `)).toBe(true);
    expect(await verifyBtcpaySignature(secret, `${body} `, header)).toBe(false);
    expect(await verifyBtcpaySignature("other-secret", body, header)).toBe(false);
    expect(await verifyBtcpaySignature(secret, body, header.slice(0, -1) + "0")).toBe(false);
    expect(await verifyBtcpaySignature("", body, header)).toBe(false);
    expect(await verifyBtcpaySignature(secret, body, null)).toBe(false);
  });

  it("credits a settled on-chain invoice once at the invoice amount and refuses the other states", () => {
    expect(decideBtcCredit(creditInput())).toEqual({ credit: true, cents: 200 });
    expect(decideBtcCredit(creditInput({ additionalStatus: "PaidOver" }))).toEqual({
      credit: true,
      cents: 200,
    });
    expect(decideBtcCredit(creditInput({ status: "Processing" }))).toEqual({
      credit: false,
      reason: "NOT_SETTLED",
    });
    expect(decideBtcCredit(creditInput({ status: "Expired" }))).toEqual({
      credit: false,
      reason: "NOT_SETTLED",
    });
    expect(decideBtcCredit(creditInput({ orderId: "other" })).reason).toBe("ORDER_MISMATCH");
    expect(decideBtcCredit(creditInput({ amount: "1.00" })).reason).toBe("AMOUNT");
    expect(decideBtcCredit(creditInput({ speedPolicy: "MediumSpeed" })).reason).toBe(
      "CONFIRMATIONS",
    );
    expect(speedPolicyFor(2)).toBe("LowMediumSpeed");
    expect(speedPolicyFor(3)).toBe("LowSpeed");
    expect(
      decideBtcCredit(
        creditInput({
          payments: [payment({ method: "BTC-LN", status: "Settled", txid: null, vout: null })],
        }),
      ).reason,
    ).toBe("LIGHTNING");
    expect(
      decideBtcCredit(creditInput({ payments: [payment({ status: "Processing" })] })).reason,
    ).toBe("ONCHAIN_UNSETTLED");
  });

  it("splits late, partial, duplicate, and conflicting on-chain payments", () => {
    const expiresAt = 1_700_000_100;
    const ontime = receivedOnchain([payment({ receivedAt: expiresAt })], "BTC", expiresAt);
    expect(ontime).toMatchObject({ sats: 100_000n, ontimeSats: 100_000n, lateSats: 0n });
    const late = receivedOnchain(
      [payment({ receivedAt: expiresAt + 1, sats: 40_000n })],
      "BTC",
      expiresAt,
    );
    expect(late).toMatchObject({ ontimeSats: 0n, lateSats: 40_000n });
    expect(receivedOnchain([payment({ receivedAt: null })], "BTC", expiresAt)?.lateSats).toBe(
      100_000n,
    );
    const second = payment({
      txid: "cd".repeat(32),
      vout: 1,
      sats: 25_000n,
      receivedAt: expiresAt,
    });
    const many = receivedOnchain([payment(), second], "BTC", expiresAt);
    expect(many?.sats).toBe(125_000n);
    expect(settledOutputs([payment(), payment()], "BTC")).toHaveLength(1);
    expect(receivedOnchain([payment(), payment({ sats: 1n })], "BTC", expiresAt)).toBeNull();
    expect(creditCentsForSats(200, 100_000n, 50_000n)).toEqual({ ok: true, cents: 100 });
    expect(creditCentsForSats(200, 100_000n, 100_000n)).toEqual({ ok: true, cents: 200 });
    expect(creditCentsForSats(200, 100_000n, 150_000n)).toEqual({ ok: true, cents: 300 });
    expect(satsForUsdCents(200, 65_000_000_000n)).toBe(3076n);
  });

  it("refuses Bitcoin key material in this process and keeps Base RPC names separate", () => {
    expect(forbiddenBtcKey(["BTCPAY_URL", "CRYPTO_DEPOSIT_XPRV"])).toBeNull();
    expect(forbiddenBtcKey(["BTCPAY_SEED"])).toBe("BTCPAY_SEED");
    expect(forbiddenBtcKey(["BTC_XPRV"])).toBe("BTC_XPRV");
    expect(forbiddenBtcKey(["BTCPAY_WEBHOOK_SECRET"])).toBeNull();
    const config = readFileSync("src/lib/crypto/btcpay/config.server.ts", "utf8");
    for (const name of [
      "BTCPAY_DEPOSITS_ENABLED",
      "BTCPAY_NETWORK",
      "BTCPAY_URL",
      "BTCPAY_STORE_ID",
      "BTCPAY_API_KEY",
      "BTCPAY_WEBHOOK_SECRET",
      "BTCPAY_ONCHAIN_METHOD",
      "BTCPAY_MIN_DEPOSIT_CENTS",
      "BTC_REQUIRED_CONFIRMATIONS",
      "BTCPAY_PAYOUTS_ENABLED",
      "BTCPAY_PAYOUT_STORE_ID",
      "BTCPAY_PAYOUT_API_KEY",
      "BTCPAY_PAYOUT_WEBHOOK_SECRET",
      "BTCPAY_SWEEP_API_KEY",
    ]) {
      expect(config).toContain(name);
    }
    expect(config).toContain("BTCPAY_CONFIG_MISSING");
    expect(config).toContain("BTC_KEY_MATERIAL_FORBIDDEN");
    expect(config).not.toContain("CRYPTO_DEPOSIT_XPRV");
    expect(config).not.toContain("CRYPTO_RPC_URL_8453");
  });
});

describe("Base and BTCPay stay on separate ledgers", () => {
  it("keeps idempotency keys, scanners, and configuration from crossing", () => {
    const depositKey = "deposit:8453:0xabc:0";
    const invoiceKey = "btcpay:inv-1:100000:0";
    const payoutKey = "btcpay-payout:payout-1:settle";
    const keys = [depositKey, invoiceKey, payoutKey];
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.map((key) => key.split(":")[0]).sort()).toEqual([
      "btcpay",
      "btcpay-payout",
      "deposit",
    ]);

    const credit = readFileSync(
      "supabase/migrations/20261019033000_retire_personal_deposit_addresses.sql",
      "utf8",
    );
    expect(credit).toContain(
      "key := 'deposit:' || d.chain_id || ':' || d.tx_hash || ':' || d.log_index",
    );
    expect(credit).toContain("cents + 5 < net.min_deposit_cents");
    expect(credit).not.toContain("btcpay");
    expect(credit).not.toContain(HISTORICAL_V2);

    const btc = readFileSync(
      "supabase/migrations/20261010120000_btc-payout-quote-and-outputs.sql",
      "utf8",
    );
    expect(btc).toContain(
      "key := 'btcpay:' || inv.btcpay_invoice_id || ':' || p_ontime_sats::text || ':' || (inv.credited_late_sats + new_late)::text",
    );
    expect(btc).toContain("on conflict (idempotency_key) do nothing");
    expect(btc).toContain("'EXPIRED'");
    expect(btc).toContain("on conflict (network, txid, vout)");
    expect(btc).toContain("for update");
    expect(btc).not.toContain("CRYPTO_DEPOSIT_XPRV");

    const observe = readFileSync(
      "supabase/migrations/20260926203000_eth-oracle-heartbeat-and-inventory.sql",
      "utf8",
    );
    expect(observe).toContain("on conflict (chain_id, tx_hash, log_index)");
    expect(observe).toContain("if n <> 1 then uid := null");

    const watcher = readFileSync("src/lib/crypto/chain.server.ts", "utf8");
    expect(watcher).toContain('rA.status !== "success" || rB.status !== "success"');
    expect(watcher).toContain('if (!env.clientB) return env.networkMode === "testnet"');
    expect(watcher).toContain("await readUsdcLogs(env.clientB)");
    expect(watcher).toContain("crypto_set_cursor");
    expect(watcher).toContain("crypto_set_eth_cursor");
    expect(watcher).toContain("l.removed");
    expect(watcher).toContain("credit_confirmations");
    expect(watcher).toContain("depositAddresses: new Set()");
    expect(watcher).not.toContain("crypto_deposit_addresses");
    expect(watcher).not.toContain("BTCPAY_");
    expect(watcher).not.toContain(HISTORICAL_V2);

    const webhook = readFileSync("src/routes/api/public/btcpay/webhook.ts", "utf8");
    expect(webhook).toContain("verifyBtcpaySignature");
    expect(webhook).toContain("reconcileByBtcpayId");
    expect(webhook).toContain("{ status: 401 }");
    expect(webhook).toContain("{ status: 503 }");
    expect(webhook).not.toContain("crypto_credit_deposit");
    expect(webhook).not.toContain("CRYPTO_DEPOSIT_");

    const jobs = readFileSync("src/lib/crypto/jobs.server.ts", "utf8");
    expect(jobs).toContain("[crypto:btc-treasury]");
    expect(jobs).toContain("[crypto:btc-float]");
    expect(jobs).toContain('["withdrawals", "btcpay", "reconcile"]');
    expect(jobs).toContain("Deposits and Base sweeps are not in this invocation");
    expect(jobs).toContain('mode: "retired"');
    expect(jobs).not.toContain("deposit-sweep");

    const env = readFileSync("src/lib/worker-env.ts", "utf8");
    expect(env).not.toContain("CRYPTO_DEPOSIT_XPRV");
    expect(env).not.toContain("CRYPTO_DEPOSIT_XPUB");
    expect(env).toContain("CRYPTO_JOB_TOKEN");
    expect(watcher).toContain("CRYPTO_RPC_URL");

    expect(BASE_MAINNET.usdc).toBe("0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
    expect(usdcUnitsToCents(1_950_000n)).toBe(195n);
    expect(clearsDepositMinimum(195, 200)).toBe(true);
    expect(clearsDepositMinimum(194, 200)).toBe(false);
    expect(weiToCents(10n ** 15n, 2_000_000_000n)).toBe(200n);
  });
});
