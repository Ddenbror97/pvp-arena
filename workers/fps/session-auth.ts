import postgres from "postgres";

export const SESSION_READ_CONCURRENCY = 4;

export type SessionIdentity = { sub: string; sessionId: string; authExpiresAt: number };
type SessionEnvironment = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  HYPERDRIVE?: { connectionString: string };
  FPS_AC_ENFORCE?: string;
};
/**
 * Which anti-cheat restrictions refuse a session (migration 20261114030000): "competitive"
 * (matches with other players: a competitive restriction or a ban) or "practice" (solo
 * practice: a ban only).
 */
export type SessionScope = "competitive" | "practice";
export type Restriction = { kind: "competitive" | "ban"; until: string | null };
/** The live sessions, and of the others those refused by an anti-cheat restriction. */
export type LiveSessions = Set<string> & { restricted: Map<string, Restriction> };
export const sessionKey = (s: Pick<SessionIdentity, "sub" | "sessionId">) =>
  `${s.sessionId}:${s.sub}`;

/**
 * Owned by one Durable Object; never shared across different rooms or requests. With
 * FPS_AC_ENFORCE=1 every read also applies anti-cheat restrictions for `scope` (check v2);
 * otherwise it is the v1 check exactly as before.
 */
export function sessionReader(
  env: SessionEnvironment,
  scope: SessionScope | (() => SessionScope) = "competitive",
) {
  const sql = env.HYPERDRIVE
    ? postgres(env.HYPERDRIVE.connectionString, {
        max: SESSION_READ_CONCURRENCY,
        fetch_types: false,
        prepare: true,
        connect_timeout: 1,
        idle_timeout: 10,
      })
    : undefined;
  return (identities: SessionIdentity[]) =>
    liveSessions(
      env,
      identities,
      sql,
      env.FPS_AC_ENFORCE === "1" ? (typeof scope === "function" ? scope() : scope) : undefined,
    );
}

/** No positive leases: every decision is backed by a new authoritative database read. */
export async function liveSessions(
  env: SessionEnvironment,
  identities: SessionIdentity[],
  client?: ReturnType<typeof postgres>,
  scope?: SessionScope,
): Promise<LiveSessions> {
  const requested = new Map(identities.map((s) => [sessionKey(s), s]));
  if (!requested.size) return Object.assign(new Set<string>(), { restricted: new Map() });
  const rows = env.HYPERDRIVE
    ? await checkSessionsWithHyperdrive(
        env.HYPERDRIVE.connectionString,
        [...requested.values()],
        client,
        scope,
      )
    : await checkSessionsWithRest(env, [...requested.values()], scope);
  return parseSessionStatuses(rows, requested);
}

async function checkSessionsWithHyperdrive(
  connectionString: string,
  identities: SessionIdentity[],
  client?: ReturnType<typeof postgres>,
  scope?: SessionScope,
) {
  const sql =
    client ??
    postgres(connectionString, {
      max: 1,
      fetch_types: false,
      prepare: true,
      connect_timeout: 1,
    });
  try {
    const payload = identities.map((s) => ({ session_id: s.sessionId, user_id: s.sub }));
    const result = scope
      ? await sql<{ result: unknown }[]>`
          select fps_private.check_sessions_v2(${sql.json(payload)}, ${scope}) as result
        `
      : await sql<{ result: unknown }[]>`
          select fps_private.check_sessions(${sql.json(payload)}) as result
        `;
    const rows = result[0]?.result;
    if (!Array.isArray(rows)) throw new Error("INVALID_SESSION_STATUS");
    return rows;
  } finally {
    if (!client) void sql.end({ timeout: 1 }).catch(() => {});
  }
}

async function checkSessionsWithRest(
  env: SessionEnvironment,
  identities: SessionIdentity[],
  scope?: SessionScope,
) {
  const rpc = scope ? "fps_check_sessions_v2" : "fps_check_sessions";
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      p_sessions: identities.map((s) => ({ session_id: s.sessionId, user_id: s.sub })),
      ...(scope ? { p_scope: scope } : {}),
    }),
    signal: AbortSignal.timeout(1200),
  });
  if (!response.ok) throw new Error("SESSION_CHECK_UNAVAILABLE");
  return response.json();
}

function parseSessionStatuses(
  rows: unknown,
  requested: Map<string, SessionIdentity>,
): LiveSessions {
  if (!Array.isArray(rows) || rows.length !== requested.size)
    throw new Error("INVALID_SESSION_STATUS");
  const seen = new Set<string>(),
    active = Object.assign(new Set<string>(), { restricted: new Map<string, Restriction>() });
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
    else if (row.restricted === "competitive" || row.restricted === "ban")
      active.restricted.set(key, {
        kind: row.restricted,
        until: typeof row.until === "string" ? row.until : null,
      });
  }
  return active;
}
