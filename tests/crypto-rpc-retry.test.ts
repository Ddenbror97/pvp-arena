import { describe, expect, it } from "vitest";
import { isTransientRpcFailure } from "@/lib/crypto/rpc-retry";

describe("crypto_my_activity retry policy", () => {
  it("does not retry the read-only transaction failure (25006 / HTTP 405)", () => {
    expect(isTransientRpcFailure({ code: "25006", status: 405 })).toBe(false);
  });

  it("does not retry permission, business, or timeout failures", () => {
    expect(isTransientRpcFailure({ code: "42501", status: 403 })).toBe(false);
    expect(isTransientRpcFailure({ code: "P0001", status: 400 })).toBe(false);
    expect(isTransientRpcFailure({ code: "57014", status: 500 })).toBe(false);
    expect(isTransientRpcFailure({ code: "PGRST202", status: 404 })).toBe(false);
  });

  it("lets a non-transient database code win over a gateway-like status", () => {
    expect(isTransientRpcFailure({ code: "25006", status: 503 })).toBe(false);
    expect(isTransientRpcFailure({ code: "42501", status: 502 })).toBe(false);
    expect(isTransientRpcFailure({ code: "P0001", status: 521 })).toBe(false);
  });

  it("retries connection loss, restarts and gateway origin errors", () => {
    expect(isTransientRpcFailure({ code: "", status: 0 })).toBe(true);
    expect(isTransientRpcFailure({ code: "57P01", status: 503 })).toBe(true);
    expect(isTransientRpcFailure({ code: "57P03", status: 503 })).toBe(true);
    expect(isTransientRpcFailure({ code: "08006", status: 503 })).toBe(true);
    expect(isTransientRpcFailure({ code: "PGRST000", status: 503 })).toBe(true);
    expect(isTransientRpcFailure({ code: "PGRST002", status: 503 })).toBe(true);
    expect(isTransientRpcFailure({ code: "", status: 521 })).toBe(true);
    expect(isTransientRpcFailure({ code: "", status: 522 })).toBe(true);
  });

  it("retries serialization and deadlock aborts", () => {
    expect(isTransientRpcFailure({ code: "40001", status: 409 })).toBe(true);
    expect(isTransientRpcFailure({ code: "40P01", status: 409 })).toBe(true);
  });

  it("does not retry when the status is unknown and the code is not transient", () => {
    expect(isTransientRpcFailure({ code: "25006" })).toBe(false);
    expect(isTransientRpcFailure({})).toBe(false);
  });
});
