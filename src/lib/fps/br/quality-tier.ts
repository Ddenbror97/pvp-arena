/**
 * Project Island hardware tier (2026-11-09): so a 2015 laptop can play.
 *
 * The game has one render configuration and an adaptive budget (presentation.ts), but two
 * things cannot adapt after the renderer exists: canvas anti-aliasing (4× MSAA, the largest
 * single cost on integrated graphics) and how much texture memory is uploaded behind the
 * loading screen (about 670 MB at full size). So before the renderer is created the arena asks
 * for a tier:
 *
 *  - "standard": everything as before.
 *  - "low": no MSAA, a 720p pixel budget, the lite ground shader from the start, half-size
 *    world textures, 4× anisotropy.
 *
 * Nothing that hides or reveals a player differs between tiers (trees, bushes, rocks, buildings
 * and their draw distances are the same for everyone).
 *
 * How the tier is chosen, in order:
 *  1. an override, localStorage "br-tier" = "low" | "standard";
 *  2. a GPU known by name to be fast (STANDARD_GPU) is standard, whatever a session learnt:
 *     the low tier's blur and missing anti-aliasing are never forced on it;
 *  3. what the last sessions learnt: a standard session that spent its time at the budget's
 *     floor marks the machine low for DEMOTION_DAYS;
 *  3b. the GPU's name (integrated and old mobile chips);
 *  4. a 30–100 ms fill-rate probe on the same GPU (unknown names), cached per GPU.
 */
export type BrTier = "standard" | "low";
export type BrTierInfo = { tier: BrTier; reason: string; gpu: string; probeMs: number | null };

const OVERRIDE_KEY = "br-tier";
// v2 (2026-11-09): demotions learnt before the budget told GPU load from other slow frames
// are dropped (they left fast machines on the low tier: 720p, no anti-aliasing, for 14 days).
const LEARNT_KEY = "br-tier-learnt-v2";
const PROBE_KEY = "br-tier-probe";
const DEMOTION_DAYS = 14;
/**
 * Probe time (ms) above which a GPU is low. Measured on the owner's laptop (2026-11-09): the
 * GeForce RTX 2050 takes 2.8–3.0 ms (PROBE_REFERENCE_MS); its Intel UHD, which needs the low
 * tier (19–22 ms for the world alone at full size), is 8–10× slower in the game.
 */
export const PROBE_REFERENCE_MS = 3;
export const PROBE_LOW_MS = PROBE_REFERENCE_MS * 4;

/** Low pixel budget: 1280 × 720, never above 1 device pixel per CSS pixel. */
export const LOW_CAP = { ratio: 1, pixels: 921_600 } as const;

/**
 * GPUs that need the low tier, by the name WebGL reports. Integrated Intel before Xe, AMD's
 * pre-Ryzen and small Vega integrated chips, entry-level and old mobile GeForce, phone GPUs
 * and software renderers.
 */
const LOW_GPU = [
  /intel.*(hd graphics|uhd graphics|iris(?!.*xe)|gma|g4[15]|q4[35]|hd \d{3,4})/i,
  /radeon.*(r[2-7] graphics|hd [2-8]\d{3}|vega [368]\b)|amd.*(stoney|carrizo|kaveri|bristol)/i,
  /geforce.*(gt[ x]? ?[1-7]\d{2}m?\b|[6-9][1-4]0mx?\b|mx ?1[1-5]0|gtx? ?[4-6]\d{2}\b|\b[2-9]\d{2}m\b)/i,
  /adreno|mali|powervr|videocore|apple a\d/i,
  /swiftshader|llvmpipe|software|basic render/i,
];
/** Names that are never low, whatever the list above says (checked first). */
const STANDARD_GPU = [/\barc\b|iris.*xe|\bxe\b/i, /\brtx\b|gtx ?(9[6-9]0|1\d{3})/i, /apple m\d/i];

