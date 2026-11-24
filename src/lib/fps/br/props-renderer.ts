import * as THREE from "three";
import { dropDuplicateFaces } from "./duplicate-faces";
import { buildBatches } from "./props-batch";
import { sharpenMaterials, worldAnisotropy, worldTextureScale } from "./texture-quality";
import { createBuildingDetail, DETAIL_CLASSES } from "./building-detail";
import { applyInteriorStyle, INTERIOR_STYLE } from "./interior-style";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Placement } from "./layout";
import {
  createFarBuildings,
  FAR_BUILDINGS,
  proxyShape,
  type FarBuildings,
  type ProxyShape,
} from "./far-buildings";

/**
 * Instanced buildings and props for Project Island. Placement comes from layout.ts (shared with
 * the server's collision): the client decides only which LOD draws each placement, by distance,
 * the same for every player. Nothing that exists is ever hidden inside the gameplay range
 * (fairness invariant): every class is drawn out to at least 1 km.
 *
 *  - One InstancedMesh per model × LOD × material primitive; instance lists are rebuilt only
 *    when the camera has moved RESELECT metres (not every frame).
 *  - LOD files load on demand: the farthest LOD of every placed model at start (small), nearer
 *    LODs the first time an instance comes within their range; until then the next coarser LOD
 *    stands in.
 *  - Preloaded (the game): once every LOD is in, the far LODs that share a material, of the
 *    models placed only a few times (BATCH_MAX_PLACEMENTS), are moved into a few BatchedMeshes
 *    (props-batch.ts), one multi-draw call each.
 */
export type ModelManifest = {
  worldRevision?: string;
  /** The shared atlas of the mid-distance LODs named "facade" (build_facades.mjs). */
  facades?: { atlas: string; width: number; height: number };
  /** The buildings' far LODs' atlas, material "facade-far" (build_facades.mjs --far). */
  farFacades?: { atlas: string; width: number; height: number };
  models: Record<
    string,
    {
      class: string;
      ring?: string;
      /** "far": from the air this model goes to its far LOD early (AIR_FLAT). */
      air?: string;
      size: number[];
      lods: Array<{ file: string; tris: number }>;
    }
  >;
};

/** Distance (m) up to which each LOD is used, per class; beyond the last, not drawn. */
export const RINGS: Record<string, [number, number, number]> = {
  small: [50, 180, 1000],
  // Paint on the ground (the car parks' and aprons' bay lines, 12–16 cm wide). Past ~70 m a line
  // is under a pixel wide, and seen along the ground under a tenth of one: drawn there it broke
  // up and crawled as the camera moved (owner, 2026-11-18: "the white lines of the airfields
  // asfalt … still render/flicker"). Near only.
  marking: [40, 70, 70],
  // Clutter that neither hides nor stops a player (cones, bin bags, trolleys): near only, and
  // never the untextured far LOD (each LOD level drawn costs a draw call per model).
  detail: [25, 150, 150],
  // Knee- to head-high yard props (drums, tyres, reels, pipes, kiosks): textured LODs to 400 m.
  clutter: [25, 400, 400],
  // Store furniture inside a building (the Superstore's fridges, shelving, tills, racking):
  // textured LODs as far as you can see across the store's 150 m hall, never beyond (from
  // outside the walls hide it anyway).
  fitout: [30, 130, 130],
  // Home furniture (the towers' flats and sky lounges, by the thousand in Downtown: armchairs,
  // beds, kitchens, lamps). A room is 10–20 m across, so past 50 m it is only ever seen from
  // outside, through the glass: its untextured far LOD there, nothing past 110 m. (On `fitout`
  // it was the textured middle LOD to 130 m: 1.6 M of Downtown's 4.0 M prop triangles from the
  // street, performance audit 2026-11-14.)
  furniture: [25, 50, 110],
  prop: [70, 250, 1000],
  // Car parks hold dozens of cars within a few metres: full detail only up close.
  vehicle: [35, 160, 1000],
  structure: [140, 500, 2500],
  building: [220, 800, 4000],
  // Houses and outbuildings placed by the hundred in the towns (Northstar ≈ 700 buildings): full
  // detail only on the street you are in, cheap LODs (≈ 1/4 and 1/14 of LOD0) beyond. The
  // textured middle LOD reaches 600 m (owner, 2026-11-14: from the parachute the towns' houses
  // only "appeared" close up; past 350 m they were the far LOD's bare blocks): a town seen from
  // the canopy reads as houses, for ≈ 0.4 M more triangles over Northstar from 300 m up.
  dwelling: [100, 600, 4000],
  // The shop rows of Downtown and the Arena District (the brick shop, 238 placed shoulder to
  // shoulder): the houses' distances, under its own name so the map keeps drawing its roofs as
  // a building's (tactical-map.ts colours roofs by ring).
  shop: [100, 600, 4000],
  outbuilding: [70, 450, 2500],
  hero: [300, 1100, 6000],
  aircraft: [250, 900, 5000],
  // Natural cover: rocks block bullets, so they draw far (the same for everyone); bushes only
  // conceal and draw to 600 m.
  rock: [60, 250, 1500],
  bush: [40, 160, 600],
  // Forgotten Ruins' undergrowth (ferns, monstera, palms by the thousand under the canopy, owner
  // 2026-11-17): it hides a crouching player; drawn alike for everyone. As far as the bushes
  // (owner, 2026-11-18: "render on longer distance as the rest of the gras"): at 220 m it was
  // gone, so the jungle floor emptied ahead of a player crossing the plaza.
  undergrowth: [30, 100, 600],
  // The few undergrowth models whose far LOD is still thousands of triangles (the vines, the big
  // fern, the palm clump: ≈ 30 placed, up to 12k each): their old distances, about 0.3 M
  // triangles less at the plaza (UNDERGROWTH_HEAVY).
  "undergrowth-heavy": [30, 100, 220],
  // Trees and tree-high plants placed as props (Forgotten Ruins' palms, kapok-like trees and
  // cypresses, its palm clumps and bamboo: manifest ring "jungle-tree"): as far as the island's
  // own trees (VEGETATION_VIEW.viewDistance), every one of them. They stopped at 1,000 m (the
  // trees) and 220 m (the palm clumps), and the 5–6 m palms and bamboo thinned out past 120 m
  // with the ferns, so the ruins' forest grew in ahead of a player while the trees round it had
  // stood since 1.5 km (owner, 2026-11-22: "threes and bushes load in late in forgotten ruins,
  // should be synced how the rest of the worlds threes/gras loads in").
  "jungle-tree": [70, 250, 1500],
  // House-lot fences (by the thousand in the towns): see-through and without collision, so
  // they neither hide nor stop anyone; boards up close, a panel mid-range, gone past 500 m.
  yard: [35, 140, 500],
};
/** An undergrowth model whose far LOD is over this many triangles keeps the shorter ring. */
const UNDERGROWTH_HEAVY = 1000;
/**
 * Undergrowth thins out with distance, as the grass does: past `from` metres fewer and fewer
 * plants draw, down to `keep` of them at the far ring (the same plants for everyone, by their
 * index). A jungle floor 400 m off reads as plants from a third of them; drawn to 600 m in full it
 * was 0.8 M more triangles at the plaza.
 */
