import {
  enabledChainIds,
  runDepositWatcher,
  runReconciliation,
  runWithdrawalWorker,
} from "./chain.server";
import { DEPOSIT_GATE_SECONDS, SWEEP_GATE_SECONDS } from "./job-budget";
import { logCryptoOps } from "./ops-log";
import { applyWorkerEnv, workerEnv } from "@/lib/worker-env";

export { applyWorkerEnv };

function stageFields(result: unknown): Record<string, string | number | boolean> {
  if (!result || typeof result !== "object") return {};
  const row = result as Record<string, unknown>;
  const out: Record<string, string | number | boolean> = {};
  for (const key of [
    "ok",
    "skipped",
    "mode",
    "error",
    "reason",
    "observed",
    "credited",
    "creditDeferred",
    "paused",
  ]) {
    const value = row[key];
    if (typeof value === "number" || typeof value === "boolean") out[key] = value;
    else if (typeof value === "string") out[key] = value.slice(0, 80);
  }
  const stages = row["stages"];
  if (stages && typeof stages === "object") {
    for (const [key, value] of Object.entries(stages as Record<string, unknown>)) {
      if (typeof value === "number") out[`stage_${key}`] = value;
    }
  }
  const actions = row["actions"];
  if (Array.isArray(actions)) out["actions"] = actions.length;
  return out;
}

/** Personal-address sweeps are retired. This never reads a key and never signs. */
async function retiredDepositSweep(_chainId: number): Promise<{
  ok: true;
  skipped: true;
  mode: "retired";
}> {
  return { ok: true, skipped: true, mode: "retired" };
}

const JOBS = {
  deposits: { gapSeconds: DEPOSIT_GATE_SECONDS, perChain: runDepositWatcher },
  withdrawals: { gapSeconds: 40, perChain: runWithdrawalWorker },
  // The scheduler may still call this route. It does not derive, sign, or move funds.
  sweeps: { gapSeconds: SWEEP_GATE_SECONDS, perChain: retiredDepositSweep },
} as const;

/**
 * Entry point for scheduled crypto jobs. Each job is throttled and single-flight
 * in the database, and every job is idempotent — calling it early can only
 * re-do work already due, never grant anything. Chain-scoped jobs run once per
 * enabled chain; reconciliation runs once across all chains.
 */
export async function handleCryptoJob(
  name: keyof typeof JOBS | "reconcile" | "btcpay",
  request: Request,
): Promise<Response> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Authentication: only the scheduler holds the job token (the database stores its SHA-256).
  const token = /^Bearer ([0-9a-f]{64})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });
  const { data: authed } = await supabaseAdmin.rpc(
    "crypto_verify_job_token" as never,
    { p_token: token } as never,
  );
  if (authed !== true) return new Response("Unauthorized", { status: 401 });
  const gapSeconds = name === "reconcile" ? 3000 : name === "btcpay" ? 40 : JOBS[name].gapSeconds;
  const { data: go } = await supabaseAdmin.rpc(
    "crypto_run_gate" as never,
    { p_name: name, p_seconds: gapSeconds } as never,
  );
  if (!go) return Response.json({ ok: true, skipped: true });
  try {
    if (name === "reconcile") {
      const result = await runReconciliation();
      return Response.json({ ok: true, result });
    }
    if (name === "btcpay") {
      const { reconcileBtcpayInvoices } = await import("./btcpay/reconcile.server");
      const invoices = await reconcileBtcpayInvoices();
      const { reconcileBtcpayPayouts } = await import("./btcpay/payout.server");
      const payouts = await reconcileBtcpayPayouts();
      if (!invoices.ok)
        return Response.json({ ok: false, error: invoices.reason }, { status: 500 });
      if (!payouts.ok) return Response.json({ ok: false, error: payouts.reason }, { status: 500 });
      return Response.json({ ok: true, result: { invoices, payouts } });
    }
    const chains = await enabledChainIds();
    const results: Record<string, unknown> = {};
    for (const chainId of chains) {
      const started = Date.now();
      const result = await JOBS[name].perChain(chainId);
      results[String(chainId)] = result;
      logCryptoOps("crypto_job_stage", {
        job: name,
        chainId,
        durationMs: Date.now() - started,
        ...stageFields(result),
      });
    }
    const sweepFailed =
      name === "sweeps" &&
      Object.values(results).some(
        (row) => !!row && typeof row === "object" && (row as { ok?: boolean }).ok === false,
      );
    return Response.json({ ok: !sweepFailed, job: name, results });
  } catch (e) {
    const message = (e as Error).message ?? "failed";
    console.error(`[crypto:${name}]`, message.replace(/https?:\/\/\S+/g, "[rpc]").slice(0, 240));
    const error = /Too many subrequests/i.test(message) ? "SUBREQUEST_LIMIT" : "JOB_FAILED";
    return Response.json({ ok: false, error }, { status: 500 });
  }
}

