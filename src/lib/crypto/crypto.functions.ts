import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";
import { centsToWei } from "./allowlist";
import { usableDisplayPrice } from "./eth-price";
import { isTransientRpcFailure } from "./rpc-retry";
import { withdrawalCodeSchema } from "@/lib/auth-otp/withdrawal.functions";
import {
  bonusWithdrawBlockedMessage,
  parseWithdrawCashSnapshot,
  type WithdrawCashSnapshot,
} from "@/lib/crypto/bonus-withdraw";
import { publishedDepositAddress } from "./deposit";

const ERRORS: Record<string, string> = {
  WITHDRAWALS_PAUSED: "Withdrawals are paused right now.",
  BELOW_MINIMUM: "Amount is below the minimum for this network.",
  SELF_EXCLUDED: "Withdrawals are unavailable while self-excluded.",
  NO_VERIFIED_WALLET: "Enter a Base address that starts with 0x.",
  BAD_ADDRESS: "Enter a Base address that starts with 0x.",
  WALLET_CHANGE_COOLDOWN: "Withdrawals are paused for 24 hours after a wallet change.",
  WITHDRAWAL_PENDING: "You already have a withdrawal in progress.",
  DAILY_LIMIT: "This would exceed your daily withdrawal limit.",
  QUOTE_INVALID: "Quote not found. Get a new quote.",
  QUOTE_USED: "That quote was already used. Get a new quote.",
  QUOTE_EXPIRED: "The quote expired. Get a new quote.",
  QUOTE_MISMATCH: "Amount changed since the quote. Get a new quote.",
  INSUFFICIENT_BALANCE: "Not enough balance.",
  REFERRAL_PLAYTHROUGH:
    "Your $10 referral reward has to be wagered on Jackpot, Coinflip, Roulette, Slott, or Poker before that reward can be withdrawn.",
  PROMO_PLAYTHROUGH:
    "Promotional credit has to be wagered on Jackpot, Coinflip, Roulette, Slott, or Poker before that amount can be withdrawn.",
  BONUS_NOT_WITHDRAWABLE:
    "Your balance includes promo or bonus credit that cannot be cashed out yet. Deposit at least $20 on Base first; after that, bonus winnings can be withdrawn (minimum cashout $20). Winnings funded by another player's bonus stay bonus.",
  LEADERBOARD_PLAYTHROUGH:
    "Leaderboard prize money has to be wagered on Jackpot, Coinflip, Roulette, Slott, or Poker before that amount can be withdrawn.",
  PARTNER_WITHDRAWAL_BLOCKED: "You cant withdraw right now, try again later",
  PARTNER_FUNDS_HELD:
    "Balance from your partner period stays on the account. You can withdraw up to what you've deposited since.",
  PARTNER_PROFIT_REVIEW:
    "Part of your balance came from promotional partner-funded gameplay and is held for review. You can withdraw the rest.",
  PRICE_STALE: "ETH price unavailable right now. Try again shortly.",
  CANNOT_CANCEL: "This withdrawal can no longer be cancelled.",
  FORBIDDEN: "Admins only.",
  NOT_PENDING: "This withdrawal is no longer waiting for review.",
  CHAIN_DISABLED: "This network is not available right now.",
  ASSET_NOT_ALLOWLISTED: "This asset is not available.",
  TREASURY_UNAVAILABLE:
    "Withdrawals in this asset are temporarily unavailable. Choose another asset or try again later.",
  TREASURY_LIQUIDITY:
    "There isn't enough of this asset available to send this amount right now. Try a smaller amount or another asset.",
  BAD_AMOUNT: "Enter a whole number of base units, 0 or more.",
};
function clean(msg: string): string {
  const code = Object.keys(ERRORS).find((k) => msg.includes(k));
  return (code && ERRORS[code]) || "Something went wrong. Please try again.";
}

async function rpcCryptoMyActivity(
  db: Awaited<ReturnType<typeof admin>>,
  userId: string,
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error, status } = await db.rpc("crypto_my_activity", { p_user: userId });
    if (!error) return data;
    if (attempt === 1 || !isTransientRpcFailure({ code: error.code, status })) throw error;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

async function loadWithdrawSnapshot(
  db: Awaited<ReturnType<typeof admin>>,
  userId: string,
): Promise<WithdrawCashSnapshot | null> {
  // Only enriches an already-failed withdrawal's message; a failed read must not mask that error.
  const data = await rpcCryptoMyActivity(db, userId).catch(() => null);
  if (!data || typeof data !== "object") return null;
  return parseWithdrawCashSnapshot((data as Record<string, unknown>)["withdraw"]);
}

