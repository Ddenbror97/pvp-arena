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

/**
 * The steadying pass (2026-11-23; owner: "blinking/flicker … in the airplane/parachute", "the
 * render should be like call of duty no matter of what distance or attitude").
 *
 * From the air a tree, a fence, a roof's edge or a ground texel is about a pixel across, and
 * which pixel it lands on changes with every metre flown: 4× MSAA smooths an edge within one
 * frame but nothing ties one frame to the next, so the picture sparkles. Games that hold still
 * from the air blend each frame with the last one, moved to where it now belongs. This is that
 * blend, and no more than it:
 *
 *  - each pixel's place in the previous frame is found from its depth and the two cameras
 *    (the island does not move; there are no motion vectors);
 *  - the previous frame there (read with a sharp five-tap filter, so the picture does not go
 *    soft as it is carried along) counts only if it showed a surface as far away as this one
 *    was (each frame keeps its distances beside its colours), and is clamped to the colours
 *    round the pixel now. The two keep a thing that moves on its own (the aircraft you sit
 *    in, your canopy, another player) from leaving a trail or losing its edge: what stood
 *    behind it a frame ago is not its past;
 *  - the two are mixed, `strength` of the old, but only where this frame jumped away from the
 *    frame before as it was drawn (each frame keeps its own picture beside the blended one):
 *    a pixel that kept its colour is shown as it was drawn. (Measured against the blended
 *    picture it locked in: a storey's bands a pixel or two apart came out as their mean,
 *    every new frame's bands were a jump from that mean, so the mean was held, until close
 *    enough that a pixel's neighbourhood no longer spanned both band colours. That came
 *    first where the bands were widest, so flying in on Downtown the towers' windows
 *    appeared at their tops and ran down to their feet like a waterfall: owner, 2026-11-24,
 *    "a waterfall effect of the towns colors on the building that drops top to buttom … when
 *    driving the airplane and getting closer to downtown".) (Mixed everywhere, as
 *    most games do it, the picture went soft: carried along frame after frame it lost a third
 *    of its fine contrast under the canopy and half from the plane. Games win that back with
 *    sub-pixel jitter and a second sharpening; this needs neither.)
 *
 * No sub-pixel camera jitter: standing still the previous frame equals this one and the
 * picture is exactly what it was. It costs one fullscreen pass and a depth resolve.
 *
 * On foot too (owner, 2026-11-24, the airfield's apron from eye height: "its blurry and flicker
 * … this must be solvable?"). From eye height a pixel 40–100 m out covers metres of ground along
 * the view: filtered over all of it the paving goes soft, filtered short (GROUND.reach) it
 * crawls. Held steady, it can stay sharp. The weapon is drawn into the target after the scene
 * and clears the depth this pass reads, so the blend runs between the two (`steady`), on the
 * scene alone, and the present pass lays the weapon over it (`present`'s `overlay`: wherever
 * the weapon pass left a depth). On foot (`STEADY.foot`) only the shimmer is held: from `near`
 * to `far` metres, and only jumps under `cap` (a tracer, a muzzle flash, a player stepping out
 * are big jumps and are shown as drawn).
 */
