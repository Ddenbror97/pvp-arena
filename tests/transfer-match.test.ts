import { describe, expect, it } from "vitest";
import {
  erc20LogMatches,
  internalTransferConfirmed,
  nativeTransferMatches,
  nativeTransfersAgree,
} from "../src/lib/crypto/transfer-match";

const dest = "0x989642fd0d3e78296081a9417fac253460f2a0c0";
const from = "0x3dd42e54a48c109643bbb8b230392a2c0abaa6aa";
const topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

describe("native ETH agreement", () => {
  const tx = { from, to: dest, value: 3138330000000000n };

  it("accepts a direct transfer from a contract or an EOA", () => {
    expect(nativeTransferMatches(tx, dest, tx.value)).toBe(true);
  });

  it("rejects a zero-value parent and a different recipient", () => {
    expect(nativeTransferMatches({ ...tx, value: 0n }, dest, tx.value)).toBe(false);
    expect(nativeTransferMatches({ ...tx, to: from }, dest, tx.value)).toBe(false);
  });

  it("requires both providers to report the same transfer", () => {
    expect(nativeTransfersAgree(tx, { ...tx }, dest, tx.value)).toBe(true);
    expect(nativeTransfersAgree(tx, { ...tx, value: 1n }, dest, tx.value)).toBe(false);
    expect(nativeTransfersAgree(tx, null, dest, tx.value)).toBe(false);
  });
});

describe("USDC logs", () => {
  const word = (addr: string) => "0x" + addr.slice(2).padStart(64, "0");
  const log = {
    address: usdc,
    topics: [topic, word(from), word(dest)],
    data: "0x" + (1_000_000n).toString(16),
  };

  it("matches the allowlisted token, recipient, and amount", () => {
    expect(
      erc20LogMatches(log, { token: usdc, from, to: dest, units: 1_000_000n, transferTopic: topic }),
    ).toBe(true);
  });

  it("ignores a different token in the same transaction", () => {
    expect(
      erc20LogMatches(
        { ...log, address: "0x" + "22".repeat(20) },
        { token: usdc, from, to: dest, units: 1_000_000n, transferTopic: topic },
      ),
    ).toBe(false);
  });
});

describe("internal transfer confirmation", () => {
  const hash = "0x" + "ab".repeat(32);
  const hit = { hash, to: dest, value: 3138330000000000n };

  it("accepts one explicit trace when the other provider cannot trace", () => {
    expect(internalTransferConfirmed([null, [hit]], hash, dest, hit.value)).toBe(true);
  });

  it("does not treat a missing trace, an empty trace, or a balance as the transfer", () => {
    expect(internalTransferConfirmed([null, null], hash, dest, hit.value)).toBe(false);
    expect(internalTransferConfirmed([[], [hit]], hash, dest, hit.value)).toBe(false);
    expect(internalTransferConfirmed([[{ ...hit, value: 1n }]], hash, dest, hit.value)).toBe(false);
  });

  it("rejects two providers that disagree and two identical values in one trace", () => {
    expect(internalTransferConfirmed([[hit], [{ ...hit, value: 2n }]], hash, dest, hit.value)).toBe(false);
    expect(internalTransferConfirmed([[hit, { ...hit }]], hash, dest, hit.value)).toBe(false);
  });
});
