import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
test("mouse capture errors reject even when browser API returns void", async ({ page }) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas")!;
    canvas.requestPointerLock = () => {
      setTimeout(() => document.dispatchEvent(new Event("pointerlockerror")), 20);
      return undefined as unknown as Promise<void>;
    };
    try {
      await Reflect.get(window, "fpsPolishTest").controls.lock();
      return "incorrectly accepted";
    } catch {
      return "rejected";
    }
  });
  expect(result).toBe("rejected");
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
test("a real captured mouse resolves from the browser event", async ({ page }) => {
  await fixture(page);
  await page.locator("canvas").click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
