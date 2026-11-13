import * as THREE from "three";
import { mountReticle } from "./sight-reticle";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ITEMS, type ItemId, type MuzzleDef, type OpticDef } from "./items";

/**
 * Weapon attachments on a gun model (first person and the guns other players carry): the
 * owner's accessory pack (art/blender/br/build_attachments.mjs) fitted through one mount per
 * gun, found from the gun's own nodes, so every accessory fits every gun. Optics sit on the top
 * rail (AK rail adapter; the M4's carry handle and the AWP's own scope are hidden under one);
 * muzzle devices on the barrel; on the M4 the Silencer is the gun's own suppressor. The MP5
 * and the SPAS-12 (battle royale) carry their rails only with an optic fitted; the Desert Eagle takes a red
 * dot on its barrel rail (items.ts `fits` decides what may be fitted at all).
 * The first-person and world rifle models share node names, so the same code serves both.
 */
export type AttachmentGun = "ak47" | "m4" | "awp" | "mp5" | "deagle" | "spas12";
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
  /** Rear iron sight notch/aperture, independent of the optic mounting rail. */
  ironAim?: THREE.Vector3;
  /** Front sight post: with `ironAim`, the sight line the view turns onto when aimed. */
  ironFront?: THREE.Vector3;
  muzzle: THREE.Vector3;
  bareMuzzle: THREE.Vector3;
  hide: THREE.Object3D[];
  /** Parts drawn only with an optic (the MP5's claw rail). */
  show?: THREE.Object3D[];
  suppressor?: THREE.Object3D;
};

/** A marker node's position in Weapon_Master space. */
function markerAt(master: THREE.Object3D, name: string) {
  const n = master.getObjectByName(name);
  if (!n) return null;
  master.updateWorldMatrix(true, true);
  return master.worldToLocal(n.getWorldPosition(new THREE.Vector3()));
}

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

/** An object's box in `master` space (its meshes' geometry, as nodeBox). */
function boxIn(master: THREE.Object3D, obj: THREE.Object3D) {
  master.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const inv = new THREE.Matrix4().copy(master.matrixWorld).invert();
  const m = new THREE.Matrix4();
  obj.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox!.clone().applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)));
  });
  return box;
}

const seatRay = new THREE.Raycaster();
seatRay.layers.enableAll();
/**
 * Lower `obj` (an optic, the AK's rail adapter) onto what is under it on the gun: rays straight
 * down through its footprint find the nearest surface of the gun's other visible parts, and
 * the whole object comes down by that gap (owner, 2026-11-11: "the holo sight has a gap where
 * it sits on the weapon, it needs to sit tight"). The mount points are box tops, and a box top
 * is not where a rail's surface is: the AK's side-mount strip stood 4 mm proud of the dust
 * cover, and the optics 2–5 mm above the strip. Gaps up to `maxGap` (master units) only, so a
 * mount that is meant to stand off (the MP5's claw rail) is left alone.
 */
function seatOn(master: THREE.Object3D, obj: THREE.Object3D, maxGap = 0.03, level = false) {
  const own = new Set<THREE.Object3D>();
  obj.traverse((o) => own.add(o));
  const targets: THREE.Mesh[] = [];
  master.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || own.has(o)) return;
    for (let p: THREE.Object3D | null = o; p && p !== master.parent; p = p.parent)
      if (!p.visible) return;
    targets.push(o);
  });
  // Down in master space, in world space (the gun may be turned or scaled by its holder).
  const unit = () =>
    new THREE.Vector3(0, 1, 0)
      .applyMatrix3(new THREE.Matrix3().setFromMatrix4(master.matrixWorld))
      .length();
  /** The gap under the base: overall, and per slice along the barrel (z). */
  const measure = () => {
    const box = boxIn(master, obj);
    const rows: Array<{ z: number; gap: number }> = [];
    if (box.isEmpty()) return { gap: Infinity, rows };
    const down = new THREE.Vector3(0, -1, 0).transformDirection(master.matrixWorld);
    const u = unit();
    const lift = (box.max.y - box.min.y) * 0.25;
    let gap = Infinity;
    for (let j = 1; j <= 7; j++) {
      const z = box.min.z + ((box.max.z - box.min.z) * j) / 8;
      let row = Infinity;
      for (let i = 1; i <= 5; i++) {
        const x = box.min.x + ((box.max.x - box.min.x) * i) / 6;
        // From a little above the base (a part reaching over the base edge counts as contact).
        const from = new THREE.Vector3(x, box.min.y + lift, z).applyMatrix4(master.matrixWorld);
        seatRay.set(from, down);
        // The first surface at or below the base (a part reaching up into the optic's own
        // outline, a rear sight under a scope's tube, is not what it stands on).
        for (const hit of seatRay.intersectObjects(targets, false)) {
          const below = hit.distance / u - lift;
          if (below < -1e-4) continue;
          row = Math.min(row, below);
          break;
        }
      }
      if (row <= maxGap) rows.push({ z, gap: row });
      gap = Math.min(gap, row);
    }
    return { gap, rows };
  };
  master.updateWorldMatrix(true, true);
  const first = measure(),
    rows = first.rows;
  let gap = first.gap;
  if (level && rows.length >= 3) {
    // Lie along what it stands on: the AK's side-mount strip is not parallel to the receiver
    // axis, and a level optic touched it at one end only (a wedge of light under the other).
    const n = rows.length,
      mz = rows.reduce((t, r) => t + r.z, 0) / n,
      mg = rows.reduce((t, r) => t + r.gap, 0) / n;
    let num = 0,
      den = 0;
    for (const r of rows) {
      num += (r.z - mz) * (r.gap - mg);
      den += (r.z - mz) ** 2;
    }
    const pitch = Math.atan(den > 0 ? num / den : 0);
    if (Math.abs(pitch) > 0.002 && Math.abs(pitch) < 0.08) {
      // (Optics hang straight off the master: a turn about its x axis tips the far end down.)
      obj.rotateX(pitch);
      obj.updateWorldMatrix(false, true);
      ({ gap } = measure());
    }
  }
  if (!(gap > 1e-4 && gap <= maxGap)) return 0;
  const down = new THREE.Vector3(0, -1, 0).transformDirection(master.matrixWorld);
  const world = obj.getWorldPosition(new THREE.Vector3()).addScaledVector(down, gap * unit());
  obj.position.copy(obj.parent!.worldToLocal(world));
  obj.updateWorldMatrix(false, true);
  return gap;
}

