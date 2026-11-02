import { test, expect } from "@playwright/test";
import fs from "node:fs";

/**
 * FROSTLINE in a real browser renderer, through the shared map registry (getMap("frostline")) and
 * its environment factory (maps/environments.ts):
 *
 * 1. The shipped GLB (meshopt + GPU instancing, as the game loads it): no coplanar same-facing
 *    overlaps (z-fighting), every gameplay box's rendered surface sits on its collision face
 *    (no invisible walls, no visual-only cover), culling sections and draw statistics.
 * 2. The FROSTLINE environment factory: shared loader (blockout → GLB, sky dome) plus the bounded
 *    GPU snowfall, which stays out of the PMREM capture and the shadow map, and disposes cleanly.
 * 3. Visual captures (skipped unless CAPTURE_DIR is set) with the game's light rig: hemisphere,
 *    one shadowing sun into a static shadow map rendered once, one PMREM reflection capture,
 *    FROSTLINE's presentation values; snowfall drawn only with CAPTURE_SNOW=1.
 */
const out = process.env["CAPTURE_DIR"];

async function open(page: import("@playwright/test").Page) {
  await page.route("**/__frostline__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<!doctype html><body style='margin:0;background:#222'></body>",
    }),
  );
  await page.goto("/__frostline__");
}

