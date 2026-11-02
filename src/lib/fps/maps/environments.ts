import type * as THREE from "three";
import { createArenaEnvironment, type MapEnvironment } from "../arena-environment";
import type { GameMap } from "./types";
import { createSnowfall } from "../snowfall";
import { createLostTrailEnvironment } from "./lost-trail-environment";

/**
 * Browser-only render scenes per map. Every map gets the shared loader by default (blockout from
 * its solids, then its GLB, sky dome and shadow flags from its presentation data). A map that
 * needs extra presentation (animated water, foliage wind, particles) registers its own factory
 * here; it should build on createArenaEnvironment and keep the same static-scene contract
 * (frozen matrices, static shadow map, reflections captured once) unless it measures otherwise.
 */
type EnvironmentFactory = (scene: THREE.Scene, map: GameMap) => MapEnvironment;
const FACTORIES: Readonly<Record<string, EnvironmentFactory>> = {
  // FROSTLINE: the shared loader plus bounded GPU snowfall (no per-frame CPU work).
  frostline: (scene, map) => {
    const base = createArenaEnvironment(scene, map);
    const snowfall = createSnowfall(scene);
    return {
      ...base,
      dispose() {
        snowfall.dispose();
        base.dispose();
      },
    };
  },
  "lost-trail": createLostTrailEnvironment,
};

export function createMapEnvironment(scene: THREE.Scene, map: GameMap): MapEnvironment {
  return (FACTORIES[map.id] ?? createArenaEnvironment)(scene, map);
}
