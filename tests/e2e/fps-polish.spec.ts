import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("both reference-inspired 3D opponents render in the existing arena", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const seat of ["A", "B"] as const) {
    await fixture(page, seat);
    await page.evaluate(() => {
      const { state, seat } = Reflect.get(window, "fpsPolishTest");
      Object.assign(state.players[seat], { x: 2.5, z: 13, yaw: 0, pitch: 0 });
      Object.assign(state.players[seat === "A" ? "B" : "A"], {
        x: 2.5,
        z: 7,
        yaw: Math.PI,
        pitch: 0,
      });
      state.round++; // same reset path used by real new rounds, not another camera controller
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `test-results/fps-polish-${seat === "A" ? "fighter" : "officer"}.png`,
    });
    expect(await page.locator("canvas").count()).toBe(1);
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
    await expect(page.locator("canvas")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("real pointer lock, movement, full-auto release, jump and reload remain responsive", async ({
  page,
}) => {
  await fixture(page);
  const canvas = page.locator("canvas");
  await canvas.click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(450);
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.x),
  ).toBeGreaterThan(0.4);
  await page.mouse.move(650, 390);
  await page.waitForTimeout(100);
  expect(
    Math.abs(await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.yaw)),
  ).toBeGreaterThan(0.001);
  await page.keyboard.press("Space");
  await page.waitForTimeout(160);
  expect(
    await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.y),
  ).toBeGreaterThan(0);
  await page.waitForTimeout(900);
  await page.mouse.down();
  await page.waitForTimeout(850);
  expect(
    await page
      .locator(".duel-crosshair")
      .evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue("--duel-spread"))),
  ).toBeGreaterThan(0);
  await page.mouse.up();
  // Let the existing fixed input/authoritative snapshot pipeline drain the in-flight command.
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => Reflect.get(window, "fpsPolishTest").inputs.at(-1).fire)).toBe(
    false,
  );
  const ammo = await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.ammo);
  expect(ammo).toBeLessThan(29);
  expect(ammo).toBeGreaterThan(19);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.ammo)).toBe(
    ammo,
  );
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(150);
  await expect(page.locator(".duel-crosshair")).toHaveClass(/is-reloading/);
  await page.waitForTimeout(1900);
  expect(await page.evaluate(() => Reflect.get(window, "fpsPolishTest").state.players.A.ammo)).toBe(
    30,
  );
  await page.keyboard.press("Escape");
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(false);
  await page.waitForTimeout(1100);
  await canvas.click();
  await expect.poll(() => page.evaluate(() => !!document.pointerLockElement)).toBe(true);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
  await expect(page.locator("canvas")).toHaveCount(0);
});
