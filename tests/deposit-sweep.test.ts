import { readFileSync } from "node:fs";
import { HDKey } from "@scure/bip32";
import { privateKeyToAccount } from "viem/accounts";
import {
  keccak256,
  parseTransaction,
  recoverTransactionAddress,
  stringToHex,
  type Hex,
} from "viem";
import { describe, expect, it } from "vitest";
import { depositDerivationPath, deriveDepositAddress } from "../src/lib/crypto/addresses.server";
import {
  applySweepTick,
  buildSweepTransaction,
  deriveDepositAddressFromXprv,
  ETH_TRANSFER_GAS,
  GAS_STIPEND_CAP_WEI,
  MAX_NEW_SWEEPS_PER_RUN,
  MIN_ETH_SWEEP_WEI,
  planGasStipend,
  planSweep,
  prepareSweepAuth,
  reconcileAddress,
  redactSweepLog,
  selectSweepTargets,
  signSweepTransaction,
  spendableAddressFromXprv,
  sweepFlagEnabled,
  sweepIdempotencyKey,
  SWEEP_CHAIN_ID,
  SWEEP_TREASURY,
  SWEEP_USDC,
  USDC_TRANSFER_GAS,
  xprvMatchesXpub,
  type AccountView,
  type BroadcastOutcome,
  type ReceiptView,
  type SignRequest,
  type SweepBegin,
  type SweepContext,
  type SweepIncident,
  type SweepRecord,
  type SweepStore,
  type SweepTarget,
} from "../src/lib/crypto/deposit-sweep";

const GWEI = 1_000_000_000n;
const INDEX3 = "0xe0a1403a2e32c5d52d1620ccce8a5867367ef8fa";
const PAYOUT = "0xd29370ca973e85b7ec7e52c0cff267b0fb63da24";
/** On-chain ETH at index 3: one credited deposit plus two rejected under-minimum transfers. */
const INDEX3_ETH = 1_434_137_303_036_008n;
const INDEX3_CREDITED = 614_169_901_209_170n;
const BOOK: SweepTarget[] = [{ derivationIndex: 3, address: INDEX3 }];

class MemorySweepStore implements SweepStore {
  rows: SweepRecord[] = [];
  private n = 0;

  async listInflight(chainId: number): Promise<SweepRecord[]> {
    return this.rows.filter(
      (row) => row.chainId === chainId && ["PENDING", "SIGNED", "BROADCAST"].includes(row.status),
    );
  }

  async begin(row: SweepBegin) {
    const depositAddress = row.depositAddress.toLowerCase();
    const key = sweepIdempotencyKey(row.chainId, depositAddress, row.asset, row.nonce);
    const clash = this.rows.some(
      (existing) =>
        existing.idempotencyKey === key ||
        (existing.chainId === row.chainId &&
          existing.depositAddress === depositAddress &&
          ["PENDING", "SIGNED", "BROADCAST"].includes(existing.status)),
    );
    if (clash) return { created: false as const };
    this.n += 1;
    const id = `id-${this.n}`;
    this.rows.push({
      id,
      chainId: row.chainId,
      depositAddress,
      derivationIndex: row.derivationIndex,
      asset: row.asset,
      amount: row.amount,
      nonce: row.nonce,
      payer: row.payer.toLowerCase(),
      toAddress: row.toAddress.toLowerCase(),
      maxFeePerGas: row.maxFeePerGas,
      gasLimit: row.gasLimit,
      status: "PENDING",
      txHash: null,
      signedRawTx: null,
      error: null,
      idempotencyKey: key,
    });
    return { created: true as const, id };
  }

  async storeSigned(id: string, hash: string, raw: string) {
    const row = this.must(id);
    if (row.status !== "PENDING" || row.signedRawTx) throw new Error("SWEEP_NOT_PENDING");
    row.status = "SIGNED";
    row.txHash = hash;
    row.signedRawTx = raw;
  }

  async markBroadcast(id: string) {
    const row = this.must(id);
    if (row.status !== "SIGNED" && row.status !== "BROADCAST") throw new Error("SWEEP_NOT_SIGNED");
    row.status = "BROADCAST";
  }

  async confirm(id: string) {
    const row = this.must(id);
    if (row.status === "CONFIRMED") return;
    if (row.status !== "SIGNED" && row.status !== "BROADCAST")
      throw new Error("SWEEP_NOT_INFLIGHT");
    row.status = "CONFIRMED";
  }

