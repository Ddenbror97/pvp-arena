import { afterEach, describe, expect, it, vi } from "vitest";
import { DUSTFRONT } from "../src/lib/fps/maps/dustfront";
import { FROSTLINE } from "../src/lib/fps/maps/frostline";
import type { MapDefinition } from "../src/lib/fps/maps/types";
import { TEST_GRID } from "./fixtures/test-map";

/**
 * FROSTLINE inside a larger catalog: Dustfront, FROSTLINE, and two stand-ins shaped like the
 * maps being built in parallel (their code is not on this branch): a jungle map with
 * movement-only barriers (LOST TRAIL) and a map without loading art yet (CROSSFIRE). Checks
 * that the rotation, the per-map loading art and match creation keep working when they land,
 * that FROSTLINE stays out of the draw while `rotation: false`, and that flipping its flag is
 * the only change needed to add it.
 */
const LOST_TRAIL: MapDefinition = {
  ...TEST_GRID,
  id: "lost-trail",
  name: "Lost Trail",
  rotation: true,
  arena: { width: 48, depth: 36 },
};
const CROSSFIRE: MapDefinition = {
  ...TEST_GRID,
  id: "crossfire",
  name: "Crossfire",
  rotation: true,
};

async function withCatalog(definitions: readonly MapDefinition[]) {
  vi.resetModules();
  vi.doMock("../src/lib/fps/maps/catalog", () => ({ MAP_DEFINITIONS: definitions }));
  const registry = await import("../src/lib/fps/maps/registry");
  const screens = await import("../src/lib/fps/maps/loading-screens");
  const simulation = await import("../src/lib/fps/simulation");
  return { ...registry, ...screens, ...simulation };
}
/** Every map a uniform draw can produce (one draw per rotation slot). */
function draws(pick: (random: () => number) => string, slots: number) {
  const out = new Set<string>();
  for (let i = 0; i < slots; i++) out.add(pick(() => (i + 0.5) / slots));
  return [...out];
}

afterEach(() => {
  vi.doUnmock("../src/lib/fps/maps/catalog");
  vi.resetModules();
});

describe("map rotation with FROSTLINE, LOST TRAIL and CROSSFIRE", () => {
  it("draws only rotation maps; FROSTLINE stays out while rotation is false", async () => {
    const m = await withCatalog([DUSTFRONT, FROSTLINE, LOST_TRAIL, CROSSFIRE]);
    expect(m.MAP_IDS).toEqual(["dustfront", "frostline", "lost-trail", "crossfire"]);
    expect(m.ROTATION_MAP_IDS).toEqual(["dustfront", "lost-trail", "crossfire"]);
    expect(draws(m.pickRotationMap, 3).sort()).toEqual(["crossfire", "dustfront", "lost-trail"]);
    // Out of rotation, FROSTLINE is still a valid explicit map.
    expect(m.isMapId("frostline")).toBe(true);
    expect(m.createMatch({ A: "a", B: "b" }, 5, 0, 2, "frostline").mapId).toBe("frostline");
  });

  it("gives each map its own art or the default, and preloads only rotation art", async () => {
    const m = await withCatalog([DUSTFRONT, FROSTLINE, LOST_TRAIL, CROSSFIRE]);
    expect(m.loadingImageFor("frostline")).toMatch(/frostline-loading/);
    expect(m.loadingImageFor("lost-trail")).toBe(m.DEFAULT_LOADING_IMAGE);
    expect(m.loadingImageFor("crossfire")).toBe(m.DEFAULT_LOADING_IMAGE);
    // Maps without art share the default: one preload, no duplicates, no FROSTLINE art.
    expect(m.ROTATION_LOADING_IMAGES).toEqual([m.DEFAULT_LOADING_IMAGE]);
  });

  it("keeps each map's own geometry: movement-only barriers, size and spawns", async () => {
    const m = await withCatalog([DUSTFRONT, FROSTLINE, LOST_TRAIL, CROSSFIRE]);
    const jungle = m.getMap("lost-trail"),
      frost = m.getMap("frostline");
    expect(jungle.movementSolids.some((s) => s.id === "test-gorge")).toBe(true);
    expect(jungle.worldSolids.some((s) => s.id === "test-gorge")).toBe(false);
    expect(jungle.floor.w).toBe(48);
    expect(frost.arena).toEqual({ width: 40, depth: 32 });
    for (const id of m.MAP_IDS) {
      const match = m.createMatch({ A: "a", B: "b" }, 5, 0, 2, id);
      const map = m.getMap(id);
      expect(match.mapId ?? "dustfront").toBe(id);
      expect([match.players.A.x, match.players.A.z]).toEqual([map.spawns.A.x, map.spawns.A.z]);
    }
  });

  it("adds FROSTLINE to the draw and the preload by flipping its rotation flag only", async () => {
    const m = await withCatalog([
      DUSTFRONT,
      { ...FROSTLINE, rotation: true },
      LOST_TRAIL,
      CROSSFIRE,
    ]);
    expect(m.ROTATION_MAP_IDS).toEqual(["dustfront", "frostline", "lost-trail", "crossfire"]);
    expect(draws(m.pickRotationMap, 4)).toContain("frostline");
    expect(m.ROTATION_LOADING_IMAGES).toContain(m.loadingImageFor("frostline"));
    expect(m.ROTATION_LOADING_IMAGES).toHaveLength(2);
  });
});
