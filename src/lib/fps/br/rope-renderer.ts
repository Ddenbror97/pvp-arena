import * as THREE from "three";
import { ROPE, ROPE_STEP, ropePaths, type RopePath } from "./rope";
import type { Heightfield } from "./heightfield";
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
 * within MESH_RANGE; the four together ≈ 27k triangles, of them 12k the ropes' tubes) and a
 * one-pixel hairline along the rope (one more, so it reads from the slopes below), drawn only
 * within HAIR_RANGE: a 4 cm rope is far under a pixel from across the valley, and a hairline
 * there drew red lines down the mountain (owner, 2026-11-13: "on far distance the red climbing
 * ropes are displayed and makes the mountain look weird … should not be displayed at all for
 * such a tiny item"). The braid is worked out per pixel from the distance along the rope, so the tube
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
/** A rope's tube and hardware are drawn within this range of the camera (m, to the nearest point
 * of the rope): the 4 cm tube is about a pixel wide at 40 m, and the hairline carries it from
 * there. */
const MESH_RANGE = 120;
/** Past this (m, to the nearest point of the rope) nothing of a rope is drawn: a real rope is
 * lost against the rock long before. */
const HAIR_RANGE = 170;
const RADIUS = 0.019;
const SIDES = 6;
/** Braid: the strands' twist (m per turn). */
const TWIST = 0.14;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * A rope's whole line as drawn: its free end on the slope below the climb, up the face lying on
 * the rock, over the lip to the top anchor. With each point, how far out a climber pulls it (to
 * the climb's line, where the hands hold it: `pull`) and how far up the climb it is (`s`; −1
 * off the climb). Laid on the terrain as it is drawn (Heightfield.meshAt), `LIE` off it square
 * to the slope, so it neither hangs off the snow nor sinks into it (owner, 2026-11-12: "ensure
 * the rope lays good to the mountain").
 */
export function ropeLine(ground: Heightfield, p: RopePath) {
  const pts: THREE.Vector3[] = [],
    pull: THREE.Vector3[] = [],
    cs: number[] = [];
  const zero = V(0, 0, 0);
  const [dx, dz] = p.dir;
  const m = { y: 0, ny: 1 };
  /** On the drawn surface at (x, z). */
  const lay = (x: number, z: number) => {
    ground.meshAt(x, z, m);
    return V(x, m.y + LIE / m.ny, z);
  };
  /** The climb's point `i`, in from its line onto the rock (along the face's outward normal). */
  const climbAt = (i: number) => {
    const x = p.pts[i * 3]!,
      y = p.pts[i * 3 + 1]!,
      z = p.pts[i * 3 + 2]!;
    const dy =
      (ground.heightAt(x + dx * 2, z + dz * 2) - ground.heightAt(x - dx * 2, z - dz * 2)) / 4;
    const n = Math.hypot(dy, 1);
    const inward = ROPE.offFace;
    const q = lay(x + ((dx * dy) / n) * inward, z + ((dz * dy) / n) * inward);
    return { q, pull: V(x, y, z).sub(q), s: i * ROPE_STEP };
  };
  const add = (q: THREE.Vector3, pl: THREE.Vector3, s: number) => {
    pts.push(q);
    pull.push(pl);
    cs.push(s);
  };
  // The free end on the slope, up to the climb's start.
  const n = p.pts.length / 3;
  const first = climbAt(0);
  const [tx, , tz] = p.tail;
  for (let k = 0; k < 5; k++) {
    const t = k / 5;
    add(lay(tx + (first.q.x - tx) * t, tz + (first.q.z - tz) * t), zero, -1);
  }
  // Up the face: a ring every half metre, and one between where the surface bends under it.
  let prev = first;
  add(first.q, first.pull, first.s);
  for (let i = 2; i < n + 1; i += 2) {
    const next = climbAt(Math.min(i, n - 1));
    const mid = climbAt(i - 1);
    if (mid.q.distanceTo(prev.q.clone().lerp(next.q, 0.5)) > 0.012) add(mid.q, mid.pull, mid.s);
    add(next.q, next.pull, next.s);
    prev = next;
    if (i >= n - 1) break;
  }
  // Over the lip and along the rock to the top anchor, lying on it.
  const last = pts[pts.length - 1]!;
  const post = topAnchor(ground, p);
  const steps = Math.max(4, Math.ceil(last.distanceTo(post) / 0.25));
  for (let k = 1; k <= steps; k++) {
    const t = k / steps;
    const q =
      k === steps ? post : lay(last.x + (post.x - last.x) * t, last.z + (post.z - last.z) * t);
    add(q, zero, -1);
  }
  return { pts, pull, cs };
}
/** The top anchor's locking carabiner: on the drawn rock where the route's post stands. */
function topAnchor(ground: Heightfield, p: RopePath) {
  return V(p.post[0], ground.meshAt(p.post[0], p.post[2]).y + 0.1, p.post[2]);
}

/** How far off the rock the rope's middle lies where nobody pulls it (m). */
const LIE = RADIUS + 0.012;

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
function buildStatic(ground: Heightfield, p: RopePath, id: number) {
  const b = new Builder();
  const { pts: line, pull, cs } = ropeLine(ground, p);
  const pulls: number[] = [],
    climbS: number[] = [];
  const at = (i: number) => {
    pulls.push(pull[i]!.x, pull[i]!.y, pull[i]!.z);
    climbS.push(cs[i]!);
  };
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
      for (const v of [i, i + 1, i + 1]) at(v);
      b.tri(a0.p, b1.p, a1.p, WHITE, a0.n.clone().add(b1.n).normalize());
      braid.push(r0.s, t0, r1.s, t1, r0.s, t1);
      for (const v of [i, i + 1, i]) at(v);
    }
  }
  const ropeEnd = b.pos.length / 3;
  // The top: two bolts in the plateau's rock a little apart, a sling from each to a locking
  // carabiner (the master point), the rope tied into it.
  {
    const post = topAnchor(ground, p);
    const into = V(-p.dir[0], 0, -p.dir[1]);
    const side = V(p.dir[1], 0, -p.dir[0]);
    const lock = post.clone();
    for (const k of [-1, 1]) {
      const x = post.x + into.x * 0.55 + side.x * k * 0.3,
        z = post.z + into.z * 0.55 + side.z * k * 0.3;
      const rock = V(x, ground.meshAt(x, z).y, z);
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
  const pullAttr = new Float32Array(n * 3);
  const sAttr = new Float32Array(n).fill(-1);
  for (let i = 0; i < ropeEnd; i++) sway[i] = 1;
  coords.set(braid);
  pullAttr.set(pulls);
  sAttr.set(climbS);
  geometry.setAttribute("sway", new THREE.BufferAttribute(sway, 1));
  geometry.setAttribute("braid", new THREE.BufferAttribute(coords, 2));
  geometry.setAttribute("pull", new THREE.BufferAttribute(pullAttr, 3));
  geometry.setAttribute("climbS", new THREE.BufferAttribute(sAttr, 1));
  geometry.setAttribute("ropeId", new THREE.BufferAttribute(new Float32Array(n).fill(id), 1));
  // (Pulled out to a climber, the rope stands up to half a metre off where it lies.)
  geometry.boundingSphere!.radius += ROPE.offFace;
  return { geometry, line, pull, cs };
}

/** Within this of a rope's line a climber holds it (m): further, stepping on or off. */
const GRIP = 0.9;

/** Climbers on the rope this frame (world, feet), up to four. */
export type RopeClimberView = { x: number; y: number; z: number };

/**
 * The rope lies on the rock; a climber pulls it out to the climb's line where the hands hold it
 * (from the hips to over the head), and it runs back to the rock a few metres either side,
 * swaying a little. The same for the tube and its hairline.
 */
const PULL_GLSL = /* glsl */ `
  attribute vec3 pull;
  attribute float climbS;
  attribute float ropeId;
  uniform vec4 ropeClimbers[4];
  uniform float ropeTime;
  void ropePull(inout vec3 p) {
    if (climbS < 0.0) return;
    float hold = 0.0;
    for (int k = 0; k < 4; k++) {
      vec4 c = ropeClimbers[k];
      if (abs(c.x - ropeId) > 0.5) continue;
      float away = max(c.y - 0.4 - climbS, climbS - c.y - 2.4);
      hold = max(hold, c.z * (1.0 - smoothstep(0.0, 3.5, away)));
    }
    p += pull * hold;
    p += hold * vec3(sin(ropeTime * 2.3 + climbS * 0.9), 0.0, cos(ropeTime * 1.7 + climbS * 0.7)) * 0.02 * (1.0 - hold * 0.6);
  }
`;

const glsl = (c: Rgb) => `vec3(${c.map((v) => v.toFixed(4)).join(", ")})`;

export function createRopeRenderer(scene: THREE.Scene, ground: Heightfield) {
  // Per climber: which rope (its index), how far up its climb (m), and how firmly on it (0 … 1).
  const climbers = Array.from({ length: 4 }, () => new THREE.Vector4(-1, 0, 0, 0));
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
        `#include <common>\nattribute float sway;\nattribute vec2 braid;\nvarying vec2 vBraid;\n${PULL_GLSL}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vBraid = braid;
        if (sway > 0.5) ropePull(transformed);`,
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
  hairMaterial.onBeforeCompile = (shader) => {
    shader.uniforms["ropeClimbers"] = uniforms.ropeClimbers;
    shader.uniforms["ropeTime"] = uniforms.ropeTime;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${PULL_GLSL}`)
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nropePull(transformed);");
  };
  hairMaterial.customProgramCacheKey = () => "br-rope-hairline";
  const geometries: THREE.BufferGeometry[] = [];
  const meshes: THREE.Mesh[] = [];
  const hairlines: THREE.Line[] = [];
  /** Per rope, every few metres of its drawn line (x, y, z): the camera's distance to a rope. */
  const probes: Float32Array[] = [];
  ropePaths(ground).forEach((path, i) => {
    const { geometry, line, pull, cs } = buildStatic(ground, path, i);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `climbing-rope-${i}`;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
    meshes.push(mesh);
    // The rope again as a hairline: the tube is under a pixel past ~40 m.
    const hair = new THREE.BufferGeometry().setFromPoints(line);
    hair.setAttribute(
      "pull",
      new THREE.BufferAttribute(new Float32Array(pull.flatMap((v) => [v.x, v.y, v.z])), 3),
    );
    hair.setAttribute("climbS", new THREE.BufferAttribute(new Float32Array(cs), 1));
    hair.setAttribute(
      "ropeId",
      new THREE.BufferAttribute(new Float32Array(line.length).fill(i), 1),
    );
    hair.computeBoundingSphere();
    const hairline = new THREE.Line(hair, hairMaterial);
    hairline.name = `climbing-rope-hairline-${i}`;
    hairline.matrixAutoUpdate = false;
    hairline.visible = false;
    root.add(hairline);
    hairlines.push(hairline);
    const every = line.filter((_, k) => k % 4 === 0 || k === line.length - 1);
    probes.push(new Float32Array(every.flatMap((v) => [v.x, v.y, v.z])));
    geometries.push(geometry, hair);
  });
  scene.add(root);
  const paths = ropePaths(ground);
  /** Which rope a climber is on, how far up, and how near its line (firmly on it: 1). */
  const onRope = (c: RopeClimberView, out: THREE.Vector4) => {
    out.set(-1, 0, 0, 0);
    let best = GRIP;
    paths.forEach((p, i) => {
      const [x0, y0, z0, x1, y1, z1] = p.box;
      if (
        c.x < x0 - GRIP ||
        c.x > x1 + GRIP ||
        c.y < y0 - GRIP ||
        c.y > y1 + GRIP ||
        c.z < z0 - GRIP ||
        c.z > z1 + GRIP
      )
        return;
      for (let k = 0; k < p.pts.length; k += 3) {
        const d = Math.hypot(p.pts[k]! - c.x, p.pts[k + 1]! - c.y, p.pts[k + 2]! - c.z);
        if (d < best) {
          best = d;
          const t = Math.min(1, Math.max(0, (GRIP - d) / (GRIP - 0.15)));
          out.set(i, (k / 3) * ROPE_STEP, t * t * (3 - 2 * t), 0);
        }
      }
    });
  };
  let busy = false;
  /** The camera's distance to the nearest probe point of a rope (m). */
  const nearest = (pts: Float32Array, eye: THREE.Vector3) => {
    let best = Infinity;
    for (let k = 0; k < pts.length; k += 3)
      best = Math.min(
        best,
        (pts[k]! - eye.x) ** 2 + (pts[k + 1]! - eye.y) ** 2 + (pts[k + 2]! - eye.z) ** 2,
      );
    return Math.sqrt(best);
  };
  return {
    root,
    /** The climbers this frame (each pulls the rope out from the rock where the hands hold it,
     * easing in as they take hold), time in seconds, and where the camera is (a rope's tube and
     * hardware are drawn within MESH_RANGE of it, its hairline within HAIR_RANGE, nothing past). */
    update(list: readonly RopeClimberView[], time: number, eye?: THREE.Vector3) {
      if (eye)
        meshes.forEach((mesh, i) => {
          const d = nearest(probes[i]!, eye);
          mesh.visible = d < MESH_RANGE;
          hairlines[i]!.visible = d < HAIR_RANGE;
        });
      if (!list.length && !busy) return;
      busy = list.length > 0;
      for (let k = 0; k < 4; k++) {
        const c = list[k];
        if (c) onRope(c, climbers[k]!);
        else climbers[k]!.set(-1, 0, 0, 0);
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
