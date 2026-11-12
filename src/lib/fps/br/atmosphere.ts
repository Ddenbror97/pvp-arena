import * as THREE from "three";
import { SKY, SKY_GLSL, skyClock, skyUniforms, sunLook, type SunLook } from "./sun";

/**
 * Project Island's sky (owner's H1Z1 reference, 2026-11-05): a gradient sky with a sun glow and
 * a ring of distant snow-capped mountain ranges on the mainland across the sea, fading into the
 * horizon haze that the fog shares, so far land, the sea and the sky meet in one haze instead of
 * a flat blue backdrop with a hard edge.
 *
 * Cheap by design: two draws (the sky, the ranges), a few thousand triangles, no textures, no
 * per-frame work. Both sit at infinite distance (centred on the camera, depth pinned to the far
 * plane), so they never clip against the far plane and never parallax. They are drawn AFTER
 * the opaque world: the depth test then skips every pixel the land, sea or a building already
 * covers, so the sky shades only the sky that shows instead of the whole screen.
 */
export type Atmosphere = {
  root: THREE.Object3D;
  /** The horizon haze colour: the fog uses it so distant land fades into the sky. */
  haze: THREE.Color;
  dispose(): void;
};

/** The haze at the horizon (sRGB): the fog's colour (sun.ts has the rest of the sky). */
export const HAZE = SKY.haze;
/** Distant ranges: the rock, its shaded faces and snow, before haze. */
const ROCK = 0x76808c;
const ROCK_SHADE = 0x4c5561;
const SNOW = 0xf1f5f8;

const linear = (hex: number) => new THREE.Color(hex);

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    // Infinitely far: rotate with the camera only, and pin the depth to the far plane (depth 0
    // with reversed-Z, scene-target.ts; depth 1 otherwise).
    vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    #ifdef USE_REVERSED_DEPTH_BUFFER
    gl_Position = vec4(p.xy, 0.0, p.w);
    #else
    gl_Position = p.xyww;
    #endif
  }
