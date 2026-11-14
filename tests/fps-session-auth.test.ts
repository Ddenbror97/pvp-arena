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

describe("anti-cheat restrictions in the session check (FPS_AC_ENFORCE)", () => {
  const restrictedRow = {
    ...row,
    active: false,
    restricted: "competitive",
    until: "2026-11-15T00:00:00Z",
  };
  it("off: the v1 check exactly as before, whatever scope is asked", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([row]));
    vi.stubGlobal("fetch", fetch);
    await liveSessions(env, [identity], undefined, undefined);
    expect(fetch.mock.calls[0][0]).toMatch(/rpc\/fps_check_sessions$/);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("p_scope");
  });
  it("on: v2 with the scope; a restricted session is not live and says why", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([restrictedRow]));
    vi.stubGlobal("fetch", fetch);
    const live = await liveSessions(env, [identity], undefined, "competitive");
    expect(fetch.mock.calls[0][0]).toMatch(/rpc\/fps_check_sessions_v2$/);
    expect(JSON.parse(fetch.mock.calls[0][1].body).p_scope).toBe("competitive");
    expect(live.has(sessionKey(identity))).toBe(false);
    expect(live.restricted.get(sessionKey(identity))).toEqual({
      kind: "competitive",
      until: "2026-11-15T00:00:00Z",
    });
  });
  it("the reader passes its room's scope only when enforcement is on", async () => {
    const { sessionReader } = await import("../workers/fps/session-auth");
    const fetch = vi.fn().mockImplementation(async () => Response.json([row]));
    vi.stubGlobal("fetch", fetch);
    await sessionReader(env, "practice")([identity]);
    await sessionReader({ ...env, FPS_AC_ENFORCE: "1" }, () => "practice")([identity]);
    expect(fetch.mock.calls[0][0]).toMatch(/fps_check_sessions$/);
    expect(JSON.parse(fetch.mock.calls[1][1].body).p_scope).toBe("practice");
  });
  it("a sweep closes a restricted socket as restricted, a revoked one as revoked", async () => {
    const { sweepSessions } = await import("../workers/fps/room-kit");
    const other = { ...identity, sub: "other", sessionId: "s2" };
    const socket = (a: object) => ({ deserializeAttachment: () => a }) as unknown as WebSocket;
    const read = async () =>
      Object.assign(new Set<string>(), {
        restricted: new Map([[sessionKey(identity), { kind: "ban" as const, until: null }]]),
      });
    const closed: Array<[string, boolean | undefined]> = [];
    await sweepSessions([socket(identity), socket(other)], read, (s, restricted) =>
      closed.push([(s.deserializeAttachment() as { sub: string }).sub, restricted]),
    );
    expect(closed).toEqual([
      ["user", true],
      ["other", false],
    ]);
  });
});

