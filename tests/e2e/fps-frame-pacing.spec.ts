import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
import fs from "node:fs";
import type { ArenaControls } from "../../src/lib/fps/renderer";
type Sample = ReturnType<ArenaControls["diagnostics"]>;
for (const { throttle, delay } of [
  { throttle: 1, delay: 0 },
  { throttle: 4, delay: 0 },
  { throttle: 1, delay: 100 },
])
  test(`movement frame audit CPU ${throttle}x delay ${delay}ms`, async ({ page }, info) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
    await fixture(page, "A", 5, delay);
    await page.evaluate(() => {
      const f = Reflect.get(window, "fpsPolishTest");
      Object.assign(f.state.players.A, { x: 9, z: 12, yaw: 0, pitch: 0 });
      f.state.round++;
      f.resetView();
    });
    await page.locator("canvas").click();
    await page.waitForTimeout(1800);
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(400);
    if (process.env.PACING_PROFILE) {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.start");
    }
    const result = await page.evaluate(
      () =>
        new Promise<Sample[]>((resolve) => {
          const rows: Sample[] = [];
          const f = Reflect.get(window, "fpsPolishTest");
          const start = performance.now();
          const sample = () => {
            rows.push(f.controls.diagnostics());
            if (performance.now() - start < 3500) requestAnimationFrame(sample);
            else resolve(rows);
          };
          requestAnimationFrame(sample);
        }),
    );
    await page.keyboard.up("KeyW");
    if (process.env.PACING_PROFILE) {
      const p = await cdp.send("Profiler.stop");
      fs.writeFileSync("test-results/pacing-cpu-profile.json", JSON.stringify(p.profile));
    }
    const sorted = (field: "frameMs" | "cpuMs" | "calls" | "triangles") =>
      result.map((r) => r[field]).sort((a, b) => a - b);
    const percentile = (field: "frameMs" | "cpuMs" | "calls" | "triangles", p: number) =>
      sorted(field)[Math.floor(result.length * p)];
    const same = result
      .slice(1)
      .filter((r, i) => Math.abs(r.camera[2]! - result[i]!.camera[2]!) < 1e-6).length;
    const report = {
      frames: result.length,
      stationaryFraction: same / (result.length - 1),
      frameMedian: percentile("frameMs", 0.5),
      frameP95: percentile("frameMs", 0.95),
      frameP99: percentile("frameMs", 0.99),
      cpuP95: percentile("cpuMs", 0.95),
      callsP95: percentile("calls", 0.95),
      triangles: percentile("triangles", 0.95),
    };
    fs.writeFileSync(
      `test-results/pacing-${process.env.PACING_LABEL ?? "verified"}-${throttle}-${delay}.json`,
      JSON.stringify(report, null, 2),
    );
    await info.attach("frame-audit", {
      body: JSON.stringify(report),
      contentType: "application/json",
    });
    expect(result.length).toBeGreaterThan(20);
    expect(report.stationaryFraction).toBeLessThan(0.03);
    expect(report.callsP95).toBeLessThan(150);
    const yaw = await page.evaluate(
      () => Reflect.get(window, "fpsPolishTest").controls.diagnostics().camera[3],
    );
    await page.mouse.move(800, 400);
    await expect
      .poll(
        () =>
          page.evaluate(
            () => Reflect.get(window, "fpsPolishTest").controls.diagnostics().camera[3],
          ),
        { timeout: 1000, intervals: [10] },
      )
      .not.toBe(yaw);
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
  });
