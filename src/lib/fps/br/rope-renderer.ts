import * as THREE from "three";
import { ROPE_DIR, ropePath, type Ground } from "./rope";
import { Builder, type Rgb } from "./zipline-renderer";

/**
 * The Iron Peaks climbing rope drawn (rope.ts): a braided kernmantle rope (a red-orange sheath
 * with a dark tracer twisting round it) from its foot anchor up the face to the post over the
 * summit's edge, held off the rock on galvanised stand-off brackets (a base plate bolted to the
 * rock, an arm out to an eye the rope runs through), a ground anchor at its foot and a steel post
 * on a concrete footing at the top.
 *
 * Cost (BR render budget): ONE static vertex-coloured mesh built once (one draw call where in
 * view, ≈ 12k triangles) and a one-pixel hairline along the rope (one more, so it reads from the
 * slope below). Occupied, the rope moves a little: a vertex-shader sway round each climber (up to
 * four uniforms set per frame), no geometry rebuilt.
 */

const SHEATH: Rgb = [0.72, 0.2, 0.08];
const TRACER: Rgb = [0.12, 0.12, 0.14];
const SHEATH_DARK: Rgb = [0.55, 0.14, 0.06];
const GALV: Rgb = [0.6, 0.62, 0.64];
const STEEL: Rgb = [0.32, 0.34, 0.36];
const BOLT: Rgb = [0.75, 0.76, 0.78];
const CONCRETE: Rgb = [0.55, 0.54, 0.51];
const RADIUS = 0.019;
const SIDES = 6;
/** Braid: the tracer's twist (m per turn) and how many strands round (alternating shade). */
const TWIST = 0.14;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The rope's whole line: the foot anchor, the climb, over the edge to the post (world). */
function ropeLine(ground: Ground): THREE.Vector3[] {
  const p = ropePath(ground);
  const pts = [V(...p.anchor)];
  for (let i = 0; i < p.pts.length; i += 3) pts.push(V(p.pts[i]!, p.pts[i + 1]!, p.pts[i + 2]!));
  // Over the lip to the post: a short sag between the last point and the post's eye.
  const last = pts[pts.length - 1]!;
  const post = V(...p.post);
  for (let k = 1; k <= 6; k++) {
    const t = k / 6;
    const q = last.clone().lerp(post, t);
    q.y += Math.sin(t * Math.PI) * 0.12 - 0.04 * t;
    pts.push(q);
  }
  return pts;
}

/** The static installation (one geometry) and the sway weights of its vertices. */
function buildStatic(ground: Ground) {
  const b = new Builder();
  const line = ropeLine(ground);
  // Resampled every 6 cm so the braid's twist reads up close.
  const dense: THREE.Vector3[] = [line[0]!];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!,
      c = line[i]!;
    const n = Math.max(1, Math.ceil(a.distanceTo(c) / 0.06));
    for (let k = 1; k <= n; k++) dense.push(a.clone().lerp(c, k / n));
  }
  // Tube with a parallel-transported frame (no flips along the face's curve).
  const up = V(0, 1, 0);
  let tan = dense[1]!.clone().sub(dense[0]!).normalize();
  const nrm = new THREE.Vector3().crossVectors(tan, Math.abs(tan.y) > 0.9 ? V(1, 0, 0) : up);
  nrm.normalize();
  const rings: Array<{ p: THREE.Vector3; n: THREE.Vector3; bn: THREE.Vector3; s: number }> = [];
  let s = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i > 0) s += dense[i]!.distanceTo(dense[i - 1]!);
    const next = dense[Math.min(dense.length - 1, i + 1)]!,
      prev = dense[Math.max(0, i - 1)]!;
    const t2 = next.clone().sub(prev).normalize();
    // Transport the normal onto the new tangent.
    const axis = new THREE.Vector3().crossVectors(tan, t2);
    if (axis.lengthSq() > 1e-12) {
      const ang = Math.acos(Math.max(-1, Math.min(1, tan.dot(t2))));
      nrm.applyAxisAngle(axis.normalize(), ang);
    }
    tan = t2;
    const bn = new THREE.Vector3().crossVectors(tan, nrm).normalize();
    rings.push({ p: dense[i]!, n: nrm.clone(), bn, s });
  }
  const ropeStart = b.pos.length / 3;
  const ringPt = (r: (typeof rings)[number], k: number) => {
    const ang = (k / SIDES) * Math.PI * 2;
    const d = r.n.clone().multiplyScalar(Math.cos(ang)).addScaledVector(r.bn, Math.sin(ang));
    return { p: r.p.clone().addScaledVector(d, RADIUS), n: d };
  };
  for (let i = 0; i + 1 < rings.length; i++) {
    const r0 = rings[i]!,
      r1 = rings[i + 1]!;
    for (let k = 0; k < SIDES; k++) {
      const a0 = ringPt(r0, k),
        a1 = ringPt(r0, k + 1),
        b0 = ringPt(r1, k),
        b1 = ringPt(r1, k + 1);
      // The braid: strands spiral round the rope; one of them is the dark tracer.
      const phase = (((r0.s / TWIST + k / SIDES) % 1) + 1) % 1;
      const strand = Math.floor(phase * SIDES);
      const color = strand === 0 ? TRACER : strand % 2 ? SHEATH : SHEATH_DARK;
      b.tri(a0.p, b0.p, b1.p, color, a0.n.clone().add(b1.n).normalize());
      b.tri(a0.p, b1.p, a1.p, color, a0.n.clone().add(b1.n).normalize());
    }
  }
  const ropeEnd = b.pos.length / 3;
  const p = ropePath(ground);
  // Stand-off brackets: a plate bolted to the rock, an arm out to the rope, an eye round it.
  for (const br of p.brackets) {
    const rock = V(...br.rock),
      rope = V(...br.rope);
    const out = rope.clone().sub(rock).normalize();
    const side = V(ROPE_DIR[1], 0, -ROPE_DIR[0]);
    const plateC = rock.clone().addScaledVector(out, 0.04);
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const bolt = plateC
          .clone()
          .addScaledVector(side, sx * 0.07)
          .add(V(0, sy * 0.07, 0));
        b.rod(
          bolt.clone().addScaledVector(out, -0.06),
          bolt.clone().addScaledVector(out, 0.03),
          0.012,
          BOLT,
          6,
          true,
        );
      }
    b.rod(
      rock.clone().addScaledVector(out, -0.05),
      rock.clone().addScaledVector(out, 0.05),
      0.1,
      GALV,
      4,
      true,
    );
    b.rod(plateC, rope.clone().addScaledVector(out, -0.05), 0.022, GALV, 6, true);
    // The eye: a ring of short bars round the rope.
    const n = 8;
    const t = side.clone();
    const u = new THREE.Vector3().crossVectors(out, t).normalize();
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2,
        a1 = ((k + 1) / n) * Math.PI * 2;
      const e0 = rope
        .clone()
        .addScaledVector(out, Math.cos(a0) * 0.05)
        .addScaledVector(u, Math.sin(a0) * 0.05);
      const e1 = rope
        .clone()
        .addScaledVector(out, Math.cos(a1) * 0.05)
        .addScaledVector(u, Math.sin(a1) * 0.05);
      b.rod(e0, e1, 0.009, STEEL, 5);
    }
  }
  // The foot anchor: a concrete block with an eye bolt; the top post on its footing.
  const [ax, ay, az] = p.anchor;
  b.box([ax - 0.22, ay - 0.35, az - 0.22, ax + 0.22, ay + 0.1, az + 0.22], CONCRETE);
  b.rod(V(ax, ay + 0.1, az), V(ax, ay + 0.22, az), 0.03, STEEL, 6, true);
  const [px, py, pz] = p.post;
  const g = ground.heightAt(px, pz);
  b.box([px - 0.3, g - 0.4, pz - 0.3, px + 0.3, g + 0.12, pz + 0.3], CONCRETE);
  b.rod(V(px, g + 0.12, pz), V(px, py + 0.15, pz), 0.055, STEEL, 8, true);
  b.rod(V(px, py + 0.15, pz), V(px, py + 0.19, pz), 0.07, [0.78, 0.6, 0.12], 8, true);
  const geometry = b.geometry();
  // Sway weight: 1 on the rope (0 at its anchored ends), 0 on the hardware.
  const n = b.pos.length / 3;
  const sway = new Float32Array(n);
  for (let i = ropeStart; i < ropeEnd; i++) sway[i] = 1;
  geometry.setAttribute("sway", new THREE.BufferAttribute(sway, 1));
  return { geometry, line };
}

