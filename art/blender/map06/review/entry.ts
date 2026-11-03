/**
 * SANDGATE review page (bundled by capture.mjs): the game's map loader (createArenaEnvironment)
 * under the bomb renderer's world lighting (bomb-renderer.ts: fog, hemisphere, sun with a static
 * shadow map, ACES, one-off PMREM reflection capture), rendered from named cameras, plus the
 * collision-dressing check that compares the shipped GLB's triangles with the layout's solids.
 */
import * as THREE from "three";
import { SANDGATE } from "../../../../src/lib/fps/bomb/sandgate";
import { createArenaEnvironment } from "../../../../src/lib/fps/arena-environment";

type View = [number, number, number, number, number]; // x, y, z, yaw (0 = towards -z), pitch
type Box = { id: string; kind?: string; x: number; y: number; z: number; w: number; h: number; d: number };
type Layout = { solids: Box[]; open: Array<[string, number, number, number, number]> };

declare global {
  interface Window {
    capture: (views: Record<string, View>, w: number, h: number) => Promise<unknown>;
    check: (layout: Layout) => Promise<unknown>;
  }
}

let loaded: { scene: THREE.Scene; renderer: THREE.WebGLRenderer; loadMs: number } | undefined;

async function mount(w: number, h: number) {
  const map = SANDGATE;
  const lighting = map.presentation.lighting;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lighting.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.replaceChildren(renderer.domElement);
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
  const t0 = performance.now();
  const env = createArenaEnvironment(scene, map);
  await env.ready;
  const loadMs = performance.now() - t0;
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.matrixAutoUpdate = false;
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const reflections = pmrem.fromScene(scene, 0.04, 0.1, 100);
  pmrem.dispose();
  scene.environment = reflections.texture;
  scene.environmentIntensity = lighting.environmentIntensity;
  renderer.shadowMap.needsUpdate = true;
  scene.matrixWorldAutoUpdate = false;
  loaded = { scene, renderer, loadMs };
  return loaded;
}

