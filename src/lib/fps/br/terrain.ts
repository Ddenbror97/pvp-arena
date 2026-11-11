import * as THREE from "three";
import {
  shrinkImageTexture,
  worldAnisotropy,
  worldTextureScale,
  worldTextureSize,
} from "./texture-quality";
import { GROUND_LAYERS, LAYER_TARGET, PALETTE_PULL } from "./ground-style";
export { GROUND_LAYERS } from "./ground-style";
import { Heightfield } from "./heightfield";
import { buildMinMax, lodRanges, selectPatches, type LodConfig } from "./terrain-lod";
import { LAND_COVER, WORLD_HALF, WORLD_SIZE } from "./world";

/**
 * Project Island terrain renderer: CDLOD over the whole 10 km heightfield in ONE draw call.
 *
 *  - One small grid patch (16 × 16 quads) is instanced for every visible quadtree node; the
 *    vertex shader reads heights from an integer texture (exact centimetres, the same data the
 *    server uses), so there is no per-chunk geometry to build, upload or stream.
 *  - Levels 0–5: 62.5 m patches with 3.9 m quads within 460 m of the camera, doubling per level
 *    out to 2 km patches with 125 m quads. Vertices morph between levels (CDLOD), so detail
 *    fades in without popping. Crack-free by construction, with no skirts (terrain-lod.ts).
 *  - Quadtree selection (terrain-lod.ts) runs on the CPU against per-node min/max heights with
 *    frustum culling, in about 0.1 ms per frame.
 *  - Shading: land-cover weights (2 RGBA textures, 7.8 m) + slope rock + a tiling detail noise,
 *    on MeshStandardMaterial so lights, fog, environment and tone mapping match the other maps.
 *  - Ground textures (owner, 2026-11-04): within `groundRange` of the camera, real tile textures
 *    per zone (public/fps/br/ground, CC BY) with a variant pair per zone blended over large
 *    patches (grass/moss, straw/soil, concrete/tiles, rock/gravel, mud/sand), normal-mapped,
 *    rock projected sideways on steep slopes, tiles on the runways, snow on the peaks. Only the
 *    two strongest zones per pixel are sampled nearby. A baked, mipmapped aerial albedo adds
 *    far-field detail in one sample, without geometry or runtime texture synthesis. Loaded
 *    after the first frame; the RenderBudget can shorten the range (setGroundRange).
 *
 * Rendering quality follows the game's single configuration and its adaptive RenderBudget
 * (presentation.ts), like the 1v1 and Bomb Defusal maps: no separate quality presets.
 */
export const TERRAIN: LodConfig = {
  /** Quads per patch side. */
  patch: 16,
  /** Six levels: roots are 16·2^5 = 512 grid intervals = 2 km. */
  levels: 6,
  /**
   * Distance (m) within which level 0 is used; each level doubles it. The smallest value that
   * passes checkLodConfig on this heightfield (neighbours differ by at most one level and meet
   * on identical vertices).
   */
  baseRange: 460,
  /** Morph between 85 % and 95 % of each level's range. */
  morphStart: 0.85,
  morphEnd: 0.95,
};

export type TerrainControls = {
  root: THREE.Object3D;
  /** Re-select patches for this camera (call once per frame before rendering). */
  update: (camera: THREE.PerspectiveCamera) => void;
  stats: () => { patches: number; triangles: number };
  /** Shared with the water (lake mask) and later the map UI; owned by the terrain. */
  textures: { height: THREE.DataTexture; coverA: THREE.DataTexture; coverB: THREE.DataTexture };
  /** How to read `textures.height` (the water's depth shading): grid spacing, last index, offset. */
  heightGrid: { spacing: number; grid: number; offset: number };
  /** Load the ground textures (`dir`: the folder with ground.json) and the runway strips. */
  loadGround: (
    dir: string,
    runways: ReadonlyArray<{ a: number[]; b: number[]; width: number }>,
  ) => Promise<void>;
  /** Distance (m) within which the ground textures show (0: off). */
  setGroundRange: (m: number) => void;
  /**
   * Lite ground shading on slow GPUs (the render budget's first step, before resolution): no
   * tiling-breaker sample, the second zone only at real borders, one mid-field sample.
   */
  setGroundLite: (on: boolean) => void;
  /** One ground layer for other surfaces (the road meshes' asphalt), once loaded. */
  groundLayer: (id: (typeof GROUND_LAYERS)[number]) => GroundLayer | null;
  dispose: () => void;
};

export type GroundLayer = {
  albedo: THREE.DataArrayTexture;
  layer: number;
  /** 1 / tile size (m). */
  scale: number;
  tint: THREE.Vector3;
  /** The layer's mean colour after the tint (what the far field shows). */
  far: THREE.Vector3;
};

/** Texture-array layers (art/blender/br/build_ground.mjs LAYERS order). */
const L = (id: (typeof GROUND_LAYERS)[number]) => GROUND_LAYERS.indexOf(id);
/**
 * Each land-cover class (coverA rgba = sand, grass, field, forest; coverB rgba = rock, urban,
 * road, shore) with its variant pair; palette targets live in ground-style.ts.
 */
const CLASSES: Array<{ a: number; b: number }> = [
  { a: L("sand"), b: L("sand") },
  { a: L("grass"), b: L("moss") },
  { a: L("straw"), b: L("soil") },
  { a: L("forest"), b: L("moss") },
  { a: L("rock"), b: L("gravel") },
  // Urban ground: concrete and gravel lots (owner, 2026-11-05: the paving tiles drew a 4 m grid
  // over the town lawns where the urban and grass zones blend). Runways keep their tiles.
  { a: L("concrete"), b: L("gravel") },
  { a: L("asphalt"), b: L("asphalt") },
  // Shore and river/lake beds: earth and sand (owner, 2026-11-08: the mud tile's bright
  // puddles read as blue blotches along the banks and under shallow water).
  { a: L("soil"), b: L("sand") },
];
export const GROUND = {
  range: 140,
  normal: 0.85,
  /**
   * On foot (owner, 2026-11-11: "the ground at distance is slightly too blurry while running and
   * looking around"). From eye height the ground is seen at a grazing angle: 30 m out a pixel
   * covers 4 cm across the view but 0.7 m along it, 60 m out 3 m along it. The near tile (its
   * tufts and stones are 10–20 cm) is filtered to a flat colour from about 20 m, while the
   * mid-field grain (MID: the same tile enlarged 3× and 8×, which a pixel still resolves there)
   * only began where the near textures end, at 85–140 m. In between the ground was a smooth
   * wash. The mid grain now also comes in over the near textures wherever a pixel's footprint
   * along the view grows from `grazeFrom` to `grazeTo` metres: by what the pixel can resolve, not
   * by distance, so looking down from a roof or a hill keeps the plain near tile.
   */
  grazeFrom: 0.16,
  grazeTo: 0.75,
  /**
   * The tiles' colour is read half a mip level sharper than the pixel's footprint asks for
   * (its gradients × `sharpen`): with anisotropic filtering the standard footprint errs on the
   * soft side at a slant. The normal maps keep the exact level (a sharper one would sparkle).
   */
  sharpen: 0.71,
};
/**
 * Mid field (owner, 2026-11-09: the ground was a blur from the parachute): beyond the near
 * range out to `range`, the aerial albedo is modulated by the dominant zone's real tile
 * texture at `scale` × its tile size (albedo ratio and normal), so the ground keeps a surface
 * grain from the air and in the middle distance. Two texture fetches; the colours stay the
 * aerial bake's (the ratio to the layer's mean averages to 1).
 */
