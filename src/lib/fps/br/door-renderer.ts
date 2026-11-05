import * as THREE from "three";
import { DOOR_THICKNESS, type DoorSet } from "./doors";

/**
 * Door panels in the buildings' doorways (doors.ts): one instanced draw for the doors within
 * DRAW_M of the camera (re-picked twice a second), one for the transoms that close tall
 * openings above a door (shopfronts). A door swings 90° on its hinge in about a quarter second
 * when it opens or closes. Presentation only: the server owns which doors are open.
 */
const DRAW_M = 260;
const MAX_DRAWN = 1600;
const DOOR_H = 2.2;
const SWING = Math.PI * 0.48;
const SPEED = 7; // rad/s

export function createDoorRenderer(scene: THREE.Scene, set: DoorSet) {
  const n = set.doors.length;
  const panel = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6e4b33, roughness: 0.82 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x2c3238,
    roughness: 0.25,
    metalness: 0.3,
  });
  const doors = new THREE.InstancedMesh(panel, wood, MAX_DRAWN);
  const transoms = new THREE.InstancedMesh(panel, glass, MAX_DRAWN);
  for (const m of [doors, transoms]) {
    m.count = 0;
    m.frustumCulled = false;
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = "doors";
    scene.add(m);
  }
  const angle = new Float32Array(n),
    target = new Float32Array(n);
  let drawn: number[] = [];
  const slot = new Int32Array(n).fill(-1);
  let pickedAt = -Infinity;
  const moving = new Set<number>();
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    pos = new THREE.Vector3(),
    scl = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);

  const write = (id: number) => {
    const s = slot[id]!;
    if (s < 0) return;
    const d = set.doors[id]!;
    const h = Math.min(DOOR_H, d.y1 - d.y0);
    // Local +x is the panel's width; turned so it lies along the doorway, then swung.
    const base = d.along === "x" ? 0 : -Math.PI / 2;
    const a = base + angle[id]!;
    const hx = d.x - (d.along === "x" ? d.width / 2 : 0),
      hz = d.z - (d.along === "z" ? d.width / 2 : 0);
    pos.set(hx + (Math.cos(a) * d.width) / 2, d.y0 + 0.01, hz - (Math.sin(a) * d.width) / 2);
    q.setFromAxisAngle(up, a);
    scl.set(d.width - 0.04, h - 0.02, DOOR_THICKNESS);
    doors.setMatrixAt(s, m4.compose(pos, q, scl));
    doors.instanceMatrix.needsUpdate = true;
  };

  const pick = (x: number, z: number) => {
    for (const id of drawn) slot[id] = -1;
    const near: Array<[number, number]> = [];
    for (const d of set.doors) {
      const dist = Math.hypot(d.x - x, d.z - z);
      if (dist < DRAW_M) near.push([dist, d.id]);
    }
    near.sort((a, b) => a[0] - b[0]);
    drawn = near.slice(0, MAX_DRAWN).map(([, id]) => id);
    let t = 0;
    drawn.forEach((id, i) => {
      slot[id] = i;
      write(id);
      const d = set.doors[id]!;
      if (d.y1 - d.y0 > DOOR_H + 0.1) {
        pos.set(d.x, d.y0 + DOOR_H, d.z);
        q.setFromAxisAngle(up, d.along === "x" ? 0 : -Math.PI / 2);
        scl.set(d.width + 0.02, d.y1 - d.y0 - DOOR_H, DOOR_THICKNESS * 0.6);
        transoms.setMatrixAt(t++, m4.compose(pos, q, scl));
      }
    });
    doors.count = drawn.length;
    transoms.count = t;
    doors.instanceMatrix.needsUpdate = true;
    transoms.instanceMatrix.needsUpdate = true;
  };

  return {
    /** Door states from the server: every open id (first view), or changes (id · 2 + open). */
    apply(update: { open?: number[]; changes?: number[] } | undefined, open: Uint8Array) {
      if (!update) return;
      if (update.open) {
        open.fill(0);
        for (const id of update.open) if (id < n) open[id] = 1;
        for (let id = 0; id < n; id++) {
          target[id] = open[id] ? SWING : 0;
          angle[id] = target[id]!; // the first view: no animation
          write(id);
        }
      }
      for (const c of update.changes ?? []) {
        const id = c >> 1;
        if (id >= n) continue;
        open[id] = c & 1;
        target[id] = open[id] ? SWING : 0;
        moving.add(id);
      }
    },
    update(dtMs: number, now: number, camera: THREE.Vector3) {
      if (now - pickedAt > 500) {
        pickedAt = now;
        pick(camera.x, camera.z);
      }
      const step = (SPEED * dtMs) / 1000;
      for (const id of moving) {
        const a = angle[id]!,
          t = target[id]!;
        angle[id] = Math.abs(t - a) <= step ? t : a + Math.sign(t - a) * step;
        write(id);
        if (angle[id] === t) moving.delete(id);
      }
    },
    dispose() {
      for (const m of [doors, transoms]) {
        scene.remove(m);
        m.dispose();
      }
      panel.dispose();
      wood.dispose();
      glass.dispose();
    },
  };
}
