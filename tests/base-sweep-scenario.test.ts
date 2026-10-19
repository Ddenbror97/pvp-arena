import { HDKey } from "@scure/bip32";
import { keccak256, stringToHex } from "viem";
import { describe, expect, it } from "vitest";
import { deriveDepositAddress, deriveDepositAddressV2 } from "../src/lib/crypto/addresses.server";
import { erc20LogMatches } from "../src/lib/crypto/transfer-match";
import {
  applySweepTick,
  decodeSignedSweep,
  prepareSweepPreflight,
  SWEEP_TREASURY,
  SWEEP_USDC,
  type AccountView,
  type SignRequest,
  type SweepBegin,
  type SweepConfirmProof,
  type SweepRecord,
  type SweepStore,
  type SweepTarget,
} from "../src/lib/crypto/deposit-sweep";
import { sweepIdempotencyKey } from "../src/lib/crypto/deposit-sweep";
import { MemoryNonceBook, reservePayoutNonce } from "../src/lib/crypto/payout-nonce";

const GWEI = 1_000_000_000n;
const PAYOUT = "0xd29370ca973e85b7ec7e52c0cff267b0fb63da24";

class Store implements SweepStore {
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
    this.rows.push({
      id: `sweep-${this.n}`,
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
    return { created: true as const, id: `sweep-${this.n}` };
  }
  async storeSigned(id: string, hash: string, raw: string) {
    const row = this.must(id);
    row.status = "SIGNED";
    row.txHash = hash;
    row.signedRawTx = raw;
  }
  async markBroadcast(id: string) {
    this.must(id).status = "BROADCAST";
  }
  async confirm(id: string, proof: SweepConfirmProof) {
    const row = this.must(id);
    if (row.txHash !== proof.hash || row.amount !== proof.amount || row.chainId !== proof.chainId) {
      throw new Error("SWEEP_CONFIRM_MISMATCH");
    }
    row.status = "CONFIRMED";
  }
  async fail(id: string, reason: string) {
    const row = this.must(id);
    row.status = "FAILED";
    row.error = reason;
  }
  async note(id: string, reason: string) {
    const row = this.must(id);
    row.error = reason;
  }
  private must(id: string) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error("missing");
    return row;
  }
}

function creditKey(chainId: number, tx: string, log: number) {
  return `deposit:${chainId}:${tx}:${log}`;
}

