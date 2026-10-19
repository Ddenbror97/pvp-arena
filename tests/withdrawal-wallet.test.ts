import { describe, expect, it } from "vitest";
import { withdrawalDestinationAllowed } from "../src/lib/crypto/withdrawal-wallet";

const OLD = "2026-10-01T00:00:00.000Z";
const FRESH = "2026-10-19T12:00:00.000Z";
const NOW = Date.parse("2026-10-19T18:00:00.000Z");
const A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("withdrawal destination", () => {
  it("allows the only verified wallet immediately", () => {
    expect(withdrawalDestinationAllowed([{ address: A, becamePrimaryAt: FRESH }], A, NOW)).toEqual({
      ok: true,
    });
  });

  it("refuses an address this account has not verified", () => {
    expect(withdrawalDestinationAllowed([{ address: A, becamePrimaryAt: OLD }], B, NOW)).toEqual({
      ok: false,
      reason: "UNLINKED",
    });
  });

  it("waits 24 hours before paying a newly primary wallet", () => {
    expect(
      withdrawalDestinationAllowed(
        [
          { address: A, becamePrimaryAt: OLD },
          { address: B, becamePrimaryAt: FRESH },
        ],
        B,
        NOW,
      ),
    ).toEqual({ ok: false, reason: "COOLDOWN" });
  });

  it("still pays the older wallet during that wait", () => {
    expect(
      withdrawalDestinationAllowed(
        [
          { address: A, becamePrimaryAt: OLD },
          { address: B, becamePrimaryAt: FRESH },
        ],
        A,
        NOW,
      ),
    ).toEqual({ ok: true });
  });

  it("pays the new wallet after 24 hours", () => {
    expect(
      withdrawalDestinationAllowed(
        [
          { address: A, becamePrimaryAt: OLD },
          { address: B, becamePrimaryAt: "2026-10-18T17:00:00.000Z" },
        ],
        B,
        NOW,
      ),
    ).toEqual({ ok: true });
  });

  it("fails closed when the new wallet has no primary timestamp", () => {
    expect(
      withdrawalDestinationAllowed(
        [
          { address: A, becamePrimaryAt: OLD },
          { address: B, becamePrimaryAt: null },
        ],
        B,
        NOW,
      ),
    ).toEqual({ ok: false, reason: "COOLDOWN" });
  });
});
