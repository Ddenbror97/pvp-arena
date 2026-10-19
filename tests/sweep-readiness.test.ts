import { readFileSync } from "node:fs";
import { HDKey } from "@scure/bip32";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, stringToHex, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { deriveDepositAddress, deriveDepositAddressV2 } from "../src/lib/crypto/addresses.server";
import {
  applySweepTick,
  classifySweepFlag,
  guardSweepIo,
  prepareSweepPreflight,
  resolveSweepMode,
  sweepIdempotencyKey,
  SWEEP_TREASURY,
  SWEEP_USDC,
  type AccountView,
  type SignRequest,
  type SweepBegin,
  type SweepConfirmProof,
  type SweepIo,
  type SweepRecord,
  type SweepStore,
  type SweepTarget,
} from "../src/lib/crypto/deposit-sweep";
import {
  separateJobOutcome,
  SWEEP_WORK_BUDGET_MS,
  CALLER_TIMEOUT_MS,
} from "../src/lib/crypto/job-budget";
import {
  MemoryNonceBook,
  releasePayoutNonce,
  reservePayoutNonce,
} from "../src/lib/crypto/payout-nonce";

const GWEI = 1_000_000_000n;
const PAYOUT = "0xd29370ca973e85b7ec7e52c0cff267b0fb63da24";

class MemorySweepStore implements SweepStore {
  rows: SweepRecord[] = [];
  private n = 0;
  async listInflight(chainId: number) {
    return this.rows.filter(
      (row) => row.chainId === chainId && ["PENDING", "SIGNED", "BROADCAST"].includes(row.status),
    );
  }
  async listForDeposit(chainId: number, address: string) {
    return this.rows.filter(
      (row) => row.chainId === chainId && row.depositAddress === address.toLowerCase(),
    );
  }
  async begin(row: SweepBegin) {
    if (row.derivationVersion !== 2) return { created: false as const };
    const depositAddress = row.depositAddress.toLowerCase();
    const key = sweepIdempotencyKey(row.chainId, depositAddress, row.asset, row.nonce);
    if (
      this.rows.some(
        (existing) =>
          existing.idempotencyKey === key ||
          (existing.depositAddress === depositAddress &&
            ["PENDING", "SIGNED", "BROADCAST"].includes(existing.status)),
      )
    ) {
      return { created: false as const };
    }
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
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error("missing");
    row.status = "SIGNED";
    row.txHash = hash;
    row.signedRawTx = raw;
  }
  async markBroadcast(id: string) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error("missing");
    row.status = "BROADCAST";
  }
  async confirm(id: string, _proof: SweepConfirmProof) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error("missing");
    row.status = "CONFIRMED";
  }
  async fail(id: string, reason: string) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error("missing");
    row.status = "FAILED";
    row.error = reason;
  }
  async note(id: string, reason: string) {
    const row = this.rows.find((item) => item.id === id);
    if (row) row.error = reason;
  }
}

function keys() {
  const seed = new Uint8Array(64);
  seed[0] = 4;
  const master = HDKey.fromMasterSeed(seed);
  const xprv = master.privateExtendedKey;
  const xpub = master.publicExtendedKey;
  if (!xprv) throw new Error("test key");
  return { xprv, xpub };
}

function bookFor(xpub: string): SweepTarget[] {
  return [
    {
      derivationIndex: 41,
      derivationVersion: 1,
      address: deriveDepositAddress(xpub, 8453, 41).toLowerCase(),
    },
    {
      derivationIndex: 0,
      derivationVersion: 2,
      address: deriveDepositAddressV2(xpub, 8453, 0).toLowerCase(),
    },
  ];
}

function basePreflight(xpub: string, mode: "dry_run" | "live", xprv?: string) {
  const hotSeed = new Uint8Array(64);
  hotSeed[0] = 5;
  const hotNode = HDKey.fromMasterSeed(hotSeed);
  if (!hotNode.privateKey) throw new Error("test key");
  const hot = privateKeyToAccount(`0x${Buffer.from(hotNode.privateKey).toString("hex")}` as Hex);
  return prepareSweepPreflight({
    mode,
    xprv,
    xpub,
    treasury: SWEEP_TREASURY,
    payout: hot.address,
    payoutKeyAddress: mode === "live" ? hot.address : null,
    usdc: SWEEP_USDC,
    chainId: 8453,
    activeDepositCount: 1,
    activePayoutCount: 1,
    schemaReady: true,
    book: bookFor(xpub).map((row) => ({
      index: row.derivationIndex,
      address: row.address,
      version: row.derivationVersion,
    })),
    requireKnownAnchors: false,
  });
}

