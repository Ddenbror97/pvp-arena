/**
 * Project Island explorer (Phase 1): the real terrain renderer over the real heightfield, with
 * the same renderer settings as the game (ACES, sRGB, RENDER_CAP and the adaptive RenderBudget).
 * Used headless by capture.mjs (fixed viewpoints, screenshots, draw statistics) and as a static
 * page for real-GPU checks: WASD + mouse to fly, F toggles walking on the ground.
 */
import * as THREE from "three";
import { decodeHeightfield } from "../../../src/lib/fps/br/heightfield";
import { decodeLandCover } from "../../../src/lib/fps/br/landcover";
import { createTerrain } from "../../../src/lib/fps/br/terrain";
import { vegetationWorld } from "../../../src/lib/fps/br/vegetation";
import { createVegetation, TREE_MODELS } from "../../../src/lib/fps/br/vegetation-renderer";
import { createWater } from "../../../src/lib/fps/br/water";
import { islandLayout } from "../../../src/lib/fps/br/layout";
import { bridgeBoxes } from "../../../src/lib/fps/br/bridges";
import { createStructures } from "../../../src/lib/fps/br/structures-renderer";
import { stepBody, type BrBody } from "../../../src/lib/fps/br/movement";
import { createProps, type ModelManifest } from "../../../src/lib/fps/br/props-renderer";
import { StaticWorld, type CollisionData } from "../../../src/lib/fps/br/static-world";
import { TICK_MS } from "../../../src/lib/fps/simulation";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { WORLD_ASSETS, type WorldMeta } from "../../../src/lib/fps/br/world";
import { RenderBudget, RENDER_CAP } from "../../../src/lib/fps/presentation";

declare global {
  interface Window {
    explorer: {
      ready: Promise<void>;
      view: (pos: number[], look: number[]) => Promise<Record<string, number>>;
      meta: () => WorldMeta;
      groundAt: (x: number, z: number) => number;
    };
  }
}

