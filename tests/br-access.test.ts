import { afterEach, describe, expect, it, vi } from "vitest";
import { canPlayBattleRoyale } from "../src/lib/fps/br/access";
import { brAdminUsers, hasBrAdminAccess } from "../workers/fps/br-access";

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

  it("Worker denies HTTP errors, invalid JSON, timeouts and network errors", async () => {
    for (const fetch of [
      vi.fn().mockResolvedValue(Response.json(true, { status: 503 })),
      vi.fn().mockResolvedValue(new Response("invalid json")),
      vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
      vi.fn().mockRejectedValue(Error("network")),
    ]) {
      vi.stubGlobal("fetch", fetch);
      expect(await hasBrAdminAccess(env, "user")).toBe(false);
    }
  });

  it("periodic checks deduplicate users, bound concurrency and refresh revoked roles", async () => {
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
    expect(await brAdminUsers(env, [...users, ...users])).toEqual(new Set(users));
    expect(fetch).toHaveBeenCalledTimes(users.length);
    expect(peak).toBeLessThanOrEqual(4);
    admin = false;
    expect(await brAdminUsers(env, users)).toEqual(new Set());
  });
});