/** Map RPC failure using live withdraw snapshot when bonus floor blocked the amount. */
export function cleanWithdrawError(
  msg: string,
  withdraw: WithdrawCashSnapshot | null | undefined,
  amountCents?: number,
): string {
  if (msg.includes("BONUS_NOT_WITHDRAWABLE") && withdraw) {
    return bonusWithdrawBlockedMessage(withdraw, amountCents);
  }
  return clean(msg);
}
type RowResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
  status?: number;
};

type Filter = {
  select: (columns: string) => Filter;
  eq: (column: string, value: unknown) => Filter;
  order: (column: string, options?: { ascending?: boolean }) => Filter;
  limit: (count: number) => Filter;
  maybeSingle: () => Promise<RowResult>;
  single: () => Promise<RowResult>;
  insert: (row: Record<string, unknown>) => Promise<RowResult>;
  then: Promise<RowResult>["then"];
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as {
    from: (table: string) => Filter;
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<RowResult>;
  };
}

// Required: a missing chain must fail closed, never fall back to a default network.
const chainIdSchema = z.number().int().positive();
const assetKeySchema = z.string().regex(/^[A-Z0-9]{2,12}$/);

type EnabledAsset = {
  asset_key: string;
  decimals: number;
  settlement_kind: string;
  contract_address: string | null;
  usd_per_unit: number | string | null;
};

async function loadEnabledAsset(chainId: number, assetKey: string): Promise<EnabledAsset | null> {
  const { data } = await (
    await admin()
  )
    .from("chain_assets")
    .select("asset_key, decimals, settlement_kind, contract_address, usd_per_unit")
    .eq("chain_id", chainId)
    .eq("asset_key", assetKey)
    .eq("is_enabled", true)
    .maybeSingle();
  return (data as EnabledAsset | null) ?? null;
}

export const getEthDisplayPrice = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [{ data: settings }, { data: row }] = await Promise.all([
    db.from("crypto_settings").select("price_max_age_seconds").single(),
    db
      .from("crypto_price_snapshots")
      .select("price_micro_usd, observed_at, oracle_updated_at")
      .eq("chain_id", 8453)
      .eq("asset_key", "ETH")
      .order("observed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const priceRow = row as {
    price_micro_usd?: number;
    observed_at?: string;
    oracle_updated_at?: string;
  } | null;
  const ageRow = settings as { price_max_age_seconds?: number } | null;
  if (!priceRow?.observed_at || !priceRow.oracle_updated_at || !ageRow) return null;
  const priceMicroUsd = usableDisplayPrice({
    priceMicroUsd: Number(priceRow.price_micro_usd),
    observedAtMs: new Date(priceRow.observed_at).getTime(),
    oracleUpdatedAtMs: new Date(priceRow.oracle_updated_at).getTime(),
    nowMs: Date.now(),
    serverMaxAgeSeconds: Number(ageRow.price_max_age_seconds),
  });
  return priceMicroUsd ? { priceMicroUsd } : null;
});

export const getCryptoActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => {
    const db = await admin();
    const [{ data: settings }] = await Promise.all([
      db.from("crypto_settings").select("price_max_age_seconds").single(),
    ]);
    const data = await rpcCryptoMyActivity(db, context.userId);
    const activity = data as {
      chains?: {
        chain_id: number;
        assets?: {
          asset_key?: string;
          settlement_kind?: string;
          price_micro_usd?: number | null;
        }[];
      }[];
    } | null;
    if (!activity?.chains) return activity;
    const ageRow = settings as { price_max_age_seconds?: number } | null;
    const maxAge = Number(ageRow?.price_max_age_seconds);
    const pricing: Promise<void>[] = [];
    for (const chain of activity.chains) {
      for (const asset of chain.assets ?? []) {
        asset["price_micro_usd"] = null;
        if (
          asset["settlement_kind"] !== "native" ||
          asset["asset_key"] !== "ETH" ||
          !Number.isFinite(maxAge)
        )
          continue;
        pricing.push(
          (async () => {
            try {
              const { data: row } = await db
                .from("crypto_price_snapshots")
                .select("price_micro_usd, observed_at, oracle_updated_at")
                .eq("chain_id", chain.chain_id)
                .eq("asset_key", "ETH")
                .order("observed_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              const priceRow = row as {
                price_micro_usd?: number;
                observed_at?: string;
                oracle_updated_at?: string;
              } | null;
              if (!priceRow?.observed_at || !priceRow.oracle_updated_at) return;
              asset["price_micro_usd"] = usableDisplayPrice({
                priceMicroUsd: Number(priceRow.price_micro_usd),
                observedAtMs: new Date(priceRow.observed_at).getTime(),
                oracleUpdatedAtMs: new Date(priceRow.oracle_updated_at).getTime(),
                nowMs: Date.now(),
                serverMaxAgeSeconds: maxAge,
              });
            } catch {
              asset["price_micro_usd"] = null;
            }
          })(),
        );
      }
    }
    await Promise.all(pricing);
    return activity;
  });

