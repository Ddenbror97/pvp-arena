import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
import fs from "node:fs";
test.beforeEach(({ browserName }) => {
  test.skip(
    browserName === "webkit",
    "Windows MiniBrowser rejects pointer lock; native Safari needs macOS validation.",
  );
});
test("multiple full turns keep the camera and accepted movement heading aligned", async ({
  page,
}, info) => {
  await fixture(page, "A", 5, 100);
  await page.locator("canvas").click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement && document.hasFocus()))
    .toBe(true);
  await page.evaluate(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", bubbles: true }));
    for (let n = 0; n < 100; n++) {
      document.dispatchEvent(new MouseEvent("mousemove", { movementX: 80, movementY: 0 }));
      await new Promise(requestAnimationFrame);
    }
    document.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW", bubbles: true }));
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const f = Reflect.get(window, "fpsPolishTest"),
            yaw = f.controls.diagnostics().camera[3];
          return Math.abs(
            Math.atan2(
              Math.sin(yaw - f.state.players.A.yaw),
              Math.cos(yaw - f.state.players.A.yaw),
            ),
          );
        }),
      { timeout: 5000 },
    )
    .toBeLessThan(0.02);
  const sample = await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    const camera = f.controls.diagnostics().camera;
    return {
      camera,
      player: f.state.players.A,
      error: Math.abs(
        Math.atan2(
          Math.sin(camera[3] - f.state.players.A.yaw),
          Math.cos(camera[3] - f.state.players.A.yaw),
        ),
      ),
    };
  });
  fs.writeFileSync(info.outputPath("turn-alignment.json"), JSON.stringify(sample, null, 2));
  expect(sample.error).toBeLessThan(0.02);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
test("jumping and crouching retain a continuous camera timeline", async ({ page }, info) => {
  await fixture(page, "A", 5, 100);
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    Object.assign(f.state.players.A, { x: 9, z: 12, y: 0, yaw: 0, pitch: 0, velocityY: 0 });
    f.state.round++;
    f.resetView();
  });
  await page.locator("canvas").click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement && document.hasFocus()))
    .toBe(true);
  await page.waitForTimeout(400);
  const result = await page.evaluate(async () => {
    const f = Reflect.get(window, "fpsPolishTest"),
      rows: number[][] = [];
    const key = (code: string, down: boolean) =>
      document.dispatchEvent(
        new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
      );
    const began = performance.now();
    let phase = -1;
    key("KeyW", true);
    await new Promise<void>((resolve) => {
      const sample = () => {
        const age = performance.now() - began,
          next = Math.floor(age / 700);
        if (next !== phase) {
          key("ControlLeft", next % 2 === 1);
          if (next % 2 === 0) {
            key("Space", false);
            key("Space", true);
          }
          phase = next;
        }
        document.dispatchEvent(new MouseEvent("mousemove", { movementX: 2, movementY: 0 }));
        const d = f.controls.diagnostics();
        rows.push([
          age,
          d.frameMs,
          d.cpuMs,
          ...d.camera,
          f.state.players.A.y,
          Number(f.state.players.A.crouched),
        ]);
        if (age < 4200) requestAnimationFrame(sample);
        else {
          key("Space", false);
          key("ControlLeft", false);
          key("KeyW", false);
          resolve();
        }
      };
      requestAnimationFrame(sample);
    });
    return rows;
  });
  const jumps = result.slice(1).map((r, i) => Math.abs(r[4]! - result[i]![4]!));
  fs.writeFileSync(
    info.outputPath("vertical-trace.json"),
    JSON.stringify({ rows: result, maxCameraStep: Math.max(...jumps) }),
  );
  await info.attach("vertical-trace", {
    body: JSON.stringify({ rows: result, maxCameraStep: Math.max(...jumps) }),
    contentType: "application/json",
  });
  expect(result.some((r) => r[7]! > 0.1)).toBe(true);
  expect(result.some((r) => r[8] === 1)).toBe(true);
  const speed = result
    .slice(1)
    .map((r, i) => jumps[i]! / Math.max(1, r[1]!, r[0]! - result[i]![0]!));
  expect(Math.max(...speed)).toBeLessThan(0.014);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
