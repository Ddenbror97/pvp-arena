import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/**
 * Worn loot on other players (owner request, 2026-11-03): the helmet, vest and backpack levels
 * each player carries are drawn on their character, so a level-3 helmet or a big pack reads at a
 * glance as it does in PUBG. The server sends one gear code per player row (match.ts): helmet
 * level + 4 × vest level + 16 × backpack level (0 = none). Pieces are simple low-poly shapes in
 * the loot colours (loot-renderer.ts), bound to the character's Head and Spine2 bones at their
 * pose when first seen, then carried by the skeleton.
 */
export const decodeGear = (code: number | undefined) => {
  const c = code !== undefined && code > 0 ? code : 0;
  return { helmet: c & 3, vest: (c >> 2) & 3, backpack: (c >> 4) & 3 };
};

const LEVEL_COLOR = { 1: 0x6b6f4e, 2: 0x8a7a55, 3: 0x2b3038 } as const;
const PACK_COLOR = { 1: 0x5b6146, 2: 0x6e5d3e, 3: 0x2e3a2f } as const;
type Level = 1 | 2 | 3;

const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) =>
  new THREE.BoxGeometry(w, h, d).translate(x, y, z);
/** Strip the uv/attributes mergeGeometries needs identical, keep position + normal. */
const plain = (g: THREE.BufferGeometry) => {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes))
    if (name !== "position" && name !== "normal") out.deleteAttribute(name);
  return out;
};
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map(plain))!;

/** Built once, shared by every character (metres; +y up, the character faces −z). */
type Part = { geometry: THREE.BufferGeometry; material: THREE.Material };
type Kit = Record<"helmet" | "vest" | "backpack", Record<Level, Part[]>>;
let kit: Kit | undefined;
function gearKit() {
  if (kit) return kit;
  const mat = (color: number, roughness = 0.8, metalness = 0.05) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const strap = mat(0x22241f, 0.9);
  const helmet = {} as Kit["helmet"];
  const vest = {} as Kit["vest"];
  const backpack = {} as Kit["backpack"];
  for (const lv of [1, 2, 3] as const) {
    // Helmet: a shell over the skull (head centre at the origin), a brim from level 2, ear cups
    // and a night-vision mount on level 3.
    const shell = new THREE.SphereGeometry(0.132, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.56)
      .scale(1, 0.92, 1.1)
      .translate(0, 0.005, 0.005);
    const parts: THREE.BufferGeometry[] = [shell];
    if (lv >= 2)
      parts.push(
        new THREE.TorusGeometry(0.138, 0.011, 6, 24)
          .rotateX(Math.PI / 2)
          .scale(1, 1, 1.1)
          .translate(0, -0.03, 0.01),
      );
    if (lv === 3) parts.push(box(0.05, 0.03, 0.04, 0, 0.09, -0.12)); // NVG mount
    helmet[lv] = [
      { geometry: merge(parts), material: mat(LEVEL_COLOR[lv], lv === 3 ? 0.55 : 0.75) },
    ];
    // Level 3: ear cups on both sides.
    if (lv === 3)
      helmet[lv].push({
        geometry: merge(
          [-1, 1].map((x) =>
            new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12)
              .rotateZ(Math.PI / 2)
              .translate(x * 0.135, -0.04, 0.01),
          ),
        ),
        material: strap,
      });
    // Vest: front and back panels around the chest (origin at the chest centre), cummerbund
    // sides; level 2 adds a row of magazine pouches, level 3 a collar and shoulder pads.
    const panel = 0.03 + lv * 0.012;
    const v: THREE.BufferGeometry[] = [
      box(0.31, 0.3, panel, 0, 0, -0.125),
      box(0.31, 0.32, panel, 0, 0.01, 0.12),
      box(panel, 0.16, 0.23, -0.165, -0.06, 0),
      box(panel, 0.16, 0.23, 0.165, -0.06, 0),
    ];
    if (lv >= 2)
      for (const x of [-0.1, 0, 0.1])
        v.push(box(0.08, 0.1, 0.045, x, -0.07, -0.125 - panel / 2 - 0.022));
    if (lv === 3) {
      v.push(box(0.26, 0.05, 0.05, 0, 0.16, -0.11));
      for (const x of [-0.15, 0.15]) v.push(box(0.1, 0.04, 0.2, x, 0.15, 0));
    }
    vest[lv] = [
      { geometry: merge(v), material: mat(LEVEL_COLOR[lv], 0.9) },
      {
        geometry: merge([-0.1, 0.1].map((x) => box(0.05, 0.02, 0.25, x, 0.16, 0))),
        material: strap,
      },
    ];
    // Backpack on the back (origin at the chest centre): bigger with the level, a bedroll on
    // top of the level-3 pack.
    const h = 0.26 + lv * 0.07,
      d = 0.1 + lv * 0.025,
      w = 0.27 + lv * 0.015;
    const z = 0.15 + d / 2;
    const p: THREE.BufferGeometry[] = [
      box(w, h, d, 0, 0.1 - h / 2, z),
      box(w * 0.8, 0.09, 0.04, 0, 0.02 - h / 2 + 0.1, z + d / 2),
    ];
    if (lv === 3)
      p.push(
        new THREE.CylinderGeometry(0.06, 0.06, w + 0.04, 10)
          .rotateZ(Math.PI / 2)
          .translate(0, 0.16, z),
      );
    backpack[lv] = [
      { geometry: merge(p), material: mat(PACK_COLOR[lv], 0.95) },
      {
        geometry: merge([-0.09, 0.09].map((x) => box(0.045, 0.3, 0.02, x, 0.02, -0.14))),
        material: strap,
      },
    ];
  }
  kit = { helmet, vest, backpack };
  return kit;
}

