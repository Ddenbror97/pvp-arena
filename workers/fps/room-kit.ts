import { equalSecret, verifyAdmission } from "../../src/lib/fps/ticket";
import { sessionKey, type SessionIdentity, type sessionReader } from "./session-auth";

/**
 * What every practice room does the same way (foundation audit 2026-11-10: the 5v5 and battle
 * royale rooms each carried their own copy of this, and a fourth game would have carried a
 * fourth): responses, the runtime secret, admission, the per-socket rate limit, the ping reply,
 * the periodic session sweep. A room keeps its own match, seats and views.
 */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const sanitizeName = (name: unknown) =>
  typeof name === "string"
    ? name
        .replace(/[^\p{L}\p{N} _.-]/gu, "")
        .trim()
        .slice(0, 20) || "Player"
    : "Player";

/** A POST carrying the runtime secret (the site's server and the rooms talk this way). */
export async function authorized(request: Request, secret: string) {
  return (
    request.method === "POST" &&
    (await equalSecret(request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "", secret))
  );
}

type Claims = NonNullable<Awaited<ReturnType<typeof verifyAdmission>>>;

/**
 * Admission to a match's socket: a valid player ticket for this match and mode, a live session
 * in the database, and a ticket not used before (its nonce is burnt in the room's storage).
 * Returns the claims, or the refusal to send.
 */
export async function admit(
  url: URL,
  matchId: string,
  audience: Parameters<typeof verifyAdmission>[3],
  secret: string,
  readSessions: ReturnType<typeof sessionReader>,
  storage: DurableObjectStorage,
  /** A mode's own refusal for a valid ticket (a stale client), before the session is read. */
  gate?: () => Response | null,
): Promise<Claims | Response> {
  const claims = await verifyAdmission(
    url.searchParams.get("ticket") ?? "",
    secret,
    Date.now(),
    audience,
  );
  if (!claims || claims.matchId !== matchId || claims.role !== "player")
    return json({ error: "ADMISSION_DENIED" }, 403);
  const refused = gate?.();
  if (refused) return refused;
  try {
    if (!(await readSessions([claims])).has(sessionKey(claims)))
      return json({ error: "SESSION_REVOKED" }, 403);
  } catch {
    return json({ error: "SESSION_CHECK_UNAVAILABLE" }, 503);
  }
  const fresh = await storage.transaction(async (tx) => {
    if (await tx.get(`admission:${claims.nonce}`)) return false;
    await tx.put(`admission:${claims.nonce}`, claims.exp);
    return true;
  });
  return fresh ? claims : json({ error: "TICKET_REPLAY" }, 403);
}

/** Messages a socket may send per second. */
export const MESSAGE_RATE = 70;

/** Count one message against the socket's one-second window; false once it is over the rate. */
export function withinRate(a: { window: number; count: number }, now: number) {
  if (now - a.window >= 1000) {
    a.window = now;
    a.count = 0;
  }
  return ++a.count <= MESSAGE_RATE;
}

/** The reply to a latency ping: exactly `{ v: 1, type: "pong", id }`. */
export function pongId(raw: unknown): string | null {
  const data = raw as { v?: unknown; type?: unknown; id?: unknown } | null;
  return data?.v === 1 &&
    data.type === "pong" &&
    typeof data.id === "string" &&
    data.id.length <= 64 &&
    Object.keys(data).length === 3
    ? data.id
    : null;
}

/** Practice rooms re-check their players' sessions this often. */
export const SESSION_CHECK_MS = 15_000;

/**
 * One periodic session sweep: sockets whose session the database no longer lists, or whose
 * token has expired, are handed to `revoke`. A read that fails keeps everyone in until the
 * next sweep (only expired tokens go): a database blip must not empty a room.
 */
export async function sweepSessions<A extends SessionIdentity>(
  sockets: WebSocket[],
  readSessions: ReturnType<typeof sessionReader>,
  revoke: (socket: WebSocket) => void,
) {
  const infos = sockets.map((s) => s.deserializeAttachment() as A);
  const active = await readSessions(infos).catch(() => null);
  for (const s of sockets) {
    const a = s.deserializeAttachment() as A;
    if ((active && !active.has(sessionKey(a))) || a.authExpiresAt <= Date.now()) revoke(s);
  }
}
