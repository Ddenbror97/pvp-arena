import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { centsToWei } from "./allowlist";

const ERRORS: Record<string, string> = {
  WITHDRAWALS_PAUSED: "Withdrawals are paused right now.",
  BELOW_MINIMUM: "Amount is below the minimum for this network.",
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
  CHAIN_DISABLED: "This network is not available right now.",
};
function clean(msg: string): string {
  const code = Object.keys(ERRORS).find((k) => msg.includes(k));
  return (code && ERRORS[code]) || "Something went wrong. Please try again.";
}
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

// Required: a missing chain must fail closed, never fall back to a default network.
const chainIdSchema = z.number().int().positive();

export const getCryptoActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (await admin()).rpc("crypto_my_activity", { p_user: context.userId });
    if (error) throw new Error("Could not load crypto activity");
    return data as any;
  });

/**
 * Returns the player's personal deposit address for a chain, deriving and
 * storing it on first use. Addresses come from an xpub — the server can derive
 * addresses but never spend from them. Returns null when no xpub is
 * configured (deposits then go to the shared treasury, matched by verified sender).
 */
export const getDepositAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chainId: chainIdSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: net } = await db.from("chain_networks").select("chain_id").eq("chain_id", data.chainId).eq("is_enabled", true).maybeSingle();
    if (!net) return { ok: false as const, error: ERRORS["CHAIN_DISABLED"]! };
    const { data: existing } = await db
      .from("crypto_deposit_addresses").select("address")
      .eq("user_id", context.userId).eq("chain_id", data.chainId).maybeSingle();
    if (existing) return { ok: true as const, address: existing.address as string };
    const { depositXpub, deriveDepositAddress } = await import("./addresses.server");
    const xpub = depositXpub();
    if (!xpub) return { ok: true as const, address: null }; // legacy shared-treasury flow
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: maxRow } = await db
        .from("crypto_deposit_addresses").select("derivation_index")
        .eq("chain_id", data.chainId).order("derivation_index", { ascending: false }).limit(1).maybeSingle();
      const index = maxRow ? Number(maxRow.derivation_index) + 1 : 0;
      const address = deriveDepositAddress(xpub, data.chainId, index).toLowerCase();
      const { error } = await db.from("crypto_deposit_addresses").insert({
        user_id: context.userId, chain_id: data.chainId, derivation_index: index, address,
      });
      if (!error) return { ok: true as const, address };
      if (error.code === "23505") {
        // Concurrent assignment or the user already has one — re-read.
        const { data: again } = await db
          .from("crypto_deposit_addresses").select("address")
          .eq("user_id", context.userId).eq("chain_id", data.chainId).maybeSingle();
        if (again) return { ok: true as const, address: again.address as string };
        continue;
      }
      break;
    }
    return { ok: false as const, error: "Could not assign a deposit address. Please try again." };
  });

export const prepareCryptoDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ asset: z.enum(["USDC", "ETH"]), usdCents: z.number().int().positive().max(100_000_000), chainId: chainIdSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const [{ data: wallet }, { loadChainEnv, snapshotEthPrice }] = await Promise.all([
      db
        .from("user_wallets")
        .select("normalized_address")
        .eq("user_id", context.userId)
        .eq("is_verified", true)
        .eq("is_primary", true)
        .maybeSingle(),
      import("./chain.server"),
    ]);
    if (!wallet?.normalized_address) return { ok: false as const, error: ERRORS["NO_VERIFIED_WALLET"]! };
    const checked = await loadChainEnv(data.chainId);
    if (!checked.ok || !checked.env.settings.crypto_system_enabled || !checked.env.settings.deposits_enabled) {
      return { ok: false as const, error: "Deposits are unavailable right now." };
    }
    if (data.usdCents < Number(checked.env.network.min_deposit_cents)) {
      return { ok: false as const, error: ERRORS["BELOW_MINIMUM"]! };
    }
    // Prefer the player's personal deposit address; otherwise the shared treasury (sender-matched).
    const { depositXpub, deriveDepositAddress } = await import("./addresses.server");
    let destination = checked.env.treasury as string;
    if (depositXpub()) {
      const { data: existing } = await db
        .from("crypto_deposit_addresses").select("address")
        .eq("user_id", context.userId).eq("chain_id", data.chainId).maybeSingle();
      if (existing) destination = existing.address as string;
    }
    let units: bigint;
    let priceMicroUsd: number | null = null;
    if (data.asset === "USDC") {
      units = BigInt(data.usdCents) * 10_000n;
    } else {
      const price = await snapshotEthPrice(checked.env).catch(() => null);
      if (!price) return { ok: false as const, error: ERRORS["PRICE_STALE"]! };
      units = centsToWei(BigInt(data.usdCents), price.priceMicro);
      priceMicroUsd = Number(price.priceMicro);
    }
    return {
      ok: true as const,
      instruction: {
        asset: data.asset,
        chainId: data.chainId,
        treasury: destination,
        token: data.asset === "USDC" ? checked.env.usdc : null,
        units: units.toString(),
      },
      verifiedAddress: wallet.normalized_address,
      usdCents: data.usdCents,
      priceMicroUsd,
    };
  });

export const quoteEthWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ usdCents: z.number().int().positive().max(100_000_000), chainId: chainIdSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { loadChainEnv, snapshotEthPrice } = await import("./chain.server");
    const env = await loadChainEnv(data.chainId);
    if (!env.ok) return { ok: false as const, error: "Crypto rails are unavailable right now." };
    const price = await snapshotEthPrice(env.env).catch(() => null);
    if (!price) return { ok: false as const, error: ERRORS["PRICE_STALE"]! };
    const { data: q, error } = await (await admin()).rpc("crypto_quote_withdrawal", {
      p_user: context.userId, p_chain: data.chainId, p_usd_cents: data.usdCents,
    });
    if (error) return { ok: false as const, error: clean(error.message) };
    return { ok: true as const, quote: q as { quote_id: string; usd_cents: number; wei: string; price_micro_usd: number; expires_at: string } };
  });

export const requestCryptoWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ asset: z.enum(["USDC", "ETH"]), usdCents: z.number().int().positive().max(100_000_000), quoteId: z.string().uuid().nullable(), chainId: chainIdSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { envOkForAutoApproval } = await import("./chain.server");
    const envOk = await envOkForAutoApproval(data.chainId);
    const { data: r, error } = await (await admin()).rpc("crypto_request_withdrawal", {
      p_user: context.userId, p_chain: data.chainId, p_asset: data.asset, p_usd_cents: data.usdCents, p_quote: data.quoteId, p_env_ok: envOk,
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