/**
 * The officer's own hat in the battle royale (owner, 2026-11-10: "ugly without any hat until the
 * player has looted a helmet"; "add this hat to the police"): the detective's hat of hat.glb,
 * worn while no helmet is. Until it loads (or if it is missing), a felt fedora modelled here
 * stands in: lathe profiles in units of the head's half-width across (r) and metres up from the
 * brim (y), scaled per axis to the skull like the helmet.
 */
const HAT_CROWN: Array<[number, number]> = [
  [1.46, 0.012],
  [1.4, 0.004],
  [1.2, 0.0],
  [1.0, 0.0],
  [0.985, 0.04],
  [0.95, 0.09],
  [0.86, 0.112],
  [0.6, 0.12],
  [0.3, 0.114],
  [0.0, 0.106],
];
const HAT_BAND: Array<[number, number]> = [
  [1.012, 0.004],
  [1.0, 0.036],
];
/**
 * The loaded hat (hat.glb, art/blender/br/build_hat.mjs: "Classic Detective hat" by 5XCISSORS,
 * credited in ATTRIBUTION-hat.md) on the skull: its width over the skull's with clearance, its
 * top above the head's crown, set back so the back peak covers the back of the head and the
 * front peak stays above the eyes.
 */
const MODEL_HAT = { width: 0.03, crown: 0.036, back: 0.024, yaw: 0 };
/** Brim below the skull's top (just above the brow), and the crown's clearance round it. */
const HAT_FIT = { brim: 0.072, side: 0.012, back: 0.018 };
let hatParts: Part[] | undefined;
function hatKit() {
  if (hatParts) return hatParts;
  const lathe = (pts: Array<[number, number]>) =>
    new THREE.LatheGeometry(
      pts.map(([r, y]) => new THREE.Vector2(r, y)),
      28,
    );
  const felt = new THREE.MeshStandardMaterial({
    color: 0x4a3f35,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const ribbon = new THREE.MeshStandardMaterial({
    color: 0x1c1916,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  // A fedora's shape on the round lathe: the brim snapped down at the front and back and up at
  // the sides, the crown's top creased front to back, its front pinched in.
  const shape = (g: THREE.BufferGeometry) => {
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i),
        y = pos.getY(i);
      const z = pos.getZ(i),
        r = Math.hypot(x, z);
      if (r > 1.02 && y < 0.02) {
        const side = (x / r) ** 2;
        y += (r - 1) * (0.075 * side - 0.05 * (1 - side));
      }
      if (y > 0.07) {
        const t = (y - 0.07) / 0.05;
        if (z < 0) x *= 1 - 0.14 * t * Math.min(1, -z / 0.8);
        y -= 0.024 * t * Math.max(0, 1 - Math.abs(x) / 0.55);
      }
      pos.setXY(i, x, y);
    }
    g.computeVertexNormals();
    return g;
  };
  hatParts = [
    { geometry: shape(lathe(HAT_CROWN)), material: felt },
    { geometry: shape(lathe(HAT_BAND)), material: ribbon },
  ];
  return hatParts;
}

/**
 * Helmet fit, from the wearer's own skull (owner, 2026-11-04: "all of the helmets do not fit the
 * heads"): the head's posed vertices above the neck give its box in character space; the shell
 * (authored as a 0.132 m sphere, ×(1, 0.92, 1.1)) is scaled per axis to clear the skull by a
 * finger's width at the sides, the crown a little more, its rim above the eyes.
 */
const HELMET_CLEAR = { side: 0.012, back: 0.016, crown: 0.014 };
/** Shell origin below the crown (the rim sits ≈ 2 cm under the origin: above the brow). */
const HELMET_DEPTH = 0.075;
const SHELL = { r: 0.132, y: 0.92, z: 1.1, lift: 0.005 };

function headBox(root: THREE.Object3D, head: THREE.Object3D) {
  // The skull: vertices driven mostly by the head bone (or the bones under it).
  const headBones = new Set<THREE.Object3D>();
  head.traverse((o) => headBones.add(o));
  return skinnedBox(root, headBones);
}

/**
 * Box (character space) of the posed vertices driven mostly by one of `bones`; `band` keeps
 * only those between two heights (the chest, where a vest's plates sit).
 */
function skinnedBox(root: THREE.Object3D, headBones: Set<THREE.Object3D>, band?: [number, number]) {
  // updateMatrixWorld, not updateWorldMatrix: only the former refreshes a skinned mesh's
  // bindMatrixInverse (three.js SkinnedMesh, bindMode "attached"), which getVertexPosition
  // below goes through. Stale, it still held where the character was drawn last frame, so a
  // pooled player character moved to a new seat measured its head kilometres away and the
  // officer's hat (and the worn helmet) was fitted there: in the world nobody had a hat
  // (owner, 2026-11-11: "the police cap is still not displayed in the game"). The inventory's
  // figure, always at the origin, never showed it.
  root.updateWorldMatrix(true, false);
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const box = new THREE.Box3(),
    v = new THREE.Vector3();
  /** In a band: every point kept, for a percentile box (a hood or a strap does not count). */
  const pts: number[][] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.SkinnedMesh) || !o.visible) return;
    const g = o.geometry,
      index = g.getIndex(),
      si = g.getAttribute("skinIndex"),
      sw = g.getAttribute("skinWeight");
    if (!si || !sw) return;
    const bones = o.skeleton.bones;
    const count = index ? index.count : g.getAttribute("position").count;
    const seen = new Set<number>();
    for (let k = 0; k < count; k++) {
      const i = index ? index.getX(k) : k;
      if (seen.has(i)) continue;
      seen.add(i);
      let best = -1,
        w = 0;
      for (let j = 0; j < 4; j++)
        if (sw.getComponent(i, j) > w) {
          w = sw.getComponent(i, j);
          best = si.getComponent(i, j);
        }
      if (best < 0 || !headBones.has(bones[best]!)) continue;
      o.getVertexPosition(i, v);
      v.applyMatrix4(o.matrixWorld).applyMatrix4(toRoot);
      if (band && (v.y < band[0] || v.y > band[1])) continue;
      if (band) pts.push([v.x, v.y, v.z]);
      else box.expandByPoint(v);
    }
  });
  if (band && pts.length) {
    const pick = (axis: number, q: number) => {
      const a = pts.map((p) => p[axis]!).sort((x, y) => x - y);
      return a[Math.min(a.length - 1, Math.floor(a.length * q))]!;
    };
    box.min.set(pick(0, 0.02), pick(1, 0), pick(2, 0.02));
    box.max.set(pick(0, 0.98), pick(1, 1), pick(2, 0.98));
  }
  return box;
}

