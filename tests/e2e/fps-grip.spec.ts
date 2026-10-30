import type { Mesh } from "three";
import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";

test("actual AK has welded wrists and a stable wrap grip through recoil and reload", async ({
  page,
}) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const p = "/src/lib/fps/authored-viewmodel.ts",
      t = "/node_modules/three/build/three.module.js";
    const { createAuthoredViewmodel } = await import(p),
      T = await import(t),
      model = createAuthoredViewmodel(new T.Group());
    await model.ready;
    model.root.updateWorldMatrix(true, true);
    const gloves = model.root.getObjectByName("fitted-rifle-gloves"),
      skin = model.root.getObjectByName("continuous-rifle-forearms");
    if (!gloves || !skin) throw new Error("Fitted hand geometry did not load");
    const boundary = (mesh: Mesh) => {
      const g = mesh.geometry,
        p = g.getAttribute("position"),
        counts = new Map<string, number>();
      const key = (i: number) =>
        [p.getX(i), p.getY(i), p.getZ(i)].map((n) => Math.round(n * 1e5)).join(",");
      for (let i = 0; i < (g.index?.count ?? p.count); i += 3) {
        const ids = [0, 1, 2].map((j) => g.index?.getX(i + j) ?? i + j);
        for (let j = 0; j < 3; j++) {
          const a = key(ids[j]!),
            b = key(ids[(j + 1) % 3]!);
          if (a === b) continue;
          const edge = [a, b].sort().join("/");
          counts.set(edge, (counts.get(edge) ?? 0) + 1);
        }
      }
      return new Set([...counts].filter(([, n]) => n === 1).map(([key]) => key));
    };
    const gloveEdges = boundary(gloves as Mesh),
      skinEdges = boundary(skin as Mesh),
      joined = [...gloveEdges].filter((e) => skinEdges.has(e)).length;
    const positions = (name: string) =>
      model.root
        .worldToLocal(model.root.getObjectByName(name)!.getWorldPosition(new T.Vector3()))
        .toArray();
    const fingers = [5, 9, 13, 17].map((base) => {
      const name = (i: number) => `Bone_L${String(i).padStart(3, "0")}`;
      return {
        knuckle: positions(name(base)),
        middle: positions(name(base + 1)),
        tip: positions(name(base + 2) + "_end"),
      };
    });
    const geometry = gloves.geometry,
      skinGeometry = skin.geometry,
      original = Array.from(geometry.getAttribute("position").array),
      skinOriginal = Array.from(skinGeometry.getAttribute("position").array);
    for (let i = 0; i < 60; i++) model.update(true, Math.sin((i / 60) * Math.PI), (i % 6) / 6);
    const stable =
      original.every((v, i) => v === geometry.getAttribute("position").array[i]) &&
      skinOriginal.every((v, i) => v === skinGeometry.getAttribute("position").array[i]);
    const seams = model.root.userData.wristSeams;
    const finite = [geometry, skinGeometry].every((g) =>
      ["position", "normal", "uv"].every((a) =>
        Array.from(g.getAttribute(a).array).every(Number.isFinite),
      ),
    );
    const covers: string[] = [];
    model.root.traverse((o: { name: string }) => {
      if (/cuff/i.test(o.name)) covers.push(o.name);
    });
    const data = {
      loaded: model.loaded,
      seams,
      joined,
      gloveEdges: gloveEdges.size,
      fingers,
      stable,
      finite,
      covers,
    };
    model.dispose();
    return data;
  });
  expect(result.loaded).toBe(true);
  expect(result.covers).toEqual([]);
  expect(result.finite).toBe(true);
  expect(result.stable).toBe(true);
  expect(result.seams).toHaveLength(2);
  for (const seam of result.seams) {
    expect(seam.loops).toBe(1);
    expect(seam.openEdges).toBe(0);
    expect(seam.gap).toBeLessThan(1e-6);
  }
  // Compare independently extracted visible mesh boundaries, not just the fitting metadata.
  expect(result.joined).toBeGreaterThan(100);
  expect(result.joined).toBeGreaterThanOrEqual(result.gloveEdges - 4);
  for (const finger of result.fingers) {
    expect(finger.knuckle[0]).toBeLessThan(-0.035);
    expect(finger.middle[1]).toBeLessThan(-0.03);
    expect(finger.tip[0]).toBeGreaterThan(0.01);
  }
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
