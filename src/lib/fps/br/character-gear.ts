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
export const gearCode = (helmet: number, vest: number, backpack: number) =>
  (helmet & 3) + (vest & 3) * 4 + (backpack & 3) * 16;
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

type Rig = {
  code: number;
  pieces: { helmet: THREE.Group[]; vest: THREE.Group[]; backpack: THREE.Group[] };
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
  scale: number,
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
  const want = new THREE.Matrix4().compose(at, rootQ, new THREE.Vector3(scale, scale, scale));
  const local = bone.matrixWorld.clone().invert().multiply(want);
  local.decompose(holder.position, holder.quaternion, holder.scale);
  holder.visible = false;
  bone.add(holder);
  return holder;
}

/**
 * Show `code`'s gear on a character (authored-character root). Binds on the first call after
 * the character's skeleton has loaded; cheap when the code has not changed.
 */
export function fitCharacterGear(character: { root: THREE.Object3D }, code: number) {
  const root = character.root;
  let rig = rigs.get(root);
  if (!rig) {
    const head = findBone(root, "Head"),
      chest = findBone(root, "Spine2");
    if (!head || !chest) return;
    const k = gearKit();
    // The officer already wears a vest and helmet: the worn loot goes over them.
    const police = root.name === "officer";
    const levels = [1, 2, 3] as const;
    // The officer's own helmet and goggles stay under the shell: it sits larger on him.
    const headAt = new THREE.Vector3(0, police ? 0.085 : 0.11, police ? 0.005 : -0.025),
      chestAt = new THREE.Vector3(0, -0.07, 0.0);
    rig = {
      code: -1,
      pieces: {
        helmet: levels.map((lv) => bind(root, head, k.helmet[lv], headAt, police ? 1.17 : 1.14)),
        vest: levels.map((lv) => bind(root, chest, k.vest[lv], chestAt, police ? 1.12 : 1.04)),
        backpack: levels.map((lv) => bind(root, chest, k.backpack[lv], chestAt, police ? 1.08 : 1)),
      },
    };
    rigs.set(root, rig);
  }
  if (rig.code === code) return;
  rig.code = code;
  const g = decodeGear(code);
  for (const slot of ["helmet", "vest", "backpack"] as const)
    rig.pieces[slot].forEach((holder, i) => (holder.visible = g[slot] === i + 1));
}
