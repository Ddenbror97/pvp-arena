/**
 * Hard testnet allowlist (mirrors the migration-only database rows). Workers
 * refuse to run unless the live RPC, the database settings and these values
 * all agree. Mainnet identifiers are listed only so they can be rejected.
 */
export const TESTNET = {
  environment: "testnet",
  mainnetEnabled: false,
  chainId: 84532,
  usdc: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  ethUsdFeed: "0x4adc67696ba383f43dd60a9e78f2c97fbbfc7cb1",
  explorer: "https://sepolia.basescan.org",
} as const;

export const MAINNET_BLOCKLIST = {
  chainIds: [1, 8453, 10, 42161, 137, 56],
  usdc: ["0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
  rpcHostPatterns: [/(^|\.)mainnet\.base\.org$/i, /base-mainnet/i, /eth-mainnet/i, /^mainnet\./i, /(^|\.)base\.llamarpc\.com$/i],
} as const;

export type EnvCheck = { ok: true } | { ok: false; reason: string };

export function checkRpcUrl(url: string | undefined): EnvCheck {
  if (!url) return { ok: false, reason: "RPC_URL_MISSING" };
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return { ok: false, reason: "RPC_NOT_HTTPS" };
    host = u.hostname;
  } catch {
    return { ok: false, reason: "RPC_URL_INVALID" };
  }
  if (MAINNET_BLOCKLIST.rpcHostPatterns.some((p) => p.test(host))) return { ok: false, reason: "RPC_MAINNET_HOST" };
  if (!/sepolia/i.test(url)) return { ok: false, reason: "RPC_NOT_SEPOLIA" };
  return { ok: true };
}

export function checkStaticConfig(cfg: {
  environment: string;
  mainnetEnabled: boolean;
  chainId: number;
  usdc: string | null | undefined;
  feed: string | null | undefined;
}): EnvCheck {
  if (cfg.environment !== TESTNET.environment) return { ok: false, reason: "ENV_NOT_TESTNET" };
  if (cfg.mainnetEnabled !== false) return { ok: false, reason: "MAINNET_ENABLED" };
  if ((MAINNET_BLOCKLIST.chainIds as readonly number[]).includes(cfg.chainId)) return { ok: false, reason: "MAINNET_CHAIN" };
  if (cfg.chainId !== TESTNET.chainId) return { ok: false, reason: "CHAIN_MISMATCH" };
  const usdc = (cfg.usdc ?? "").toLowerCase();
  if ((MAINNET_BLOCKLIST.usdc as readonly string[]).includes(usdc)) return { ok: false, reason: "MAINNET_USDC" };
  if (usdc !== TESTNET.usdc) return { ok: false, reason: "USDC_MISMATCH" };
  if ((cfg.feed ?? "").toLowerCase() !== TESTNET.ethUsdFeed) return { ok: false, reason: "FEED_MISMATCH" };
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
