import { describe, expect, it } from "vitest";
import { signAdmission, verifyAdmission, type Admission } from "@/lib/fps/ticket";
import { duelQuote } from "@/lib/fps/quote";

const secret = "a".repeat(64);
const claims: Admission = {
  v: 1,
  aud: "fps-duel",
  matchId: crypto.randomUUID(),
  sub: crypto.randomUUID(),
  nonce: crypto.randomUUID(),
  role: "player",
  exp: 61_000,
};
describe("FPS admission", () => {
  it("requires a signed, current, short-lived audience-scoped ticket", async () => {
    const t = await signAdmission(claims, secret);
    expect(await verifyAdmission(t, secret, 1000)).toEqual(claims);
    expect(await verifyAdmission(t, "b".repeat(64), 1000)).toBeNull();
    expect(await verifyAdmission(t, secret, 61_000)).toBeNull();
    expect(await verifyAdmission(t + "x", secret, 1000)).toBeNull();
    expect(
      await verifyAdmission(await signAdmission({ ...claims, exp: 999_000 }, secret), secret, 1000),
    ).toBeNull();
  });
  it("calculates integer-cent fees and rejects invalid stakes", () => {
    expect(duelQuote(1000)).toEqual({ stake: 1000, pot: 2000, fee: 100, payout: 1900 });
    expect(duelQuote(101).payout).toBe(192);
    expect(() => duelQuote(1.1)).toThrow();
    expect(() => duelQuote(-1)).toThrow();
  });
});
