import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { resolve } from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../src/lib/fps/ticket";
import type { MatchState } from "../src/lib/fps/protocol";
import { PRACTICE_BOT_ID } from "../src/lib/fps/practice";

/**
 * The real match Worker in workerd, bundled with a catalog that also registers the test map
 * (tests/fixtures/test-map.ts): map identity from config to every snapshot, reconnects,
 * map-specific collision on the server, and the practice bot on that map's navigation grid.
 */
const secret = "isolated-map-runtime-test-".repeat(2);
const origin = "https://casino.test";
const A = crypto.randomUUID(),
  B = crypto.randomUUID();
let mf: Miniflare;
type Socket = NonNullable<Awaited<ReturnType<Miniflare["dispatchFetch"]>>["webSocket"]>;
type Frame = { type: string; visibility?: Record<"A" | "B", boolean>; state: MatchState };
const sockets: Socket[] = [];

async function token(id: string, sub = A) {
  return signAdmission(
    {
      v: 2,
      aud: "fps-duel",
      matchId: id,
      sub,
      sessionId: sub,
      authExpiresAt: Date.now() + 3600000,
      role: "player",
      nonce: crypto.randomUUID(),
      exp: Date.now() + 60_000,
    },
    secret,
  );
}
const expiresAt = Date.now() + 20 * 60_000;
function config(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    creator_id: A,
    opponent_id: B,
    best_of: 5,
    stake: 0,
    private: false,
    expiresAt,
    ...extra,
  };
}
const post = (id: string, body: unknown) =>
  mf.dispatchFetch(`https://runtime.test/internal/matches/${id}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
async function open(id: string, sub = A) {
  const response = await mf.dispatchFetch(
    `https://runtime.test/matches/${id}/socket?ticket=${await token(id, sub)}`,
    { headers: { Upgrade: "websocket", Origin: origin } },
  );
  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  socket.accept();
  sockets.push(socket);
  return socket;
}
function until(socket: Socket, predicate: (f: Frame) => boolean, timeout = 10_000) {
  return new Promise<Frame>((done, fail) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", listener);
      fail(Error("Timed out waiting for runtime frame"));
    }, timeout);
    const listener = (event: { data: unknown }) => {
      const frame = JSON.parse(String(event.data)) as Frame;
      if (predicate(frame)) {
        clearTimeout(timer);
        socket.removeEventListener("message", listener);
        done(frame);
      }
    };
    socket.addEventListener("message", listener);
  });
}
const ready = (s: Socket) => s.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
const walkEast = (s: Socket, seq: number) =>
  s.send(
    JSON.stringify({
      v: 1,
      type: "input",
      combatVersion: 2,
      seq,
      forward: 1,
      strafe: 0,
      yaw: -Math.PI / 2,
      pitch: 0,
      fire: false,
      reload: false,
      weapon: "rifle",
      jump: false,
      sprint: true,
      crouch: false,
    }),
  );

