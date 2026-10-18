import { workerEnv } from "@/lib/worker-env";
import {
  forbiddenBtcKey,
  parseRequiredConfirmations,
  parseUsdCentsEnv,
  speedPolicyFor,
  type SpeedPolicyName,
} from "./policy";

export type BtcpayConfig =
  | { ok: true; enabled: false }
  | { ok: false; reason: string }
  | {
      ok: true;
      enabled: true;
      url: string;
      storeId: string;
      apiKey: string;
      webhookSecret: string;
      network: "mainnet";
      requiredConfirmations: number;
      speedPolicy: SpeedPolicyName;
      onchainMethod: string;
      minCents: number;
    };

function envNames(): string[] {
  return Object.keys(process.env);
}

/**
 * Mainnet on-chain deposits only. A Bitcoin seed, xprv, WIF, or hot-wallet key
 * in this process disables the rail.
 */
export function readBtcpayConfig(): BtcpayConfig {
  const forbidden = forbiddenBtcKey(envNames());
  if (forbidden) return { ok: false, reason: "BTC_KEY_MATERIAL_FORBIDDEN" };
  if (workerEnv("BTCPAY_DEPOSITS_ENABLED") !== "true") return { ok: true, enabled: false };
  const network = workerEnv("BTCPAY_NETWORK");
  if (network !== "mainnet") return { ok: false, reason: "NETWORK_NOT_MAINNET" };
  const requiredConfirmations = parseRequiredConfirmations(workerEnv("BTC_REQUIRED_CONFIRMATIONS"));
  const speedPolicy = requiredConfirmations == null ? null : speedPolicyFor(requiredConfirmations);
  if (requiredConfirmations == null || speedPolicy == null)
    return { ok: false, reason: "CONFIRMATIONS_INVALID" };
  const url = workerEnv("BTCPAY_URL")?.replace(/\/$/, "");
  const storeId = workerEnv("BTCPAY_STORE_ID");
  const apiKey = workerEnv("BTCPAY_API_KEY");
  const webhookSecret = workerEnv("BTCPAY_WEBHOOK_SECRET");
  if (!url || !storeId || !apiKey || !webhookSecret)
    return { ok: false, reason: "BTCPAY_CONFIG_MISSING" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "BTCPAY_URL_INVALID" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "BTCPAY_URL_INVALID" };
  const onchainMethod = workerEnv("BTCPAY_ONCHAIN_METHOD") ?? "BTC";
  if (!/^[A-Z0-9-]{3,32}$/.test(onchainMethod)) return { ok: false, reason: "METHOD_INVALID" };
  const minRaw = workerEnv("BTCPAY_MIN_DEPOSIT_CENTS");
  const minCents = minRaw == null || minRaw === "" ? 200 : Number(minRaw);
  if (!Number.isInteger(minCents) || minCents < 200 || minCents > 100_000_000) {
    return { ok: false, reason: "MIN_DEPOSIT_INVALID" };
  }
  return {
    ok: true,
    enabled: true,
    url,
    storeId,
    apiKey,
    webhookSecret,
    network,
    requiredConfirmations,
    speedPolicy,
    onchainMethod,
    minCents,
  };
}

export type BtcpayPayoutConfig =
  | { ok: true; enabled: false }
  | { ok: false; reason: string }
  | {
      ok: true;
      enabled: true;
      url: string;
      storeId: string;
      apiKey: string;
      webhookSecret: string;
      onchainMethod: string;
      minCents: number;
      autoCents: number;
    };

/**
 * Payouts use a second store and API key. The deposit invoice key cannot send.
 * Top-ups use BTCPAY_SWEEP_API_KEY, a third key that can spend the deposit store.
 * Auto-send stays off until BTC_WITHDRAWAL_AUTO_CENTS is a positive cap.
 */
