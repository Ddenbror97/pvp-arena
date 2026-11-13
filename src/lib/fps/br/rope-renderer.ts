import * as THREE from "three";
import { ropePaths, ropeS, type Ground, type RopePath } from "./rope";
import { Builder, type Rgb } from "./zipline-renderer";

/**
 * The Iron Peaks climbing ropes drawn (rope.ts): braided kernmantle ropes (a red-orange sheath
 * with a dark tracer twisting round it) fixed up the faces the way a climber fixes a line (owner,
 * 2026-11-12: "it is not loss climbing ropes laying on the mountain, they are stuck in some
 * metalic stuff into the mountain, also remove the cement block at the end … like a climber have
 * set the ropes there"):
 * - every few metres up the face a bolt in the rock with its hanger, a sewn sling from it and a
 *   carabiner the rope runs through, so the rope is held off the rock where the climber's hands
 *   take it;
 * - at the foot the rope is tied off to a bolt in the rock with a figure-eight knot, its spare
 *   end coiled on the slope beside it;
 * - at the top it runs over the lip to an anchor in the plateau's rock: two bolts, a sling from
 *   each to a locking carabiner, the rope tied into it.
 *
 * Cost (BR render budget). Per rope ONE static mesh built once (one draw call where in view and
 * within 280 m; the four together ≈ 27k triangles, of them 12k the ropes' tubes) and a one-pixel
 * hairline along the rope (one more, so it reads from the slopes below and from across the
 * valley). The braid is worked out per pixel from the distance along the rope, so the tube
 * needs a ring every half metre, not one per turn of the braid (the first rope had a ring every
 * 6 cm: 12k triangles for 55 m; the four are 485 m). Occupied, a rope moves a little: a
 * vertex-shader sway round each climber (up to four uniforms set per frame), no geometry
 * rebuilt.
 */

const SHEATH: Rgb = [0.72, 0.2, 0.08];
const TRACER: Rgb = [0.12, 0.12, 0.14];
const SHEATH_DARK: Rgb = [0.55, 0.14, 0.06];
const STEEL: Rgb = [0.62, 0.64, 0.66];
const STEEL_DARK: Rgb = [0.36, 0.37, 0.39];
/** Anodised aluminium carabiners (a climber's rack: blue and gold) and nylon slings. */
const BINER: Rgb = [0.22, 0.42, 0.78];
const BINER_GOLD: Rgb = [0.8, 0.62, 0.2];
const SLING: Rgb = [0.92, 0.78, 0.12];
const SLING_BLUE: Rgb = [0.12, 0.3, 0.75];
const WHITE: Rgb = [1, 1, 1];
/** The sheath's strands averaged (one tracer, three light, two dark of six). */
const AVERAGE: Rgb = [0, 1, 2].map(
  (k) => (TRACER[k]! + 3 * SHEATH[k]! + 2 * SHEATH_DARK[k]!) / 6,
) as unknown as Rgb;
/** A rope's tube and hardware are drawn within this range of the camera (m): the tube is under
 * a pixel long before, and the hairline carries it from there. */
const MESH_RANGE = 280;
const RADIUS = 0.019;
const SIDES = 6;
/** Braid: the strands' twist (m per turn). */
const TWIST = 0.14;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** A rope's whole line: tied off at its foot, the climb, over the lip to the top anchor. */
function ropeLine(ground: Ground, p: RopePath): THREE.Vector3[] {
  const first = V(p.pts[0]!, p.pts[1]!, p.pts[2]!);
  const knot = footKnot(p);
  const pts = [knot];
  // From the knot up to the climb's start (a short straight pull).
  for (let k = 1; k < 3; k++) pts.push(knot.clone().lerp(first, k / 3));
  // A ring every half metre (the path has a point every 0.25 m), and the climb's last point.
  const n = p.pts.length / 3;
  for (let i = 0; i < n; i += 2) pts.push(V(p.pts[i * 3]!, p.pts[i * 3 + 1]!, p.pts[i * 3 + 2]!));
  if (n % 2 === 0) pts.push(V(p.pts[n * 3 - 3]!, p.pts[n * 3 - 2]!, p.pts[n * 3 - 1]!));
  // Over the lip and along the rock to the top anchor: lying on it, never through it.
  const last = pts[pts.length - 1]!;
  const post = V(...p.post);
  const steps = Math.max(4, Math.ceil(last.distanceTo(post) / 0.25));
  for (let k = 1; k <= steps; k++) {
    const t = k / steps;
    const q = last.clone().lerp(post, t);
    q.y = Math.max(q.y - Math.sin(t * Math.PI) * 0.25, ground.heightAt(q.x, q.z) + RADIUS + 0.01);
    pts.push(q);
  }
  return pts;
}

