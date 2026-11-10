import { authorized, json } from "./room-kit";
import type { Env } from "./index";

/**
 * The battle royale's routes: the lobby join, the room socket and the test-only tick hook.
 * Shared by the combined Worker (index.ts) and the battle royale's own Worker (br-worker.ts),
 * so both serve exactly the same thing. Null when the path is not the battle royale's.
 */
export type BrEnv = Pick<
  Env,
  "BR_ROOMS" | "BR_LOBBY" | "FPS_RUNTIME_SECRET" | "ALLOWED_ORIGIN" | "FPS_ROOM_REGION"
>;

export async function routeBr(request: Request, env: BrEnv, url: URL): Promise<Response | null> {
  // The app asks the lobby for a match, then the player connects to its room.
  if (url.pathname === "/internal/br/join") {
    if (!(await authorized(request, env.FPS_RUNTIME_SECRET)))
      return json({ error: "FORBIDDEN" }, 403);
    // The player's id (optional): returning players go back to their own running match.
    const body = (await request.json().catch(() => null)) as { sub?: unknown } | null;
    return env.BR_LOBBY.get(env.BR_LOBBY.idFromName("lobby")).fetch(
      new Request("https://lobby/join", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.FPS_RUNTIME_SECRET}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sub: typeof body?.sub === "string" ? body.sub.slice(0, 64) : null,
        }),
      }),
    );
  }
  const hook = /^\/internal\/br\/([a-f0-9-]{36})\/tick$/.exec(url.pathname);
  if (hook) return env.BR_ROOMS.get(env.BR_ROOMS.idFromName(hook[1]!)).fetch(request);
  const room = /^\/br\/([a-f0-9-]{36})\/socket$/.exec(url.pathname);
  if (!room) return null;
  if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
    return json({ error: "UPGRADE_REQUIRED" }, 426);
  if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN)
    return json({ error: "ORIGIN_DENIED" }, 403);
  return env.BR_ROOMS.get(
    env.BR_ROOMS.idFromName(room[1]!),
    env.FPS_ROOM_REGION ? { locationHint: env.FPS_ROOM_REGION } : undefined,
  ).fetch(request);
}
