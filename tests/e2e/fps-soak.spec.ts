import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { fixture } from "./helpers/fps-fixture";

test("sustained renderer resource and frame audit", async ({ page }, info) => {
  const minutes = Number(process.env.FPS_SOAK_MINUTES ?? 0);
  test.skip(minutes <= 0, "Explicit opt-in for sustained hardware test");
  test.setTimeout((minutes + 3) * 60_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");
  const mount = async () => {
    await fixture(page, "A", 9, 50);
    await page.locator("canvas").click();
    await page.evaluate(async () => {
      const path = "/tests/e2e/helpers/fps-performance-sampler.ts";
      const { startPerformanceSampler } = await import(path);
      const f = Reflect.get(window, "fpsPolishTest");
      f.state.phaseEndsAt = Date.now() + 7_200_000;
      Reflect.set(
        window,
        "fpsSoakSampler",
        startPerformanceSampler(document.querySelector("canvas")!, () => f.controls.diagnostics()),
      );
    });
  };
  await mount();
  await page.waitForTimeout(5000);
  await cdp.send("HeapProfiler.collectGarbage");
  const initialHeap = await cdp.send("Runtime.getHeapUsage");
  const initialDom = await cdp.send("Memory.getDOMCounters");
  const rows: object[] = [];
  const completedWindows: object[] = [];
  const started = Date.now();
  let mountedAt = Date.now();
  let cycle = 0;
  while (Date.now() - started < minutes * 60_000) {
    expect(
      await page.evaluate(() => !!document.pointerLockElement),
      "soak must retain real input capture",
    ).toBe(true);
    const moving = cycle % 4 < 2 ? "KeyW" : "KeyS";
    await page.keyboard.down(moving);
    await page.mouse.move(620 + (cycle % 9) * 5, 390 + (cycle % 5));
    if (cycle % 8 === 0) await page.mouse.down();
    if (cycle % 8 === 2) await page.mouse.up();
    if (cycle % 8 === 3) await page.keyboard.press("KeyR");
    if (cycle % 30 === 8) await page.keyboard.press("Digit2");
    if (cycle % 30 === 12) await page.keyboard.press("Digit1");
    await page.waitForTimeout(1500);
    await page.keyboard.up(moving);
    const report = await page.evaluate(() => {
      const f = Reflect.get(window, "fpsPolishTest");
      // Bound fixture-only audit logs; they are not part of the game renderer.
      f.inputs.splice(0, Math.max(0, f.inputs.length - 120));
      f.eventLog.splice(0, Math.max(0, f.eventLog.length - 120));
      return {
        diagnostics: f.controls.diagnostics(),
        ...Reflect.get(window, "fpsSoakSampler").report(),
      };
    });
    if (++cycle % 20 === 0) {
      rows.push({
        seconds: (Date.now() - started) / 1000,
        ...report,
        heap: await cdp.send("Runtime.getHeapUsage"),
        dom: await cdp.send("Memory.getDOMCounters"),
      });
      fs.writeFileSync(info.outputPath("soak-progress.json"), JSON.stringify(rows, null, 2));
      console.log(
        `Soak ${Math.round((Date.now() - started) / 60000)}m: ${report.frames} frames, p95 ${report.frameP95}ms, textures ${report.diagnostics.textures}`,
      );
    }
    if (Date.now() - mountedAt >= 5 * 60_000 && Date.now() - started < minutes * 60_000 - 10_000) {
      completedWindows.push(
        await page.evaluate(() => {
          const sampler = Reflect.get(window, "fpsSoakSampler");
          const report = sampler.report();
          sampler.stop();
          Reflect.get(window, "fpsPolishTest").dispose();
          return report;
        }),
      );
      await mount();
      mountedAt = Date.now();
    }
  }
  await page.mouse.up();
  const final = await page.evaluate(() => {
    const sampler = Reflect.get(window, "fpsSoakSampler");
    const report = sampler.report();
    sampler.stop();
    Reflect.get(window, "fpsPolishTest").dispose();
    Reflect.deleteProperty(window, "fpsPolishTest");
    Reflect.deleteProperty(window, "fpsSoakSampler");
    return report;
  });
  await cdp.send("HeapProfiler.collectGarbage");
  const finalHeap = await cdp.send("Runtime.getHeapUsage");
  const finalDom = await cdp.send("Memory.getDOMCounters");
  fs.writeFileSync(
    info.outputPath("soak-final.json"),
    JSON.stringify(
      {
        elapsedSeconds: (Date.now() - started) / 1000,
        initialHeap,
        finalHeap,
        initialDom,
        finalDom,
        final,
        completedWindows,
        errors,
        rows,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  expect(final.contextLosses).toBe(0);
  expect(finalDom.jsEventListeners).toBeLessThan(initialDom.jsEventListeners);
  expect(finalDom.nodes).toBeLessThanOrEqual(initialDom.nodes + 10);
  await expect(page.locator("canvas")).toHaveCount(0);
});
