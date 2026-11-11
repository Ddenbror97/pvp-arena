/**
 * Crediting a deposit needs two independent providers that attest to it. Production,
 * 2026-11-11: the 24 USDC recorded late from a skipped range (block 54,787,241, a month old)
 * stayed uncredited as "crypto_rpc_disagreement" because a provider no longer served its block.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  agreement,
  readEvidence,
  type ProviderEvidence,
} from "../src/lib/crypto/provider-agreement";

const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const TREASURY = "0x9eaff85db9a2559ec958740a6a3b523751237987";
const PLAYER = "0x4e208183f6789ff01d8b7052903c9c1a7e231be1";
const TX = "0x3acef1d911b8dec2d18c3b52b2e5e30005d191c7e7cae2b6aeebaab017d7b403";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const BLOCK = 54_787_241n;
const HASH = "0x" + "b1".repeat(32);
const LATEST = 56_070_000n;
const pad = (address: string) => "0x" + "0".repeat(24) + address.slice(2);
const receipt = (over: Record<string, unknown> = {}) => ({
  status: "success",
  transactionHash: TX,
  blockHash: HASH,
  blockNumber: BLOCK,
  logs: [
    {
      address: USDC,
      topics: [TRANSFER, pad(PLAYER), pad(TREASURY)],
      data: "0x" + (24_000_000).toString(16).padStart(64, "0"),
      logIndex: 0,
    },
  ],
  ...over,
});
const block = (over: Record<string, unknown> = {}) => ({
  hash: HASH,
  number: BLOCK,
  transactions: [TX],
  ...over,
});
const good = (): ProviderEvidence => ({ receipt: receipt(), block: block() }) as ProviderEvidence;

describe("provider agreement: the rule", () => {
  const read = (e: ProviderEvidence) => readEvidence(e, TX, BLOCK, 0);

  it("reads what one provider says", () => {
    expect(read(good())).toMatchObject({ kind: "attests", blockHash: HASH });
    expect(read({ receipt: null, block: null })).toEqual({ kind: "unavailable", what: "receipt" });
    expect(read({ ...good(), block: null })).toEqual({ kind: "unavailable", what: "block" });
    const e = (r: Record<string, unknown>, b: Record<string, unknown> = {}) =>
      ({ receipt: receipt(r), block: block(b) }) as ProviderEvidence;
    expect(read(e({ status: "reverted" }))).toEqual({ kind: "refuses", why: "status" });
    expect(read(e({ blockNumber: BLOCK + 1n }))).toEqual({ kind: "refuses", why: "block_number" });
    expect(read(e({}, { hash: "0x" + "cc".repeat(32) }))).toEqual({
      kind: "refuses",
      why: "block_hash",
    });
    expect(read(e({}, { transactions: [] }))).toEqual({ kind: "refuses", why: "not_in_block" });
    expect(read(e({ logs: [] }))).toEqual({ kind: "refuses", why: "log" });
  });

  it("needs two that attest and match, and nobody saying otherwise", () => {
    const ok = read(good());
    const cannot = read({ receipt: null, block: null });
    const reorged = read({
      receipt: receipt({ blockHash: "0x" + "dd".repeat(32) }),
      block: block({ hash: "0x" + "dd".repeat(32) }),
    } as ProviderEvidence);
    expect(agreement({ A: ok, B: ok })).toEqual({ ok: true, by: ["A", "B"] });
    expect(agreement({ A: ok, B: cannot })).toEqual({ ok: false, reason: "A:ok,B:no_receipt" });
    expect(agreement({ A: ok, B: cannot, C: ok })).toEqual({ ok: true, by: ["A", "C"] });
    // Two providers on different blocks: a third cannot settle it.
    expect(agreement({ A: ok, B: reorged })).toMatchObject({ ok: false });
    expect(agreement({ A: ok, B: reorged, C: ok })).toMatchObject({ ok: false });
    const failed = read({ receipt: receipt({ status: "reverted" }), block: block() } as never);
    expect(agreement({ A: ok, B: failed, C: ok })).toEqual({
      ok: false,
      reason: "A:ok,B:refuses_status,C:ok",
    });
    expect(agreement({ A: cannot, B: cannot, C: ok })).toMatchObject({ ok: false });
  });
});

// ---------------------------------------------------------------- the credit pass around it
type Node = { receipt: unknown; byNumber: unknown; byHash: unknown; chain?: number };
const state = {
  nodes: [] as Node[],
  made: 0,
  alchemy: "https://base-mainnet.g.alchemy.com/v2/KEY" as string | undefined,
  rpcA: "https://base.first-provider.example/KEY",
  rpcCalls: [] as Array<[string, Record<string, unknown>]>,
};
vi.mock("@/lib/worker-env", () => ({
  applyWorkerEnv: () => {},
  workerEnv: (key: string) =>
    key === "CRYPTO_RPC_URL_8453"
      ? state.rpcA
      : key === "CRYPTO_RPC_URL_8453_B"
        ? "https://base.second-provider.example/KEY"
        : key === "CRYPTO_ALCHEMY_URL_8453"
          ? state.alchemy
          : undefined,
}));
vi.mock("../src/lib/crypto/ops-log", () => ({ logCryptoOps: () => {} }));
vi.mock("@/integrations/supabase/client.server", () => {
  const tables: Record<string, unknown> = {
    crypto_settings: {
      crypto_system_enabled: true,
      deposits_enabled: true,
      withdrawals_enabled: true,
      overlap_blocks: 12,
      payout_float_max_cents: 1,
      daily_global_limit_cents: 1,
      auto_approve_cents: 1,
    },
    chain_networks: {
      chain_id: 8453,
      is_enabled: true,
      network_mode: "mainnet",
      credit_confirmations: 15,
    },
    chain_assets: [
      {
        asset_key: "USDC",
        is_enabled: true,
        contract_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        min_deposit_units: 1_950_000,
      },
    ],
    chain_treasury_accounts: [
      { role: "deposit", address: "0x9EAff85db9A2559eC958740A6a3b523751237987" },
      { role: "payout", address: "0xd29370ca973E85B7EC7E52c0cff267B0FB63dA24" },
    ],
    crypto_deposits: [],
    integrity_incidents: [],
  };
  const query = (table: string) => {
    const result = () => Promise.resolve({ data: tables[table], error: null });
    const q: Record<string, unknown> = { single: result, maybeSingle: result };
    for (const f of ["select", "eq", "gte", "lte", "is", "order", "limit", "update"])
      q[f] = () => q;
    q["then"] = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) =>
      result().then(ok, bad);
    return q;
  };
  return {
    supabaseAdmin: {
      from: query,
      rpc: async (name: string, args: Record<string, unknown>) => {
        state.rpcCalls.push([name, args]);
        if (name === "crypto_get_cursor" || name === "crypto_get_eth_cursor")
          return { data: Number(LATEST - 150n), error: null };
        if (name === "crypto_pending_deposits")
          return {
            data: [
              {
                id: "4ae8cca8",
                tx_hash: TX,
                block_number: Number(BLOCK),
                asset_key: "USDC",
                log_index: 0,
                from_address: PLAYER,
                to_address: TREASURY,
                units: "24000000",
              },
            ],
            error: null,
          };
        if (name === "crypto_credit_deposit") return { data: { status: "CREDITED" }, error: null };
        return { data: null, error: null };
      },
    },
  };
});
vi.mock("viem", async (original) => ({
  ...(await original<typeof import("viem")>()),
  createPublicClient: () => {
    const node = state.nodes[state.made++] ?? { receipt: null, byNumber: null, byHash: null };
    const or404 = (value: unknown) => {
      if (value == null) throw new Error("Requested resource not available.");
      return value;
    };
    return {
      getChainId: async () => node.chain ?? 8453,
      getCode: async () => "0x60",
      getBlockNumber: async () => LATEST,
      getLogs: async () => [],
      getBlock: async (args: { blockTag?: string; blockNumber?: bigint; blockHash?: string }) =>
        args.blockTag
          ? { number: LATEST - 20n, transactions: [] }
          : or404(args.blockHash ? node.byHash : node.byNumber),
      getTransactionReceipt: async () => or404(node.receipt),
    };
  },
}));

const full = (): Node => ({ receipt: receipt(), byNumber: block(), byHash: block() });
const calls = (name: string) => state.rpcCalls.filter((c) => c[0] === name).map((c) => c[1]);

describe("crediting a deposit one provider can no longer serve", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(state, {
      nodes: [full(), full(), full()],
      made: 0,
      alchemy: "https://base-mainnet.g.alchemy.com/v2/KEY",
      rpcA: "https://base.first-provider.example/KEY",
      rpcCalls: [],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ result: { transfers: [] } })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  const run = async () => (await import("../src/lib/crypto/chain.server")).runDepositWatcher(8453);

  it("credits on the two configured providers without asking a third", async () => {
    expect(await run()).toMatchObject({ ok: true, credited: 1 });
    expect(state.made).toBe(2);
    expect(calls("crypto_credit_deposit")).toEqual([
      { p_id: "4ae8cca8", p_price_snapshot: null, p_block_hash: HASH },
    ]);
    expect(calls("crypto_raise_incident")).toEqual([]);
  });

  it("lets the third provider stand in for one that has dropped the old block", async () => {
    // The first serves the receipt but not a block that old; the second serves neither.
    state.nodes[0] = { receipt: receipt(), byNumber: null, byHash: block() };
    state.nodes[1] = { receipt: null, byNumber: null, byHash: null };
    expect(await run()).toMatchObject({ ok: true, credited: 1 });
    expect(state.made).toBe(3);
    expect(calls("crypto_raise_incident")).toEqual([]);
  });

  it("does not credit on one provider, and says which one could not answer", async () => {
    state.nodes[1] = { receipt: null, byNumber: null, byHash: null };
    state.alchemy = undefined;
    expect(await run()).toMatchObject({ ok: true, credited: 0 });
    expect(calls("crypto_credit_deposit")).toEqual([]);
    expect(calls("crypto_raise_incident")[0]).toMatchObject({
      p_check: "crypto_rpc_disagreement",
      p_details: { tx: TX, providers: "A:ok,B:no_receipt" },
    });
  });

  it("never lets a third provider outvote one that says otherwise", async () => {
    const elsewhere = "0x" + "dd".repeat(32);
    state.nodes[1] = {
      receipt: receipt({ blockHash: elsewhere }),
      byNumber: null,
      byHash: block({ hash: elsewhere }),
    };
    expect(await run()).toMatchObject({ credited: 0 });
    expect(state.made).toBe(2);
    expect(calls("crypto_credit_deposit")).toEqual([]);
    expect(calls("crypto_raise_incident")[0]!["p_details"]).toMatchObject({
      providers: "A:ok,B:ok,mismatch",
    });
  });

  it("does not count a second key of the same provider, or another chain, as a third", async () => {
    state.nodes[1] = { receipt: null, byNumber: null, byHash: null };
    state.rpcA = "https://base-mainnet.g.alchemy.com/v2/OTHERKEY";
    expect(await run()).toMatchObject({ credited: 0 });
    expect(state.made).toBe(2);

    vi.resetModules();
    Object.assign(state, {
      made: 0,
      rpcCalls: [],
      rpcA: "https://base.first-provider.example/KEY",
    });
    state.nodes[2] = { ...full(), chain: 1 };
    expect(await run()).toMatchObject({ credited: 0 });
    expect(calls("crypto_credit_deposit")).toEqual([]);
  });
});