// Ranges (2026-11-11): the plane flies at 800 m and the canopy's counter is height above the
// ground, so at "500 m" the ground at the middle of the screen is 700–900 m from the camera.
// The grain faded out from 600 m and the close tile from 380 m: it only showed below ~300 m.
export const MID = {
  range: 2400,
  scale: 8,
  albedo: 0.85,
  normal: 0.55,
  /** The second sample's tile scale within `closeFrom` m, cross-faded out by `closeTo` m. */
  closeScale: 3,
  /** How much of the tile the stony layers (mud … asphalt) do not take. */
  stony: 0.3,
  closeFrom: 650,
  closeTo: 1300,
};
/**
 * From the air (owner, 2026-11-10: "textures still don't display from the parachute at
 * 300–500 m, the ground is still blurred"). From 300–500 m up a screen pixel covers 0.4–0.7 m of
 * ground; the aerial bake is 2.4 m a texel and MID's grain is even. A first attempt the same
 * day divided the noise's *period* by 4 and 11 m, so its cells were 12 cm and 1.4 m: below a
 * pixel from the air, averaged away by the mipmaps. And what the eye reads as blur from up
 * there is the aerial bake itself: zones fading into each other over 30–50 m. AIR, between the
 * near textures and `range`:
 *  - grain whose cells are `cells` metres (2–5 px from 300–500 m), with a contrast curve so
 *    clumps have edges instead of gradients;
 *  - the aerial bake looked up `warp` metres off by the same noise, so zone borders break
 *    into ragged patches instead of smooth fades.
 * Two fetches of the 256 px noise, not on the lite ground.
 */
export const AIR = {
  range: 2800,
  /** Periods (m) of the two noise samples: cells are period / 32, / 16 and / 8. */
  periodA: 56,
  periodB: 37,
  warp: 7,
  fine: 0.34,
  mid: 0.26,
  broad: 0.2,
  /**
   * Hard zone borders (owner, 2026-11-11: "any location from 500 metres should have the crisp
   * texture"). Sharpening the picture cannot sharpen what is drawn soft: grass, dry field and
   * forest floor faded into each other over 30–50 m, in the aerial bake and in the land cover
   * alike, which from the air reads as out-of-focus cloud shadows. In the AIR range each pixel
   * now takes the colour of the zone that wins there: the land cover is read `wobble` + `warp`
   * metres off by two noises (so a border is a ragged line, not a smooth curve) and the two
   * strongest zones meet over `edge` of their share instead of blending. The aerial bake still
   * tints it (its ratio to the soft blend at the same spot), so parcels and macro variation
   * stay. The offset is the same at every distance (a border must not move as the camera comes
   * closer) and is zero on roads, lots, shores and beaches. Five more small fetches a pixel.
   */
  /** How much of the grain lots and yards (the urban class) do not take. */
  lots: 0.3,
  wobble: 26,
  wobblePeriod: 310,
  edge: 0.07,
  crisp: 0.9,
};

/**
 * Relief (owner, 2026-11-10: "crispy detail … at the Iron Peaks the texture of the mountain should
 * be higher and longer distance to see it"). The terrain was lit with per-vertex normals, and far
 * patches have 60–125 m quads: a mountain a kilometre away was a smooth, mottled cone. One
 * texture baked from the heightfield at load now carries, per 3.9 m of ground (7.8 m on the low
 * tier), the surface normal (RG) and two cavity terms (B: gullies and ridges over ~12 m, A:
 * hollows and crests over ~60 m). One mipmapped fetch per pixel lights every distance with the
 * full heightfield's shape and darkens gullies, and replaces the vertex shader's 16 height
 * fetches for the normal: cheaper on slow GPUs, not dearer.
 */
export const RELIEF = { fine: 3, fineM: 3.5, broad: 16, broadM: 22, fineK: 0.6, broadK: 0.3 };
/**
 * Far rock: rock beyond the near textures (the rock class and steep ground) takes the rock tile
 * (projected on the face where steep, not top-down, which smeared it) at two large scales, out to `range`: crags and
 * banding that hold from across the island, with the tile's normal map at those scales bending
 * the light (`bump`). Four fetches on rock pixels only (two in lite).
 */
export const ROCK_FAR = {
  range: 6000,
  scaleA: 7,
  scaleB: 29,
  strength: 0.55,
  bump: 0.9,
  flatten: 0.8,
};

/** Fall-line streaks on far rock: metres across a streak and along it, and their contrast. */
export const STREAK = { across: 38, along: 330, strength: 0.95, fine: 4.3 };

/** Bake the relief texture (see RELIEF) from the heightfield, every `stride`-th sample. */
export function bakeRelief(hf: Heightfield, stride: number) {
  const w = Math.floor((hf.width - 1) / stride) + 1,
    h = Math.floor((hf.height - 1) / stride) + 1;
  const src = hf.data;
  const heights = new Float32Array(w * h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) heights[j * w + i] = src[j * stride * hf.width + i * stride]!;
  // Box blur (running sums, clamped edges), separable.
  const blur = (from: Float32Array, r: number) => {
    const tmp = new Float32Array(w * h),
      out = new Float32Array(w * h);
    const k = 1 / (2 * r + 1);
    for (let j = 0; j < h; j++) {
      const row = j * w;
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += from[row + Math.min(w - 1, Math.max(0, i))]!;
      for (let i = 0; i < w; i++) {
        tmp[row + i] = sum * k;
        sum += from[row + Math.min(w - 1, i + r + 1)]! - from[row + Math.max(0, i - r)]!;
      }
    }
    for (let i = 0; i < w; i++) {
      let sum = 0;
      for (let j = -r; j <= r; j++) sum += tmp[Math.min(h - 1, Math.max(0, j)) * w + i]!;
      for (let j = 0; j < h; j++) {
        out[j * w + i] = sum * k;
        sum += tmp[Math.min(h - 1, j + r + 1) * w + i]! - tmp[Math.max(0, j - r) * w + i]!;
      }
    }
    return out;
  };
  const fineR = Math.max(1, Math.round(RELIEF.fine / stride)),
    broadR = Math.max(2, Math.round(RELIEF.broad / stride));
  const fine = blur(heights, fineR),
    broad = blur(fine, broadR);
  const data = new Uint8Array(w * h * 4);
  const e = 2 * hf.spacing;
  const W = hf.width,
    last = hf.height - 1;
  for (let j = 0; j < h; j++) {
    const gj = j * stride;
    const row = gj * W,
      up = Math.max(0, gj - 1) * W,
      down = Math.min(last, gj + 1) * W;
    for (let i = 0; i < w; i++) {
      const gi = i * stride;
      const hx = src[row + Math.min(W - 1, gi + 1)]! - src[row + Math.max(0, gi - 1)]!,
        hz = src[down + gi]! - src[up + gi]!;
      const inv = 127.5 / Math.sqrt(hx * hx + e * e + hz * hz);
      const k = j * w + i,
        o = k * 4;
      // Rounded on store (+0.5, truncated); every value is within 0–255 by construction.
      data[o] = 127.5 - hx * inv + 0.5;
      data[o + 1] = 127.5 - hz * inv + 0.5;
      // Above its surroundings (ridge, crest) > 0.5 > below them (gully, hollow).
      const c = (heights[k]! - fine[k]!) / RELIEF.fineM,
        b = (fine[k]! - broad[k]!) / RELIEF.broadM;
      data[o + 2] = c <= -1 ? 0 : c >= 1 ? 255 : 127.5 + 127.5 * c + 0.5;
      data[o + 3] = b <= -1 ? 0 : b >= 1 ? 255 : 127.5 + 127.5 * b + 0.5;
    }
  }
  return { data, width: w, height: h };
}

