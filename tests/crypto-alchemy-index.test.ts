import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALCHEMY_ETH_RECHECK_BLOCKS,
  ALCHEMY_SETTLE_BLOCKS,
  alchemyEthWindow,
  alchemyIndexFromUrls,
  alchemyNativeTransfers,
  alchemyTransfersBody,
  alchemyUsdcCandidates,
} from "../src/lib/crypto/alchemy-index";
import { USDC_INDEX_RECHECK_BLOCKS, USDC_INDEX_SETTLE_BLOCKS } from "../src/lib/crypto/usdc-index";

/**
 * Base deposits through Alchemy's transfer index. The rows are what the index answered for
 * the production treasury on 2026-11-10: the 24 USDC deposit the frozen scanner missed
 * (block 54,787,241) and the look-alike token an address-poisoning sender followed it with.
 */
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const TREASURY = "0x9eaff85db9a2559ec958740a6a3b523751237987";
const PLAYER = "0x4e208183f6789ff01d8b7052903c9c1a7e231be1";
const DEPOSIT_TX = "0x3acef1d911b8dec2d18c3b52b2e5e30005d191c7e7cae2b6aeebaab017d7b403";
const TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const CURSOR = 53_246_268n;
const ETH_CURSOR = 53_246_346n;
const LATEST = 55_840_830n;
const real = {
  blockNum: "0x343fca9",
  uniqueId: `${DEPOSIT_TX}:log:0`,
  hash: DEPOSIT_TX,
  from: PLAYER,
  to: TREASURY,
  value: 24.0,
  asset: "USDC",
  category: "erc20",
  rawContract: { value: "0x16e3600", address: USDC, decimal: "0x6" },
};
const lookAlike = {
  blockNum: "0x3440900",
  hash: "0xe9788ddbfa57b9626ffc34dbc9c5014e77967580a4002f9dd761fd2128c93075",
  from: "0x4e20a2b4e2fefdb3cdf9756281b8f41d33231be1",
  to: TREASURY,
  value: 24.0,
  asset: "USDC",
  category: "erc20",
  rawContract: {
    value: "0x16e3600",
    address: "0x08779bf351caf71506db682a4a2bb22d4b4ab05b",
    decimal: "0x6",
  },
};
const targets = new Set([TREASURY]);

