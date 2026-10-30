import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../src/lib/fps/ticket";
import type { MatchState } from "../src/lib/fps/protocol";

const secret = "isolated-runtime-test-".repeat(3);
const origin = "https://casino.test";
const A = crypto.randomUUID(),
  B = crypto.randomUUID();
let mf: Miniflare;
type Socket = NonNullable<Awaited<ReturnType<Miniflare["dispatchFetch"]>>["webSocket"]>;
const sockets: Socket[] = [];
type RuntimeFrame = {
  type: string;
  state: MatchState;
  settled: boolean;
  settlementPending: boolean;
};
const callbacks: Array<{ path: string; body: Record<string, unknown> }> = [];
let failOnceId = "";
let refundedId = "";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function token(id: string, sub = A, role: "player" | "spectator" = "player") {
  return signAdmission(
    {
      v: 1,
      aud: "fps-duel",
      matchId: id,
      sub,
      role,
      nonce: crypto.randomUUID(),
      exp: Date.now() + 60_000,
    },
    secret,
  );
}
async function init(
  id = crypto.randomUUID(),
  isPrivate = false,
  expiresAt = Date.now() + 20 * 60_000,
) {
  const response = await mf.dispatchFetch(`https://runtime.test/internal/matches/${id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      id,
      creator_id: A,
      opponent_id: B,
      best_of: 5,
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
describe("isolated real Durable Object WebSockets", () => {
  beforeAll(async () => {
    const bundled = await build({
      entryPoints: ["workers/fps/index.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "browser",
      target: "es2022",
    });
    mf = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: bundled.outputFiles[0]!.text,
        compatibilityDate: "2026-10-26",
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
    const a = await open(id),
      b = await open(id, B);
    a.send(JSON.stringify({ v: 1, type: "ready" }));
    await pause(80);
    const waiting = await until(a, (f) => f.type === "snapshot");
    expect(waiting.state.phase).toBe("waiting");
    const live = until(a, (f) => f.type === "snapshot" && f.state.phase === "live");
    b.send(JSON.stringify({ v: 1, type: "ready" }));
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
    expect(moved.state.players.A.x).toBeGreaterThan(0);
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
    spectator.send(JSON.stringify({ v: 1, type: "ready" }));
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
      stage = 0;
    a.addEventListener("message", (event) => {
      const f = JSON.parse(String(event.data));
      if (f.type === "snapshot") latest = f.state;
    });
    const completed = until(
      a,
      (f) => f.type === "snapshot" && f.state.phase === "completed" && f.settled,
      80_000,
    );
    a.send(JSON.stringify({ v: 1, type: "ready" }));
    b.send(JSON.stringify({ v: 1, type: "ready" }));
    // Explicit transport test drivers, never production opponents. They send only legal inputs.
    const driver = setInterval(() => {
      if (!latest || latest.phase !== "live") return;
      if (round !== latest.round) {
        round = latest.round;
        stage = 0;
      }
      const p = latest.players.A,
        target = latest.players.B;
      if (stage === 0 && p.x >= 9) stage = 1;
      if (stage === 1 && Math.abs(target.z - p.z) < 0.5) stage = 2;
      const yaw =
        stage === 0
          ? 0
          : stage === 1
            ? target.z < p.z
              ? 0
              : Math.PI
            : Math.atan2(-(target.x - p.x), -(target.z - p.z));
      a.send(
        JSON.stringify({
          v: 1,
          type: "input",
          seq: ++seq,
          forward: stage === 1 ? 1 : 0,
          strafe: stage === 0 ? 1 : 0,
          yaw,
          pitch: 0,
          fire: stage === 2,
          reload: false,
          weapon: "rifle",
          jump: false,
          sprint: stage !== 2,
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
      const resultCalls = callbacks.filter((c) => c.body["p_match"] === id);
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
});