const THIN = { from: 120, keep: 0.25 } as const;
const RESELECT = 8;
/**
 * A placement steps to a coarser LOD only once the camera is this much past the ring it
 * crossed; it steps to a finer one at the ring itself (render audit 2026-11-15). Without the
 * margin a house 100 m away changed between its full and its facade model every time the
 * player crossed that distance, and a player moving along it saw the house flip back and
 * forth. Only between LODs: where a model ends (its far ring) is unchanged, and so is where
 * its proxy takes over (far-buildings.ts).
 */
export const LOD_HYSTERESIS = 1.08;
/**
 * The same at a building's far ring, where it hands over to its far proxy (far-buildings.ts):
 * it comes in at the ring and goes out this much past it. A parachute turning 4 km from a town
 * crosses hundreds of its houses' rings back and forth, each a change of model to proxy and
 * back within a second or two (2026-11-23). Buildings only (the classes with proxies): what
 * hides or stops a player ends exactly at its ring, the same for everyone.
 */
export const FAR_HYSTERESIS = 1.04;
/**
 * The far atlas' mip levels (of the atlas as it was baked) over which a far LOD's wall fades
 * from its texture to its mean colour. The atlas packs a view of one building against views of
 * others with 12 texels of gutter between them (build_facades.mjs), so its mips are a building's
 * own colours down to the third (8 texels a pixel) and a blend of its neighbours' below: a
 * white tower three kilometres off would take the brick of the view packed next to it, more
 * or less of it with every metre flown. By then a window is under a pixel across, and what
 * the wall averages to is all there is to see: the bake writes that into the LOD's vertex
 * colours (scripts/br/facades/bake.mjs), and the far proxy beyond the last ring is cut from the
 * same colours (far-buildings.ts), so texture, mean and proxy hand over without a step.
 */
export const FAR_FACADE_FADE = { from: 3, to: 4 };

/** A far LOD's material on the far atlas: its texture, fading to its vertex colours. */
function farFacadeMaterial(
  material: THREE.MeshStandardMaterial,
  atlas: THREE.Texture,
  size: { width: number; height: number } | undefined,
) {
  material.map = atlas;
  material.color.set(0xffffff);
  const image = atlas.image as { width: number; height: number } | undefined;
  // (The atlas as baked: a smaller copy on the low texture tier has the same gutters in UV.)
  const w = size?.width ?? image?.width ?? 4096,
    h = size?.height ?? image?.height ?? 2048;
  const hasColour = material.vertexColors;
  material.onBeforeCompile = (shader) => {
    if (!hasColour) return;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_fragment>",
        [
          "#ifdef USE_MAP",
          "  vec4 sampledDiffuseColor = texture2D( map, vMapUv );",
          `  vec2 farTexel = vMapUv * vec2( ${w.toFixed(1)}, ${h.toFixed(1)} );`,
          "  vec2 farDx = dFdx( farTexel ), farDy = dFdy( farTexel );",
          "  float farLod = 0.5 * log2( max( dot( farDx, farDx ), dot( farDy, farDy ) ) + 1e-8 );",
          `  sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vColor.rgb, smoothstep( ${FAR_FACADE_FADE.from.toFixed(2)}, ${FAR_FACADE_FADE.to.toFixed(2)}, farLod ) );`,
          "  diffuseColor *= sampledDiffuseColor;",
          "#endif",
        ].join("\n"),
      )
      // (The vertex colour is the fade's other end, not a tint.)
      .replace("#include <color_fragment>", "");
  };
  material.customProgramCacheKey = () => `br-far-facade|${w}|${h}|${hasColour}`;
  material.needsUpdate = true;
}

/**
 * A LOD's textures go to the GPU while it is still this many times its distance away (owner,
 * 2026-11-11: "when entering some buildings it can lag, when entering rooms/doors"). Everything
 * is downloaded and its shaders compiled on the loading screen, but a texture is uploaded (and
 * its mipmaps built) the first time something draws with it. The near LOD of a fitted interior
 * or a furnished room first draws as you walk in, so its 1–2k textures were all uploaded in
 * that one frame: a 10–40 ms stall at the door, once per kind of building. Uploading them a few
 * a frame while you approach spreads the same work out. (Not everything up front: the near
 * LODs' textures are about 450 MB of video memory.)
 */
const WARM_AHEAD = 1.7;
/**
 * Far LODs are batched only for models placed at most this many times. A BatchedMesh draws
 * with WebGL multi-draw, which Chrome on Windows (ANGLE/D3D11) runs as one real draw call per
 * visible instance inside its GPU process: a win for the 200 models placed a few times each
 * (one entry instead of a whole draw call), a loss for houses, fences and lamps placed by the
 * hundred, which one instanced draw handles (real-GPU benchmark, 2026-11-09: batching
 * everything took a town frame from 2.4 ms to 5.2 ms end to end, unseen from JavaScript).
 */
