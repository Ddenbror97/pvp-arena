import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { prefetchGamePage } from "@/lib/first-paint";
import { warmStrikeShowcase } from "@/lib/fps/showcase";
import { warmScope } from "@/lib/warm-policy";
import { routeTree } from "./routeTree.gen";

// Hover/touch preloading of the next page, skipped on Save-Data or 2G. Route code is small and is
// what makes a click instant; `downlink` estimates read low on healthy 4G, so they are not a gate.
function preloadMode(): "intent" | false {
  if (typeof navigator === "undefined") return "intent";
  const c = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? "")) return false;
  return "intent";
}

/** Pages the header and tab bar link to: their code is warmed on every page but a match. */
const ONE_CLICK_AWAY = [
  "/",
  "/coinflip",
  "/roulette",
  "/slott",
  "/poker",
  "/8-ball-pool",
  "/fps-duel",
  "/fairness",
  "/leaderboards",
  "/auth",
  "/profile",
  "/wallet",
];
/**
 * A table, a match, a campaign. These start fetching their art as soon as their code loads
 * (the pool table, the poker room), so only a lobby warms them.
 */
const BEHIND_A_LOBBY = [
  "/slott/$gameId",
  "/poker/$tableId",
  "/pool",
  "/pool/$matchId",
  "/leaderboards/$campaignId",
];

export const getRouter = () => {
  const queryClient = new QueryClient();

  const mode = preloadMode();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPreload: mode,
    defaultPreloadDelay: 30,
  });

  // After the first page is idle, warm what the next click needs. How much depends on the page
  // the visitor is on by then (warm-policy.ts): everything on a lobby, only route code on a
  // reading page, nothing during a match.
  if (typeof window !== "undefined" && mode) {
    const warm = () => {
      const scope = warmScope(window.location.pathname);
      if (scope === "none") return;
      const pages = scope === "all" ? [...ONE_CLICK_AWAY, ...BEHIND_A_LOBBY] : ONE_CLICK_AWAY;
      for (const path of pages) {
        const r = (router.routesByPath as unknown as Record<string, unknown>)[path];
        if (r) void router.loadRouteChunk(r as never)?.catch(() => {});
      }
      if (scope !== "all") return;
      warmStrikeShowcase();
      void import("@/lib/leaderboard/paint").then((m) => m.prefetchPublicList(queryClient));
      prefetchGamePage(queryClient, "/");
      prefetchGamePage(queryClient, "/coinflip");
      prefetchGamePage(queryClient, "/roulette");
      prefetchGamePage(queryClient, "/slott");
      prefetchGamePage(queryClient, "/poker");
      prefetchGamePage(queryClient, "/8-ball-pool");
    };
    const idle = (
      window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }
    ).requestIdleCallback;
    // Wait so the current page's own data and images download first, then warm on idle.
    const later = () => setTimeout(() => (idle ? idle(warm, { timeout: 3000 }) : warm()), 4000);
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
  }

  return router;
};
