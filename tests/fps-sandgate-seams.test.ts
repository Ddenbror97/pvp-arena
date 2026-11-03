import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { SANDGATE_BOXES } from "../src/lib/fps/sandgate-layout";

/** Use the shipped, compressed geometry, not an idealised box proxy. Textures are not decoded. */
let scene: THREE.Group;
beforeAll(async () => {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  loader.register((parser) => {
    parser.loadTexture = async () => null!;
    parser.loadTextureImage = async () => null!;
    return { name: "geometry-only" };
  });
  const b = readFileSync("public/fps/models/sandgate.glb");
  const gltf = await loader.parseAsync(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "",
  );
  scene = gltf.scene;
  scene.updateMatrixWorld(true);
}, 30_000);

describe("Sandgate recessed facade connections", () => {
  it("closes diagonal sight gaps at every inward building corner, including Police-to-A", () => {
    const blocks = SANDGATE_BOXES.filter((b) => b.id.startsWith("block-"));
    const solid = (x: number, z: number) =>
      blocks.some(
        (b) => Math.abs(x - b.x) < b.w / 2 - 0.001 && Math.abs(z - b.z) < b.d / 2 - 0.001,
      );
    let checked = 0;
    for (let x = -39; x <= 39; x += 0.5)
      for (let z = -39; z <= 39; z += 0.5) {
        const open = [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ].filter(([sx, sz]) => !solid(x + sx! * 0.1, z + sz! * 0.1));
        if (open.length !== 1) continue;
        const [sx, sz] = open[0]!;
        for (const y of [1.6, 3, 5, 7.5]) {
          const ray = new THREE.Raycaster(
            new THREE.Vector3(x + sx! * 0.35, y, z + sz! * 0.35),
            new THREE.Vector3(-sx!, 0, -sz!).normalize(),
            0,
            1.2,
          );
          expect(
            ray.intersectObject(scene, true).length,
            `Open building seam at ${x},${y},${z}`,
          ).toBeGreaterThan(0);
          checked++;
        }
      }
    expect(checked).toBe(100);
  }, 30_000);
});
