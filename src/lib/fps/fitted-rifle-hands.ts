import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** Support hand sits mid-handguard rather than at the front sight (rifle-local units). */
export const SUPPORT_GRIP_SHIFT = 0.09;
/** Radians the support hand leans toward the lower-left, in line with the forearm. */
export const SUPPORT_HAND_LEAN = 0.5;

/** Fit the authored finger bones to a horizontal AK handguard, not the optional vertical grip. */
export function poseRifleHands(root: THREE.Object3D) {
  const hand = root.getObjectByName("Hand_L");
  if (!hand) throw new Error("AK support hand is missing");
  root.updateWorldMatrix(true, true);
  const originalHand = hand.matrixWorld.clone();
  hand.scale.multiplyScalar(0.85);
  const middle = root.getObjectByName("Bone_L009")!;
  const wrist = hand.getWorldPosition(new THREE.Vector3());
  const current = middle.getWorldPosition(new THREE.Vector3()).sub(wrist).normalize();
  const across = root
    .getObjectByName("Bone_L017")!
    .getWorldPosition(new THREE.Vector3())
    .sub(root.getObjectByName("Bone_L005")!.getWorldPosition(new THREE.Vector3()));
  across.addScaledVector(current, -across.dot(current)).normalize();
  const sourceFrame = new THREE.Matrix4().makeBasis(
    across,
    current,
    new THREE.Vector3().crossVectors(across, current),
  );
  // Lean the hand about the handguard so wrist and forearm share one lower-left diagonal.
  const lean = Math.sin(SUPPORT_HAND_LEAN),
    upright = Math.cos(SUPPORT_HAND_LEAN);
  const desired = new THREE.Vector3(
    lean * Math.sqrt(0.91),
    upright * Math.sqrt(0.91),
    -0.3,
  ).transformDirection(root.matrixWorld);
  const desiredAcross = new THREE.Vector3(
    lean * 0.3,
    upright * 0.3,
    Math.sqrt(0.91),
  ).transformDirection(root.matrixWorld);
  const targetFrame = new THREE.Matrix4().makeBasis(
    desiredAcross,
    desired,
    new THREE.Vector3().crossVectors(desiredAcross, desired),
  );
  const turn = new THREE.Quaternion().setFromRotationMatrix(
    targetFrame.multiply(sourceFrame.invert()),
  );
  const world = hand.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn);
  hand.quaternion.copy(
    hand.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world),
  );
  hand.position.copy(
    hand.parent!.worldToLocal(
      root.localToWorld(
        new THREE.Vector3(
          -0.06 - 0.235 * Math.sin(SUPPORT_HAND_LEAN),
          -0.23 + 0.235 * (1 - Math.cos(SUPPORT_HAND_LEAN)),
          -0.88 + SUPPORT_GRIP_SHIFT,
        ),
      ),
    ),
  );
  root.updateWorldMatrix(true, true);

  function aim(joint: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) {
    const origin = joint.getWorldPosition(new THREE.Vector3());
    const from = child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
    const to = target.clone().sub(origin).normalize();
    const rotation = joint
      .getWorldQuaternion(new THREE.Quaternion())
      .premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
    joint.quaternion.copy(
      joint.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation),
    );
    root.updateWorldMatrix(true, true);
  }
  // A pole below the handguard prevents the solver taking a shortcut through the weapon.
  function wrapSupport(base: number, z: number) {
    const name = (i: number) => `Bone_L${String(i).padStart(3, "0")}`;
    const a = root.getObjectByName(name(base))!,
      b = root.getObjectByName(name(base + 1))!,
      c = root.getObjectByName(name(base + 2))!,
      tip = root.getObjectByName(name(base + 2) + "_end")!;
    const origin = a.getWorldPosition(new THREE.Vector3()),
      bp = b.getWorldPosition(new THREE.Vector3()),
      cp = c.getWorldPosition(new THREE.Vector3());
    const l1 = origin.distanceTo(bp),
      l2 = bp.distanceTo(cp);
    const goal = root.localToWorld(new THREE.Vector3(0.04, -0.04, z)),
      forward = goal.clone().sub(origin).normalize();
    const distance = THREE.MathUtils.clamp(
      origin.distanceTo(goal),
      Math.abs(l1 - l2) + 1e-5,
      l1 + l2 - 1e-5,
    );
    const pole = root.localToWorld(new THREE.Vector3(-0.025, -0.22, z)).sub(origin);
    pole.addScaledVector(forward, -pole.dot(forward)).normalize();
    const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    const pip = origin.clone().addScaledVector(forward, along).addScaledVector(pole, bend);
    aim(a, b, pip);
    aim(b, c, origin.clone().addScaledVector(forward, distance));
    aim(c, tip, root.localToWorld(new THREE.Vector3(0.045, 0.005, z)));
  }

  // CCD changes rotations only: authored bone lengths, skin weights and glove detail survive.
  function fit(names: string[], target: THREE.Vector3) {
    const chain = names.map((name) => root.getObjectByName(name)!);
    if (chain.some((b) => !b)) throw new Error(`Incomplete AK finger: ${names[0]}`);
    const tip = chain.at(-1)!,
      goal = root.localToWorld(target.clone());
    const origin = new THREE.Vector3(),
      from = new THREE.Vector3(),
      to = new THREE.Vector3();
    for (let iteration = 0; iteration < 18; iteration++) {
      for (let j = chain.length - 2; j >= 0; j--) {
        const joint = chain[j]!;
        joint.getWorldPosition(origin);
        from.copy(tip.getWorldPosition(new THREE.Vector3())).sub(origin).normalize();
        to.copy(goal).sub(origin).normalize();
        const correction = new THREE.Quaternion().setFromUnitVectors(from, to);
        const step = new THREE.Quaternion().slerp(correction, 0.65);
        const rotation = joint.getWorldQuaternion(new THREE.Quaternion()).premultiply(step);
        joint.quaternion.copy(
          joint.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation),
        );
        root.updateWorldMatrix(true, true);
      }
      if (tip.getWorldPosition(origin).distanceTo(goal) < 0.0005) break;
    }
  }
  for (const [base, z] of [
    [5, -0.982],
    [9, -0.955],
    [13, -0.927],
    [17, -0.9],
  ] as const) {
    wrapSupport(base, z + SUPPORT_GRIP_SHIFT);
  }
  fit(
    ["Bone_L020", "Bone_L021", "Bone_L022", "Bone_L022_end"],
    new THREE.Vector3(-0.052, 0.052, -0.971 + SUPPORT_GRIP_SHIFT),
  );
  // Right middle/ring/little fingers curl around the pistol grip. Index retains trigger placement.
  for (const [base, y] of [
    [9, -0.163],
    [13, -0.207],
    [17, -0.244],
  ] as const) {
    const name = (i: number) => `Bone_R${String(i).padStart(3, "0")}`;
    fit(
      [name(base), name(base + 1), name(base + 2), `${name(base + 2)}_end`],
      new THREE.Vector3(-0.045, y, -0.237),
    );
  }
  root.updateWorldMatrix(true, true);
  return hand.matrixWorld.clone().multiply(originalHand.invert());
}