/**
 * The worn-gear models (art/blender/br/build_gear.mjs → gear.glb: "helmet-1" … "backpack-3",
 * CC BY, credited in ATTRIBUTION.md). Until they load — and for any piece missing from the file
 * — the procedural pieces above stand in.
 */
type GearModel = {
  object: THREE.Object3D;
  fit: {
    min: number[];
    max: number[];
    crown: { minX: number; maxX: number; minZ: number; maxZ: number };
    /** Vests: the inner opening at chest height (build_gear.mjs). */
    inner?: { minX: number; maxX: number; minZ: number; maxZ: number };
    /** Packs: the back panel's plane (z) on the straps side. */
    panel?: number;
  };
};
let models: Map<string, GearModel> | null = null;
let modelsLoading: Promise<void> | null = null;
/** True once the worn-gear models have loaded (or failed and the stand-ins are final). */
export const gearModelsReady = () => models !== null;
/** The loaded gear and hat templates (wearers get clones): for the arena's shader warm-up. */
export const gearModelObjects = () => [...(models?.values() ?? [])].map((m) => m.object);
export function loadGearModels(
  loader: { loadAsync(url: string): Promise<{ scene: THREE.Object3D }> },
  url: string,
  /** The officer's hat (art/blender/br/build_hat.mjs), beside gear.glb by default. */
  hatUrl = url.replace(/gear\.glb$/, "hat.glb"),
) {
  const read = (u: string) =>
    loader
      .loadAsync(u)
      .then((g) => g.scene.children)
      .catch(() => [] as THREE.Object3D[]);
  return (modelsLoading ??= Promise.all([read(url), read(hatUrl)]).then(([gear, hat]) => {
    const m = new Map<string, GearModel>();
    for (const child of [...gear, ...hat]) {
      const fit = child.userData["fit"] as GearModel["fit"] | undefined;
      if (!fit) continue;
      child.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = true;
      });
      m.set(child.name, { object: child, fit });
    }
    models = m;
  }));
}
/** Helmet on a skull: the shell clears it by about 1.5 cm (padding and shell), centred. */
const MODEL_HELMET = { width: 0.032, crown: 0.022, back: 0.004 };
/**
 * The level-1 helmet (the M1-style shell) is modelled facing backwards: worn as it came, its
 * low neck guard hung over the face (owner, 2026-11-10: "fix this helm, it blocks the face").
 */
