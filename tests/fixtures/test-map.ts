import { DUSTFRONT } from "../../src/lib/fps/maps/dustfront";
import type { MapDefinition } from "../../src/lib/fps/maps/types";

/**
 * Test-only map, deliberately unlike Dustfront: 30 × 20 m, spawns at x = ±12, a bulletproof wall
 * on the centre line, a movement-only "gorge" barrier north of it and two pillars south of it.
 * Registered through a mocked or aliased maps/catalog.ts; never shipped.
 */
export const TEST_GRID: MapDefinition = {
  id: "test-grid",
  name: "Test Grid",
  arena: { width: 30, depth: 20 },
  boxes: [
    { id: "test-wall", x: 0, y: 1.5, z: 0, w: 1, h: 3, d: 6, surface: "metal" },
    { id: "test-pillar-w", x: -6, y: 1, z: 6, w: 1, h: 2, d: 1, surface: "wood" },
    { id: "test-pillar-e", x: 6, y: 1, z: 6, w: 1, h: 2, d: 1, surface: "wood" },
    { id: "test-step", x: -9, y: 0.15, z: -3, w: 2, h: 0.3, d: 2, surface: "concrete" },
  ],
  structures: [],
  walls: [],
  barriers: [{ id: "test-gorge", x: 0, y: 3, z: -7, w: 1, h: 6, d: 6, surface: "wood" }],
  floorSurface: "wood",
  spawns: {
    A: { x: -12, z: 0, yaw: -Math.PI / 2 },
    B: { x: 12, z: 0, yaw: Math.PI / 2 },
  },
  bot: {
    openings: {
      center: [
        { x: 8, z: 3.5 },
        { x: 3, z: 4 },
      ],
      north: [
        { x: 8, z: -2 },
        { x: 3, z: -2.5 },
      ],
      south: [
        { x: 8, z: 8 },
        { x: 3, z: 8 },
      ],
    },
    sweep: [{ x: -9, z: 4 }],
    flanks: {
      north: [
        { x: -3, z: -2.5 },
        { x: 3, z: -2.5 },
      ],
      south: [
        { x: -3, z: 8 },
        { x: 3, z: 8 },
      ],
    },
    regroup: [{ x: 5, z: 4 }],
  },
  presentation: { ...DUSTFRONT.presentation, modelUrl: "/fps/models/test-grid.glb" },
};