export const STEADY = {
  /** The previous frame's share where this frame jumped away from it. */
  strength: 0.88,
  /**
   * How far a pixel must be from where it was to count as a jump (the largest channel, of 1,
   * on a square-root scale, about what the screen shows): none of the blend under `from`,
   * all of it over `to`. Measured against the frame before as drawn (not the blended one), a
   * band of storeys swimming from frame to frame is a jump of a few hundredths; with 0.02/0.08
   * a share of it slipped through (RTX 2050, flashes per 1000 px: 15.5 under the canopy over
   * Downtown, 12.2 flying past in the plane, against 15.0 and 11.8 before), with 0.01/0.05 it
   * is held better than ever (14.5 and 11.6; 17.3 and 13.1 with no pass).
   */
  from: 0.01,
  to: 0.05,
  /**
   * The previous frame counts only where it showed a surface about this far away (a share of
   * the distance): far apart, it was something else standing there.
   */
  depth: 0.12,
  /**
   * Nothing nearer than `near` metres is blended, all of it from `far` on. What sparkles from
   * the air is far off (a town, a forest, the ground); what is near is what moves on its own
   * there, with the camera: the aircraft you sit in, your canopy, yourself. Carried along as
   * if it stood still on the island, such a thing's picture came from another part of itself
   * (a chequered box riding 14 m ahead of the camera drew with a smeared band across it).
   * It also lets the pass go as you land.
   */
  near: 80,
  far: 160,
  /**
   * Jumps bigger than this (the same scale as `from`/`to`) are shown as drawn: none from the
   * air (where what sparkles is whole storeys and trees a pixel across).
   */
  cap: Infinity,
  /**
   * On foot: blended from `near` to `far` metres (what moves with you, a car you drive, is
   * nearer), and only the shimmer: every jump from `from` to `to` (the ground's crawl far off
   * is a few thousandths on this scale, much finer than what sparkles from the air), none over
   * `capFrom`→`capTo` (a tracer, a flash, a player stepping out). Measured on the RTX 2050
   * (gpu-bench, walking 11 cm a frame across the airfield's apron at eye height; change
   * between frames after following the ground, ground pixels only), with the mid grain exact
   * (terrain.ts):
   *   distance (m)            12–25   25–40   40–70
   *   off                     12.5    3.1     1.2
   *   jumps 0.004–0.02         5.1    2.9     1.3
   *   jumps 0–0.004            3.3    2.0     1.2
   * Cost: 0.2–0.6 ms a frame at 1632 × 918 (the pass and a depth resolve).
   */
  foot: { near: 6, far: 14, from: 0, to: 0.004, capFrom: 0.18, capTo: 0.3 },
  /** Frames without it after which its two history buffers are freed. */
  idleFrames: 600,
};

/**
 * The steadying pass's settings for a frame: the camera the scene was drawn with, the old
 * frame's share, and (on foot) where it applies and which jumps it holds.
 */
export type SteadyArgs = {
  camera: THREE.PerspectiveCamera;
  strength: number;
  near?: number;
  far?: number;
  capFrom?: number;
  capTo?: number;
  /** What counts as a jump (STEADY.from / to unless given). */
  from?: number;
  to?: number;
};

