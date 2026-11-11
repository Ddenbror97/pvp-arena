import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ankrUsdcCandidates,
  indexedUnits,
  usdcIndexWindow,
  usdcTransfersInReceipt,
  USDC_INDEX_RECHECK_BLOCKS,
  USDC_INDEX_SETTLE_BLOCKS,
} from "../src/lib/crypto/usdc-index";

/**
 * Base USDC deposits through Ankr's token-transfer index, and the scanner around it
 * (chain.server.ts runDepositWatcher). Numbers are the production freeze of 2026-11-10:
 * cursor 53,246,268, head 55,828,924.
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
const hash = (n: number) => "0x" + n.toString(16).padStart(64, "0");

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

  it("names only USDC sent to the treasury inside the range, once a transaction", () => {
    const page = {
      result: {
        transfers: [
          // A deposit.
          {
            blockHeight: 55_000_000,
            contractAddress: USDC,
            fromAddress: PLAYER,
            toAddress: TREASURY,
            transactionHash: hash(1),
            value: "5",
            tokenDecimals: 6,
          },
          // The same transaction again (two transfers in it).
          {
            blockHeight: 55_000_000,
            contractAddress: USDC,
            fromAddress: PLAYER,
            toAddress: TREASURY,
            transactionHash: hash(1),
            value: "0.5",
            tokenDecimals: 6,
          },
          // A look-alike token, a payout leaving, and a transfer outside the range.
          {
            blockHeight: 55_000_001,
            contractAddress: "0xb6d4b05b1c345874e4858fd1957c3d74e27a156e",
            toAddress: TREASURY,
            transactionHash: hash(2),
            value: "1",
          },
          {
            blockHeight: 55_000_002,
            contractAddress: USDC,
            fromAddress: TREASURY,
            toAddress: PLAYER,
            transactionHash: hash(3),
            value: "9",
          },
          {
            blockHeight: 1,
            contractAddress: USDC,
            toAddress: TREASURY,
            transactionHash: hash(4),
            value: "9",
            tokenDecimals: 6,
          },
        ],
      },
    };
    expect(ankrUsdcCandidates(page, USDC, targets, 54_000_000n, 55_500_000n)).toEqual([
      { hash: hash(1), block: 55_000_000n, units: 5_000_000n },
    ]);
  });

  it("treats an answer that is not a transfer list as an error, never as no deposits", () => {
    expect(() => ankrUsdcCandidates({}, USDC, targets, 0n, 9n)).toThrow("INDEX_SHAPE");
    expect(() => ankrUsdcCandidates({ result: {} }, USDC, targets, 0n, 9n)).toThrow("INDEX_SHAPE");
    const noHash = {
      result: { transfers: [{ blockHeight: 5, contractAddress: USDC, toAddress: TREASURY }] },
    };
    expect(() => ankrUsdcCandidates(noHash, USDC, targets, 0n, 9n)).toThrow("INDEX_SHAPE");
    expect(ankrUsdcCandidates({ result: { transfers: [] } }, USDC, targets, 0n, 9n)).toEqual([]);
  });

  it("reads the index's amount only when it is unambiguous", () => {
    expect(indexedUnits({ valueRawInteger: "1950000" })).toBe(1_950_000n);
    expect(indexedUnits({ value: "1.95", tokenDecimals: 6 })).toBe(1_950_000n);
    expect(indexedUnits({ value: "3", valueRawInteger: "", tokenDecimals: 6 })).toBe(3_000_000n);
    expect(indexedUnits({ value: "1.9500001", tokenDecimals: 6 })).toBeNull();
    expect(indexedUnits({ value: "1e6", tokenDecimals: 6 })).toBeNull();
    expect(indexedUnits({ value: "3" })).toBeNull();
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
  rpcUrl: "https://rpc.ankr.com/base/KEY",
  cursor: Number(CURSOR),
  rpcCalls: [] as Array<[string, Record<string, unknown>]>,
  recorded: [] as string[],
  logsError: null as string | null,
  logCalls: 0,
  receipts: new Map<string, unknown>(),
  receiptReads: [] as string[],
  indexPages: [] as unknown[],
  indexRequests: [] as Array<Record<string, unknown>>,
  ethOnly: false,
  ethCursor: 53_246_346,
  activityBatches: 0,
  clients: 0,
  safeOnSecondOnly: false,
};
vi.mock("@/lib/worker-env", () => ({
  applyWorkerEnv: () => {},
  workerEnv: (key: string) =>
    key === "CRYPTO_RPC_URL_8453"
      ? state.rpcUrl
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
        is_enabled: !state.ethOnly,
        contract_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
        min_deposit_units: 1_950_000,
      },
      {
        asset_key: "ETH",
        is_enabled: state.ethOnly,
        price_feed_address: "0x71041dddad3595f9ced3dccfbe3d1f4b0a16bb70",
        decimals: 18,
        min_deposit_units: 100_000_000_000_000,
      },
    ],
    chain_treasury_accounts: () => [
      { role: "deposit", address: "0x9EAff85db9A2559eC958740A6a3b523751237987" },
      { role: "payout", address: "0xd29370ca973E85B7EC7E52c0cff267B0FB63dA24" },
    ],
    crypto_deposits: () => state.recorded.map((tx_hash) => ({ tx_hash })),
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
        if (name === "crypto_get_eth_cursor") return { data: state.ethCursor, error: null };
        if (name === "crypto_set_eth_cursor")
          state.ethCursor = Math.max(state.ethCursor, Number(args["p_block"]));
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
        if (state.logsError) throw new Error(state.logsError);
        return [];
      },
      getTransactionReceipt: async ({ hash: h }: { hash: string }) => {
        state.receiptReads.push(h);
        const receipt = state.receipts.get(h);
        if (!receipt) throw new Error("not found");
        return receipt;
      },
    };
  },
}));

const deposit = (n: number, units: bigint, block = 55_000_000) => {
  state.receipts.set(hash(n), {
    status: "success",
    transactionHash: hash(n),
    blockNumber: BigInt(block),
    logs: [
      {
        address: USDC,
        topics: [TRANSFER, topic(PLAYER), topic(TREASURY)],
        data: word(units),
        logIndex: 3,
      },
    ],
  });
  return {
    blockHeight: block,
    contractAddress: USDC,
    fromAddress: PLAYER,
    toAddress: TREASURY,
    transactionHash: hash(n),
    value: String(Number(units) / 1e6),
    tokenDecimals: 6,
  };
};
const calls = (name: string) => state.rpcCalls.filter((c) => c[0] === name);

describe("deposit watcher on a frozen cursor", () => {
  beforeEach(() => {
    Object.assign(state, {
      rpcUrl: "https://rpc.ankr.com/base/KEY",
      cursor: Number(CURSOR),
      rpcCalls: [],
      recorded: [],
      logsError: null,
      logCalls: 0,
      receiptReads: [],
      indexPages: [],
      indexRequests: [],
      ethOnly: false,
      ethCursor: 53_246_346,
      activityBatches: 0,
      clients: 0,
      safeOnSecondOnly: false,
    });
    state.receipts.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as { method: string; params: Record<string, unknown> };
        if (Array.isArray(body)) {
          // The balance and nonce reads at old blocks: the node no longer has that state.
          state.activityBatches++;
          return Response.json(
            body.map((call: { id: number }) => ({
              id: call.id,
              error: { message: "Requested resource not available." },
            })),
          );
        }
        state.indexRequests.push({ url: _url, method: body.method, ...body.params });
        const page = state.indexPages.shift();
        return page === undefined ? new Response("down", { status: 503 }) : Response.json(page);
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("finds the deposit through the index, records what the receipt says, and moves the cursor", async () => {
    // The index understates the amount; the receipt is what counts.
    const row = { ...deposit(1, 5_000_000n), value: "4" };
    const dust = deposit(2, 100n, 55_000_005);
    state.indexPages.push({ result: { transfers: [row, dust] } });
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    const result = await runDepositWatcher(8453);
    expect(result).toMatchObject({
      ok: true,
      usdcVia: "index",
      usdcError: null,
      usdcIndexError: null,
      observed: 1,
    });
    expect(state.indexRequests).toHaveLength(1);
    expect(state.indexRequests[0]).toMatchObject({
      url: "https://rpc.ankr.com/multichain/KEY",
      method: "ankr_getTokenTransfers",
      blockchain: ["base"],
      address: [TREASURY],
      fromBlock: Number(CURSOR - USDC_INDEX_RECHECK_BLOCKS + 1n),
      toBlock: Number(LATEST - USDC_INDEX_SETTLE_BLOCKS),
    });
    // Dust by the index's amount is not read; the deposit's receipt is read once.
    expect(state.receiptReads).toEqual([hash(1)]);
    expect(calls("crypto_observe_deposit").map((c) => c[1])).toEqual([
      {
        p_chain: 8453,
        p_asset: "USDC",
        p_tx: hash(1),
        p_log: 3,
        p_block: 55_000_000,
        p_from: "0x6ebCA496AC079632Ad711646DCe4C806Ee9bBD0d",
        p_to: "0x9EAff85db9A2559eC958740A6a3b523751237987",
        p_units: "5000000",
      },
    ]);
    expect(state.cursor).toBe(Number(LATEST - USDC_INDEX_SETTLE_BLOCKS));
    // No log scan, and nothing was skipped.
    expect(state.logCalls).toBe(0);
    expect(
      calls("crypto_raise_incident").filter((c) => c[1]["p_check"] === "crypto_scan_gap"),
    ).toEqual([]);
  });

  it("does not read a transaction that is already recorded", async () => {
    state.indexPages.push({ result: { transfers: [deposit(1, 5_000_000n)] } });
    state.recorded = [hash(1)];
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    const result = await runDepositWatcher(8453);
    expect(result).toMatchObject({ usdcVia: "index", observed: 0 });
    expect(state.receiptReads).toEqual([]);
    expect(calls("crypto_observe_deposit")).toEqual([]);
  });

  it("with the index failing, falls back to the log scan and neither moves nor skips", async () => {
    state.indexPages.push({ result: {} });
    state.logsError = "Requested resource not available.";
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    const result = await runDepositWatcher(8453);
    expect(result).toMatchObject({ usdcVia: "logs", usdcIndexError: "INDEX_SHAPE" });
    expect((result as { usdcError: string }).usdcError).toContain(
      "Requested resource not available",
    );
    expect(state.cursor).toBe(Number(CURSOR));
    expect(calls("crypto_set_cursor")).toEqual([]);
    expect(
      calls("crypto_raise_incident").filter((c) => c[1]["p_check"] === "crypto_scan_gap"),
    ).toEqual([]);
  });

  it("without an index, records the unreadable range and resumes near the head", async () => {
    state.rpcUrl = "https://base.first-provider.example/KEY";
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

  it("native ETH: a node that refuses old state no longer stops the index scan", async () => {
    state.ethOnly = true;
    const from = 53_246_347;
    state.indexPages.push({
      result: {
        transactions: [
          {
            hash: hash(9),
            from: PLAYER,
            to: TREASURY,
            blockNumber: "0x" + (from + 10).toString(16),
            value: "0x" + (10n ** 15n).toString(16),
          },
        ],
        syncStatus: { blockNumber: 55_828_000 },
      },
    });
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    const result = await runDepositWatcher(8453);
    expect(result).toMatchObject({ ok: true, observed: 1 });
    // Both providers were asked for the old state and refused; the index was asked anyway.
    expect(state.activityBatches).toBe(2);
    expect(state.indexRequests).toHaveLength(1);
    expect(state.indexRequests[0]).toMatchObject({
      method: "ankr_getTransactionsByAddress",
      address: TREASURY,
      fromBlock: from,
      toBlock: from + 50_000 - 1,
    });
    expect(calls("crypto_observe_deposit").map((c) => c[1])).toMatchObject([
      { p_asset: "ETH", p_tx: hash(9), p_block: from + 10, p_units: (10n ** 15n).toString() },
    ]);
    // 50,000 blocks a run: the backlog is read, not skipped.
    expect(state.ethCursor).toBe(from + 50_000 - 1);
    expect(
      calls("crypto_raise_incident").filter((c) => c[1]["p_check"] === "crypto_scan_gap"),
    ).toEqual([]);
  });

  it("takes the safe head from the second provider when the first does not serve it", async () => {
    state.indexPages.push({ result: { transfers: [] } });
    state.safeOnSecondOnly = true;
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    expect(await runDepositWatcher(8453)).toMatchObject({ ok: true, safe: Number(LATEST - 20n) });
  });
});
