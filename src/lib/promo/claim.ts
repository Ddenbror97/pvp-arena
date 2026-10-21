import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatUsd } from "@/lib/jackpot/math";
import { promoClaimSucceeded } from "@/lib/promo/game-signup-policy";

const KEY = "pvp-signup-promo";

export type PromoClaimResult = { ok?: boolean; reason?: string; reward_cents?: number };

export type SignupAccount = { id: string; email?: string | null };

type PromoBind =
  { kind: "email"; email: string } | { kind: "discord" } | { kind: "account"; accountId: string };

type StoredPromo = { v: 1; code: string; bind: PromoBind };

/** True only for the page load that is completing a Discord OAuth redirect. */
function detectOAuthReturn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (
      search.get("error") ||
      hash.get("error") ||
      search.get("error_code") ||
      hash.get("error_code")
    ) {
      return false;
    }
    return Boolean(search.get("code") || hash.get("access_token"));
  } catch {
    return false;
  }
}

const oauthReturn = detectOAuthReturn();

function readStored(): StoredPromo | "legacy" | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    if (!raw.startsWith("{")) return "legacy";
    const parsed = JSON.parse(raw) as Partial<StoredPromo>;
    if (parsed.v !== 1 || typeof parsed.code !== "string" || !parsed.code.trim()) return "legacy";
    const bind = parsed.bind;
    if (!bind || typeof bind !== "object" || !("kind" in bind)) return "legacy";
    if (bind.kind === "email" && typeof bind.email === "string" && bind.email.trim()) {
      return {
        v: 1,
        code: parsed.code.trim().slice(0, 16),
        bind: { kind: "email", email: bind.email.trim().toLowerCase() },
      };
    }
    if (bind.kind === "discord") {
      return { v: 1, code: parsed.code.trim().slice(0, 16), bind: { kind: "discord" } };
    }
    if (bind.kind === "account" && typeof bind.accountId === "string" && bind.accountId) {
      return {
        v: 1,
        code: parsed.code.trim().slice(0, 16),
        bind: { kind: "account", accountId: bind.accountId },
      };
    }
    return "legacy";
  } catch {
    return null;
  }
}

function writeStored(stored: StoredPromo | null) {
  try {
    if (!stored) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Private mode can block storage. The field still works on the profile page.
  }
}

function emailsMatch(stored: string, account: string | null | undefined): boolean {
  return !!account && stored.trim().toLowerCase() === account.trim().toLowerCase();
}

/** Whether the stored signup code may be claimed by this signed-in account. */
export function signupPromoStatus(
  account: SignupAccount,
  discordReturn = oauthReturn,
): "ready" | "abandon" | "empty" | "wait" {
  const stored = readStored();
  if (!stored) return "empty";
  if (stored === "legacy") return "abandon";
  if (stored.bind.kind === "email") {
    if (!account.email) return "wait";
    return emailsMatch(stored.bind.email, account.email) ? "ready" : "abandon";
  }
  if (stored.bind.kind === "discord") return discordReturn ? "ready" : "abandon";
  return stored.bind.accountId === account.id ? "ready" : "abandon";
}

export function rememberPromoCode(raw: string, bind?: PromoBind) {
  const code = raw.trim().slice(0, 16);
  if (!code) {
    writeStored(null);
    return;
  }
  const existing = readStored();
  const kept = !bind && existing && existing !== "legacy" ? existing.bind : null;
  const next = bind ?? kept;
  if (!next) return;
  if (next.kind === "email") {
    const email = next.email.trim().toLowerCase();
    if (!email) return;
    writeStored({ v: 1, code, bind: { kind: "email", email } });
    return;
  }
  writeStored({ v: 1, code, bind: next });
}

export function peekPromoCode(): string {
  const stored = readStored();
  if (!stored || stored === "legacy") {
    try {
      return sessionStorage.getItem(KEY)?.trim().slice(0, 16) ?? "";
    } catch {
      return "";
    }
  }
  return stored.code;
}

function forgetPromoCode() {
  writeStored(null);
}

export async function claimPromoCode(code: string): Promise<PromoClaimResult> {
  // Call Supabase from the browser. The database reads Cloudflare's
  // CF-Connecting-IP on that request. Proxying this through the site worker
  // would record the worker address instead of the player's.
  const { data, error } = await supabase.rpc(
    "promo_claim" as never,
    { p_code: code.trim() } as never,
  );
  if (error) throw error;
  return (data ?? { ok: false, reason: "unavailable" }) as PromoClaimResult;
}

export function promoClaimError(result: PromoClaimResult | null): string {
  if (result?.reason === "PROMO_ALREADY_REDEEMED") {
    return "Each account can redeem only one promo code.";
  }
  if (result?.reason === "PROMO_IP_ALREADY_REDEEMED") {
    return "A promo code has already been redeemed from this network.";
  }
  return "That code is unavailable.";
}

type Flight = { inflight: number; announced: boolean };
const flights = new Map<string, Flight>();

/**
 * Overlapping claims of the same code each call the server. Only the first
 * settled call presents a toast or inline error.
 */
export function openPromoClaim(code: string): { announce: () => boolean; release: () => void } {
  const key = code.trim().toUpperCase();
  let row = flights.get(key);
  if (!row) {
    row = { inflight: 0, announced: false };
    flights.set(key, row);
  }
  row.inflight += 1;
  let settled = false;
  const settle = (present: boolean) => {
    if (settled) return false;
    settled = true;
    row.inflight -= 1;
    const show = present && !row.announced;
    if (show) row.announced = true;
    if (row.inflight <= 0) flights.delete(key);
    return show;
  };
  return {
    announce: () => settle(true),
    release: () => {
      settle(false);
    },
  };
}

export type RememberedPromoClaim =
  { status: "none" } | { status: "retry" } | { status: "done"; ok: boolean; reason?: string };

/** Claim the code typed at signup. A rejected code still leaves the account in place. */
export async function claimRememberedPromo(account: SignupAccount): Promise<RememberedPromoClaim> {
  const status = signupPromoStatus(account);
  if (status === "empty") return { status: "none" };
  if (status === "wait") return { status: "retry" };
  if (status === "abandon") {
    forgetPromoCode();
    return { status: "none" };
  }
  const code = peekPromoCode();
  if (!code) return { status: "none" };
  const flight = openPromoClaim(code);
  try {
    const result = await claimPromoCode(code);
    forgetPromoCode();
    if (flight.announce()) {
      if (promoClaimSucceeded(result))
        toast.success(
          `Promo claimed — ${formatUsd(result.reward_cents ?? 0)} added to your balance.`,
        );
      else toast.error(promoClaimError(result));
    }
    return result.reason
      ? { status: "done", ok: result.ok === true, reason: result.reason }
      : { status: "done", ok: result.ok === true };
  } catch {
    flight.release();
    return { status: "retry" };
  }
}
