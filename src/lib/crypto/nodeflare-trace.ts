/**
 * Internal ETH traces for Base mainnet, via a NodeFlare free-tier key.
 * Ankr still indexes direct transfers. Chainstack still confirms receipts.
 * Neither is asked to trace. A failed, empty, or ambiguous trace does not credit.
 */
import { callTracerDeposits, traceFilterDeposits } from "./ankr-index";
import {
  mergeTraceAttempts,
  settleInternalTransfers,
  type InternalTrace,
  type TraceSettlement,
} from "./transfer-match";

export const TRACE_USER_AGENT = "pvpspinarena-deposit/1.0";
export const TRACE_TIMEOUT_MS = 12_000;
/** One block filter is enough. Debug is only the fallback, and it is capped. */
export const TRACE_MAX_DEBUG_CALLS = 6;
/** Published weight for trace_* and debug_*. Used for quota estimates, not billing. */
export const TRACE_CALL_CU = 100;

export type TraceProblem =
  "rate_limit" | "quota" | "timeout" | "http" | "unsupported" | "malformed" | "unavailable";

export type TraceHold = TraceProblem | "none" | "incomplete" | "unconfirmed" | "proved";

const COOLDOWN_MS: Record<TraceHold, number> = {
  rate_limit: 60_000,
  quota: 60 * 60_000,
  timeout: 5 * 60_000,
  http: 5 * 60_000,
  unavailable: 5 * 60_000,
  unsupported: 60 * 60_000,
  malformed: 15 * 60_000,
  incomplete: 5 * 60_000,
  none: 6 * 60 * 60_000,
  unconfirmed: 15 * 60_000,
  proved: 10 * 60_000,
};

export type TracedTransfer = InternalTrace & { from: string; blockNumber: bigint };

export function checkTraceUrl(
  url: string | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!url) return { ok: false, reason: "TRACE_URL_MISSING" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "TRACE_URL_INVALID" };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "TRACE_URL_NOT_HTTPS" };
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return { ok: false, reason: "TRACE_URL_INVALID" };
  }
  if (/sepolia|testnet|goerli/i.test(`${parsed.hostname}${parsed.pathname}`)) {
    return { ok: false, reason: "TRACE_URL_NOT_MAINNET" };
  }
  if (parsed.hostname !== "rpc.nodeflare.app") return { ok: false, reason: "TRACE_URL_HOST" };
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[0] !== "base" || parts[1] !== "v1" || !parts[2]) {
    return { ok: false, reason: "TRACE_URL_PATH" };
  }
  if (parts[2] === "public") return { ok: false, reason: "TRACE_URL_PUBLIC" };
  return { ok: true };
}

function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";
  const record = error as { code?: unknown; message?: unknown; error?: unknown };
  return `${String(record.code ?? "")} ${String(record.message ?? record.error ?? "")}`;
}

function problemFromError(error: unknown): TraceProblem {
  const text = errorText(error);
  if (
    error === "monthly_limit_reached" ||
    /monthly_limit_reached|monthly quota|quota exhausted/i.test(text)
  ) {
    return "quota";
  }
  if (error === "rate_limit_exceeded" || /rate_limit_exceeded|rate limit/i.test(text))
    return "rate_limit";
  if (
    (typeof error === "object" && error && (error as { code?: unknown }).code === -32601) ||
    /method not found|not supported|unsupported|does not exist|not allowed to access method/i.test(
      text,
    )
  ) {
    return "unsupported";
  }
  return "http";
}

/** Classify a NodeFlare HTTP response. An empty trace result is `ok`, not a failure. */
export function classifyTraceBody(status: number, body: unknown): TraceProblem | "ok" {
  if (status === 429) {
    const problem = problemFromError(
      body && typeof body === "object" ? ((body as { error?: unknown }).error ?? body) : body,
    );
    return problem === "http" ? "rate_limit" : problem;
  }
  if (status === 408 || status === 504) return "timeout";
  if (status !== 200) return "http";
  if (!body || typeof body !== "object") return "malformed";
  const record = body as { error?: unknown; result?: unknown };
  if (record.error != null) return problemFromError(record.error);
  if (!("result" in record) || record.result == null) return "malformed";
  return "ok";
}

/** One extra attempt for a short outage or a per-second limit. Quota is not retried. */
export function traceRetryDelayMs(problem: TraceProblem, completedAttempts: number): number | null {
  if (completedAttempts >= 1) return null;
  if (problem === "rate_limit") return 1_000;
  if (problem === "timeout" || problem === "http" || problem === "unavailable") return 500;
  return null;
}

export function traceCooldownMs(reason: string): number {
  return COOLDOWN_MS[reason as TraceHold] ?? 5 * 60_000;
}

export function traceCooldownElapsed(
  lastSeenMs: number | null,
  reason: string,
  now: number,
): boolean {
  if (lastSeenMs == null || !reason) return true;
  return now - lastSeenMs >= traceCooldownMs(reason);
}

