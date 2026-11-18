import * as THREE from "three";
import type { Placement } from "./layout";

/**
 * Burning torches, braziers and campfires (owner, 2026-11-17: "faklor som vi kan sätta ut på
 * dom olika templen", "vill ha brinnande faklor … som sitter på walls inne i templet"): the
 * fire every placement of these models carries. The models stay static meshes (bracket, bowl,
 * logs); the fire is only drawn, never collides.
 *
 * Each fire is two tongues of flame (upright quads turned to the eye about the vertical, a
 * teardrop of rising noise: white-yellow core, orange body, red tips, swaying) and a soft glow
 * round it, all in one instanced draw. Added light (additive, brighter than 1 before tone
 * mapping), so a flame reads against a sunlit wall as well as in a dark tunnel: the 1v1/5v5
 * molotov's flames (grenade-world-view.ts), blended over the island's bright stone, all but
 * vanished (captures, 2026-11-17).
 *
 * Cheap at any count: the instances are fixed at load (no per-frame upload), the flicker and
 * the fade with distance (flames out by FLAME_FAR, glows a little later) run in the shader.
 * Where the device allows (not the performance tier) one point light follows the nearest fire
 * within LIGHT_REACH, flickering, so a tunnel's walls are lit warm round its torch.
 */

/**
 * Where a model burns, in model space: [x, y, z, size] (the flame stands `1.3 × size` high,
 * its base on the point).
 */
export const FLAMES: Record<string, ReadonlyArray<readonly [number, number, number, number]>> = {
  // The owner's wall torches (2026-11-17), their wall at −z: the cups on their heads (measured
  // on the processed LOD 0, height slices).
  "torch-medieval": [[0, 0.66, 0.09, 0.3]],
  "torch-holder": [[0, 0.67, 0.09, 0.3]],
  "torch-rusty": [[0, 0.64, 0.07, 0.3]],
  // The standing torch on its stake (1.9 m).
  "torch-stake": [[0, 1.86, 0, 0.34]],
  // The torch column's bowl (2.2 m), the brazier's (its rim ~1.2 m), the campfire's logs under
  // the pot, the lantern's wick (behind glass: small).
  "column-torch": [[0, 2.05, 0, 0.62]],
  brazier: [[0, 1.12, 0, 0.5]],
  campfire: [[0, 0.06, 0, 0.7]],
  "oil-lantern": [[0, 0.12, 0, 0.09]],
};

/** How far the glow sits off the model along +z (a wall torch's glow clear of its wall). */
const GLOW_OUT: Record<string, number> = {
  "torch-medieval": 0.3,
  "torch-holder": 0.3,
  "torch-rusty": 0.3,
};

const FLAME_FAR = 160,
  GLOW_FAR = 240,
  LIGHT_REACH = 16;

const turnXZ = (x: number, z: number, turn: number): [number, number] =>
  turn === 1 ? [z, -x] : turn === 2 ? [-x, -z] : turn === 3 ? [-z, x] : [x, z];

/** The fires of a layout, in world space: [x, y, z, size, glowX, glowZ] each. */
export function firePoints(layout: readonly Placement[]): Float32Array {
  const out: number[] = [];
  for (const p of layout) {
    const fl = FLAMES[p.model];
    if (!fl) continue;
    const g = GLOW_OUT[p.model] ?? 0;
    for (const [x, y, z, s] of fl) {
      const [dx, dz] = turnXZ(x, z, p.turn);
      const [gx, gz] = turnXZ(x, z + g, p.turn);
      out.push(p.x + dx, p.y + y, p.z + dz, s, p.x + gx, p.z + gz);
    }
  }
  return Float32Array.from(out);
}

