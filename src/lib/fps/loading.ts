import { DEFAULT_LOADING_IMAGE, ROTATION_LOADING_IMAGES } from "./maps/loading-screens";

/** Dustfront's art; the default loading image (see maps/loading-screens.ts for per-map art). */
export const STRIKE_LOADING_IMAGE = DEFAULT_LOADING_IMAGE;
export type ArenaLoadProgress = { value: number; label: string };

/** Preparation milestones, not an estimate of download bytes or elapsed time. */
export function matchLoadProgress(visual: number, connected: boolean, snapshot: boolean) {
  return Math.round(
    Math.max(0, Math.min(100, visual)) * 0.9 + (connected ? 5 : 0) + (snapshot ? 5 : 0),
  );
}

/** Match-intent preload of every rotation map's loading art (the match draws one of them). */
export function warmStrikeLoadingImage() {
  if (typeof document === "undefined" || document.querySelector("link[data-strike-loading]"))
    return;
  for (const href of ROTATION_LOADING_IMAGES) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.type = "image/webp";
    link.href = href;
    link.fetchPriority = "high";
    link.dataset["strikeLoading"] = "";
    document.head.appendChild(link);
  }
}
