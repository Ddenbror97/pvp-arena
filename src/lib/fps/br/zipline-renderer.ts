import { LADDER, ladderParts, ladders } from "./ladders";
import * as THREE from "three";
import { ZIPLINE, ZIPLINES, zipStations } from "./zipline";

/**
 * The zip-line drawn (zipline.ts): the cable, both stations (steel portals, footings, deadman
 * blocks, back-stays, the landing platform, turnbuckles, clamps and bolts) and one trolley per
 * rider plus the one parked at Iron Peaks.
 *
 * Cost (BR render budget): everything static is ONE vertex-coloured mesh built once (one draw
 * call where it is in view, ≈ 6k triangles), a one-pixel hairline along the cable (one more, so
 * it reads from afar), and the trolleys two small instanced meshes (two draw calls, a few
 * hundred triangles each). Nothing is rebuilt per frame; with nobody riding
 * only the parked trolley's matrix is set, once.
 */

export type Rgb = [number, number, number];
const STEEL: Rgb = [0.34, 0.36, 0.38];
const GALV: Rgb = [0.62, 0.64, 0.66];
const CABLE: Rgb = [0.5, 0.52, 0.54];
const RUST: Rgb = [0.42, 0.27, 0.17];
const YELLOW: Rgb = [0.78, 0.6, 0.12];
const CONCRETE: Rgb = [0.56, 0.55, 0.52];
const TIMBER: Rgb = [0.45, 0.33, 0.22];
const RUBBER: Rgb = [0.09, 0.09, 0.1];