async function runTick(input: {
  mode?: "live" | "dry_run";
  targets: SweepTarget[];
  book: SweepTarget[];
  accounts: Record<string, AccountView>;
  deadlineAtMs?: number;
  gasFundingAvailable?: boolean;
}) {
  const store = new MemorySweepStore();
  const nonces = new MemoryNonceBook();
  const signs: SignRequest[] = [];
  const broadcasts: string[] = [];
  const reserves: string[] = [];
  const io: SweepIo = {
    account: (address) => input.accounts[address.toLowerCase()] ?? { error: "rpc" },
    receipt: () => ({ state: "missing" }),
    sign: (req) => {
      signs.push(req);
      const raw = `raw:${req.kind}:${req.amount}`;
      return { raw, hash: keccak256(stringToHex(raw)) };
    },
    broadcast: (raw) => {
      broadcasts.push(raw);
      return "ok";
    },
    store,
    raise: () => undefined,
    reserveNonce: async (lease) => {
      reserves.push(lease.ownerId);
      return nonces.run(() =>
        reservePayoutNonce(nonces, {
          chainId: 8453,
          payer: lease.payer,
          purpose: lease.purpose,
          ownerId: lease.ownerId,
          chainPending: lease.chainNonce,
          occupied: [],
        }),
      );
    },
    markNonceSigned: async () => undefined,
    releaseNonce: async (lease) => {
      nonces.run(() => releasePayoutNonce(nonces, { chainId: 8453, ...lease }));
    },
    decodeSigned: () => null,
    chainTransaction: () => null,
  };
  const result = await applySweepTick(
    {
      chainId: 8453,
      treasury: SWEEP_TREASURY,
      payout: PAYOUT,
      gasPriceWei: GWEI,
      gasFundingAvailable: input.gasFundingAvailable ?? true,
      book: input.book,
      targets: input.targets,
      nowIso: "2026-10-19T00:00:00.000Z",
      mode: input.mode ?? "live",
      deadlineAtMs: input.deadlineAtMs,
    },
    input.mode === "dry_run" ? guardSweepIo("dry_run", io) : io,
  );
  return { result, store, signs, broadcasts, reserves };
}

describe("sweep mode", () => {
  it("fails closed when the flags disagree or are not exact", () => {
    expect(resolveSweepMode(undefined, undefined)).toEqual({ ok: true, mode: "off" });
    expect(resolveSweepMode("false", "false")).toEqual({ ok: true, mode: "off" });
    expect(resolveSweepMode("true", undefined)).toEqual({ ok: true, mode: "live" });
    expect(resolveSweepMode("true", "false")).toEqual({ ok: true, mode: "live" });
    expect(resolveSweepMode(undefined, "true")).toEqual({ ok: true, mode: "dry_run" });
    expect(resolveSweepMode("false", "true")).toEqual({ ok: true, mode: "dry_run" });
    expect(resolveSweepMode("true", "true")).toEqual({ ok: false, reason: "SWEEP_MODE_CONFLICT" });
    expect(resolveSweepMode("TRUE", undefined)).toEqual({
      ok: false,
      reason: "SWEEP_FLAG_INVALID",
    });
    expect(resolveSweepMode("true", "yes")).toEqual({ ok: false, reason: "SWEEP_FLAG_INVALID" });
    expect(classifySweepFlag("1")).toBe("invalid");
  });

  it("checks a dry-run from the xpub and requires the xprv only for live mode", () => {
    const { xprv, xpub } = keys();
    expect(basePreflight(xpub, "dry_run").ok).toBe(true);
    expect(basePreflight(xpub, "live").ok).toBe(false);
    if (!basePreflight(xpub, "live").ok) {
      expect(basePreflight(xpub, "live")).toMatchObject({ reason: "KEY_MISSING" });
    }
    expect(basePreflight(xpub, "live", xprv).ok).toBe(true);
    const other = HDKey.fromMasterSeed(new Uint8Array(64).fill(7)).privateExtendedKey;
    expect(basePreflight(xpub, "live", other).ok).toBe(false);
    expect(
      prepareSweepPreflight({
        mode: "live",
        xprv,
        xpub,
        treasury: SWEEP_TREASURY,
        payout: PAYOUT,
        payoutKeyAddress: PAYOUT,
        usdc: "0x0000000000000000000000000000000000000001",
        chainId: 8453,
        activeDepositCount: 1,
        activePayoutCount: 1,
        schemaReady: true,
        book: [],
        requireKnownAnchors: false,
      }),
    ).toMatchObject({ ok: false, reason: "USDC_MISMATCH" });
    expect(
      prepareSweepPreflight({
        mode: "dry_run",
        xpub,
        treasury: "0x0000000000000000000000000000000000000001",
        payout: PAYOUT,
        payoutKeyAddress: null,
        usdc: SWEEP_USDC,
        chainId: 8453,
        activeDepositCount: 1,
        activePayoutCount: 1,
        schemaReady: true,
        book: bookFor(xpub).map((row) => ({
          index: row.derivationIndex,
          address: row.address,
          version: row.derivationVersion,
        })),
        requireKnownAnchors: false,
      }),
    ).toMatchObject({ ok: false, reason: "TREASURY_MISMATCH" });
    expect(
      prepareSweepPreflight({
        mode: "dry_run",
        xpub,
        treasury: SWEEP_TREASURY,
        payout: PAYOUT,
        payoutKeyAddress: null,
        usdc: SWEEP_USDC,
        chainId: 8453,
        activeDepositCount: 1,
        activePayoutCount: 1,
        schemaReady: false,
        book: [],
        requireKnownAnchors: false,
      }),
    ).toMatchObject({ ok: false, reason: "SCHEMA_NOT_READY" });
  });
});

