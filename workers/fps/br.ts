import { BR_RULESET_VERSION } from "../../src/lib/fps/br/ruleset";
import { AimWatch, logAimReport, type WatchPlayer } from "../../src/lib/fps/anticheat/aim-watch";

/** The aim analysis looks at enemies within this range (m) of a watched player. */
const AIM_WATCH_M = 150;
import { validateBrAct, type BrAct } from "../../src/lib/fps/br/actions";
import { decodeHeightfield } from "../../src/lib/fps/br/heightfield";
import { rollLoot, warmLootSteps } from "../../src/lib/fps/br/loot";
import { spawnVehicles } from "../../src/lib/fps/br/vehicles";
import { buildIslandSteps, type Island } from "../../src/lib/fps/br/island";
import { decodeLandCover } from "../../src/lib/fps/br/landcover";
import {
  brFrameRow,
  BrSeatSync,
  BrSight,
  brResult,
  checkpointBrMatch,
  restoreBrMatch,
  type BrCheckpoint,
  brFastEvents,
  brViewFor,
  brViewFrame,
  createBrMatch,
  releaseSeat,
  seatHuman,
  stepBrMatch,
  validateBrInput,
  type BrInput,
  type BrMatchState,
  BR_RULES,
} from "../../src/lib/fps/br/match";
import type { CollisionData } from "../../src/lib/fps/br/static-world";
import { assertIslandRevision, WORLD_ASSETS, type WorldMeta } from "../../src/lib/fps/br/world";
import { ConnectionTiming } from "../../src/lib/fps/network";
import { TICK_MS } from "../../src/lib/fps/simulation";
import { BrInputQueue } from "./br-input";
import { brViewLookbackMs } from "../../src/lib/fps/br/lag";
import { joinCheckpoint, lootKeys, splitCheckpoint } from "./br-checkpoint";
import { Cadence, RoomClock, sendRate } from "./room-clock";
import { RoomTelemetry } from "./room-telemetry";
import { continentOf, LatencyTelemetry } from "./latency";
import { LOBBY_HEARTBEAT_MS, MatchLobby } from "./lobby";
import {
  RESTRICTED_CLOSE,
  SESSION_CHECK_MS,
  UUID,
  admit,
  authorized,
  json,
  pongId,
  sanitizeName,
  sweepSessions,
  withinRate,
} from "./room-kit";
import { sessionReader, type SessionIdentity } from "./session-auth";
import { BrCanaries } from "../../src/lib/fps/br/canary";
import { waterSurface } from "../../src/lib/fps/br/drop";
import { evidenceRow, submitEvidence, TamperCounts, type TamperReason } from "./anticheat";
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

/** Rooms with no human for this long shut down (PLAN §6.1). */
const EMPTY_ROOM_MS = 120_000;
/** A checkpoint nobody has written to or resumed from for this long is deleted (alarm). */
const STALE_CHECKPOINT_MS = 15 * 60_000;
/** A disconnected human keeps their seat this long (reconnect), then a bot takes it (PLAN §6.1). */
const RECONNECT_MS = 60_000;
/**
 * Snapshots a second (foundation audit 2026-11-10). Views went out on every tick (30 a
 * second): with a full lobby, building and serialising them was the room's largest cost and
 * 130–175 KB/s per player during the drop. 15 a second is one snapshot every other tick, 67 ms
 * apart; clients draw others 110 ms behind and predict themselves, so every drawn moment still
 * lies between two snapshots. BR_SNAPSHOT_HZ (10 to 30) changes it without a code deploy.
 */
const BR_SNAPSHOT_HZ = 15;
/** The checkpointed ground loot is rewritten when it changed, and at least this often. */
const LOOT_REFRESH_MS = 30_000;
/** Pending inventory/pickup actions per seat (applied up to 4 per tick). */
const MAX_ACT_BACKLOG = 8;

