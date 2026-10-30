import { describe, it, expect } from "vitest";
import { rpcFailure } from "../src/lib/crypto/rpc-failure";
describe("credential-safe RPC diagnostics", () => {
  it("identifies nested provider auth failures without returning credentials or response bodies", () => {
    const error = {
      message: "HTTP request failed https://rpc.example/private-key?token=hidden",
      cause: { status: 401, code: -32001, details: "API key secret", body: "private" },
    };
    expect(rpcFailure(error)).toEqual({ kind: "AUTH_REJECTED", status: 401, code: -32001 });
    expect(JSON.stringify(rpcFailure(error))).not.toMatch(/hidden|private|secret|http/);
  });
  it("distinguishes throttling, runtime budget, timeout and binding errors", () => {
    expect(rpcFailure({ cause: { status: 429 } }).kind).toBe("RATE_LIMITED");
    expect(rpcFailure({ cause: new Error("Too many subrequests.") })).toEqual({
      kind: "SUBREQUEST_LIMIT",
    });
    expect(rpcFailure(new Error("Illegal invocation"))).toEqual({ kind: "ILLEGAL_INVOCATION" });
    expect(rpcFailure(new Error("Request timed out"))).toEqual({ kind: "TIMEOUT" });
  });
  it("bounds cyclic causes and handles absent errors", () => {
    const cycle: { cause?: unknown } = {};
    cycle.cause = cycle;
    expect(rpcFailure(cycle)).toEqual({ kind: "NETWORK" });
    expect(rpcFailure(null)).toEqual({ kind: "NETWORK" });
  });
});