describe("map registry in the real match Worker", () => {
  beforeAll(async () => {
    const catalog = resolve("tests/fixtures/test-map-catalog.ts");
    const bundled = await build({
      entryPoints: ["workers/fps/index.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      target: "es2022",
      plugins: [
        {
          name: "test-map-catalog",
          setup(b) {
            // registry.ts imports "./catalog"; swap it for the test catalog.
            b.onResolve({ filter: /^\.\/catalog$/ }, (args) =>
              /maps[\\/]registry\.ts$/.test(args.importer) ? { path: catalog } : undefined,
            );
          },
        },
      ],
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
        outboundService: async (request) => {
          const body = (await request.json()) as Record<string, unknown>;
          if (new URL(request.url).pathname.endsWith("fps_check_sessions"))
            return Response.json(
              (body["p_sessions"] as Array<{ session_id: string; user_id: string }>).map((s) => ({
                sessionId: s.session_id,
                userId: s.user_id,
                active: true,
              })),
            );
          return Response.json({ ok: true });
        },
      }),
    );
    await mf.ready;
  }, 60_000);
  afterAll(async () => {
    for (const s of sockets)
      try {
        s.close();
      } catch {
        /* already closed */
      }
    await mf?.dispose();
  });

  it("advertises its maps and validates the configured map id", async () => {
    const health = (await (await mf.dispatchFetch("https://runtime.test/health")).json()) as {
      maps: string[];
    };
    expect(health.maps).toEqual(["dustfront", "test-grid"]);
    const id = crypto.randomUUID();
    expect((await post(id, config(id, { map_id: "frostline" }))).status).toBe(400);
    expect((await post(id, config(id, { map_id: 7 }))).status).toBe(400);
    expect((await post(id, config(id, { map_id: "test-grid" }))).status).toBe(200);
    // Idempotent re-initialisation must name the same map; another map is a conflict.
    expect((await post(id, config(id, { map_id: "test-grid" }))).status).toBe(200);
    expect((await post(id, config(id))).status).toBe(409);
    expect((await post(id, config(id, { map_id: "dustfront" }))).status).toBe(409);
    // A legacy config (no map) is Dustfront and still re-initialises with an explicit id.
    const legacy = crypto.randomUUID();
    expect((await post(legacy, config(legacy))).status).toBe(200);
    expect((await post(legacy, config(legacy, { map_id: "dustfront" }))).status).toBe(200);
  });

  it("sends the map to both players and a reconnect, and collides with its solids", async () => {
    const id = crypto.randomUUID();
    expect((await post(id, config(id, { map_id: "test-grid" }))).status).toBe(200);
    const a = await open(id),
      b = await open(id, B);
    const first = await until(a, (f) => f.type === "snapshot");
    expect(first.state.mapId).toBe("test-grid");
    expect(first.state.players.A).toMatchObject({ x: -12, z: 0 });
    const live = until(b, (f) => f.type === "snapshot" && f.state.phase === "live");
    ready(a);
    ready(b);
    expect((await live).state.mapId).toBe("test-grid");
    // Reconnect: the replacement socket receives the same map in its first snapshot.
    const replacement = await open(id);
    const rejoined = await until(replacement, (f) => f.type === "snapshot");
    expect(rejoined.state.mapId).toBe("test-grid");
    expect(rejoined.state.phase).toBe("live");
    // Sprinting east from x = -12 the server stops the player at the test wall (x = -0.85).
    let seq = 10;
    const timer = setInterval(() => walkEast(replacement, ++seq), 30);
    try {
      const stopped = await until(
        replacement,
        (f) => f.type === "snapshot" && f.state.players.A.x > -1.2,
        12_000,
      );
      expect(stopped.state.players.A.x).toBeLessThanOrEqual(-0.85 + 1e-6);
      await new Promise((r) => setTimeout(r, 400));
      const later = await until(replacement, (f) => f.type === "snapshot");
      expect(later.state.players.A.x).toBeCloseTo(-0.85, 5);
      // The opponent behind the wall stays redacted for A (server-side sight on this map).
      expect(later.visibility?.B).toBe(false);
    } finally {
      clearInterval(timer);
    }
  }, 30_000);

  it("runs the practice bot on the map's own routes", async () => {
    const id = crypto.randomUUID();
    const practice = config(id, {
      opponent_id: PRACTICE_BOT_ID,
      best_of: 13,
      private: true,
      practice: true,
      map_id: "test-grid",
    });
    expect((await post(id, practice)).status).toBe(200);
    const human = await open(id);
    const live = until(human, (f) => f.type === "snapshot" && f.state.phase === "live");
    ready(human);
    const start = await live;
    expect(start.state.mapId).toBe("test-grid");
    // The bot leaves its spawn (x = 12) round the test wall; it is revealed to the waiting
    // human once it clears the wall (its patrol sweeps the human's spawn at x = -9).
    const seen = await until(
      human,
      (f) =>
        f.type === "snapshot" &&
        !!f.visibility?.B &&
        f.state.phase === "live" &&
        f.state.players.B.lastSeq > 0 &&
        f.state.players.B.x < 10.5,
      25_000,
    );
    expect(seen.state.mapId).toBe("test-grid");
    expect(
      Math.abs(seen.state.players.B.x) > 0.5 + 0.35 || Math.abs(seen.state.players.B.z) > 3.35,
    ).toBe(true);
  }, 40_000);
});
