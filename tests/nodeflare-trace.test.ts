import { describe, expect, it } from "vitest";
import {
  callTracerOutcome,
  checkTraceUrl,
  classifyTraceBody,
  mayCreditInternal,
  nodeflareCall,
  traceCooldownElapsed,
  traceDepositBlock,
  traceFilterOutcome,
  traceRetryDelayMs,
  TRACE_USER_AGENT,
} from "../src/lib/crypto/nodeflare-trace";
import {
  internalSearchFloor,
  nativeTransfersAgree,
  sameInternalPayout,
} from "../src/lib/crypto/transfer-match";
import { erc20LogMatches } from "../src/lib/crypto/transfer-match";

const deposit = "0x989642fd0d3e78296081a9417fac253460f2a0c0";
const other = "0x1111111111111111111111111111111111111111";
const exchange = "0xbf2f1213f47e76f1c1d9b7a536f2cb8b347d59b4";
const parent = "0x" + "ab".repeat(32);
const second = "0x" + "cd".repeat(32);
const block = 52_705_282n;
const payout = 3_138_330_000_000_000n;
const otherPayout = 1_000_000_000_000_000n;
const traceUrl = "https://rpc.nodeflare.app/base/v1/example-key";

function row(
  hash: string,
  to: string,
  value: bigint,
  extra?: { error?: string; traceAddress?: number[] },
) {
  return {
    transactionHash: hash,
    blockNumber: "0x" + block.toString(16),
    traceAddress: extra?.traceAddress ?? [0, 1],
    type: "call",
    error: extra?.error,
    action: { from: exchange, to, value: "0x" + value.toString(16), callType: "call" },
  };
}

const successFilter = [
  row(parent, exchange, 0n, { traceAddress: [0] }),
  row(parent, deposit, payout, { traceAddress: [0, 1] }),
  row(parent, other, otherPayout, { traceAddress: [0, 2] }),
  row(parent, deposit, payout, { error: "Reverted", traceAddress: [0, 3] }),
];

describe("NodeFlare trace URL", () => {
  it("accepts a keyed Base URL and rejects the public endpoint without echoing the key", () => {
    const secret = "super-secret-key";
    expect(checkTraceUrl(`https://rpc.nodeflare.app/base/v1/${secret}`)).toEqual({ ok: true });
    const rejected = [
      checkTraceUrl(undefined),
      checkTraceUrl("https://rpc.nodeflare.app/base/public"),
      checkTraceUrl("https://rpc.nodeflare.app/base/v1/public"),
      checkTraceUrl("https://base-mainnet.core.chainstack.com/abc"),
      checkTraceUrl("http://rpc.nodeflare.app/base/v1/example"),
    ];
    expect(rejected.map((item) => ("reason" in item ? item.reason : "ok"))).toEqual([
      "TRACE_URL_MISSING",
      "TRACE_URL_PATH",
      "TRACE_URL_PUBLIC",
      "TRACE_URL_HOST",
      "TRACE_URL_NOT_HTTPS",
    ]);
    expect(JSON.stringify(rejected)).not.toContain(secret);
  });
});

