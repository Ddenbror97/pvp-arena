import { ConnectionTiming, SNAPSHOT_INTERVAL_MS } from "../../src/lib/fps/network";
import { ShotHistory, type CombatPose } from "./lag-compensation";
import { createPracticeBot } from "../../src/lib/fps/practice-bot";
import { PRACTICE_BOT_ID } from "../../src/lib/fps/practice";
import { COMBAT_VERSION } from "../../src/lib/fps/combat";
import { DEFAULT_MAP_ID, MAP_IDS, isMapId } from "../../src/lib/fps/maps/registry";
import {
  createMatch,
  startMatch,
  stepMatch,
  applyQueuedMovement,
  MAX_COMMAND_CREDIT,
  TICK_MS,
  validateInput,
} from "../../src/lib/fps/simulation";
import type { Input, MatchState, Seat } from "../../src/lib/fps/protocol";
import { equalSecret, verifyAdmission } from "../../src/lib/fps/ticket";
import { maintainMatches } from "./maintenance";
import {
  RevealGate,
  snapshotForPlayer,
  trailForPlayer,
  trailStep,
  type TrailStep,
  type ViewerMotion,
} from "../../src/lib/fps/visibility";
import {
  sessionReader,
  sessionKey,
  SESSION_READ_CONCURRENCY,
  type SessionIdentity,
} from "./session-auth";
import { continentOf, LatencyTelemetry } from "./latency";

/** Strict session reads overlap: at most this many in flight, started this far apart. */
const MAX_SESSION_READS = SESSION_READ_CONCURRENCY;
const SESSION_READ_SPACING_MS = 25;

export interface Env {
  DUELS: DurableObjectNamespace;
  FPS_RUNTIME_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  HYPERDRIVE?: { connectionString: string };
  ALLOWED_ORIGIN: string;
  FPS_ROOM_REGION?: "enam" | "wnam";
}
type Config = {
  id: string;
  creator_id: string;
  opponent_id: string;
  best_of: 5 | 9 | 13;
  practice?: boolean;
  stake: number;
  private: boolean;
  expiresAt: number;
  /** Registry map id; absent means Dustfront. Fixed for the match's lifetime. */
  map_id?: string;
};
type SocketInfo = SessionIdentity & {
  sub: string;
  seat: Seat | null;
  role: "player" | "spectator";
  ready: boolean;
  window: number;
  count: number;
  seq: number;
  connectionId: string;
  /** Cloudflare edge continent at connection time (latency telemetry only). */
  continent?: string;
};
type Result = { winner: string | null; scoreA: number; scoreB: number; reason: string };
type Saved = {
  config: Config;
  state: MatchState;
  result: Result | null;
  settled: boolean;
  createdAt: number;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });

export default {
  scheduled(_event: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil(
      maintainMatches(env).catch((error) => {
        console.error(
          JSON.stringify({
            event: "fps_maintenance_failed",
            reason: error instanceof Error ? error.message : "unknown",
          }),
        );
        throw error;
      }),
    );
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health")
      return json({
        service: "fps-duel",
        version: 2,
        combatVersion: COMBAT_VERSION,
        networkVersion: 1,
        latencyVersion: 2,
        /** Maps this runtime can simulate; the app must not create a match on any other. */
        maps: MAP_IDS,
        configured:
          (env.FPS_RUNTIME_SECRET?.length ?? 0) >= 32 &&
          !!env.SUPABASE_URL &&
          !!env.SUPABASE_SERVICE_ROLE_KEY,
      });
    const m = /^\/(internal\/)?matches\/([a-f0-9-]{36})(\/socket)?$/.exec(url.pathname);
    if (!m || !UUID.test(m[2]!)) return json({ error: "NOT_FOUND" }, 404);
    if (m[1]) {
      if (
        request.method !== "POST" ||
        !(await equalSecret(
          request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "",
          env.FPS_RUNTIME_SECRET,
        ))
      )
        return json({ error: "FORBIDDEN" }, 403);
    } else {
      if (
        request.method !== "GET" ||
        !m[3] ||
        request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
      )
        return json({ error: "UPGRADE_REQUIRED" }, 426);
      if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN)
        return json({ error: "ORIGIN_DENIED" }, 403);
    }
    return env.DUELS.get(
      env.DUELS.idFromName(m[2]!),
      env.FPS_ROOM_REGION ? { locationHint: env.FPS_ROOM_REGION } : undefined,
    ).fetch(request);
  },
};

