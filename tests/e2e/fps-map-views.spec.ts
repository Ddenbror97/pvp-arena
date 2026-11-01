import { test } from "@playwright/test";

/**
 * Map visual capture (skipped unless CAPTURE_DIR is set): the real arena environment module,
 * the game's world lights, static shadow map and reflection capture, rendered from named
 * cameras. Eye positions are at standing eye height (1.6 m; 3.1 m on the platforms).
 *
 *   CAPTURE_DIR=out CAPTURE_VIEWS=overhead,spawnA,spawnB npx playwright test fps-map-views
 */
const out = process.env["CAPTURE_DIR"];
test.skip(!out, "map capture only runs with CAPTURE_DIR");

// [x, y, z, yaw (radians, 0 = looking toward -z), pitch]
const VIEWS: Record<string, [number, number, number, number, number]> = {
  overhead: [0, 34, 21, 0, -1.0],
  overheadWest: [-14, 22, 14, 0.5, -0.95],
  overheadEast: [14, 22, 14, -0.5, -0.95],
  spawnA: [-18.2, 1.6, 0, -Math.PI / 2, -0.03],
  spawnB: [18.2, 1.6, 0, Math.PI / 2, -0.03],
  laneWest: [-11.5, 1.6, -0.6, -Math.PI / 2, -0.02],
  laneEast: [11.5, 1.6, -0.6, Math.PI / 2, -0.02],
  platformWest: [-14.2, 3.1, -8.4, -2.2, -0.12],
  platformEast: [14.2, 3.1, -8.4, 2.2, -0.12],
  upperRoute: [-17.5, 1.6, -12.5, -Math.PI / 2, 0],
  upperArch: [-8.3, 1.6, -12.8, Math.PI, 0],
  lowerRoute: [17.5, 1.6, 12.4, Math.PI / 2, 0],
  lowerGate: [8.3, 1.6, 12.8, 0, 0],
  courtyardSouth: [0, 1.6, 8.5, 0, 0.02],
  courtyardNorth: [0, 1.6, -8.5, Math.PI, 0.02],
  stairsWest: [-14.6, 1.6, 1.5, 0, 0.12],
};

test("map views", async ({ page }) => {
  test.setTimeout(900_000);
  await page.route("**/__fps_map__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body style='margin:0;background:#222'></body></html>",
    }),
  );
  await page.goto("/__fps_map__");
  await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js" as string);
    const { createArenaEnvironment } = await import("/src/lib/fps/arena-environment.ts" as string);
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(1);
    renderer.setSize(1280, 720);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = T.PCFShadowMap;
    document.body.replaceChildren(renderer.domElement);
    const scene = new T.Scene();
    // The game's world lighting (renderer.ts).
    scene.background = new T.Color(0xa9c3dc);
    scene.fog = new T.Fog(0xd9cdb6, 70, 260);
    scene.add(new T.HemisphereLight(0xc4d3ef, 0x353038, 1.35));
    const sun = new T.DirectionalLight(0xffefd8, 3.4);
    sun.position.set(21, 19, -24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      near: 1,
      far: 65,
      left: -26,
      right: 26,
      top: 26,
      bottom: -26,
    });
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
    const camera = new T.PerspectiveCamera(78, 1280 / 720, 0.06, 260);
    camera.rotation.order = "YXZ";
    const env = createArenaEnvironment(scene);
    await env.ready;
    scene.updateMatrixWorld(true);
    const pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(scene, 0.04, 0.1, 100).texture;
    scene.environmentIntensity = 0.45;
    renderer.shadowMap.needsUpdate = true;
    const info = { calls: 0, triangles: 0 };
    Reflect.set(window, "mapView", { T, renderer, scene, camera, info });
  });
  const views = (process.env["CAPTURE_VIEWS"] ?? "overhead,spawnA,spawnB").split(",");
  const stats: Record<string, unknown> = {};
  for (const name of views) {
    const view = VIEWS[name];
    if (!view) continue;
    stats[name] = await page.evaluate((v) => {
      const { renderer, scene, camera } = Reflect.get(window, "mapView");
      camera.position.set(v[0], v[1], v[2]);
      camera.rotation.set(v[4], v[3], 0);
      camera.updateMatrixWorld(true);
      renderer.render(scene, camera);
      return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    }, view);
    await page.screenshot({ path: `${out}/${name}.png` });
  }
  await page.evaluate(() => 0);
  const fs = await import("node:fs");
  fs.writeFileSync(`${out}/stats.json`, JSON.stringify(stats, null, 1));
});
