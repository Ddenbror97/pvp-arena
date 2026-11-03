import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";

async function runtime() {
  const { workerEnv } = await import("@/lib/worker-env");
  const origin = workerEnv("FPS_RUNTIME_ORIGIN"),
    secret = workerEnv("FPS_RUNTIME_SECRET");
  if (!origin || !secret || secret.length < 32) throw new Error("FPS_RUNTIME_UNAVAILABLE");
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(process.env["NODE_ENV"] !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname))
  )
    throw new Error("INVALID_FPS_RUNTIME");
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw new Error("INVALID_FPS_RUNTIME");
  return { origin: url.origin, secret };
}

/**
 * Battle royale practice admission (as Bomb Defusal's): the lobby picks the fullest match still
 * boarding (or a new one), then a one-minute ticket admits this signed-in user to that room. The
 * room assigns the seat.
 */
export const brAdmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .handler(async ({ context }) => {
    const r = await runtime();
    const sessionId = context.claims.session_id;
    const authExpiresAt = Number(context.claims.exp) * 1000;
    if (
      typeof sessionId !== "string" ||
      !Number.isSafeInteger(authExpiresAt) ||
      authExpiresAt <= Date.now()
    )
      throw new Error("SESSION_REVOKED");
    const joined = await fetch(`${r.origin}/internal/br/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${r.secret}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!joined.ok) throw new Error("FPS_RUNTIME_UNAVAILABLE");
    const { matchId } = (await joined.json()) as { matchId?: unknown };
    if (typeof matchId !== "string") throw new Error("FPS_RUNTIME_UNAVAILABLE");
    // Display name: the profile username (never the e-mail address).
    const db = context.supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            k: string,
            v: string,
          ) => { maybeSingle: () => Promise<{ data: { username?: string } | null }> };
        };
      };
    };
    const profile = await db
      .from("profiles")
      .select("username")
      .eq("id", context.userId)
      .maybeSingle();
    const name =
      typeof profile.data?.username === "string" ? profile.data.username.slice(0, 20) : "Player";
    const { signAdmission } = await import("../ticket");
    const ticket = await signAdmission(
      {
        v: 2,
        aud: "fps-br",
        matchId,
        sub: context.userId,
        sessionId,
        authExpiresAt,
        role: "player",
        nonce: crypto.randomUUID(),
        exp: Math.min(Date.now() + 60_000, authExpiresAt),
        name,
      },
      r.secret,
    );
    return {
      matchId,
      url: `${r.origin.replace(/^http/, "ws")}/br/${matchId}/socket?ticket=${encodeURIComponent(ticket)}`,
      expiresAt: Date.now() + 60_000,
    };
  });