/** Where the rope is tied off at its foot: the bolt's carabiner, just off the rock. */
function footKnot(p: RopePath) {
  const [ax, ay, az] = p.anchor;
  const out = V(p.pts[0]! - ax, p.pts[1]! - ay, p.pts[2]! - az).normalize();
  return V(ax, ay, az).addScaledVector(out, 0.13);
}

/** An oval carabiner `len` long round `centre`: its spine along `along`, open across `across`. */
function biner(
  b: Builder,
  centre: THREE.Vector3,
  along: THREE.Vector3,
  across: THREE.Vector3,
  color: Rgb,
  len = 0.1,
) {
  const n = 10;
  const ring = (k: number) => {
    const a = (k / n) * Math.PI * 2;
    return centre
      .clone()
      .addScaledVector(along, (Math.cos(a) * len) / 2)
      .addScaledVector(across, Math.sin(a) * len * 0.29);
  };
  for (let k = 0; k < n; k++) b.rod(ring(k), ring(k + 1), 0.0055, color, 5);
}

/** A bolt in the rock with its hanger (a stainless plate with an eye), out along `out`. */
function bolt(b: Builder, rock: THREE.Vector3, out: THREE.Vector3, up: THREE.Vector3) {
  b.rod(
    rock.clone().addScaledVector(out, -0.02),
    rock.clone().addScaledVector(out, 0.012),
    0.032,
    STEEL,
    6,
    true,
  );
  b.rod(
    rock.clone().addScaledVector(out, 0.012),
    rock.clone().addScaledVector(out, 0.026),
    0.011,
    STEEL_DARK,
    6,
    true,
  );
  // The hanger's eye, bent out from the plate.
  const side = new THREE.Vector3().crossVectors(out, up).normalize();
  const eye = rock.clone().addScaledVector(out, 0.04).addScaledVector(up, -0.03);
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2,
      a1 = ((k + 1) / n) * Math.PI * 2;
    b.rod(
      eye
        .clone()
        .addScaledVector(out, Math.cos(a0) * 0.018)
        .addScaledVector(up, Math.sin(a0) * 0.018),
      eye
        .clone()
        .addScaledVector(out, Math.cos(a1) * 0.018)
        .addScaledVector(up, Math.sin(a1) * 0.018),
      0.005,
      STEEL,
      4,
    );
  }
  return { eye, side };
}

/** A sewn sling between two points: a flat loop of webbing (two strands, a little apart). */
function sling(b: Builder, a: THREE.Vector3, c: THREE.Vector3, side: THREE.Vector3, color: Rgb) {
  for (const k of [-1, 1])
    b.rod(
      a.clone().addScaledVector(side, k * 0.006),
      c.clone().addScaledVector(side, k * 0.006),
      0.006,
      color,
      4,
    );
}

