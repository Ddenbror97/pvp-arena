import { createBombBots } from "../../src/lib/fps/bomb/bots";
import {
  assignSlot,
  createBombMatch,
  startBombMatch,
  stepBombMatch,
  validateBombInput,
} from "../../src/lib/fps/bomb/match";
import {
  BOMB_RULES,
  SLOT_COUNT,
  type BombEvent,
  type BombInput,
  type BombMatchState,
} from "../../src/lib/fps/bomb/rules";
import { BombReveal, bombViewFor } from "../../src/lib/fps/bomb/snapshot";
import { SNAPSHOT_INTERVAL_MS } from "../../src/lib/fps/network";
import { TICK_MS } from "../../src/lib/fps/simulation";
import { equalSecret, verifyAdmission } from "../../src/lib/fps/ticket";
import { sessionKey, sessionReader, type SessionIdentity } from "./session-auth";
import type { Env } from "./index";

/**
 * Practice Bomb Defusal (5v5) on Sandgate: no money, no ledger, no database rows. Each match is
 * one BombRoom (isolated state, bots in the room); the single BombLobby routes a joining player to
 * a room with a free bot slot, or to a new match id when every room is full. Rooms decide slots
 * themselves (a stale lobby view can only cost a retry, never a duplicate or a wrong team).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const BOT_NAMES = [
  "Hawk",
  "Viper",
  "Nomad",
  "Atlas",
  "Rook",
  "Sable",
  "Dune",
  "Flint",
  "Mako",
  "Onyx",
];
const botSlot = (slot: number) => ({
  id: `bot-${slot}`,
  name: `BOT ${BOT_NAMES[slot]!}`,
  bot: true,
});
/** Rooms with no human for this long shut down. */
const EMPTY_ROOM_MS = 60_000;
/** Session re-check period for connected humans. */
const SESSION_CHECK_MS = 15_000;
const sanitizeName = (name: unknown) =>
  typeof name === "string"
    ? name
        .replace(/[^\p{L}\p{N} _.-]/gu, "")
        .trim()
        .slice(0, 20) || "Player"
    : "Player";

async function authorized(request: Request, env: Env) {
  return (
    request.method === "POST" &&
    (await equalSecret(
      request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "",
      env.FPS_RUNTIME_SECRET,
    ))
  );
}

// ------------------------------------------------------------------------------ lobby
type RoomInfo = { humans: number; updatedAt: number };

export class BombLobby {
  private rooms = new Map<string, RoomInfo>();
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (!(await authorized(request, this.env))) return json({ error: "FORBIDDEN" }, 403);
    const url = new URL(request.url);
    const now = Date.now();
    for (const [id, r] of this.rooms) if (now - r.updatedAt > 5 * 60_000) this.rooms.delete(id);
    if (url.pathname.endsWith("/join")) {
      const exclude = new Set<string>(
        (url.searchParams.get("exclude") ?? "").split(",").filter(Boolean),
      );
      // Fullest room that still has room first (fills matches instead of spreading players thin).
      const open = [...this.rooms.entries()]
        .filter(([id, r]) => r.humans < SLOT_COUNT && !exclude.has(id))
        .sort((a, b) => b[1].humans - a[1].humans);
      const matchId = open[0]?.[0] ?? crypto.randomUUID();
      if (!open.length) this.rooms.set(matchId, { humans: 0, updatedAt: now });
      return json({ matchId });
    }
    if (url.pathname.endsWith("/report")) {
      const body = (await request.json().catch(() => null)) as {
        matchId?: unknown;
        humans?: unknown;
      } | null;
      if (
        !body ||
        typeof body.matchId !== "string" ||
        !UUID.test(body.matchId) ||
        typeof body.humans !== "number"
      )
        return json({ error: "BAD_REPORT" }, 400);
      if (body.humans < 0) this.rooms.delete(body.matchId);
      else this.rooms.set(body.matchId, { humans: body.humans, updatedAt: now });
      return json({ ok: true });
    }
    return json({ error: "NOT_FOUND" }, 404);
  }
}

// ------------------------------------------------------------------------------ room
type Attachment = SessionIdentity & {
  slot: number;
  connectionId: string;
  window: number;
  count: number;
  seq: number;
  spectate: number | null;
};

/** Longest per-player input backlog (≈ 4 ticks). */
const MAX_INPUT_BACKLOG = 4;

