/**
 * Door bake, step 2 (browser page, three.js): photographs a painted door off a model's untouched
 * import (orthographic, square on, unlit albedo, only the wall's own slab so porch rails and
 * posts in front stay out), draws the styled doors, and measures the wall either side of each
 * opening by ray casting the shipped model. Driven by bake.mjs through window.bake.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  alpha: true,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<THREE.Object3D>>();
const load = (file: string) => {
  let p = cache.get(file);
  if (!p)
    cache.set(
      file,
      (p = loader.loadAsync(file).then((g) => {
        g.scene.updateMatrixWorld(true);
        g.scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = (
            Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          ) as THREE.MeshStandardMaterial[];
          const flat = mats.map(
            (m) =>
              new THREE.MeshBasicMaterial({
                map: m.map ?? null,
                color: m.color ?? new THREE.Color(1, 1, 1),
                vertexColors: !!m.vertexColors,
                side: THREE.DoubleSide,
                alphaTest: m.alphaTest || 0,
                transparent: false,
              }),
          );
          mesh.material = Array.isArray(mesh.material) ? flat : flat[0]!;
        });
        return g.scene;
      })),
    );
  return p;
};

type Job = {
  model: string;
  along: "x" | "z";
  x: number;
  z: number;
  y0: number;
  y1: number;
  lo: number;
  hi: number;
  out: 1 | -1;
  style: string;
  original: string;
  current: string;
};
const PPM = 128;

async function photo(job: Job, lo: number, hi: number, top: number, front: number) {
  const scene = new THREE.Scene();
  scene.add(await load(job.original));
  const w = hi - lo,
    h = top - job.y0;
  const W = Math.max(8, Math.round(w * PPM)),
    H = Math.max(8, Math.round(h * PPM));
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  // Only the wall's own slab: from just outside its outer face (a door painted flush with a
  // thick wall's face) to 0.6 m behind the doorway's plane (a door set back from the authored plane).
  const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 5 - front - 0.08, 5.6);
  const mid = (lo + hi) / 2,
    cy = (job.y0 + top) / 2;
  if (job.along === "x") {
    cam.position.set(mid, cy, job.z + job.out * 5);
    cam.lookAt(mid, cy, job.z);
  } else {
    cam.position.set(job.x + job.out * 5, cy, mid);
    cam.lookAt(job.x, cy, mid);
  }
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL("image/png");
}

/** The drawn doors (no source photograph): house, shop, metal and plank. */
function drawn(style: string, w: number, h: number) {
  const W = Math.max(8, Math.round(w * PPM)),
    H = Math.max(8, Math.round(h * PPM));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const m = (v: number) => v * PPM;
  const noise = (alpha: number) => {
    for (let i = 0; i < W * H * 0.04; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * alpha})`;
      g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1);
    }
  };
  const knob = (x: number, y: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, m(0.028), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(x - m(0.01), y - m(0.015), m(0.012), m(0.012));
  };
  if (style === "house") {
    // Painted six-panel timber door.
    g.fillStyle = "#e7e2d6";
    g.fillRect(0, 0, W, H);
    const pw = (W - m(0.24)) / 2;
    const rows = [
      [0.1, 0.22],
      [0.38, 0.33],
      [0.76, 0.2],
    ];
    for (const [t, hh] of rows)
      for (const col of [0, 1]) {
        const x = m(0.08) + col * (pw + m(0.08)),
          y = (t ?? 0) * H,
          ph = (hh ?? 0) * H;
        g.fillStyle = "#cfc8b8";
        g.fillRect(x, y, pw, ph);
        g.fillStyle = "#f3efe6";
        g.fillRect(x + m(0.025), y + m(0.025), pw - m(0.05), ph - m(0.05));
        g.strokeStyle = "rgba(90,80,60,0.25)";
        g.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
      }
    noise(0.05);
    knob(W - m(0.09), H * 0.5, "#b08d3c");
  } else if (style === "shop") {
    // Aluminium-framed glazed door with a push bar.
    g.fillStyle = "#9aa1a8";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#26323b";
    g.fillRect(m(0.08), m(0.08), W - m(0.16), H * 0.78);
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "rgba(255,255,255,0.18)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.02)");
    grad.addColorStop(1, "rgba(255,255,255,0.1)");
    g.fillStyle = grad;
    g.fillRect(m(0.08), m(0.08), W - m(0.16), H * 0.78);
    g.fillStyle = "#c9ced3";
    g.fillRect(m(0.12), H * 0.5, W - m(0.24), m(0.04));
    g.fillStyle = "#7f868d";
    g.fillRect(0, H * 0.86, W, H * 0.14);
  } else if (style === "metal") {
    // Painted steel personnel door with a kick plate and a lever.
    g.fillStyle = "#6f7a80";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#788389";
    g.fillRect(m(0.06), m(0.06), W - m(0.12), H - m(0.12));
    g.fillStyle = "#5b646a";
    g.fillRect(m(0.06), H - m(0.32), W - m(0.12), m(0.24));
    noise(0.12);
    g.fillStyle = "#c7c9c8";
    g.fillRect(W - m(0.2), H * 0.5, m(0.13), m(0.03));
    knob(W - m(0.1), H * 0.5 + m(0.015), "#b9bbba");
  } else {
    // Weathered vertical boards with two ledges.
    for (let x = 0; x < W; x += m(0.14)) {
      const t = 90 + Math.random() * 30;
      g.fillStyle = `rgb(${t},${t * 0.72},${t * 0.48})`;
      g.fillRect(x, 0, m(0.14), H);
      g.fillStyle = "rgba(30,20,10,0.6)";
      g.fillRect(x, 0, 1.5, H);
    }
    g.fillStyle = "rgba(60,40,25,0.9)";
    g.fillRect(0, H * 0.18, W, m(0.1));
    g.fillRect(0, H * 0.74, W, m(0.1));
    noise(0.15);
    knob(W - m(0.1), H * 0.5, "#2b2b2b");
  }
  return c.toDataURL("image/png");
}

/** Wall faces beside the opening, from the door plane outward (front) and inward (back). */
async function depth(job: Job) {
  const model = await load(job.current);
  const ray = new THREE.Raycaster();
  const n = job.along === "x" ? new THREE.Vector3(0, 0, job.out) : new THREE.Vector3(job.out, 0, 0);
  let front = 0,
    back = 0;
  for (const [edge, side] of [
    [job.lo, -1],
    [job.hi, 1],
  ] as const)
    for (const y of [job.y0 + 0.5, (job.y0 + job.y1) / 2, job.y1 - 0.4]) {
      const a = edge + side * 0.1;
      const p = job.along === "x" ? new THREE.Vector3(a, y, job.z) : new THREE.Vector3(job.x, y, a);
      for (const s of [1, -1]) {
        ray.set(p.clone().addScaledVector(n, s * 1.2), n.clone().multiplyScalar(-s));
        ray.far = 1.2;
        const hit = ray.intersectObject(model, true)[0];
        if (!hit) continue;
        const t = 1.2 - hit.distance;
        if (s > 0) front = Math.max(front, t);
        else back = Math.max(back, t);
      }
    }
  return { front: Math.min(0.9, Math.max(0.03, front)), back: Math.min(0.9, Math.max(0.03, back)) };
}

/** Standard deviation of an image's luminance (0–255). */
async function spread(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let s = 0,
    s2 = 0,
    n = 0;
  for (let i = 0; i < d.length; i += 16) {
    if (d[i + 3]! < 128) continue;
    const l = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
    s += l;
    s2 += l * l;
    n++;
  }
  return n ? Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)) : 0;
}

(window as unknown as { bake: unknown }).bake = async (input: Job, lining: number) => {
  let job = input;
  // The panel fills the opening inside a thin lining on its sides and head.
  const lo = job.lo + lining,
    hi = job.hi - lining,
    top = job.y1 - lining;
  let wall = await depth(job);
  if (job.style !== "photo")
    return { image: drawn(job.style, hi - lo, top - job.y0), out: job.out, ...wall };
  let image = await photo(job, lo, hi, top, wall.front);
  // A blank slab means the painted door faces the other way (a wall whose outside is toward
  // the building's middle, as in an L-shaped plan): photograph that side instead.
  if ((await spread(image)) < 6) {
    const turned = { ...job, out: -job.out as 1 | -1 };
    const other = await depth(turned);
    const second = await photo(turned, lo, hi, top, other.front);
    if ((await spread(second)) > (await spread(image))) {
      job = turned;
      wall = other;
      image = second;
    }
  }
  return { image, out: job.out, ...wall };
};
(window as unknown as { ready: boolean }).ready = true;
