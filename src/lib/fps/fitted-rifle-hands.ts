import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** Support hand sits mid-handguard rather than at the front sight (rifle-local units). */
export const SUPPORT_GRIP_SHIFT = 0.09;
/** Radians the support hand leans toward the lower-left, in line with the forearm. */
export const SUPPORT_HAND_LEAN = 0.5;
/**
 * Handguard grip only: the palm cradles the handguard (rifle-local units), so the fingers can
 * reach round it and wrap up the far side instead of lying flat underneath it.
 */
export const HANDGUARD_PALM_SHIFT = new THREE.Vector3(0.036, 0.014, 0);
/** Handguard grip finger targets (handguard-local): middle joint on the far side, tip up it. */
const HANDGUARD_WRAP = {
  joint: new THREE.Vector2(0.054, -0.026),
  tip: new THREE.Vector2(0.056, 0.024),
};

/**
 * Where the support hand grips, expressed as a map from handguard-local coordinates (the frame
 * the finger targets were authored in) into rifle-root coordinates. The handguard grip is the
 * identity; other grips (the magazine) reuse the same finger wrap re-oriented onto their part.
 */
export type GripFrame = {
  point: (v: THREE.Vector3) => THREE.Vector3;
  direction: (v: THREE.Vector3) => THREE.Vector3;
  /** Also pose the right hand on the pistol grip (only needed once). */
  rightHand: boolean;
};
export const HANDGUARD_GRIP: GripFrame = {
  point: (v) => v.clone(),
  direction: (v) => v.clone(),
  rightHand: true,
};
/** Handguard axis point at the centre of the support grip, in handguard-local coordinates. */
const HANDGUARD_AXIS = new THREE.Vector3(0, -0.011, -0.851);
/**
 * Re-orient the handguard wrap onto a magazine: the wrap axis follows the magazine's front edge
 * (pointing down it), the wrist sits behind-left of the magazine and the finger circle is
 * squeezed to the magazine's thickness so the palm and fingers meet its faces.
 */
export function magazineGrip(
  axisPoint: THREE.Vector3,
  edgeDown: THREE.Vector3,
  toWrist: THREE.Vector3,
  squeeze = 0.72,
): GripFrame {
  const b1 = edgeDown.clone().normalize();
  const b2 = toWrist.clone().addScaledVector(b1, -toWrist.dot(b1)).normalize();
  const b3 = new THREE.Vector3().crossVectors(b1, b2);
  const a1 = new THREE.Vector3(0, 0, 1);
  const a2 = new THREE.Vector3(-0.173, -0.19, 0).normalize();
  const a3 = new THREE.Vector3().crossVectors(a1, a2);
  const rotation = new THREE.Matrix4()
    .makeBasis(b1, b2, b3)
    .multiply(new THREE.Matrix4().makeBasis(a1, a2, a3).transpose());
  const squeezeMatrix = new THREE.Matrix4().makeScale(squeeze, squeeze, 1);
  return {
    point: (v) =>
      v
        .clone()
        .sub(HANDGUARD_AXIS)
        .applyMatrix4(squeezeMatrix)
        .applyMatrix4(rotation)
        .add(axisPoint),
    direction: (v) => v.clone().transformDirection(rotation),
    rightHand: false,
  };
}

