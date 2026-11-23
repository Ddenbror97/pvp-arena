import * as THREE from "three";
import { biasLogDepth, LOG_BIAS } from "./depth-bias";
import type { PaneSet } from "./panes";

/** How often the buildings' windows are matched to their buildings' LODs (frames). */
const NEAR_EVERY = 4;

/**
 * The panorama glass (panes.ts): every whole pane as one instance of a tinted, see-through slab
 * (one draw for the island's few hundred panes), hidden when it breaks; a break throws a burst
 * of shards that fall and fade (a second instanced draw, reused).
 *
 * The buildings' windows (panes with a `placement`: tens of thousands over the island) are a
 * third draw, of the windows of the buildings drawn at their near LOD this frame (`nearDrawn`,
 * from the props renderer): the near LOD is the one without glass of its own; the middle and
 * far LODs keep theirs. Without `nearDrawn` (tools) they are all drawn.
 *
 * The planned panes are drawn where their building is at its near or its middle LOD
 * (`planned`: each pane's building, and whether that building is drawn so). They were drawn
 * at every distance: 6,000 see-through slabs 3 m by 2.4 m over Downtown's towers, a pixel
 * each from a kilometre off, and a pane is geometry, which nothing filters: each one
 * covered its pixel or missed it, so a tower's sides broke into light and dark squares that
 * changed with every metre flown (owner, 2026-11-23: "blinking/flicker buildings on distance
 * … in the airplane/parachute", "the buildings looks strange"). A building's far LOD has its
 * glass in its texture (build_facades.mjs --far), averaged to what a pixel covers.
 */