export const BATCH_MAX_PLACEMENTS = 32;
/** CPU per frame (ms) for a reselect pass before it continues next frame (a model at a time). */
const SLICE_MS = 1;
/** Camera moved this far (m) from a pass's origin: start over and finish at once (teleport). */
const JUMP = 150;
/**
 * Classes that hide or stop players draw the same for everyone at every view distance
 * (fairness, PLAN §10); the view distance scales the rest (buildings, structures, aircraft).
 */
const FIXED_RINGS = new Set([
  "detail",
  "clutter",
  "fitout",
  "furniture",
  "small",
  "marking",
  "prop",
  "vehicle",
  "rock",
  "bush",
  "undergrowth",
  "undergrowth-heavy",
  "jungle-tree",
  "yard",
]);
/**
 * From the air (the plane, free fall, the canopy), houses kept their textured middle LOD up to
 * `reach` times as far: twice, from 2026-11-14 (owner: "houses don't display until like 50
 * metres" under the parachute), because from 400 m up every roof of a town is in view at once
 * and the far LOD's one flat colour read as a pale dot, not a house. The boost grows from `from`
 * metres above the ground (above the tallest roof, so a tower's top floor is still "on foot")
 * to all of it at `full`.
 *
 * `reach` is 1 since 2026-11-23: no boost. A far LOD is the near model's five views on the far
 * atlas now (build_facades.mjs --far), and from the canopy a town reads the same on either, so
 * the boost bought nothing but what it cost: 0.33 M triangles and 20 draw calls over Northstar
 * (1.36 → 1.02 M of props from 380 m up), and a kilometre-wide band of houses drawn as geometry
 * a pixel fine, which is what sparkled there (owner, 2026-11-23: "blinking/flicker buildings on
 * distance … in the airplane/parachute"). The heights still say when the camera is "in the
 * air" for AIR_FLAT below.
 */
export const AIR_VIEW = { from: 100, full: 350, reach: 1 } as const;
const AIR_CLASSES = new Set(["dwelling", "outbuilding", "shop"]);
/**
 * Blocks of storeys do the opposite (owner, 2026-11-22: the apartments with balconies and the
 * towers "flicker in downtown alot in the parchute in higher attitude"). Seen from above, a
 * storey is 3–6 pixels high, and what its middle LOD has proud of the wall (balcony slabs and
 * railings, the slabs' edge lines, the open frame round the panes) is lines thinner than a
 * pixel, sunlit on top and shaded on the face: they come and go as the camera moves. Measured
 * from 300–800 m in a glide, 25–60 of every 1,000 pixels of an apartment's balcony side flashed
 * each frame and 10–30 of a tower's face, against 1–5 for a far LOD with flat walls. Colours do
 * not cure it (the same LOD in one flat colour flashed as much); only the geometry does.
 *
 * So a model whose manifest entry says `air: "far"` (the towers' storeys and lobbies, the
 * apartment and Bauhaus blocks: their far LODs are flat, in the colours the middle LOD averages
 * to) ends its middle LOD at `mid` metres once the camera is `full` metres above the ground,
 * easing in from `from`. Nothing changes on foot or on a roof (the tallest is under `from`):
 * a player on a balcony is drawn, and hidden, from exactly as far as before.
 */
export const AIR_FLAT = { from: 100, full: 160, mid: 300 } as const;
/** Under this height over the ground (m) a flight has landed (the air view's hold ends). */
const AIR_LANDED = 25;
/** How far back an air view must come (of its band) before it turns round (startPass). */
const AIR_TURN = 0.4;
/** Scaled rings never end closer than this (m): beyond the 1 km range players are sent. */
const MIN_FAR = 1500;
const scaleRing = (ring: [number, number, number], k: number): [number, number, number] => [
  ring[0] * k,
  ring[1] * k,
  Math.max(MIN_FAR, ring[2] * Math.min(k, 1.25)),
];

/** Each instanced primitive keeps its node matrix (the dequantisation transform of
 * KHR_mesh_quantization lives on the node), applied after the placement. */
type LodMeshes = {
  meshes: THREE.InstancedMesh[];
  local: THREE.Matrix4[];
  tris: number;
  /** Instances drawn at the last reselect. */
  count: number;
  /** How far the LOD's geometry reaches from a placement's origin (m), for the cull sphere. */
  reach: number;
  /** The drawn placements' bounds at the reselect in progress: min x, y, z, max x, y, z. */
  bounds: Float64Array;
  /** Batched (props-batch.ts): this LOD draws as `geometry` in batch `batch`. */
  batched?: { batch: number; geometry: number };
};
type ModelState = {
  id: string;
  /** LOD distance class (RINGS). */
  cls: string;
  ring: [number, number, number];
  base: [number, number, number];
  fixed: boolean;
  /** Goes to its far LOD early from the air (AIR_FLAT). */
  airFar: boolean;
  lods: Array<LodMeshes | null | "loading">;
  /** The LOD each placement's distance last chose (-1: none), for LOD_HYSTERESIS. */
  level: Int8Array;
};

export type PropsControls = {
  root: THREE.Object3D;
  /** Resolves when the farthest LOD of every placed model is loaded. */
  ready: Promise<void>;
  /** Reselect LODs (spread over frames; `full`: finish the pass now, e.g. a still capture). */
  update: (camera: THREE.Camera, full?: boolean) => void;
  /** View distance: detail and draw distances of the non-cover classes × `k` (0.7–1.6). */
  setDetailScale: (k: number) => void;
  /**
   * EXPERIMENTAL (early depth test, reversed-Z only): draw the near LODs before the middle and
   * far ones, so what stands in front is drawn first and hides the rest before it is shaded.
   */
  setNearFirst: (on: boolean) => void;
  /**
   * Whether placement `index` (of the placements given to createProps) is drawn at its near LOD
   * this frame: the buildings' breakable panes go with it (pane-renderer.ts).
   */
  nearDrawn: (index: number) => boolean;
  /** The LOD the last pass chose for placement `index`: 0 near, 1 middle, 2 far, -1 none. */
  levelOf: (index: number) => number;
  /** Whether placement `index`'s far proxy is showing (null: it has none, or not built yet). */
  proxyShown: (index: number) => boolean | null;
  /**
   * Upload the textures of the LODs about to come into use, a few a frame within `budgetMs`
   * (see WARM_AHEAD). Call once a frame before rendering.
   */
  warm: (renderer: THREE.WebGLRenderer, budgetMs?: number) => void;
  stats: () => {
    instances: number;
    draws: number;
    triangles: number;
    loadedFiles: number;
    /** The proxies beyond the far rings (far-buildings.ts): buildings and triangles in the mesh. */
    farBuildings: number;
    farTriangles: number;
    /** Largest triangle contributors this frame: "model.lodN" → triangles. */
    top: Record<string, number>;
  };
  dispose: () => void;
};

