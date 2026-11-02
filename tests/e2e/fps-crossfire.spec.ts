import { test, expect } from "@playwright/test";
import fs from "node:fs";

/**
 * CROSSFIRE in a real browser renderer, through the shared map registry (getMap("crossfire")):
 *
 * 1. The shipped GLB (meshopt + GPU instancing, as the game loads it): no coplanar same-facing
 *    overlaps (z-fighting), every gameplay box's rendered surface sits on its collision face
 *    (no invisible walls, no visual-only cover) — including the Mi-8 wreck's fitted hull —
 *    culling sections and draw statistics.
 * 2. Map switching (Dustfront ↔ CROSSFIRE) in one page leaves no residue.
 * 3. Its loading art resolves and decodes at full size.
 * 4. Visual captures (skipped unless CAPTURE_DIR is set) with the game's light rig and
 *    CROSSFIRE's presentation values.
 */
const out = process.env["CAPTURE_DIR"];

async function open(page: import("@playwright/test").Page) {
  await page.route("**/__crossfire__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><body style='margin:0;background:#222'></body>",
    }),
  );
  await page.goto("/__crossfire__");
}

test("CROSSFIRE GLB has no coplanar overlaps and its surfaces sit on the collision faces", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  await open(page);
  const result = await page.evaluate(async () => {
    const THREE: typeof import("three") = await import("/tests/fixtures/three.ts" as string);
    const { GLTFLoader } = await import(
      "/node_modules/three/examples/jsm/loaders/GLTFLoader.js" as string
    );
    const { MeshoptDecoder } = await import(
      "/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js" as string
    );
    const { getMap } = await import("/src/lib/fps/maps/registry.ts" as string);
    const M = getMap("crossfire");
    const BOXES = M.boxes,
      ARENA = M.arena;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(M.presentation.modelUrl);
    const map = gltf.scene;
    map.updateMatrixWorld(true);
    const sections = map.children.map((c: import("three").Object3D) => c.name);
    let instanced = 0,
      instances = 0,
      drawables = 0;
    map.traverse((o: import("three").Object3D) => {
      if (o instanceof THREE.InstancedMesh) {
        instanced++;
        instances += o.count;
      }
      if (o instanceof THREE.Mesh) drawables++;
    });
    const meshes: import("three").Mesh[] = [];
    map.traverse((o: import("three").Object3D) => {
      if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh)) meshes.push(o);
    });
    // Coplanar same-facing overlap scan (plane buckets, then 2D separating-axis test).
    type Tri = { p: number[][]; mesh: string };
    const planes = new Map<string, Tri[]>();
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      n = new THREE.Vector3();
    let triangles = 0;
    for (const mesh of meshes) {
      const g = mesh.geometry,
        pos = g.getAttribute("position"),
        index = g.getIndex();
      const count = index ? index.count : pos.count;
      for (let i = 0; i < count; i += 3) {
        const ia = index ? index.getX(i) : i,
          ib = index ? index.getX(i + 1) : i + 1,
          ic = index ? index.getX(i + 2) : i + 2;
        a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
        n.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
        if (n.length() < 1e-9) continue;
        n.normalize();
        triangles++;
        // Quantized positions round to ~1 mm, so bucket planes at 2 mm.
        const key =
          [n.x, n.y, n.z].map((v) => Math.round(v * 200)).join(",") +
          "|" +
          Math.round(n.dot(a) * 500);
        const list = planes.get(key) ?? [];
        list.push({ p: [a.toArray(), b.toArray(), c.toArray()], mesh: mesh.name });
        planes.set(key, list);
      }
    }
    const project = (t: Tri, axis: number) => t.p.map((v) => v.filter((_, i) => i !== axis));
    const separated = (s: number[][], t: number[][]) => {
      for (const tri of [s, t])
        for (let i = 0; i < 3; i++) {
          const p = tri[i]!,
            q = tri[(i + 1) % 3]!;
          const ax = [p[1]! - q[1]!, q[0]! - p[0]!];
          const len = Math.hypot(ax[0]!, ax[1]!);
          if (len < 1e-12) continue;
          const proj = (u: number[][]) => u.map((v) => (v[0]! * ax[0]! + v[1]! * ax[1]!) / len);
          const ps = proj(s),
            pt = proj(t);
          if (
            Math.max(...ps) <= Math.min(...pt) + 2e-3 ||
            Math.max(...pt) <= Math.min(...ps) + 2e-3
          )
            return true;
        }
      return false;
    };
    const overlaps: string[] = [];
    for (const [key, list] of planes) {
      if (list.length < 2 || list.length > 4000) continue;
      const normal = key.split("|")[0]!.split(",").map(Number);
      const mags = normal.map(Math.abs);
      const axis = mags.indexOf(Math.max(...mags));
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++)
          if (!separated(project(list[i]!, axis), project(list[j]!, axis)))
            overlaps.push(
              `${list[i]!.mesh} / ${list[j]!.mesh} @ ${JSON.stringify(list[i]!.p.map((v) => v.map((c) => +c.toFixed(3))))} ${JSON.stringify(list[j]!.p.map((v) => v.map((c) => +c.toFixed(3))))}`,
            );
    }
    // Visual/collision agreement: rays toward each free face of every gameplay box at 1.0 m.
    const raycaster = new THREE.Raycaster();
    const misses: string[] = [];
    let probes = 0;
    // Free-standing probe point: outside every box (player radius), inside the arena.
    const isMovementBlocked = (x: number, _y: number, z: number) =>
      BOXES.some(
        (b: { x: number; z: number; w: number; d: number; y: number; h: number }) =>
          b.y - b.h / 2 < 1.8 &&
          Math.abs(x - b.x) < b.w / 2 + 0.35 &&
          Math.abs(z - b.z) < b.d / 2 + 0.35,
      );
    type B = { id: string; x: number; z: number; w: number; d: number; y: number; h: number };
    // A face shared with a touching box at the probe point is internal (the wreck's fitted slabs).
    const covered = (b: B, nx: number, nz: number, y: number) => {
      const px = b.x + (nx * b.w) / 2,
        pz = b.z + (nz * b.d) / 2;
      return BOXES.some(
        (o: B) =>
          o !== b &&
          o.y - o.h / 2 <= y &&
          y <= o.y + o.h / 2 &&
          (nx
            ? Math.abs(o.x - (nx * o.w) / 2 - px) < 1e-3 && Math.abs(pz - o.z) <= o.d / 2
            : Math.abs(o.z - (nz * o.d) / 2 - pz) < 1e-3 && Math.abs(px - o.x) <= o.w / 2),
      );
    };
    // The wreck's nose, rear and boom pieces are rounded; their boxes are fitted slab by slab
    // (art/blender/crossfire/fit_heli.py: no hull vertex more than 6 cm outside, and the face
    // centres as close as the curvature allows). Face-centre probes on them may sit up to 25 cm
    // inside the hull curve; they must still never show visual-only cover (offset <= 6.5 cm).
    const fitted = /^heli-(nose|rear|tail)-/;
    const curved: number[] = [];
    for (const box of BOXES) {
      const top = box.y + box.h / 2;
      const y = Math.min(1.0, top - 0.15);
      if (y < 0.2 || box.y - box.h / 2 > y) continue;
      for (const [nx, nz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const half = nx ? box.w / 2 : box.d / 2;
        const ox = box.x + nx * (half + 0.6),
          oz = box.z + nz * (half + 0.6);
        if (Math.abs(ox) > ARENA.width / 2 || Math.abs(oz) > ARENA.depth / 2) continue;
        if (isMovementBlocked(ox, 0, oz) || covered(box, nx, nz, y)) continue;
        raycaster.set(new THREE.Vector3(ox, y, oz), new THREE.Vector3(-nx, 0, -nz));
        raycaster.far = 1.0;
        const hit = raycaster.intersectObjects(meshes, false)[0];
        probes++;
        const offset = hit ? 0.6 - hit.distance : Infinity;
        const curvedBox = fitted.test(box.id);
        if (curvedBox) curved.push(offset);
        const ok = curvedBox ? offset >= -0.25 && offset <= 0.065 : Math.abs(offset) <= 0.065;
        if (!ok) misses.push(`${box.id} ${nx},${nz} offset ${offset}`);
      }
    }
    curved.sort((p, q) => p - q);
    return {
      loaded: true,
      curved: { probes: curved.length, worst: curved[0], median: curved[curved.length >> 1] },
      sections,
      drawables,
      instanced,
      instances,
      meshes: meshes.length,
      triangles,
      overlaps,
      probes,
      misses,
    };
  });
  await info.attach("crossfire-surface-depth", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  if (out) fs.writeFileSync(`${out}/surface-depth.json`, JSON.stringify(result, null, 1));
  expect(result.loaded).toBe(true);
  expect(result.overlaps).toEqual([]);
  expect(result.probes).toBeGreaterThan(100);
  expect(result.misses).toEqual([]);
  expect(result.instanced).toBeGreaterThan(0);
  expect(result.sections.filter((s: string) => s.startsWith("section-")).length).toBeGreaterThan(8);
});

