import {
  LOST_TRAIL_BARRIERS,
  LOST_TRAIL_BOXES,
  LOST_TRAIL_SIZE,
  LOST_TRAIL_SPAWNS,
  LOST_TRAIL_STRUCTURES,
  LOST_TRAIL_WALLS,
} from "../lost-trail-layout";
import type { MapDefinition } from "./types";

/**
 * LOST TRAIL — jungle 1v1 aim arena (44 × 36 m): a forgotten supply trail where a river gorge is
 * crossed by a wooden bridge (centre), a log crossing below the ridge post (north) and a ford on
 * the lower river trail (south). Gameplay solids: art/blender/lost-trail/layout.py →
 * lost-trail-layout.ts; render scene: art/blender/lost-trail → public/fps/models/lost-trail.glb.
 */
export const LOST_TRAIL: MapDefinition = {
  id: "lost-trail",
  name: "Lost Trail",
  // Out of the random rotation until the jungle art and in-browser validation are accepted.
  rotation: false,
  arena: LOST_TRAIL_SIZE,
  boxes: LOST_TRAIL_BOXES,
  structures: LOST_TRAIL_STRUCTURES,
  walls: LOST_TRAIL_WALLS,
  barriers: LOST_TRAIL_BARRIERS,
  floorSurface: "concrete",
  spawns: LOST_TRAIL_SPAWNS,
  // East-spawn coordinates (mirrored for a west spawn). The bot walks the ground routes: the
  // bridge, the north log crossing and the ford; it never climbs onto the ridge.
  bot: {
    openings: {
      center: [
        { x: 16.8, z: 4.3 },
        { x: 9.5, z: 0 },
        { x: 3.4, z: 1.15 },
        { x: -3.4, z: 1.15 },
        { x: -9.5, z: 0 },
      ],
      north: [
        { x: 16.8, z: -4.3 },
        { x: 6.5, z: -6 },
        { x: 5, z: -13.9 },
        { x: -5, z: -13.9 },
        { x: -6.5, z: -6 },
      ],
      south: [
        { x: 16.8, z: 4.3 },
        { x: 16.6, z: 12.4 },
        { x: 8.3, z: 10.3 },
        { x: 0, z: 10.3 },
        { x: -8.3, z: 10.3 },
      ],
    },
    sweep: [
      { x: -16.8, z: -4.3 },
      { x: -19.5, z: 1.5 },
    ],
    flanks: {
      north: [
        { x: -6.5, z: -6 },
        { x: -5, z: -13.9 },
        { x: 5, z: -13.9 },
      ],
      south: [
        { x: -8.3, z: 10.3 },
        { x: 0, z: 10.3 },
        { x: 8.3, z: 10.3 },
      ],
    },
    regroup: [{ x: 9.5, z: 0 }],
  },
  presentation: {
    modelUrl: "/fps/models/lost-trail.glb",
    // Humid rainforest: warm sun through the canopy, cool green-grey shade and a light haze that
    // starts beyond duel range so opponents stay crisp.
    lighting: {
      background: 0x7d9686,
      fog: { color: 0x8aa093, near: 30, far: 150 },
      // Strong sky fill: the canopy shades most of the floor, and shaded opponents must read.
      hemisphere: { sky: 0xd2e4d6, ground: 0x5a4a34, intensity: 1.9 },
      sun: { color: 0xffe2b8, intensity: 3.1, position: [18, 26, -14] },
      environmentIntensity: 0.35,
      exposure: 1.18,
    },
    sky: { zenith: 0x7fa6c9, horizon: 0xb9c9bd, haze: 0xc8cdb2 },
    // Static shadow map over the 44 × 36 m playable area (2048 texels over ±30 m, ~2.9 cm each).
    shadow: { extent: 30, far: 90, mapSize: 2048 },
    viewDistance: 220,
    blockout: { concrete: 0x8a8a7a, metal: 0x6c7470, wood: 0x6b5236, floor: 0x4f5a3a },
  },
};