  async fail(id: string, reason: string) {
    const row = this.must(id);
    if (row.status === "FAILED") return;
    if (row.status === "PENDING" && row.signedRawTx == null) {
      row.status = "FAILED";
      row.error = reason;
      return;
    }
    if (row.status !== "SIGNED" && row.status !== "BROADCAST")
      throw new Error("SWEEP_NOT_INFLIGHT");
    row.status = "FAILED";
    row.error = reason;
  }

  async note(id: string, reason: string) {
    const row = this.rows.find((item) => item.id === id);
    if (row && row.status !== "CONFIRMED") row.error = reason;
  }

  private must(id: string) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error("missing sweep");
    return row;
  }
}

function funded(ethWei: bigint, usdcUnits = 0n, nonce = 1): AccountView {
  return { ethWei, usdcUnits, nonce };
}

function signer() {
  const calls: SignRequest[] = [];
  return {
    calls,
    sign(req: SignRequest) {
      calls.push({ ...req });
      const raw = `raw:${req.kind}:${req.from}:${req.to}:${req.amount}:${req.nonce}:${req.gasLimit}:${req.maxFeePerGas}`;
      return { raw, hash: keccak256(stringToHex(raw)) };
    },
  };
}

async function tick(opts: {
  store?: MemorySweepStore;
  accounts: Record<string, AccountView>;
  sign?: ReturnType<typeof signer>["sign"];
  broadcast?: (raw: string) => BroadcastOutcome | Promise<BroadcastOutcome>;
  receipts?: Record<string, ReceiptView>;
  gasPriceWei?: bigint | null;
  treasury?: string;
  gasFundingAvailable?: boolean;
  book?: SweepTarget[];
  targets?: SweepTarget[];
}) {
  const store = opts.store ?? new MemorySweepStore();
  const incidents: SweepIncident[] = [];
  const book = opts.book ?? BOOK;
  const ctx: SweepContext = {
    chainId: SWEEP_CHAIN_ID,
    treasury: opts.treasury ?? SWEEP_TREASURY,
    payout: PAYOUT,
    gasPriceWei: opts.gasPriceWei === undefined ? GWEI : opts.gasPriceWei,
    gasFundingAvailable: opts.gasFundingAvailable ?? true,
    book,
    targets: opts.targets ?? book,
    nowIso: "2026-10-18T22:00:00.000Z",
  };
  const result = await applySweepTick(ctx, {
    account: (address) => opts.accounts[address.toLowerCase()] ?? { error: "rpc" },
    receipt: (hash) => opts.receipts?.[hash] ?? { state: "missing" },
    sign: opts.sign ?? signer().sign,
    broadcast: opts.broadcast ?? (() => "ok"),
    store,
    raise: (incident) => incidents.push(incident),
  });
  return { store, incidents, ...result };
}

