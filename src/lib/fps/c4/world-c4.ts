import * as THREE from "three";
import { cloneAuthoredModel, retainAuthoredAsset } from "../authored-assets";
import { BOMB_MODELS } from "../model-assets";
import { createC4Screen } from "./c4-screen";

/** World size of the dropped / planted C4 relative to the real-size model (readable at range). */
export const WORLD_C4_SCALE = 1.6;

/**
 * The C4 in the world (dropped or planted): the same model as the first-person plant, lying on
 * its back with the keypad up and the LCD end pointing along -z. Its origin is the back-face
 * centre, so it sits on the ground at the room's bomb position. The armed LEDs blink with the
 * renderer's bomb timer and the LCD shows the armed readout.
 */
export function createWorldC4() {
  const asset = retainAuthoredAsset(BOMB_MODELS.c4);
  const root = new THREE.Group();
  root.name = "world-c4";
  const screen = createC4Screen();
  let instance: ReturnType<typeof cloneAuthoredModel> | undefined,
    model: THREE.Object3D | null = null,
    leds: THREE.Object3D | null = null,
    stopped = false;
  const ready = asset.ready
    .then((gltf) => {
      if (stopped) return;
      instance = cloneAuthoredModel(gltf.scene);
      model = instance.root.getObjectByName("C4")!;
      model.removeFromParent();
      // Keep only the meshes (the control rig's markers stay behind).
      for (const child of [...model!.children])
        if (!child.name.startsWith("C4_")) child.removeFromParent();
      model.position.set(0, 0, 0);
      model.quaternion.identity();
      model.rotation.x = -Math.PI / 2;
      model.scale.setScalar(WORLD_C4_SCALE);
      root.add(model);
      model.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.name === "C4_Screen" || o.parent?.name === "C4_Screen") o.material = screen.material;
      });
      leds = model.getObjectByName("C4_LedsOn") ?? null;
      screen.paint({ mode: "armed", digits: 7, length: 7 }, true);
    })
    .catch((error) => console.warn("World C4 unavailable.", error));
  return {
    root,
    ready,
    /** The device's world matrix (device space → world), or null before load: the defuse
     * presentation puts its first-person copy exactly there. */
    deviceMatrix(out: THREE.Matrix4) {
      if (!model) return null;
      model.updateWorldMatrix(true, false);
      return out.copy(model.matrixWorld);
    },
    /** Armed LED state (the renderer blinks it faster as the timer runs down). */
    setLit(on: boolean, armed: boolean) {
      if (leds) leds.visible = on;
      screen.paint({ mode: armed ? "armed" : "off", digits: 7, length: 7 }, on);
    },
    dispose() {
      stopped = true;
      root.removeFromParent();
      instance?.dispose();
      screen.dispose();
      asset.release();
    },
  };
}