/** Paint for models stored without texture or vertex colour (sRGB). */
const BARE_COLOUR: Record<string, number> = {
  // Corrugated-steel aircraft shelters: drab olive.
  "field-hangar": 0x5d6652,
  "plane-shelter": 0x5d6652,
  "army-tent": 0x5a5f43,
  // Weathered timber.
  lookout: 0x76603f,
  // Galvanised steel.
  guardrail: 0x9a9fa0,
  // The airfield's steel-frame hangars on their concrete slabs.
  hangar: 0x7d8286,
  // Aircraft paint: off-white, not paper white.
  "cessna-402": 0xcfd0c8,
};

/**
 * Whether a mesh's vertex colours say anything. The airfield's two frame hangars carry a colour
 * attribute that is white at every vertex (their download's flat material baked in): they drew
 * paper white on a white slab (owner, 2026-11-10: "a building that is totally white").
 */
function paintedVertices(geometry: THREE.BufferGeometry) {
  const c = geometry.attributes["color"];
  if (!c) return false;
  const step = Math.max(1, Math.floor(c.count / 400));
  for (let i = 0; i < c.count; i += step)
    if (Math.min(c.getX(i), c.getY(i), c.getZ(i)) < 0.92) return true;
  return false;
}

/**
 * A blended two-sided material (the bushes' leaf cards) as the two passes three draws it in:
 * back faces, then front. three does that itself, by switching the one material's side twice a
 * frame and marking it changed each time, so its shader program was looked up again twice a
 * frame for every such mesh in view: 6 to 12 lookups and about 47 kB of garbage a frame near
 * bushes (cleanup 2026-11-16). Two one-sided materials that never change draw the same two
 * passes in the same order (the back mesh is made first, and the two sort alike otherwise).
 * Any other material is returned as it is.
 */
export function twoPasses(material: THREE.Material | THREE.Material[]) {
  if (
    Array.isArray(material) ||
    !material.transparent ||
    material.side !== THREE.DoubleSide ||
    material.forceSinglePass
  )
    return [material];
  const back = material.clone();
  back.onBeforeCompile = material.onBeforeCompile;
  back.customProgramCacheKey = material.customProgramCacheKey;
  back.side = THREE.BackSide;
  material.side = THREE.FrontSide;
  return [back, material];
}

