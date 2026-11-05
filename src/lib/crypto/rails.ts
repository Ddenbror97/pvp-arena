import { formatEthEquivalent } from "./eth-price";

/** localStorage keeps the asset key only. Amounts are never stored here. */
export const RAIL_STORAGE_KEY = "pvp-funding-rail";

const ASSET_KEY = /^[A-Z0-9]{2,12}$/;

export type FundingAsset = {
  asset_key: string;
  display_name: string;
  decimals: number;
  settlement_kind: "native" | "erc20";
  /** False when the server treasury cannot fund the network's minimum withdrawal in this asset right now. */
  payout_ready: boolean;
  /** Server snapshot. Null hides the estimate. */
  price_micro_usd: number | null;
};

export type FundingChain = {
  chain_id: number;
  name: string;
  network_mode: string;
  min_deposit_cents: number;
  min_withdrawal_cents: number;
  credit_confirmations: number;
  assets: FundingAsset[];
};

export type RailMovement = {
  id: string;
  chain_id: number | null;
  asset_key: string;
  units: string;
  usd_cents: number;
  status: string;
  at: string;
  decimals: number | null;
  tx_hash: string | null;
};

export function readStoredRail(
  storage: { getItem(key: string): string | null } | null,
): string | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(RAIL_STORAGE_KEY);
    if (!value || !ASSET_KEY.test(value)) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeStoredRail(
  storage: { setItem(key: string, value: string): void; removeItem(key: string): void } | null,
  assetKey: string | null,
): void {
  if (!storage) return;
  try {
    if (!assetKey || !ASSET_KEY.test(assetKey)) storage.removeItem(RAIL_STORAGE_KEY);
    else storage.setItem(RAIL_STORAGE_KEY, assetKey);
  } catch {
    // Preference is cosmetic. A blocked storage API leaves the session on USD.
  }
}

/** Keep a stored rail only while that asset is still enabled. */
export function resolveRail(stored: string | null, assetKeys: readonly string[]): string | null {
  if (!stored || !ASSET_KEY.test(stored)) return null;
  return assetKeys.includes(stored) ? stored : null;
}

/** Whole-token amount at a micro-USD price. Decimals 18 matches the ETH display helper. */
export function formatPricedEquivalent(
  cents: number,
  priceMicroUsd: number,
  decimals: number,
): string {
  if (!Number.isSafeInteger(cents) || cents <= 0) return "";
  if (!Number.isSafeInteger(priceMicroUsd) || priceMicroUsd <= 0) return "";
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) return "";
  if (decimals === 18) return formatEthEquivalent(cents, priceMicroUsd);
  const scale = 10n ** BigInt(decimals);
  const units = (BigInt(cents) * 10_000n * scale) / BigInt(priceMicroUsd);
  const whole = units / scale;
  const fracLen = Math.min(6, decimals);
  const frac = (units % scale)
    .toString()
    .padStart(decimals, "0")
    .slice(0, fracLen)
    .replace(/0+$/, "");
  return frac ? `${whole.toString()}.${frac}` : whole.toString();
}

/** Pegged rail expression of a USD-cent amount. It is not a second balance. */
export function railEquivalent(
  asset: Pick<FundingAsset, "asset_key" | "settlement_kind" | "decimals" | "price_micro_usd">,
  cents: number,
): string | null {
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  if (asset.settlement_kind === "erc20") return `≈ ${(cents / 100).toFixed(2)} ${asset.asset_key}`;
  if (asset.settlement_kind !== "native" || !asset.price_micro_usd) return null;
  const text = formatPricedEquivalent(cents, asset.price_micro_usd, asset.decimals);
  return text ? `≈ ${text} ${asset.asset_key}` : null;
}

export function formatCryptoUnits(units: string, decimals: number, assetKey: string): string {
  const whole = (units.split(".")[0] ?? "0").replace(/[^0-9]/g, "") || "0";
  if (!Number.isInteger(decimals) || decimals <= 0) return `${whole} ${assetKey}`;
  const padded = whole.padStart(decimals + 1, "0");
  const value = `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`.replace(/\.?0+$/, "");
  return `${value || "0"} ${assetKey}`;
}

/** Units a pegged asset would move for a USD-cent amount. Display matches the server formula. */
export function pegUnits(cents: number, decimals: number): string {
  if (!Number.isSafeInteger(cents) || cents <= 0) return "0";
  if (!Number.isInteger(decimals) || decimals < 2 || decimals > 18) return "0";
  return ((BigInt(cents) * 10n ** BigInt(decimals)) / 100n).toString();
}

export function parseFundingAsset(raw: unknown): FundingAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row["asset_key"] !== "string" || !ASSET_KEY.test(row["asset_key"])) return null;
  if (row["settlement_kind"] !== "native" && row["settlement_kind"] !== "erc20") return null;
  if (
    typeof row["decimals"] !== "number" ||
    !Number.isInteger(row["decimals"]) ||
    row["decimals"] < 0 ||
    row["decimals"] > 18
  )
    return null;
  const price =
    typeof row["price_micro_usd"] === "number" &&
    Number.isSafeInteger(row["price_micro_usd"]) &&
    row["price_micro_usd"] > 0
      ? row["price_micro_usd"]
      : null;
  return {
    asset_key: row["asset_key"],
    display_name:
      typeof row["display_name"] === "string" && row["display_name"]
        ? row["display_name"]
        : row["asset_key"],
    decimals: row["decimals"],
    settlement_kind: row["settlement_kind"],
    payout_ready: row["payout_ready"] !== false,
    price_micro_usd: price,
  };
}

export function parseFundingChains(raw: unknown): FundingChain[] {
  if (!Array.isArray(raw)) return [];
  const chains: FundingChain[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const chainId = typeof row["chain_id"] === "number" ? row["chain_id"] : Number(row["chain_id"]);
    if (!Number.isInteger(chainId) || chainId <= 0) continue;
    const assets = Array.isArray(row["assets"])
      ? row["assets"].map(parseFundingAsset).filter((asset): asset is FundingAsset => !!asset)
      : [];
    chains.push({
      chain_id: chainId,
      name: typeof row["name"] === "string" && row["name"] ? row["name"] : `Chain ${chainId}`,
      network_mode: row["network_mode"] === "mainnet" ? "mainnet" : "testnet",
      min_deposit_cents: numberOr(row["min_deposit_cents"], 0),
      min_withdrawal_cents: numberOr(row["min_withdrawal_cents"], 0),
      credit_confirmations: numberOr(row["credit_confirmations"], 0),
      assets,
    });
  }
  return chains;
}

function numberOr(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}