export function createTerrain(
  hf: Heightfield,
  landcover: { width: number; height: number; data: Uint8Array },
): TerrainControls {
  const n = hf.width - 1; // 2560 intervals
  const root = new THREE.Group();
  root.name = "br-terrain";

  // ---------------------------------------------------------------- textures
  const quantised = new Uint16Array(hf.data.length);
  for (let i = 0; i < hf.data.length; i++)
    quantised[i] = Math.max(0, Math.min(65535, Math.round((hf.data[i]! + HEIGHT_OFFSET) * 100)));
  const heightTex = new THREE.DataTexture(
    quantised,
    hf.width,
    hf.height,
    THREE.RedIntegerFormat,
    THREE.UnsignedShortType,
  );
  heightTex.internalFormat = "R16UI";
  heightTex.minFilter = heightTex.magFilter = THREE.NearestFilter;
  heightTex.generateMipmaps = false;
  heightTex.needsUpdate = true;
  // Relief: normals and cavities for every pixel (half resolution where textures are halved).
  const reliefStride = worldTextureScale() < 1 ? 2 : 1;
  const baked = bakeRelief(hf, reliefStride);
  const relief = new THREE.DataTexture(baked.data, baked.width, baked.height, THREE.RGBAFormat);
  relief.minFilter = THREE.LinearMipmapLinearFilter;
  relief.magFilter = THREE.LinearFilter;
  relief.generateMipmaps = true;
  relief.anisotropy = Math.min(8, worldAnisotropy());
  relief.needsUpdate = true;
  const [coverA, coverB] = landCoverWeights(landcover);
  const detail = detailNoise();

  // ---------------------------------------------------------------- patch geometry
  const geometry = patchGeometry(TERRAIN.patch);
  const patchAttr = new THREE.InstancedBufferAttribute(new Float32Array(4 * 4096), 4);
  patchAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aPatch", patchAttr);
  geometry.instanceCount = 0;

  const ranges = lodRanges(TERRAIN);

  const material = new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0 });
  let disposed = false;
  const uniforms = {
    uHeight: { value: heightTex },
    uCoverA: { value: coverA },
    uCoverB: { value: coverB },
    uDetail: { value: detail },
    uRelief: { value: relief },
    // World x/z → relief uv: texel centres sit on every `reliefStride`-th grid point.
    uReliefMap: {
      value: new THREE.Vector2(
        1 / (hf.spacing * reliefStride * baked.width),
        (WORLD_HALF / (hf.spacing * reliefStride) + 0.5) / baked.width,
      ),
    },
    uSurface: {
      value: new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1) as THREE.Texture,
    },
    uSurfaceOn: { value: 0 },
    uSpacing: { value: hf.spacing },
    uGrid: { value: n },
    uOffset: { value: HEIGHT_OFFSET },
    uMorph: {
      value: ranges.map((r) => new THREE.Vector2(r * TERRAIN.morphStart, r * TERRAIN.morphEnd)),
    },
    uCamera: { value: new THREE.Vector3() },
    // Ground textures (placeholders until loadGround; uGroundOn 0 keeps them unsampled).
    uGroundA: { value: placeholderArray() },
    uGroundN: { value: placeholderArray() },
    uGroundOn: { value: 0 },
    uGroundRange: { value: GROUND.range },
    uGroundLite: { value: 0 },
    uLayerTint: { value: GROUND_LAYERS.map(() => new THREE.Vector3(1, 1, 1)) },
    uLayerFar: { value: GROUND_LAYERS.map((id) => new THREE.Vector3(...LAYER_TARGET[id])) },
    uLayerScale: { value: GROUND_LAYERS.map(() => 0.25) },
    uRunway: { value: [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, 0, 0, 0)] },
    uRunwayW: { value: [0, 0] },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        precision highp usampler2D;
        uniform usampler2D uHeight;
        uniform float uSpacing, uGrid, uOffset;
        uniform vec2 uMorph[${TERRAIN.levels}];
        uniform vec3 uCamera;
        attribute vec4 aPatch; // origin x, origin z (grid intervals), step (intervals), level
        varying vec3 vWorld;
        float texH(ivec2 g) {
          g = clamp(g, ivec2(0), ivec2(int(uGrid)));
          return float(texelFetch(uHeight, g, 0).r) * 0.01 - uOffset;
        }
        float heightAtGrid(vec2 g) {
          vec2 f = fract(g);
          ivec2 i = ivec2(floor(g));
          float a = texH(i), b = texH(i + ivec2(1, 0)), c = texH(i + ivec2(0, 1)), d = texH(i + ivec2(1, 1));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `// Grid position of this vertex, morphed toward the next level's grid (CDLOD).
        vec2 cell = position.xz;
        vec2 g = aPatch.xy + cell * aPatch.z;
        int lvl = int(aPatch.w + 0.5);
        vec3 worldGuess = vec3(g.x * uSpacing - ${WORLD_HALF.toFixed(1)}, 0.0, g.y * uSpacing - ${WORLD_HALF.toFixed(1)});
        worldGuess.y = heightAtGrid(g);
        float dist = distance(worldGuess, uCamera);
        vec2 range = uMorph[lvl];
        float morph = clamp((dist - range.x) / max(1.0, range.y - range.x), 0.0, 1.0);
        vec2 odd = mod(cell, 2.0);
        vec2 gm = aPatch.xy + (cell - odd * morph) * aPatch.z;
        float h = heightAtGrid(gm);
        // The surface normal is per pixel (the relief texture), not per vertex.
        vec3 objectNormal = vec3(0.0, 1.0, 0.0);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = vec3(gm.x * uSpacing - ${WORLD_HALF.toFixed(1)}, h, gm.y * uSpacing - ${WORLD_HALF.toFixed(1)});
        vWorld = transformed;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform sampler2D uCoverA, uCoverB, uDetail, uRelief;
        uniform vec2 uReliefMap;
        vec3 brNw = vec3(0.0, 1.0, 0.0);
        precision highp sampler2DArray;
        uniform sampler2DArray uGroundA, uGroundN;
        uniform sampler2D uSurface;
        uniform float uSurfaceOn;
        uniform float uGroundOn, uGroundRange, uGroundLite;
        uniform vec3 uLayerTint[${GROUND_LAYERS.length}], uLayerFar[${GROUND_LAYERS.length}];
        uniform float uLayerScale[${GROUND_LAYERS.length}];
        uniform vec4 uRunway[2];
        uniform float uRunwayW[2];
        varying vec3 vWorld;
        const int CLASS_A[8] = int[8](${CLASSES.map((c) => c.a).join(", ")});
        const int CLASS_B[8] = int[8](${CLASSES.map((c) => c.b).join(", ")});
        // Every ground and noise sample below sits inside a branch on distance, zone or slope,
        // and a texture's automatic mip level is undefined on the pixels where neighbours take
        // different branches: along those borders (rings round the camera, zone edges) single
        // pixels read the sharpest mip and drew dashed white lines on the ground that moved
        // with the camera (owner, 2026-11-10). So each sample is given its gradients, taken
        // once from the world position at the top of main (brDx, brDy).
        vec3 brDx, brDy;
        vec3 groundAlbedo(int layer, vec2 p, vec2 px, vec2 py) {
          float k = uLayerScale[layer];
          k *= ${GROUND.sharpen.toFixed(2)};
          vec3 c = textureGrad(uGroundA, vec3(p * uLayerScale[layer], float(layer)), px * k, py * k).rgb;
          return c * c * uLayerTint[layer]; // sRGB → linear (cheap square), toward the palette
        }
        vec3 groundNormal(int layer, vec2 p, vec2 px, vec2 py) {
          float k = uLayerScale[layer];
          return textureGrad(uGroundN, vec3(p * k, float(layer)), px * k, py * k).rgb * 2.0 - 1.0;
        }
        vec3 groundAlbedo(int layer, vec2 xz) { return groundAlbedo(layer, xz, brDx.xz, brDy.xz); }
        vec3 groundNormal(int layer, vec2 xz) { return groundNormal(layer, xz, brDx.xz, brDy.xz); }
        // The shared noise at m · xz + offset (every use of it is linear in the world position).
        vec4 detailAt(mat2 m, vec2 offset) {
          return textureGrad(uDetail, m * vWorld.xz + offset, m * brDx.xz, m * brDy.xz);
        }
        // A class at this spot: its variant pair blended by a large-patch noise.
        void groundClass(int k, vec2 xz, float v, out vec3 col, out vec3 nrm) {
          int la = CLASS_A[k], lb = CLASS_B[k];
          if (la == lb || v < 0.01) { col = groundAlbedo(la, xz); nrm = groundNormal(la, xz); }
          else if (v > 0.99) { col = groundAlbedo(lb, xz); nrm = groundNormal(lb, xz); }
          else {
            col = mix(groundAlbedo(la, xz), groundAlbedo(lb, xz), v);
            nrm = mix(groundNormal(la, xz), groundNormal(lb, xz), v);
          }
        }
        float segDist(vec2 p, vec4 s) {
          vec2 a = s.xy, ab = s.zw - s.xy;
          float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-3), 0.0, 1.0);
          return length(p - (a + ab * t));
        }
        vec3 brDetailNormal = vec3(0.0, 1.0, 0.0);
        float brDetailK = 0.0;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        {
          brDx = dFdx(vWorld);
          brDy = dFdy(vWorld);
          vec2 uv = (vWorld.xz + ${WORLD_HALF.toFixed(1)}) / ${WORLD_SIZE.toFixed(1)};
          // Relief: this pixel's surface normal and cavities, from the full heightfield.
          vec4 relief = texture2D(uRelief, vWorld.xz * uReliefMap.x + uReliefMap.y);
          vec2 nxz = relief.rg * 2.0 - 1.0;
          brNw = normalize(vec3(nxz.x, sqrt(max(0.05, 1.0 - dot(nxz, nxz))), nxz.y));
          vec4 a = texture2D(uCoverA, uv); // sand, grass, field, forest floor
          vec4 b = texture2D(uCoverB, uv); // rock, urban, road, (shore)
          // Ragged zone borders (AIR.wobble): the land cover and the aerial bake are read a few
          // metres off by two noises. The same offset at every distance, so a border stays
          // where it is as the camera comes closer; none on roads, lots, shores and beaches,
          // which have to stay on their lines.
          float natural = uGroundOn * (1.0 - clamp(a.r + b.g + b.b + b.a, 0.0, 1.0));
          vec3 d1 = detailAt(mat2(${(1 / AIR.periodA).toFixed(6)}, 0.0, 0.0, ${(1 / AIR.periodA).toFixed(6)}), vec2(0.19)).rgb;
          vec3 d2 = detailAt(mat2(0.8, -0.6, 0.6, 0.8) * ${(1 / AIR.periodB).toFixed(6)}, vec2(0.53)).rgb;
          vec2 d3 = detailAt(mat2(${(1 / AIR.wobblePeriod).toFixed(6)}, 0.0, 0.0, ${(1 / AIR.wobblePeriod).toFixed(6)}), vec2(0.41)).rb;
          vec2 airWarp = ((vec2(d1.g, d2.g) - 0.5) * ${(AIR.warp * 2).toFixed(1)} + (d3 - 0.5) * ${(AIR.wobble * 2).toFixed(1)}) * (natural / ${WORLD_SIZE.toFixed(1)});
          // (Read unconditionally: a fetch inside a branch has no defined mip level at its edge.)
          a = texture2D(uCoverA, uv + airWarp);
          b = texture2D(uCoverB, uv + airWarp);
          float n1 = texture2D(uDetail, vWorld.xz / 23.0).r;
          float n2 = texture2D(uDetail, vWorld.xz / 180.0).g;
          float n3 = texture2D(uDetail, vWorld.xz / 3.1).b;
          float w[8] = float[8](a.r, a.g, a.b, a.a, b.r, b.g, b.b, b.a);
          // Variant pairs change over large patches (fields per ~60 m, the rest per ~120 m).
          float vn = texture2D(uDetail, vWorld.xz / 610.0 + 0.37).r;
          float vf = texture2D(uDetail, vWorld.xz / 260.0 + 0.71).g;
          float vPatch = smoothstep(0.44, 0.56, vn);
          float vField = smoothstep(0.47, 0.53, vf);
          // AIR: ragged zone borders and resolvable grain between the near textures and the haze.
          float camDist = distance(vWorld, cameraPosition);
          float airRange = uGroundOn * smoothstep(${(GROUND.range * 0.6).toFixed(1)}, ${(GROUND.range * 1.6).toFixed(1)}, camDist) * (1.0 - smoothstep(${(AIR.range * 0.6).toFixed(1)}, ${AIR.range.toFixed(1)}, camDist));
          // Roads keep an even surface (their mesh carries its own asphalt). Lots and yards take
          // most of the grain: without it their concrete half was a smooth grey wash beside
          // the grainy gravel half, sharp and blurred patches in one yard (owner, 2026-11-11).
          float air = airRange * (1.0 - clamp(${AIR.lots.toFixed(2)} * b.g + b.b, 0.0, 1.0));
          float airGrain = 0.0;
          if (air > 0.0) {
            // Clumps with edges: the fine cells through a contrast curve, two broader octaves under them.
            float fineCells = smoothstep(0.3, 0.7, 0.5 * (d1.b + d2.b)) - 0.5;
            airGrain = air * (fineCells * ${AIR.fine.toFixed(2)} + (d2.g - 0.5) * ${AIR.mid.toFixed(2)} + (d1.r - 0.5) * ${AIR.broad.toFixed(2)});
          }
          // Far field: each class's colour is its textures' mean (pulled to the palette).
          vec3 col = vec3(0.0);
          if (uSurfaceOn > 0.5) {
            // Offline blended real tile albedo, unique across the island. One mipmapped fetch
            // replaces the eight-class far-colour blend, including parcel/macro detail.
            vec3 surface = texture2D(uSurface, uv + airWarp).rgb;
            col = surface * surface;
            if (airRange > 0.0) {
              // Hard zone borders (AIR.edge): the winning zone's colour, tinted by the bake.
              // Lots, yards and roads too: their edges stay where they are, but meet the grass
              // on a line instead of a fade.
              int c1 = 0, c2 = 1;
              if (w[1] > w[0]) { c1 = 1; c2 = 0; }
              vec3 soft = vec3(0.0);
              float total = 0.0;
              for (int k = 0; k < 8; k++) {
                if (k > 1) {
                  if (w[k] > w[c1]) { c2 = c1; c1 = k; }
                  else if (w[k] > w[c2]) c2 = k;
                }
                soft += mix(uLayerFar[CLASS_A[k]], uLayerFar[CLASS_B[k]], k == 2 ? vField : vPatch) * w[k];
                total += w[k];
              }
              soft /= max(total, 1e-3);
              vec3 z1 = mix(uLayerFar[CLASS_A[c1]], uLayerFar[CLASS_B[c1]], c1 == 2 ? vField : vPatch);
              vec3 z2 = mix(uLayerFar[CLASS_A[c2]], uLayerFar[CLASS_B[c2]], c2 == 2 ? vField : vPatch);
              float share = w[c2] / max(w[c1] + w[c2], 1e-3);
              vec3 hard = mix(z1, z2, 0.5 * smoothstep(${(0.5 - AIR.edge).toFixed(2)}, 0.5, share));
              col = mix(col, hard * clamp(col / max(soft, vec3(1e-3)), 0.72, 1.35), airRange * ${AIR.crisp.toFixed(2)});
            }
          } else {
            float total = 0.0;
            for (int k = 0; k < 8; k++) {
              float v = k == 2 ? vField : vPatch;
              col += mix(uLayerFar[CLASS_A[k]], uLayerFar[CLASS_B[k]], v) * w[k];
              total += w[k];
            }
            col /= max(total, 1e-3);
          }
          col = mix(col, col * vec3(1.08, 1.06, 0.92), (n2 - 0.5) * 0.6 * (a.g + a.b));
          vec3 rock = uLayerFar[${L("rock")}];
          // Steep ground (from ~45°) is bare rock, whatever the land cover says, except on river
          // and lake banks (the shore class), which stay earth and grass rather than grey cliffs.
          float bank = clamp(b.a + a.r, 0.0, 1.0);
          float steep = smoothstep(0.3, 0.5, 1.0 - brNw.y) * (1.0 - smoothstep(0.15, 0.5, bank));
          // Inland banks (shore and sand classes above sea level): damp earth and grass instead
          // of pale beach sand; the sea's beaches stay sand.
          float inlandShore = bank * smoothstep(3.0, 6.0, vWorld.y);
          col = mix(col, mix(uLayerFar[${L("mud")}], uLayerFar[${L("grass")}], 0.35 + 0.4 * n2) * 0.85, inlandShore * 0.75);
          // Sea beaches: the sand darkens where the waves wet it, just above the waterline.
          col *= mix(1.0, 0.68, (a.r + b.a) * (1.0 - smoothstep(0.15, 1.1, vWorld.y)) * step(-2.0, vWorld.y));
          col = mix(col, rock * (0.85 + 0.3 * n1), steep);
          // Rock strata: darker and lighter bands with height (Iron Peaks, quarry walls).
          // Irregular weathering rather than high-frequency horizontal zebra bands at distance.
          float strata = 0.91 + 0.10 * n2 + 0.05 * n1;
          col = mix(col, col * strata, b.r + steep);
          // High peaks: snow on the flats of the tops only (Iron Peaks' summits rise to ~480 m
          // since the 2026-11-04 audit; the rock faces below stay grey).
          float snow = smoothstep(395.0, 425.0, vWorld.y + n2 * 25.0) * (1.0 - steep);
          col = mix(col, uLayerFar[${L("snow")}], snow);
          // Runways: concrete tiles along the airfield's strips.
          float runway = 0.0;
          for (int r = 0; r < 2; r++)
            runway = max(runway, 1.0 - smoothstep(uRunwayW[r] * 0.5 - 1.5, uRunwayW[r] * 0.5, segDist(vWorld.xz, uRunway[r])));
          col = mix(col, uLayerFar[${L("tiles")}], runway);
          // Lots and yards from afar: the aerial bake holds the gravel and concrete tiles' pale
          // stones at 2.4 m a texel, which read as blurred cobbles the size of cars from the
          // air. Beyond the near textures they take the layers' own colour instead.
          // (From the air a lot ends on a line: its share of the ground, hardened.)
          float lot = mix(b.g, smoothstep(0.38, 0.5, b.g), airRange);
          col = mix(col, mix(uLayerFar[${L("concrete")}], uLayerFar[${L("gravel")}], vPatch) * (0.9 + 0.22 * n1), uGroundOn * lot * (1.0 - runway) * 0.8 * smoothstep(${(GROUND.range * 0.7).toFixed(1)}, ${(GROUND.range * 2.2).toFixed(1)}, distance(vWorld, cameraPosition)));
          // Near the camera: the zones' real textures; beyond, a mid-field grain (MID).
          float near = uGroundOn * (1.0 - smoothstep(uGroundRange * 0.6, uGroundRange, camDist));
          float mid = uGroundOn * (1.0 - smoothstep(${(MID.range * 0.55).toFixed(1)}, ${MID.range.toFixed(1)}, camDist)) * (1.0 - near);
          // Where the near tile is filtered away at a grazing angle (GROUND.grazeFrom): the
          // pixel's footprint on the ground along the view, in metres.
          float foot = max(length(brDx.xz), length(brDy.xz));
          // (Not on the lite ground: it is there to save these fetches on a GPU that is behind.)
          float graze = near * (1.0 - uGroundLite) * smoothstep(${GROUND.grazeFrom.toFixed(2)}, ${GROUND.grazeTo.toFixed(2)}, foot);
          vec3 midRatio = vec3(1.0);
          float midStony = 0.0;
          int k1 = 0, k2 = 1;
          if (near > 0.0 || mid > 0.0) {
            if (w[1] > w[0]) { k1 = 1; k2 = 0; }
            for (int k = 2; k < 8; k++) {
              if (w[k] > w[k1]) { k2 = k1; k1 = k; }
              else if (w[k] > w[k2]) k2 = k;
            }
          }
          vec3 midNormal = vec3(0.0, 0.0, 1.0);
          if (mid > 0.0 || graze > 0.0) {
            int lm = (k1 == 2 ? vField : vPatch) > 0.5 ? CLASS_B[k1] : CLASS_A[k1];
            lm = runway > 0.5 ? ${L("tiles")} : steep > 0.5 ? ${L("rock")} : lm;
            // Concrete and asphalt enlarged are soft cloudy blotches (a car park, a yard): beside the gravel half of the same yard
            // it read as an out-of-focus patch (owner, 2026-11-11: "some parts blurry and some
            // not"). Its grain comes from the gravel tile instead (a ratio to that tile's own
            // mean, so each keeps its own colour).
            int lt = lm == ${L("concrete")} || lm == ${L("asphalt")} ? ${L("gravel")} : lm;
            // Steep rock: projected on the face (top-down it smears down the slope).
            bool mSide = steep > 0.5, mX = abs(brNw.x) > abs(brNw.z);
            vec2 mp = mSide ? (mX ? vWorld.zy : vWorld.xy) : vWorld.xz;
            vec2 mpx = mSide ? (mX ? brDx.zy : brDx.xy) : brDx.xz;
            vec2 mpy = mSide ? (mX ? brDy.zy : brDy.xy) : brDy.xz;
            vec2 mxz = mp / ${MID.scale.toFixed(1)};
            // Two samples, rotated and at another scale, so the tile's repeat does not show as a
            // lattice. The second is the tile at closeScale under the parachute (a pixel still
            // resolves its tufts and stones there) and fades to the wide breaker with distance;
            // two fixed scales cross-faded, never a scale that slides as the camera moves.
            float wide = smoothstep(${MID.closeFrom.toFixed(1)}, ${MID.closeTo.toFixed(1)}, camDist);
            mat2 m2 = mat2(0.8, -0.6, 0.6, 0.8) * ${(1 / (MID.scale * 1.7)).toFixed(6)};
            mat2 m3 = mat2(0.6, 0.8, -0.8, 0.6) * ${(1 / MID.closeScale).toFixed(6)};
            vec2 mxz2 = m2 * mp + 31.7;
            vec2 mxz3 = m3 * mp + 7.9;
            vec3 far = max(uLayerFar[lt], vec3(1e-3));
            // Lite (slow GPUs): one sample; the lattice is far less visible than a lower resolution.
            vec2 mdx = mpx / ${MID.scale.toFixed(1)}, mdy = mpy / ${MID.scale.toFixed(1)};
            vec3 midA = groundAlbedo(lt, mxz, mdx, mdy);
            vec3 midB = midA;
            if (uGroundLite < 0.5) {
              vec3 wideB = wide > 0.0 ? groundAlbedo(lt, mxz2, m2 * mpx, m2 * mpy) : vec3(0.0);
              vec3 closeB = wide < 1.0 ? groundAlbedo(lt, mxz3, m3 * mpx, m3 * mpy) : vec3(0.0);
              midB = mix(closeB, wideB, wide);
            }
            // The ratio to the layer's mean, compressed so dark layers do not saturate (less so
            // under the parachute, where the tile is the texture the eye looks for).
            vec3 raw = 0.5 * (midA + midB) / far;
            vec3 ratio = mix(mix(raw, sqrt(raw), 0.3), mix(raw, sqrt(raw), 0.75), wide);
            ratio = clamp(ratio, 0.6, 1.6);
            // Stony layers (mud, rock, gravel, concrete, tiles, asphalt) barely take it: enlarged,
            // their pale stones repeat on the tile's lattice, and across a gravel lot or a yard
            // they lined up as dotted white lines that came and went with the camera (owner,
            // 2026-11-10). Grass, moss, straw, soil, forest floor and sand have no such features.
            float stony = lm > ${L("sand")} ? 1.0 : 0.0;
            col *= mix(vec3(1.0), ratio, mid * ${MID.albedo.toFixed(2)} * (1.0 - snow) * (1.0 - ${MID.stony.toFixed(2)} * stony));
            midRatio = ratio;
            midStony = stony;
            // (No mid normal on rock: one tile at one scale shows as a weave on a bare slope;
            // the far-rock relief lights it instead.)
            midNormal = stony > 0.5 ? vec3(0.0, 0.0, 1.0) : groundNormal(lm, mxz, mdx, mdy);
          }
          // AIR grain on soft ground only (runways, rock and snow keep their bake).
          if (airGrain != 0.0)
            col *= 1.0 + airGrain * (1.0 - runway) * (1.0 - steep) * (1.0 - snow);
          if (near > 0.0) {
            float s = max(w[k1] + w[k2], 1e-3);
            float w2 = w[k2] / s;
            vec2 xz = vWorld.xz;
            vec3 c1, t1, c2, t2;
            groundClass(k1, xz, k1 == 2 ? vField : vPatch, c1, t1);
            // Tiling breaker: the main zone again, rotated and at another scale (not in lite).
            if (uGroundLite < 0.5) {
              mat2 mr = mat2(0.8, -0.6, 0.6, 0.8) * 0.37;
              vec3 c1b = groundAlbedo(CLASS_A[k1], mr * xz + 17.3, mr * brDx.xz, mr * brDy.xz);
              c1 = mix(c1, c1b, 0.3);
            }
            vec3 nc = c1, nt = t1;
            // Lite: the second zone only where it is a real share of the blend (zone borders).
            if (w2 > (uGroundLite > 0.5 ? 0.3 : 0.03)) {
              groundClass(k2, xz, k2 == 2 ? vField : vPatch, c2, t2);
              nc = mix(c1, c2, w2);
              nt = mix(t1, t2, w2);
            }
            if (runway > 0.0) {
              nc = mix(nc, groundAlbedo(${L("tiles")}, xz), runway);
              nt = mix(nt, groundNormal(${L("tiles")}, xz), runway);
            }
            if (steep > 0.01) {
              // Rock on the slopes, projected sideways (no stretching).
              vec3 ax = abs(brNw);
              vec3 side = ax.x > ax.z ? groundAlbedo(${L("rock")}, vWorld.zy, brDx.zy, brDy.zy) : groundAlbedo(${L("rock")}, vWorld.xy, brDx.xy, brDy.xy);
              nc = mix(nc, side * (0.85 + 0.3 * n1), steep);
              nt = mix(nt, vec3(0.0, 0.0, 1.0), steep);
            }
            if (snow > 0.01) {
              nc = mix(nc, groundAlbedo(${L("snow")}, xz), snow);
              nt = mix(nt, groundNormal(${L("snow")}, xz), snow);
            }
            nc *= 0.9 + 0.12 * n1 + 0.06 * n3;
            // Grazing: the enlarged tile's grain over the near colour (graze already holds near).
            if (graze > 0.0)
              nc *= mix(vec3(1.0), midRatio, (graze / near) * ${MID.albedo.toFixed(2)} * (1.0 - snow) * (1.0 - ${MID.stony.toFixed(2)} * midStony));
            col = mix(col, nc, near);
            // Tangent frame on the terrain: x along +x, y along +z, z the surface normal.
            vec3 N = brNw;
            vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
            vec3 B = cross(T, N);
            brDetailNormal = normalize(T * nt.x + B * nt.y + N * max(nt.z, 0.2));
            brDetailK = near * ${GROUND.normal.toFixed(2)};
          } else {
            col *= 0.86 + 0.18 * n1 + 0.08 * n3;
          }
          if (mid > 0.0 || graze > 0.0) {
            vec3 N = brNw;
            vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
            vec3 B = cross(T, N);
            vec3 mn = normalize(T * midNormal.x + B * midNormal.y + N * max(midNormal.z, 0.2));
            float mk = max(mid, graze) * ${MID.normal.toFixed(2)};
            brDetailNormal = brDetailK > 0.0 ? normalize(mix(brDetailNormal, mn, mk / (brDetailK + mk))) : mn;
            brDetailK = max(brDetailK, mk);
          }
          // Far rock (ROCK_FAR): crags on rock beyond the near textures, lit as relief.
          float rocky = clamp(b.r + steep, 0.0, 1.0) * (1.0 - snow) * (1.0 - runway);
          float rockFar = uGroundOn * rocky * (1.0 - near) * (1.0 - smoothstep(${(ROCK_FAR.range * 0.6).toFixed(1)}, ${ROCK_FAR.range.toFixed(1)}, camDist));
          if (rockFar > 0.01) {
            bool sSide = steep > 0.5, sX = abs(brNw.x) > abs(brNw.z);
            vec2 sp = sSide ? (sX ? vWorld.zy : vWorld.xy) : vWorld.xz;
            vec2 spx = sSide ? (sX ? brDx.zy : brDx.xy) : brDx.xz;
            vec2 spy = sSide ? (sX ? brDy.zy : brDy.xy) : brDy.xz;
            vec3 far = max(uLayerFar[${L("rock")}], vec3(1e-3));
            // The aerial bake holds the rock tile's pale stones at 2.4 m a texel: from afar
            // they read as polka dots. Far rock starts from the rock's own colour instead.
            col = mix(col, far * (0.86 + 0.2 * n2 + 0.1 * n1), rockFar * ${ROCK_FAR.flatten.toFixed(2)} * smoothstep(${(GROUND.range * 1.5).toFixed(1)}, ${(GROUND.range * 4).toFixed(1)}, camDist));
            vec2 pa = sp / ${ROCK_FAR.scaleA.toFixed(1)};
            vec2 pax = spx / ${ROCK_FAR.scaleA.toFixed(1)}, pay = spy / ${ROCK_FAR.scaleA.toFixed(1)};
            vec3 ra = groundAlbedo(${L("rock")}, pa, pax, pay);
            vec3 rn = groundNormal(${L("rock")}, pa, pax, pay);
            if (uGroundLite < 0.5) {
              mat2 mb = mat2(0.8, -0.6, 0.6, 0.8) * ${(1 / ROCK_FAR.scaleB).toFixed(6)};
              vec2 pb = mb * sp + 11.3;
              ra = 0.5 * (ra + groundAlbedo(${L("rock")}, pb, mb * spx, mb * spy));
              rn += groundNormal(${L("rock")}, pb, mb * spx, mb * spy);
            }
            col *= mix(vec3(1.0), clamp(sqrt(ra / far), 0.62, 1.5), rockFar * ${ROCK_FAR.strength.toFixed(2)});
            // Fall-line streaks: gullies, chutes and scree run down the slope. The shared noise,
            // stretched down three fixed directions and weighted by how well each follows the
            // slope here (a frame turning per pixel would swirl); one direction in lite.
            vec2 fall = brNw.xz / max(length(brNw.xz), 1e-3);
            float slope = smoothstep(0.02, 0.16, 1.0 - brNw.y);
            vec3 wd = vec3(abs(fall.x), abs(dot(fall, vec2(0.5, 0.866))), abs(dot(fall, vec2(-0.5, 0.866))));
            wd = wd * wd; wd = wd * wd; wd = wd * wd;
            // Across and along a streak, down three fixed directions (uv = m · xz).
            float ia = ${(1 / STREAK.across).toFixed(6)}, il = ${(1 / STREAK.along).toFixed(6)};
            mat2 s1 = mat2(0.0, il, ia, 0.0);
            mat2 s2 = mat2(-0.866 * ia, 0.5 * il, 0.5 * ia, 0.866 * il);
            mat2 s3 = mat2(0.866 * ia, -0.5 * il, 0.5 * ia, 0.866 * il);
            float sx = detailAt(s1, vec2(0.0)).r;
            float streak;
            if (uGroundLite > 0.5) {
              streak = sx;
              slope *= step(max(wd.y, wd.z), wd.x);
            } else {
              float sy = detailAt(s2, vec2(0.31)).g;
              float sz = detailAt(s3, vec2(0.67)).b;
              streak = dot(vec3(sx, sy, sz), wd) / max(wd.x + wd.y + wd.z, 1e-3);
              // A finer octave where a pixel resolves it (within ~1.5 km).
              float fineS = 1.0 - smoothstep(700.0, 1600.0, camDist);
              if (fineS > 0.0) {
                float f = ${STREAK.fine.toFixed(1)};
                vec3 fs = vec3(
                  detailAt(s1 * f, vec2(0.13)).g,
                  detailAt(s2 * f, vec2(0.47)).b,
                  detailAt(s3 * f, vec2(0.83)).r);
                streak += (dot(fs, wd) / max(wd.x + wd.y + wd.z, 1e-3) - 0.5) * 0.7 * fineS;
              }
            }
            col *= 1.0 + (streak - 0.5) * ${STREAK.strength.toFixed(2)} * slope * rockFar;
            vec3 T = normalize(vec3(1.0, 0.0, 0.0) - brNw * brNw.x);
            vec3 B = cross(T, brNw);
            brNw = normalize(brNw + (T * rn.x + B * rn.y) * rockFar * ${ROCK_FAR.bump.toFixed(2)});
          }
          // Cavities: gullies and hollows darker, ridges and crests lighter; strongest on rock.
          col *= 1.0 + (relief.b - 0.5) * 2.0 * ${RELIEF.fineK.toFixed(2)} * (0.45 + 0.55 * rocky);
          col *= 1.0 + (relief.a - 0.5) * 2.0 * ${RELIEF.broadK.toFixed(2)};
          diffuseColor.rgb = col;
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        if (brDetailK > 0.0)
          normal = normalize(mix(normal, normalize((viewMatrix * vec4(brDetailNormal, 0.0)).xyz), brDetailK));`,
      )
      .replace(
        "#include <normal_fragment_begin>",
        `#include <normal_fragment_begin>
        normal = normalize((viewMatrix * vec4(brNw, 0.0)).xyz);
        nonPerturbedNormal = normal;`,
      );
  };
  material.customProgramCacheKey = () => "br-terrain-v6";

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "br-terrain-patches";
  mesh.frustumCulled = false;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  root.add(mesh);

  // ---------------------------------------------------------------- quadtree selection
  const minMax = buildMinMax(hf, TERRAIN.patch, TERRAIN.levels);
  const frustum = new THREE.Frustum(),
    viewProjection = new THREE.Matrix4(),
    box = new THREE.Box3();
  const cam = new THREE.Vector3();
  const visible = (b: Float64Array) => {
    box.min.set(b[0]!, b[1]!, b[2]!);
    box.max.set(b[3]!, b[4]!, b[5]!);
    return frustum.intersectsBox(box);
  };
  let count = 0;

  return {
    root,
    textures: { height: heightTex, coverA, coverB },
    heightGrid: { spacing: hf.spacing, grid: n, offset: HEIGHT_OFFSET },
    update(camera) {
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      cam.setFromMatrixPosition(camera.matrixWorld);
      uniforms.uCamera.value.copy(cam);
      count = selectPatches(
        TERRAIN,
        minMax,
        n,
        hf.spacing,
        cam,
        patchAttr.array as Float32Array,
        visible,
      );
      geometry.instanceCount = count;
      patchAttr.addUpdateRange(0, count * 4);
      patchAttr.needsUpdate = true;
    },
    stats: () => ({
      patches: count,
      triangles: count * TERRAIN.patch * TERRAIN.patch * 2,
    }),
    async loadGround(dir, runways) {
      const base = dir.endsWith("/") ? dir : dir + "/";
      const meta = (await (await fetch(base + "ground.json")).json()) as {
        albedo: number;
        normal: number;
        layers: Array<{ id: string; size: number; mean: [number, number, number] }>;
      };
      const [albedo, normal, surface] = await Promise.all([
        loadArray(base + "albedo.webp", meta.albedo, meta.layers.length),
        loadArray(base + "normal.webp", meta.normal, meta.layers.length),
        new THREE.TextureLoader().loadAsync(base + "surface-v1.webp").catch(() => null),
      ]);
      if (disposed) {
        albedo.dispose();
        normal.dispose();
        surface?.dispose();
        return;
      }
      if (surface) {
        // Image rows follow the heightfield's north-to-south order, as the data textures do.
        surface.flipY = false;
        surface.colorSpace = THREE.NoColorSpace;
        surface.anisotropy = worldAnisotropy();
        shrinkImageTexture(surface);
        uniforms.uSurface.value.dispose();
        uniforms.uSurface.value = surface;
        uniforms.uSurfaceOn.value = 1;
      }
      // The shader decodes the albedo with a square; the mean is linear (build_ground.mjs).
      GROUND_LAYERS.forEach((id, i) => {
        const l = meta.layers[i];
        if (!l || l.id !== id) throw new Error(`ground layer ${i}: ${l?.id} ≠ ${id}`);
        const target = LAYER_TARGET[id];
        const tint = l.mean.map((m, c) =>
          THREE.MathUtils.clamp(1 + (target[c]! / Math.max(m, 1e-4) - 1) * PALETTE_PULL, 0.35, 14),
        );
        uniforms.uLayerTint.value[i]!.set(tint[0]!, tint[1]!, tint[2]!);
        uniforms.uLayerFar.value[i]!.set(
          l.mean[0] * tint[0]!,
          l.mean[1] * tint[1]!,
          l.mean[2] * tint[2]!,
        );
        uniforms.uLayerScale.value[i] = 1 / l.size;
      });
      runways.slice(0, 2).forEach((r, i) => {
        uniforms.uRunway.value[i]!.set(r.a[0]!, r.a[1]!, r.b[0]!, r.b[1]!);
        uniforms.uRunwayW.value[i] = r.width;
      });
      uniforms.uGroundA.value.dispose();
      uniforms.uGroundN.value.dispose();
      uniforms.uGroundA.value = albedo;
      uniforms.uGroundN.value = normal;
      uniforms.uGroundOn.value = 1;
    },
    groundLayer(id) {
      if (!uniforms.uGroundOn.value && uniforms.uGroundA.value.image.depth <= 1) return null;
      const i = GROUND_LAYERS.indexOf(id);
      return {
        albedo: uniforms.uGroundA.value,
        layer: i,
        scale: uniforms.uLayerScale.value[i]!,
        tint: uniforms.uLayerTint.value[i]!,
        far: uniforms.uLayerFar.value[i]!,
      };
    },
    setGroundLite(on) {
      uniforms.uGroundLite.value = on ? 1 : 0;
    },
    setGroundRange(m) {
      uniforms.uGroundRange.value = Math.max(1, m);
      uniforms.uGroundOn.value = m > 0 && uniforms.uGroundA.value.image.depth > 1 ? 1 : 0;
    },
    dispose() {
      disposed = true;
      uniforms.uSurface.value.dispose();
      uniforms.uGroundA.value.dispose();
      uniforms.uGroundN.value.dispose();
      geometry.dispose();
      material.dispose();
      heightTex.dispose();
      coverA.dispose();
      coverB.dispose();
      detail.dispose();
      relief.dispose();
    },
  };
}

