/**
 * Project Island explorer (Phase 1): the real terrain renderer over the real heightfield, with
 * the same renderer settings as the game (ACES, sRGB, RENDER_CAP and the adaptive RenderBudget).
 * Used headless by capture.mjs (fixed viewpoints, screenshots, draw statistics) and as a static
 * page for real-GPU checks: WASD + mouse to fly, F toggles walking on the ground.
 */
import * as THREE from "three";
import { stepBody, type BrBody } from "../../../src/lib/fps/br/movement";
import type { StaticWorld } from "../../../src/lib/fps/br/static-world";
import { loadIslandScene, type IslandScene } from "../../../src/lib/fps/br/island-scene";
import { createDoorRenderer } from "../../../src/lib/fps/br/door-renderer";
import { initialDoors } from "../../../src/lib/fps/br/doors";
import { TICK_MS } from "../../../src/lib/fps/simulation";
import type { WorldMeta } from "../../../src/lib/fps/br/world";
import { RenderBudget, RENDER_CAP } from "../../../src/lib/fps/presentation";
import { DevOverlay, GpuTimer } from "../../../src/lib/fps/br/dev-overlay";
import { watchContextLoss } from "../../../src/lib/fps/br/context-loss";

declare global {
  interface Window {
    explorer: {
      ready: Promise<void>;
      view: (
        pos: number[],
        look: number[],
        opts?: { up?: number[]; fov?: number },
      ) => Promise<Record<string, number>>;
      meta: () => WorldMeta;
      /** Placements (model, position, POI) for aiming capture views at real buildings. */
      layout: () => Array<{ model: string; x: number; y: number; z: number; poi: string }>;
      groundAt: (x: number, z: number) => number;
      /** Compiled shader programs (name and cache key), for the ≤ 40 programs budget. */
      programs: () => Array<{ name: string; key: string }>;
      /** Force a WebGL context loss and restore; resolves with the stats of a redraw after it. */
      loseContext: () => Promise<{ recovered: boolean; stats: Record<string, number> }>;
      /** Render scale override (fairness check: what is drawn must not depend on it). */
      setPixelRatio: (ratio: number) => void;
    };
  }
}

const base = new URL(".", location.href).href;

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const budget = new RenderBudget();
const gpu = new GpuTimer(renderer.getContext() as WebGL2RenderingContext);
// Dev overlay: on in the interactive page (?fly=1), F3 toggles it.
const overlay = new DevOverlay(
  document.body,
  new URLSearchParams(location.search).get("fly") === "1",
);
let pixelRatioOverride: number | null = null;
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

let islandScene: IslandScene;
let solid: StaticWorld;
let placed: Array<{ model: string; x: number; y: number; z: number; poi: string }> = [];
let meta: WorldMeta;
let groundAt = (_x: number, _z: number) => 0;
let doorsFx: ReturnType<typeof createDoorRenderer> | null = null;
const ready = (async () => {
  const t0 = performance.now();
  // The same island the match draws and the server collides against (island-scene.ts).
  islandScene = await loadIslandScene(base);
  scene.add(islandScene.root);
  meta = islandScene.meta;
  const hf = islandScene.hf;
  groundAt = (x, z) => hf.heightAt(x, z);
  placed = islandScene.island.layout;
  solid = islandScene.island.solid;
  // Doors as a match starts them (seed 1).
  const doorSet = islandScene.island.doors;
  doorsFx = createDoorRenderer(scene, doorSet);
  const start = initialDoors(1, doorSet.doors.length);
  doorsFx.apply(
    { open: [...start.keys()].filter((i) => start[i]) },
    new Uint8Array(doorSet.doors.length),
  );
  // As in 1v1/5v5: every shader compiled before Ready, so nothing compiles mid-match.
  islandScene.update(camera);
  await renderer.compileAsync(scene, camera);
  (window as unknown as { loadMs: number }).loadMs = performance.now() - t0;
})();

