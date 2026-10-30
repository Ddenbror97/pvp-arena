/** Cloudflare Worker bindings. Nitro/node process.env is not always populated. */
import { existsSync, readFileSync } from "node:fs";

const GLOBAL_KEY = "__pvpWorkerBindings";

const KNOWN = [
  "FPS_RUNTIME_ORIGIN",
  "FPS_RUNTIME_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "CRYPTO_JOB_TOKEN",
  "CRYPTO_TRACE_URL_8453",
  "BTCPAY_URL",
  "BTCPAY_STORE_ID",
  "BTCPAY_API_KEY",
  "BTCPAY_WEBHOOK_SECRET",
  "BTCPAY_DEPOSITS_ENABLED",
  "BTCPAY_NETWORK",
  "BTCPAY_ONCHAIN_METHOD",
  "BTCPAY_MIN_DEPOSIT_CENTS",
  "BTC_REQUIRED_CONFIRMATIONS",
  "BTCPAY_PAYOUTS_ENABLED",
  "BTCPAY_PAYOUT_STORE_ID",
  "BTCPAY_PAYOUT_API_KEY",
  "BTCPAY_PAYOUT_WEBHOOK_SECRET",
  "BTC_WITHDRAWAL_AUTO_CENTS",
  "BTC_WITHDRAWAL_MIN_CENTS",
  "BTCPAY_SWEEP_API_KEY",
  "DIDIT_API_KEY",
  "DIDIT_WORKFLOW_ID",
  "DIDIT_WEBHOOK_SECRET",
  "GAME_SIGNUP_PROMO_ENABLED",
  "OTP_PEPPER",
  "TURNSTILE_SECRET_KEY",
] as const;

let bindings: Record<string, string> = {};

type AssetFetcher = {
  fetch: (input: Request) => Promise<Response>;
};

let assets: AssetFetcher | undefined;

export function assetsFromEnv(env: unknown): AssetFetcher | undefined {
  if (!env || typeof env !== "object" || !("ASSETS" in env)) return undefined;
  const candidate = (env as { ASSETS?: AssetFetcher }).ASSETS;
  return candidate && typeof candidate.fetch === "function" ? candidate : undefined;
}

function captureAssets(env: unknown) {
  const candidate = assetsFromEnv(env);
  if (candidate) assets = candidate;
}

/** Cloudflare static assets. Guide bodies are files, not Worker modules. */
export function workerAssets(): AssetFetcher | undefined {
  if (assets) return assets;
  // Nitro's Cloudflare handler stores the request env here before SSR runs.
  captureAssets((globalThis as { __env__?: unknown }).__env__);
  return assets;
}

function sharedBindings(): Record<string, string> {
  const current = (globalThis as Record<string, unknown>)[GLOBAL_KEY];
  return current && typeof current === "object" ? (current as Record<string, string>) : {};
}

function takeString(source: Record<string, unknown>, key: string): string | undefined {
  try {
    const value = source[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function fillMissingEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i);
    const value = trimmed
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!value) continue;
    try {
      if (key.startsWith("DIDIT_") || !process.env[key]) process.env[key] = value;
    } catch {
      /* process.env can be read-only */
    }
  }
}

/**
 * Local `vite dev` does not inject Worker secrets. `.env` is the general file.
 * Bitcoin settings live in `btcpay.secrets`, and only a development process may read that file.
 */
function hydrateFromDotEnv() {
  try {
    const cwd = globalThis.process?.cwd?.();
    if (!cwd) return;
    fillMissingEnv(`${cwd}/.env`);
    if (process.env["NODE_ENV"] === "development") fillMissingEnv(`${cwd}/btcpay.secrets`);
  } catch {
    /* Cloudflare has no local env files */
  }
}

export function applyWorkerEnv(env: unknown) {
  hydrateFromDotEnv();
  if (!env || typeof env !== "object") return;
  const source = env as Record<string, unknown>;
  captureAssets(source);
  const next: Record<string, string> = { ...sharedBindings() };
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" && value.length > 0) next[key] = value;
  }
  // Some worker env objects do not enumerate secret bindings.
  for (const key of KNOWN) {
    const bound = takeString(source, key);
    if (bound) {
      next[key] = bound;
      continue;
    }
    const fallback = takeString(process.env as unknown as Record<string, unknown>, key);
    if (fallback && !next[key]) next[key] = fallback;
  }
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = next;
  bindings = next;
  for (const [key, value] of Object.entries(next)) {
    try {
      process.env[key] = value;
    } catch {
      /* process.env can be read-only in the worker */
    }
  }
}

export function workerEnv(name: string): string | undefined {
  hydrateFromDotEnv();
  const v = sharedBindings()[name] ?? bindings[name] ?? process.env[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}
