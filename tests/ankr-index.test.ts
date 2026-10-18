import { describe, expect, it } from "vitest";
import {
  ANKR_MAX_BATCH,
  activeTargets,
  activityCalls,
  ETH_EXTERNAL_LOG_INDEX,
  ankrIndexFromRpcUrls,
  ankrIndexUrl,
  ankrIndexedThrough,
  ankrInternalDeposits,
  ankrNativeTransfers,
  firstBlockAbove,
  callTracerDeposits,
  traceFilterDeposits,
  internalLogIndex,
  type AnkrTxPage,
  type RpcReply,
} from "../src/lib/crypto/ankr-index";

const deposit = "0xe0a1403a2e32c5d52d1620ccce8a5867367ef8fa";
const page = (transactions: NonNullable<AnkrTxPage["result"]>["transactions"], synced = 52650483): AnkrTxPage => ({
  result: { transactions, syncStatus: { blockNumber: synced } },
});
const tx = (o: Partial<{ hash: string; from: string; to: string | null; blockNumber: string; value: string }>) => ({
  hash: "0xe8ddb9a5d58e894677cae3f3ca2a629e47c230c52df20878a50ecf3dbf4601fc",
  from: "0x6ebCA496AC079632Ad711646DCe4C806Ee9bBD0d",
  to: deposit,
  blockNumber: "0x" + (52650029).toString(16),
  value: "0x22e9592cb1652",
  ...o,
});

describe("ankr index url", () => {
  it("uses the multichain endpoint with the Base RPC key", () => {
    expect(ankrIndexUrl("https://rpc.ankr.com/base/abc123", 8453)).toBe(
      "https://rpc.ankr.com/multichain/abc123",
    );
  });
  it("uses Ankr when Chainstack is the other RPC", () => {
    expect(
      ankrIndexFromRpcUrls(
        [
          "https://base-mainnet.core.chainstack.com/abc",
          "https://rpc.ankr.com/base/abc123",
        ],
        8453,
      ),
    ).toBe("https://rpc.ankr.com/multichain/abc123");
    expect(ankrIndexFromRpcUrls(["https://base-mainnet.core.chainstack.com/abc"], 8453)).toBeNull();
  });
  it("is off for other providers, chains, paths and plain http", () => {
    expect(ankrIndexUrl("https://base-mainnet.core.chainstack.com/abc", 8453)).toBeNull();
    expect(ankrIndexUrl("https://rpc.ankr.com/base/abc123", 84532)).toBeNull();
    expect(ankrIndexUrl("https://rpc.ankr.com/eth/abc123", 8453)).toBeNull();
    expect(ankrIndexUrl("https://rpc.ankr.com/base", 8453)).toBeNull();
    expect(ankrIndexUrl("http://rpc.ankr.com/base/abc123", 8453)).toBeNull();
    expect(ankrIndexUrl("not a url", 8453)).toBeNull();
  });
});

describe("ankr native transfers", () => {
  const from = 52525240n;
  const to = 52650100n;

  it("returns a deposit to the address with exact block and value", () => {
    const [t, ...rest] = ankrNativeTransfers(page([tx({})]), deposit, from, to);
    expect(rest).toHaveLength(0);
    expect(t).toEqual({
      hash: "0xe8ddb9a5d58e894677cae3f3ca2a629e47c230c52df20878a50ecf3dbf4601fc",
      from: "0x6ebCA496AC079632Ad711646DCe4C806Ee9bBD0d",
      to: deposit,
      blockNumber: 52650029n,
      value: 614169901209170n,
    });
  });
  it("matches the address case-insensitively", () => {
    expect(ankrNativeTransfers(page([tx({ to: deposit.toUpperCase().replace("0X", "0x") })]), deposit, from, to)).toHaveLength(1);
  });
  it("skips sends from the address, zero value, out-of-range and malformed rows", () => {
    const rows = [
      tx({ from: deposit, to: "0x9eaff85db9a2559ec958740a6a3b523751237987" }),
      tx({ value: "0x0" }),
      tx({ blockNumber: "0x" + (52525239).toString(16) }),
      tx({ blockNumber: "0x" + (52650101).toString(16) }),
      tx({ to: null }),
      tx({ value: "not hex" }),
      { hash: "0x1" },
    ];
    expect(ankrNativeTransfers(page(rows), deposit, from, to)).toEqual([]);
  });
  it("handles an empty or error response", () => {
    expect(ankrNativeTransfers({ result: {} }, deposit, from, to)).toEqual([]);
    expect(ankrNativeTransfers({ error: { message: "x" } }, deposit, from, to)).toEqual([]);
  });
});

