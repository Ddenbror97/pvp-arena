import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("nearby approaching enemies keep moving between 20 Hz snapshots", async ({ page }, info) => {
  await fixture(page, "A", 5, 0, 50);
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    Object.assign(f.state.players.A, { x: 9, y: 0, z: 12, yaw: 0, pitch: 0 });
    Object.assign(f.state.players.B, { x: 9, y: 0, z: 5, yaw: Math.PI, pitch: 0 });
    f.state.round++;
    f.resetView();
    let seq = 0;
    Reflect.set(window, "fpsTestOpponent", (state: typeof f.state) => ({
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: ++seq,
      forward: state.players.B.z < 10.7 ? 1 : 0,
      strafe: 0,
      yaw: Math.PI,
      pitch: 0,
      fire: false,
      reload: false,
      weapon: "rifle",
      jump: false,
      sprint: false,
    }));
  });
  const rows = await page.evaluate(async () => {
    const f = Reflect.get(window, "fpsPolishTest");
    const rows: Array<{ at: number; z: number; serverZ: number; frameMs: number }> = [];
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const frame = () => {
        const d = f.controls.diagnostics();
        if (d.opponentPosition)
          rows.push({
            at: performance.now() - start,
            z: d.opponentPosition[2],
            serverZ: f.state.players.B.z,
            frameMs: d.frameMs,
          });
        if (performance.now() - start < 1800) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    return rows;
  });
  const near = rows.filter((row) => row.at > 250 && row.z > 9 && row.serverZ < 10.5);
  expect(near.length).toBeGreaterThan(5);
  let stalls = 0;
  for (let i = 1; i < near.length; i++) {
    const delta = near[i]!.z - near[i - 1]!.z;
    expect(delta).toBeGreaterThanOrEqual(-0.00001);
    if (delta < 0.00001) stalls++;
  }
  expect(stalls).toBeLessThanOrEqual(1);
  await info.attach("close-opponent-trace", {
    body: JSON.stringify({ rows, stalls }),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("nearby-opponent.png") });
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("crosshair stays on the aim ray and the AK bore converges at ten metres", async ({
  page,
}, info) => {
  await fixture(page);
  const crosshair = await page.locator(".duel-crosshair").boundingBox();
  const canvas = await page.locator("canvas").boundingBox();
  expect(
    Math.abs(crosshair!.x + crosshair!.width / 2 - canvas!.x - canvas!.width / 2),
  ).toBeLessThan(0.6);
  expect(
    Math.abs(crosshair!.y + crosshair!.height / 2 - canvas!.y - canvas!.height / 2),
  ).toBeLessThan(0.6);
  const result = await page.evaluate(async () => {
    const T = await import("/node_modules/three/build/three.module.js" as string);
    const { createAuthoredViewmodel } = await import(
      "/src/lib/fps/authored-viewmodel.ts" as string
    );
    const { VIEWMODEL_REST: r } = await import("/src/lib/fps/renderer.ts" as string);
    const parent = new T.Group();
    parent.position.set(r.x, r.y, r.z);
    parent.rotation.set(r.pitch, r.yaw, r.roll);
    const model = createAuthoredViewmodel(parent);
    await model.ready;
    model.update(true, 0, 0);
    parent.updateWorldMatrix(true, true);
    const origin = parent.localToWorld(model.muzzle().clone());
    const direction = new T.Vector3(0, 0, -1).transformDirection(parent.matrixWorld);
    const convergence = origin.clone().addScaledVector(direction, (-10 - origin.z) / direction.z);
    const camera = new T.PerspectiveCamera(60, 1280 / 800, 0.03, 20);
    const projected = convergence.clone().project(camera);
    const result = {
      convergence: convergence.toArray(),
      pixels: [projected.x * 640, projected.y * 400],
    };
    model.dispose();
    return result;
  });
  expect(Math.abs(result.pixels[0])).toBeLessThan(1);
  expect(Math.abs(result.pixels[1])).toBeLessThan(1);
  await info.attach("bore-alignment", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
