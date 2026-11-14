import type { Object3D, Scene } from "three";

/**
 * The island is composed once after loading. Its LOD/instance buffers and shader uniforms
 * still update, but its Object3D transforms never move. Refresh moving scene roots only.
 * Keep whole visible character subtrees: hidden bones can still influence a visible skin.
 */
export function updateSceneRoots(scene: Scene, island: Object3D | null) {
  for (const child of scene.children)
    if (child.visible && child !== island && !child.userData[OWN_MATRICES])
      child.updateMatrixWorld();
}

/**
 * `root.userData[OWN_MATRICES] = true`: this scene root refreshes its own world matrices, only
 * for the parts that moved. For roots that are mostly still or mostly hidden: three's
 * updateMatrixWorld recomposes every object under a root, hidden ones too (the lifts' 1,441
 * objects across the island cost more each frame than a character, performance audit 2026-11-14).
 */
export const OWN_MATRICES = "ownMatrices";
