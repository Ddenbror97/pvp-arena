import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../src/lib/fps/ticket";
import type { MatchState } from "../src/lib/fps/protocol";
import { MAX_COMMAND_CREDIT } from "../src/lib/fps/simulation";

const secret = "isolated-runtime-test-".repeat(3);
const origin = "https://casino.test";
const A = crypto.randomUUID(),
  B = crypto.randomUUID();
let mf: Miniflare;
type Socket = NonNullable<Awaited<ReturnType<Miniflare["dispatchFetch"]>>["webSocket"]>;
const sockets: Socket[] = [];
type RuntimeFrame = {
  type: string;
  serverNow: number;
  poseAt: number;
  visibility?: Record<"A" | "B", boolean>;
  state: MatchState;
  settled: boolean;
  settlementPending: boolean;
};
const callbacks: Array<{ path: string; body: Record<string, unknown> }> = [];
const revokedSessions = new Set<string>();
let unavailableSession = "",
  delayedSession = "",
  /** Applied to every session read when non-zero (latency measurement). */
  sessionReadDelayMs = 0;
let authReadObserved: (() => void) | undefined;
let failOnceId = "";
let refundedId = "";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function token(
  id: string,
  sub = A,
  role: "player" | "spectator" = "player",
  overrides: { sessionId?: string; authExpiresAt?: number; exp?: number } = {},
) {
  return signAdmission(
    {
      v: 2,
      aud: "fps-duel",
      matchId: id,
      sub,
      sessionId: sub,
      authExpiresAt: Date.now() + 3600000,
      role,
      nonce: crypto.randomUUID(),
      exp: Date.now() + 60_000,
      ...overrides,
    },
    secret,
  );
}
async function init(
  id = crypto.randomUUID(),
  isPrivate = false,
  expiresAt = Date.now() + 20 * 60_000,
  bestOf: 5 | 9 | 13 = 5,
) {
  const response = await mf.dispatchFetch(`https://runtime.test/internal/matches/${id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      id,
      creator_id: A,
      opponent_id: B,
      best_of: bestOf,
      stake: 0,
      private: isPrivate,
      expiresAt,
    }),
  });
  expect(response.status).toBe(200);
  return id;
}
async function connect(id: string, ticket: string, requestOrigin = origin) {
  return mf.dispatchFetch(`https://runtime.test/matches/${id}/socket?ticket=${ticket}`, {
    headers: { Upgrade: "websocket", Origin: requestOrigin },
  });
}
async function open(id: string, sub = A, role: "player" | "spectator" = "player") {
  const response = await connect(id, await token(id, sub, role));
  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  socket.accept();
  sockets.push(socket);
  return socket;
}
function until(
  socket: Socket,
  predicate: (frame: RuntimeFrame) => boolean,
  timeout = 8000,
): Promise<RuntimeFrame> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", listener);
      reject(Error("Timed out waiting for runtime frame"));
    }, timeout);
    const listener = (event: { data: unknown }) => {
      const frame = JSON.parse(String(event.data));
      if (predicate(frame)) {
        clearTimeout(timer);
        socket.removeEventListener("message", listener);
        resolve(frame);
      }
    };
    socket.addEventListener("message", listener);
  });
}

/** Aim-arena main lane from the west spawn to the east spawn exit (x is mirrored for B's side). */
const DRIVER_ROUTE = [
  { x: -14.9, z: 2.5 },
  { x: -12.6, z: 2.5 },
  { x: -11.8, z: 0.6 },
  { x: -7, z: -0.6 },
  { x: -3, z: -2.4 },
  { x: 3, z: -2.4 },
  { x: 7, z: -0.6 },
  { x: 11.8, z: 0.6 },
  { x: 12.6, z: 2.5 },
  { x: 14.9, z: 2.5 },
];
const movement = (seq: number) =>
  JSON.stringify({
    v: 1,
    type: "input",
    combatVersion: 2,
    seq,
    forward: 1,
    strafe: 0,
    yaw: 0,
    pitch: 0,
    fire: true,
    reload: false,
    weapon: "rifle",
    jump: false,
    sprint: false,
  });
