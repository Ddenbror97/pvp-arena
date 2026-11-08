import { afterEach, describe, expect, it, vi } from "vitest";
import { battleRoyaleAccess, canPlayBattleRoyale } from "../src/lib/fps/br/access";
import { brAdminAccess, brRevokedUsers, hasBrAdminAccess } from "../workers/fps/br-access";

const env = { SUPABASE_URL: "https://db.test", SUPABASE_SERVICE_ROLE_KEY: "server-secret" };
afterEach(() => vi.unstubAllGlobals());

describe("BR database admin access", () => {
  it("never asks the database about anonymous visitors", async () => {
    const rpc = vi.fn();
    expect(await canPlayBattleRoyale({ rpc }, null)).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([true, false, null, "true", 1, [], { role: "admin" }])(
    "requires a literal true role result: %j",
    async (data) => {
      const rpc = vi.fn().mockResolvedValue({ data, error: null });
      expect(await canPlayBattleRoyale({ rpc }, "user-id")).toBe(data === true);
      expect(rpc).toHaveBeenCalledExactlyOnceWith("has_role", {
        _user_id: "user-id",
        _role: "admin",
      });
    },
  );

  it("denies database errors and rejected requests", async () => {
    expect(
      await canPlayBattleRoyale(
        { rpc: vi.fn().mockResolvedValue({ data: true, error: Error("db") }) },
        "user",
      ),
    ).toBe(false);
    expect(
      await canPlayBattleRoyale({ rpc: vi.fn().mockRejectedValue(Error("network")) }, "user"),
    ).toBe(false);
  });

  it("uses service credentials and public.has_role for the ticket subject", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(true));
    vi.stubGlobal("fetch", fetch);
    expect(await hasBrAdminAccess(env, "ticket-subject")).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://db.test/rest/v1/rpc/has_role",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "server-secret",
          Authorization: "Bearer server-secret",
          "Content-Profile": "public",
        }),
        body: JSON.stringify({ _user_id: "ticket-subject", _role: "admin" }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([false, null, "true", [], { admin: true }])(
    "Worker denies unexpected role data: %j",
    async (data) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(data)));
      expect(await hasBrAdminAccess(env, "user")).toBe(false);
    },
  );

  it("Worker admits nobody on HTTP errors, invalid JSON, timeouts and network errors", async () => {
    for (const fetch of [
      vi.fn().mockResolvedValue(Response.json(true, { status: 503 })),
      vi.fn().mockResolvedValue(new Response("invalid json")),
      vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
      vi.fn().mockRejectedValue(Error("network")),
    ]) {
      vi.stubGlobal("fetch", fetch);
      expect(await hasBrAdminAccess(env, "user")).toBe(false);
      // ...but none of them is a denial: no answer is "unknown" (2026-11-08 stuck loading).
      expect(await brAdminAccess(env, "user")).toBe("unknown");
    }
  });

  it("a slow or failing role lookup never drops a connected admin; a real no does", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("t", "TimeoutError")));
    expect(await brRevokedUsers(env, ["admin"])).toEqual(new Set());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(true, { status: 500 })));
    expect(await brRevokedUsers(env, ["admin"])).toEqual(new Set());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(false)));
    expect(await brRevokedUsers(env, ["former-admin"])).toEqual(new Set(["former-admin"]));
  });

  it("site admission tells a database failure (retry) from a denial", async () => {
    expect(
      await battleRoyaleAccess(
        { rpc: vi.fn().mockResolvedValue({ data: null, error: Error("db") }) },
        "user",
      ),
    ).toBe("unknown");
    expect(
      await battleRoyaleAccess({ rpc: vi.fn().mockRejectedValue(Error("network")) }, "user"),
    ).toBe("unknown");
    expect(
      await battleRoyaleAccess(
        { rpc: vi.fn().mockResolvedValue({ data: false, error: null }) },
        "user",
      ),
    ).toBe("denied");
  });

  it("periodic checks deduplicate users, bound concurrency and catch revoked roles", async () => {
    let active = 0;
    let peak = 0;
    let admin = true;
    const fetch = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return Response.json(admin);
    });
    vi.stubGlobal("fetch", fetch);
    const users = Array.from({ length: 12 }, (_, i) => `user-${i}`);
    expect(await brRevokedUsers(env, [...users, ...users])).toEqual(new Set());
    expect(fetch).toHaveBeenCalledTimes(users.length);
    expect(peak).toBeLessThanOrEqual(4);
    admin = false;
    expect(await brRevokedUsers(env, users)).toEqual(new Set(users));
  });
});
