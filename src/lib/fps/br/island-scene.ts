import * as THREE from "three";
import { shrinkImageTexture, shrinkModelTextures } from "./texture-quality";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { downloadBrAsset } from "./asset-download";
import { decodeHeightfield, type Heightfield } from "./heightfield";
import { buildIsland, type Island } from "./island";
import { pavedLots } from "./layout";
import { decodeLandCover } from "./landcover";
import { createProps, type ModelManifest } from "./props-renderer";
import type { CollisionData } from "./static-world";
import { createPowerLines, createStructures } from "./structures-renderer";
import { createTerrain, GROUND } from "./terrain";
import { createVegetation, TREE_MODELS } from "./vegetation-renderer";
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
  /**
   * View distance: trees drawn out to `trees` m (never under the shared cover range) and the
   * detail distances of buildings and far scenery scaled by `detail` (cover classes unchanged).
   */
  setViewDistance(trees: number, detail: number): void;
  /** Ground grass drawn within this distance (m; 0 off). Grass is cosmetic (grass.ts). */
  setGrassRange(m: number): void;
  /** Upload the textures of the buildings and props about to be drawn near (a few a frame). */
  warm(renderer: THREE.WebGLRenderer): void;
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
  const get = async (path: string) => {
    const data = await downloadBrAsset(url(path), signal, () =>
      progress(0, "Restoring asset download"),
    );
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
  const terrain = createTerrain(hf, cover);
  root.add(terrain.root);
  const water = createWater(meta, terrain.textures.coverB, {
    texture: terrain.textures.height,
    ...terrain.heightGrid,
  });
  root.add(water.root);
  progress(0.3, "Placing buildings and forests");
  const island = buildIsland(hf, cover, meta, collision);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  // Fetch through the same cancellable/retrying path for buildings, weapons and gear.
  // Parsing stays on this configured GLTFLoader (Meshopt/plugins/resource resolution).
  loader.loadAsync = async (path) => {
    const data = await downloadBrAsset(path, signal, () => progress(0, "Restoring model download"));
    signal.throwIfAborted();
    const gltf = await loader.parseAsync(data, THREE.LoaderUtils.extractUrlBase(path));
    // Low tier: half-size textures, swapped in before anything reaches the GPU.
    await shrinkModelTextures(gltf.scene);
    drawGlassOnce(gltf.scene);
    return gltf;
  };
  // Model paths in the manifest are site-absolute: resolve them against `base`.
  const fixed = structuredClone(manifest);
  for (const m of Object.values(fixed.models)) for (const l of m.lods) l.file = url(l.file);
  progress(0.4, "Loading trees");
  const treeModels = await Promise.all(
    TREE_MODELS.map((id) => loader.loadAsync(fixed.models[id]!.lods[0]!.file)),
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
      const data = await downloadBrAsset(url(info.file), signal, () =>
        progress(0, "Restoring texture download"),
      );
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
  const vegetation = createVegetation(island.vegetation, { models: treeModels, impostors });
  root.add(vegetation.root);
  const lots = pavedLots(island.layout, meta);
  const structures = createStructures(meta, hf, lots);
  // Ground grass (grass.ts): optional, the ground stays as it was if the kit fails to load.
  const grass: GrassControls | null = await loadGrass(lots).catch(() => null);
  if (grass) root.add(grass.root);
  const lines = createPowerLines(island.layout);
  root.add(structures.root, lines.root);
  progress(0.55, "Loading buildings");
  // The mid-distance buildings' shared facade atlas (image rows as the UVs were written:
  // top-down). If it fails, those LODs fall back to a plain wall colour.
  const facades = manifest.facades
    ? await downloadBrAsset(url(manifest.facades.atlas), signal, () =>
        progress(0, "Restoring texture download"),
      )
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
    : null;
  const props = createProps(island.layout, fixed, loader, {
    preload: true,
    facades,
    ground: (x, z) => hf.heightAt(x, z),
  });
  root.add(props.root);
  await props.ready;
  // Fitted building doors: their atlas and per-doorway shapes (a plain panel if this fails).
  const doorLook = await Promise.all([
    get(DOOR_ASSETS.meta).then((r) => r.json() as Promise<DoorLookData>),
    downloadBrAsset(url(DOOR_ASSETS.atlas), signal, () =>
      progress(0, "Restoring texture download"),
    ),
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
      vegetation.update(camera);
      grass?.update(camera, terrain.surfaceTexture(), full);
      props.update(camera, full);
      return { selectMs: performance.now() - a };
    },
    setGroundLite(on) {
      terrain.setGroundLite(on);
    },
    setGroundRange(m) {
      groundRange = m;
      terrain.setGroundRange(m);
      structures.setGround(terrain.groundLayer("asphalt"), m);
    },
    groundReady,
    footstepSurface: createBrFootstepSurface(hf, cover, island.layout, collision, meta),
    setGrassRange(m) {
      grass?.setRange(m);
    },
    setViewDistance(trees, detail) {
      vegetation.setViewDistance(trees);
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
        treeTriangles: v.triangles,
        farBySpecies: v.farBySpecies.join("/"),
        props: p.instances,
        propTriangles: p.triangles,
        propDraws: p.draws,
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
      grass?.dispose();
      props.dispose();
      structures.dispose();
      lines.dispose();
      // The door atlas (8 MB) is loaded here and lent to the door renderer, which disposes its
      // own material but not the texture it was given (leak check, 2026-11-09).
      doorLook?.atlas.dispose();
      facades?.dispose(); // lent to the props, like the door atlas
      root.removeFromParent();
    },
  };
}
