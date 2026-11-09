import type * as THREE from "three";

/**
 * Anisotropic filtering for the island's textures (owner, 2026-11-08: the map looked blurry from
 * the plane). Seen at a slant — the ground and the buildings from the air — plain mipmapping
 * smears a texture to its coarse levels; anisotropic filtering keeps it sharp along the slant
 * for a few extra texture taps, which desktop and laptop GPUs do in hardware at little cost.
 * The renderer sets the GPU's limit (capped at 16) before the island loads.
 */
let max = 8;

export function setTextureQuality(renderer: THREE.WebGLRenderer) {
  max = Math.max(1, Math.min(16, renderer.capabilities.getMaxAnisotropy()));
}

/** The anisotropy for world textures (ground, aerial surface, buildings and props). */
export const worldAnisotropy = () => max;

/** Raise every texture on a loaded model's materials to the world anisotropy. */
export function sharpenMaterials(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      for (const v of Object.values(m))
        if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).anisotropy = max;
  });
}
