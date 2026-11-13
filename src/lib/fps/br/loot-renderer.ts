import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { WORLD_RIFLES } from "../model-assets";
import { loadAttachmentParts, normPart } from "./attachment-fit";
import {
  attachmentFallback,
  groundAttachment,
  groundGear,
  type GroundLootKind,
} from "./ground-loot-models";
import { ITEMS, RARITY, type ItemId, type WeaponId } from "./items";
import type { WorldItem } from "./loot";
import { itemFromCode, type LootRow } from "./loot-world";
import type { StaticWorld } from "./static-world";

/**
 * Loot on the ground (LOOT-SPEC §15): every item as a real object where the server put it.
 * Guns are the 1v1/5v5 world rifles (AK-47, M4, AWP); everything else is a small low-poly
 * object built here (owner: items may be built in code when that is cheaper), one instanced
 * mesh per kind, so a room full of loot costs a few draw calls. A faint rarity-coloured disc
 * under each item reads at a glance. Only items the server sent (within 70 m) exist here.
 */
export type LootClient = ReturnType<typeof createLootRenderer>;

const MAX_PER_KIND = 256;
const GUN_MODELS = 24;
type Kind = GroundLootKind;

function crossTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ecebe6";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#c0262b";
  g.fillRect(50, 22, 28, 84);
  g.fillRect(22, 50, 84, 28);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function contactTexture() {
  const size = 32,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(((x + 0.5) / size) * 2 - 1, ((y + 0.5) / size) * 2 - 1);
      data[(y * size + x) * 4 + 3] = Math.round(Math.max(0, 1 - d) ** 1.5 * 170);
    }
  const t = new THREE.DataTexture(data, size, size);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

const LEVEL_COLOR = { 1: 0x6b6f4e, 2: 0x8a7a55, 3: 0x2b3038 } as const;

function buildKinds(): Map<ItemId, Kind> {
  const k = new Map<ItemId, Kind>();
  const mat = (color: number, rough = 0.8, metal = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const box = (w: number, h: number, d: number) =>
    new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  for (const [id, kind] of groundGear()) k.set(id, kind);
  for (const lv of [1, 2, 3] as const) {
    k.set(`helmet-${lv}`, {
      geometry: new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(
        1,
        0.85,
        1.12,
      ),
      material: mat(LEVEL_COLOR[lv], 0.75),
    });
  }
  // The armour plate (one type): a black plate.
  k.set("plate", {
    geometry: box(0.26, 0.025, 0.33),
    material: mat(0x1c1e20, 0.5, 0.3),
  });
  k.set("bandage", {
    geometry: new THREE.CylinderGeometry(0.045, 0.045, 0.09, 12)
      .rotateZ(Math.PI / 2)
      .translate(0, 0.045, 0),
    material: mat(0xf0ebdf, 0.95),
  });
  const cross = crossTexture();
  k.set("medkit", {
    geometry: box(0.3, 0.12, 0.22),
    material: new THREE.MeshStandardMaterial({ map: cross, roughness: 0.6 }),
  });
  k.set("grenade-he", {
    geometry: new THREE.SphereGeometry(0.05, 12, 8).translate(0, 0.05, 0),
    material: mat(0x4b5a36, 0.6, 0.2),
  });
  k.set("grenade-smoke", {
    geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.13, 12).translate(0, 0.065, 0),
    material: mat(0x7b8287, 0.6, 0.2),
  });
  k.set("grenade-fire", {
    geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.13, 12).translate(0, 0.065, 0),
    material: mat(0x8a3a2c, 0.6, 0.2),
  });
  // The Tactical Tablet (an original tablet: the offered iPad model's licence did not allow
  // use). Owner, 2026-11-09: it should read as a tablet with its screen on, so a thin rounded
  // slab with a lit screen (unlit material: it glows at night and in shade alike).
  k.set("tablet", tabletKind());
  // Recognisable fallbacks are replaced by the shared, textured gun accessories before ready.
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    const c = ITEMS[id].category;
    if (c !== "optic" && c !== "muzzle") continue;
    k.set(id, attachmentFallback(c === "optic", id === "silencer" || id.startsWith("scope-")));
  }
  return k;
}