const base = new URL(".", location.href).href;
const asset = (path: string) =>
  fetch(new URL(path.replace(/^\//, ""), base)).then((r) => {
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r;
  });

async function landcover() {
  return decodeLandCover(await (await asset(WORLD_ASSETS.landcover)).arrayBuffer());
}

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const budget = new RenderBudget();
const scene = new THREE.Scene();
(window as unknown as { brScene: THREE.Scene }).brScene = scene;
const sky = new THREE.Color(0x9fb8cc);
scene.background = sky;
scene.fog = new THREE.Fog(sky, 1800, 9500);
const camera = new THREE.PerspectiveCamera(70, 1, 0.5, 14000);
scene.add(new THREE.HemisphereLight(0xc9dcf0, 0x5a5040, 1.15));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
sun.position.set(-0.55, 0.62, 0.45).multiplyScalar(1000);
scene.add(sun);

const stats = document.createElement("pre");
stats.style.cssText =
  "position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;background:#0009;color:#e6efe8;font:12px/1.4 ui-monospace,monospace;pointer-events:none";
document.body.appendChild(stats);

let terrain: ReturnType<typeof createTerrain>;
let vegetation: ReturnType<typeof createVegetation>;
let props: ReturnType<typeof createProps>;
let solid: StaticWorld;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
let meta: WorldMeta;
let groundAt = (_x: number, _z: number) => 0;
const ready = (async () => {
  const t0 = performance.now();
  const [hfBuf, cover, m, manifest, collision] = await Promise.all([
    asset(WORLD_ASSETS.height).then((r) => r.arrayBuffer()),
    landcover(),
    asset(WORLD_ASSETS.meta).then((r) => r.json() as Promise<WorldMeta>),
    asset("/fps/br/models/models.json").then((r) => r.json() as Promise<ModelManifest>),
    asset("/fps/br/models/collision.json").then((r) => r.json() as Promise<CollisionData>),
  ]);
  meta = m;
  const hf = await decodeHeightfield(hfBuf);
  groundAt = (x, z) => hf.heightAt(x, z);
  terrain = createTerrain(hf, cover);
  scene.add(terrain.root);
  // Sea at y = 0 and the inland lakes at their own levels: one draw call.
  scene.add(createWater(m, terrain.textures.coverB).root);
  const plants = vegetationWorld(hf, cover, m);
  // Real tree models near the camera, rendered impostors far away (same placement either way).
  const treeModels = await Promise.all(
    TREE_MODELS.map((id) => loader.loadAsync(manifest.models[id]!.lods[0]!.file)),
  );
  const textureLoader = new THREE.TextureLoader();
  const impostors = await Promise.all(
    TREE_MODELS.map(async (id) => {
      const info = (
        manifest.models[id] as unknown as {
          impostor: { file: string; width: number; height: number };
        }
      ).impostor;
      const texture = await textureLoader.loadAsync(
        new URL(info.file.replace(/^\//, ""), base).href,
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return { texture, width: info.width, height: info.height };
    }),
  );
  vegetation = createVegetation(plants, { models: treeModels, impostors });
  scene.add(vegetation.root);
  const layout = islandLayout(m);
  solid = new StaticWorld(hf, layout, collision, plants, bridgeBoxes(m, hf));
  scene.add(createStructures(m, hf).root);
  props = createProps(layout, manifest, loader, { preload: true });
  scene.add(props.root);
  await props.ready;
  // As in 1v1/5v5: every shader compiled before Ready, so nothing compiles mid-match.
  props.update(camera);
  await renderer.compileAsync(scene, camera);
  (window as unknown as { loadMs: number }).loadMs = performance.now() - t0;
})();

function resize() {
  const w = innerWidth,
    h = innerHeight;
  renderer.setPixelRatio(budget.ratio(w, h, devicePixelRatio));
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

function draw() {
  const a = performance.now();
  terrain.update(camera);
  vegetation.update(camera);
  props.update(camera);
  const selectMs = performance.now() - a;
  renderer.render(scene, camera);
  const s = terrain.stats();
  return {
    patches: s.patches,
    terrainTriangles: s.triangles,
    trees: vegetation.stats().trees,
    nearTrees: vegetation.stats().near,
    treeTriangles: vegetation.stats().triangles,
    farBySpecies: vegetation.stats().farBySpecies.join("/"),
    props: props.stats().instances,
    propTriangles: props.stats().triangles,
    propDraws: props.stats().draws,
    propTop: JSON.stringify(props.stats().top),
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    selectMs: +selectMs.toFixed(3),
    programs: renderer.info.programs?.length ?? 0,
    textures: renderer.info.memory.textures,
  };
}

// Interactive flying (static page use).
const keys = new Set<string>();
let yaw = 0,
  pitch = -0.2,
  walking = false,
  last = performance.now();
addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "KeyF") walking = !walking;
});
addEventListener("keyup", (e) => keys.delete(e.code));
renderer.domElement.addEventListener("click", () => renderer.domElement.requestPointerLock?.());
addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.002;
  pitch = Math.max(-1.5, Math.min(1.5, pitch - e.movementY * 0.002));
});
let interactive = new URLSearchParams(location.search).get("fly") === "1";
let body: BrBody | null = null;
let accumulator = 0;
function loop(now: number) {
  requestAnimationFrame(loop);
  if (!interactive || !terrain) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (budget.update(dt * 1000)) resize();
  const f = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
    r = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
  if (walking) {
    // The shared BR movement at the fixed 30 Hz step, exactly as the server will run it.
    if (!body) {
      const y = solid.supportAt(camera.position.x, camera.position.z, 0.35, camera.position.y);
      body = {
        x: camera.position.x,
        y,
        z: camera.position.z,
        velocityY: 0,
        crouched: false,
        grounded: false,
      };
    }
    accumulator += dt * 1000;
    while (accumulator >= TICK_MS) {
      accumulator -= TICK_MS;
      stepBody(
        solid,
        body,
        {
          forward: f,
          strafe: r,
          yaw,
          jump: keys.has("Space"),
          crouch: keys.has("KeyC"),
          sprint: keys.has("ShiftLeft"),
        },
        TICK_MS,
      );
    }
    camera.position.set(body.x, body.y + (body.crouched ? 0.95 : 1.6), body.z);
  } else {
    body = null;
    const speed = (keys.has("ShiftLeft") ? 400 : 80) * dt;
    camera.position.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * speed;
    camera.position.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * speed;
    camera.position.y += (Number(keys.has("Space")) - Number(keys.has("KeyC"))) * speed;
    camera.position.y = Math.max(
      groundAt(camera.position.x, camera.position.z) + 1.62,
      camera.position.y,
    );
  }
  const ground = groundAt(camera.position.x, camera.position.z);
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  const s = draw();
  stats.textContent = `${(1000 * dt).toFixed(1)} ms  ${s.calls} calls  ${(s.triangles / 1e6).toFixed(2)} M tris  ${s.patches} patches  pixel ratio ${renderer.getPixelRatio().toFixed(2)}\n${walking ? "walking" : "flying"} (F)  x ${camera.position.x.toFixed(0)} z ${camera.position.z.toFixed(0)}  ground ${ground.toFixed(1)} m`;
}
requestAnimationFrame(loop);
void ready.then(() => {
  if (interactive) {
    camera.position.set(0, 600, 4500);
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }
});

window.explorer = {
  ready,
  meta: () => meta,
  groundAt: (x, z) => groundAt(x, z),
  async view(pos, look) {
    await ready;
    interactive = false;
    camera.position.set(pos[0]!, pos[1]!, pos[2]!);
    camera.lookAt(look[0]!, look[1]!, look[2]!);
    camera.updateMatrixWorld();
    // Let nearer LODs stream in before the screenshot (as a player would after a moment).
    props.update(camera);
    for (let i = 0; i < 40 && props.stats().loadedFiles < 3 * 34; i++) {
      await new Promise((r) => setTimeout(r, 50));
      props.update(camera);
    }
    return draw();
  },
};
void RENDER_CAP;
