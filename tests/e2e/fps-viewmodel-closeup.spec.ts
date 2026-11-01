import { test } from "@playwright/test";

/**
 * Close-up visual capture of the first-person AK rig in a neutral studio (skipped unless
 * CAPTURE_DIR is set). Same viewmodel module, view lights and 60° viewmodel camera as the game,
 * without the arena, so it boots in seconds and can zoom on the grips:
 *
 *   CAPTURE_DIR=out CAPTURE_PHASES=0,0.2 CAPTURE_KIND=empty CAPTURE_SHOTS=pov,left,right,mag,bolt \
 *     npx playwright test fps-viewmodel-closeup
 */
const out = process.env["CAPTURE_DIR"];
test.skip(!out, "visual capture only runs with CAPTURE_DIR");

test("close-up captures of the first-person AK", async ({ page }) => {
  test.setTimeout(300_000);
  await page.route("**/__fps_closeup__", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body style='margin:0;background:#222'></body></html>",
    }),
  );
  await page.goto("/__fps_closeup__");
  await page.evaluate(
    async (fov) => {
      const T = await import("/node_modules/three/build/three.module.js" as string);
      const { RoomEnvironment } = await import(
        "/node_modules/three/examples/jsm/environments/RoomEnvironment.js" as string
      );
      const { createAuthoredViewmodel } = await import(
        "/src/lib/fps/authored-viewmodel.ts" as string
      );
      const { VIEWMODEL_REST } = await import("/src/lib/fps/renderer.ts" as string);
      const renderer = new T.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(1);
      renderer.setSize(1280, 720);
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      document.body.replaceChildren(renderer.domElement);
      const scene = new T.Scene();
      scene.background = new T.Color("#5d6672");
      const pmrem = new T.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.45;
      // The game's viewmodel lights (renderer.ts).
      const hemi = new T.HemisphereLight(0xe4eaff, 0x392346, 1.8);
      const sun = new T.DirectionalLight(0xffe0c6, 3);
      sun.position.set(-1, 3, 2);
      const rim = new T.DirectionalLight(0xbfd6ff, 1.6);
      rim.position.set(2, 1.4, -2.5);
      const camera = new T.PerspectiveCamera(60, 1280 / 720, 0.01, 8);
      camera.layers.enable(1);
      for (const light of [hemi, sun, rim]) light.layers.enable(1);
      scene.add(hemi, sun, rim, camera);
      const group = new T.Group();
      camera.add(group);
      group.position.set(VIEWMODEL_REST.x, VIEWMODEL_REST.y, VIEWMODEL_REST.z);
      group.rotation.set(VIEWMODEL_REST.pitch, VIEWMODEL_REST.yaw, VIEWMODEL_REST.roll);
      const model = createAuthoredViewmodel(group);
      await model.ready;
      // Zoom shots use a free "eye" at the same spot: the viewmodel is parented to `camera`, so
      // turning that camera would turn the rifle with it.
      const eye = new T.PerspectiveCamera(fov, 1280 / 720, 0.01, 8);
      eye.layers.enable(1);
      scene.add(eye);
      Reflect.set(window, "closeup", { T, renderer, scene, camera, eye, model });
    },
    Number(process.env["CAPTURE_FOV"] ?? 22),
  );
  const phases = (process.env["CAPTURE_PHASES"] ?? "0").split(",").map(Number);
  const shots = (process.env["CAPTURE_SHOTS"] ?? "pov").split(",");
  const kind = process.env["CAPTURE_KIND"] ?? "tactical";
  for (const phase of phases)
    for (const shot of shots) {
      await page.evaluate(
        ({ phase, shot, kind }) => {
          const { T, renderer, scene, camera, eye, model } = Reflect.get(window, "closeup");
          model.update(true, phase, 0, kind);
          scene.updateMatrixWorld(true);
          // Baked hand meshes sit at the rig origin: aim at what they actually cover.
          const focus = (name: string) => {
            const node = model.root.getObjectByName(name);
            let shown = !!node;
            node?.traverseAncestors((a: { visible: boolean }) => (shown &&= a.visible));
            if (!node || !shown || !node.visible) return null;
            return new T.Box3().setFromObject(node).getCenter(new T.Vector3());
          };
          const targets: Record<string, () => unknown> = {
            left: () =>
              focus("magazine-grip-gloves") ??
              focus("charging-handle-gloves") ??
              focus("fitted-rifle-gloves-L"),
            right: () => focus("fitted-rifle-gloves-R"),
            watch: () =>
              focus("magazine-grip-watch-0") ??
              focus("charging-handle-watch-0") ??
              focus("rifle-arm-L-watch-0"),
            mag: () => focus("MagazineGeometry"),
            bolt: () => focus("ChargingHandleGeometry"),
          };
          const orbit = /^(orbit|ring)([LR])(\d)$/.exec(shot);
          if (orbit) {
            // Isolated glove, orbiting: skinning artefacts with nothing in front of them.
            const keep =
              orbit[2] === "L"
                ? ["magazine-grip-gloves", "charging-handle-gloves", "fitted-rifle-gloves-L"]
                : ["fitted-rifle-gloves-R"];
            let glove: { visible: boolean } | undefined;
            const hidden: { visible: boolean }[] = [];
            model.root.traverse((o: { name: string; isMesh?: boolean; visible: boolean }) => {
              if (!o.isMesh) return;
              if (keep.includes(o.name) && !glove) {
                let shown = true;
                (
                  o as unknown as {
                    traverseAncestors: (f: (a: { visible: boolean }) => void) => void;
                  }
                ).traverseAncestors((a) => (shown &&= a.visible));
                if (shown) return void (glove = o);
              }
              if (o.visible && orbit[1] === "orbit") {
                hidden.push(o);
                o.visible = false;
              }
            });
            const box = new T.Box3().setFromObject(glove as never);
            const centre = box.getCenter(new T.Vector3()),
              radius = box.getSize(new T.Vector3()).length();
            const a = (Number(orbit[3]) / 6) * Math.PI * 2;
            eye.position
              .copy(centre)
              .add(
                new T.Vector3(Math.cos(a), 0.35, Math.sin(a))
                  .normalize()
                  .multiplyScalar(radius * (orbit[1] === "ring" ? 1.7 : 0.9)),
              );
            eye.lookAt(centre);
            eye.updateMatrixWorld(true);
            renderer.render(scene, eye);
            for (const o of hidden) o.visible = true;
            return;
          }
          const target = targets[shot]?.();
          if (target) {
            // Zoom from the eye: same perspective as the player, more pixels on the detail.
            eye.position.set(0, 0, 0);
            eye.lookAt(target);
            eye.updateMatrixWorld(true);
            renderer.render(scene, eye);
          } else renderer.render(scene, camera);
        },
        { phase, shot, kind },
      );
      await page.screenshot({
        path: `${out}/${kind}-${String(Math.round(phase * 1000)).padStart(4, "0")}-${shot}.png`,
      });
    }
});
