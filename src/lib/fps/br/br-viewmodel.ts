import { alignedSightPosition } from "./sight-alignment";
import type { GrenadeCue } from "../grenades/grenade-audio";
import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  AK_VIEWMODEL,
  AWP_POLICE_VIEWMODEL,
  createAuthoredViewmodel,
  M4_VIEWMODEL,
} from "../authored-viewmodel";
import { AWP_VIEWMODEL_REST, boltPose, RELOAD_BOLT, SHOT_BOLT } from "../awp-animation";
import { createGrenadeViewmodel } from "../grenades/grenade-viewmodel";
import { createKarambitViewmodel } from "../karambit-viewmodel";
import type { GrenadeView } from "../grenades/grenade-timeline";
import { createMuzzleFlash } from "../muzzle-flash";
import { createViewmodelMotion } from "../viewmodel-motion";
import {
  findMount,
  fitAttachments,
  loadAttachmentParts,
  type AttachmentMount,
  type AttachmentParts,
} from "./attachment-fit";
import type { Gun } from "./inventory";
import { ITEMS, type OpticDef, type WeaponDef } from "./items";

/**
 * First-person guns for the battle royale: the 1v1/5v5 authored AK-47, M4 and AWP (arms, reload
 * and bolt clips, sway), drawn in their own pass like the arena renderer, plus the owner's
 * attachments (art/blender/br/build_attachments.mjs): any optic sits on the gun's top rail
 * (AK rail adapter; M4 carry handle removed; AWP scope removed) and any muzzle device on the
 * barrel, so every accessory fits every gun. The M4 is unsuppressed unless it carries the
 * Silencer, which then shows as its own suppressor.
 *
 * Aiming (right mouse): the gun slides so the optic's reticle sits on the screen centre and the
 * world camera zooms by the optic's magnification; magnified scopes (4× and above) and the AWP's
 * own scope switch to a full-screen scope view instead (the page draws the reticle).
 *
 * With no gun drawn the Karambit is in the hand (both hands, the 1v1/5v5 clips, F inspects).
 */
type Variant = "ak47" | "m4" | "awp";
const REST = {
  // renderer.ts VIEWMODEL_REST / M4_VIEWMODEL_REST and awp-animation.ts AWP_VIEWMODEL_REST.
  ak47: { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 },
  m4: { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 },
  awp: AWP_VIEWMODEL_REST,
};
/** Optic magnification from which aiming switches to the full-screen scope view. */
export const SCOPE_VIEW_ZOOM = 3;
const AIM_MS = 160;
/** Eye to a reflex sight's reticle when aimed (metres; irons and rails: 0.2). */
const SIGHT_EYE_M = 0.13;

