/**
 * USDC deposits found through a transfer index (Alchemy's, alchemy-index.ts): the window a run
 * asks for and the reading of the receipts it names.
 *
 * The log scan (`eth_getLogs` in 5-block windows, one window a run) reads at most about 100
 * blocks a minute. Base now produces about 210, and a range the providers no longer serve
 * froze the cursor for good (2026-10-29 to 2026-11-10). The index answers "which transactions
 * moved USDC to the treasury between these blocks" in one request, whatever the block rate
 * and however old the range.
 *
 * The index only names transactions. What is recorded comes from the chain: each named
 * transaction's receipt is read over RPC and its Transfer logs are decoded here. A wrong or
 * incomplete index can therefore miss a deposit; it cannot invent one.
 */

/** Blocks behind the cursor that every run looks at again (an index that lags is caught up). */
export const USDC_INDEX_RECHECK_BLOCKS = 50_000n;
/** The cursor stays this far behind the head (the lag alarm starts at 500). */
export const USDC_INDEX_SETTLE_BLOCKS = 100n;
/** Receipts read in one run (each is one Worker subrequest, plus one to record). */
export const USDC_INDEX_MAX_RECEIPTS = 10;
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** The block range one run asks the index for, or null when there is nothing to ask. */
export function usdcIndexWindow(
  cursor: bigint,
  latest: bigint,
): { from: bigint; to: bigint } | null {
  const to = latest - USDC_INDEX_SETTLE_BLOCKS;
  const from = cursor >= USDC_INDEX_RECHECK_BLOCKS ? cursor - USDC_INDEX_RECHECK_BLOCKS + 1n : 0n;
  return to >= from && to >= 0n ? { from, to } : null;
}

export type UsdcCandidate = { hash: `0x${string}`; block: bigint; units: bigint | null };

export type ReceiptLog = {
  address: string;
  topics: readonly string[];
  data: string;
  logIndex: number | null;
  removed?: boolean;
};
export type UsdcTransferLog = {
  logIndex: number;
  from: `0x${string}`;
  to: `0x${string}`;
  units: bigint;
};

/** The USDC Transfer logs to one of `targets` in a receipt, decoded from the chain's own data. */
export function usdcTransfersInReceipt(
  logs: readonly ReceiptLog[],
  usdc: string,
  targets: ReadonlySet<string>,
): UsdcTransferLog[] {
  const token = usdc.toLowerCase();
  const out: UsdcTransferLog[] = [];
  for (const l of logs) {
    if (l.removed || l.logIndex == null || l.address.toLowerCase() !== token) continue;
    if (l.topics.length !== 3 || l.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
    const [, fromTopic, toTopic] = l.topics as [string, string, string];
    if (!/^0x0{24}[0-9a-fA-F]{40}$/.test(fromTopic) || !/^0x0{24}[0-9a-fA-F]{40}$/.test(toTopic))
      continue;
    const to = ("0x" + toTopic.slice(26)).toLowerCase() as `0x${string}`;
    if (!targets.has(to)) continue;
    if (!/^0x[0-9a-fA-F]{64}$/.test(l.data)) continue;
    const units = BigInt(l.data);
    if (units <= 0n) continue;
    out.push({
      logIndex: l.logIndex,
      from: ("0x" + fromTopic.slice(26)).toLowerCase() as `0x${string}`,
      to,
      units,
    });
  }
  return out;
}