/**
 * Pieces of `node`'s meshes (connected parts) that stand inside `box` (master space) and
 * reach well into its upper half, split off into meshes of their own (to hide with what the
 * box belongs to). Once per model.
 */
function splitInside(master: THREE.Object3D, node: THREE.Object3D, box: THREE.Box3) {
  if (node.userData["split"]) return node.userData["split"] as THREE.Object3D[];
  const out: THREE.Object3D[] = [];
  const meshes: THREE.Mesh[] = [];
  node.traverse((o) => {
    if (o instanceof THREE.Mesh && !(o instanceof THREE.SkinnedMesh) && o.geometry.index)
      meshes.push(o);
  });
  master.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(master.matrixWorld).invert();
  const toMaster = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const above = box.min.y + (box.max.y - box.min.y) * 0.4;
  for (const mesh of meshes) {
    const g = mesh.geometry;
    const pos = g.getAttribute("position");
    const index = g.index!;
    toMaster.multiplyMatrices(inv, mesh.matrixWorld);
    // Connected parts: vertices joined by triangles and by shared positions.
    const parent = Int32Array.from({ length: pos.count }, (_, i) => i);
    const find = (a: number): number => {
      while (parent[a] !== a) a = parent[a] = parent[parent[a]!]!;
      return a;
    };
    const join = (a: number, b: number) => {
      parent[find(b)] = find(a);
    };
    const seen = new Map<string, number>();
    for (let i = 0; i < pos.count; i++) {
      const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
      const j = seen.get(k);
      if (j === undefined) seen.set(k, i);
      else join(j, i);
    }
    for (let i = 0; i < index.count; i += 3) {
      join(index.getX(i), index.getX(i + 1));
      join(index.getX(i), index.getX(i + 2));
    }
    const boxes = new Map<number, THREE.Box3>();
    for (let i = 0; i < pos.count; i++) {
      const r = find(i);
      let b = boxes.get(r);
      if (!b) boxes.set(r, (b = new THREE.Box3()));
      b.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(toMaster));
    }
    const grown = box.clone().expandByScalar((box.max.y - box.min.y) * 0.05);
    const off = new Set<number>();
    for (const [r, b] of boxes) if (grown.containsBox(b) && b.max.y > above) off.add(r);
    if (!off.size) continue;
    const keep: number[] = [],
      split: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      (off.has(find(tri[0]!)) ? split : keep).push(...tri);
    }
    const kept = g.clone();
    kept.setIndex(keep);
    mesh.geometry = kept;
    const piece = new THREE.Mesh(g.clone(), mesh.material);
    piece.geometry.setIndex(split);
    piece.name = `${mesh.name}-scope-part`;
    piece.position.copy(mesh.position);
    piece.quaternion.copy(mesh.quaternion);
    piece.scale.copy(mesh.scale);
    piece.layers.mask = mesh.layers.mask;
    piece.castShadow = mesh.castShadow;
    piece.renderOrder = mesh.renderOrder;
    mesh.parent!.add(piece);
    out.push(piece);
  }
  node.userData["split"] = out;
  return out;
}

/**
 * A solid riser under the AK's side-mount strip, down into the dust cover. The cover is
 * crowned and falls away towards the rear sight, so the flat strip touches it at one point and
 * the light showed under the rest of it from the side ("still a gap where it attaches").
 */
