import { alignedSightPosition } from "./sight-alignment";
import type { GrenadeCue } from "../grenades/grenade-audio";
import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  AK_VIEWMODEL,
  AWP_POLICE_VIEWMODEL,
  createAuthoredViewmodel,
  HUNTING_POLICE_VIEWMODEL,
  DEAGLE_POLICE_VIEWMODEL,
  M4_VIEWMODEL,
  MP5_POLICE_VIEWMODEL,
} from "../authored-viewmodel";
import { DEAGLE_VIEWMODEL_REST } from "../deagle-animation";
import { MP5_VIEWMODEL_REST } from "../mp5-animation";
import { AWP_VIEWMODEL_REST, boltPose, RELOAD_BOLT, SHOT_BOLT } from "../awp-animation";
import { createGrenadeViewmodel } from "../grenades/grenade-viewmodel";
import { createKarambitViewmodel } from "../karambit-viewmodel";
import type { GrenadeView } from "../grenades/grenade-timeline";
import { createMuzzleFlash } from "../muzzle-flash";
import {
  AK_CASING,
  casingPoolOf,
  createShellCasings,
  DEAGLE_CASING,
  M4_CASING,
  MP5_CASING,
} from "../shell-casings";
import { createViewmodelMotion } from "../viewmodel-motion";
import {
  findMount,
  fitAttachments,
  loadAttachmentParts,
  type AttachmentMount,
  type AttachmentParts,
} from "./attachment-fit";
import type { Gun } from "./inventory";
import { ITEMS, type ItemId, type OpticDef, type WeaponDef } from "./items";
import { reloadClip } from "./reload-progress";

