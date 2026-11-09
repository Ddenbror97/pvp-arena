import * as THREE from "three";
import { worldAnisotropy } from "./texture-quality";
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
export const GROUND = { range: 140, normal: 0.85 };
/**
 * Mid field (owner, 2026-11-09: the ground was a blur from the parachute): beyond the near
 * range out to `range`, the aerial albedo is modulated by the dominant zone's real tile
 * texture at `scale` × its tile size (albedo ratio and normal), so the ground keeps a surface
 * grain from the air and in the middle distance. Two texture fetches; the colours stay the
 * aerial bake's (the ratio to the layer's mean averages to 1).
 */
export const MID = { range: 1100, scale: 8, albedo: 0.75, normal: 0.55 };

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
        // Normal step follows the morph, so a fully morphed border matches the coarser patch.
        float e = aPatch.z * (1.0 + morph);
        float hx = heightAtGrid(gm + vec2(e, 0.0)) - heightAtGrid(gm - vec2(e, 0.0));
        float hz = heightAtGrid(gm + vec2(0.0, e)) - heightAtGrid(gm - vec2(0.0, e));
        vec3 objectNormal = normalize(vec3(-hx, 2.0 * e * uSpacing, -hz));
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
        uniform sampler2D uCoverA, uCoverB, uDetail;
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
        vec3 groundAlbedo(int layer, vec2 xz) {
          vec3 c = texture(uGroundA, vec3(xz * uLayerScale[layer], float(layer))).rgb;
          return c * c * uLayerTint[layer]; // sRGB → linear (cheap square), toward the palette
        }
        vec3 groundNormal(int layer, vec2 xz) {
          return texture(uGroundN, vec3(xz * uLayerScale[layer], float(layer))).rgb * 2.0 - 1.0;
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
          vec2 uv = (vWorld.xz + ${WORLD_HALF.toFixed(1)}) / ${WORLD_SIZE.toFixed(1)};
          vec4 a = texture2D(uCoverA, uv); // sand, grass, field, forest floor
          vec4 b = texture2D(uCoverB, uv); // rock, urban, road, (shore)
          float n1 = texture2D(uDetail, vWorld.xz / 23.0).r;
          float n2 = texture2D(uDetail, vWorld.xz / 180.0).g;
          float n3 = texture2D(uDetail, vWorld.xz / 3.1).b;
          float w[8] = float[8](a.r, a.g, a.b, a.a, b.r, b.g, b.b, b.a);
          // Variant pairs change over large patches (fields per ~60 m, the rest per ~120 m).
          float vn = texture2D(uDetail, vWorld.xz / 610.0 + 0.37).r;
          float vf = texture2D(uDetail, vWorld.xz / 260.0 + 0.71).g;
          float vPatch = smoothstep(0.44, 0.56, vn);
          float vField = smoothstep(0.47, 0.53, vf);
          // Far field: each class's colour is its textures' mean (pulled to the palette).
          vec3 col = vec3(0.0);
          if (uSurfaceOn > 0.5) {
            // Offline blended real tile albedo, unique across the island. One mipmapped fetch
            // replaces the eight-class far-colour blend, including parcel/macro detail.
            vec3 surface = texture2D(uSurface, uv).rgb;
            col = surface * surface;
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
          float steep = smoothstep(0.3, 0.5, 1.0 - vNormalWorld.y) * (1.0 - smoothstep(0.15, 0.5, bank));
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
          // Near the camera: the zones' real textures; beyond, a mid-field grain (MID).
          float camDist = distance(vWorld, cameraPosition);
          float near = uGroundOn * (1.0 - smoothstep(uGroundRange * 0.6, uGroundRange, camDist));
          float mid = uGroundOn * (1.0 - smoothstep(${(MID.range * 0.55).toFixed(1)}, ${MID.range.toFixed(1)}, camDist)) * (1.0 - near);
          int k1 = 0, k2 = 1;
          if (near > 0.0 || mid > 0.0) {
            if (w[1] > w[0]) { k1 = 1; k2 = 0; }
            for (int k = 2; k < 8; k++) {
              if (w[k] > w[k1]) { k2 = k1; k1 = k; }
              else if (w[k] > w[k2]) k2 = k;
            }
          }
          vec3 midNormal = vec3(0.0, 0.0, 1.0);
          if (mid > 0.0) {
            int lm = (k1 == 2 ? vField : vPatch) > 0.5 ? CLASS_B[k1] : CLASS_A[k1];
            lm = runway > 0.5 ? ${L("tiles")} : steep > 0.5 ? ${L("rock")} : lm;
            vec2 mxz = vWorld.xz / ${MID.scale.toFixed(1)};
            // Two samples, rotated and at another scale, so the tile's repeat does not show as a
            // lattice; the ratio is compressed (square root) so dark layers do not saturate.
            vec2 mxz2 = mat2(0.8, -0.6, 0.6, 0.8) * vWorld.xz / ${(MID.scale * 1.7).toFixed(1)} + 31.7;
            vec3 far = max(uLayerFar[lm], vec3(1e-3));
            // Lite (slow GPUs): one sample; the lattice is far less visible than a lower resolution.
            vec3 midA = groundAlbedo(lm, mxz);
            vec3 ratio = sqrt((uGroundLite > 0.5 ? midA : 0.5 * (midA + groundAlbedo(lm, mxz2))) / far);
            ratio = clamp(ratio, 0.7, 1.4);
            col *= mix(vec3(1.0), ratio, mid * ${MID.albedo.toFixed(2)} * (1.0 - snow));
            midNormal = groundNormal(lm, mxz);
          }
          if (near > 0.0) {
            float s = max(w[k1] + w[k2], 1e-3);
            float w2 = w[k2] / s;
            vec2 xz = vWorld.xz;
            vec3 c1, t1, c2, t2;
            groundClass(k1, xz, k1 == 2 ? vField : vPatch, c1, t1);
            // Tiling breaker: the main zone again, rotated and at another scale (not in lite).
            if (uGroundLite < 0.5) {
              vec2 rot = mat2(0.8, -0.6, 0.6, 0.8) * xz * 0.37 + 17.3;
              vec3 c1b = groundAlbedo(CLASS_A[k1], rot);
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
              vec3 ax = abs(vNormalWorld);
              vec3 side = ax.x > ax.z ? groundAlbedo(${L("rock")}, vWorld.zy) : groundAlbedo(${L("rock")}, vWorld.xy);
              nc = mix(nc, side * (0.85 + 0.3 * n1), steep);
              nt = mix(nt, vec3(0.0, 0.0, 1.0), steep);
            }
            if (snow > 0.01) {
              nc = mix(nc, groundAlbedo(${L("snow")}, xz), snow);
              nt = mix(nt, groundNormal(${L("snow")}, xz), snow);
            }
            nc *= 0.9 + 0.12 * n1 + 0.06 * n3;
            col = mix(col, nc, near);
            // Tangent frame on the terrain: x along +x, y along +z, z the surface normal.
            vec3 N = normalize(vNormalWorld);
            vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
            vec3 B = cross(T, N);
            brDetailNormal = normalize(T * nt.x + B * nt.y + N * max(nt.z, 0.2));
            brDetailK = near * ${GROUND.normal.toFixed(2)};
          } else {
            col *= 0.86 + 0.18 * n1 + 0.08 * n3;
          }
          if (mid > 0.0) {
            vec3 N = normalize(vNormalWorld);
            vec3 T = normalize(vec3(1.0, 0.0, 0.0) - N * N.x);
            vec3 B = cross(T, N);
            vec3 mn = normalize(T * midNormal.x + B * midNormal.y + N * max(midNormal.z, 0.2));
            float mk = mid * ${MID.normal.toFixed(2)};
            brDetailNormal = brDetailK > 0.0 ? normalize(mix(brDetailNormal, mn, mk / (brDetailK + mk))) : mn;
            brDetailK = max(brDetailK, mk);
          }
          diffuseColor.rgb = col;
        }`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        if (brDetailK > 0.0)
          normal = normalize(mix(normal, normalize((viewMatrix * vec4(brDetailNormal, 0.0)).xyz), brDetailK));`,
      )
      .replace("#include <normal_fragment_begin>", `#include <normal_fragment_begin>`);
    // World normal for the slope test (view-space normal is what three computes).
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vNormalWorld;`,
      )
      .replace(
        "#include <defaultnormal_vertex>",
        `#include <defaultnormal_vertex>
      vNormalWorld = objectNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vNormalWorld;`,
    );
  };
  material.customProgramCacheKey = () => "br-terrain-v4";

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
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size * layers;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  const data = new Uint8Array(g.getImageData(0, 0, size, size * layers).data.buffer);
  const t = new THREE.DataArrayTexture(data, size, size, layers);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  // Sampled several times per pixel near the player: half the world anisotropy is plenty.
  t.anisotropy = Math.min(8, worldAnisotropy());
  t.needsUpdate = true;
  return t;
}
