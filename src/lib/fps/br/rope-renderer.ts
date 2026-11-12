import * as THREE from "three";
import { ropePaths, type Ground, type RopePath } from "./rope";
import { Builder, type Rgb } from "./zipline-renderer";

/**
 * The Iron Peaks climbing ropes drawn (rope.ts): braided kernmantle ropes (a red-orange sheath
 * with a dark tracer twisting round it), each from its foot anchor up its face to the post over
 * the summit's edge, held off the rock on galvanised stand-off brackets (a base plate bolted to
 * the rock, an arm out to an eye the rope runs through), a ground anchor at its foot and a steel
 * post on a concrete footing at the top.
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
const GALV: Rgb = [0.6, 0.62, 0.64];
const STEEL: Rgb = [0.32, 0.34, 0.36];
const BOLT: Rgb = [0.75, 0.76, 0.78];
const CONCRETE: Rgb = [0.55, 0.54, 0.51];
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

/** A rope's whole line: the foot anchor, the climb, over the edge to the post (world). */
function ropeLine(p: RopePath): THREE.Vector3[] {
  const pts = [V(...p.anchor)];
  // A ring every half metre (the path has a point every 0.25 m), and the climb's last point.
  const n = p.pts.length / 3;
  for (let i = 0; i < n; i += 2) pts.push(V(p.pts[i * 3]!, p.pts[i * 3 + 1]!, p.pts[i * 3 + 2]!));
  if (n % 2 === 0) pts.push(V(p.pts[n * 3 - 3]!, p.pts[n * 3 - 2]!, p.pts[n * 3 - 1]!));
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

/** One rope's static installation (one geometry): its sway weights and the braid's coordinates
 * (metres along the rope, turns round it; −1 off the rope). */
function buildStatic(ground: Ground, p: RopePath) {
  const b = new Builder();
  const line = ropeLine(p);
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
  // Stand-off brackets: a plate bolted to the rock, an arm out to the rope, an eye round it.
  for (const br of p.brackets) {
    const rock = V(...br.rock),
      rope = V(...br.rope);
    const out = rope.clone().sub(rock).normalize();
    const side = V(p.dir[1], 0, -p.dir[0]);
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