describe("dry-run planning", () => {
  it("plans ETH and USDC without signing, leasing a nonce, broadcasting, or opening a sweep", async () => {
    const { xpub } = keys();
    const book = bookFor(xpub);
    const current = book[1]!;
    const eth = await runTick({
      mode: "dry_run",
      book,
      targets: [current],
      accounts: {
        [current.address]: { ethWei: 100_000_000_000_000_000n, usdcUnits: 0n, nonce: 1 },
        [PAYOUT]: { ethWei: 10n ** 18n, usdcUnits: 0n, nonce: 3 },
      },
    });
    expect(eth.result.actions.map((row) => row.action)).toEqual(["dry_run_sweep_eth"]);
    expect(eth.signs).toEqual([]);
    expect(eth.broadcasts).toEqual([]);
    expect(eth.reserves).toEqual([]);
    expect(eth.store.rows).toEqual([]);

    const usdc = await runTick({
      mode: "dry_run",
      book,
      targets: [current],
      accounts: {
        [current.address]: { ethWei: 0n, usdcUnits: 2_000_000n, nonce: 1 },
        [PAYOUT]: { ethWei: 10n ** 18n, usdcUnits: 0n, nonce: 3 },
      },
    });
    expect(usdc.result.actions.map((row) => row.action)).toEqual(["dry_run_fund_gas"]);
    expect(usdc.signs).toEqual([]);
    expect(usdc.reserves).toEqual([]);
    expect(usdc.store.rows).toEqual([]);
  });

  it("skips version 1 and stops new work at the deadline", async () => {
    const { xpub } = keys();
    const book = bookFor(xpub);
    const version1 = book[0]!;
    const skipped = await runTick({
      mode: "dry_run",
      book,
      targets: [version1],
      accounts: {
        [version1.address]: { ethWei: 10n ** 18n, usdcUnits: 5n, nonce: 0 },
      },
    });
    expect(skipped.result.actions).toEqual([
      { address: version1.address, action: "version_skipped" },
    ]);
    expect(skipped.store.rows).toEqual([]);

    const second = {
      derivationIndex: 1,
      derivationVersion: 2 as const,
      address: deriveDepositAddressV2(xpub, 8453, 1).toLowerCase(),
    };
    const stopped = await runTick({
      mode: "live",
      book: [...book, second],
      targets: [book[1]!, second],
      deadlineAtMs: Date.now() - 1,
      accounts: {
        [book[1]!.address]: { ethWei: 10n ** 17n, usdcUnits: 0n, nonce: 0 },
        [second.address]: { ethWei: 10n ** 17n, usdcUnits: 0n, nonce: 0 },
      },
    });
    expect(stopped.result.actions.map((row) => row.action)).toEqual(["deadline"]);
    expect(stopped.signs).toEqual([]);
    expect(stopped.store.rows).toEqual([]);
  });

  it("refuses dry-run IO that tries to sign or write sweep state", async () => {
    const store = new MemorySweepStore();
    const guarded = guardSweepIo("dry_run", {
      account: () => ({ error: "rpc" }),
      receipt: () => ({ state: "missing" }),
      sign: () => ({ raw: "0x", hash: "0x" }),
      broadcast: () => "ok",
      store,
      raise: () => undefined,
      reserveNonce: async () => ({ nonce: 1, reused: false }),
      markNonceSigned: async () => undefined,
      releaseNonce: async () => undefined,
      decodeSigned: () => null,
      chainTransaction: () => null,
    });
    await expect(guarded.sign({} as SignRequest)).rejects.toThrow("DRY_RUN_SIGN");
    await expect(guarded.broadcast("0x")).rejects.toThrow("DRY_RUN_BROADCAST");
    await expect(
      guarded.reserveNonce({
        payer: PAYOUT,
        purpose: "gas_stipend",
        ownerId: "gas:0xabc",
        chainNonce: 1,
      }),
    ).rejects.toThrow("DRY_RUN_NONCE");
    await expect(
      guarded.store.begin({
        chainId: 8453,
        depositAddress: PAYOUT,
        derivationIndex: 0,
        derivationVersion: 2,
        asset: "ETH",
        amount: 1n,
        nonce: 0,
        payer: PAYOUT,
        toAddress: SWEEP_TREASURY,
        maxFeePerGas: 1n,
        gasLimit: 21_000n,
      }),
    ).rejects.toThrow("DRY_RUN_STATE");
  });
});