`;

/**
 * The sky (2026-11-12: sun.ts's scattering, a real sun and a thin layer of cloud). Still one
 * draw over the pixels the world leaves open, with no texture: the air's gradient is a dozen
 * operations, the clouds six noise lookups where there is sky above the horizon.
 */
const skyFragment = /* glsl */ `
  ${SKY_GLSL}
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 c = brSky(d);
    vec3 sun = brSunGlare(d) + brSunDisc(d);
    if (d.y > 0.02) {
      vec2 p = brCloudAt(d);
      float density = brCloudDensity(p, true);
      float cover = brCloudCover(density, d);
      if (cover > 0.0) {
        // Lit from the sun's side: thinner towards the sun means its light comes through.
        float toSun = brCloudDensity(p + normalize(uSunDir.xz) * 0.16, false);
        float lit = clamp(0.62 + (density - toSun) * 2.2, 0.0, 1.0);
        vec3 shade = mix(uUpper, vec3(0.62, 0.66, 0.72), 0.55);
        vec3 cloud = mix(shade, vec3(1.0, 0.99, 0.96) + uSunGlow * 0.12, lit);
        // A bright rim where a thin edge stands in front of the sun's glare.
        float near = pow(max(dot(d, uSunDir), 0.0), 14.0);
        cloud += uSunGlow * near * (1.0 - cover) * 1.6;
        // Far cloud takes the haze's colour, as far land does.
        cloud = mix(mix(uHaze, uWarmHaze, 0.3), cloud, smoothstep(0.02, 0.3, d.y));
        c = mix(c, cloud, cover * 0.9);
        sun *= 1.0 - 0.85 * cover;
      }
    }
    gl_FragColor = vec4(c + sun, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const rangeVertex = /* glsl */ `
  attribute float aShade;
  attribute float aLayer;
  attribute float aAngle;
  varying float vShade;
  varying float vLayer;
  varying float vAngle;
  varying float vElev;
  void main() {
    vShade = aShade;
    vLayer = aLayer;
    vAngle = aAngle;
    vElev = normalize(position).y;
    vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
    // Just in front of the far plane (behind anything at any real distance), so the sky
    // drawn after the ranges leaves them in place.
    #ifdef USE_REVERSED_DEPTH_BUFFER
    gl_Position = vec4(p.xy, p.w * 1e-9, p.w); // reversed: 1e-6 would be only ~12 km away
    #else
    gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
    #endif
  }
`;

const rangeFragment = /* glsl */ `
  uniform vec3 uRock;
  uniform vec3 uRockShade;
  uniform vec3 uSnow;
  uniform vec3 uHaze;
  varying float vShade;
  varying float vLayer;
  varying float vAngle;
  varying float vElev;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float noise(float x) {
    float i = floor(x), f = fract(x);
    return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
  }
  void main() {
    // Lit and shaded mountainsides from the ridge slopes, broken up a little by gullies.
    float gully = noise(vAngle * 500.0);
    vec3 rock = mix(uRockShade, uRock, clamp(vShade * (0.9 + 0.2 * gully), 0.0, 1.0));
    // Snow above one line per range (in elevation, so neighbouring peaks agree), ragged with
    // the gullies and lower on the lit faces.
    float line = mix(0.05, 0.075, vLayer) + (gully - 0.5) * 0.012 - (vShade - 0.5) * 0.006;
    float snow = smoothstep(line, line + 0.004, vElev);
    vec3 c = mix(rock, uSnow * mix(0.8, 1.0, vShade), snow);
    // Aerial perspective: the far range is mostly haze, both fade into it toward the base.
    float haze = mix(0.2, 0.42, vLayer);
    // The foot of the ranges (and the low hills between them) is lost in the haze.
    haze = mix(1.0, haze, smoothstep(0.01, 0.035, vElev));
    gl_FragColor = vec4(mix(c, uHaze, haze), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Seeded smooth noise for the range profiles (repeatable: the same mountains every match). */
function profile(seed: number) {
  const r = (n: number) => {
    const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const smooth = (x: number, period: number) => {
    const i = Math.floor(x),
      f = x - i;
    const a = r(((i % period) + period) % period),
      b = r((((i + 1) % period) + period) % period);
    return a + (b - a) * f * f * (3 - 2 * f);
  };
  // Ridged fractal around the circle: sharp crests, broad valleys.
  return (t: number) => {
    let v = 0,
      amp = 1,
      freq = 9,
      norm = 0;
    // Three octaves: finer ones made needle peaks a column wide (white bars with snow on).
    for (let o = 0; o < 3; o++) {
      const n = 1 - Math.abs(smooth(t * freq, freq) * 2 - 1);
      v += n * n * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return v / norm;
  };
}

export function createAtmosphere(sun: SunLook = sunLook()): Atmosphere {
  const root = new THREE.Group();
  root.name = "br-atmosphere";
  const sunDir = sun.direction;
  const haze = linear(HAZE);

  // Sky: a low-poly sphere (only the direction matters).
  const skyGeometry = new THREE.SphereGeometry(1, 32, 16);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: { ...skyUniforms(sun), uHaze: { value: haze } },
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.name = "br-sky";
  sky.frustumCulled = false;
  sky.renderOrder = 1001;
  // The clouds' drift (seconds, wrapped so the shader's floats stay precise).
  sky.onBeforeRender = () => {
    skyClock.value = (performance.now() / 1000) % 7200;
  };

  // Ranges: two rings of ridge silhouettes, a nearer, darker one in front of a taller, hazier one.
  const COLUMNS = 960;
  const positions: number[] = [];
  const shade: number[] = [];
  const layer: number[] = [];
  const angle: number[] = [];
  const index: number[] = [];
  const sunAz = Math.atan2(sunDir.x, sunDir.z);
  const layers = [
    // [seed, peak elevation (rad), base elevation (rad), how much of the ring has mountains]
    { seed: 7, peak: 0.13, low: 0.02, cover: 0.85, far: 1 },
    { seed: 23, peak: 0.085, low: 0.008, cover: 0.7, far: 0 },
  ];
  const base = -0.08; // below the sea horizon from any height a player reaches
  for (const L of layers) {
    const p = profile(L.seed),
      gaps = profile(L.seed + 101);
    const height = (t: number) => {
      // Some stretches of the horizon are open sea or low hills.
      const g = Math.min(1, Math.max(0, (gaps(t * 0.35) - (1 - L.cover)) * 3));
      return L.low + (L.peak - L.low) * Math.pow(p(t), 1.3) * g;
    };
    const o = positions.length / 3;
    for (let i = 0; i <= COLUMNS; i++) {
      const t = i / COLUMNS,
        a = t * Math.PI * 2;
      const e = height(t);
      // Slope over several columns: whole mountainsides lit or shaded, not column stripes.
      const slope = (height(t + 6 / COLUMNS) - height(t - 6 / COLUMNS)) * (COLUMNS / 12);
      // Facing the sun when the ridge rises toward the sun's side of it.
      const toward = Math.sin(a - sunAz);
      const lit = 0.55 + Math.max(-0.3, Math.min(0.3, -slope * toward * 3));
      const sx = Math.sin(a),
        sz = Math.cos(a);
      for (const elev of [base, e]) {
        const c = Math.cos(elev);
        positions.push(sx * c, Math.sin(elev), sz * c);
        shade.push(lit);
        layer.push(L.far);
        angle.push(t);
      }
      if (i < COLUMNS) {
        const k = o + i * 2;
        // Facing the centre (seen from inside the ring).
        index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
  }
  const rangeGeometry = new THREE.BufferGeometry();
  rangeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  rangeGeometry.setAttribute("aShade", new THREE.Float32BufferAttribute(shade, 1));
  rangeGeometry.setAttribute("aLayer", new THREE.Float32BufferAttribute(layer, 1));
  rangeGeometry.setAttribute("aAngle", new THREE.Float32BufferAttribute(angle, 1));
  rangeGeometry.setIndex(index);
  const rangeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uRock: { value: linear(ROCK) },
      uRockShade: { value: linear(ROCK_SHADE) },
      uSnow: { value: linear(SNOW) },
      uHaze: { value: haze },
    },
    vertexShader: rangeVertex,
    fragmentShader: rangeFragment,
    side: THREE.DoubleSide,
    // Writes depth just short of the far plane: the sky after it then skips its pixels.
    depthWrite: true,
    fog: false,
  });
  const ranges = new THREE.Mesh(rangeGeometry, rangeMaterial);
  ranges.name = "br-ranges";
  ranges.frustumCulled = false;
  // The near layer was pushed last, so it draws over the far one (the same depth: LessEqual).
  ranges.renderOrder = 1000;

  root.add(sky, ranges);
  root.updateMatrixWorld(true);
  return {
    root,
    haze,
    dispose() {
      skyGeometry.dispose();
      skyMaterial.dispose();
      rangeGeometry.dispose();
      rangeMaterial.dispose();
    },
  };
}
