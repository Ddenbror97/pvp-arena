/**
 * Deposits found through Alchemy's transfer index (`alchemy_getAssetTransfers`), which the
 * free plan serves for Base. One request answers "what was sent to this address between
 * these blocks", for USDC (category erc20, filtered to the USDC contract by Alchemy) and for
 * top-level native ETH (category external).
 *
 * A USDC row only names a transaction: the receipt read from the
 * chain is what gets recorded. A native row is recorded through the same check every native
 * deposit goes through. ETH that a contract forwards (an internal transfer) is not in this
 * index on Base.
 */
import type { UsdcCandidate } from "./usdc-index";

const ALCHEMY_HOSTS: Record<number, string> = { 8453: "base-mainnet.g.alchemy.com" };

/** A top-level native transfer's place among a transaction's logs in `crypto_deposits`. */
export const ETH_EXTERNAL_LOG_INDEX = 1_000_000;

export type ScanGap = { asset: "USDC" | "ETH"; from: bigint; to: bigint };
/**
 * The block range a `crypto_scan_gap` incident's details name, when it is this chain's and well
 * formed (the details are data written by an earlier run: nothing in them is trusted).
 */
export function scanGapOf(details: unknown, chainId: number): ScanGap | null {
  if (!details || typeof details !== "object") return null;
  const d = details as Record<string, unknown>;
  if (Number(d["chain_id"]) !== chainId) return null;
  if (d["asset"] !== "USDC" && d["asset"] !== "ETH") return null;
  const from = d["from"],
    to = d["to"];
  if (typeof from !== "number" || typeof to !== "number") return null;
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from)
    return null;
  return { asset: d["asset"], from: BigInt(from), to: BigInt(to) };
}

/** Addresses asked about in one run (one request each, per asset). */
export const ALCHEMY_MAX_TARGETS = 6;
/** Pages read for one address in one run. */
export const ALCHEMY_MAX_PAGES = 5;
export const ALCHEMY_PAGE_SIZE = 1000;
/** Native scan: blocks behind the cursor looked at again, and blocks kept behind the head. */
export const ALCHEMY_ETH_RECHECK_BLOCKS = 2_000n;
export const ALCHEMY_SETTLE_BLOCKS = 100n;

/** The URL itself when it is this chain's Alchemy endpoint with a key, else null. */
export function alchemyIndexUrl(url: string | undefined, chainId: number): string | null {
  const host = ALCHEMY_HOSTS[chainId];
  if (!host || !url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.hostname !== host) return null;
    const [version, key, ...rest] = u.pathname.split("/").filter(Boolean);
    return version === "v2" && key && rest.length === 0 ? u.toString() : null;
  } catch {
    return null;
  }
}

/** The first of the given URLs that is this chain's Alchemy endpoint. */
export function alchemyIndexFromUrls(
  urls: Array<string | undefined>,
  chainId: number,
): string | null {
  for (const url of urls) {
    const index = alchemyIndexUrl(url, chainId);
    if (index) return index;
  }
  return null;
}

export type AlchemyTransferPage = {
  error?: { message?: string };
  result?: {
    transfers?: Array<{
      blockNum?: string;
      hash?: string;
      from?: string;
      to?: string | null;
      category?: string;
      rawContract?: { value?: string | null; address?: string | null };
    }>;
    pageKey?: string;
  };
};

const hex = (n: bigint) => `0x${n.toString(16)}`;

/** The request body for one page of transfers to `target` within [from, to]. */
export function alchemyTransfersBody(
  target: string,
  from: bigint,
  to: bigint,
  asset: { usdc: string } | "native",
  pageKey?: string,
): string {
  const params: Record<string, unknown> = {
    fromBlock: hex(from),
    toBlock: hex(to),
    toAddress: target,
    category: [asset === "native" ? "external" : "erc20"],
    excludeZeroValue: true,
    withMetadata: false,
    order: "asc",
    maxCount: hex(BigInt(ALCHEMY_PAGE_SIZE)),
  };
  if (asset !== "native") params["contractAddresses"] = [asset.usdc];
  if (pageKey) params["pageKey"] = pageKey;
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getAssetTransfers",
    params: [params],
  });
}