/** Climbers on the rope this frame (world, feet), up to four. */
export type RopeClimberView = { x: number; y: number; z: number };

export function createRopeRenderer(scene: THREE.Scene, ground: Ground) {
  const { geometry, line } = buildStatic(ground);
  const climbers = Array.from({ length: 4 }, () => new THREE.Vector4(0, -1e5, 0, 0));
  const uniforms = { ropeClimbers: { value: climbers }, ropeTime: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.78,
    metalness: 0.18,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms["ropeClimbers"] = uniforms.ropeClimbers;
    shader.uniforms["ropeTime"] = uniforms.ropeTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float sway;\nuniform vec4 ropeClimbers[4];\nuniform float ropeTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        // Occupied: the rope sways a few centimetres round each climber (sideways and out from
        // the rock), dying away a few metres along it.
        if (sway > 0.5) {
          vec3 off = vec3(0.0);
          for (int k = 0; k < 4; k++) {
            vec4 c = ropeClimbers[k];
            float d = distance(transformed, c.xyz + vec3(0.0, 1.6, 0.0));
            float w = c.w * exp(-d * d / 10.0);
            off += w * vec3(sin(ropeTime * 2.3 + d * 0.9), 0.0, cos(ropeTime * 1.7 + d * 0.7)) * 0.035;
          }
          transformed += off;
        }`,
      );
  };
  material.customProgramCacheKey = () => "br-rope-sway";
  const root = new THREE.Group();
  root.name = "climbing-rope";
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "climbing-rope-static";
  mesh.matrixAutoUpdate = false;
  root.add(mesh);
  // The rope again as a hairline: the tube is under a pixel past ~40 m.
  const hairline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(line),
    new THREE.LineBasicMaterial({ color: 0x8a2a12 }),
  );
  hairline.name = "climbing-rope-hairline";
  hairline.matrixAutoUpdate = false;
  root.add(hairline);
  scene.add(root);
  let busy = false;
  return {
    root,
    /** The climbers this frame (the sway follows them); time in seconds. */
    update(list: readonly RopeClimberView[], time: number) {
      if (!list.length && !busy) return;
      busy = list.length > 0;
      for (let k = 0; k < 4; k++) {
        const c = list[k];
        if (c) climbers[k]!.set(c.x, c.y, c.z, 1);
        else climbers[k]!.set(0, -1e5, 0, 0);
      }
      uniforms.ropeTime.value = time;
    },
    dispose() {
      scene.remove(root);
      geometry.dispose();
      material.dispose();
      hairline.geometry.dispose();
      (hairline.material as THREE.Material).dispose();
    },
  };
}
