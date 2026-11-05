/**
 * Project Island stress scene (PLAN §10 "Benchmark map"): 100 building sections, 1,000 trees,
 * 2,000 props, 100 moving player-sized entities and 4,000 particles, drawn with the real BR
 * props renderer and render settings, along a fixed camera path. `window.stress.run(frames)`
 * returns frame-time percentiles, CPU update time, GPU time (where timer queries exist), draws
 * and triangles. Open the static copy with ?run=1 on a real GPU: the overlay shows the result.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { createProps } from "../../../src/lib/fps/br/props-renderer";
import { DevOverlay, GpuTimer } from "../../../src/lib/fps/br/dev-overlay";
import { watchContextLoss } from "../../../src/lib/fps/br/context-loss";
import type { Placement } from "../../../src/lib/fps/br/layout";
import { RenderBudget } from "../../../src/lib/fps/presentation";

type Manifest = Parameters<typeof createProps>[1];
type Result = {
  frames: number;
  frameMs: { p50: number; p95: number; p99: number; mean: number };
  updateMs: { mean: number; p95: number };
  gpuMs: number | null;
  calls: { mean: number; max: number };
  triangles: { mean: number; max: number };
  instances: number;
  entities: number;
  particles: number;
};
declare global {
  interface Window {
    stress: { ready: Promise<void>; run: (frames: number) => Promise<Result> };
  }
}

const base = new URL(".", location.href).href;
const url = (p: string) => new URL(p.replace(/^\//, ""), base).href;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const budget = new RenderBudget();
const gpu = new GpuTimer(renderer.getContext() as WebGL2RenderingContext);
const overlay = new DevOverlay(document.body, true);
const scene = new THREE.Scene();
const sky = new THREE.Color(0x9fb8cc);
scene.background = sky;
scene.fog = new THREE.Fog(sky, 1800, 9500);
const camera = new THREE.PerspectiveCamera(70, 1, 0.5, 14000);
scene.add(new THREE.HemisphereLight(0xc9dcf0, 0x5a5040, 1.15));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
sun.position.set(-550, 620, 450);
scene.add(sun);
const context = watchContextLoss(renderer, { scene, camera, onRestored: () => gpu.reset() });

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

// Deterministic placement (mulberry32).
let seed = 20261103;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x8a9a6a, roughness: 1 }),
);
scene.add(ground);

// 100 moving entities: player-sized capsules running in circles (CPU matrix updates each frame).
const ENTITIES = 100;
const bodies = new THREE.InstancedMesh(
  new THREE.CapsuleGeometry(0.35, 1.1, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0xc04a3a }),
  ENTITIES,
);
bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(bodies);
const paths = Array.from({ length: ENTITIES }, () => ({
  cx: (rand() - 0.5) * 300,
  cz: (rand() - 0.5) * 300,
  r: 5 + rand() * 25,
  phase: rand() * Math.PI * 2,
}));
const m4 = new THREE.Matrix4();
function moveEntities(t: number) {
  paths.forEach((p, i) => {
    const a = p.phase + (t * 5) / p.r; // 5 m/s, the 1v1 run speed
    m4.makeTranslation(p.cx + Math.cos(a) * p.r, 0.9, p.cz + Math.sin(a) * p.r);
    bodies.setMatrixAt(i, m4);
  });
  bodies.instanceMatrix.needsUpdate = true;
}

// 4,000 particles: smoke and dust puffs animated on the GPU (one draw, no CPU per frame).
const PARTICLES = 4000;
const particleGeometry = new THREE.BufferGeometry();
const origins = new Float32Array(PARTICLES * 3);
for (let i = 0; i < PARTICLES; i++) {
  origins[i * 3] = (rand() - 0.5) * 400;
  origins[i * 3 + 1] = rand() * 6;
  origins[i * 3 + 2] = (rand() - 0.5) * 400;
}
particleGeometry.setAttribute("position", new THREE.BufferAttribute(origins, 3));
const particleMaterial = new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  transparent: true,
  depthWrite: false,
  vertexShader: `uniform float time; varying float vAlpha;
    void main() {
      float life = fract(time * 0.25 + position.x * 0.013 + position.z * 0.007);
      vec3 p = position + vec3(0.0, life * 8.0, 0.0);
      vAlpha = 1.0 - life;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = 60.0 / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      gl_FragColor = vec4(0.82, 0.8, 0.76, vAlpha * 0.5 * (1.0 - d * 2.0));
    }`,
});
scene.add(new THREE.Points(particleGeometry, particleMaterial));

let props: ReturnType<typeof createProps>;
const ready = (async () => {
  const manifest = (await (await fetch(url("/fps/br/models/models.json"))).json()) as Manifest;
  const models = manifest.models as Record<string, { class: string }>;
  const ids = (classes: string[]) =>
    Object.keys(models).filter((id) => classes.includes(models[id]!.class) && id !== "superstore");
  const buildings = ids(["building"]);
  const trees = ["tree-pine", "tree-oak", "tree-birch"].filter((id) => models[id]);
  const smalls = ids(["prop", "small", "vehicle", "rock", "bush", "structure"]).filter(
    (id) => !["parachute", "helipad"].includes(id),
  );
  const placements: Placement[] = [];
  const put = (model: string, x: number, z: number) =>
    placements.push({
      model,
      x,
      y: 0,
      z,
      turn: (Math.floor(rand() * 4) % 4) as Placement["turn"],
      poi: "stress",
    });
  // 100 building sections on a 10 x 10 grid of 45 m lots around the centre.
  for (let i = 0; i < 100; i++)
    put(buildings[i % buildings.length]!, ((i % 10) - 4.5) * 45, (Math.floor(i / 10) - 4.5) * 45);
  // 1,000 trees in a ring around the town; 2,000 props scattered through and around it.
  for (let i = 0; i < 1000; i++) {
    const a = rand() * Math.PI * 2,
      d = 260 + rand() * 600;
    put(trees[i % trees.length]!, Math.cos(a) * d, Math.sin(a) * d);
  }
  for (let i = 0; i < 2000; i++)
    put(smalls[i % smalls.length]!, (rand() - 0.5) * 900, (rand() - 0.5) * 900);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  props = createProps(placements, manifest, loader, { preload: true });
  scene.add(props.root);
  await props.ready;
  camera.position.set(0, 1.7, 160);
  camera.lookAt(0, 1.7, 0);
  props.update(camera);
  await renderer.compileAsync(scene, camera);
})();

/** Fixed camera path: a ground-level loop through the town, then a flyover. */
function cameraAt(t: number) {
  if (t < 0.6) {
    const a = (t / 0.6) * Math.PI * 2;
    camera.position.set(Math.cos(a) * 140, 1.7, Math.sin(a) * 140);
    camera.lookAt(Math.cos(a + 0.6) * 60, 2, Math.sin(a + 0.6) * 60);
  } else {
    const u = (t - 0.6) / 0.4;
    camera.position.set(-500 + u * 1000, 60, 300);
    camera.lookAt(-300 + u * 1000, 0, 0);
  }
}