describe("native activity check", () => {
  const a = "0xaaaa000000000000000000000000000000000001";
  const b = "0xbbbb000000000000000000000000000000000002";
  const reply = (id: number, result: string): RpcReply => ({ id, result });
  // Per address: balance before, balance at end, nonce before, nonce at end.
  const replies = (rows: [string, string, string, string][]) =>
    rows.flatMap((r, i) => r.map((v, k) => reply(i * 4 + k, v)));

  it("reads balance and nonce at the block before the window and at its end", () => {
    expect(activityCalls([a], 99n, 200n)).toEqual([
      { jsonrpc: "2.0", id: 0, method: "eth_getBalance", params: [a, "0x63"] },
      { jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [a, "0xc8"] },
      { jsonrpc: "2.0", id: 2, method: "eth_getTransactionCount", params: [a, "0x63"] },
      { jsonrpc: "2.0", id: 3, method: "eth_getTransactionCount", params: [a, "0xc8"] },
    ]);
  });
  it("fits all 51 watched addresses in three batches", () => {
    expect(Math.ceil(activityCalls(Array(51).fill(a), 1n, 2n).length / ANKR_MAX_BATCH)).toBe(3);
  });
  it("flags an address whose balance rose", () => {
    const r = replies([
      ["0x0", "0x22e9592cb1652", "0x0", "0x0"],
      ["0x5", "0x5", "0x1", "0x1"],
    ]);
    expect(activeTargets([a, b], r)).toEqual([a]);
  });
  it("flags an address that sent, even if its balance is back where it was", () => {
    const r = replies([
      ["0x10", "0x10", "0x3", "0x4"],
      ["0x5", "0x5", "0x1", "0x1"],
    ]);
    expect(activeTargets([a, b], r)).toEqual([a]);
  });
  it("finds nothing when no address changed, with replies in any order", () => {
    const r = replies([
      ["0x10", "0x10", "0x3", "0x3"],
      ["0x0", "0x0", "0x0", "0x0"],
    ]).reverse();
    expect(activeTargets([a, b], r)).toEqual([]);
  });
  it("fails instead of reporting no activity when any read errored or is missing", () => {
    const ok = replies([["0x1", "0x1", "0x0", "0x0"]]);
    expect(() => activeTargets([a], ok.slice(0, 3))).toThrow("ACTIVITY_READ");
    expect(() =>
      activeTargets([a], [...ok.slice(0, 3), { id: 3, error: { message: "Too many requests" } }]),
    ).toThrow("ACTIVITY_READ");
    expect(() => activeTargets([a], [...ok.slice(0, 3), { id: 3, result: null }])).toThrow(
      "ACTIVITY_READ",
    );
    expect(() => activeTargets([a], [...ok.slice(0, 3), { id: 3, result: "12" }])).toThrow(
      "ACTIVITY_READ",
    );
  });
});

describe("internal ETH deposits", () => {
  const coinbase = {
    transactionHash: "0xd8e70b8f1d0c78cbc84e373fea87c4b4d3a7db920647adfdc30122e70a4e4167",
    fromAddress: "0xbf2f1213f47e76f1c1d9b7a536f2cb8b347d59b4",
    toAddress: deposit,
    value: "3138330000000000",
    blockHeight: 52705282,
    error: "",
    callType: "call",
    callStack: [4],
  };

  it("records a Coinbase-style internal payout and ignores the parent value", () => {
    const [t] = ankrInternalDeposits(
      { result: { internalTransactions: [coinbase, { ...coinbase, value: "0", callStack: [5] }] } },
      deposit,
      52705282n,
      52705282n,
    );
    expect(t).toMatchObject({
      hash: coinbase.transactionHash,
      to: deposit,
      value: 3138330000000000n,
      blockNumber: 52705282n,
      logIndex: ETH_EXTERNAL_LOG_INDEX + 1 + 4,
    });
    expect(internalLogIndex(coinbase, 0)).toBe(ETH_EXTERNAL_LOG_INDEX + 5);
    const nestedA = internalLogIndex({ callStack: [0, 1] }, 0);
    const nestedB = internalLogIndex({ callStack: [2, 1] }, 0);
    expect(nestedA).not.toBe(nestedB);
    expect(nestedA).not.toBe(internalLogIndex(coinbase, 0));
  });

  it("keeps every positive top-level transfer, including one sent by a contract", () => {
    const rows = ankrNativeTransfers(
      {
        result: {
          transactions: [
            { hash: "0xaaa", from: "0x" + "ab".repeat(20), to: deposit, blockNumber: "10", value: "100" },
            { hash: "0xbbb", from: "0x" + "cd".repeat(20), to: deposit, blockNumber: "11", value: "200" },
            { hash: "0xccc", from: "0x" + "11".repeat(20), to: deposit, blockNumber: "12", value: "0" },
          ],
        },
      },
      deposit,
      1n,
      20n,
    );
    expect(rows.map((r) => r.hash)).toEqual(["0xaaa", "0xbbb"]);
  });

  it("skips failed calls, other recipients, and calls that do not move ETH", () => {
    const rows = ankrInternalDeposits(
      {
        result: {
          internalTransactions: [
            { ...coinbase, error: "reverted" },
            { ...coinbase, toAddress: "0x9eaff85db9a2559ec958740a6a3b523751237987" },
            { ...coinbase, callType: "delegatecall", callStack: [9] },
            { ...coinbase, blockHeight: 1 },
          ],
        },
      },
      deposit,
      52705282n,
      52705282n,
    );
    expect(rows).toEqual([]);
  });
});

