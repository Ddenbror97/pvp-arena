import { pickBombMap } from "../../src/lib/fps/bomb/maps";
import { createBombBots } from "../../src/lib/fps/bomb/bots";
import { validateBuy } from "../../src/lib/fps/buy";
import type { BuyItem } from "../../src/lib/fps/buy";
import {
  assignSlot,
  buyBombPrimary,
  equipDefuseKit,
  createBombMatch,
  joinGroup,
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
import { ConnectionTiming, SNAPSHOT_INTERVAL_MS, REMOTE_DELAY_MS } from "../../src/lib/fps/network";
import { TICK_MS } from "../../src/lib/fps/simulation";
import { PlayerPoseHistory } from "./lag-compensation";
import { sessionReader, type SessionIdentity } from "./session-auth";
import type { Env } from "./index";
import { RoomTelemetry } from "./room-telemetry";
import { LOBBY_HEARTBEAT_MS, MatchLobby } from "./lobby";
import {
  SESSION_CHECK_MS,
  UUID,
  admit,
  json,
  pongId,
  sanitizeName,
  sweepSessions,
  withinRate,
} from "./room-kit";

/**
 * Practice Bomb Defusal (5v5) on Sandgate: no money, no ledger, no database rows. Each match is
 * one BombRoom (isolated state, bots in the room); the single BombLobby routes a joining player to
 * a room with a free bot slot, or to a new match id when every room is full. Rooms decide slots
 * themselves (a stale lobby view can only cost a retry, never a duplicate or a wrong team).
 */

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
// ------------------------------------------------------------------------------ lobby
/** The 5v5 lobby: the shared match lobby (lobby.ts) with ten seats a match. */
export class BombLobby extends MatchLobby {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env.FPS_RUNTIME_SECRET, { capacity: SLOT_COUNT, members: false });
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

/** Longest per-player input backlog (8 ticks, as the 1v1 room: a client frame hitch of up to ~260 ms loses no movement). */
const MAX_INPUT_BACKLOG = 8;

/** Uniform [0, 1) from the platform's CSPRNG (the map draw, as in the 1v1 rotation). */
const cryptoRandom = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;

export class BombRoom {
  private state: BombMatchState | null = null;
  private matchId = "";
  /** The room's health numbers (room-telemetry.ts). */
  private stats = new RoomTelemetry("bomb");
  private bots = createBombBots();
  private reveal = new BombReveal();
  /**
   * Per-slot input queues. Clients send one input per 34 ms step; the room ticks at 33.3 ms, so a
   * tick can see zero or two arrivals. One input is applied per tick (bursts cannot add movement
   * time); a backlog beyond MAX_INPUT_BACKLOG drops the oldest so latency stays bounded.
   */
  /** Pending spawn purchases per slot (B menu), applied at the next tick. */
  /** Buys per slot this tick, in order (a primary and the Deagle can land together). */
  private buys = new Map<number, BuyItem[]>();
  private queues = new Map<
    number,
    Array<{ input: BombInput; receivedAt: number; connectionId: string }>
  >();
  private timing = new Map<string, ConnectionTiming>();
  private history = new PlayerPoseHistory<number>();
  private unsent: BombEvent[] = [];
  private eventId = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot = 0;
  private lastSessionCheck = 0;
  private checkingSessions = false;
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
  /** When the lobby last heard from this room (it forgets rooms silent for five minutes). */
  private lastReport = 0;
  private async report() {
    this.lastReport = Date.now();
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
    const claims = await admit(
      url,
      m[1]!,
      "fps-bomb",
      this.env.FPS_RUNTIME_SECRET,
      this.readSessions,
      this.ctx.storage,
    );
    if (claims instanceof Response) return claims;
    this.matchId = m[1]!;
    const now = Date.now();
    if (!this.state || this.state.phase === "completed") {
      this.state = createBombMatch(
        Array.from({ length: SLOT_COUNT }, (_, slot) => botSlot(slot)),
        now,
        undefined,
        pickBombMap(cryptoRandom),
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
      // Take a bot's slot on the team with fewer humans (ties, such as the first player: random).
      const group = joinGroup(state);
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
    this.timing.set(claims.nonce, new ConnectionTiming());
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
    if (!withinRate(a, now)) {
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
    const data = raw as { v?: unknown; type?: unknown; slot?: unknown; id?: unknown };
    const pong = pongId(raw);
    if (pong !== null) {
      this.timing.get(a.connectionId)?.pong(pong, now);
      return;
    }
    if (data?.v === 1 && data.type === "spectate" && Object.keys(data).length === 3) {
      a.spectate = typeof data.slot === "number" && Number.isInteger(data.slot) ? data.slot : null;
      socket.serializeAttachment(a);
      return;
    }
    if (data?.v === 1 && data.type === "equip-kit" && Object.keys(data).length === 2) {
      const ok = equipDefuseKit(this.state, a.slot, now);
      this.send(socket, { v: 1, type: "equipment", ok });
      return;
    }
    const buy = validateBuy(raw);
    if (buy) {
      const queued = this.buys.get(a.slot) ?? [];
      if (queued.length < 4) queued.push(buy.item);
      this.buys.set(a.slot, queued);
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
    queue.push({ input, receivedAt: now, connectionId: a.connectionId });
    while (queue.length > MAX_INPUT_BACKLOG) queue.shift();
    this.queues.set(a.slot, queue);
  }

  webSocketClose(socket: WebSocket, code?: number) {
    if (code !== undefined && socket.readyState !== WebSocket.CLOSED)
      socket.close(1000, "Connection closed");
    const a = socket.deserializeAttachment() as Attachment;
    this.timing.delete(a.connectionId);
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
      if (socket.readyState === WebSocket.OPEN) {
        const text = typeof value === "string" ? value : JSON.stringify(value);
        socket.send(text);
        this.stats.sent(text.length);
      }
    } catch {
      socket.close(1011, "Connection lost");
    }
  }

  private async tick() {
    if (this.busy) this.stats.skip();
    if (this.busy || !this.state) return;
    this.busy = true;
    const started = Date.now();
    try {
      const now = started;
      const state = this.state;
      const sockets = this.sockets();
      // Database/network waits must never hold the room's simulation lock.
      // Admission and per-message expiry remain strict; periodic revocation uses
      // the same cadence and closes revoked sockets when the read completes.
      if (
        !this.checkingSessions &&
        now - this.lastSessionCheck > SESSION_CHECK_MS &&
        sockets.length
      ) {
        this.lastSessionCheck = now;
        this.checkingSessions = true;
        this.ctx.waitUntil(
          sweepSessions<Attachment>(sockets, this.readSessions, (s) => {
            s.close(1008, "Session revoked");
            this.webSocketClose(s);
          })
            .catch(() => {})
            .finally(() => {
              this.checkingSessions = false;
            }),
        );
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
      if (now - this.lastReport > LOBBY_HEARTBEAT_MS) void this.report();
      // Spawn purchases (B menu); the window and spawn radius are the simulation's rules.
      for (const [slot, items] of this.buys)
        if (!state.players[slot]!.bot)
          for (const item of items) buyBombPrimary(state, slot, item, now);
      this.buys.clear();
      const inputs: Record<number, BombInput> = { ...this.bots.inputs(state, now) };
      const accepted = new Map<
        number,
        { input: BombInput; receivedAt: number; connectionId: string }
      >();
      for (const [slot, queue] of this.queues) {
        let command = queue.shift();
        // A backlog left by a network burst drains only 2 % a tick by the clocks' difference
        // (up to 13 s at eight deep), and every shot waits behind it: while more than one
        // input waits, a tick skips one that only repeats held movement (netcode audit
        // 2026-11-11, as the battle royale's queue). Never a trigger, jump, reload or use.
        if (command && queue.length > 1 && repeatsMovement(command.input, queue[0]!.input))
          command = queue.shift();
        if (command && !state.players[slot]!.bot) {
          inputs[slot] = command.input;
          accepted.set(slot, command);
        }
      }
      const tick = state.tick;
      stepBombMatch(state, inputs, now, (shooter, target) => {
        const command = accepted.get(shooter);
        if (!command) return;
        const timing = this.timing.get(command.connectionId);
        if (!timing) return;
        return this.history.target(
          target,
          now,
          timing.lookbackFor(command.input.playbackMs),
          now - command.receivedAt,
        );
      });
      this.history.record(
        state.round,
        state.phase === "live",
        state.players.map((p) => [p.slot, p] as const),
        now,
      );
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
          const timing = this.timing.get(a.connectionId);
          const ahead = Math.max(REMOTE_DELAY_MS, timing?.lookbackFor(REMOTE_DELAY_MS) ?? 0);
          this.send(s, bombViewFor(state, a.slot, a.spectate, this.reveal, now, ahead));
          const challenge = this.timing.get(a.connectionId)?.challenge(now);
          if (challenge) this.send(s, { v: 1, type: "ping", id: challenge.id });
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
          undefined,
          // Like the 1v1 rotation: every new match draws its map (clients remount on `mapId`).
          pickBombMap(cryptoRandom),
        );
        startBombMatch(next, now);
        this.state = next;
        this.bots = createBombBots();
      }
    } finally {
      this.busy = false;
      this.stats.tick(Date.now() - started, 1);
      this.stats.flush(Date.now(), this.matchId, {
        sockets: this.ctx.getWebSockets().length,
        humans: this.state ? this.state.players.filter((p) => !p.bot).length : 0,
      });
    }
  }
}

/** `input` only continues what `next` also holds: skipping it loses one step of a burst. */
function repeatsMovement(input: BombInput, next: BombInput) {
  return (
    !input.fire &&
    !input.alt &&
    !input.reload &&
    !input.jump &&
    !input.use &&
    !input.combatOnly &&
    input.weapon === next.weapon &&
    input.nade === next.nade &&
    input.round === next.round
  );
}