type Row = NonNullable<NonNullable<AlchemyTransferPage["result"]>["transfers"]>[number];

function rows(page: AlchemyTransferPage): Row[] {
  const list = page.result?.transfers;
  if (!Array.isArray(list)) throw new Error("INDEX_SHAPE");
  return list;
}

/** A row's block and hash. A row sent to us that cannot be placed is an error, never skipped. */
function placed(t: Row): { block: bigint; hash: `0x${string}` } {
  if (typeof t.hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(t.hash))
    throw new Error("INDEX_SHAPE");
  if (typeof t.blockNum !== "string" || !/^0x[0-9a-fA-F]+$/.test(t.blockNum))
    throw new Error("INDEX_SHAPE");
  return { block: BigInt(t.blockNum), hash: t.hash.toLowerCase() as `0x${string}` };
}

const rawUnits = (t: Row): bigint | null => {
  const raw = t.rawContract?.value;
  return typeof raw === "string" && /^0x[0-9a-fA-F]+$/.test(raw) ? BigInt(raw) : null;
};

/**
 * Transactions the page names as USDC sent to one of `targets` within [from, to], one entry a
 * transaction. Rows for another token or address are passed over (a look-alike token must
 * never become a candidate). Throws when the page is not a transfer list.
 */
export function alchemyUsdcCandidates(
  page: AlchemyTransferPage,
  usdc: string,
  targets: ReadonlySet<string>,
  from: bigint,
  to: bigint,
): UsdcCandidate[] {
  const token = usdc.toLowerCase();
  const out = new Map<string, UsdcCandidate>();
  for (const t of rows(page)) {
    if (!t || typeof t !== "object") throw new Error("INDEX_SHAPE");
    if (t.category !== "erc20") continue;
    if (t.rawContract?.address?.toLowerCase() !== token) continue;
    if (typeof t.to !== "string" || !targets.has(t.to.toLowerCase())) continue;
    const { block, hash } = placed(t);
    if (block < from || block > to) continue;
    const units = rawUnits(t);
    const seen = out.get(hash);
    if (!seen) out.set(hash, { hash, block, units });
    else if (seen.units !== null)
      seen.units = units === null ? null : units > seen.units ? units : seen.units;
  }
  return [...out.values()];
}

export type AlchemyNativeTransfer = {
  hash: string;
  from: string;
  to: string;
  blockNumber: bigint;
  value: bigint;
};

/** Top-level ETH sent to `target` within [from, to]. Throws when the page is not a transfer list. */
export function alchemyNativeTransfers(
  page: AlchemyTransferPage,
  target: string,
  from: bigint,
  to: bigint,
): AlchemyNativeTransfer[] {
  const want = target.toLowerCase();
  const out: AlchemyNativeTransfer[] = [];
  for (const t of rows(page)) {
    if (!t || typeof t !== "object") throw new Error("INDEX_SHAPE");
    if (t.category !== "external") continue;
    if (typeof t.to !== "string" || t.to.toLowerCase() !== want) continue;
    const { block, hash } = placed(t);
    if (block < from || block > to) continue;
    // An amount that cannot be read is an error: it is a transfer to us.
    const value = rawUnits(t);
    if (value === null || typeof t.from !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(t.from))
      throw new Error("INDEX_SHAPE");
    if (value <= 0n) continue;
    out.push({ hash, from: t.from, to: t.to, blockNumber: block, value });
  }
  return out;
}

/** The block range one native run asks for, or null when there is nothing to ask. */
export function alchemyEthWindow(
  cursor: bigint,
  latest: bigint,
): { from: bigint; to: bigint } | null {
  const to = latest - ALCHEMY_SETTLE_BLOCKS;
  const from = cursor >= ALCHEMY_ETH_RECHECK_BLOCKS ? cursor - ALCHEMY_ETH_RECHECK_BLOCKS + 1n : 0n;
  return to > cursor && to >= from ? { from, to } : null;
}
