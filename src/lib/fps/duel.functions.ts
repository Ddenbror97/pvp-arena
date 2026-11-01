import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireLiveSession } from "@/integrations/supabase/live-session";
import type { DuelView } from "./quote";

type Rpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

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

async function call<T = Record<string, string | number | boolean | null>>(
  db: Rpc,
  fn: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const r = await db.rpc(fn, args);
  if (r.error)
    throw new Error(r.error.message.match(/\b[A-Z][A-Z0-9_]{3,}\b/)?.[0] ?? "DUEL_REQUEST_FAILED");
  return r.data as T;
}

const key = z.string().min(8).max(100);
export const duelAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .validator((raw: unknown) =>
    z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("practice"), combatVersion: z.literal(2), key }),
        z.object({
          action: z.enum(["enter", "create"]),
          combatVersion: z.literal(2),
          stake: z.number().int().min(0).max(5000),
          bestOf: z.union([z.literal(5), z.literal(9)]),
          private: z.boolean(),
          key,
        }),
        z.object({
          action: z.literal("join"),
          combatVersion: z.literal(2),
          matchId: z.string().uuid(),
          key,
          invite: z.string().max(128).optional(),
        }),
        z.object({ action: z.literal("cancel"), matchId: z.string().uuid() }),
        z.object({
          action: z.literal("rematch"),
          combatVersion: z.literal(2),
          matchId: z.string().uuid(),
          key,
        }),
      ])
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const db = context.supabase as unknown as Rpc;
    if (data.action === "cancel") return call(db, "fps_cancel", { p_match: data.matchId });
    const r = await runtime();
    const health = await fetch(`${r.origin}/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error("FPS_RUNTIME_UNAVAILABLE");
    const capability = (await health.json()) as { configured?: boolean; combatVersion?: number };
    if (!capability.configured || capability.combatVersion !== 2)
      throw new Error("FPS_RUNTIME_UNAVAILABLE");
    if (data.action === "practice") return call(db, "fps_practice_start", { p_key: data.key });
    if (data.action === "rematch")
      return call(db, "fps_rematch", { p_match: data.matchId, p_key: data.key });
    if (data.action === "enter" || data.action === "create")
      return call(db, data.action === "create" ? "fps_create" : "fps_enter", {
        p_stake: data.stake,
        p_best_of: data.bestOf,
        p_key: data.key,
        p_private: data.private,
        ...(data.action === "enter" ? { p_invite: null } : {}),
      });
    if (data.action !== "join") throw new Error("DUEL_REQUEST_FAILED");
    return call(db, "fps_join", {
      p_match: data.matchId,
      p_key: data.key,
      p_invite: data.invite ?? null,
    });
  });

/** A live session and database membership are required before minting each connection ticket. */
export const duelAdmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireLiveSession])
  .validator((raw: unknown) =>
    z.object({ matchId: z.string().uuid(), spectate: z.boolean().default(false) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const r = await runtime();
    const sessionId = context.claims.session_id;
    const authExpiresAt = Number(context.claims.exp) * 1000;
    if (
      typeof sessionId !== "string" ||
      !Number.isSafeInteger(authExpiresAt) ||
      authExpiresAt <= Date.now()
    )
      throw new Error("SESSION_REVOKED");
    const db = context.supabase as unknown as Rpc;
    const match = await call<DuelView | null>(db, "fps_view", { p_match: data.matchId });
    if (!match || !match.opponent_id || !["FUNDED", "STARTING", "PLAYING"].includes(match.status))
      throw new Error("MATCH_NOT_READY");
    const participant = [match.creator_id, match.opponent_id].includes(context.userId);
    const expiresAt = Date.parse(match.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error("MATCH_EXPIRED");
    if (!data.spectate && !participant) throw new Error("NOT_A_PLAYER");
    if (data.spectate && match.private) throw new Error("PRIVATE_MATCH");
    const initialized = await fetch(`${r.origin}/internal/matches/${match.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${r.secret}` },
      body: JSON.stringify({
        id: match.id,
        creator_id: match.creator_id,
        opponent_id: match.opponent_id,
        stake: match.stake,
        best_of: match.best_of,
        practice: match.practice === true,
        private: match.private,
        expiresAt,
        // The runtime rejects ids it cannot simulate; absent means Dustfront.
        ...(typeof match.map_id === "string" ? { map_id: match.map_id } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!initialized.ok) throw new Error("FPS_RUNTIME_UNAVAILABLE");
    const { signAdmission } = await import("./ticket");
    const ticket = await signAdmission(
      {
        v: 2,
        aud: "fps-duel",
        matchId: match.id,
        sub: context.userId,
        sessionId,
        authExpiresAt,
        role: data.spectate ? "spectator" : "player",
        nonce: crypto.randomUUID(),
        exp: Math.min(Date.now() + 60_000, authExpiresAt),
      },
      r.secret,
    );
    return {
      url: `${r.origin.replace(/^http/, "ws")}/matches/${match.id}/socket?ticket=${encodeURIComponent(ticket)}`,
      expiresAt: Date.now() + 60_000,
    };
  });