describe("alchemy index: reading a page", () => {
  it("is found by the endpoint's host, for this chain only", () => {
    const url = "https://base-mainnet.g.alchemy.com/v2/KEY";
    expect(alchemyIndexFromUrls([undefined, "https://rpc.ankr.com/base/K", url], 8453)).toBe(url);
    expect(alchemyIndexFromUrls([url], 1)).toBeNull();
    expect(alchemyIndexFromUrls(["https://eth-mainnet.g.alchemy.com/v2/KEY"], 8453)).toBeNull();
    expect(alchemyIndexFromUrls(["http://base-mainnet.g.alchemy.com/v2/KEY"], 8453)).toBeNull();
    expect(alchemyIndexFromUrls(["https://base-mainnet.g.alchemy.com/v2/"], 8453)).toBeNull();
  });

  it("asks for USDC by contract, and for top-level ETH", () => {
    const usdc = JSON.parse(alchemyTransfersBody(TREASURY, 10n, 255n, { usdc: USDC }, "next"));
    expect(usdc.method).toBe("alchemy_getAssetTransfers");
    expect(usdc.params).toEqual([
      {
        fromBlock: "0xa",
        toBlock: "0xff",
        toAddress: TREASURY,
        category: ["erc20"],
        contractAddresses: [USDC],
        excludeZeroValue: true,
        withMetadata: false,
        order: "asc",
        maxCount: "0x3e8",
        pageKey: "next",
      },
    ]);
    const eth = JSON.parse(alchemyTransfersBody(TREASURY, 10n, 255n, "native"));
    expect(eth.params[0].category).toEqual(["external"]);
    expect(eth.params[0].contractAddresses).toBeUndefined();
  });

  it("names the real deposit and passes over the look-alike token", () => {
    const page = { result: { transfers: [real, lookAlike] } };
    expect(alchemyUsdcCandidates(page, USDC, targets, 0n, LATEST)).toEqual([
      { hash: DEPOSIT_TX, block: 54_787_241n, units: 24_000_000n },
    ]);
    expect(alchemyUsdcCandidates(page, USDC, targets, 54_787_242n, LATEST)).toEqual([]);
  });

  it("treats a page that is not a transfer list, or a row it cannot place, as an error", () => {
    expect(() => alchemyUsdcCandidates({ result: {} }, USDC, targets, 0n, LATEST)).toThrow(
      "INDEX_SHAPE",
    );
    const noBlock = { ...real, blockNum: undefined };
    expect(() =>
      alchemyUsdcCandidates({ result: { transfers: [noBlock] } }, USDC, targets, 0n, LATEST),
    ).toThrow("INDEX_SHAPE");
  });

  it("reads top-level ETH sent to the address", () => {
    const eth = {
      blockNum: "0x3440000",
      hash: "0x" + "ab".repeat(32),
      from: PLAYER,
      to: TREASURY,
      category: "external",
      rawContract: { value: "0x2386f26fc10000", address: null },
    };
    const other = { ...eth, to: PLAYER };
    expect(
      alchemyNativeTransfers({ result: { transfers: [eth, other, real] } }, TREASURY, 0n, LATEST),
    ).toEqual([
      {
        hash: eth.hash,
        from: PLAYER,
        to: TREASURY,
        blockNumber: 54_788_096n,
        value: 10_000_000_000_000_000n,
      },
    ]);
    const unreadable = { ...eth, rawContract: { value: null } };
    expect(() =>
      alchemyNativeTransfers({ result: { transfers: [unreadable] } }, TREASURY, 0n, LATEST),
    ).toThrow("INDEX_SHAPE");
  });

  it("looks again behind the ETH cursor and stays short of the head", () => {
    expect(alchemyEthWindow(ETH_CURSOR, LATEST)).toEqual({
      from: ETH_CURSOR - ALCHEMY_ETH_RECHECK_BLOCKS + 1n,
      to: LATEST - ALCHEMY_SETTLE_BLOCKS,
    });
    expect(alchemyEthWindow(LATEST - 50n, LATEST)).toBeNull();
  });
});

// ---------------------------------------------------------------- the watcher around it
const ALCHEMY = "https://base-mainnet.g.alchemy.com/v2/KEY";
const state = {
  cursor: Number(CURSOR),
  ethCursor: Number(ETH_CURSOR),
  rpcCalls: [] as Array<[string, Record<string, unknown>]>,
  requests: [] as Array<{ url: string; method: string; params: Record<string, unknown> }>,
  receiptReads: [] as string[],
  logCalls: 0,
  alchemyStatus: 200,
  eth: [] as unknown[],
};
vi.mock("@/lib/worker-env", () => ({
  applyWorkerEnv: () => {},
  workerEnv: (key: string) =>
    key === "CRYPTO_RPC_URL_8453"
      ? "https://rpc.ankr.com/base/KEY"
      : key === "CRYPTO_RPC_URL_8453_B"
        ? "https://base.second-provider.example/KEY"
        : key === "CRYPTO_ALCHEMY_URL_8453"
          ? ALCHEMY
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
        is_enabled: true,
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
  createPublicClient: () => ({
    getChainId: async () => 8453,
    getCode: async () => "0x60",
    getBlockNumber: async () => LATEST,
    getBlock: async () => ({ number: LATEST - 20n, transactions: [] }),
    getLogs: async () => {
      state.logCalls++;
      throw new Error("Requested resource not available.");
    },
    getTransactionReceipt: async ({ hash }: { hash: string }) => {
      state.receiptReads.push(hash);
      if (hash !== DEPOSIT_TX) throw new Error("not found");
      return {
        status: "success",
        transactionHash: DEPOSIT_TX,
        blockNumber: 54_787_241n,
        logs: [
          {
            address: USDC,
            topics: [
              TRANSFER,
              "0x" + "0".repeat(24) + PLAYER.slice(2),
              "0x" + "0".repeat(24) + TREASURY.slice(2),
            ],
            data: "0x" + (24_000_000).toString(16).padStart(64, "0"),
            logIndex: 0,
          },
        ],
      };
    },
  }),
}));
const calls = (name: string) => state.rpcCalls.filter((c) => c[0] === name);
const gaps = () =>
  calls("crypto_raise_incident").filter((c) => c[1]["p_check"] === "crypto_scan_gap");

