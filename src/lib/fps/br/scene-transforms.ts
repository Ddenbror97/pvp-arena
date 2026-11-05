import type { Object3D, Scene } from "three";

/**
 * The island is composed once after loading. Its LOD/instance buffers and shader uniforms
 * still update, but its Object3D transforms never move. Refresh moving scene roots only.
 * Keep whole visible character subtrees: hidden bones can still influence a visible skin.
 */
export function updateSceneRoots(scene: Scene, island: Object3D | null) {
  for (const child of scene.children)
    if (child.visible && child !== island) child.updateMatrixWorld();
}
