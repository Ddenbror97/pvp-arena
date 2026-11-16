import * as THREE from "three";

/**
 * A WebGLRenderer listens for the disposal of every texture, material and geometry it has
 * drawn. For what one match owns, that ends with the match. What the whole page shares is
 * never disposed: the rifles' finish textures (rifle-materials.ts), the sights' glass
 * (br/sight-reticle.ts) and three's own lookup texture for lit materials. Through its
 * listeners on those, every finished match's renderer stayed reachable from the page's module
 * state and was never collected: one more for each Battle Royale match played (cleanup
 * 2026-11-16, scripts/br/leak-check --classes).
 *
 * Disposing a shared texture or material only hands it back: it keeps its picture, and the
 * next renderer to draw it uploads it again.
 */

/**
 * three's lookup texture for lit materials ("DFG_LUT"): one object for every renderer on the
 * page, created inside three and not exported. Found on any lit material this renderer has
 * drawn under `root`; null if it has drawn none. Ask while the scene is still whole.
 */
export function litLookup(renderer: THREE.WebGLRenderer, root: THREE.Object3D) {
  let found: THREE.Texture | null = null;
  root.traverse((object) => {
    if (found) return;
    const material = (object as THREE.Mesh).material as
      THREE.Material | THREE.Material[] | undefined;
    for (const m of Array.isArray(material) ? material : material ? [material] : []) {
      if (!(m as THREE.MeshStandardMaterial).isMeshStandardMaterial) continue;
      const uniforms = (
        renderer.properties.get(m) as { uniforms?: Record<string, { value?: unknown }> }
      ).uniforms;
      const value = uniforms?.["dfgLUT"]?.value;
      if (value instanceof THREE.Texture) {
        found = value;
        return;
      }
    }
  });
  return found as THREE.Texture | null;
}
