import * as THREE from "three";

/**
 * Ambient FROSTLINE snowfall: one bounded point cloud, animated entirely in the vertex shader.
 *
 * - Bounded: SNOW_FLAKES points allocated once; nothing is created per frame.
 * - No CPU simulation and no renderer hook: `onBeforeRender` sets two uniforms (time, eye)
 *   from whichever camera draws it. Flakes fall and drift from their seed and wrap inside a
 *   box centred on the eye, so the cloud never empties and never respawns.
 * - Little overdraw: 1–3.5 px round sprites, no depth writes, faded out within 1.5 m of the eye
 *   (never across the sights) and beyond 16 m (the far courtyard stays clean for duels).
 * - Not in the reflection capture (cube-face cameras draw nothing), the weapon pass (layer 0
 *   only) or the shadow map (no casting).
 * - Self-scaling: if frames run slower than ~50 fps for two seconds, half the pool is drawn;
 *   it returns to the full pool after five seconds of fast frames.
 */
export const SNOW_FLAKES = 1800;
const BOX = new THREE.Vector3(34, 16, 34);

export function createSnowfall(scene: THREE.Scene) {
  const seeds = new Float32Array(SNOW_FLAKES * 3),
    traits = new Float32Array(SNOW_FLAKES * 2);
  // Deterministic low-discrepancy fill (identical in every client and capture).
  for (let i = 0; i < SNOW_FLAKES; i++) {
    seeds[i * 3] = (i * 0.618034) % 1;
    seeds[i * 3 + 1] = (i * 0.754878) % 1;
    seeds[i * 3 + 2] = (i * 0.56984) % 1;
    traits[i * 2] = (i * 0.414214) % 1; // size and fall speed
    traits[i * 2 + 1] = (i * 0.302776) % 1; // drift phase
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute("trait", new THREE.BufferAttribute(traits, 2));
  const uniforms = {
    time: { value: 0 },
    eye: { value: new THREE.Vector3() },
    box: { value: BOX.clone() },
    pixelScale: { value: 600 },
    visible: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec2 trait;
      uniform float time, pixelScale, visible;
      uniform vec3 eye, box;
      varying float vAlpha;
      void main() {
        float speed = 0.75 + trait.x * 0.7;
        vec3 p = position * box;
        p.y -= time * speed;
        p.x += sin(time * 0.6 + trait.y * 6.2831) * 0.45 + time * 0.35;
        p.z += cos(time * 0.45 + trait.y * 6.2831) * 0.35 + time * 0.12;
        // Wrap into a box centred on the eye: the cloud travels with the camera.
        vec3 world = eye + mod(p - eye + box * 0.5, box) - box * 0.5;
        vec4 view = modelViewMatrix * vec4(world, 1.0);
        float d = -view.z;
        vAlpha = visible * smoothstep(1.5, 3.0, d) * (1.0 - smoothstep(11.0, 16.0, d)) * (0.45 + 0.35 * trait.x);
        gl_PointSize = clamp((0.022 + 0.018 * trait.x) * pixelScale / max(d, 0.1), 1.0, 3.5);
        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = dot(c, c);
        if (r > 0.25 || vAlpha < 0.01) discard;
        gl_FragColor = vec4(0.96, 0.97, 1.0, vAlpha * (1.0 - r * 3.2));
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "snowfall";
  points.frustumCulled = false;
  points.matrixAutoUpdate = false;
  points.castShadow = points.receiveShadow = false;
  points.renderOrder = 2;
  let last = 0,
    slowFor = 0,
    fastFor = 0,
    drawn = SNOW_FLAKES;
  const size = new THREE.Vector2();
  points.onBeforeRender = (renderer, _scene, camera) => {
    // Cube-face cameras (PMREM reflection capture, CubeCamera) are square and ±90°: draw nothing.
    const cube =
      camera instanceof THREE.PerspectiveCamera &&
      Math.abs(camera.fov) === 90 &&
      camera.aspect === 1;
    uniforms.visible.value = cube ? 0 : 1;
    if (cube) return;
    const now = performance.now();
    uniforms.time.value = (now % 600_000) / 1000;
    camera.getWorldPosition(uniforms.eye.value);
    if (camera instanceof THREE.PerspectiveCamera) {
      renderer.getDrawingBufferSize(size);
      uniforms.pixelScale.value = size.y / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    }
    const dt = last ? now - last : 0;
    last = now;
    if (dt > 0 && dt < 500) {
      if (dt > 20) {
        slowFor += dt;
        fastFor = 0;
      } else if (dt < 17) {
        fastFor += dt;
        slowFor = 0;
      }
      const next = slowFor > 2000 ? SNOW_FLAKES / 2 : fastFor > 5000 ? SNOW_FLAKES : drawn;
      if (next !== drawn) {
        drawn = next;
        geometry.setDrawRange(0, drawn);
        slowFor = fastFor = 0;
      }
    }
  };
  scene.add(points);
  return {
    points,
    stats: () => ({ drawn, pool: SNOW_FLAKES }),
    dispose() {
      points.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