function riserUnder(master: THREE.Object3D, adapter: THREE.Object3D) {
  const box = boxIn(master, adapter);
  if (box.isEmpty()) return;
  let material: THREE.Material | THREE.Material[] | null = null;
  adapter.traverse((o) => {
    if (!material && o instanceof THREE.Mesh) material = o.material;
  });
  if (!material) return;
  const own = new Set<THREE.Object3D>();
  adapter.traverse((o) => own.add(o));
  const targets: THREE.Mesh[] = [];
  master.traverse((o) => {
    if (o instanceof THREE.Mesh && !own.has(o) && o.visible) targets.push(o);
  });
  const down = new THREE.Vector3(0, -1, 0).transformDirection(master.matrixWorld);
  const unit = new THREE.Vector3(0, 1, 0)
    .applyMatrix3(new THREE.Matrix3().setFromMatrix4(master.matrixWorld))
    .length();
  const cx = (box.min.x + box.max.x) / 2,
    half = (box.max.x - box.min.x) * 0.36;
  let deepest = 0;
  for (let i = 0; i <= 4; i++)
    for (let j = 0; j <= 8; j++) {
      const x = cx - half + (2 * half * i) / 4,
        z = box.min.z + ((box.max.z - box.min.z) * (0.03 + 0.94 * j)) / 8;
      seatRay.set(new THREE.Vector3(x, box.min.y, z).applyMatrix4(master.matrixWorld), down);
      const hit = seatRay.intersectObjects(targets, false)[0];
      if (hit) deepest = Math.max(deepest, Math.min(0.03, hit.distance / unit));
    }
  if (deepest < 1e-4) return;
  // From a little into the cover up to the strip's underside, a shade narrower than the strip.
  const h = deepest + 0.004;
  const riser = new THREE.Mesh(
    new THREE.BoxGeometry(2 * half, h, (box.max.z - box.min.z) * 0.97),
    material,
  );
  riser.name = "OpticRailRiser";
  riser.position.set(cx, box.min.y + 0.0005 - h / 2, (box.min.z + box.max.z) / 2);
  riser.layers.mask = adapter.layers.mask;
  master.add(riser);
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
  const show: THREE.Object3D[] = [];
  let suppressor: THREE.Object3D | undefined;
  let ironAim: THREE.Vector3 | undefined;
  let ironFront: THREE.Vector3 | undefined;
  const top = (b: THREE.Box3, y: number) =>
    new THREE.Vector3((b.min.x + b.max.x) / 2, y, (b.min.z + b.max.z) / 2);
  if (id === "ak47") {
    const adapter = master.getObjectByName("OpticRailAdapterGeometry");
    // The side-mount strip down onto the dust cover (once per model).
    if (adapter && !adapter.userData["seated"]) {
      seatOn(master, adapter);
      riserUnder(master, adapter);
      adapter.userData["seated"] = true;
    }
    const r = nodeBox(master, "OpticRailAdapterGeometry");
    if (r) rail = top(r.box, r.box.max.y);
  } else if (id === "m4") {
    const c = nodeBox(master, "CarryHandleGeometry");
    if (c) {
      rail = top(c.box, c.box.min.y);
      hide.push(c.node);
      ironAim = new THREE.Vector3(
        (c.box.min.x + c.box.max.x) / 2,
        c.box.max.y - (c.box.max.y - c.box.min.y) * 0.14,
        c.box.max.z - (c.box.max.z - c.box.min.z) * 0.08,
      );
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
  } else if (id === "mp5" || id === "spas12") {
    // The MP5's claw mount / the SPAS-12's receiver rail: optics stand on it; hidden without one.
    const r = nodeBox(master, "OpticMountGeometry");
    if (r) {
      rail = top(r.box, r.box.max.y);
      show.push(r.node);
    }
    ironAim = markerAt(master, "RearSightAperture") ?? undefined;
    ironFront = markerAt(master, "FrontSightPost") ?? undefined;
  } else if (id === "deagle") {
    rail = markerAt(master, "OpticRail") ?? rail;
    ironAim = markerAt(master, "RearSightAperture") ?? undefined;
    ironFront = markerAt(master, "FrontSightPost") ?? undefined;
  } else {
    const sc = nodeBox(master, "ScopeGeometry");
    if (sc) {
      rail = top(sc.box, sc.box.min.y);
      hide.push(sc.node);
      // The scope's eyepiece ring is modelled into the receiver mesh: with the scope off it
      // hung in the air in front of a fitted sight (a black hoop over the barrel).
      const receiver = master.getObjectByName("ReceiverGeometry");
      if (receiver) hide.push(...splitInside(master, receiver, sc.box));
    }
  }
  return {
    master,
    rail,
    muzzle,
    bareMuzzle,
    hide,
    ...(show.length ? { show } : {}),
    ...(ironAim ? { ironAim } : {}),
    ...(ironFront ? { ironFront } : {}),
    ...(suppressor ? { suppressor } : {}),
  };
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
  for (const h of mount.show ?? []) h.visible = !!optic;
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
    seatOn(mount.master, o, 0.03, true);
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
