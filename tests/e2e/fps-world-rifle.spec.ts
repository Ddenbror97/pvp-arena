import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
test("world AK and M4 keep only the rifle with attached character hands at close range", async ({
  page,
}) => {
  await fixture(page);
  for (const seat of ["A", "B"]) {
    const result = await page.evaluate(async (seat) => {
      Reflect.get(window, "fpsPolishTest").dispose();
      Reflect.get(window, "worldRifleTest")?.dispose();
      const T = await import("/node_modules/three/build/three.module.js" as string);
      const { createCharacter } = await import("/src/lib/fps/character.ts" as string);
      const { createWeaponKit } = await import("/src/lib/fps/weapon.ts" as string);
      const kit = createWeaponKit(),
        actor = createCharacter(seat, null, kit);
      await actor.ready;
      const fingers: Array<{
        bone: { quaternion: { angleTo: (q: unknown) => number } };
        q: unknown;
      }> = [];
      actor.root.traverse(
        (o: { isBone?: boolean; name: string; quaternion: { clone: () => unknown } }) => {
          if (
            o.isBone &&
            /Hand(Index|Middle|Ring|Pinky|Thumb)[123]$|arm_(left|right)_finger_[123][abc]$/.test(
              o.name,
            )
          )
            fingers.push({ bone: o as never, q: o.quaternion.clone() });
        },
      );
      actor.update(16, 1000, 0, true);
      actor.root.updateMatrixWorld(true);
      let maxGripGap = 0;
      for (const crouch of [false, true])
        for (const pitch of [-0.45, 0, 0.45])
          for (const reload of [false, true]) {
            actor.update(16, 1100, pitch, true, crouch, { reloading: reload });
            actor.root.updateMatrixWorld(true);
            for (const side of ["Left", "Right"]) {
              const hand = actor.root.getObjectByName(side + "Hand");
              const grip = actor.root.getObjectByName(side === "Left" ? "GripL" : "GripR");
              maxGripGap = Math.max(
                maxGripGap,
                hand
                  .getWorldPosition(new T.Vector3())
                  .distanceTo(grip.getWorldPosition(new T.Vector3())),
              );
            }
          }
      actor.update(16, 1200, 0, true, false);
      actor.root.updateMatrixWorld(true);
      const scene = new T.Scene();
      scene.background = new T.Color(0x26323e);
      scene.add(actor.root, new T.HemisphereLight(0xeaf4ff, 0x65656c, 3));
      const light = new T.DirectionalLight(0xffffff, 3);
      light.position.set(-2, 4, -3);
      scene.add(light);
      const camera = new T.PerspectiveCamera(60, 1280 / 720, 0.03, 50);
      camera.position.set(-0.55, 1.3, -1.15);
      camera.lookAt(0, 1.15, -0.1);
      const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(1280, 720);
      renderer.setPixelRatio(1);
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.render(scene, camera);
      document.body.replaceChildren(renderer.domElement);
      const weapon = actor.root.getObjectByName("authored-first-person");
      const box = new T.Box3().setFromObject(weapon, true),
        size = box.getSize(new T.Vector3());
      Reflect.set(window, "worldRifleTest", {
        dispose: () => {
          actor.dispose();
          kit.dispose();
          renderer.dispose();
        },
      });
      return {
        maxGripGap,
        curledJoints: fingers.filter((f) => f.bone.quaternion.angleTo(f.q) > 0.2).length,
        size: size.toArray(),
        detached: ["FPArms", "FPAccessories", "FPRig"].filter((n) => !!weapon.getObjectByName(n)),
      };
    }, seat);
    expect(result.detached).toEqual([]);
    expect(result.maxGripGap).toBeLessThan(0.13);
    expect(result.curledJoints).toBeGreaterThanOrEqual(12);
    expect(result.size.every((n) => Number.isFinite(n) && n > 0 && n < 2)).toBe(true);
    await page.screenshot({ path: "test-results/fps-close-world-" + seat + ".png" });
  }
  await page.evaluate(() => Reflect.get(window, "worldRifleTest").dispose());
});
