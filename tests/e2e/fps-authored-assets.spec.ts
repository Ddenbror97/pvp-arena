import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("authored viewmodel loads fitted hands, skin and the realistic AK finish", async ({
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
    const finishes = new Set<string>();
    model.root.traverse(
      (object: { material?: { name: string; customProgramCacheKey: () => string } }) => {
        const key = object.material?.customProgramCacheKey?.();
        if (key?.startsWith("ak-finish")) finishes.add(object.material!.name);
      },
    );
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
    const result = {
      loaded: model.loaded,
      meshes,
      finishes: [...finishes].sort(),
      muzzle: model.muzzle().toArray(),
    };
    model.dispose();
    return result;
  });
  expect(result.loaded).toBe(true);
  expect(result.meshes.some((mesh) => mesh.name === "continuous-rifle-forearms-L")).toBe(true);
  // Realistic AKM: steel, laminated wood and a steel magazine; no arena branding on the rifle.
  expect(result.meshes.some((mesh) => mesh.name === "pvp-receiver-decal")).toBe(false);
  expect(result.finishes).toEqual(
    expect.arrayContaining([
      "AK47BakeliteMagazine",
      "AK47BluedReceiverSteel",
      "AK47LaminatedWoodPBR",
      "AK47PhosphateSteel",
    ]),
  );
  expect(failed).toEqual([]);
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