const VERTEX = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iData; // size, seed, mode (0 flame, 1 glow), strength
uniform float uTime;
uniform vec3 uCamera;
varying vec2 vUv;
varying float vSeed;
varying float vMode;
varying float vAlpha;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  float size = iData.x;
  vSeed = iData.y;
  vMode = iData.z;
  vUv = uv;
  vec3 toCam = uCamera - iPos;
  float d = length(toCam);
  vec3 world;
  if (vMode < 0.5) {
    vAlpha = iData.w * (1.0 - smoothstep(${(FLAME_FAR * 0.75).toFixed(1)}, ${FLAME_FAR.toFixed(1)}, d));
    // Upright, turned to the eye about the vertical; the top sways, the whole breathes.
    vec3 flat_ = vec3(toCam.x, 0.0, toCam.z);
    vec3 right = normalize(vec3(flat_.z, 0.0, -flat_.x) + vec3(1e-4, 0.0, 0.0));
    float breath = 0.88 + 0.08 * sin(uTime * 2.3 + vSeed) + 0.06 * sin(uTime * 7.9 + vSeed * 2.1);
    float h = size * 1.3 * breath, w = size * 0.62;
    float t = position.y + 0.5;
    float sway = (sin(uTime * 5.3 + vSeed) * 0.6 + sin(uTime * 9.7 + vSeed * 1.7) * 0.4) * 0.08 * size;
    // A few centimetres toward the eye: never cut by the wall the torch hangs on.
    world = iPos + right * (position.x * w + sway * t * t) + vec3(0.0, t * h, 0.0)
      + normalize(flat_ + vec3(1e-4, 0.0, 0.0)) * min(0.06, d * 0.5);
  } else {
    vAlpha = iData.w * (1.0 - smoothstep(${(GLOW_FAR * 0.7).toFixed(1)}, ${GLOW_FAR.toFixed(1)}, d));
    // Facing the eye, larger far off (a point of light), pulled toward the eye so its wall does
    // not cut it.
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float s = size * (1.0 + min(1.6, d / 70.0));
    world = iPos + (right * position.x + up * position.y) * s + normalize(toCam) * min(s * 0.5, d * 0.5);
  }
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <logdepthbuf_vertex>
}
`;

const FRAGMENT = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
varying float vMode;
varying float vAlpha;
#include <logdepthbuf_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  #include <logdepthbuf_fragment>
  if (vAlpha <= 0.001) discard;
  vec3 color;
  float a;
  if (vMode < 0.5) {
    // Tongues of rising noise through a teardrop.
    float y = vUv.y, x = (vUv.x - 0.5) * 2.0;
    float n = noise(vec2(vUv.x * 3.5 + vSeed, y * 2.6 - uTime * 3.6)) * 0.6
            + noise(vec2(vUv.x * 7.0 - vSeed, y * 5.5 - uTime * 6.1)) * 0.4;
    float width = (1.0 - pow(y, 0.85)) * (0.72 + 0.5 * n) * smoothstep(0.0, 0.18, y + 0.04);
    float body = 1.0 - smoothstep(width * 0.45, width, abs(x + (n - 0.5) * 0.6 * y));
    float tip = 1.0 - smoothstep(0.45, 1.0, y + (n - 0.5) * 0.45);
    a = body * tip;
    float core = (1.0 - smoothstep(0.0, width * 0.55, abs(x))) * (1.0 - smoothstep(0.08, 0.55, y));
    color = mix(vec3(1.0, 0.62, 0.18), vec3(0.95, 0.22, 0.03), smoothstep(0.15, 0.85, y + n * 0.2));
    color = mix(color, vec3(1.0, 0.9, 0.62), core * 0.85);
    color *= 2.3;
  } else {
    float r = length(vUv - 0.5) * 2.0;
    a = pow(max(0.0, 1.0 - r), 2.4) * (0.85 + 0.15 * sin(uTime * 11.0 + vSeed * 3.0));
    color = vec3(1.0, 0.5, 0.16) * 1.4;
  }
  a *= vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(color, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createTorchFlames(
  scene: THREE.Scene,
  layout: readonly Placement[],
  { light = true }: { light?: boolean } = {},
) {
  const fires = firePoints(layout);
  const n = fires.length / 6;
  // Per fire: two tongues (the second smaller, a little aside) and the glow.
  const count = n * 3;
  const pos = new Float32Array(Math.max(1, count) * 3);
  const data = new Float32Array(Math.max(1, count) * 4);
  for (let i = 0; i < n; i++) {
    const o = i * 6,
      s = fires[o + 3]!,
      seed = (i * 13.7) % 89;
    const set = (
      k: number,
      x: number,
      y: number,
      z: number,
      size: number,
      mode: number,
      a: number,
      sd: number,
    ) => {
      pos.set([x, y, z], k * 3);
      data.set([size, sd, mode, a], k * 4);
    };
    set(i * 3, fires[o]!, fires[o + 1]!, fires[o + 2]!, s, 0, 1, seed);
    set(
      i * 3 + 1,
      fires[o]! + Math.sin(seed) * s * 0.1,
      fires[o + 1]!,
      fires[o + 2]! + Math.cos(seed) * s * 0.1,
      s * 0.68,
      0,
      0.9,
      seed + 5.3,
    );
    set(i * 3 + 2, fires[o + 4]!, fires[o + 1]! + s * 0.5, fires[o + 5]!, s * 2.4, 1, 0.42, seed);
  }
  const quad = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute("position", quad.getAttribute("position"));
  geometry.setAttribute("uv", quad.getAttribute("uv"));
  geometry.setAttribute("iPos", new THREE.InstancedBufferAttribute(pos, 3));
  geometry.setAttribute("iData", new THREE.InstancedBufferAttribute(data, 4));
  geometry.instanceCount = count;
  const uniforms = { uTime: { value: 0 }, uCamera: { value: new THREE.Vector3() } };
  const material = new THREE.ShaderMaterial({
    name: "br-torch-flame",
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    // Additive: the order of the two sides does not show, so one pass (blended-once.ts).
    forceSinglePass: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "br-torch-flames";
  mesh.frustumCulled = false;
  mesh.visible = count > 0;
  scene.add(mesh);
  const lamp = light ? new THREE.PointLight(0xff9a48, 0, 11, 2) : null;
  if (lamp) {
    lamp.name = "br-torch-light";
    scene.add(lamp);
  }
  const eye = uniforms.uCamera.value;
  return {
    /** How many fires the layout has. */
    count: n,
    mesh,
    update(now: number, camera: THREE.Camera) {
      const t = now / 1000;
      // (Wrapped: the noise's float precision holds for hours either way.)
      uniforms.uTime.value = t % 3600;
      eye.setFromMatrixPosition(camera.matrixWorld);
      if (!lamp) return;
      let best = LIGHT_REACH * LIGHT_REACH,
        near = -1;
      for (let i = 0; i < n; i++) {
        const o = i * 6;
        const dx = fires[o]! - eye.x,
          dy = fires[o + 1]! - eye.y,
          dz = fires[o + 2]! - eye.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < best) {
          best = d2;
          near = i;
        }
      }
      if (near < 0) {
        lamp.intensity = 0;
        return;
      }
      const o = near * 6;
      lamp.position.set(fires[o + 4]!, fires[o + 1]! + fires[o + 3]! * 0.6, fires[o + 5]!);
      const flick =
        0.82 +
        0.12 * Math.sin(t * 9.3) +
        0.08 * Math.sin(t * 23.1 + 1.7) +
        0.05 * Math.sin(t * 3.7);
      // Fades in as the fire comes within reach (no pop as the nearest one changes).
      const reach = 1 - Math.sqrt(best) / LIGHT_REACH;
      lamp.intensity = 7 * flick * Math.min(1, reach * 3) * (fires[o + 3]! / 0.5);
    },
    dispose() {
      geometry.dispose();
      quad.dispose();
      material.dispose();
      mesh.removeFromParent();
      lamp?.removeFromParent();
      lamp?.dispose();
    },
  };
}
