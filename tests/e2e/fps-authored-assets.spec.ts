import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("authored viewmodel loads its fitted hand geometry, skin and clipped PVP branding", async ({
  page,
}) => {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().includes("/fps/")) failed.push(response.url());
  });
  await fixture(page);
  const result = await page.evaluate(async () => {
    const p = "/src/lib/fps/authored-viewmodel.ts",
      t = "/node_modules/three/build/three.module.js";
    const { createAuthoredViewmodel } = await import(p),
      T = await import(t),
      parent = new T.Group(),
      model = createAuthoredViewmodel(parent);
    await model.ready;
    const meshes: { name: string; vertices: number }[] = [];
    model.root.traverse(
      (object: {
        name: string;
        isMesh?: boolean;
        geometry?: { getAttribute: (name: string) => { count: number } };
      }) => {
        if (object.isMesh)
          meshes.push({
            name: object.name,
            vertices: object.geometry!.getAttribute("position").count,
          });
      },
    );
    const result = { loaded: model.loaded, meshes, muzzle: model.muzzle().toArray() };
    model.dispose();
    return result;
  });
  expect(result.loaded).toBe(true);
  expect(result.meshes.some((mesh) => mesh.name === "continuous-rifle-forearms")).toBe(true);
  expect(
    result.meshes
      .filter((mesh) => mesh.name === "pvp-receiver-decal")
      .some((mesh) => mesh.vertices > 0),
  ).toBe(true);
  expect(failed).toEqual([]);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
