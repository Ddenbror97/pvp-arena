import { validateBrAct, type ActEvent, type BrAct } from "../../src/lib/fps/br/actions";
import type { ShotEvent } from "../../src/lib/fps/br/combat";
import { decodeHeightfield } from "../../src/lib/fps/br/heightfield";
import { rollLoot } from "../../src/lib/fps/br/loot";
import { spawnVehicles } from "../../src/lib/fps/br/vehicles";
import { buildIsland, type Island } from "../../src/lib/fps/br/island";
import { decodeLandCover } from "../../src/lib/fps/br/landcover";
import {
  BrSeatSync,
  BrSight,
  brResult,
  checkpointBrMatch,
  restoreBrMatch,
  type BrCheckpoint,
  brViewFor,
  createBrMatch,
  releaseSeat,
  seatHuman,
  stepBrMatch,
  validateBrInput,
  type BrInput,
  type BrMatchState,
} from "../../src/lib/fps/br/match";
import type { CollisionData } from "../../src/lib/fps/br/static-world";
import { WORLD_ASSETS, type WorldMeta } from "../../src/lib/fps/br/world";
import { ConnectionTiming, SNAPSHOT_INTERVAL_MS } from "../../src/lib/fps/network";
import { TICK_MS } from "../../src/lib/fps/simulation";
import { equalSecret, verifyAdmission } from "../../src/lib/fps/ticket";
import { sessionKey, sessionReader, type SessionIdentity } from "./session-auth";
import type { Env } from "./index";

/**
 * Battle royale practice on Project Island (PLAN §6, §7 Phase 2): one BrRoom Durable Object per
 * match (100 seats, bots until humans take them), one BrLobby routing joins to an open match.
 * Free practice: no money, no ledger, no database rows (the result row arrives in Phase 3).
 *
 * The room loads the island from the site's static files once per isolate (the same files the
 * clients render and predict with, so server and client geometry cannot differ), builds the
 * shared collision world, and runs the shared match at 30 Hz.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
/** Rooms with no human for this long shut down (PLAN §6.1). */
const EMPTY_ROOM_MS = 120_000;
/** A disconnected human keeps their seat this long (reconnect), then a bot takes it (PLAN §6.1). */
const RECONNECT_MS = 60_000;
/** Periodic session re-check for practice (PLAN §6.5: the 5v5 rule). */
const SESSION_CHECK_MS = 15_000;
const MAX_INPUT_BACKLOG = 8;
/** Pending inventory/pickup actions per seat (applied up to 4 per tick). */
const MAX_ACT_BACKLOG = 8;

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

// ------------------------------------------------------------------------------ island
type Loaded = { island: Island; meta: WorldMeta; collision: CollisionData };
let loading: Promise<Loaded> | null = null;

/** The island, loaded once per isolate from the site's static files (`BR_ASSETS_URL`). */
export function loadIsland(env: Env): Promise<Loaded> {
  loading ??= (async () => {
    const base = (env.BR_ASSETS_URL ?? env.ALLOWED_ORIGIN).replace(/\/$/, "");
    const get = async (path: string) => {
      const r = await fetch(`${base}${path}`);
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r;
    };
    const [hfBuf, lcBuf, meta, collision] = await Promise.all([
      get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
      get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
      get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
      get("/fps/br/models/collision.json").then((r) => r.json() as Promise<CollisionData>),
    ]);
    const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
    return { island: buildIsland(hf, cover, meta, collision), meta, collision };
  })().catch((e) => {
    loading = null; // retry on the next join
    throw e;
  });
  return loading;
}

// ------------------------------------------------------------------------------ lobby
type RoomInfo = { humans: number; open: boolean; updatedAt: number; ended?: boolean };