/** Fit the authored finger bones to a grip (by default the horizontal AK handguard). */
export function poseRifleHands(root: THREE.Object3D, grip: GripFrame = HANDGUARD_GRIP) {
  const hand = root.getObjectByName("Hand_L");
  if (!hand) throw new Error("AK support hand is missing");
  // The handguard grip (the only one that also poses the right hand) cradles the handguard.
  const cradle = grip.rightHand;
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
  const desired = grip
    .direction(new THREE.Vector3(lean * Math.sqrt(0.91), upright * Math.sqrt(0.91), -0.3))
    .transformDirection(root.matrixWorld);
  const desiredAcross = grip
    .direction(new THREE.Vector3(lean * 0.3, upright * 0.3, Math.sqrt(0.91)))
    .transformDirection(root.matrixWorld);
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
        grip.point(
          new THREE.Vector3(
            -0.06 - 0.235 * Math.sin(SUPPORT_HAND_LEAN) + (cradle ? HANDGUARD_PALM_SHIFT.x : 0),
            -0.23 +
              0.235 * (1 - Math.cos(SUPPORT_HAND_LEAN)) +
              (cradle ? HANDGUARD_PALM_SHIFT.y : 0),
            -0.88 + SUPPORT_GRIP_SHIFT,
          ),
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
    const joint = cradle ? HANDGUARD_WRAP.joint : new THREE.Vector2(0.04, -0.04),
      tipAim = cradle ? HANDGUARD_WRAP.tip : new THREE.Vector2(0.045, 0.005);
    const goal = root.localToWorld(grip.point(new THREE.Vector3(joint.x, joint.y, z))),
      forward = goal.clone().sub(origin).normalize();
    const distance = THREE.MathUtils.clamp(
      origin.distanceTo(goal),
      Math.abs(l1 - l2) + 1e-5,
      l1 + l2 - 1e-5,
    );
    const pole = root.localToWorld(grip.point(new THREE.Vector3(-0.025, -0.22, z))).sub(origin);
    pole.addScaledVector(forward, -pole.dot(forward)).normalize();
    const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    const pip = origin.clone().addScaledVector(forward, along).addScaledVector(pole, bend);
    aim(a, b, pip);
    aim(b, c, origin.clone().addScaledVector(forward, distance));
    aim(c, tip, root.localToWorld(grip.point(new THREE.Vector3(tipAim.x, tipAim.y, z))));
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
    grip.point(new THREE.Vector3(-0.052, 0.052, -0.971 + SUPPORT_GRIP_SHIFT)),
  );
  // Right middle/ring/little fingers curl around the pistol grip. Index retains trigger placement.
  if (grip.rightHand)
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

/**
 * Anatomical forearm cross-section along its length (t = 0 wrist → 1 elbow), in metres.
 * `width` is the half-width across the radius/ulna (thumb↔little-finger) axis, `depth` the
 * half-depth front↔back. Adult-male reference: ~17.5 cm wrist girth, ~27 cm at the muscle belly
 * in the upper third, slightly less at the elbow. The distal half is flat and tendinous.
 */
export const FOREARM_PROFILE: readonly { t: number; width: number; depth: number }[] = [
  { t: 0, width: 0.0318, depth: 0.0207 },
  { t: 0.18, width: 0.0329, depth: 0.0217 },
  { t: 0.42, width: 0.0392, depth: 0.0276 },
  { t: 0.68, width: 0.0472, depth: 0.035 },
  { t: 0.86, width: 0.0493, depth: 0.0376 },
  { t: 1, width: 0.0461, depth: 0.0392 },
];
export type ForearmShape = {
  /** Elbow position relative to the wrist joint, in viewmodel-root units. */
  elbow: Record<"L" | "R", THREE.Vector3>;
  profile: typeof FOREARM_PROFILE;
  /** Brachioradialis/extensor mass on the thumb side of the upper forearm (metres). */
  radialBulge: number;
  /** Viewer position in viewmodel-root space, used to face the vein map to the camera. */
  viewer: THREE.Vector3;
  /** Viewmodel root scale, so measurements stay in real metres. */
  scale: number;
};
/**
 * The glove cuff reaches this far past the wrist joint toward the elbow (metres). Mirrors
 * CUFF_LENGTH in art/blender/arms/glove_sdf.py; the forearm starts inside it, so the glove
 * edge overlaps bare skin like a real cuff instead of being welded to it.
 */
export const GLOVE_CUFF_LENGTH = 0.024;
const FOREARM_SIDES = 160,
  FOREARM_RINGS = 44;
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
/** Slight supination toward the elbow keeps the flat wrist from reading as a tube (radians). */
export const forearmTwist = (t: number) => -0.32 * THREE.MathUtils.smoothstep(t, 0.15, 1);
/** Angle of the radial (brachioradialis) mass, from the thumb side toward the back of the arm. */
const RADIAL_MASS = 0.35;
/**
 * Forearm surface radius (metres) at length fraction t and angle θ, measured in the arm's
 * anatomical frame: θ = 0 points to the thumb side, θ = π/2 to the back of the arm (dorsal).
 * art/blender/arms/forearm.py implements the same function to author the sleeve and watch.
 */
export function forearmRadius(t: number, theta: number, shape: ForearmShape = SHORT_FOREARMS) {
  const { width, depth } = sampleForearmProfile(t, shape.profile);
  const local = theta - forearmTwist(t),
    cos = Math.cos(local),
    sin = Math.sin(local);
  // Superellipse (n ≈ 2.4) gives flatter sides than an ellipse: bones, not a sausage.
  const r = 1 / ((Math.abs(cos) / width) ** 2.4 + (Math.abs(sin) / depth) ** 2.4) ** (1 / 2.4);
  const bulge =
    shape.radialBulge *
    Math.exp(-(((t - 0.74) / 0.2) ** 2)) *
    Math.max(0, Math.cos(theta - RADIAL_MASS)) ** 3;
  const groove =
    0.0018 * Math.max(0, Math.cos(theta - Math.PI)) ** 6 * THREE.MathUtils.smoothstep(t, 0.2, 0.6);
  return r + bulge - groove;
}

/**
 * A posed forearm: wrist → elbow centre line with rotation-minimising anatomical frames.
 * Canonical arm space (metres) is x → thumb side, y → back of the arm, z → toward the hand
 * (so the elbow is at z = -length); accessories authored in it wrap onto the arm exactly.
 */
export type ForearmPath = {
  side: "L" | "R";
  /** Wrist joint → elbow, metres. */
  length: number;
  /** +1 when the posed frame has the canonical handedness, -1 when it is mirrored. */
  handedness: number;
  /** Canonical metres → viewmodel-root position. */
  point: (x: number, y: number, z: number, out: THREE.Vector3) => THREE.Vector3;
  /** Canonical direction at canonical length `along` (metres from the wrist) → root direction. */
  direction: (along: number, v: THREE.Vector3, out: THREE.Vector3) => THREE.Vector3;
};

function forearmPath(
  side: "L" | "R",
  wrist: THREE.Vector3,
  axis: THREE.Vector3,
  thumb: THREE.Vector3,
  dorsal: THREE.Vector3,
  elbow: THREE.Vector3,
  scale: number,
): ForearmPath {
  // Straight inside the glove cuff (the cuff is rigid with the hand), then a smooth bend to
  // the elbow.
  const cuffEnd = wrist.clone().addScaledVector(axis, GLOVE_CUFF_LENGTH / scale);
  const distance = cuffEnd.distanceTo(elbow),
    direction = elbow.clone().sub(cuffEnd).normalize();
  const curve = new THREE.CurvePath<THREE.Vector3>();
  curve.add(new THREE.LineCurve3(wrist.clone(), cuffEnd.clone()));
  curve.add(
    new THREE.CubicBezierCurve3(
      cuffEnd.clone(),
      cuffEnd.clone().addScaledVector(axis, distance * 0.24),
      elbow.clone().addScaledVector(direction, -distance * 0.32),
      elbow.clone(),
    ),
  );
  const samples = 240,
    centres: THREE.Vector3[] = [],
    tangents: THREE.Vector3[] = [],
    thumbs: THREE.Vector3[] = [],
    dorsals: THREE.Vector3[] = [],
    lengths: number[] = [0];
  for (let i = 0; i <= samples; i++) {
    centres.push(curve.getPointAt(i / samples));
    tangents.push(curve.getTangentAt(i / samples).normalize());
    if (i) lengths.push(lengths[i - 1]! + centres[i]!.distanceTo(centres[i - 1]!) * scale);
  }
  // Parallel transport: the cross-section frame turns only as much as the centre line bends.
  const t0 = tangents[0]!;
  const x0 = thumb.clone().addScaledVector(t0, -thumb.dot(t0)).normalize();
  const y0 = dorsal
    .clone()
    .addScaledVector(t0, -dorsal.dot(t0))
    .addScaledVector(x0, -dorsal.dot(x0))
    .normalize();
  thumbs.push(x0);
  dorsals.push(y0);
  const turn = new THREE.Quaternion();
  for (let i = 1; i <= samples; i++) {
    turn.setFromUnitVectors(tangents[i - 1]!, tangents[i]!);
    thumbs.push(thumbs[i - 1]!.clone().applyQuaternion(turn));
    dorsals.push(dorsals[i - 1]!.clone().applyQuaternion(turn));
  }
  const length = lengths[samples]!;
  // Canonical z points from the elbow toward the hand: thumb × back = toward the hand.
  const handedness = Math.sign(new THREE.Vector3().crossVectors(x0, y0).dot(t0)) < 0 ? 1 : -1;
  const frame = {
    c: new THREE.Vector3(),
    x: new THREE.Vector3(),
    y: new THREE.Vector3(),
    t: new THREE.Vector3(),
  };
  const locate = (along: number) => {
    const s = THREE.MathUtils.clamp(along, 0, length);
    let lo = 0,
      hi = samples;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid]! <= s) lo = mid;
      else hi = mid;
    }
    const k = (s - lengths[lo]!) / Math.max(1e-9, lengths[hi]! - lengths[lo]!);
    frame.c.lerpVectors(centres[lo]!, centres[hi]!, k);
    frame.x.lerpVectors(thumbs[lo]!, thumbs[hi]!, k).normalize();
    frame.y.lerpVectors(dorsals[lo]!, dorsals[hi]!, k).normalize();
    frame.t.lerpVectors(tangents[lo]!, tangents[hi]!, k).normalize();
    // Past either end the arm continues straight (into the cuff, or up past the elbow).
    frame.c.addScaledVector(frame.t, (along - s) / scale);
    return frame;
  };
  return {
    side,
    length,
    handedness,
    point(x, y, z, out) {
      const f = locate(-z);
      return out
        .copy(f.c)
        .addScaledVector(f.x, x / scale)
        .addScaledVector(f.y, y / scale);
    },
    direction(along, v, out) {
      const f = locate(along);
      return out
        .set(0, 0, 0)
        .addScaledVector(f.x, v.x)
        .addScaledVector(f.y, v.y)
        .addScaledVector(f.t, -v.z)
        .normalize();
    },
  };
}