const HELMET_YAW: Record<1 | 2 | 3, number> = { 1: Math.PI, 2: 0, 3: 0 };
const UP = new THREE.Vector3(0, 1, 0);
/**
 * Vests and packs at their real sizes (metres) on a reference torso 0.36 m wide, scaled with the
 * wearer's torso: vest height, pack height. The vest's top sits at the shoulders (`top`, from
 * the torso's top) and wraps the torso's centre; the pack's back panel lies against the back,
 * its top `top` above the shoulders.
 */
const MODEL_FIT = {
  torso: 0.36,
  vest: {
    // The soft vest (closed sides): it hugs the chest, armpits to the belt line.
    1: { top: -0.07, height: 0.36 },
    2: { top: -0.02, height: 0.42 },
    // The heavy vest's cummerbund flares out at the belly: hug it a little deeper.
    3: { top: 0.02, height: 0.5, depth: 0.88 },
  },
  /**
   * Packs: height, the body's depth off the back and its width at most (metres, reference
   * torso): a daypack, an assault pack, a three-day pack — slim, inside the shoulders' line.
   */
  backpack: {
    1: { height: 0.38, depth: 0.12, width: 0.3 },
    2: { height: 0.44, depth: 0.14, width: 0.31 },
    3: { height: 0.48, depth: 0.15, width: 0.32 },
    top: 0.05,
  },
  /** Vests: what is left of the plates', pouches' and cummerbund's depth past the torso. */
  vestPress: 0.22,
  /** Packs: what is left of side pockets past the width above. */
  packSidePress: 0.2,
  /** Vest opening round the torso, and the pack panel off the back (owner: "fit tightly"). */
  clear: 0.01,
  panelGap: 0.006,
  /** The chest band measured for the fit: from this far below the torso's top … to this. */
  // (below the collar and the fighter's hood, which hangs down the upper back).
  chestBand: [0.32, 0.14] as [number, number],
} as const;

type Rig = {
  code: number;
  /** Built with the loaded models (otherwise the procedural stand-ins; rebuilt once they load). */
  models: boolean;
  pieces: { helmet: THREE.Group[]; vest: THREE.Group[]; backpack: THREE.Group[] };
  /** The officer's own hat (battle royale), off while a helmet is worn. */
  hat: THREE.Group | null;
};
const rigs = new WeakMap<THREE.Object3D, Rig>();
const findBone = (root: THREE.Object3D, name: string) => {
  let found: THREE.Bone | undefined;
  root.traverse((o) => {
    if (
      !found &&
      o instanceof THREE.Bone &&
      o.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, "") === name
    )
      found = o;
  });
  return found;
};

