/** Box coordinates are centers, dimensions are full extents (Three BoxGeometry). */
import {
  ARENA_LAYOUT_SIZE,
  LAYOUT_BOXES,
  LAYOUT_SPAWNS,
  LAYOUT_STRUCTURES,
  LAYOUT_WALLS,
} from "./arena-layout";

export const ARENA = ARENA_LAYOUT_SIZE;
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
/**
 * PVPSPINARENA 1v1 aim arena (40 × 32 m). Generated gameplay solids live in arena-layout.ts
 * (source: art/blender/map/layout.py); the Blender-built render meshes dress exactly these boxes.
 * The previous Foundry map is tagged `fps-map-foundry-rollback` for rollback.
 */
export const BOXES: readonly Solid[] = LAYOUT_BOXES;
/** Perimeter: bullets only; movement is bounded by the arena rectangle. */
export const WALLS: readonly Solid[] = LAYOUT_WALLS;
export const FLOOR: Solid = {
  id: "floor",
  x: 0,
  y: -0.2,
  z: 0,
  w: ARENA.width,
  h: 0.4,
  d: ARENA.depth,
  surface: "concrete",
};
/** Bullet-only solids above head height (arch lintels); never block movement or the bot grid. */
export const STRUCTURES: readonly Solid[] = LAYOUT_STRUCTURES;
export const WORLD_SOLIDS: readonly Solid[] = [...BOXES, ...WALLS, ...STRUCTURES, FLOOR];
export const eyeHeight = (player: { crouched?: boolean }) =>
  player.crouched ? CROUCH_EYE_HEIGHT : EYE_HEIGHT;
/** Opposing spawns on the west (A) and east (B) ends, facing the courtyard. */
export const SPAWNS = LAYOUT_SPAWNS;
/** Highest riser the player walks up without jumping (stairs are 0.3 m). */
export const STEP_HEIGHT = 0.35;