const HEIGHT_OFFSET = 50;

/**
 * Patch: (q+1)² grid vertices in cell units (0..q on x/z, y = 0). Every quad is split along the
 * same diagonal, so when the odd vertices collapse onto the even ones (full morph) the patch
 * becomes exactly the next level's triangulation: no shading pop at the switch.
 */
function patchGeometry(q: number) {
  const positions: number[] = [];
  const index: number[] = [];
  for (let z = 0; z <= q; z++) for (let x = 0; x <= q; x++) positions.push(x, 0, z);
  const id = (x: number, z: number) => z * (q + 1) + x;
  for (let z = 0; z < q; z++)
    for (let x = 0; x < q; x++) {
      const a = id(x, z),
        b = id(x + 1, z),
        c = id(x, z + 1),
        d = id(x + 1, z + 1);
      index.push(a, c, d, a, d, b);
    }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  // The shader places every vertex; bounds are irrelevant (the mesh is never frustum-culled).
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), WORLD_SIZE);
  return g;
}

/**
 * Land cover (class per texel) → two RGBA weight textures, softened over ~3 texels so class
 * borders blend instead of stepping. A: sand, grass, field, forest. B: rock, urban, road, shore
 * (water texels become a muddy shore colour for the beds of lakes and rivers).
 */