/**
 * Bind a piece to `bone` so that, at the bone's pose now, it sits at `offset` (character space,
 * metres) from the bone with the character's own orientation and unit scale.
 */
function bind(
  root: THREE.Object3D,
  bone: THREE.Object3D,
  parts: Part[],
  offset: THREE.Vector3,
  scale: number | THREE.Vector3,
) {
  const holder = new THREE.Group();
  holder.name = "worn-gear";
  for (const { geometry, material } of parts) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    holder.add(mesh);
  }
  root.updateWorldMatrix(true, true);
  const rootQ = root.getWorldQuaternion(new THREE.Quaternion());
  const at = bone.getWorldPosition(new THREE.Vector3()).add(offset.clone().applyQuaternion(rootQ));
  const want = new THREE.Matrix4().compose(
    at,
    rootQ,
    typeof scale === "number" ? new THREE.Vector3(scale, scale, scale) : scale,
  );
  const local = bone.matrixWorld.clone().invert().multiply(want);
  local.decompose(holder.position, holder.quaternion, holder.scale);
  holder.visible = false;
  bone.add(holder);
  return holder;
}

/**
 * Worn gear hugs the body (owner, 2026-11-10: "when kevlar/vest/bag is on the character looks
 * fat … should be same character model fit size with the items on"). The models' plates,
 * pouches and pack bodies are modelled deep for a loot pickup; worn, everything outside the
 * part that wraps the body is pressed towards it: per axis, a vertex past [lo, hi] keeps only
 * `k` of its distance beyond (shape kept, thickness cut). On a copy of the geometry (the loaded
 * model is shared), cached per model and fit.
 */
type Slim = { x?: [number, number, number]; z?: [number, number, number] };
const slimmed = new Map<string, THREE.Object3D>();
function slimModel(name: string, object: THREE.Object3D, slim: Slim) {
  const key = `${name}|${JSON.stringify(slim, (_, v: unknown) => (typeof v === "number" ? +v.toFixed(3) : v))}`;
  let out = slimmed.get(key);
  if (out) return out;
  out = object.clone(true);
  out.position.set(0, 0, 0);
  out.quaternion.identity();
  out.scale.setScalar(1);
  out.updateMatrixWorld(true);
  const press = (v: number, r?: [number, number, number]) =>
    !r ? v : v < r[0] ? r[0] + (v - r[0]) * r[2] : v > r[1] ? r[1] + (v - r[1]) * r[2] : v;
  const p = new THREE.Vector3(),
    inv = new THREE.Matrix4();
  out.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const g = o.geometry.clone();
    const pos = g.getAttribute("position");
    inv.copy(o.matrixWorld).invert();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      p.set(press(p.x, slim.x), p.y, press(p.z, slim.z)).applyMatrix4(inv);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    g.computeBoundingBox();
    g.computeBoundingSphere();
    o.geometry = g;
  });
  slimmed.set(key, out);
  return out;
}

/** Like `bind`, for a loaded model (cloned; its own materials and textures are shared). */
function bindObject(
  root: THREE.Object3D,
  bone: THREE.Object3D,
  object: THREE.Object3D,
  offset: THREE.Vector3,
  scale: number | THREE.Vector3,
  yaw = 0,
) {
  const holder = bind(root, bone, [], offset, scale);
  const o = object.clone(true);
  o.position.set(0, 0, 0);
  o.quaternion.setFromAxisAngle(UP, yaw);
  o.scale.setScalar(1);
  holder.add(o);
  return holder;
}

/**
 * Show `code`'s gear on a character (authored-character root). Binds on the first call after
 * the character's skeleton has loaded; cheap when the code has not changed.
 */
