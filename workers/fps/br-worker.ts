import { BR_RULESET_VERSION } from "../../src/lib/fps/br/ruleset";
import { routeBr } from "./br-routes";
import { json } from "./room-kit";
import type { Env } from "./index";

/**
 * The battle royale on a Worker of its own (wrangler.br.jsonc, `pvpspinarena-fps-br`). Its
 * rooms then never share an isolate with a 1v1 or 5v5 room: the island's memory (about 100 MB)
 * and its cold start stay away from the cash duel. Same room, lobby and routes as in the
 * combined Worker; the site sends battle royale players here when FPS_BR_RUNTIME_ORIGIN is set.
 */
export { BrLobby, BrRoom } from "./br";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health")
      return json({
        service: "fps-br",
        version: 1,
        brRulesVersion: BR_RULESET_VERSION,
        configured:
          (env.FPS_RUNTIME_SECRET?.length ?? 0) >= 32 &&
          !!env.SUPABASE_URL &&
          !!env.SUPABASE_SERVICE_ROLE_KEY,
      });
    return (await routeBr(request, env, url)) ?? json({ error: "NOT_FOUND" }, 404);
  },
};
