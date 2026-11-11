/**
 * BTCPay calls that get no answer (audit, 2026-11-11). A server that accepts the connection and
 * says nothing must not hold the minute job or the wallet page, and a write that got no answer
 * must never be taken for a write that did not happen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env: Record<string, string> = {
  BTCPAY_NETWORK: "mainnet",
  BTCPAY_URL: "https://btcpay.example",
  BTCPAY_STORE_ID: "deposit-store",
  BTCPAY_API_KEY: "deposit-key",
  BTCPAY_WEBHOOK_SECRET: "hook",
  BTCPAY_PAYOUTS_ENABLED: "true",
  BTCPAY_PAYOUT_STORE_ID: "payout-store",
  BTCPAY_PAYOUT_API_KEY: "payout-key",
  BTCPAY_SWEEP_API_KEY: "sweep-key",
};
vi.mock("@/lib/worker-env", () => ({ workerEnv: (key: string) => env[key] }));
const rpcCalls: Array<[string, Record<string, unknown> | undefined]> = [];
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (name: string, args?: Record<string, unknown>) => {
      rpcCalls.push([name, args]);
      if (name === "btc_wallet_transfer_state")
        return { data: { swept_sats: 0, cooling_down: false }, error: null };
      if (name === "btc_wallet_transfer_begin") return { data: "transfer-1", error: null };
      return { data: null, error: null };
    },
  },
}));

const config = {
  ok: true as const,
  enabled: true as const,
  url: "https://btcpay.example",
  storeId: "payout-store",
  apiKey: "payout-key",
  webhookSecret: "hook",
  onchainMethod: "BTC",
  minCents: 2000,
  autoCents: 0,
};
type Answer = (url: string, init: { method: string }) => Response | Promise<Response>;
let answer: Answer;
let requests: Array<{ url: string; method: string }>;
const silent: Answer = () => Promise.reject(new DOMException("timed out", "TimeoutError"));

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  requests = [];
  rpcCalls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { method: string; signal?: AbortSignal }) => {
      requests.push({ url, method: init.method });
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return answer(url, init);
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("BTCPay client", () => {
  it("gives up on a silent server, then fails later reads at once until it is asked again", async () => {
    const client = await import("../src/lib/crypto/btcpay/client.server");
    answer = silent;
    await expect(client.getPayout(config, "p1")).rejects.toBeInstanceOf(client.BtcpayUnreachable);
    expect(requests).toHaveLength(1);
    // The next reads of the same run do not each wait for the server.
    await expect(client.getPayout(config, "p2")).rejects.toBeInstanceOf(client.BtcpayUnreachable);
    await expect(client.getBtcUsdRate(config)).rejects.toBeInstanceOf(client.BtcpayUnreachable);
    expect(requests).toHaveLength(1);

    vi.advanceTimersByTime(client.BTCPAY_DOWN_MS + 1);
    answer = () => Response.json({ id: "p1" });
    expect(await client.getPayout(config, "p1")).toEqual({ id: "p1" });
    expect(await client.getPayout(config, "p2")).toEqual({ id: "p1" });
    expect(requests).toHaveLength(3);
  });

  it("always sends a write, and reports no answer as unknown, not as refused", async () => {
    const client = await import("../src/lib/crypto/btcpay/client.server");
    answer = silent;
    await expect(client.getPayout(config, "p1")).rejects.toBeInstanceOf(client.BtcpayUnreachable);
    const sent = client.createPayout(config, "bc1qexample", "0.00010000", "order");
    await expect(sent).rejects.toBeInstanceOf(client.BtcpayUnreachable);
    await expect(sent).rejects.not.toBeInstanceOf(client.BtcpayError);
    expect(requests.map((r) => r.method)).toEqual(["GET", "POST"]);
  });

  it("keeps an HTTP refusal a refusal, without treating the server as down", async () => {
    const client = await import("../src/lib/crypto/btcpay/client.server");
    answer = () => new Response("no", { status: 422 });
    await expect(client.getPayout(config, "p1")).rejects.toMatchObject({ status: 422 });
    await expect(client.getPayout(config, "p1")).rejects.toMatchObject({ status: 422 });
    expect(requests).toHaveLength(2);
  });
});

describe("deposit-wallet top-up with no answer from BTCPay", () => {
  const wallets: Answer = (url) => {
    if (url.endsWith("/wallet/address"))
      return Response.json({ address: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4" });
    if (url.includes("/rates")) return Response.json([{ currencyPair: "BTC_USD", rate: "100000" }]);
    // 0.01 BTC = $1,000 in the deposit wallet.
    return Response.json({ confirmedBalance: "0.01000000" });
  };

  it("leaves the transfer in progress instead of recording it as not sent", async () => {
    answer = (url, init) => (init.method === "POST" ? silent(url, init) : wallets(url, init));
    const { maintainBtcHotWallet } = await import("../src/lib/crypto/btcpay/sweep.server");
    expect(await maintainBtcHotWallet()).toBe("cooldown");
    expect(requests.filter((r) => r.method === "POST")).toHaveLength(1);
    expect(rpcCalls.map((c) => c[0])).toContain("btc_wallet_transfer_begin");
    expect(rpcCalls.map((c) => c[0])).not.toContain("btc_wallet_transfer_finish");
  });

  it("records a refusal as not sent, as before", async () => {
    answer = (url, init) =>
      init.method === "POST" ? new Response("no", { status: 422 }) : wallets(url, init);
    const { maintainBtcHotWallet } = await import("../src/lib/crypto/btcpay/sweep.server");
    expect(await maintainBtcHotWallet()).toBe("refused");
    expect(rpcCalls.find((c) => c[0] === "btc_wallet_transfer_finish")?.[1]).toMatchObject({
      p_id: "transfer-1",
      p_ok: false,
    });
  });
});
