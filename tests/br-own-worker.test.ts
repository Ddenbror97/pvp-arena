import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../src/lib/fps/ticket";
import { BR_RULESET_VERSION } from "../src/lib/fps/br/ruleset";
import { WORLD_ASSETS } from "../src/lib/fps/br/world";

/**
 * The battle royale on a Worker of its own (workers/fps/br-worker.ts, wrangler.br.jsonc): only
 * the battle royale's two classes are bound, and a player gets from the lobby into a room that
 * sends snapshots at the configured rate.
 */
const secret = "isolated-br-own-worker-test-".repeat(2);
const origin = "https://casino.test";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
let mf: Miniflare;
let script = "";

describe("Battle royale on its own Worker", () => {
  beforeAll(async () => {
    script = (
      await build({
        entryPoints: ["workers/fps/br-worker.ts"],
        bundle: true,
        write: false,
        format: "esm",
        platform: "node",
        target: "es2022",
      })
    ).outputFiles[0]!.text;
    const publicDir = path.resolve("public");
    mf = new Miniflare(
      convertV4MiniflareOptions({
        modules: true,
        script,
        compatibilityDate: "2026-10-26",
        compatibilityFlags: ["nodejs_compat"],
        durableObjects: {
          BR_ROOMS: { className: "BrRoom", useSQLite: true },
          BR_LOBBY: { className: "BrLobby", useSQLite: true },
        },
        bindings: {
          FPS_RUNTIME_SECRET: secret,
          SUPABASE_URL: "https://db.test",
          SUPABASE_SERVICE_ROLE_KEY: "test-only",
          ALLOWED_ORIGIN: origin,
          BR_SNAPSHOT_HZ: "20",
        },
        outboundService: async (request) => {
          const url = new URL(request.url);
          if (url.origin === origin && url.pathname.startsWith("/fps/br/")) {
            const file = path.join(publicDir, url.pathname);
            if (!file.startsWith(publicDir)) return new Response("no", { status: 404 });
            return new Response(readFileSync(file));
          }
          const body = (await request.json()) as { p_sessions?: unknown };
          return Response.json(
            ((body.p_sessions ?? []) as Array<{ session_id: string; user_id: string }>).map(
              (s) => ({ sessionId: s.session_id, userId: s.user_id, active: true }),
            ),
          );
        },
      }),
    );
    await mf.ready;
  }, 60_000);
  afterAll(async () => {
    await mf?.dispose();
  });

  it("carries the battle royale only", async () => {
    // The duel and the 5v5 rooms are not in this bundle at all.
    expect(script).not.toMatch(/class DuelRoom\b|class BombRoom\b/);
    const health = (await (await mf.dispatchFetch("https://br.test/health")).json()) as {
      service: string;
      brRulesVersion: number;
      configured: boolean;
    };
    expect(health).toMatchObject({
      service: "fps-br",
      brRulesVersion: BR_RULESET_VERSION,
      configured: true,
    });
    const duel = await mf.dispatchFetch(`https://br.test/matches/${crypto.randomUUID()}/socket`);
    expect(duel.status).toBe(404);
    const denied = await mf.dispatchFetch("https://br.test/internal/br/join", { method: "POST" });
    expect(denied.status).toBe(403);
  });

  it("admits a player through its lobby and sends snapshots at the configured rate", async () => {
    const sub = crypto.randomUUID();
    const joined = await mf.dispatchFetch("https://br.test/internal/br/join", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ sub }),
    });
    expect(joined.status).toBe(200);
    const { matchId } = (await joined.json()) as { matchId: string };
    const ticket = await signAdmission(
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
        name: "Tester",
      },
      secret,
    );
    const response = await mf.dispatchFetch(
      `https://br.test/br/${matchId}/socket?worldRevision=${WORLD_ASSETS.revision}&rulesVersion=${BR_RULESET_VERSION}&ticket=${ticket}`,
      { headers: { Upgrade: "websocket", Origin: origin } },
    );
    expect(response.status).toBe(101);
    const socket = response.webSocket!;
    const types: string[] = [];
    const snapshots: number[] = [];
    socket.addEventListener("message", (e: { data: unknown }) => {
      const frame = JSON.parse(String(e.data)) as { type: string; id?: string };
      types.push(frame.type);
      if (frame.type === "br-snapshot") snapshots.push(Date.now());
      if (frame.type === "ping") socket.send(JSON.stringify({ v: 1, type: "pong", id: frame.id }));
    });
    socket.accept();
    const start = Date.now();
    while (snapshots.length < 5 && Date.now() - start < 60_000) await pause(50);
    expect(types).toContain("welcome");
    expect(snapshots.length).toBeGreaterThanOrEqual(5);
    // Three seconds of the running room: 20 a second, give or take the machine.
    const from = snapshots.length,
      t0 = Date.now();
    await pause(3000);
    const perSecond = ((snapshots.length - from) * 1000) / (Date.now() - t0);
    expect(perSecond).toBeGreaterThan(16.5);
    expect(perSecond).toBeLessThan(23);
    // A returning player is sent back to the same match.
    const again = await mf.dispatchFetch("https://br.test/internal/br/join", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ sub }),
    });
    expect(((await again.json()) as { matchId: string }).matchId).toBe(matchId);
    socket.close();
  }, 120_000);
});
