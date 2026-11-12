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

/** The island's sun (br-arena.ts and the explorer place their light on this bearing). */
const SUN = new THREE.Vector3(-0.55, 0.62, 0.45).normalize();

/**
 * Owner, 2026-11-12 (four reference screenshots: a sun-glitter path, pale foam along the banks,
 * turquoise shallows with the sand and its caustics showing through, sky-tinted open water):
 * "upgrade our water to look like this ... keep all the optimizations ... not heavy for the GPU".
 * Still ONE opaque draw call with no extra pass, render target or texture: everything new is a
 * few value-noise taps, each behind a branch that only the pixels that show it take (caustics
 * and foam in the shallows near the camera, glitter inside the sun's reflection). The ground's
 * height is now read once per pixel instead of twice (four texel fetches saved everywhere),
 * which pays for them.
 */
export function createWater(
  meta: WorldMeta,
  coverB: THREE.Texture,
  ground: WaterGround | null = null,
  sky: THREE.Color = new THREE.Color(HAZE),
  sun: THREE.Vector3 = SUN,
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

  const time = { value: 0 };
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
    shader.uniforms["uTime"] = time;
    shader.uniforms["uSunDir"] = { value: sun.clone().normalize() };
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
        uniform float uTime;
        uniform vec3 uSunDir;
        varying float vLake;
        varying float vWaterY;
        varying vec2 vMapUv;
        // The surface's waves this frame (set once in the colour stage, read by the normal).
        float wRipple = 0.0, wChop = 0.0, wSwell = 0.0, wNear = 0.0;
        // The water's depth over the ground and the camera's distance (read once per pixel).
        float wDepth = 40.0, wDist = 0.0;
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
      // Depth (owner, 2026-11-05: realistic water; 2026-11-12: the turquoise references): the
      // terrain's own height says how deep, the depth sets the colour.
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float waterDepth = max(wDepth, 0.0);
        // A wavy waterline: the thinnest film lets the wet ground show through along a noisy
        // contour, instead of the terrain mesh's triangles cutting a stepped edge.
        // Only where the terrain is drawn at full detail (its first LOD, ~390 m): further out the
        // coarser terrain sits lower than the true heights, and the cut-outs showed it as dark
        // notches along every bank (owner, 2026-11-08).
        wDist = length(vViewPosition);
        if (waterDepth < (0.12 + 0.22 * wNoise(vMapUv * 4200.0)) * (1.0 - smoothstep(250.0, 380.0, wDist))) discard;
        {
          // Waves (owner, 2026-11-10: "more realistic, crisp from the parachute"). The surface
          // was a still mirror: its colour a smooth ramp of the depth, a blur from the air.
          // Three layers drift across it: ripples (3.8 m cells, near only), chop (12 m) and a
          // swell (45 m) that still reads from 500 m up; lakes are calmer than the sea.
          wNear = 1.0 - smoothstep(150.0, 1200.0, wDist);
          float calm = mix(1.0, 0.55, vLake);
          vec2 q = vMapUv * 2600.0;
          if (wNear > 0.0) {
            vec2 q1 = q + uTime * vec2(0.42, 0.27);
            wRipple = (wNoise(q1) - wNoise(q1 + vec2(0.37, 0.71))) * calm;
          }
          vec2 q2 = q * 0.31 + uTime * vec2(-0.13, 0.19) + 5.0;
          wChop = (wNoise(q2) - wNoise(q2 + vec2(0.6, -0.8))) * calm;
          vec2 q3 = q * 0.085 + uTime * vec2(0.05, 0.035) + 11.0;
          wSwell = (wNoise(q3) - wNoise(q3 + vec2(0.5, 0.4))) * calm;
          // Depth (2026-11-12 references): turquoise over the shallows, teal, then deep blue
          // offshore. Lakes, rivers and ponds share the sea's look (owner, 2026-11-12:
          // "water/rivers/pools across the map to have the same look"): a touch greener and
          // their deep water nearer the surface, no more.
          float murk = vLake * 0.22;
          vec3 shallow = mix(vec3(0.07, 0.5, 0.47), vec3(0.13, 0.3, 0.2), murk);
          vec3 mid = mix(vec3(0.03, 0.24, 0.3), vec3(0.06, 0.17, 0.13), murk);
          vec3 deep = mix(vec3(0.014, 0.075, 0.125), vec3(0.025, 0.07, 0.07), murk);
          // The depth ramp through the chop, so shoals and drop-offs have a broken edge
          // instead of following the height grid's soft contours.
          float rampDepth = waterDepth * (1.0 + 0.9 * wChop);
          diffuseColor.rgb = mix(shallow, mid, smoothstep(0.3, mix(3.2, 2.0, murk), rampDepth));
          diffuseColor.rgb = mix(diffuseColor.rgb, deep, smoothstep(mix(2.5, 1.5, vLake), mix(11.0, 6.0, vLake), rampDepth));
          // Wave faces: troughs darker, crests lighter (what a pixel resolves from the air).
          diffuseColor.rgb *= 1.0 + 0.55 * wSwell + 0.4 * wChop;
          // Clear shallows: the sandy bottom shows through the first couple of metres, lit by
          // caustics (the bright net two drifting noise fields make where they cross). Near the
          // camera only (the net is under a pixel beyond ~300 m).
          float see = (1.0 - smoothstep(0.0, mix(2.4, 1.0, murk), waterDepth)) * mix(0.8, 0.5, murk);
          if (see > 0.0) {
            vec3 bed = mix(vec3(0.62, 0.52, 0.34), vec3(0.3, 0.27, 0.17), murk);
            float cNear = 1.0 - smoothstep(120.0, 320.0, wDist);
            if (cNear > 0.0) {
              vec2 cp = vMapUv * ${(WORLD_SIZE * 0.9).toFixed(1)};
              float c1 = wNoise(cp + uTime * vec2(0.16, 0.09));
              float c2 = wNoise(cp * 1.37 - uTime * vec2(0.1, 0.17) + 7.3);
              float net = clamp(1.0 - abs(c1 - c2) * 5.0, 0.0, 1.0);
              bed *= 1.0 + 0.85 * net * net * cNear * smoothstep(0.05, 0.5, waterDepth);
            }
            // (Tinted by the water over it.)
            diffuseColor.rgb = mix(diffuseColor.rgb, bed * mix(vec3(1.0), shallow * 2.0, 0.35), see);
          }
        }`,
      )
      // Still ripples: a little noise in the normal breaks up the sun's reflection.
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          // Ripples fade with distance (they would only shimmer); chop and swell tilt the
          // surface out to the haze, so the sun's glint and the sky's reflection break up.
          vec3 rip = vec3(wRipple * 0.05 + wChop * 0.08, 0.0, (wChop - wRipple) * 0.06) * wNear;
          rip += vec3(wSwell * 0.07 + wChop * 0.03, 0.0, wSwell * 0.05 - wChop * 0.03) * (1.0 - 0.6 * wNear);
          normal = normalize(normal + (viewMatrix * vec4(rip, 0.0)).xyz);
        }`,
      )
      // The sky's reflection (owner's H1Z1 reference): steel blue looking down, the horizon haze
      // at grazing angles, so the far sea meets the sky without a dark band.
      .replace(
        "#include <fog_fragment>",
        `{
          vec3 toEye = normalize(vViewPosition);
          float cosV = clamp(dot(normal, toEye), 0.0, 1.0);
          float fres = 0.04 + 0.96 * pow(1.0 - cosV, 5.0);
          // Shallows show the bottom more than the sky.
          float bottom = 1.0 - smoothstep(0.0, 2.5, waterDepth);
          float film = 1.0 - smoothstep(0.0, 0.5, waterDepth);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSky * 0.92, clamp(0.22 + fres - 0.2 * bottom, 0.0, 0.9) * (1.0 - 0.7 * film));
          // Sun glitter (2026-11-12 references): a path of sparkles on the water under the sun,
          // from its mirror point out to the horizon (waves tilted towards the eye carry it
          // far, so it falls off slowly beyond the mirror point and quickly short of it).
          // Inside the path a drifting noise field's peaks flash; the field's cells double
          // with each doubling of the distance, so sparkles stay a few pixels wide to the
          // horizon and never shimmer below a pixel.
          vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          vec3 sunV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
          float eyeUp = dot(toEye, upV);
          vec3 eyeFlat = toEye - eyeUp * upV;
          vec3 sunFlat = sunV - uSunDir.y * upV;
          float facing = max(dot(normalize(-eyeFlat), normalize(sunFlat)) + 0.05 * wChop, 0.0);
          float off = eyeUp - uSunDir.y;
          float lobe = pow(facing, 55.0) * exp(-off * off * (off > 0.0 ? 14.0 : 3.2));
          if (lobe > 0.004) {
            float lvl = log2(max(wDist, 5.0) / 5.0);
            float f = ${(WORLD_SIZE * 20).toFixed(1)} / exp2(floor(lvl));
            vec2 drift = uTime * vec2(1.6, 1.1);
            // (Two fields, the second turned and counter-drifting: one field's peaks sit on
            // its lattice and read as rows of dots from above.)
            vec2 gp = vMapUv * f, gq = mat2(0.8, -0.6, 0.6, 0.8) * gp * 1.31;
            float sp = mix(
              wNoise(gp + drift) + wNoise(gq - drift),
              wNoise(gp * 0.5 + drift) + wNoise(gq * 0.5 - drift),
              fract(lvl)) * 0.5;
            float glint = smoothstep(0.74 - 0.38 * lobe, 0.82, sp + 0.15 * wChop) * sqrt(lobe);
            gl_FragColor.rgb += vec3(1.0, 0.93, 0.78) * glint * 2.8 * (1.0 - film);
          }
          // Where it meets the land (2026-11-12 references): a pale wash over the last of the
          // depth and a line of foam that laps in and out along the bank, broken by noise.
          if (waterDepth < 1.1) {
            vec2 wp = vMapUv * ${WORLD_SIZE.toFixed(1)};
            float broken = wNoise(wp * 0.34) * 0.6 + wNoise(wp * 0.09 + 3.0) * 0.4;
            float lap = 0.5 + 0.5 * sin(uTime * 0.7 + broken * 9.0);
            float line = 1.0 - smoothstep(0.0, 0.22, abs(waterDepth - (0.3 + 0.28 * lap)));
            float wash = (1.0 - smoothstep(0.1, 1.0, waterDepth)) * 0.3;
            float foam = clamp(line * smoothstep(0.3, 0.6, broken) * 0.75 + wash, 0.0, 1.0);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uSky, vec3(1.0), 0.55) * 1.1, foam * mix(1.0, 0.85, vLake));
          }
        }
        #include <fog_fragment>`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        // Fixed mask mip: camera distance must not change which bank belongs to a lake.
        if (vLake > 0.5 && textureLod(uCoverB, vMapUv, 0.0).a < 0.35) discard;
        if (all(greaterThanEqual(vMapUv, vec2(0.0))) && all(lessThanEqual(vMapUv, vec2(1.0)))) {
          wDepth = vWaterY - groundAt(vMapUv);
          float depth = wDepth - 0.02;
          if (depth <= 0.0) discard;
          diffuseColor.a *= smoothstep(0.0, max(fwidth(depth), 0.02), depth);
        }`,
      );
  };
  material.customProgramCacheKey = () => `br-water-v5-${ground ? "depth" : "flat"}`;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "br-water";
  // The waves' clock (seconds, wrapped so the shader's floats stay precise).
  mesh.onBeforeRender = () => {
    time.value = (performance.now() / 1000) % 3600;
  };
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
