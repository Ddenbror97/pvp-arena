/** Box coordinates are centers, dimensions are full extents (Three BoxGeometry). */
import { DEFAULT_MAP } from "./maps/registry";

/**
 * Player dimensions and shared types. Map geometry lives in the registry (maps/registry.ts) and
 * gameplay resolves each match's map from its `mapId`. ARENA, BOXES, WALLS, FLOOR, STRUCTURES,
 * WORLD_SOLIDS and SPAWNS below are the default map (Dustfront), kept for tests and tools; engine
 * code must take the match's GameMap instead.
 */
export const ARENA = DEFAULT_MAP.arena;
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
/** Dustfront (default map) solids: see maps/dustfront.ts. Gameplay code uses the match's map. */
export const BOXES: readonly Solid[] = DEFAULT_MAP.boxes;
/** Dustfront perimeter: bullets only; movement is bounded by the arena rectangle. */
export const WALLS: readonly Solid[] = DEFAULT_MAP.walls;
export const FLOOR: Solid = DEFAULT_MAP.floor;
/** Dustfront bullet-only solids above head height (arch lintels). */
export const STRUCTURES: readonly Solid[] = DEFAULT_MAP.structures;
export const WORLD_SOLIDS: readonly Solid[] = DEFAULT_MAP.worldSolids;
/** Fraction exists only on server-owned rewind poses, never client input. */
export const stanceAmount = (player: { crouched?: boolean; stance?: number }) =>
  Number.isFinite(player.stance)
    ? Math.max(0, Math.min(1, player.stance!))
    : player.crouched
      ? 1
      : 0;
export const eyeHeight = (player: { crouched?: boolean; stance?: number }) => {
  const stance = stanceAmount(player);
  return EYE_HEIGHT * (1 - stance) + CROUCH_EYE_HEIGHT * stance;
};
/** Dustfront spawns on the west (A) and east (B) ends, facing the courtyard. */
export const SPAWNS = DEFAULT_MAP.spawns;
/** Highest riser the player walks up without jumping (stairs are 0.3 m). */
export const STEP_HEIGHT = 0.35;
