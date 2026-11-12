import { describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { BOMB_ROTATION, pickBombMap } from "../src/lib/fps/bomb/maps";
import { signAdmission } from "../src/lib/fps/ticket";

const secret = "isolated-map-startup-".repeat(3);
const origin = "https://casino.test";

it("draws both enabled maps from equal halves of the random range", () => {
  expect(BOMB_ROTATION).toEqual(["sandgate", "iron-district"]);
  expect(pickBombMap(() => 0)).toBe("sandgate");
  expect(pickBombMap(() => 0.499999)).toBe("sandgate");
  expect(pickBombMap(() => 0.5)).toBe("iron-district");
  expect(pickBombMap(() => 1 - Number.EPSILON)).toBe("iron-district");
});

describe.each(["sandgate", "iron-district"] as const)("%s room startup", (map) => {
  it("admits a player, starts simulation and reuses the open room", async () => {
    // Control only the entropy in this isolated Worker bundle. Exercise the real
    // map draw, lobby, admission and simulation, without a production test hook or
    // a probabilistic test that can miss one map after repeated random joins.
    const bundled = await build({
      entryPoints: ["workers/fps/index.ts"],
      bundle: true,
      write: false,
      format: "esm",
      platform: "node",
      target: "es2022",
      define: { "crypto.getRandomValues": "testEntropy" },
      banner: { js: `const testEntropy = a => a.fill(${map === "sandgate" ? 0 : 0xffffffff});` },
    });
    const mf = new Miniflare(
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
          const body = (await request.json()) as {
            p_sessions?: { session_id: string; user_id: string }[];
          };
          return Response.json(
            (body.p_sessions ?? []).map((s) => ({
              sessionId: s.session_id,
              userId: s.user_id,
              active: true,
            })),
          );
        },
      }),
    );
    let socket: WebSocket | undefined;
    try {
      await mf.ready;
      const join = async () => {
        const response = await mf.dispatchFetch("https://runtime.test/internal/bomb/join", {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}` },
        });
        expect(response.status).toBe(200);
        return ((await response.json()) as { matchId: string }).matchId;
      };
      const matchId = await join();
      const user = crypto.randomUUID();
      const ticket = await signAdmission(
        {
          v: 2,
          aud: "fps-bomb",
          matchId,
          sub: user,
          sessionId: user,
          authExpiresAt: Date.now() + 3_600_000,
          role: "player",
          nonce: crypto.randomUUID(),
          exp: Date.now() + 60_000,
          name: "Map tester",
        },
        secret,
      );
      const response = await mf.dispatchFetch(
        `https://runtime.test/bomb/${matchId}/socket?ticket=${ticket}`,
        {
          headers: { Upgrade: "websocket", Origin: origin },
        },
      );
      expect(response.status).toBe(101);
      socket = response.webSocket! as unknown as WebSocket;
      const frames: {
        type: string;
        map?: string;
        mapId?: string;
        serverNow?: number;
        players?: unknown[];
      }[] = [];
      socket.addEventListener("message", (e) => {
        frames.push(JSON.parse(String(e.data)));
      });
      (socket as WebSocket & { accept(): void }).accept();
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && frames.filter((f) => f.type === "bomb-snapshot").length < 3)
        await new Promise((r) => setTimeout(r, 20));
      expect(frames.find((f) => f.type === "welcome")?.map).toBe(map);
      const snapshots = frames.filter((f) => f.type === "bomb-snapshot");
      expect(snapshots.length).toBeGreaterThanOrEqual(3);
      expect(snapshots.every((f) => f.mapId === map && f.players?.length === 10)).toBe(true);
      expect(snapshots.at(-1)!.serverNow).toBeGreaterThan(snapshots[0]!.serverNow!);
      // A second lobby join intentionally returns the occupied open match. It is
      // not another map draw; repeatedly entering this room cannot audit rotation.
      expect(await join()).toBe(matchId);
    } finally {
      socket?.close();
      await mf.dispose();
    }
  }, 30_000);
});