test("switching maps (Dustfront ↔ CROSSFIRE) in one page leaves no residue", async ({
  page,
}, info) => {
  test.setTimeout(900_000);
  await open(page);
  const glbRequests: Record<string, number> = {};
  page.on("request", (r) => {
    const m = /\/fps\/models\/(aim-arena|crossfire)\.glb/.exec(r.url());
    if (m) glbRequests[m[1]!] = (glbRequests[m[1]!] ?? 0) + 1;
  });
  const sequence = ["dustfront", "crossfire", "dustfront", "crossfire", "dustfront"];
  const rows = await page.evaluate(async (sequence) => {
    const { mountArena } = await import("/src/lib/fps/renderer.ts" as string);
    const out: Record<string, unknown>[] = [];
    for (const mapId of sequence) {
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0";
      document.body.appendChild(host);
      const controls = mountArena(
        host,
        () => {},
        () => {},
        undefined,
        undefined,
        { mapId },
      );
      await new Promise<void>((resolve) => {
        const check = () =>
          host.querySelector("canvas")?.dataset["authoredModels"]
            ? resolve()
            : setTimeout(check, 20);
        check();
      });
      for (let f = 0; f < 3; f++) await new Promise((r) => requestAnimationFrame(r));
      const d = controls.diagnostics();
      controls.dispose();
      host.remove();
      out.push({
        mapId,
        calls: d.calls,
        geometries: d.geometries,
        textures: d.textures,
        programs: d.programs,
        canvasesLeft: document.querySelectorAll("canvas").length,
      });
    }
    return out;
  }, sequence);
  await info.attach("crossfire-map-switching", {
    body: JSON.stringify({ rows, glbRequests }, null, 2),
    contentType: "application/json",
  });
  const of = (id: string) => rows.filter((r) => r["mapId"] === id);
  const counts = (r: Record<string, unknown>) => [r["geometries"], r["textures"], r["programs"]];
  // Each map mounts identically every time; Dustfront after CROSSFIRE equals Dustfront before.
  for (const id of ["dustfront", "crossfire"])
    for (const r of of(id)) expect(counts(r), id).toEqual(counts(of(id)[0]!));
  // CROSSFIRE carries its own scene; Dustfront never inherits any of it.
  expect(of("crossfire")[0]!["geometries"]).not.toBe(of("dustfront")[0]!["geometries"]);
  for (const r of rows) expect(r["canvasesLeft"]).toBe(0);
  // The shared GLB cache released each map on dispose: every mount loaded its model again.
  expect(glbRequests["crossfire"]).toBe(2);
  expect(glbRequests["aim-arena"]).toBe(3);
});