export function tierFromGpuName(gpu: string): BrTier | null {
  if (!gpu) return null;
  if (STANDARD_GPU.some((r) => r.test(gpu))) return "standard";
  if (LOW_GPU.some((r) => r.test(gpu))) return "low";
  return null;
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const storage = (): Store | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};
const readJson = <T>(store: Store | null, key: string): T | null => {
  try {
    const raw = store?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

/**
 * The tier from what is known without touching the GPU (testable): override, then a recent
 * demotion, then the GPU's name, then a cached or fresh probe time.
 */
export function chooseBrTier(input: {
  override: string | null;
  learnt: { tier: BrTier; at: number } | null;
  gpu: string;
  probeMs: number | null;
  now: number;
}): { tier: BrTier; reason: string } {
  if (input.override === "low" || input.override === "standard")
    return { tier: input.override, reason: "override" };
  const named = tierFromGpuName(input.gpu);
  if (named === "standard") return { tier: named, reason: "gpu name" };
  const age = input.learnt ? (input.now - input.learnt.at) / 86_400_000 : Infinity;
  if (input.learnt?.tier === "low" && age >= 0 && age < DEMOTION_DAYS)
    return { tier: "low", reason: "slow last session" };
  if (named) return { tier: named, reason: "gpu name" };
  if (input.probeMs !== null)
    return { tier: input.probeMs > PROBE_LOW_MS ? "low" : "standard", reason: "probe" };
  return { tier: "standard", reason: "default" };
}

/**
 * Fill-rate probe on a throwaway WebGL2 context with the game's power preference (so a hybrid
 * laptop answers with the GPU the game will get): 16 full passes of an 8-fetch shader over
 * 512 × 512, timed to a 1-pixel read. Returns the GPU's name and the time (null: no WebGL2).
 */
export function probeGpu(measure = true): { gpu: string; ms: number | null } {
  let gl: WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 16;
    gl = canvas.getContext("webgl2", {
      antialias: false,
      depth: false,
      powerPreference: "high-performance",
    });
    if (!gl) return { gpu: "", ms: null };
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = String(
      (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) ?? "",
    );
    if (!measure) return { gpu, ms: null };
    const compile = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(
      program,
      compile(
        gl.VERTEX_SHADER,
        `#version 300 es
        void main() {
          vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
          gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
        }`,
      ),
    );
    gl.attachShader(
      program,
      compile(
        gl.FRAGMENT_SHADER,
        `#version 300 es
        precision highp float;
        uniform sampler2D t;
        uniform float k;
        out vec4 o;
        void main() {
          vec2 uv = gl_FragCoord.xy / 512.0;
          vec3 c = vec3(0.0);
          for (int i = 0; i < 8; i++) {
            float f = float(i) + k;
            c += texture(t, uv * (1.0 + f * 0.37) + vec2(f * 0.13, f * 0.29)).rgb;
          }
          o = vec4(c / 8.0, 1.0);
        }`,
      ),
    );
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return { gpu, ms: null };
    const noise = new Uint8Array(256 * 256 * 4);
    for (let i = 0, s = 12345; i < noise.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      noise[i] = s >>> 16;
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, noise);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    const target = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, 512, 512);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    gl.viewport(0, 0, 512, 512);
    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const k = gl.getUniformLocation(program, "k");
    const px = new Uint8Array(4);
    const pass = (passes: number) => {
      const t0 = performance.now();
      for (let i = 0; i < passes; i++) {
        gl!.uniform1f(k, i);
        gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      }
      gl!.readPixels(0, 0, 1, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, px);
      return performance.now() - t0;
    };
    pass(2); // compile, upload, power up
    const ms = Math.min(pass(16), pass(16), pass(16));
    return { gpu, ms };
  } catch {
    return { gpu: "", ms: null };
  } finally {
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

let detected: BrTierInfo | null = null;
/**
 * The tier for this machine (see the header), decided once per page load. Never throws;
 * "standard" without a browser.
 */
export function detectBrTier(): BrTierInfo {
  if (typeof document === "undefined")
    return { tier: "standard", reason: "default", gpu: "", probeMs: null };
  return (detected ??= detect());
}

function detect(): BrTierInfo {
  const store = storage();
  const override = (() => {
    try {
      return store?.getItem(OVERRIDE_KEY) ?? null;
    } catch {
      return null;
    }
  })();
  const learnt = readJson<{ tier: BrTier; at: number }>(store, LEARNT_KEY);
  const cached = readJson<{ gpu: string; ms: number }>(store, PROBE_KEY);
  // The name is free; the timed probe runs only when nothing else decides, once per GPU.
  let { gpu } = probeGpu(false);
  let probeMs = cached && cached.gpu === gpu ? cached.ms : null;
  const now = Date.now();
  let choice = chooseBrTier({ override, learnt, gpu, probeMs, now });
  if (choice.reason === "default" && gpu !== "") {
    const probe = probeGpu(true);
    gpu = probe.gpu || gpu;
    probeMs = probe.ms;
    if (probeMs !== null) {
      try {
        store?.setItem(PROBE_KEY, JSON.stringify({ gpu, ms: +probeMs.toFixed(2) }));
      } catch {
        // Private mode: probe again next time.
      }
      choice = chooseBrTier({ override, learnt, gpu, probeMs, now });
    }
  }
  return { ...choice, gpu, probeMs };
}

/**
 * What a session learnt, for the next one: a standard session that spent `floorSeconds` at
 * the budget's floor (resolution and ground detail already at their minimum, still slow)
 * marks the machine low. A low session records nothing: the demotion simply expires.
 */
export function recordBrSession(tier: BrTier, floorSeconds: number, playedSeconds: number) {
  if (tier !== "standard" || playedSeconds < 60) return;
  if (floorSeconds < 30 || floorSeconds < playedSeconds * 0.25) return;
  try {
    storage()?.setItem(LEARNT_KEY, JSON.stringify({ tier: "low", at: Date.now() }));
  } catch {
    // Nothing to remember it in.
  }
}

/**
 * Standard pixel budget for the island (owner, 2026-11-09: blurry, cannot see far): a 1080p
 * screen draws every pixel, a 1440p one at 0.75×. The shared cap (presentation.ts RENDER_CAP,
 * 1.5 MP) suits the 1v1/5v5 rooms, where everything is within 40 m; here a player 300 m away
 * is a few pixels tall, and drawing 1080p at 0.85× and stretching it smeared exactly that.
 * Slow GPUs still step down through the render budget.
 */
export const STANDARD_CAP = { ratio: 1.5, pixels: 2_100_000 } as const;

/** The pixel ratio for a tier: the island's standard cap or the low cap, × scale. */
export function tierPixelRatio(
  tier: BrTier,
  width: number,
  height: number,
  deviceRatio: number,
  scale: number,
) {
  const area = Math.max(1, width * height);
  const standard =
    Math.min(deviceRatio, STANDARD_CAP.ratio, Math.sqrt(STANDARD_CAP.pixels / area)) * scale;
  if (tier !== "low") return standard;
  const low = Math.min(deviceRatio, LOW_CAP.ratio, Math.sqrt(LOW_CAP.pixels / area)) * scale;
  return Math.min(standard, low);
}
