import * as THREE from "three";

/** Numbers kept per live splash. */
const N = 6;
/** How long a splash lasts (s). */
const LIFE_S = 0.95;

/**
 * Where swimmers' hands break the water (swim-stroke.ts): a burst of foam that fades as
 * ripples spread from it on the surface (owner, 2026-11-22: "water splash/waves effect on the water from
 * the arms/gloves"). One instanced, unlit quad lying on the water for all of them: one draw call
 * while anyone's hand has just gone in or come out, none otherwise; nothing is simulated.
 */
export function createSwimSplash(scene: THREE.Scene, max = 24) {
  const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const life = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  life.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aLife", life);
  // (A basic material with the pattern put into it, not a shader of its own: the renderer's
  // depth mode, fog and output colour come with it.)
  const material = new THREE.MeshBasicMaterial({
    color: 0xeaf4ff,
    transparent: true,
    depthWrite: false,
    // (The water's own sheet is pulled toward the eye a little, water.ts: these lie on it.)
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute vec3 aLife;
        varying vec2 vSplashUv;
        varying vec3 vLife;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vSplashUv = uv;
        vLife = aLife;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec2 vSplashUv;
        varying vec3 vLife;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          vec2 p = (vSplashUv - 0.5) * 2.0;
          float r = length(p);
          float t = vLife.x;
          // Broken foam where the hand went in (a few lobes round the middle, gone in under
          // half the time), then ripples running out from it, lower and fainter as they go.
          // Each ripple is a light crest with a dark trough behind it: under a bright sky the
          // water mirrors white, and a white ring alone does not show on it.
          // (Uneven round its edge, each one differently; a hand let down gently, as when
          // treading water, makes the ripples without the foam.)
          float th = atan(p.y, p.x);
          float edge =
            0.7 + 0.13 * sin(th * 2.0 + vLife.z) + 0.1 * sin(th * 5.0 - vLife.z * 1.7) +
            0.07 * sin(th * 9.0 + vLife.z * 2.3);
          float foam =
            (1.0 - smoothstep(0.0, 0.4 * edge, r)) *
            (1.0 - smoothstep(0.05, 0.45, t)) *
            smoothstep(0.45, 0.8, vLife.y) *
            0.6;
          float fade = (1.0 - t) * (1.0 - t);
          float at = 0.2 + 0.7 * t;
          float crest = (1.0 - smoothstep(0.0, 0.05, abs(r - at))) * fade;
          float trough = (1.0 - smoothstep(0.0, 0.09, abs(r - at + 0.1))) * fade;
          float inner = (1.0 - smoothstep(0.0, 0.04, abs(r - at * 0.55))) * fade * t;
          float innerTrough = (1.0 - smoothstep(0.0, 0.07, abs(r - at * 0.55 + 0.08))) * fade * t;
          float light = min(1.0, foam + crest * 0.75 + inner * 0.5);
          float dark = min(1.0, trough * 0.55 + innerTrough * 0.35);
          float a = max(light, dark) * (1.0 - smoothstep(0.9, 1.0, r));
          if (a < 0.01) discard;
          diffuseColor.rgb = mix(vec3(0.04, 0.1, 0.16), diffuseColor.rgb, light / max(light + dark, 0.001));
          diffuseColor.a *= a * min(1.0, vLife.y);
        }`,
      );
  };
  const mesh = new THREE.InstancedMesh(geometry, material, max);
  mesh.name = "swim-splash";
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.count = 0;
  mesh.renderOrder = 2;
  scene.add(mesh);
  // Live splashes, packed: [x, y, z, age (s), strength, seed] each.
  const live = new Float32Array(max * N);
  let count = 0;
  const m = new THREE.Matrix4();
  return {
    /** A hand through the surface at (x, z), the water at `y`; `strength` 0–1 (its size too). */
    add(x: number, y: number, z: number, strength: number) {
      // (Full: the oldest gives way.)
      if (count === max) {
        live.copyWithin(0, N, count * N);
        count--;
      }
      live.set([x, y + 0.02, z, 0, strength, (x * 12.9898 + z * 78.233) % 6.2832], count++ * N);
    },
    update(dtMs: number) {
      if (!count) {
        mesh.visible = false;
        return;
      }
      const dt = Math.min(0.1, dtMs / 1000);
      let kept = 0;
      for (let i = 0; i < count; i++) {
        const o = i * N,
          age = live[o + 3]! + dt;
        if (age >= LIFE_S) continue;
        const k = kept * N;
        if (k !== o) live.copyWithin(k, o, o + N);
        live[k + 3] = age;
        const t = age / LIFE_S,
          s = live[k + 4]!,
          size = (0.5 + 1.1 * t) * (0.6 + 0.4 * s);
        m.makeScale(size, 1, size).setPosition(live[k]!, live[k + 1]!, live[k + 2]!);
        mesh.setMatrixAt(kept, m);
        life.setXYZ(kept, t, s, live[k + 5]!);
        kept++;
      }
      count = kept;
      mesh.count = kept;
      mesh.visible = kept > 0;
      if (kept) {
        mesh.instanceMatrix.needsUpdate = true;
        life.needsUpdate = true;
      }
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