/** One named object is the only simulation and result authority for a match. */
export class DuelRoom {
  private readSessions: ReturnType<typeof sessionReader>;
  private bot = createPracticeBot();
  private shotHistory = new ShotHistory();
  private timings = new Map<string, ConnectionTiming>();
  private networkAt = 0;
  private networkTick = 0;
  private tickHz = 0;
  private authMs = 0;
  private processingMs = 0;
  private telemetryAt = 0;
  private immediateTriggers = 0;
  private saved: Saved | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inputs: Record<Seat, Array<{ input: Input; at: number; connectionId: string }>> = {
    A: [],
    B: [],
  };
  private authorizationFailureAt: number | null = null;
  private authorizationRead: Promise<Array<SocketInfo & { checkedAt: number }>> | null = null;
  private authorizedWatermarks: Array<SocketInfo & { checkedAt: number }> | null = null;
  private authorizationError: unknown = null;
  /** Pipelined strict session checks (see startAuthorizationRead). */
  private readsInFlight = 0;
  private lastReadStartedAt = -Infinity;
  private newestAuthorizedStart = -Infinity;
  private newestFailedStart = -Infinity;
  /** Latency telemetry: per-continent command gate waits and RTT, per-room session reads. */
  private latency = new LatencyTelemetry();
  /** Per-seat command time budget for bounded catch-up (one credit per tick). */
  private commandCredit: Record<Seat, number> = { A: 1, B: 1 };
  /** Recent physics steps' public poses, bundled into snapshots as a redacted trail. */
  private steps: TrailStep[] = [];
  private lastTrailAt = -Infinity;
  /** Latency-aware opponent reveal (see RevealGate); the latest decision per recipient. */
  private reveal = new RevealGate();
  private lastReveal: Record<Seat, boolean> = { A: true, B: true };
  /** Server-side wait (arrival → applied) of each seat's latest command. */
  private commandWait: Record<Seat, number> = { A: 0, B: 0 };
  private playbackMs: Partial<Record<Seat, number>> = {};
  private absent: Record<Seat, number | null> = { A: null, B: null };
  private history: Array<{ at: number; snapshot: string }> = [];
  private lastSnapshot = 0;
  private lastSnapshotTick = -1;
  private checkpoint = 0;
  private busy = false;
  private reason = "ROUNDS";
  private settledAt = 0;
  private eventId = 0;
  private events: MatchState["events"] = [];

  private async authorizedSockets() {
    const sockets = this.ctx.getWebSockets().filter((s) => s.readyState === WebSocket.OPEN);
    const current = sockets.filter((socket) => {
      const info = socket.deserializeAttachment() as SocketInfo;
      if (info.sessionId && info.authExpiresAt > Date.now()) return true;
      socket.close(1008, "Session expired");
      this.webSocketClose(socket);
      return false;
    });
    // Freeze command watermarks before the asynchronous read. A command arriving
    // afterward must await another check; an earlier in-flight positive result
    // cannot authorize a command received after logout completed.
    const captured = current.map((socket) => ({
      socket,
      info: socket.deserializeAttachment() as SocketInfo,
    }));
    const active = await this.readSessions(captured.map((s) => s.info));
    return captured.flatMap(({ socket, info }) => {
      if (socket.readyState !== WebSocket.OPEN) return [];
      if (active.has(sessionKey(info)) && info.authExpiresAt > Date.now()) return [info];
      console.warn(
        JSON.stringify({
          event: "fps_session_revoked",
          matchId: this.saved?.config.id,
          seat: info.seat,
        }),
      );
      socket.close(1008, "Session revoked");
      this.webSocketClose(socket);
      return [];
    });
  }

  /**
   * Strict session validation, pipelined. Every read captures each connection's command
   * watermark when it starts; only commands at or below a completed positive read's
   * watermark are applied, so a positive result can never authorize a command received
   * after that read began (no revocation grace window). Reads overlap instead of running
   * back to back: a command no longer waits for an in-flight read to finish before its own
   * read can start. Newer completed reads supersede older ones; any failure pauses input.
   */
  private startAuthorizationRead(now = Date.now()) {
    if (
      this.readsInFlight >= MAX_SESSION_READS ||
      now - this.lastReadStartedAt < SESSION_READ_SPACING_MS
    )
      return this.authorizationRead;
    this.lastReadStartedAt = now;
    this.readsInFlight++;
    const started = now;
    const read = this.authorizedSockets()
      .then((identities) => {
        const watermarks = identities.map((info) => ({ ...info, checkedAt: started }));
        if (started > this.newestAuthorizedStart) {
          this.newestAuthorizedStart = started;
          this.authorizedWatermarks = watermarks;
        }
        if (started > this.newestFailedStart) this.authorizationError = null;
        return this.authorizedWatermarks ?? watermarks;
      })
      .catch((error: unknown) => {
        this.newestFailedStart = Math.max(this.newestFailedStart, started);
        this.authorizedWatermarks = null;
        this.newestAuthorizedStart = -Infinity;
        this.authorizationError = error;
        this.inputs = { A: [], B: [] };
        throw error;
      })
      .finally(() => {
        this.readsInFlight--;
        this.authMs = Date.now() - started;
        this.latency.sessionRead(this.authMs);
        if (this.authorizationRead === read) this.authorizationRead = null;
      });
    void read.catch(() => {});
    this.authorizationRead = read;
    return read;
  }