test("CROSSFIRE loading art resolves and decodes at full size; Dustfront keeps its art", async ({
  page,
}) => {
  await open(page);
  const result = await page.evaluate(async () => {
    const { loadingImageFor, DEFAULT_LOADING_IMAGE } = await import(
      "/src/lib/fps/maps/loading-screens.ts" as string
    );
    const decode = async (src: string) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return { src, w: img.naturalWidth, h: img.naturalHeight };
    };
    return {
      cross: await decode(loadingImageFor("crossfire")),
      dust: await decode(loadingImageFor("dustfront")),
      unknown: loadingImageFor("not-a-map"),
      fallback: DEFAULT_LOADING_IMAGE,
    };
  });
  expect(result.cross.src).toMatch(/crossfire-loading/);
  expect([result.cross.w, result.cross.h]).toEqual([1671, 941]);
  expect(result.dust.src).toMatch(/arena-loading/);
  expect([result.dust.w, result.dust.h]).toEqual([1672, 941]);
  expect(result.unknown).toBe(result.fallback);
});

// [x, y, z, yaw (radians, 0 = looking toward -z), pitch]
const VIEWS: Record<string, [number, number, number, number, number]> = {
  overhead: [0, 44, 30, 0, -0.95],
  spawnA: [-21.6, 1.6, 6.5, -Math.PI / 2, -0.02],
  spawnB: [21.6, 1.6, -6.5, Math.PI / 2, -0.02],
  squareWest: [-10.5, 1.6, -6.0, -Math.PI / 2 - 0.45, -0.04],
  squareEast: [10.5, 1.6, 6.0, Math.PI / 2 - 0.45, -0.04],
  heliDoor: [2.4, 1.6, -5.2, Math.PI, -0.08],
  heliCabin: [-2.6, 1.6, -0.6, -Math.PI / 2, -0.05],
  marketAlley: [-12.8, 1.6, 13.6, -Math.PI / 2, 0.03],
  constructionPassage: [12.8, 1.6, -13.6, Math.PI / 2, 0.03],
  residential: [-22.6, 1.6, -7.6, -2.4, -0.03],
  terminal: [22.6, 1.6, 7.6, 0.74, -0.03],
  terraceA: [-15.5, 4.6, -12.0, -2.3, -0.12],
  terraceB: [15.5, 4.6, 12.0, 0.84, -0.12],
  wreckLow: [7.5, 1.0, -3.5, -Math.PI / 2 + 0.55, 0.06],
};

