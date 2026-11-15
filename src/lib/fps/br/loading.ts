import projectIslandLoading from "@/assets/fps/project-island-loading-v2.webp";

/** Widescreen satellite loading art, preloaded on BR intent and displayed edge to edge. */
export const BR_LOADING_IMAGE = projectIslandLoading;

/** Battle royale intent only (lobby hover, focus or click), as the Bomb mode's loading art. */
export function warmBrLoadingImage() {
  if (typeof document === "undefined" || document.querySelector("link[data-br-loading]")) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.type = "image/webp";
  link.href = BR_LOADING_IMAGE;
  link.fetchPriority = "high";
  link.dataset["brLoading"] = "";
  document.head.appendChild(link);
}
