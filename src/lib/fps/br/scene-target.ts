import * as THREE from "three";
import { SHARPEN, SHARPEN_WEIGHT_GLSL } from "./sharpen";

/**
 * Depth for a 14 km world with a 10 cm near plane, without logarithmic depth (2026-11-09).
 *
 * `logarithmicDepthBuffer` makes every fragment shader write gl_FragDepth, which turns off the
 * GPU's early depth test: every hidden fragment of terrain, buildings and foliage is shaded in
 * full before it is thrown away. Reversed-Z with a 32-bit float depth buffer gives better
 * precision at every distance and keeps early-Z. The canvas' own depth buffer is 24-bit
 * integer (reversed-Z gains nothing there), so the scene is drawn into an offscreen target —
 * 4× MSAA as the canvas had, half-float colour, float depth — and one fullscreen pass applies
 * the renderer's tone mapping, exposure and sRGB output to the canvas, as the materials did
 * before.
 *
 * three flips polygon-offset factors itself under reversed-Z. Shaders that pin depth to the far
 * plane check USE_REVERSED_DEPTH_BUFFER (atmosphere.ts).
 *
 * Needs EXT_clip_control and a renderable half-float colour buffer (desktop Chrome, Edge and
 * Firefox); elsewhere `reversedDepthSupported()` is false and the arena keeps logarithmic
 * depth on the canvas, unchanged.
 *
 * THE DEFAULT since 2026-11-16, where the browser supports it. Measured on the owner's laptop
 * with the early-depth draw order (island-scene.ts setEarlyDepthOrder) and the sharpening in
 * the present pass, world only, 1632 × 918, 4× MSAA: GPU time per frame fell 23–50 % on foot
 * on the RTX 2050, and the whole frame fell from 40–65 ms to 16–30 ms on the Intel UHD chip
 * (claude/br-gpu-bench-early-depth-2026-11-16.md). Without that draw order it gains nothing:
 * the ground's shader is the dearest and three draws it first.
 *
 * It changes the far haze slightly. three mixes fog after tone mapping and sRGB encoding when
 * drawing to the canvas, so far geometry never quite reaches the background haze; here fog is
 * mixed in linear light before tone mapping, so the far field fades fully into the haze
 * (captures: the horizon band is 1–3 of 255 brighter). The weapon is sharpened with the rest
 * of the frame here (on the canvas path it is drawn after the sharpen).
 *
 * Back to logarithmic depth for one browser: localStorage "br-depth" = "log" (explorer:
 * ?depth=log).
 */
export function wantReversedDepth(optIn: boolean): boolean {
  return optIn && reversedDepthSupported();
}

/** The game's choice: reversed-Z unless localStorage "br-depth" = "log"; never throws. */
export function reversedDepthOptIn(): boolean {
  try {
    return localStorage.getItem("br-depth") !== "log";
  } catch {
    return true;
  }
}

export function reversedDepthSupported(): boolean {
  try {
    // The game's power preference: a low-power context first can pin a dual-GPU Mac to the
    // integrated GPU for the page.
    const gl = document
      .createElement("canvas")
      .getContext("webgl2", { powerPreference: "high-performance" });
    if (!gl) return false;
    const ok =
      !!gl.getExtension("EXT_clip_control") &&
      (!!gl.getExtension("EXT_color_buffer_float") ||
        !!gl.getExtension("EXT_color_buffer_half_float"));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export type SceneTarget = {
  /** Match the canvas' drawing buffer (call after renderer.setSize / setPixelRatio). */
  resize: () => void;
  /**
   * Tone-map the frame onto the canvas; the scene target stays bound for the next frame.
   * `sharpen`: the strength of sharpen.ts' pass, done here in the same pass (0: none). The
   * default path sharpens the finished canvas; without this the reversed-Z picture was the
   * softer of the two (EXPERIMENTAL, render audit 2026-11-15).
   */
  present: (sharpen?: number) => void;
  dispose: () => void;
};

/**
 * Bind an offscreen scene target to a renderer created with `reversedDepthBuffer: true`.
 * The target stays bound between frames, so shaders compiled anywhere (the precompile, the
 * context-loss recompile, the inventory portrait, which restores the previous target) get the
 * variant that renders into it, and no material recompiles on the first frame.
 */
export function createSceneTarget(renderer: THREE.WebGLRenderer, samples = 4): SceneTarget {
  const size = new THREE.Vector2();
  const depth = new THREE.DepthTexture(1, 1, THREE.FloatType);
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples,
    depthBuffer: true,
    stencilBuffer: false,
    depthTexture: depth,
    resolveDepthBuffer: false,
  });
  target.texture.colorSpace = THREE.LinearSRGBColorSpace;
  target.texture.generateMipmaps = false;
  target.texture.minFilter = target.texture.magFilter = THREE.NearestFilter;

  const material = new THREE.ShaderMaterial({
    name: "br-present",
    uniforms: {
      tScene: { value: target.texture },
      uTexel: { value: new THREE.Vector2(1, 1) },
      uSharpen: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene;
      uniform vec2 uTexel;
      uniform float uSharpen;
      varying vec2 vUv;
      ${SHARPEN_WEIGHT_GLSL}
      // A pixel as the canvas shows it: tone-mapped and encoded (sharpen.ts works on that).
      vec3 shown(vec2 uv) {
        vec4 c = texture2D(tScene, uv);
        #ifdef TONE_MAPPING
          c.rgb = toneMapping(c.rgb);
        #endif
        return linearToOutputTexel(c).rgb;
      }
      void main() {
        vec3 c = shown(vUv);
        if (uSharpen > 0.0) {
          vec3 n = shown(vUv + vec2(0.0, uTexel.y));
          vec3 s = shown(vUv - vec2(0.0, uTexel.y));
          vec3 e = shown(vUv + vec2(uTexel.x, 0.0));
          vec3 w = shown(vUv - vec2(uTexel.x, 0.0));
          vec3 lo = min(c, min(min(n, s), min(e, w)));
          vec3 hi = max(c, max(max(n, s), max(e, w)));
          vec3 margin = (hi - lo) * ${SHARPEN.overshoot.toFixed(2)};
          c = clamp(c + uSharpen * sharpenWeight(lo, hi) * (4.0 * c - n - s - e - w), lo - margin, hi + margin);
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const presentScene = new THREE.Scene();
  presentScene.add(quad);
  presentScene.matrixWorldAutoUpdate = false;
  const presentCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const resize = () => {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, size.x),
      h = Math.max(1, size.y);
    if (target.width === w && target.height === h) return;
    target.setSize(w, h);
    material.uniforms["uTexel"]!.value.set(1 / w, 1 / h);
    // setSize frees the framebuffer; binding again rebuilds it (three tracks the target as
    // bound, so without this the next frame would draw into a deleted framebuffer: black).
    if (renderer.getRenderTarget() === target) renderer.setRenderTarget(target);
  };
  resize();
  renderer.setRenderTarget(target);

  return {
    resize,
    present(sharpen = 0) {
      material.uniforms["uSharpen"]!.value = sharpen;
      renderer.setRenderTarget(null);
      renderer.render(presentScene, presentCamera);
      renderer.setRenderTarget(target);
    },
    dispose() {
      renderer.setRenderTarget(null);
      target.dispose();
      depth.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}
