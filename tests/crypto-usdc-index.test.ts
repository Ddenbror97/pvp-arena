import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  usdcIndexWindow,
  usdcTransfersInReceipt,
  USDC_INDEX_RECHECK_BLOCKS,
  USDC_INDEX_SETTLE_BLOCKS,
} from "../src/lib/crypto/usdc-index";

/**
 * The parts of the USDC index scan that do not depend on the index's provider (the Alchemy index
 * itself is in crypto-alchemy-index.test.ts), and the deposit watcher with no index at all.
 * Numbers are the production freeze of 2026-11-10: cursor 53,246,268, head 55,828,924.
 */
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const TREASURY = "0x9eaff85db9a2559ec958740a6a3b523751237987";
const PAYOUT = "0xd29370ca973e85b7ec7e52c0cff267b0fb63da24";
const PLAYER = "0x6ebca496ac079632ad711646dce4c806ee9bbd0d";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const CURSOR = 53_246_268n;
const LATEST = 55_828_924n;
const topic = (address: string) => "0x" + "0".repeat(24) + address.slice(2);
const word = (n: bigint) => "0x" + n.toString(16).padStart(64, "0");

describe("usdc index: reading the index and the receipt", () => {
  const targets = new Set([TREASURY]);

  it("asks for the range behind the cursor up to just short of the head", () => {
    expect(usdcIndexWindow(CURSOR, LATEST)).toEqual({
      from: CURSOR - USDC_INDEX_RECHECK_BLOCKS + 1n,
      to: LATEST - USDC_INDEX_SETTLE_BLOCKS,
    });
    expect(usdcIndexWindow(10n, 5_000n)).toEqual({ from: 0n, to: 4_900n });
    expect(usdcIndexWindow(0n, 50n)).toBeNull();
  });

  it("decodes the deposit from the receipt's own logs", () => {
    const logs = [
      {
        address: USDC,
        topics: [TRANSFER, topic(PLAYER), topic(TREASURY)],
        data: word(5_000_000n),
        logIndex: 7,
      },
      // Not USDC, not to us, removed, and an Approval: all ignored.
      {
        address: PAYOUT,
        topics: [TRANSFER, topic(PLAYER), topic(TREASURY)],
        data: word(9n),
        logIndex: 8,
      },
      {
        address: USDC,
        topics: [TRANSFER, topic(PLAYER), topic(PAYOUT)],
        data: word(9n),
        logIndex: 9,
      },
      {
        address: USDC,
        topics: [TRANSFER, topic(PLAYER), topic(TREASURY)],
        data: word(9n),
        logIndex: 10,
        removed: true,
      },
      {
        address: USDC,
        topics: [
          "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
          topic(PLAYER),
          topic(TREASURY),
        ],
        data: word(9n),
        logIndex: 11,
      },
    ];
    expect(usdcTransfersInReceipt(logs, USDC, targets)).toEqual([
      { logIndex: 7, from: PLAYER, to: TREASURY, units: 5_000_000n },
    ]);
  });
});

