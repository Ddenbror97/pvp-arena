import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("the defeated opponent plays the death animation and stays grounded until respawn", async ({
  page,
}, info) => {
  await fixture(page);
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    Object.assign(f.state.players.A, { x: 9, y: 0, z: 12, yaw: 0, pitch: 0 });
    Object.assign(f.state.players.B, { x: 9, y: 0, z: 9, yaw: Math.PI, pitch: 0 });
    f.state.round++;
    f.resetView();
  });
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    f.state.players.B.hp = 0;
    f.state.phase = "round-end";
    // Long enough for the whole animation on a slow software renderer (a few frames a second).
    f.state.phaseEndsAt = Date.now() + 30000;
    f.resetView();
  });
  // The death animation (death-clip.ts, ~3.4 s from the first frame that shows the death)
  // leaves the body lying on the floor: the rig's root stays on the ground and the head comes
  // down close to it.
  await expect
    .poll(
      () =>
        page.evaluate(
          () => Reflect.get(window, "fpsPolishTest").controls.diagnostics().opponentHeadY,
        ),
      { timeout: 25_000 },
    )
    .toBeLessThan(0.6);
  const fallen = await page.evaluate(() =>
    Reflect.get(window, "fpsPolishTest").controls.diagnostics(),
  );
  expect(fallen.opponentVisible).toBe(true);
  expect(fallen.opponentPosition![1]).toBeCloseTo(0, 2);
  await page.screenshot({ path: info.outputPath("enemy-fallen.png") });
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    f.state.round++;
    f.state.players.B.hp = 100;
    f.state.phase = "live";
    f.state.phaseEndsAt = Date.now() + 60000;
    f.resetView();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => Reflect.get(window, "fpsPolishTest").controls.diagnostics().opponentPosition?.[1],
      ),
    )
    .toBe(0);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("defeated-view blood is a fading, non-interactive screen overlay", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  await page.route("**/__death_feedback__", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<html><head><link rel="stylesheet" href="/src/components/fps/duel.css">
        <script type="module">
          import RefreshRuntime from "/@react-refresh";
          RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$ = () => {};
          window.$RefreshSig$ = () => type => type;
          window.__vite_plugin_react_preamble_installed__ = true;
        </script></head><body style="margin:0;background:#293744"><main class="duel-game"></main></body></html>`,
    }),
  );
  await page.goto("/__death_feedback__");
  await page
    .evaluate(async () => {
      const { mountDeathFeedback } = await import(
        "/tests/e2e/helpers/death-feedback-harness.tsx" as string
      );
      mountDeathFeedback(document.querySelector("main")!);
    })
    .catch(async (error) => {
      await info.attach("harness-errors", {
        body: JSON.stringify(errors),
        contentType: "application/json",
      });
      throw error;
    });
  const effect = page.getByTestId("death-feedback");
  await expect(effect).toBeVisible();
  await expect(effect).toHaveCSS("pointer-events", "none");
  await expect(effect.getByRole("status")).toHaveText("You were eliminated");
  await page.waitForTimeout(450);
  const opacity = () =>
    effect.locator(".duel-death-blood").evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(await opacity()).toBeGreaterThan(0);
  await page.screenshot({ path: info.outputPath("defeated-screen.png") });
  await expect.poll(opacity, { timeout: 5000 }).toBeLessThan(0.01);
});
