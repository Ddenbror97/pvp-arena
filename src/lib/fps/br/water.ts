import * as THREE from "three";
import { WORLD_HALF, WORLD_SIZE, type WorldMeta } from "./world";

/**
 * Project Island water in ONE draw call: the sea (y = 0, extended far past the map edge) and
 * every inland lake at its own level, merged into one geometry.
 *
 * Lakes are rectangles around each lake's bounds, so a fragment of a lake rectangle is kept
 * only where the land-cover map says water (weights from the terrain's cover texture, alpha
 * of slot B). Where the ground is above the water the depth test hides it, so shorelines follow
 * the terrain exactly. The sea needs no mask: it is the lowest water.
 */
export type WaterControls = { root: THREE.Object3D; dispose: () => void };

/** How far the sea extends beyond the map edge (m), past the camera's far plane from inside. */
const SEA_MARGIN = 15_000;

export function createWater(
  meta: WorldMeta,
  coverB: THREE.Texture,
  height: THREE.DataTexture,
): WaterControls {
  const positions: number[] = [];
  const lake: number[] = [];
  const index: number[] = [];
  const quad = (x0: number, z0: number, x1: number, z1: number, y: number, isLake: number) => {
    const o = positions.length / 3;
    positions.push(x0, y, z0, x1, y, z0, x0, y, z1, x1, y, z1);
    lake.push(isLake, isLake, isLake, isLake);
    // Counter-clockwise seen from above (+y).
    index.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
  };
  const far = WORLD_HALF + SEA_MARGIN;
  quad(-far, -far, far, far, 0, 0);
  for (const w of meta.waterBodies) {
    const [x0, z0, x1, z1] = w.bounds;
    quad(x0 - 20, z0 - 20, x1 + 20, z1 + 20, w.level, 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aLake", new THREE.Float32BufferAttribute(lake, 1));
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(
      positions.map((_, i) => (i % 3 === 1 ? 1 : 0)),
      3,
    ),
  );
  geometry.setIndex(index);
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    color: 0x1d4a5c,
    roughness: 0.18,
    metalness: 0.1,
    // Only wet fragments survive below; bias resolves near-coplanar shore depth ties without
    // raising the water level or covering dry land. MSAA smooths the physical shoreline.
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    alphaToCoverage: true,
    alphaTest: 0.01,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms["uCoverB"] = { value: coverB };
    shader.uniforms["uWaterHeight"] = { value: height };
    shader.uniforms["uWaterHeightOffset"] = { value: meta.world.heightOffset };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aLake;
        varying float vLake;
        varying float vWaterY;
        varying vec2 vMapUv;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLake = aLake;
        vWaterY = position.y;
        vMapUv = (position.xz + ${WORLD_HALF.toFixed(1)}) / ${WORLD_SIZE.toFixed(1)};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uCoverB;
        precision highp usampler2D;
        uniform usampler2D uWaterHeight;
        uniform float uWaterHeightOffset;
        varying float vLake;
        varying float vWaterY;
        varying vec2 vMapUv;
        float shoreHeight(vec2 uv) {
          ivec2 last = textureSize(uWaterHeight, 0) - 1;
          vec2 g = clamp(uv, 0.0, 1.0) * vec2(last);
          ivec2 p = ivec2(floor(g)); vec2 f = fract(g);
          float a = float(texelFetch(uWaterHeight, p, 0).r);
          float b = float(texelFetch(uWaterHeight, min(p + ivec2(1, 0), last), 0).r);
          float c = float(texelFetch(uWaterHeight, min(p + ivec2(0, 1), last), 0).r);
          float d = float(texelFetch(uWaterHeight, min(p + ivec2(1, 1), last), 0).r);
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) * 0.01 - uWaterHeightOffset;
        }`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        // Fixed mask mip: camera distance must not change which bank belongs to a lake.
        if (vLake > 0.5 && textureLod(uCoverB, vMapUv, 0.0).a < 0.35) discard;
        if (all(greaterThanEqual(vMapUv, vec2(0.0))) && all(lessThanEqual(vMapUv, vec2(1.0)))) {
          float depth = vWaterY - shoreHeight(vMapUv) - 0.02;
          if (depth <= 0.0) discard;
          diffuseColor.a *= smoothstep(0.0, max(fwidth(depth), 0.02), depth);
        }`,
      );
  };
  material.customProgramCacheKey = () => "br-water-shore-v2";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "br-water";
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  mesh.frustumCulled = false;
  const root = new THREE.Group();
  root.name = "br-water";
  root.add(mesh);
  return {
    root,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
