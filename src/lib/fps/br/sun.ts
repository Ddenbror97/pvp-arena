import * as THREE from "three";

/**
 * Project Island's sun (owner, 2026-11-12: "Upgrade the sun and the water reflection for the
 * battle royale. ensure keep GPU/FPS optimizated", with a checklist: a sun that looks bright and
 * natural, sky gradients from scattering, a glitter path that follows the sun's real direction,
 * sky and water sharing their lighting).
 *
 * ONE definition of where the sun is and what its light looks like, used by the scene's light
 * (br-arena.ts), the sky (atmosphere.ts) and the water (water.ts). Before, each had its own
 * copy of the bearing and its own colour, and the water mirrored one flat sky colour whatever
 * way a wave faced.
 *
 * The sky is not a simulation. A real atmosphere is an integral along every view ray; what it
 * produces at a fixed time of day is a smooth function of two angles (the height above the
 * horizon and the angle from the sun), and that function is written out here directly: the
 * blue deepening away from the horizon (Rayleigh), the white-warm halo round the sun and the
 * brighter haze under it (Mie). It costs a dozen arithmetic operations and no texture, so the
 * water can afford to evaluate it too, in the direction each wave mirrors.
 */
export const BR_SUN = {
  /** Compass bearing of the sun (degrees from +z towards +x) and its height over the horizon
   * (degrees). The island's light has always come from here ((-0.55, 0.62, 0.45)). */
  azimuth: -50.71,
  elevation: 41.1,
} as const;

export type SunLook = {
  /** Towards the sun (unit, world). */
  direction: THREE.Vector3;
  /** The sunlight on the ground (the directional light's colour) and its strength. */
  light: THREE.Color;
  intensity: number;
  /** The sun's disc and glare in the sky, and its mirror image on the water (linear, HDR). */
  glow: THREE.Color;
  /** The horizon's haze under the sun (warmer and brighter than the haze elsewhere). */
  warmHaze: THREE.Color;
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The sun at a bearing and a height. Low suns are warmer and weaker: their light crosses more
 * air, which takes the blue out first (the optical path grows as 1 / sin(elevation), and each
 * channel fades with its own strength).
 */
export function sunLook(
  azimuth: number = BR_SUN.azimuth,
  elevation: number = BR_SUN.elevation,
): SunLook {
  const az = (azimuth * Math.PI) / 180,
    el = (Math.max(1, Math.min(90, elevation)) * Math.PI) / 180;
  const direction = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  );
  // Air crossed, relative to the sun overhead (capped: the flat-earth formula runs away low).
  const air = Math.min(12, 1 / Math.sin(el));
  const through = (k: number) => Math.exp(-k * (air - 1));
  // Red, green and blue lose 2 %, 6 % and 14 % per extra air mass.
  const tint = new THREE.Color(through(0.02), through(0.06), through(0.14));
  const high = Math.sin(el);
  return {
    direction,
    // (At the island's 41° these come out as the light it has always had: 0xfff0d8 at 2.4.)
    light: new THREE.Color(1.0, 0.895, 0.74).multiply(tint),
    intensity: mix(1.0, 2.4, Math.min(1, high / 0.65)),
    glow: new THREE.Color(1.0, 0.95, 0.86).multiply(tint),
    warmHaze: new THREE.Color(0.93, 0.87, 0.78).multiply(tint).multiplyScalar(mix(0.9, 1.06, high)),
  };
}

/**
 * The sky's colour in a direction (GLSL, linear, before tone mapping), shared by the sky's own
 * shader and the water's mirror. Needs the uniforms of `skyUniforms`.
 *
 * - `brSky(d)`: the air itself. A haze band at the horizon thinning into the upper sky and the
 *   zenith; the blue deeper at right angles to the sun and paler towards it; the haze warmer
 *   and brighter under the sun; a broad halo round the sun.
 * - `brSunGlare(d)`: the glare close round the sun (three lobes, from a degree out to twenty).
 * - `brSunDisc(d)`: the disc itself, far brighter than anything else in the frame (the tone
 *   mapping rolls it to white with a warm rim), its edge a little darker than its middle.
 */
