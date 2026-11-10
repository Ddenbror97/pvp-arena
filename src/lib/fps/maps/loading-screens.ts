import { loadingImageFor } from "./loading-art";
import { ROTATION_MAP_IDS } from "./registry";

export { DEFAULT_LOADING_IMAGE, loadingImageFor } from "./loading-art";
/** Every rotation map's art: a new match may be any of them, so all are warmed on intent. */
export const ROTATION_LOADING_IMAGES: readonly string[] = [
  ...new Set(ROTATION_MAP_IDS.map(loadingImageFor)),
];