describe("anti-cheat check that cannot be called (2026-11-14 incident): fails closed", () => {
  afterEach(async () => (await import("../workers/fps/session-auth")).resetEnforcementAlert());
  const denied = () =>
    vi.fn(async (url: string) =>
      /fps_check_sessions_v2$/.test(url)
        ? Response.json({ code: "42501", message: "permission denied" }, { status: 403 })
        : Response.json([row]),
    );

  it("a missing grant refuses admission (never the v1 check in its place) and alerts once a minute", async () => {
    const { EnforcementUnavailable, ENFORCEMENT_ALERT_MS } =
      await import("../workers/fps/session-auth");
    const fetch = denied();
    vi.stubGlobal("fetch", fetch);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const t = 1_000_000;
    await expect(liveSessions(env, [identity], undefined, "competitive", t)).rejects.toBeInstanceOf(
      EnforcementUnavailable,
    );
    // Only v2 was asked: no silent downgrade to the check without restrictions.
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      expect.stringMatching(/fps_check_sessions_v2$/),
    ]);
    expect(JSON.parse(error.mock.calls[0]![0] as string)).toMatchObject({
      event: "fps_ac_enforcement_unavailable",
      level: "alert",
      scope: "competitive",
    });
    await expect(
      liveSessions(env, [identity], undefined, "competitive", t + 1000),
    ).rejects.toBeInstanceOf(EnforcementUnavailable);
    expect(error).toHaveBeenCalledTimes(1);
    await expect(
      liveSessions(env, [identity], undefined, "competitive", t + ENFORCEMENT_ALERT_MS + 1),
    ).rejects.toBeInstanceOf(EnforcementUnavailable);
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it("a missing function (PGRST202) refuses admission", async () => {
    const { EnforcementUnavailable } = await import("../workers/fps/session-auth");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ code: "PGRST202" }, { status: 404 })),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(liveSessions(env, [identity], undefined, "practice")).rejects.toBeInstanceOf(
      EnforcementUnavailable,
    );
  });

  it("on the Hyperdrive path too (sqlstate 42501), without calling v1", async () => {
    const { EnforcementUnavailable } = await import("../workers/fps/session-auth");
    const calls: string[] = [];
    const sql = Object.assign(
      async (strings: TemplateStringsArray) => {
        const text = strings.join("?");
        calls.push(text.includes("check_sessions_v2") ? "v2" : "v1");
        if (text.includes("check_sessions_v2"))
          throw Object.assign(new Error("permission denied for function check_sessions_v2"), {
            code: "42501",
          });
        return [{ result: [row] }];
      },
      { json: (v: unknown) => v },
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const hyper = { ...env, HYPERDRIVE: { connectionString: "postgres://test.invalid/db" } };
    await expect(
      liveSessions(
        hyper,
        [identity],
        sql as unknown as Parameters<typeof liveSessions>[2],
        "competitive",
      ),
    ).rejects.toBeInstanceOf(EnforcementUnavailable);
    expect(calls).toEqual(["v2"]);
  });

  it("a database outage fails closed as an ordinary unavailable check (no alert)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("down", { status: 503 })));
    await expect(liveSessions(env, [identity], undefined, "competitive")).rejects.toThrow(
      "SESSION_CHECK_UNAVAILABLE",
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("enforcement off (the administrators' switch): v1 only, restrictions not read", async () => {
    const { sessionReader } = await import("../workers/fps/session-auth");
    const fetch = denied();
    vi.stubGlobal("fetch", fetch);
    const read = sessionReader({ ...env, FPS_AC_ENFORCE: "0" }, "competitive");
    expect(await read([identity])).toEqual(new Set([sessionKey(identity)]));
    expect(fetch.mock.calls[0]![0]).toMatch(/fps_check_sessions$/);
  });
});

describe("room admission when the check cannot be verified", () => {
  it("answers 503 with the reason and Retry-After, never a socket", async () => {
    const { admissionUnavailable } = await import("../workers/fps/room-kit");
    const { EnforcementUnavailable } = await import("../workers/fps/session-auth");
    const enforcement = admissionUnavailable(new EnforcementUnavailable("sqlstate 42501"));
    expect(enforcement.status).toBe(503);
    expect(enforcement.headers.get("Retry-After")).toBe("5");
    expect(await enforcement.json()).toEqual({ error: "ENFORCEMENT_UNAVAILABLE" });
    const outage = admissionUnavailable(new Error("SESSION_CHECK_UNAVAILABLE"));
    expect(outage.status).toBe(503);
    expect(await outage.json()).toEqual({ error: "SESSION_CHECK_UNAVAILABLE" });
  });
});

describe("admission's session read", () => {
  it("retries a transient failure once, and never an uncallable anti-cheat check", async () => {
    const { readAdmission } = await import("../workers/fps/room-kit");
    const { EnforcementUnavailable } = await import("../workers/fps/session-auth");
    const ok = Object.assign(new Set(["k"]), { restricted: new Map() });
    const flaky = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(ok);
    expect(await readAdmission(flaky, [identity])).toBe(ok);
    expect(flaky).toHaveBeenCalledTimes(2);
    const down = vi.fn().mockRejectedValue(new Error("SESSION_CHECK_UNAVAILABLE"));
    await expect(readAdmission(down, [identity])).rejects.toThrow("SESSION_CHECK_UNAVAILABLE");
    expect(down).toHaveBeenCalledTimes(2);
    const uncallable = vi.fn().mockRejectedValue(new EnforcementUnavailable("sqlstate 42501"));
    await expect(readAdmission(uncallable, [identity])).rejects.toBeInstanceOf(
      EnforcementUnavailable,
    );
    expect(uncallable).toHaveBeenCalledTimes(1);
  });
});
