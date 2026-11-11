import dustfrontLoading from "@/assets/fps/arena-loading.webp";
import crossfireLoading from "@/assets/fps/crossfire-loading.webp";
import frostlineLoading from "@/assets/fps/frostline-loading.webp";
import lostTrailLoading from "@/assets/fps/lost-trail-loading.webp";
import suburbiaLoading from "@/assets/fps/suburbia-loading.webp";
import { ROTATION_MAP_KEYS } from "./ids";

/**
 * Browser-only native-resolution WebP loading art per map in src/assets/fps. Kept out of the
 * shared map definitions so the match Worker never bundles images. A map without its own art
 * uses Dustfront's. This module knows no map geometry: the match route's head imports it, and
 * that head is part of the script every page loads.
 */
const LOADING_IMAGES: Readonly<Record<string, string>> = {
  dustfront: dustfrontLoading,
  frostline: frostlineLoading,
  "lost-trail": lostTrailLoading,
  crossfire: crossfireLoading,
  suburbia: suburbiaLoading,
};

export const DEFAULT_LOADING_IMAGE = dustfrontLoading;
export const loadingImageFor = (mapId: string | null | undefined) =>
  (mapId && LOADING_IMAGES[mapId]) || DEFAULT_LOADING_IMAGE;
/**
 * The rotation's art for the match page's preload links, from the id list in ids.ts (the
 * registry's own list is ROTATION_LOADING_IMAGES in loading-screens.ts; a test keeps the two
 * equal).
 */
export const ROTATION_ART_PRELOAD: readonly string[] = [
  ...new Set(ROTATION_MAP_KEYS.map(loadingImageFor)),
];
