import { test } from "@playwright/test";
import fs from "node:fs";
import type { ArenaControls } from "../../src/lib/fps/renderer";

/**
 * Same-harness map comparison through the registry (skipped unless MAP_PERF_DIR is set): the
 * real renderer is mounted with `{ mapId }` and fed snapshots from the real simulation for a
 * match created on that map, then the sequence of fps-map-baseline.spec.ts runs (spawn idle,
 * run with continuous turning, full 360° look, renderer diagnostics every frame) followed by
 * four mount/dispose cycles for heap and resource drift. Each map in MAP_PERF_MAPS (default
 * "dustfront,frostline") runs in a fresh page, in the same browser.
 *
 *   MAP_PERF_DIR=out npx playwright test fps-frostline-perf --project=chromium
 */
type Sample = ReturnType<ArenaControls["diagnostics"]>;
const dir = process.env["MAP_PERF_DIR"];
const maps = (process.env["MAP_PERF_MAPS"] ?? "dustfront,frostline").split(",");
test.skip(!dir, "map performance capture only runs with MAP_PERF_DIR");

for (const mapId of maps)
  test(`map performance sequence: ${mapId}`, async ({ page, browserName }) => {
    test.setTimeout(900_000);
    await page.route("**/__frostline_perf__", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<!doctype html><html><head><link rel="stylesheet" href="/src/components/fps/duel.css"></head><body style="margin:0"></body></html>',
      }),
    );
    await page.goto("/__frostline_perf__");
    const started = Date.now();
    await page.evaluate(async (mapId) => {
      const { mountArena } = await import("/src/lib/fps/renderer.ts" as string);
      const { createMatch, startMatch, stepMatch, TICK_MS } = await import(
        "/src/lib/fps/simulation.ts" as string
      );
      const now = Date.now();
      const state = createMatch({ A: "perf-a", B: "perf-b" }, 5, now - 3000, undefined, mapId);
      startMatch(state, now - 3000);
      stepMatch(state, {}, now, TICK_MS);
      const host = document.createElement("div");
      host.className = "duel-render-host";
      host.style.cssText = "position:fixed;inset:0";
      document.body.replaceChildren(host);
      const queue: unknown[] = [];
      const controls = mountArena(
        host,
        (input: unknown) => {
          queue.push(input);
          if (queue.length > 8) queue.shift();
        },
        () => {},
        undefined,
        undefined,
        { mapId },
      );
      host.addEventListener("click", () => void controls.lock());
      state.server.lastStepAt = Date.now();
      state.phaseEndsAt = Date.now() + 3_600_000;
      const send = () => {
        const t = Date.now();
        if (t - state.server.lastStepAt < 34) return;
        const input = queue.shift();
        stepMatch(state, input ? { A: input } : {}, state.server.lastStepAt + 34, TICK_MS);
        state.phaseEndsAt = Date.now() + 3_600_000;
        controls.snapshot(
          {
            state: structuredClone(state),
            serverNow: Date.now(),
            poseAt: state.server.lastStepAt,
            settled: false,
            settlementPending: false,
          },
          "A",
        );
      };
      controls.snapshot(
        {
          state: structuredClone(state),
          serverNow: Date.now(),
          settled: false,
          settlementPending: false,
        },
        "A",
      );
      const timer = setInterval(send, 34);
      Object.assign(window, {
        perf: {
          state,
          controls,
          dispose() {
            clearInterval(timer);
            controls.dispose();
            host.remove();
          },
        },
      });
    }, mapId);
    const mountMs = Date.now() - started;
    const readyMs = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const t0 = performance.now();
          const check = () => {
            if (document.querySelector("canvas")?.dataset["authoredModels"])
              resolve(performance.now() - t0);
            else setTimeout(check, 20);
          };
          check();
        }),
    );
    await page.locator("canvas").click();
    await page.waitForTimeout(1500);
    const sample = (frames: number, turn = 0) =>
      page.evaluate(
        async ({ frames, turn }) => {
          const rows: Sample[] = [];
          const p = Reflect.get(window, "perf");
          for (let i = 0; i < frames; i++) {
            if (turn) p.state.players.A.yaw += turn;
            await new Promise((r) => requestAnimationFrame(r));
            rows.push(p.controls.diagnostics());
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
      const max = (k: "calls" | "triangles" | "programs" | "textures" | "geometries") =>
        Math.max(...rows.map((r) => r[k]));
      return {
        frames: rows.length,
        frameP50: q("frameMs", 0.5),
        frameP95: q("frameMs", 0.95),
        avgFps: +(1000 / avgFrame).toFixed(1),
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
    const lifecycle = await page.evaluate(async (mapId) => {
      const heap = () =>
        (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize ?? 0;
      const { mountArena } = await import("/src/lib/fps/renderer.ts" as string);
      Reflect.get(window, "perf").dispose();
      const rows: { heapMB: number; geometries: number; textures: number; readyMs: number }[] = [];
      for (let i = 0; i < 4; i++) {
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;inset:0";
        document.body.appendChild(host);
        const t0 = performance.now();
        const controls = mountArena(
          host,
          () => {},
          () => {},
          undefined,
          undefined,
          { mapId },
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
          readyMs: Math.round(readyMs),
        });
      }
      return rows;
    }, mapId);
    const report = {
      map: mapId,
      browser: browserName,
      gpu,
      mountMs,
      readyMs: Math.round(readyMs),
      phases: Object.fromEntries(Object.entries(phases).map(([k, v]) => [k, stats(v)])),
      lifecycle,
    };
    fs.mkdirSync(dir!, { recursive: true });
    fs.writeFileSync(`${dir}/${browserName}-${mapId}.json`, JSON.stringify(report, null, 2));
  });
