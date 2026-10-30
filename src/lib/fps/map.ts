/** Box coordinates are centers, dimensions are full extents (Three BoxGeometry). */
export const ARENA = { width: 24, depth: 32 } as const;
export const PLAYER_RADIUS = 0.35;
export const EYE_HEIGHT = 1.6;
export const CROUCH_EYE_HEIGHT = 0.95;
export type Surface = "concrete" | "metal" | "wood";
export type Solid = {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  surface: Surface;
};
export const BOXES = [
  ...[-1, 1].map((side) => ({
    id: `container-${side}`,
    x: side * 5,
    y: 1.5,
    z: 0,
    w: 3,
    h: 3,
    d: 6,
    surface: "metal" as const,
  })),
  ...[-1, 1].map((side) => ({
    id: `blast-wall-${side}`,
    x: 0,
    y: 1,
    z: side * 5,
    w: 3,
    h: 2,
    d: 2,
    surface: "concrete" as const,
  })),
  ...[-1, 1].flatMap((x) =>
    [-1, 1].map((z) => ({
      id: `crate-${x}-${z}`,
      x: x * 7,
      y: 0.725,
      z: z * 9,
      w: 2,
      h: 1.45,
      d: 2,
      surface: "wood" as const,
    })),
  ),
  ...[-1, 1].flatMap((x) =>
    [-1, 1].map((z) => ({
      id: `barrier-${x}-${z}`,
      x: x * 2.6,
      y: 0.625,
      z: z * 1.8,
      w: 2.2,
      h: 1.25,
      d: 0.8,
      surface: "concrete" as const,
    })),
  ),
  ...[-1, 1].flatMap((x) =>
    [-1, 1].map((z) => ({
      id: `low-crate-${x}-${z}`,
      x: x * 8,
      y: 0.325,
      z: z * 5.5,
      w: 1,
      h: 0.65,
      d: 1,
      surface: "wood" as const,
    })),
  ),
] satisfies Solid[];
export const WALLS: Solid[] = [
  ...[-1, 1].map((s) => ({
    id: `wall-x-${s}`,
    x: s * 12.4,
    y: 3.2,
    z: 0,
    w: 0.8,
    h: 6.4,
    d: 33.6,
    surface: "concrete" as const,
  })),
  ...[-1, 1].map((s) => ({
    id: `wall-z-${s}`,
    x: 0,
    y: 3.2,
    z: s * 16.4,
    w: 24,
    h: 6.4,
    d: 0.8,
    surface: "concrete" as const,
  })),
];
export const FLOOR: Solid = {
  id: "floor",
  x: 0,
  y: -0.2,
  z: 0,
  w: 24,
  h: 0.4,
  d: 32,
  surface: "concrete",
};
export const WORLD_SOLIDS: readonly Solid[] = [...BOXES, ...WALLS, FLOOR];
export const eyeHeight = (player: { crouched?: boolean }) =>
  player.crouched ? CROUCH_EYE_HEIGHT : EYE_HEIGHT;
export const SPAWNS = {
  A: { x: 0, z: 13, yaw: 0 },
  B: { x: 0, z: -13, yaw: Math.PI },
} as const;