describe("internal ETH trace decisions", () => {
  it("credits a successful internal transfer and ignores the zero-value parent", () => {
    const parsed = traceFilterOutcome(successFilter, [deposit], block);
    expect("settled" in parsed).toBe(true);
    if (!("settled" in parsed)) return;
    expect(parsed.settled.status).toBe("recorded");
    expect(parsed.settled.transfers).toHaveLength(1);
    expect(parsed.settled.transfers[0]).toMatchObject({ hash: parent, to: deposit, value: payout });
    expect(mayCreditInternal(parsed.settled.status)).toBe(true);
  });

  it("credits two different internal amounts in one transaction", () => {
    const parsed = traceFilterOutcome(
      [row(parent, deposit, payout), row(second, deposit, otherPayout, { traceAddress: [1] })],
      [deposit],
      block,
    );
    expect("settled" in parsed && parsed.settled.transfers.map((tx) => tx.value)).toEqual([
      payout,
      otherPayout,
    ]);
  });

  it("ignores an unrelated recipient, a revert, and a zero-value call", () => {
    const parsed = traceFilterOutcome(successFilter, [deposit], block);
    const unrelated = traceFilterOutcome(successFilter, [other], block);
    expect(
      "settled" in parsed &&
        parsed.settled.transfers.every((tx) => tx.to.toLowerCase() === deposit),
    ).toBe(true);
    expect("settled" in unrelated && unrelated.settled.transfers).toHaveLength(1);
    expect("settled" in unrelated && unrelated.settled.transfers[0]?.value).toBe(otherPayout);
  });

  it("does not credit a malformed, unsupported, or empty trace", () => {
    expect(traceFilterOutcome({ result: [] }, [deposit], block)).toEqual({ problem: "malformed" });
    expect(traceFilterOutcome([], [deposit], block)).toEqual({
      settled: { transfers: [], status: "none" },
    });
    expect(mayCreditInternal("open")).toBe(false);
    expect(mayCreditInternal("none")).toBe(false);
    expect(classifyTraceBody(200, { error: { code: -32601, message: "method not found" } })).toBe(
      "unsupported",
    );
    expect(classifyTraceBody(200, { result: null })).toBe("malformed");
    expect(
      classifyTraceBody(429, { error: "rate_limit_exceeded", message: "Rate limit exceeded" }),
    ).toBe("rate_limit");
    expect(
      classifyTraceBody(429, {
        error: "monthly_limit_reached",
        message: "Monthly quota exhausted",
      }),
    ).toBe("quota");
    expect(classifyTraceBody(500, { error: "upstream" })).toBe("http");
    expect(classifyTraceBody(504, {})).toBe("timeout");
  });

  it("keeps one log index when the same trace is scanned twice", () => {
    const once = traceFilterOutcome(successFilter, [deposit], block);
    const twice = traceFilterOutcome(successFilter, [deposit], block);
    expect("settled" in once && "settled" in twice).toBe(true);
    if (!("settled" in once) || !("settled" in twice)) return;
    expect(twice.settled.transfers.map((tx) => tx.logIndex)).toEqual(
      once.settled.transfers.map((tx) => tx.logIndex),
    );
    const first = once.settled.transfers[0]!;
    expect(
      sameInternalPayout(
        { logIndex: first.logIndex + 1, to: deposit, units: payout.toString() },
        first.logIndex,
        deposit,
        payout,
      ),
    ).toBe(true);
  });

  it("does not advance the internal search off an unverified block", () => {
    expect(internalSearchFloor(block)).toBe(0n);
    expect(internalSearchFloor(block + 10_000_000n)).toBe(0n);
    expect(
      traceCooldownElapsed(
        Date.parse("2026-10-18T17:00:00Z"),
        "quota",
        Date.parse("2026-10-18T17:30:00Z"),
      ),
    ).toBe(false);
    expect(
      traceCooldownElapsed(
        Date.parse("2026-10-18T17:00:00Z"),
        "quota",
        Date.parse("2026-10-18T18:00:00Z"),
      ),
    ).toBe(true);
    expect(
      traceCooldownElapsed(
        Date.parse("2026-10-18T17:00:00Z"),
        "proved",
        Date.parse("2026-10-18T17:09:00Z"),
      ),
    ).toBe(false);
    expect(traceRetryDelayMs("quota", 0)).toBeNull();
    expect(traceRetryDelayMs("rate_limit", 0)).toBe(1_000);
    expect(traceRetryDelayMs("rate_limit", 1)).toBeNull();
  });
});

