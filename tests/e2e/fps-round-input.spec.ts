import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("held movement survives respawn while firing is reset", async ({ page }) => {
  await fixture(page);
  await page.locator("canvas").click();
  await page.keyboard.down("KeyW");
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "fpsPolishTest").inputs.at(-1)?.forward))
    .toBe(1);
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    f.state.round++;
    f.resetView();
    f.inputs.length = 0;
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const input = Reflect.get(window, "fpsPolishTest").inputs.at(-1);
        return input ? { forward: input.forward, fire: input.fire } : null;
      }),
    )
    .toEqual({ forward: 1, fire: false });
  await page.keyboard.up("KeyW");
  await page.mouse.up();
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
