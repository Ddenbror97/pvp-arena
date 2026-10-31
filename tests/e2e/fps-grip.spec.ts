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
    const sides = (["L", "R"] as const).map((side) => ({
      gloves: model.root.getObjectByName(`fitted-rifle-gloves-${side}`),
      skin: model.root.getObjectByName(`continuous-rifle-forearms-${side}`),
    }));
    if (sides.some((s) => !s.gloves || !s.skin))
      throw new Error("Fitted hand geometry did not load");
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
    let joined = 0,
      gloveEdgeCount = 0;
    for (const side of sides) {
      const gloveEdges = boundary(side.gloves as Mesh),
        skinEdges = boundary(side.skin as Mesh);
      gloveEdgeCount += gloveEdges.size;
      joined += [...gloveEdges].filter((e) => skinEdges.has(e)).length;
    }
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
    const geometries = sides.flatMap((s) => [
        (s.gloves as Mesh).geometry,
        (s.skin as Mesh).geometry,
      ]),
      originals = geometries.map((g) => Array.from(g.getAttribute("position").array));
    // Sweep the whole keyed reload with bolt kick: rigs move, baked geometry never changes.
    for (const kind of ["tactical", "empty"])
      for (let i = 0; i < 60; i++) model.update(true, i / 60, (i % 6) / 6, kind);
    model.update(true, 0, 0);
    const stable = geometries.every((g, j) =>
      originals[j]!.every((v, i) => v === g.getAttribute("position").array[i]),
    );
    // Baked grips ride their part (magazine / charging handle) and show only while held:
    // [magazine hand, handle hand, handguard support arm].
    const held = model.root.getObjectByName("magazine-grip-hand"),
      racking = model.root.getObjectByName("charging-handle-hand"),
      supportArm = model.root.getObjectByName("support-arm");
    const shown = (p: number, kind: string) => (
      model.update(true, p, 0, kind),
      [held?.visible, racking?.visible, supportArm?.visible]
    );
    const magazineHand = {
      parent: held?.parent?.name,
      handleParent: racking?.parent?.name,
      rest: shown(0, "empty"),
      reloading: shown(0.3, "empty"),
      chambering: shown(0.72, "empty"),
      tacticalReturn: shown(0.72, "tactical"),
      returning: shown(0.85, "empty"),
    };
    model.update(true, 0, 0);
    const seams = model.root.userData.wristSeams;
    const finite = geometries.every((g) =>
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
      gloveEdges: gloveEdgeCount,
      fingers,
      stable,
      finite,
      covers,
      magazineHand,
    };
    model.dispose();
    return data;
  });
  expect(result.loaded).toBe(true);
  expect(result.covers).toEqual([]);
  expect(result.finite).toBe(true);
  expect(result.stable).toBe(true);
  expect(result.magazineHand).toEqual({
    parent: "Magazine",
    handleParent: "ChargingHandle",
    rest: [false, false, true],
    reloading: [true, false, false],
    chambering: [false, true, false],
    tacticalReturn: [false, false, true],
    returning: [false, false, true],
  });
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
