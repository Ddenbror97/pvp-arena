import { describe, expect, it } from "vitest";
import {
  ARENA_LAYOUT_SIZE,
  LAYOUT_BOXES,
  LAYOUT_SPAWNS,
  LAYOUT_STRUCTURES,
  LAYOUT_WALLS,
} from "../src/lib/fps/arena-layout";
import { ARENA_LIGHTING } from "../src/lib/fps/arena-lighting";
import { ARENA, BOXES, FLOOR, SPAWNS, STRUCTURES, WALLS, WORLD_SOLIDS } from "../src/lib/fps/map";
import { DEFAULT_MAP, MAP_IDS, ROTATION_MAP_IDS, getMap } from "../src/lib/fps/maps/registry";
import { botItinerary } from "../src/lib/fps/practice-bot";
import { createMatch } from "../src/lib/fps/simulation";

/**
 * The registry must reproduce Dustfront exactly as it was hard-wired before (commit e279645):
 * the same solids in the same tracing order, floor, spawns, lighting, shadow framing, camera
 * range, bot patrols and match state shape.
 */
describe("Dustfront through the map registry", () => {
  const map = getMap("dustfront");

  it("is the default and the only shipped map", () => {
    expect(MAP_IDS).toEqual(["dustfront"]);
    // With Dustfront alone in the rotation, every new match is still Dustfront.
    expect(ROTATION_MAP_IDS).toEqual(["dustfront"]);
    expect(DEFAULT_MAP).toBe(map);
    expect(map.name).toBe("Dustfront");
  });

  it("has the generated layout's solids, floor and spawns in the original tracing order", () => {
    expect(map.arena).toEqual(ARENA_LAYOUT_SIZE);
    expect(map.boxes).toBe(LAYOUT_BOXES);
    expect(map.walls).toBe(LAYOUT_WALLS);
    expect(map.structures).toBe(LAYOUT_STRUCTURES);
    expect(map.barriers).toEqual([]);
    expect(map.floor).toEqual({
      id: "floor",
      x: 0,
      y: -0.2,
      z: 0,
      w: 40,
      h: 0.4,
      d: 32,
      surface: "concrete",
    });
    expect(map.worldSolids).toEqual([
      ...LAYOUT_BOXES,
      ...LAYOUT_WALLS,
      ...LAYOUT_STRUCTURES,
      map.floor,
    ]);
    expect(map.movementSolids).toEqual(LAYOUT_BOXES);
    expect(map.spawns).toBe(LAYOUT_SPAWNS);
    // The compatibility exports in map.ts are the same objects.
    expect([ARENA, BOXES, WALLS, STRUCTURES, FLOOR, WORLD_SOLIDS, SPAWNS]).toEqual([
      map.arena,
      map.boxes,
      map.walls,
      map.structures,
      map.floor,
      map.worldSolids,
      map.spawns,
    ]);
  });

  it("keeps the renderer's previous lighting, shadow framing, camera range and assets", () => {
    expect(map.presentation.lighting).toBe(ARENA_LIGHTING);
    expect(map.presentation.shadow).toEqual({ extent: 26, far: 65, mapSize: 2048 });
    expect(map.presentation.viewDistance).toBe(260);
    expect(map.presentation.modelUrl).toBe("/fps/models/aim-arena.glb");
    expect(map.presentation.sky).toEqual({ zenith: 0x3d74b8, horizon: 0xc9d6df, haze: 0xe6d6bc });
    expect(map.presentation.blockout).toEqual({
      concrete: 0xc9b38f,
      metal: 0x7d8a8c,
      wood: 0x9a7448,
      floor: 0xb59f7c,
    });
  });

  it("reproduces the practice bot's original hard-coded patrols", () => {
    const opening = {
      center: [
        { x: 14.9, z: 2.5 },
        { x: 7, z: -0.6 },
        { x: -7, z: -0.6 },
      ],
      north: [
        { x: 14.9, z: -2.5 },
        { x: 8, z: -12.4 },
        { x: -8, z: -12.4 },
      ],
      south: [
        { x: 14.9, z: 2.5 },
        { x: 8, z: 12.4 },
        { x: -8, z: 12.4 },
      ],
    };
    for (const name of ["center", "north", "south"] as const) {
      const oppositeZ = name === "south" ? -12.4 : 12.4;
      expect(botItinerary(map, name)).toEqual([
        ...opening[name],
        { x: -14.9, z: 2.5 },
        { x: -17.2, z: -8 },
        { x: -8, z: oppositeZ },
        { x: 8, z: oppositeZ },
        { x: 7, z: -0.6 },
      ]);
    }
  });

  it("creates the same match state shape as before (no map field)", () => {
    const state = createMatch({ A: "a", B: "b" }, 9, 0);
    expect(Object.keys(state)).not.toContain("mapId");
    expect(state.players.A).toMatchObject({ x: -18.2, z: 0 });
    expect(state.players.B).toMatchObject({ x: 18.2, z: 0 });
  });
});