function resize() {
  const w = innerWidth,
    h = innerHeight;
  renderer.setPixelRatio(pixelRatioOverride ?? budget.ratio(w, h, devicePixelRatio));
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

function draw() {
  const { selectMs } = islandScene.update(camera);
  gpu.begin();
  renderer.render(scene, camera);
  gpu.end();
  return {
    ...(islandScene.stats() as Record<string, number>),
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
  if (e.code === "F3") {
    e.preventDefault();
    overlay.toggle();
  }
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
  if (!interactive || !islandScene) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // Lost GPU context: keep simulating, skip rendering until it is restored.
  if (context.lost) return;
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
  overlay.frame({
    frameMs: dt * 1000,
    simMs: s.selectMs,
    gpuMs: gpu.last,
    calls: s.calls,
    triangles: s.triangles,
    instances: s.props + s.trees,
    entities: body ? 1 : 0,
    pixelRatio: renderer.getPixelRatio(),
    note: context.recoveries ? `context restored ${context.recoveries}x` : undefined,
  });
  stats.textContent = `${(1000 * dt).toFixed(1)} ms  ${s.calls} calls  ${(s.triangles / 1e6).toFixed(2)} M tris  ${s.patches} patches  pixel ratio ${renderer.getPixelRatio().toFixed(2)}\n${walking ? "walking" : "flying"} (F)  x ${camera.position.x.toFixed(0)} z ${camera.position.z.toFixed(0)}  ground ${ground.toFixed(1)} m`;
}
const context = watchContextLoss(renderer, { scene, camera, onRestored: () => gpu.reset() });
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
  layout: () => placed,
  setPixelRatio(ratio) {
    pixelRatioOverride = ratio;
    resize();
  },
  async loseContext() {
    await ready;
    const ext = renderer.getContext().getExtension("WEBGL_lose_context");
    if (!ext) return { recovered: false, stats: {} };
    const canvas = renderer.domElement;
    // Each step times out (a browser that never restores must not hang the caller).
    const event = (name: string) =>
      new Promise<boolean>((r) => {
        const t = setTimeout(() => r(false), 5000);
        canvas.addEventListener(name, () => (clearTimeout(t), r(true)), { once: true });
      });
    const lost = event("webglcontextlost");
    ext.loseContext();
    if (!(await lost)) return { recovered: false, stats: { step: 1 } };
    // Restoring is allowed only once the lost event has finished dispatching (its default
    // prevented): wait a task, as a browser-initiated restore would.
    await new Promise((r) => setTimeout(r, 100));
    const restored = event("webglcontextrestored");
    ext.restoreContext();
    if (!(await restored)) return { recovered: false, stats: { step: 2 } };
    // watchContextLoss recompiles before resuming.
    for (let i = 0; i < 100 && context.lost; i++) await new Promise((r) => setTimeout(r, 50));
    if (context.lost) return { recovered: false, stats: { step: 3 } };
    return { recovered: context.recoveries > 0, stats: draw() };
  },
  programs: () =>
    (renderer.info.programs ?? []).map((p) => ({
      name: p.name,
      key: (p as unknown as { cacheKey: string }).cacheKey,
    })),
  groundAt: (x, z) => groundAt(x, z),
  async view(pos, look, opts = {}) {
    await ready;
    interactive = false;
    // Optional: a straight-down view needs another "up" (north at the top), and a field of view.
    camera.up.set(...((opts.up ?? [0, 1, 0]) as [number, number, number]));
    if (camera.fov !== (opts.fov ?? 70)) {
      camera.fov = opts.fov ?? 70;
      camera.updateProjectionMatrix();
    }
    camera.position.set(pos[0]!, pos[1]!, pos[2]!);
    camera.lookAt(look[0]!, look[1]!, look[2]!);
    camera.updateMatrixWorld();
    // Every LOD is preloaded behind the loading screen (island-scene.ts): select and draw.
    islandScene.update(camera);
    doorsFx?.update(16, performance.now() + 1e6, camera.position);
    return draw();
  },
};
void RENDER_CAP;
