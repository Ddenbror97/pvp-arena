import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

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