// ------------------------------------------------------------------------------ island
/** The longest a cold island build may hold the isolate before letting other work run. */
const BUILD_SLICE_MS = 8;
/** Run a stepped job to its end, yielding to the event loop every BUILD_SLICE_MS of work. */
async function paced<T>(steps: Generator<void, T, void>): Promise<T> {
  let since = Date.now();
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
    if (Date.now() - since >= BUILD_SLICE_MS) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      since = Date.now();
    }
  }
}
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
      get(WORLD_ASSETS.collision).then((r) => r.json() as Promise<CollisionData>),
    ]);
    assertIslandRevision(collision);
    const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
    // Built in steps with pauses (foundation audit 2026-11-10): about three seconds of work
    // that used to run in one piece and stall every other room in this isolate.
    const island = await paced(buildIslandSteps(hf, cover, meta, collision));
    await paced(warmLootSteps(island.layout, collision, island.solid, meta));
    return { island, meta, collision };
  })().catch((e) => {
    loading = null; // retry on the next join
    throw e;
  });
  return loading;
}

// ------------------------------------------------------------------------------ lobby
/**
 * The battle royale lobby: the shared match lobby (lobby.ts) with a hundred seats, open only
 * while a match boards, and remembering who plays where (PLAN §11.2 reconnect: a player who
 * drops out mid-match and asks to join again goes back to their own match).
 */
export class BrLobby extends MatchLobby {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env.FPS_RUNTIME_SECRET, { capacity: 100, members: true });
  }
}

