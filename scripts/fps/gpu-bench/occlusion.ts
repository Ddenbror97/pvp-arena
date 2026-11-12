/**
 * What occlusion culling could save on the 5v5 maps, measured on the machine that opens the page
 * (performance audit 2026-11-11: go or no-go before building anything).
 *
 * For views all over each map's walkable floor (the walk graph on a 6 m grid, eight headings,
 * every `STRIDE`th view) the page finds which map meshes really show (each drawn in a colour of
 * its own with the depth test, as scripts/fps/map-capture's sweep does), then times the game's
 * map scene, with its real materials, lighting and static shadow map, at the game's render size:
 *
 *  - "full": as the game draws it now (frustum culling only);
 *  - "culled": with the meshes that do not show switched off, which is the most a perfect
 *    precomputed visibility set could do.
 *
 * Each timing is `REPEAT` renders in a row, then a wait for the GPU: `cpu` is the JavaScript and
 * WebGL submission of one render, `total` includes the GPU process and the GPU. The two modes
 * alternate (full, culled, full, culled) so drift cannot favour one. See-through meshes (glass,
 * alpha-tested cards) neither hide anything nor are ever culled.
 *
 * No requestAnimationFrame and no timers in the measurement: it also runs in a hidden window.
 * Results go to the page, and to the artifact's database where there is one (collection `runs`).
 */
import * as THREE from "three";
import { bombNav } from "../../../src/lib/fps/bomb/nav";
import { BOMB_MAPS, type BombMapId } from "../../../src/lib/fps/bomb/maps";
import { createMapEnvironment } from "../../../src/lib/fps/maps/environments";

/** `#smoke` (a check of the page itself, for software renderers): few views, a small frame. */
const QUICK = location.hash === "#smoke";
const STRIDE = QUICK ? 300 : 7;
/** `#auto-low`: ask for the power-saving adapter (the integrated GPU of a hybrid laptop). */
const LOW_POWER = location.hash === "#auto-low";
const REPEAT = QUICK ? 2 : 12;
// The game's 1.5 MP cap in a 1920 × 1080 window.
const SIZE: [number, number] = QUICK ? [320, 180] : [1632, 918];

// ---- assets: models sit beside the page as base64 text (the host serves text and images) ----
const base = new URL(".", location.href).href;
const blobs = new Map<string, string>();
async function preload(names: string[]) {
  await Promise.all(
    names.map(async (name) => {
      let bytes: ArrayBuffer;
      const res = await fetch(`${base}fps/models/${name}.glb`).catch(() => null);
      if (res?.ok) bytes = await res.arrayBuffer();
      else {
        const txt = await fetch(`${base}fps/models/${name}.glb.txt`);
        if (!txt.ok) throw new Error(`model ${name}: HTTP ${txt.status}`);
        const bin = atob((await txt.text()).trim());
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        bytes = u8.buffer;
      }
      blobs.set(`/fps/models/${name}.glb`, URL.createObjectURL(new Blob([bytes])));
    }),
  );
}
const local = (url: string) =>
  blobs.get(url.split("?")[0]!) ?? (/^\/(fps|brand)\//.test(url) ? base + url.slice(1) : url);
THREE.DefaultLoadingManager.setURLModifier(local);
const pageFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  pageFetch(typeof input === "string" ? local(input) : input, init);

// ---- page ----
const $ = (id: string) => document.getElementById(id)!;
const say = (line: string) => {
  $("status").textContent = line;
};
/** A turn of the event loop that a hidden page does not slow down (timers are clamped there). */
const breathe = () =>
  new Promise<void>((resolve) => {
    const c = new MessageChannel();
    c.port1.onmessage = () => resolve();
    c.port2.postMessage(0);
  });
const pct = (a: number[], p: number) =>
  [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))]!;
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const r2 = (v: number) => Math.round(v * 100) / 100;

