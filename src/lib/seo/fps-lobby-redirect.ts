/** Retire the old lobby URL before SSR, while preserving campaign/search parameters. */
export function fpsLobbyRedirect(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  if (url.pathname !== "/fps-duel" && url.pathname !== "/fps-duel/") return null;
  url.pathname = "/";
  return new Response(null, {
    status: 301,
    headers: { location: url.toString(), "cache-control": "no-store" },
  });
}