/**
 * First-person guns for the battle royale: the 1v1/5v5 authored AK-47, M4 and AWP and the
 * battle royale MP5 and Desert Eagle (arms, reload, bolt and slide clips, sway), drawn in their own pass like the arena renderer, plus the owner's
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
type Variant = "ak47" | "m4" | "awp" | "hunting" | "mp5" | "deagle";
const REST = {
  // renderer.ts VIEWMODEL_REST / M4_VIEWMODEL_REST and awp-animation.ts AWP_VIEWMODEL_REST;
  // the MP5's and Deagle's researched holds (mp5-animation.ts, deagle-animation.ts).
  ak47: { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 },
  m4: { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 },
  awp: AWP_VIEWMODEL_REST,
  // The Hunting Rifle is built on the AWP's grips and scope eye: the same hold.
  hunting: AWP_VIEWMODEL_REST,
  mp5: MP5_VIEWMODEL_REST,
  deagle: DEAGLE_VIEWMODEL_REST,
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
    hunting: createAuthoredViewmodel(group, true, HUNTING_POLICE_VIEWMODEL),
    // Police sleeves, like the AWP, the knife and the grenades in the battle royale.
    mp5: createAuthoredViewmodel(group, true, MP5_POLICE_VIEWMODEL),
    deagle: createAuthoredViewmodel(group, true, DEAGLE_POLICE_VIEWMODEL),
  };
  const flash = createMuzzleFlash();
  group.add(flash.root);
  flash.root.visible = false;
  // Spent cases from the ejection port (the 1v1/5v5 casings: 7.62 for the AK, 5.56 for the M4,
  // 9 mm for the MP5, .50 AE for the Deagle); the AWP's bolt keeps its case in the BR.
  const casings = {
    ak: createShellCasings(1, AK_CASING),
    m4: createShellCasings(1, M4_CASING),
    mp5: createShellCasings(1, MP5_CASING),
    deagle: createShellCasings(1, DEAGLE_CASING),
  };
  for (const pool of Object.values(casings)) viewScene.add(pool.mesh);
  const ejectAt = new THREE.Vector3(),
    ejectRight = new THREE.Vector3(),
    ejectUp = new THREE.Vector3(),
    ejectBack = new THREE.Vector3();
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
    sightPosition = new THREE.Vector3(),
    sightLine = new THREE.Vector3(),
    sightFix = new THREE.Quaternion(),
    sightTurn = new THREE.Quaternion();
  const FORWARD = new THREE.Vector3(0, 0, -1);
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
      // Cases have no instances until the first shot: draw one for the compile.
      for (const pool of Object.values(casings)) pool.mesh.count = show ? 1 : 0;
    },
    /** Compile fitted optics in the first-person scene, including their lit reticles.
     * The world/loot pass has fog and different geometry, so it cannot warm these variants. */
    async prepareAttachments() {
      try {
        for (const [id, def] of Object.entries(ITEMS)) {
          if (def.category !== "optic") continue;
          fit({ item: "m4", mag: 0, optic: id as ItemId, muzzle: "silencer" });
          await renderer.compileAsync(viewScene, viewCamera);
        }
      } finally {
        // Restore the bare rifle; preparation must never equip loot or leave a sight fitted.
        fit({ item: "m4", mag: 0, optic: null, muzzle: null });
        fitted = "";
      }
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
      // The case leaves the port (not a bolt action's: its bolt is worked after the shot).
      if (current && current !== "awp" && current !== "hunting") {
        const v = views[current];
        if (v.loaded && v.ejectionPort(ejectAt)) {
          group.updateWorldMatrix(true, false);
          group.localToWorld(ejectAt);
          ejectRight.set(1, 0, 0).transformDirection(group.matrixWorld);
          ejectUp.set(0, 1, 0).transformDirection(group.matrixWorld);
          ejectBack.set(0, 0, 1).transformDirection(group.matrixWorld);
          casings[casingPoolOf(current)].emit(ejectAt, ejectRight, ejectUp, ejectBack, now);
        }
      }
    },
    /** Aim amount 0..1 (eased), for the zoom and the HUD. */
    get aim() {
      return aimT;
    },
    /** True while a magnified optic (or the AWP's own scope) fills the view. */
    scopeView(gun: Gun | null) {
      if (!gun || aimT < 0.95) return false;
      const z = gun.optic
        ? (ITEMS[gun.optic] as OpticDef).zoom
        : ((ITEMS[gun.item] as WeaponDef).scope?.zoom ?? 1);
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
        // `o.reload` is the reload's progress, 0 → 1. The clips and the AWP's bolt take the time
        // gone (as renderer.ts in 1v1/5v5); they were given the time left, so every reload played
        // backwards, from the full magazine back to the empty one, then snapped to rest.
        // The Hunting Rifle works its bolt on the AWP's timeline (same cycle and reload).
        const bolted = id === "awp" || id === "hunting" ? (ITEMS[id] as WeaponDef) : null;
        const clip = reloadClip(o.reload, (bolted ?? (ITEMS.awp as WeaponDef)).reloadMs);
        if (bolted) {
          if (clip.t > 0 && o.empty) bolt = boltPose(clip.boltMs, RELOAD_BOLT);
          else if (now - shotAt < bolted.intervalMs) bolt = boltPose(now - shotAt, SHOT_BOLT);
        }
        v.update(!!o.gun, clip.t, kick, o.empty ? "empty" : "tactical", bolt);
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
        // Iron sights with a marked front post (MP5, Deagle): turn the gun so the rear
        // aperture and the front post line up on the view axis, then place the aperture.
        if (mount?.ironAim && mount.ironFront && !opticAim) {
          // Master → group space (both world matrices are from the same update, so their
          // relation holds whatever the group's pose this frame), then into the camera.
          const front = mount.master.localToWorld(sightLine.copy(mount.ironFront));
          group.worldToLocal(front);
          const rear = group.worldToLocal(
            mount.master.localToWorld(sightPoint.copy(mount.ironAim)),
          );
          sightLine.sub(rear).normalize().applyQuaternion(group.quaternion);
          sightFix.setFromUnitVectors(sightLine, FORWARD);
          const k = aimT * aimT * (3 - 2 * aimT);
          group.quaternion.premultiply(sightTurn.identity().slerp(sightFix, k));
        }
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
      for (const pool of Object.values(casings)) pool.update(dt, now);
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
      for (const pool of Object.values(casings)) pool.dispose();
    },
  };
}