export function createBrViewmodel(renderer: THREE.WebGLRenderer, loader: GLTFLoader, base: string) {
  const viewScene = new THREE.Scene();
  const viewCamera = new THREE.PerspectiveCamera(60, 1, 0.01, 8);
  // The authored viewmodels draw on layer 1 (arena renderer convention); attachments on 0.
  viewCamera.layers.enable(1);
  viewScene.add(viewCamera);
  viewScene.add(new THREE.HemisphereLight(0xe4eaff, 0x40382c, 1.9));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.6);
  key.position.set(-1, 2, 1);
  viewScene.add(key);
  const group = new THREE.Group();
  viewCamera.add(group);
  const views = {
    ak47: createAuthoredViewmodel(group, true, AK_VIEWMODEL),
    m4: createAuthoredViewmodel(group, true, M4_VIEWMODEL),
    awp: createAuthoredViewmodel(group, true, AWP_POLICE_VIEWMODEL),
  };
  const flash = createMuzzleFlash();
  group.add(flash.root);
  flash.root.visible = false;
  const motion = createViewmodelMotion();
  // Attachments: one template per mesh name, cloned onto each gun as needed.
  let parts: AttachmentParts = new Map();
  const url = (p: string) => new URL(p.replace(/^\//, ""), base).href;
  const attachmentsReady = loadAttachmentParts(loader, url("/fps/br/models/attachments.glb")).then(
    (p) => {
      parts = p;
    },
  );
  // Grenades in hand: the 1v1/5v5 first-person grenade arms and clips (police sleeves, like
  // the player's own character), driven by the same local handling (LocalGrenadeHands).
  const nadeHands = createGrenadeViewmodel(viewCamera, M4_VIEWMODEL);
  let handsUp = false;
  // The Karambit (always carried; in the hand whenever no gun is drawn): the 1v1/5v5 two-hand
  // first-person knife and its Blender clips, on the same police sleeves as the grenades.
  const knifeGroup = new THREE.Group();
  viewCamera.add(knifeGroup);
  const knife = createKarambitViewmodel(knifeGroup, M4_VIEWMODEL);
  let knifeUp = false;
  let knifeCue: ((cue: string) => void) | null = null;
  void knife.ready.then(() => {
    if (knife.animator) knife.animator.onCue = (cue) => knifeCue?.(cue);
  });
  const ready = Promise.all([
    ...Object.values(views).map((v) => v.ready),
    attachmentsReady,
    nadeHands.ready,
    knife.ready,
  ]).then(() => {
    viewScene.updateMatrixWorld(true);
    viewScene.matrixWorldAutoUpdate = false;
  });

  const mounts = new Map<Variant, AttachmentMount>();
  function mountFor(id: Variant): AttachmentMount | null {
    const cached = mounts.get(id);
    if (cached) return cached;
    const view = views[id];
    if (!view.loaded) return null;
    const master = view.root.getObjectByName("Weapon_Master");
    if (!master) return null;
    master.updateWorldMatrix(true, true);
    const m = findMount(master, id, master.worldToLocal(group.localToWorld(view.muzzle().clone())));
    mounts.set(id, m);
    return m;
  }

  let current: Variant | null = null;
  let fitted = "";
  const fittedParts: THREE.Object3D[] = [];
  let opticAim: THREE.Vector3 | null = null;
  /** The fitted optic's mesh: hidden only behind a magnified scope's full-screen view. */
  let opticMesh: THREE.Object3D | null = null;
  let gunOptic: OpticDef | null = null;
  function fit(gun: Gun) {
    const id = gun.item as Variant;
    const key = `${id}:${gun.optic}:${gun.muzzle}`;
    const mount = mountFor(id);
    if (!mount || key === fitted) return;
    fitted = key;
    for (const p of fittedParts) p.removeFromParent();
    fittedParts.length = 0;
    const r = fitAttachments(mount, id, parts, gun.optic, gun.muzzle);
    fittedParts.push(...r.added);
    opticAim = r.opticAim;
    opticMesh = r.opticMesh;
    gunOptic = gun.optic ? (ITEMS[gun.optic] as OpticDef) : null;
  }

  const sightPoint = new THREE.Vector3(),
    sightPosition = new THREE.Vector3();
  let aimT = 0;
  let kick = 0,
    shots = 0,
    shotAt = -1e9;
  return {
    ready,
    set onGrenadeCue(callback: (cue: GrenadeCue) => void) {
      nadeHands.onCue = (cue) => {
        if (cue === "pin-out") callback("pin");
        else if (cue === "release") callback("throw");
        else if (cue === "draw") callback("draw");
      };
    },
    /** First-person Karambit sound cues (equip, flips, spins, catches, slash, stab). */
    set onKnifeCue(callback: (cue: string) => void) {
      knifeCue = callback;
    },
    /** A swing (the caller gates it on the knife's draw time and cooldown, like the server). */
    knifeAttack(kind: "slash" | "stab") {
      knife.animator?.attack(kind);
    },
    /** F: one of the two inspects (cosmetic; a swing or a switch cuts it). */
    knifeInspect() {
      if (knifeUp) knife.animator?.inspect();
    },
    /** Show or hide the knife hands for a shader compile (hidden ones are skipped). */
    prepareCompile(show: boolean) {
      knife.prepareCompile(show);
    },
    viewScene,
    viewCamera,
    /** The gun group (tests and the attachment check). */
    group,
    /** The gun in hand (null: unarmed) and its attachments. */
    setGun(gun: Gun | null) {
      const id = (gun?.item ?? null) as Variant | null;
      if (id !== current) {
        current = id;
        fitted = "";
      }
      if (gun) fit(gun);
    },
    shot(now: number) {
      kick = 1;
      shots++;
      shotAt = now;
    },
    /** Aim amount 0..1 (eased), for the zoom and the HUD. */
    get aim() {
      return aimT;
    },
    /** True while a magnified optic (or the AWP's own scope) fills the view. */
    scopeView(gun: Gun | null) {
      if (!gun || aimT < 0.95) return false;
      const z = gun.optic ? (ITEMS[gun.optic] as OpticDef).zoom : gun.item === "awp" ? 4 : 1;
      return z >= SCOPE_VIEW_ZOOM;
    },
    update(
      dt: number,
      now: number,
      o: {
        gun: Gun | null;
        aiming: boolean;
        reload: number;
        empty: boolean;
        moving: boolean;
        sprinting: boolean;
        airborne: boolean;
        lookX: number;
        lookY: number;
        silenced: boolean;
        flash: boolean;
        /** The Karambit is in the hand (on foot, no gun or grenade drawn). */
        knife: boolean;
        walking: boolean;
        backward: boolean;
        strafe: number;
      },
    ) {
      aimT = THREE.MathUtils.clamp(aimT + (o.aiming ? dt : -dt) / AIM_MS, 0, 1);
      kick = Math.max(0, kick - dt / 90);
      for (const [id, v] of Object.entries(views) as Array<[Variant, (typeof views)["ak47"]]>) {
        if (id !== current) {
          v.update(false, 0, 0);
          continue;
        }
        let bolt = null;
        if (id === "awp") {
          if (o.reload > 0 && o.empty)
            bolt = boltPose((1 - o.reload) * (ITEMS.awp as WeaponDef).reloadMs, RELOAD_BOLT);
          else if (now - shotAt < (ITEMS.awp as WeaponDef).intervalMs)
            bolt = boltPose(now - shotAt, SHOT_BOLT);
        }
        v.update(
          !!o.gun,
          o.reload > 0 && o.reload < 1 ? 1 - o.reload : 0,
          kick,
          o.empty ? "empty" : "tactical",
          bolt,
        );
      }
      const sway = motion.update({
        dt,
        lookX: o.lookX,
        lookY: o.lookY,
        // The Karambit's walk/run clips carry their own stride; keep look sway and breathing.
        moving: o.moving && !o.knife,
        sprinting: o.sprinting && !o.knife,
        airborne: o.airborne,
        reloading: o.reload > 0,
        kick,
        shot: shots,
      });
      const rest = current ? REST[current] : REST.ak47;
      const swayScale = 1 - aimT * 0.85;
      group.rotation.set(
        rest.pitch * (1 - aimT) + sway.pitch * swayScale,
        rest.yaw * (1 - aimT) + sway.yaw * swayScale,
        rest.roll * (1 - aimT) + sway.roll * swayScale,
      );
      group.position.set(
        rest.x + sway.x * swayScale,
        rest.y + sway.y * swayScale,
        rest.z + sway.z * swayScale,
      );
      if (current && aimT > 0) {
        const mount = mounts.get(current);
        const target =
          opticAim ??
          mount?.ironAim ??
          (mount ? sightPoint.copy(mount.rail).setY(mount.rail.y + 0.02) : null);
        if (mount && target) {
          sightPoint.copy(target);
          mount.master.localToWorld(sightPoint);
          group.worldToLocal(sightPoint);
          const eye = opticAim && gunOptic && gunOptic.zoom < SCOPE_VIEW_ZOOM ? SIGHT_EYE_M : 0.2;
          alignedSightPosition(sightPosition, sightPoint, group.quaternion, eye);
          group.position.lerp(sightPosition, aimT * aimT * (3 - 2 * aimT));
        }
      }
      // Muzzle flash at the (possibly extended) muzzle: none with a flash hider or silencer.
      const since = now - shotAt;
      flash.root.visible = !!o.gun && o.flash && since < 45;
      if (flash.root.visible && current) {
        const v = views[current];
        flash.update(45 - since, 0, 0, shots);
        flash.root.position.copy(v.muzzle());
        flash.root.scale.multiplyScalar(o.silenced ? 0.42 : 1);
      }
      group.visible = !!o.gun;
      // Karambit: the animator's state machine (idle, walk/run, air, swings, inspects), then
      // its controls pose the two hands; framed like the arena renderer (rest at zero).
      knifeUp = o.knife && knife.loaded;
      knife.root.visible = false;
      if (knife.animator) {
        const pose = knife.animator.update({
          dt: dt / 1000,
          equipped: knifeUp,
          moving: o.moving ? (o.walking ? 0.5 : 1) : 0,
          walking: o.walking,
          backward: o.backward,
          strafe: o.strafe,
          airborne: o.airborne,
          reducedMotion: false,
        });
        if (knifeUp) {
          knife.pose(pose);
          knife.root.visible = true;
          const vp = pose.viewPosition;
          knifeGroup.position.set(sway.x + vp.x, sway.y + vp.y, sway.z + vp.z);
          knifeGroup.rotation.set(sway.pitch, sway.yaw, sway.roll);
        }
      }
      // Sights stay in view when aimed: their frames are open and the lit reticle sits on
      // their own glass (sight-reticle.ts). Magnified scopes switch to the full-screen view.
      if (opticMesh)
        opticMesh.visible = !(gunOptic && gunOptic.zoom >= SCOPE_VIEW_ZOOM && aimT >= 0.95);
    },
    /** The grenade hands this frame (hidden unless a grenade is drawn). */
    grenade(dt: number, view: GrenadeView) {
      nadeHands.update(dt / 1000, view);
      handsUp = view.kind !== "hidden";
    },
    render(camera: THREE.PerspectiveCamera, hidden: boolean) {
      if (hidden || (!current && !handsUp && !knifeUp)) return;
      if (viewCamera.aspect !== camera.aspect) {
        viewCamera.aspect = camera.aspect;
        viewCamera.updateProjectionMatrix();
      }
      viewCamera.position.copy(camera.position);
      viewCamera.quaternion.copy(camera.quaternion);
      viewCamera.updateMatrixWorld();
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(viewScene, viewCamera);
      renderer.autoClear = true;
    },
    dispose() {
      for (const v of Object.values(views)) v.dispose();
      nadeHands.dispose();
      knife.dispose();
      flash.dispose();
    },
  };
}
