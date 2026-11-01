import postgres from "postgres";

export const SESSION_READ_CONCURRENCY = 4;

export type SessionIdentity = { sub: string; sessionId: string; authExpiresAt: number };
type SessionEnvironment = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  HYPERDRIVE?: { connectionString: string };
};
export const sessionKey = (s: Pick<SessionIdentity, "sub" | "sessionId">) =>
  `${s.sessionId}:${s.sub}`;

/** Owned by one Durable Object; never shared across different rooms or requests. */
export function sessionReader(env: SessionEnvironment) {
  const sql = env.HYPERDRIVE
    ? postgres(env.HYPERDRIVE.connectionString, {
        max: SESSION_READ_CONCURRENCY,
        fetch_types: false,
        prepare: true,
        connect_timeout: 1,
        idle_timeout: 10,
      })
    : undefined;
  return (identities: SessionIdentity[]) => liveSessions(env, identities, sql);
}

/** No positive leases: every decision is backed by a new authoritative database read. */
export async function liveSessions(
  env: SessionEnvironment,
  identities: SessionIdentity[],
  client?: ReturnType<typeof postgres>,
) {
  const requested = new Map(identities.map((s) => [sessionKey(s), s]));
  if (!requested.size) return new Set<string>();
  const rows = env.HYPERDRIVE
    ? await checkSessionsWithHyperdrive(
        env.HYPERDRIVE.connectionString,
        [...requested.values()],
        client,
      )
    : await checkSessionsWithRest(env, [...requested.values()]);
  return parseSessionStatuses(rows, requested);
}

async function checkSessionsWithHyperdrive(
  connectionString: string,
  identities: SessionIdentity[],
  client?: ReturnType<typeof postgres>,
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
    const result = await sql<{ result: unknown }[]>`
      select fps_private.check_sessions(${sql.json(payload)}) as result
    `;
    const rows = result[0]?.result;
    if (!Array.isArray(rows)) throw new Error("INVALID_SESSION_STATUS");
    return rows;
  } finally {
    if (!client) void sql.end({ timeout: 1 }).catch(() => {});
  }
}

async function checkSessionsWithRest(env: SessionEnvironment, identities: SessionIdentity[]) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/fps_check_sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      p_sessions: identities.map((s) => ({ session_id: s.sessionId, user_id: s.sub })),
    }),
    signal: AbortSignal.timeout(1200),
  });
  if (!response.ok) throw new Error("SESSION_CHECK_UNAVAILABLE");
  return response.json();
}

function parseSessionStatuses(rows: unknown, requested: Map<string, SessionIdentity>) {
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
