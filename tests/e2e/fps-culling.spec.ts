import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("off-camera opponents stop rendering and return immediately when looking back", async ({
  page,
}) => {
  await fixture(page);
  const turn = async (yaw: number) =>
    page.evaluate((yaw) => {
      const f = Reflect.get(window, "fpsPolishTest");
      Object.assign(f.state.players.A, { x: 9, z: 2, yaw, pitch: 0 });
      Object.assign(f.state.players.B, { x: 9, z: 0, yaw: Math.PI, pitch: 0 });
      f.state.round++;
      f.resetView();
    }, yaw);
  const visible = () =>
    page.evaluate(
      () => Reflect.get(window, "fpsPolishTest").controls.diagnostics().opponentVisible,
    );
  // Visibility changes on the next drawn frame: milliseconds on a GPU, seconds under a
  // software rasteriser (CI without a GPU), so the poll allows for slow frames.
  const frames = { timeout: 60_000 };
  await turn(0);
  await expect.poll(visible, frames).toBe(true);
  await turn(Math.PI);
  await expect.poll(visible, frames).toBe(false);
  await turn(0);
  await expect.poll(visible, frames).toBe(true);
  await page.screenshot({ path: "test-results/stability-ii-ingame.png" });
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