function frame(t: number, dtMs: number) {
  const a = performance.now();
  moveEntities(t * 40);
  particleMaterial.uniforms.time!.value = t * 40;
  props.update(camera);
  const updateMs = performance.now() - a;
  gpu.begin();
  renderer.render(scene, camera);
  gpu.end();
  const s = props.stats();
  const sample = {
    frameMs: dtMs,
    simMs: updateMs,
    gpuMs: gpu.last,
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    instances: s.instances,
    entities: ENTITIES,
    pixelRatio: renderer.getPixelRatio(),
  };
  overlay.frame(sample);
  return sample;
}

async function run(frames: number): Promise<Result> {
  await ready;
  const samples: Array<ReturnType<typeof frame>> = [];
  let last = performance.now();
  for (let i = 0; i < frames; i++) {
    await new Promise((r) => requestAnimationFrame(r));
    if (context.lost) continue;
    const now = performance.now();
    cameraAt(i / frames);
    samples.push(frame(i / frames, now - last));
    last = now;
  }
  const pct = (v: number[], p: number) => {
    const s = [...v].sort((a, b) => a - b);
    return +s[Math.min(s.length - 1, Math.floor(s.length * p))]!.toFixed(2);
  };
  const mean = (v: number[]) => +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2);
  const fm = samples.slice(5).map((s) => s.frameMs); // first frames include warm-up
  const um = samples.map((s) => s.simMs);
  const gm = samples.map((s) => s.gpuMs).filter((v): v is number => v != null);
  const result: Result = {
    frames: samples.length,
    frameMs: { p50: pct(fm, 0.5), p95: pct(fm, 0.95), p99: pct(fm, 0.99), mean: mean(fm) },
    updateMs: { mean: mean(um), p95: pct(um, 0.95) },
    gpuMs: gm.length ? mean(gm) : null,
    calls: {
      mean: mean(samples.map((s) => s.calls)),
      max: Math.max(...samples.map((s) => s.calls)),
    },
    triangles: {
      mean: Math.round(mean(samples.map((s) => s.triangles))),
      max: Math.max(...samples.map((s) => s.triangles)),
    },
    instances: props.stats().instances,
    entities: ENTITIES,
    particles: PARTICLES,
  };
  overlay.toggle(true);
  overlay.element.textContent =
    `stress result (${result.frames} frames)\n` +
    `frame p50 ${result.frameMs.p50} ms  p95 ${result.frameMs.p95} ms  p99 ${result.frameMs.p99} ms\n` +
    `cpu update ${result.updateMs.mean} ms (p95 ${result.updateMs.p95})  gpu ${result.gpuMs ?? "n/a"} ms\n` +
    `draws ${result.calls.mean} (max ${result.calls.max})  tris ${(result.triangles.max / 1e6).toFixed(2)} M max`;
  return result;
}

window.stress = { ready, run };
if (new URLSearchParams(location.search).get("run") === "1") void ready.then(() => run(1200));
