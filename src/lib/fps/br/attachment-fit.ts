import * as THREE from "three";
import { mountReticle } from "./sight-reticle";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ITEMS, type ItemId, type MuzzleDef, type OpticDef } from "./items";

/**
 * Weapon attachments on a gun model (first person and the guns other players carry): the
 * owner's accessory pack (art/blender/br/build_attachments.mjs) fitted through one mount per
 * gun, found from the gun's own nodes, so every accessory fits every gun. Optics sit on the top
 * rail (AK rail adapter; the M4's carry handle and the AWP's own scope are hidden under one);
 * muzzle devices on the barrel; on the M4 the Silencer is the gun's own suppressor.
 * The first-person and world rifle models share node names, so the same code serves both.
 */
export type AttachmentGun = "ak47" | "m4" | "awp";
/**
 * The authored gun models (first person and world) are about 2 units per metre in their
 * Weapon_Master space (measured: AK-47 1.76 units for an 0.88 m rifle, AWP 2.37 for 1.17 m, M4
 * with its can 1.93 for ~0.97 m); the pack is baked in metres.
 */
export const GUN_UNITS_PER_METRE = 2;
export type AttachmentParts = Map<string, THREE.Object3D>;
/** GLTFLoader sanitises node names ("Scope 3.001" → "Scope_3001"): compare loosely. */
export const normPart = (name: string) => name.replace(/[\s_.]/g, "").toLowerCase();

const shared = new WeakMap<GLTFLoader, Map<string, Promise<AttachmentParts>>>();
/** One load of the pack per loader and URL; parts are templates to clone. */
export function loadAttachmentParts(loader: GLTFLoader, url: string): Promise<AttachmentParts> {
  let byUrl = shared.get(loader);
  if (!byUrl) shared.set(loader, (byUrl = new Map()));
  let p = byUrl.get(url);
  if (!p) {
    p = loader
      .loadAsync(url)
      .then((g) => {
        const parts: AttachmentParts = new Map();
        for (const child of g.scene.children) parts.set(normPart(child.name), child);
        return parts;
      })
      .catch(() => new Map());
    byUrl.set(url, p);
  }
  return p;
}

/** Mount frames in the gun's Weapon_Master space. */
export type AttachmentMount = {
  master: THREE.Object3D;
  rail: THREE.Vector3;
  muzzle: THREE.Vector3;
  bareMuzzle: THREE.Vector3;
  hide: THREE.Object3D[];
  suppressor?: THREE.Object3D;
};

function nodeBox(master: THREE.Object3D, name: string) {
  const n = master.getObjectByName(name);
  if (!n) return null;
  master.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const inv = new THREE.Matrix4().copy(master.matrixWorld).invert();
  const m = new THREE.Matrix4();
  n.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox!.clone().applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)));
  });
  return { node: n, box };
}

/** Find the mount frames of a loaded gun (`muzzle`: the barrel tip in master space). */
export function findMount(
  master: THREE.Object3D,
  id: AttachmentGun,
  muzzle: THREE.Vector3,
): AttachmentMount {
  let rail = new THREE.Vector3(),
    bareMuzzle = muzzle.clone();
  const hide: THREE.Object3D[] = [];
  let suppressor: THREE.Object3D | undefined;
  const top = (b: THREE.Box3, y: number) =>
    new THREE.Vector3((b.min.x + b.max.x) / 2, y, (b.min.z + b.max.z) / 2);
  if (id === "ak47") {
    const r = nodeBox(master, "OpticRailAdapterGeometry");
    if (r) rail = top(r.box, r.box.max.y);
  } else if (id === "m4") {
    const c = nodeBox(master, "CarryHandleGeometry");
    if (c) {
      rail = top(c.box, c.box.min.y);
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
      rail = top(sc.box, sc.box.min.y);
      hide.push(sc.node);
    }
  }
  return { master, rail, muzzle, bareMuzzle, hide, ...(suppressor ? { suppressor } : {}) };
}

