import * as THREE from "three";
import { BR_SUN } from "./sun-shadow";
import { CELLS, cellTrees, TREE_STRIDE, type VegetationWorld } from "./vegetation";
import { WORLD_HALF, WORLD_SIZE } from "./world";

/**
 * The forest beyond the tree ring (render audit 2026-11-15). Trees are drawn within 1.5 km of
 * the camera; the island holds 234 k of them, so from the plane nine tenths of the forest was
 * bare ground, ending on a line that followed the player. Drawing every tree to the horizon is
 * a million triangles for things a pixel wide. Instead:
 *
 *  - `bakeTreeCover` writes where the trees really stand (vegetation.ts, the placement the
 *    server collides with) into one small texture: how much of each 4.9 m of ground a crown
 *    covers (R), and how much of that is broadleaf or birch rather than pine (G).
 *  - The ground shader (terrain.ts, FAR_FOREST) paints the canopy from it beyond the ring, and
 *    the ring's last stretch of impostors thins out over it (vegetation-renderer.ts), so there
 *    is no line where the forest stops.
 *
 * Purely far scenery: nothing within the tree ring (which covers the fight range) changes.
 */
export const FAR_FOREST = {
  /** Texels across the island (half of it where world textures are halved). */
  size: 2048,
  /** Crown radius (m) at scale 1 per species (pine, broadleaf, birch), seen from above. */
  crown: [3.1, 4.4, 2.9],
  /**
   * The painted canopy fades in from `from` to `full` of the tree ring's length; the ring's
   * impostors thin out from `full` to its end. The farther form is whole before the nearer
   * one starts to go (as between a tree's own forms), so the forest is never see-through.
   */
  from: 0.8,
  full: 0.92,
  /** Height of the canopy over the ground (m): where a view ray meets the tree tops. */
  height: 9,
  /** The lookup never leans further than this (m), however flat the view. */
  lean: 34,
  /** How far towards the sun the shading looks (m). */
  sunStep: 10,
} as const;

/** Unit direction along the ground towards the sun (x, z). */
export const SUN_XZ: [number, number] = [
  Math.sin((BR_SUN.azimuth * Math.PI) / 180),
  Math.cos((BR_SUN.azimuth * Math.PI) / 180),
];

export type TreeCover = { data: Uint8Array; size: number };

/**
 * Tree cover over the whole island, two bytes a texel (cover, broadleaf share). Walks every
 * vegetation cell once; `pause` is awaited between rows of cells so a caller on the main thread
 * can let a frame through (the loading screen keeps moving).
 */
export async function bakeTreeCover(
  world: VegetationWorld,
  size: number = FAR_FOREST.size,
  pause: (() => Promise<void>) | null = null,
): Promise<TreeCover> {
  const cover = new Float32Array(size * size),
    leafy = new Float32Array(size * size);
  const texel = WORLD_SIZE / size;
  for (let cj = 0; cj < CELLS; cj++) {
    for (let ci = 0; ci < CELLS; ci++) {
      const t = cellTrees(world, ci, cj);
      for (let k = 0; k < t.length; k += TREE_STRIDE) {
        const species = t[k + 5]!;
        const r = FAR_FOREST.crown[species]! * t[k + 3]!;
        // The crown's area as a share of a texel, spread over the four texels round its centre.
        const area = (Math.PI * r * r) / (texel * texel);
        const gx = (t[k]! + WORLD_HALF) / texel - 0.5,
          gz = (t[k + 2]! + WORLD_HALF) / texel - 0.5;
        const i = Math.floor(gx),
          j = Math.floor(gz);
        const fx = gx - i,
          fz = gz - j;
        for (let b = 0; b < 2; b++)
          for (let a = 0; a < 2; a++) {
            const x = i + a,
              z = j + b;
            if (x < 0 || z < 0 || x >= size || z >= size) continue;
            const w = area * (a ? fx : 1 - fx) * (b ? fz : 1 - fz);
            cover[z * size + x]! += w;
            if (species !== 0) leafy[z * size + x]! += w;
          }
      }
    }
    if (pause && cj % 4 === 3) await pause();
  }
  const data = new Uint8Array(size * size * 2);
  for (let i = 0; i < size * size; i++) {
    const c = cover[i]!;
    // Crowns overlap: twice the area is not twice the cover.
    data[i * 2] = Math.round(255 * (1 - Math.exp(-1.6 * c)));
    data[i * 2 + 1] = c > 0 ? Math.round((255 * leafy[i]!) / c) : 0;
  }
  return { data, size };
}

export function treeCoverTexture(cover: TreeCover): THREE.DataTexture {
  const t = new THREE.DataTexture(cover.data, cover.size, cover.size, THREE.RGFormat);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
