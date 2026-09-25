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

/** Validates the database registry row for a mainnet chain against known-good values. */
export function checkMainnetRegistry(cfg: {
  chainId: number;
  networkMode: string;
  usdc: string | null | undefined;
  usdcDecimals: number;
  feed: string | null | undefined;
}): EnvCheck {
  if (cfg.networkMode !== "mainnet") return { ok: false, reason: "MODE_MISMATCH" };
  if (cfg.chainId === BASE_MAINNET.chainId) {
    if ((cfg.usdc ?? "").toLowerCase() !== BASE_MAINNET.usdc) return { ok: false, reason: "USDC_MISMATCH" };
    if (cfg.usdcDecimals !== BASE_MAINNET.usdcDecimals) return { ok: false, reason: "USDC_DECIMALS_MISMATCH" };
    if ((cfg.feed ?? "").toLowerCase() !== BASE_MAINNET.ethUsdFeed) return { ok: false, reason: "FEED_MISMATCH" };
    return { ok: true };
  }
  // Other mainnet chains (e.g. Ethereum) stay disabled until their own
  // verified constants are added here.
  return { ok: false, reason: "CHAIN_NOT_VERIFIED" };
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
