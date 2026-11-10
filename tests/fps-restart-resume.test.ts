import { afterAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../src/lib/fps/ticket";
import type { MatchState } from "../src/lib/fps/protocol";

/**
 * A duel room that restarts under a live match (a deploy, a platform restart) resumes it: the
 * score stands and the interrupted round is replayed once both players are back (workers/fps/
 * index.ts, simulation.ts resumeMatch). The restart is a second Miniflare over the same
 * persisted Durable Object storage.
 */
const secret = "isolated-restart-test-".repeat(3);
const origin = "https://casino.test";
const A = crypto.randomUUID(),
  B = crypto.randomUUID();
type Socket = NonNullable<Awaited<ReturnType<Miniflare["dispatchFetch"]>>["webSocket"]>;
type Frame = { type: string; settled?: boolean; state: MatchState };
const dir = mkdtempSync(path.join(tmpdir(), "fps-restart-"));
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let script = "";
let mf: Miniflare | undefined;

async function start() {
  script ||= (
    await build({
      entryPoints: ["workers/fps/index.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      target: "es2022",
    })
  ).outputFiles[0]!.text;
  mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script,
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
    // Durable Object storage on disk, so a second instance finds the first one's matches
    // (after the converted options, which carry this key as undefined).
    resourcePersistencePath: dir,
  });
  await mf.ready;
}
async function open(id: string, sub: string) {
  const ticket = await signAdmission(
    {
      v: 2,
      aud: "fps-duel",
      matchId: id,
      sub,
      sessionId: sub,
      authExpiresAt: Date.now() + 3_600_000,
      role: "player",
      nonce: crypto.randomUUID(),
      exp: Date.now() + 60_000,
    },
    secret,
  );
  const response = await mf!.dispatchFetch(
    `https://runtime.test/matches/${id}/socket?ticket=${ticket}`,
    { headers: { Upgrade: "websocket", Origin: origin } },
  );
  if (response.status !== 101)
    throw new Error(`socket ${response.status}: ${await response.text()}`);
  const socket = response.webSocket!;
  socket.accept();
  const frames: Frame[] = [];
  socket.addEventListener("message", (e) => {
    const frame = JSON.parse(String(e.data)) as Frame;
    if (frame.type === "snapshot") frames.push(frame);
  });
  return { socket, frames };
}
async function until(frames: Frame[], predicate: (f: Frame) => boolean, timeout = 15_000) {
  const end = Date.now() + timeout;
  for (;;) {
    const found = frames.findLast(predicate);
    if (found) return found;
    if (Date.now() > end) throw new Error("Timed out waiting for a frame");
    await pause(25);
  }
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

describe("duel room restart", () => {
  afterAll(async () => {
    await mf?.dispose();
    rmSync(dir, { recursive: true, force: true });
  });

  it("resumes a live match: the round is replayed once both players are back", async () => {
    await start();
    const id = crypto.randomUUID();
    const created = await mf!.dispatchFetch(`https://runtime.test/internal/matches/${id}`, {
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
    expect(created.status).toBe(200);
    const a = await open(id, A),
      b = await open(id, B);
    for (const s of [a, b])
      s.socket.send(JSON.stringify({ v: 1, type: "ready", combatVersion: 2 }));
    const spawn = await until(a.frames, (f) => f.state.phase === "live");
    // Player A walks off the spawn; the room checkpoints every two seconds.
    for (let seq = 1; seq <= 90; seq++) {
      a.socket.send(movement(seq));
      await pause(33);
    }
    const before = a.frames.at(-1)!;
    const walked = Math.hypot(
      before.state.players.A.x - spawn.state.players.A.x,
      before.state.players.A.z - spawn.state.players.A.z,
    );
    expect(walked).toBeGreaterThan(2);
    // The room restarts.
    await mf!.dispose();
    await start();
    // One player back: the match is neither cancelled nor running; the countdown is held.
    const a2 = await open(id, A);
    const held = await until(a2.frames, (f) => f.state.phase === "countdown");
    expect(held.state.round).toBe(before.state.round);
    expect(held.state.score).toEqual(before.state.score);
    await pause(4000);
    expect(a2.frames.at(-1)!.state.phase).toBe("countdown");
    // Both back: the round starts again from the spawns, with the score kept.
    const b2 = await open(id, B);
    const resumed = await until(a2.frames, (f) => f.state.phase === "live", 10_000);
    expect(resumed.state.round).toBe(before.state.round);
    expect(resumed.state.score).toEqual(before.state.score);
    expect(resumed.state.players.A.x).toBeCloseTo(spawn.state.players.A.x, 1);
    expect(resumed.state.players.A.z).toBeCloseTo(spawn.state.players.A.z, 1);
    expect(resumed.state.players.A.hp).toBe(100);
    expect(b2.frames.at(-1)!.state.phase).not.toBe("cancelled");
  }, 90_000);
});
