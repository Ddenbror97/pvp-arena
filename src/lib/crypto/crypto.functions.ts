import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ERRORS: Record<string, string> = {
  WITHDRAWALS_PAUSED: "Withdrawals are paused right now.",
  BELOW_MINIMUM: "Amount is below the minimum.",
  SELF_EXCLUDED: "Withdrawals are unavailable while self-excluded.",
  NO_VERIFIED_WALLET: "Verify a MetaMask wallet on your profile first.",
  WITHDRAWAL_PENDING: "You already have a withdrawal in progress.",
  DAILY_LIMIT: "This would exceed your daily withdrawal limit.",
  QUOTE_INVALID: "Quote not found. Get a new quote.",
  QUOTE_USED: "That quote was already used. Get a new quote.",
  QUOTE_EXPIRED: "The quote expired. Get a new quote.",
  QUOTE_MISMATCH: "Amount changed since the quote. Get a new quote.",
  INSUFFICIENT_BALANCE: "Not enough balance.",
  PRICE_STALE: "ETH price unavailable right now. Try again shortly.",
  CANNOT_CANCEL: "This withdrawal can no longer be cancelled.",
  FORBIDDEN: "Admins only.",
  NOT_PENDING: "This withdrawal is no longer waiting for review.",
};
function clean(msg: string): string {
  const code = Object.keys(ERRORS).find((k) => msg.includes(k));
  return (code && ERRORS[code]) || "Something went wrong. Please try again.";
}
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export const getCryptoActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (await admin()).rpc("crypto_my_activity", { p_user: context.userId });
    if (error) throw new Error("Could not load crypto activity");
    return data as any;
  });

export const quoteEthWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ usdCents: z.number().int().positive().max(100_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { loadVerifiedEnv, snapshotEthPrice } = await import("./chain.server");
    const env = await loadVerifiedEnv();
    if (!env.ok) return { ok: false as const, error: "Crypto rails are unavailable right now." };
    const price = await snapshotEthPrice(env.env).catch(() => null);
    if (!price) return { ok: false as const, error: ERRORS["PRICE_STALE"]! };
    const { data: q, error } = await (await admin()).rpc("crypto_quote_withdrawal", { p_user: context.userId, p_usd_cents: data.usdCents });
    if (error) return { ok: false as const, error: clean(error.message) };
    return { ok: true as const, quote: q as { quote_id: string; usd_cents: number; wei: string; price_micro_usd: number; expires_at: string } };
  });

export const requestCryptoWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ asset: z.enum(["USDC", "ETH"]), usdCents: z.number().int().positive().max(100_000_000), quoteId: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { envOkForAutoApproval } = await import("./chain.server");
    const envOk = await envOkForAutoApproval();
    const { data: r, error } = await (await admin()).rpc("crypto_request_withdrawal", {
      p_user: context.userId, p_asset: data.asset, p_usd_cents: data.usdCents, p_quote: data.quoteId, p_env_ok: envOk,
    });
    if (error) return { ok: false as const, error: clean(error.message) };
    return { ok: true as const, result: r as { id: string; status: string } };
  });

export const cancelCryptoWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (await admin()).rpc("crypto_cancel_withdrawal", { p_user: context.userId, p_id: data.id });
    return error ? { ok: false as const, error: clean(error.message) } : { ok: true as const };
  });

export const getCryptoAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (await admin()).rpc("crypto_admin_overview", { p_admin: context.userId });
    if (error) return null;
    return data as any;
  });

export const reviewCryptoWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (await admin()).rpc("crypto_admin_review", { p_admin: context.userId, p_id: data.id, p_approve: data.approve });
    return error ? { ok: false as const, error: clean(error.message) } : { ok: true as const };
  });

export const setCryptoSwitches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ system: z.boolean(), deposits: z.boolean(), withdrawals: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (await admin()).rpc("crypto_admin_set_switches", {
      p_admin: context.userId, p_system: data.system, p_deposits: data.deposits, p_withdrawals: data.withdrawals,
    });
    return error ? { ok: false as const, error: clean(error.message) } : { ok: true as const };
  });