test("FROSTLINE GLB has no coplanar overlaps and its surfaces sit on the collision faces", async ({
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
    const M = getMap("frostline");
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
        if (isMovementBlocked(ox, 0, oz)) continue;
        raycaster.set(new THREE.Vector3(ox, y, oz), new THREE.Vector3(-nx, 0, -nz));
        raycaster.far = 0.8;
        const hit = raycaster.intersectObjects(meshes, false)[0];
        probes++;
        const offset = hit ? 0.6 - hit.distance : Infinity;
        if (!(Math.abs(offset) <= 0.065)) misses.push(`${box.id} ${nx},${nz} offset ${offset}`);
      }
    }
    return {
      loaded: true,
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
  await info.attach("frostline-surface-depth", {
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

test("FROSTLINE environment factory adds bounded snowfall outside the reflection and shadow passes", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  await open(page);
  const result = await page.evaluate(async () => {
    const T: typeof import("three") = await import("/tests/fixtures/three.ts" as string);
    const { getMap } = await import("/src/lib/fps/maps/registry.ts" as string);
    const { createMapEnvironment } = await import("/src/lib/fps/maps/environments.ts" as string);
    const { SNOW_FLAKES } = await import("/src/lib/fps/snowfall.ts" as string);
    const renderer = new T.WebGLRenderer();
    renderer.setSize(640, 360);
    renderer.shadowMap.enabled = true;
    document.body.replaceChildren(renderer.domElement);
    const scene = new T.Scene();
    const sun = new T.DirectionalLight(0xffffff, 2);
    sun.castShadow = true;
    scene.add(sun, new T.HemisphereLight(0xffffff, 0x888888, 1));
    const counts = (map: import("three").Object3D) => {
      let n = 0;
      map.traverse(() => n++);
      return n;
    };
    const before = counts(scene);
    const dustEnv = createMapEnvironment(scene, getMap("dustfront"));
    const dustHasSnow = !!scene.getObjectByName("snowfall");
    dustEnv.dispose();
    const env = createMapEnvironment(scene, getMap("frostline"));
    await env.ready;
    const snow = scene.getObjectByName("snowfall") as import("three").Points;
    const material = snow.material as import("three").ShaderMaterial;
    const disposed = { geometry: false, material: false };
    snow.geometry.addEventListener("dispose", () => (disposed.geometry = true));
    material.addEventListener("dispose", () => (disposed.material = true));
    const camera = new T.PerspectiveCamera(70, 640 / 360, 0.06, 260);
    camera.position.set(-10, 1.6, -1);
    camera.rotation.set(0, -Math.PI / 2, 0, "YXZ");
    camera.updateMatrixWorld(true);
    renderer.render(scene, camera);
    const visibleInMain = material.uniforms["visible"]!.value;
    const eye = material.uniforms["eye"]!.value.toArray();
    // The PMREM capture renders with square 90° cube cameras: the snowfall must draw nothing there.
    const pmrem = new T.PMREMGenerator(renderer);
    pmrem.fromScene(scene, 0.04, 0.1, 100);
    const visibleInCapture = material.uniforms["visible"]!.value;
    renderer.render(scene, camera);
    const result = {
      dustHasSnow,
      pool: (snow.geometry.getAttribute("position") as import("three").BufferAttribute).count,
      SNOW_FLAKES,
      castShadow: snow.castShadow,
      layer0Only: snow.layers.mask === 1,
      depthWrite: material.depthWrite,
      visibleInMain,
      visibleInCapture,
      visibleAfter: material.uniforms["visible"]!.value,
      eye,
      bounds: env.bounds,
    };
    env.dispose();
    pmrem.dispose();
    return {
      ...result,
      leftover: counts(scene) - before,
      snowAfterDispose: !!scene.getObjectByName("snowfall"),
      disposed,
    };
  });
  await info.attach("frostline-environment", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(result.dustHasSnow).toBe(false);
  expect(result.pool).toBe(result.SNOW_FLAKES);
  expect(result.castShadow).toBe(false);
  expect(result.layer0Only).toBe(true);
  expect(result.depthWrite).toBe(false);
  expect(result.visibleInMain).toBe(1);
  expect(result.visibleInCapture).toBe(0);
  expect(result.visibleAfter).toBe(1);
  expect(result.eye[0]).toBeCloseTo(-10);
  expect(result.bounds).toEqual({ width: 40, depth: 32 });
  expect(result.snowAfterDispose).toBe(false);
  expect(result.disposed).toEqual({ geometry: true, material: true });
  expect(result.leftover).toBe(0);
});

test("switching maps (Dustfront ↔ FROSTLINE) in one page leaves no residue", async ({
  page,
}, info) => {
  test.setTimeout(900_000);
  await open(page);
  const glbRequests: Record<string, number> = {};
  page.on("request", (r) => {
    const m = /\/fps\/models\/(aim-arena|frostline)\.glb/.exec(r.url());
    if (m) glbRequests[m[1]!] = (glbRequests[m[1]!] ?? 0) + 1;
  });
  const sequence = ["dustfront", "frostline", "dustfront", "frostline", "dustfront"];
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
  await info.attach("frostline-map-switching", {
    body: JSON.stringify({ rows, glbRequests }, null, 2),
    contentType: "application/json",
  });
  const of = (id: string) => rows.filter((r) => r["mapId"] === id);
  const counts = (r: Record<string, unknown>) => [r["geometries"], r["textures"], r["programs"]];
  // Each map mounts identically every time; Dustfront after FROSTLINE equals Dustfront before.
  for (const id of ["dustfront", "frostline"])
    for (const r of of(id)) expect(counts(r), id).toEqual(counts(of(id)[0]!));
  // FROSTLINE carries its own scene (and snowfall); Dustfront never inherits any of it.
  expect(of("frostline")[0]!["geometries"]).not.toBe(of("dustfront")[0]!["geometries"]);
  for (const r of rows) expect(r["canvasesLeft"]).toBe(0);
  // The shared GLB cache released each map on dispose: every mount loaded its model again.
  expect(glbRequests["frostline"]).toBe(2);
  expect(glbRequests["aim-arena"]).toBe(3);
});

test("FROSTLINE loading art resolves and decodes at full size; Dustfront keeps its art", async ({
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
      frost: await decode(loadingImageFor("frostline")),
      dust: await decode(loadingImageFor("dustfront")),
      unknown: loadingImageFor("not-a-map"),
      fallback: DEFAULT_LOADING_IMAGE,
    };
  });
  expect(result.frost.src).toMatch(/frostline-loading/);
  expect([result.frost.w, result.frost.h]).toEqual([1672, 941]);
  expect(result.dust.src).toMatch(/arena-loading/);
  expect([result.dust.w, result.dust.h]).toEqual([1672, 941]);
  expect(result.unknown).toBe(result.fallback);
});

// [x, y, z, yaw (radians, 0 = looking toward -z), pitch]
const VIEWS: Record<string, [number, number, number, number, number]> = {
  overhead: [0, 36, 24, 0, -1.0],
  spawnA: [-18.2, 1.6, 0, -Math.PI / 2, -0.03],
  spawnB: [18.2, 1.6, 0, Math.PI / 2, -0.03],
  exitNorthA: [-14.8, 1.6, -4.2, -Math.PI / 2 + 0.2, 0],
  courtyardWest: [-10.5, 1.6, -1.0, -Math.PI / 2, 0],
  courtyardEast: [10.5, 1.6, -1.0, Math.PI / 2, 0],
  courtyardSouthEast: [4.2, 1.6, 8.6, 0.25, 0.03],
  courtyardNorthEast: [4.0, 1.6, -8.6, Math.PI - 0.25, 0],
  walkway: [-3.8, 3.1, -12.7, Math.PI - 0.35, -0.12],
  upperCorridor: [-12.0, 1.6, -12.4, -Math.PI / 2, 0],
  loadingBay: [-6.0, 1.6, 12.2, -Math.PI / 2 - 0.4, 0],
  lowerRoute: [18.6, 1.6, 11.2, Math.PI / 2 - 0.2, 0],
  northWest: [-18.6, 1.6, -11.0, -0.6, 0.12],
  towerView: [6.0, 1.6, 0.5, -0.55, 0.12],
  laneWest: [-11.6, 1.6, -4.2, -Math.PI / 2, 0.02],
};

test("FROSTLINE visual captures with the game's light rig", async ({ page }) => {
  test.skip(!out, "captures only run with CAPTURE_DIR");
  test.setTimeout(900_000);
  await open(page);
  await page.evaluate(async (snow) => {
    const T = await import("/tests/fixtures/three.ts" as string);
    const { getMap } = await import("/src/lib/fps/maps/registry.ts" as string);
    const { createMapEnvironment } = await import("/src/lib/fps/maps/environments.ts" as string);
    const M = getMap("frostline");
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
    const snowfall = scene.getObjectByName("snowfall")!;
    snowfall.visible = snow;
    scene.updateMatrixWorld(true);
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(scene, 0.04, 0.1, 100).texture;
    scene.environmentIntensity = Lt.environmentIntensity;
    renderer.shadowMap.needsUpdate = true;
    Reflect.set(window, "frost", { renderer, scene, camera });
  }, !!process.env["CAPTURE_SNOW"]);
  const views = (process.env["CAPTURE_VIEWS"] ?? Object.keys(VIEWS).join(",")).split(",");
  const stats: Record<string, unknown> = {};
  for (const name of views) {
    const view = VIEWS[name];
    if (!view) continue;
    stats[name] = await page.evaluate((v) => {
      const { renderer, scene, camera } = Reflect.get(window, "frost");
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