export const prepareCryptoDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z
      .object({
        asset: assetKeySchema,
        usdCents: z.number().int().positive().max(100_000_000),
        chainId: chainIdSchema,
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const asset = await loadEnabledAsset(data.chainId, data.asset);
    if (!asset) return { ok: false as const, error: ERRORS["ASSET_NOT_ALLOWLISTED"]! };
    const [{ data: walletRows }, { loadChainEnv, snapshotEthPrice }] = await Promise.all([
      db
        .from("user_wallets")
        .select("normalized_address, is_primary")
        .eq("user_id", context.userId)
        .eq("is_verified", true),
      import("./chain.server"),
    ]);
    const checked = await loadChainEnv(data.chainId);
    if (
      !checked.ok ||
      !checked.env.settings.crypto_system_enabled ||
      !checked.env.settings.deposits_enabled
    ) {
      return { ok: false as const, error: "Deposits are unavailable right now." };
    }
    if (data.usdCents < Number(checked.env.network.min_deposit_cents)) {
      return { ok: false as const, error: ERRORS["BELOW_MINIMUM"]! };
    }
    const published = publishedDepositAddress(data.chainId, checked.env.treasury);
    if (!published.ok) return { ok: false as const, error: "Deposits are unavailable right now." };
    const verifiedRows = (walletRows ?? []) as {
      normalized_address?: string;
      is_primary?: boolean;
    }[];
    const verifiedAddresses = verifiedRows
      .map((row) => row.normalized_address)
      .filter(
        (value): value is string => typeof value === "string" && /^0x[0-9a-f]{40}$/.test(value),
      );
    const verified =
      verifiedRows.find((row) => row.is_primary)?.normalized_address ??
      verifiedAddresses[0] ??
      null;
    if (verifiedAddresses.length === 0) {
      return { ok: false as const, error: "Link the wallet you will send from." };
    }
    const destination = published.address;
    let units: bigint;
    let priceMicroUsd: number | null = null;
    let token: string | null = null;
    if (asset.settlement_kind === "erc20") {
      if (Number(asset.usd_per_unit) !== 1 || !asset.contract_address) {
        return { ok: false as const, error: ERRORS["ASSET_NOT_ALLOWLISTED"]! };
      }
      units = (BigInt(data.usdCents) * 10n ** BigInt(asset.decimals)) / 100n;
      token = asset.contract_address;
    } else if (asset.settlement_kind === "native" && asset.asset_key === "ETH") {
      const price = await snapshotEthPrice(checked.env).catch(() => null);
      if (!price) return { ok: false as const, error: ERRORS["PRICE_STALE"]! };
      units = centsToWei(BigInt(data.usdCents), price.priceMicro);
      priceMicroUsd = Number(price.priceMicro);
    } else {
      return { ok: false as const, error: ERRORS["ASSET_NOT_ALLOWLISTED"]! };
    }
    return {
      ok: true as const,
      instruction: {
        asset: asset.asset_key,
        chainId: data.chainId,
        treasury: destination,
        token: token as `0x${string}` | null,
        units: units.toString(),
      },
      verifiedAddress: verified,
      verifiedAddresses,
      usdCents: data.usdCents,
      priceMicroUsd,
    };
  });