  private async authorizedForTick() {
    this.startAuthorizationRead();
    if (this.authorizationError) throw this.authorizationError;
    // These are command watermarks, not session leases: later commands still
    // require a newer database read. Let the fixed clock consume already checked
    // commands while reads are in flight instead of batching physics after them.
    const authorized =
      this.authorizedWatermarks ??
      (await (this.authorizationRead ??
        this.startAuthorizationRead(Date.now() + SESSION_READ_SPACING_MS)));
    if (!authorized) return [];
    const connected = new Set(
      this.ctx
        .getWebSockets()
        .filter((socket) => socket.readyState === WebSocket.OPEN)
        .map((socket) => (socket.deserializeAttachment() as SocketInfo).connectionId),
    );
    return authorized.filter(
      (info) => info.authExpiresAt > Date.now() && connected.has(info.connectionId),
    );
  }

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.readSessions = sessionReader(env);
    ctx.blockConcurrencyWhile(async () => {
      this.saved = (await ctx.storage.get<Saved>("match")) ?? null;
      if (!this.saved) return;
      if (["countdown", "live", "round-end"].includes(this.saved.state.phase)) {
        this.saved.state.phase = "cancelled";
        this.saved.result = { winner: null, scoreA: 0, scoreB: 0, reason: "SERVER_RESTART" };
        await ctx.storage.put("match", this.saved);
      }
      if (!this.saved.settled) await ctx.storage.setAlarm(Date.now() + 1000);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/internal/")) {
      if (
        !(await equalSecret(
          request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "",
          this.env.FPS_RUNTIME_SECRET,
        ))
      )
        return json({ error: "FORBIDDEN" }, 403);
      if (Number(request.headers.get("content-length") ?? 0) > 2048)
        return json({ error: "TOO_LARGE" }, 413);
      const body = await request.text();
      if (body.length > 2048) return json({ error: "TOO_LARGE" }, 413);
      let c: Config;
      try {
        c = JSON.parse(body) as Config;
      } catch {
        return json({ error: "BAD_CONFIG" }, 400);
      }
      if (
        !c ||
        typeof c !== "object" ||
        !UUID.test(c.id) ||
        url.pathname !== `/internal/matches/${c.id}` ||
        !UUID.test(c.creator_id) ||
        !UUID.test(c.opponent_id) ||
        c.creator_id === c.opponent_id ||
        !(c.practice === true
          ? c.best_of === 13 && c.stake === 0 && c.private && c.opponent_id === PRACTICE_BOT_ID
          : [5, 9].includes(c.best_of)) ||
        (c.practice !== undefined && typeof c.practice !== "boolean") ||
        !Number.isSafeInteger(c.stake) ||
        c.stake < 0 ||
        c.stake > 5000 ||
        !Number.isSafeInteger(c.expiresAt) ||
        c.expiresAt <= Date.now() ||
        typeof c.private !== "boolean" ||
        (c.map_id !== undefined && !isMapId(c.map_id))
      )
        return json({ error: "BAD_CONFIG" }, 400);
      if (this.saved) {
        const old = this.saved.config;
        if (
          old.id !== c.id ||
          old.creator_id !== c.creator_id ||
          old.opponent_id !== c.opponent_id ||
          old.stake !== c.stake ||
          old.best_of !== c.best_of ||
          old.private !== c.private ||
          !!old.practice !== !!c.practice ||
          old.expiresAt !== c.expiresAt ||
          (old.map_id ?? DEFAULT_MAP_ID) !== (c.map_id ?? DEFAULT_MAP_ID)
        )
          return json({ error: "CONFIG_CONFLICT" }, 409);
        return json({ ok: true, phase: this.saved.state.phase });
      }
      this.saved = {
        config: c,
        state: createMatch(
          { A: c.creator_id, B: c.opponent_id },
          c.best_of,
          Date.now(),
          COMBAT_VERSION,
          c.map_id,
        ),
        result: null,
        settled: false,
        createdAt: Date.now(),
      };
      await this.ctx.storage.put("match", this.saved);
      await this.ctx.storage.setAlarm(Date.now() + 60_000);
      return json({ ok: true, phase: "waiting" });
    }
    const claims = await verifyAdmission(
      url.searchParams.get("ticket") ?? "",
      this.env.FPS_RUNTIME_SECRET,
    );
    const saved = this.saved;
    if (!saved || !claims || claims.matchId !== saved.config.id)
      return json({ error: "ADMISSION_DENIED" }, 403);
    if (claims.role === "spectator" && saved.config.private)
      return json({ error: "PRIVATE_MATCH" }, 403);
    const seat: Seat | null =
      claims.sub === saved.config.creator_id
        ? "A"
        : claims.sub === saved.config.opponent_id
          ? "B"
          : null;
    if (saved.config.practice && (seat !== "A" || claims.role !== "player"))
      return json({ error: "PRIVATE_MATCH" }, 403);
    if (claims.role === "player" && seat === null) return json({ error: "NOT_A_PLAYER" }, 403);
    try {
      if (!(await this.readSessions([claims])).has(sessionKey(claims)))
        return json({ error: "SESSION_REVOKED" }, 403);
    } catch {
      return json({ error: "SESSION_CHECK_UNAVAILABLE" }, 503);
    }
    if (
      claims.role === "spectator" &&
      this.ctx.getWebSockets().filter((s) => {
        const info = s.deserializeAttachment() as SocketInfo;
        return info.role === "spectator" && info.sub !== claims.sub;
      }).length >= 16
    )
      return json({ error: "ROOM_FULL" }, 429);
    const consumed = await this.ctx.storage.transaction(async (tx) => {
      if (await tx.get(`admission:${claims.nonce}`)) return false;
      await tx.put(`admission:${claims.nonce}`, claims.exp);
      return true;
    });
    if (!consumed) return json({ error: "TICKET_REPLAY" }, 403);
    for (const old of this.ctx.getWebSockets()) {
      const info = old.deserializeAttachment() as SocketInfo;
      if (info.sub === claims.sub && info.role === claims.role)
        old.close(4001, "Replaced by a new connection");
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    const actualSeat = claims.role === "player" ? seat : null;
    server.serializeAttachment({
      sub: claims.sub,
      sessionId: claims.sessionId,
      authExpiresAt: claims.authExpiresAt,
      connectionId: claims.nonce,
      seat: actualSeat,
      role: claims.role,
      ready: saved.state.phase !== "waiting",
      window: Date.now(),
      count: 0,
      seq: actualSeat ? saved.state.players[actualSeat].lastSeq : -1,
      continent: continentOf(request),
    } satisfies SocketInfo);
    if (actualSeat) {
      this.absent[actualSeat] = null;
      this.inputs[actualSeat] = [];
    }
    this.send(server, {
      v: 1,
      type: "welcome",
      seat: actualSeat,
      matchId: saved.config.id,
      delayMs: claims.role === "spectator" ? 5000 : 0,
    });
    if (claims.role === "player" && actualSeat)
      this.send(server, snapshotForPlayer(this.snapshot()!, actualSeat));
    if (!saved.settled) this.run();
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (!this.saved || typeof message !== "string" || message.length > 512) {
      socket.close(1009, "Invalid message");
      return;
    }
    const info = socket.deserializeAttachment() as SocketInfo;
    const now = Date.now();
    if (socket.readyState !== WebSocket.OPEN || !info.sessionId || info.authExpiresAt <= now) {
      socket.close(1008, "Session expired");
      this.webSocketClose(socket);
      return;
    }
    if (now - info.window >= 1000) {
      info.window = now;
      info.count = 0;
    }
    if (++info.count > 70) {
      socket.close(1008, "Input rate exceeded");
      return;
    }
    socket.serializeAttachment(info);
    let raw: unknown;
    try {
      raw = JSON.parse(message);
    } catch {
      socket.close(1008, "Invalid JSON");
      return;
    }
    if (info.role !== "player" || !info.seat) {
      socket.close(1008, "Read-only spectator");
      return;
    }
    const data = raw as { v?: unknown; type?: unknown; combatVersion?: unknown; id?: unknown };
    if (
      data?.v === 1 &&
      data.type === "pong" &&
      Object.keys(data).length === 3 &&
      typeof data.id === "string" &&
      data.id.length <= 64
    ) {
      const timing = this.timings.get(info.connectionId);
      if (timing?.pong(data.id, now)) this.latency.rtt(info.continent, timing.latestRttMs);
      return;
    }
    if (
      data?.v === 1 &&
      data.type === "ready" &&
      (Object.keys(data).length === 2 ||
        (Object.keys(data).length === 3 && Object.hasOwn(data, "combatVersion")))
    ) {
      const required = this.saved?.state.combatVersion ?? 1;
      if ((data.combatVersion ?? 1) !== required) {
        socket.close(1008, "Client update required");
        return;
      }
      info.ready = true;
      socket.serializeAttachment(info);
      // Readiness is an intent; tick applies it only after fresh session checks.
      return;
    }
    const input = validateInput(raw);
    if (input && this.saved?.state.combatVersion === 2 && input.combatVersion !== 2) {
      socket.close(1008, "Client update required");
      return;
    }
    if (!input) {
      socket.close(1008, "Invalid input");
      return;
    }
    if (input.round !== undefined && input.round !== this.saved.state.round) return;
    if (input.seq <= info.seq) return;
    info.seq = input.seq;
    socket.serializeAttachment(info);
    const queue = this.inputs[info.seat];
    queue.push({ input, at: now, connectionId: info.connectionId });
    if (queue.length > 8) queue.shift();
    // Start this command's session check now instead of at the next clock tick.
    if (this.timer && !this.authorizationError) this.startAuthorizationRead(now);
  }

  webSocketClose(socket: WebSocket, code?: number) {
    // Reciprocate a peer close even when an edge/proxy delays automatic close
    // replies. Manual calls after our own close omit the code and must retain
    // the original policy/error reason. Reserved sentinel codes cannot be sent.
    if (code !== undefined && socket.readyState !== WebSocket.CLOSED) {
      const reply =
        [1000, 1001, 1002, 1003, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014].includes(code) ||
        (code >= 3000 && code <= 4999)
          ? code
          : 1000;
      socket.close(reply, "Connection closed");
    }
    const info = socket.deserializeAttachment() as SocketInfo;
    if (
      info.seat &&
      !this.ctx
        .getWebSockets()
        .some(
          (s) =>
            s !== socket &&
            s.readyState === WebSocket.OPEN &&
            (s.deserializeAttachment() as SocketInfo).seat === info.seat,
        )
    ) {
      this.absent[info.seat] = Date.now();
      this.inputs[info.seat] = [];
    }
  }
  webSocketError(socket: WebSocket) {
    socket.close(1011, "Connection failed");
    this.webSocketClose(socket);
  }

  private send(socket: WebSocket, value: unknown) {
    try {
      const info = socket.deserializeAttachment() as SocketInfo;
      if (socket.readyState !== WebSocket.OPEN || info.authExpiresAt <= Date.now()) return;
      socket.send(typeof value === "string" ? value : JSON.stringify(value));
    } catch {
      socket.close(1011, "Connection lost");
    }
  }
  private snapshot() {
    if (!this.saved) return null;
    const { server: _private, events: _events, ...state } = this.saved.state;
    const now = Date.now();
    return {
      v: 1,
      type: "snapshot",
      serverNow: now,
      poseAt: _private?.lastStepAt ?? now,
      state: { ...state, events: this.events },
      settled: this.saved.settled,
      settlementPending: !!this.saved.result && !this.saved.settled,
    };
  }
  private run() {
    if (!this.timer) this.timer = setInterval(() => void this.tick(), Math.ceil(TICK_MS));
  }
  private async persist() {
    if (this.saved) await this.ctx.storage.put("match", this.saved);
  }

  private async tick() {
    if (this.busy || !this.saved) return;
    this.busy = true;
    const processingStarted = Date.now();
    try {
      const saved = this.saved;
      let authorized: Array<SocketInfo & { checkedAt: number }> = [];
      const authorizationStarted = Date.now();
      try {
        authorized = await this.authorizedForTick();
        if (this.authorizationFailureAt !== null) {
          // Never catch up physics using time for which authority was unavailable.
          saved.state.phaseEndsAt += Date.now() - this.authorizationFailureAt;
          if (saved.state.server) saved.state.server.lastStepAt = Date.now() - TICK_MS;
          this.authorizationFailureAt = null;
        }
      } catch {
        this.inputs = { A: [], B: [] };
        if (this.authorizationFailureAt === null)
          console.error(
            JSON.stringify({ event: "fps_session_check_unavailable", matchId: saved.config.id }),
          );
        this.authorizationFailureAt ??= authorizationStarted;
        for (const socket of this.ctx.getWebSockets())
          this.send(socket, { v: 1, type: "authorization", paused: true });
        if (Date.now() - this.authorizationFailureAt < 5000) return;
        if (!saved.result) {
          saved.state.phase = "cancelled";
          this.reason = "RUNTIME_ERROR";
        }
        for (const socket of this.ctx.getWebSockets()) {
          socket.close(1013, "Authorization service unavailable");
          this.webSocketClose(socket);
        }
      }
      const now = Date.now(),
        phase = saved.state.phase;
      if (
        phase === "waiting" &&
        ["A", "B"].every(
          (seat) =>
            (saved.config.practice && seat === "B") ||
            authorized.some((s) => s.seat === seat && s.ready),
        )
      ) {
        if (!saved.config.practice) {
          const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/fps_mark_started`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ p_match: saved.config.id, p_runtime: saved.config.id }),
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) {
            saved.state.phase = "cancelled";
            this.reason = "NO_SHOW";
          }
        }
        if (saved.state.phase !== "cancelled") startMatch(saved.state, Date.now());
        await this.persist();
      }
      if (
        (now - saved.createdAt > 20 * 60_000 || now >= saved.config.expiresAt - 5000) &&
        !saved.result
      ) {
        saved.state.phase = "cancelled";
        this.reason = "MATCH_TIMEOUT";
      }
      if (phase === "waiting" && now - saved.createdAt > 60_000) {
        saved.state.phase = "cancelled";
        this.reason = "NO_SHOW";
      }
      if (saved.state.phase !== "cancelled" && ["live", "countdown", "round-end"].includes(phase)) {
        for (const seat of ["A", "B"] as const) {
          const connected =
            (saved.config.practice && seat === "B") || authorized.some((s) => s.seat === seat);
          if (connected) this.absent[seat] = null;
          if (!connected && this.absent[seat] === null) this.absent[seat] = now;
        }
        const gone = (seat: Seat) =>
          this.absent[seat] !== null && now - this.absent[seat]! >= 30_000;
        if (gone("A") || gone("B")) {
          if (this.absent.A !== null && this.absent.B !== null) {
            saved.state.phase = "cancelled";
            this.reason = "BOTH_DISCONNECTED";
          } else {
            saved.state.winner = gone("A") ? "B" : "A";
            saved.state.phase = "completed";
            this.reason = "DISCONNECT";
          }
        }
      }
      // Preserve the clock remainder when platform timers jitter. Bound catch-up
      // and command queues; packet bursts cannot add simulation time or movement.
      for (
        let step = 0;
        step < 3 && ["countdown", "live", "round-end"].includes(saved.state.phase);
        step++
      ) {
        const last = saved.state.server!.lastStepAt;
        if (now - last < Math.ceil(TICK_MS)) break;
        const fresh: Partial<Record<Seat, Input>> = {};
        const triggers: Partial<Record<Seat, Input>> = {};
        const triggerAt: Partial<Record<Seat, number>> = {};
        const receivedAt: Partial<Record<Seat, number>> = {};
        for (const seat of ["A", "B"] as const) {
          const queue = this.inputs[seat];
          const authority = authorized.find((s) => s.seat === seat);
          const connection = authority?.connectionId;
          // Enforce freshness when validation began. Its network wait must not
          // expire an otherwise fresh command before the clock can consume it.
          // The RPC has a 1200 ms timeout; retain a hard wall-clock bound too.
          const staleBefore = Math.max(authority?.checkedAt ?? now, now - 1200) - 200;
          while (
            queue.length &&
            (queue[0]!.at <= staleBefore ||
              (queue[0]!.input.round !== undefined &&
                queue[0]!.input.round !== saved.state.round) ||
              (connection !== undefined && queue[0]!.connectionId !== connection))
          )
            queue.shift();
          const ready = (i: number) =>
            !!authority &&
            queue[i]?.connectionId === connection &&
            queue[i]!.input.seq <= authority.seq;
          const takeTrigger = () => {
            if (!triggers[seat] && ready(0) && queue[0]!.input.combatOnly) {
              const action = queue.shift()!;
              triggers[seat] = action.input;
              this.commandWait[seat] = now - action.at;
              this.playbackMs[seat] = action.input.playbackMs;
              this.immediateTriggers++;
              triggerAt[seat] = action.at;
              this.latency.command(authority?.continent, now - action.at);
            }
          };
          takeTrigger();
          // One credit per tick, capped; each applied command spends one.
          this.commandCredit[seat] = Math.min(MAX_COMMAND_CREDIT, this.commandCredit[seat] + 1);
          // Fold movement and redundant automatic-rifle holds while a newer
          // authorized command remains. Combat still runs once at the normal tick.
          while (
            this.commandCredit[seat] > 1 &&
            ready(0) &&
            ready(1) &&
            applyQueuedMovement(saved.state, seat, queue[0]!.input, queue[1]!.input)
          ) {
            this.latency.command(authority?.continent, now - queue.shift()!.at);
            this.commandCredit[seat]--;
            takeTrigger();
          }
          const next =
            ready(0) &&
            !queue[0]!.input.combatOnly &&
            (!triggers[seat] ||
              (!queue[0]!.input.reload &&
                queue[0]!.input.weapon === saved.state.players[seat].weapon))
              ? queue.shift()
              : undefined;
          if (next) this.commandCredit[seat]--;
          if (next) {
            fresh[seat] = next.input;
            receivedAt[seat] = next.at;
            this.commandWait[seat] = now - next.at;
            this.playbackMs[seat] = next.input.playbackMs;
            // Arrival → applied: session gate + queue + clock alignment (server-side delay).
            this.latency.command(authority?.continent, now - next.at);
          }
        }
        // After a long stall discard elapsed simulation work, retaining deadlines.
        const stepAt = Math.max(last + Math.ceil(TICK_MS), now - 2 * Math.ceil(TICK_MS));
        const previousTick = saved.state.tick;
        if (saved.config.practice) fresh.B = this.bot.input(saved.state, stepAt);
        const targets: Partial<Record<Seat, CombatPose>> = {};
        for (const shooter of ["A", "B"] as const) {
          const shot = triggers[shooter] ?? fresh[shooter];
          const arrival = triggerAt[shooter] ?? receivedAt[shooter];
          if (!shot?.fire || arrival === undefined) continue;
          const identity = authorized.find((s) => s.seat === shooter);
          const timing = identity && this.timings.get(identity.connectionId);
          if (!timing?.calibrated) continue;
          // Arrival time is server-owned; queued work cannot invent an earlier shot.
          // Shooter's view lookback (bounded) plus the server-measured wait since arrival.
          targets[shooter] = this.shotHistory.target(
            shooter === "A" ? "B" : "A",
            now,
            timing.lookbackFor(shot.playbackMs),
            now - arrival,
          );
        }
        stepMatch(saved.state, fresh, stepAt, TICK_MS, targets, triggers);
        if (!saved.result && saved.state.tick !== previousTick) {
          this.events.push(...saved.state.events.map((e) => ({ ...e, id: ++this.eventId })));
          this.shotHistory.record(saved.state, stepAt);
          // Each recipient's client draws this step about one RTT + REMOTE_DELAY_MS + the
          // server's command wait later, with its own camera that far ahead.
          const motion: Partial<Record<Seat, ViewerMotion>> = {};
          const earlier = this.steps.at(-3);
          for (const viewer of ["A", "B"] as const) {
            const identity = authorized.find((s) => s.seat === viewer);
            const timing = identity && this.timings.get(identity.connectionId);
            const own = saved.state.players[viewer],
              before = earlier?.players[viewer],
              dt = earlier ? stepAt - earlier.at : 0;
            motion[viewer] = {
              vx: before && dt > 0 ? (own.x - before.x) / dt : 0,
              vz: before && dt > 0 ? (own.z - before.z) / dt : 0,
              aheadMs:
                (timing?.calibrated ? timing.lookbackFor(this.playbackMs[viewer]) : 250) +
                this.commandWait[viewer],
            };
          }
          this.lastReveal = this.reveal.update(saved.state, stepAt, motion);
          this.steps.push(trailStep(saved.state, stepAt, this.lastReveal));
          if (this.steps.length > 6) this.steps.shift();
        }
      }
      if (["completed", "cancelled"].includes(saved.state.phase) && !saved.result) {
        const winner =
          saved.state.phase === "completed" && saved.state.winner
            ? saved.state.players[saved.state.winner].id
            : null;
        saved.result = {
          winner,
          scoreA: saved.state.score.A,
          scoreB: saved.state.score.B,
          reason:
            saved.state.phase === "cancelled" && this.reason === "ROUNDS"
              ? "INCONCLUSIVE"
              : this.reason,
        };
        await this.persist();
        await this.ctx.storage.setAlarm(now + 1000);
      }
      const urgent =
        saved.state.phase !== phase ||
        this.events.some((e) => ["shot", "hit", "headshot", "round-end"].includes(e.type));
      if (
        saved.state.tick !== this.lastSnapshotTick ||
        urgent ||
        (saved.result && now - this.lastSnapshot >= SNAPSHOT_INTERVAL_MS)
      ) {
        // Every physics tick has a fresh snapshot; urgent combat can send sooner.
        this.lastSnapshot = now;
        this.lastSnapshotTick = saved.state.tick;
        const current = this.snapshot()!;
        // poseAt follows the physics clock; serverNow follows the send clock.
        // Both renderer playback and rewind use the same physics timeline.
        current.state.events = this.events;
        const playerSnapshots: Partial<Record<Seat, string>> = {};
        this.events = [];
        if (!saved.config.private)
          this.history.push({ at: now, snapshot: JSON.stringify(current) });
        while (this.history.length > 256 || (this.history[0] && this.history[0].at < now - 6500))
          this.history.shift();
        const delayed = this.history.find((h) => h.at >= now - 5200 && h.at <= now - 5000);
        for (const socket of this.ctx.getWebSockets()) {
          const info = socket.deserializeAttachment() as SocketInfo;
          if (info.role === "player" && info.seat) {
            playerSnapshots[info.seat] ??= JSON.stringify({
              ...snapshotForPlayer(
                current,
                info.seat,
                current.state.phase === "live" ? this.lastReveal[info.seat] : undefined,
              ),
              trail: trailForPlayer(this.steps, info.seat, this.lastTrailAt, current.poseAt),
            });
            this.send(socket, playerSnapshots[info.seat]);
          } else if (delayed) this.send(socket, delayed.snapshot);
        }
        this.lastTrailAt = current.poseAt;
      }
      if (now - this.networkAt >= 1000) {
        if (this.networkAt)
          this.tickHz = ((saved.state.tick - this.networkTick) * 1000) / (now - this.networkAt);
        this.networkTick = saved.state.tick;
        this.networkAt = now;
        const activeIds = new Set(authorized.map((s) => s.connectionId));
        for (const id of this.timings.keys()) if (!activeIds.has(id)) this.timings.delete(id);
        for (const socket of this.ctx.getWebSockets()) {
          const info = socket.deserializeAttachment() as SocketInfo;
          if (!info.seat || !activeIds.has(info.connectionId)) continue;
          let timing = this.timings.get(info.connectionId);
          if (!timing) {
            timing = new ConnectionTiming();
            this.timings.set(info.connectionId, timing);
          }
          const challenge = timing.challenge(now);
          if (challenge) this.send(socket, { v: 1, type: "ping", id: challenge.id });
          const report = timing.report();
          if (report)
            this.send(socket, {
              v: 1,
              type: "network",
              report: {
                ...report,
                tickHz: this.tickHz,
                authMs: this.authMs,
                processingMs: this.processingMs,
              },
            });
        }
        if (now - this.telemetryAt >= 30_000) {
          // Per-continent p50/p95/p99 (US/EU/LatAm split), no user identifiers.
          const regions = this.latency.report();
          if (regions.rows.length || regions.sessionReadMs)
            console.log(
              JSON.stringify({
                event: "fps_region_latency",
                matchId: saved.config.id,
                practice: saved.config.practice,
                immediateTriggers: this.immediateTriggers,
                tickHz: Math.round(this.tickHz * 10) / 10,
                sessionReadMs: regions.sessionReadMs,
                regions: regions.rows,
              }),
            );
          const players = authorized
            .filter((s) => s.seat)
            .flatMap((s) => {
              const report = this.timings.get(s.connectionId)?.report();
              return report ? [{ seat: s.seat, ...report }] : [];
            });
          if (players.length) {
            this.telemetryAt = now;
            console.log(
              JSON.stringify({
                event: "fps_network_sample",
                matchId: saved.config.id,
                phase: saved.state.phase,
                tickHz: this.tickHz,
                authMs: this.authMs,
                processingMs: this.processingMs,
                players,
              }),
            );
          }
        }
      }
      if (now - this.checkpoint >= 2000) {
        this.checkpoint = now;
        await this.persist();
      }
      // Keep the delayed stream alive through the final result and settlement.
      if (saved.result && saved.settled && now - this.settledAt > 6000) {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "fps_runtime_error",
          matchId: this.saved.config.id,
          message: error instanceof Error ? error.name : "unknown",
        }),
      );
      if (!this.saved.result) {
        this.saved.state.phase = "cancelled";
        this.saved.result = { winner: null, scoreA: 0, scoreB: 0, reason: "RUNTIME_ERROR" };
      }
      await this.persist();
      await this.ctx.storage.setAlarm(Date.now() + 1000);
    } finally {
      this.processingMs = Date.now() - processingStarted;
      this.busy = false;
    }
  }

  async alarm() {
    const saved = this.saved;
    if (!saved) return;
    if (saved.settled) {
      for (const s of this.ctx.getWebSockets()) s.close(1000, "Match archived");
      await this.ctx.storage.deleteAll();
      return;
    }
    if (!saved.result) {
      if (Date.now() - saved.createdAt >= 60_000 && saved.state.phase === "waiting") {
        saved.state.phase = "cancelled";
        saved.result = { winner: null, scoreA: 0, scoreB: 0, reason: "NO_SHOW" };
        await this.persist();
      } else {
        await this.ctx.storage.setAlarm(Date.now() + 30_000);
        return;
      }
    }
    try {
      const r = saved.result!;
      const payload = JSON.stringify({
        p_match: saved.config.id,
        p_winner: r.winner,
        p_score_a: r.scoreA,
        p_score_b: r.scoreB,
        p_reason: r.reason,
        p_runtime: saved.config.id,
      });
      const init: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      };
      if (saved.config.practice) {
        const response = await fetch(
          `${this.env.SUPABASE_URL}/rest/v1/rpc/fps_practice_finish`,
          init,
        );
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
      } else {
        const recorded = await fetch(
          `${this.env.SUPABASE_URL}/rest/v1/rpc/fps_record_result`,
          init,
        );
        if (!recorded.ok) {
          // Expiry can commit a refund before the first result intent reaches SQL.
          // Preserve the original durable result as evidence and acknowledge only
          // a database-confirmed cancellation, never invent another payout.
          const view = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/fps_view`, {
            ...init,
            body: JSON.stringify({ p_match: saved.config.id }),
            signal: AbortSignal.timeout(10_000),
          });
          const outcome = view.ok
            ? ((await view.json()) as { id?: string; status?: string })
            : null;
          if (outcome?.id !== saved.config.id || outcome.status !== "CANCELLED")
            throw new Error(`HTTP_${recorded.status}`);
          saved.state.phase = "cancelled";
          saved.state.winner = null;
          saved.state.score = { A: 0, B: 0 };
          console.warn(JSON.stringify({ event: "fps_result_refunded", matchId: saved.config.id }));
        } else {
          const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/fps_finish`, {
            ...init,
            signal: AbortSignal.timeout(10_000),
          });
          if (!response.ok) throw new Error(`HTTP_${response.status}`);
        }
      }
      saved.settled = true;
      this.settledAt = Date.now();
      await this.persist();
      for (const socket of this.ctx.getWebSockets())
        if ((socket.deserializeAttachment() as SocketInfo).role === "player")
          this.send(socket, this.snapshot());
      console.log(JSON.stringify({ event: "fps_settled", matchId: saved.config.id }));
      await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60_000);
    } catch {
      saved.settled = false;
      console.error(JSON.stringify({ event: "fps_settlement_retry", matchId: saved.config.id }));
      await this.ctx.storage.setAlarm(Date.now() + 15_000);
    }
  }
}
