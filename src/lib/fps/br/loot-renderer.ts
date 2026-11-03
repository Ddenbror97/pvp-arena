import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { WORLD_RIFLES } from "../model-assets";
import { ITEMS, RARITY, type ItemId } from "./items";
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
type Kind = { geometry: THREE.BufferGeometry; material: THREE.Material; lift: number };

function labelTexture(lines: string[], bg: string, fg: string) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(8, 8, 240, 112);
  g.fillStyle = fg;
  g.textAlign = "center";
  g.font = "bold 44px system-ui, sans-serif";
  g.fillText(lines[0]!, 128, 60);
  g.font = "bold 26px system-ui, sans-serif";
  g.fillText(lines[1] ?? "", 128, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

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

const LEVEL_COLOR = { 1: 0x6b6f4e, 2: 0x8a7a55, 3: 0x2b3038 } as const;

function buildKinds(): Map<ItemId, Kind> {
  const k = new Map<ItemId, Kind>();
  const mat = (color: number, rough = 0.8, metal = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const box = (w: number, h: number, d: number) =>
    new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
  // Ammunition boxes: original labelled boxes (owner: "sniper" on the box, 30 rounds each).
  const rifleLabel = labelTexture(["RIFLE", "5.56 / 7.62 · 30"], "#4d5233", "#e7dfb6");
  const sniperLabel = labelTexture(["SNIPER", ".338 · 30"], "#2d2a24", "#e9c56b");
  const ammoMat = (label: THREE.Texture, side: number) => [
    mat(side),
    mat(side),
    new THREE.MeshStandardMaterial({ map: label, roughness: 0.7 }),
    mat(side),
    new THREE.MeshStandardMaterial({ map: label, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ map: label, roughness: 0.7 }),
  ];
  k.set("ammo-rifle", {
    geometry: box(0.26, 0.13, 0.13),
    material: ammoMat(rifleLabel, 0x4d5233) as unknown as THREE.Material,
    lift: 0,
  });
  k.set("ammo-sniper", {
    geometry: box(0.24, 0.12, 0.12),
    material: ammoMat(sniperLabel, 0x2d2a24) as unknown as THREE.Material,
    lift: 0,
  });
  for (const lv of [1, 2, 3] as const) {
    k.set(`helmet-${lv}`, {
      geometry: new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(
        1,
        0.85,
        1.12,
      ),
      material: mat(LEVEL_COLOR[lv], 0.75),
      lift: 0,
    });
    k.set(`vest-${lv}`, {
      geometry: box(0.46, 0.07, 0.56),
      material: mat(LEVEL_COLOR[lv], 0.9),
      lift: 0,
    });
    k.set(`plate-${lv}`, {
      geometry: box(0.26, 0.025, 0.33),
      material: mat([0x8d9196, 0x5f7f99, 0x7b5c96][lv - 1]!, 0.45, 0.35),
      lift: 0,
    });
    k.set(`backpack-${lv}`, {
      geometry: box(0.34, 0.2 + lv * 0.08, 0.18),
      material: mat([0x5b6146, 0x6e5d3e, 0x2e3a2f][lv - 1]!, 0.95),
      lift: 0,
    });
  }
  k.set("bandage", {
    geometry: new THREE.CylinderGeometry(0.045, 0.045, 0.09, 12)
      .rotateZ(Math.PI / 2)
      .translate(0, 0.045, 0),
    material: mat(0xf0ebdf, 0.95),
    lift: 0,
  });
  const cross = crossTexture();
  k.set("medkit", {
    geometry: box(0.3, 0.12, 0.22),
    material: new THREE.MeshStandardMaterial({ map: cross, roughness: 0.6 }),
    lift: 0,
  });
  k.set("grenade-he", {
    geometry: new THREE.SphereGeometry(0.05, 12, 8).translate(0, 0.05, 0),
    material: mat(0x4b5a36, 0.6, 0.2),
    lift: 0,
  });
  k.set("grenade-smoke", {
    geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.13, 12).translate(0, 0.065, 0),
    material: mat(0x7b8287, 0.6, 0.2),
    lift: 0,
  });
  k.set("grenade-fire", {
    geometry: new THREE.CylinderGeometry(0.04, 0.04, 0.13, 12).translate(0, 0.065, 0),
    material: mat(0x8a3a2c, 0.6, 0.2),
    lift: 0,
  });
  // Optics and muzzle devices: a small padded case in the item's rarity colour (the real
  // attachment is a few centimetres long and would be lost on a floor).
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    const c = ITEMS[id].category;
    if (c !== "optic" && c !== "muzzle") continue;
    k.set(id, {
      geometry: box(c === "optic" ? 0.22 : 0.26, 0.07, 0.12),
      material: mat(
        new THREE.Color(RARITY[ITEMS[id].rarity].color).multiplyScalar(0.55).getHex(),
        0.7,
      ),
      lift: 0,
    });
  }
  return k;
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
  const meshes = new Map<ItemId, THREE.InstancedMesh>();
  for (const [id, kind] of kinds) {
    const m = new THREE.InstancedMesh(kind.geometry, kind.material, MAX_PER_KIND);
    m.count = 0;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    meshes.set(id, m);
    root.add(m);
  }
  const discs = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.22, 20).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    MAX_PER_KIND * 4,
  );
  discs.count = 0;
  discs.frustumCulled = false;
  root.add(discs);
  // Guns: the third-person rifles, cloned for the nearest ones.
  const templates: Partial<Record<"ak47" | "m4" | "awp", THREE.Object3D>> = {};
  const url = (p: string) => new URL(p.replace(/^\//, ""), base).href;
  const ready = Promise.all(
    (
      [
        ["ak47", WORLD_RIFLES.ak],
        ["m4", WORLD_RIFLES.m4],
        ["awp", WORLD_RIFLES.awp],
      ] as const
    ).map(async ([id, path]) => {
      try {
        templates[id] = layFlat((await loader.loadAsync(url(path))).scene);
      } catch {
        // Fallback: a dark bar stands in for the gun.
      }
    }),
  );
  const gunPool: Array<{ id: string; object: THREE.Object3D }> = [];
  const gunBar = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.9, 0.06, 0.12).translate(0, 0.06, 0),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.3 }),
    MAX_PER_KIND,
  );
  gunBar.count = 0;
  gunBar.frustumCulled = false;
  root.add(gunBar);
  let dirty = true;
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    s = new THREE.Vector3(1, 1, 1),
    color = new THREE.Color();
  /** A stable per-item turn so loot does not all face the same way. */
  const turnOf = (id: number) => ((Math.imul(id, 2654435761) >>> 0) / 2 ** 32) * Math.PI * 2;

  function gunObject(id: "ak47" | "m4" | "awp", muzzle: string | null) {
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
      const o = gunObject(g.item as "ak47" | "m4" | "awp", g.muzzle ?? null);
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
    }
    for (const m of meshes.values()) m.instanceMatrix.needsUpdate = true;
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
      for (const m of meshes.values()) m.dispose();
      for (const kind of kinds.values()) {
        kind.geometry.dispose();
        (Array.isArray(kind.material) ? kind.material : [kind.material]).forEach(
          (m: THREE.Material) => m.dispose(),
        );
      }
      discs.dispose();
      gunBar.dispose();
      root.removeFromParent();
    },
  };
}
