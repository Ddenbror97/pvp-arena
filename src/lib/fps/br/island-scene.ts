import * as THREE from "three";
import { shrinkImageTexture, shrinkModelTextures, worldTextureScale } from "./texture-quality";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  BR_ASSET_HASHES,
  brAssetHash,
  brAssetHashesBuilt,
  downloadBrAsset,
  loadBrAssetHashes,
} from "./asset-download";
import { decodeHeightfield, type Heightfield } from "./heightfield";
import { buildIsland, type Island } from "./island";
import { pavedLots } from "./layout";
import { decodeLandCover } from "./landcover";
import { createProps, type ModelManifest } from "./props-renderer";
import { createTextureShare } from "./shared-textures";
import type { CollisionData } from "./static-world";
import { createFloorPatches } from "./floor-patches";
import { createPowerLines, createStructures } from "./structures-renderer";
import { createTerrain, GROUND } from "./terrain";
import { createVegetation, TREE_MODELS, VEGETATION_VIEW } from "./vegetation-renderer";
import { bakeTreeCover, FAR_FOREST, treeCoverTexture } from "./far-forest";
import { createGrass, GRASS_ASSETS, GRASS_RANGE, parseGrassKit, type GrassControls } from "./grass";
import { createWater } from "./water";
import { createBrFootstepSurface } from "./footsteps";
import type { FootstepSurface } from "../footstep-surfaces";
import { assertIslandRevision, DOOR_ASSETS, WORLD_ASSETS, type WorldMeta } from "./world";
import type { DoorLook, DoorLookData } from "./door-renderer";
import { drawGlassOnce } from "../blended-once";

/**
 * Project Island as a three.js scene: terrain, water, trees, roads, bridges, the dam, prison
 * walls, power lines and every placed model, plus the shared solid world (island.ts) for client
 * prediction. Used by the battle royale match and the explorer, so both draw exactly the same
 * island the server collides against. Loads everything before `ready` (behind the loading screen)
 * and reports progress.
 */
export type IslandScene = {
  root: THREE.Group;
  island: Island;
  meta: WorldMeta;
  hf: Heightfield;
  manifest: ModelManifest;
  loader: GLTFLoader;
  /** The buildings' fitted doors (null if they failed to load: plain panels then). */
  doorLook: DoorLook | null;
  /** Per frame; `full` finishes the props' LOD pass at once (still captures, teleports). */
  update(camera: THREE.PerspectiveCamera, full?: boolean): { selectMs: number };
  /** Ground textures shown within this distance (m); the render budget shortens it. */
  setGroundRange(m: number): void;
  /** Lite ground shading (terrain.ts setGroundLite): the budget's first step on slow GPUs. */
  setGroundLite(on: boolean): void;
  /** The ground at its exact mip level (terrain.ts setGroundSoft): the low tier. */
  setGroundSoft(on: boolean): void;
  /**
   * View distance: trees drawn out to `trees` m (never under the shared cover range) and the
   * detail distances of buildings and far scenery scaled by `detail` (cover classes unchanged).
   */
  setViewDistance(trees: number, detail: number): void;
  /**
   * EXPERIMENTAL, for the reversed-Z path only (scene-target.ts), where the GPU's early depth
   * test works: roads, buildings and props first (near LODs before far ones), then trees and
   * grass, the water, and the ground last with its patches front to back. The ground's shader
   * is the dearest in the game and by three's default order it is drawn first, so nothing
   * could ever hide it (render audit 2026-11-15: counted per pixel, the ground's shaded
   * fragments fall by 43–78 % on foot with this order and by nothing without it). Under
   * logarithmic depth the order changes no cost and is left as it was.
   */
  setEarlyDepthOrder(on: boolean): void;
  /** Ground grass drawn within this distance (m; 0 off). Grass is cosmetic (grass.ts). */
  setGrassRange(m: number): void;
  /** Upload the textures of the buildings and props about to be drawn near (a few a frame). */
  warm(renderer: THREE.WebGLRenderer): void;
  /** Whether layout placement `index` is drawn at its near LOD (props-renderer.ts nearDrawn). */
  nearDrawn(index: number): boolean;
  /** Whether it is drawn at its near or its middle LOD: not its far one, and not hidden. */
  closeDrawn(index: number): boolean;
  /** Settles once the ground textures are in (or failed: the flat colours stay). */
  groundReady: Promise<void>;
  footstepSurface(x: number, y: number, z: number): FootstepSurface;
  stats(): Record<string, number | string>;
  dispose(): void;
};

