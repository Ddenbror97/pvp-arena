import dustfrontLoading from "@/assets/fps/arena-loading.webp";
import crossfireLoading from "@/assets/fps/crossfire-loading.webp";
import frostlineLoading from "@/assets/fps/frostline-loading.webp";
import lostTrailLoading from "@/assets/fps/lost-trail-loading.webp";
import suburbiaLoading from "@/assets/fps/suburbia-loading.webp";
import { ROTATION_MAP_KEYS } from "./ids";

/**
 * Browser-only native-resolution WebP loading art per map in src/assets/fps. Kept out of the
 * shared map definitions so the match Worker never bundles images. A map without its own art
 * uses Dustfront's.
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
/** Every rotation map's art: a new match may be any of them, so all are warmed on intent. */
export const ROTATION_LOADING_IMAGES: readonly string[] = [
  ...new Set(ROTATION_MAP_KEYS.map(loadingImageFor)),
];