export class BrLobby {
  private rooms = new Map<string, RoomInfo>();
  /**
   * Who plays where (PLAN §11.2 reconnect): a player who drops out mid-match and asks to join
   * again goes back to their own match (their seat is kept for 60 s), not to a new one.
   */
  private members = new Map<string, { matchId: string; at: number }>();
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    if (!(await authorized(request, this.env))) return json({ error: "FORBIDDEN" }, 403);
    const url = new URL(request.url);
    const now = Date.now();
    for (const [id, r] of this.rooms) if (now - r.updatedAt > 5 * 60_000) this.rooms.delete(id);
    for (const [sub, m] of this.members)
      if (now - m.at > 60 * 60_000 || !this.rooms.has(m.matchId)) this.members.delete(sub);
    if (url.pathname.endsWith("/join")) {
      const body = (await request.json().catch(() => null)) as { sub?: unknown } | null;
      const sub = typeof body?.sub === "string" && body.sub.length <= 64 ? body.sub : null;
      const mine = sub ? this.members.get(sub) : undefined;
      if (mine && this.rooms.has(mine.matchId) && !this.rooms.get(mine.matchId)!.ended)
        return json({ matchId: mine.matchId });
      // The fullest match still boarding (seats open before take-off), else a new one.
      const open = [...this.rooms.entries()]
        .filter(([, r]) => r.open && r.humans < 100)
        .sort((a, b) => b[1].humans - a[1].humans);
      const matchId = open[0]?.[0] ?? crypto.randomUUID();
      if (!open.length) this.rooms.set(matchId, { humans: 0, open: true, updatedAt: now });
      if (sub) this.members.set(sub, { matchId, at: now });
      return json({ matchId });
    }
    if (url.pathname.endsWith("/report")) {
      const body = (await request.json().catch(() => null)) as {
        matchId?: unknown;
        humans?: unknown;
        open?: unknown;
        released?: unknown;
        ended?: unknown;
      } | null;
      if (
        !body ||
        typeof body.matchId !== "string" ||
        !UUID.test(body.matchId) ||
        typeof body.humans !== "number" ||
        typeof body.open !== "boolean"
      )
        return json({ error: "BAD_REPORT" }, 400);
      if (body.humans < 0) this.rooms.delete(body.matchId);
      else
        this.rooms.set(body.matchId, {
          humans: body.humans,
          open: body.open,
          updatedAt: now,
          ended: body.ended === true,
        });
      if (Array.isArray(body.released))
        for (const sub of body.released.slice(0, 100))
          if (typeof sub === "string" && this.members.get(sub)?.matchId === body.matchId)
            this.members.delete(sub);
      return json({ ok: true });
    }
    return json({ error: "NOT_FOUND" }, 404);
  }
}

// ------------------------------------------------------------------------------ room
type Attachment = SessionIdentity & {
  seat: number;
  connectionId: string;
  window: number;
  count: number;
  seq: number;
};

