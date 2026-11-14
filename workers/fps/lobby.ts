import { LOBBY_HEARTBEAT_MS, loadTable, saveTable } from "./lobby-store";
import { UUID, authorized, json } from "./room-kit";

export { LOBBY_HEARTBEAT_MS };

/**
 * One lobby for any mode that fills matches (foundation audit 2026-11-10: the 5v5 and battle
 * royale lobbies were two copies with small differences). It sends a joining player to the
 * fullest match that still takes players, else to a new one; rooms report their head count.
 * A mode's lobby is a subclass that only sets the options (Durable Object classes are bound
 * by name).
 */
type RoomInfo = {
  humans: number;
  open: boolean;
  updatedAt: number;
  ended?: boolean;
  /** The map a room plays or will play next (5v5), so a joining page loads it at once. */
  map?: string;
};
type Member = { matchId: string; at: number };
export type LobbyOptions = {
  /** Seats per match. */
  capacity: number;
  /**
   * Remember who plays where, so a player who drops out and joins again goes back to their
   * own running match (battle royale reconnect).
   */
  members: boolean;
};
/** A room that has not reported for this long is forgotten (rooms heartbeat every minute). */
const ROOM_SILENT_MS = 5 * 60_000;
const MEMBER_MS = 60 * 60_000;

export class MatchLobby {
  private rooms = new Map<string, RoomInfo>();
  private members = new Map<string, Member>();
  private restored: Promise<void> | null = null;
  constructor(
    private ctx: DurableObjectState,
    private secret: string,
    private options: LobbyOptions,
  ) {}

  private save() {
    saveTable(this.ctx, "rooms", this.rooms);
    if (this.options.members) saveTable(this.ctx, "members", this.members);
  }

  async fetch(request: Request): Promise<Response> {
    if (!(await authorized(request, this.secret))) return json({ error: "FORBIDDEN" }, 403);
    // The tables survive an eviction or a deploy (lobby-store.ts).
    await (this.restored ??= Promise.all([
      loadTable<RoomInfo>(this.ctx, "rooms"),
      loadTable<Member>(this.ctx, "members"),
    ]).then(([rooms, members]) => {
      this.rooms = rooms;
      this.members = members;
    }));
    const url = new URL(request.url);
    const now = Date.now();
    for (const [id, r] of this.rooms) if (now - r.updatedAt > ROOM_SILENT_MS) this.rooms.delete(id);
    for (const [sub, m] of this.members)
      if (now - m.at > MEMBER_MS || !this.rooms.has(m.matchId)) this.members.delete(sub);
    if (url.pathname.endsWith("/join")) {
      const body = (await request.json().catch(() => null)) as { sub?: unknown } | null;
      const sub =
        this.options.members && typeof body?.sub === "string" && body.sub.length <= 64
          ? body.sub
          : null;
      const mine = sub ? this.members.get(sub) : undefined;
      const own = mine ? this.rooms.get(mine.matchId) : undefined;
      if (mine && own && !own.ended)
        return json(own.map ? { matchId: mine.matchId, map: own.map } : { matchId: mine.matchId });
      const exclude = new Set((url.searchParams.get("exclude") ?? "").split(",").filter(Boolean));
      // The fullest match that still takes players (fills matches instead of spreading thin).
      const open = [...this.rooms.entries()]
        .filter(([id, r]) => r.open && r.humans < this.options.capacity && !exclude.has(id))
        .sort((a, b) => b[1].humans - a[1].humans);
      const matchId = open[0]?.[0] ?? crypto.randomUUID();
      if (!open.length) this.rooms.set(matchId, { humans: 0, open: true, updatedAt: now });
      if (sub) this.members.set(sub, { matchId, at: now });
      this.save();
      const map = this.rooms.get(matchId)?.map;
      return json(map ? { matchId, map } : { matchId });
    }
    if (url.pathname.endsWith("/report")) {
      const body = (await request.json().catch(() => null)) as {
        matchId?: unknown;
        humans?: unknown;
        open?: unknown;
        released?: unknown;
        ended?: unknown;
        map?: unknown;
      } | null;
      if (
        !body ||
        typeof body.matchId !== "string" ||
        !UUID.test(body.matchId) ||
        typeof body.humans !== "number" ||
        (body.open !== undefined && typeof body.open !== "boolean")
      )
        return json({ error: "BAD_REPORT" }, 400);
      if (body.humans < 0) this.rooms.delete(body.matchId);
      else
        this.rooms.set(body.matchId, {
          humans: body.humans,
          // A mode whose matches always take players (5v5) reports no `open`.
          open: body.open ?? true,
          updatedAt: now,
          ended: body.ended === true,
          ...(typeof body.map === "string" && body.map.length <= 32 ? { map: body.map } : {}),
        });
      if (Array.isArray(body.released))
        for (const sub of body.released.slice(0, 100))
          if (typeof sub === "string" && this.members.get(sub)?.matchId === body.matchId)
            this.members.delete(sub);
      this.save();
      return json({ ok: true });
    }
    return json({ error: "NOT_FOUND" }, 404);
  }
}