/**
 * Reads worker heartbeats from the database. Cloudflare's own minute schedule
 * calls this, so a stopped pg_cron still produces the settlement_worker_stale
 * incident. The function does not settle or move money.
 */
async function reportSettlementWorkerHealth(): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("settlement_worker_health" as never);
    if (error) {
      console.error("[settlement:health]", String(error.message).slice(0, 120));
      return;
    }
    const row = (data ?? {}) as { stale?: number; exhausted?: number };
    console.log(`[settlement:health] stale=${row.stale ?? "?"} exhausted=${row.exhausted ?? "?"}`);
  } catch (e) {
    console.error("[settlement:health]", e instanceof Error ? e.message.slice(0, 120) : "failed");
  }
}

/** Cloudflare cron: same auth as the HTTP cron routes. */
export async function runScheduledCryptoJobs(): Promise<void> {
  await reportSettlementWorkerHealth();
  const token = workerEnv("CRYPTO_JOB_TOKEN");
  if (!token) {
    console.error("[crypto] CRYPTO_JOB_TOKEN missing");
    return;
  }
  const headers = { authorization: `Bearer ${token}` };
  // Deposits and Base sweeps are not in this invocation. pg_cron calls each
  // route on its own, with a fresh subrequest budget. Scanning logs here used up the budget and
  // Cloudflare killed the isolate (1102) before a treasury reading was stored.
  // The BTC reading expires after 10 minutes, so store it before withdrawals.
  // Those can spend the subrequest budget and then the BTCPay job cannot write.
  const { refreshBtcTreasury } = await import("./btcpay/payout.server");
  console.log(`[crypto:btc-treasury] ${await refreshBtcTreasury()}`);
  const { maintainBtcHotWallet } = await import("./btcpay/sweep.server");
  console.log(`[crypto:btc-float] ${await maintainBtcHotWallet()}`);
  // Withdrawals stay ahead of BTCPay payout reconcile.
  for (const name of ["withdrawals", "btcpay", "reconcile"] as const) {
    const req = new Request("https://internal/crypto-cron", { method: "POST", headers });
    const res = await handleCryptoJob(name, req);
    const body = await res.text();
    // Status only. The JSON body names withdrawal ids, which do not belong in the log.
    let summary = String(res.status);
    try {
      const parsed = JSON.parse(body) as { ok?: boolean; error?: unknown; skipped?: boolean };
      if (typeof parsed.error === "string") summary += " " + parsed.error.slice(0, 80);
      else if (parsed.skipped === true) summary += " skipped";
      else if (parsed.ok === true) summary += " ok";
    } catch {
      summary += " unreadable";
    }
    console.log(`[crypto:${name}] ${summary}`);
    // Stop the minute run once the Worker subrequest budget is gone so later
    // jobs do not look like auth failures (401) when the verify RPC cannot run.
    if (/SUBREQUEST_LIMIT|Too many subrequests/i.test(body)) break;
  }
}
