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
