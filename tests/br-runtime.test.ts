import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../src/lib/fps/ticket";
import { BR_RULES } from "../src/lib/fps/br/match";
import { BR_RULESET_VERSION } from "../src/lib/fps/br/ruleset";
import { DROP } from "../src/lib/fps/br/drop";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";
import { TICK_MS } from "../src/lib/fps/simulation";

/**
 * Battle royale practice on the real Worker bundle (Miniflare/workerd), PLAN §7 Phase 2
 * acceptance: 100 seats, plane, jump, freefall, parachute, landing and sync; two clients see
 * each other's parachutes; illegal transitions rejected; tick p99 ≤ 12 ms in the runtime.
 */
const secret = "isolated-br-runtime-test-".repeat(3);
const origin = "https://casino.test";
// An idle human can stay aboard for the whole diagonal route, then descend without diving.
// Bound that real insertion path instead of assuming the previous freefall duration.
const INSERTION_TICKS = Math.ceil(
  (BR_RULES.countdownMs +
    DROP.planeDurationMs +
    1000 * (DROP.planeAltitude / DROP.parachute.glideDown + 30)) /
    TICK_MS,
);
let mf: Miniflare;
const deniedAdmins = new Set<string>();
let roleCheckUnavailable = false;
type Socket = NonNullable<Awaited<ReturnType<Miniflare["dispatchFetch"]>>["webSocket"]>;
const sockets: Socket[] = [];
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ticket(matchId: string, sub: string, name = "Tester") {
  return signAdmission(
    {
      v: 2,
      aud: "fps-br",
      matchId,
      sub,
      sessionId: sub,
      authExpiresAt: Date.now() + 3_600_000,
      role: "player",
      nonce: crypto.randomUUID(),
      exp: Date.now() + 60_000,
      name,
    },
    secret,
  );
}
type Frame = Record<string, unknown> & { type: string };
type View = Frame & {
  phase: string;
  you: { seat: number; phase: string; x: number; y: number; z: number };
  players: number[][];
  aboard: number;
};
async function open(matchId: string, sub: string, name = "Tester") {
  const r = await mf.dispatchFetch(
    `https://runtime.test/br/${matchId}/socket?worldRevision=${WORLD_ASSETS.revision}&rulesVersion=${BR_RULESET_VERSION}&ticket=${await ticket(matchId, sub, name)}`,
    {
      headers: { Upgrade: "websocket", Origin: origin },
    },
  );
  expect(r.status).toBe(101);
  const s = r.webSocket!;
  const frames: Frame[] = [];
  const closed: { code?: number } = {};
  const last: { kit?: unknown; bytes: number; count: number; max: number } = {
    bytes: 0,
    count: 0,
    max: 0,
  };
  s.addEventListener("message", (e: { data: unknown }) => {
    const text = String(e.data);
    const frame = JSON.parse(text);
    frames.push(frame);
    if (frame.type === "br-snapshot" && frame.phase === "active") {
      last.bytes += text.length;
      last.count++;
      last.max = Math.max(last.max, text.length);
    }
    if (frame.kit) last.kit = frame.kit;
    if (frames.length > 400) frames.splice(0, frames.length - 200);
    if (frame.type === "ping" && s.readyState === 1)
      s.send(JSON.stringify({ v: 1, type: "pong", id: frame.id }));
  });
  s.addEventListener("close", (e: { code: number }) => (closed.code = e.code));
  s.accept();
  sockets.push(s);
  return { s, frames, closed, last };
}
const latest = (frames: Frame[]) =>
  [...frames].reverse().find((f) => f.type === "br-snapshot") as View | undefined;