describe("deposit sweep settlement", () => {
  it("sweeps the full ETH balance, including rejected under-minimum wei, and does not credit", async () => {
    const keys = signer();
    const fee = ETH_TRANSFER_GAS * GWEI;
    const { store, actions } = await tick({
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 4),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: keys.sign,
    });
    expect(actions).toEqual([{ address: INDEX3, action: "signed" }]);
    expect(store.rows).toHaveLength(1);
    const row = store.rows[0]!;
    expect(row.asset).toBe("ETH");
    expect(row.amount).toBe(INDEX3_ETH - fee);
    expect(row.amount).toBeGreaterThan(INDEX3_CREDITED);
    expect(row.toAddress).toBe(SWEEP_TREASURY.toLowerCase());
    expect(row.payer).toBe(INDEX3);
    expect(row.status).toBe("BROADCAST");
    expect(row.nonce).toBe(4);
    expect(keys.calls).toHaveLength(1);
    expect(row.idempotencyKey).toBe(sweepIdempotencyKey(8453, INDEX3, "ETH", 4));
    expect(JSON.stringify(actions)).not.toContain("credit");
  });

  it("sweeps USDC before ETH when the deposit address can pay the token gas", async () => {
    const keys = signer();
    const shared = {
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 1_000_000n, 4),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: keys.sign,
    };
    const first = await tick(shared);
    expect(first.store.rows[0]?.asset).toBe("USDC");
    expect(first.store.rows[0]?.amount).toBe(1_000_000n);
    expect(first.store.rows[0]?.toAddress).toBe(SWEEP_TREASURY.toLowerCase());
    const hash = first.store.rows[0]?.txHash ?? "";
    const remaining = INDEX3_ETH - USDC_TRANSFER_GAS * GWEI;
    const confirmed = await tick({
      ...shared,
      store: first.store,
      receipts: { [hash]: { state: "success", blockNumber: 10n } },
      accounts: {
        [INDEX3]: funded(remaining, 0n, 5),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
    });
    expect(confirmed.actions[0]?.action).toBe("confirmed");
    await tick({
      store: first.store,
      accounts: {
        [INDEX3]: funded(remaining, 0n, 5),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: keys.sign,
    });
    const eth = first.store.rows.find((row) => row.asset === "ETH");
    expect(eth?.amount).toBe(INDEX3_ETH - USDC_TRANSFER_GAS * GWEI - ETH_TRANSFER_GAS * GWEI);
    expect(eth?.amount).toBeGreaterThan(INDEX3_CREDITED);
    expect(keys.calls.map((call) => call.kind)).toEqual(["usdc", "eth"]);
  });

  it("funds a capped ETH stipend when USDC cannot pay gas, then sweeps USDC once", async () => {
    const keys = signer();
    const stipend = planGasStipend(0n, GWEI);
    expect(stipend).toEqual({ action: "fund", wei: USDC_TRANSFER_GAS * 2n * GWEI });
    expect(stipend.action === "fund" && stipend.wei < GAS_STIPEND_CAP_WEI).toBe(true);
    const store = new MemorySweepStore();
    const first = await tick({
      store,
      accounts: {
        [INDEX3]: funded(0n, 1_000_000n, 0),
        [PAYOUT]: funded(10n ** 18n, 0n, 7),
      },
      sign: keys.sign,
    });
    expect(first.actions[0]?.action).toBe("signed");
    expect(store.rows[0]?.asset).toBe("GAS");
    expect(store.rows[0]?.amount).toBe(USDC_TRANSFER_GAS * 2n * GWEI);
    expect(store.rows[0]?.toAddress).toBe(INDEX3);
    expect(store.rows[0]?.payer).toBe(PAYOUT);
    expect(first.incidents.some((incident) => incident.check === "crypto_sweep_gas")).toBe(true);
    expect(first.incidents.some((incident) => JSON.stringify(incident).includes("xprv"))).toBe(
      false,
    );

    const gasHash = store.rows[0]?.txHash ?? "";
    const second = await tick({
      store,
      accounts: {
        [INDEX3]: funded(USDC_TRANSFER_GAS * 2n * GWEI, 1_000_000n, 0),
        [PAYOUT]: funded(10n ** 18n, 0n, 8),
      },
      receipts: { [gasHash]: { state: "success", blockNumber: 12n } },
      sign: keys.sign,
    });
    expect(second.actions[0]?.action).toBe("confirmed");
    expect(keys.calls).toHaveLength(1);

    const third = await tick({
      store,
      accounts: {
        [INDEX3]: funded(USDC_TRANSFER_GAS * 2n * GWEI, 1_000_000n, 0),
        [PAYOUT]: funded(10n ** 18n, 0n, 8),
      },
      sign: keys.sign,
    });
    expect(third.store.rows.map((row) => row.asset)).toEqual(["GAS", "USDC"]);
    expect(keys.calls).toHaveLength(2);
    expect(keys.calls[1]?.kind).toBe("usdc");
    expect(keys.calls[1]?.to).toBe(SWEEP_TREASURY);
  });

  it("refuses a gas stipend above 0.0002 ETH and does not sweep the remaining ETH", async () => {
    const price = 2n * GWEI;
    const eth = 100_000_000_000_000n;
    const refused = planGasStipend(eth, price);
    expect(refused.action).toBe("refuse");
    if (refused.action === "refuse") expect(refused.deficit).toBeGreaterThan(GAS_STIPEND_CAP_WEI);
    const keys = signer();
    const { store, actions, incidents } = await tick({
      accounts: {
        [INDEX3]: funded(eth, 1_000_000n, 1),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      gasPriceWei: price,
      sign: keys.sign,
    });
    expect(store.rows).toHaveLength(0);
    expect(actions[0]?.action).toBe("gas_cap");
    expect(keys.calls).toHaveLength(0);
    expect(incidents[0]?.check).toBe("crypto_sweep_gas_refused");
    expect(incidents[0]?.details["cap"]).toBe(GAS_STIPEND_CAP_WEI.toString());
  });

  it("does not fund gas when the payout wallet cannot cover the stipend", async () => {
    const keys = signer();
    const { store } = await tick({
      accounts: {
        [INDEX3]: funded(0n, 1_000_000n, 0),
        [PAYOUT]: funded(0n, 0n, 1),
      },
      sign: keys.sign,
    });
    expect(store.rows).toHaveLength(0);
    expect(keys.calls).toHaveLength(0);
  });

  it("rebroadcasts the same signed transaction on a duplicate cron run", async () => {
    const keys = signer();
    const raws: string[] = [];
    const store = new MemorySweepStore();
    const accounts = {
      [INDEX3]: funded(INDEX3_ETH, 0n, 4),
      [PAYOUT]: funded(10n ** 18n, 0n, 1),
    };
    const broadcast = (raw: string): BroadcastOutcome => {
      raws.push(raw);
      return raws.length === 1 ? "ok" : "already_known";
    };
    await tick({ store, accounts, sign: keys.sign, broadcast });
    await tick({ store, accounts, sign: keys.sign, broadcast });
    expect(keys.calls).toHaveLength(1);
    expect(raws).toHaveLength(2);
    expect(raws[0]).toBe(raws[1]);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.status).toBe("BROADCAST");
    expect(store.rows[0]?.signedRawTx).toBe(raws[0]);
  });

  it("keeps the signed transaction when the broadcast RPC fails, then retries those bytes", async () => {
    const keys = signer();
    const store = new MemorySweepStore();
    const accounts = {
      [INDEX3]: funded(INDEX3_ETH, 0n, 4),
      [PAYOUT]: funded(10n ** 18n, 0n, 1),
    };
    let attempt = 0;
    const raws: string[] = [];
    await tick({
      store,
      accounts,
      sign: keys.sign,
      broadcast: () => {
        attempt += 1;
        throw new Error("socket hang up https://rpc.example/secret");
      },
    });
    expect(store.rows[0]?.status).toBe("SIGNED");
    expect(store.rows[0]?.error).toBe("broadcast rpc");
    expect(store.rows[0]?.signedRawTx).toBeTruthy();
    await tick({
      store,
      accounts,
      sign: keys.sign,
      broadcast: (raw) => {
        raws.push(raw);
        return "ok";
      },
    });
    expect(keys.calls).toHaveLength(1);
    expect(raws).toEqual([store.rows[0]?.signedRawTx]);
    expect(store.rows[0]?.status).toBe("BROADCAST");
    expect(attempt).toBe(1);
  });

  it("holds a nonce-too-low receipt gap and does not sign a replacement", async () => {
    const keys = signer();
    const store = new MemorySweepStore();
    const accounts = {
      [INDEX3]: funded(INDEX3_ETH, 0n, 4),
      [PAYOUT]: funded(10n ** 18n, 0n, 1),
    };
    await tick({ store, accounts, sign: keys.sign });
    const raw = store.rows[0]?.signedRawTx;
    const second = await tick({
      store,
      accounts,
      sign: keys.sign,
      broadcast: () => "nonce_too_low",
    });
    expect(second.actions[0]?.action).toBe("nonce_hold");
    expect(second.incidents[0]?.details["reason"]).toBe("NONCE_TOO_LOW");
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.status).toBe("BROADCAST");
    expect(store.rows[0]?.signedRawTx).toBe(raw);
    expect(keys.calls).toHaveLength(1);
  });

  it("marks a reverted transaction failed and allows a later nonce", async () => {
    const keys = signer();
    const store = new MemorySweepStore();
    const accounts = {
      [INDEX3]: funded(INDEX3_ETH, 0n, 4),
      [PAYOUT]: funded(10n ** 18n, 0n, 1),
    };
    await tick({ store, accounts, sign: keys.sign });
    const hash = store.rows[0]?.txHash ?? "";
    const failed = await tick({
      store,
      accounts,
      sign: keys.sign,
      receipts: { [hash]: { state: "reverted", blockNumber: 9n } },
    });
    expect(failed.actions[0]?.action).toBe("failed");
    expect(store.rows[0]?.status).toBe("FAILED");
    expect(keys.calls).toHaveLength(1);

    await tick({
      store,
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 5),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: keys.sign,
    });
    expect(store.rows).toHaveLength(2);
    expect(store.rows[1]?.status).toBe("BROADCAST");
    expect(store.rows[1]?.nonce).toBe(5);
    expect(store.rows[1]?.signedRawTx).not.toBe(store.rows[0]?.signedRawTx);
    expect(keys.calls).toHaveLength(2);
  });

  it("confirms a successful receipt and does not sign again", async () => {
    const keys = signer();
    const store = new MemorySweepStore();
    await tick({
      store,
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 4),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: keys.sign,
    });
    const hash = store.rows[0]?.txHash ?? "";
    const done = await tick({
      store,
      accounts: {
        [INDEX3]: funded(0n, 0n, 5),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      receipts: { [hash]: { state: "success", blockNumber: 20n } },
      sign: keys.sign,
    });
    expect(done.actions[0]?.action).toBe("confirmed");
    expect(store.rows[0]?.status).toBe("CONFIRMED");
    expect(keys.calls).toHaveLength(1);
  });

  it("waits when the receipt is not final and does not rebroadcast or resign", async () => {
    const keys = signer();
    const store = new MemorySweepStore();
    let broadcasts = 0;
    await tick({
      store,
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 4),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: keys.sign,
      broadcast: () => {
        broadcasts += 1;
        return "ok";
      },
    });
    const hash = store.rows[0]?.txHash ?? "";
    const held = await tick({
      store,
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 5),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      receipts: { [hash]: { state: "pending_finality", blockNumber: 99n } },
      sign: keys.sign,
      broadcast: () => {
        broadcasts += 1;
        return "ok";
      },
    });
    expect(held.actions[0]?.action).toBe("await_finality");
    expect(store.rows[0]?.status).toBe("BROADCAST");
    expect(broadcasts).toBe(1);
    expect(keys.calls).toHaveLength(1);
  });

  it("skips an address when the balance RPC fails and does not open a sweep", async () => {
    const keys = signer();
    const { store, actions, incidents } = await tick({
      accounts: { [INDEX3]: { error: "rpc" }, [PAYOUT]: funded(10n ** 18n) },
      sign: keys.sign,
    });
    expect(store.rows).toHaveLength(0);
    expect(actions[0]?.action).toBe("rpc_skip");
    expect(incidents[0]?.check).toBe("crypto_sweep_rpc");
    expect(keys.calls).toHaveLength(0);
  });

  it("leaves an in-flight row untouched when the receipt RPC fails", async () => {
    const keys = signer();
    const store = new MemorySweepStore();
    await tick({
      store,
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 4),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: keys.sign,
    });
    const hash = store.rows[0]?.txHash ?? "";
    const raw = store.rows[0]?.signedRawTx;
    const held = await tick({
      store,
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 5),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      receipts: { [hash]: { state: "rpc_error" } },
      sign: keys.sign,
    });
    expect(held.actions[0]?.action).toBe("rpc_hold");
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.status).toBe("BROADCAST");
    expect(store.rows[0]?.signedRawTx).toBe(raw);
    expect(keys.calls).toHaveLength(1);
  });

  it("signs a pending row that was stored before a crash, using the reserved nonce", async () => {
    const keys = signer();
    const store = new MemorySweepStore();
    const amount = INDEX3_ETH - ETH_TRANSFER_GAS * GWEI;
    await store.begin({
      chainId: 8453,
      depositAddress: INDEX3,
      derivationIndex: 3,
      asset: "ETH",
      amount,
      nonce: 4,
      payer: INDEX3,
      toAddress: SWEEP_TREASURY,
      maxFeePerGas: GWEI,
      gasLimit: ETH_TRANSFER_GAS,
    });
    await tick({
      store,
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 9),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: keys.sign,
    });
    expect(keys.calls).toHaveLength(1);
    expect(keys.calls[0]?.nonce).toBe(4);
    expect(keys.calls[0]?.amount).toBe(amount);
    expect(store.rows[0]?.status).toBe("BROADCAST");
    expect(store.rows).toHaveLength(1);
  });

  it("refuses a second begin while one sweep is in flight", async () => {
    const store = new MemorySweepStore();
    const first = await store.begin({
      chainId: 8453,
      depositAddress: INDEX3,
      derivationIndex: 3,
      asset: "ETH",
      amount: MIN_ETH_SWEEP_WEI,
      nonce: 1,
      payer: INDEX3,
      toAddress: SWEEP_TREASURY,
      maxFeePerGas: GWEI,
      gasLimit: ETH_TRANSFER_GAS,
    });
    const second = await store.begin({
      chainId: 8453,
      depositAddress: INDEX3,
      derivationIndex: 3,
      asset: "USDC",
      amount: 1n,
      nonce: 2,
      payer: INDEX3,
      toAddress: SWEEP_TREASURY,
      maxFeePerGas: GWEI,
      gasLimit: USDC_TRANSFER_GAS,
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(store.rows).toHaveLength(1);
  });

  it("fails an unsigned row when the signer does not own the deposit address", async () => {
    const store = new MemorySweepStore();
    const raws: string[] = [];
    const { actions } = await tick({
      store,
      accounts: {
        [INDEX3]: funded(INDEX3_ETH, 0n, 4),
        [PAYOUT]: funded(10n ** 18n, 0n, 1),
      },
      sign: () => {
        throw new Error("SIGNER_MISMATCH");
      },
      broadcast: (raw) => {
        raws.push(raw);
        return "ok";
      },
    });
    expect(actions[0]?.action).toBe("signer_mismatch");
    expect(store.rows[0]?.status).toBe("FAILED");
    expect(store.rows[0]?.signedRawTx).toBeNull();
    expect(raws).toEqual([]);
  });

  it("aborts the tick when the treasury is not the Base MetaMask address", async () => {
    const keys = signer();
    const { aborted, store } = await tick({
      treasury: PAYOUT,
      accounts: { [INDEX3]: funded(INDEX3_ETH), [PAYOUT]: funded(10n ** 18n) },
      sign: keys.sign,
    });
    expect(aborted).toBe("TREASURY_MISMATCH");
    expect(store.rows).toHaveLength(0);
    expect(keys.calls).toHaveLength(0);
  });

  it("reconciles swept, in-flight, and still-sweepable balances", () => {
    const fee = ETH_TRANSFER_GAS * GWEI;
    const open = reconcileAddress({
      ethWei: INDEX3_ETH,
      usdcUnits: 0n,
      gasPriceWei: GWEI,
      records: [],
    });
    expect(open.settled).toBe(false);
    expect(open.ethSweepable).toBe(INDEX3_ETH - fee);
    const row = {
      id: "1",
      chainId: 8453,
      depositAddress: INDEX3,
      derivationIndex: 3,
      asset: "ETH" as const,
      amount: INDEX3_ETH - fee,
      txHash: null,
      signedRawTx: null,
      nonce: 1,
      status: "CONFIRMED" as const,
      payer: INDEX3,
      toAddress: SWEEP_TREASURY.toLowerCase(),
      idempotencyKey: "sweep:8453:x:ETH:1",
      error: null,
      maxFeePerGas: GWEI,
      gasLimit: ETH_TRANSFER_GAS,
    };
    const done = reconcileAddress({
      ethWei: fee - 1n,
      usdcUnits: 0n,
      gasPriceWei: GWEI,
      records: [row],
    });
    expect(done.settled).toBe(true);
    expect(done.confirmedEth).toBe(INDEX3_ETH - fee);
    expect(
      planSweep({ inflight: true, ethWei: INDEX3_ETH, usdcUnits: 0n, gasPriceWei: GWEI }).action,
    ).toBe("retry");
  });
});

