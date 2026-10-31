import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { fixture } from "./helpers/fps-fixture";

test("repeated SPA arena mounts release resources and input listeners", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    Reflect.set(window, "fpsLifecycleState", structuredClone(f.state));
    f.dispose();
    Reflect.deleteProperty(window, "fpsPolishTest");
  });
  await cdp.send("HeapProfiler.collectGarbage");
  const before = await cdp.send("Runtime.getHeapUsage");
  const initialDom = await cdp.send("Memory.getDOMCounters");
  const rows = [];
  for (let cycle = 0; cycle < 8; cycle++) {
    const result = await page.evaluate(async () => {
      const path = "/src/lib/fps/renderer.ts";
      const { mountArena } = await import(path);
      const controls = mountArena(
        document.querySelector(".duel-render-host")!,
        () => {},
        () => {},
      );
      controls.snapshot(
        {
          state: Reflect.get(window, "fpsLifecycleState"),
          serverNow: Date.now(),
          settled: false,
          settlementPending: false,
        },
        "A",
      );
      await controls.ready;
      await new Promise((resolve) => setTimeout(resolve, 300));
      const live = controls.diagnostics();
      controls.dispose();
      return { live, disposed: controls.diagnostics() };
    });
    await cdp.send("HeapProfiler.collectGarbage");
    const dom = await cdp.send("Memory.getDOMCounters");
    rows.push({ cycle, ...result, dom, heap: await cdp.send("Runtime.getHeapUsage") });
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(dom.jsEventListeners).toBeLessThanOrEqual(initialDom.jsEventListeners + 2);
    expect(result.disposed.textures).toBeLessThanOrEqual(2);
    expect(result.disposed.geometries).toBeLessThanOrEqual(2);
  }
  const after = await cdp.send("Runtime.getHeapUsage");
  fs.writeFileSync(
    info.outputPath("lifecycle.json"),
    JSON.stringify({ before, after, initialDom, rows, errors }, null, 2),
  );
  expect(after.usedSize - before.usedSize).toBeLessThan(12 * 1024 * 1024);
  expect(errors).toEqual([]);
});
