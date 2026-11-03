import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signAdmission } from "../src/lib/fps/ticket";

/** The Practice Bomb Defusal lobby and rooms on the real Worker bundle (Miniflare). */
const secret = "isolated-bomb-runtime-test-".repeat(3);
const origin = "https://casino.test";
let mf: Miniflare;
type Socket = NonNullable<Awaited<ReturnType<Miniflare["dispatchFetch"]>>["webSocket"]>;
const sockets: Socket[] = [];
const revoked = new Set<string>();
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ticket(
  matchId: string,
  sub: string,
  aud: "fps-bomb" | "fps-duel" = "fps-bomb",
  name = "Tester",
) {
  return signAdmission(
    {
      v: 2,
      aud,
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
async function join(exclude: string[] = []) {
  const r = await mf.dispatchFetch(
    `https://runtime.test/internal/bomb/join?exclude=${exclude.join(",")}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    },
  );
  expect(r.status).toBe(200);
  return ((await r.json()) as { matchId: string }).matchId;
}
async function connect(matchId: string, t: string, requestOrigin = origin) {
  return mf.dispatchFetch(`https://runtime.test/bomb/${matchId}/socket?ticket=${t}`, {
    headers: { Upgrade: "websocket", Origin: requestOrigin },
  });
}
type Frame = Record<string, unknown> & { type: string };
async function open(matchId: string, sub: string, name = "Tester") {
  const r = await connect(matchId, await ticket(matchId, sub, "fps-bomb", name));
  expect(r.status).toBe(101);
  const s = r.webSocket!;
  const frames: Frame[] = [];
  s.addEventListener("message", (e: { data: unknown }) => frames.push(JSON.parse(String(e.data))));
  s.accept();
  sockets.push(s);
  return { s, frames };
}
async function until(frames: Frame[], pred: (f: Frame) => boolean, timeout = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const f = frames.find(pred);
    if (f) return f;
    await pause(20);
  }
  throw Error("Timed out waiting for a frame");
}

describe("Practice Bomb Defusal runtime", () => {
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
        durableObjects: {
          DUELS: { className: "DuelRoom", useSQLite: true },
          BOMB_ROOMS: { className: "BombRoom", useSQLite: true },
          BOMB_LOBBY: { className: "BombLobby", useSQLite: true },
        },
        bindings: {
          FPS_RUNTIME_SECRET: secret,
          SUPABASE_URL: "https://db.test",
          SUPABASE_SERVICE_ROLE_KEY: "test-only",
          ALLOWED_ORIGIN: origin,
        },
        outboundService: async (request) => {
          const body = (await request.json()) as Record<string, unknown>;
          const requested = (body["p_sessions"] ?? []) as Array<{
            session_id: string;
            user_id: string;
          }>;
          return Response.json(
            requested.map((s) => ({
              sessionId: s.session_id,
              userId: s.user_id,
              active: !revoked.has(s.session_id),
            })),
          );
        },
      }),
    );
    await mf.ready;
  }, 30_000);
  afterAll(async () => {
    for (const s of sockets)
      try {
        s.close();
      } catch {
        /* already closed */
      }
    await mf?.dispose();
  });

  it("a player joins through the lobby, takes a bot's slot and receives their own filtered view", async () => {
    const matchId = await join();
    const a = await open(matchId, crypto.randomUUID(), "Jesper");
    const welcome = await until(a.frames, (f) => f.type === "welcome");
    expect(welcome).toMatchObject({ mode: "bomb", matchId, map: "sandgate" });
    const view = (await until(a.frames, (f) => f.type === "bomb-snapshot")) as Frame & {
      you: number;
      players: Array<{ slot: number; name: string; bot: boolean; team: string }>;
      phase: string;
    };
    expect(view.phase).toBe("freeze");
    const me = view.players[view.you]!;
    expect(me).toMatchObject({ name: "Jesper", bot: false });
    // The other nine positions are bots.
    expect(view.players.filter((p) => p.bot)).toHaveLength(9);
  });

  it("players alternate teams as they join, and a leaving player's slot goes back to a bot", async () => {
    const matchId = crypto.randomUUID(); // a fresh room (the lobby would fill earlier tests' rooms)
    const users = [crypto.randomUUID(), crypto.randomUUID()];
    const a = await open(matchId, users[0]!, "One");
    const b = await open(matchId, users[1]!, "Two");
    const va = (await until(a.frames, (f) => f.type === "bomb-snapshot")) as Frame & {
      you: number;
      players: Array<{ team: string; bot: boolean }>;
    };
    const vb = (await until(b.frames, (f) => f.type === "bomb-snapshot")) as Frame & {
      you: number;
      players: Array<{ team: string; bot: boolean }>;
    };
    expect(va.players[va.you]!.team).not.toBe(vb.players[vb.you]!.team);
    b.s.close();
    await pause(300);
    const later = (await until(
      a.frames,
      (f) =>
        f.type === "bomb-snapshot" &&
        (f as unknown as { players: Array<{ bot: boolean }> }).players.filter((p) => p.bot)
          .length === 9,
    )) as Frame & { players: Array<{ bot: boolean }> };
    expect(later.players.filter((p) => !p.bot)).toHaveLength(1);
  });

  it("rejects 1v1 tickets, other origins and replayed tickets", async () => {
    const matchId = await join();
    const sub = crypto.randomUUID();
    expect((await connect(matchId, await ticket(matchId, sub, "fps-duel"))).status).toBe(403);
    expect((await connect(matchId, await ticket(matchId, sub), "https://evil.test")).status).toBe(
      403,
    );
    const t = await ticket(matchId, sub);
    const first = await connect(matchId, t);
    expect(first.status).toBe(101);
    first.webSocket!.accept();
    sockets.push(first.webSocket!);
    expect((await connect(matchId, t)).status).toBe(403);
  });

  it("a full room (10 humans) sends the next player to a new, independent match", async () => {
    const matchId = crypto.randomUUID();
    const players = [];
    for (let i = 0; i < 10; i++) players.push(await open(matchId, crypto.randomUUID(), `P${i}`));
    const last = (await until(players[9]!.frames, (f) => f.type === "bomb-snapshot")) as Frame & {
      players: Array<{ bot: boolean }>;
    };
    expect(last.players.filter((p) => !p.bot)).toHaveLength(10);
    // The eleventh is refused by the room itself...
    expect((await connect(matchId, await ticket(matchId, crypto.randomUUID()))).status).toBe(409);
    // ...and the lobby (told by the room) routes new joins elsewhere.
    await pause(300);
    const next = await join();
    expect(next).not.toBe(matchId);
    const other = await open(next, crypto.randomUUID());
    const v = (await until(other.frames, (f) => f.type === "bomb-snapshot")) as Frame & {
      players: Array<{ bot: boolean }>;
    };
    // A different match with a free slot for them (possibly an earlier test's open room).
    expect(
      (v as unknown as { you: number; players: Array<{ bot: boolean }> }).players[
        (v as unknown as { you: number }).you
      ]!.bot,
    ).toBe(false);
  }, 30_000);
});
