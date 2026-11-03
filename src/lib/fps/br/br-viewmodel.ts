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
  const parts = new Map<string, THREE.Object3D>();
  /** GLTFLoader sanitises node names ("Scope 3.001" → "Scope_3001"): compare loosely. */
  const norm = (name: string) => name.replace(/[\s_.]/g, "").toLowerCase();
  const url = (p: string) => new URL(p.replace(/^\//, ""), base).href;
  const attachmentsReady = loader
    .loadAsync(url("/fps/br/models/attachments.glb"))
    .then((g) => {
      for (const child of g.scene.children) parts.set(norm(child.name), child);
    })
    .catch(() => {});
  const ready = Promise.all([...Object.values(views).map((v) => v.ready), attachmentsReady]);

  /** Mount frames found once per gun after load, in the Weapon_Master space. */
  type Mount = {
    master: THREE.Object3D;
    rail: THREE.Vector3;
    muzzle: THREE.Vector3;
    bareMuzzle: THREE.Vector3;
    hide: THREE.Object3D[];
    suppressor?: THREE.Object3D;
  };
  const mounts = new Map<Variant, Mount>();
  const box = new THREE.Box3();
  function nodeBox(master: THREE.Object3D, name: string) {
    const n = master.getObjectByName(name);
    if (!n) return null;
    master.updateWorldMatrix(true, true);
    box.makeEmpty();
    const inv = new THREE.Matrix4().copy(master.matrixWorld).invert();
    n.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry
        .boundingBox!.clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      box.union(b);
    });
    return { node: n, box: box.clone() };
  }
  function mountFor(id: Variant): Mount | null {
    const cached = mounts.get(id);
    if (cached) return cached;
    const view = views[id];
    if (!view.loaded) return null;
    const master = view.root.getObjectByName("Weapon_Master");
    if (!master) return null;
    master.updateWorldMatrix(true, true);
    const muzzle = master.worldToLocal(group.localToWorld(view.muzzle().clone()));
    let rail = new THREE.Vector3(),
      bareMuzzle = muzzle.clone();
    const hide: THREE.Object3D[] = [];
    let suppressor: THREE.Object3D | undefined;
    if (id === "ak47") {
      const r = nodeBox(master, "OpticRailAdapterGeometry");
      if (r)
        rail = new THREE.Vector3(
          (r.box.min.x + r.box.max.x) / 2,
          r.box.max.y,
          (r.box.min.z + r.box.max.z) / 2,
        );
    } else if (id === "m4") {
      const c = nodeBox(master, "CarryHandleGeometry");
      if (c) {
        rail = new THREE.Vector3(
          (c.box.min.x + c.box.max.x) / 2,
          c.box.min.y,
          (c.box.min.z + c.box.max.z) / 2,
        );
        hide.push(c.node);
      }
      const s = nodeBox(master, "SuppressorGeometry");
      if (s) {
        suppressor = s.node;
        // The bare barrel ends where the suppressor begins (its end nearest the receiver).
        const rear =
          Math.abs(s.box.max.z - muzzle.z) > Math.abs(s.box.min.z - muzzle.z)
            ? s.box.max.z
            : s.box.min.z;
        bareMuzzle = new THREE.Vector3(
          (s.box.min.x + s.box.max.x) / 2,
          (s.box.min.y + s.box.max.y) / 2,
          rear,
        );
      }
    } else {
      const sc = nodeBox(master, "ScopeGeometry");
      if (sc) {
        rail = new THREE.Vector3(
          (sc.box.min.x + sc.box.max.x) / 2,
          sc.box.min.y,
          (sc.box.min.z + sc.box.max.z) / 2,
        );
        hide.push(sc.node);
      }
    }
    const m: Mount = {
      master,
      rail,
      muzzle,
      bareMuzzle,
      hide,
      ...(suppressor ? { suppressor } : {}),
    };
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
    opticAim = null;
    opticMesh = null;
    const optic = gun.optic ? (ITEMS[gun.optic] as OpticDef) : null,
      muzzle = gun.muzzle ? (ITEMS[gun.muzzle] as MuzzleDef) : null;
    for (const h of mount.hide) h.visible = !optic;
    if (mount.suppressor) mount.suppressor.visible = gun.muzzle === "silencer";
    if (optic && parts.has(norm(optic.mesh))) {
      const o = parts.get(norm(optic.mesh))!.clone(true);
      o.position.copy(mount.rail);
      mount.master.add(o);
      fittedParts.push(o);
      opticMesh = o;
      mount.master.updateWorldMatrix(true, true);
      // Aim point: the reticle quad's centre, else the optic's axis at 60 % of its height.
      let aim: THREE.Object3D | undefined;
      o.traverse((c) => {
        if (/aim/i.test(c.name) && c instanceof THREE.Mesh) aim = c;
      });
      const local = new THREE.Vector3();
      if (aim) new THREE.Box3().setFromObject(aim).getCenter(local);
      else {
        const b = new THREE.Box3().setFromObject(o);
        b.getCenter(local).setY(b.min.y + (b.max.y - b.min.y) * 0.6);
      }
      opticAim = mount.master.worldToLocal(local);
    }
    const showDevice = muzzle && !(id === "m4" && gun.muzzle === "silencer");
    if (showDevice && parts.has(norm(muzzle.mesh))) {
      const d = parts.get(norm(muzzle.mesh))!.clone(true);
      const at = id === "m4" ? mount.bareMuzzle : mount.muzzle;
      d.position.copy(at);
      // Devices are built with their rear face at the origin and the barrel axis along −Z.
      mount.master.add(d);
      fittedParts.push(d);
    }
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
