import type * as THREE from "three";

/**
 * A depth bias that works under the arena's logarithmic depth buffer (render audit 2026-11-15).
 *
 * With `logarithmicDepthBuffer` every fragment shader writes `gl_FragDepth` itself, and a
 * polygon offset only moves the depth the rasteriser interpolated, which is then thrown away:
 * `polygonOffset` does nothing there (measured: a face 0.5 mm behind another with an offset of
 * −2/−8 comes to the front under ordinary depth and stays hidden under logarithmic depth). The
 * panorama glass, the water's shore, the road strips and the tracker's footprints all asked for
 * one and never got it.
 *
 * The logarithmic depth is `log2(1 + w)`: scaling `1 + w` by `1 − bias` moves a surface the
 * same number of depth-buffer steps at every distance (about 1.76 million × `bias` of a 24-bit
 * buffer over the arena's 14 km), which is `bias` × its distance in metres towards the eye:
 * 6e-5 is 6 mm at 100 m and 6 cm at 1 km. Nothing moves on screen.
 *
 * Under reversed-Z (scene-target.ts) the materials' own polygon offsets work and this adds
 * nothing (the define is off). Call it after the material's own `onBeforeCompile` and
 * `customProgramCacheKey` are set: both are kept and extended.
 */
export function biasLogDepth<T extends THREE.Material>(material: T, bias: number): T {
  const compile = material.onBeforeCompile;
  const key = material.customProgramCacheKey;
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader.replace(
      "#include <logdepthbuf_vertex>",
      `#include <logdepthbuf_vertex>
      #ifdef USE_LOGARITHMIC_DEPTH_BUFFER
        vFragDepth *= ${(1 - bias).toFixed(7)};
      #endif`,
    );
  };
  material.customProgramCacheKey = function () {
    return `${key.call(this)}|log-bias-${bias}`;
  };
  material.userData["logDepthBias"] = bias;
  return material;
}

/** The biases in use (a share of the distance, towards the eye). */
export const LOG_BIAS = {
  /** The panorama panes over the storeys' far LODs, which draw glass in the same plane. */
  pane: 6e-5,
  /** Footprints on the ground they lie on. */
  tracker: 4e-5,
  /** Road, lot and runway strips over the ground. */
  road: 2e-5,
  /** The water's surface where it meets the shore. */
  water: 1e-5,
} as const;
