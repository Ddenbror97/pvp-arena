import * as THREE from "three";
import type { RappelFigure } from "./rappel-view";

/**
 * The rappel's rope drawn (rappel.ts; owner, 2026-11-15: "close to the wall the interact window
 * pops up E, descend down with a rope"): a dark static rope thrown from the roof when a player
 * takes it, there only while they are on it. It is tied off on the roof a stride in from the
 * edge, runs over the edge, down through the guide hand to the device on the harness, out to
 * the brake hand at the hip, and hangs from there to the floor, its tail swinging a little with
 * each hop.
 *
 * Cost (BR render budget): no rope simulation. One small tube per rope in use (POINTS rings of
 * SIDES vertices: 100 vertices, 190 triangles, ONE draw call), its vertices rewritten each frame
 * from a dozen points that come from the body's own pose; nothing is allocated per frame. One
 * shared material, no shadows cast. At most POOL ropes are drawn (yours and the nearest
 * others'); the pool's meshes are made once, at the first rope, and hidden when not in use.
 */
const POOL = 6;
const POINTS = 20;
const SIDES = 5;
const RADIUS = 0.013;
/** Rings along the tail, from the brake hand to the floor. */
const TAIL = POINTS - 7;

type Rope = { mesh: THREE.Mesh; position: THREE.BufferAttribute; normal: THREE.BufferAttribute };

export type RappelRopeHands = {
  set: boolean;
  guide: THREE.Vector3;
  device: THREE.Vector3;
  brake: THREE.Vector3;
  gripL: number;
  gripR: number;
};

const ease = (t: number) => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};