export function createPaneRenderer(
  scene: THREE.Scene,
  set: PaneSet,
  nearDrawn: ((placement: number) => boolean) | null = null,
  planned: { owner: Int32Array; drawn: (placement: number) => boolean } | null = null,
) {
  const n = set.count;
  // The planned panes (the towers', the hospital's, the arena's, the station's: a few hundred)
  // are the first draw's instances; the buildings' windows are not in it.
  const slot = new Int32Array(n).fill(-1);
  let slots = 0;
  for (let id = 0; id < n; id++) if (set.placement[id]! < 0) slot[id] = slots++;
  // The planned panes by building: [building, first pane, pane count], in id order (a
  // building's panes are consecutive ids), and whether each group is showing.
  const groups: number[] = [];
  for (let id = 0; planned && id < n; id++) {
    if (slot[id]! < 0) continue;
    const at = planned.owner[id]!;
    const last = groups.length - 3;
    if (last >= 0 && groups[last] === at && groups[last + 1]! + groups[last + 2]! === id)
      groups[last + 2]!++;
    else groups.push(at, id, 1);
  }
  const showing = new Uint8Array(groups.length / 3).fill(1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2c3c46,
    metalness: 0.6,
    roughness: 0.08,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    // Pulled toward the eye: the storeys' middle and far LODs (condo-floor's glass box) draw
    // their own glass on the pane's plane, and from a few hundred metres the two took turns
    // pixel by pixel, the tower's side flickering dark (owner, 2026-11-15: "Downtown
    // apartments flicker on the side of the building … the glass").
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -8,
  });
  // Under the default logarithmic depth that offset does nothing (depth-bias.ts): this is the
  // pull that takes effect there.
  biasLogDepth(material, LOG_BIAS.pane);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const glass = new THREE.InstancedMesh(box, material, Math.max(1, slots));
  glass.count = slots;
  glass.renderOrder = 1;
  // The windows' panes by building: [placement, first pane, pane count], in id order.
  const buildings: number[] = [];
  for (let id = 0; id < n; id++) {
    const at = set.placement[id]!;
    if (at < 0) continue;
    const last = buildings.length - 3;
    if (last >= 0 && buildings[last] === at) buildings[last + 2]!++;
    else buildings.push(at, id, 1);
  }
  const windows = new THREE.InstancedMesh(box, material, Math.max(1, n - slots));
  windows.count = 0;
  windows.renderOrder = 1;
  windows.frustumCulled = false;
  if (buildings.length) scene.add(windows);
  let frame = 0,
    stale = true,
    glassMoved = false;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3(),
    size = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  /**
   * A pane's matrix: its box, a touch thinner than its collision (the slab is 8 cm), and as wide
   * (a ribbon window split into panes reads as one sheet, and meets its frame).
   */
  const scratch = [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number];
  /** A pane's box (x0, y0, z0, x1, y1, z1) in a reused array. */
  const corners = (id: number) => {
    for (let k = 0; k < 6; k++) scratch[k] = set.boxes[id * 6 + k]!;
    return scratch;
  };
  const paneMatrix = (id: number) => {
    const [x0, y0, z0, x1, y1, z1] = corners(id);
    const thinX = x1 - x0 < z1 - z0;
    pos.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    size.set(
      thinX ? Math.max(0.02, x1 - x0 - 0.04) : x1 - x0,
      y1 - y0,
      thinX ? z1 - z0 : Math.max(0.02, z1 - z0 - 0.04),
    );
    return m.compose(pos, q, size);
  };
  for (let id = 0; id < n; id++) if (slot[id]! >= 0) glass.setMatrixAt(slot[id]!, paneMatrix(id));
  glass.instanceMatrix.needsUpdate = true;
  glass.computeBoundingSphere();
  scene.add(glass);
  const broken = new Uint8Array(n);

  // Shards: a pool of small spinning quads, each with its own fall.
  const POOL = 480;
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0xb8d0dc,
    metalness: 0.4,
    roughness: 0.1,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const shards = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), shardMat, POOL);
  shards.frustumCulled = false;
  shards.count = 0;
  scene.add(shards);
  type Shard = {
    p: THREE.Vector3;
    v: THREE.Vector3;
    r: THREE.Euler;
    w: THREE.Vector3;
    s: number;
    t: number;
  };
  const live: Shard[] = [];
  const e = new THREE.Euler();

  function burst(id: number) {
    const [x0, y0, z0, x1, y1, z1] = corners(id);
    const thinX = x1 - x0 < z1 - z0;
    for (let k = 0; k < 28 && live.length < POOL; k++) {
      const a = Math.random(),
        b = Math.random();
      const p = new THREE.Vector3(
        thinX ? (x0 + x1) / 2 : x0 + (x1 - x0) * a,
        y0 + (y1 - y0) * b,
        thinX ? z0 + (z1 - z0) * a : (z0 + z1) / 2,
      );
      const out = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 1.8);
      live.push({
        p,
        v: new THREE.Vector3(
          thinX ? out : (Math.random() - 0.5) * 0.6,
          Math.random() * 1.2,
          thinX ? (Math.random() - 0.5) * 0.6 : out,
        ),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        w: new THREE.Vector3(Math.random() * 9, Math.random() * 9, Math.random() * 9),
        s: 0.05 + Math.random() * 0.14,
        t: 0,
      });
    }
  }

  return {
    broken,
    /** Mark panes broken (`fx`: with shards and the sound, for breaks seen happening). */
    apply(ids: readonly number[], fx: boolean, sound?: (at: [number, number, number]) => void) {
      for (const id of ids) {
        if (id < 0 || id >= n || broken[id]) continue;
        broken[id] = 1;
        if (slot[id]! >= 0) {
          glass.setMatrixAt(slot[id]!, hidden);
          glass.instanceMatrix.needsUpdate = true;
          glassMoved = true;
        } else stale = true;
        if (fx) {
          burst(id);
          const [x0, y0, z0, x1, y1, z1] = corners(id);
          sound?.([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
        }
      }
    },
    update(dtMs: number) {
      const due = stale || ++frame >= NEAR_EVERY;
      if (due) {
        frame = 0;
        stale = false;
      }
      // The planned panes of the buildings drawn near enough to need them: a building's are
      // rewritten when it comes into that range or leaves it.
      if (planned && due) {
        for (let g = 0; g < showing.length; g++) {
          const show = planned.drawn(groups[g * 3]!) ? 1 : 0;
          if (show === showing[g]) continue;
          showing[g] = show;
          const first = groups[g * 3 + 1]!,
            count = groups[g * 3 + 2]!;
          for (let id = first; id < first + count; id++)
            glass.setMatrixAt(slot[id]!, show && !broken[id] ? paneMatrix(id) : hidden);
          glassMoved = true;
        }
        // (Its cull sphere stays the one round every pane: a hidden pane is a point.)
        if (glassMoved) {
          glassMoved = false;
          glass.instanceMatrix.needsUpdate = true;
        }
      }
      // The windows of the buildings at their near LOD (every few frames, or on a break).
      if (buildings.length && due) {
        let k = 0;
        for (let b = 0; b < buildings.length; b += 3) {
          if (nearDrawn && !nearDrawn(buildings[b]!)) continue;
          const first = buildings[b + 1]!,
            count = buildings[b + 2]!;
          for (let id = first; id < first + count; id++)
            if (!broken[id]) windows.setMatrixAt(k++, paneMatrix(id));
        }
        windows.count = k;
        windows.instanceMatrix.clearUpdateRanges();
        windows.instanceMatrix.addUpdateRange(0, k * 16);
        windows.instanceMatrix.needsUpdate = true;
      }
      if (!live.length) {
        shards.count = 0;
        return;
      }
      const dt = Math.min(0.05, dtMs / 1000);
      let k = 0;
      for (const s of live) {
        s.t += dt;
        s.v.y -= 9.8 * dt;
        s.p.addScaledVector(s.v, dt);
        s.r.x += s.w.x * dt;
        s.r.y += s.w.y * dt;
        s.r.z += s.w.z * dt;
        if (s.t > 2.2) continue;
        live[k++] = s;
      }
      live.length = k;
      for (let i = 0; i < live.length; i++) {
        const s = live[i]!;
        q.setFromEuler(e.copy(s.r));
        shards.setMatrixAt(i, m.compose(s.p, q, size.setScalar(s.s)));
      }
      shards.count = live.length;
      shards.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      scene.remove(glass, windows, shards);
      box.dispose();
      material.dispose();
      shards.geometry.dispose();
      shardMat.dispose();
    },
  };
}
