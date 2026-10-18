/** Ankr's address-history index (`ankr_getTransactionsByAddress`), used to find native ETH deposits. */

/** Ankr rejects JSON-RPC batches above 100 calls (HTTP 413). */
export const ANKR_MAX_BATCH = 100;
/** The index allows only a handful of calls per 10 seconds on the current plan. */
export const ANKR_MAX_INDEX_CALLS = 6;
/** Scan native ETH at most every ~3 minutes; the request budget is shared with the USDC scan. */
export const ANKR_MIN_SCAN_BLOCKS = 90n;

const ANKR_CHAINS: Record<number, string> = { 8453: "base" };

/** The index lives on Ankr's multichain endpoint, under the same key as the chain RPC URL. */
export function ankrIndexUrl(rpcUrl: string, chainId: number): string | null {
  const chain = ANKR_CHAINS[chainId];
  if (!chain) return null;
  try {
    const u = new URL(rpcUrl);
    if (u.protocol !== "https:" || u.hostname !== "rpc.ankr.com") return null;
    const [path, key] = u.pathname.split("/").filter(Boolean);
    return path === chain && key ? `https://rpc.ankr.com/multichain/${key}` : null;
  } catch {
    return null;
  }
}

export const ankrChainName = (chainId: number): string | null => ANKR_CHAINS[chainId] ?? null;

/** Ankr advanced API, whether it is the primary RPC or the Chainstack pair. */
export function ankrIndexFromRpcUrls(
  urls: Array<string | undefined>,
  chainId: number,
): string | null {
  for (const url of urls) {
    if (!url) continue;
    const index = ankrIndexUrl(url, chainId);
    if (index) return index;
  }
  return null;
}

/** Top-level native transfer log index. Internal transfers use 1_000_001 and up. */
export const ETH_EXTERNAL_LOG_INDEX = 1_000_000;