describe("chainstack trace_filter", () => {
  it("reads an internal call to the deposit address", () => {
    const [t] = traceFilterDeposits(
      [
        {
          transactionHash: "0xd8e70b8f1d0c78cbc84e373fea87c4b4d3a7db920647adfdc30122e70a4e4167",
          blockNumber: "0x" + (52705282).toString(16),
          traceAddress: [0, 1],
          type: "call",
          action: {
            from: "0xbf2f1213f47e76f1c1d9b7a536f2cb8b347d59b4",
            to: deposit,
            value: "0x" + (3138330000000000).toString(16),
            callType: "call",
          },
        },
      ],
      deposit,
      52705282n,
    );
    expect(t?.value).toBe(3138330000000000n);
    expect(t?.logIndex).toBe(ETH_EXTERNAL_LOG_INDEX + 1 + 133);
  });
});

describe("call tracer", () => {
  it("reads a nested call that pays the deposit address", () => {
    const [t] = callTracerDeposits(
      {
        from: "0x1a1da075",
        to: "0xbf2f1213f47e76f1c1d9b7a536f2cb8b347d59b4",
        value: "0x0",
        calls: [
          {
            from: "0xbf2f1213f47e76f1c1d9b7a536f2cb8b347d59b4",
            to: deposit,
            value: "0x" + (3138330000000000).toString(16),
            type: "CALL",
          },
        ],
      },
      deposit,
      52705282n,
      "0xd8e70b8f1d0c78cbc84e373fea87c4b4d3a7db920647adfdc30122e70a4e4167",
    );
    expect(t?.value).toBe(3138330000000000n);
    expect(t?.to.toLowerCase()).toBe(deposit);
  });
});

describe("balance jump search", () => {
  it("finds the block where the balance rose above what was already recorded", () => {
    const balances = new Map<bigint, bigint>([
      [10n, 0n],
      [11n, 0n],
      [12n, 5n],
      [13n, 5n],
      [14n, 5n],
    ]);
    const read = (block: bigint) => balances.get(block) ?? 0n;
    expect(firstBlockAbove(10n, 14n, 0n, read)).toBe(12n);
    expect(firstBlockAbove(10n, 14n, 5n, read)).toBeNull();
    expect(firstBlockAbove(12n, 14n, 0n, read)).toBe("older");
  });
});

describe("ankr indexed-through block", () => {
  it("reads the sync height", () => {
    expect(ankrIndexedThrough(page([], 52650483))).toBe(52650483n);
    expect(ankrIndexedThrough({ result: { syncStatus: { blockNumber: "52650483" } } })).toBe(52650483n);
  });
  it("is unknown when missing or invalid, so the cursor never advances on a guess", () => {
    expect(ankrIndexedThrough({ result: {} })).toBeNull();
    expect(ankrIndexedThrough({ result: { syncStatus: {} } })).toBeNull();
    expect(ankrIndexedThrough({ result: { syncStatus: { blockNumber: 0 } } })).toBeNull();
    expect(ankrIndexedThrough({ result: { syncStatus: { blockNumber: "abc" } } })).toBeNull();
  });
});
