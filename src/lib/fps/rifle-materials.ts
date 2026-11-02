import * as THREE from "three";

/**
 * Realistic AKM finish for the authored rifle: varnished laminated birch furniture, a plum
 * bakelite magazine and blued / phosphated steel. The model's UVs are sparse, so detail is
 * projected triplanarly in each part's own (scale-corrected) space: grain runs down the gun
 * axis and nothing swims while the viewmodel moves. Textures are generated once per page.
 *
 * Wear comes from a Blender bake (art/blender/build_ak_viewmodel.py) on the rifle's second UV
 * set: R = ambient occlusion, G = edge convexity, B = cavity. Edges wear through to bare steel or
 * raw wood, broken up by the finish noise so it reads as chipping rather than an outline.
 *
 * Every finish also adds micro relief (wood pores, the orange peel of blued or anodized metal)
 * as a derivative bump from its texture, so highlights break up the way real metal and wood do.
 * The M4 keeps its authored maps and only gets that micro layer (overlay), plus a proper finish
 * for its untextured carry handle.
 */

/** Baked AO/edge/cavity atlas for the authored rifle (TEXCOORD_1). */
export const RIFLE_WEAR_MAP = "/fps/models/ak47-wear.webp";

type Wear = {
  /** Albedo the finish wears through to (linear RGB). */
  color: [number, number, number];
  /** Roughness of the worn-through surface. */
  roughness: number;
  /** How far edges wear through, 0–1. */
  amount: number;
  /** Ambient-occlusion strength, 0–1. */
  occlusion: number;
};
const BARE_STEEL: Wear = {
  color: [0.42, 0.43, 0.45],
  roughness: 0.3,
  amount: 0.75,
  occlusion: 0.85,
};

type Finish = {
  /** RGB albedo (replace) or colour modulation (multiply around 0.5 grey); A = roughness. */
  texture: () => THREE.Texture;
  /**
   * replace: the texture is the albedo. multiply: it modulates a flat colour. overlay: the part
   * keeps its authored maps and the texture only adds micro tone, roughness and relief on top.
   */
  mode: "replace" | "multiply" | "overlay";
  /** Texture repeats per metre of real gun. */
  density: number;
  color?: number;
  metalness: number;
  /** Roughness = mix(min, max, texture alpha); overlay: a multiplier on the authored roughness. */
  roughness: [number, number];
  /** Micro relief from the finish (pores, orange peel, machining), as a height range in metres. */
  bump: number;
  /** Overlay only: how strongly the finish tone modulates the authored colour, 0–1. */
  tone?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  envMapIntensity?: number;
  /** Baked edge wear / AO (the AK's second UV set); parts without it get none. */
  wear: Wear;
};

let cache: Map<string, THREE.Texture> | undefined;
/**
 * Finish textures generated so far. They are shared by every rifle on the page (all renderers)
 * and intentionally outlive any one arena; lifecycle tests account for them.
 */
export const sharedRifleTextureCount = () => cache?.size ?? 0;
function memo(name: string, make: () => THREE.Texture) {
  cache ??= new Map();
  let texture = cache.get(name);
  if (!texture) {
    texture = make();
    cache.set(name, texture);
  }
  return texture;
}

