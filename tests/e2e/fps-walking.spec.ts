import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { fixture } from "./helpers/fps-fixture";
import type { Bone } from "three";

test("authored walking stays grounded with alternating strides in both roles and directions", async ({
  page,
}) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const c = "/src/lib/fps/character.ts",
      w = "/src/lib/fps/weapon.ts",
      t = "/node_modules/three/build/three.module.js";
    const { createCharacter } = await import(c),
      { createWeaponKit } = await import(w),
      T = await import(t),
      kit = createWeaponKit(),
      rows = [];
    for (const seat of ["A", "B"]) {
      const actor = createCharacter(seat, null, kit);
      await actor.ready;
      if (!actor.loaded) throw new Error("Authored rig missing");
      const bones = new Map<string, Bone>();
      actor.root.traverse((o: Bone) => {
        if (o.isBone) bones.set(o.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, ""), o);
      });
      const get = (name: string) =>
        actor.root.worldToLocal(bones.get(name)!.getWorldPosition(new T.Vector3()));
      for (const yaw of [0, Math.PI / 2, Math.PI])
        for (const [name, x, z, crouched] of [
          ["forward", 0, -1, false],
          ["back", 0, 1, false],
          ["left", -1, 0, false],
          ["right", 1, 0, false],
          ["crouch", 0, -1, true],
        ] as const) {
          actor.root.position.set(0, 0, 0);
          actor.root.rotation.y = yaw;
          for (let i = 0; i < 20; i++) actor.update(33.333, i * 33.333, 0, true, crouched);
          const samples = [];
          for (let i = 0; i < 70; i++) {
            const speed = crouched ? 2.4 : 5,
              dx = ((x * Math.cos(yaw) + z * Math.sin(yaw)) * speed) / 30,
              dz = ((-x * Math.sin(yaw) + z * Math.cos(yaw)) * speed) / 30;
            actor.root.position.x += dx;
            actor.root.position.z += dz;
            actor.update(33.333, 1000 + i * 33.333, 0, true, crouched);
            actor.root.updateWorldMatrix(true, true);
            samples.push({
              left: get("LeftFoot").toArray(),
              right: get("RightFoot").toArray(),
              leftToe: get("LeftToeBase").toArray(),
              rightToe: get("RightToeBase").toArray(),
            });
          }
          rows.push({ seat, yaw, name, samples });
        }
      actor.dispose();
    }
    kit.dispose();
    return rows;
  });
  await writeFile("test-results/fps-walking-audit.json", JSON.stringify(result, null, 2));
  for (const row of result) {
    const samples = row.samples;
    for (const s of samples)
      for (const p of [s.left, s.right, s.leftToe, s.rightToe]) {
        expect(p.every(Number.isFinite), `${row.seat} ${row.name} finite joints`).toBe(true);
        expect(p[1], `${row.seat} ${row.name} foot/toe above ground`).toBeGreaterThanOrEqual(
          -0.015,
        );
      }
    const left = samples.map((s) => s.left[1]),
      right = samples.map((s) => s.right[1]);
    expect(
      Math.max(...left) - Math.min(...left),
      `${row.seat} ${row.name} left steps`,
    ).toBeGreaterThan(0.02);
    expect(
      Math.max(...right) - Math.min(...right),
      `${row.seat} ${row.name} right steps`,
    ).toBeGreaterThan(0.02);
    expect(
      samples.filter((s) => s.left[1] > 0.14 && s.right[1] > 0.14).length,
      "walking must not float both feet",
    ).toBeLessThan(5);
  }
  await page.evaluate(() => Reflect.get(window, "fpsPolishTest").dispose());
});
