/**
 * Known-good Base Mainnet configuration (verified against Circle and Chainlink
 * docs). The database registry must match these values exactly before any
 * mainnet worker will run — a wrong contract or feed fails closed.
 */
export const BASE_MAINNET = {
  chainId: 8453,
  usdc: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  usdcDecimals: 6,
  ethUsdFeed: "0x71041dddad3595f9ced3dccfbe3d1f4b0a16bb70",
} as const;

/** PVPspinArena's Base wallet. The only address published for ETH and USDC deposits. */
export const BASE_DEPOSIT_TREASURY = "0x9EAff85db9A2559eC958740A6a3b523751237987";

/** Validates the database registry row for a mainnet chain against known-good values. */
export function checkMainnetRegistry(cfg: {
  chainId: number;
  networkMode: string;
  usdc?: string | null;
  usdcDecimals?: number;
  feed?: string | null;
}): EnvCheck {
  if (cfg.networkMode !== "mainnet") return { ok: false, reason: "MODE_MISMATCH" };
  if (cfg.chainId !== BASE_MAINNET.chainId) {
    // Other mainnet chains (e.g. Ethereum) stay disabled until their own
    // verified constants are added here.
    return { ok: false, reason: "CHAIN_NOT_VERIFIED" };
  }
  const checkUsdc = "usdc" in cfg || "usdcDecimals" in cfg;
  const checkFeed = "feed" in cfg;
  if (!checkUsdc && !checkFeed) return { ok: false, reason: "ASSETS_MISSING" };
  if (checkUsdc) {
    if ((cfg.usdc ?? "").toLowerCase() !== BASE_MAINNET.usdc)
      return { ok: false, reason: "USDC_MISMATCH" };
    if (cfg.usdcDecimals !== BASE_MAINNET.usdcDecimals)
      return { ok: false, reason: "USDC_DECIMALS_MISMATCH" };
  }
  if (checkFeed && (cfg.feed ?? "").toLowerCase() !== BASE_MAINNET.ethUsdFeed)
    return { ok: false, reason: "FEED_MISMATCH" };
  return { ok: true };
}

export interface ChainAssetConfig {
  asset_key: string;
  is_enabled: boolean;
  contract_address?: string | null;
  decimals?: number | string | null;
  price_feed_address?: string | null;
  min_deposit_units?: string | number | null;
}

/**
 * A chain can prepare a deposit when the requested asset row is enabled.
 * ETH and USDC are checked on their own. One being disabled does not block the other.
 * Both disabled means there is no deposit rail.
 */
export function resolveChainEnvAssets<T extends ChainAssetConfig>(
  rows: T[] | null | undefined,
): { ok: false; reason: "ASSETS_MISSING" } | { ok: true; usdc: T | null; eth: T | null } {
  const usdc = (rows ?? []).find((asset) => asset.asset_key === "USDC" && asset.is_enabled) ?? null;
  const eth = (rows ?? []).find((asset) => asset.asset_key === "ETH" && asset.is_enabled) ?? null;
  if (!usdc && !eth) return { ok: false, reason: "ASSETS_MISSING" };
  return { ok: true, usdc, eth };
}

/** True only when this asset key is an enabled row. The sibling asset is irrelevant. */
export function depositAssetEnabled(
  rows: ChainAssetConfig[] | null | undefined,
  assetKey: string,
): boolean {
  const chain = resolveChainEnvAssets(rows);
  if (!chain.ok) return false;
  return (rows ?? []).some((asset) => asset.asset_key === assetKey && asset.is_enabled);
}

export type EnvCheck = { ok: true } | { ok: false; reason: string };

/** Only HTTPS RPC endpoints that are not testnets are accepted. */
export function checkRpcUrl(url: string | undefined): EnvCheck {
  if (!url) return { ok: false, reason: "RPC_URL_MISSING" };
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return { ok: false, reason: "RPC_NOT_HTTPS" };
  } catch {
    return { ok: false, reason: "RPC_URL_INVALID" };
  }
  if (/sepolia|testnet|goerli/i.test(url)) return { ok: false, reason: "RPC_NOT_MAINNET" };
  return { ok: true };
}

/**
 * Wei that must remain in the Base payout wallet after a native send.
 * A simple transfer's gas is estimated separately; this reserve stays behind
 * so the wallet is not emptied by the withdrawal itself.
 */
export const BASE_PAYOUT_GAS_RESERVE_WEI = 50_000_000_000_000n;

/** ETH wei for a USD-cent amount at a price in micro-USD per ETH (floor). */
export function centsToWei(cents: bigint, priceMicroUsd: bigint): bigint {
  return (cents * 10_000n * 10n ** 18n) / priceMicroUsd;
}
/** USD cents for wei at a price in micro-USD per ETH (floor). */
export function weiToCents(wei: bigint, priceMicroUsd: bigint): bigint {
  return (wei * priceMicroUsd) / 10n ** 18n / 10_000n;
}
/** USDC 6-decimals units to cents (floor). */
export function usdcUnitsToCents(units: bigint): bigint {
  return units / 10_000n;
}

/**
 * Transfers under the asset's minimum are never credited, so the watcher skips them before any
 * DB call: a dust flood then cannot spend the run's subrequest budget. Unknown assets are kept.
 */
export function belowDepositMinimum(
  minUnits: Record<string, bigint>,
  asset: string,
  units: bigint,
): boolean {
  const min = minUnits[asset];
  return min != null && units < min;
}

/**
 * Whether the payout wallet can cover a native ETH send.
 * On Ethereum L1 the gas is taken from the player's wei; elsewhere the house pays gas on top.
 */
export function ethPayoutFunded(
  chainId: number,
  balanceWei: bigint,
  payoutWei: bigint,
  feeWei: bigint,
): boolean {
  if (payoutWei <= 0n || balanceWei < 0n || feeWei < 0n) return false;
  if (chainId === 1) return payoutWei > feeWei && balanceWei >= payoutWei - feeWei;
  return balanceWei >= payoutWei + feeWei;
}
