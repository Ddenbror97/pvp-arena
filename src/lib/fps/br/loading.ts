import projectIslandLoading from "@/assets/fps/project-island-loading.webp";

/** Project Island's loading art: the owner's labelled island map (2026-11-13), shown whole (br.css). */
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
