import { afterEach, describe, expect, it, vi } from "vitest";

// Execute the server handler with an authenticated middleware context, without browser transport.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ middleware: () => ({ handler: (handler: unknown) => handler }) }),
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/live-session", () => ({ requireLiveSession: {} }));
vi.mock("@/lib/worker-env", () => ({
  workerEnv: (key: string) =>
    key === "FPS_RUNTIME_ORIGIN"
      ? "https://runtime.test"
      : key === "FPS_BR_RUNTIME_ORIGIN"
        ? (globalThis as { brOrigin?: string }).brOrigin
        : "server-runtime-secret-".repeat(3),
}));
import { brAdmission } from "../src/lib/fps/br/br.functions";

afterEach(() => vi.unstubAllGlobals());
type Context = {
  userId: string;
  claims: { session_id: string; exp: number; user_metadata?: unknown; app_metadata?: unknown };
  supabase: { rpc: ReturnType<typeof vi.fn>; from: ReturnType<typeof vi.fn> };
};
const admit = brAdmission as unknown as (args: {
  context: Context;
}) => Promise<{ url: string; matchId: string }>;
const context = (admin: boolean): Context => ({
  userId: "real-user",
  claims: { session_id: "real-session", exp: Math.floor(Date.now() / 1000) + 3600 },
  supabase: { rpc: vi.fn().mockResolvedValue({ data: admin, error: null }), from: vi.fn() },
});

describe("BR server admission (public release)", () => {
  it("rejects a context with no signed-in user before contacting the Worker", async () => {
    const ctx = context(false);
    ctx.userId = "";
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(admit({ context: ctx })).rejects.toThrow("BR_SIGN_IN_REQUIRED");
    expect(fetch).not.toHaveBeenCalled();
    expect(ctx.supabase.from).not.toHaveBeenCalled();
  });
  it("never consults the database admin role (every signed-in player is admitted)", async () => {
    const ctx = context(false);
    ctx.claims.user_metadata = {};
    const maybeSingle = vi.fn().mockResolvedValue({ data: { username: "Player" } });
    ctx.supabase.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });
    const matchId = crypto.randomUUID();
    const fetch = vi.fn().mockResolvedValue(Response.json({ matchId }));
    vi.stubGlobal("fetch", fetch);
    const result = await admit({ context: ctx });
    expect(result.matchId).toBe(matchId);
    expect(result.url).toContain(`wss://runtime.test/br/${matchId}/socket?ticket=`);
    expect(ctx.supabase.rpc).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "https://runtime.test/internal/br/join",
      expect.objectContaining({ body: JSON.stringify({ sub: "real-user" }) }),
    );
  });
  it("uses the battle royale's own Worker when one is configured", async () => {
    (globalThis as { brOrigin?: string }).brOrigin = "https://br.test";
    try {
      const ctx = context(false);
      const maybeSingle = vi.fn().mockResolvedValue({ data: { username: "Player" } });
      ctx.supabase.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) });
      const matchId = crypto.randomUUID();
      const fetch = vi.fn().mockResolvedValue(Response.json({ matchId }));
      vi.stubGlobal("fetch", fetch);
      const result = await admit({ context: ctx });
      expect(result.url).toContain(`wss://br.test/br/${matchId}/socket?ticket=`);
      expect(fetch).toHaveBeenCalledWith("https://br.test/internal/br/join", expect.anything());
    } finally {
      delete (globalThis as { brOrigin?: string }).brOrigin;
    }
  });
});