describe("deposit watcher with the Alchemy index and Ankr's index refused", () => {
  beforeEach(() => {
    Object.assign(state, {
      cursor: Number(CURSOR),
      ethCursor: Number(ETH_CURSOR),
      rpcCalls: [],
      requests: [],
      receiptReads: [],
      logCalls: 0,
      alchemyStatus: 200,
      eth: [],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: { body: string }) => {
        const body = JSON.parse(init.body);
        if (Array.isArray(body))
          return Response.json(
            body.map((c: { id: number }) => ({ id: c.id, error: { message: "unavailable" } })),
          );
        const params = Array.isArray(body.params) ? body.params[0] : body.params;
        state.requests.push({ url, method: body.method, params });
        // What Ankr answers for this key on 2026-11-10.
        if (url !== ALCHEMY) return new Response("not allowed", { status: 403 });
        if (state.alchemyStatus !== 200) return new Response("", { status: state.alchemyStatus });
        const transfers = params.category[0] === "erc20" ? [real, lookAlike] : state.eth;
        return Response.json({ result: { transfers } });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("records the missed 24 USDC from its receipt and moves both cursors", async () => {
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    const result = await runDepositWatcher(8453);
    expect(result).toMatchObject({
      ok: true,
      usdcVia: "index",
      usdcError: null,
      usdcIndexError: null,
      observed: 1,
    });
    const usdc = state.requests.filter((r) => r.params["category"]?.toString() === "erc20");
    expect(usdc).toHaveLength(1);
    expect(usdc[0]).toMatchObject({
      url: ALCHEMY,
      method: "alchemy_getAssetTransfers",
      params: {
        fromBlock: "0x" + (CURSOR - USDC_INDEX_RECHECK_BLOCKS + 1n).toString(16),
        toBlock: "0x" + (LATEST - USDC_INDEX_SETTLE_BLOCKS).toString(16),
        toAddress: TREASURY,
        contractAddresses: [USDC],
      },
    });
    // Only the real USDC transaction is read; the look-alike token never is.
    expect(state.receiptReads).toEqual([DEPOSIT_TX]);
    expect(calls("crypto_observe_deposit").map((c) => c[1])).toEqual([
      {
        p_chain: 8453,
        p_asset: "USDC",
        p_tx: DEPOSIT_TX,
        p_log: 0,
        p_block: 54_787_241,
        p_from: "0x4E208183f6789ff01D8b7052903C9C1A7E231Be1",
        p_to: "0x9EAff85db9A2559eC958740A6a3b523751237987",
        p_units: "24000000",
      },
    ]);
    expect(state.cursor).toBe(Number(LATEST - USDC_INDEX_SETTLE_BLOCKS));
    expect(state.ethCursor).toBe(Number(LATEST - ALCHEMY_SETTLE_BLOCKS));
    // Ankr's refused index is not asked, no log scan runs, and no range is skipped.
    expect(state.requests.every((r) => r.url === ALCHEMY)).toBe(true);
    expect(state.logCalls).toBe(0);
    expect(gaps()).toEqual([]);
  });

  it("records top-level ETH sent to the treasury", async () => {
    state.eth = [
      {
        blockNum: "0x3440000",
        hash: "0x" + "ab".repeat(32),
        from: PLAYER,
        to: TREASURY,
        category: "external",
        rawContract: { value: "0x2386f26fc10000", address: null },
      },
    ];
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    await runDepositWatcher(8453);
    const eth = calls("crypto_observe_deposit").filter((c) => c[1]["p_asset"] === "ETH");
    expect(eth).toHaveLength(1);
    expect(eth[0]![1]).toMatchObject({
      p_tx: "0x" + "ab".repeat(32),
      p_block: 54_788_096,
      p_units: "10000000000000000",
    });
  });

  it("with both indexes failing, reports it and neither moves nor skips the USDC cursor", async () => {
    state.alchemyStatus = 429;
    const { runDepositWatcher } = await import("../src/lib/crypto/chain.server");
    const result = await runDepositWatcher(8453);
    expect(result).toMatchObject({ usdcVia: "logs", usdcIndexError: "INDEX_HTTP" });
    expect(state.cursor).toBe(Number(CURSOR));
    expect(gaps()).toEqual([]);
  });
});
