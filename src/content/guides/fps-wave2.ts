import { WAVE2_BROWSER_GUIDES } from "./fps-wave2-browser";
import { WAVE2_ALTERNATIVES_GUIDES } from "./fps-wave2-alternatives";
import { WAVE2_CRYPTO_GUIDES } from "./fps-wave2-crypto";
import { WAVE2_HARDWARE_GUIDES } from "./fps-wave2-hardware";
import { WAVE2_WEAPONS_GUIDES } from "./fps-wave2-weapons";
import { WAVE2_MAPS_TECH_GUIDES } from "./fps-wave2-maps_tech";
import type { Guide } from "./types";

/** Complete reviewed Wave 2 batch. Publication is controlled by GUIDES. */
export const FPS_WAVE2_GUIDES: Guide[] = [
  ...WAVE2_BROWSER_GUIDES,
  ...WAVE2_ALTERNATIVES_GUIDES,
  ...WAVE2_CRYPTO_GUIDES,
  ...WAVE2_HARDWARE_GUIDES,
  ...WAVE2_WEAPONS_GUIDES,
  ...WAVE2_MAPS_TECH_GUIDES,
];
