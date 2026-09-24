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

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPreload: preloadMode(),
    defaultPreloadDelay: 80,
  });

  return router;
};
