import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
test("confirmed head hit stains the nearby wall while the opponent moves away", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture(page);
  await page.locator("canvas").click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    Object.assign(f.state.players.A, { x: 9, z: -10, y: 0, yaw: 0, pitch: 0 });
    Object.assign(f.state.players.B, { x: 9, z: -14.5, y: 0, yaw: Math.PI, pitch: 0 });
    f.state.round++;
    f.resetView();
  });
  await expect
    .poll(() =>
      page.evaluate(() => Reflect.get(window, "fpsPolishTest").controls.diagnostics().camera[0]),
    )
    .toBe(9);
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "fpsPolishTest").inputs.at(-1)?.yaw))
    .toBe(0);
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.B.hp), {
      intervals: [10],
    })
    .toBe(50);
  await page.mouse.up();
  const hit = await page.evaluate(
    () => Reflect.get(window, "fpsPolishTest").eventLog.find((e: { hit?: unknown }) => e.hit)?.hit,
  );
  expect(hit.zone).toBe("head");
  expect(hit.damage).toBe(50);
  expect(hit.splatter).toBeTruthy();
  await page.evaluate(() =>
    Reflect.set(window, "fpsTestOpponent", () => ({
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: Date.now(),
      forward: 0,
      strafe: -1,
      yaw: Math.PI,
      pitch: 0,
      fire: false,
      reload: false,
      weapon: "rifle",
      jump: false,
      sprint: false,
    })),
  );
  await page.waitForTimeout(300);
  await page.evaluate(() => Reflect.set(window, "fpsTestOpponent", undefined));
  await page.screenshot({ path: "test-results/combat-blood-wall.png" });
  const timings = await page.evaluate(
    () =>
      new Promise<{ medianMs: number; p95Ms: number }>((resolve) => {
        const samples: number[] = [];
        let previous = performance.now();
        const tick = (now: number) => {
          samples.push(now - previous);
          previous = now;
          if (samples.length < 120) requestAnimationFrame(tick);
          else {
            samples.sort((a, b) => a - b);
            resolve({ medianMs: samples[60]!, p95Ms: samples[114]! });
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(timings.p95Ms).toBeLessThan(100);
  await info.attach("blood-render-frame-timing", {
    body: JSON.stringify(timings),
    contentType: "application/json",
  });
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
