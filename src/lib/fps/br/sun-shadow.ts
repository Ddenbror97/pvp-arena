/**
 * Where the island's sun is (one definition: sun.ts draws it, the server needs it without
 * three.js), and where a standing thing's shadow falls: along the ground away from the sun,
 * `perMetre` metres of shadow for each metre of height (the wallhack canaries keep a shadow
 * out of sight as well as the body that casts it: canary.ts).
 */
export const BR_SUN = {
  /** Compass bearing of the sun (degrees from +z towards +x) and its height over the horizon
   * (degrees). The island's light has always come from here ((-0.55, 0.62, 0.45)). */
  azimuth: -50.71,
  elevation: 41.1,
} as const;

const az = (BR_SUN.azimuth * Math.PI) / 180,
  el = (BR_SUN.elevation * Math.PI) / 180;

/** Unit horizontal direction a shadow falls (away from the sun), and its length per metre. */
export const BR_SUN_SHADOW = {
  x: -Math.sin(az),
  z: -Math.cos(az),
  perMetre: 1 / Math.tan(el),
} as const;
