import { readFileSync } from "node:fs";
import { sha256 } from "@noble/hashes/sha2.js";
import { base58check } from "@scure/base";
import { HDKey } from "@scure/bip32";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { recoverMessageAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import {
  CURRENT_DEPOSIT_DERIVATION_VERSION,
  depositDerivationPath,
  deriveDepositAddress,
  deriveDepositAddressV2,
} from "../src/lib/crypto/addresses.server";
import { BASE_MAINNET, clearsDepositMinimum, usdcUnitsToCents, weiToCents } from "../src/lib/crypto/allowlist";
import { allocateDepositAddress, MemoryAddressBook } from "../src/lib/crypto/deposit-address-book";
import {
  assessGasStipend,
  deriveDepositAddressV2FromXprv,
  ETH_TRANSFER_GAS,
  KNOWN_DEPOSIT_ANCHORS,
  planGasStipend,
  planSweep,
  prepareSweepAuth,
  reconcileAddress,
  resolveSweepMode,
  spendableAddressFromXprv,
  sweepIdempotencyKey,
  USDC_TRANSFER_GAS,
  xprvMatchesXpub,
  xpubForNewDepositAddress,
} from "../src/lib/crypto/deposit-sweep";
import { spawnSync } from "node:child_process";
import { verifyBtcpaySignature } from "../src/lib/crypto/btcpay/hmac";
import { depositKeyCheck } from "../scripts/verify-deposit-extended-keys.mjs";
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

/** Disposable master seed. Not a wallet and not related to any production key. */
function disposableMaster(seedByte: number) {
  const seed = new Uint8Array(32);
  seed[0] = seedByte;
  seed[31] = 0x5a;
  const master = HDKey.fromMasterSeed(seed);
  const xprv = master.privateExtendedKey;
  const xpub = master.publicExtendedKey;
  if (!xprv || !xpub) throw new Error("TEST_KEY");
  return { master, xprv, xpub };
}

const bitcoin58 = base58check(sha256);

function reprefix(extended: string, version: number): string {
  const raw = bitcoin58.decode(extended);
  const next = new Uint8Array(raw);
  new DataView(next.buffer, next.byteOffset, next.byteLength).setUint32(0, version);
  return bitcoin58.encode(next);
}

const YPUB = 0x049d7cb2;
const YPRV = 0x049d7878;
const ZPUB = 0x04b24746;
const ZPRV = 0x04b2430c;
const TPUB = 0x043587cf;
const TPRV = 0x04358394;

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

describe("Base HD derivation", () => {
  it("derives a spendable Base address at m/0/8453/<index> from a matching xpub and xprv", async () => {
    const { xprv, xpub } = disposableMaster(11);
    expect(CURRENT_DEPOSIT_DERIVATION_VERSION).toBe(2);
    expect(xprvMatchesXpub(xprv, xpub)).toBe(true);
    expect(xpub.startsWith("xpub")).toBe(true);
    expect(xprv.startsWith("xprv")).toBe(true);

    for (const index of [0, 1, 41]) {
      expect(depositDerivationPath(8453, index)).toBe(`m/0/8453/${index}`);
      const child = HDKey.fromExtendedKey(xprv).derive(`m/0/8453/${index}`);
      if (!child.privateKey || !child.publicKey) throw new Error("TEST_CHILD");
      const fromPrivate = secp256k1.getPublicKey(child.privateKey, true);
      expect(Buffer.from(fromPrivate).toString("hex")).toBe(Buffer.from(child.publicKey).toString("hex"));
      const privateKey = `0x${Buffer.from(child.privateKey).toString("hex")}` as Hex;
      const spendable = privateKeyToAccount(privateKey).address;
      expect(spendableAddressFromXprv(xprv, 8453, index)).toBe(spendable);
      expect(deriveDepositAddressV2(xpub, 8453, index)).toBe(spendable);
      expect(deriveDepositAddressV2FromXprv(xprv, 8453, index)).toBe(spendable);
      expect(deriveDepositAddress(xpub, 8453, index).toLowerCase()).not.toBe(spendable.toLowerCase());
      const signature = await privateKeyToAccount(privateKey).signMessage({
        message: `base:${index}`,
      });
      expect(await recoverMessageAddress({ message: `base:${index}`, signature })).toBe(spendable);
    }
    expect(deriveDepositAddressV2(xpub, 8453, 0)).not.toBe(deriveDepositAddressV2(xpub, 8453, 1));
    expect(deriveDepositAddressV2(xpub, 8453, 0)).not.toBe(deriveDepositAddressV2(xpub, 1, 0));
    const checked = await depositKeyCheck(xpub, xprv);
    expect(checked).toEqual({
      match: true,
      address: deriveDepositAddressV2(xpub, 8453, 0),
      path: "m/0/8453/0",
    });
    const printed = spawnSync(
      process.execPath,
      ["scripts/verify-deposit-extended-keys.mjs"],
      {
        env: { ...process.env, CRYPTO_DEPOSIT_XPUB: xpub, CRYPTO_DEPOSIT_XPRV: xprv },
        encoding: "utf8",
      },
    );
    const output = `${printed.stdout}${printed.stderr}`;
    expect(output).not.toContain(xprv);
    expect(output).not.toContain(xpub);
    expect(output).toContain(`address: ${deriveDepositAddressV2(xpub, 8453, 0)}`);
    expect(printed.status).toBe(0);
  });

  it("accepts only Bitcoin mainnet xpub and xprv bytes, and refuses ypub, zpub, and tpub", () => {
    const { xprv, xpub } = disposableMaster(12);
    const samples = [
      [YPUB, "ypub"],
      [ZPUB, "zpub"],
      [TPUB, "tpub"],
    ] as const;
    for (const [version, prefix] of samples) {
      const alt = reprefix(xpub, version);
      expect(alt.startsWith(prefix)).toBe(true);
      expect(() => deriveDepositAddressV2(alt, 8453, 0)).toThrow(/Version mismatch/);
    }
    for (const version of [YPRV, ZPRV, TPRV]) {
      expect(() => deriveDepositAddressV2FromXprv(reprefix(xprv, version), 8453, 0)).toThrow(
        /XPRV_INVALID/,
      );
    }
    expect(xpubForNewDepositAddress(reprefix(xpub, YPUB), xprv)).toBeNull();
    expect(xpubForNewDepositAddress(xpub, reprefix(xprv, YPRV))).toBeNull();
    expect(() => deriveDepositAddressV2("not-an-extended-key", 8453, 0)).toThrow(/XPUB_INVALID/);
    expect(() => depositDerivationPath(8453, -1)).toThrow(/DERIVATION_PARAMS_INVALID/);
  });

  it("reuses one address per user and never gives two users the same index", async () => {
    const { xprv, xpub } = disposableMaster(13);
    const book = new MemoryAddressBook();
    const first = await allocateDepositAddress({ book, userId: "user-a", chainId: 8453, xpub });
    const again = await allocateDepositAddress({ book, userId: "user-a", chainId: 8453, xpub });
    const other = await allocateDepositAddress({ book, userId: "user-b", chainId: 8453, xpub });
    expect(again.assigned).toBe(false);
    expect(again.current?.address).toBe(first.current?.address);
    expect(other.current?.address).not.toBe(first.current?.address);
    expect(spendableAddressFromXprv(xprv, 8453, 0).toLowerCase()).toBe(first.current?.address);
    expect(spendableAddressFromXprv(xprv, 8453, 1).toLowerCase()).toBe(other.current?.address);
    expect(first.current?.address).not.toBe(HISTORICAL_V2);
  });

  it("retries a colliding index instead of assigning it twice", async () => {
    const { xpub } = disposableMaster(14);
    let reads = 0;
    let release = () => {};
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const book = new MemoryAddressBook();
    const original = book.list.bind(book);
    book.list = async (chainId) => {
      reads += 1;
      if (reads === 2) release();
      if (reads === 1) await hold;
      return original(chainId);
    };
    const [left, right] = await Promise.all([
      allocateDepositAddress({ book, userId: "user-a", chainId: 8453, xpub }),
      allocateDepositAddress({ book, userId: "user-b", chainId: 8453, xpub }),
    ]);
    const addresses = [left.current?.address, right.current?.address];
    expect(new Set(addresses).size).toBe(2);
    expect(book.rows.map((row) => row.derivationIndex).sort()).toEqual([0, 1]);
  });

  it("publishes nothing when the extended keys are missing or do not match", async () => {
    const { xprv, xpub } = disposableMaster(15);
    const other = disposableMaster(16).xprv;
    expect(xpubForNewDepositAddress(xpub, null)).toBeNull();
    expect(xpubForNewDepositAddress(null, xprv)).toBeNull();
    expect(xpubForNewDepositAddress(xpub, other)).toBeNull();
    const book = new MemoryAddressBook();
    const blocked = await allocateDepositAddress({
      book,
      userId: "user-a",
      chainId: 8453,
      xpub: xpubForNewDepositAddress(xpub, other),
    });
    expect(blocked.current).toBeNull();
    expect(book.rows).toHaveLength(0);
    const issuer = readFileSync("src/lib/crypto/crypto.functions.ts", "utf8");
    expect(issuer).toContain("xpubForNewDepositAddress");
    expect(issuer).toContain("deriveDepositAddressV2FromXprv");
    expect(issuer).not.toContain("publishedDepositAddress");
    expect(issuer).toContain("Deposits are unavailable right now.");
  });
});

describe("Base sweep accounting", () => {
  it("stays off unless the live flag is exactly true, and a failed sweep can be retried once", () => {
    expect(resolveSweepMode(undefined, undefined)).toEqual({ ok: true, mode: "off" });
    expect(resolveSweepMode("", "")).toEqual({ ok: true, mode: "off" });
    expect(resolveSweepMode("false", "false")).toEqual({ ok: true, mode: "off" });
    expect(resolveSweepMode("TRUE", undefined).ok).toBe(false);
    expect(resolveSweepMode("true", "true").ok).toBe(false);

    const { xprv, xpub } = disposableMaster(17);
    const address = deriveDepositAddressV2(xpub, 8453, 0);
    expect(prepareSweepAuth({ enabledFlag: undefined, xprv, xpub, treasury: address, book: [], requireKnownAnchors: false })).toEqual({
      ok: false,
      reason: "DISABLED",
    });
    const gas = 1_000_000_000n;
    const eth = planSweep({
      inflight: false,
      ethWei: 20_000_000_000_000_000n,
      usdcUnits: 0n,
      gasPriceWei: gas,
    });
    expect(eth).toEqual({
      action: "sweep_eth",
      amount: 20_000_000_000_000_000n - ETH_TRANSFER_GAS * gas,
      gasLimit: ETH_TRANSFER_GAS,
    });
    const stipend = planGasStipend(0n, gas);
    expect(stipend.action).toBe("fund");
    if (stipend.action === "fund") expect(stipend.wei).toBe(USDC_TRANSFER_GAS * gas * 2n);
    expect(
      planSweep({ inflight: false, ethWei: 0n, usdcUnits: 2_000_000n, gasPriceWei: gas }).action,
    ).toBe("fund_gas");
    expect(assessGasStipend({
      records: [
        { asset: "GAS", status: "FAILED", amount: 1n },
        { asset: "GAS", status: "FAILED", amount: 1n },
        { asset: "GAS", status: "FAILED", amount: 1n },
      ],
      nextAmount: 1n,
    })).toEqual({ ok: false, reason: "GAS_ATTEMPTS" });

    const open = reconcileAddress({
      ethWei: 20_000_000_000_000_000n,
      usdcUnits: 0n,
      gasPriceWei: gas,
      records: [
        {
          id: "1",
          chainId: 8453,
          depositAddress: address,
          derivationIndex: 0,
          asset: "ETH",
          amount: 1n,
          nonce: 4,
          status: "FAILED",
          payer: address,
          toAddress: address,
          txHash: null,
          signedRawTx: null,
          idempotencyKey: sweepIdempotencyKey(8453, address, "ETH", 4),
        },
      ],
    });
    expect(open.needsRetry).toBe(true);
    expect(open.confirmedEth).toBe(0n);
    const retryKey = sweepIdempotencyKey(8453, address, "ETH", 5);
    expect(retryKey).not.toBe(sweepIdempotencyKey(8453, address, "ETH", 4));
    expect(retryKey.startsWith("sweep:8453:")).toBe(true);
    expect(retryKey.includes("deposit:")).toBe(false);
    expect(retryKey.includes("btcpay")).toBe(false);
  });
});

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
    const sweepKey = sweepIdempotencyKey(8453, HISTORICAL_V2, "USDC", 7);
    const keys = [depositKey, invoiceKey, payoutKey, sweepKey];
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.map((key) => key.split(":")[0]).sort()).toEqual([
      "btcpay",
      "btcpay-payout",
      "deposit",
      "sweep",
    ]);

    const credit = readFileSync(
      "supabase/migrations/20261019033000_retire_personal_deposit_addresses.sql",
      "utf8",
    );
    expect(credit).toContain("key := 'deposit:' || d.chain_id || ':' || d.tx_hash || ':' || d.log_index");
    expect(credit).toContain("cents + 5 < net.min_deposit_cents");
    expect(credit).not.toContain("btcpay");

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
    expect(observe).toContain(
      "select user_id into uid from crypto_deposit_addresses where chain_id = p_chain and lower(address) = lower(p_to)",
    );
    expect(observe).toContain("on conflict (chain_id, tx_hash, log_index)");
    expect(observe).toContain("if n <> 1 then uid := null");

    const watcher = readFileSync("src/lib/crypto/chain.server.ts", "utf8");
    expect(watcher).toContain("rA.status !== \"success\" || rB.status !== \"success\"");
    expect(watcher).toContain("if (!env.clientB) return env.networkMode === \"testnet\"");
    expect(watcher).toContain("await readUsdcLogs(env.clientB)");
    expect(watcher).toContain("crypto_set_cursor");
    expect(watcher).toContain("crypto_set_eth_cursor");
    expect(watcher).toContain("l.removed");
    expect(watcher).toContain("credit_confirmations");
    expect(watcher).not.toContain("BTCPAY_");

    const webhook = readFileSync("src/routes/api/public/btcpay/webhook.ts", "utf8");
    expect(webhook).toContain("verifyBtcpaySignature");
    expect(webhook).toContain("reconcileByBtcpayId");
    expect(webhook).toContain('{ status: 401 }');
    expect(webhook).toContain('{ status: 503 }');
    expect(webhook).not.toContain("crypto_credit_deposit");
    expect(webhook).not.toContain("CRYPTO_DEPOSIT_");

    const jobs = readFileSync("src/lib/crypto/jobs.server.ts", "utf8");
    expect(jobs).toContain("[crypto:btc-treasury]");
    expect(jobs).toContain("[crypto:btc-float]");
    expect(jobs).toContain('["withdrawals", "btcpay", "reconcile"]');
    expect(jobs).toContain("Deposits and Base sweeps are not in this invocation");

    const sweepServer = readFileSync("src/lib/crypto/deposit-sweep.server.ts", "utf8");
    expect(sweepServer).toContain('decision.mode === "off"');
    expect(sweepServer).toContain("skipped: \"DISABLED\"");
    expect(sweepServer).not.toContain("BTCPAY_");

    expect(BASE_MAINNET.usdc).toBe("0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
    expect(usdcUnitsToCents(1_950_000n)).toBe(195n);
    expect(clearsDepositMinimum(195, 200)).toBe(true);
    expect(clearsDepositMinimum(194, 200)).toBe(false);
    expect(weiToCents(10n ** 15n, 2_000_000_000n)).toBe(200n);
    expect(KNOWN_DEPOSIT_ANCHORS.map((row) => row.address)).not.toContain(HISTORICAL_V2);
  });

  it("does not derive the historical unrecovered address from a disposable deposit root", () => {
    for (let seedByte = 1; seedByte <= 16; seedByte += 1) {
      const { xpub } = disposableMaster(seedByte);
      expect(deriveDepositAddressV2(xpub, 8453, 0).toLowerCase()).not.toBe(HISTORICAL_V2);
      expect(deriveDepositAddress(xpub, 8453, 0).toLowerCase()).not.toBe(HISTORICAL_V2);
    }
  });
});
