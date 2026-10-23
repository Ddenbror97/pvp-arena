import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { prefetchGamePage } from "@/lib/first-paint";
import { warmSlotStage } from "@/lib/slott/stage";
import { routeTree } from "./routeTree.gen";

// Hover/touch preloading of the next page, skipped on Save-Data or 2G. Route code is small and is
// what makes a click instant; `downlink` estimates read low on healthy 4G, so they are not a gate.
function preloadMode(): "intent" | false {
  if (typeof navigator === "undefined") return "intent";
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  if (c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? "")) return false;
  return "intent";
}

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

  // After the first page is idle, fetch only the code (no data) for the menu pages
  // so the first click never waits on a chunk download.
  if (typeof window !== "undefined") {
    // Start the reel backdrop now. Waiting for the slot route chunk leaves a hole
    // on the first paint after a client navigation.
    warmSlotStage();
  }

  if (typeof window !== "undefined" && mode) {
    const warm = () => {
      for (const path of [
        "/",
        "/coinflip",
        "/roulette",
        "/slott",
        "/slott/$gameId",
        "/poker",
        "/poker/$tableId",
        "/8-ball-pool",
        "/pool",
        "/pool/$matchId",
        "/fairness",
        "/leaderboards",
        "/leaderboards/$campaignId",
        "/auth",
        "/profile",
        "/wallet",
      ]) {
        const r = (router.routesByPath as unknown as Record<string, unknown>)[path];
        if (r) void router.loadRouteChunk(r as never)?.catch(() => {});
      }
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
