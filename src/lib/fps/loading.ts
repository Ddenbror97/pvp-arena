import loadingImage from "@/assets/fps/arena-loading.webp";

export const STRIKE_LOADING_IMAGE = loadingImage;
export type ArenaLoadProgress = { value: number; label: string };

/** Preparation milestones, not an estimate of download bytes or elapsed time. */
export function matchLoadProgress(visual: number, connected: boolean, snapshot: boolean) {
  return Math.round(
    Math.max(0, Math.min(100, visual)) * 0.9 + (connected ? 5 : 0) + (snapshot ? 5 : 0),
  );
}

/** Shared URL for match-intent preload, document head and the displayed image. */
export function warmStrikeLoadingImage() {
  if (typeof document === "undefined" || document.querySelector("link[data-strike-loading]"))
    return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.type = "image/webp";
  link.href = STRIKE_LOADING_IMAGE;
  link.fetchPriority = "high";
  link.dataset["strikeLoading"] = "";
  document.head.appendChild(link);
}
