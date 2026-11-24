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
  /** Footprints on the ground they lie on. */
  tracker: 4e-5,
  /** The water's surface where it meets the shore. */
  water: 1e-5,
} as const;

/**
 * A pull toward the eye that never draws over what stands on the surface (owner, 2026-11-24:
 * "next flimmer/flicker. the edges of the windows and the foundation of the apartmentbuildings.
 * issue only happends while running/moving not standing still").
 *
 * The road, lot and runway strips, the floor patches and the panorama glass were pulled
 * forward with a polygon offset (factor −2). A factor scales with the surface's depth slope on
 * screen, which at a grazing angle is huge: the pull came to about two pixels' worth of the
 * surface itself, at every distance. Seen from eye height that is 0.8 m of depth for a lot
 * 20 m away, so the lot was drawn over the bottom two pixels of every wall, kerb, car and door
 * standing on it; the panes' edge faces, always seen edge-on, came out of the jambs, sills and
 * heads round every window the same way. Which pixels it took changed with every step, so the
 * foundations and the window edges crawled while you moved, and stood still when you did.
 * Measured on the RTX 2050 (a Downtown tower's forecourt from 26 m): 146 pixels of the
 * building's foot and 433 round its windows drawn over.
 *
 * Here the surface is moved toward the eye along its own sight line, by `pull` × its distance
 * (`gl_Position` from the view-space position scaled by 1 − `pull`: the same place on screen,
 * nearer in depth), in every depth mode (reversed-Z, ordinary, logarithmic). Something that
 * stands on the surface loses to it only within `pull` × distance along the ray, which from
 * eye height is a hundredth of a pixel or less; the ground under the surface (centimetres
 * below, and nearly parallel) still loses everywhere. No polygon offset with it.
 *
 * Call it after the material's own `onBeforeCompile` and `customProgramCacheKey` are set: both
 * are kept and extended.
 */
export function pullDepth<T extends THREE.Material>(material: T, pull: number): T {
  const compile = material.onBeforeCompile;
  const key = material.customProgramCacheKey;
  material.polygonOffset = false;
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      if (!isOrthographic) gl_Position = projectionMatrix * vec4(mvPosition.xyz * ${(1 - pull).toFixed(7)}, 1.0);`,
    );
  };
  material.customProgramCacheKey = function () {
    return `${key.call(this)}|pull-${pull}`;
  };
  material.userData["depthPull"] = pull;
  return material;
}

/** The pulls in use (a share of the distance, towards the eye). */
export const DEPTH_PULL = {
  /**
   * Road, lot and runway strips and the floor patches over the ground (lifted 2–10 cm above it
   * as well): 1 cm at 20 m, 0.5 m at 1 km. Beats the terrain's coarser levels far off as the
   * polygon offset did (the same picture from the parachute over Downtown, RTX 2050).
   */
  paved: 5e-4,
  /** The panorama panes over the storeys' middle LODs, which draw glass in the same plane. */
  pane: 6e-5,
} as const;