/** Positions, normals and colours appended as triangles (non-indexed). */
export class Builder {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly col: number[] = [];
  private v = new THREE.Vector3();
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: Rgb, n?: THREE.Vector3) {
    const normal =
      n ?? this.v.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const p of [a, b, c]) {
      this.pos.push(p.x, p.y, p.z);
      this.nor.push(normal.x, normal.y, normal.z);
      this.col.push(...color);
    }
  }
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, color: Rgb) {
    this.tri(a, b, c, color);
    this.tri(a, c, d, color);
  }
  /** Axis-aligned box. */
  box(b: readonly number[], color: Rgb) {
    const [x0, y0, z0, x1, y1, z1] = b as [number, number, number, number, number, number];
    const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    this.quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), color); // +z
    this.quad(P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), color); // −z
    this.quad(P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), color); // +x
    this.quad(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), color); // −x
    this.quad(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), color); // +y
    this.quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), color); // −y
  }
  /** A round bar from a to b (n sides, smooth normals, open ends unless `caps`). */
  rod(a: THREE.Vector3, b: THREE.Vector3, r: number, color: Rgb, n = 6, caps = false) {
    const axis = new THREE.Vector3().subVectors(b, a);
    const len = axis.length();
    if (len < 1e-6) return;
    axis.divideScalar(len);
    const u = new THREE.Vector3(0, 1, 0);
    if (Math.abs(axis.dot(u)) > 0.9) u.set(1, 0, 0);
    const s = new THREE.Vector3().crossVectors(axis, u).normalize();
    const t = new THREE.Vector3().crossVectors(s, axis).normalize();
    const ring = (c: THREE.Vector3, k: number) => {
      const ang = (k / n) * Math.PI * 2;
      const dir = s.clone().multiplyScalar(Math.cos(ang)).addScaledVector(t, Math.sin(ang));
      return { p: c.clone().addScaledVector(dir, r), n: dir };
    };
    for (let k = 0; k < n; k++) {
      const a0 = ring(a, k),
        a1 = ring(a, k + 1),
        b0 = ring(b, k),
        b1 = ring(b, k + 1);
      this.tri(a0.p, b0.p, b1.p, color, a0.n.clone().add(b1.n).normalize());
      this.tri(a0.p, b1.p, a1.p, color, a0.n.clone().add(b1.n).normalize());
      if (caps) {
        this.tri(a, a1.p, a0.p, color, axis.clone().negate());
        this.tri(b, b0.p, b1.p, color, axis);
      }
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The static installation: cable, stations, stays, hardware (world space, one geometry). */
function buildStatic(groundAt: (x: number, z: number) => number) {
  const b = new Builder();
  const { parts, stays } = zipStations(groundAt);
  for (const p of parts)
    b.box(p.box, p.kind === "steel" ? STEEL : p.kind === "concrete" ? CONCRETE : TIMBER);
  // Timber platforms: planks across (darker seams).
  for (const platform of parts.filter((p) => p.kind === "timber").map((p) => p.box))
    for (let k = 1; k < 8; k++) {
      const x = platform[0] + ((platform[3] - platform[0]) * k) / 8;
      b.box(
        [
          x - 0.012,
          platform[4],
          platform[2] + 0.02,
          x + 0.012,
          platform[4] + 0.004,
          platform[5] - 0.02,
        ],
        [0.3, 0.22, 0.15],
      );
    }
  // Back-stays (galvanised rope) with a turnbuckle near each anchor; struts are steel bars.
  for (const s of stays) {
    const a = V(...s.from),
      c = V(...s.to);
    if (s.strut) {
      b.rod(a, c, 0.06, STEEL, 6, true);
      continue;
    }
    b.rod(a, c, 0.018, GALV, 5);
    const tb = a.clone().lerp(c, 0.88);
    b.rod(tb.clone().lerp(a, 0.04), tb.clone().lerp(c, 0.04), 0.035, YELLOW, 6, true);
  }
  for (const line of ZIPLINES) {
    // The cable: a tube along the sag (finer near the stations, where it is seen up close).
    const pts: THREE.Vector3[] = [];
    const at = { x: 0, y: 0, z: 0 };
    const N = line.id === 0 ? 220 : 140;
    for (let i = 0; i <= N; i++) {
      // Denser at both ends: u = smoothstep-ish spacing.
      const k = i / N;
      const u = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
      line.cableAt(u, at);
      pts.push(V(at.x, at.y, at.z));
    }
    for (let i = 0; i < N; i++) b.rod(pts[i]!, pts[i + 1]!, 0.019, CABLE, 5);
    const s0 = V(line.start.x, line.start.y, line.start.z);
    if (line.id === 0) {
      // Iron Peaks: the hanger from the portal beam down to the cable's start, a turnbuckle.
      const beamY = ZIPLINE.tower.y + 10.3 - 0.32;
      const beamZ = ZIPLINE.tower.z + 3.05;
      b.rod(V(s0.x, beamY, beamZ), V(s0.x, s0.y + 0.55, s0.z + 0.1), 0.03, GALV, 6);
    } else {
      // The broadcast tower: from the arm's end down to the cable's start.
      b.rod(V(s0.x, s0.y + 0.36, s0.z + 0.2), V(s0.x, s0.y + 0.55, s0.z + 0.1), 0.03, GALV, 6);
    }
    b.rod(V(s0.x, s0.y + 0.55, s0.z + 0.1), s0, 0.05, YELLOW, 8, true); // turnbuckle
    // Cable clamps (U-bolts) on the first metres past each anchor, and the end's brake spring.
    const [dx, dz] = line.dir;
    for (let k = 0; k < 3; k++) {
      line.cableAt(line.uAt(0.45 + k * 0.32), at);
      const c = V(at.x, at.y, at.z);
      b.rod(
        c.clone().add(V(dx * 0.06, 0, dz * 0.06)),
        c.clone().add(V(-dx * 0.06, 0, -dz * 0.06)),
        0.05,
        RUST,
        6,
        true,
      );
      line.cableAt(line.uAt(line.length - 0.6 - k * 0.3), at);
      const e = V(at.x, at.y, at.z);
      b.rod(
        e.clone().add(V(dx * 0.06, 0, dz * 0.06)),
        e.clone().add(V(-dx * 0.06, 0, -dz * 0.06)),
        0.05,
        RUST,
        6,
        true,
      );
    }
    // Brake: a coil spring and buffer block on the cable before the end, yellow and black.
    line.cableAt(line.uAt(line.length - 3.4), at);
    const bs = V(at.x, at.y, at.z);
    line.cableAt(line.uAt(line.length - 1.2), at);
    const be = V(at.x, at.y, at.z);
    b.rod(bs, be, 0.09, YELLOW, 8, true);
    for (let k = 0; k <= 10; k++) {
      const p = bs.clone().lerp(be, k / 10);
      b.rod(
        p.clone().add(V(dx * 0.02, 0, dz * 0.02)),
        p.clone().add(V(-dx * 0.02, 0, -dz * 0.02)),
        0.1,
        RUBBER,
        8,
        true,
      );
    }
    // The landing A-frame: cross-beam over its posts; the cable's end shackle hung from it.
    const end = line.end;
    const frameX = end.x + dx * 0.4,
      frameZ = end.z + dz * 0.4,
      top = end.y + 0.55;
    const [sx, sz] = [-dz, dx];
    b.rod(
      V(frameX - sx * 1.75, top, frameZ - sz * 1.75),
      V(frameX + sx * 1.75, top, frameZ + sz * 1.75),
      0.11,
      STEEL,
      6,
      true,
    );
    b.rod(V(frameX, top, frameZ), V(end.x, end.y, end.z), 0.03, GALV, 6);
  }
  // Bolt heads on the footings (a few dark studs on each concrete top).
  for (const p of parts)
    if (p.kind === "concrete") {
      const [x0, , z0, x1, y1, z1] = p.box;
      const cx = (x0 + x1) / 2,
        cz = (z0 + z1) / 2,
        r = Math.min(x1 - x0, z1 - z0) * 0.3;
      for (const [ox, oz] of [
        [r, r],
        [-r, r],
        [r, -r],
        [-r, -r],
      ] as const)
        b.box(
          [cx + ox - 0.03, y1, cz + oz - 0.03, cx + ox + 0.03, y1 + 0.05, cz + oz + 0.03],
          RUST,
        );
    }
  // The watchtower's ladder (ladders.ts): two rails, rungs, brackets back to the tower.
  for (const l of ladders({ heightAt: groundAt })) {
    if (l.rope) continue; // the climbing rope draws itself (rope-renderer.ts)
    const { rails, rungs, across } = ladderParts(l);
    for (const r of rails) b.rod(V(r.x, r.y0, r.z), V(r.x, r.y1, r.z), 0.026, STEEL, 6, true);
    const [ax, az] = across;
    for (const y of rungs)
      b.rod(
        V(l.x - ax * LADDER.halfWidth, y, l.z - az * LADDER.halfWidth),
        V(l.x + ax * LADDER.halfWidth, y, l.z + az * LADDER.halfWidth),
        0.016,
        GALV,
        6,
      );
    // Brackets into the tower (toward it: against the climber's side).
    const bx = -Math.sin(l.yaw) * 0.86,
      bz = -Math.cos(l.yaw) * 0.86;
    for (const y of [l.bottom + 1.2, l.bottom + (l.top - l.bottom) * 0.55, l.top - 0.12])
      for (const r of rails) b.rod(V(r.x, y, r.z), V(r.x + bx, y, r.z + bz), 0.018, STEEL, 4);
  }
  // A yellow-black hazard band round the Iron Peaks posts at deck height (the way on), and round
  // the broadcast tower's arm post.
  const beamZ = ZIPLINE.tower.z + 3.05;
  {
    const l = ZIPLINES[1]!;
    const pz = l.start.z - 0.95;
    for (const side of [-1, 1])
      for (let k = 0; k < 4; k++) {
        const px = l.start.x + side * 0.78;
        b.box(
          [
            px - 0.085,
            l.stand.y + 0.4 + k * 0.18,
            pz - 0.085,
            px + 0.085,
            l.stand.y + 0.49 + k * 0.18,
            pz + 0.085,
          ],
          k % 2 ? RUBBER : YELLOW,
        );
      }
  }
  for (const side of [-1, 1]) {
    const px = ZIPLINE.tower.x + side * 1.35,
      y = ZIPLINE.tower.y + ZIPLINE.deckY + 0.4;
    for (let k = 0; k < 4; k++)
      b.box(
        [px - 0.135, y + k * 0.18, beamZ - 0.135, px + 0.135, y + k * 0.18 + 0.09, beamZ + 0.135],
        k % 2 ? RUBBER : YELLOW,
      );
  }
  return b.geometry();
}

/** The trolley's carriage (on the cable: wheels and side plates), local: cable along −z. */
function carriageGeometry() {
  const b = new Builder();
  for (const z of [-0.09, 0.09])
    b.rod(V(-0.035, 0.045, z), V(0.035, 0.045, z), 0.052, GALV, 10, true);
  for (const x of [-0.045, 0.045]) b.box([x - 0.006, -0.06, -0.17, x + 0.006, 0.11, 0.17], YELLOW);
  b.box([-0.05, -0.1, -0.06, 0.05, -0.05, 0.06], STEEL);
  return b.geometry();
}
/** The hanger and handle bar (hangs straight down from the carriage), local: origin at the axle. */
function handleGeometry() {
  const b = new Builder();
  const drop = ZIPLINE.handleDrop;
  b.rod(V(0, -0.08, 0), V(0, -drop + 0.12, 0), 0.016, GALV, 6);
  b.rod(V(0, -drop + 0.12, 0), V(-0.22, -drop, 0), 0.012, GALV, 5);
  b.rod(V(0, -drop + 0.12, 0), V(0.22, -drop, 0), 0.012, GALV, 5);
  b.rod(V(-0.28, -drop, 0), V(0.28, -drop, 0), 0.02, STEEL, 8, true);
  for (const x of [-0.17, 0.17])
    b.rod(V(x - 0.075, -drop, 0), V(x + 0.075, -drop, 0), 0.027, RUBBER, 8, true);
  return b.geometry();
}

export type ZipRiderView = {
  /** The cable point the trolley rides (world). */
  x: number;
  y: number;
  z: number;
  /** Fraction of the span (for the slope). */
  u: number;
  /** Which line (ZIPLINES; absent: the first). */
  line?: number;
  /** Swing of the hanger about the cross axis (radians; back on the push, forward braking). */
  swing: number;
};

const MAX_TROLLEYS = 10;

export function createZiplineRenderer(
  scene: THREE.Scene,
  groundAt: (x: number, z: number) => number,
) {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.35,
  });
  const root = new THREE.Group();
  root.name = "zipline";
  const fixed = new THREE.Mesh(buildStatic(groundAt), material);
  fixed.name = "zipline-static";
  fixed.matrixAutoUpdate = false;
  root.add(fixed);
  // The cables again as hairlines (always one pixel wide): the tube is under a pixel past ~60 m,
  // so from the valley or Pine Ridge the line is still seen running up the mountain (both lines
  // in one draw: line segments).
  const pts: THREE.Vector3[] = [];
  const at = { x: 0, y: 0, z: 0 };
  for (const line of ZIPLINES)
    for (let i = 0; i < 160; i++) {
      line.cableAt(i / 160, at);
      pts.push(new THREE.Vector3(at.x, at.y, at.z));
      line.cableAt((i + 1) / 160, at);
      pts.push(new THREE.Vector3(at.x, at.y, at.z));
    }
  const hairline = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x55595d }),
  );
  hairline.name = "zipline-hairline";
  hairline.matrixAutoUpdate = false;
  root.add(hairline);
  const carriage = new THREE.InstancedMesh(carriageGeometry(), material, MAX_TROLLEYS);
  const handle = new THREE.InstancedMesh(handleGeometry(), material, MAX_TROLLEYS);
  for (const m of [carriage, handle]) {
    m.frustumCulled = false;
    m.count = 0;
    root.add(m);
  }
  scene.add(root);
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(0, 0, 0, "YXZ"),
    p = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1);
  let last = "";
  return {
    root,
    /**
     * Trolleys this frame: one per rider on a cable, and the one parked at each line's start
     * unless a rider is holding it there (`parked[line]` false; a boolean: the first line).
     */
    update(riders: readonly ZipRiderView[], parked: boolean | readonly boolean[]) {
      const park = typeof parked === "boolean" ? [parked, true] : parked;
      const list = [
        ...ZIPLINES.filter((l) => park[l.id] ?? true).map((l) => ({
          x: l.start.x,
          y: l.start.y,
          z: l.start.z,
          u: 0,
          swing: 0,
          line: l.id,
        })),
        ...riders,
      ];
      const key = riders.length === 0 ? `parked:${park.join(",")}` : "";
      if (key && key === last) return; // nothing moves: the parked trolley is already set
      last = key;
      const n = Math.min(MAX_TROLLEYS, list.length);
      for (let i = 0; i < n; i++) {
        const r = list[i]!;
        p.set(r.x, r.y, r.z);
        const line = ZIPLINES[r.line ?? 0]!;
        // Carriage: along the cable, its nose tilted down the slope (pitch about its cross axis).
        q.setFromEuler(e.set(Math.atan(line.cableSlope(r.u)), line.heading, 0, "YXZ"));
        m4.compose(p, q, one);
        carriage.setMatrixAt(i, m4);
        // Handle: hangs plumb under the axle, swinging a little fore and aft.
        q.setFromEuler(e.set(r.swing, line.heading, 0, "YXZ"));
        m4.compose(p, q, one);
        handle.setMatrixAt(i, m4);
      }
      carriage.count = handle.count = n;
      carriage.instanceMatrix.needsUpdate = true;
      handle.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      scene.remove(root);
      fixed.geometry.dispose();
      carriage.geometry.dispose();
      handle.geometry.dispose();
      carriage.dispose();
      handle.dispose();
      material.dispose();
      hairline.geometry.dispose();
      (hairline.material as THREE.Material).dispose();
    },
  };
}
