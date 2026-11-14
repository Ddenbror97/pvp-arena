import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { signAdmission } from "../src/lib/fps/ticket";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";
import { BR_RULESET_VERSION } from "../src/lib/fps/br/ruleset";

// Real workerd admission, WebSockets, timers and persisted Durable Objects. The authority is
// a deterministic fake RPC; its SQL decisions/permissions are tested separately on hosted PG17.
const secret = "isolated-anticheat-lifecycle-".repeat(3);
const origin = "https://casino.test";
type Mode = "duel" | "bomb" | "br";
type Socket = NonNullable<Awaited<ReturnType<Miniflare["dispatchFetch"]>>["webSocket"]>;
let script = "",
  mf: Miniflare | undefined,
  persistence = "";
let restriction: "ban" | "competitive" | null = null;
let shadow = false,
  unavailable = false,
  delay = 0;
const calls: Array<{ rpc: string; scope: unknown }> = [];
const sockets: Socket[] = [];
let duelOpponent = "";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(test: () => boolean, timeout = 22_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (test()) return;
    await pause(25);
  }
  throw new Error("Timed out waiting for anti-cheat lifecycle transition");
}
beforeAll(async () => {
  script = (
    await build({
      entryPoints: ["workers/fps/index.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      target: "es2022",
    })
  ).outputFiles[0]!.text;
});
async function start(enforce = true) {
  persistence ||= mkdtempSync(path.join(tmpdir(), "fps-ac-runtime-"));
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script,
      compatibilityDate: "2026-10-26",
      compatibilityFlags: ["nodejs_compat"],
      resourcePersistencePath: persistence,
      durableObjects: {
        DUELS: { className: "DuelRoom", useSQLite: true },
        BOMB_ROOMS: { className: "BombRoom", useSQLite: true },
        BOMB_LOBBY: { className: "BombLobby", useSQLite: true },
        BR_ROOMS: { className: "BrRoom", useSQLite: true },
        BR_LOBBY: { className: "BrLobby", useSQLite: true },
      },
      bindings: {
        FPS_RUNTIME_SECRET: secret,
        ALLOWED_ORIGIN: origin,
        SUPABASE_URL: "https://db.test",
        SUPABASE_SERVICE_ROLE_KEY: "test-only",
        FPS_SESSION_LEASE_MS: "100",
        ...(enforce ? { FPS_AC_ENFORCE: "1" } : {}),
      },
      outboundService: async (request) => {
        const url = new URL(request.url);
        if (url.origin === origin && url.pathname.startsWith("/fps/br/"))
          return new Response(readFileSync(path.join(path.resolve("public"), url.pathname)));
        const body = (await request.json()) as Record<string, unknown>;
        const rpc = url.pathname.split("/").at(-1)!;
        if (!rpc.startsWith("fps_check_sessions")) return Response.json({ ok: true });
        calls.push({ rpc, scope: body.p_scope });
        if (delay) await pause(delay);
        if (unavailable) return new Response("unavailable", { status: 503 });
        const blocked = rpc.endsWith("_v2") && !shadow && restriction !== null;
        return Response.json(
          (body.p_sessions as Array<{ session_id: string; user_id: string }>).map((s) => ({
            sessionId: s.session_id,
            userId: s.user_id,
            active: !blocked,
            ...(blocked ? { restricted: restriction, until: null } : {}),
          })),
        );
      },
    }),
  );
  await mf.ready;
}
afterEach(async () => {
  for (const s of sockets.splice(0))
    try {
      s.close();
    } catch {
      /* already closed */
    }
  await mf?.dispose();
  mf = undefined;
  if (persistence) {
    expect(path.dirname(path.resolve(persistence))).toBe(path.resolve(tmpdir()));
    expect(path.basename(persistence)).toMatch(/^fps-ac-runtime-/);
    rmSync(persistence, { recursive: true, force: true });
  }
  persistence = "";
  restriction = null;
  shadow = false;
  unavailable = false;
  delay = 0;
  calls.length = 0;
});
async function open(mode: Mode, id: string, user: string) {
  const ticket = await signAdmission(
    {
      v: 2,
      aud: `fps-${mode}`,
      matchId: id,
      sub: user,
      sessionId: user,
      authExpiresAt: Date.now() + 3_600_000,
      role: "player",
      nonce: crypto.randomUUID(),
      exp: Date.now() + 60_000,
      name: "Lifecycle tester",
    },
    secret,
  );
  const prefix = mode === "duel" ? "matches" : mode;
  const extra =
    mode === "br"
      ? `&worldRevision=${WORLD_ASSETS.revision}&rulesVersion=${BR_RULESET_VERSION}`
      : "";
  const response = await mf!.dispatchFetch(
    `https://runtime.test/${prefix}/${id}/socket?ticket=${ticket}${extra}`,
    { headers: { Upgrade: "websocket", Origin: origin } },
  );
  const frames: Array<Record<string, unknown>> = [],
    closed: { code?: number } = {};
  if (response.webSocket) {
    const s = response.webSocket;
    sockets.push(s);
    s.addEventListener("message", (e) => {
      const frame = JSON.parse(String(e.data));
      frames.push(frame);
      if (mode === "duel" && frame.type === "welcome" && s.readyState === 1)
        s.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
      if (frame.type === "ping" && s.readyState === 1)
        s.send(JSON.stringify({ v: 1, type: "pong", id: frame.id }));
    });
    s.addEventListener("close", (e) => {
      closed.code = e.code;
    });
    s.accept();
  }
  return { response, frames, closed, socket: response.webSocket };
}
async function room(mode: Mode, user: string) {
  if (mode === "duel") {
    const id = crypto.randomUUID();
    duelOpponent = crypto.randomUUID();
    const r = await mf!.dispatchFetch(`https://runtime.test/internal/matches/${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        id,
        creator_id: user,
        opponent_id: duelOpponent,
        best_of: 13,
        stake: 0,
        private: false,
        expiresAt: Date.now() + 600_000,
        map_id: "dustfront",
      }),
    });
    expect(r.status).toBe(200);
    return id;
  }
  const r = await mf!.dispatchFetch(`https://runtime.test/internal/${mode}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  expect(r.status).toBe(200);
  return ((await r.json()) as { matchId: string }).matchId;
}
describe("anti-cheat authority across real Worker lifecycles", () => {
  for (const mode of ["duel", "bomb", "br"] as const) {
    it(`${mode}: active session, reconnect, restart, appeal and shadow safety`, async () => {
      await start();
      const user = crypto.randomUUID(),
        id = await room(mode, user);
      const active = await open(mode, id, user);
      expect(active.response.status).toBe(101);
      await until(() => active.frames.some((f) => f.type === "welcome"));
      await until(
        () =>
          active.frames.filter(
            (f) => f.type === "snapshot" || f.type === "br-snapshot" || f.type === "bomb-snapshot",
          ).length >= 2,
      );
      if (mode === "duel") {
        await open(mode, id, duelOpponent);
        await until(() =>
          active.frames.some(
            (f) => f.type === "snapshot" && (f.state as { phase: string }).phase === "live",
          ),
        );
      }
      // The periodic room sweep must remove a newly banned player; it is not just a join gate.
      restriction = "ban";
      await until(() => active.closed.code !== undefined);
      expect(active.closed.code).toBe(4403);
      const reconnect = await open(mode, id, user);
      await until(() => reconnect.closed.code !== undefined);
      expect(reconnect.closed.code).toBe(4403);
      await mf!.dispose();
      mf = undefined;
      await start(); // Same disk-backed DO namespace, new workerd process.
      const restarted = await open(mode, id, user);
      expect(restarted.response.status).toBe(101);
      await until(() => restarted.closed.code !== undefined);
      expect(restarted.closed.code).toBe(4403);
      // An approved appeal removes the authority's restriction; the fresh room must re-read it.
      restriction = null;
      const appealed = await open(mode, id, user);
      expect(appealed.response.status).toBe(101);
      await until(() => appealed.frames.some((f) => f.type === "welcome"));
      restriction = "competitive";
      shadow = true;
      const safe = await open(mode, id, user);
      expect(safe.response.status).toBe(101);
      await until(() => safe.frames.some((f) => f.type === "welcome"));
      expect(safe.closed.code).not.toBe(4403);
      expect(
        calls.every((c) => c.rpc === "fps_check_sessions_v2" && c.scope === "competitive"),
      ).toBe(true);
    }, 90_000);
  }
  it("unset enforcement flag ignores restrictions and uses only the original authority", async () => {
    await start(false);
    restriction = "ban";
    const user = crypto.randomUUID(),
      id = await room("duel", user);
    const result = await open("duel", id, user);
    await until(() => result.frames.some((f) => f.type === "welcome"));
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((c) => c.rpc === "fps_check_sessions" && c.scope === undefined)).toBe(true);
  }, 30_000);
  it("delayed denial still refuses admission; a database outage cannot admit a player", async () => {
    await start();
    const user = crypto.randomUUID(),
      id = await room("duel", user);
    delay = 200;
    restriction = "ban";
    const denied = await open("duel", id, user);
    await until(() => denied.closed.code !== undefined);
    expect(denied.closed.code).toBe(4403);
    unavailable = true;
    restriction = null;
    const outage = await open("duel", id, user);
    expect(outage.response.status).toBe(503);
    unavailable = false;
    const recovered = await open("duel", id, user);
    await until(() => recovered.frames.some((f) => f.type === "welcome"));
  }, 30_000);
});
