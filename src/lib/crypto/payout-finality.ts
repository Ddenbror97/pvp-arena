/**
 * Withdrawal payout finality policy (pure, dependency-injected so it is tested
 * directly with mocked providers against the real ledger functions).
 *
 * CONFIRMED (settle) or RELEASED (refund) may happen ONLY when:
 *   1. the primary provider's receipt block is at or below the L1-safe head, AND
 *   2. two independent providers return the same receipt status, block number and
 *      block hash, and the canonical block at that height contains the tx.
 * Anything else keeps the hold in place and is re-evaluated on the next run.
 * Mainnet never falls back to a single provider.
 */
type Hex = `0x${string}`;
export interface ReceiptLike {
  status: "success" | "reverted";
  blockNumber: bigint;
  blockHash: Hex;
}
export interface BlockLike {
  hash: Hex | null;
  number: bigint | null;
  transactions: readonly unknown[];
}
export interface FinalityClient {
  getTransactionReceipt(a: { hash: Hex }): Promise<ReceiptLike>;
  getBlock(a: { blockNumber: bigint }): Promise<BlockLike>;
}
export type PayoutDecision =
  | { action: "no_receipt" }
  | { action: "wait_unsafe"; block: bigint }
  | { action: "wait_agreement"; block: bigint; outcome: "success" | "reverted" }
  | { action: "confirm"; block: bigint }
  | { action: "release"; block: bigint };

export async function decidePayout(
  p: { primary: FinalityClient; secondary: FinalityClient | null; networkMode: string },
  txHash: string,
  safe: bigint,
): Promise<PayoutDecision> {
  const hash = txHash as Hex;
  const receipt = await p.primary.getTransactionReceipt({ hash }).catch(() => null);
  if (!receipt) return { action: "no_receipt" };
  const outcome = receipt.status === "success" ? "success" : "reverted";
  const block = receipt.blockNumber;
  if (block > safe) return { action: "wait_unsafe", block };
  const agreed = await agree(p, hash, block, outcome);
  if (!agreed) return { action: "wait_agreement", block, outcome };
  return outcome === "success" ? { action: "confirm", block } : { action: "release", block };
}

async function agree(
  p: { primary: FinalityClient; secondary: FinalityClient | null; networkMode: string },
  hash: Hex,
  blockNumber: bigint,
  status: "success" | "reverted",
): Promise<boolean> {
  if (!p.secondary) return p.networkMode === "testnet"; // mainnet requires two providers
  const b = p.secondary;
  const [bA, bB, rA, rB] = await Promise.all([
    p.primary.getBlock({ blockNumber }).catch(() => null),
    b.getBlock({ blockNumber }).catch(() => null),
    p.primary.getTransactionReceipt({ hash }).catch(() => null),
    b.getTransactionReceipt({ hash }).catch(() => null),
  ]);
  if (!bA || !bB || !bA.hash || bA.hash !== bB.hash) return false;
  if (!bA.transactions.includes(hash)) return false;
  if (!rA || !rB || rA.status !== status || rB.status !== status) return false;
  if (rA.blockHash !== rB.blockHash || rA.blockHash !== bA.hash) return false;
  return rA.blockNumber === blockNumber && rB.blockNumber === blockNumber;
}

type Call = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
/** Applies a decision. Only "confirm"/"release" touch money; both DB functions are idempotent and mutually exclusive. */
export async function applyPayoutDecision(
  call: Call,
  withdrawalId: string,
  txHash: string,
  d: PayoutDecision,
): Promise<string> {
  switch (d.action) {
    case "confirm":
      await call("crypto_withdrawal_confirmed", { p_id: withdrawalId });
      return "confirmed";
    case "release":
      await call("crypto_withdrawal_failed", {
        p_id: withdrawalId,
        p_reason: "transaction reverted on-chain (safe, 2 providers)",
      });
      return "released";
    case "wait_agreement":
      await call("crypto_raise_incident", {
        p_check: "crypto_withdrawal_rpc_disagreement",
        p_fp: `crypto_withdrawal_rpc:${withdrawalId}`,
        p_details: {
          withdrawal: withdrawalId,
          tx: txHash,
          block: Number(d.block),
          outcome: d.outcome,
        },
      });
      return "awaiting_agreement";
    case "wait_unsafe":
      return "confirming";
    default:
      return "no_receipt";
  }
}
