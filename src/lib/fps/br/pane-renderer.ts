import * as THREE from "three";
import type { PaneSet } from "./panes";

/**
 * The panorama glass (panes.ts): every whole pane as one instance of a tinted, see-through slab
 * (one draw for the island's few hundred panes), hidden when it breaks; a break throws a burst
 * of shards that fall and fade (a second instanced draw, reused).
 */
export function createPaneRenderer(scene: THREE.Scene, set: PaneSet) {
  const n = set.panes.length;
  const glass = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x2c3c46,
      metalness: 0.6,
      roughness: 0.08,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
    Math.max(1, n),
  );
  glass.count = n;
  glass.renderOrder = 1;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3(),
    size = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const p of set.panes) {
    const [x0, y0, z0, x1, y1, z1] = p.box;
    pos.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    // Drawn a touch thinner than its collision (the slab is 8 cm).
    size.set(Math.max(0.02, x1 - x0 - 0.04), y1 - y0, Math.max(0.02, z1 - z0 - 0.04));
    glass.setMatrixAt(p.id, m.compose(pos, q, size));
  }
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
    const [x0, y0, z0, x1, y1, z1] = set.panes[id]!.box;
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
        glass.setMatrixAt(id, hidden);
        glass.instanceMatrix.needsUpdate = true;
        if (fx) {
          burst(id);
          const [x0, y0, z0, x1, y1, z1] = set.panes[id]!.box;
          sound?.([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
        }
      }
    },
    update(dtMs: number) {
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
      scene.remove(glass, shards);
      glass.geometry.dispose();
      (glass.material as THREE.Material).dispose();
      shards.geometry.dispose();
      shardMat.dispose();
    },
  };
}