function landCoverWeights(cover: { width: number; height: number; data: Uint8Array }) {
  const { width: w, height: h, data } = cover;
  const id = (name: string) => LAND_COVER.indexOf(name as (typeof LAND_COVER)[number]);
  const slots = [
    ["sand", "grass", "field", "forest"],
    ["rock", "urban", "road", "water"],
  ].map((names) => names.map(id));
  const textures: THREE.DataTexture[] = [];
  for (const slot of slots) {
    const plane = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const c = data[i]!;
      for (let k = 0; k < 4; k++) if (slot[k] === c) plane[i * 4 + k] = 1;
    }
    blur(plane, w, h, 2);
    const bytes = new Uint8Array(w * h * 4);
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.round(plane[i]! * 255);
    const t = new THREE.DataTexture(bytes, w, h, THREE.RGBAFormat);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    textures.push(t);
  }
  return textures as [THREE.DataTexture, THREE.DataTexture];
}

/** Separable box blur (radius r) over an RGBA float plane, in place. */
function blur(p: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(p.length);
  const pass = (src: Float32Array, dst: Float32Array, horizontal: boolean) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 4; c++) {
          let s = 0,
            k = 0;
          for (let d = -r; d <= r; d++) {
            const xx = horizontal ? x + d : x,
              yy = horizontal ? y : y + d;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            s += src[(yy * w + xx) * 4 + c]!;
            k++;
          }
          dst[(y * w + x) * 4 + c] = s / k;
        }
  };
  pass(p, tmp, true);
  pass(tmp, p, false);
}