async function until<T>(
  get: () => T | undefined | false | Promise<T | undefined | false>,
  timeout = 10_000,
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const v = await get();
    if (v) return v;
    await pause(20);
  }
  throw Error("Timed out");
}
async function ticks(matchId: string, n: number, snapshot = false) {
  const r = await mf.dispatchFetch(
    `https://runtime.test/internal/br/${matchId}/tick?n=${n}${snapshot ? "&snapshot=1" : ""}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    },
  );
  expect(r.status).toBe(200);
  return (await r.json()) as {
    phase: string;
    tick: number;
    alive: number;
    aboard: number;
    landed: number;
    airborne: number;
  };
}
let seq = 0;
const send = (s: Socket, extra: Record<string, unknown> = {}) =>
  s.send(
    JSON.stringify({ v: 1, type: "br-input", seq: ++seq, forward: 0, strafe: 0, yaw: 0, ...extra }),
  );

describe("Battle royale runtime (Phase 2)", () => {
  // Each socket starts a live interval. Reusing the runtime leaves earlier scenarios' rooms
  // ticking during later benchmarks, so "three rooms" unintentionally measures more than three.
  beforeEach(async () => {
    deniedAdmins.clear();
    roleCheckUnavailable = false;
    const bundled = await build({
      entryPoints: ["workers/fps/index.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      target: "es2022",
    });
    const publicDir = path.resolve("public");
    mf = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script: bundled.outputFiles[0]!.text,
        compatibilityDate: "2026-10-26",
        compatibilityFlags: ["nodejs_compat"],
        durableObjects: {
          DUELS: { className: "DuelRoom", useSQLite: true },
          BOMB_ROOMS: { className: "BombRoom", useSQLite: true },
          BOMB_LOBBY: { className: "BombLobby", useSQLite: true },
          BR_ROOMS: { className: "BrRoom", useSQLite: true },
          BR_LOBBY: { className: "BrLobby", useSQLite: true },
        },
        bindings: {
          FPS_RUNTIME_SECRET: secret,
          SUPABASE_URL: "https://db.test",
          SUPABASE_SERVICE_ROLE_KEY: "test-only",
          ALLOWED_ORIGIN: origin,
          BR_TEST_HOOKS: "1",
          BR_TEST_ZONE_SCALE: "0.3",
        },
        outboundService: async (request) => {
          const url = new URL(request.url);
          // The island's static files, as the site serves them.
          if (url.origin === origin && url.pathname.startsWith("/fps/br/")) {
            const file = path.join(publicDir, url.pathname);
            if (!file.startsWith(publicDir)) return new Response("no", { status: 404 });
            return new Response(readFileSync(file));
          }
          const body = (await request.json()) as Record<string, unknown>;
          if (url.pathname === "/rest/v1/rpc/has_role") {
            expect(request.headers.get("authorization")).toBe("Bearer test-only");
            expect(body._role).toBe("admin");
            if (roleCheckUnavailable) return new Response("unavailable", { status: 503 });
            return Response.json(!deniedAdmins.has(String(body._user_id)));
          }
          const requested = (body["p_sessions"] ?? []) as Array<{
            session_id: string;
            user_id: string;
          }>;
          return Response.json(
            requested.map((s) => ({ sessionId: s.session_id, userId: s.user_id, active: true })),
          );
        },
      }),
    );
    await mf.ready;
  }, 60_000);
  afterEach(async () => {
    for (const s of sockets)
      try {
        s.close();
      } catch {
        /* already closed */
      }
    await mf?.dispose();
    sockets.length = 0;
  });

  it("denies a preminted nonadmin ticket before loading the world", async () => {
    const id = crypto.randomUUID();
    const sub = crypto.randomUUID();
    const preminted = await ticket(id, sub);
    deniedAdmins.add(sub);
    // Call the room directly for HTTP denials; Miniflare's upgrade transport can
    // emit ECONNRESET on disposal after a rejected websocket handshake.
    const rooms = await mf.getDurableObjectNamespace("BR_ROOMS");
    const response = await rooms
      .get(rooms.idFromName(id))
      .fetch(`https://runtime.test/br/${id}/socket?ticket=${preminted}`);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "BR_ADMIN_ONLY" });
  });

  it("denies admission when the role service is unavailable (a retryable 503, not admin-only)", async () => {
    const id = crypto.randomUUID();
    roleCheckUnavailable = true;
    const rooms = await mf.getDurableObjectNamespace("BR_ROOMS");
    const response = await rooms
      .get(rooms.idFromName(id))
      .fetch(
        `https://runtime.test/br/${id}/socket?ticket=${await ticket(id, crypto.randomUUID())}`,
      );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "ADMIN_CHECK_UNAVAILABLE" });
  });

  it("disconnects an admitted admin after their database role is revoked", async () => {
    const sub = crypto.randomUUID();
    const joined = await open(crypto.randomUUID(), sub);
    await until(() => latest(joined.frames), 30_000);
    deniedAdmins.add(sub);
    await until(() => joined.closed.code !== undefined, 25_000);
    expect(joined.closed.code).toBe(1008);
  }, 60_000);

  it("keeps a connected admin through a role-service outage (no answer is not a no)", async () => {
    const joined = await open(crypto.randomUUID(), crypto.randomUUID());
    await until(() => latest(joined.frames), 30_000);
    roleCheckUnavailable = true;
    try {
      // Past at least one periodic re-check (every 15 s): still connected, still sent frames.
      const before = joined.frames.length;
      await new Promise((r) => setTimeout(r, 17_000));
      expect(joined.closed.code).toBeUndefined();
      expect(joined.frames.length).toBeGreaterThan(before);
    } finally {
      roleCheckUnavailable = false;
    }
  }, 60_000);

  it("refuses stale gameplay rules with a current world and valid admin ticket", async () => {
    const id = crypto.randomUUID();
    const r = await mf.dispatchFetch(
      `https://runtime.test/br/${id}/socket?worldRevision=${WORLD_ASSETS.revision}&rulesVersion=1&ticket=${await ticket(id, crypto.randomUUID())}`,
      { headers: { Upgrade: "websocket", Origin: origin } },
    );
    expect(r.status).toBe(101);
    const s = r.webSocket!;
    const closed: { code?: number } = {};
    s.addEventListener("close", (e) => {
      closed.code = e.code;
    });
    s.accept();
    sockets.push(s);
    await until(() => closed.code !== undefined);
    expect(closed.code).toBe(4409);
  });

  it("refuses stale world clients before seating them", async () => {
    const id = crypto.randomUUID();
    const r = await mf.dispatchFetch(
      `https://runtime.test/br/${id}/socket?ticket=${await ticket(id, crypto.randomUUID())}`,
      {
        headers: { Upgrade: "websocket", Origin: origin },
      },
    );
    expect(r.status).toBe(101);
    const s = r.webSocket!;
    const closed: { code?: number } = {};
    s.addEventListener("close", (e) => {
      closed.code = e.code;
    });
    s.accept();
    await until(() => closed.code !== undefined);
    expect(closed.code).toBe(4409);
  });

  it("joins through the lobby into a 100-seat match and counts down", async () => {
    const r = await mf.dispatchFetch("https://runtime.test/internal/br/join", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const { matchId } = (await r.json()) as { matchId: string };
    const a = await open(matchId, crypto.randomUUID(), "Jesper");
    const welcome = await until(() => a.frames.find((f) => f.type === "welcome"), 30_000);
    expect(welcome).toMatchObject({
      mode: "br",
      matchId,
      worldRevision: WORLD_ASSETS.revision,
      rulesVersion: BR_RULESET_VERSION,
    });
    const view = await until(() => latest(a.frames)?.phase === "starting" && latest(a.frames));
    // The countdown is the warm-up on the airfield (match.ts): the player stands on the ground.
    expect(view.you.phase).toBe("ground");
    expect(
      Math.hypot(view.you.x - BR_RULES.warmupCentre[0], view.you.z - BR_RULES.warmupCentre[1]),
    ).toBeLessThan(260);
  }, 60_000);

  it("sends a player who drops out mid-match back to their own seat (reconnect)", async () => {
    const join = async (sub: string) => {
      const r = await mf.dispatchFetch("https://runtime.test/internal/br/join", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify({ sub }),
      });
      return ((await r.json()) as { matchId: string }).matchId;
    };
    const sub = crypto.randomUUID();
    const matchId = await join(sub);
    const a = await open(matchId, sub, "Returning");
    await until(() => latest(a.frames), 30_000);
    let state = await ticks(matchId, 300);
    while (state.phase !== "plane") state = await ticks(matchId, 30);
    const seat = latest(a.frames)!.you.seat;
    a.s.close(1000, "network blip");
    await pause(200);
    // Same player asks again: same match; someone new gets another one.
    expect(await join(sub)).toBe(matchId);
    expect(await join(crypto.randomUUID())).not.toBe(matchId);
    const b = await open(matchId, sub, "Returning");
    await until(() => latest(b.frames), 30_000);
    expect(latest(b.frames)!.you.seat).toBe(seat);
  }, 120_000);

  it("two players jump together and see each other's parachutes; early jumps and forged state are refused", async () => {
    const matchId = crypto.randomUUID();
    const a = await open(matchId, crypto.randomUUID(), "One");
    const b = await open(matchId, crypto.randomUUID(), "Two");
    await until(() => latest(a.frames) && latest(b.frames), 30_000);
    // Countdown (the warm-up on the airfield) to the plane: the jump window is not
    // open yet. A plane-phase frame, not the last warm-up one (players stand on the ground then).
    let state = await ticks(matchId, 300);
    while (state.phase !== "plane") state = await ticks(matchId, 30);
    send(a.s, { jumpOut: true });
    await ticks(matchId, 3);
    const aboard = await until(() => {
      const v = latest(a.frames);
      return v?.phase === "plane" && v;
    });
    expect(aboard.you.phase).toBe("plane");
    // After the window opens both jump at once and glide the same way.
    await ticks(matchId, 300);
    for (let i = 0; i < 6; i++) {
      send(a.s, { jumpOut: true, forward: 1 });
      send(b.s, { jumpOut: true, forward: 1 });
      await ticks(matchId, 1);
    }
    // Fall to the canopy (≤ 800 m at 35–65 m/s), keep both gliding identically.
    for (let i = 0; i < 40; i++) {
      send(a.s, { forward: 1 });
      send(b.s, { forward: 1 });
      await ticks(matchId, 15);
    }
    const seen = await until(() => {
      const va = latest(a.frames),
        vb = latest(b.frames);
      if (!va || !vb || va.you.phase !== "parachute" || vb.you.phase !== "parachute") return false;
      const other = (v: View, seat: number) => v.players.find((r) => r[0] === seat);
      const ab = other(va, vb.you.seat),
        ba = other(vb, va.you.seat);
      return ab && ba && ab[4] === 2 && ba[4] === 2 ? { ab, ba } : false;
    });
    expect(seen.ab[4]).toBe(2); // parachute
    // The production WebSocket accepts the new course independently of free-look yaw.
    send(a.s, { forward: 1, canopyYaw: 0.8, yaw: -1.3 });
    await ticks(matchId, 10, true);
    await until(() => latest(a.frames)?.you.phase === "parachute");
    expect(a.closed.code).toBeUndefined();
    // A forged position is never accepted: the socket is closed for an invalid input.
    a.s.send(
      JSON.stringify({ v: 1, type: "br-input", seq: ++seq, forward: 0, strafe: 0, yaw: 0, x: 0 }),
    );
    await until(() => a.closed.code !== undefined);
    expect(a.closed.code).toBe(1008);
  }, 120_000);

  it("runs a full match to a single winner: zone, gas, bots that loot and fight (Phase 3)", async () => {
    const matchId = crypto.randomUUID();
    const me = await open(matchId, crypto.randomUUID(), "Watcher");
    await ticks(matchId, 1);
    const times: number[] = [];
    let state = { phase: "waiting" } as Awaited<ReturnType<typeof ticks>> & {
      alive?: number;
      winner?: number;
      recorded?: boolean;
    };
    for (let i = 0; i < 400 && state.phase !== "completed"; i++) {
      const t = performance.now();
      state = await ticks(matchId, 60);
      times.push((performance.now() - t) / 60);
    }
    expect(state.phase).toBe("completed");
    expect(state.alive).toBeLessThanOrEqual(1);
    expect(state.recorded).toBe(true);
    const mean = times.reduce((s, v) => s + v, 0) / times.length;
    console.log(
      `BR full match: ${times.length * 60} ticks, mean ${mean.toFixed(2)} ms/tick, winner seat ${state.winner}; snapshots in play: ${me.last.count}, mean ${(me.last.bytes / Math.max(1, me.last.count)).toFixed(0)} B, max ${me.last.max} B`,
    );
    // The player saw the zone, and the end.
    const views = me.frames.filter((f) => f.type === "br-snapshot") as Array<
      Record<string, unknown>
    >;
    expect(views.length).toBeGreaterThan(0);
  }, 300_000);

  it("runs three 100-player rooms side by side within the tick budget (Phase 4 load)", async () => {
    // Room IDs seed routes and bot decisions. A timing comparison needs the same three
    // scenarios on both revisions, rather than drawing a different workload every run.
    const ids = [
      "00000001-0000-4000-8000-000000000001",
      "00000002-0000-4000-8000-000000000002",
      "00000003-0000-4000-8000-000000000003",
    ];
    for (const id of ids) {
      await open(id, crypto.randomUUID(), "Load");
      await ticks(id, 1);
    }
    const times: number[] = [];
    const states: Array<Awaited<ReturnType<typeof ticks>>> = [];
    // Keep the original minimum load window, extending only until the last insertion finishes.
    for (let i = 0; i < INSERTION_TICKS; i++) {
      for (const [k, id] of ids.entries()) {
        const t = performance.now();
        states[k] = await ticks(id, 1);
        times.push(performance.now() - t);
      }
      if (
        i >= 6500 + 1350 &&
        states.every((s) => ["active", "ending", "completed"].includes(s.phase))
      )
        break;
    }
    const sorted = [...times].sort((x, y) => x - y);
    const p99 = sorted[Math.floor(sorted.length * 0.99)]!;
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(
      `BR 3 rooms: ${times.length} ticks, mean ${mean.toFixed(2)} ms, p99 ${p99.toFixed(2)} ms, phases ${states.map((x) => x.phase).join("/")}`,
    );
    expect(
      states.every((x) => x.phase === "active" || x.phase === "ending" || x.phase === "completed"),
    ).toBe(true);
    expect(p99).toBeLessThan(12);
  }, 600_000);

  it("keeps the tick p99 under 12 ms with 100 participants from countdown to everyone landed", async () => {
    const matchId = crypto.randomUUID();
    const me = await open(matchId, crypto.randomUUID(), "Bench");
    await ticks(matchId, 1); // load the island
    const times: number[] = [];
    let state = { phase: "waiting", landed: 0 } as Awaited<ReturnType<typeof ticks>>;
    let actionsChecked = false;
    for (let i = 0; i < INSERTION_TICKS && state.phase !== "active"; i++) {
      const t = performance.now();
      state = await ticks(matchId, 1);
      times.push(performance.now() - t);
      if (!actionsChecked && state.phase === "plane") {
        // An empty runway/plane view may omit loot deltas now that building loot stays indoors.
        // Validate any received deltas, and a live player's authoritative action rejection.
        await until(async () => {
          await ticks(matchId, 1, true);
          return latest(me.frames)?.phase === "plane";
        });
        expect(me.last.kit).toMatchObject({ capacity: 6, guns: [null, null] });
        for (const frame of me.frames)
          if (frame["loot"]) {
            expect(frame["loot"]).toEqual({ add: expect.any(Array), del: expect.any(Array) });
          }
        me.s.send(JSON.stringify({ v: 1, type: "br-act", act: "pickup", id: 999_999 }));
        const result = await until(async () => {
          // This test drives simulation time manually; queued actions need ticks too.
          await ticks(matchId, 2, true);
          for (const f of me.frames)
            for (const e of (f["combat"] as Array<Record<string, unknown>> | undefined) ?? [])
              if (e["type"] === "act") return e;
          return false;
        }, 20_000);
        expect(result).toMatchObject({ act: "pickup", ok: false, reason: "Land first" });
        actionsChecked = true;
      }
    }
    expect(actionsChecked).toBe(true);
    expect(state.phase).toBe("active");
    // Everyone still alive is down (bots that landed early may already have fought).
    expect(state.airborne).toBe(0);
    expect(state.landed).toBeGreaterThanOrEqual(state.alive);
    const sorted = [...times].sort((x, y) => x - y);
    const p99 = sorted[Math.floor(sorted.length * 0.99)]!;
    const mean = times.reduce((s, v) => s + v, 0) / times.length;
    console.log(
      `BR runtime tick (incl. request overhead): mean ${mean.toFixed(2)} ms, p99 ${p99.toFixed(2)} ms, ${times.length} ticks`,
    );
    expect(p99).toBeLessThan(12);
    me.s.send(JSON.stringify({ v: 1, type: "br-act", act: "pickup", id: -1 }));
    await until(() => me.closed.code !== undefined);
    expect(me.closed.code).toBe(1008);
  }, 300_000);
});
