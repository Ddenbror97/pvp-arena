import * as THREE from "three";

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
 * OPT-IN for now (`wantReversedDepth`): it changes the far haze. three mixes fog after tone
 * mapping and sRGB encoding when drawing to the canvas, so far geometry never quite reaches
 * the background haze (a band at the horizon; the distant sea stays deep blue). Here fog is
 * mixed in linear light before tone mapping, as intended, so the far field fades fully into
 * the haze and reads hazier. The owner decides the look (and may retune the fog) after an
 * A/B on a real GPU: localStorage "br-depth" = "reversed", or ?depth=reversed in the explorer.
 */
export function wantReversedDepth(optIn: boolean): boolean {
  return optIn && reversedDepthSupported();
}

/** The game's opt-in (localStorage "br-depth" = "reversed"); never throws. */
export function reversedDepthOptIn(): boolean {
  try {
    return localStorage.getItem("br-depth") === "reversed";
  } catch {
    return false;
  }
}

export function reversedDepthSupported(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
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
  /** Tone-map the frame onto the canvas; the scene target stays bound for the next frame. */
  present: () => void;
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
    uniforms: { tScene: { value: target.texture } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(tScene, vUv);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
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
    // setSize frees the framebuffer; binding again rebuilds it (three tracks the target as
    // bound, so without this the next frame would draw into a deleted framebuffer: black).
    if (renderer.getRenderTarget() === target) renderer.setRenderTarget(target);
  };
  resize();
  renderer.setRenderTarget(target);

  return {
    resize,
    present() {
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