function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
/** Tileable value-noise fractal on a W×H grid. */
function fractal(W: number, H: number, seed: number, cellsX: number, cellsY: number, octaves = 4) {
  const random = rng(seed);
  const layers = Array.from({ length: octaves }, (_, o) => {
    const cx = cellsX << o,
      cy = cellsY << o;
    return { cx, cy, v: Float32Array.from({ length: cx * cy }, random) };
  });
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let sum = 0,
        amp = 0.5,
        norm = 0;
      for (const { cx, cy, v } of layers) {
        const fx = (x / W) * cx,
          fy = (y / H) * cy;
        const x0 = Math.floor(fx),
          y0 = Math.floor(fy);
        const tx = fx - x0,
          ty = fy - y0;
        const sx = tx * tx * (3 - 2 * tx),
          sy = ty * ty * (3 - 2 * ty);
        const at = (i: number, j: number) => v[((j % cy) * cx + (i % cx)) | 0]!;
        const a = at(x0, y0),
          b = at(x0 + 1, y0),
          c = at(x0, y0 + 1),
          d = at(x0 + 1, y0 + 1);
        sum += amp * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
        norm += amp;
        amp *= 0.5;
      }
      out[y * W + x] = sum / norm;
    }
  return out;
}
function toTexture(W: number, H: number, pixel: (x: number, y: number) => number[], srgb = false) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const pen = canvas.getContext("2d")!,
    image = pen.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [r, g, b, a] = pixel(x, y),
        o = (y * W + x) * 4;
      image.data[o] = r!;
      image.data[o + 1] = g!;
      image.data[o + 2] = b!;
      image.data[o + 3] = a!;
    }
  pen.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.premultiplyAlpha = false;
  // Albedo is authored in sRGB; alpha (roughness) stays linear either way.
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Laminated birch with a red-brown stain: long grain along U, laminate bands across V. */
function woodTexture() {
  const W = 1024,
    H = 512;
  const warp = fractal(W, H, 11, 2, 8, 4),
    grain = fractal(W, H, 23, 3, 64, 4),
    blotch = fractal(W, H, 37, 4, 4, 3),
    pores = rng(51);
  const poreMap = new Float32Array(W * H);
  for (let i = 0; i < 2600; i++) {
    const x = Math.floor(pores() * W),
      y = Math.floor(pores() * H),
      len = 6 + Math.floor(pores() * 26);
    for (let k = 0; k < len; k++) poreMap[y * W + ((x + k) % W)] = 1;
  }
  return toTexture(
    W,
    H,
    (x, y) => {
      const i = y * W + x;
      // Laminate: thin parallel layers, slightly wavy, with figure from the grain noise.
      // Flat plies: straight, parallel layers with only a gentle wander (not contour-like figure).
      const band = Math.sin(((y / H) * 52 + warp[i]! * 2.2) * Math.PI * 2) * 0.5 + 0.5;
      const ring = Math.pow(band, 3);
      // Thin dark glue/latewood lines between the laminate plies.
      const line = Math.pow(1 - band, 7);
      const figure = grain[i]! * 0.55 + ring * 0.4;
      const stain = blotch[i]!;
      const dark = poreMap[i]! * 0.4;
      // sRGB stops: deep oxblood → warm reddish amber, as on shellacked AKM furniture.
      const t =
        Math.min(1, Math.max(0, figure * 0.95 + stain * 0.35 - 0.16)) *
        (1 - dark) *
        (1 - line * 0.45);
      const r = mix(44, 124, t),
        g = mix(17, 57, t),
        b = mix(10, 29, t);
      const rough = 0.3 + ring * 0.12 + dark * 0.4 + line * 0.15 + (1 - stain) * 0.12;
      return [clamp(r), clamp(g), clamp(b), clamp(rough * 255)];
    },
    true,
  );
}

/** Moulded plum/orange bakelite with swirled filler and a satin finish. */
function bakeliteTexture() {
  const W = 512,
    H = 512;
  const swirl = fractal(W, H, 71, 3, 3, 5),
    speck = fractal(W, H, 79, 32, 32, 2);
  return toTexture(
    W,
    H,
    (x, y) => {
      const i = y * W + x;
      const t = Math.min(1, Math.max(0, swirl[i]! * 1.3 - 0.15));
      const r = mix(62, 128, t),
        g = mix(18, 46, t),
        b = mix(10, 20, t);
      const s = speck[i]! > 0.82 ? 0.75 : 1;
      const rough = 0.35 + (1 - t) * 0.25 + (s < 1 ? 0.2 : 0);
      return [clamp(r * s), clamp(g * s), clamp(b * s), clamp(rough * 255)];
    },
    true,
  );
}