// ------------------------------------------------------------------------------ room
type Attachment = SessionIdentity & {
  worldRevision?: string;
  rulesVersion?: number;
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
  private queues = new Map<number, BrInputQueue>();
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
  private snapshots: Cadence;
  private lastSessionCheck = 0;
  private checkingSessions = false;
  private emptySince: number | null = null;
  private readSessions: ReturnType<typeof sessionReader>;
  private busy = false;
  /** Simulation clock: advances one TICK_MS per step (deterministic, independent of timers). */
  private clock = 0;
  /** Real-time pacing of the steps (bounded catch-up), and the room's health numbers. */
  private pace = new RoomClock();
  /** The loot last written beside the checkpoint (see saveCheckpoint). */
  private savedLoot = { revision: -1, at: 0, chunks: 0 };
  /** Match clock when the stale-checkpoint alarm was last pushed forward. */
  private alarmAt = -Infinity;
  private stats = new RoomTelemetry("br");
  /** Per-continent round trips and input waits (latency.ts), logged every 30 s. */
  private latency = new LatencyTelemetry();
  private continents = new Map<number, string>();
  private latencyAt = 0;
  /** How much of pendingCombat publishFast has looked at since the last snapshot. */
  private fastFrom = 0;

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.readSessions = sessionReader(env);
    this.snapshots = new Cadence(sendRate(env.BR_SNAPSHOT_HZ, BR_SNAPSHOT_HZ));
  }

  private sockets() {
    return this.ctx.getWebSockets().filter((s) => {
      if (s.readyState !== WebSocket.OPEN) return false;
      const attachment = s.deserializeAttachment() as Attachment;
      if (
        attachment.worldRevision !== WORLD_ASSETS.revision ||
        attachment.rulesVersion !== BR_RULESET_VERSION
      ) {
        s.close(4409, "Game updated; reload the page");
        return false;
      }
      return true;
    });
  }

  /** When the lobby last heard from this room (it forgets rooms silent for five minutes). */
  private lastReport = 0;
  private async report() {
    this.lastReport = Date.now();
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
        lootChunks?: number;
      }>("br:checkpoint");
      // The ground loot is stored beside the checkpoint in chunks (see saveCheckpoint).
      if (saved?.lootChunks) {
        const keys = lootKeys(saved.lootChunks);
        saved.data = joinCheckpoint(saved.data, keys, await this.ctx.storage.get(keys));
        this.savedLoot = { revision: -1, at: 0, chunks: saved.lootChunks };
      }
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
        this.canaries.forget();
        this.tamper.clear();
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
        vehicles: spawnVehicles(meta, island.solid, seed, island.layout),
        // The last circles close on open ground, never inside a building (zone.ts).
        open: (x, z) => !island.solid.blocked(x, hf.heightAt(x, z) + 0.1, z, 1.8, 0.6),
      });
      this.recorded = false;
      this.syncs.clear();
      this.clock = 0;
      this.sight = new BrSight();
      this.canaries.forget();
      this.tamper.clear();
    }
    return this.state;
  }

  /**
   * The stale-checkpoint alarm: fires STALE_CHECKPOINT_MS after the last checkpoint was
   * written. A match still running here has pushed it forward since; one that fires found a
   * room that stopped (finished, abandoned, or evicted and never rejoined).
   */
  async alarm() {
    if (this.timer && this.state) {
      await this.ctx.storage.setAlarm(Date.now() + STALE_CHECKPOINT_MS);
      return;
    }
    await this.ctx.storage.deleteAll();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // Test-only hook (never set in production): run N ticks synchronously for the runtime test.
    const hook = /^\/internal\/br\/([0-9a-f-]{36})\/tick$/.exec(url.pathname);
    if (hook) {
      if (
        this.env.BR_TEST_HOOKS !== "1" ||
        !(await authorized(request, this.env.FPS_RUNTIME_SECRET))
      )
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
    const claims = await admit(
      url,
      m[1]!,
      "fps-br",
      this.env.FPS_RUNTIME_SECRET,
      this.readSessions,
      this.ctx.storage,
      // A client built for another world or ruleset is told to reload (a socket closed 4409).
      () => {
        if (
          url.searchParams.get("worldRevision") === WORLD_ASSETS.revision &&
          url.searchParams.get("rulesVersion") === String(BR_RULESET_VERSION)
        )
          return null;
        const pair = new WebSocketPair();
        pair[1].accept();
        pair[1].close(4409, "Game updated; reload the page");
        return new Response(null, { status: 101, webSocket: pair[0] });
      },
    );
    if (claims instanceof Response) return claims;
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
      worldRevision: WORLD_ASSETS.revision,
      rulesVersion: BR_RULESET_VERSION,
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
    this.continents.set(seat, continentOf(request));
    this.timing.set(claims.nonce, new ConnectionTiming());
    const sync = new BrSeatSync();
    sync.farHalf = this.env.BR_FAR_HALF_RATE === "1";
    this.syncs.set(claims.nonce, sync);
    this.emptySince = null;
    this.send(server, {
      v: 1,
      type: "welcome",
      worldRevision: WORLD_ASSETS.revision,
      rulesVersion: BR_RULESET_VERSION,
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
    if (!this.timer) {
      this.pace.reset();
      // A little faster than the tick: the clock (room-clock.ts) decides when a step is due.
      this.timer = setInterval(() => void this.tick(), Math.floor(TICK_MS));
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    if (!this.state || typeof message !== "string" || message.length > 512) {
      this.reject(socket, 1009, "Invalid message");
      return;
    }
    const a = socket.deserializeAttachment() as Attachment;
    if (a.worldRevision !== WORLD_ASSETS.revision || a.rulesVersion !== BR_RULESET_VERSION) {
      this.reject(socket, 4409, "Game updated; reload the page");
      return;
    }
    const now = Date.now();
    if (a.authExpiresAt <= now) {
      this.reject(socket, 1008, "Session expired");
      return;
    }
    if (!withinRate(a, now)) {
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
    const data = raw as { type?: unknown };
    const pong = pongId(raw);
    if (pong !== null) {
      const timing = this.timing.get(a.connectionId);
      if (timing?.pong(pong, now))
        this.latency.rtt(this.continents.get(a.seat), timing.latestRttMs);
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
    const queue = this.queues.get(a.seat) ?? new BrInputQueue();
    // The sender's view of the others is one measured round trip plus their playback delay
    // old (lag.ts). The round trip is the room's own measurement, never the client's claim.
    queue.push(
      input,
      now,
      brViewLookbackMs(this.timing.get(a.connectionId)?.minRttMs ?? NaN, input.playbackMs),
    );
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
    const tamper: TamperReason | null =
      reason === "Invalid JSON"
        ? "json"
        : reason === "Invalid input"
          ? "input"
          : reason === "Invalid action"
            ? "action"
            : reason === "Invalid message" && this.state
              ? "oversize"
              : null;
    if (tamper) this.tamper.note(sub, tamper);
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
      if (socket.readyState === WebSocket.OPEN) {
        const text = typeof value === "string" ? value : JSON.stringify(value);
        socket.send(text);
        this.stats.sent(text.length);
      }
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
      const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/br_record_result`, {
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
      // Best effort, but not silent: without the br_match_results migration the function does
      // not exist and every match's result was dropped unseen.
      if (!response.ok)
        console.warn(
          JSON.stringify({
            event: "br_result_not_recorded",
            match: this.matchId,
            status: response.status,
          }),
        );
    } catch (error) {
      // The match itself is unaffected.
      console.warn(
        JSON.stringify({
          event: "br_result_not_recorded",
          match: this.matchId,
          reason: error instanceof Error ? error.message.slice(0, 120) : "unknown",
        }),
      );
    }
  }

  /**
   * Anti-cheat aim analysis (anticheat/aim-watch.ts): the humans on foot against everyone
   * within AIM_WATCH_M, with the room's own fog-of-war answer for who is in whose view.
   */
  private aim = new AimWatch();
  /** Messages only a modified client sends, per user this match (anticheat.ts). */
  private tamper = new TamperCounts();
  /**
   * Wallhack canaries (br/canary.ts): on with FPS_AC_CANARY=1. Their coin flips are the room's
   * secret, so they come from crypto, never from the match seed.
   */
  private canaries = new BrCanaries(
    () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32,
    (x, z, ground) => !!this.loaded && waterSurface(this.loaded.meta, ground, x, z) !== null,
  );
  private aimWatched: WatchPlayer[] = [];
  private aimOthers: WatchPlayer[] = [];
  private watchAim(state: BrMatchState) {
    if (state.phase !== "active") return;
    const world = this.loaded!.island.solid;
    const row = (s: BrMatchState["seats"][number]): WatchPlayer => ({
      id: s.id,
      yaw: s.yaw,
      pitch: s.pitch,
      x: s.body.x,
      y: s.body.y,
      z: s.body.z,
      alive: !s.dead && s.body.phase === "ground" && s.vehicle === undefined,
    });
    const watched = this.aimWatched,
      others = this.aimOthers;
    watched.length = others.length = 0;
    const seats = new Map<string, BrMatchState["seats"][number]>();
    for (const s of state.seats) {
      if (!s.bot && !s.dead) watched.push(row(s));
      seats.set(s.id, s);
    }
    if (!watched.length) return;
    for (const s of state.seats) if (!s.dead) others.push(row(s));
    const near2 = AIM_WATCH_M * AIM_WATCH_M;
    const far = (a: WatchPlayer, b: WatchPlayer) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2 > near2;
    this.aim.observe(
      this.clock,
      watched,
      others,
      (a, b) =>
        !far(a, b) &&
        this.sight.near(
          world,
          seats.get(a.id)!.body,
          seats.get(b.id)!.body,
          seats.get(a.id)!.seat,
          seats.get(b.id)!.seat,
          this.clock,
        ),
      // Out of reach of the watch, or within earshot of footsteps: never "tracked blind".
      (a, b) => far(a, b) || (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < BR_RULES.fogAlwaysM ** 2,
    );
    for (const e of state.combat) {
      if (e.type === "shot") this.aim.shot(state.seats[e.seat]!.id, this.clock);
      else if (e.type === "hit")
        this.aim.hit(
          state.seats[e.seat]!.id,
          state.seats[e.victim]!.id,
          e.zone === "head",
          this.clock,
        );
    }
  }

  /** One simulation step: one queued input per human seat (bursts add no movement time). */
  private step() {
    const state = this.state!;
    const inputs = new Map<number, BrInput>();
    for (const [seat, queue] of this.queues) {
      const input = queue.take(this.clock, Date.now());
      if (input && !state.seats[seat]!.bot) inputs.set(seat, input);
      if (Number.isFinite(queue.lastWaitMs))
        this.latency.command(this.continents.get(seat), queue.lastWaitMs);
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
    this.watchAim(state);
    if (this.env.FPS_AC_CANARY === "1")
      this.canaries.step(
        state,
        this.loaded!.island.solid,
        this.clock,
        (seat) => !state.seats[seat]!.bot,
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
      // Anti-cheat: each human's evidence for the match, submitted once (anticheat.ts).
      const rows = [];
      for (const seat of state.seats)
        if (!seat.bot) {
          const r = this.aim.report(seat.id);
          if (r) logAimReport("br", this.matchId, seat.id, r);
          const row = evidenceRow(
            "br",
            this.matchId,
            seat.id,
            r,
            this.tamper.of(seat.id),
            this.canaries.tally(seat.id),
          );
          if (row) rows.push(row);
        }
      this.aim.forget();
      this.canaries.forget();
      this.tamper.clear();
      this.ctx.waitUntil(submitEvidence(this.env, rows));
      this.ctx.waitUntil(this.record());
      this.ctx.waitUntil(
        this.ctx.storage.delete(["br:checkpoint", ...lootKeys(this.savedLoot.chunks)]),
      );
    }
    // Checkpoint every 5 s of match time while the match runs (restart recovery).
    if (
      (state.phase === "plane" || state.phase === "active" || state.phase === "ending") &&
      this.clock - this.lastCheckpoint >= 5000
    ) {
      this.lastCheckpoint = this.clock;
      this.ctx.waitUntil(this.saveCheckpoint(state));
    }
  }

  /**
   * The checkpoint (foundation audit 2026-11-10: one value of about 1 MB, nine tenths of it the
   * ground loot, against a 2 MB limit per stored value). The loot is now stored in its own
   * chunks (br-checkpoint.ts), and rewritten only when it changed (or every LOOT_REFRESH_MS, in
   * case an item was altered in place); the rest of the match is about 150 KB every 5 s. One
   * `put` of several keys is atomic, so the chunks and the checkpoint that counts them agree.
   * A failed write is logged: without a checkpoint a restarted room cannot resume the match.
   */
  private async saveCheckpoint(state: BrMatchState) {
    try {
      // (Taken now: the match steps on while the write is awaited.)
      const revision = state.loot.revision;
      const loot =
        revision !== this.savedLoot.revision || this.clock - this.savedLoot.at >= LOOT_REFRESH_MS;
      const { data, chunks: lootChunks } = splitCheckpoint(checkpointBrMatch(state, loot));
      const entries: Record<string, unknown> = {};
      let chunks = this.savedLoot.chunks;
      if (loot) {
        chunks = lootChunks.length;
        lootKeys(chunks).forEach((key, i) => (entries[key] = lootChunks[i]));
      }
      entries["br:checkpoint"] = {
        matchId: this.matchId,
        clock: this.clock,
        data,
        lootChunks: chunks,
      };
      await this.ctx.storage.put(entries);
      // A room that is evicted or restarted and never rejoined runs no code to clean up after
      // itself: an alarm, pushed forward once a minute while checkpoints are written, does.
      if (this.clock - this.alarmAt >= 60_000 || this.alarmAt > this.clock) {
        this.alarmAt = this.clock;
        await this.ctx.storage.setAlarm(Date.now() + STALE_CHECKPOINT_MS);
      }
      if (loot) {
        // Chunks a shorter loot list no longer uses.
        const stale = lootKeys(this.savedLoot.chunks).slice(chunks);
        if (stale.length) await this.ctx.storage.delete(stale);
        this.savedLoot = { revision, at: this.clock, chunks };
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "br_checkpoint_failed",
          match: this.matchId,
          reason: error instanceof Error ? error.message.slice(0, 200) : "unknown",
        }),
      );
    }
  }

  /**
   * Between snapshots: a player's own hits, the hits on them and their eliminations go out at
   * once (brFastEvents) instead of waiting up to 67 ms for the next view, which then leaves
   * them out for that connection. A few hundred bytes to the two players involved.
   */
  private publishFast() {
    if (this.fastFrom >= this.pendingCombat.length) return;
    const fresh = this.pendingCombat.slice(this.fastFrom);
    this.fastFrom = this.pendingCombat.length;
    const bySeat = brFastEvents(fresh);
    if (!bySeat.size) return;
    for (const s of this.sockets()) {
      const a = s.deserializeAttachment() as Attachment;
      const events = bySeat.get(a.seat);
      const sync = this.syncs.get(a.connectionId);
      if (!events || !sync) continue;
      for (const e of events) sync.early.add(e);
      this.send(s, { v: 1, type: "br-fast", combat: events });
    }
  }

  /** The same publication path for the live timer and an explicitly requested test snapshot. */
  private publishSnapshot(now: number) {
    if (!this.state || !this.loaded) return;
    this.fastFrom = 0;
    // Every event since the last snapshot goes out once.
    this.state.combat = this.pendingCombat;
    this.state.events = this.pendingEvents;
    this.pendingCombat = [];
    this.pendingEvents = [];
    // Rows and counts every recipient gets alike are built once for this publication.
    const frame = brViewFrame(this.state);
    for (const s of this.sockets()) {
      const a = s.deserializeAttachment() as Attachment;
      let sync = this.syncs.get(a.connectionId);
      if (!sync) {
        this.syncs.set(a.connectionId, (sync = new BrSeatSync()));
        sync.farHalf = this.env.BR_FAR_HALF_RATE === "1";
      }
      const view = brViewFor(
        this.state,
        this.loaded.island.solid,
        this.sight,
        a.seat,
        this.clock,
        sync,
        frame,
      );
      // A running canary trial for this viewer rides in their view only.
      this.canaries.inject(this.state, a.seat, view.players, (seat) =>
        brFrameRow(this.state!, frame, seat),
      );
      this.send(s, view);
      const challenge = this.timing.get(a.connectionId)?.challenge(now);
      if (challenge) this.send(s, { v: 1, type: "ping", id: challenge.id });
    }
    this.state.loot.flush();
  }

  private async tick() {
    if (this.busy) this.stats.skip();
    if (this.busy || !this.state || !this.loaded) return;
    this.busy = true;
    const started = Date.now();
    let steps = 0;
    try {
      const now = started;
      const sockets = this.sockets();
      if (
        !this.checkingSessions &&
        now - this.lastSessionCheck > SESSION_CHECK_MS &&
        sockets.length
      ) {
        this.lastSessionCheck = now;
        this.checkingSessions = true;
        this.ctx.waitUntil(
          sweepSessions<Attachment>(sockets, this.readSessions, (s, restricted) => {
            if (restricted) s.close(RESTRICTED_CLOSE, "Account restricted");
            else s.close(1008, "Session revoked");
            this.webSocketClose(s);
          })
            .catch(() => {})
            .finally(() => {
              this.checkingSessions = false;
            }),
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
          // Nobody is coming back: the checkpoint (about 1 MB with its loot) goes with the
          // match. It used to stay in this room's storage for good.
          await this.ctx.storage.deleteAll();
          this.savedLoot = { revision: -1, at: 0, chunks: 0 };
          await this.report();
          return;
        }
      }
      if (now - this.lastReport > LOBBY_HEARTBEAT_MS) void this.report();
      // As many steps as real time has earned since the last firing (usually one).
      steps = this.pace.due(now);
      for (let i = 0; i < steps; i++) this.step();
      if (this.snapshots.due(now)) {
        this.stats.snapshot();
        this.publishSnapshot(now);
      } else this.publishFast();
    } finally {
      this.busy = false;
      this.stats.tick(Date.now() - started, steps);
      if (started - this.latencyAt >= 30_000) {
        this.latencyAt = started;
        // Per-continent p50/p95/p99 (US/EU/LatAm split), no user identifiers: the input wait
        // is arrival to the tick that applied it; skipped counts backlog drains (br-input.ts).
        const regions = this.latency.report();
        if (regions.rows.length)
          console.log(
            JSON.stringify({
              event: "fps_region_latency",
              mode: "br",
              matchId: this.matchId,
              skippedInputs: [...this.queues.values()].reduce((n, q) => n + q.skipped, 0),
              regions: regions.rows,
            }),
          );
      }
      this.stats.flush(Date.now(), this.matchId, {
        sockets: this.ctx.getWebSockets().length,
        humans: this.state ? this.state.seats.filter((s) => !s.bot).length : 0,
        alive: this.state ? this.state.seats.filter((s) => !s.dead).length : 0,
        droppedSteps: this.pace.dropped,
      });
    }
  }
}
