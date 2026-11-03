import sandgateLoading from "@/assets/fps/sandgate-loading.webp";
export const BOMB_LOADING_IMAGE = sandgateLoading;
/** Bomb-mode intent only: never added to the five-map 1v1 preload list. */
export function warmBombLoadingImage() {
  if (typeof document === "undefined" || document.querySelector("link[data-bomb-loading]")) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.type = "image/webp";
  link.href = BOMB_LOADING_IMAGE;
  link.fetchPriority = "high";
  link.dataset["bombLoading"] = "";
  document.head.appendChild(link);
}
