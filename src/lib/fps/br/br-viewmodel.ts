import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  AK_VIEWMODEL,
  AWP_POLICE_VIEWMODEL,
  createAuthoredViewmodel,
  M4_VIEWMODEL,
} from "../authored-viewmodel";
import { AWP_VIEWMODEL_REST, boltPose, RELOAD_BOLT, SHOT_BOLT } from "../awp-animation";
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
import { ITEMS, type ItemId, type MuzzleDef, type OpticDef, type WeaponDef } from "./items";

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
  const ready = Promise.all([...Object.values(views).map((v) => v.ready), attachmentsReady]);

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
  /** The fitted optic's mesh: hidden once fully aimed (the page draws its reticle). */
  let opticMesh: THREE.Object3D | null = null;
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
  }

  let aimT = 0;
  let kick = 0,
    shots = 0,
    shotAt = -1e9;
  return {
    ready,
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
    /** True once fully aimed through a non-magnifying sight (the page draws its reticle). */
    sightView(gun: Gun | null) {
      if (!gun?.optic || aimT < 0.95) return false;
      return (ITEMS[gun.optic] as OpticDef).zoom < SCOPE_VIEW_ZOOM;
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
        moving: o.moving,
        sprinting: o.sprinting,
        airborne: o.airborne,
        reloading: o.reload > 0,
        kick,
        shot: shots,
      });
      const rest = current ? REST[current] : REST.ak47;
      // Aiming: bring the optic's reticle (or the iron/rail line) onto the camera axis.
      let ax = rest.x,
        ay = rest.y,
        az = rest.z;
      if (current && aimT > 0) {
        const mount = mounts.get(current);
        const target = opticAim ?? (mount ? mount.rail.clone().setY(mount.rail.y + 0.02) : null);
        if (mount && target) {
          const p = mount.master.localToWorld(target.clone());
          group.worldToLocal(p);
          const e = aimT * aimT * (3 - 2 * aimT);
          // p is in the group's own space and the group's rotation eases to zero: placing the
          // group at −p puts the reticle on the camera axis, a hand's width in front of the eye.
          ax = THREE.MathUtils.lerp(rest.x, -p.x, e);
          ay = THREE.MathUtils.lerp(rest.y, -p.y, e);
          az = THREE.MathUtils.lerp(rest.z, -0.2 - p.z, e);
        }
      }
      const s = 1 - aimT * 0.85;
      group.position.set(ax + sway.x * s, ay + sway.y * s, az + sway.z * s);
      group.rotation.set(
        rest.pitch * (1 - aimT) + sway.pitch * s,
        rest.yaw * (1 - aimT) + sway.yaw * s,
        rest.roll * (1 - aimT) + sway.roll * s,
      );
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
      // Fully aimed through a sight: the page draws the sight's reticle at the screen centre
      // (a modelled lens cannot be seen through), so the sight body steps aside.
      if (opticMesh) opticMesh.visible = aimT < 0.95;
    },
    render(camera: THREE.PerspectiveCamera, hidden: boolean) {
      if (hidden || !current) return;
      viewCamera.aspect = camera.aspect;
      viewCamera.updateProjectionMatrix();
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
      flash.dispose();
    },
  };
}