window.capture = async (views, w, h) => {
  const { scene, renderer, loadMs } = loaded ?? (await mount(w, h));
  const camera = new THREE.PerspectiveCamera(78, w / h, 0.06, SANDGATE.presentation.viewDistance);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  const out: Record<string, { image: string; calls: number; triangles: number; ms: number }> = {};
  const gl = renderer.getContext();
  const pixel = new Uint8Array(4);
  for (const [name, [x, y, z, yaw, pitch]] of Object.entries(views)) {
    camera.position.set(x, y, z);
    camera.rotation.set(pitch, yaw, 0);
    camera.updateMatrixWorld(true);
    renderer.info.autoReset = false;
    const frame = () => {
      const s = performance.now();
      renderer.render(scene, camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return performance.now() - s;
    };
    frame();
    renderer.info.reset();
    const ms = frame();
    out[name] = {
      image: renderer.domElement.toDataURL("image/png"),
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      ms: Math.round(ms),
    };
  }
  return {
    loadMs: Math.round(loadMs),
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    programs: renderer.info.programs?.length ?? 0,
    views: out,
  };
};

/**
 * Collision-dressing check on the loaded GLB (world-space triangles, GPU instances expanded):
 * (a) coverage: rays shot inward at every exposed face of every gameplay solid (0.25 m grid)
 *     must hit visual geometry within 0.45 m behind the face (recesses up to 0.42 m);
 * (b) intrusion: no visual surface may enter walkable space (open floor not covered by any
 *     solid, ±5 cm tolerance) between floor + 5 cm and floor + 2.0 m.
 */
window.check = async (layout) => {
  const { scene } = loaded ?? (await mount(320, 180));
  const tris: number[] = [];
  const v = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const im = new THREE.Matrix4();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || o.name === "sky" || !mesh.geometry.attributes.position) return;
    let parent: THREE.Object3D | null = o;
    while (parent && parent.name !== "sandgate") parent = parent.parent;
    if (!parent) return; // the blockout and sky are not part of the authored scene
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const idx = g.index;
    const count = idx ? idx.count : pos.count;
    const instanced = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh) : null;
    const n = instanced ? instanced.count : 1;
    for (let k = 0; k < n; k++) {
      m.copy(mesh.matrixWorld);
      if (instanced) {
        instanced.getMatrixAt(k, im);
        m.multiply(im);
      }
      for (let i = 0; i < count; i++) {
        v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m);
        tris.push(v.x, v.y, v.z);
      }
    }
  });
  const T = new Float32Array(tris);
  const ntri = T.length / 9;
  // Uniform grid acceleration (1 m cells over x/z, all heights in one column).
  const C = 1,
    X0 = -46,
    Z0 = -46,
    NC = 92;
  const grid: number[][] = Array.from({ length: NC * NC }, () => []);
  for (let t = 0; t < ntri; t++) {
    const b = t * 9;
    const xs = [T[b], T[b + 3], T[b + 6]],
      zs = [T[b + 2], T[b + 5], T[b + 8]];
    const i0 = Math.max(0, Math.floor((Math.min(...xs) - X0) / C)),
      i1 = Math.min(NC - 1, Math.floor((Math.max(...xs) - X0) / C));
    const j0 = Math.max(0, Math.floor((Math.min(...zs) - Z0) / C)),
      j1 = Math.min(NC - 1, Math.floor((Math.max(...zs) - Z0) / C));
    if (i1 < 0 || j1 < 0 || i0 >= NC || j0 >= NC) continue;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) grid[i * NC + j].push(t);
  }
  const ray = (o: number[], d: number[], maxT: number) => {
    // Möller–Trumbore against the triangles of the cells the segment passes (sampled).
    const seen = new Set<number>();
    let best = Infinity;
    const steps = Math.ceil(maxT / 0.25) + 1;
    for (let s = 0; s <= steps; s++) {
      const px = o[0] + d[0] * (maxT * s) / steps,
        pz = o[2] + d[2] * (maxT * s) / steps;
      const i = Math.floor((px - X0) / C),
        j = Math.floor((pz - Z0) / C);
      if (i < 0 || j < 0 || i >= NC || j >= NC) continue;
      for (const t of grid[i * NC + j]) {
        if (seen.has(t)) continue;
        seen.add(t);
        const b = t * 9;
        const e1 = [T[b + 3] - T[b], T[b + 4] - T[b + 1], T[b + 5] - T[b + 2]];
        const e2 = [T[b + 6] - T[b], T[b + 7] - T[b + 1], T[b + 8] - T[b + 2]];
        const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
        const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
        if (Math.abs(det) < 1e-12) continue;
        const inv = 1 / det;
        const tv = [o[0] - T[b], o[1] - T[b + 1], o[2] - T[b + 2]];
        const u = (tv[0] * p[0] + tv[1] * p[1] + tv[2] * p[2]) * inv;
        if (u < 0 || u > 1) continue;
        const q = [tv[1] * e1[2] - tv[2] * e1[1], tv[2] * e1[0] - tv[0] * e1[2], tv[0] * e1[1] - tv[1] * e1[0]];
        const vv = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
        if (vv < 0 || u + vv > 1) continue;
        const tt = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
        if (tt >= 0 && tt <= maxT && tt < best) best = tt;
      }
    }
    return best;
  };
  const solids = layout.solids;
  const inside = (x: number, y: number, z: number, tol: number) =>
    solids.some(
      (s) =>
        Math.abs(x - s.x) <= s.w / 2 + tol &&
        Math.abs(z - s.z) <= s.d / 2 + tol &&
        y >= s.y - s.h / 2 - tol &&
        y <= s.y + s.h / 2 + tol,
    );
  const inOpen = (x: number, z: number) =>
    layout.open.some(([, x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  // Walkable floor height at (x, z): the highest solid top ≤ 1.3 m under the point (platforms,
  // stairs, low crates), else 0. Anything taller is not walkable from that point.
  const floorAt = (x: number, z: number) => {
    let f = 0;
    for (const s of solids)
      if (Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2) {
        const top = s.y + s.h / 2;
        if (top <= 1.3) f = Math.max(f, top);
        else return null;
      }
    return f;
  };
  // (a) coverage per solid
  const coverage: Record<string, { kind?: string; samples: number; covered: number }> = {};
  const isSolidAt = (x: number, y: number, z: number) => inside(x, y, z, -0.01);
  const faces: Array<[number[], number[][]]> = [];
  for (const s of solids) {
    const res = { kind: s.kind, samples: 0, covered: 0 };
    const x0 = s.x - s.w / 2,
      x1 = s.x + s.w / 2,
      y0 = s.y - s.h / 2,
      y1 = s.y + s.h / 2,
      z0 = s.z - s.d / 2,
      z1 = s.z + s.d / 2;
    const step = 0.25;
    const sample = (n: number[], pts: number[][]) => {
      for (const p of pts) {
        // Skip faces against other solids or outside the arena (not visible to anyone).
        const ox = p[0] + n[0] * 0.06,
          oy = p[1] + n[1] * 0.06,
          oz = p[2] + n[2] * 0.06;
        if (isSolidAt(ox, oy, oz) || Math.abs(ox) > 40 || Math.abs(oz) > 40 || oy > 8.05) continue;
        if (!inOpen(ox, oz) && oy < 8) continue;
        res.samples++;
        const o = [p[0] + n[0] * 0.3, p[1] + n[1] * 0.3, p[2] + n[2] * 0.3];
        const hit = ray(o, [-n[0], -n[1], -n[2]], 0.75);
        if (hit <= 0.75) res.covered++;
      }
    };
    const grid2 = (a0: number, a1: number, b0: number, b1: number) => {
      const out: number[][] = [];
      const na = Math.max(1, Math.round((a1 - a0) / step)),
        nb = Math.max(1, Math.round((b1 - b0) / step));
      for (let i = 0; i < na; i++)
        for (let j = 0; j < nb; j++) out.push([a0 + ((i + 0.5) * (a1 - a0)) / na, b0 + ((j + 0.5) * (b1 - b0)) / nb]);
      return out;
    };
    const hmax = Math.min(y1, 7.9);
    sample([1, 0, 0], grid2(z0, z1, y0, hmax).map(([z, y]) => [x1, y, z]));
    sample([-1, 0, 0], grid2(z0, z1, y0, hmax).map(([z, y]) => [x0, y, z]));
    sample([0, 0, 1], grid2(x0, x1, y0, hmax).map(([x, y]) => [x, y, z1]));
    sample([0, 0, -1], grid2(x0, x1, y0, hmax).map(([x, y]) => [x, y, z0]));
    if (y1 < 8) sample([0, 1, 0], grid2(x0, x1, z0, z1).map(([x, z]) => [x, y1, z]));
    coverage[s.id] = res;
  }
  void faces;
  // (b) intrusion: sample every triangle (≤ 0.2 m spacing) and test walkable space.
  const intrusions: Record<string, number> = {};
  const examples: number[][] = [];
  let tested = 0;
  for (let t = 0; t < ntri; t++) {
    const b = t * 9;
    const A = [T[b], T[b + 1], T[b + 2]],
      Bv = [T[b + 3], T[b + 4], T[b + 5]],
      Cv = [T[b + 6], T[b + 7], T[b + 8]];
    const ymin = Math.min(A[1], Bv[1], Cv[1]);
    if (ymin > 3.3) continue; // above every standing player (floor ≤ 1.2 m + 2.0 m)
    const xs = [A[0], Bv[0], Cv[0]],
      zs = [A[2], Bv[2], Cv[2]];
    if (Math.max(...xs) < -40 || Math.min(...xs) > 40 || Math.max(...zs) < -40 || Math.min(...zs) > 40) continue;
    const len = Math.max(
      Math.hypot(Bv[0] - A[0], Bv[1] - A[1], Bv[2] - A[2]),
      Math.hypot(Cv[0] - A[0], Cv[1] - A[1], Cv[2] - A[2]),
      Math.hypot(Cv[0] - Bv[0], Cv[1] - Bv[1], Cv[2] - Bv[2]),
    );
    const n = Math.min(40, Math.max(1, Math.ceil(len / 0.2)));
    for (let i = 0; i <= n; i++)
      for (let j = 0; j <= n - i; j++) {
        const a = i / n,
          c = j / n;
        const p = [
          A[0] + (Bv[0] - A[0]) * a + (Cv[0] - A[0]) * c,
          A[1] + (Bv[1] - A[1]) * a + (Cv[1] - A[1]) * c,
          A[2] + (Bv[2] - A[2]) * a + (Cv[2] - A[2]) * c,
        ];
        tested++;
        if (Math.abs(p[0]) > 40 || Math.abs(p[2]) > 40) continue;
        if (!inOpen(p[0], p[2])) continue;
        if (inside(p[0], p[1], p[2], 0.05)) continue;
        const f = floorAt(p[0], p[2]);
        if (f === null) continue;
        if (p[1] > f + 0.05 && p[1] < f + 2.0) {
          const key = `${Math.round(p[0])},${Math.round(p[2])}`;
          intrusions[key] = (intrusions[key] ?? 0) + 1;
          if (examples.length < 40) examples.push(p.map((x) => Math.round(x * 100) / 100));
        }
      }
  }
  return { triangles: ntri, tested, coverage, intrusions, examples };
};
