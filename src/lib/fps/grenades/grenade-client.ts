import * as THREE from "three";
import type { ViewmodelVariant } from "../authored-viewmodel";
import type { Vector } from "../collision";
import type { GameMap } from "../maps/types";
import type { GrenadeCue } from "../audio";
import { throwStart } from "./physics";
import { nextGrenadeType, type GrenadeInventory, type GrenadeType } from "./rules";
import { LocalGrenadeHands, type GrenadeView } from "./grenade-timeline";
import { createGrenadeViewmodel, type GrenadeViewmodel } from "./grenade-viewmodel";
import { createGrenadeWorldView } from "./grenade-world-view";
import type { Detonation, Projectile, PublicGrenadeWorld } from "./world";

/**
 * Everything a match renderer needs for grenades, shared by the 1v1 and Bomb Defusal renderers:
 * the local player's hands (predicted from their own buttons with the server's rules, on the
 * team's own arms), the predicted flight of their own throw, and the world view (every flight,
 * cloud, fire and blast, from the server's snapshots and events). Cosmetic only.
 */
export type GrenadeEvent = {
  type: string;
  nade?: GrenadeType;
  projectile?: Projectile;
  detonation?: Detonation;
};
export type GrenadeTeam = "police" | "terrorist";

export function createGrenadeClient(options: {
  scene: THREE.Scene;
  /** The first-person camera (viewmodel layer); the hands are its children. */
  viewCamera: THREE.PerspectiveCamera;
  map: GameMap;
  variants: Record<GrenadeTeam, ViewmodelVariant>;
  sound?: (cue: GrenadeCue, options: { gain?: number; bearing?: number }) => void;
}) {
  const hands = new LocalGrenadeHands();
  const views: Record<GrenadeTeam, GrenadeViewmodel> = {
    police: createGrenadeViewmodel(options.viewCamera, options.variants.police),
    terrorist: createGrenadeViewmodel(options.viewCamera, options.variants.terrorist),
  };
  let team: GrenadeTeam = "terrorist";
  const world = createGrenadeWorldView(options.scene, options.map);
  let predictedId = -1;
  const handPoint = new THREE.Vector3();
  for (const view of Object.values(views))
    view.onCue = (cue) => {
      if (cue === "pin-grab" || cue === "pin-out") {
        if (cue === "pin-out") options.sound?.("pin", {});
      } else if (cue === "release") options.sound?.("throw", {});
      else if (cue === "draw") options.sound?.("draw", {});
    };
  let back: "rifle" | "knife" | "sidearm" = "rifle";
  let cameraForMapping: THREE.PerspectiveCamera | null = null;
  let bedClock = 0,
    bedTurn = 0;
  return {
    hands,
    world,
    ready: Promise.all([views.police.ready, views.terrorist.ready, world.ready]).then(() => {}),
    get loaded() {
      return views.police.loaded && views.terrorist.loaded && world.loaded;
    },
    setTeam(next: GrenadeTeam) {
      if (next === team) return;
      views[team].update(0, { kind: "hidden" });
      team = next;
    },
    /** The grenade slot is up (the rifle / knife views hide). */
    get up() {
      return hands.type !== null;
    },
    /** The weapon to go back to after a throw. */
    get back() {
      return back;
    },
    /**
     * Key 4: draw the first carried grenade, or the next carried type when one is already up.
     * Returns the type now drawn, or null (none carried, or a throw in progress).
     */
    select(
      current: "rifle" | "knife" | "grenade" | "sidearm",
      inventory: GrenadeInventory | undefined,
      now: number,
    ) {
      if (hands.busy) return null;
      const type = nextGrenadeType(
        inventory,
        current === "grenade" ? (hands.type ?? undefined) : undefined,
      );
      if (!type || (current === "grenade" && type === hands.type)) return null;
      if (current !== "grenade") back = current;
      hands.equip(type, now);
      return type;
    },
    /** Wheel selection shares the same ownership and throw lock as the number keys. */
    draw(
      type: GrenadeType,
      current: "rifle" | "knife" | "grenade" | "sidearm",
      inventory: GrenadeInventory | undefined,
      now: number,
    ) {
      if (hands.busy || !(inventory?.[type] ?? 0)) return false;
      if (current !== "grenade") back = current;
      hands.equip(type, now);
      return true;
    },
    /** Show both teams' hands for a shader compile at load (they are hidden until 4). */
    prepareCompile(on: boolean) {
      for (const vm of Object.values(views))
        vm.update(0, on ? { kind: "ready", type: "he", t: 0, move: 0 } : { kind: "hidden" });
    },
    /** Put the grenade away (another weapon drawn, death, a new round). */
    putAway() {
      hands.clear();
    },
    /**
     * One input tick of the local player's hands (on the input clock). When the grenade leaves
     * the hand, its flight is predicted from the same eye, aim and velocity the server will use.
     * Returns "done" when the previous weapon should be drawn.
     */
    tick(input: {
      fire: boolean;
      alt: boolean;
      now: number;
      serverNow: number;
      airborne: boolean;
      eye: Vector;
      yaw: number;
      pitch: number;
      velocity: Vector;
    }) {
      const result = hands.step(input.fire, input.alt, input.now, input.airborne);
      if (result === "spawn" && hands.type && hands.throwing) {
        const kind = hands.throwing.kind;
        const start = throwStart(
          input.eye,
          input.yaw,
          input.pitch,
          input.velocity,
          kind,
          options.map,
        );
        const projectile: Projectile = {
          id: predictedId--,
          type: hands.type,
          owner: -1,
          kind,
          at: input.serverNow,
          o: [start.origin.x, start.origin.y, start.origin.z],
          v: [start.velocity.x, start.velocity.y, start.velocity.z],
        };
        world.predict(projectile, views[team].grenadeWorld(handPoint) ? toWorld(handPoint) : null);
      }
      return result === "done" ? "done" : null;
    },
    /** Server events (any order, each once): throws and detonations. */
    event(e: GrenadeEvent, own: boolean, serverNow: number, listener: Vector | null) {
      if (e.type === "nade-throw" && e.projectile) world.adopt(e.projectile, own, serverNow);
      else if (e.type === "nade-detonate" && e.detonation)
        world.detonate(e.detonation, serverNow, listener);
    },
    /**
     * Draw a frame: the hands (local clock), the world (server clock), and the world's sounds
     * relative to the listener. `move` 0 standing, 1 walking, 2 sprinting.
     */
    frame(input: {
      dt: number;
      now: number;
      serverNow: number;
      world: PublicGrenadeWorld | undefined;
      owner?: number | null;
      presentation?: GrenadeView;
      camera: THREE.PerspectiveCamera;
      move: number;
      alive: boolean;
      listener: Vector & { yaw: number };
    }) {
      const view =
        input.presentation ??
        (input.alive ? hands.view(input.now, input.move) : ({ kind: "hidden" } as const));
      for (const [key, vm] of Object.entries(views) as [GrenadeTeam, GrenadeViewmodel][])
        vm.update(input.dt / 1000, key === team ? view : { kind: "hidden" });
      world.update(input.serverNow, input.world, input.camera, input.dt / 1000, input.owner);
      cameraForMapping = input.camera;
      for (const s of world.drainSounds()) {
        const dx = s.at.x - input.listener.x,
          dy = s.at.y - input.listener.y,
          dz = s.at.z - input.listener.z;
        const d = Math.hypot(dx, dy, dz);
        const range = s.kind === "he" ? 120 : s.kind === "smoke" || s.kind === "fire" ? 60 : 35;
        const gain = Math.pow(Math.max(0, 1 - d / range), 1.3);
        if (gain <= 0.01) continue;
        options.sound?.(s.kind as GrenadeCue, {
          gain,
          ...(d > 0.5 ? { bearing: Math.atan2(dx, -dz) } : {}),
        });
      }
      // Beds: the smoke's hiss and the fire's crackle while near (repeated, they overlap into one).
      bedClock += input.dt / 1000;
      if (bedClock > 1.3) {
        bedClock = 0;
        const near = (x: number, y: number, z: number, range: number) => {
          const d = Math.hypot(x - input.listener.x, y - input.listener.y, z - input.listener.z);
          return {
            gain: Math.pow(Math.max(0, 1 - d / range), 1.5),
            bearing: Math.atan2(x - input.listener.x, -(z - input.listener.z)),
          };
        };
        for (const smoke of input.world?.smokes ?? []) {
          const age = input.serverNow - smoke.at;
          if (age < 0 || age > 15_000 || bedTurn++ % 2) continue;
          const h = near(smoke.puffs[0]!, smoke.puffs[1]!, smoke.puffs[2]!, 25);
          if (h.gain > 0.02) options.sound?.("smoke-hiss", h);
        }
        for (const fire of input.world?.fires ?? []) {
          const age = input.serverNow - fire.at;
          if (age < 0 || age > 6500) continue;
          const h = near(fire.cells[0]!, fire.cells[1]!, fire.cells[2]!, 25);
          if (h.gain > 0.02) options.sound?.("fire-crackle", h);
        }
      }
    },
    /** Camera shake (0–1) from nearby HE blasts. */
    get shake() {
      return world.shake;
    },
    reset() {
      hands.clear();
      world.reset();
    },
    dispose() {
      for (const view of Object.values(views)) view.dispose();
      world.dispose();
    },
  };

  /** A point drawn by the viewmodel camera (60°) to where the world camera draws it. */
  function toWorld(point: THREE.Vector3) {
    const camera = cameraForMapping;
    if (!camera) return null;
    const local = options.viewCamera.worldToLocal(point.clone());
    const k =
      Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) /
      Math.tan(THREE.MathUtils.degToRad(options.viewCamera.fov / 2));
    local.x *= k;
    local.y *= k;
    camera.updateMatrixWorld();
    return camera.localToWorld(local);
  }
}