/** Fit an optic and a muzzle device (either may be null); returns the added objects. */
export function fitAttachments(
  mount: AttachmentMount,
  id: AttachmentGun,
  parts: AttachmentParts,
  opticId: ItemId | null,
  muzzleId: ItemId | null,
  options: { shadows?: boolean } = {},
) {
  const added: THREE.Object3D[] = [];
  let opticMesh: THREE.Object3D | null = null,
    opticAim: THREE.Vector3 | null = null;
  const optic = opticId ? (ITEMS[opticId] as OpticDef) : null,
    muzzle = muzzleId ? (ITEMS[muzzleId] as MuzzleDef) : null;
  for (const h of mount.hide) h.visible = !optic;
  if (mount.suppressor) mount.suppressor.visible = muzzleId === "silencer";
  const place = (template: THREE.Object3D, at: THREE.Vector3) => {
    const o = template.clone(true);
    o.position.copy(at);
    o.scale.setScalar(GUN_UNITS_PER_METRE);
    if (options.shadows)
      o.traverse((c) => {
        if (c instanceof THREE.Mesh) c.castShadow = true;
      });
    mount.master.add(o);
    added.push(o);
    return o;
  };
  if (optic && parts.has(normPart(optic.mesh))) {
    const o = place(parts.get(normPart(optic.mesh))!, mount.rail);
    opticMesh = o;
    mount.master.updateWorldMatrix(true, true);
    // Aim point: the reticle quad's centre, else the optic's axis at 60 % of its height.
    let aim: THREE.Object3D | undefined;
    o.traverse((c) => {
      if (/aim/i.test(c.name) && c instanceof THREE.Mesh) aim = c;
    });
    const local = new THREE.Vector3();
    if (aim) {
      new THREE.Box3().setFromObject(aim).getCenter(local);
      // The lit reticle and the lens (sight-reticle.ts) in place of the plain red quad.
      if (optic.reticle === "dot" || optic.reticle === "holo" || optic.reticle === "chevron")
        mountReticle(aim as THREE.Mesh, optic.reticle);
    } else {
      const b = new THREE.Box3().setFromObject(o);
      b.getCenter(local).setY(b.min.y + (b.max.y - b.min.y) * 0.6);
    }
    opticAim = mount.master.worldToLocal(local);
  }
  // Devices are built with their rear face at the origin and the barrel axis along −Z.
  const showDevice = muzzle && !(id === "m4" && muzzleId === "silencer");
  if (showDevice && parts.has(normPart(muzzle.mesh)))
    place(parts.get(normPart(muzzle.mesh))!, id === "m4" ? mount.bareMuzzle : mount.muzzle);
  return { added, opticMesh, opticAim };
}

/** A character's held gun (authored-character `heldWeapon()`). */
type HeldWeapon = {
  id: AttachmentGun;
  view: { muzzle(): THREE.Vector3 };
  master: THREE.Object3D;
  pivot: THREE.Object3D;
};
type CharacterFit = { key: string; added: THREE.Object3D[]; mounts: Map<object, AttachmentMount> };
const characterFits = new WeakMap<object, CharacterFit>();
/**
 * Other players: fit attachments on the gun a character holds, refitted only when the gun or
 * its attachments change. Call after the character's update (which picks the held gun).
 */
export function fitCharacterGun(
  character: { heldWeapon(): HeldWeapon | null },
  parts: AttachmentParts | null,
  optic: ItemId | null,
  muzzle: ItemId | null,
) {
  const held = character.heldWeapon();
  if (!held || !parts) return;
  let f = characterFits.get(character);
  if (!f) characterFits.set(character, (f = { key: "", added: [], mounts: new Map() }));
  const key = `${held.id}:${optic}:${muzzle}`;
  if (key === f.key) return;
  for (const o of f.added) o.removeFromParent();
  let mount = f.mounts.get(held.view);
  if (!mount) {
    held.master.updateWorldMatrix(true, true);
    const tip = held.pivot.localToWorld(held.view.muzzle().clone());
    mount = findMount(held.master, held.id, held.master.worldToLocal(tip));
    f.mounts.set(held.view, mount);
  }
  f.added = fitAttachments(mount, held.id, parts, optic, muzzle, { shadows: true }).added;
  f.key = key;
}
