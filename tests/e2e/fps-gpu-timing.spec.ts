import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { fixture } from "./helpers/fps-fixture";

test("GPU timing encloses actual render draws and restores instrumented methods", async ({
  page,
}, info) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const path = "/tests/e2e/helpers/fps-performance-sampler.ts";
    const { startPerformanceSampler } = await import(path);
    const canvas = document.querySelector("canvas")!;
    const gl = canvas.getContext("webgl2")!;
    const original = gl.drawElements;
    const f = Reflect.get(window, "fpsPolishTest");
    const sampler = startPerformanceSampler(canvas, () => f.controls.diagnostics());
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const report = sampler.report();
    sampler.stop();
    f.dispose();
    return { ...report, restored: gl.drawElements === original };
  });
  fs.writeFileSync(info.outputPath("gpu-timing.json"), JSON.stringify(result, null, 2));
  expect(result.restored).toBe(true);
  expect(result.contextLosses).toBe(0);
  if (result.gpuSupported) expect(result.gpuSamples).toBeGreaterThan(20);
});
