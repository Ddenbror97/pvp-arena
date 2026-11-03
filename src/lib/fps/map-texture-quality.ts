import * as THREE from "three";
/** Sandgate albedo only: modest oblique-angle clarity, no larger images or extra shader variants. */
export function sharpenMapColors(root: THREE.Object3D, maxAnisotropy: number) {
  const level = Math.max(1, Math.min(4, Number.isFinite(maxAnisotropy) ? maxAnisotropy : 1));
  const textures = new Set<THREE.Texture>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      const map = (m as THREE.MeshStandardMaterial).map;
      if (map && !textures.has(map)) {
        textures.add(map);
        if (map.anisotropy < level) {
          map.anisotropy = level;
          map.needsUpdate = true;
        }
      }
    }
  });
  return { textures: textures.size, anisotropy: level };
}