/** Build the bare forearm surface on a posed path: wrist (inside the cuff) to elbow. */
function forearmSkin(path: ForearmPath, shape: ForearmShape, viewer: THREE.Vector3) {
  // u = 0.5 faces the camera, so veins/tendons sit on the visible side of each arm.
  const wrist = path.point(0, 0, 0, new THREE.Vector3());
  const toViewer = viewer.clone().sub(wrist);
  const thumb = path.direction(0, new THREE.Vector3(1, 0, 0), new THREE.Vector3()),
    back = path.direction(0, new THREE.Vector3(0, 1, 0), new THREE.Vector3());
  const viewAngle = Math.atan2(toViewer.dot(back), toViewer.dot(thumb));
  const columns = FOREARM_SIDES + 1,
    positions = new Float32Array((FOREARM_RINGS + 1) * columns * 3),
    uvs = new Float32Array((FOREARM_RINGS + 1) * columns * 2),
    point = new THREE.Vector3();
  for (let r = 0; r <= FOREARM_RINGS; r++) {
    const t = r / FOREARM_RINGS,
      along = t * path.length;
    for (let j = 0; j < columns; j++) {
      const theta = viewAngle - Math.PI + (2 * Math.PI * j) / FOREARM_SIDES;
      const radius = forearmRadius(t, theta, shape);
      path.point(Math.cos(theta) * radius, Math.sin(theta) * radius, -along, point);
      point.toArray(positions, (r * columns + j) * 3);
      uvs[(r * columns + j) * 2] = j / FOREARM_SIDES;
      uvs[(r * columns + j) * 2 + 1] = t;
    }
  }
  const index: number[] = [];
  for (let r = 0; r < FOREARM_RINGS; r++)
    for (let j = 0; j < FOREARM_SIDES; j++) {
      const a = r * columns + j,
        b = a + 1,
        c = a + columns,
        d = c + 1;
      // Angle runs thumb → back; face outward whichever way the posed frame is mirrored.
      if (path.handedness > 0) index.push(a, c, b, b, c, d);
      else index.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  // The UV seam column is duplicated: give both copies the same normal.
  const n = geometry.getAttribute("normal") as THREE.BufferAttribute;
  for (let r = 0; r <= FOREARM_RINGS; r++) {
    const a = r * columns,
      b = a + FOREARM_SIDES;
    const avg = new THREE.Vector3()
      .fromBufferAttribute(n, a)
      .add(new THREE.Vector3().fromBufferAttribute(n, b))
      .normalize();
    n.setXYZ(a, avg.x, avg.y, avg.z);
    n.setXYZ(b, avg.x, avg.y, avg.z);
  }
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Wrap a canonical-arm-space accessory (sleeve, watch) onto a posed forearm. Positions, normals
 * and tangents follow the arm's centre line and frames; mirrored arms flip the winding.
 */
/** Wrist→elbow length (m) of the canonical arm the accessories are authored on (forearm.py). */
export const CANONICAL_FOREARM_LENGTH = 0.335;
export function wrapOntoForearm(
  source: THREE.BufferGeometry,
  path: ForearmPath,
  shape: ForearmShape = SHORT_FOREARMS,
) {
  const geometry = source.clone();
  const p = geometry.getAttribute("position") as THREE.BufferAttribute,
    n = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined,
    t = geometry.getAttribute("tangent") as THREE.BufferAttribute | undefined;
  const v = new THREE.Vector3(),
    out = new THREE.Vector3();
  const positions = new Float32Array(p.count * 3),
    normals = n ? new Float32Array(n.count * 3) : undefined,
    tangents = t ? new Float32Array(t.count * 4) : undefined;
  for (let i = 0; i < p.count; i++) {
    const along = -p.getZ(i);
    // Keep each point's height above the skin: the posed arm is longer or shorter than the
    // canonical one, so its cross-section at the same distance from the wrist differs slightly.
    const x = p.getX(i),
      y = p.getY(i),
      theta = Math.atan2(y, x),
      rho = Math.hypot(x, y);
    const lift =
      rho -
      forearmRadius(along / CANONICAL_FOREARM_LENGTH, theta, shape) +
      forearmRadius(along / path.length, theta, shape);
    path
      .point(Math.cos(theta) * lift, Math.sin(theta) * lift, p.getZ(i), out)
      .toArray(positions, i * 3);
    if (n && normals)
      path.direction(along, v.fromBufferAttribute(n, i), out).toArray(normals, i * 3);
    if (t && tangents) {
      path.direction(along, v.set(t.getX(i), t.getY(i), t.getZ(i)), out).toArray(tangents, i * 4);
      tangents[i * 4 + 3] = t.getW(i) * path.handedness;
    }
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  if (normals) geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  if (tangents) geometry.setAttribute("tangent", new THREE.BufferAttribute(tangents, 4));
  if (path.handedness < 0 && geometry.index) {
    const index = geometry.index.array;
    for (let i = 0; i < index.length; i += 3) {
      const swap = index[i + 1]!;
      index[i + 1] = index[i + 2]!;
      index[i + 2] = swap;
    }
  }
  // The clone carried the canonical bounds; recompute them for the wrapped surface.
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Bake the posed gloves (CPU skinning of the authored glove mesh) and build each forearm from
 * the wrist joint, inside the glove cuff, to the elbow. Returns the forearm paths so sleeves and
 * the watch can be wrapped onto exactly the same surface.
 */
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
    tangents = source.getAttribute("tangent"),
    uvs = source.getAttribute("uv"),
    weights = source.getAttribute("skinWeight"),
    joints = source.getAttribute("skinIndex");
  const toRoot = root.matrixWorld.clone().invert().multiply(arm.matrixWorld);
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(toRoot);
  const skinMatrices = arm.skeleton.bones.map((bone, i) => {
    const matrix = bone.matrixWorld.clone();
    if (/^(?:Arm_L|UpArm_L|Forearm_L|BoneTwist.*L)/.test(bone.name))
      matrix.premultiply(supportDelta);
    return matrix.multiply(arm.skeleton.boneInverses[i]!);
  });
  // Attributes may be quantised (meshopt): read through the accessor, not the raw array.
  const plainUVs = new Float32Array(uvs.count * 2);
  for (let i = 0; i < uvs.count; i++) {
    plainUVs[i * 2] = uvs.getX(i);
    plainUVs[i * 2 + 1] = uvs.getY(i);
  }
  const count = positions.count,
    posed = new Float32Array(count * 3),
    posedNormals = new Float32Array(count * 3),
    posedTangents = tangents ? new Float32Array(count * 4) : undefined,
    sides = new Float32Array(count);
  const base = new THREE.Vector3(),
    p = new THREE.Vector3(),
    n = new THREE.Vector3(),
    tn = new THREE.Vector3(),
    bindNormal = new THREE.Vector3(),
    bindTangent = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    base.fromBufferAttribute(positions, i).applyMatrix4(arm.bindMatrix);
    bindNormal.fromBufferAttribute(normals, i).transformDirection(arm.bindMatrix);
    if (tangents)
      bindTangent
        .set(tangents.getX(i), tangents.getY(i), tangents.getZ(i))
        .transformDirection(arm.bindMatrix);
    p.set(0, 0, 0);
    n.set(0, 0, 0);
    tn.set(0, 0, 0);
    let side = 0;
    for (let j = 0; j < 4; j++) {
      const weight = weights.getComponent(i, j);
      if (!weight) continue;
      const index = joints.getComponent(i, j),
        matrix = skinMatrices[index]!;
      p.addScaledVector(base.clone().applyMatrix4(matrix), weight);
      n.addScaledVector(bindNormal.clone().transformDirection(matrix), weight);
      if (tangents) tn.addScaledVector(bindTangent.clone().transformDirection(matrix), weight);
      side += (/L(?:$|\d)|\.L/.test(arm.skeleton.bones[index]!.name) ? 1 : -1) * weight;
    }
    p.applyMatrix4(arm.bindMatrixInverse)
      .applyMatrix4(toRoot)
      .toArray(posed, i * 3);
    n.transformDirection(arm.bindMatrixInverse)
      .applyMatrix3(normalMatrix)
      .normalize()
      .toArray(posedNormals, i * 3);
    if (tangents && posedTangents) {
      tn.transformDirection(arm.bindMatrixInverse)
        .applyMatrix3(normalMatrix)
        .normalize()
        .toArray(posedTangents, i * 4);
      posedTangents[i * 4 + 3] = tangents.getW(i);
    }
    sides[i] = side;
  }
  const built = {} as Record<
    "L" | "R",
    { gloves: THREE.BufferGeometry; skin: THREE.BufferGeometry; path: ForearmPath }
  >;
  const cuffs: { side: string; clearance: number; overlap: number }[] = [];
  const triangles = source.index?.count ?? count;
  for (const [side, sign] of [
    ["L", 1],
    ["R", -1],
  ] as const) {
    // Gloves: this hand's triangles, compacted to the vertices they use.
    const remap = new Map<number, number>(),
      index: number[] = [];
    for (let i = 0; i < triangles; i += 3) {
      const ids = [0, 1, 2].map((j) => source.index?.getX(i + j) ?? i + j);
      if (ids.reduce((s, id) => s + sides[id]!, 0) * sign < 0) continue;
      for (const id of ids) {
        if (!remap.has(id)) remap.set(id, remap.size);
        index.push(remap.get(id)!);
      }
    }
    const take = (from: ArrayLike<number>, size: number) => {
      const out = new Float32Array(remap.size * size);
      for (const [from_, to] of remap)
        for (let k = 0; k < size; k++) out[to * size + k] = from[from_ * size + k]!;
      return out;
    };
    const gloves = new THREE.BufferGeometry();
    gloves.setAttribute("position", new THREE.BufferAttribute(take(posed, 3), 3));
    gloves.setAttribute("normal", new THREE.BufferAttribute(take(posedNormals, 3), 3));
    gloves.setAttribute("uv", new THREE.BufferAttribute(take(plainUVs, 2), 2));
    if (posedTangents)
      gloves.setAttribute("tangent", new THREE.BufferAttribute(take(posedTangents, 4), 4));
    gloves.setIndex(index);
    gloves.computeBoundingSphere();

    // Forearm frame at the wrist, from the hand bone: it runs along the hand's -Y, the thumb
    // side is across the knuckles (little → index) and the back of the hand is the dorsal side.
    const hand = root.getObjectByName(`Hand_${side}`)!;
    const wrist = root.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
    const toRootDirection = (v: THREE.Vector3) =>
      v.transformDirection(hand.matrixWorld).transformDirection(root.matrixWorld.clone().invert());
    const axis = toRootDirection(new THREE.Vector3(0, -1, 0));
    const knuckle = (n: number) =>
      hand.worldToLocal(
        root
          .getObjectByName(`Bone_${side}${String(n).padStart(3, "0")}`)!
          .getWorldPosition(new THREE.Vector3()),
      );
    const across = knuckle(5).sub(knuckle(17)).setY(0).normalize();
    // Palm side: -(fingers × thumb side) on both hands, as the posed fingertips confirm (the
    // bind pose's left fingers are bent backwards, so it cannot be used to tell).
    const palmar = new THREE.Vector3(0, 1, 0).cross(across).negate();
    const thumb = toRootDirection(across.clone()),
      dorsal = toRootDirection(palmar.clone().negate());
    const elbow = wrist.clone().add(shape.elbow[side]);
    const path = forearmPath(side, wrist, axis, thumb, dorsal, elbow, shape.scale);
    const skin = forearmSkin(path, shape, shape.viewer);
    built[side] = { gloves, skin, path };

    // Cuff check: halfway along the cuff the glove must enclose the skin with a thin wall.
    const along = GLOVE_CUFF_LENGTH * 0.6,
      centre = path.point(0, 0, -along, new THREE.Vector3());
    const x = path.direction(along, new THREE.Vector3(1, 0, 0), new THREE.Vector3()),
      y = path.direction(along, new THREE.Vector3(0, 1, 0), new THREE.Vector3()),
      tangent = path.direction(along, new THREE.Vector3(0, 0, -1), new THREE.Vector3());
    const bins = new Array<number>(24).fill(Infinity);
    const gp = gloves.getAttribute("position");
    for (let i = 0; i < gp.count; i++) {
      const d = new THREE.Vector3().fromBufferAttribute(gp, i).sub(centre);
      if (Math.abs(d.dot(tangent)) * shape.scale > 0.008) continue;
      const theta = Math.atan2(d.dot(y), d.dot(x)),
        bin = Math.floor(((theta + Math.PI) / (2 * Math.PI)) * 24) % 24;
      const r =
        Math.hypot(d.dot(x), d.dot(y)) * shape.scale -
        forearmRadius(along / path.length, theta, shape);
      bins[bin] = Math.min(bins[bin]!, r);
    }
    cuffs.push({ side, clearance: Math.min(...bins), overlap: Math.max(...bins) });
  }
  return { L: built.L, R: built.R, cuffs };
}