type MapResult = {
  map: string;
  views: number;
  meshes: number;
  seeThrough: number;
  calls: { full: number; culled: number };
  cpuMs: { full: number; culled: number; fullP90: number; culledP90: number };
  totalMs: { full: number; culled: number; fullP90: number; culledP90: number };
  savedCpuMs: { mean: number; p50: number; p90: number };
  savedTotalMs: { mean: number; p50: number; p90: number };
  /** The same view timed twice the same way (full − full): the size of the noise. */
  noiseTotalMs: { mean: number; p90: number };
};

async function measure(id: BombMapId, renderer: THREE.WebGLRenderer): Promise<MapResult> {
  const map = BOMB_MAPS[id].map;
  const lighting = map.presentation.lighting;
  const [w, h] = SIZE;
  renderer.toneMappingExposure = lighting.exposure;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(lighting.background);
  scene.fog = new THREE.Fog(lighting.fog.color, lighting.fog.near, lighting.fog.far);
  scene.add(
    new THREE.HemisphereLight(
      lighting.hemisphere.sky,
      lighting.hemisphere.ground,
      lighting.hemisphere.intensity,
    ),
  );
  const sun = new THREE.DirectionalLight(lighting.sun.color, lighting.sun.intensity);
  sun.position.set(...lighting.sun.position);
  sun.castShadow = true;
  const shadow = map.presentation.shadow;
  sun.shadow.mapSize.set(shadow.mapSize, shadow.mapSize);
  Object.assign(sun.shadow.camera, {
    near: 1,
    far: shadow.far,
    left: -shadow.extent,
    right: shadow.extent,
    top: shadow.extent,
    bottom: -shadow.extent,
  });
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(78, w / h, 0.06, map.presentation.viewDistance);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  say(`${id}: loading`);
  const env = createMapEnvironment(scene, map);
  await env.ready;
  scene.updateMatrixWorld(true);
  renderer.shadowMap.needsUpdate = true;
  await renderer.compileAsync(scene, camera);

  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.visible) meshes.push(m);
  });
  const solid = meshes.map((m) =>
    (Array.isArray(m.material) ? m.material : [m.material]).every(
      (x) => !x.transparent && !(x.alphaTest > 0) && x.opacity >= 1,
    ),
  );
  const real = meshes.map((m) => m.material);
  const flat = meshes.map((_, i) => {
    const n = i + 1;
    const mat = new THREE.MeshBasicMaterial({ fog: false, side: THREE.DoubleSide });
    mat.color.setRGB((n & 255) / 255, ((n >> 8) & 255) / 255, 0, THREE.LinearSRGBColorSpace);
    return mat;
  });

  // Views: the walk graph on a 6 m grid at eye height, eight headings, every STRIDEth.
  const nav = bombNav(map);
  const all: number[][] = [];
  const taken = new Set<string>();
  for (let n = 0; n < nav.x.length; n++) {
    const x = nav.x[n]!,
      y = nav.y[n]!,
      z = nav.z[n]!;
    const key = `${Math.round(x / 6)}|${Math.round(z / 6)}|${Math.round(y / 1.2)}`;
    if (taken.has(key)) continue;
    taken.add(key);
    for (let k = 0; k < 8; k++) all.push([x, y + 1.6, z, (k * Math.PI) / 4]);
  }
  const views = all.filter((_, i) => i % STRIDE === 0);

  // Pass 1: what shows from each view.
  const target = new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
  const pixels = new Uint8Array(w * h * 4);
  const background = scene.background,
    fog = scene.fog;
  scene.background = new THREE.Color(0, 0, 0);
  scene.fog = null;
  meshes.forEach((m, i) => {
    m.material = flat[i]!;
    m.visible = solid[i]!;
  });
  const shows: Uint8Array[] = [];
  for (let v = 0; v < views.length; v++) {
    const [x, y, z, yaw] = views[v]!;
    camera.position.set(x!, y!, z!);
    camera.rotation.set(0, yaw!, 0);
    camera.updateMatrixWorld(true);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
    const seen = new Uint8Array(meshes.length);
    for (let i = 0; i < pixels.length; i += 4) {
      const n = pixels[i]! | (pixels[i + 1]! << 8);
      if (n) seen[n - 1] = 1;
    }
    // See-through meshes are never culled.
    for (let i = 0; i < meshes.length; i++) if (!solid[i]) seen[i] = 1;
    shows.push(seen);
    if (v % 20 === 0) {
      say(`${id}: finding what shows, view ${v + 1} of ${views.length}`);
      await breathe();
    }
  }
  renderer.setRenderTarget(null);
  target.dispose();
  scene.background = background;
  scene.fog = fog;
  meshes.forEach((m, i) => {
    m.material = real[i]!;
    m.visible = true;
  });

  // Pass 2: timings.
  const gl = renderer.getContext();
  const one = new Uint8Array(4);
  const time = (seen: Uint8Array | null) => {
    for (let i = 0; i < meshes.length; i++) meshes[i]!.visible = !seen || seen[i] === 1;
    renderer.render(scene, camera);
    renderer.render(scene, camera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
    renderer.info.reset();
    const a = performance.now();
    for (let k = 0; k < REPEAT; k++) renderer.render(scene, camera);
    const b = performance.now();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one); // waits for the GPU
    const c = performance.now();
    return { cpu: (b - a) / REPEAT, total: (c - a) / REPEAT, calls: renderer.info.render.calls };
  };
  renderer.info.autoReset = false;
  const rows: Array<{ f: ReturnType<typeof time>; c: ReturnType<typeof time>; noise: number }> = [];
  for (let v = 0; v < views.length; v++) {
    const [x, y, z, yaw] = views[v]!;
    camera.position.set(x!, y!, z!);
    camera.rotation.set(0, yaw!, 0);
    camera.updateMatrixWorld(true);
    const f1 = time(null),
      c1 = time(shows[v]!),
      f2 = time(null),
      c2 = time(shows[v]!);
    rows.push({
      f: {
        cpu: Math.min(f1.cpu, f2.cpu),
        total: Math.min(f1.total, f2.total),
        calls: f1.calls / REPEAT,
      },
      c: {
        cpu: Math.min(c1.cpu, c2.cpu),
        total: Math.min(c1.total, c2.total),
        calls: c1.calls / REPEAT,
      },
      noise: Math.abs(f1.total - f2.total),
    });
    if (v % 10 === 0) {
      say(`${id}: timing, view ${v + 1} of ${views.length}`);
      await breathe();
    }
  }
  renderer.info.autoReset = true;
  env.dispose();
  scene.clear();
  renderer.renderLists.dispose();
  const savedCpu = rows.map((r) => r.f.cpu - r.c.cpu),
    savedTotal = rows.map((r) => r.f.total - r.c.total);
  return {
    map: id,
    views: views.length,
    meshes: meshes.length,
    seeThrough: solid.filter((s) => !s).length,
    calls: {
      full: Math.round(mean(rows.map((r) => r.f.calls))),
      culled: Math.round(mean(rows.map((r) => r.c.calls))),
    },
    cpuMs: {
      full: r2(
        pct(
          rows.map((r) => r.f.cpu),
          0.5,
        ),
      ),
      culled: r2(
        pct(
          rows.map((r) => r.c.cpu),
          0.5,
        ),
      ),
      fullP90: r2(
        pct(
          rows.map((r) => r.f.cpu),
          0.9,
        ),
      ),
      culledP90: r2(
        pct(
          rows.map((r) => r.c.cpu),
          0.9,
        ),
      ),
    },
    totalMs: {
      full: r2(
        pct(
          rows.map((r) => r.f.total),
          0.5,
        ),
      ),
      culled: r2(
        pct(
          rows.map((r) => r.c.total),
          0.5,
        ),
      ),
      fullP90: r2(
        pct(
          rows.map((r) => r.f.total),
          0.9,
        ),
      ),
      culledP90: r2(
        pct(
          rows.map((r) => r.c.total),
          0.9,
        ),
      ),
    },
    savedCpuMs: {
      mean: r2(mean(savedCpu)),
      p50: r2(pct(savedCpu, 0.5)),
      p90: r2(pct(savedCpu, 0.9)),
    },
    savedTotalMs: {
      mean: r2(mean(savedTotal)),
      p50: r2(pct(savedTotal, 0.5)),
      p90: r2(pct(savedTotal, 0.9)),
    },
    noiseTotalMs: {
      mean: r2(mean(rows.map((r) => r.noise))),
      p90: r2(
        pct(
          rows.map((r) => r.noise),
          0.9,
        ),
      ),
    },
  };
}

