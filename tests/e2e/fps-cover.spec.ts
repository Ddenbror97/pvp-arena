import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fixture } from "./helpers/fps-fixture";

test("aim arena renders from both spawns with no WebGL startup errors", async ({ page }) => {
  await page.setViewportSize({ width: 1673, height: 940 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const seat of ["A", "B"] as const) {
    await fixture(page, seat);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `test-results/fps-aim-map-${seat}.png` });
    if (seat === "A")
      await page.screenshot({
        path: "test-results/fps-wrist-fixed.png",
        clip: { x: 725, y: 575, width: 310, height: 285 },
      });
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
  }
  expect(errors).toEqual([]);
});

test("actual Ctrl input changes authoritative crouch and restores standing", async ({ page }) => {
  await fixture(page);
  await page.locator("canvas").click();
  await page.keyboard.down("ControlLeft");
  await expect
    .poll(
      () => page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.crouched),
      {
        timeout: 30_000,
      },
    )
    .toBe(true);
  await page.screenshot({ path: "test-results/fps-aim-map-crouched.png" });
  await page.keyboard.up("ControlLeft");
  await expect
    .poll(
      () => page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.crouched),
      {
        timeout: 30_000,
      },
    )
    .toBe(false);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("records local arena frame timing without stalls", async ({ page }, info) => {
  await fixture(page);
  await page.waitForTimeout(300);
  await page.locator("canvas").click();
  await page.keyboard.down("KeyD");
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
  await page.keyboard.up("KeyD");
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
    // Aim-arena poses facing north (-z): arcade wall, east lane container, centre tarp stack, floor.
    {
      name: "concrete",
      x: -4.05,
      z: -8.5,
      pitch: 0,
      surface: "concrete",
      id: "north-wall-inner-w",
    },
    { name: "metal", x: 8.6, z: 0.5, pitch: 0, surface: "metal", id: "lane-stack-e" },
    { name: "wood", x: 0, z: 3.5, pitch: -0.25, surface: "wood", id: "tarp-stack" },
    { name: "ground", x: -8.3, z: 4.5, pitch: -0.7, surface: "concrete", id: "floor" },
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
      .poll(
        () =>
          page.evaluate(
            (id) =>
              Reflect.get(window, "fpsPolishTest").eventLog.some(
                (e: { type: string; impact?: { solidId: string } }) =>
                  e.type === "impact" && e.impact?.solidId === id,
              ),
            pose.id,
          ),
        // Software GL (CI/SwiftShader) renders a frame every few seconds.
        { timeout: 30_000 },
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
