import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("a trigger is transmitted synchronously without adding movement time", async ({ page }) => {
  await fixture(page);
  await page.locator("canvas").click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.waitForTimeout(200);
  const result = await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest"),
      before = f.inputs.length;
    const at = performance.now();
    document.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
    document.dispatchEvent(new MouseEvent("mouseup", { button: 0, bubbles: true }));
    return { elapsed: performance.now() - at, commands: f.inputs.slice(before) };
  });
  expect(result.commands).toHaveLength(1);
  expect(result.commands[0]).toMatchObject({
    combatOnly: true,
    fire: true,
    forward: 0,
    strafe: 0,
    jump: false,
  });
  expect(result.elapsed).toBeLessThan(20);
  await page.waitForTimeout(400);
  const state = await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    return {
      ammo: f.state.players.A.ammo,
      shots: f.eventLog.filter((e: { type: string }) => e.type === "shot").length,
      diagnostics: f.controls.diagnostics(),
    };
  });
  expect(state.ammo).toBe(29);
  expect(state.shots).toBe(1);
  await page.waitForTimeout(3000);
  const delay = await page.evaluate(
    () => Reflect.get(window, "fpsPolishTest").controls.diagnostics().playbackMs,
  );
  expect(delay).toBeGreaterThanOrEqual(65);
  expect(delay).toBeLessThan(110);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