export const SKY_GLSL = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uUpper;
  uniform vec3 uHaze;
  uniform vec3 uWarmHaze;
  uniform vec3 uSunDir;
  uniform vec3 uSunGlow;
  vec3 brSky(vec3 d) {
    float h = max(d.y, 0.0);
    float s = dot(d, uSunDir);
    float toward = max(s, 0.0);
    // The haze under the sun: warm and bright near its bearing, the plain haze elsewhere.
    float under = max(dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz)), 0.0);
    vec3 haze = mix(uHaze, uWarmHaze, under * under * under * 0.7);
    vec3 c = mix(haze, uUpper, smoothstep(0.0, 0.16, h));
    c = mix(c, uZenith, smoothstep(0.12, 0.75, h));
    // Scattered blue is strongest at right angles to the sun: a deeper sky away from it, a
    // paler one towards it (the phase function's 1 + cos², folded into the gradient).
    c *= mix(1.0, 0.86 + 0.2 * s * s, smoothstep(0.1, 0.6, h));
    // The halo: forward-scattered sunlight, wide and soft.
    c += uSunGlow * (pow(toward, 8.0) * 0.1 + pow(toward, 3.0) * 0.045 * (1.0 - smoothstep(0.0, 0.35, h)));
    return c;
  }
  vec3 brSunGlare(vec3 d) {
    float s = max(dot(d, uSunDir), 0.0);
    return uSunGlow * (pow(s, 2200.0) * 5.0 + pow(s, 260.0) * 0.75 + pow(s, 40.0) * 0.16);
  }
  vec3 brSunDisc(vec3 d) {
    // 0.8° across (a little over the real 0.53°, as cameras and eyes see it).
    float s = dot(d, uSunDir);
    float edge = smoothstep(0.999969, 0.99998, s);
    float limb = 0.6 + 0.4 * smoothstep(0.999969, 0.999997, s);
    return uSunGlow * edge * limb * 60.0;
  }
  // Fair-weather clouds: a thin layer high over the island, drifting slowly. How much of the
  // sky a direction's cloud covers (0 … 1); \`fine\` adds the two small octaves that only read
  // looking at the sky itself (a mirror image on rippled water does not resolve them).
  uniform float uSkyTime;
  float brHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float brNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(brHash(i), brHash(i + vec2(1, 0)), u.x),
               mix(brHash(i + vec2(0, 1)), brHash(i + vec2(1, 1)), u.x), u.y);
  }
  vec2 brCloudAt(vec3 d) {
    return d.xz / (d.y + 0.14) * 1.25 + uSkyTime * vec2(0.0045, 0.0017);
  }
  float brCloudDensity(vec2 p, bool fine) {
    float n = brNoise(p) * 0.55 + brNoise(p * 2.13 + 3.7) * 0.3;
    if (fine) n += brNoise(p * 4.4 + 9.1) * 0.11 + brNoise(p * 9.1 + 1.3) * 0.05;
    else n += 0.08;
    return n;
  }
  float brCloudCover(float density, vec3 d) {
    // Thinning into the haze at the horizon (where the layer is seen edge on).
    return smoothstep(0.56, 0.8, density) * smoothstep(0.02, 0.16, d.y);
  }
`;

/** The clouds' clock (seconds, wrapped): the sky sets it each frame, the water's mirror image
 * reads the same value. */
export const skyClock = { value: 0 };

/** Sky colours (sRGB hex) from the zenith down to the haze the fog shares. */
export const SKY = { zenith: 0x4f83c2, upper: 0x8fb2d4, haze: 0xbccbd6 } as const;

export type SkyUniforms = Record<
  "uZenith" | "uUpper" | "uHaze" | "uWarmHaze" | "uSunDir" | "uSunGlow" | "uSkyTime",
  { value: THREE.Color | THREE.Vector3 | number }
>;

/** The uniforms SKY_GLSL reads, for a sun. */
export function skyUniforms(sun: SunLook = sunLook()): SkyUniforms {
  return {
    uZenith: { value: new THREE.Color(SKY.zenith) },
    uUpper: { value: new THREE.Color(SKY.upper) },
    uHaze: { value: new THREE.Color(SKY.haze) },
    uWarmHaze: { value: sun.warmHaze.clone() },
    uSunDir: { value: sun.direction.clone() },
    uSunGlow: { value: sun.glow.clone() },
    uSkyTime: skyClock,
  };
}
