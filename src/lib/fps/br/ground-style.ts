/** Shared by the ground shader and the offline aerial-surface bake. */
export const GROUND_LAYERS = [
  "grass",
  "moss",
  "straw",
  "soil",
  "forest",
  "sand",
  "mud",
  "rock",
  "gravel",
  "concrete",
  "tiles",
  "asphalt",
  "snow",
] as const;
export const LAYER_TARGET: Record<(typeof GROUND_LAYERS)[number], [number, number, number]> = {
  grass: [0.19, 0.26, 0.12],
  moss: [0.15, 0.21, 0.1],
  straw: [0.34, 0.34, 0.19],
  soil: [0.36, 0.29, 0.19],
  forest: [0.14, 0.18, 0.1],
  sand: [0.48, 0.43, 0.31],
  mud: [0.36, 0.32, 0.24],
  rock: [0.33, 0.31, 0.29],
  gravel: [0.37, 0.34, 0.31],
  concrete: [0.36, 0.35, 0.33],
  tiles: [0.4, 0.4, 0.39],
  asphalt: [0.3, 0.29, 0.28],
  snow: [0.86, 0.87, 0.88],
};
/** How far each texture is pulled toward its palette colour (0: as downloaded). */
export const PALETTE_PULL = 0.75;