describe("base deposit and sweep scenario", () => {
  it("credits version 2 once, plans a dry-run, then signs one live sweep", async () => {
    const seed = new Uint8Array(64);
    seed[0] = 11;
    const master = HDKey.fromMasterSeed(seed);
    const xprv = master.privateExtendedKey;
    const xpub = master.publicExtendedKey;
    if (!xprv) throw new Error("test key");
    const previous = deriveDepositAddress(xpub, 8453, 41).toLowerCase();
    const current = deriveDepositAddressV2(xpub, 8453, 0).toLowerCase();
    expect(current).not.toBe(previous);
    const book: SweepTarget[] = [
      { derivationIndex: 41, derivationVersion: 1, address: previous },
      { derivationIndex: 0, derivationVersion: 2, address: current },
    ];

    const ledger = new Set<string>();
    const credit = (tx: string, log: number) => {
      const key = creditKey(8453, tx, log);
      if (ledger.has(key)) return "already";
      ledger.add(key);
      return "credited";
    };
    expect(credit("0xeth", 0)).toBe("credited");
    expect(credit("0xeth", 0)).toBe("already");
    expect(credit("0xusdc", 4)).toBe("credited");
    expect(ledger.size).toBe(2);

    const wrongToken = erc20LogMatches(
      {
        address: "0x00000000000000000000000000000000000000aa",
        topics: [],
        data: "0x",
      },
      {
        token: SWEEP_USDC,
        from: PAYOUT,
        to: current,
        units: 1n,
        transferTopic: "0x" + "ab".repeat(32),
      },
    );
    expect(wrongToken).toBe(false);

    const hot = "0x2222222222222222222222222222222222222222";
    expect(
      prepareSweepPreflight({
        mode: "live",
        xpub,
        treasury: SWEEP_TREASURY,
        payout: hot,
        payoutKeyAddress: null,
        usdc: SWEEP_USDC,
        chainId: 8453,
        activeDepositCount: 1,
        activePayoutCount: 1,
        schemaReady: true,
        book: book.map((row) => ({
          index: row.derivationIndex,
          address: row.address,
          version: row.derivationVersion,
        })),
        requireKnownAnchors: false,
      }),
    ).toMatchObject({ ok: false, reason: "KEY_MISSING" });

    const store = new Store();
    const signs: SignRequest[] = [];
    const broadcasts: string[] = [];
    const accounts: Record<string, AccountView> = {
      [current]: { ethWei: 80_000_000_000_000_000n, usdcUnits: 0n, nonce: 2 },
      [previous]: { ethWei: 10n ** 16n, usdcUnits: 1_000_000n, nonce: 0 },
      [PAYOUT]: { ethWei: 10n ** 18n, usdcUnits: 0n, nonce: 4 },
    };
    const nonces = new MemoryNonceBook();
    const tick = (mode: "dry_run" | "live", targets: SweepTarget[]) =>
      applySweepTick(
        {
          chainId: 8453,
          treasury: SWEEP_TREASURY,
          payout: PAYOUT,
          gasPriceWei: GWEI,
          gasFundingAvailable: true,
          book,
          targets,
          nowIso: "2026-10-19T01:00:00.000Z",
          mode,
        },
        {
          account: (address) => accounts[address.toLowerCase()] ?? { error: "rpc" },
          receipt: () => ({ state: "missing" }),
          sign: (req) => {
            signs.push(req);
            const raw = `raw:${req.kind}:${req.from}:${req.amount}:${req.nonce}`;
            return { raw, hash: keccak256(stringToHex(raw)) };
          },
          broadcast: async (raw) => {
            broadcasts.push(raw);
            return "ok";
          },
          store,
          raise: () => undefined,
          reserveNonce: (lease) =>
            nonces.run(() =>
              reservePayoutNonce(nonces, {
                chainId: 8453,
                payer: lease.payer,
                purpose: lease.purpose,
                ownerId: lease.ownerId,
                chainPending: lease.chainNonce,
                occupied: [],
              }),
            ),
          markNonceSigned: async () => undefined,
          releaseNonce: async () => undefined,
          decodeSigned: () => null,
          chainTransaction: () => null,
        },
      );

    const dry = await tick("dry_run", [book[1]!]);
    expect(dry.actions[0]?.action).toBe("dry_run_sweep_eth");
    expect(signs).toHaveLength(0);
    expect(broadcasts).toHaveLength(0);
    expect(store.rows).toHaveLength(0);
    expect(ledger.size).toBe(2);

    const live = await tick("live", [book[1]!]);
    expect(live.actions[0]?.action).toBe("signed");
    expect(signs).toHaveLength(1);
    expect(signs[0]?.to.toLowerCase()).toBe(SWEEP_TREASURY.toLowerCase());
    expect(signs[0]?.from.toLowerCase()).toBe(current);
    expect(broadcasts).toHaveLength(1);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]?.status).toBe("BROADCAST");
    expect(store.rows[0]?.amount).toBe(signs[0]?.amount);
    const again = await tick("live", [book[1]!]);
    expect(again.actions[0]?.action).not.toBe("signed");
    expect(signs).toHaveLength(1);
    expect(store.rows).toHaveLength(1);
    expect(ledger.size).toBe(2);

    const version1 = await tick("live", [book[0]!]);
    expect(version1.actions).toEqual([{ address: previous, action: "version_skipped" }]);
    expect(credit("0xv1", 0)).toBe("credited");
    expect(credit("0xv1", 0)).toBe("already");

    const unseen = deriveDepositAddressV2(xpub, 8453, 2).toLowerCase();
    book.push({ derivationIndex: 2, derivationVersion: 2, address: unseen });
    accounts[unseen] = { error: "rpc" };
    const before = store.rows.length;
    const timedOut = await tick("live", [
      { derivationIndex: 2, derivationVersion: 2, address: unseen },
    ]);
    expect(timedOut.actions[0]?.action).toBe("rpc_skip");
    expect(store.rows).toHaveLength(before);
    expect(ledger.size).toBe(3);
  });

  it("holds an ambiguous receipt and does not open a second sweep", async () => {
    const address = "0x" + "ab".repeat(20);
    const target: SweepTarget = { derivationIndex: 4, derivationVersion: 2, address };
    const store = new Store();
    store.rows.push({
      id: "held",
      chainId: 8453,
      depositAddress: address,
      derivationIndex: 4,
      asset: "ETH",
      amount: 50_000_000_000_000n,
      nonce: 1,
      status: "BROADCAST",
      payer: address,
      toAddress: SWEEP_TREASURY.toLowerCase(),
      txHash: keccak256(stringToHex("held")),
      signedRawTx: "0x02",
      maxFeePerGas: GWEI,
      gasLimit: 21_000n,
      error: null,
      idempotencyKey: "held",
    });
    const signs: string[] = [];
    const result = await applySweepTick(
      {
        chainId: 8453,
        treasury: SWEEP_TREASURY,
        payout: PAYOUT,
        gasPriceWei: GWEI,
        gasFundingAvailable: true,
        book: [target],
        targets: [target],
        nowIso: "2026-10-19T01:00:00.000Z",
        mode: "live",
      },
      {
        account: () => ({ ethWei: 0n, usdcUnits: 0n, nonce: 2 }),
        receipt: () => ({ state: "success", blockNumber: 10n }),
        sign: () => {
          signs.push("signed");
          return { raw: "0x02", hash: "0x" + "11".repeat(32) };
        },
        broadcast: () => "ok",
        store,
        raise: () => undefined,
        reserveNonce: async () => ({ nonce: 1, reused: false }),
        markNonceSigned: async () => undefined,
        releaseNonce: async () => undefined,
        decodeSigned: (raw) => decodeSignedSweep(raw),
        chainTransaction: () => null,
      },
    );
    expect(result.actions[0]?.action).toBe("receipt_mismatch");
    expect(store.rows[0]?.status).toBe("BROADCAST");
    expect(signs).toEqual([]);
  });

  it("lets two credit attempts and two sweep begins produce one of each", async () => {
    const ledger = new Map<string, number>();
    const credit = (key: string) => {
      ledger.set(key, (ledger.get(key) ?? 0) + 1);
      return ledger.get(key) === 1;
    };
    const key = creditKey(8453, "0xconcurrent", 1);
    const [first, second] = await Promise.all([
      Promise.resolve(credit(key)),
      Promise.resolve(credit(key)),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(ledger.get(key)).toBe(2);

    const store = new Store();
    const begin = {
      chainId: 8453,
      depositAddress: "0x" + "cd".repeat(20),
      derivationIndex: 8,
      derivationVersion: 2 as const,
      asset: "ETH" as const,
      amount: 10n ** 15n,
      nonce: 0,
      payer: "0x" + "cd".repeat(20),
      toAddress: SWEEP_TREASURY,
      maxFeePerGas: GWEI,
      gasLimit: 21_000n,
    };
    const [a, b] = await Promise.all([store.begin(begin), store.begin(begin)]);
    expect([a.created, b.created].filter(Boolean)).toHaveLength(1);
    expect(store.rows).toHaveLength(1);
  });
});
