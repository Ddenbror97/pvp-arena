import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { fixture } from "./helpers/fps-fixture";

test("walking and mouse look share a smooth render timeline", async ({ page, browser }, info) => {
  test.skip(
    info.project.name === "webkit",
    "Windows MiniBrowser rejects pointer lock even on an isolated canvas; native Safari capture requires macOS validation.",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page, "A", 5, 100);
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector("canvas")!.getContext("webgl2")!;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "unavailable",
      antialias: gl.getContextAttributes()?.antialias,
      desynchronized: Reflect.get(gl.getContextAttributes()!, "desynchronized"),
      samples: gl.getParameter(gl.SAMPLES),
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
    };
  });
  const scenarios = [];
  for (const mode of ["look", "run", "run-look"]) {
    await page.bringToFront();
    await page.evaluate(() => {
      const f = Reflect.get(window, "fpsPolishTest");
      Object.assign(f.state.players.A, { x: 9, z: 12, yaw: 0, pitch: 0, velocityY: 0 });
      f.state.round++;
      f.resetView();
    });
    await page.locator("canvas").click();
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
    // Drain deliberately delayed snapshots from the preceding fixture teleport.
    // Real rounds never rewind, but this test resets authority in-place.
    await page.waitForTimeout(250);
    if (mode !== "look") {
      await page.keyboard.down("KeyW");
      await page.keyboard.down("ShiftLeft");
    }
    await page.waitForTimeout(400);
    const result = await page.evaluate(async (mode) => {
      const f = Reflect.get(window, "fpsPolishTest"),
        rows: number[][] = [];
      let firstEvent = 0,
        events = 0,
        yaw = 0;
      const start = performance.now();
      const timer =
        mode === "run"
          ? null
          : setInterval(() => {
              const target = 0.35 * Math.sin((performance.now() - start) * 0.009),
                dx = Math.round((yaw - target) / 0.002);
              if (!dx) return;
              yaw -= dx * 0.002;
              events++;
              if (!firstEvent) firstEvent = performance.now();
              document.dispatchEvent(new MouseEvent("mousemove", { movementX: dx, movementY: 0 }));
            }, 4);
      await new Promise<void>((resolve) => {
        const sample = () => {
          const d = f.controls.diagnostics();
          rows.push([
            performance.now(),
            d.frameMs,
            d.cpuMs,
            ...d.camera,
            firstEvent ? performance.now() - firstEvent : 0,
          ]);
          firstEvent = 0;
          if (performance.now() - start < 3000) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      if (timer !== null) clearInterval(timer);
      const p = (column: number, fraction: number) => {
        const values = rows.map((r) => r[column]!).sort((a, b) => a - b);
        return values[Math.floor(values.length * fraction)]!;
      };
      let perpendicular = 0,
        totalDistance = 0,
        repeated = 0;
      for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1]!,
          b = rows[i]!,
          dx = b[3]! - a[3]!,
          dz = b[5]! - a[5]!;
        totalDistance += Math.hypot(dx, dz);
        perpendicular += Math.abs(dx * Math.cos(b[6]!) - dz * Math.sin(b[6]!));
        if (Math.hypot(dx, dz) < 1e-6) repeated++;
      }
      return {
        frames: rows.length,
        frameMedian: p(1, 0.5),
        frameP95: p(1, 0.95),
        frameP99: p(1, 0.99),
        cpuP95: p(2, 0.95),
        eventToRenderP95: p(7, 0.95),
        mouseEvents: events,
        totalDistance,
        perpendicularFraction: perpendicular / Math.max(0.001, totalDistance),
        repeatedFraction: repeated / (rows.length - 1),
        focused: document.hasFocus(),
        pixelRatio: f.controls.diagnostics().pixelRatio,
        state: { phase: f.state.phase, player: f.state.players.A },
      };
    }, mode);
    if (mode !== "look") {
      await page.keyboard.up("KeyW");
      await page.keyboard.up("ShiftLeft");
    }
    scenarios.push({ mode, ...result });
    fs.writeFileSync(
      info.outputPath("input-frame-report.json"),
      JSON.stringify({ browser: browser.version(), gpu, scenarios, errors }, null, 2),
    );
    expect(result.focused).toBe(true);
    expect(result.frames).toBeGreaterThan(20);
    if (mode !== "look") expect(result.totalDistance).toBeGreaterThan(5);
  }
  fs.writeFileSync(
    info.outputPath("input-frame-report.json"),
    JSON.stringify({ browser: browser.version(), gpu, scenarios, errors }, null, 2),
  );
  expect(errors).toEqual([]);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("inactive windows reduce GPU work while input and snapshots continue", async ({ page }) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const f = Reflect.get(window, "fpsPolishTest");
    Object.defineProperty(document, "hasFocus", { configurable: true, value: () => false });
    await new Promise((resolve) => setTimeout(resolve, 200));
    const before = f.controls.diagnostics().renderFrames,
      inputs = f.inputs.length;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const draws = f.controls.diagnostics().renderFrames - before;
    const sent = f.inputs.length - inputs;
    const neutral = f.inputs
      .slice(inputs)
      .every(
        (input: { forward: number; strafe: number; fire: boolean }) =>
          !input.forward && !input.strafe && !input.fire,
      );
    Reflect.deleteProperty(document, "hasFocus");
    const resumed = f.controls.diagnostics().renderFrames;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { draws, sent, neutral, resumed: f.controls.diagnostics().renderFrames - resumed };
  });
  expect(result.draws).toBeLessThanOrEqual(16);
  expect(result.draws).toBeGreaterThan(5);
  expect(result.sent).toBeGreaterThan(20);
  expect(result.neutral).toBe(true);
  expect(result.resumed).toBeGreaterThan(result.draws);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("a brief tap starts feedback immediately and survives the next input tick", async ({
  page,
}, info) => {
  test.skip(info.project.name === "webkit", "Windows WebKit cannot capture the mouse.");
  await fixture(page, "A", 5, 150);
  await page.locator("canvas").click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  const result = await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest"),
      before = performance.now();
    document.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    document.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    return {
      elapsed: f.localShots.at(-1)?.at - before,
      shots: f.localShots.length,
      seq: f.localShots.at(-1)?.seq,
    };
  });
  expect(result.shots).toBe(1);
  expect(result.elapsed).toBeGreaterThanOrEqual(0);
  expect(result.elapsed).toBeLessThan(16);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Reflect.get(window, "fpsPolishTest").eventLog.filter(
            (e: { type: string }) => e.type === "shot",
          ).length,
      ),
    )
    .toBe(1);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => Reflect.get(window, "fpsPolishTest").localShots.length)).toBe(1);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("automatic fire has no server-roundtrip pause after its first shot", async ({
  page,
}, info) => {
  test.skip(info.project.name === "webkit", "Windows WebKit cannot capture the mouse.");
  await fixture(page, "A", 5, 180);
  await page.evaluate(async () => {
    const path = "/src/lib/fps/audio.ts",
      { createCombatAudio } = await import(path),
      audio = createCombatAudio();
    await audio.ready();
    Reflect.set(window, "fpsTestAudio", audio);
    const f = Reflect.get(window, "fpsPolishTest"),
      snapshot = f.controls.snapshot;
    f.controls.snapshot = (
      frame: { state: import("../../src/lib/fps/protocol").MatchState },
      seat: "A" | "B" | null,
    ) => {
      snapshot(frame, seat);
      audio.snapshot(frame.state, seat);
    };
    document.querySelector("canvas")!.addEventListener("click", () => void audio.unlock());
    const starts: number[] = [];
    Reflect.set(window, "fpsShotAudioStarts", starts);
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<typeof start>) {
      starts.push(performance.now());
      return start.apply(this, args);
    };
  });
  await page.locator("canvas").click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.evaluate(() => Reflect.get(window, "fpsTestAudio")?.unlock());
  await page.mouse.down();
  // Observe a complete three-shot sequence instead of releasing a few
  // milliseconds before its last input tick on a jittery browser scheduler.
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "fpsPolishTest").localShots.length), {
      timeout: 1000,
      intervals: [5],
    })
    .toBeGreaterThanOrEqual(3);
  await page.mouse.up();
  const shots: Array<{ at: number }> = await page.evaluate(
    () => Reflect.get(window, "fpsPolishTest").localShots,
  );
  expect(shots.length).toBeGreaterThanOrEqual(3);
  for (let i = 1; i < shots.length; i++) expect(shots[i]!.at - shots[i - 1]!.at).toBeLessThan(145);
  await page.waitForTimeout(500);
  const actual = await page.evaluate(
    () =>
      Reflect.get(window, "fpsPolishTest").eventLog.filter(
        (e: { type: string }) => e.type === "shot",
      ).length,
  );
  expect(actual).toBe(shots.length);
  const starts: number[] = await page.evaluate(() => Reflect.get(window, "fpsShotAudioStarts"));
  fs.writeFileSync(
    info.outputPath("shot-reconciliation.json"),
    JSON.stringify(
      await page.evaluate(() => {
        const f = Reflect.get(window, "fpsPolishTest");
        return {
          local: f.localShots,
          events: f.eventLog.filter((e: { type: string }) => e.type === "shot"),
          inputs: f.inputs,
          starts: Reflect.get(window, "fpsShotAudioStarts"),
        };
      }),
      null,
      2,
    ),
  );
  expect(starts.length).toBe(actual);
  for (let i = 1; i < starts.length; i++) expect(starts[i]! - starts[i - 1]!).toBeLessThan(145);
  await page.evaluate(() => Reflect.get(window, "fpsTestAudio").dispose());
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
