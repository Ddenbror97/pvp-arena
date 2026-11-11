import { zipClearings, zipStationBoxes } from "./zipline";
import { bridgeBoxes } from "./bridges";
import { islandDoors, modelDoors, type DoorSet } from "./doors";
import type { Heightfield } from "./heightfield";
import type { LandCoverMap } from "./landcover";
import { islandLayoutSteps, type Placement } from "./layout";
import { StaticWorld, turnBox, type CollisionData } from "./static-world";
import { vegetationWorld, type Species, type VegetationWorld } from "./vegetation";
import { islandWalls, wallBoxes } from "./walls";
import type { WorldMeta } from "./world";

/**
 * The whole solid world of Project Island, built the same way by the server room, client
 * prediction, the renderer and the tests: the layout first (it reads only the ground and land
 * cover), then trees with every building's footprint kept clear, then the collision world
 * (models, bridges, the dam and the prison walls).
 *
 * Gameplay module: no rendering state (fairness boundary).
 */
export type Island = {
  layout: Placement[];
  vegetation: VegetationWorld;
  solid: StaticWorld;
  /** Openable doors in the buildings' doorways (doors.ts); open/closed is per match. */
  doors: DoorSet;
};

export function buildIsland(
  hf: Heightfield,
  cover: LandCoverMap,
  meta: WorldMeta,
  collision: CollisionData,
): Island {
  const steps = buildIslandSteps(hf, cover, meta, collision);
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
  }
}

/**
 * The island as steps: the same work as buildIsland (which runs these to the end), pausing
 * between the layout's phases, the collision world and each model's door analysis. A server
 * room awaits between steps so a cold start does not stall the other rooms in its isolate.
 */
export function* buildIslandSteps(
  hf: Heightfield,
  cover: LandCoverMap,
  meta: WorldMeta,
  collision: CollisionData,
): Generator<void, Island, void> {
  const placed = yield* islandLayoutSteps(
    meta,
    (x, z) => hf.heightAt(x, z),
    (x, z) => cover.classIdAt(x, z),
  );
  // Trees the layout planted (town yards) belong to the vegetation, not the props.
  const layout = placed.filter((p) => !PLANTED[p.model]);
  const planted = placed
    .filter((p) => PLANTED[p.model])
    .map((p) => ({ x: p.x, z: p.z, species: PLANTED[p.model]! }));
  const vegetation = vegetationWorld(
    hf,
    cover,
    meta,
    [...buildingClearings(layout, collision), ...zipClearings()],
    planted,
  );
  yield;
  const solid = new StaticWorld(hf, layout, collision, vegetation, [
    ...bridgeBoxes(meta, hf),
    ...wallBoxes(islandWalls(meta)),
    ...zipStationBoxes((x, z) => hf.heightAt(x, z)),
  ]);
  yield;
  // Each model's doorways are found once (doors.ts caches them): one model per step.
  const models = new Set<string>();
  for (const p of layout) {
    if (models.has(p.model)) continue;
    models.add(p.model);
    modelDoors(collision, p.model);
    yield;
  }
  const doors = islandDoors(layout, collision);
  // The shared world carries the (static) door list, so per-match views can find it.
  Object.assign(solid, { doors });
  return { layout, vegetation, solid, doors };
}

/** Layout placements that are trees (planted by layout.ts), by species. */
const PLANTED: Record<string, Species | undefined> = {
  "tree-pine": "pine",
  "tree-oak": "broadleaf",
  "tree-birch": "birch",
};

/** A tree-free circle (x, z, radius) around each placed model's collision footprint. */
export function buildingClearings(
  layout: Placement[],
  collision: CollisionData,
): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (const p of layout) {
    const boxes = collision.models[p.model];
    if (!boxes?.length) continue;
    let x0 = Infinity,
      z0 = Infinity,
      x1 = -Infinity,
      z1 = -Infinity;
    for (const b of boxes) {
      const [bx0, , bz0, bx1, , bz1] = turnBox(b, p.turn);
      x0 = Math.min(x0, bx0);
      z0 = Math.min(z0, bz0);
      x1 = Math.max(x1, bx1);
      z1 = Math.max(z1, bz1);
    }
    // Small props (barriers, crates) can stand among trees; anything bigger gets a clearing.
    const r = Math.hypot(x1 - x0, z1 - z0) / 2;
    if (r < 2) continue;
    out.push([p.x + (x0 + x1) / 2, p.z + (z0 + z1) / 2, r + 2]);
  }
  return out;
}
