import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../src/lib/fps/ticket";
import type { MatchState } from "../src/lib/fps/protocol";
import { sessionLeaseMs } from "../workers/fps/index";

/**
 * The duel room's session lease (workers/fps/index.ts sessionLeaseMs): a positive database read
 * is trusted for the lease and renewed in the background, instead of one read per command.
 * Real Durable Object WebSockets on Miniflare, with a 400 ms lease.
 */
const LEASE_MS = 400;
const secret = "isolated-lease-test-".repeat(3);
const origin = "https://casino.test";
const A = crypto.randomUUID(),
  B = crypto.randomUUID();
let mf: Miniflare;
type Socket = NonNullable<Awaited<ReturnType<Miniflare["dispatchFetch"]>>["webSocket"]>;
type Frame = { type: string; state: MatchState };
const sockets: Socket[] = [];
const revoked = new Set<string>();
let sessionReads = 0;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function init() {
  const id = crypto.randomUUID();
  const response = await mf.dispatchFetch(`https://runtime.test/internal/matches/${id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      id,
      creator_id: A,
      opponent_id: B,
      best_of: 5,
      stake: 0,
      private: false,
      expiresAt: Date.now() + 20 * 60_000,
      map_id: "dustfront",
    }),
  });
  expect(response.status).toBe(200);
  return id;
}
async function open(id: string, sub: string, sessionId = sub) {
  const ticket = await signAdmission(
    {
      v: 2,
      aud: "fps-duel",
      matchId: id,
      sub,
      sessionId,
      authExpiresAt: Date.now() + 3_600_000,
      role: "player",
      nonce: crypto.randomUUID(),
      exp: Date.now() + 60_000,
    },
    secret,
  );
  const response = await mf.dispatchFetch(
    `https://runtime.test/matches/${id}/socket?ticket=${ticket}`,
    { headers: { Upgrade: "websocket", Origin: origin } },
  );
  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  socket.accept();
  sockets.push(socket);
  return socket;
}
function until(socket: Socket, predicate: (frame: Frame) => boolean, timeout = 8000) {
  return new Promise<Frame>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", listener);
      reject(Error("Timed out waiting for runtime frame"));
    }, timeout);
    const listener = (event: { data: unknown }) => {
      const frame = JSON.parse(String(event.data)) as Frame;
      if (predicate(frame)) {
        clearTimeout(timer);
        socket.removeEventListener("message", listener);
        resolve(frame);
      }
    };
    socket.addEventListener("message", listener);
  });
}
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
    fire: false,
    reload: false,
    weapon: "rifle",
    jump: false,
    sprint: false,
  });
async function live(a: Socket, b: Socket) {
  const frame = until(a, (f) => f.type === "snapshot" && f.state.phase === "live", 15_000);
  for (const s of [a, b]) s.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
  return frame;
}

describe("duel room session lease", () => {
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
          FPS_SESSION_LEASE_MS: String(LEASE_MS),
        },
        outboundService: async (request) => {
          const body = (await request.json()) as Record<string, unknown>;
          if (new URL(request.url).pathname.endsWith("fps_check_sessions")) {
            sessionReads++;
            const requested = body["p_sessions"] as Array<{ session_id: string; user_id: string }>;
            return Response.json(
              requested.map((s) => ({
                sessionId: s.session_id,
                userId: s.user_id,
                active: !revoked.has(s.session_id),
              })),
            );
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
        /* Already closed. */
      }
    }
    await mf?.dispose();
  });

  it("reads the lease from the environment, bounded, strict at 0", () => {
    expect(sessionLeaseMs({})).toBe(1000);
    expect(sessionLeaseMs({ FPS_SESSION_LEASE_MS: "0" })).toBe(0);
    expect(sessionLeaseMs({ FPS_SESSION_LEASE_MS: "250" })).toBe(250);
    expect(sessionLeaseMs({ FPS_SESSION_LEASE_MS: "60000" })).toBe(5000);
    expect(sessionLeaseMs({ FPS_SESSION_LEASE_MS: "nonsense" })).toBe(0);
  });

  it("applies commands continuously on a few reads a second, not one per command", async () => {
    const id = await init(),
      a = await open(id, A),
      b = await open(id, B);
    const start = await live(a, b);
    const from = sessionReads;
    let seq = 20_000;
    const began = Date.now();
    let last = start;
    a.addEventListener("message", (event) => {
      const frame = JSON.parse(String(event.data)) as Frame;
      if (frame.type === "snapshot") last = frame;
    });
    while (Date.now() - began < 2000) {
      a.send(movement(++seq));
      await pause(33);
    }
    await pause(150);
    const reads = sessionReads - from;
    // 2 s at a 400 ms lease: about five renewals (strict mode makes about sixty).
    expect(reads).toBeGreaterThanOrEqual(3);
    expect(reads).toBeLessThanOrEqual(12);
    // Commands kept being applied between renewals: nearly every one sent has been consumed.
    expect(last.state.players.A.lastSeq).toBeGreaterThan(seq - 12);
    const moved = Math.hypot(
      last.state.players.A.x - start.state.players.A.x,
      last.state.players.A.z - start.state.players.A.z,
    );
    expect(moved).toBeGreaterThan(1);
  }, 30_000);

  it("cuts a revoked session off within one lease and one read", async () => {
    const id = await init(),
      sid = crypto.randomUUID(),
      a = await open(id, A, sid),
      b = await open(id, B);
    await live(a, b);
    const closed = new Promise<{ code: number; at: number }>((resolve) =>
      a.addEventListener("close", (e) => resolve({ code: e.code, at: Date.now() }), { once: true }),
    );
    const revokedAt = Date.now();
    revoked.add(sid);
    let seq = 30_000;
    const sender = setInterval(() => {
      try {
        a.send(movement(++seq));
      } catch {
        /* Closed. */
      }
    }, 33);
    try {
      const end = await Promise.race([closed, pause(4000).then(() => null)]);
      expect(end).not.toBeNull();
      expect(end!.code).toBe(1008);
      expect(end!.at - revokedAt).toBeLessThan(LEASE_MS + 1000);
    } finally {
      clearInterval(sender);
      revoked.delete(sid);
    }
  }, 30_000);

  it("a second player who connects later is authorized at once, not at the next renewal", async () => {
    const id = await init(),
      a = await open(id, A);
    await pause(LEASE_MS / 2);
    const b = await open(id, B);
    const began = Date.now();
    await live(a, b);
    // Ready → countdown → live includes the countdown itself; the wait for authority must not
    // add a lease on top (a forced read covers the new connection).
    const frame = await until(b, (f) => f.type === "snapshot" && f.state.phase === "live");
    expect(frame.state.phase).toBe("live");
    expect(Date.now() - began).toBeLessThan(12_000);
  }, 30_000);
});
