import { readFileSync } from "node:fs";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeHeightfield, type Heightfield } from "@/lib/fps/br/heightfield";
import { decodeLandCover } from "@/lib/fps/br/landcover";
import { createTerrain, TERRAIN } from "@/lib/fps/br/terrain";
import { WORLD_ASSETS, WORLD_HALF } from "@/lib/fps/br/world";

const buffer = (path: string) => {
  const f = readFileSync(path);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};

/**
 * The early-depth draw order (island-scene.ts setEarlyDepthOrder): the ground's patches are
 * drawn nearest first, so a near hill hides the ground behind it before that is shaded. The
 * order is worked out every frame: it must be the same set of patches, only reordered.
 */
describe("terrain patches nearest first", () => {
  let hf: Heightfield;
  let terrain: ReturnType<typeof createTerrain>;
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 12000);
  const patches = () => {
    const mesh = terrain.root.children.find(
      (o): o is THREE.Mesh => (o as THREE.Mesh).isMesh === true,
    )!;
    const g = mesh.geometry as THREE.InstancedBufferGeometry;
    const arr = g.getAttribute("aPatch").array as Float32Array;
    return [...arr.subarray(0, g.instanceCount * 4)];
  };
  const rows = (flat: number[]) => {
    const out: string[] = [];
    for (let i = 0; i < flat.length; i += 4) out.push(flat.slice(i, i + 4).join(","));
    return out;
  };
  beforeAll(async () => {
    hf = await decodeHeightfield(buffer(`public${WORLD_ASSETS.height}`));
    const cover = await decodeLandCover(buffer(`public${WORLD_ASSETS.landcover}`));
    terrain = createTerrain(hf, cover);
  });

  for (const [name, x, y, z, yaw] of [
    ["on foot in the north", 300, 0, -2800, 0.4],
    ["under the canopy", -1200, 300, 900, 2.1],
    ["from the plane", 2000, 800, 2500, -1.3],
  ] as const)
    it(`${name}: the same patches, nearest first`, () => {
      camera.position.set(x, hf.heightAt(x, z) + 1.7 + y, z);
      camera.rotation.set(0, yaw, 0);
      camera.updateProjectionMatrix();
      terrain.setFrontToBack(false);
      terrain.update(camera);
      const plain = patches();
      terrain.setFrontToBack(true);
      terrain.update(camera);
      const ordered = patches();
      expect(ordered.length).toBe(plain.length);
      expect(ordered.length).toBeGreaterThan(8 * 4);
      expect(rows(ordered).sort()).toEqual(rows(plain).sort());
      const half = TERRAIN.patch / 2;
      const distance = (i: number) =>
        Math.hypot(
          (ordered[i]! + half * ordered[i + 2]!) * hf.spacing - WORLD_HALF - camera.position.x,
          (ordered[i + 1]! + half * ordered[i + 2]!) * hf.spacing - WORLD_HALF - camera.position.z,
        );
      // (Distances are compared in whole decimetres: terrain.ts packs them for a native sort.)
      for (let i = 4; i < ordered.length; i += 4)
        expect(distance(i)).toBeGreaterThanOrEqual(distance(i - 4) - 0.11);
      // A second frame from the same place gives the same order (nothing is left over).
      terrain.update(camera);
      expect(patches()).toEqual(ordered);
    });
});