export const quoteEthWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z
      .object({ usdCents: z.number().int().positive().max(100_000_000), chainId: chainIdSchema })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const asset = await loadEnabledAsset(data.chainId, "ETH");
    if (!asset || asset.settlement_kind !== "native")
      return { ok: false as const, error: ERRORS["ASSET_NOT_ALLOWLISTED"]! };
    const { loadChainEnv, snapshotEthPrice } = await import("./chain.server");
    const env = await loadChainEnv(data.chainId);
    if (!env.ok) return { ok: false as const, error: "Crypto rails are unavailable right now." };
    const price = await snapshotEthPrice(env.env).catch(() => null);
    if (!price) return { ok: false as const, error: ERRORS["PRICE_STALE"]! };
    const { data: q, error } = await (
      await admin()
    ).rpc("crypto_quote_withdrawal", {
      p_user: context.userId,
      p_chain: data.chainId,
      p_usd_cents: data.usdCents,
    });
    if (error) {
      const withdraw = await loadWithdrawSnapshot(await admin(), context.userId);
      return {
        ok: false as const,
        error: cleanWithdrawError(error.message, withdraw, data.usdCents),
      };
    }
    return {
      ok: true as const,
      quote: q as {
        quote_id: string;
        usd_cents: number;
        wei: string;
        price_micro_usd: number;
        expires_at: string;
      },
    };
  });

/** Early answer before a withdrawal code is emailed. The request decides again under the treasury lock. */
export const checkWithdrawalLiquidity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z
      .object({
        asset: assetKeySchema,
        usdCents: z.number().int().positive().max(100_000_000),
        chainId: chainIdSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const asset = await loadEnabledAsset(data.chainId, data.asset);
    if (!asset) return { ok: false as const, error: ERRORS["ASSET_NOT_ALLOWLISTED"]! };
    const { data: ok, error } = await (
      await admin()
    ).rpc("treasury_can_fund_cents", {
      p_network: `eip155:${data.chainId}`,
      p_asset: data.asset,
      p_cents: data.usdCents,
    });
    if (error || ok !== true) return { ok: false as const, error: ERRORS["TREASURY_LIQUIDITY"]! };
    return { ok: true as const };
  });

export const requestCryptoWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z
      .object({
        asset: assetKeySchema,
        usdCents: z.number().int().positive().max(100_000_000),
        quoteId: z.string().uuid().nullable(),
        chainId: chainIdSchema,
        toAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      })
      .merge(withdrawalCodeSchema)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const asset = await loadEnabledAsset(data.chainId, data.asset);
    if (!asset) return { ok: false as const, error: ERRORS["ASSET_NOT_ALLOWLISTED"]! };
    if (asset.settlement_kind === "native" && !data.quoteId)
      return { ok: false as const, error: ERRORS["QUOTE_INVALID"]! };
    const target = {
      rail: "evm" as const,
      chainId: data.chainId,
      asset: data.asset,
      usdCents: data.usdCents,
      address: data.toAddress,
    };
    const { noticeWithdrawal, verifyWithdrawalCode } =
      await import("@/lib/auth-otp/withdrawal.server");
    const verified = await verifyWithdrawalCode({
      userId: context.userId,
      challengeId: data.challengeId,
      code: data.code,
      target,
    });
    if (!verified.ok) return { ok: false as const, error: verified.error };
    const { data: linkedWallets } = await (
      await admin()
    )
      .from("user_wallets")
      .select("normalized_address")
      .eq("user_id", context.userId)
      .eq("is_verified", true);
    const linked = ((linkedWallets ?? []) as { normalized_address?: string | null }[])
      .map((row) => row.normalized_address)
      .filter((value): value is string => typeof value === "string");
    if (!linked.includes(data.toAddress.toLowerCase())) {
      return { ok: false as const, error: "Cash out to the wallet you linked." };
    }
    const { envOkForAutoApproval } = await import("./chain.server");
    const envOk = await envOkForAutoApproval(data.chainId);
    const { data: r, error } = await (
      await admin()
    ).rpc("crypto_request_withdrawal", {
      p_user: context.userId,
      p_chain: data.chainId,
      p_asset: data.asset,
      p_usd_cents: data.usdCents,
      p_quote: data.quoteId,
      p_env_ok: envOk,
      p_to_address: data.toAddress.toLowerCase(),
    });
    if (error) {
      const withdraw = await loadWithdrawSnapshot(await admin(), context.userId);
      return {
        ok: false as const,
        error: cleanWithdrawError(error.message, withdraw, data.usdCents),
      };
    }
    const result = r as { id: string; status: string };
    await noticeWithdrawal(context.userId, result.id, target);
    return { ok: true as const, result };
  });