describe("deposit and sweep budgets", () => {
  it("keeps a slow sweep from timing out a finished credit", () => {
    const split = separateJobOutcome({ detectMs: 8_000, creditMs: 4_000, sweepMs: 30_000 });
    expect(split.depositCompleted).toBe(true);
    expect(split.sweepCompleted).toBe(false);
    expect(split.creditSurvivedSweepTimeout).toBe(true);
    expect(8_000 + 4_000 + 30_000).toBeGreaterThan(CALLER_TIMEOUT_MS);
    expect(SWEEP_WORK_BUDGET_MS).toBeLessThan(CALLER_TIMEOUT_MS);
  });

  it("schedules sweeping as its own call on the existing dispatcher", () => {
    const jobs = readFileSync("src/lib/crypto/jobs.server.ts", "utf8");
    const scheduled = jobs.slice(jobs.indexOf("export async function runScheduledCryptoJobs"));
    expect(scheduled).not.toContain("runDepositSweep");
    expect(scheduled).not.toContain("crypto-sweeps");
    expect(jobs).not.toContain("${chainId}:sweep");
    expect(jobs).toContain("sweeps: { gapSeconds: SWEEP_GATE_SECONDS, perChain: runDepositSweep }");
    const server = readFileSync("src/lib/crypto/deposit-sweep.server.ts", "utf8");
    expect(server).toContain("resolveSweepMode");
    expect(server).toContain("guardSweepIo");
    expect(server).toContain('decision.mode === "live" ? workerEnv("CRYPTO_DEPOSIT_XPRV")');
    const migration = readFileSync(
      "supabase/migrations/20261019020000_sweep_job_and_readiness.sql",
      "utf8",
    );
    const depositsAt = migration.indexOf("'crypto-deposits'");
    const sweepsAt = migration.indexOf("'crypto-sweeps'");
    expect(depositsAt).toBeGreaterThan(-1);
    expect(sweepsAt).toBeGreaterThan(depositsAt);
    expect(migration).not.toContain("cron.schedule");
    expect(migration).not.toContain("xprv");
    const monitor = readFileSync("ops/base-sweep-monitor.sql", "utf8");
    const preflight = readFileSync("ops/base-sweep-preflight.sql", "utf8");
    for (const source of [monitor, preflight]) {
      expect(source.toLowerCase()).not.toMatch(/select[\s\S]*signed_raw_tx/);
      expect(source).not.toContain("_http_response");
      expect(source.toLowerCase()).not.toContain("job_bearer");
    }
    expect(readFileSync("src/routes/api/public/cron/crypto-sweeps.ts", "utf8")).toContain(
      'handleCryptoJob("sweeps"',
    );
  });
});