type Vertex = { p: THREE.Vector3; n: THREE.Vector3; uv: THREE.Vector2 };
/**
 * Anatomical forearm cross-section along its length (t = 0 wrist → 1 elbow), in metres.
 * `width` is the half-width across the radius/ulna (thumb↔little-finger) axis, `depth` the
 * half-depth front↔back. Adult-male reference: ~17.5 cm wrist girth, ~27 cm at the muscle belly
 * in the upper third, slightly less at the elbow. The distal half is flat and tendinous.
 */
export const FOREARM_PROFILE: readonly { t: number; width: number; depth: number }[] = [
  { t: 0, width: 0.03, depth: 0.0195 },
  { t: 0.18, width: 0.031, depth: 0.0205 },
  { t: 0.42, width: 0.037, depth: 0.026 },
  { t: 0.68, width: 0.0445, depth: 0.033 },
  { t: 0.86, width: 0.0465, depth: 0.0355 },
  { t: 1, width: 0.0435, depth: 0.037 },
];
export type ForearmShape = {
  /** Elbow position relative to the wrist edge centre, in viewmodel-root units. */
  elbow: Record<"L" | "R", THREE.Vector3>;
  profile: typeof FOREARM_PROFILE;
  /** Brachioradialis/extensor mass on the thumb side of the upper forearm (metres). */
  radialBulge: number;
  /** Viewer position in viewmodel-root space, used to face the vein map to the camera. */
  viewer: THREE.Vector3;
  /** Viewmodel root scale, so measurements stay in real metres. */
  scale: number;
};
/** Fewest sides around a forearm cross-section before the extrusion is subdivided. */
const MIN_FOREARM_SIDES = 160;
/** Short, anatomically proportioned forearms entering from the lower screen edge. */
export const SHORT_FOREARMS: ForearmShape = {
  elbow: {
    L: new THREE.Vector3(-0.38, -0.42, 0.24),
    R: new THREE.Vector3(0.3, -0.42, 0.26),
  },
  profile: FOREARM_PROFILE,
  radialBulge: 0.0055,
  viewer: new THREE.Vector3(-0.27, 0.23, 0.38),
  scale: 0.52,
};
export function sampleForearmProfile(t: number, profile = FOREARM_PROFILE) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  for (let i = 1; i < profile.length; i++) {
    const b = profile[i]!;
    if (x <= b.t) {
      const a = profile[i - 1]!,
        k = THREE.MathUtils.smoothstep(x, a.t, b.t);
      return { width: a.width + (b.width - a.width) * k, depth: a.depth + (b.depth - a.depth) * k };
    }
  }
  const last = profile.at(-1)!;
  return { width: last.width, depth: last.depth };
}
/** Clip the actual posed glove triangles and extrude skin from their exact edge, without a cover band. */
export function fitContinuousForearms(
  arm: THREE.SkinnedMesh,
  root: THREE.Object3D,
  supportDelta: THREE.Matrix4,
  shape: ForearmShape = SHORT_FOREARMS,
) {
  root.updateWorldMatrix(true, true);
  arm.updateMatrixWorld(true);
  arm.skeleton.update();
  const source = arm.geometry,
    positions = source.getAttribute("position"),
    normals = source.getAttribute("normal"),
    uvs = source.getAttribute("uv"),
    weights = source.getAttribute("skinWeight"),
    joints = source.getAttribute("skinIndex");
  const toRoot = root.matrixWorld.clone().invert().multiply(arm.matrixWorld);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(toRoot);
  const vertices: Vertex[] = [],
    sides: number[] = [];
  const skinMatrices = arm.skeleton.bones.map((bone, i) => {
    const matrix = bone.matrixWorld.clone();
    if (/^(?:Arm_L|UpArm_L|Forearm_L|BoneTwist.*L)/.test(bone.name))
      matrix.premultiply(supportDelta);
    return matrix.multiply(arm.skeleton.boneInverses[i]!);
  });
  for (let i = 0; i < positions.count; i++) {
    const base = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(arm.bindMatrix);
    const p = new THREE.Vector3(),
      n = new THREE.Vector3(),
      bindNormal = new THREE.Vector3()
        .fromBufferAttribute(normals, i)
        .transformDirection(arm.bindMatrix);
    let side = 0;
    for (let j = 0; j < 4; j++) {
      const weight = weights.getComponent(i, j);
      if (!weight) continue;
      const index = joints.getComponent(i, j),
        bone = arm.skeleton.bones[index]!,
        matrix = skinMatrices[index]!;
      p.addScaledVector(base.clone().applyMatrix4(matrix), weight);
      n.addScaledVector(bindNormal.clone().transformDirection(matrix), weight);
      side += (/L(?:$|\d)|\.L/.test(bone.name) ? 1 : -1) * weight;
    }
    p.applyMatrix4(arm.bindMatrixInverse).applyMatrix4(toRoot);
    n.transformDirection(arm.bindMatrixInverse).applyMatrix3(normalMatrix).normalize();
    vertices.push({ p, n, uv: new THREE.Vector2(uvs.getX(i), uvs.getY(i)) });
    sides.push(side);
  }
  const built = {} as Record<
    "L" | "R",
    { gloves: THREE.BufferGeometry; skin: THREE.BufferGeometry }
  >;
  const seams: { side: string; points: number; gap: number; loops: number; openEdges: number }[] =
    [];
  for (const [side, sign] of [
    ["L", 1],
    ["R", -1],
  ] as const) {
    const hand = root.getObjectByName(`Hand_${side}`)!;
    const wrist = root.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
    const axis = new THREE.Vector3(0, -1, 0)
      .transformDirection(hand.matrixWorld)
      .transformDirection(root.matrixWorld.clone().invert());
    const plane = wrist.clone().addScaledVector(axis, -0.012);
    const glovePositions: number[] = [],
      gloveNormals: number[] = [],
      gloveUVs: number[] = [];
    const skinPositions: number[] = [],
      skinUVs: number[] = [];
    const edges: [THREE.Vector3, THREE.Vector3][] = [];
    const count = source.index?.count ?? positions.count;
    const interpolate = (a: Vertex, b: Vertex, t: number): Vertex => ({
      p: a.p.clone().lerp(b.p, t),
      n: a.n.clone().lerp(b.n, t).normalize(),
      uv: a.uv.clone().lerp(b.uv, t),
    });
    for (let i = 0; i < count; i += 3) {
      const ids = [0, 1, 2].map((j) => source.index?.getX(i + j) ?? i + j);
      if (ids.reduce((s, id) => s + sides[id]!, 0) * sign < 0) continue;
      const triangle = ids.map((id) => vertices[id]!);
      const clipped: Vertex[] = [],
        crossings: THREE.Vector3[] = [];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j]!,
          b = triangle[(j + 1) % 3]!,
          da = a.p.clone().sub(plane).dot(axis),
          db = b.p.clone().sub(plane).dot(axis);
        if (da <= 0) clipped.push(a);
        if (da <= 0 !== db <= 0) {
          const v = interpolate(a, b, da / (da - db));
          clipped.push(v);
          crossings.push(v.p);
        }
      }
      if (crossings.length === 2) edges.push([crossings[0]!, crossings[1]!]);
      for (let j = 1; j + 1 < clipped.length; j++)
        for (const v of [clipped[0]!, clipped[j]!, clipped[j + 1]!]) {
          glovePositions.push(...v.p.toArray());
          gloveNormals.push(...v.n.toArray());
          gloveUVs.push(...v.uv.toArray());
        }
    }
    // Weld UV-split edge vertices by position, then trace the original topology's boundary loops.
    const key = (p: THREE.Vector3) =>
      p
        .toArray()
        .map((v) => Math.round(v * 1e5))
        .join(",");
    const points = new Map<string, THREE.Vector3>(),
      neighbors = new Map<string, Set<string>>();
    for (const [a, b] of edges) {
      const ka = key(a),
        kb = key(b);
      if (ka === kb) continue;
      points.set(ka, a);
      points.set(kb, b);
      if (!neighbors.has(ka)) neighbors.set(ka, new Set());
      if (!neighbors.has(kb)) neighbors.set(kb, new Set());
      neighbors.get(ka)!.add(kb);
      neighbors.get(kb)!.add(ka);
    }
    const loops: THREE.Vector3[][] = [],
      used = new Set<string>();
    for (const start of neighbors.keys()) {
      if (used.has(start)) continue;
      const loop: THREE.Vector3[] = [];
      let current: string | undefined = start,
        previous: string | undefined;
      while (current && !used.has(current)) {
        used.add(current);
        loop.push(points.get(current)!);
        const next: string | undefined = [...neighbors.get(current)!].find(
          (k) => k !== previous && !used.has(k),
        );
        previous = current;
        current = next;
      }
      if (loop.length > 5) loops.push(loop);
    }
    loops.sort((a, b) => b.length - a.length);
    const coarseRim = loops[0];
    if (!coarseRim) throw new Error(`Cannot form continuous ${side} wrist edge`);
    // Subdivide sparse glove edges along their own straight segments: the seam stays exact,
    // and the forearm gets enough sides to shade as a smooth limb rather than flat strips.
    const split = Math.max(1, Math.ceil(MIN_FOREARM_SIDES / coarseRim.length));
    const rim = coarseRim.flatMap((p, i) => {
      const next = coarseRim[(i + 1) % coarseRim.length]!;
      return Array.from({ length: split }, (_, k) => p.clone().lerp(next, k / split));
    });
    if (split > 1) {
      // Split the glove triangles on the wrist edge identically, so the seam stays welded.
      const inserts = new Map<string, number>();
      coarseRim.forEach((p, i) => {
        const q = coarseRim[(i + 1) % coarseRim.length]!;
        inserts.set(`${key(p)}|${key(q)}`, 1);
        inserts.set(`${key(q)}|${key(p)}`, 1);
      });
      const P = glovePositions.splice(0),
        N = gloveNormals.splice(0),
        U = gloveUVs.splice(0);
      const vertex = (i: number) => ({
        p: new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]),
        n: new THREE.Vector3(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]),
        uv: new THREE.Vector2(U[i * 2], U[i * 2 + 1]),
      });
      const push = (v: Vertex) => {
        glovePositions.push(...v.p.toArray());
        gloveNormals.push(...v.n.toArray());
        gloveUVs.push(...v.uv.toArray());
      };
      for (let t = 0; t < P.length / 9; t++) {
        const tri = [0, 1, 2].map((j) => vertex(t * 3 + j));
        const edge = [0, 1, 2].find((j) =>
          inserts.has(`${key(tri[j]!.p)}|${key(tri[(j + 1) % 3]!.p)}`),
        );
        if (edge === undefined) {
          tri.forEach(push);
          continue;
        }
        const a = tri[edge]!,
          b = tri[(edge + 1) % 3]!,
          c = tri[(edge + 2) % 3]!;
        for (let k = 0; k < split; k++) {
          push(interpolate(a, b, k / split));
          push(k + 1 === split ? b : interpolate(a, b, (k + 1) / split));
          push(c);
        }
      }
    }
    const center = rim
      .reduce((v, p) => v.add(p), new THREE.Vector3())
      .multiplyScalar(1 / rim.length);
    const elbow = center.clone().add(shape.elbow[side]);
    const direction = elbow.clone().sub(center).normalize(),
      distance = center.distanceTo(elbow);
    const endRotation = new THREE.Quaternion().setFromUnitVectors(axis, direction);
    const ringCount = 32,
      rings: THREE.Vector3[][] = [];
    const path = new THREE.CubicBezierCurve3(
      center,
      center.clone().addScaledVector(axis, distance * 0.28),
      elbow.clone().addScaledVector(direction, -distance * 0.32),
      elbow,
    );
    // Cross-section frame at the wrist: `across` runs thumb → little finger (radius/ulna axis).
    const project = (p: THREE.Vector3) => {
      const v = p.clone().sub(center);
      return v.addScaledVector(axis, -v.dot(axis));
    };
    const bone = (n: number) =>
      root.worldToLocal(
        root
          .getObjectByName(`Bone_${side}${String(n).padStart(3, "0")}`)!
          .getWorldPosition(new THREE.Vector3()),
      );
    const across = project(bone(5)).sub(project(bone(17)));
    if (across.lengthSq() < 1e-10) across.set(1, 0, 0).addScaledVector(axis, -axis.x);
    across.normalize();
    const thumbSide = project(bone(20)).dot(across) >= 0 ? 1 : -1;
    const palmar = new THREE.Vector3().crossVectors(axis, across).normalize();
    // Unwrapped angle of every rim vertex, so the skin UVs run continuously round the arm.
    const angles: number[] = [];
    for (const p of rim) {
      const v = project(p),
        angle = Math.atan2(v.dot(palmar), v.dot(across));
      const previous = angles.at(-1);
      angles.push(
        previous === undefined
          ? angle
          : previous + Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous)),
      );
    }
    const turn =
      angles.at(-1)! -
      angles[0]! +
      Math.atan2(Math.sin(angles[0]! - angles.at(-1)!), Math.cos(angles[0]! - angles.at(-1)!));
    const toViewer = project(shape.viewer);
    const viewAngle = Math.atan2(toViewer.dot(palmar), toViewer.dot(across));
    // u = 0.5 faces the camera, so veins/tendons sit on the visible side of each arm.
    const uOf = (angle: number) => 0.5 + (angle - viewAngle) / (2 * Math.PI);
    const uvU = [...angles.map(uOf), uOf(angles[0]! + turn)];
    const offsets = rim.map((p) => p.clone().sub(center));
    const thumbAngle = thumbSide > 0 ? 0 : Math.PI;
    for (let r = 0; r <= ringCount; r++) {
      const t = r / ringCount,
        blend = THREE.MathUtils.smoothstep(t, 0, 0.42),
        q = new THREE.Quaternion().slerp(endRotation, blend);
      const c = path.getPoint(t),
        { width, depth } = sampleForearmProfile(t, shape.profile);
      // Slight supination twist toward the elbow keeps the flat wrist from reading as a tube.
      const twist = thumbSide * 0.32 * THREE.MathUtils.smoothstep(t, 0.15, 1);
      const bulge = shape.radialBulge * Math.exp(-(((t - 0.74) / 0.2) ** 2));
      const relax = THREE.MathUtils.smoothstep(t, 0, 0.16);
      rings.push(
        offsets.map((offset, j) => {
          const angle = angles[j]!,
            local = angle - twist;
          // Superellipse (n ≈ 2.4) gives flatter sides than an ellipse: bones, not a sausage.
          const cos = Math.cos(local),
            sin = Math.sin(local);
          const shapeR =
            1 / ((Math.abs(cos) / width) ** 2.4 + (Math.abs(sin) / depth) ** 2.4) ** (1 / 2.4);
          const lobe =
            bulge * Math.max(0, Math.cos(angle - thumbAngle - 0.55 * thumbSide)) ** 3 -
            0.0018 *
              Math.max(0, Math.cos(angle - thumbAngle - Math.PI)) ** 6 *
              THREE.MathUtils.smoothstep(t, 0.2, 0.6);
          const radius = (shapeR + lobe) / shape.scale;
          const smooth = across
            .clone()
            .multiplyScalar(Math.cos(angle) * radius)
            .addScaledVector(palmar, Math.sin(angle) * radius);
          return offset.clone().lerp(smooth, relax).applyQuaternion(q).add(c);
        }),
      );
    }
    const radial = rim[0]!.clone().sub(center),
      tangent = rim[1]!.clone().sub(rim[0]!);
    const outward = new THREE.Vector3().crossVectors(tangent, axis).dot(radial) > 0;
    for (let r = 0; r < ringCount; r++)
      for (let j = 0; j < rim.length; j++) {
        const k = (j + 1) % rim.length,
          a = rings[r]![j]!,
          b = rings[r]![k]!,
          c = rings[r + 1]![j]!,
          d = rings[r + 1]![k]!;
        const triangles = outward
          ? [
              [a, b, c],
              [c, b, d],
            ]
          : [
              [a, c, b],
              [c, d, b],
            ];
        const coords = outward
          ? [
              [uvU[j]!, r / ringCount, uvU[j + 1]!, r / ringCount, uvU[j]!, (r + 1) / ringCount],
              [
                uvU[j]!,
                (r + 1) / ringCount,
                uvU[j + 1]!,
                r / ringCount,
                uvU[j + 1]!,
                (r + 1) / ringCount,
              ],
            ]
          : [
              [uvU[j]!, r / ringCount, uvU[j]!, (r + 1) / ringCount, uvU[j + 1]!, r / ringCount],
              [
                uvU[j]!,
                (r + 1) / ringCount,
                uvU[j + 1]!,
                (r + 1) / ringCount,
                uvU[j + 1]!,
                r / ringCount,
              ],
            ];
        triangles.forEach((tri, i) => {
          for (const p of tri) skinPositions.push(...p.toArray());
          skinUVs.push(...coords[i]!);
        });
      }
    seams.push({
      side,
      loops: loops.length,
      openEdges: [...neighbors.values()].filter((n) => n.size !== 2).length,
      points: rim.length,
      gap: Math.max(...rim.map((p, i) => p.distanceTo(rings[0]![i]!))),
    });
    built[side] = {
      gloves: geometry(glovePositions, gloveUVs, gloveNormals),
      skin: geometry(skinPositions, skinUVs),
    };
  }
  function geometry(p: number[], uv: number[], n?: number[]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    if (n) g.setAttribute("normal", new THREE.Float32BufferAttribute(n, 3));
    else {
      const smooth = mergeVertices(g, 1e-5);
      g.dispose();
      smooth.computeVertexNormals();
      // UV splits must not turn the wrist or arm into visibly separate shaded strips.
      const p = smooth.getAttribute("position"),
        n = smooth.getAttribute("normal"),
        sums = new Map<string, THREE.Vector3>();
      const key = (i: number) =>
        [p.getX(i), p.getY(i), p.getZ(i)].map((v) => Math.round(v * 1e5)).join(",");
      for (let i = 0; i < p.count; i++) {
        const k = key(i);
        if (!sums.has(k)) sums.set(k, new THREE.Vector3());
        sums.get(k)!.add(new THREE.Vector3().fromBufferAttribute(n, i));
      }
      for (let i = 0; i < p.count; i++) {
        const normal = sums.get(key(i))!.clone().normalize();
        n.setXYZ(i, normal.x, normal.y, normal.z);
      }
      smooth.computeBoundingSphere();
      return smooth;
    }
    g.computeBoundingSphere();
    return g;
  }
  return { L: built.L, R: built.R, seams };
}
