import { test, expect } from "@playwright/test";
import { fixture } from "./helpers/fps-fixture";
import type { Mesh, MeshStandardMaterial } from "three";

test("both authored heads keep skin detail and their team headgear", async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.evaluate(() => {
    const f = Reflect.get(window, "fpsPolishTest");
    Object.assign(f.state.players.A, { x: 9, z: 2, yaw: 0, pitch: 0 });
    Object.assign(f.state.players.B, { x: 9, z: 0, yaw: Math.PI, pitch: 0 });
    f.state.round++;
    f.resetView();
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "test-results/fps-head-ingame.png",
    clip: { x: 375, y: 315, width: 250, height: 330 },
  });
  const result = await page.evaluate(async () => {
    Reflect.get(window, "fpsPolishTest").dispose();
    const c = "/src/lib/fps/character.ts",
      w = "/src/lib/fps/weapon.ts",
      t = "/node_modules/three/build/three.module.js";
    const { createCharacter } = await import(c),
      { createWeaponKit } = await import(w),
      T = await import(t);
    const kit = createWeaponKit(),
      scene = new T.Scene(),
      renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(1000, 900);
    renderer.setPixelRatio(1);
    scene.background = new T.Color("#303742");
    scene.add(new T.HemisphereLight(0xfff5ea, 0x455169, 3));
    const sun = new T.DirectionalLight(0xfff1dc, 2.5);
    sun.position.set(-2, 4, -3);
    scene.add(sun);
    const camera = new T.PerspectiveCamera(35, 1000 / 900, 0.01, 100);
    camera.position.set(0.32, 1.67, -0.9);
    camera.lookAt(0, 1.59, 0);
    document.body.replaceChildren(renderer.domElement);
    const actors = [],
      results = [];
    for (const seat of ["A", "B"]) {
      const actor = createCharacter(seat, null, kit);
      await actor.ready;
      actor.update(16, 1000, 0, true);
      scene.add(actor.root);
      actors.push(actor);
      actor.root.visible = false;
      const face = actor.root.getObjectByName("Drew_|_anatomical_body") as Mesh;
      // GLTFLoader sanitizes names; use the original skin material to identify the face mesh.
      let skin: MeshStandardMaterial | undefined;
      let faceMesh: Mesh | undefined;
      actor.root.traverse((o: Mesh) => {
        if (o.isMesh) {
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            if (m.name.endsWith(".body")) {
              skin = m as MeshStandardMaterial;
              faceMesh = o;
            }
        }
      });
      // Police: authored helmet, headset and wrap eyewear ride on the fitted head.
      const glasses = actor.root.getObjectByName("eyewear-lens");
      const bounds = glasses ? new T.Box3().setFromObject(glasses) : undefined;
      let underHead = false;
      glasses?.traverseAncestors((o: { name: string }) => {
        if (o.name === "reference-headgear") underHead = true;
      });
      const scarf = actor.root.getObjectByName("fitted-shemagh-wrap") as Mesh | undefined;
      const balaclava = actor.root.getObjectByName("fitted-balaclava") as Mesh | undefined;
      actor.root.updateWorldMatrix(true, true);
      const mask = actor.root.getObjectByName("fitted-shemagh-wrap"),
        head = actor.root.getObjectByName("reference-headgear");
      const maskClearance = mask
        ? [-0.02, -0.06, -0.1].map((y) => {
            const ray = new T.Raycaster(
              head.localToWorld(new T.Vector3(0, y, -1)),
              new T.Vector3(0, 0, 1).transformDirection(head.matrixWorld),
            );
            return (
              ray.intersectObject(faceMesh!, false)[0]?.distance -
              ray.intersectObject(mask, false)[0]?.distance
            );
          })
        : [1];
      results.push({
        seat,
        loaded: actor.loaded,
        skinMap: !!skin?.map,
        maskClearance,
        glassWidth: bounds ? bounds.max.x - bounds.min.x : 0,
        underHead,
        helmet: !!actor.root.getObjectByName("helmet"),
        legacyCap: !!actor.root.getObjectByName("fitted-police-cap"),
        // The balaclava covers the crown and ears; the eye slit keeps the eyes visible.
        covered:
          seat === "B" ? !!balaclava && !actor.root.getObjectByName("fitted-scarf-hood") : true,
        scarfRepeats: scarf
          ? (scarf.material as MeshStandardMaterial).map?.wrapS === T.RepeatWrapping
          : true,
      });
    }
    Reflect.set(window, "headGallery", { actors, scene, camera, renderer, kit });
    return results;
  });
  for (let i = 0; i < 2; i++) {
    await page.evaluate((i) => {
      const g = Reflect.get(window, "headGallery");
      g.actors.forEach(
        (a: { root: { visible: boolean } }, j: number) => (a.root.visible = j === i),
      );
      g.renderer.render(g.scene, g.camera);
    }, i);
    await page.screenshot({ path: `test-results/fps-head-${i === 0 ? "police" : "fighter"}.png` });
  }
  for (const r of result) {
    expect(r.loaded).toBe(true);
    for (const clearance of r.maskClearance)
      expect(clearance, "cloth must sit outside the nose, lips and chin").toBeGreaterThan(0.001);
    expect(r.skinMap).toBe(true);
    expect(r.legacyCap).toBe(false);
    if (r.seat === "A") {
      expect(r.helmet).toBe(true);
      expect(r.underHead, "eyewear follows the fitted head").toBe(true);
      // Wraps the face: wider than the eye pair, narrower than the head.
      expect(r.glassWidth).toBeGreaterThan(0.14);
      expect(r.glassWidth).toBeLessThan(0.21);
    } else {
      expect(r.helmet).toBe(false);
      expect(r.glassWidth).toBe(0);
    }
    expect(r.scarfRepeats).toBe(true);
    expect(r.covered).toBe(true);
  }
  await page.evaluate(() => {
    const g = Reflect.get(window, "headGallery");
    g.actors.forEach((a: { dispose: () => void }) => a.dispose());
    g.kit.dispose();
    g.renderer.dispose();
  });
});
