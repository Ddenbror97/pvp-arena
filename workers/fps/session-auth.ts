export type SessionIdentity = { sub: string; sessionId: string; authExpiresAt: number };
type SessionEnvironment = { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string };
export const sessionKey = (s: Pick<SessionIdentity, "sub" | "sessionId">) =>
  `${s.sessionId}:${s.sub}`;

/** No positive leases: every decision is backed by a new authoritative database read. */
export async function liveSessions(env: SessionEnvironment, identities: SessionIdentity[]) {
  const requested = new Map(identities.map((s) => [sessionKey(s), s]));
  if (!requested.size) return new Set<string>();
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/fps_check_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      p_sessions: [...requested.values()].map((s) => ({ session_id: s.sessionId, user_id: s.sub })),
    }),
    signal: AbortSignal.timeout(1200),
  });
  if (!response.ok) throw new Error("SESSION_CHECK_UNAVAILABLE");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || rows.length !== requested.size)
    throw new Error("INVALID_SESSION_STATUS");
  const seen = new Set<string>(),
    active = new Set<string>();
  for (const row of rows) {
    if (
      !row ||
      typeof row !== "object" ||
      typeof row.sessionId !== "string" ||
      typeof row.userId !== "string" ||
      typeof row.active !== "boolean"
    )
      throw new Error("INVALID_SESSION_STATUS");
    const key = sessionKey({ sessionId: row.sessionId, sub: row.userId });
    const identity = requested.get(key);
    if (!identity || seen.has(key)) throw new Error("INVALID_SESSION_STATUS");
    seen.add(key);
    if (row.active && identity.authExpiresAt > Date.now()) active.add(key);
  }
  return active;
}
