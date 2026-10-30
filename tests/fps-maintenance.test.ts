import { describe, it, expect, vi } from "vitest";
import { maintainMatches } from "../workers/fps/maintenance";
const env = { SUPABASE_URL: "https://isolated.test", SUPABASE_SERVICE_ROLE_KEY: "test-only" };
describe("FPS independent maintenance", () => {
  it("drains bounded reconciliation before expiry and authenticates every request", async () => {
    const calls: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input).split("/").at(-1)!;
      calls.push(path);
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer test-only");
      expect(init?.body).toBe('{"p_limit":100}');
      return Response.json(
        path === "fps_reconcile"
          ? { settled: calls.length === 1 ? 100 : 3, failed: 0 }
          : { expired: 0 },
      );
    });
    await maintainMatches(env, fetcher as typeof fetch);
    expect(calls).toEqual(["fps_reconcile", "fps_reconcile", "fps_expire"]);
  });
  it("reports settlement failures instead of silently expiring recorded results", async () => {
    await expect(
      maintainMatches(
        env,
        vi.fn(async () => Response.json({ settled: 0, failed: 1 })) as typeof fetch,
      ),
    ).rejects.toThrow("FAILED_1");
    await expect(
      maintainMatches(env, vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch),
    ).rejects.toThrow("HTTP_503");
  });
});
