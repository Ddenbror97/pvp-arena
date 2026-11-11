import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The minute crypto schedule (jobs.server.ts): one token check for the run, and a deposit
 * scan that could not read the chain is reported as a failed run.
 */
const TOKEN = "a".repeat(64);
const rpc = vi.fn();
const deposits = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));
vi.mock("@/lib/worker-env", () => ({
  applyWorkerEnv: () => {},
  workerEnv: (key: string) => (key === "CRYPTO_JOB_TOKEN" ? TOKEN : undefined),
}));
vi.mock("../src/lib/crypto/chain.server", () => ({
  enabledChainIds: async () => [8453],
  runDepositWatcher: (chain: number) => deposits(chain),
  runWithdrawalWorker: async () => ({ ok: true }),
  runReconciliation: async () => ({ ok: true }),
}));
vi.mock("../src/lib/crypto/btcpay/payout.server", () => ({
  refreshBtcTreasury: async () => "ok",
  reconcileBtcpayPayouts: async () => ({ ok: true }),
}));
vi.mock("../src/lib/crypto/btcpay/sweep.server", () => ({
  maintainBtcHotWallet: async () => "ok",
}));
vi.mock("../src/lib/crypto/btcpay/reconcile.server", () => ({
  reconcileBtcpayInvoices: async () => ({ ok: true }),
}));
vi.mock("../src/lib/crypto/ops-log", () => ({ logCryptoOps: () => {} }));

const calls = (name: string) => rpc.mock.calls.filter((c) => c[0] === name).length;
let tokenOk = true;

beforeEach(() => {
  tokenOk = true;
  rpc.mockReset();
  rpc.mockImplementation(async (name: string) => {
    if (name === "crypto_verify_job_token") return { data: tokenOk };
    if (name === "crypto_run_gate") return { data: true };
    return { data: {}, error: null };
  });
  deposits.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("crypto job schedule", () => {
  it("checks the job token once for the minute run and still runs all three jobs", async () => {
    const { runScheduledCryptoJobs } = await import("../src/lib/crypto/jobs.server");
    await runScheduledCryptoJobs();
    expect(calls("crypto_verify_job_token")).toBe(1);
    expect(
      rpc.mock.calls.filter((c) => c[0] === "crypto_run_gate").map((c) => c[1].p_name),
    ).toEqual(["withdrawals", "btcpay", "reconcile"]);
  });

  it("runs nothing when the token is rejected", async () => {
    tokenOk = false;
    const { runScheduledCryptoJobs } = await import("../src/lib/crypto/jobs.server");
    await runScheduledCryptoJobs();
    expect(calls("crypto_run_gate")).toBe(0);
  });

  it("the HTTP route still authenticates every request", async () => {
    const { handleCryptoJob } = await import("../src/lib/crypto/jobs.server");
    const request = (auth?: string) =>
      new Request("https://site.test/api/public/cron/crypto-deposits", {
        method: "POST",
        headers: auth ? { authorization: auth } : {},
      });
    deposits.mockResolvedValue({ ok: true, observed: 0 });
    expect((await handleCryptoJob("deposits", request())).status).toBe(401);
    expect((await handleCryptoJob("deposits", request("Bearer short"))).status).toBe(401);
    expect(calls("crypto_verify_job_token")).toBe(0);
    tokenOk = false;
    expect((await handleCryptoJob("deposits", request(`Bearer ${TOKEN}`))).status).toBe(401);
    expect(deposits).not.toHaveBeenCalled();
    tokenOk = true;
    const ok = await handleCryptoJob("deposits", request(`Bearer ${TOKEN}`));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, job: "deposits" });
  });

  it("reports a deposit scan that could not read the chain as a failed run", async () => {
    const { handleCryptoJob } = await import("../src/lib/crypto/jobs.server");
    deposits.mockResolvedValue({
      ok: true,
      cursor: 53246268,
      passes: 0,
      usdcError: "Requested resource not available.",
    });
    const response = await handleCryptoJob(
      "deposits",
      new Request("https://site.test/x", {
        method: "POST",
        headers: { authorization: `Bearer ${TOKEN}` },
      }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false, job: "deposits" });
  });
});