export async function loadIslandScene(
  base: string,
  progress: (value: number, label: string) => void = () => {},
  signal: AbortSignal = new AbortController().signal,
): Promise<IslandScene> {
  const url = (path: string) => new URL(path.replace(/^\//, ""), base).href;
  // What this deploy's files contain (asset-download.ts): a stored copy that is still the
  // deployed file is used without asking the server about it. Asked for once, first, by a
  // build that wrote the list.
  const hashes = brAssetHashesBuilt()
    ? loadBrAssetHashes(url(BR_ASSET_HASHES), signal)
    : Promise.resolve(null);
  /** Download `href` (absolute), by the same cancellable, retrying, slot-limited path. */
  const download = async (href: string, restoring: string) =>
    downloadBrAsset(href, signal, () => progress(0, restoring), brAssetHash(await hashes, href));
  const get = async (path: string) => {
    const data = await download(url(path), "Restoring asset download");
    return {
      arrayBuffer: async () => data,
      json: async () => JSON.parse(new TextDecoder().decode(data)) as unknown,
    };
  };
  progress(0.05, "Loading the island");
  const [hfBuf, lcBuf, meta, manifest, collision] = await Promise.all([
    get(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.landcover).then((r) => r.arrayBuffer()),
    get(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    get(WORLD_ASSETS.models).then((r) => r.json() as Promise<ModelManifest>),
    get(WORLD_ASSETS.collision).then((r) => r.json() as Promise<CollisionData>),
  ]);
  assertIslandRevision(manifest, collision);
  progress(0.2, "Building terrain");
  const [hf, cover] = await Promise.all([decodeHeightfield(hfBuf), decodeLandCover(lcBuf)]);
  const root = new THREE.Group();
  root.name = "project-island";
  const terrain = createTerrain(hf, cover, meta);
  root.add(terrain.root);
  const water = createWater(meta, terrain.textures.coverB, {
    texture: terrain.textures.height,
    ...terrain.heightGrid,
    wet: terrain.textures.wet,
  });
  root.add(water.root);
  progress(0.3, "Placing buildings and forests");
  const island = buildIsland(hf, cover, meta, collision);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const textureShare = createTextureShare();
  // Fetch through the same cancellable/retrying path for buildings, weapons and gear.
  // Parsing stays on this configured GLTFLoader (Meshopt/plugins/resource resolution).
  loader.loadAsync = async (path) => {
    const data = await download(path, "Restoring model download");
    signal.throwIfAborted();
    const gltf = await loader.parseAsync(data, THREE.LoaderUtils.extractUrlBase(path));
    // Low tier: half-size textures, swapped in before anything reaches the GPU.
    await shrinkModelTextures(gltf.scene);
    // A picture another model file already brought is not kept twice (shared-textures.ts).
    await textureShare.share(gltf);
    drawGlassOnce(gltf.scene);
    return gltf;
  };
  // Model paths in the manifest are site-absolute: resolve them against `base`.
  const fixed = structuredClone(manifest);
  for (const m of Object.values(fixed.models)) for (const l of m.lods) l.file = url(l.file);
  progress(0.4, "Loading trees");
  // The full models, and their simplified forms for the middle distance (vegetation-renderer).
  const [treeModels, treeLight] = await Promise.all(
    [0, 1].map((level) =>
      Promise.all(
        TREE_MODELS.map((id) => {
          const lods = fixed.models[id]!.lods;
          return loader.loadAsync(lods[Math.min(level, lods.length - 1)]!.file);
        }),
      ),
    ),
  );
  const textureLoader = new THREE.TextureLoader();
  /** The ground grass kit (grass.ts) and its scatter over this island. */
  const loadGrass = async (lots: number[][]) => {
    const [kitMeta, bin, image] = await Promise.all([
      get(GRASS_ASSETS.manifest).then((r) => r.json()),
      get(GRASS_ASSETS.bin).then((r) => r.arrayBuffer()),
      get(GRASS_ASSETS.atlas).then((r) => r.arrayBuffer()),
    ]);
    const objectUrl = URL.createObjectURL(new Blob([image]));
    let atlas: THREE.Texture;
    try {
      atlas = await textureLoader.loadAsync(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
    shrinkImageTexture(atlas);
    const kit = parseGrassKit(kitMeta as Parameters<typeof parseGrassKit>[0], bin, atlas);
    return createGrass(
      {
        hf,
        cover,
        meta,
        supportAt: (x, z, r, maxY) => island.solid.supportAt(x, z, r, maxY),
        topBetween: (x, z, r, y0, y1) => island.solid.topBetween(x, z, r, y0, y1),
        lots,
      },
      kit,
      GRASS_RANGE.standard,
    );
  };
  const impostors = await Promise.all(
    TREE_MODELS.map(async (id) => {
      const info = (
        fixed.models[id] as unknown as { impostor: { file: string; width: number; height: number } }
      ).impostor;
      const data = await download(url(info.file), "Restoring texture download");
      const objectUrl = URL.createObjectURL(new Blob([data]));
      let texture: THREE.Texture;
      try {
        texture = await textureLoader.loadAsync(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      shrinkImageTexture(texture);
      return { texture, width: info.width, height: info.height };
    }),
  );
  const vegetation = createVegetation(island.vegetation, {
    models: treeModels!,
    light: treeLight!,
    impostors,
  });
  root.add(vegetation.root);
  // The forest beyond the tree ring (far-forest.ts): where the trees stand, baked once from
  // the same placement, a frame let through every few rows of cells. Without it (it failed:
  // out of memory on a small device) the far trees end at the ring as they always did.
  const treeRing = (trees: number) => Math.max(VEGETATION_VIEW.viewDistance, Math.min(4000, trees));
  const treeCover = await bakeTreeCover(
    island.vegetation,
    worldTextureScale() < 1 ? FAR_FOREST.size / 2 : FAR_FOREST.size,
    () => new Promise((r) => setTimeout(r, 0)),
  )
    .then(treeCoverTexture)
    .catch(() => null);
  if (treeCover) {
    terrain.setFarForest(treeCover, treeRing(VEGETATION_VIEW.viewDistance));
    vegetation.setFarFade(FAR_FOREST.full);
  }
  const lots = pavedLots(island.layout, meta);
  const structures = createStructures(meta, hf, lots);
  // Ground grass (grass.ts): optional, the ground stays as it was if the kit fails to load.
  const grass: GrassControls | null = await loadGrass(lots).catch(() => null);
  if (grass) root.add(grass.root);
  const lines = createPowerLines(island.layout);
  // The buildings' floors where the ground rises through them, drawn on that ground.
  const floorPatches = createFloorPatches(
    island.layout,
    collision,
    hf,
    (id) => fixed.models[id]?.class === "building",
  );
  root.add(structures.root, lines.root, floorPatches.root);
  progress(0.55, "Loading buildings");
  // The mid-distance buildings' shared facade atlas (image rows as the UVs were written:
  // top-down). If it fails, those LODs fall back to a plain wall colour.
  const atlas = (file: string | undefined) =>
    file
      ? download(url(file), "Restoring texture download")
          .then(async (bytes) => {
            const objectUrl = URL.createObjectURL(new Blob([bytes]));
            try {
              const atlas = await textureLoader.loadAsync(objectUrl);
              atlas.flipY = false;
              atlas.colorSpace = THREE.SRGBColorSpace;
              atlas.anisotropy = 4;
              return shrinkImageTexture(atlas);
            } finally {
              URL.revokeObjectURL(objectUrl);
            }
          })
          .catch(() => null)
      : Promise.resolve(null);
  // And the buildings' far LODs' atlas (render stability 2026-11-23). If it fails, they draw in
  // their vertex colours.
  const [facades, farFacades] = await Promise.all([
    atlas(manifest.facades?.atlas),
    atlas(manifest.farFacades?.atlas),
  ]);
  const props = createProps(island.layout, fixed, loader, {
    preload: true,
    facades,
    farFacades,
    ground: (x, z) => hf.heightAt(x, z),
  });
  root.add(props.root);
  await props.ready;
  // Fitted building doors: their atlas and per-doorway shapes (a plain panel if this fails).
  const doorLook = await Promise.all([
    get(DOOR_ASSETS.meta).then((r) => r.json() as Promise<DoorLookData>),
    download(url(DOOR_ASSETS.atlas), "Restoring texture download"),
  ])
    .then(async ([data, bytes]) => {
      const objectUrl = URL.createObjectURL(new Blob([bytes]));
      try {
        const atlas = await textureLoader.loadAsync(objectUrl);
        atlas.colorSpace = THREE.SRGBColorSpace;
        atlas.anisotropy = 4;
        shrinkImageTexture(atlas);
        return { data, atlas } satisfies DoorLook;
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    })
    .catch(() => null);
  progress(0.9, "Preparing shaders");
  // Ground textures stream in after the first frame (the flat zone colours show until then).
  let groundRange: number = GROUND.range;
  const groundReady = terrain
    .loadGround(url("/fps/br/ground/"), meta.runways ?? [])
    .then(() => structures.setGround(terrain.groundLayer("asphalt"), groundRange))
    .catch(() => {});
  return {
    root,
    island,
    meta,
    hf,
    manifest: fixed,
    loader,
    doorLook,
    update(camera, full = false) {
      const a = performance.now();
      terrain.update(camera);
      floorPatches.update(camera);
      vegetation.update(camera);
      grass?.update(camera, terrain.surfaceTexture(), full);
      props.update(camera, full);
      return { selectMs: performance.now() - a };
    },
    setGroundLite(on) {
      terrain.setGroundLite(on);
    },
    setGroundSoft(on) {
      terrain.setGroundSoft(on);
    },
    setGroundRange(m) {
      groundRange = m;
      terrain.setGroundRange(m);
      structures.setGround(terrain.groundLayer("asphalt"), m);
    },
    groundReady,
    nearDrawn: (index) => props.nearDrawn(index),
    closeDrawn: (index) => {
      const level = props.levelOf(index);
      return level === 0 || level === 1;
    },
    footstepSurface: createBrFootstepSurface(hf, cover, island.layout, collision, meta),
    setGrassRange(m) {
      grass?.setRange(m);
    },
    setEarlyDepthOrder(on) {
      // (A Group's renderOrder orders everything under it before the meshes' own.)
      structures.root.renderOrder = lines.root.renderOrder = props.root.renderOrder = 0;
      props.setNearFirst(on);
      vegetation.root.renderOrder = on ? 4 : 0;
      if (grass) grass.root.renderOrder = on ? 5 : 0;
      water.root.renderOrder = on ? 6 : 0;
      terrain.root.renderOrder = on ? 7 : 0;
      terrain.setFrontToBack(on);
    },
    setViewDistance(trees, detail) {
      vegetation.setViewDistance(trees);
      if (treeCover) terrain.setFarForest(treeCover, treeRing(trees));
      props.setDetailScale(detail);
    },
    warm(renderer) {
      props.warm(renderer);
    },
    stats() {
      const t = terrain.stats(),
        v = vegetation.stats(),
        p = props.stats();
      return {
        patches: t.patches,
        terrainTriangles: t.triangles,
        trees: v.trees,
        nearTrees: v.near,
        detailTrees: v.detail,
        treeTriangles: v.triangles,
        farBySpecies: v.farBySpecies.join("/"),
        props: p.instances,
        propTriangles: p.triangles,
        propDraws: p.draws,
        farBuildings: p.farBuildings,
        farTriangles: p.farTriangles,
        propTop: JSON.stringify(p.top),
        ...(() => {
          const g = grass?.stats();
          return g ? { grass: g.instances, grassDraws: g.draws, grassTriangles: g.triangles } : {};
        })(),
      };
    },
    dispose() {
      terrain.dispose();
      water.dispose();
      vegetation.dispose();
      treeCover?.dispose();
      grass?.dispose();
      props.dispose();
      structures.dispose();
      lines.dispose();
      // The door atlas (8 MB) is loaded here and lent to the door renderer, which disposes its
      // own material but not the texture it was given (leak check, 2026-11-09).
      doorLook?.atlas.dispose();
      facades?.dispose(); // lent to the props, like the door atlas
      farFacades?.dispose();
      textureShare.clear();
      root.removeFromParent();
    },
  };
}