export function createRappelRopes(scene: THREE.Scene) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x23282b,
    roughness: 0.82,
    metalness: 0,
  });
  const ropes: Rope[] = [];
  let used = 0;
  const pts = Array.from({ length: POINTS }, () => new THREE.Vector3());
  const t = new THREE.Vector3(),
    u = new THREE.Vector3(),
    v = new THREE.Vector3(),
    along = new THREE.Vector3(),
    hang = new THREE.Vector3();

  const make = (): Rope => {
    const geometry = new THREE.BufferGeometry();
    const position = new THREE.BufferAttribute(new Float32Array(POINTS * SIDES * 3), 3);
    const normal = new THREE.BufferAttribute(new Float32Array(POINTS * SIDES * 3), 3);
    position.setUsage(THREE.DynamicDrawUsage);
    normal.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", position);
    geometry.setAttribute("normal", normal);
    const index: number[] = [];
    for (let i = 0; i < POINTS - 1; i++)
      for (let s = 0; s < SIDES; s++) {
        const a = i * SIDES + s,
          b = i * SIDES + ((s + 1) % SIDES),
          c = a + SIDES,
          d = b + SIDES;
        index.push(a, c, b, b, c, d);
      }
    geometry.setIndex(index);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "rappel-rope";
    // (Rewritten every frame: no bounds kept. It is a few metres from a figure that is drawn.)
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, position, normal };
  };

  return {
    /** Start a frame: every rope is unused until drawn. */
    begin() {
      used = 0;
    },
    /**
     * Draw a figure's rope this frame: `hands` is where it runs through the body (the
     * character's rappelRope), null before the character has been posed (then down the wall).
     * False when the pool is used up.
     */
    draw(f: RappelFigure, hands: RappelRopeHands | null, now: number) {
      if (used >= POOL) return false;
      const rope = (ropes[used] ??= make());
      used++;
      const { nx, nz } = f;
      along.set(-nz, 0, nx);
      // Down the wall's face, a hand's width off it: where the rope hangs with nobody on it.
      const wallX = f.lip.x + nx * 0.07,
        wallZ = f.lip.z + nz * 0.07;
      const floor = f.land + RADIUS + 0.01;
      // Thrown: its end runs down the wall to the floor in the first moments.
      const reach = f.lip.y - (f.lip.y - floor) * ease((now - f.since) / 650);
      pts[0]!.copy(f.anchor).y += RADIUS + 0.01;
      pts[1]!.set(f.lip.x - nx * 0.24, f.lip.y + RADIUS + 0.008, f.lip.z - nz * 0.24);
      pts[2]!.set(f.lip.x + nx * 0.015, f.lip.y + RADIUS + 0.004, f.lip.z + nz * 0.015);
      pts[3]!.set(f.lip.x + nx * 0.05, f.lip.y - 0.07, f.lip.z + nz * 0.05);
      const guide = pts[4]!,
        device = pts[5]!,
        brake = pts[6]!;
      if (hands?.set) {
        const held = Math.max(hands.gripL, hands.gripR);
        guide.set(wallX, hands.guide.y, wallZ).lerp(hands.guide, ease(hands.gripL));
        device.set(wallX, hands.device.y, wallZ).lerp(hands.device, ease(held));
        brake.set(wallX, hands.brake.y, wallZ).lerp(hands.brake, ease(hands.gripR));
      } else {
        const y = f.lip.y - 0.6;
        guide.set(wallX, y, wallZ);
        device.set(wallX, y - 0.35, wallZ);
        brake.set(wallX, y - 0.5, wallZ);
      }
      // The tail: from the brake hand it falls back in under the body to the wall's foot, the
      // last of it lying along the wall. It swings out and back with a hop, and a little
      // always (deterministic: the clock and the place, no simulation).
      const drop = Math.max(0.05, brake.y - floor);
      const swing = f.hop >= 0 ? Math.sin(Math.PI * Math.min(1, f.hop * 1.15)) : 0;
      const phase = now * 0.004 + f.lip.x * 0.7 + f.lip.z * 0.9;
      hang.set(wallX + nx * 0.16, 0, wallZ + nz * 0.16);
      for (let i = 0; i < TAIL; i++) {
        const k = (i + 1) / TAIL;
        const p = pts[7 + i]!;
        // Out from under the hand at first, plumb below it by a third of the way down.
        const settle = 1 - Math.exp(-k * drop * 1.6);
        const belly = Math.sin(Math.PI * Math.min(1, k * 1.05));
        const sway =
          belly * Math.min(1, drop / 6) * (0.05 * Math.sin(phase + k * 3.1) + 0.22 * swing);
        const side = belly * Math.min(1, drop / 6) * 0.04 * Math.sin(phase * 0.8 + k * 2.3);
        p.set(
          brake.x + (hang.x - brake.x) * settle + nx * sway + along.x * side,
          brake.y - drop * k,
          brake.z + (hang.z - brake.z) * settle + nz * sway + along.z * side,
        );
      }
      // The end lies on the floor along the wall.
      const last = pts[POINTS - 1]!,
        before = pts[POINTS - 2]!;
      before.y = Math.max(before.y, floor);
      last.set(before.x + along.x * 0.35, floor, before.z + along.z * 0.35);
      // Not yet all the way down (just thrown): nothing below its end.
      for (let i = 3; i < POINTS; i++) if (pts[i]!.y < reach) pts[i]!.y = reach;

      const pos = rope.position.array as Float32Array,
        nor = rope.normal.array as Float32Array;
      for (let i = 0; i < POINTS; i++) {
        const p = pts[i]!;
        t.copy(pts[Math.min(POINTS - 1, i + 1)]!).sub(pts[Math.max(0, i - 1)]!);
        if (t.lengthSq() < 1e-10) t.set(0, -1, 0);
        t.normalize();
        // The ring's frame from the wall's own line (the rope runs across it nearly always).
        u.copy(along).addScaledVector(t, -along.dot(t));
        if (u.lengthSq() < 1e-4) u.set(nx, 0, nz).addScaledVector(t, -(nx * t.x + nz * t.z));
        u.normalize();
        v.crossVectors(t, u);
        for (let s = 0; s < SIDES; s++) {
          const a = (s / SIDES) * Math.PI * 2,
            c = Math.cos(a),
            d = Math.sin(a),
            o = (i * SIDES + s) * 3;
          const ex = u.x * c + v.x * d,
            ey = u.y * c + v.y * d,
            ez = u.z * c + v.z * d;
          pos[o] = p.x + ex * RADIUS;
          pos[o + 1] = p.y + ey * RADIUS;
          pos[o + 2] = p.z + ez * RADIUS;
          nor[o] = ex;
          nor[o + 1] = ey;
          nor[o + 2] = ez;
        }
      }
      rope.position.needsUpdate = true;
      rope.normal.needsUpdate = true;
      rope.mesh.visible = true;
      return true;
    },
    /** End a frame: ropes nobody drew are put away. */
    end() {
      for (let i = used; i < ropes.length; i++) ropes[i]!.mesh.visible = false;
    },
    /** Ropes drawn this frame (the render audit). */
    get drawn() {
      return used;
    },
    dispose() {
      for (const r of ropes) {
        r.mesh.removeFromParent();
        r.mesh.geometry.dispose();
      }
      ropes.length = 0;
      material.dispose();
    },
  };
}