/** A figure-eight knot at `at` on a rope running along `dir`: a few turns, thicker than it. */
function knot(b: Builder, at: THREE.Vector3, dir: THREE.Vector3, color: Rgb) {
  const u = Math.abs(dir.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  const s1 = new THREE.Vector3().crossVectors(dir, u).normalize();
  const s2 = new THREE.Vector3().crossVectors(dir, s1).normalize();
  const n = 14;
  let prev: THREE.Vector3 | null = null;
  for (let k = 0; k <= n; k++) {
    const t = k / n,
      a = t * Math.PI * 4;
    const q = at
      .clone()
      .addScaledVector(dir, (t - 0.5) * 0.12)
      .addScaledVector(s1, Math.cos(a) * 0.022)
      .addScaledVector(s2, Math.sin(a) * 0.022);
    if (prev) b.rod(prev, q, RADIUS * 0.95, color, 5);
    prev = q;
  }
}

/** One rope's static installation (one geometry): its sway weights and the braid's coordinates
 * (metres along the rope, turns round it; −1 off the rope). */
function buildStatic(ground: Ground, p: RopePath) {
  const b = new Builder();
  const line = ropeLine(ground, p);
  // Tube with a parallel-transported frame (no flips along the face's curve).
  const up = V(0, 1, 0);
  let tan = line[1]!.clone().sub(line[0]!).normalize();
  const nrm = new THREE.Vector3().crossVectors(tan, Math.abs(tan.y) > 0.9 ? V(1, 0, 0) : up);
  nrm.normalize();
  const rings: Array<{ p: THREE.Vector3; n: THREE.Vector3; bn: THREE.Vector3; s: number }> = [];
  let s = 0;
  for (let i = 0; i < line.length; i++) {
    if (i > 0) s += line[i]!.distanceTo(line[i - 1]!);
    const next = line[Math.min(line.length - 1, i + 1)]!,
      prev = line[Math.max(0, i - 1)]!;
    const t2 = next.clone().sub(prev).normalize();
    // Transport the normal onto the new tangent.
    const axis = new THREE.Vector3().crossVectors(tan, t2);
    if (axis.lengthSq() > 1e-12) {
      const ang = Math.acos(Math.max(-1, Math.min(1, tan.dot(t2))));
      nrm.applyAxisAngle(axis.normalize(), ang);
    }
    tan = t2;
    const bn = new THREE.Vector3().crossVectors(tan, nrm).normalize();
    rings.push({ p: line[i]!, n: nrm.clone(), bn, s });
  }
  const braid: number[] = [];
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
      const t0 = k / SIDES,
        t1 = (k + 1) / SIDES;
      b.tri(a0.p, b0.p, b1.p, WHITE, a0.n.clone().add(b1.n).normalize());
      braid.push(r0.s, t0, r1.s, t0, r1.s, t1);
      b.tri(a0.p, b1.p, a1.p, WHITE, a0.n.clone().add(b1.n).normalize());
      braid.push(r0.s, t0, r1.s, t1, r0.s, t1);
    }
  }
  const ropeEnd = b.pos.length / 3;
  // Up the face: a bolt in the rock, a sling out from its hanger, a carabiner the rope runs
  // through.
  p.brackets.forEach((br, i) => {
    const rock = V(...br.rock),
      rope = V(...br.rope);
    const out = rope.clone().sub(rock).normalize();
    // Up the face (the rope's direction there, square to `out`).
    const k = Math.min(p.pts.length / 3 - 2, Math.round((ropeS(p, ...br.rope, 0.02) ?? 0) / 0.25));
    const up = V(
      p.pts[k * 3 + 3]! - p.pts[k * 3]!,
      p.pts[k * 3 + 4]! - p.pts[k * 3 + 1]!,
      p.pts[k * 3 + 5]! - p.pts[k * 3 + 2]!,
    );
    up.addScaledVector(out, -up.dot(out)).normalize();
    const { eye, side } = bolt(b, rock, out, up);
    // The carabiner in the hanger's eye, the sling from it down and out to the rope's: the rope
    // pulls down on it, so the sling leans a little down the face.
    const top = eye.clone().addScaledVector(out, 0.045);
    biner(b, top, out, side, i % 2 ? BINER_GOLD : BINER, 0.085);
    const low = rope.clone().addScaledVector(out, -0.055).addScaledVector(up, -0.02);
    sling(b, top.clone().addScaledVector(out, 0.04), low, side, i % 3 === 2 ? SLING_BLUE : SLING);
    // The rope's carabiner: the rope through its far end, square to it.
    biner(b, rope.clone().addScaledVector(out, -0.01), out, side, i % 2 ? BINER : BINER_GOLD);
  });
  // The foot: the rope tied off to a bolt in the rock with a figure-eight, its spare end on down
  // to a coil on the slope beside it.
  {
    const [ax, ay, az] = p.anchor;
    const rock = V(ax, ay, az);
    const knotAt = footKnot(p);
    const out = knotAt.clone().sub(rock).normalize();
    const climbUp = V(p.pts[3]! - p.pts[0]!, p.pts[4]! - p.pts[1]!, p.pts[5]! - p.pts[2]!);
    climbUp.addScaledVector(out, -climbUp.dot(out)).normalize();
    const { side } = bolt(b, rock, out, climbUp);
    biner(b, rock.clone().addScaledVector(out, 0.085), out, side, BINER);
    knot(b, knotAt.clone().addScaledVector(climbUp, 0.05), climbUp, AVERAGE);
    // The tail: from the knot down onto the slope and round into a coil.
    const [cx, cy, cz] = p.coil;
    const coil = V(cx, cy, cz);
    const tail: THREE.Vector3[] = [knotAt.clone().addScaledVector(climbUp, -0.02)];
    for (let k = 1; k <= 6; k++) {
      const q = tail[0]!.clone().lerp(coil, k / 7);
      q.y = Math.max(q.y, ground.heightAt(q.x, q.z) + RADIUS);
      tail.push(q);
    }
    // Three loops lying on each other, a little flattened (dropped, not laid out).
    const loops = 3,
      seg = 12;
    for (let k = 0; k <= loops * seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const r = 0.24 + 0.02 * Math.sin(k * 1.7);
      const x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r * 0.8;
      tail.push(V(x, ground.heightAt(x, z) + RADIUS * (1 + 2 * Math.floor(k / seg)), z));
    }
    for (let k = 0; k + 1 < tail.length; k++) b.rod(tail[k]!, tail[k + 1]!, RADIUS, AVERAGE, 5);
  }
  // The top: two bolts in the plateau's rock a little apart, a sling from each to a locking
  // carabiner (the master point), the rope tied into it.
  {
    const post = V(...p.post);
    const into = V(-p.dir[0], 0, -p.dir[1]);
    const side = V(p.dir[1], 0, -p.dir[0]);
    const lock = post.clone();
    for (const k of [-1, 1]) {
      const x = post.x + into.x * 0.55 + side.x * k * 0.3,
        z = post.z + into.z * 0.55 + side.z * k * 0.3;
      const rock = V(x, ground.heightAt(x, z), z);
      const { eye } = bolt(b, rock, V(0, 1, 0), into);
      biner(b, eye.clone().add(V(0, 0.04, 0)), into, side, k < 0 ? BINER : BINER_GOLD, 0.08);
      sling(
        b,
        eye
          .clone()
          .add(V(0, 0.05, 0))
          .addScaledVector(into, -0.04),
        lock,
        V(0, 1, 0),
        k < 0 ? SLING : SLING_BLUE,
      );
    }
    biner(b, lock, into, V(0, 1, 0), BINER_GOLD, 0.11);
    // The screw gate's sleeve.
    b.rod(
      lock
        .clone()
        .addScaledVector(V(0, 1, 0), 0.03)
        .addScaledVector(into, -0.02),
      lock
        .clone()
        .addScaledVector(V(0, 1, 0), 0.03)
        .addScaledVector(into, 0.02),
      0.008,
      STEEL_DARK,
      6,
    );
    knot(b, lock.clone().addScaledVector(into, -0.11), into, AVERAGE);
  }
  const geometry = b.geometry();
  // Sway weight: 1 on the rope, 0 on the hardware; the braid's coordinates likewise.
  const n = b.pos.length / 3;
  const sway = new Float32Array(n);
  const coords = new Float32Array(n * 2).fill(-1);
  for (let i = 0; i < ropeEnd; i++) sway[i] = 1;
  coords.set(braid);
  geometry.setAttribute("sway", new THREE.BufferAttribute(sway, 1));
  geometry.setAttribute("braid", new THREE.BufferAttribute(coords, 2));
  return { geometry, line };
}

