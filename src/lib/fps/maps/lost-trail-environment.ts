import * as THREE from "three";
import { createArenaEnvironment, type MapEnvironment } from "../arena-environment";
import type { GameMap } from "./types";

/**
 * LOST TRAIL render scene: the shared map loader (blockout → GLB, static shadow map, frozen
 * matrices, reflections captured once) plus two foliage treatments, applied once after load:
 *
 * - Alpha-to-coverage on alpha-tested foliage cards. The world pass already renders with MSAA,
 *   so leaf edges are anti-aliased without blending or sorting (no extra draws).
 * - Subtle wind: leaves and fronds sway in the vertex shader from one shared time uniform. No
 *   per-plant CPU work; all foliage materials share one program variant (same cache key).
 *   Displacement grows with height in the plant's own space, so trunks and roots stay put.
 *
 * - Flowing water: the river's normal map scrolls (one texture-matrix update per frame).
 *
 * - Graphics quality "low": the background forest (sections beyond the playable edge, built as
 *   GPU-instanced batches whose instance order the build shuffles) draws a random half of each
 *   batch, with the kept trees grown slightly so the far canopy still reads as closed. The
 *   forest edge and everything near the lanes are untouched, so sight lines are identical.
 *
 * Gameplay never reads these meshes (collision is the map's solids).
 */
const WIND = { value: 0 };
const WIND_CHUNK = /* glsl */ `
  #ifdef USE_INSTANCING
    vec3 windBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #else
    vec3 windBase = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
  float windHeight = clamp(position.y / 12.0, 0.0, 1.0);
  float windPhase = windTime * 1.3 + windBase.x * 0.21 + windBase.z * 0.17;
  vec3 windOffset = vec3(sin(windPhase), 0.0, cos(windPhase * 0.83)) * (0.05 * windHeight * windHeight)
    + vec3(sin(windTime * 3.1 + position.x * 1.7 + position.z), 0.0, 0.0) * 0.012 * windHeight;
  transformed += windOffset;
`;

function prepareFoliage(root: THREE.Object3D) {
  const done = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (done.has(material) || !(material.alphaTest > 0)) continue;
      done.add(material);
      material.alphaToCoverage = true;
      material.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
        shader.uniforms["windTime"] = WIND;
        shader.vertexShader = `uniform float windTime;\n${shader.vertexShader}`.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\n${WIND_CHUNK}`,
        );
      };
      material.customProgramCacheKey = () => "lost-trail-foliage";
      material.needsUpdate = true;
    }
  });
}

function findWater(root: THREE.Object3D) {
  let normal: THREE.Texture | null = null;
  root.traverse((object) => {
    if (normal || !(object instanceof THREE.Mesh)) return;
    const material = object.material as THREE.MeshStandardMaterial;
    if (material.name === "river-water" && material.normalMap) {
      normal = material.normalMap;
      normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
      normal.needsUpdate = true;
    }
  });
  return normal as THREE.Texture | null;
}

/** Fraction of each background batch drawn on "low", and how much the kept trees grow. */
const LOW_KEEP = 0.5;
const LOW_GROW = 1.14;

type Thinnable = { mesh: THREE.InstancedMesh; full: number; matrices: Float32Array };

export function backgroundBatches(root: THREE.Object3D) {
  const out: Thinnable[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.InstancedMesh)) return;
    for (let p: THREE.Object3D | null = object.parent; p && p !== root; p = p.parent) {
      if (p.name.startsWith("section-bg-")) {
        out.push({
          mesh: object,
          full: object.count,
          matrices: object.instanceMatrix.array.slice() as Float32Array,
        });
        break;
      }
    }
  });
  return out;
}

export function applyQuality(batches: Thinnable[], quality: "high" | "low") {
  const scratch = new THREE.Matrix4();
  const grow = new THREE.Matrix4();
  for (const b of batches) {
    const attr = b.mesh.instanceMatrix;
    (attr.array as Float32Array).set(b.matrices);
    if (quality === "low") {
      b.mesh.count = Math.max(1, Math.ceil(b.full * LOW_KEEP));
      for (let i = 0; i < b.mesh.count; i++) {
        scratch.fromArray(b.matrices, i * 16);
        // Grow about the instance's own base (scale in its local frame, after its transform).
        grow.makeScale(LOW_GROW, 1 + (LOW_GROW - 1) * 0.5, LOW_GROW);
        scratch.multiply(grow).toArray(attr.array as Float32Array, i * 16);
      }
    } else {
      b.mesh.count = b.full;
    }
    attr.needsUpdate = true;
    // Culling bounds follow the drawn instances (recomputed lazily on the next frame).
    b.mesh.boundingSphere = null;
    b.mesh.boundingBox = null;
  }
}

export function createLostTrailEnvironment(scene: THREE.Scene, map: GameMap): MapEnvironment {
  const base = createArenaEnvironment(scene, map);
  let water: THREE.Texture | null = null;
  let batches: Thinnable[] = [];
  let quality: "high" | "low" = "high";
  const ready = base.ready.then(() => {
    const authored = scene.getObjectByName(map.id);
    if (!authored) return;
    prepareFoliage(authored);
    water = findWater(authored);
    batches = backgroundBatches(authored);
    if (quality === "low") applyQuality(batches, quality);
  });
  return {
    ...base,
    ready,
    setQuality(next) {
      if (next === quality) return;
      quality = next;
      applyQuality(batches, quality);
    },
    update(_dt, now) {
      WIND.value = now / 1000;
      // The river runs north → south (+z, which is -v in the water's world-projected UVs).
      if (water) water.offset.set(Math.sin(now / 9000) * 0.02, (now / 1000) * 0.045);
    },
  };
}
