import { formatEthEquivalent } from "./eth-price";

/** localStorage keeps the asset key only. Amounts are never stored here. */
export const RAIL_STORAGE_KEY = "pvp-funding-rail";

const ASSET_KEY = /^[A-Z0-9]{2,12}$/;
const PENDING_DEPOSIT = new Set(["DETECTED", "CONFIRMED"]);
const PENDING_WITHDRAWAL = new Set([
  "PENDING",
  "HELD",
  "APPROVED",
  "SUBMITTING",
  "SUBMITTED",
  "LIQUIDITY_PENDING",
]);

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

export type FundingAssetRow = FundingAsset & {
  chain_id: number;
  chain_name: string;
  network_mode: string;
  min_deposit_cents: number;
  min_withdrawal_cents: number;
  credit_confirmations: number;
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

const HELD_ASSETS = ["BTC", "ETH", "USDC"] as const;

export type HeldAsset = (typeof HELD_ASSETS)[number];

type HeldMovement = {
  asset_key: string;
  usd_cents: number;
  status: string;
  at: string;
};

/**
 * Token shown beside the playable balance.
 * Credited deposits minus completed cashouts; the larger remainder wins.
 * A tie uses the later movement. Partner credits and other dollar-only
 * balances have no deposit, so they show as USDC.
 */
export function inferHeldAsset(input: {
  deposits: readonly HeldMovement[];
  withdrawals: readonly HeldMovement[];
  bitcoinDeposits?: readonly { usd_cents: number; status: string; at: string }[];
  bitcoinPayouts?: readonly { usd_cents: number; status: string; at: string }[];
}): HeldAsset {
  const net = new Map<HeldAsset, { cents: number; latest: string }>();
  const add = (asset: string, cents: number, at: string, sign: 1 | -1) => {
    if (!isHeldAsset(asset) || !Number.isSafeInteger(cents) || cents <= 0) return;
    const row = net.get(asset) ?? { cents: 0, latest: "" };
    row.cents += sign * cents;
    if (at > row.latest) row.latest = at;
    net.set(asset, row);
  };
  for (const row of input.deposits) {
    if (row.status === "CREDITED") add(row.asset_key, row.usd_cents, row.at, 1);
  }
  for (const row of input.withdrawals) {
    if (row.status === "CONFIRMED") add(row.asset_key, row.usd_cents, row.at, -1);
  }
  for (const row of input.bitcoinDeposits ?? []) {
    if (row.status === "CREDITED") add("BTC", row.usd_cents, row.at, 1);
  }
  for (const row of input.bitcoinPayouts ?? []) {
    if (row.status === "COMPLETED") add("BTC", row.usd_cents, row.at, -1);
  }
  let best: { asset: HeldAsset; cents: number; latest: string } | null = null;
  for (const [asset, row] of net) {
    if (row.cents <= 0) continue;
    if (
      !best ||
      row.cents > best.cents ||
      (row.cents === best.cents && row.latest > best.latest)
    ) {
      best = { asset, cents: row.cents, latest: row.latest };
    }
  }
  return best?.asset ?? "USDC";
}

function isHeldAsset(asset: string): asset is HeldAsset {
  return (HELD_ASSETS as readonly string[]).includes(asset);
}

export function balanceTriggerLabel(usd: string, rail: string | null): string {
  if (rail) return `Playable balance ${usd}. Funding rail ${rail}. Choose a funding rail.`;
  return `Playable balance ${usd}. No funding rail selected. Choose a funding rail.`;
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

/** Short accounting display. Extra fractional digits stay exact in the ledger, not in this label. */
export function formatDepositUnits(units: string, decimals: number, assetKey: string): string {
  const full = formatCryptoUnits(units, decimals, assetKey);
  const space = full.lastIndexOf(" ");
  const amount = space >= 0 ? full.slice(0, space) : full;
  const suffix = space >= 0 ? full.slice(space) : "";
  const [whole, frac] = amount.split(".");
  if (!frac) return full;
  const short = frac.slice(0, 6).replace(/0+$/, "");
  return `${whole}${short ? `.${short}` : ""}${suffix}`;
}

/**
 * Today's server-price value of units that were already deposited.
 * This is not a balance and not the USD credited at the time.
 */
export function depositTodayCents(
  units: string,
  decimals: number,
  settlementKind: "native" | "erc20",
  priceMicroUsd: number | null,
): number | null {
  const whole = (units.split(".")[0] ?? "0").replace(/[^0-9]/g, "") || "0";
  let amount: bigint;
  try {
    amount = BigInt(whole);
  } catch {
    return null;
  }
  if (amount <= 0n || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) return null;
  const scale = 10n ** BigInt(decimals);
  const micro =
    settlementKind === "erc20"
      ? (amount * 1_000_000n) / scale
      : priceMicroUsd && Number.isSafeInteger(priceMicroUsd) && priceMicroUsd > 0
        ? (amount * BigInt(priceMicroUsd)) / scale
        : null;
  if (micro == null) return null;
  const cents = micro / 10_000n;
  const value = Number(cents);
  return Number.isSafeInteger(value) ? value : null;
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

/** One row per asset key. Mainnet wins when the same key is enabled on two networks. */
export function listHeaderRails(chains: readonly FundingChain[]): FundingAssetRow[] {
  const ranked = [...chains].sort((a, b) => {
    const mode = Number(a.network_mode !== "mainnet") - Number(b.network_mode !== "mainnet");
    return mode || a.chain_id - b.chain_id;
  });
  const seen = new Set<string>();
  const rows: FundingAssetRow[] = [];
  for (const chain of ranked) {
    for (const asset of chain.assets) {
      if (seen.has(asset.asset_key)) continue;
      seen.add(asset.asset_key);
      rows.push(attachChain(asset, chain));
    }
  }
  return rows;
}

export function listFundingRows(chains: readonly FundingChain[]): FundingAssetRow[] {
  return chains.flatMap((chain) => chain.assets.map((asset) => attachChain(asset, chain)));
}

function attachChain(asset: FundingAsset, chain: FundingChain): FundingAssetRow {
  return {
    ...asset,
    chain_id: chain.chain_id,
    chain_name: chain.name,
    network_mode: chain.network_mode,
    min_deposit_cents: chain.min_deposit_cents,
    min_withdrawal_cents: chain.min_withdrawal_cents,
    credit_confirmations: chain.credit_confirmations,
  };
}

export function fundingFacts(input: {
  asset: Pick<FundingAsset, "asset_key" | "settlement_kind" | "decimals" | "price_micro_usd">;
  availableCents: number;
  deposits: readonly RailMovement[];
  withdrawals: readonly RailMovement[];
}) {
  const mine = (rows: readonly RailMovement[]) =>
    rows.filter((row) => row.asset_key === input.asset.asset_key);
  const deposits = mine(input.deposits);
  const withdrawals = mine(input.withdrawals);
  const lastCredited =
    deposits.filter((row) => row.status === "CREDITED").sort((a, b) => (a.at < b.at ? 1 : -1))[0] ??
    null;
  return {
    availableCents: input.availableCents,
    estimate: railEquivalent(input.asset, input.availableCents),
    lastCredited,
    pendingDeposits: deposits.filter((row) => PENDING_DEPOSIT.has(row.status)),
    pendingWithdrawals: withdrawals.filter((row) => PENDING_WITHDRAWAL.has(row.status)),
  };
}