/** Steel: low-contrast tone variation (multiply around grey) + brushed/smudged roughness. */
function steelTexture(seed: number) {
  const W = 512,
    H = 512;
  const smudge = fractal(W, H, seed, 4, 4, 4),
    brushed = fractal(W, H, seed + 7, 2, 96, 3),
    pits = fractal(W, H, seed + 13, 48, 48, 2),
    // Fine "orange peel" of a stamped, blued or parkerized surface; drives the micro relief.
    peel = fractal(W, H, seed + 19, 96, 96, 2);
  return toTexture(W, H, (x, y) => {
    const i = y * W + x;
    const tone =
      128 +
      (smudge[i]! - 0.5) * 40 +
      (brushed[i]! - 0.5) * 14 +
      (peel[i]! - 0.5) * 12 -
      (pits[i]! > 0.8 ? 12 : 0);
    const rough =
      0.18 +
      smudge[i]! * 0.42 +
      (brushed[i]! - 0.5) * 0.12 +
      (peel[i]! - 0.5) * 0.1 +
      (pits[i]! > 0.8 ? 0.2 : 0);
    return [clamp(tone), clamp(tone), clamp(tone * 1.02), clamp(rough * 255)];
  });
}

const NO_WEAR: Wear = { color: [0, 0, 0], roughness: 0.5, amount: 0, occlusion: 0 };

const FINISHES: Record<string, Finish> = {
  AK47LaminatedWoodPBR: {
    texture: () => memo("wood", woodTexture),
    mode: "replace",
    density: 3.2,
    metalness: 0,
    // Hand-rubbed shellac: a satin sheen that follows the grain, not a mirror lacquer.
    roughness: [0.32, 0.74],
    clearcoat: 0.26,
    clearcoatRoughness: 0.45,
    bump: 0.00018,
    // Handled furniture: varnish rubbed off the edges down to lighter, matte raw birch.
    wear: { color: [0.32, 0.15, 0.06], roughness: 0.78, amount: 0.7, occlusion: 0.75 },
  },
  /** Stamped-steel AKM magazine: parkerized, slightly worn. */
  AK47BakeliteMagazine: {
    texture: () => memo("magazine", () => steelTexture(401)),
    mode: "multiply",
    density: 4,
    color: 0x46484c,
    metalness: 0.58,
    roughness: [0.46, 0.8],
    bump: 0.00008,
    wear: { ...BARE_STEEL, amount: 0.6 },
  },
  AK47BakeliteMagazineUnused: {
    texture: () => memo("bakelite", bakeliteTexture),
    mode: "replace",
    density: 4,
    metalness: 0,
    roughness: [0.22, 0.7],
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
    bump: 0.00005,
    wear: { color: [0.2, 0.06, 0.03], roughness: 0.45, amount: 0.4, occlusion: 0.7 },
  },
  /**
   * Blued stamped receiver: a satin blue-black with a soft, broken-up sheen (no glossy coat;
   * the old clearcoat read as black plastic).
   */
  AK47BluedReceiverSteel: {
    texture: () => memo("blued", () => steelTexture(101)),
    mode: "multiply",
    density: 2.5,
    color: 0x40444b,
    metalness: 0.86,
    roughness: [0.38, 0.68],
    clearcoat: 0.02,
    clearcoatRoughness: 0.4,
    bump: 0.00006,
    // Bluing wears silver on the receiver's stamped edges and rivet heads first.
    wear: BARE_STEEL,
  },
  AK47PhosphateSteel: {
    texture: () => memo("phosphate", () => steelTexture(211)),
    mode: "multiply",
    density: 3,
    color: 0x47494d,
    metalness: 0.62,
    roughness: [0.48, 0.84],
    bump: 0.00008,
    wear: { ...BARE_STEEL, amount: 0.55 },
  },
  AK47WornBoltSteel: {
    texture: () => memo("bolt", () => steelTexture(307)),
    mode: "multiply",
    density: 4,
    color: 0x9a9da2,
    metalness: 1,
    roughness: [0.18, 0.46],
    bump: 0.00004,
    wear: { ...BARE_STEEL, color: [0.6, 0.61, 0.63], roughness: 0.2, amount: 0.5 },
  },
  /**
   * M4 upper/lower and furniture: keep the authored maps, add hard-anodized micro texture so the
   * black reads as dark-grey satin aluminium instead of flat black.
   */
  M4Finish: {
    texture: () => memo("anodized", () => steelTexture(503)),
    mode: "overlay",
    density: 3,
    color: 0xffffff,
    tone: 0.6,
    metalness: 0.62,
    roughness: [0.82, 1.22],
    bump: 0.00005,
    envMapIntensity: 0.7,
    wear: NO_WEAR,
  },
  /** M4 carry handle: was a flat swatch; same hard-anodized aluminium as the receiver. */
  CarryHandleFinish: {
    texture: () => memo("anodized", () => steelTexture(503)),
    mode: "multiply",
    density: 3,
    color: 0x2e2e30,
    metalness: 0.6,
    roughness: [0.4, 0.66],
    bump: 0.00005,
    envMapIntensity: 0.7,
    wear: NO_WEAR,
  },
};