async function sessionSocket(
  id: string,
  sid: string,
  sub = A,
  authExpiresAt = Date.now() + 3600000,
) {
  const response = await connect(
    id,
    await token(id, sub, "player", {
      sessionId: sid,
      authExpiresAt,
      exp: Math.min(Date.now() + 60000, authExpiresAt),
    }),
  );
  expect(response.status).toBe(101);
  response.webSocket!.accept();
  sockets.push(response.webSocket!);
  return response.webSocket!;
}
async function readyLive(a: Socket, b: Socket) {
  const live = until(a, (f) => f.type === "snapshot" && f.state.phase === "live");
  for (const s of [a, b]) s.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
  return live;
}
function closed(socket: Socket) {
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(Error("Session socket not closed")), 8000);
    socket.addEventListener(
      "close",
      (e) => {
        clearTimeout(timer);
        resolve(e.code);
      },
      { once: true },
    );
  });
}
describe("isolated real Durable Object WebSockets", () => {
  beforeAll(async () => {
    const bundled = await build({
      entryPoints: ["workers/fps/index.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      target: "es2022",
    });
    mf = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: bundled.outputFiles[0]!.text,
        compatibilityDate: "2026-10-26",
        compatibilityFlags: ["nodejs_compat"],
        durableObjects: { DUELS: { className: "DuelRoom", useSQLite: true } },
        bindings: {
          FPS_RUNTIME_SECRET: secret,
          SUPABASE_URL: "https://db.test",
          SUPABASE_SERVICE_ROLE_KEY: "test-only",
          ALLOWED_ORIGIN: origin,
        },
        // No database or external network is contacted by these tests.
        outboundService: async (request) => {
          const body = (await request.json()) as Record<string, unknown>;
          const path = new URL(request.url).pathname;
          if (path.endsWith("fps_check_sessions")) {
            const requested = body["p_sessions"] as Array<{ session_id: string; user_id: string }>;
            if (requested.some((s) => s.session_id === unavailableSession))
              return Response.json({ error: "outage" }, { status: 503 });
            const rows = requested.map((s) => ({
              sessionId: s.session_id,
              userId: s.user_id,
              active: !revokedSessions.has(s.session_id),
            }));
            if (requested.some((s) => s.session_id === delayedSession)) {
              authReadObserved?.();
              authReadObserved = undefined;
              await pause(120);
            }
            if (sessionReadDelayMs) await pause(sessionReadDelayMs);
            return Response.json(rows);
          }
          callbacks.push({ path, body });
          if (body["p_match"] === refundedId) {
            if (path.endsWith("fps_record_result"))
              return Response.json({ error: "already refunded" }, { status: 400 });
            if (path.endsWith("fps_view"))
              return Response.json({ id: refundedId, status: "CANCELLED" });
          }
          if (path.endsWith("fps_finish") && body["p_match"] === failOnceId) {
            failOnceId = "";
            return Response.json({ error: "injected local outage" }, { status: 503 });
          }
          return Response.json({ ok: true });
        },
      }),
    );
    await mf.ready;
  }, 30_000);
  afterAll(async () => {
    for (const s of sockets) {
      try {
        s.close();
      } catch {
        /* Already closed by a protocol rejection. */
      }
    }
    await mf?.dispose();
  });
  it("requires the updated combat handshake before accepting a new-match client", async () => {
    const id = await init(),
      oldReady = await open(id);
    const readyClosed = closed(oldReady);
    oldReady.send(JSON.stringify({ v: 1, type: "ready" }));
    expect(await readyClosed).toBe(1008);
    const oldInput = await open(id);
    const inputClosed = closed(oldInput);
    const payload = JSON.parse(movement(0));
    delete payload.combatVersion;
    oldInput.send(JSON.stringify(payload));
    expect(await inputClosed).toBe(1008);
  });

  it("completes a normal client close before accepting its replacement", async () => {
    const id = await init();
    const first = (await connect(id, await token(id))).webSocket!;
    first.accept();
    const closure = closed(first);
    first.close(1000, "Reconnecting");
    expect(await closure).toBe(1000);
    const replacement = await connect(id, await token(id));
    expect(replacement.status).toBe(101);
    replacement.webSocket!.accept();
    sockets.push(replacement.webSocket!);
  });
  it("starts a human BO13 series with a seven-win target", async () => {
    const id = await init(crypto.randomUUID(), false, Date.now() + 1200000, 13);
    const a = await open(id),
      b = await open(id, B);
    try {
      const frame = await readyLive(a, b);
      expect(frame.state.bestOf).toBe(13);
      expect(frame.state.sideVersion).toBe(1);
      expect(frame.state.players.A.id).toBe(A);
      expect(frame.state.players.B.id).toBe(B);
    } finally {
      a.close();
      b.close();
    }
  });
  it("immediate trigger shares session authority, fires without movement and uses 30 Hz snapshots", async () => {
    const id = await init(),
      sid = crypto.randomUUID(),
      a = await sessionSocket(id, sid),
      b = await open(id, B);
    const initial = await readyLive(a, b);
    const staleFrame = until(a, (f) => f.type === "snapshot" && f.serverNow > initial.serverNow);
    a.send(JSON.stringify({ ...JSON.parse(movement(8000)), round: initial.state.round + 1 }));
    const ignored = await staleFrame;
    expect(ignored.state.players.A.lastSeq).toBe(initial.state.players.A.lastSeq);
    expect(ignored.state.players.A.ammo).toBe(initial.state.players.A.ammo);
    const frame = until(a, (f) => f.type === "snapshot" && f.state.players.A.lastSeq === 8000);
    a.send(
      JSON.stringify({
        ...JSON.parse(movement(8000)),
        round: initial.state.round,
        combatOnly: true,
        forward: 0,
        strafe: 0,
        playbackMs: 65,
      }),
    );
    const fired = await frame;
    expect(fired.state.players.A.ammo).toBe(initial.state.players.A.ammo - 1);
    expect(fired.state.players.A.z).toBe(initial.state.players.A.z);
    const stamps: number[] = [];
    a.addEventListener("message", (e) => {
      const f = JSON.parse(String(e.data));
      if (f.type === "snapshot") stamps.push(f.serverNow);
    });
    await pause(1100);
    expect(stamps.length).toBeGreaterThanOrEqual(25);
    const end = closed(a);
    revokedSessions.add(sid);
    try {
      a.send(
        JSON.stringify({ ...JSON.parse(movement(8001)), combatOnly: true, forward: 0, strafe: 0 }),
      );
      expect(await end).toBe(1008);
    } finally {
      revokedSessions.delete(sid);
      a.close();
      b.close();
    }
  });
  it("revoking an established session rejects queued movement and fire, including reconnect admission", async () => {
    const id = await init(),
      sid = crypto.randomUUID(),
      a = await sessionSocket(id, sid),
      b = await open(id, B);
    const before = await readyLive(a, b),
      end = closed(a);
    revokedSessions.add(sid);
    try {
      a.send(movement(9000));
      expect(await end).toBe(1008);
      expect((await connect(id, await token(id, A, "player", { sessionId: sid }))).status).toBe(
        403,
      );
      const replacement = await sessionSocket(id, crypto.randomUUID());
      const after = await until(
        replacement,
        (f) => f.type === "snapshot" && f.state.phase === "live",
      );
      expect(after.state.players.A.lastSeq).toBe(before.state.players.A.lastSeq);
      expect(after.state.players.A.ammo).toBe(before.state.players.A.ammo);
      expect(after.state.players.A.z).toBe(before.state.players.A.z);
    } finally {
      revokedSessions.delete(sid);
    }
  });
  it("an in-flight positive read cannot authorize a command received after revocation", async () => {
    const id = await init(),
      sid = crypto.randomUUID(),
      a = await sessionSocket(id, sid),
      b = await open(id, B);
    const before = await readyLive(a, b);
    try {
      const observed = new Promise<void>((resolve) => (authReadObserved = resolve));
      delayedSession = sid;
      await observed;
      revokedSessions.add(sid);
      const end = closed(a);
      a.send(movement(9900));
      expect(await end).toBe(1008);
      const replacement = await sessionSocket(id, crypto.randomUUID());
      const after = await until(
        replacement,
        (f) => f.type === "snapshot" && f.state.phase === "live",
      );
      expect(after.state.players.A.lastSeq).toBe(before.state.players.A.lastSeq);
      expect(after.state.players.A.ammo).toBe(before.state.players.A.ammo);
    } finally {
      delayedSession = "";
      authReadObserved = undefined;
      revokedSessions.delete(sid);
    }
  });
  it("keeps the simulation clock near 30 Hz while session reads take 120 ms", async () => {
    const id = await init(),
      sid = crypto.randomUUID(),
      a = await sessionSocket(id, sid),
      b = await open(id, B);
    delayedSession = sid;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      await readyLive(a, b);
      let seq = 0,
        lastInputAt = Date.now();
      timer = setInterval(() => {
        const now = Date.now();
        // Match the browser's fixed input accumulator, including bounded catch-up.
        // One command per timer callback silently slows this test's producer
        // under host CPU contention, unlike the production renderer.
        for (let step = 0; step < 3 && now - lastInputAt >= 34; step++) {
          lastInputAt = Math.max(lastInputAt + 34, now - 68);
          a.send(
            // North up the west spawn alley: 14 m of free ground.
            JSON.stringify({ ...JSON.parse(movement(++seq)), forward: 1, strafe: 0, fire: false }),
          );
        }
      }, 34);
      await pause(400);
      const poses: Array<{ at: number; z: number }> = [];
      const frames: Array<RuntimeFrame & { trail?: Array<{ poseAt: number }> }> = [];
      a.addEventListener("message", (event) => {
        const frame = JSON.parse(String(event.data)) as RuntimeFrame;
        if (frame.type === "snapshot") {
          expect(frame.poseAt).toBeLessThanOrEqual(frame.serverNow);
          expect(frame.serverNow - frame.poseAt).toBeLessThan(100);
          poses.push({ at: frame.serverNow, z: frame.state.players.A.z });
          frames.push(frame as RuntimeFrame & { trail?: Array<{ poseAt: number }> });
        }
      });
      const first = await until(a, (f) => f.type === "snapshot" && f.state.phase === "live");
      const started = Date.now();
      const last = await until(a, (f) => f.type === "snapshot" && Date.now() - started >= 1600);
      const hz = ((last.state.tick - first.state.tick) * 1000) / (Date.now() - started);
      expect(hz).toBeGreaterThan(27);
      expect(hz).toBeLessThan(32);
      const gaps = poses.slice(1).map((pose, i) => pose.at - poses[i]!.at);
      const moving = poses.slice(1).filter((pose, i) => pose.z < poses[i]!.z).length;
      expect(Math.max(...gaps)).toBeLessThan(110);
      expect(moving / gaps.length).toBeGreaterThan(0.85);
      // Snapshots plus their trails deliver every physics step (no ~67 ms holes).
      const timeline = [
        ...new Set(frames.flatMap((f) => [...(f.trail ?? []).map((t) => t.poseAt), f.poseAt])),
      ].sort((x, y) => x - y);
      const stepGaps = timeline.slice(1).map((t, i) => t - timeline[i]!);
      expect(frames.some((f) => (f.trail?.length ?? 0) > 0)).toBe(true);
      expect(Math.max(...stepGaps)).toBeLessThan(60);
      console.log(
        JSON.stringify({
          event: "slow_auth_clock_test",
          hz,
          maxSnapshotGapMs: Math.max(...gaps),
          movingShare: moving / gaps.length,
        }),
      );
    } finally {
      clearInterval(timer);
      delayedSession = "";
      a.close();
      b.close();
    }
  });
  it("drains a packet burst during continuous rifle fire with fast session checks", async () => {
    const id = await init(),
      a = await sessionSocket(id, crypto.randomUUID()),
      b = await open(id, B);
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      await readyLive(a, b);
      sessionReadDelayMs = 18;
      let seq = 40000,
        lastInputAt = Date.now();
      const sent = new Map<number, number>(),
        latency: number[] = [];
      const began = Date.now();
      a.addEventListener("message", (event) => {
        const f = JSON.parse(String(event.data)) as RuntimeFrame;
        if (f.type !== "snapshot" || Date.now() - began < 700) return;
        const at = sent.get(f.state.players.A.lastSeq);
        if (at !== undefined) latency.push(Date.now() - at);
      });
      const send = () => {
        sent.set(++seq, Date.now());
        a.send(JSON.stringify({ ...JSON.parse(movement(seq)), forward: 0, fire: true }));
      };
      for (let i = 0; i < 4; i++) send();
      timer = setInterval(() => {
        const now = Date.now();
        for (let i = 0; i < 3 && now - lastInputAt >= 34; i++) {
          lastInputAt = Math.max(lastInputAt + 34, now - 68);
          send();
        }
      }, 34);
      await pause(2200);
      latency.sort((a, b) => a - b);
      expect(latency.length).toBeGreaterThan(10);
      // The serial firing backlog reproduced 176 ms median with this burst.
      expect(latency[Math.floor(latency.length / 2)]).toBeLessThan(140);
    } finally {
      clearInterval(timer);
      sessionReadDelayMs = 0;
      a.close();
      b.close();
    }
  });
  for (const readMs of [72, 150])
    it(`strict session gate: command-to-applied latency with ${readMs} ms session reads`, async () => {
      const id = await init(),
        a = await sessionSocket(id, crypto.randomUUID()),
        b = await open(id, B);
      let timer: ReturnType<typeof setInterval> | undefined;
      try {
        await readyLive(a, b);
        sessionReadDelayMs = readMs;
        const sentAt = new Map<number, number>(),
          latency: number[] = [];
        let applied = -1;
        a.addEventListener("message", (event) => {
          const frame = JSON.parse(String(event.data)) as RuntimeFrame;
          if (frame.type !== "snapshot") return;
          const now = Date.now();
          for (let s = applied + 1; s <= frame.state.players.A.lastSeq; s++) {
            const at = sentAt.get(s);
            if (at !== undefined) latency.push(now - at);
          }
          applied = Math.max(applied, frame.state.players.A.lastSeq);
        });
        let seq = 20_000,
          lastInputAt = Date.now();
        await pause(300);
        timer = setInterval(() => {
          const now = Date.now();
          for (let step = 0; step < 3 && now - lastInputAt >= 34; step++) {
            lastInputAt = Math.max(lastInputAt + 34, now - 68);
            sentAt.set(++seq, Date.now());
            a.send(
              JSON.stringify({ ...JSON.parse(movement(seq)), forward: 1, strafe: 0, fire: false }),
            );
          }
        }, 34);
        await pause(2500);
        clearInterval(timer);
        await pause(readMs * 2 + 200);
        latency.sort((x, y) => x - y);
        const q = (p: number) =>
          latency[Math.min(latency.length - 1, Math.ceil(latency.length * p) - 1)]!;
        const summary = { readMs, n: latency.length, p50: q(0.5), p95: q(0.95), p99: q(0.99) };
        console.log(JSON.stringify({ event: "strict_gate_latency", ...summary }));
        expect(latency.length).toBeGreaterThan(40);
        // Read + read spacing + catch-up + clock/snapshot alignment (local, no network).
        // The previous serial-read runtime measured 263 / 346 ms p95 here (72 / 150 ms reads).
        expect(summary.p95).toBeLessThan(readMs + 160);
      } finally {
        clearInterval(timer);
        sessionReadDelayMs = 0;
        a.close();
        b.close();
      }
    });
  it("a command flood cannot move a player faster than real time (bounded catch-up)", async () => {
    const id = await init(),
      a = await sessionSocket(id, crypto.randomUUID()),
      b = await open(id, B);
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      const start = await readyLive(a, b);
      const z0 = start.state.players.A.z;
      let seq = 30_000;
      const began = Date.now();
      // ~65 commands per second: under the 70/s rate limit, ~2.2x the 29.4/s tick rate.
      timer = setInterval(() => {
        for (let i = 0; i < 2; i++)
          a.send(
            JSON.stringify({ ...JSON.parse(movement(++seq)), forward: 1, strafe: 0, fire: false }),
          );
      }, 31);
      await pause(2000);
      clearInterval(timer);
      const elapsed = (Date.now() - began) / 1000;
      const end = await until(a, (f) => f.type === "snapshot" && f.state.phase === "live");
      const travelled = Math.abs(end.state.players.A.z - z0);
      console.log(JSON.stringify({ event: "flood_test", elapsed, travelled }));
      // Walking speed for the elapsed real time plus at most the 3-command catch-up burst.
      expect(travelled).toBeLessThan(5 * elapsed + 5 * 0.034 * MAX_COMMAND_CREDIT + 0.05);
    } finally {
      clearInterval(timer);
      a.close();
      b.close();
    }
  });
  it("the original JWT expiry closes an existing session even when the database row remains live", async () => {
    const id = await init(),
      sid = crypto.randomUUID(),
      a = await sessionSocket(id, sid, A, Date.now() + 4300),
      b = await open(id, B);
    const end = closed(a);
    await readyLive(a, b);
    expect(await end).toBe(1008);
  });
  it("a transient session-check outage never applies buffered commands when validation recovers", async () => {
    const id = await init(),
      sid = crypto.randomUUID(),
      a = await sessionSocket(id, sid),
      b = await open(id, B);
    const before = await readyLive(a, b);
    try {
      unavailableSession = sid;
      const paused = until(a, (f) => f.type === "authorization");
      a.send(movement(7000));
      await paused;
      await pause(120);
      unavailableSession = "";
      const resumed = await until(a, (f) => f.type === "snapshot" && f.state.phase === "live");
      expect(resumed.state.players.A.lastSeq).toBe(before.state.players.A.lastSeq);
      expect(resumed.state.players.A.ammo).toBe(before.state.players.A.ammo);
      const moved = until(a, (f) => f.type === "snapshot" && f.state.players.A.lastSeq === 7001);
      a.send(movement(7001));
      await moved;
    } finally {
      unavailableSession = "";
    }
  });
  it("a prolonged authorization outage cancels without awarding an unverified winner", async () => {
    const id = await init(),
      sid = crypto.randomUUID(),
      a = await sessionSocket(id, sid),
      b = await open(id, B);
    await readyLive(a, b);
    try {
      const end = closed(a);
      unavailableSession = sid;
      a.send(movement(8000));
      expect(await end).toBe(1013);
      unavailableSession = "";
      const observer = await sessionSocket(id, crypto.randomUUID());
      const terminal = await until(
        observer,
        (f) => f.type === "snapshot" && f.state.phase === "cancelled",
      );
      expect(terminal.state.winner).toBeNull();
      expect(terminal.state.players.A.lastSeq).not.toBe(8000);
    } finally {
      unavailableSession = "";
    }
  }, 15000);
  it("redacts occluded enemy poses separately for both player sockets", async () => {
    const id = await init(),
      a = await open(id, A),
      b = await open(id, B);
    const nextA = until(a, (f) => f.type === "snapshot" && f.state.phase === "live");
    const nextB = until(b, (f) => f.type === "snapshot" && f.state.phase === "live");
    a.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    b.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    const [frameA, frameB] = await Promise.all([nextA, nextB]);
    expect(frameA.visibility).toEqual({ A: true, B: false });
    expect(frameB.visibility).toEqual({ A: false, B: true });
    expect(frameA.state.players.A.x).toBe(-18.2);
    expect(frameB.state.players.B.x).toBe(18.2);
    expect(frameA.state.players.B.x).toBe(0);
    expect(frameB.state.players.A.x).toBe(0);
    expect(frameA.state).not.toHaveProperty("server");
  });

  it("requires internal authorization, matching room identity and exact browser origin", async () => {
    const id = await init();
    expect(
      (
        await mf.dispatchFetch(`https://runtime.test/internal/matches/${id}`, {
          method: "POST",
          body: "{}",
        })
      ).status,
    ).toBe(403);
    expect((await connect(id, await token(id), "https://evil.test")).status).toBe(403);
    expect((await connect(id, await token(id, crypto.randomUUID()))).status).toBe(403);
    expect((await connect(id, "tampered")).status).toBe(403);
  });
  it("consumes admission only once and denies spectators in private rooms", async () => {
    const id = await init();
    const ticket = await token(id);
    const response = await connect(id, ticket);
    response.webSocket!.accept();
    sockets.push(response.webSocket!);
    expect((await connect(id, ticket)).status).toBe(403);
    const privateId = await init(undefined, true);
    expect(
      (await connect(privateId, await token(privateId, crypto.randomUUID(), "spectator"))).status,
    ).toBe(403);
  });
  it("starts only when both clients are ready, advances on server time and replaces a reconnect", async () => {
    const id = await init();
    const a = await open(id);
    // Waiting rooms send their initial state, rather than repeating an unchanged tick.
    const waitingFrame = until(a, (f) => f.type === "snapshot");
    const b = await open(id, B);
    a.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    await pause(80);
    const waiting = await waitingFrame;
    expect(waiting.state.phase).toBe("waiting");
    const live = until(a, (f) => f.type === "snapshot" && f.state.phase === "live");
    b.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    const frame = await live;
    expect(frame.state.players.A.id).toBe(A);
    expect(frame.state.score).toEqual({ A: 0, B: 0 });
    const closed = new Promise<number>((resolve) =>
      a.addEventListener("close", (e) => resolve(e.code)),
    );
    const replacement = await open(id);
    expect(await closed).toBe(4001);
    replacement.send(
      JSON.stringify({
        v: 1,
        type: "input",
        combatVersion: 2,
        seq: 5000,
        forward: 0,
        strafe: 1,
        yaw: 0,
        pitch: 0,
        fire: false,
        reload: false,
        weapon: "rifle",
        jump: false,
        sprint: false,
        crouch: true,
      }),
    );
    const moved = await until(
      replacement,
      (f) => f.type === "snapshot" && f.state.players.A.lastSeq === 5000,
    );
    expect(moved.state.players.A.x).toBeGreaterThan(-18.2);
    expect(moved.state.players.A.crouched).toBe(true);
  });
  it("rejects client-authored damage and enforces read-only spectators", async () => {
    const id = await init();
    const player = await open(id);
    const badClosed = new Promise<number>((resolve) =>
      player.addEventListener("close", (e) => resolve(e.code)),
    );
    player.send(JSON.stringify({ v: 1, type: "hit", damage: 100, winner: A }));
    expect(await badClosed).toBe(1008);
    const spectator = await open(id, crypto.randomUUID(), "spectator");
    const specClosed = new Promise<number>((resolve) =>
      spectator.addEventListener("close", (e) => resolve(e.code)),
    );
    spectator.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    expect(await specClosed).toBe(1008);
  });
  it("reserves both player seats when spectator capacity is full", async () => {
    const id = await init();
    for (let i = 0; i < 16; i++) await open(id, crypto.randomUUID(), "spectator");
    expect((await connect(id, await token(id, crypto.randomUUID(), "spectator"))).status).toBe(429);
    await open(id);
    await open(id, B);
    await open(id);
  });
  it("acknowledges a database-confirmed expiry refund without inventing another settlement", async () => {
    const id = crypto.randomUUID();
    refundedId = id;
    await init(id, false, Date.now() + 5500);
    const a = await open(id);
    const final = await until(a, (f) => f.type === "snapshot" && f.settled);
    expect(final.state.phase).toBe("cancelled");
    expect(
      callbacks.filter((c) => c.body["p_match"] === id).map((c) => c.path.split("/").at(-1)),
    ).toEqual(["fps_record_result", "fps_view"]);
  });
  it("plays three real-time rounds through authoritative combat and records one consistent result", async () => {
    const id = await init();
    failOnceId = id;
    const a = await open(id),
      b = await open(id, B);
    const spectator = await open(id, crypto.randomUUID(), "spectator");
    const spectatorFinal = until(spectator, (f) => f.type === "snapshot" && f.settled, 85_000);
    let latest: MatchState | null = null;
    let seq = 0,
      round = 0,
      stage = 0,
      side = 1;
    a.addEventListener("message", (event) => {
      const f = JSON.parse(String(event.data));
      if (f.type === "snapshot") latest = f.state;
    });
    const completed = until(
      a,
      (f) => f.type === "snapshot" && f.state.phase === "completed" && f.settled,
      80_000,
    );
    a.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    b.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    // Explicit transport test drivers, never production opponents. They send only legal inputs.
    const driver = setInterval(() => {
      if (!latest || latest.phase !== "live") return;
      if (round !== latest.round) {
        round = latest.round;
        stage = 0;
      }
      const p = latest.players.A,
        target = latest.players.B;
      // Main lane from this round's spawn into the opponent's spawn exit (mirrored per side).
      if (stage === 0) side = p.x < 0 ? 1 : -1;
      const route = DRIVER_ROUTE.map((w) => ({ x: w.x * side, z: w.z }));
      while (stage < route.length && Math.hypot(route[stage]!.x - p.x, route[stage]!.z - p.z) < 0.4)
        stage++;
      const goal = route[stage],
        shooting = !goal;
      const yaw = shooting
        ? Math.atan2(-(target.x - p.x), -(target.z - p.z))
        : Math.atan2(-(goal.x - p.x), -(goal.z - p.z));
      a.send(
        JSON.stringify({
          v: 1,
          type: "input",
          combatVersion: 2,
          seq: ++seq,
          forward: shooting ? 0 : 1,
          strafe: 0,
          yaw: yaw - (shooting ? (p.recoilYaw ?? 0) : 0),
          pitch: shooting ? -(p.recoilPitch ?? 0) : 0,
          fire: shooting,
          reload: false,
          weapon: "rifle",
          jump: false,
          sprint: !shooting,
        }),
      );
    }, 34);
    try {
      const final = await completed;
      expect(final.state.score).toEqual({ A: 3, B: 0 });
      expect(final.state.winner).toBe("A");
      expect(final.settlementPending).toBe(false);
      const delayedFinal = await spectatorFinal;
      expect(delayedFinal.state.score).toEqual({ A: 3, B: 0 });
      expect(
        callbacks.filter((c) => c.body["p_match"] === id && c.path.endsWith("fps_mark_started")),
      ).toHaveLength(1);
      const resultCalls = callbacks.filter(
        (c) => c.body["p_match"] === id && !c.path.endsWith("fps_mark_started"),
      );
      expect(resultCalls.map((c) => c.path.split("/").at(-1))).toEqual([
        "fps_record_result",
        "fps_finish",
        "fps_record_result",
        "fps_finish",
      ]);
      expect(
        resultCalls.every((c) => c.body["p_winner"] === A && c.body["p_reason"] === "ROUNDS"),
      ).toBe(true);
    } finally {
      clearInterval(driver);
    }
  }, 90_000);

  it("starts a private solo bot room with only the human ready and rejects bot/spectator tickets", async () => {
    const id = crypto.randomUUID(),
      bot = "00000000-0000-4000-8000-000000000013";
    const config = {
      id,
      creator_id: A,
      opponent_id: bot,
      best_of: 13,
      stake: 0,
      private: true,
      practice: true,
      expiresAt: Date.now() + 1200000,
    };
    const boot = await mf.dispatchFetch("https://runtime.test/internal/matches/" + id, {
      method: "POST",
      headers: { Authorization: "Bearer " + secret },
      body: JSON.stringify(config),
    });
    expect(boot.status).toBe(200);
    expect((await connect(id, await token(id, bot))).status).toBe(403);
    expect((await connect(id, await token(id, B, "spectator"))).status).toBe(403);
    const human = await open(id),
      live = until(human, (f) => f.type === "snapshot" && f.state.phase === "live");
    let botStep: MatchState["events"][number] | undefined;
    human.addEventListener("message", (event) => {
      const frame = JSON.parse(String(event.data));
      if (frame.type === "snapshot")
        botStep ??= frame.state.events.find(
          (e: MatchState["events"][number]) => e.type === "step" && e.seat === "B",
        );
    });
    human.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    expect((await live).state.bestOf).toBe(13);
    // The hidden bot is redacted (lastSeq -1) until it comes into view of the idle human. Its
    // first-round patrol is a random style × opening; the slowest (lurk/south) reveals ~15.3 s
    // after live (bound pinned by tests/fps-practice-bot-reveal.test.ts), so wait 25 s.
    const walking = await until(
      human,
      (f) => f.type === "snapshot" && !!f.visibility?.B && f.state.players.B.lastSeq > 0,
      25000,
    );
    expect(walking.state.players.B.lastSeq).toBeGreaterThan(0);
    expect(botStep?.at).toBeGreaterThan(0);
    expect(botStep?.audio).not.toHaveProperty("position");
    const bad = await mf.dispatchFetch(
      "https://runtime.test/internal/matches/" + crypto.randomUUID(),
      {
        method: "POST",
        headers: { Authorization: "Bearer " + secret },
        body: JSON.stringify({ ...config, stake: 100 }),
      },
    );
    expect(bad.status).toBe(400);
    human.close();
  }, 40000);

  it("reports actual socket round trips and keeps server timing independent of claimed clocks", async () => {
    const id = await init(),
      a = await open(id),
      b = await open(id, B);
    const timers = new Set<ReturnType<typeof setTimeout>>();
    for (const socket of [a, b])
      socket.addEventListener("message", (event) => {
        const f = JSON.parse(String(event.data));
        if (f.type !== "ping") return;
        socket.send(JSON.stringify({ v: 1, type: "pong", id: "forged-nonce" }));
        const timer = setTimeout(
          () => {
            timers.delete(timer);
            try {
              socket.send(JSON.stringify({ v: 1, type: "pong", id: f.id }));
            } catch {
              /* test room closed */
            }
          },
          socket === a ? 120 : 10,
        );
        timers.add(timer);
      });
    try {
      await readyLive(a, b);
      const report = await until(
        a,
        (f) =>
          f.type === "network" &&
          (f as unknown as { report: { rttMs: number; tickHz: number } }).report.tickHz > 15,
      );
      const timing = (report as unknown as { report: { rttMs: number; authMs: number } }).report;
      expect(timing.rttMs).toBeGreaterThanOrEqual(100);
      expect(timing.rttMs).toBeLessThan(500);
      expect(timing.authMs).toBeLessThan(1200);
    } finally {
      for (const timer of timers) clearTimeout(timer);
      a.close();
      b.close();
    }
  }, 15000);
});