// ---------------------------------------------------------------- the watcher around it
const state = {
  cursor: Number(CURSOR),
  rpcCalls: [] as Array<[string, Record<string, unknown>]>,
  logCalls: 0,
  indexRequests: [] as string[],
  clients: 0,
  safeOnSecondOnly: false,
};
vi.mock("@/lib/worker-env", () => ({
  applyWorkerEnv: () => {},
  workerEnv: (key: string) =>
    key === "CRYPTO_RPC_URL_8453"
      ? "https://base.first-provider.example/KEY"
      : key === "CRYPTO_RPC_URL_8453_B"
        ? "https://base.second-provider.example/KEY"
        : undefined,
}));
vi.mock("../src/lib/crypto/ops-log", () => ({ logCryptoOps: () => {} }));
vi.mock("@/integrations/supabase/client.server", () => {
  const tables: Record<string, () => unknown> = {
    crypto_settings: () => ({
      crypto_system_enabled: true,
      deposits_enabled: true,
      withdrawals_enabled: true,
      overlap_blocks: 12,
      payout_float_max_cents: 1,
      daily_global_limit_cents: 1,
      auto_approve_cents: 1,
    }),
    chain_networks: () => ({
      chain_id: 8453,
      is_enabled: true,
      network_mode: "mainnet",
      credit_confirmations: 15,
    }),
    chain_assets: () => [
      {
        asset_key: "USDC",
        is_enabled: true,
        contract_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        min_deposit_units: 1_950_000,
      },
      {
        asset_key: "ETH",
        is_enabled: false,
        price_feed_address: "0x71041dddad3595f9ced3dccfbe3d1f4b0a16bb70",
        decimals: 18,
        min_deposit_units: 100_000_000_000_000,
      },
    ],
    chain_treasury_accounts: () => [
      { role: "deposit", address: "0x9EAff85db9A2559eC958740A6a3b523751237987" },
      { role: "payout", address: "0xd29370ca973E85B7EC7E52c0cff267B0FB63dA24" },
    ],
    crypto_deposits: () => [],
  };
  const query = (table: string) => {
    const result = () => Promise.resolve({ data: tables[table]!(), error: null });
    const q: Record<string, unknown> = {
      select: () => q,
      eq: () => q,
      gte: () => q,
      single: result,
      maybeSingle: result,
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => result().then(ok, bad),
    };
    return q;
  };
  return {
    supabaseAdmin: {
      from: query,
      rpc: async (name: string, args: Record<string, unknown>) => {
        state.rpcCalls.push([name, args]);
        if (name === "crypto_get_cursor") return { data: state.cursor, error: null };
        if (name === "crypto_set_cursor")
          state.cursor = Math.max(state.cursor, Number(args["p_block"]));
        if (name === "crypto_pending_deposits") return { data: [], error: null };
        return { data: null, error: null };
      },
    },
  };
});
vi.mock("viem", async (original) => ({
  ...(await original<typeof import("viem")>()),
  createPublicClient: () => {
    const first = state.clients++ % 2 === 0;
    return {
      getChainId: async () => 8453,
      getCode: async () => "0x60",
      getBlockNumber: async () => LATEST,
      getBlock: async () => {
        if (first && state.safeOnSecondOnly) throw new Error("Requested resource not available.");
        return { number: LATEST - 20n };
      },
      getLogs: async () => {
        state.logCalls++;
        return [];
      },
      getTransactionReceipt: async () => {
        throw new Error("not found");
      },
    };
  },
}));

const calls = (name: string) => state.rpcCalls.filter((c) => c[0] === name);

describe("deposit watcher on a frozen cursor, with no transfer index", () => {
  beforeEach(() => {
    Object.assign(state, {
      cursor: Number(CURSOR),
      rpcCalls: [],
      logCalls: 0,
      indexRequests: [],
      clients: 0,
      safeOnSecondOnly: false,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        state.indexRequests.push(url);
        return new Response("down", { status: 503 });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("without an index, records the unreadable range and resumes near the head", async () => {
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    const result = await runDepositWatcher(8453);
    expect(result).toMatchObject({ ok: true, usdcVia: "logs", usdcError: null });
    expect(state.indexRequests).toEqual([]);
    const gap = calls("crypto_raise_incident").filter((c) => c[1]["p_check"] === "crypto_scan_gap");
    expect(gap).toHaveLength(1);
    expect(gap[0]![1]["p_details"]).toEqual({
      chain_id: 8453,
      asset: "USDC",
      from: Number(CURSOR + 1n),
      to: Number(LATEST - 300n),
    });
    // The incident is written before the cursor moves.
    const order = state.rpcCalls.map((c) => c[0]);
    expect(order.indexOf("crypto_raise_incident")).toBeLessThan(order.indexOf("crypto_set_cursor"));
    expect(state.cursor).toBeGreaterThan(Number(LATEST - 300n));
    expect(state.logCalls).toBeGreaterThan(0);
  });

  it("takes the safe head from the second provider when the first does not serve it", async () => {
    state.safeOnSecondOnly = true;
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    expect(await runDepositWatcher(8453)).toMatchObject({ ok: true, safe: Number(LATEST - 20n) });
  });
});
