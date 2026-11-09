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

/**
 * The terrain's height texture (terrain.ts: R16UI centimetres + offset on a regular grid), so
 * the water knows how deep it is at every pixel.
 */
export type WaterGround = {
  texture: THREE.Texture;
  /** Grid spacing (m), the grid's last index, and the height offset (m). */
  spacing: number;
  grid: number;
  offset: number;
};

export function createWater(
  meta: WorldMeta,
  coverB: THREE.Texture,
  ground: WaterGround | null = null,
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
    shader.uniforms["uSky"] = { value: sky };
    if (ground) shader.uniforms["uGround"] = { value: ground.texture };
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
        uniform vec3 uSky;
        varying float vLake;
        varying float vWaterY;
        varying vec2 vMapUv;
        ${
          ground
            ? `precision highp usampler2D;
        uniform usampler2D uGround;
        float groundH(ivec2 g) {
          g = clamp(g, ivec2(0), ivec2(${ground.grid}));
          return float(texelFetch(uGround, g, 0).r) * 0.01 - ${ground.offset.toFixed(2)};
        }
        // Bilinear, like the terrain's own surface (terrain.ts heightAtGrid).
        float groundAt(vec2 uv) {
          vec2 g = uv * ${ground.grid.toFixed(1)};
          vec2 f = fract(g);
          ivec2 i = ivec2(floor(g));
          float a = groundH(i), b = groundH(i + ivec2(1, 0)), c = groundH(i + ivec2(0, 1)), d = groundH(i + ivec2(1, 1));
          // Past the map edge: open sea.
          float outside = any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0))) ? 1.0 : 0.0;
          return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), -40.0, outside);
        }`
            : `float groundAt(vec2 uv) { return -40.0; }`
        }
        float wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(wHash(i), wHash(i + vec2(1, 0)), u.x),
                     mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), u.x), u.y);
        }`,
      )
      // Depth (owner, 2026-11-05: realistic water): clear and sandy-green over shallows, deep
      // blue-green offshore; lakes and rivers murkier. The terrain's own height says how deep.
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float waterDepth = max(vWaterY - groundAt(vMapUv), 0.0);
        // A wavy waterline: the thinnest film lets the wet ground show through along a noisy
        // contour, instead of the terrain mesh's triangles cutting a stepped edge.
        // Only where the terrain is drawn at full detail (its first LOD, ~390 m): further out the
        // coarser terrain sits lower than the true heights, and the cut-outs showed it as dark
        // notches along every bank (owner, 2026-11-08).
        if (waterDepth < (0.12 + 0.22 * wNoise(vMapUv * 4200.0)) * (1.0 - smoothstep(250.0, 380.0, length(vViewPosition)))) discard;
        {
          vec3 shallow = mix(vec3(0.16, 0.27, 0.22), vec3(0.15, 0.19, 0.12), vLake);
          vec3 deep = mix(vec3(0.016, 0.07, 0.1), vec3(0.025, 0.07, 0.07), vLake);
          diffuseColor.rgb = mix(shallow, deep, smoothstep(0.0, mix(7.0, 4.0, vLake), waterDepth));
          // The last half metre takes the colour of the wet ground under it, so the waterline
          // is a soft edge, not the terrain's triangles cutting through the water.
          vec3 wet = mix(vec3(0.2, 0.17, 0.115), vec3(0.11, 0.1, 0.07), vLake);
          diffuseColor.rgb = mix(diffuseColor.rgb, wet, 1.0 - smoothstep(0.0, 0.7, waterDepth));
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
          // Shallows show the bottom more than the sky.
          float bottom = 1.0 - smoothstep(0.0, 2.5, waterDepth);
          float film = 1.0 - smoothstep(0.0, 0.5, waterDepth);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky * 0.92, clamp(0.22 + fres - 0.18 * bottom, 0.0, 0.9) * (1.0 - 0.7 * film));
          // Where it meets the land: a thin, broken line of foam and wet shine.
          float edge = smoothstep(0.15, 0.4, waterDepth) * (1.0 - smoothstep(0.4, 0.8, waterDepth));
          float broken = wNoise(vMapUv * 3400.0) * 0.6 + wNoise(vMapUv * 900.0) * 0.4;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky * 1.05, edge * smoothstep(0.35, 0.7, broken) * 0.55);
        }
        #include <fog_fragment>`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        // Fixed mask mip: camera distance must not change which bank belongs to a lake.
        if (vLake > 0.5 && textureLod(uCoverB, vMapUv, 0.0).a < 0.35) discard;
        if (all(greaterThanEqual(vMapUv, vec2(0.0))) && all(lessThanEqual(vMapUv, vec2(1.0)))) {
          float depth = vWaterY - groundAt(vMapUv) - 0.02;
          if (depth <= 0.0) discard;
          diffuseColor.a *= smoothstep(0.0, max(fwidth(depth), 0.02), depth);
        }`,
      );
  };
  material.customProgramCacheKey = () => `br-water-v3-${ground ? "depth" : "flat"}`;
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
