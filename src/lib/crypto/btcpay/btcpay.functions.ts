import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";
import { readBtcpayConfig, readBtcpayPayoutConfig } from "./config.server";
import {
  createBtcInvoiceForUser,
  loadBtcInvoice,
  loadDepositTraceTxid,
  loadLatestOpenBtcInvoice,
  reconcileInvoiceSeen,
} from "./reconcile.server";
import { cancelBtcPayout, loadLatestPayoutTxid, requestBtcPayout } from "./payout.server";

export const getBtcDepositConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async () => {
    const config = readBtcpayConfig();
    if (!config.ok || !config.enabled) return { enabled: false as const };
    return {
      enabled: true as const,
      network: config.network,
      minCents: config.minCents,
      requiredConfirmations: config.requiredConfirmations,
    };
  });

export const createBtcInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((data) =>
    z.object({ usdCents: z.number().int().positive().max(100_000_000) }).parse(data),
  )
  .handler(async ({ data, context }) => createBtcInvoiceForUser(context.userId, data.usdCents));

export const getOpenBtcInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => {
    const row = await loadLatestOpenBtcInvoice(context.userId);
    if (!row) return { ok: false as const };
    return {
      ok: true as const,
      id: row.id,
      invoice: {
        id: row.id,
        status: row.status,
        address: row.address,
        btcDue: row.btc_due,
        usdCents: row.usd_cents,
        expiresAt: row.expires_at,
        network: row.network,
        requiredConfirmations: row.required_confirmations,
        txid: await loadDepositTraceTxid(row.id),
      },
    };
  });

export const getBtcInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), refresh: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const row = await loadBtcInvoice(context.userId, data.id);
    if (!row) return { ok: false as const, error: "Invoice not found." };
    const snapshot = (fresh: typeof row, txid: string | null) => ({
      ok: true as const,
      invoice: {
        id: fresh.id,
        status: fresh.status,
        address: fresh.address,
        btcDue: fresh.btc_due,
        usdCents: fresh.usd_cents,
        expiresAt: fresh.expires_at,
        network: fresh.network,
        requiredConfirmations: fresh.required_confirmations,
        txid,
      },
    });
    const live = row.status === "NEW" || row.status === "PROCESSING" || row.status === "SETTLED";
    const watching = row.status === "PROCESSING" || row.status === "SETTLED";
    const config = readBtcpayConfig();
    let txid: string | null = null;
    let fresh = row;
    if (config.ok && config.enabled && live && (data.refresh || !row.address || watching)) {
      const seen = await reconcileInvoiceSeen(config, row).catch(() => null);
      txid = seen?.txid ?? null;
      fresh = (await loadBtcInvoice(context.userId, data.id)) ?? row;
    }
    if (!txid) txid = await loadDepositTraceTxid(fresh.id);
    return snapshot(fresh, txid);
  });

export const getBtcCashoutTrace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => ({
    txid: await loadLatestPayoutTxid(context.userId),
  }));

export const getBtcPayoutConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async () => {
    const config = readBtcpayPayoutConfig();
    if (!config.ok || !config.enabled) return { enabled: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (
      supabaseAdmin as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc("treasury_can_fund_cents", {
      p_network: "bitcoin",
      p_asset: "BTC",
      p_cents: config.minCents,
    });
    return {
      enabled: true as const,
      available: data === true,
      minCents: config.minCents,
      autoCents: config.autoCents,
    };
  });

export const requestBtcCashout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((data) =>
    z
      .object({
        usdCents: z.number().int().positive().max(100_000_000),
        address: z.string().min(14).max(120),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const target = { rail: "btc" as const, usdCents: data.usdCents, address: data.address };
    const { noticeWithdrawal, withdrawalBlocked } =
      await import("@/lib/auth-otp/withdrawal.server");
    const blocked = await withdrawalBlocked(context.userId);
    if (blocked) return { ok: false as const, error: blocked };
    const result = await requestBtcPayout(context.userId, data.usdCents, data.address);
    if (result.ok) await noticeWithdrawal(context.userId, result.id, target);
    return result;
  });

export const cancelBtcCashout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => cancelBtcPayout(context.userId, data.id));
