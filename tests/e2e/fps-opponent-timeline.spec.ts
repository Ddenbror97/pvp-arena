import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
import { writeFile } from "node:fs/promises";
test("opponent playback recovers immediately after a 400 ms rendering stall", async ({ page }) => {
  await fixture(page);
  await page.bringToFront();
  await page.locator("canvas").click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const end = performance.now() + 400;
    while (performance.now() < end) {
      /* deliberate main-thread stall */
    }
  });
  const error = await page.evaluate(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    return Reflect.get(window, "fpsPolishTest").controls.diagnostics().opponentPlaybackErrorMs;
  });
  expect(Math.abs(error)).toBeLessThan(50);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
for (const mode of ["player-A", "player-B", "bot"] as const) {
  test(`${mode} walking remains bounded with delayed uneven snapshots`, async ({ page }, info) => {
    const seat = mode === "player-B" ? "B" : "A";
    await fixture(page, seat, 5, 120, 50);
    await page.evaluate(
      async ({ seat, mode }) => {
        const f = Reflect.get(window, "fpsPolishTest"),
          sign = seat === "A" ? 1 : -1;
        const remote = seat === "A" ? "B" : "A";
        Object.assign(f.state.players[seat], {
          x: 9,
          y: 0,
          z: 12 * sign,
          yaw: seat === "A" ? 0 : Math.PI,
          pitch: 0,
        });
        Object.assign(f.state.players[remote], {
          x: 9,
          y: 0,
          z: 5 * sign,
          yaw: seat === "A" ? Math.PI : 0,
          pitch: 0,
        });
        f.state.round++;
        f.resetView();
        const { createPracticeBot } = await import("/src/lib/fps/practice-bot.ts" as string);
        const bot = createPracticeBot(() => 0.55);
        let seq = 0;
        Reflect.set(window, "fpsTestOpponent", (state: typeof f.state, now: number) =>
          mode === "bot"
            ? { ...bot.input(state, now), fire: false }
            : {
                v: 1,
                type: "input",
                combatVersion: 2,
                seq: ++seq,
                forward: 1,
                strafe: 0,
                yaw: seat === "A" ? Math.PI : 0,
                pitch: 0,
                fire: false,
                reload: false,
                weapon: "rifle",
                jump: false,
                sprint: false,
              },
        );
      },
      { seat, mode },
    );
    await page.bringToFront();
    await page.locator("canvas").click();
    await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
    const rows = await page.evaluate(async () => {
      const f = Reflect.get(window, "fpsPolishTest");
      const rows: Array<{
        at: number;
        x: number;
        z: number;
        poseAt: number;
        stance: number;
        serverZ: number;
        serverAt: number;
        epoch: number;
      }> = [];
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const frame = (timestamp: number) => {
          const d = f.controls.diagnostics(),
            at = timestamp - start;
          if (d.opponentPosition)
            rows.push({
              at,
              x: d.opponentPosition[0],
              z: d.opponentPosition[2],
              poseAt: d.opponentPoseAt,
              stance: d.opponentStance,
              serverZ: f.state.players[f.seat === "A" ? "B" : "A"].z,
              serverAt: f.state.server.lastStepAt,
              epoch: Date.now(),
            });
          if (at < 1050) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      return rows;
    });
    const settled = rows.filter((r) => r.at > 400);
    expect(settled.length).toBeGreaterThan(10);
    const speeds = settled
      .slice(1)
      .map(
        (r, i) =>
          (Math.hypot(r.x - settled[i]!.x, r.z - settled[i]!.z) * 1000) / (r.at - settled[i]!.at),
      );
    await info.attach("opponent-movement-trace", {
      body: JSON.stringify({
        mode,
        rows,
        maximumSpeed: Math.max(...speeds),
        stalls: speeds.filter((speed) => speed < 0.1).length,
      }),
      contentType: "application/json",
    });
    await writeFile(info.outputPath("movement-trace.json"), JSON.stringify({ mode, rows, speeds }));
    expect(Math.max(...speeds)).toBeLessThan(12);
    for (let i = 1; i < settled.length; i++)
      expect(settled[i]!.poseAt).toBeGreaterThan(settled[i - 1]!.poseAt);
    if (mode !== "bot")
      expect(speeds.filter((speed) => speed < 0.1).length / speeds.length).toBeLessThan(0.15);
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
  });
}
