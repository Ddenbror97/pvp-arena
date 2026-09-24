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
export async function handleCryptoJob(name: keyof typeof JOBS, request: Request): Promise<Response> {
  const job = JOBS[name];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Authentication: only the scheduler holds the job token (the database stores its SHA-256).
  const token = /^Bearer ([0-9a-f]{64})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return new Response("Unauthorized", { status: 401 });
  const { data: authed } = await supabaseAdmin.rpc("crypto_verify_job_token" as never, { p_token: token } as never);
  if (authed !== true) return new Response("Unauthorized", { status: 401 });
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