describe("deposit sweep guards", () => {
  it("builds an ETH sweep only to the treasury", () => {
    const tx = buildSweepTransaction({
      kind: "eth",
      from: INDEX3,
      to: SWEEP_TREASURY,
      amount: MIN_ETH_SWEEP_WEI,
      nonce: 1,
      gasLimit: ETH_TRANSFER_GAS,
      maxFeePerGas: GWEI,
      derivationIndex: 3,
    });
    expect(tx.to).toBe(SWEEP_TREASURY);
    expect(tx.value).toBe(MIN_ETH_SWEEP_WEI);
    expect(tx.chainId).toBe(8453);
    expect(() =>
      buildSweepTransaction({
        kind: "eth",
        from: INDEX3,
        to: PAYOUT,
        amount: MIN_ETH_SWEEP_WEI,
        nonce: 1,
        gasLimit: ETH_TRANSFER_GAS,
        maxFeePerGas: GWEI,
        derivationIndex: 3,
      }),
    ).toThrow("SWEEP_DESTINATION_FORBIDDEN");
  });

  it("builds a USDC transfer to the treasury and a stipend only to the deposit address", () => {
    const usdc = buildSweepTransaction({
      kind: "usdc",
      from: INDEX3,
      to: SWEEP_TREASURY,
      amount: 1_000_000n,
      nonce: 2,
      gasLimit: USDC_TRANSFER_GAS,
      maxFeePerGas: GWEI,
      derivationIndex: 3,
    });
    expect(usdc.to).toBe(SWEEP_USDC);
    expect(usdc.value).toBe(0n);
    expect(usdc.data.toLowerCase()).toContain(SWEEP_TREASURY.slice(2).toLowerCase());
    expect(() =>
      buildSweepTransaction({
        kind: "gas",
        from: PAYOUT,
        to: SWEEP_TREASURY,
        amount: 1n,
        nonce: 1,
        gasLimit: ETH_TRANSFER_GAS,
        maxFeePerGas: GWEI,
        derivationIndex: null,
      }),
    ).toThrow("GAS_DESTINATION_FORBIDDEN");
    expect(() =>
      buildSweepTransaction({
        kind: "gas",
        from: PAYOUT,
        to: INDEX3,
        amount: GAS_STIPEND_CAP_WEI + 1n,
        nonce: 1,
        gasLimit: ETH_TRANSFER_GAS,
        maxFeePerGas: GWEI,
        derivationIndex: null,
      }),
    ).toThrow("GAS_CAP");
  });

  it("signs a throwaway ETH sweep from the derived deposit key to the treasury", async () => {
    const seed = new Uint8Array(64);
    seed[0] = 9;
    const master = HDKey.fromMasterSeed(seed);
    const xprv = master.privateExtendedKey;
    const xpub = master.publicExtendedKey;
    if (!xprv) throw new Error("test key");
    const derived = deriveDepositAddress(xpub, 8453, 3);
    const spendable = spendableAddressFromXprv(xprv, 8453, 3);
    expect(deriveDepositAddressFromXprv(xprv, 8453, 3)).toBe(derived);
    expect(depositDerivationPath(8453, 3)).toBe("m/0/8453/3");
    expect(spendable).not.toBe(derived);
    const node = HDKey.fromExtendedKey(xprv).derive(depositDerivationPath(8453, 3));
    if (!node.privateKey) throw new Error("test key");
    const account = privateKeyToAccount(`0x${Buffer.from(node.privateKey).toString("hex")}` as Hex);
    expect(account.address).toBe(spendable);
    const amount = 50_000_000_000_000n;
    await expect(
      signSweepTransaction(account, {
        kind: "eth",
        from: derived,
        to: SWEEP_TREASURY,
        amount,
        nonce: 4,
        gasLimit: ETH_TRANSFER_GAS,
        maxFeePerGas: GWEI,
        derivationIndex: 3,
      }),
    ).rejects.toThrow("SIGNER_MISMATCH");
    const raw = await signSweepTransaction(account, {
      kind: "eth",
      from: spendable,
      to: SWEEP_TREASURY,
      amount,
      nonce: 4,
      gasLimit: ETH_TRANSFER_GAS,
      maxFeePerGas: GWEI,
      derivationIndex: 3,
    });
    const parsed = parseTransaction(raw.raw);
    expect(parsed.to?.toLowerCase()).toBe(SWEEP_TREASURY.toLowerCase());
    expect(parsed.value).toBe(amount);
    expect(parsed.chainId).toBe(8453);
    expect(await recoverTransactionAddress({ serializedTransaction: raw.raw })).toBe(spendable);
  });

  it("matches an xprv to its xpub and rejects a different node or a wrong address", () => {
    const seed = new Uint8Array(64);
    seed[0] = 4;
    const otherSeed = new Uint8Array(64);
    otherSeed[0] = 5;
    const master = HDKey.fromMasterSeed(seed);
    const other = HDKey.fromMasterSeed(otherSeed);
    const xprv = master.privateExtendedKey;
    const xpub = master.publicExtendedKey;
    if (!xprv || !other.privateExtendedKey) throw new Error("test key");
    const address = deriveDepositAddress(xpub, 8453, 3);
    expect(xprvMatchesXpub(xprv, xpub)).toBe(true);
    expect(xprvMatchesXpub(xprv, other.publicExtendedKey)).toBe(false);
    expect(spendableAddressFromXprv(xprv, 8453, 3)).not.toBe(address);
    const good = prepareSweepAuth({
      enabledFlag: "true",
      xprv,
      xpub,
      treasury: SWEEP_TREASURY,
      book: [{ index: 3, address }],
      requireKnownAnchors: false,
    });
    expect(good.ok).toBe(false);
    if (!good.ok) expect(good.reason).toBe("DERIVATION_MISMATCH");
    const mismatch = prepareSweepAuth({
      enabledFlag: "true",
      xprv,
      xpub: other.publicExtendedKey,
      treasury: SWEEP_TREASURY,
      book: [{ index: 3, address }],
      requireKnownAnchors: false,
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.reason).toBe("KEY_MISMATCH");
    const wrongAddress = prepareSweepAuth({
      enabledFlag: "true",
      xprv,
      xpub,
      treasury: SWEEP_TREASURY,
      book: [{ index: 3, address: INDEX3 }],
      requireKnownAnchors: false,
    });
    expect(wrongAddress.ok).toBe(false);
    if (!wrongAddress.ok) expect(wrongAddress.reason).toBe("DERIVATION_MISMATCH");
    const anchors = prepareSweepAuth({
      enabledFlag: "true",
      xprv,
      xpub,
      treasury: SWEEP_TREASURY,
      book: [{ index: 3, address }],
      requireKnownAnchors: true,
    });
    expect(anchors.ok).toBe(false);
    if (!anchors.ok) expect(anchors.reason).toBe("DERIVATION_MISMATCH");
  });

  it("accepts only the exact enabled flag and the real treasury", () => {
    expect(sweepFlagEnabled("true")).toBe(true);
    expect(sweepFlagEnabled("TRUE")).toBe(false);
    expect(sweepFlagEnabled("1")).toBe(false);
    expect(sweepFlagEnabled(undefined)).toBe(false);
    const disabled = prepareSweepAuth({
      enabledFlag: "TRUE",
      xprv: "xprv",
      xpub: "xpub",
      treasury: SWEEP_TREASURY,
      book: [{ index: 3, address: INDEX3 }],
      requireKnownAnchors: true,
    });
    expect(disabled.ok).toBe(false);
    if (!disabled.ok) expect(disabled.reason).toBe("DISABLED");
    const treasury = prepareSweepAuth({
      enabledFlag: "true",
      xprv: "xprv",
      xpub: "xpub",
      treasury: PAYOUT,
      book: [{ index: 3, address: INDEX3 }],
      requireKnownAnchors: false,
    });
    expect(treasury.ok).toBe(false);
    if (!treasury.ok) expect(treasury.reason).toBe("TREASURY_MISMATCH");
  });

  it("redacts extended keys and hex secrets", () => {
    const leaked = "xprv9s21ZrQH143K3QTDL4LXchh7HjeN9s21ZrQH143K3QTDL4LX";
    const text = redactSweepLog(`boom ${leaked} 0x${"ab".repeat(32)} https://rpc.example/key`, [
      "super-secret-value",
    ]);
    expect(text).not.toContain("xprv9s");
    expect(text).not.toContain("ababab");
    expect(text).not.toContain("https://");
    expect(text).toContain("[redacted]");
    expect(text).toContain("[rpc]");
  });

  it("walks a bounded address window and always includes in-flight rows", () => {
    const book = Array.from({ length: 10 }, (_, index) => ({
      derivationIndex: index,
      address: `0x${(index + 1).toString(16).padStart(40, "0")}`,
    }));
    const first = selectSweepTargets({
      book,
      inflight: [],
      cursor: 0,
      limit: MAX_NEW_SWEEPS_PER_RUN,
    });
    expect(first.targets).toHaveLength(6);
    expect(first.nextCursor).toBe(6);
    const inflightAddress = book[2]!.address;
    const again = selectSweepTargets({
      book,
      inflight: [{ depositAddress: inflightAddress, derivationIndex: 2 }],
      cursor: 6,
      limit: 6,
    });
    expect(again.targets[0]?.address).toBe(inflightAddress);
    expect(again.targets.filter((row) => row.address === inflightAddress)).toHaveLength(1);
    expect(again.nextCursor).toBe(0);
  });

  it("keeps the sweep off the Cloudflare minute cron and out of the ledger", () => {
    const jobs = readFileSync("src/lib/crypto/jobs.server.ts", "utf8");
    const scheduled = jobs.slice(jobs.indexOf("export async function runScheduledCryptoJobs"));
    expect(scheduled).not.toContain("runDepositSweep");
    expect(scheduled).not.toContain("deposit-sweep");
    const sweep = readFileSync("src/lib/crypto/deposit-sweep.ts", "utf8");
    const server = readFileSync("src/lib/crypto/deposit-sweep.server.ts", "utf8");
    const migration = readFileSync(
      "supabase/migrations/20261018233000_base_deposit_sweeps.sql",
      "utf8",
    );
    for (const source of [sweep, server, migration]) {
      expect(source).not.toContain("crypto_credit_deposit");
      expect(source).not.toContain("_post(");
      expect(source).not.toContain("btcpay");
    }
    expect(migration).toContain("0x9eaff85db9a2559ec958740a6a3b523751237987");
    expect(migration).toContain("200000000000000");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on public.crypto_deposit_sweeps");
    expect(migration).not.toContain("xprv");
  });
});

describe("deposit sweep runner gate", () => {
  it("returns disabled and does not touch the network when the flag is unset", async () => {
    delete process.env["CRYPTO_DEPOSIT_SWEEP_ENABLED"];
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      throw new Error("network");
    }) as typeof fetch;
    try {
      const { runDepositSweep } = await import("../src/lib/crypto/deposit-sweep.server");
      await expect(runDepositSweep(8453)).resolves.toEqual({ ok: true, skipped: "DISABLED" });
      await expect(runDepositSweep(1)).resolves.toEqual({ ok: true, skipped: "DISABLED" });
      expect(calls).toEqual([]);
    } finally {
      globalThis.fetch = original;
    }
  });
});
