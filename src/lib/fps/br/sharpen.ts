import * as THREE from "three";

/**
 * A sharpening pass over the finished scene (owner, 2026-11-11: "still not good enough, the
 * parachute overview from 500 metres, the ground is still blurred").
 *
 * From 500 m a pixel covers half a metre to a metre of ground. No ground texture holds detail
 * at that size: what is on screen is the aerial colour map (2.4 m a texel, so every texel is
 * spread over three to five pixels) with grain over it, and that reads as soft however the
 * grain is tuned. The same holds for the ground far ahead on foot, and for a frame drawn at a
 * reduced resolution and stretched. What sharpens all three is what games ship for exactly
 * this (AMD's contrast-adaptive sharpening): each pixel is pushed away from the mean of its
 * four neighbours, and kept within a margin of their range so edges do not ring.
 *
 * The scene is drawn to the canvas exactly as before (same anti-aliasing, tone mapping and
 * fog); the canvas is then copied to a texture and drawn back sharpened. One copy and one
 * five-tap pass a frame. Nothing else changes: with the pass off the picture is the old one.
 */
export const SHARPEN = {
  /** How far a pixel is pushed from its neighbours' mean at full resolution. */
  strength: 0.4,
  /** The same when the frame is drawn below full resolution and stretched. */
  scaledStrength: 0.55,
  /** How far past its neighbours' range a pixel may go, as a share of that range. */
  overshoot: 0.35,
  /**
   * Contrast (the neighbours' luminance range, 0–1) over which sharpening fades out (owner,
   * 2026-11-18: "white items seems to flicker on distance eg: stripes on the airfield road,
   * white objects some part on white apartments from the parachute"). A bright line a pixel or
   * less wide (runway paint, a frame, a white wall's edge far off) moves between pixels as the
   * camera moves; pushed away from its neighbours too, each step was a flash. Measured on the
   * airfield's runway from 1.7 m, 0.5 cm steps: sharpening every pixel doubled the frame-to-frame
   * change on the far paint (0.77 against 0.45 of 255; its brightest flashes 13 against 8).
   * Faded out over this band: 0.60, flashes 8.4, and the ground keeps 84 % of the detail the
   * pass adds (fine detail, ground grain and the aerial map from the parachute, is low in
   * contrast and keeps its full sharpening).
   */
  edge: [0.05, 0.25],
} as const;

/** GLSL: the sharpening's weight at a pixel whose neighbours span lo..hi (contrast-adaptive). */
export const SHARPEN_WEIGHT_GLSL = /* glsl */ `
  float sharpenWeight(vec3 lo, vec3 hi) {
    float range = dot(hi - lo, vec3(0.299, 0.587, 0.114));
    return 1.0 - smoothstep(${SHARPEN.edge[0].toFixed(2)}, ${SHARPEN.edge[1].toFixed(2)}, range);
  }`;

/**
 * Foliage is left as it was drawn (owner, 2026-11-18: the trees' leaves "blinking" while
 * running or driving, at 60–150 m). A leaf a pixel or less across is cut from its card with soft
 * edges; a step moves it by a fraction of a pixel. The sharpening pushed each such pixel away
 * from its neighbours, which inside a crown (leaf against leaf, the low contrast it sharpens
 * fully) turned every fraction of a pixel into a flash: a third of the crowns' blinking
 * (headless, 10 cm a frame past broadleafs 80 m off). The trees and the grass mark their pixels
 * in the stencil (`markFoliage`), and the sharpening skips them. The canvas needs `stencil: true`.
 * (A pixel of a nearer building drawn over a tree after it keeps the mark and goes unsharpened:
 * a few pixels along the outline, the picture as it was before the pass.)
 */
export const FOLIAGE_STENCIL = 1;
export function markFoliage(material: THREE.Material) {
  material.stencilWrite = true;
  material.stencilRef = FOLIAGE_STENCIL;
  material.stencilFunc = THREE.AlwaysStencilFunc;
  material.stencilZPass = THREE.ReplaceStencilOp;
  material.stencilFail = THREE.KeepStencilOp;
  material.stencilZFail = THREE.KeepStencilOp;
  material.stencilWriteMask = FOLIAGE_STENCIL;
  material.stencilFuncMask = FOLIAGE_STENCIL;
}

/** The player's or tester's switch: localStorage "br-sharpen" = "off" (never throws). */
export function sharpenWanted(): boolean {
  try {
    return localStorage.getItem("br-sharpen") !== "off";
  } catch {
    return true;
  }
}

export type Sharpen = {
  /** Sharpen what is on the canvas now. Call after the scene pass, with no target bound. */
  apply: (strength?: number) => void;
  dispose: () => void;
};

export function createSharpen(renderer: THREE.WebGLRenderer): Sharpen {
  const size = new THREE.Vector2();
  let frame: THREE.FramebufferTexture | null = null;
  const material = new THREE.ShaderMaterial({
    name: "br-sharpen",
    uniforms: {
      tFrame: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uStrength: { value: SHARPEN.strength as number },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    // The canvas holds display-ready colour: it is read and written as it is (no tone mapping
    // or colour-space step here, or the picture would be encoded twice).
    fragmentShader: /* glsl */ `
      uniform sampler2D tFrame;
      uniform vec2 uTexel;
      uniform float uStrength;
      varying vec2 vUv;
      ${SHARPEN_WEIGHT_GLSL}
      void main() {
        vec3 c = texture2D(tFrame, vUv).rgb;
        vec3 n = texture2D(tFrame, vUv + vec2(0.0, uTexel.y)).rgb;
        vec3 s = texture2D(tFrame, vUv - vec2(0.0, uTexel.y)).rgb;
        vec3 e = texture2D(tFrame, vUv + vec2(uTexel.x, 0.0)).rgb;
        vec3 w = texture2D(tFrame, vUv - vec2(uTexel.x, 0.0)).rgb;
        vec3 lo = min(c, min(min(n, s), min(e, w)));
        vec3 hi = max(c, max(max(n, s), max(e, w)));
        vec3 margin = (hi - lo) * ${SHARPEN.overshoot.toFixed(2)};
        vec3 sharp = c + uStrength * sharpenWeight(lo, hi) * (4.0 * c - n - s - e - w);
        gl_FragColor = vec4(clamp(sharp, lo - margin, hi + margin), 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    // Not over foliage (markFoliage): those pixels keep the scene as it was drawn.
    stencilWrite: true,
    stencilRef: FOLIAGE_STENCIL,
    stencilFuncMask: FOLIAGE_STENCIL,
    stencilWriteMask: 0,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  scene.matrixWorldAutoUpdate = false;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    apply(strength = SHARPEN.strength) {
      renderer.getDrawingBufferSize(size);
      const w = Math.max(1, Math.floor(size.x)),
        h = Math.max(1, Math.floor(size.y));
      if (!frame || frame.image.width !== w || frame.image.height !== h) {
        frame?.dispose();
        frame = new THREE.FramebufferTexture(w, h);
        frame.minFilter = frame.magFilter = THREE.NearestFilter;
        frame.generateMipmaps = false;
        material.uniforms["tFrame"]!.value = frame;
        material.uniforms["uTexel"]!.value.set(1 / w, 1 / h);
      }
      material.uniforms["uStrength"]!.value = strength;
      renderer.copyFramebufferToTexture(frame);
      // Over the scene, without clearing it: the depth buffer stays for whatever draws next.
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = autoClear;
    },
    dispose() {
      frame?.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}
