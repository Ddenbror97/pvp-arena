import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("barrel flash stays at the muzzle and expires between shots", async ({ page }) => {
  await fixture(page);
  const flash = await page.evaluate(async () => {
    const flashPath = "/src/lib/fps/muzzle-flash.ts",
      weaponPath = "/src/lib/fps/weapon.ts";
    const { createMuzzleFlash } = await import(flashPath),
      { AK_MUZZLE } = await import(weaponPath);
    const effect = createMuzzleFlash();
    const idle = effect.root.visible;
    effect.update(28, AK_MUZZLE.z, AK_MUZZLE.y, 1);
    const shot = {
      visible: effect.root.visible,
      z: effect.root.position.z,
      y: effect.root.position.y,
      opacity: effect.root.children[0].material.opacity,
    };
    effect.update(7, AK_MUZZLE.z, AK_MUZZLE.y, 1);
    const fading = effect.root.children[0].material.opacity;
    effect.update(-1, AK_MUZZLE.z, AK_MUZZLE.y, 1);
    const expired = effect.root.visible;
    effect.root.traverse((object: { geometry?: { dispose: () => void } }) =>
      object.geometry?.dispose(),
    );
    effect.root.children[0].material.dispose();
    effect.dispose();
    return { idle, shot, fading, expired, barrel: AK_MUZZLE };
  });
  expect(flash.idle).toBe(false);
  expect(flash.shot.visible).toBe(true);
  expect(flash.shot.y).toBe(flash.barrel.y);
  expect(flash.shot.z).toBeCloseTo(flash.barrel.z - 0.008);
  expect(flash.fading).toBeLessThan(flash.shot.opacity);
  expect(flash.expired).toBe(false);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});

test("the AK uses the supplied image on volumetric furniture, with real sight apertures", async ({
  page,
}) => {
  await fixture(page);
  const model = await page.evaluate(async () => {
    const modulePath = "/src/lib/fps/weapon.ts";
    const { createWeaponKit } = await import(modulePath),
      kit = createWeaponKit(),
      rifle = kit.rifle();
    const receiver = rifle.getObjectByName("receiver"),
      magazine = rifle.getObjectByName("curved-magazine");
    for (let wait = 0; wait < 50 && !receiver.material[0].map.image?.naturalWidth; wait++)
      await new Promise((resolve) => setTimeout(resolve, 50));
    receiver.geometry.computeBoundingBox();
    magazine.geometry.computeBoundingBox();
    const uv = receiver.geometry.getAttribute("uv");
    const image = receiver.material[0].map.image;
    const result = {
      source: image.src,
      width: image.naturalWidth,
      height: image.naturalHeight,
      thickness: receiver.geometry.boundingBox.max.x - receiver.geometry.boundingBox.min.x,
      magazineDepth: magazine.geometry.boundingBox.max.y - magazine.geometry.boundingBox.min.y,
      sightHoles: rifle.getObjectByName("front-sight").geometry.parameters.shapes.holes.length,
      uvMin: Math.min(...uv.array),
      uvMax: Math.max(...uv.array),
    };
    rifle.traverse((object: { geometry?: { dispose: () => void } }) => object.geometry?.dispose());
    kit.dispose();
    return result;
  });
  expect(model.source).toContain("/fps/rifle-reference.png");
  expect(model.width).toBe(1983);
  expect(model.height).toBe(793);
  expect(model.thickness).toBeGreaterThan(0.06);
  expect(model.magazineDepth).toBeGreaterThan(0.19);
  expect(model.sightHoles).toBe(2);
  expect(model.uvMin).toBeGreaterThanOrEqual(0);
  expect(model.uvMax).toBeLessThanOrEqual(1);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
