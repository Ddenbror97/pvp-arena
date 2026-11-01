import { test } from "@playwright/test";
import fs from "node:fs";
import { fixture } from "./helpers/fps-fixture";
import type { ArenaControls } from "../../src/lib/fps/renderer";

/**
 * Reproducible map performance sequence (skipped unless MAP_PERF_OUT is set), identical for
 * the old and new maps: mount → ready time, then spawn idle, a forward run with continuous
 * turning, and a full 360° look, sampling the renderer's own diagnostics every frame; finally
 * four mount/dispose cycles for heap and renderer-resource drift.
 *
 *   MAP_PERF_OUT=out.json npx playwright test fps-map-baseline
 */
type Sample = ReturnType<ArenaControls["diagnostics"]>;
const out = process.env["MAP_PERF_OUT"];
test.skip(!out, "map performance capture only runs with MAP_PERF_OUT");

test("map performance baseline sequence", async ({ page, browserName }) => {
  test.setTimeout(900_000);
  const started = Date.now();
  await fixture(page, "A", 5, 0);
  const mountMs = Date.now() - started;
  // Ready = authored models loaded and shaders compiled (the renderer sets this dataset flag).
  const readyMs = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const t0 = performance.now();
        const check = () => {
          const canvas = document.querySelector("canvas");
          if (canvas?.dataset["authoredModels"]) resolve(performance.now() - t0);
          else setTimeout(check, 20);
        };
        check();
      }),
  );
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    f.state.phaseEndsAt = Date.now() + 3_600_000;
  });
  await page.locator("canvas").click();
  await page.waitForTimeout(1500);
  // Frame-count sampling: a software rasteriser takes seconds per frame, so time windows would
  // capture a different number of frames on every machine.
  const sample = (frames: number, turn = 0) =>
    page.evaluate(
      async ({ frames, turn }) => {
        const rows: Sample[] = [];
        const f = Reflect.get(window, "fpsPolishTest");
        const own = f.state.players[f.seat];
        for (let i = 0; i < frames; i++) {
          if (turn) {
            own.yaw += turn;
            f.resetView?.();
          }
          await new Promise((r) => requestAnimationFrame(r));
          rows.push(f.controls.diagnostics());
        }
        return rows;
      },
      { frames, turn },
    );
  const phases: Record<string, Sample[]> = {};
  phases["idle"] = await sample(10);
  await page.keyboard.down("KeyW");
  phases["run-turn"] = await sample(16, 0.06);
  await page.keyboard.up("KeyW");
  phases["look-360"] = await sample(18, (Math.PI * 2) / 18);
  const stats = (rows: Sample[]) => {
    const pick = (k: "frameMs" | "cpuMs") => rows.map((r) => r[k]).sort((a, b) => a - b);
    const q = (k: "frameMs" | "cpuMs", p: number) =>
      +pick(k)[Math.min(rows.length - 1, Math.floor(rows.length * p))]!.toFixed(2);
    const frame = pick("frameMs");
    const avgFrame = frame.reduce((a, b) => a + b, 0) / frame.length;
    const worst = frame.slice(Math.floor(frame.length * 0.99));
    const low1 = worst.reduce((a, b) => a + b, 0) / Math.max(1, worst.length);
    const max = (k: "calls" | "triangles" | "programs" | "textures" | "geometries") =>
      Math.max(...rows.map((r) => r[k]));
    return {
      frames: rows.length,
      frameP50: q("frameMs", 0.5),
      frameP95: q("frameMs", 0.95),
      frameP99: q("frameMs", 0.99),
      avgFps: +(1000 / avgFrame).toFixed(1),
      low1Fps: +(1000 / low1).toFixed(1),
      cpuP50: q("cpuMs", 0.5),
      cpuP95: q("cpuMs", 0.95),
      calls: max("calls"),
      triangles: max("triangles"),
      programs: max("programs"),
      textures: max("textures"),
      geometries: max("geometries"),
    };
  };
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector("canvas")!.getContext("webgl2")!;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  // Lifecycle: dispose and remount the arena eight times on the same page.
  const lifecycle = await page.evaluate(async () => {
    const heap = () =>
      (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ??
      0;
    const { mountArena } = await import("/src/lib/fps/renderer.ts" as string);
    Reflect.get(window, "fpsPolishTest").dispose();
    const rows: {
      heapMB: number;
      geometries: number;
      textures: number;
      programs: number;
      readyMs: number;
    }[] = [];
    for (let i = 0; i < 4; i++) {
      const host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0";
      document.body.appendChild(host);
      const t0 = performance.now();
      const controls = mountArena(
        host,
        () => {},
        () => {},
        () => {},
      );
      await new Promise<void>((resolve) => {
        const check = () =>
          host.querySelector("canvas")?.dataset["authoredModels"]
            ? resolve()
            : setTimeout(check, 20);
        check();
      });
      const readyMs = performance.now() - t0;
      for (let f = 0; f < 3; f++) await new Promise((r) => requestAnimationFrame(r));
      const d = controls.diagnostics();
      controls.dispose();
      host.remove();
      (globalThis as unknown as { gc?: () => void }).gc?.();
      rows.push({
        heapMB: +(heap() / 1048576).toFixed(1),
        geometries: d.geometries,
        textures: d.textures,
        programs: d.programs,
        readyMs: Math.round(readyMs),
      });
    }
    return rows;
  });
  const report = {
    browser: browserName,
    gpu,
    mountMs,
    readyMs: Math.round(readyMs),
    phases: Object.fromEntries(Object.entries(phases).map(([k, v]) => [k, stats(v)])),
    lifecycle,
  };
  fs.writeFileSync(out!, JSON.stringify(report, null, 2));
});