export function readBtcpayPayoutConfig(): BtcpayPayoutConfig {
  const forbidden = forbiddenBtcKey(envNames());
  if (forbidden) return { ok: false, reason: "BTC_KEY_MATERIAL_FORBIDDEN" };
  if (workerEnv("BTCPAY_PAYOUTS_ENABLED") !== "true") return { ok: true, enabled: false };
  const network = workerEnv("BTCPAY_NETWORK");
  if (network !== "mainnet") return { ok: false, reason: "NETWORK_NOT_MAINNET" };
  const url = workerEnv("BTCPAY_URL")?.replace(/\/$/, "");
  const storeId = workerEnv("BTCPAY_PAYOUT_STORE_ID");
  const apiKey = workerEnv("BTCPAY_PAYOUT_API_KEY");
  const webhookSecret =
    workerEnv("BTCPAY_PAYOUT_WEBHOOK_SECRET") || workerEnv("BTCPAY_WEBHOOK_SECRET");
  const depositStore = workerEnv("BTCPAY_STORE_ID");
  const depositKey = workerEnv("BTCPAY_API_KEY");
  if (!url || !storeId || !apiKey || !webhookSecret)
    return { ok: false, reason: "BTCPAY_PAYOUT_CONFIG_MISSING" };
  if (storeId === depositStore) return { ok: false, reason: "PAYOUT_STORE_NOT_SEPARATE" };
  if (apiKey === depositKey) return { ok: false, reason: "PAYOUT_KEY_NOT_SEPARATE" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "BTCPAY_URL_INVALID" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "BTCPAY_URL_INVALID" };
  const onchainMethod = workerEnv("BTCPAY_ONCHAIN_METHOD") ?? "BTC";
  if (!/^[A-Z0-9-]{3,32}$/.test(onchainMethod)) return { ok: false, reason: "METHOD_INVALID" };
  const configuredMin = parseUsdCentsEnv(workerEnv("BTC_WITHDRAWAL_MIN_CENTS"), 2000);
  const minCents = configuredMin == null ? null : Math.max(configuredMin, 2000);
  const autoCents = parseUsdCentsEnv(workerEnv("BTC_WITHDRAWAL_AUTO_CENTS"), 0);
  if (minCents == null || minCents < 100) return { ok: false, reason: "MIN_PAYOUT_INVALID" };
  if (autoCents == null) return { ok: false, reason: "AUTO_PAYOUT_INVALID" };
  return {
    ok: true,
    enabled: true,
    url,
    storeId,
    apiKey,
    webhookSecret,
    onchainMethod,
    minCents,
    autoCents,
  };
}

export type BtcpaySweepConfig =
  | { ok: true; enabled: false; reason: "SWEEP_KEY_MISSING" }
  | { ok: false; reason: string }
  | {
      ok: true;
      enabled: true;
      url: string;
      storeId: string;
      apiKey: string;
      onchainMethod: string;
    };

/**
 * Spends the deposit store into the payout wallet. The invoice key and the
 * payout key stay unable to move that wallet.
 */
export function readBtcpaySweepConfig(): BtcpaySweepConfig {
  const forbidden = forbiddenBtcKey(envNames());
  if (forbidden) return { ok: false, reason: "BTC_KEY_MATERIAL_FORBIDDEN" };
  const apiKey = workerEnv("BTCPAY_SWEEP_API_KEY");
  if (!apiKey) return { ok: true, enabled: false, reason: "SWEEP_KEY_MISSING" };
  if (workerEnv("BTCPAY_NETWORK") !== "mainnet") return { ok: false, reason: "NETWORK_NOT_MAINNET" };
  const url = workerEnv("BTCPAY_URL")?.replace(/\/$/, "");
  const storeId = workerEnv("BTCPAY_STORE_ID");
  const depositKey = workerEnv("BTCPAY_API_KEY");
  const payoutKey = workerEnv("BTCPAY_PAYOUT_API_KEY");
  if (!url || !storeId) return { ok: false, reason: "BTCPAY_CONFIG_MISSING" };
  if (apiKey === depositKey || apiKey === payoutKey) return { ok: false, reason: "SWEEP_KEY_NOT_SEPARATE" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "BTCPAY_URL_INVALID" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "BTCPAY_URL_INVALID" };
  const onchainMethod = workerEnv("BTCPAY_ONCHAIN_METHOD") ?? "BTC";
  if (!/^[A-Z0-9-]{3,32}$/.test(onchainMethod)) return { ok: false, reason: "METHOD_INVALID" };
  return { ok: true, enabled: true, url, storeId, apiKey, onchainMethod };
}
