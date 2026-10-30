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
/** Non-walkable upper factory structures still participate in authoritative bullet occlusion. */
export const STRUCTURES: Solid[] = [
  ...[-1, 1].flatMap((side) => [
    {
      id: `upper-deck-${side}`,
      x: side * 14,
      y: 6.25,
      z: 0,
      w: 4,
      h: 0.3,
      d: 33.6,
      surface: "metal" as const,
    },
    {
      id: `upper-fascia-${side}`,
      x: side * 12.3,
      y: 6.95,
      z: 0,
      w: 0.6,
      h: 1.1,
      d: 33.6,
      surface: "metal" as const,
    },
    {
      id: `roof-rail-${side}`,
      x: side * 15.7,
      y: 7.7,
      z: 0,
      w: 0.12,
      h: 0.12,
      d: 33.6,
      surface: "metal" as const,
    },
    ...[-14, -7, 0, 7, 14].map((z) => ({
      id: `deck-post-${side}-${z}`,
      x: side * 15.7,
      y: 7,
      z,
      w: 0.16,
      h: 1.4,
      d: 0.16,
      surface: "metal" as const,
    })),
    {
      id: `end-beam-${side}`,
      x: 0,
      y: 8.2,
      z: side * 16.5,
      w: 24,
      h: 0.35,
      d: 0.4,
      surface: "metal" as const,
    },
    {
      id: `inner-rail-${side}`,
      x: side * 12.3,
      y: 8,
      z: 0,
      w: 0.12,
      h: 0.12,
      d: 33.6,
      surface: "metal" as const,
    },
    ...[-14, -10, -6, -2, 2, 6, 10, 14].map((z) => ({
      id: `inner-post-${side}-${z}`,
      x: side * 12.3,
      y: 7.65,
      z,
      w: 0.12,
      h: 0.7,
      d: 0.12,
      surface: "metal" as const,
    })),
    ...[-1, 1].flatMap((x) => [
      {
        id: `sign-tower-${side}-${x}`,
        x: x * 7,
        y: 5.4,
        z: side * 16.8,
        w: 1.85,
        h: 7.8,
        d: 1,
        surface: "metal" as const,
      },
      {
        id: `floodlight-rig-${side}-${x}`,
        x: x * 7,
        y: 9.5,
        z: side * 16.8,
        w: 2.2,
        h: 0.2,
        d: 0.5,
        surface: "metal" as const,
      },
    ]),
  ]),
];
export const WORLD_SOLIDS: readonly Solid[] = [...BOXES, ...WALLS, ...STRUCTURES, FLOOR];
export const eyeHeight = (player: { crouched?: boolean }) =>
  player.crouched ? CROUCH_EYE_HEIGHT : EYE_HEIGHT;
export const SPAWNS = {
  A: { x: 0, z: 13, yaw: 0 },
  B: { x: 0, z: -13, yaw: Math.PI },
} as const;