/** A tablet lying face up: graphite body and a switched-on screen (two draws). */
function tabletKind(): Kind {
  const w = 0.25,
    d = 0.175,
    h = 0.013;
  const body = new RoundedBoxGeometry(w, h, d, 3, 0.011).translate(0, h / 2, 0).toNonIndexed();
  // The glass: inset by a slim bezel, a hair above the body.
  const glass = new THREE.PlaneGeometry(w - 0.02, d - 0.02)
    .rotateX(-Math.PI / 2)
    .translate(0, h + 0.0006, 0)
    .toNonIndexed();
  for (const g of [body, glass])
    for (const name of Object.keys(g.attributes)) {
      if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    }
  const geometry = mergeGeometries([body, glass], true)!;
  body.dispose();
  glass.dispose();
  return {
    geometry,
    material: [
      new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.45, metalness: 0.35 }),
      new THREE.MeshBasicMaterial({ map: tabletScreen() }),
    ],
  };
}

/**
 * The tablet's lit screen: status bar, a tactical map with the zone ring and markers, app
 * tiles and a dock, in bright screen colours so it reads as a switched-on tablet from afar.
 */
function tabletScreen() {
  const W = 512,
    H = 352;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#123b6e");
  grad.addColorStop(1, "#0b6b78");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // Status bar: time, signal and battery.
  g.fillStyle = "#ffffff";
  g.font = "bold 22px sans-serif";
  g.fillText("12:41", 18, 28);
  for (let i = 0; i < 4; i++) g.fillRect(W - 120 + i * 9, 26 - (i + 1) * 4, 6, (i + 1) * 4);
  g.strokeStyle = "#ffffff";
  g.lineWidth = 2;
  g.strokeRect(W - 70, 11, 40, 18);
  g.fillStyle = "#7dff8a";
  g.fillRect(W - 67, 14, 28, 12);
  const round = (x: number, y: number, w: number, h: number, r: number) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  // The map widget: island greens, a grid, the safe-zone ring and three markers.
  round(18, 44, 300, 220, 16);
  g.save();
  g.clip();
  g.fillStyle = "#2f7d4a";
  g.fillRect(18, 44, 300, 220);
  g.fillStyle = "#3f9a5a";
  for (const [x, y, r] of [
    [90, 120, 60],
    [220, 190, 70],
    [260, 90, 40],
  ]) {
    g.beginPath();
    g.arc(x!, y!, r!, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#2a6fb8";
  g.fillRect(18, 236, 300, 28);
  g.strokeStyle = "#ffffff30";
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 18; x < 318; x += 30) {
    g.moveTo(x, 44);
    g.lineTo(x, 264);
  }
  for (let y = 44; y < 264; y += 30) {
    g.moveTo(18, y);
    g.lineTo(318, y);
  }
  g.stroke();
  g.strokeStyle = "#ffffff";
  g.lineWidth = 4;
  g.beginPath();
  g.arc(170, 150, 78, 0, Math.PI * 2);
  g.stroke();
  for (const [x, y, col] of [
    [150, 140, "#ffd23f"],
    [210, 110, "#ff4d4d"],
    [110, 200, "#ff4d4d"],
  ] as const) {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, 8, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // App tiles beside the map.
  const tiles = ["#ff9f1c", "#2ec4b6", "#e71d36", "#9b5de5", "#00bbf9", "#f15bb5"];
  tiles.forEach((col, i) => {
    const x = 340 + (i % 2) * 82,
      y = 44 + Math.floor(i / 2) * 76;
    g.fillStyle = col;
    round(x, y, 64, 64, 14);
    g.fill();
    g.fillStyle = "#ffffffcc";
    g.beginPath();
    g.arc(x + 32, y + 32, 13, 0, Math.PI * 2);
    g.fill();
  });
  // Dock.
  g.fillStyle = "#ffffff2e";
  round(96, 282, 320, 56, 18);
  g.fill();
  ["#34c759", "#0a84ff", "#ff9500", "#ff2d55"].forEach((col, i) => {
    g.fillStyle = col;
    round(118 + i * 76, 290, 40, 40, 10);
    g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Wrap a gun model so it lies flat: its longest side along x, its thinnest side up, resting on
 * y = 0 at its centre (whatever axes the third-person model was authored in).
 */
function layFlat(model: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const axes = [
    { v: new THREE.Vector3(1, 0, 0), s: size.x },
    { v: new THREE.Vector3(0, 1, 0), s: size.y },
    { v: new THREE.Vector3(0, 0, 1), s: size.z },
  ].sort((a, b) => b.s - a.s);
  const long = axes[0]!.v,
    thin = axes[2]!.v;
  const basis = new THREE.Matrix4().makeBasis(long, thin, long.clone().cross(thin));
  const q = new THREE.Quaternion().setFromRotationMatrix(basis).invert();
  model.quaternion.premultiply(q);
  model.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(model);
  const c = b.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(c.x, b.min.y, c.z));
  const holder = new THREE.Group();
  holder.add(model);
  return holder;
}

export function createLootRenderer(scene: THREE.Scene, loader: GLTFLoader, base: string) {
  const root = new THREE.Group();
  root.name = "loot";
  scene.add(root);
  const items = new Map<number, WorldItem>();
  const kinds = buildKinds();
  const ownedTextures = new Set<THREE.Texture>();
  for (const kind of kinds.values())
    for (const m of Array.isArray(kind.material) ? kind.material : [kind.material])
      for (const value of Object.values(m))
        if (value instanceof THREE.Texture) ownedTextures.add(value);
  let stopped = false;
  let dirty = true;
  const meshes = new Map<ItemId, THREE.InstancedMesh>();
  for (const [id, kind] of kinds) {
    const m = new THREE.InstancedMesh(kind.geometry, kind.material, MAX_PER_KIND);
    m.name = `ground-loot-${id}`;
    m.count = 0;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    meshes.set(id, m);
    root.add(m);
  }
  const discs = new THREE.InstancedMesh(
    new THREE.RingGeometry(0.105, 0.11, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    MAX_PER_KIND * 4,
  );
  discs.count = 0;
  discs.frustumCulled = false;
  // Its colour attribute from the start: made by the first setColorAt, it changed the mesh's
  // shader program on the frame the first loot came into range.
  discs.setColorAt(0, new THREE.Color());
  root.add(discs);
  const contact = contactTexture();
  ownedTextures.add(contact);
  const shadows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: contact,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    }),
    MAX_PER_KIND * 4,
  );
  shadows.name = "loot-contact-shadows";
  shadows.count = 0;
  shadows.frustumCulled = false;
  root.add(shadows);
  // Guns: the third-person rifles, cloned for the nearest ones.
  const templates: Partial<Record<WeaponId, THREE.Object3D>> = {};
  const url = (p: string) => new URL(p.replace(/^\//, ""), base).href;
  const ready = Promise.all([
    ...(
      [
        ["ak47", WORLD_RIFLES.ak],
        ["m4", WORLD_RIFLES.m4],
        ["awp", WORLD_RIFLES.awp],
        ["mp5", WORLD_RIFLES.mp5],
        ["deagle", WORLD_RIFLES.deagle],
        ["spas12", WORLD_RIFLES.spas12],
      ] as const
    ).map(async ([id, path]) => {
      try {
        const loaded = await loader.loadAsync(url(path));
        // The MP5's and the SPAS-12's optic rails only show with an optic fitted (none on the floor).
        const rail = loaded.scene.getObjectByName("OpticMountGeometry");
        if (rail) rail.visible = false;
        if (stopped) return;
        // Hidden in the scene, so the arena's shader warm-up compiles its materials (its clones
        // share them): otherwise the first gun lying in view stalled a frame for each.
        const template = (templates[id] = layFlat(loaded.scene));
        template.visible = false;
        root.add(template);
      } catch {
        // Fallback: a dark bar stands in for the gun.
      }
    }),
    loadAttachmentParts(loader, url("/fps/br/models/ground-loot-v1.glb")).then((parts) => {
      if (stopped) return;
      for (const id of Object.keys(ITEMS) as ItemId[]) {
        const def = ITEMS[id];
        const gear = ["helmet", "vest", "backpack"].includes(def.category);
        if (!("mesh" in def) && !gear) continue;
        const source = parts.get(normPart("mesh" in def ? def.mesh : id));
        const pose = def.category === "helmet" ? "upright" : gear ? "face-up" : "side";
        const size = def.category === "helmet" ? 0.32 : gear ? 0.5 : undefined;
        const height =
          def.category === "vest" ? 0.1 : def.category === "backpack" ? 0.18 : undefined;
        const kind = source ? groundAttachment(source, pose, size, height) : null;
        if (!kind) continue;
        const old = kinds.get(id)!;
        const mesh = meshes.get(id)!;
        mesh.geometry = kind.geometry;
        mesh.material = kind.material;
        kinds.set(id, kind);
        old.geometry.dispose();
        for (const material of Array.isArray(old.material) ? old.material : [old.material])
          material.dispose();
      }
    }),
  ]).then(() => {
    dirty = true;
  });
  const gunPool: Array<{ id: string; object: THREE.Object3D }> = [];
  const gunBar = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.9, 0.06, 0.12).translate(0, 0.06, 0),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.3 }),
    MAX_PER_KIND,
  );
  gunBar.count = 0;
  gunBar.frustumCulled = false;
  root.add(gunBar);
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    s = new THREE.Vector3(1, 1, 1),
    color = new THREE.Color();
  /** A stable per-item turn so loot does not all face the same way. */
  const turnOf = (id: number) => ((Math.imul(id, 2654435761) >>> 0) / 2 ** 32) * Math.PI * 2;

  function gunObject(id: WeaponId, muzzle: string | null) {
    let slot = gunPool.find((g) => !g.object.visible && g.id === id);
    if (!slot && gunPool.length < GUN_MODELS && templates[id]) {
      slot = { id, object: templates[id]!.clone(true) };
      gunPool.push(slot);
      root.add(slot.object);
    }
    if (!slot) return null;
    // The M4 is unsuppressed in the battle royale unless it carries the Silencer.
    const suppressor = slot.object.getObjectByName("SuppressorGeometry");
    if (suppressor) suppressor.visible = muzzle === "silencer";
    return slot.object;
  }

  function rebuild(eye: THREE.Vector3) {
    dirty = false;
    for (const m of meshes.values()) m.count = 0;
    discs.count = 0;
    shadows.count = 0;
    gunBar.count = 0;
    for (const g of gunPool) g.object.visible = false;
    const guns = [...items.values()]
      .filter((i) => ITEMS[i.item].category === "weapon")
      .sort(
        (a, b) =>
          (a.x - eye.x) ** 2 + (a.z - eye.z) ** 2 - ((b.x - eye.x) ** 2 + (b.z - eye.z) ** 2),
      );
    const modelled = new Set<number>();
    for (const g of guns) {
      const o = gunObject(g.item as WeaponId, g.muzzle ?? null);
      if (!o) break;
      o.visible = true;
      // Lying flat on the floor (layFlat put it in a holder), turned per item.
      o.position.set(g.x, g.y, g.z);
      o.rotation.set(0, turnOf(g.id), 0);
      modelled.add(g.id);
    }
    for (const i of items.values()) {
      const turn = turnOf(i.id);
      q.setFromAxisAngle(v.set(0, 1, 0), turn);
      m4.compose(v.set(i.x, i.y + 0.005, i.z), q, s);
      if (ITEMS[i.item].category === "weapon") {
        if (!modelled.has(i.id) && gunBar.count < MAX_PER_KIND)
          gunBar.setMatrixAt(gunBar.count++, m4);
      } else {
        const mesh = meshes.get(i.item);
        if (mesh && mesh.count < MAX_PER_KIND) mesh.setMatrixAt(mesh.count++, m4);
      }
      if (discs.count < discs.instanceMatrix.count) {
        m4.compose(v.set(i.x, i.y + 0.012, i.z), q.identity(), s);
        discs.setMatrixAt(discs.count, m4);
        discs.setColorAt(discs.count++, color.set(RARITY[ITEMS[i.item].rarity].color));
      }
      if (shadows.count < shadows.instanceMatrix.count) {
        const geometry = kinds.get(i.item)?.geometry;
        if (geometry && !geometry.boundingBox) geometry.computeBoundingBox();
        const box = geometry?.boundingBox;
        const width = box ? box.max.x - box.min.x : 0.85;
        const depth = box ? box.max.z - box.min.z : 0.2;
        q.setFromAxisAngle(v.set(0, 1, 0), turn);
        m4.compose(
          v.set(i.x, i.y + 0.003, i.z),
          q,
          s.set(Math.max(0.08, width * 1.2), 1, Math.max(0.06, depth * 1.2)),
        );
        shadows.setMatrixAt(shadows.count++, m4);
        s.set(1, 1, 1);
      }
    }
    for (const m of meshes.values()) {
      m.visible = m.count > 0;
      m.instanceMatrix.needsUpdate = true;
    }
    gunBar.visible = gunBar.count > 0;
    discs.visible = discs.count > 0;
    shadows.visible = shadows.count > 0;
    shadows.instanceMatrix.needsUpdate = true;
    gunBar.instanceMatrix.needsUpdate = true;
    discs.instanceMatrix.needsUpdate = true;
    if (discs.instanceColor) discs.instanceColor.needsUpdate = true;
  }

  let lastEye = new THREE.Vector3(1e9, 0, 0);
  return {
    root,
    ready,
    items,
    apply(update: { add: LootRow[]; del: number[] } | undefined) {
      if (!update) return;
      for (const id of update.del) items.delete(id);
      for (const r of update.add) {
        const item = itemFromCode(r[1]);
        if (!item) continue;
        items.set(r[0], {
          id: r[0],
          item,
          x: r[2],
          y: r[3],
          z: r[4],
          qty: r[5],
          ...(r[6] >= 0 ? { durability: r[6] } : {}),
          ...(r[7] >= 0 ? { mag: r[7] } : {}),
          optic: r[8] >= 0 ? (itemFromCode(r[8]) ?? null) : null,
          muzzle: r[9] >= 0 ? (itemFromCode(r[9]) ?? null) : null,
          extMag: (r[10] ?? -1) >= 0 ? (itemFromCode(r[10]!) ?? null) : null,
        });
      }
      dirty = true;
    },
    clear() {
      items.clear();
      dirty = true;
    },
    update(eye: THREE.Vector3) {
      if (dirty || eye.distanceToSquared(lastEye) > 100) {
        lastEye = eye.clone();
        rebuild(eye);
      }
    },
    /**
     * The item E would pick up: within reach, the one closest to the crosshair (or, failing
     * that, right at the feet), and not behind a wall. Mirrors the server's reach check.
     */
    target(eye: THREE.Vector3, forward: THREE.Vector3, reach: number, world: StaticWorld) {
      let best: WorldItem | null = null,
        score = Infinity;
      for (const i of items.values()) {
        const dx = i.x - eye.x,
          dy = i.y + 0.15 - eye.y,
          dz = i.z - eye.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > reach) continue;
        const cos = (dx * forward.x + dy * forward.y + dz * forward.z) / Math.max(1e-6, d);
        const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
        const feet = Math.hypot(dx, dz) < 0.9;
        if (angle > 0.45 && !feet) continue;
        const sc = angle + d * 0.05;
        if (sc >= score) continue;
        const hit = world.raycast(eye.x, eye.y, eye.z, dx, dy, dz, d);
        if (hit && hit.distance < d - 0.3) continue;
        best = i;
        score = sc;
      }
      return best;
    },
    dispose() {
      stopped = true;
      for (const m of meshes.values()) m.dispose();
      for (const kind of kinds.values()) {
        kind.geometry.dispose();
        for (const m of Array.isArray(kind.material) ? kind.material : [kind.material]) {
          // A material's dispose does not dispose its maps: the ground-loot pack's 55
          // textures stayed on the GPU after every match (leak check, 2026-11-09).
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      }
      discs.dispose();
      discs.geometry.dispose();
      (discs.material as THREE.Material).dispose();
      shadows.dispose();
      shadows.geometry.dispose();
      (shadows.material as THREE.Material).dispose();
      gunBar.dispose();
      gunBar.geometry.dispose();
      (gunBar.material as THREE.Material).dispose();
      for (const t of ownedTextures) t.dispose();
      // The guns on the ground: the templates and their clones share geometry, materials and
      // maps, and leave the scene with the root, before the arena's own sweep.
      for (const gun of Object.values(templates))
        gun.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
            m.dispose();
          }
        });
      root.removeFromParent();
    },
  };
}
