import { describe, expect, it } from "vitest";
import {
  ankrNativeTransfers,
  callTracerDeposits,
  traceFilterDeposits,
} from "../src/lib/crypto/ankr-index";
import { internalSearchFloor, settleInternalTransfers } from "../src/lib/crypto/transfer-match";

const deposit = "0x989642fd0d3e78296081a9417fac253460f2a0c0";
const other = "0x1111111111111111111111111111111111111111";
const exchange = "0xbf2f1213f47e76f1c1d9b7a536f2cb8b347d59b4";
const parent = "0x" + "ab".repeat(32);
const block = 52_705_282n;
const payout = 3_138_330_000_000_000n;

/** Representative exchange payout: parent value is zero, ETH moves in a child call. */
const traces = [
  {
    transactionHash: parent,
    blockNumber: "0x" + block.toString(16),
    traceAddress: [0],
    type: "call",
    action: { from: "0x" + "22".repeat(20), to: exchange, value: "0x0", callType: "call" },
  },
  {
    transactionHash: parent,
    blockNumber: "0x" + block.toString(16),
    traceAddress: [0, 1],
    type: "call",
    action: {
      from: exchange,
      to: deposit,
      value: "0x" + payout.toString(16),
      callType: "call",
    },
  },
  {
    transactionHash: parent,
    blockNumber: "0x" + block.toString(16),
    traceAddress: [0, 2],
    type: "call",
    action: {
      from: exchange,
      to: other,
      value: "0x" + (10n ** 15n).toString(16),
      callType: "call",
    },
  },
  {
    transactionHash: parent,
    blockNumber: "0x" + block.toString(16),
    traceAddress: [0, 3],
    error: "Reverted",
    type: "call",
    action: {
      from: exchange,
      to: deposit,
      value: "0x" + payout.toString(16),
      callType: "call",
    },
  },
];

const callTree = {
  from: "0x" + "22".repeat(20),
  to: exchange,
  value: "0x0",
  type: "CALL",
  calls: [
    {
      from: exchange,
      to: deposit,
      value: "0x" + payout.toString(16),
      type: "CALL",
    },
    {
      from: exchange,
      to: other,
      value: "0x" + (10n ** 15n).toString(16),
      type: "CALL",
    },
    {
      from: exchange,
      to: deposit,
      value: "0x" + payout.toString(16),
      type: "CALL",
      error: "execution reverted",
    },
  ],
};

describe("zero-value parent with an internal ETH payout", () => {
  const found = traceFilterDeposits(traces, deposit, block);

  it("does not treat the parent as a direct deposit", () => {
    expect(
      ankrNativeTransfers(
        {
          result: {
            transactions: [
              {
                hash: parent,
                from: exchange,
                to: "0x" + "33".repeat(20),
                blockNumber: block.toString(),
                value: "0",
              },
            ],
          },
        },
        deposit,
        block,
        block,
      ),
    ).toEqual([]);
  });

  it("records only the successful internal transfer to the deposit address", () => {
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ hash: parent, to: deposit, value: payout, blockNumber: block });
    expect(traceFilterDeposits(traces, other, block)).toHaveLength(1);
    expect(traceFilterDeposits(traces, other, block)[0]?.to.toLowerCase()).toBe(other);
  });

  it("credits once when both providers return the same trace", () => {
    const once = settleInternalTransfers([found, found]);
    const twice = settleInternalTransfers([found, found]);
    expect(once.status).toBe("recorded");
    expect(once.transfers).toHaveLength(1);
    expect(twice.transfers.map((t) => t.logIndex)).toEqual(once.transfers.map((t) => t.logIndex));
  });

  it("accepts one trace when the other provider cannot trace", () => {
    const settled = settleInternalTransfers([found, null]);
    expect(settled.status).toBe("recorded");
    expect(settled.transfers[0]?.value).toBe(payout);
  });

  it("stays open and records nothing when tracing is unsupported", () => {
    const settled = settleInternalTransfers([null, null]);
    expect(settled).toEqual({ transfers: [], status: "open" });
    expect(internalSearchFloor(block)).toBe(0n);
    expect(internalSearchFloor(block + 10_000_000n)).toBe(0n);
  });

  it("does not record a transfer the providers disagree about", () => {
    expect(settleInternalTransfers([found, []]).status).toBe("none");
    expect(settleInternalTransfers([found, []]).transfers).toEqual([]);
  });

  it("reads the same payout from a call tracer when trace_filter is unavailable", () => {
    const traced = callTracerDeposits(callTree, deposit, block, parent);
    expect(traced).toHaveLength(1);
    expect(traced[0]?.value).toBe(payout);
    expect(settleInternalTransfers([null, traced]).status).toBe("recorded");
  });
});