export const cancelCryptoWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (
      await admin()
    ).rpc("crypto_cancel_withdrawal", { p_user: context.userId, p_id: data.id });
    return error ? { ok: false as const, error: clean(error.message) } : { ok: true as const };
  });

async function adminStepupError(context: { userId: string; claims: object }) {
  const { adminStepupOk } = await import("@/lib/admin/gate.server");
  const session = (context.claims as { session_id?: unknown }).session_id;
  const ok = await adminStepupOk(
    context.userId,
    typeof session === "string" ? { session_id: session } : {},
  );
  return ok ? null : "Enter your admin PIN to continue.";
}

export const getCryptoAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => {
    if (await adminStepupError(context)) return null;
    const db = await admin();
    const [{ data, error }, { data: treasury }] = await Promise.all([
      db.rpc("crypto_admin_overview", { p_admin: context.userId }),
      db.rpc("crypto_admin_treasury", { p_admin: context.userId }),
    ]);
    if (error || !data || typeof data !== "object") return null;
    return {
      ...(data as {
        settings: {
          crypto_system_enabled: boolean;
          deposits_enabled: boolean;
          withdrawals_enabled: boolean;
          price_max_age_seconds: number;
        };
        custody_cents: number;
        eth_books: {
          deposit_liability_cents?: number;
          withdrawn_cents?: number;
          pending_eth_cents?: number;
          pending_eth_wei?: string | number;
          pending_usdc_cents?: number;
          awaiting_valuation?: number;
        } | null;
        inventory: {
          chain_id: number;
          eth_price_micro_usd?: number | null;
          deposit_wei?: string;
          payout_wei?: string;
          observed_at: string;
          price_ok?: boolean;
          payout_usdc_units?: string | number;
          deposit_usdc_units?: string | number;
          hot_key_matches?: boolean | null;
        }[];
        pending: {
          id: string;
          username: string;
          asset_key: string;
          usd_cents: number;
          to_address: string;
          status: string;
        }[];
        unmatched: {
          id: string;
          asset_key: string;
          from_address: string;
          usd_cents: number;
          tx_hash: string;
        }[];
        incidents: {
          check_name: string;
          occurrences: number;
          last_seen_at: string;
          details: null;
        }[];
      }),
      treasury:
        (treasury as
          | {
              network: string;
              asset_key: string;
              decimals: number;
              total_units: string | null;
              reserved_units: string;
              min_reserve_units: string;
              available_units: string | null;
              total_cents: number | null;
              reserved_cents: number | null;
              available_cents: number | null;
              observed_at: string | null;
              fresh: boolean;
            }[]
          | null) ?? [],
    };
  });

export const setTreasuryMinReserve = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z
      .object({
        network: z.string().regex(/^(bitcoin|eip155:\d{1,12})$/),
        asset: assetKeySchema,
        units: z.string().regex(/^\d{1,40}$/),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const denied = await adminStepupError(context);
    if (denied) return { ok: false as const, error: denied };
    const { error } = await (
      await admin()
    ).rpc("crypto_admin_set_min_reserve", {
      p_admin: context.userId,
      p_network: data.network,
      p_asset: data.asset,
      p_units: data.units,
    });
    return error ? { ok: false as const, error: clean(error.message) } : { ok: true as const };
  });

export const reviewCryptoWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const denied = await adminStepupError(context);
    if (denied) return { ok: false as const, error: denied };
    const { error } = await (
      await admin()
    ).rpc("crypto_admin_review", {
      p_admin: context.userId,
      p_id: data.id,
      p_approve: data.approve,
    });
    return error ? { ok: false as const, error: clean(error.message) } : { ok: true as const };
  });

export const setCryptoSwitches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((d) =>
    z.object({ system: z.boolean(), deposits: z.boolean(), withdrawals: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const denied = await adminStepupError(context);
    if (denied) return { ok: false as const, error: denied };
    const { error } = await (
      await admin()
    ).rpc("crypto_admin_set_switches", {
      p_admin: context.userId,
      p_system: data.system,
      p_deposits: data.deposits,
      p_withdrawals: data.withdrawals,
    });
    return error ? { ok: false as const, error: clean(error.message) } : { ok: true as const };
  });

export const getBtcHotWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => {
    if (await adminStepupError(context)) return null;
    const { previewBtcHotWallet } = await import("./btcpay/sweep.server");
    return previewBtcHotWallet();
  });