export class BombRoom {
  private state: BombMatchState | null = null;
  private matchId = "";
  private bots = createBombBots();
  private reveal = new BombReveal();
  /**
   * Per-slot input queues. Clients send one input per 34 ms step; the room ticks at 33.3 ms, so a
   * tick can see zero or two arrivals. One input is applied per tick (bursts cannot add movement
   * time); a backlog beyond MAX_INPUT_BACKLOG drops the oldest so latency stays bounded.
   */
  private queues = new Map<number, BombInput[]>();
  private unsent: BombEvent[] = [];
  private eventId = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot = 0;
  private lastSessionCheck = 0;
  private emptySince: number | null = null;
  private readSessions: ReturnType<typeof sessionReader>;
  private busy = false;

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.readSessions = sessionReader(env);
  }

  private sockets() {
    return this.ctx.getWebSockets().filter((s) => s.readyState === WebSocket.OPEN);
  }
  private humans() {
    return new Set(this.sockets().map((s) => (s.deserializeAttachment() as Attachment).slot));
  }
  private async report() {
    const humans = this.state ? this.humans().size : -1;
    await this.env.BOMB_LOBBY.get(this.env.BOMB_LOBBY.idFromName("lobby"))
      .fetch("https://lobby/report", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.env.FPS_RUNTIME_SECRET}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ matchId: this.matchId, humans }),
      })
      .catch(() => {});
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const m = /^\/bomb\/([0-9a-f-]{36})\/socket$/.exec(url.pathname);
    if (!m || !UUID.test(m[1]!)) return json({ error: "NOT_FOUND" }, 404);
    const claims = await verifyAdmission(
      url.searchParams.get("ticket") ?? "",
      this.env.FPS_RUNTIME_SECRET,
      Date.now(),
      "fps-bomb",
    );
    if (!claims || claims.matchId !== m[1] || claims.role !== "player")
      return json({ error: "ADMISSION_DENIED" }, 403);
    try {
      if (!(await this.readSessions([claims])).has(sessionKey(claims)))
        return json({ error: "SESSION_REVOKED" }, 403);
    } catch {
      return json({ error: "SESSION_CHECK_UNAVAILABLE" }, 503);
    }
    const consumed = await this.ctx.storage.transaction(async (tx) => {
      if (await tx.get(`admission:${claims.nonce}`)) return false;
      await tx.put(`admission:${claims.nonce}`, claims.exp);
      return true;
    });
    if (!consumed) return json({ error: "TICKET_REPLAY" }, 403);
    this.matchId = m[1]!;
    const now = Date.now();
    if (!this.state || this.state.phase === "completed") {
      this.state = createBombMatch(
        Array.from({ length: SLOT_COUNT }, (_, slot) => botSlot(slot)),
        now,
      );
      startBombMatch(this.state, now);
      this.bots = createBombBots();
      this.reveal = new BombReveal();
    }
    const state = this.state;
    // The same user reconnecting keeps their slot; the old socket is replaced.
    let slot = state.players.findIndex((p) => !p.bot && p.id === claims.sub);
    for (const old of this.ctx.getWebSockets()) {
      const a = old.deserializeAttachment() as Attachment;
      if (a.sub === claims.sub) old.close(4001, "Replaced by a new connection");
    }
    if (slot < 0) {
      // Take a bot's slot on the team with fewer humans (ties: the team that is on defence first).
      const humansOn = (group: "alpha" | "bravo") =>
        state.players.filter((p) => !p.bot && p.group === group).length;
      const group = humansOn("alpha") <= humansOn("bravo") ? "alpha" : "bravo";
      slot = state.players.findIndex((p) => p.bot && p.group === group);
      if (slot < 0) slot = state.players.findIndex((p) => p.bot);
      if (slot < 0) return json({ error: "ROOM_FULL" }, 409);
      assignSlot(state, slot, { id: claims.sub, name: sanitizeName(claims.name), bot: false });
      this.bots.release(slot);
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      sub: claims.sub,
      sessionId: claims.sessionId,
      authExpiresAt: claims.authExpiresAt,
      slot,
      connectionId: claims.nonce,
      window: now,
      count: 0,
      seq: -1,
      spectate: null,
    } satisfies Attachment);
    this.queues.delete(slot);
    this.emptySince = null;
    this.send(server, {
      v: 1,
      type: "welcome",
      mode: "bomb",
      matchId: this.matchId,
      slot,
      map: state.mapId,
    });
    // The joining view carries no events: they belong to ticks this player never saw.
    this.send(server, { ...bombViewFor(state, slot, null, this.reveal, now), events: [] });
    void this.report();
    if (!this.timer) this.timer = setInterval(() => void this.tick(), Math.ceil(TICK_MS));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (!this.state || typeof message !== "string" || message.length > 512) {
      socket.close(1009, "Invalid message");
      return;
    }
    const a = socket.deserializeAttachment() as Attachment;
    const now = Date.now();
    if (a.authExpiresAt <= now) {
      socket.close(1008, "Session expired");
      return;
    }
    if (now - a.window >= 1000) {
      a.window = now;
      a.count = 0;
    }
    if (++a.count > 70) {
      socket.close(1008, "Input rate exceeded");
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(message);
    } catch {
      socket.close(1008, "Invalid JSON");
      return;
    }
    const data = raw as { v?: unknown; type?: unknown; slot?: unknown };
    if (data?.v === 1 && data.type === "spectate" && Object.keys(data).length === 3) {
      a.spectate = typeof data.slot === "number" && Number.isInteger(data.slot) ? data.slot : null;
      socket.serializeAttachment(a);
      return;
    }
    const input = validateBombInput(raw);
    if (!input) {
      socket.close(1008, "Invalid input");
      return;
    }
    if (input.seq <= a.seq) return;
    a.seq = input.seq;
    socket.serializeAttachment(a);
    const queue = this.queues.get(a.slot) ?? [];
    queue.push(input);
    while (queue.length > MAX_INPUT_BACKLOG) queue.shift();
    this.queues.set(a.slot, queue);
  }

  webSocketClose(socket: WebSocket, code?: number) {
    if (code !== undefined && socket.readyState !== WebSocket.CLOSED)
      socket.close(1000, "Connection closed");
    const a = socket.deserializeAttachment() as Attachment;
    if (!this.state) return;
    // The slot goes back to a bot unless the same user is still connected elsewhere. The slot keeps
    // its life, team, bomb and score for the round (assignSlot never touches round state).
    const still = this.sockets().some(
      (s) => s !== socket && (s.deserializeAttachment() as Attachment).sub === a.sub,
    );
    if (!still && !this.state.players[a.slot]!.bot) {
      assignSlot(this.state, a.slot, botSlot(a.slot));
      this.queues.delete(a.slot);
      this.reveal.forget(a.slot);
    }
    void this.report();
  }
  webSocketError(socket: WebSocket) {
    socket.close(1011, "Connection failed");
    this.webSocketClose(socket);
  }

  private send(socket: WebSocket, value: unknown) {
    try {
      if (socket.readyState === WebSocket.OPEN)
        socket.send(typeof value === "string" ? value : JSON.stringify(value));
    } catch {
      socket.close(1011, "Connection lost");
    }
  }

  private async tick() {
    if (this.busy || !this.state) return;
    this.busy = true;
    try {
      const now = Date.now();
      const state = this.state;
      const sockets = this.sockets();
      // Periodic strict session check for every connected human.
      if (now - this.lastSessionCheck > SESSION_CHECK_MS && sockets.length) {
        this.lastSessionCheck = now;
        const infos = sockets.map((s) => s.deserializeAttachment() as Attachment);
        try {
          const active = await this.readSessions(infos);
          for (const s of sockets) {
            const a = s.deserializeAttachment() as Attachment;
            if (!active.has(sessionKey(a)) || a.authExpiresAt <= Date.now()) {
              s.close(1008, "Session revoked");
              this.webSocketClose(s);
            }
          }
        } catch {
          /* transient: retry next period */
        }
      }
      if (!this.sockets().length) {
        this.emptySince ??= now;
        if (now - this.emptySince > EMPTY_ROOM_MS) {
          clearInterval(this.timer!);
          this.timer = null;
          this.state = null;
          await this.report();
          return;
        }
      }
      const inputs: Record<number, BombInput> = { ...this.bots.inputs(state, now) };
      for (const [slot, queue] of this.queues) {
        const input = queue.shift();
        if (input && !state.players[slot]!.bot) inputs[slot] = input;
      }
      const tick = state.tick;
      stepBombMatch(state, inputs, now);
      // Events accumulate between snapshots (ticks are 33.3 ms, snapshots 34 ms: a snapshot can
      // span two ticks), each with an increasing id so clients present it once.
      if (state.tick !== tick)
        for (const e of state.events) this.unsent.push({ ...e, id: ++this.eventId });
      // Snapshots: each human gets their own filtered view.
      if (now - this.lastSnapshot >= SNAPSHOT_INTERVAL_MS) {
        this.lastSnapshot = now;
        const tickEvents = state.events;
        state.events = this.unsent.slice(-64);
        for (const s of this.sockets()) {
          const a = s.deserializeAttachment() as Attachment;
          this.send(s, bombViewFor(state, a.slot, a.spectate, this.reveal, now));
        }
        state.events = tickEvents;
        this.unsent = [];
      }
      // A finished match restarts after a short break for whoever is still here.
      if (state.phase === "completed" && now > state.server!.lastStepAt + BOMB_RULES.halftimeMs) {
        const humans = state.players
          .filter((p) => !p.bot)
          .map((p) => ({ id: p.id, name: p.name, bot: false, slot: p.slot }));
        const next = createBombMatch(
          Array.from(
            { length: SLOT_COUNT },
            (_, slot) => humans.find((h) => h.slot === slot) ?? botSlot(slot),
          ),
          now,
        );
        startBombMatch(next, now);
        this.state = next;
        this.bots = createBombBots();
      }
    } finally {
      this.busy = false;
    }
  }
}
