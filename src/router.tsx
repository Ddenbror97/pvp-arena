import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Hover/touch preloading of the next page, skipped on Save-Data or slow connections.
function preloadMode(): "intent" | false {
  if (typeof navigator === "undefined") return "intent";
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || /(^|-)2g$|3g/.test(c?.effectiveType ?? "")) return false;
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
  if (typeof window !== "undefined" && mode) {
    const warm = () => {
      for (const path of ["/", "/coinflip", "/roulette", "/fairness", "/auth"]) {
        const r = (router.routesByPath as unknown as Record<string, unknown>)[path];
        if (r) void router.loadRouteChunk(r as never)?.catch(() => {});
      }
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
    // Wait so the current page's own data and images download first, then warm on idle.
    const later = () => setTimeout(() => (idle ? idle(warm, { timeout: 3000 }) : warm()), 4000);
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
  }

  return router;
};