export function fitCharacterGear(character: { root: THREE.Object3D }, code: number) {
  const root = character.root;
  let rig = rigs.get(root);
  if (rig && !rig.models && models) {
    for (const slot of ["helmet", "vest", "backpack"] as const)
      for (const h of rig.pieces[slot]) h.removeFromParent();
    rig.hat?.removeFromParent();
    rigs.delete(root);
    rig = undefined;
  }
  if (!rig) {
    const head = findBone(root, "Head"),
      chest = findBone(root, "Spine2");
    if (!head || !chest) return;
    const k = gearKit();
    // The officer already wears a vest: the worn loot goes over it. In the battle royale his
    // own helmet is left off (authored-character `bareHead`), so a looted helmet sits on his
    // bare head like on the masked fighter's; with his helmet on, the shell sits larger over it.
    const police = root.name === "officer";
    const levels = [1, 2, 3] as const;
    // The helmet on this head: centred over the skull, scaled to clear it (headBox above).
    const skull = headBox(root, head);
    if (skull.isEmpty()) return;
    const centre = skull.getCenter(new THREE.Vector3()),
      size = skull.getSize(new THREE.Vector3());
    const originY = skull.max.y - HELMET_DEPTH;
    const fit = new THREE.Vector3(
      (size.x / 2 + HELMET_CLEAR.side) / SHELL.r,
      (skull.max.y + HELMET_CLEAR.crown - originY - SHELL.lift) / (SHELL.r * SHELL.y),
      (size.z / 2 + HELMET_CLEAR.back) / (SHELL.r * SHELL.z),
    );
    root.updateWorldMatrix(true, true);
    const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const headPos = head.getWorldPosition(new THREE.Vector3()).applyMatrix4(toRoot);
    const headAt = new THREE.Vector3(centre.x, originY, centre.z).sub(headPos),
      chestAt = new THREE.Vector3(0, -0.07, 0.0);
    root.userData["helmetFit"] = { skull: skull.clone(), fit: fit.clone(), at: headAt.clone() };
    // A loaded helmet model: scaled as a whole (no stretching) so its crown band — the shell
    // without straps or headset — clears the skull, its top just above the crown.
    const helmetModel = (lv: 1 | 2 | 3) => {
      const m = models?.get(`helmet-${lv}`);
      if (!m) return bind(root, head, k.helmet[lv], headAt, fit);
      const c = m.fit.crown;
      const scale = (size.x + MODEL_HELMET.width) / (c.maxX - c.minX);
      // Turned half round, the crown's centre is mirrored.
      const turn = Math.cos(HELMET_YAW[lv]);
      const at = new THREE.Vector3(
        centre.x - ((c.minX + c.maxX) / 2) * scale * turn,
        skull.max.y + MODEL_HELMET.crown - m.fit.max[1]! * scale,
        centre.z + MODEL_HELMET.back - ((c.minZ + c.maxZ) / 2) * scale * turn,
      ).sub(headPos);
      return bindObject(root, head, m.object, at, scale, HELMET_YAW[lv]);
    };
    // The torso (spine-driven vertices; for the officer, his own vest) for vests and packs.
    const spine = new Set<THREE.Object3D>();
    for (const n of ["Spine", "Spine1", "Spine2"]) {
      const b = findBone(root, n);
      if (b) spine.add(b);
    }
    const whole = skinnedBox(root, spine);
    // The chest band (below the shoulders): its width and depth are what a vest wraps and
    // its back is where a pack lies (the whole torso's box also counts belly, hips and hood).
    const torso = whole.isEmpty()
      ? whole
      : skinnedBox(root, spine, [
          whole.max.y - MODEL_FIT.chestBand[0],
          whole.max.y - MODEL_FIT.chestBand[1],
        ]);
    torso.max.y = whole.max.y;
    const torsoC = torso.getCenter(new THREE.Vector3()),
      torsoS = torso.getSize(new THREE.Vector3());
    const chestPos = chest.getWorldPosition(new THREE.Vector3()).applyMatrix4(toRoot);
    const build = torso.isEmpty() ? 1 : torsoS.x / MODEL_FIT.torso;
    const vestModel = (lv: 1 | 2 | 3) => {
      const m = models?.get(`vest-${lv}`);
      if (!m || torso.isEmpty())
        return bind(root, chest, k.vest[lv], chestAt, police ? 1.12 : 1.04);
      // Tight: the vest's inner opening scaled (per axis) to wrap the torso with a little
      // clearance and centred on it; the height follows the mean of the two.
      const i = m.fit.inner ?? {
        minX: m.fit.min[0]!,
        maxX: m.fit.max[0]!,
        minZ: m.fit.min[2]!,
        maxZ: m.fit.max[2]!,
      };
      const object = slimModel(`vest-${lv}`, m.object, {
        x: [i.minX, i.maxX, MODEL_FIT.vestPress],
        z: [i.minZ, i.maxZ, MODEL_FIT.vestPress],
      });
      const sx = (torsoS.x + 2 * MODEL_FIT.clear) / (i.maxX - i.minX);
      const lvFit = MODEL_FIT.vest[lv];
      const depth = "depth" in lvFit ? lvFit.depth : 1;
      const sz = ((torsoS.z + 2 * MODEL_FIT.clear) / (i.maxZ - i.minZ)) * depth;
      // Height: the vest's real height (shoulder straps to cummerbund) on this build.
      const sy = (MODEL_FIT.vest[lv].height * build) / (m.fit.max[1]! - m.fit.min[1]!);
      const at = new THREE.Vector3(
        torsoC.x - ((i.minX + i.maxX) / 2) * sx,
        torso.max.y + MODEL_FIT.vest[lv].top - m.fit.max[1]! * sy,
        torsoC.z - ((i.minZ + i.maxZ) / 2) * sz,
      ).sub(chestPos);
      return bindObject(root, chest, object, at, new THREE.Vector3(sx, sy, sz));
    };
    const packModel = (lv: 1 | 2 | 3) => {
      const m = models?.get(`backpack-${lv}`);
      if (!m || torso.isEmpty())
        return bind(root, chest, k.backpack[lv], chestAt, police ? 1.08 : 1);
      const want = MODEL_FIT.backpack[lv];
      const scale = (want.height * build) / (m.fit.max[1]! - m.fit.min[1]!);
      // The body off the back pressed to its depth, side pockets to the width; the straps
      // (in front of the back panel) as modelled.
      const panel = m.fit.panel ?? m.fit.min[2]! + 0.03;
      const cx = (m.fit.min[0]! + m.fit.max[0]!) / 2,
        half = (want.width * build) / 2 / scale;
      const object = slimModel(`backpack-${lv}`, m.object, {
        x: [cx - half, cx + half, MODEL_FIT.packSidePress],
        z: [-1e3, panel, Math.min(1, (want.depth * build) / scale / (m.fit.max[2]! - panel))],
      });
      const at = new THREE.Vector3(
        torsoC.x,
        torso.max.y + MODEL_FIT.backpack.top - m.fit.max[1]! * scale,
        // The back panel (not the strap loops) against the back.
        torso.max.z + MODEL_FIT.panelGap - panel * scale,
      ).sub(chestPos);
      return bindObject(root, chest, object, at, scale);
    };
    root.userData["torsoFit"] = { torso: torso.clone() };
    // The officer's hat (his helmet is taken off in the battle royale: authored `bareHead`).
    const hatModel = models?.get("hat");
    const hat = !(police && root.userData["bareHead"])
      ? null
      : hatModel
        ? (() => {
            // The detective's hat: its crown over the skull (scaled as a whole), the top a
            // little above the crown of the head.
            const c = hatModel.fit.crown,
              scale = (size.x + MODEL_HAT.width) / (c.maxX - c.minX);
            const at = new THREE.Vector3(
              centre.x - ((c.minX + c.maxX) / 2) * scale,
              skull.max.y + MODEL_HAT.crown - hatModel.fit.max[1]! * scale,
              centre.z + MODEL_HAT.back,
            ).sub(headPos);
            return bindObject(root, head, hatModel.object, at, scale, MODEL_HAT.yaw);
          })()
        : bind(
            root,
            head,
            hatKit(),
            new THREE.Vector3(centre.x, skull.max.y - HAT_FIT.brim, centre.z).sub(headPos),
            new THREE.Vector3(size.x / 2 + HAT_FIT.side, 1, size.z / 2 + HAT_FIT.back),
          );
    rig = {
      code: -1,
      hat,
      models: !!models,
      pieces: {
        helmet: levels.map(helmetModel),
        vest: levels.map(vestModel),
        backpack: levels.map(packModel),
      },
    };
    rigs.set(root, rig);
  }
  if (rig.code === code) return;
  rig.code = code;
  const g = decodeGear(code);
  for (const slot of ["helmet", "vest", "backpack"] as const)
    rig.pieces[slot].forEach((holder, i) => (holder.visible = g[slot] === i + 1));
  if (rig.hat) rig.hat.visible = g.helmet === 0;
}