export function mayCreditInternal(status: "open" | "recorded" | "none"): boolean {
  return status === "recorded";
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export async function nodeflareCall(
  url: string,
  method: string,
  params: unknown[],
  deps?: { fetchImpl?: FetchLike; sleep?: (ms: number) => Promise<void>; timeoutMs?: number },
): Promise<
  | { ok: true; result: unknown; attempts: number }
  | { ok: false; problem: TraceProblem; attempts: number }
> {
  const fetchImpl = deps?.fetchImpl ?? fetch;
  const sleep = deps?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeoutMs = deps?.timeoutMs ?? TRACE_TIMEOUT_MS;
  let attempts = 0;
  let problem: TraceProblem = "unavailable";
  while (attempts < 2) {
    attempts++;
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": TRACE_USER_AGENT },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const classified = classifyTraceBody(res.status, body);
      if (classified === "ok") {
        return { ok: true, result: (body as { result: unknown }).result, attempts };
      }
      problem = classified;
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      problem = name === "TimeoutError" || name === "AbortError" ? "timeout" : "unavailable";
    }
    const wait = traceRetryDelayMs(problem, attempts - 1);
    if (wait == null) break;
    await sleep(wait);
  }
  return { ok: false, problem, attempts };
}

export function traceFilterOutcome(
  result: unknown,
  targets: string[],
  block: bigint,
): { problem: "malformed" } | { settled: TraceSettlement<TracedTransfer> } {
  if (!Array.isArray(result)) return { problem: "malformed" };
  const found: TracedTransfer[] = [];
  for (const target of targets) found.push(...traceFilterDeposits(result, target, block));
  return { settled: settleInternalTransfers([found]) };
}

export function callTracerOutcome(
  result: unknown,
  targets: string[],
  block: bigint,
  hash: string,
): { problem: "malformed" } | { settled: TraceSettlement<TracedTransfer> } {
  if (!result || typeof result !== "object" || Array.isArray(result))
    return { problem: "malformed" };
  const found: TracedTransfer[] = [];
  for (const target of targets) found.push(...callTracerDeposits(result, target, block, hash));
  return { settled: settleInternalTransfers([found]) };
}

export type TraceBlockResult = {
  settled: TraceSettlement<TracedTransfer>;
  problem?: TraceProblem | "incomplete";
  calls: number;
};

/**
 * Prefer one `trace_filter` for the block. `debug_traceTransaction` with
 * `callTracer` runs only when the filter method itself is unsupported.
 * Any other failure stays open and does not fall through to a second method.
 */
export async function traceDepositBlock(input: {
  url: string;
  block: bigint;
  targets: string[];
  candidateHashes: () => Promise<string[]>;
  call?: (
    url: string,
    method: string,
    params: unknown[],
  ) => Promise<
    | { ok: true; result: unknown; attempts: number }
    | { ok: false; problem: TraceProblem; attempts: number }
  >;
}): Promise<TraceBlockResult> {
  const call = input.call ?? ((url, method, params) => nodeflareCall(url, method, params));
  const hex = `0x${input.block.toString(16)}`;
  const filtered = await call(input.url, "trace_filter", [
    { fromBlock: hex, toBlock: hex, toAddress: input.targets },
  ]);
  if (filtered.ok) {
    const parsed = traceFilterOutcome(filtered.result, input.targets, input.block);
    if ("problem" in parsed) {
      return {
        settled: { transfers: [], status: "open" },
        problem: parsed.problem,
        calls: filtered.attempts,
      };
    }
    return { settled: parsed.settled, calls: filtered.attempts };
  }
  if (filtered.problem !== "unsupported") {
    return {
      settled: { transfers: [], status: "open" },
      problem: filtered.problem,
      calls: filtered.attempts,
    };
  }

  const all = await input.candidateHashes();
  const hashes = all.slice(0, TRACE_MAX_DEBUG_CALLS);
  const attempts: Array<TraceSettlement<TracedTransfer>> = [];
  let calls = filtered.attempts;
  let problem: TraceProblem | "incomplete" | undefined;
  for (const hash of hashes) {
    const traced = await call(input.url, "debug_traceTransaction", [
      hash,
      { tracer: "callTracer" },
    ]);
    calls += traced.attempts;
    if (!traced.ok) {
      attempts.push({ transfers: [], status: "open" });
      problem = traced.problem;
      if (traced.problem === "quota" || traced.problem === "rate_limit") break;
      continue;
    }
    const parsed = callTracerOutcome(traced.result, input.targets, input.block, hash);
    if ("problem" in parsed) {
      attempts.push({ transfers: [], status: "open" });
      problem = "malformed";
      continue;
    }
    attempts.push(parsed.settled);
  }
  const settled = mergeTraceAttempts(attempts);
  const incomplete =
    all.length > hashes.length ||
    attempts.some((attempt) => attempt.status === "open") ||
    hashes.length === 0;
  if (settled.status !== "recorded" && incomplete) {
    return {
      settled: { transfers: [], status: "open" },
      problem: problem ?? "incomplete",
      calls,
    };
  }
  return { settled, calls };
}
