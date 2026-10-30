import { afterEach, describe, expect, it, vi } from "vitest";
import { liveSessions, sessionKey } from "../workers/fps/session-auth";

const env = { SUPABASE_URL: "https://staging.invalid", SUPABASE_SERVICE_ROLE_KEY: "test-only" };
const identity = { sub: "user", sessionId: "session", authExpiresAt: Date.now() + 600000 };
const row = { userId: identity.sub, sessionId: identity.sessionId, active: true };
afterEach(() => vi.unstubAllGlobals());
describe("authoritative FPS session response validation", () => {
  it("does not cache positive decisions and deduplicates requested identities", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json([row]))
      .mockResolvedValueOnce(Response.json([{ ...row, active: false }]));
    vi.stubGlobal("fetch", fetch);
    expect(await liveSessions(env, [identity, identity])).toEqual(new Set([sessionKey(identity)]));
    expect(await liveSessions(env, [identity])).toEqual(new Set());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[0][1].body).p_sessions).toHaveLength(1);
  });
  it.each([
    ["missing row", []],
    ["foreign identity", [{ ...row, userId: "other" }]],
    ["duplicate rows", [row, row]],
    ["nonboolean authorization", [{ ...row, active: "true" }]],
    ["object payload", { active: true }],
    ["null row", [null]],
  ])("fails closed for %s", async (_, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(liveSessions(env, [identity])).rejects.toThrow("INVALID_SESSION_STATUS");
  });
  it("fails closed on a service failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(liveSessions(env, [identity])).rejects.toThrow("SESSION_CHECK_UNAVAILABLE");
  });
  it("rejects an expired JWT even if the database session is active", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([row])));
    expect(await liveSessions(env, [{ ...identity, authExpiresAt: Date.now() - 1 }])).toEqual(
      new Set(),
    );
  });
});
