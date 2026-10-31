import { test, expect } from "@playwright/test";
import type { Mesh } from "three";
import { fixture } from "./helpers/fps-fixture";

test("wall trim and container layers have distinct visible depth planes", async ({
  page,
}, info) => {
  await page.route("**/__surface_depth__", (r) =>
    r.fulfill({ contentType: "text/html", body: "<!doctype html><body></body>" }),
  );
  await page.goto("/__surface_depth__");
  const result = await page.evaluate(async () => {
    const threePath = "/node_modules/three/build/three.module.js",
      envPath = "/src/lib/fps/environment.ts",
      mapPath = "/src/lib/fps/map.ts";
    const THREE: typeof import("three") = await import(threePath),
      { createArenaEnvironment } = await import(envPath),
      { BOXES, WALLS } = await import(mapPath);
    const scene = new THREE.Scene(),
      branding = new THREE.MeshStandardMaterial(),
      env = createArenaEnvironment(scene, branding);
    scene.updateMatrixWorld(true);
    const meshes = scene.children.filter((m): m is Mesh => m instanceof THREE.Mesh),
      wallClearances: number[] = [],
      containerLayers: number[][] = [],
      capClearances: number[][] = [],
      skinClearances: number[] = [];
    const trim = scene.children.find(
      (m) => m instanceof THREE.InstancedMesh,
    ) as import("three").InstancedMesh;
    const matrix = new THREE.Matrix4();
    // Production batches architecture into static instance draws. Inspect
    // those actual transforms rather than the removed construction meshes.
    for (const batch of scene.children)
      if (batch instanceof THREE.InstancedMesh) {
        for (let i = 0; i < batch.count; i++) {
          batch.getMatrixAt(i, matrix);
          const mesh = new THREE.Mesh(batch.geometry, batch.material);
          matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
          meshes.push(mesh);
        }
      }
    for (let i = 0; i < trim.count; i++) {
      trim.getMatrixAt(i, matrix);
      const size = new THREE.Vector3(),
        position = new THREE.Vector3(),
        rotation = new THREE.Quaternion();
      matrix.decompose(position, rotation, size);
      if (Math.abs(size.x - 0.24) < 1e-5 && Math.abs(size.y - 6.4) < 1e-5) {
        const box = new THREE.Box3(
          new THREE.Vector3(-0.5, -0.5, -0.5),
          new THREE.Vector3(0.5, 0.5, 0.5),
        ).applyMatrix4(matrix);
        const side = Math.sign(position.x),
          near = side > 0 ? box.min.x : -box.max.x;
        const wall = WALLS.find((w: { id: string; x: number }) => w.id === `wall-x-${side}`)!;
        wallClearances.push(Math.abs(wall.x) - wall.w / 2 - near);
      }
    }
    for (const b of BOXES) {
      const body = scene.getObjectByName(b.id) as Mesh;
      const bounds = new THREE.Box3().setFromObject(body);
      skinClearances.push(b.y + b.h / 2 - bounds.max.y);
      for (const side of [-1, 1]) {
        const diagonals = meshes.filter(
          (m) =>
            Math.abs(m.rotation.z) > 0.1 &&
            Math.abs(m.scale.z - 0.018) < 1e-6 &&
            Math.abs(m.position.x - b.x) < 1e-5 &&
            Math.abs(m.position.y - b.y) < 1e-5 &&
            Math.abs(m.position.z - (b.z + (side * b.d) / 2)) < 0.05,
        );
        containerLayers.push(
          diagonals
            .map((m) => side * (m.position.z - b.z) + m.scale.z / 2 - b.d / 2)
            .sort((a, b) => a - b),
        );
      }
    }
    for (const side of [-1, 1]) {
      const wall = scene.getObjectByName(`wall-x-${side}`) as Mesh;
      const cap = meshes.find(
        (m) =>
          Math.abs(m.position.x - side * 13.988) < 1e-4 &&
          Math.abs(m.position.y - 6.25) < 1e-4 &&
          Math.abs(m.scale.y - 0.3) < 1e-4,
      )!;
      if (!cap) throw Error("Upper cap is missing");
      const wallBounds = new THREE.Box3().setFromObject(wall);
      const front = side * cap.position.x - cap.scale.x / 2;
      capClearances.push([6.1 - wallBounds.max.y, 12 - front, 11.988 - front]);
    }
    env.dispose();
    branding.dispose();
    return { wallClearances, containerLayers, skinClearances, capClearances };
  });
  expect(result.wallClearances.length).toBe(16);
  for (const gap of result.wallClearances) expect(gap).toBeGreaterThan(0.01);
  for (const layers of result.containerLayers) {
    expect(layers.length).toBe(2);
    expect(layers[0]!).toBeGreaterThan(0.018);
    expect(layers[1]! - layers[0]!).toBeGreaterThan(0.005);
  }
  for (const gap of result.skinClearances) expect(gap).toBeGreaterThan(0.009);
  expect(result.capClearances).toHaveLength(2);
  for (const [vertical, wall, rib] of result.capClearances) {
    expect(vertical!).toBeGreaterThan(-1e-5);
    expect(wall!).toBeGreaterThan(0.023);
    expect(rib!).toBeGreaterThan(0.011);
  }
  await info.attach("surface-depth", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
});

test("inspect the wall and container while returning to the same camera pose", async ({
  page,
}, info) => {
  await fixture(page);
  for (const view of [
    { name: "container", x: 5, z: 5.5, yaw: 0 },
    { name: "wall", x: 9, z: 2, yaw: -Math.PI / 2 },
    { name: "wall-top", x: 6, z: 4, yaw: -Math.PI / 2, pitch: 0.55 },
  ]) {
    await page.evaluate((view) => {
      const f = Reflect.get(window, "fpsPolishTest");
      Object.assign(f.state.players.A, {
        x: view.x,
        z: view.z,
        yaw: view.yaw,
        pitch: view.pitch ?? 0,
      });
      f.state.round++;
      f.resetView();
    }, view);
    await page.waitForTimeout(150);
    await page.screenshot({ path: info.outputPath(`${view.name}.png`) });
  }
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