test("CROSSFIRE visual captures with the game's light rig", async ({ page }) => {
  test.skip(!out, "captures only run with CAPTURE_DIR");
  test.setTimeout(900_000);
  await open(page);
  await page.evaluate(async () => {
    const T = await import("/tests/fixtures/three.ts" as string);
    const { getMap } = await import("/src/lib/fps/maps/registry.ts" as string);
    const { createMapEnvironment } = await import("/src/lib/fps/maps/environments.ts" as string);
    const M = getMap("crossfire");
    const Lt = M.presentation.lighting,
      Sh = M.presentation.shadow;
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(1280, 720);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = Lt.exposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = T.PCFShadowMap;
    document.body.replaceChildren(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color(Lt.background);
    scene.fog = new T.Fog(Lt.fog.color, Lt.fog.near, Lt.fog.far);
    scene.add(
      new T.HemisphereLight(Lt.hemisphere.sky, Lt.hemisphere.ground, Lt.hemisphere.intensity),
    );
    const sun = new T.DirectionalLight(Lt.sun.color, Lt.sun.intensity);
    sun.position.set(...Lt.sun.position);
    sun.castShadow = true;
    sun.shadow.mapSize.set(Sh.mapSize, Sh.mapSize);
    Object.assign(sun.shadow.camera, {
      near: 1,
      far: Sh.far,
      left: -Sh.extent,
      right: Sh.extent,
      top: Sh.extent,
      bottom: -Sh.extent,
    });
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
    const environment = createMapEnvironment(scene, M);
    await environment.ready;
    const camera = new T.PerspectiveCamera(70, 1280 / 720, 0.06, M.presentation.viewDistance);
    camera.rotation.order = "YXZ";
    scene.updateMatrixWorld(true);
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(scene, 0.04, 0.1, 100).texture;
    scene.environmentIntensity = Lt.environmentIntensity;
    renderer.shadowMap.needsUpdate = true;
    Reflect.set(window, "cross", { renderer, scene, camera });
  });
  const views = (process.env["CAPTURE_VIEWS"] ?? Object.keys(VIEWS).join(",")).split(",");
  const stats: Record<string, unknown> = {};
  for (const name of views) {
    const view = VIEWS[name];
    if (!view) continue;
    stats[name] = await page.evaluate((v) => {
      const { renderer, scene, camera } = Reflect.get(window, "cross");
      camera.position.set(v[0], v[1], v[2]);
      camera.rotation.set(v[4], v[3], 0);
      camera.updateMatrixWorld(true);
      renderer.render(scene, camera);
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        programs: renderer.info.programs?.length ?? 0,
        textures: renderer.info.memory.textures,
        geometries: renderer.info.memory.geometries,
      };
    }, view);
    await page.screenshot({ path: `${out}/${name}.png` });
  }
  fs.writeFileSync(`${out}/stats.json`, JSON.stringify(stats, null, 1));
});
