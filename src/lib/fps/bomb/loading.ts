import sandgateLoading from "@/assets/fps/sandgate-loading.webp";
import ironDistrictLoading from "@/assets/fps/iron-district-loading.webp";
import type { BombMapId } from "./maps";
/** Loading art per 5v5 map (the match's map is known from the room's welcome). */
export const BOMB_LOADING_IMAGES: Readonly<Record<BombMapId, string>> = {
  sandgate: sandgateLoading,
  "iron-district": ironDistrictLoading,
};
/**
 * Shown before the room has said which map the match plays: none (owner, 2026-11-13: "the
 * random map selecter for 5v5 … shows first wrong map then switch" — it was Sandgate's art,
 * whichever map the room drew).
 */
export const BOMB_LOADING_IMAGE: string | null = null;
/**
 * Bomb-mode intent only: never added to the five-map 1v1 preload list. The map is drawn by the room,
 * so the lobby warms every 5v5 map's art; the page warms the drawn one again (a no-op when cached).
 */
export function warmBombLoadingImage() {
  for (const href of Object.values(BOMB_LOADING_IMAGES)) warmBombMapImage(href);
}
export function warmBombMapImage(href: string) {
  if (
    typeof document === "undefined" ||
    document.querySelector(`link[data-bomb-loading="${href}"]`)
  )
    return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.type = "image/webp";
  link.href = href;
  link.fetchPriority = "high";
  link.dataset["bombLoading"] = href;
  document.head.appendChild(link);
}