export class BrRoom {
  private state: BrMatchState | null = null;
  private loaded: Loaded | null = null;
  private matchId = "";
  private sight = new BrSight();
  private queues = new Map<number, BrInput[]>();
  private acts = new Map<number, BrAct[]>();
  /** Per connection: the loot and loadout it has been sent. */
  private syncs = new Map<string, BrSeatSync>();
  /** Events since the last snapshot (a snapshot can cover more than one tick). */
  private pendingCombat: BrMatchState["combat"] = [];
  private pendingEvents: BrMatchState["events"] = [];
  /** Users whose seat was released since the last report to the lobby. */
  private released: string[] = [];
  /** Rejections per user this match (suspicious-event counter). */
  private rejects = new Map<string, number>();
  private lastCheckpoint = 0;
  /** The result row has been written (once per match). */
  private recorded = false;
  private timing = new Map<string, ConnectionTiming>();
  /** Seats whose human disconnected, and when (reconnect window). */
  private away = new Map<number, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot = 0;
  private lastSessionCheck = 0;
  private checkingSessions = false;
  private emptySince: number | null = null;
  private readSessions: ReturnType<typeof sessionReader>;
  private busy = false;
  /** Simulation clock: advances one TICK_MS per step (deterministic, independent of timers). */
  private clock = 0;

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.readSessions = sessionReader(env);
  }

  private sockets() {
    return this.ctx.getWebSockets().filter((s) => s.readyState === WebSocket.OPEN);
  }

  private async report() {
    const humans = this.state ? this.state.seats.filter((s) => !s.bot).length : -1;
    const open =
      !!this.state && (this.state.phase === "waiting" || this.state.phase === "starting");
    await this.env.BR_LOBBY.get(this.env.BR_LOBBY.idFromName("lobby"))
      .fetch("https://lobby/report", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.env.FPS_RUNTIME_SECRET}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          matchId: this.matchId,
          humans,
          open,
          // Players who no longer hold a seat here (left while boarding, or the reconnect
          // window passed): the lobby stops sending them back to this match.
          released: this.released.splice(0, 100),
          ended: !this.state || this.state.phase === "ending" || this.state.phase === "completed",
        }),
      })
      .catch(() => {});
  }

  private async ensureMatch(matchId: string) {
    this.loaded ??= await loadIsland(this.env);
    if (!this.state) {
      // A restarted room resumes its match from the last checkpoint (≤ 5 s old).
      const saved = await this.ctx.storage.get<{
        matchId: string;
        clock: number;
        data: BrCheckpoint;
      }>("br:checkpoint");
      if (saved && saved.matchId === matchId && saved.data.phase !== "completed") {
        const hf = this.loaded.island.solid.hf;
        const scale = this.env.BR_TEST_HOOKS === "1" ? Number(this.env.BR_TEST_ZONE_SCALE ?? 1) : 1;
        this.matchId = matchId;
        const solid = this.loaded.island.solid;
        this.state = restoreBrMatch(this.loaded.meta, (x, z) => hf.heightAt(x, z), saved.data, {
          zoneTimeScale: scale > 0 && scale <= 1 ? scale : 1,
          open: (x, z) => !solid.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
        });
        this.clock = saved.clock;
        this.sight = new BrSight();
        this.syncs.clear();
        // Humans are back to their seats when they reconnect; until then their bodies idle.
        for (const s of this.state.seats) if (!s.bot) this.away.set(s.seat, Date.now());
        return this.state;
      }
    }
    if (!this.state) {
      this.matchId = matchId;
      // Seed from the match id: the route and bot plans are reproducible for a given match.
      const seed = parseInt(matchId.replace(/-/g, "").slice(0, 8), 16) | 0;
      const hf = this.loaded.island.solid.hf;
      const { island, collision, meta } = this.loaded;
      const loot = rollLoot(seed, island.layout, collision, island.solid, meta);
      // Tests may run the zone faster (never in production: the hooks flag is unset there).
      const scale = this.env.BR_TEST_HOOKS === "1" ? Number(this.env.BR_TEST_ZONE_SCALE ?? 1) : 1;
      this.state = createBrMatch(meta, seed, (x, z) => hf.heightAt(x, z), loot, {
        zoneTimeScale: scale > 0 && scale <= 1 ? scale : 1,
        vehicles: spawnVehicles(meta, island.solid, seed),
        // The last circles close on open ground, never inside a building (zone.ts).
        open: (x, z) => !island.solid.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
      });
      this.recorded = false;
      this.syncs.clear();
      this.clock = 0;
      this.sight = new BrSight();
    }
    return this.state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // Test-only hook (never set in production): run N ticks synchronously for the runtime test.
    const hook = /^\/internal\/br\/([0-9a-f-]{36})\/tick$/.exec(url.pathname);
    if (hook) {
      if (this.env.BR_TEST_HOOKS !== "1" || !(await authorized(request, this.env)))
        return json({ error: "FORBIDDEN" }, 403);
      const state = await this.ensureMatch(hook[1]!);
      const n = Math.min(300, Math.max(1, Number(url.searchParams.get("n") ?? 1) | 0));
      for (let i = 0; i < n; i++) this.step();
      if (url.searchParams.get("snapshot") === "1") this.publishSnapshot(Date.now());
      return json({
        phase: state.phase,
        tick: state.tick,
        alive: state.seats.filter((s) => !s.dead).length,
        winner: state.winner,
        recorded: this.recorded,
        aboard: state.seats.filter((s) => s.body.phase === "plane").length,
        landed: state.seats.filter((s) => s.body.phase === "ground" || s.body.phase === "swim")
          .length,
        airborne: state.seats.filter(
          (s) => !s.dead && s.body.phase !== "ground" && s.body.phase !== "swim",
        ).length,
      });
    }
    const m = /^\/br\/([0-9a-f-]{36})\/socket$/.exec(url.pathname);
    if (!m || !UUID.test(m[1]!)) return json({ error: "NOT_FOUND" }, 404);
    const claims = await verifyAdmission(
      url.searchParams.get("ticket") ?? "",
      this.env.FPS_RUNTIME_SECRET,
      Date.now(),
      "fps-br",
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
    let state: BrMatchState;
    try {
      state = await this.ensureMatch(m[1]!);
    } catch {
      return json({ error: "WORLD_UNAVAILABLE" }, 503);
    }
    const seat = seatHuman(state, claims.sub, sanitizeName(claims.name));
    if (seat < 0) return json({ error: "MATCH_IN_PROGRESS" }, 409);
    // The same user's older socket is replaced.
    for (const old of this.ctx.getWebSockets()) {
      const a = old.deserializeAttachment() as Attachment;
      if (a.sub === claims.sub) old.close(4001, "Replaced by a new connection");
    }
    this.away.delete(seat);
    const now = Date.now();
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      sub: claims.sub,
      sessionId: claims.sessionId,
      authExpiresAt: claims.authExpiresAt,
      seat,
      connectionId: claims.nonce,
      window: now,
      count: 0,
      seq: -1,
    } satisfies Attachment);
    this.queues.delete(seat);
    this.acts.delete(seat);
    this.timing.set(claims.nonce, new ConnectionTiming());
    const sync = new BrSeatSync();
    this.syncs.set(claims.nonce, sync);
    this.emptySince = null;
    this.send(server, {
      v: 1,
      type: "welcome",
      mode: "br",
      matchId: this.matchId,
      seat,
      seed: state.seed,
      route: state.route,
    });
    this.send(server, {
      ...brViewFor(state, this.loaded!.island.solid, this.sight, seat, this.clock, sync),
      events: [],
      combat: [],
    });
    void this.report();
    if (!this.timer) this.timer = setInterval(() => void this.tick(), Math.ceil(TICK_MS));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (!this.state || typeof message !== "string" || message.length > 512) {
      this.reject(socket, 1009, "Invalid message");
      return;
    }
    const a = socket.deserializeAttachment() as Attachment;
    const now = Date.now();
    if (a.authExpiresAt <= now) {
      this.reject(socket, 1008, "Session expired");
      return;
    }
    if (now - a.window >= 1000) {
      a.window = now;
      a.count = 0;
    }
    if (++a.count > 70) {
      this.reject(socket, 1008, "Input rate exceeded");
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(message);
    } catch {
      this.reject(socket, 1008, "Invalid JSON");
      return;
    }
    const data = raw as { v?: unknown; type?: unknown; id?: unknown };
    if (
      data?.v === 1 &&
      data.type === "pong" &&
      typeof data.id === "string" &&
      data.id.length <= 64 &&
      Object.keys(data).length === 3
    ) {
      this.timing.get(a.connectionId)?.pong(data.id, now);
      return;
    }
    if (data?.type === "br-act") {
      const act = validateBrAct(raw);
      if (!act) {
        this.reject(socket, 1008, "Invalid action");
        return;
      }
      const list = this.acts.get(a.seat) ?? [];
      if (list.length < MAX_ACT_BACKLOG) list.push(act);
      this.acts.set(a.seat, list);
      return;
    }
    const input = validateBrInput(raw);
    if (!input) {
      this.reject(socket, 1008, "Invalid input");
      return;
    }
    if (input.seq <= a.seq) return;
    a.seq = input.seq;
    socket.serializeAttachment(a);
    const queue = this.queues.get(a.seat) ?? [];
    queue.push(input);
    while (queue.length > MAX_INPUT_BACKLOG) queue.shift();
    this.queues.set(a.seat, queue);
  }

  /**
   * Close a socket for a broken rule, with a structured log line (PLAN §11.2 anti-cheat:
   * suspicious-event counters per player). Nothing private is logged: the user id and reason.
   */
  private reject(socket: WebSocket, code: number, reason: string) {
    let sub = "?";
    try {
      sub = (socket.deserializeAttachment() as Attachment).sub;
    } catch {
      // A socket without an attachment.
    }
    const n = (this.rejects.get(sub) ?? 0) + 1;
    this.rejects.set(sub, n);
    console.log(JSON.stringify({ event: "br_reject", match: this.matchId, sub, reason, count: n }));
    socket.close(code, reason);
  }

  webSocketClose(socket: WebSocket, code?: number) {
    if (code !== undefined && socket.readyState !== WebSocket.CLOSED)
      socket.close(1000, "Connection closed");
    const a = socket.deserializeAttachment() as Attachment;
    this.timing.delete(a.connectionId);
    this.syncs.delete(a.connectionId);
    if (!this.state) return;
    const still = this.sockets().some(
      (s) => s !== socket && (s.deserializeAttachment() as Attachment).sub === a.sub,
    );
    if (still) return;
    this.queues.delete(a.seat);
    // Boarding: the seat goes straight back to a bot. In the air or on the ground: kept for the
    // reconnect window (the body idles), then handed to a bot.
    if (this.state.phase === "waiting" || this.state.phase === "starting") {
      releaseSeat(this.state, a.seat);
      this.released.push(a.sub);
    } else this.away.set(a.seat, Date.now());
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

  /**
   * The result rows, once per match (PLAN §11.2): idempotent by match id in the database
   * (supabase/migrations/…_br_match_results.sql), so a retry after a restart is harmless.
   */
  private async record() {
    if (!this.state || !this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_ROLE_KEY) return;
    const r = brResult(this.state);
    const winner = r.winner >= 0 ? r.players[r.winner] : undefined;
    try {
      await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/br_record_result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          p_match: this.matchId,
          p_result: {
            winnerUser: winner && !winner.bot ? winner.id : null,
            winnerName: winner?.name ?? null,
            players: r.players.map((p) => ({
              seat: p.seat,
              id: p.bot ? null : p.id,
              name: p.name,
              bot: p.bot,
              place: p.place,
              kills: p.kills,
              damage: p.damage,
              survived_ms: p.survivedMs,
            })),
          },
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Practice results are best effort; the match itself is unaffected.
    }
  }

  /** One simulation step: one queued input per human seat (bursts add no movement time). */
  private step() {
    const state = this.state!;
    const inputs = new Map<number, BrInput>();
    for (const [seat, queue] of this.queues) {
      const input = queue.shift();
      if (input && !state.seats[seat]!.bot) inputs.set(seat, input);
    }
    const acts = new Map<number, BrAct[]>();
    for (const [seat, list] of this.acts) {
      if (state.seats[seat]!.bot || !list.length) continue;
      acts.set(seat, list.splice(0, 4));
    }
    this.clock += TICK_MS;
    const before = state.phase;
    stepBrMatch(
      state,
      this.loaded!.island.solid,
      this.loaded!.meta,
      inputs,
      this.clock,
      TICK_MS,
      acts,
    );
    this.pendingCombat.push(...state.combat);
    this.pendingEvents.push(...state.events);
    // Ticks run without a snapshot only in the test hook: keep the buffers bounded.
    if (this.pendingCombat.length > 2000) this.pendingCombat.splice(0, 1000);
    if (this.pendingEvents.length > 2000) this.pendingEvents.splice(0, 1000);
    if (before !== state.phase && (before === "starting" || state.phase === "starting"))
      void this.report();
    if (state.phase === "completed" && !this.recorded) {
      this.recorded = true;
      this.ctx.waitUntil(this.record());
      this.ctx.waitUntil(this.ctx.storage.delete("br:checkpoint"));
    }
    // Checkpoint every 5 s of match time while the match runs (restart recovery).
    if (
      (state.phase === "plane" || state.phase === "active" || state.phase === "ending") &&
      this.clock - this.lastCheckpoint >= 5000
    ) {
      this.lastCheckpoint = this.clock;
      this.ctx.waitUntil(
        this.ctx.storage.put("br:checkpoint", {
          matchId: this.matchId,
          clock: this.clock,
          data: checkpointBrMatch(state),
        }),
      );
    }
  }

  /** The same publication path for the live timer and an explicitly requested test snapshot. */
  private publishSnapshot(now: number) {
    if (!this.state || !this.loaded) return;
    // Every event since the last snapshot goes out once.
    this.state.combat = this.pendingCombat;
    this.state.events = this.pendingEvents;
    this.pendingCombat = [];
    this.pendingEvents = [];
    for (const s of this.sockets()) {
      const a = s.deserializeAttachment() as Attachment;
      let sync = this.syncs.get(a.connectionId);
      if (!sync) this.syncs.set(a.connectionId, (sync = new BrSeatSync()));
      this.send(
        s,
        brViewFor(this.state, this.loaded.island.solid, this.sight, a.seat, this.clock, sync),
      );
      const challenge = this.timing.get(a.connectionId)?.challenge(now);
      if (challenge) this.send(s, { v: 1, type: "ping", id: challenge.id });
    }
    this.state.loot.flush();
  }

  private async tick() {
    if (this.busy || !this.state || !this.loaded) return;
    this.busy = true;
    try {
      const now = Date.now();
      const sockets = this.sockets();
      if (
        !this.checkingSessions &&
        now - this.lastSessionCheck > SESSION_CHECK_MS &&
        sockets.length
      ) {
        this.lastSessionCheck = now;
        this.checkingSessions = true;
        const infos = sockets.map((s) => s.deserializeAttachment() as Attachment);
        this.ctx.waitUntil(
          (async () => {
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
              // Transient: retry next period (5v5 policy).
            } finally {
              this.checkingSessions = false;
            }
          })(),
        );
      }
      // Reconnect window over: bots take the seats.
      for (const [seat, since] of this.away)
        if (now - since > RECONNECT_MS) {
          this.released.push(this.state.seats[seat]!.id);
          releaseSeat(this.state, seat);
          this.away.delete(seat);
          void this.report();
        }
      if (!sockets.length) {
        this.emptySince ??= now;
        if (now - this.emptySince > EMPTY_ROOM_MS) {
          clearInterval(this.timer!);
          this.timer = null;
          this.state = null;
          await this.report();
          return;
        }
      }
      this.step();
      if (now - this.lastSnapshot >= SNAPSHOT_INTERVAL_MS) {
        this.lastSnapshot = now;
        this.publishSnapshot(now);
      }
    } finally {
      this.busy = false;
    }
  }
}