/** Climbers on the rope this frame (world, feet), up to four. */
export type RopeClimberView = { x: number; y: number; z: number };

const glsl = (c: Rgb) => `vec3(${c.map((v) => v.toFixed(4)).join(", ")})`;

export function createRopeRenderer(scene: THREE.Scene, ground: Ground) {
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
        "#include <common>\nattribute float sway;\nattribute vec2 braid;\nvarying vec2 vBraid;\nuniform vec4 ropeClimbers[4];\nuniform float ropeTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vBraid = braid;
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
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vBraid;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        // The braid: six strands spiral round the rope, one of them the dark tracer. Past the
        // range where a strand is a pixel wide, their average (no shimmer).
        if (vBraid.y >= 0.0) {
          float turns = vBraid.x / ${TWIST.toFixed(3)};
          float strand = floor(fract(turns + vBraid.y) * 6.0);
          vec3 c = strand < 0.5 ? ${glsl(TRACER)} : mod(strand, 2.0) > 0.5 ? ${glsl(SHEATH)} : ${glsl(SHEATH_DARK)};
          diffuseColor.rgb = mix(c, ${glsl(AVERAGE)}, clamp(fwidth(turns) * 6.0 - 0.5, 0.0, 1.0));
        }`,
      );
  };
  material.customProgramCacheKey = () => "br-rope-braid";
  const root = new THREE.Group();
  root.name = "climbing-ropes";
  const hairMaterial = new THREE.LineBasicMaterial({ color: 0x8a2a12 });
  const geometries: THREE.BufferGeometry[] = [];
  const meshes: THREE.Mesh[] = [];
  ropePaths(ground).forEach((path, i) => {
    const { geometry, line } = buildStatic(ground, path);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `climbing-rope-${i}`;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    meshes.push(mesh);
    // The rope again as a hairline: the tube is under a pixel past ~40 m.
    const hair = new THREE.BufferGeometry().setFromPoints(line);
    hair.computeBoundingSphere();
    const hairline = new THREE.Line(hair, hairMaterial);
    hairline.name = `climbing-rope-hairline-${i}`;
    hairline.matrixAutoUpdate = false;
    root.add(hairline);
    geometries.push(geometry, hair);
  });
  scene.add(root);
  let busy = false;
  return {
    root,
    /** The climbers this frame (the sway follows them), time in seconds, and where the camera
     * is (a rope's tube and hardware are drawn within MESH_RANGE of it, its hairline always). */
    update(list: readonly RopeClimberView[], time: number, eye?: THREE.Vector3) {
      if (eye)
        for (const mesh of meshes) {
          const sphere = mesh.geometry.boundingSphere!;
          mesh.visible = eye.distanceTo(sphere.center) - sphere.radius < MESH_RANGE;
        }
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
      for (const g of geometries) g.dispose();
      material.dispose();
      hairMaterial.dispose();
    },
  };
}
