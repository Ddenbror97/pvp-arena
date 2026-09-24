import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { generateOtp, isOtpFormat, maskEmail, otpDigest } from "../src/lib/auth-otp/otp";
import { renderOtpEmail } from "../src/lib/auth-otp/email-template";

describe("OTP generation", () => {
  it("always 6 digits, uniform-ish", () => {
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 20000; i++) {
      const c = generateOtp();
      expect(isOtpFormat(c)).toBe(true);
      counts[Number(c[0])]++;
    }
    for (const n of counts) expect(n).toBeGreaterThan(1700);
  });
  it("rejects biased tail values and keeps leading zeros", () => {
    const seq = [4_294_967_295, 4_294_000_000, 7];
    let i = 0;
    expect(generateOtp((b) => ((b[0] = seq[i++]!), b))).toBe("000007");
    expect(i).toBe(3);
  });
});

describe("OTP digest", () => {
  it("matches independent node HMAC and is challenge-bound", async () => {
    const d = await otpDigest("pep", "SIGNUP_EMAIL_VERIFICATION", "c1", "123456");
    const n = createHmac("sha256", "pep").update("PVPCasino:otp:v1:SIGNUP_EMAIL_VERIFICATION:c1:123456").digest("hex");
    expect(d).toBe(n);
    expect(await otpDigest("pep", "SIGNUP_EMAIL_VERIFICATION", "c2", "123456")).not.toBe(d);
  });
});

describe("email template", () => {
  it("contains the code and no links/URLs/buttons", () => {
    const { html, text, subject } = renderOtpEmail("042917");
    expect(subject).toBe("Your PVPspinArena verification code");
    for (const s of [html, text]) {
      expect(s).toContain("042917");
      expect(s).not.toMatch(/https?:\/\/|www\.|<a\s|href=|<button|mailto:/i);
    }
  });
  it("masks emails", () => expect(maskEmail("jeppe@x.com")).toBe("je•••@x.com"));
});
