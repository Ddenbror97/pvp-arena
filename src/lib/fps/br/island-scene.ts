import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { decodeHeightfield, type Heightfield } from "./heightfield";
import { buildIsland, type Island } from "./island";
import { decodeLandCover } from "./landcover";
import { createProps, type ModelManifest } from "./props-renderer";
import type { CollisionData } from "./static-world";
import { createPowerLines, createStructures } from "./structures-renderer";
import { createTerrain, GROUND } from "./terrain";
import { createVegetation, TREE_MODELS } from "./vegetation-renderer";
import { createWater } from "./water";
import { createBrFootstepSurface } from "./footsteps";
import type { FootstepSurface } from "../footstep-surfaces";
import { assertIslandRevision, WORLD_ASSETS, type WorldMeta } from "./world";

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
  update(camera: THREE.PerspectiveCamera): { selectMs: number };
  /** Ground textures shown within this distance (m); the render budget shortens it. */
  setGroundRange(m: number): void;
  /**
   * View distance: trees drawn out to `trees` m (never under the shared cover range) and the
   * detail distances of buildings and far scenery scaled by `detail` (cover classes unchanged).
   */
  setViewDistance(trees: number, detail: number): void;
  /** Settles once the ground textures are in (or failed: the flat colours stay). */
  groundReady: Promise<void>;
  footstepSurface(x: number, y: number, z: number): FootstepSurface;
  stats(): Record<string, number | string>;
  dispose(): void;
};

export async function loadIslandScene(
  base: string,
  progress: (value: number, label: string) => void = () => {},
): Promise<IslandScene> {
  const url = (path: string) => new URL(path.replace(/^\//, ""), base).href;
  const get = async (path: string) => {
    const r = await fetch(url(path));
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r;
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
  const water = createWater(meta, terrain.textures.coverB, terrain.textures.height);
  root.add(water.root);
  progress(0.3, "Placing buildings and forests");
  const island = buildIsland(hf, cover, meta, collision);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  // Model paths in the manifest are site-absolute: resolve them against `base`.
  const fixed = structuredClone(manifest);
  for (const m of Object.values(fixed.models)) for (const l of m.lods) l.file = url(l.file);
  progress(0.4, "Loading trees");
  const treeModels = await Promise.all(
    TREE_MODELS.map((id) => loader.loadAsync(fixed.models[id]!.lods[0]!.file)),
  );
  const textureLoader = new THREE.TextureLoader();
  const impostors = await Promise.all(
    TREE_MODELS.map(async (id) => {
      const info = (
        fixed.models[id] as unknown as { impostor: { file: string; width: number; height: number } }
      ).impostor;
      const texture = await textureLoader.loadAsync(url(info.file));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return { texture, width: info.width, height: info.height };
    }),
  );
  const vegetation = createVegetation(island.vegetation, { models: treeModels, impostors });
  root.add(vegetation.root);
  const structures = createStructures(meta, hf);
  const lines = createPowerLines(island.layout);
  root.add(structures.root, lines.root);
  progress(0.55, "Loading buildings");
  const props = createProps(island.layout, fixed, loader, { preload: true });
  root.add(props.root);
  await props.ready;
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
    update(camera) {
      const a = performance.now();
      terrain.update(camera);
      vegetation.update(camera);
      props.update(camera);
      return { selectMs: performance.now() - a };
    },
    setGroundRange(m) {
      groundRange = m;
      terrain.setGroundRange(m);
      structures.setGround(terrain.groundLayer("asphalt"), m);
    },
    groundReady,
    footstepSurface: createBrFootstepSurface(hf, cover, island.layout, collision, meta),
    setViewDistance(trees, detail) {
      vegetation.setViewDistance(trees);
      props.setDetailScale(detail);
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
      };
    },
    dispose() {
      terrain.dispose();
      water.dispose();
      vegetation.dispose();
      props.dispose();
      structures.dispose();
      lines.dispose();
      root.removeFromParent();
    },
  };
}
