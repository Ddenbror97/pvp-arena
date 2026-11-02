import dustfrontLoading from "@/assets/fps/arena-loading.webp";
import frostlineLoading from "@/assets/fps/frostline-loading.webp";
import lostTrailLoading from "@/assets/fps/lost-trail-loading.webp";
import { ROTATION_MAP_IDS } from "./registry";

/**
 * Browser-only loading-screen art per map (1672 × 941 WebP in src/assets/fps). Kept out of the
 * shared map definitions so the match Worker never bundles images. A map without its own art
 * uses Dustfront's.
 */
const LOADING_IMAGES: Readonly<Record<string, string>> = {
  dustfront: dustfrontLoading,
  frostline: frostlineLoading,
  "lost-trail": lostTrailLoading,
};

export const DEFAULT_LOADING_IMAGE = dustfrontLoading;
export const loadingImageFor = (mapId: string | null | undefined) =>
  (mapId && LOADING_IMAGES[mapId]) || DEFAULT_LOADING_IMAGE;
/** Every rotation map's art: a new match may be any of them, so all are warmed on intent. */
export const ROTATION_LOADING_IMAGES: readonly string[] = [
  ...new Set(ROTATION_MAP_IDS.map(loadingImageFor)),
];