function wearMap() {
  return memo("wear", () => {
    const texture = new THREE.TextureLoader().load(RIFLE_WEAR_MAP);
    // glTF UV convention (no flip); data, not colour.
    texture.flipY = false;
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
    return texture;
  });
}

function applyFinish(
  material: THREE.MeshStandardMaterial,
  finish: Finish,
  scale: THREE.Vector3,
  hasWear: boolean,
) {
  const map = finish.texture();
  const overlay = finish.mode === "overlay";
  material.metalness = finish.metalness;
  // Overlay keeps the authored roughness map (scaled in the shader); the others drive it fully.
  material.roughness = 1;
  if (finish.color !== undefined) material.color.setHex(finish.color);
  else material.color.setHex(0xffffff);
  if (finish.envMapIntensity !== undefined) material.envMapIntensity = finish.envMapIntensity;
  // Clearcoat is always enabled (≥ 0.02) so every finish compiles to one shader program.
  if (material instanceof THREE.MeshPhysicalMaterial) {
    material.clearcoat = Math.max(0.02, finish.clearcoat ?? 0);
    material.clearcoatRoughness = finish.clearcoatRoughness ?? 0.3;
  }
  if (!overlay) {
    // The authored base colour is a flat dark swatch; the procedural finish drives the look.
    material.map = null;
    material.roughnessMap = null;
    // The authored occlusion maps read TEXCOORD_1, which now carries the wear atlas; the baked
    // AO in uWearMap replaces them.
    material.aoMap = null;
  }
  const uniforms = {
    uFinishMap: { value: map },
    uFinishScale: { value: scale.clone().multiplyScalar(finish.density) },
    uFinishRough: { value: new THREE.Vector2(...finish.roughness) },
    uFinishReplace: { value: finish.mode === "replace" ? 1 : 0 },
    uFinishOverlay: { value: overlay ? (finish.tone ?? 0.5) : -1 },
    uFinishBump: { value: finish.bump },
    uHasWear: { value: hasWear && finish.wear.amount + finish.wear.occlusion > 0 ? 1 : 0 },
    uWearMap: { value: wearMap() },
    uWearColor: { value: new THREE.Vector3(...finish.wear.color) },
    uWear: {
      value: new THREE.Vector3(finish.wear.amount, finish.wear.roughness, finish.wear.occlusion),
    },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec2 wearUv;\nvarying vec2 vWearUv;\nvarying vec3 vFinishPos;\nvarying vec3 vFinishNormal;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvFinishPos = position;\nvFinishNormal = normal;\nvWearUv = wearUv;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uFinishMap;
uniform vec3 uFinishScale;
uniform vec2 uFinishRough;
uniform float uFinishReplace;
uniform float uFinishOverlay;
uniform float uFinishBump;
uniform float uHasWear;
uniform sampler2D uWearMap;
uniform vec3 uWearColor;
uniform vec3 uWear;
varying vec2 vWearUv;
varying vec3 vFinishPos;
varying vec3 vFinishNormal;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
      vec3 finishW = pow( abs( normalize( vFinishNormal ) ), vec3( 4.0 ) );
      finishW /= finishW.x + finishW.y + finishW.z;
      vec3 finishP = vFinishPos * uFinishScale;
      // Grain runs along the gun (z) on the sides and top; ends get the cross-section.
      vec4 finish = texture2D( uFinishMap, finishP.zy ) * finishW.x
        + texture2D( uFinishMap, finishP.zx + 0.37 ) * finishW.y
        + texture2D( uFinishMap, finishP.xy + 0.71 ) * finishW.z;
      if ( uFinishOverlay >= 0.0 )
        diffuseColor.rgb *= mix( vec3( 1.0 ), finish.rgb * 2.0, uFinishOverlay );
      else
        diffuseColor.rgb = mix( diffuseColor.rgb * finish.rgb * 2.0, finish.rgb * diffuse, uFinishReplace );
      // Baked wear: chipped edge wear (edge mask × finish noise), cavity grime and AO. Parts
      // without the wear UV set read as unworn, unoccluded.
      vec3 wearBake = mix( vec3( 1.0, 0.0, 0.0 ), texture2D( uWearMap, vWearUv ).rgb, uHasWear );
      float wearChip = texture2D( uFinishMap, ( finishP.zy + finishP.zx ) * 2.3 + 0.13 ).a;
      float edgeWear = smoothstep( 0.32, 0.78, wearBake.g * ( 0.45 + wearChip * 1.1 ) ) * uWear.x;
      diffuseColor.rgb = mix( diffuseColor.rgb, uWearColor, edgeWear );
      diffuseColor.rgb *= ( 1.0 - wearBake.b * 0.3 ) * mix( 1.0, wearBake.r, uWear.z );`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
      float finishRough = mix( uFinishRough.x, uFinishRough.y, finish.a );
      roughnessFactor = uFinishOverlay >= 0.0 ? clamp( roughnessFactor * finishRough, 0.04, 1.0 ) : finishRough;
      roughnessFactor = mix( roughnessFactor, uWear.y, edgeWear ) + wearBake.b * 0.12;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
      {
        // Micro relief (pores, orange peel) from the finish's tone, as a derivative bump map.
        float finishH = dot( finish.rgb, vec3( 0.3333 ) );
        vec2 dH = vec2( dFdx( finishH ), dFdy( finishH ) ) * uFinishBump;
        vec3 sx = dFdx( - vViewPosition ), sy = dFdy( - vViewPosition );
        vec3 r1 = cross( sy, normal ), r2 = cross( normal, sx );
        float det = dot( sx, r1 ) * faceDirection;
        vec3 grad = sign( det ) * ( dH.x * r1 + dH.y * r2 );
        normal = normalize( abs( det ) * normal - grad );
      }`,
      )
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
      #ifdef USE_CLEARCOAT
        material.clearcoat *= 1.0 - edgeWear * 0.85;
      #endif`,
      );
  };
  material.customProgramCacheKey = () => "ak-finish";
  material.needsUpdate = true;
}

/** Give every rifle part its finish. Materials are cloned per part for its own scale. */
export function upgradeRifleMaterials(root: THREE.Object3D, owned: THREE.Material[]) {
  root.updateWorldMatrix(true, true);
  const rootScale = root.getWorldScale(new THREE.Vector3());
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.SkinnedMesh) return;
    // Shared, idempotent: expose the baked wear UV set under a name the finish shader owns.
    const wearUv = object.geometry.getAttribute("uv1");
    if (wearUv && !object.geometry.getAttribute("wearUv"))
      object.geometry.setAttribute("wearUv", wearUv);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const replaced = materials.map((material) => {
      const finish = FINISHES[material.name];
      if (!finish || !(material instanceof THREE.MeshStandardMaterial)) return material;
      const clone = material.clone();
      // Object-space projection scaled to real size, so every part shares one grain density.
      const scale = object.getWorldScale(new THREE.Vector3()).divide(rootScale);
      applyFinish(clone, finish, scale, !!object.geometry.getAttribute("wearUv"));
      owned.push(clone);
      return clone;
    });
    object.material = Array.isArray(object.material) ? replaced : replaced[0]!;
  });
  // Generated finish textures are shared by every rifle on the page and are not disposed here.
}
