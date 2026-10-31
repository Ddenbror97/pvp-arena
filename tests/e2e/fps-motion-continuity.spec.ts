import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { fixture } from "./helpers/fps-fixture";

test("movement direction changes remain continuous under snapshot jitter", async ({
  page,
  browserName,
}, info) => {
  test.skip(browserName === "webkit", "Windows MiniBrowser cannot capture the pointer.");
  await fixture(page, "A", 5, 100);
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    Object.assign(f.state.players.A, { x: 9, z: 11, y: 0, yaw: 0, pitch: 0, velocityY: 0 });
    f.state.round++;
    f.resetView();
  });
  await page.locator("canvas").click();
  await expect
    .poll(() => page.evaluate(() => !!document.pointerLockElement && document.hasFocus()))
    .toBe(true);
  await page.waitForTimeout(500);
  const rows = await page.evaluate(async () => {
    const f = Reflect.get(window, "fpsPolishTest"),
      rows: number[][] = [];
    const key = (code: string, down: boolean) =>
      document.dispatchEvent(
        new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true }),
      );
    let phase = -1;
    const began = performance.now();
    await new Promise<void>((resolve) => {
      const sample = (now: number) => {
        const age = now - began,
          next = Math.floor(age / 600) % 4;
        if (next !== phase) {
          key("KeyW", next === 0);
          key("KeyS", next === 2);
          key("KeyA", next === 1);
          key("KeyD", next === 3);
          phase = next;
        }
        document.dispatchEvent(
          new MouseEvent("mousemove", { movementX: Math.sin(age / 200) * 3, movementY: 0 }),
        );
        const d = f.controls.diagnostics();
        rows.push([
          age,
          d.frameMs,
          d.cpuMs,
          ...d.camera,
          f.state.players.A.x,
          f.state.players.A.z,
          f.state.players.A.lastSeq,
          ...d.prediction,
          ...d.correction,
          d.pendingInputs,
          d.accumulator,
        ]);
        if (age < 6000) requestAnimationFrame(sample);
        else {
          for (const c of ["KeyW", "KeyS", "KeyA", "KeyD"]) key(c, false);
          resolve();
        }
      };
      requestAnimationFrame(sample);
    });
    return rows;
  });
  const speeds = rows
    .slice(1)
    .map(
      (r, i) =>
        Math.hypot(r[3]! - rows[i]![3]!, r[5]! - rows[i]![5]!) / Math.max(1, r[0]! - rows[i]![0]!),
    );
  const maxSpeed = Math.max(...speeds);
  fs.writeFileSync(
    info.outputPath("movement-trace.json"),
    JSON.stringify({ rows, maxSpeed }, null, 2),
  );
  console.log(
    JSON.stringify({
      browser: browserName,
      maxSpeed,
      maxFrameMs: Math.max(...rows.map((r) => r[1]!)),
    }),
  );
  expect(maxSpeed).toBeLessThan(0.011);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