describe("NodeFlare request behavior", () => {
  const tree = {
    from: "0x" + "22".repeat(20),
    to: exchange,
    value: "0x0",
    type: "CALL",
    calls: [
      { from: exchange, to: deposit, value: "0x" + payout.toString(16), type: "CALL" },
      { from: exchange, to: other, value: "0x" + otherPayout.toString(16), type: "CALL" },
      {
        from: exchange,
        to: deposit,
        value: "0x" + payout.toString(16),
        type: "CALL",
        error: "execution reverted",
      },
    ],
  };

  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("reads the same payout from callTracer when trace_filter is unsupported", async () => {
    const methods: string[] = [];
    const outcome = await traceDepositBlock({
      url: traceUrl,
      block,
      targets: [deposit],
      candidateHashes: async () => [parent],
      call: async (_url, method) => {
        methods.push(method);
        if (method === "trace_filter") return { ok: false, problem: "unsupported", attempts: 1 };
        const parsed = callTracerOutcome(tree, [deposit], block, parent);
        if ("problem" in parsed) throw new Error("fixture");
        return { ok: true, result: tree, attempts: 1 };
      },
    });
    expect(methods).toEqual(["trace_filter", "debug_traceTransaction"]);
    expect(outcome.settled.status).toBe("recorded");
    expect(outcome.settled.transfers).toHaveLength(1);
    expect(outcome.settled.transfers[0]?.value).toBe(payout);
    expect(outcome.problem).toBeUndefined();
  });

  it("does not fall through to debug when trace_filter is rate limited, down, or malformed", async () => {
    for (const problem of ["rate_limit", "quota", "timeout", "http", "unavailable"] as const) {
      const methods: string[] = [];
      const outcome = await traceDepositBlock({
        url: traceUrl,
        block,
        targets: [deposit],
        candidateHashes: async () => [parent],
        call: async (_url, method) => {
          methods.push(method);
          return { ok: false, problem, attempts: problem === "quota" ? 1 : 2 };
        },
      });
      expect(methods).toEqual(["trace_filter"]);
      expect(outcome.settled).toEqual({ transfers: [], status: "open" });
      expect(outcome.problem).toBe(problem);
      expect(mayCreditInternal(outcome.settled.status)).toBe(false);
    }
    const malformed = await traceDepositBlock({
      url: traceUrl,
      block,
      targets: [deposit],
      candidateHashes: async () => [parent],
      call: async () => ({ ok: true, result: { unexpected: true }, attempts: 1 }),
    });
    expect(malformed.problem).toBe("malformed");
    expect(malformed.settled.transfers).toEqual([]);
  });

  it("retries a rate limit or outage once, and does not retry quota exhaustion", async () => {
    const sleeps: number[] = [];
    const rate = await nodeflareCall(traceUrl, "trace_filter", [], {
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      fetchImpl: (() => {
        let n = 0;
        return async (_url, init) => {
          expect(new Headers(init.headers).get("user-agent")).toBe(TRACE_USER_AGENT);
          expect(String(init.body)).not.toContain("example-key");
          n++;
          if (n === 1)
            return jsonResponse(429, {
              error: "rate_limit_exceeded",
              message: "Rate limit exceeded",
            });
          return jsonResponse(200, { jsonrpc: "2.0", id: 1, result: successFilter });
        };
      })(),
    });
    expect(sleeps).toEqual([1_000]);
    expect(rate.ok).toBe(true);
    if (rate.ok) expect(rate.attempts).toBe(2);

    const quotaSleeps: number[] = [];
    const quota = await nodeflareCall(traceUrl, "trace_filter", [], {
      sleep: async (ms) => {
        quotaSleeps.push(ms);
      },
      fetchImpl: async () =>
        jsonResponse(429, { error: "monthly_limit_reached", message: "Monthly quota exhausted" }),
    });
    expect(quota).toMatchObject({ ok: false, problem: "quota", attempts: 1 });
    expect(quotaSleeps).toEqual([]);

    let tries = 0;
    const recovered = await nodeflareCall(
      traceUrl,
      "debug_traceTransaction",
      [parent, { tracer: "callTracer" }],
      {
        sleep: async () => {},
        fetchImpl: async () => {
          tries++;
          if (tries === 1) throw new TypeError("network down");
          return jsonResponse(200, { jsonrpc: "2.0", id: 1, result: tree });
        },
      },
    );
    expect(recovered.ok).toBe(true);
    expect(tries).toBe(2);

    const timedOut = await nodeflareCall(traceUrl, "trace_filter", [], {
      sleep: async () => {},
      fetchImpl: async () => {
        throw Object.assign(new Error("timed out"), { name: "TimeoutError" });
      },
    });
    expect(timedOut).toMatchObject({ ok: false, problem: "timeout", attempts: 2 });
  });
});

describe("direct ETH and USDC rules stay in place", () => {
  const from = "0x3dd42e54a48c109643bbb8b230392a2c0abaa6aa";
  const topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  it("still requires both providers for a direct ETH transfer", () => {
    const tx = { from, to: deposit, value: payout };
    expect(nativeTransfersAgree(tx, { ...tx }, deposit, payout)).toBe(true);
    expect(nativeTransfersAgree({ ...tx, value: 0n }, { ...tx, value: 0n }, deposit, payout)).toBe(
      false,
    );
    expect(nativeTransfersAgree(tx, null, deposit, payout)).toBe(false);
  });

  it("still matches only the allowlisted USDC transfer", () => {
    const word = (addr: string) => "0x" + addr.slice(2).padStart(64, "0");
    expect(
      erc20LogMatches(
        {
          address: usdc,
          topics: [topic, word(from), word(deposit)],
          data: "0x" + 1_000_000n.toString(16),
        },
        { token: usdc, from, to: deposit, units: 1_000_000n, transferTopic: topic },
      ),
    ).toBe(true);
  });
});
