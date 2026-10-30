import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fixture } from "./helpers/fps-fixture";

test("industrial arena renders from both spawns with no WebGL startup errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const seat of ["A", "B"] as const) {
    await fixture(page, seat);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/fps-aim-map-${seat}.png` });
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
  }
  expect(errors).toEqual([]);
});

test("actual Ctrl input changes authoritative crouch and restores standing", async ({ page }) => {
  await fixture(page);
  await page.locator("canvas").click();
  await page.keyboard.down("ControlLeft");
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.crouched))
    .toBe(true);
  await page.screenshot({ path: "test-results/fps-aim-map-crouched.png" });
  await page.keyboard.up("ControlLeft");
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.crouched))
    .toBe(false);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("records local arena frame timing without stalls", async ({ page }, info) => {
  await fixture(page);
  await page.waitForTimeout(300);
  const timings = await page.evaluate(
    () =>
      new Promise<{ medianMs: number; p95Ms: number }>((resolve) => {
        const samples: number[] = [];
        let previous = performance.now();
        const sample = (now: number) => {
          samples.push(now - previous);
          previous = now;
          if (samples.length < 120) requestAnimationFrame(sample);
          else {
            samples.sort((a, b) => a - b);
            resolve({ medianMs: samples[60]!, p95Ms: samples[114]! });
          }
        };
        requestAnimationFrame(sample);
      }),
  );
  await info.attach("local-frame-timing", {
    body: JSON.stringify(timings),
    contentType: "application/json",
  });
  await writeFile("test-results/fps-frame-timing.json", JSON.stringify(timings, null, 2));
  expect(timings.p95Ms).toBeLessThan(100);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("held fire produces authoritative impacts on each material and the ground", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const cases = [
    { name: "concrete", x: 0, z: 13, pitch: 0, surface: "concrete", id: "blast-wall-1" },
    { name: "metal", x: 5, z: 4.5, pitch: 0, surface: "metal", id: "container-1" },
    { name: "wood", x: 7, z: 11, pitch: -0.25, surface: "wood", id: "crate-1-1" },
    { name: "ground", x: 9, z: 13, pitch: -0.7, surface: "concrete", id: "floor" },
  ];
  for (const pose of cases) {
    await fixture(page);
    await page.evaluate((pose) => {
      const f = Reflect.get(window, "fpsPolishTest");
      Object.assign(f.state.players.A, { x: pose.x, z: pose.z, pitch: pose.pitch, yaw: 0 });
      f.state.round++;
      f.resetView();
    }, pose);
    await page.waitForTimeout(100);
    await page.locator("canvas").click();
    await page.mouse.down();
    await expect
      .poll(() =>
        page.evaluate(
          (id) =>
            Reflect.get(window, "fpsPolishTest").eventLog.some(
              (e: { type: string; impact?: { solidId: string } }) =>
                e.type === "impact" && e.impact?.solidId === id,
            ),
          pose.id,
        ),
      )
      .toBe(true);
    await page.mouse.up();
    await page.waitForTimeout(70);
    await page.screenshot({ path: `test-results/fps-aim-impact-${pose.name}.png` });
    expect(await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.B.hp)).toBe(
      100,
    );
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
  }
  expect(errors).toEqual([]);
});