export function parseAnkrWei(value: string | number | undefined | null): bigint | null {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export type AnkrTxPage = {
  error?: { message?: string };
  result?: {
    transactions?: Array<{
      hash?: string;
      from?: string;
      to?: string | null;
      blockNumber?: string;
      value?: string;
    }>;
    nextPageToken?: string;
    syncStatus?: { blockNumber?: number | string };
  };
};

export type NativeTransfer = { hash: string; from: string; to: string; blockNumber: bigint; value: bigint };

/** Positive-value transactions sent to `target` within [from, to]; skips malformed rows. */
export function ankrNativeTransfers(
  page: AnkrTxPage,
  target: string,
  from: bigint,
  to: bigint,
): NativeTransfer[] {
  const want = target.toLowerCase();
  const out: NativeTransfer[] = [];
  for (const t of page.result?.transactions ?? []) {
    if (!t.hash || !t.from || !t.to || !t.blockNumber || !t.value) continue;
    if (t.to.toLowerCase() !== want) continue;
    let blockNumber: bigint;
    let value: bigint;
    try {
      blockNumber = BigInt(t.blockNumber);
      value = BigInt(t.value);
    } catch {
      continue;
    }
    if (value <= 0n || blockNumber < from || blockNumber > to) continue;
    out.push({ hash: t.hash, from: t.from, to: t.to, blockNumber, value });
  }
  return out;
}

type RpcCall = { jsonrpc: "2.0"; id: number; method: string; params: unknown[] };
export type RpcReply = { id?: number; result?: unknown; error?: { message?: string } };

/**
 * Balance and nonce reads for each address at the block before the window and at its end.
 * An address with neither changed received no ETH in the window: an EOA's balance only rises
 * from incoming value and only falls by sending, which raises its nonce.
 */
export function activityCalls(targets: string[], before: bigint, end: bigint): RpcCall[] {
  const at = (b: bigint) => `0x${b.toString(16)}`;
  return targets.flatMap((t, i) => [
    { jsonrpc: "2.0", id: i * 4, method: "eth_getBalance", params: [t, at(before)] },
    { jsonrpc: "2.0", id: i * 4 + 1, method: "eth_getBalance", params: [t, at(end)] },
    { jsonrpc: "2.0", id: i * 4 + 2, method: "eth_getTransactionCount", params: [t, at(before)] },
    { jsonrpc: "2.0", id: i * 4 + 3, method: "eth_getTransactionCount", params: [t, at(end)] },
  ]);
}

/** Addresses whose balance or nonce changed. Throws on any error or missing reply, never guessing "no activity". */
export function activeTargets(targets: string[], replies: RpcReply[]): string[] {
  const byId = new Map<number, RpcReply>();
  for (const r of replies) if (typeof r.id === "number") byId.set(r.id, r);
  return targets.filter((_, i) => {
    const values = [0, 1, 2, 3].map((k) => {
      const r = byId.get(i * 4 + k);
      if (!r || r.error || typeof r.result !== "string" || !/^0x[0-9a-f]+$/i.test(r.result))
        throw new Error("ACTIVITY_READ");
      return BigInt(r.result);
    });
    return values[0] !== values[1] || values[2] !== values[3];
  });
}

export type AnkrInternalTx = {
  transactionHash?: string;
  fromAddress?: string;
  toAddress?: string | null;
  value?: string | number | null;
  blockHeight?: number | string | null;
  error?: string | null;
  callType?: string | null;
  callPath?: string | null;
  callStack?: number[] | null;
  transactionIndex?: number | null;
};

export type AnkrInternalPage = {
  error?: { message?: string };
  result?: {
    internalTransactions?: AnkrInternalTx[] | null;
    nextPageToken?: string;
  };
};

const INTERNAL_CALLS_WITHOUT_VALUE = new Set(["delegatecall", "staticcall", "invalid"]);

/** Stable id so the same internal transfer is not credited twice if the page order changes. */
export function internalLogIndex(tx: AnkrInternalTx, fallback: number): number {
  const stacked = tx.callStack?.length ? tx.callStack[tx.callStack.length - 1] : null;
  const fromPath = tx.callPath?.match(/(\d+)\s*$/);
  const n =
    stacked != null && Number.isInteger(stacked) && stacked >= 0
      ? stacked
      : fromPath
        ? Number(fromPath[1])
        : (tx.transactionIndex ?? 0) * 1_000 + fallback;
  const slot = Number.isInteger(n) && n >= 0 ? n % 1_000_000 : fallback % 1_000_000;
  return ETH_EXTERNAL_LOG_INDEX + 1 + slot;
}

/**
 * ETH that arrived inside a contract call (Coinbase and other exchanges do this).
 * The parent transaction's own value is often zero, so it is not a top-level deposit.
 */
export function ankrInternalDeposits(
  page: AnkrInternalPage,
  target: string,
  from: bigint,
  to: bigint,
): Array<NativeTransfer & { logIndex: number }> {
  const want = target.toLowerCase();
  const rows = (page.result?.internalTransactions ?? [])
    .map((tx, i) => ({ tx, i }))
    .filter(({ tx }) => {
      if (!tx.transactionHash || !tx.fromAddress || !tx.toAddress) return false;
      if (tx.toAddress.toLowerCase() !== want) return false;
      if (tx.error && tx.error.trim()) return false;
      const kind = tx.callType?.toLowerCase();
      if (kind && INTERNAL_CALLS_WITHOUT_VALUE.has(kind)) return false;
      const value = parseAnkrWei(tx.value);
      if (value == null || value <= 0n) return false;
      if (tx.blockHeight == null || tx.blockHeight === "") return true;
      try {
        const block = BigInt(tx.blockHeight);
        return block >= from && block <= to;
      } catch {
        return false;
      }
    });
  return rows.map(({ tx, i }) => ({
    hash: tx.transactionHash!,
    from: tx.fromAddress!,
    to: tx.toAddress!,
    blockNumber: BigInt(tx.blockHeight ?? from),
    value: parseAnkrWei(tx.value)!,
    logIndex: internalLogIndex(tx, i),
  }));
}

/**
 * First block in (lo, hi] whose balance is above `threshold`.
 * "older" means the funds were already there at `lo`, so the window does not contain the transfer.
 */
export function firstBlockAbove(
  lo: bigint,
  hi: bigint,
  threshold: bigint,
  balance: (block: bigint) => bigint,
): bigint | "older" | null {
  if (hi < lo) return null;
  if (balance(hi) <= threshold) return null;
  if (balance(lo) > threshold) return "older";
  let left = lo;
  let right = hi;
  while (left + 1n < right) {
    const mid = left + (right - left) / 2n;
    if (balance(mid) > threshold) right = mid;
    else left = mid;
  }
  return right;
}

/** Highest block the index has processed, or null when the response does not say. */
export function ankrIndexedThrough(page: AnkrTxPage): bigint | null {
  const n = page.result?.syncStatus?.blockNumber;
  if (n == null || n === "") return null;
  try {
    const b = BigInt(n);
    return b > 0n ? b : null;
  } catch {
    return null;
  }
}