/** 256² tiling value noise in three channels (detail at three scales). */
function detailNoise() {
  const s = 256,
    bytes = new Uint8Array(s * s * 4);
  let seed = 1337;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let c = 0; c < 3; c++) {
    const cells = [8, 16, 32][c]!;
    const lattice = Array.from({ length: cells * cells }, rand);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const fx = (x / s) * cells,
          fy = (y / s) * cells;
        const ix = Math.floor(fx),
          iy = Math.floor(fy);
        const tx = fx - ix,
          ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx),
          sy = ty * ty * (3 - 2 * ty);
        const v = (a: number, b: number) =>
          lattice[((b + cells) % cells) * cells + ((a + cells) % cells)]!;
        const value =
          (v(ix, iy) * (1 - sx) + v(ix + 1, iy) * sx) * (1 - sy) +
          (v(ix, iy + 1) * (1 - sx) + v(ix + 1, iy + 1) * sx) * sy;
        bytes[(y * s + x) * 4 + c] = Math.round(value * 255);
      }
  }
  for (let i = 3; i < bytes.length; i += 4) bytes[i] = 255;
  const t = new THREE.DataTexture(bytes, s, s, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** A 1 × 1 × 1 texture array, so the shader compiles before the ground textures arrive. */
function placeholderArray() {
  const t = new THREE.DataArrayTexture(new Uint8Array([128, 128, 255, 255]), 1, 1, 1);
  t.needsUpdate = true;
  return t;
}

/** A vertical strip of square layers (build_ground.mjs) into a mipmapped texture array. */
async function loadArray(url: string, size: number, layers: number) {
  const blob = await (await fetch(url)).blob();
  const bitmap = await createImageBitmap(blob);
  // Low tier: half-size layers, each scaled from its own rows (no bleed between layers).
  const [out] = worldTextureSize(size, size);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out * layers;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  if (out === size) g.drawImage(bitmap, 0, 0);
  else {
    g.imageSmoothingQuality = "high";
    for (let k = 0; k < layers; k++)
      g.drawImage(bitmap, 0, k * size, size, size, 0, k * out, out, out);
  }
  bitmap.close?.();
  const data = new Uint8Array(g.getImageData(0, 0, out, out * layers).data.buffer);
  const t = new THREE.DataArrayTexture(data, out, out, layers);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  // The tier's full anisotropy (it was capped at 8): the ground is the surface seen at the
  // shallowest angle of all, and each step of anisotropy keeps one more mip level of its tiles
  // at a distance. The low and balanced tiers keep their 4 and 8.
  t.anisotropy = worldAnisotropy();
  t.needsUpdate = true;
  return t;
}
