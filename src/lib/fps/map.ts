/** Box coordinates are centers, dimensions are full extents (Three BoxGeometry). */
export const ARENA = { width: 24, depth: 32 } as const;
export const PLAYER_RADIUS = 0.35;
export const EYE_HEIGHT = 1.6;
export const BOXES = [
  { x: -5, y: 1.5, z: 0, w: 3, h: 3, d: 6 },
  { x: 5, y: 1.5, z: 0, w: 3, h: 3, d: 6 },
  { x: 0, y: 1, z: -5, w: 3, h: 2, d: 2 },
  { x: 0, y: 1, z: 5, w: 3, h: 2, d: 2 },
] as const;
export const SPAWNS = {
  A: { x: 0, z: 13, yaw: 0 },
  B: { x: 0, z: -13, yaw: Math.PI },
} as const;