/** The player's or tester's switch: localStorage "br-steady" = "off" (never throws). */
export function steadyWanted(): boolean {
  try {
    return localStorage.getItem("br-steady") !== "off";
  } catch {
    return true;
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
   * `steady`: blend with the previous frame (STEADY) as seen by `camera`, the camera the scene
   * was just drawn with. It takes effect from the second frame it is asked for (the first
   * turns the depth resolve on).
   */
  present: (sharpen?: number, steady?: SteadyArgs | null, overlay?: boolean) => void;
  /**
   * Blend the scene just drawn with the frame before (STEADY), before anything else is drawn
   * into the target (the weapon pass clears the depth this reads). `present` then shows the
   * blend, with `overlay` true when a pass drew over the scene since (the weapon: laid over the
   * blend wherever it left a depth).
   */
  steady: (steady: SteadyArgs | null) => void;
  /** Whether the last frame presented was blended with the one before (tools, tests). */
  steadied: () => boolean;
  dispose: () => void;
};

/**
 * The low tier's anti-aliasing (2026-11-24): the low tier draws without MSAA, and on Intel UHD
 * edges, roof lines and the ground's detail crawled and blinked as the camera moved. A fast
 * FXAA (Lottes' reduced variant, as three.js' FXAAShader): 4 corner taps for the edge's
 * direction, then 2–4 taps along it; flat areas (contrast under 1/32, or 1/8 of the brightest
 * tap) keep the centre pixel untouched. Needs `shown()` and `uTexel`.
 */
export const FXAA_LOW_GLSL = /* glsl */ `
  float fxaaLuma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  vec3 fxaa(vec2 uv) {
    vec3 rgbM = shown(uv);
    vec3 rgbNW = shown(uv + vec2(-1.0, -1.0) * uTexel);
    vec3 rgbNE = shown(uv + vec2(1.0, -1.0) * uTexel);
    vec3 rgbSW = shown(uv + vec2(-1.0, 1.0) * uTexel);
    vec3 rgbSE = shown(uv + vec2(1.0, 1.0) * uTexel);
    float lM = fxaaLuma(rgbM);
    float lNW = fxaaLuma(rgbNW), lNE = fxaaLuma(rgbNE), lSW = fxaaLuma(rgbSW), lSE = fxaaLuma(rgbSE);
    float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
    float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
    if (lMax - lMin < max(0.0312, lMax * 0.125)) return rgbM;
    vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
    float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
    float rcpMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
    dir = clamp(dir * rcpMin, vec2(-8.0), vec2(8.0)) * uTexel;
    vec3 rgbA = 0.5 * (shown(uv + dir * (1.0 / 3.0 - 0.5)) + shown(uv + dir * (2.0 / 3.0 - 0.5)));
    vec3 rgbB = rgbA * 0.5 + 0.25 * (shown(uv - dir * 0.5) + shown(uv + dir * 0.5));
    float lB = fxaaLuma(rgbB);
    return lB < lMin || lB > lMax ? rgbA : rgbB;
  }
`;

/**
 * Bind an offscreen scene target to a renderer created with `reversedDepthBuffer: true`.
 * The target stays bound between frames, so shaders compiled anywhere (the precompile, the
 * context-loss recompile, the inventory portrait, which restores the previous target) get the
 * variant that renders into it, and no material recompiles on the first frame.
 */
export function createSceneTarget(
  renderer: THREE.WebGLRenderer,
  samples = 4,
  { fxaa = false }: { fxaa?: boolean } = {},
): SceneTarget {
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
  // FXAA reads between pixels (its blend along an edge); at one texel per pixel the centre
  // taps are the same with either filter.
  target.texture.minFilter = target.texture.magFilter = fxaa
    ? THREE.LinearFilter
    : THREE.NearestFilter;

  const material = new THREE.ShaderMaterial({
    name: "br-present",
    defines: fxaa ? { FXAA: "" } : {},
    uniforms: {
      tScene: { value: target.texture },
      // The weapon over the steadied scene: the target as drawn, where the weapon pass left a
      // depth (it clears the depth to 0, reversed).
      tOverlay: { value: target.texture },
      tOverlayDepth: { value: depth },
      // The scene as it was before the weapon (squashed: the history's second picture). Where
      // the target differs from it the weapon pass drew too (its flash writes no depth).
      tUnder: { value: null as THREE.Texture | null },
      uOverlay: { value: 0 },
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
      uniform sampler2D tOverlay;
      uniform sampler2D tOverlayDepth;
      uniform sampler2D tUnder;
      uniform float uOverlay;
      bool overlaid(vec2 uv) {
        if (texture2D(tOverlayDepth, uv).r > 0.0) return true;
        vec3 p = max(texture2D(tOverlay, uv).rgb, 0.0);
        vec3 q = texture2D(tUnder, uv).rgb;
        q = q / max(1e-4, 1.0 - max(q.r, max(q.g, q.b)));
        vec3 d = abs(p - q);
        return max(d.r, max(d.g, d.b)) > 0.004 + 0.01 * max(p.r, max(p.g, p.b));
      }
      uniform vec2 uTexel;
      uniform float uSharpen;
      varying vec2 vUv;
      ${SHARPEN_WEIGHT_GLSL}
      // A pixel as the canvas shows it: tone-mapped and encoded (sharpen.ts works on that).
      vec3 shown(vec2 uv) {
        vec4 c = uOverlay > 0.5 && overlaid(uv) ? texture2D(tOverlay, uv) : texture2D(tScene, uv);
        #ifdef TONE_MAPPING
          c.rgb = toneMapping(c.rgb);
        #endif
        return linearToOutputTexel(c).rgb;
      }
      #ifdef FXAA
      // FXAA_LOW_GLSL: the low tier has no MSAA; smooth its edges in this pass, which it runs
      // anyway (no extra fullscreen pass).
      ${FXAA_LOW_GLSL}
      #endif
      void main() {
        #ifdef FXAA
        vec3 c = fxaa(vUv);
        #else
        vec3 c = shown(vUv);
        #endif
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

  // ---------------------------------------------------------------- the steadying pass
  const steadyMaterial = new THREE.ShaderMaterial({
    name: "br-steady",
    uniforms: {
      tScene: { value: target.texture },
      tDepth: { value: depth },
      tHistory: { value: null as THREE.Texture | null },
      // The previous frame as it was drawn (the history's second picture).
      tDrawn: { value: null as THREE.Texture | null },
      uTexel: { value: new THREE.Vector2(1, 1) },
      // This frame's view space → the previous frame's clip space.
      uReproject: { value: new THREE.Matrix4() },
      // 1 / projection[0][0], 1 / projection[1][1], near, far.
      uLens: { value: new THREE.Vector4(1, 1, 0.1, 14000) },
      uStrength: { value: 0 },
      // Blended from x to y metres; jumps from z to w are shown as drawn (w ≤ z: no cap).
      uRange: { value: new THREE.Vector4(STEADY.near, STEADY.far, 0, 0) },
      // A jump: from x to y.
      uJump: { value: new THREE.Vector2(STEADY.from, STEADY.to) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene;
      uniform sampler2D tDepth;
      uniform sampler2D tHistory;
      uniform sampler2D tDrawn;
      // The blended picture (its distances beside it), and this frame as it was drawn.
      layout(location = 0) out highp vec4 steadyOut;
      layout(location = 1) out highp vec4 drawnOut;
      uniform vec2 uTexel;
      uniform mat4 uReproject;
      uniform vec4 uLens;
      uniform float uStrength;
      uniform vec4 uRange;
      uniform vec2 uJump;
      varying vec2 vUv;
      #define STEADY_DEPTH ${STEADY.depth.toFixed(3)}
      // Half-float light into a range a clamp and a mix behave in (a sun glint does not own
      // its neighbourhood), and back.
      vec3 squash(vec3 c) { return c / (1.0 + max(c.r, max(c.g, c.b))); }
      vec3 swell(vec3 c) { return c / max(1e-4, 1.0 - max(c.r, max(c.g, c.b))); }
      vec3 now(vec2 offset) { return squash(max(texture2D(tScene, vUv + offset * uTexel).rgb, 0.0)); }
      // Catmull-Rom, five taps (the corners of the nine dropped): sharper than bilinear, which
      // blurs a little more with every frame a moving picture is carried.
      vec3 before(sampler2D past, vec2 uv) {
        vec2 at = uv / uTexel;
        vec2 base = floor(at - 0.5) + 0.5;
        vec2 f = at - base;
        vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
        vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
        vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
        vec2 w3 = f * f * (-0.5 + 0.5 * f);
        vec2 w12 = w1 + w2;
        vec2 t0 = (base - 1.0) * uTexel;
        vec2 t3 = (base + 2.0) * uTexel;
        vec2 t12 = (base + w2 / w12) * uTexel;
        vec4 sum =
          vec4(texture2D(past, vec2(t12.x, t0.y)).rgb, 1.0) * (w12.x * w0.y) +
          vec4(texture2D(past, vec2(t0.x, t12.y)).rgb, 1.0) * (w0.x * w12.y) +
          vec4(texture2D(past, vec2(t12.x, t12.y)).rgb, 1.0) * (w12.x * w12.y) +
          vec4(texture2D(past, vec2(t3.x, t12.y)).rgb, 1.0) * (w3.x * w12.y) +
          vec4(texture2D(past, vec2(t12.x, t3.y)).rgb, 1.0) * (w12.x * w3.y);
        return max(sum.rgb / sum.a, 0.0);
      }
      void main() {
        vec3 c = now(vec2(0.0));
        // The nearest surface of the five (reversed depth: the largest): an edge moves with
        // the thing in front. Its distance is kept beside the colour, for the next frame.
        float d = texture2D(tDepth, vUv).r;
        d = max(d, max(
          max(texture2D(tDepth, vUv + vec2(uTexel.x, 0.0)).r, texture2D(tDepth, vUv - vec2(uTexel.x, 0.0)).r),
          max(texture2D(tDepth, vUv + vec2(0.0, uTexel.y)).r, texture2D(tDepth, vUv - vec2(0.0, uTexel.y)).r)));
        float dist = uLens.z * uLens.w / (d * (uLens.w - uLens.z) + uLens.z);
        drawnOut = vec4(c, 1.0);
        if (uStrength <= 0.0) {
          steadyOut = vec4(swell(c), dist);
          return;
        }
        // The colours round this pixel now: the box, tightened toward the cross.
        vec3 n = now(vec2(0.0, 1.0)), s = now(vec2(0.0, -1.0));
        vec3 e = now(vec2(1.0, 0.0)), w = now(vec2(-1.0, 0.0));
        vec3 lo = min(c, min(min(n, s), min(e, w)));
        vec3 hi = max(c, max(max(n, s), max(e, w)));
        vec3 ne = now(vec2(1.0, 1.0)), nw = now(vec2(-1.0, 1.0));
        vec3 se = now(vec2(1.0, -1.0)), sw = now(vec2(-1.0, -1.0));
        lo = 0.5 * (lo + min(lo, min(min(ne, nw), min(se, sw))));
        hi = 0.5 * (hi + max(hi, max(max(ne, nw), max(se, sw))));
        vec2 ndc = vUv * 2.0 - 1.0;
        vec4 was = uReproject * vec4(ndc * uLens.xy * dist, -dist, 1.0);
        vec2 uv = was.xy / was.w * 0.5 + 0.5;
        float valid = step(0.0, was.w) *
          step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        // What was drawn there must be this surface: about as far from the last camera as
        // this point was. A thing that moves on its own (the aircraft you sit in, your canopy,
        // another player) was somewhere else, and what stood behind it then is not its past.
        if (valid > 0.5)
          valid = step(abs(texture2D(tHistory, uv).a - was.w), STEADY_DEPTH * was.w + 0.3);
        // (Off the previous frame, or behind its camera: this frame alone, and no arithmetic
        // on what was read there.)
        if (valid > 0.5) {
          vec3 h = clamp(squash(before(tHistory, uv)), lo, hi);
          // (The last frame as drawn, read the same way: squashed already.)
          vec3 was0 = before(tDrawn, uv);
          // Only where this frame disagrees with the last: a pixel that kept its colour is
          // shown as drawn (and remembered so), so a picture that is merely moving stays as
          // sharp as it was; one that jumped is held near where it was.
          // (Measured as the eye sees it: a step from dark green to black is a jump.)
          vec3 gap = abs(sqrt(c) - sqrt(was0));
          float g = max(gap.r, max(gap.g, gap.b));
          float jump = smoothstep(uJump.x, uJump.y, g);
          // (On foot: only the shimmer; a tracer, a flash, a player stepping out as drawn.)
          if (uRange.w > uRange.z) jump *= 1.0 - smoothstep(uRange.z, uRange.w, g);
          c = mix(c, h, uStrength * jump * smoothstep(uRange.x, uRange.y, dist));
        }
        steadyOut = vec4(swell(c), dist);
      }`,
    glslVersion: THREE.GLSL3,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const steadyQuad = new THREE.Mesh(quad.geometry, steadyMaterial);
  steadyQuad.frustumCulled = false;
  const steadyScene = new THREE.Scene();
  steadyScene.add(steadyQuad);
  steadyScene.matrixWorldAutoUpdate = false;
  /** The two history buffers (made when first asked for), and which one holds the last frame. */
  let history: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] | null = null;
  let held = 0;
  /** Whether the held buffer is the frame before this one, as its camera saw it. */
  let remembered = false;
  let idle = 0;
  let lastSteadied = false;
  const previous = new THREE.Matrix4(); // the last frame's projection × view
  const reproject = new THREE.Matrix4();
  const freeHistory = () => {
    history?.[0].dispose();
    history?.[1].dispose();
    history = null;
    remembered = false;
  };
  /** A history buffer: the blended picture (and distances), and the frame as it was drawn. */
  const historyTarget = (w: number, h: number) => {
    const t = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
      count: 2,
    });
    for (const tex of t.textures) {
      tex.colorSpace = THREE.LinearSRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = tex.magFilter = THREE.LinearFilter;
    }
    return t;
  };

  const resize = () => {
    renderer.getDrawingBufferSize(size);
    const w = Math.max(1, size.x),
      h = Math.max(1, size.y);
    if (target.width === w && target.height === h) return;
    target.setSize(w, h);
    material.uniforms["uTexel"]!.value.set(1 / w, 1 / h);
    steadyMaterial.uniforms["uTexel"]!.value.set(1 / w, 1 / h);
    freeHistory(); // (another size: nothing to carry over)
    // setSize frees the framebuffer; binding again rebuilds it (three tracks the target as
    // bound, so without this the next frame would draw into a deleted framebuffer: black).
    if (renderer.getRenderTarget() === target) renderer.setRenderTarget(target);
  };
  resize();
  renderer.setRenderTarget(target);

  /** This frame was blended already (`steady`), whether it was blended, and asked for. */
  let blended = false,
    lastBlend = false,
    wanted = false;
  const blend = (steady: SteadyArgs | null) => {
    blended = true;
    const want = !!steady && steady.strength > 0;
    wanted = want;
    // The depth this frame was drawn with is in the texture only if the resolve was on
    // while it was drawn: asked for at the end of the frame before (or never needed: a
    // target without samples draws into the texture itself).
    const depthHere = target.samples === 0 || target.resolveDepthBuffer;
    lastSteadied = false;
    lastBlend = false;
    if (want && depthHere) {
      const camera = steady!.camera;
      history ??= [
        historyTarget(target.width, target.height),
        historyTarget(target.width, target.height),
      ];
      const to = 1 - held;
      const u = steadyMaterial.uniforms;
      u["tHistory"]!.value = history[held]!.textures[0];
      u["tDrawn"]!.value = history[held]!.textures[1];
      // previous clip ← world ← this frame's view space, worked out in doubles: the camera's
      // own place (kilometres from the origin) cancels before the GPU sees a number.
      reproject.multiplyMatrices(previous, camera.matrixWorld);
      u["uReproject"]!.value.copy(reproject);
      const p = camera.projectionMatrix.elements;
      u["uLens"]!.value.set(1 / p[0]!, 1 / p[5]!, camera.near, camera.far);
      u["uStrength"]!.value = remembered ? Math.min(0.98, steady!.strength) : 0;
      const capFrom = steady!.capFrom ?? 0,
        capTo = steady!.capTo ?? 0;
      u["uRange"]!.value.set(
        steady!.near ?? STEADY.near,
        steady!.far ?? STEADY.far,
        Number.isFinite(capFrom) ? capFrom : 0,
        Number.isFinite(capTo) ? capTo : 0,
      );
      u["uJump"]!.value.set(steady!.from ?? STEADY.from, steady!.to ?? STEADY.to);
      renderer.setRenderTarget(history[to]!);
      renderer.render(steadyScene, presentCamera);
      renderer.setRenderTarget(target);
      lastSteadied = remembered;
      held = to;
      remembered = true;
      previous.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      idle = 0;
      lastBlend = true;
    } else {
      remembered = false;
      if (history && ++idle > STEADY.idleFrames) freeHistory();
    }
  };

  return {
    resize,
    steady(steady) {
      blend(steady);
    },
    present(sharpen = 0, steady = null, overlay = false) {
      material.uniforms["uSharpen"]!.value = sharpen;
      // Not blended before the weapon this frame: blended now (nothing drawn over the scene).
      if (!blended) {
        blend(steady);
        overlay = false;
      }
      blended = false;
      if (lastBlend) {
        material.uniforms["tScene"]!.value = history![held]!.texture;
        material.uniforms["tUnder"]!.value = history![held]!.textures[1];
        material.uniforms["uOverlay"]!.value = overlay ? 1 : 0;
      } else {
        material.uniforms["tScene"]!.value = target.texture;
        material.uniforms["uOverlay"]!.value = 0;
      }
      // For the next frame's scene pass.
      if (target.samples > 0) target.resolveDepthBuffer = wanted;
      renderer.setRenderTarget(null);
      renderer.render(presentScene, presentCamera);
      renderer.setRenderTarget(target);
    },
    steadied: () => lastSteadied,
    dispose() {
      renderer.setRenderTarget(null);
      target.dispose();
      depth.dispose();
      material.dispose();
      steadyMaterial.dispose();
      freeHistory();
      quad.geometry.dispose();
    },
  };
}