function row(r: MapResult) {
  const tr = document.createElement("tr");
  const cells = [
    r.map,
    String(r.views),
    `${r.calls.full} → ${r.calls.culled}`,
    `${r.cpuMs.full} → ${r.cpuMs.culled}`,
    `${r.totalMs.full} → ${r.totalMs.culled}`,
    `${r.totalMs.fullP90} → ${r.totalMs.culledP90}`,
    `${r.savedTotalMs.mean} (noise ${r.noiseTotalMs.mean})`,
  ];
  cells.forEach((text, i) => {
    const td = document.createElement(i ? "td" : "th");
    td.textContent = text;
    tr.appendChild(td);
  });
  $("rows").appendChild(tr);
}

let running = false;
async function run() {
  if (running) return;
  running = true;
  ($("start") as HTMLButtonElement).disabled = true;
  $("rows").replaceChildren();
  const started = Date.now();
  try {
    say("Loading the maps");
    await preload(["sandgate", "iron-district"]);
    const canvas = $("view") as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: LOW_POWER ? "low-power" : "high-performance",
    });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE[0], SIZE[1], false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    );
    $("gpu").textContent = gpu;
    const maps: MapResult[] = [];
    for (const id of ["iron-district", "sandgate"] as BombMapId[]) {
      const r = await measure(id, renderer);
      maps.push(r);
      row(r);
    }
    const result = {
      at: new Date().toISOString(),
      gpu,
      size: SIZE.join("x"),
      hidden: document.visibilityState !== "visible",
      seconds: Math.round((Date.now() - started) / 1000),
      maps,
    };
    $("json").textContent = JSON.stringify(result, null, 1);
    say(`Done in ${result.seconds} s.`);
    const db = await claudeDb();
    if (db) {
      await db.doc(`runs/r${started}`).set(result);
      say(`Done in ${result.seconds} s. Saved.`);
    }
  } catch (e) {
    say(`Failed: ${e instanceof Error ? e.message : String(e)}`);
    const db = await claudeDb().catch(() => null);
    await db
      ?.doc(`runs/r${started}`)
      .set({ at: new Date().toISOString(), error: String(e) })
      .catch(() => {});
  }
  running = false;
  ($("start") as HTMLButtonElement).disabled = false;
}

type Db = {
  doc(path: string): {
    set(data: Record<string, unknown>): Promise<void>;
    onSnapshot(
      next: (snap: { exists: boolean; data(): Record<string, unknown> | undefined }) => void,
      error?: (e: unknown) => void,
    ): () => void;
  };
};
let dbOnce: Promise<Db | null> | null = null;
function claudeDb() {
  const claude = (window as unknown as { claude?: { use(name: string): Promise<unknown> } }).claude;
  return (dbOnce ??= claude ? (claude.use("db") as Promise<Db | null>) : Promise.resolve(null));
}

$("start").addEventListener("click", run);
if (location.hash === "#auto" || LOW_POWER || QUICK) void run();
// A run can also be asked for from outside: a new `nonce` in control/run starts one.
void claudeDb().then((db) => {
  let seen: unknown;
  let first = true;
  db?.doc("control/run").onSnapshot(
    (snap) => {
      const nonce = snap.exists ? snap.data()?.nonce : undefined;
      if (!first && nonce !== undefined && nonce !== seen) void run();
      seen = nonce;
      first = false;
    },
    () => {},
  );
});