export function createProps(
  placements: Placement[],
  manifest: ModelManifest,
  loader: GLTFLoader,
  /**
   * Load every LOD before `ready` (2,735 files, 95 MB, as of 2026-11-23): the game does this
   * behind the loading screen so it can compile every shader up front and never hitch
   * mid-match. Off, nearer LODs stream in on demand (tools).
   */
  {
    preload = false,
    facades = null,
    farFacades = null,
    detail = worldTextureScale() >= 1,
    ground = null,
  }: {
    preload?: boolean;
    /** Close-up surface grain on the buildings' near LOD (building-detail.ts; off: low tier). */
    detail?: boolean;
    /** The facade atlas (manifest.facades), lent to every LOD whose material is "facade". */
    facades?: THREE.Texture | null;
    /** The far atlas (manifest.farFacades), lent to every LOD whose material is "facade-far". */
    farFacades?: THREE.Texture | null;
    /** The terrain's height at a point (m), for the camera's height above it (AIR_VIEW). */
    ground?: ((x: number, z: number) => number) | null;
  } = {},
): PropsControls {
  const root = new THREE.Group();
  root.name = "br-props";
  const byModel = new Map<string, Placement[]>();
  // Each placement's index in its model's list (nearDrawn), and back (the far proxies).
  const slot = new Int32Array(placements.length);
  const indexOf = new Map<string, number[]>();
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i]!;
    let list = byModel.get(p.model);
    if (!list) {
      byModel.set(p.model, (list = []));
      indexOf.set(p.model, []);
    }
    slot[i] = list.length;
    list.push(p);
    indexOf.get(p.model)!.push(i);
  }
  const states = new Map<string, ModelState>();
  for (const id of byModel.keys()) {
    const m = manifest.models[id];
    if (!m) throw new Error(`Model ${id} missing from the manifest`);
    const ring0 = m.ring ?? m.class;
    const cls =
      ring0 === "undergrowth" && (m.lods.at(-1)?.tris ?? 0) > UNDERGROWTH_HEAVY
        ? "undergrowth-heavy"
        : ring0;
    const ring = RINGS[cls] ?? RINGS["prop"]!;
    states.set(id, {
      id,
      cls,
      ring,
      base: ring,
      fixed: FIXED_RINGS.has(cls),
      airFar: m.air === "far",
      lods: m.lods.map(() => null),
      level: new Int8Array(byModel.get(id)!.length).fill(-1),
    });
  }
  let loadedFiles = 0;
  let stopped = false;
  const FAR_CLASSES = new Set<string>(FAR_BUILDINGS.classes);
  /**
   * A building made of several placements on one spot (a tower: its lobby, its storeys and its
   * roof, one above the other) changes LOD as one: past the near ring, each part's middle and
   * far LOD and its end go by the distance to the middle of the stack (`anchors`: per model,
   * x, y, z per placement; absent: its own position). By its own distance every storey crossed
   * each ring at its own moment (the top of a 100 m tower is 60 m nearer a parachute than its
   * foot), so a tower stood for seconds as a pile of mismatched slices, dark detailed storeys
   * between flat pale ones and, at the far ring, storeys missing between proxies (owner,
   * 2026-11-23: "see the buildings looks strange").
   */
  const anchors = new Map<string, Float32Array>();
  {
    const stacks = new Map<string, number[]>();
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i]!;
      if (!FAR_CLASSES.has(states.get(p.model)!.cls)) continue;
      const key = `${p.x}:${p.z}`;
      const list = stacks.get(key);
      if (list) list.push(i);
      else stacks.set(key, [i]);
    }
    for (const members of stacks.values()) {
      if (members.length < 2) continue;
      let lo = Infinity,
        hi = -Infinity;
      for (const i of members) {
        lo = Math.min(lo, placements[i]!.y);
        hi = Math.max(hi, placements[i]!.y);
      }
      if (hi - lo < 1) continue;
      for (const i of members) {
        const p = placements[i]!;
        let a = anchors.get(p.model);
        if (!a) {
          const list = byModel.get(p.model)!;
          a = new Float32Array(list.length * 3);
          list.forEach((q, k) => a!.set([q.x, q.y, q.z], k * 3));
          anchors.set(p.model, a);
        }
        a[slot[i]! * 3 + 1] = (lo + hi) / 2;
      }
    }
  }
  const farShapes = new Map<string, ProxyShape | null>();
  let farBuildings: FarBuildings | null = null;
  let nearFirst = false;
  const warmQueue: THREE.Texture[] = [];
  const warmQueued = new WeakSet<object>();
  /** Queue the textures of `lod` (once). */
  const queueWarm = (lod: LodMeshes) => {
    if (warmQueued.has(lod)) return;
    warmQueued.add(lod);
    for (const m of lod.meshes)
      for (const mat of Array.isArray(m.material) ? m.material : [m.material])
        for (const v of Object.values(mat))
          if (v instanceof THREE.Texture && !warmQueued.has(v)) {
            warmQueued.add(v);
            warmQueue.push(v);
          }
  };
  const grain = detail ? createBuildingDetail(Math.min(8, worldAnisotropy())) : null;
  /** Free a GLTF's GPU-side objects (a LOD that arrived after dispose, or one being replaced). */
  const freeGltf = (root: THREE.Object3D) => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        for (const v of Object.values(m))
          if (v instanceof THREE.Texture && v !== facades && v !== farFacades) v.dispose();
        m.dispose();
      }
    });
  };
  const placed = new THREE.Matrix4();
  const extent = new THREE.Box3(),
    ball = new THREE.Sphere();
  const matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    position = new THREE.Vector3(),
    unit = new THREE.Vector3(1, 1, 1);

  const load = async (state: ModelState, level: number) => {
    if (state.lods[level]) return;
    state.lods[level] = "loading";
    const gltf = await loader.loadAsync(manifest.models[state.id]!.lods[level]!.file);
    if (stopped) {
      // The arena was torn down while this LOD was in flight: nothing may reach the GPU.
      freeGltf(gltf.scene);
      state.lods[level] = null;
      return;
    }
    gltf.scene.updateMatrixWorld(true);
    // The model's proxy beyond its far ring, cut from its far LOD (far-buildings.ts).
    if (level === state.lods.length - 1 && FAR_CLASSES.has(state.cls))
      farShapes.set(state.id, proxyShape(gltf.scene));
    sharpenMaterials(gltf.scene);
    const meshes: THREE.InstancedMesh[] = [];
    const local: THREE.Matrix4[] = [];
    const capacity = byModel.get(state.id)!.length;
    let reach = 0;
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Double-sided surfaces stored twice z-fight (flicker as the camera turns).
      for (const m of Array.isArray(mesh.material) ? [] : [mesh.material])
        dropDuplicateFaces(mesh.geometry, m);
      // Models that arrived with no texture and no vertex colour (their downloads carried
      // none) drew as pure white: the field hangars at the military base were "a building
      // that is totally white" (owner, 2026-11-10). Painted here, every LOD alike.
      const bare = mesh.material as THREE.MeshStandardMaterial;
      if (
        !Array.isArray(mesh.material) &&
        bare.isMeshStandardMaterial &&
        bare.name !== "facade" &&
        bare.name !== "facade-far" &&
        !bare.map &&
        !paintedVertices(mesh.geometry) &&
        bare.color.r > 0.95 &&
        bare.color.g > 0.95 &&
        bare.color.b > 0.95
      ) {
        bare.color.set(BARE_COLOUR[state.id] ?? 0x8c8d85);
        bare.roughness = Math.max(bare.roughness, 0.8);
        bare.metalness = Math.min(bare.metalness, 0.2);
      }
      // Buildings up close: surface grain on the near LOD (building-detail.ts).
      if (
        grain &&
        level === 0 &&
        DETAIL_CLASSES.has(state.cls) &&
        !Array.isArray(mesh.material) &&
        grain.suits(mesh.material)
      )
        grain.apply(mesh.material as THREE.MeshStandardMaterial);
      // Each placement's rooms painted their own way (interior-style.ts).
      const style = INTERIOR_STYLE[state.id];
      if (
        style &&
        level === 0 &&
        !Array.isArray(mesh.material) &&
        (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial
      )
        applyInteriorStyle(mesh.material as THREE.MeshStandardMaterial, style);
      // Mid-distance LODs mapped onto the shared facade atlas (build_facades.mjs).
      const facade = mesh.material as THREE.MeshStandardMaterial;
      if (!Array.isArray(mesh.material) && facade.name === "facade") {
        if (facades) facade.map = facades;
        // Without the atlas (its download failed): a neutral wall colour, not white.
        else facade.color.set(0x8a8a84);
        facade.needsUpdate = true;
      }
      // The buildings' far LODs on theirs. (Without it they draw in their vertex colours:
      // each wall's mean, the look they fade to anyway.)
      if (!Array.isArray(mesh.material) && facade.name === "facade-far" && farFacades)
        farFacadeMaterial(facade, farFacades, manifest.farFacades);
      mesh.geometry.computeBoundingBox();
      extent
        .copy(mesh.geometry.boundingBox!)
        .applyMatrix4(mesh.matrixWorld)
        .getBoundingSphere(ball);
      reach = Math.max(reach, ball.center.length() + ball.radius);
      for (const material of twoPasses(mesh.material)) {
        const im = new THREE.InstancedMesh(mesh.geometry, material, capacity);
        im.name = `${state.id}.lod${level}`;
        im.userData["lod"] = level;
        im.renderOrder = nearFirst ? level : 0;
        im.count = 0;
        // Culled against the view by one sphere round the instances it draws now (selectModel).
        im.boundingSphere = new THREE.Sphere(new THREE.Vector3(), -1);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        root.add(im);
        meshes.push(im);
        local.push(mesh.matrixWorld.clone());
      }
    });
    state.lods[level] = {
      meshes,
      local,
      tris: manifest.models[state.id]!.lods[level]!.tris,
      count: 0,
      reach,
      bounds: new Float64Array(6),
    };
    loadedFiles++;
    dirty = true;
  };

  /** Far-LOD batches, and per batch and model the instance id of each placement (-1: none). */
  const batches: THREE.BatchedMesh[] = [];
  const batchIds = new Map<string, Int32Array[]>();
  const batchFarLods = () => {
    if (stopped) return;
    const members: Array<{ lod: LodMeshes; state: ModelState }> = [];
    for (const state of states.values())
      state.lods.forEach((lod, level) => {
        if (
          level > 0 &&
          lod &&
          lod !== "loading" &&
          lod.meshes.length === 1 &&
          byModel.get(state.id)!.length <= BATCH_MAX_PLACEMENTS
        )
          members.push({ lod, state });
      });
    const built = buildBatches(
      members.map(({ lod, state }) => ({
        mesh: lod.meshes[0]!,
        local: lod.local[0]!,
        placements: byModel.get(state.id)!.length,
        model: state.id,
      })),
      [facades, farFacades],
    );
    for (const b of built) {
      const k = batches.length;
      batches.push(b.mesh);
      root.add(b.mesh);
      for (const i of b.members) {
        const { lod, state } = members[i]!;
        lod.batched = { batch: k, geometry: b.geometry[i]! };
        // The instanced copy is no longer drawn: free it (the batch holds its own copy).
        const im = lod.meshes[0]!;
        root.remove(im);
        im.geometry.dispose();
        (im.material as THREE.Material).dispose();
        im.dispose();
        lod.meshes = [];
        let ids = batchIds.get(state.id);
        if (!ids) batchIds.set(state.id, (ids = []));
        if (!ids[k]) ids[k] = new Int32Array(byModel.get(state.id)!.length).fill(-1);
      }
    }
    dirty = true;
  };
  const ready = Promise.all(
    [...states.values()].flatMap((s) =>
      preload ? s.lods.map((_, level) => load(s, level)) : [load(s, s.lods.length - 1)],
    ),
  ).then(() => {
    if (stopped) return;
    // Every building beyond its far ring, as one mesh (the far LODs are all in by now).
    farBuildings = createFarBuildings(placements, (id) => farShapes.get(id));
    // What a pass already draws keeps its proxy folded from the first frame.
    for (let i = 0; i < placements.length; i++)
      farBuildings.setDrawn(i, states.get(placements[i]!.model)!.level[slot[i]!]! >= 0);
    root.add(farBuildings.mesh);
    if (preload) batchFarLods();
    dirty = true;
  });
  /** Where the last pass started (the camera then). */
  const last = new THREE.Vector3(Infinity, Infinity, Infinity);
  let dirty = true;
  /** How far the pass in progress is "in the air": 0 on foot to 1 (AIR_VIEW; AIR_FLAT). */
  let air = 0,
    airFlat = 0;
  /** In the air since it last stood on the ground (see `airHold`). */
  let airborne = false;
  /** Which way each air view is going (-1 down, 1 up): AIR_VIEW's, AIR_FLAT's. */
  const airWay = [-1, -1];
  const airTrend = (way: number[], k: number, was: number, now: number) => {
    if (now <= 0 || now >= 1) {
      way[k] = now <= 0 ? 1 : -1;
      return now;
    }
    if ((now - was) * way[k]! >= 0) return now;
    if (Math.abs(now - was) < AIR_TURN) return was;
    way[k] = -way[k]!;
    return now;
  };
  const cam = new THREE.Vector3();
  let instances = 0;
  /** Each placement's matrix, composed once (placements never move): 16 floats each. */
  const placedMatrices = new Map<string, Float32Array>();
  for (const [id, list] of byModel) {
    const arr = new Float32Array(list.length * 16);
    list.forEach((p, i) => {
      rotation.setFromAxisAngle(up, (p.turn * Math.PI) / 2);
      matrix.compose(position.set(p.x, p.y, p.z), rotation, unit).toArray(arr, i * 16);
    });
    placedMatrices.set(id, arr);
  }
  /**
   * The reselect pass in progress: models in `order` from `cursor` (-1: none), from `pass`.
   * What is seen from furthest goes first (landmarks and buildings, then structures, then
   * props, furniture last): a pass is spread over frames, and while you fall the houses below
   * should catch up before the garden chairs.
   */
  const order = [...states.values()].sort((a, b) => b.base[2] - a.base[2]).map((s) => s.id);
  let cursor = -1,
    passInstances = 0;
  const pass = new THREE.Vector3();
  const startPass = () => {
    pass.copy(cam);
    last.copy(cam);
    const up = ground ? cam.y - ground(cam.x, cam.z) : 0;
    const eased = (from: number, full: number) =>
      Math.min(1, Math.max(0, (up - from) / (full - from)));
    // The air view keeps its direction. The height is over the ground straight below, and
    // that ground rolls: gliding over a 40 m hill and the dip behind it moved the houses'
    // middle ring 100 m in and out again, and every house in that band went far, middle, far
    // (flight audit 2026-11-23: 17 such flips in a minute's glide to Northstar). Going down it
    // only falls, going up it only rises; it turns round once the height has come back by
    // `AIR_TURN` of the band (and at both ends it is what the height says).
    air = airTrend(airWay, 0, air, eased(AIR_VIEW.from, AIR_VIEW.full));
    if (up >= AIR_VIEW.from) airborne = true;
    else if (up < AIR_LANDED) airborne = false;
    airFlat = airTrend(airWay, 1, airFlat, eased(AIR_FLAT.from, AIR_FLAT.full));
    dirty = false;
    cursor = 0;
    passInstances = 0;
  };
  const selectModel = (id: string) => {
    const state = states.get(id)!;
    for (const lod of state.lods)
      if (lod && lod !== "loading") {
        lod.count = 0;
        lod.bounds.fill(Infinity, 0, 3).fill(-Infinity, 3);
        for (const m of lod.meshes) m.count = 0;
      }
    const ids = batchIds.get(id);
    /** Hide placement i in every batch except `keep`. */
    const hideBatched = (i: number, keep = -1) => {
      if (!ids) return;
      for (let k = 0; k < ids.length; k++) {
        const slot = ids[k];
        if (k !== keep && slot && slot[i]! >= 0) batches[k]!.setVisibleAt(slot[i]!, false);
      }
    };
    const list = byModel.get(id)!;
    const mats = placedMatrices.get(id)!;
    const anchor = anchors.get(id);
    // The placements' numbers, for their proxies (far-buildings.ts): shown exactly while this
    // pass draws no LOD of them.
    const proxied = farBuildings && FAR_CLASSES.has(state.cls) ? indexOf.get(id)! : null;
    const mid = state.airFar
      ? state.ring[1] - airFlat * Math.max(0, state.ring[1] - AIR_FLAT.mid)
      : air && AIR_CLASSES.has(state.cls)
        ? Math.min(state.ring[2], state.ring[1] * (1 + air * (AIR_VIEW.reach - 1)))
        : state.ring[1];
    const r0 = state.ring[0] ** 2,
      r1 = mid ** 2,
      r2 = state.ring[2] ** 2;
    // Past a ring by less than the margin: the nearer LOD it had stays (never past the far ring).
    // (In the air a house keeps the middle LOD it has out to the air view's full reach, however
    // far down the canopy is: only what comes nearer is taken in at the ring as it shrinks with
    // the height. Both by the shrinking ring, a house ahead went middle, far and middle again
    // on the way down, and over rising ground the ring overtook houses it had just taken in:
    // 48 there-and-back changes in two 70 s glides, flight audit 2026-11-23. On the ground, as
    // before: "in the air" from AIR_VIEW.from up until AIR_LANDED over the ground, so a ridge
    // crossed at 80 m does not drop every house beyond 650 m and bring it back behind it.)
    const airHold =
      airborne && AIR_CLASSES.has(state.cls)
        ? Math.min(state.ring[2], state.ring[1] * AIR_VIEW.reach) ** 2
        : r1;
    const hold = [
      Math.min(r2, r0 * LOD_HYSTERESIS ** 2),
      Math.min(r2, Math.max(r1, airHold) * LOD_HYSTERESIS ** 2),
    ];
    const farHold = FAR_CLASSES.has(state.cls) ? r2 * FAR_HYSTERESIS ** 2 : r2;
    const chosen = state.level;
    const w0 = (state.ring[0] * WARM_AHEAD) ** 2,
      w1 = (mid * WARM_AHEAD) ** 2;
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      const dx = p.x - pass.x,
        dy = p.y - pass.y,
        dz = p.z - pass.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      // Past the near ring a stacked building goes by its stack's middle (`anchors`).
      let a2 = d2;
      if (anchor) {
        const ax = anchor[i * 3]! - pass.x,
          ay = anchor[i * 3 + 1]! - pass.y,
          az = anchor[i * 3 + 2]! - pass.z;
        a2 = ax * ax + ay * ay + az * az;
      }
      let level = d2 <= r0 ? 0 : a2 <= r1 ? 1 : a2 <= r2 ? 2 : -1;
      if (level === 2 && state.cls === "undergrowth" && d2 > THIN.from ** 2) {
        const f = (Math.sqrt(d2) - THIN.from) / (state.ring[2] - THIN.from);
        if ((i * 0.6180339887) % 1 > 1 - (1 - THIN.keep) * Math.min(1, f)) level = -1;
      }
      const was = chosen[i]!;
      if (was >= 0 && was < 2 && level > was && (was === 0 ? d2 : a2) <= hold[was]!) level = was;
      else if (was === 2 && level < 0 && a2 <= farHold) level = 2;
      chosen[i] = level;
      // Approaching a nearer LOD: its textures go up ahead of it.
      if (level !== 0 && d2 <= w1) {
        const near = state.lods[d2 <= w0 ? 0 : 1];
        if (near && near !== "loading") queueWarm(near);
      }
      if (level < 0) {
        hideBatched(i);
        if (proxied) farBuildings!.setDrawn(proxied[i]!, false);
        continue;
      }
      // Ask for the right LOD; draw the best one available meanwhile (never nothing).
      if (!state.lods[level]) void load(state, level);
      while (level < state.lods.length && (!state.lods[level] || state.lods[level] === "loading"))
        level++;
      const lod = state.lods[level];
      if (!lod || lod === "loading") {
        hideBatched(i);
        if (proxied) farBuildings!.setDrawn(proxied[i]!, false);
        continue;
      }
      if (proxied) farBuildings!.setDrawn(proxied[i]!, true);
      lod.count++;
      passInstances++;
      if (lod.batched) {
        const { batch: k, geometry } = lod.batched;
        const batch = batches[k]!,
          slot = ids![k]!;
        hideBatched(i, k);
        if (slot[i]! < 0) {
          slot[i] = batch.addInstance(geometry);
          batch.setMatrixAt(slot[i]!, matrix.fromArray(mats, i * 16));
        } else {
          if (batch.getGeometryIdAt(slot[i]!) !== geometry)
            batch.setGeometryIdAt(slot[i]!, geometry);
          batch.setVisibleAt(slot[i]!, true);
        }
        continue;
      }
      hideBatched(i);
      const b = lod.bounds;
      if (p.x < b[0]!) b[0] = p.x;
      if (p.y < b[1]!) b[1] = p.y;
      if (p.z < b[2]!) b[2] = p.z;
      if (p.x > b[3]!) b[3] = p.x;
      if (p.y > b[4]!) b[4] = p.y;
      if (p.z > b[5]!) b[5] = p.z;
      matrix.fromArray(mats, i * 16);
      for (let k = 0; k < lod.meshes.length; k++) {
        const m = lod.meshes[k]!;
        m.setMatrixAt(m.count++, placed.multiplyMatrices(matrix, lod.local[k]!));
      }
    }
    // One sphere round what each LOD draws now. A model's instances stand in a ring round the
    // camera, so the common ones (fences, houses, lamps) always pass; the many models placed in
    // one spot (a fitted-out store, the arena's rooms, a tower's furniture, a yard of wrecks)
    // are skipped whole, draw call and vertices, while that spot is behind the view.
    for (const lod of state.lods)
      if (lod && lod !== "loading") {
        const b = lod.bounds;
        const radius =
          b[0]! <= b[3]!
            ? Math.hypot(b[3]! - b[0]!, b[4]! - b[1]!, b[5]! - b[2]!) / 2 + lod.reach
            : -1;
        for (const m of lod.meshes) {
          const sphere = m.boundingSphere!;
          sphere.radius = radius;
          if (radius >= 0)
            sphere.center.set((b[0]! + b[3]!) / 2, (b[1]! + b[4]!) / 2, (b[2]! + b[5]!) / 2);
        }
      }
    for (const lod of state.lods)
      if (lod && lod !== "loading")
        for (const m of lod.meshes) {
          m.visible = m.count > 0;
          m.instanceMatrix.clearUpdateRanges();
          m.instanceMatrix.addUpdateRange(0, m.count * 16);
          m.instanceMatrix.needsUpdate = true;
        }
  };

  return {
    root,
    ready,
    levelOf(index) {
      const p = placements[index];
      const state = p && states.get(p.model);
      return state ? state.level[slot[index]!]! : -1;
    },
    proxyShown(index) {
      return farBuildings ? farBuildings.shown(index) : null;
    },
    nearDrawn(index) {
      const p = placements[index];
      const state = p && states.get(p.model);
      if (!state || state.level[slot[index]!] !== 0) return false;
      const near = state.lods[0];
      return !!near && near !== "loading";
    },
    setNearFirst(on) {
      nearFirst = on;
      for (const c of root.children)
        c.renderOrder = on ? ((c.userData["lod"] as number | undefined) ?? 3) : 0;
    },
    setDetailScale(k) {
      const scale = Math.max(0.5, Math.min(2, k));
      for (const st of states.values()) if (!st.fixed) st.ring = scaleRing(st.base, scale);
      dirty = true;
    },
    warm(renderer, budgetMs = 2) {
      const t0 = performance.now();
      while (warmQueue.length) {
        const t = warmQueue.shift()!;
        // (A texture whose image has not arrived yet is skipped: it uploads when drawn.)
        if (t.image || (t as THREE.DataTexture).isDataTexture) renderer.initTexture(t);
        if (performance.now() - t0 > budgetMs) break;
      }
    },
    update(camera, full = false) {
      cam.setFromMatrixPosition(camera.matrixWorld);
      // Distances in all three directions: LODs are chosen by 3D distance, so falling or riding
      // a lift straight up or down changes them as much as walking does. (Until 2026-11-14 only
      // sideways movement counted: after a dive straight down, a town kept the LODs chosen from
      // 1 km up, bare far blocks and no fences or cars, until you drifted 8 m sideways.)
      if (cursor < 0) {
        if (!dirty && cam.distanceTo(last) < RESELECT) return;
        startPass();
      } else if (full || cam.distanceTo(pass) > JUMP) {
        startPass(); // a jump: start over from here, all at once
        full = true;
      }
      // A pass walks every placement (33 k): spread over frames a model at a time, about
      // SLICE_MS a frame, so no single frame pays for all of it (2026-11-09: 4 ms median and
      // up to 46 ms in one frame every 8 m of movement before).
      const t0 = performance.now();
      while (cursor < order.length) {
        selectModel(order[cursor++]!);
        if (!full && performance.now() - t0 > SLICE_MS) break;
      }
      if (cursor >= order.length) {
        cursor = -1;
        instances = passInstances;
      }
    },
    stats() {
      let draws = 0,
        triangles = 0;
      const per: Array<[string, number]> = [];
      for (const state of states.values())
        state.lods.forEach((lod, level) => {
          if (!lod || lod === "loading") return;
          const n = lod.count;
          if (n) draws += lod.meshes.length;
          triangles += n * lod.tris;
          if (n) per.push([`${state.id}.lod${level}`, n * lod.tris]);
        });
      // A batch is one multi-draw call (WebGL multi-draw; three falls back to one per range).
      for (const b of batches) if (b.visible) draws++;
      per.sort((a, b) => b[1] - a[1]);
      return {
        instances,
        draws,
        triangles,
        loadedFiles,
        farBuildings: farBuildings?.buildings ?? 0,
        farTriangles: farBuildings?.triangles ?? 0,
        top: Object.fromEntries(per.slice(0, 6)),
      };
    },
    dispose() {
      stopped = true;
      grain?.dispose();
      farBuildings?.dispose();
      for (const b of batches) {
        (b.material as THREE.Material).dispose();
        b.dispose();
      }
      for (const state of states.values())
        for (const lod of state.lods)
          if (lod && lod !== "loading")
            for (const m of lod.meshes) {
              m.geometry.dispose();
              const mats = Array.isArray(m.material) ? m.material : [m.material];
              for (const mat of mats) {
                // (The facade atlas is the caller's: island-scene.ts disposes it once.)
                for (const v of Object.values(mat))
                  if (v instanceof THREE.Texture && v !== facades && v !== farFacades) v.dispose();
                mat.dispose();
              }
              m.dispose();
            }
    },
  };
}
