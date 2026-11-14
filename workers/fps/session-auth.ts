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

/**
 * The anti-cheat check (v2) cannot be called at all: its function is missing or the caller
 * lacks EXECUTE (2026-11-14: the Hyperdrive login had no grant on check_sessions_v2, so every
 * room refused every player and the loading screens never ended). Not a transient failure.
 */
export class EnforcementUnavailable extends Error {
  constructor(readonly detail: string) {
    super("FPS_AC_ENFORCEMENT_UNAVAILABLE");
  }
}
/** Postgres: insufficient_privilege, undefined_function. PostgREST: no such function (PGRST202). */
const UNCALLABLE_SQLSTATES = new Set(["42501", "42883"]);
/** After v2 proved uncallable, how long sessions are read with v1 before v2 is tried again. */
export const ENFORCEMENT_RETRY_MS = 60_000;
let enforcementDownUntil = 0;
/** For tests: forget a degraded v2 (each isolate keeps its own). */
export function resetEnforcementFallback() {
  enforcementDownUntil = 0;
}

/**
 * No positive leases: every decision is backed by a new authoritative database read.
 *
 * Sessions are always checked. Only the anti-cheat restrictions layered on them (v2, with
 * FPS_AC_ENFORCE=1) degrade: when v2 cannot be called at all, the v1 check decides alone (as
 * before enforcement), an `fps_ac_enforcement_unavailable` event is logged, and v2 is retried
 * after ENFORCEMENT_RETRY_MS. An outage of the check itself still fails closed.
 */
export async function liveSessions(
  env: SessionEnvironment,
  identities: SessionIdentity[],
  client?: ReturnType<typeof postgres>,
  scope?: SessionScope,
  now = Date.now(),
): Promise<LiveSessions> {
  const requested = new Map(identities.map((s) => [sessionKey(s), s]));
  if (!requested.size) return Object.assign(new Set<string>(), { restricted: new Map() });
  const read = (s?: SessionScope) =>
    env.HYPERDRIVE
      ? checkSessionsWithHyperdrive(
          env.HYPERDRIVE.connectionString,
          [...requested.values()],
          client,
          s,
        )
      : checkSessionsWithRest(env, [...requested.values()], s);
  const enforce = scope && now >= enforcementDownUntil ? scope : undefined;
  let rows: unknown;
  try {
    rows = await read(enforce);
  } catch (error) {
    if (!enforce || !(error instanceof EnforcementUnavailable)) throw error;
    enforcementDownUntil = now + ENFORCEMENT_RETRY_MS;
    console.error(
      JSON.stringify({ event: "fps_ac_enforcement_unavailable", detail: error.detail, scope }),
    );
    rows = await read(undefined);
  }
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
    let result: { result: unknown }[];
    try {
      result = scope
        ? await sql<{ result: unknown }[]>`
            select fps_private.check_sessions_v2(${sql.json(payload)}, ${scope}) as result
          `
        : await sql<{ result: unknown }[]>`
            select fps_private.check_sessions(${sql.json(payload)}) as result
          `;
    } catch (error) {
      const code = (error as { code?: unknown } | null)?.code;
      if (scope && typeof code === "string" && UNCALLABLE_SQLSTATES.has(code))
        throw new EnforcementUnavailable(`sqlstate ${code}`);
      throw error;
    }
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
  if (!response.ok) {
    if (scope && (response.status === 403 || response.status === 404)) {
      const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
      const code = typeof body?.code === "string" ? body.code : "";
      if (UNCALLABLE_SQLSTATES.has(code) || code === "PGRST202")
        throw new EnforcementUnavailable(`rest ${response.status} ${code}`);
    }
    throw new Error("SESSION_CHECK_UNAVAILABLE");
  }
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
