import { afterEach, describe, expect, it, vi } from "vitest";
import { TURNSTILE_RETRY } from "@/lib/auth-otp/turnstile";
import { verifyTurnstile } from "@/lib/auth-otp/turnstile.server";
import { startSignup } from "@/lib/auth-otp/signup.server";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TURNSTILE_SECRET_KEY;
});

describe("Turnstile signup check", () => {
  it("rejects an empty token before calling Cloudflare", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(verifyTurnstile("  ", "203.0.113.8")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a token Cloudflare marks successful", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, hostname: "pvpspinarena.com" }), {
        status: 200,
      }),
    );
    await expect(verifyTurnstile("token-ok", "203.0.113.8")).resolves.toBe(true);
    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(body).toContain("response=token-ok");
    expect(body).toContain("remoteip=203.0.113.8");
  });

  it("rejects a failed challenge", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    await expect(verifyTurnstile("token-bad", null)).resolves.toBe(false);
  });

  it("rejects a production token minted for another host", async () => {
    process.env.TURNSTILE_SECRET_KEY = "unit-test-secret";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, hostname: "evil.example" }), { status: 200 }),
    );
    await expect(verifyTurnstile("token-ok", "203.0.113.8")).resolves.toBe(false);
  });

  it("does not create an account when the challenge is missing", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await startSignup({
      email: "person@example.com",
      password: "long-password",
      username: "person",
      ip: "203.0.113.8",
      ua: "test",
      captchaToken: "",
    });
    expect(result).toEqual({ ok: false, error: TURNSTILE_RETRY });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
