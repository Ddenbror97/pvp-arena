import * as THREE from "three";
import { HAZE } from "./atmosphere";
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
  sky: THREE.Color = new THREE.Color(HAZE),
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
    color: 0x24505e,
    roughness: 0.22,
    metalness: 0.1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms["uCoverB"] = { value: coverB };
    shader.uniforms["uSky"] = { value: sky };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aLake;
        varying float vLake;
        varying vec2 vMapUv;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vLake = aLake;
        vMapUv = (position.xz + ${WORLD_HALF.toFixed(1)}) / ${WORLD_SIZE.toFixed(1)};`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uCoverB;
        uniform vec3 uSky;
        varying float vLake;
        varying vec2 vMapUv;
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(wHash(i), wHash(i + vec2(1, 0)), u.x),
                     mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), u.x), u.y);
        }`,
      )
      // Still ripples: a little noise in the normal breaks up the sun's reflection.
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          // Faded out with distance, where it would only shimmer (and skipped there).
          float near = 1.0 - smoothstep(150.0, 1200.0, length(vViewPosition));
          if (near > 0.0) {
            vec2 q = vMapUv * 2600.0;
            float r1 = wNoise(q) - wNoise(q + vec2(0.37, 0.71));
            float r2 = wNoise(q * 0.31 + 5.0) - wNoise(q * 0.31 + vec2(5.6, 4.2));
            vec3 rip = vec3(r1 * 0.05 + r2 * 0.08, 0.0, (r2 - r1) * 0.06) * near;
            normal = normalize(normal + (viewMatrix * vec4(rip, 0.0)).xyz);
          }
        }`,
      )
      // The sky's reflection (owner's H1Z1 reference): steel blue looking down, the horizon haze
      // at grazing angles, so the far sea meets the sky without a dark band.
      .replace(
        "#include <fog_fragment>",
        `{
          float cosV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float fres = 0.04 + 0.96 * pow(1.0 - cosV, 5.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky * 0.92, clamp(0.22 + fres, 0.0, 0.9));
        }
        #include <fog_fragment>`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        if (vLake > 0.5 && texture2D(uCoverB, vMapUv).a < 0.35) discard;`,
      );
  };
  material.customProgramCacheKey = () => "br-water-v2";
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
