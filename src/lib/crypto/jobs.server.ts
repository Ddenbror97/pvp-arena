import { runDepositWatcher, runReconciliation, runWithdrawalWorker } from "./chain.server";

const JOBS = {
  deposits: { gapSeconds: 40, run: runDepositWatcher },
  withdrawals: { gapSeconds: 40, run: runWithdrawalWorker },
  reconcile: { gapSeconds: 3000, run: runReconciliation },
} as const;

/**
 * Entry point for scheduled crypto jobs. Each job is throttled and single-flight
 * in the database, and every job is idempotent — calling it early can only
 * re-do work already due, never grant anything.
 */
export async function handleCryptoJob(name: keyof typeof JOBS): Promise<Response> {
  const job = JOBS[name];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: go } = await supabaseAdmin.rpc("crypto_run_gate" as never, { p_name: name, p_seconds: job.gapSeconds } as never);
  if (!go) return Response.json({ ok: true, skipped: true });
  try {
    const result = await job.run();
    return Response.json({ ok: true, result });
  } catch (e) {
    console.error(`[crypto:${name}]`, (e as Error).message);
    return Response.json({ ok: false }, { status: 500 });
  }
}
