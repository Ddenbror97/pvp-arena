import "./lib/error-capture";

import { applyWorkerEnv } from "./lib/worker-env";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { httpsRedirect, withSecurityHeaders } from "./lib/security-headers";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const MOVED: Record<string, string> = {
  "/guides/best-crypto-wallet-for-gambling-2026": "/guides/best-crypto-wallet-for-gambling",
};

function movedRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const next = MOVED[url.pathname];
  if (!next) return null;
  url.pathname = next;
  return new Response(null, { status: 301, headers: { location: url.toString() } });
}

async function handle(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  const redirect = httpsRedirect(request) ?? movedRedirect(request);
  if (redirect) return redirect;
  applyWorkerEnv(env);
  applyWorkerEnv(typeof process !== "undefined" ? process.env : undefined);
  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const response = await handle(request, env, ctx);
    // new Response() rejects status 101, so protocol upgrades pass through as-is.
    if (response.status === 101) return response;
    return withSecurityHeaders(request, response);
  },
};
