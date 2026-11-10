import * as THREE from "three";

/**
 * Close-up surface grain for buildings (owner, 2026-11-09: houses and buildings should look
 * higher quality). A building's texture is about 1024 px for all its walls, 2–4 cm a texel:
 * sharp across the street, soft with your face at the wall. Within DETAIL.far metres a small
 * tiling grain texture, projected in world space along the wall's main axis, modulates the base
 * colour at two scales — fine grain and a wall-sized mottle — so the surface holds up at any
 * distance without a larger texture. Two fetches from one 256 px texture shared by every
 * building; no extra memory per model.
 *
 * Applied by the props renderer to the near LOD of the building classes only (walls, roofs,
 * fitted interiors); skipped on the low hardware tier.
 */
export const DETAIL = {
  /** Full strength within `near` m, gone by `far` m. */
  near: 7,
  far: 26,
  /** World metres per repeat of the fine grain and of the mottle. */
  fine: 1.1,
  coarse: 4.7,
  /** Colour modulation at full strength (± this share of the base colour). */
  fineStrength: 0.11,
  coarseStrength: 0.045,
} as const;

/** Classes whose near LOD gets the grain (props-renderer.ts RINGS). */
export const DETAIL_CLASSES = new Set(["dwelling", "building", "outbuilding", "hero", "structure"]);

const SIZE = 256;

/** Tileable value noise on a `cells`-wide lattice, bilinear with a smooth step. */
function valueNoise(cells: number, seed: number) {
  const lattice = new Float32Array(cells * cells);
  let s = seed >>> 0;
  for (let i = 0; i < lattice.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    lattice[i] = s / 4294967296;
  }
  return (u: number, v: number) => {
    const x = u * cells,
      y = v * cells;
    const x0 = Math.floor(x),
      y0 = Math.floor(y);
    const fx = x - x0,
      fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy);
    const at = (i: number, j: number) =>
      lattice[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)]!;
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

/**
 * The grain texture's pixels (RGBA, SIZE²): R the fine grain, G the mottle; both centred on
 * 0.5. Deterministic, so the look is the same for everyone and in every capture.
 */
export function detailPixels(): Uint8Array {
  const data = new Uint8Array(SIZE * SIZE * 4);
  const fine = [valueNoise(64, 11), valueNoise(128, 23)];
  const coarse = [valueNoise(4, 51), valueNoise(8, 67), valueNoise(16, 83)];
  const f = new Float32Array(SIZE * SIZE),
    c = new Float32Array(SIZE * SIZE);
  let s = 977,
    meanF = 0,
    meanC = 0;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE,
        v = y / SIZE,
        i = y * SIZE + x;
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const white = s / 4294967296;
      // Mostly texel-scale grain: at 1.1 m a repeat that is under a centimetre a texel.
      f[i] = 0.2 * fine[0]!(u, v) + 0.38 * fine[1]!(u, v) + 0.42 * white;
      c[i] = 0.55 * coarse[0]!(u, v) + 0.3 * coarse[1]!(u, v) + 0.15 * coarse[2]!(u, v);
      meanF += f[i]!;
      meanC += c[i]!;
    }
  meanF /= f.length;
  meanC /= c.length;
  // Centred exactly (a wall's mean colour must not shift) and stretched: sums of noise bunch up.
  const byte = (v: number) => Math.max(0, Math.min(255, Math.round((0.5 + v) * 255)));
  for (let i = 0; i < f.length; i++) {
    data[i * 4] = byte((f[i]! - meanF) * 2.0);
    data[i * 4 + 1] = byte((c[i]! - meanC) * 2.2);
    data[i * 4 + 2] = 128;
    data[i * 4 + 3] = 255;
  }
  return data;
}

export type BuildingDetail = {
  /** Whether a material can take the grain: opaque, not glowing, not bare metal. */
  suits: (material: THREE.Material) => boolean;
  /** Patch a material's shader (once; before its first use). */
  apply: (material: THREE.MeshStandardMaterial) => void;
  dispose: () => void;
};

export function createBuildingDetail(anisotropy = 4): BuildingDetail {
  const texture = new THREE.DataTexture(detailPixels(), SIZE, SIZE, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  const uniform = { value: texture };
  const patched = new WeakSet<THREE.Material>();
  const f = (n: number) => n.toFixed(3);
  return {
    suits(material) {
      const m = material as THREE.MeshStandardMaterial;
      return (
        m.isMeshStandardMaterial === true &&
        !m.transparent &&
        m.alphaTest <= 0 &&
        m.emissive.getHex() === 0 &&
        !m.emissiveMap &&
        m.metalness < 0.5
      );
    },
    apply(material) {
      if (patched.has(material)) return;
      patched.add(material);
      const previous = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        previous?.call(material, shader, renderer);
        shader.uniforms["uBrDetail"] = uniform;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vBrDetailPos;")
          .replace(
            "#include <project_vertex>",
            `#include <project_vertex>
            {
              vec4 brWorld = vec4(transformed, 1.0);
              #ifdef USE_INSTANCING
                brWorld = instanceMatrix * brWorld;
              #endif
              vBrDetailPos = (modelMatrix * brWorld).xyz;
            }`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nuniform sampler2D uBrDetail;\nvarying vec3 vBrDetailPos;",
          )
          .replace(
            "#include <map_fragment>",
            `#include <map_fragment>
            {
              // The wall's main axis from the surface itself (no normal attribute needed).
              vec3 brN = abs(normalize(cross(dFdx(vBrDetailPos), dFdy(vBrDetailPos))));
              vec2 brUv = brN.y > 0.6 ? vBrDetailPos.xz : brN.x > brN.z ? vBrDetailPos.zy : vBrDetailPos.xy;
              float brFine = texture2D(uBrDetail, brUv / ${f(DETAIL.fine)}).r - 0.5;
              float brCoarse = texture2D(uBrDetail, brUv / ${f(DETAIL.coarse)} + 0.37).g - 0.5;
              float brFade = 1.0 - smoothstep(${f(DETAIL.near)}, ${f(DETAIL.far)}, distance(vBrDetailPos, cameraPosition));
              diffuseColor.rgb *= 1.0 + brFade * (brFine * ${f(DETAIL.fineStrength * 2)} + brCoarse * ${f(DETAIL.coarseStrength * 2)});
            }`,
          );
      };
      const key = material.customProgramCacheKey;
      material.customProgramCacheKey = () => `${key.call(material)}|br-detail-v1`;
      material.needsUpdate = true;
    },
    dispose() {
      texture.dispose();
    },
  };
}
