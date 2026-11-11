/**
 * Bake Mixamo's "Climbing Ladder" (art/mixamo, Adobe Mixamo licence: free for use in games, not
 * for redistribution as animation files) into per-bone rotations for the characters
 * (src/lib/fps/ladder-clip.ts). Owner, 2026-11-11: a climbing animation for the battle royale's
 * ladders.
 *
 * As bake-swim.mjs (root space, rotations relative to the clip's rest pose, rest directions), one
 * climbing cycle that loops (both hands and both feet one step up). The hips are an offset round
 * their mean with the climb taken out (the server moves the climber). Also written, in hip
 * heights: the climb per cycle, and where the hands grip and the feet stand relative to the mean
 * hips (the ladder's plane and the lowest foot), so the game puts the rig on its ladder.
 *
 *   node scripts/fps/locomotion/bake-ladder.mjs
 */
import fs from "node:fs";
import path from "node:path";

globalThis.self = globalThis;
const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SRC = path.join(ROOT, "art/mixamo/Climbing_Ladder.fbx");
const OUT = path.join(ROOT, "public/fps/locomotion/ladder-v1.json");
/** Bones driven, parents first, each with the child its direction points to. */
const BONES = [
  ["Hips", "Spine"],
  ["Spine", "Spine1"],
  ["Spine1", "Spine2"],
  ["Spine2", "Neck"],
  ["Neck", "Head"],
  ["Head", "HeadTop_End"],
  ...["Left", "Right"].flatMap((s) => [
    [`${s}Shoulder`, `${s}Arm`],
    [`${s}Arm`, `${s}ForeArm`],
    [`${s}ForeArm`, `${s}Hand`],
    [`${s}Hand`, `${s}HandMiddle1`],
    [`${s}UpLeg`, `${s}Leg`],
    [`${s}Leg`, `${s}Foot`],
    [`${s}Foot`, `${s}ToeBase`],
  ]),
];
const FPS = 30;
const r4 = (v) => Math.round(v * 1e4) / 1e4;

const buf = fs.readFileSync(SRC);
const root = new FBXLoader().parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
  "",
);
const get = (n) => {
  const o = root.getObjectByName("mixamorig" + n);
  if (!o) throw Error("no mixamorig" + n);
  return o;
};
const half = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
const halfInv = half.clone().invert();
/** Clip frame to root space: a half turn about y. */
const toRootQ = (q) => half.clone().multiply(q).multiply(halfInv);
const toRootV = (v) => v.clone().applyQuaternion(half);

root.updateMatrixWorld(true);
const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const wp = (o) => o.getWorldPosition(new THREE.Vector3());
const unit = wp(get("Hips")).y;
const rest = new Map(BONES.map(([b]) => [b, wq(get(b))]));
const restDir = BONES.map(([b, c]) =>
  toRootV(
    wp(get(c))
      .sub(wp(get(b)))
      .normalize(),
  )
    .toArray()
    .map(r4),
);
const clip = root.animations[0];
const mixer = new THREE.AnimationMixer(root);
mixer.clipAction(clip).play();
const n = Math.round(clip.duration * FPS);
const frames = [];
for (let i = 0; i < n; i++) {
  mixer.setTime((i / n) * clip.duration);
  root.updateMatrixWorld(true);
  const rot = BONES.flatMap(([b]) =>
    toRootQ(wq(get(b)).multiply(rest.get(b).clone().invert()))
      .toArray()
      .map(r4),
  );
  if (frames.length) {
    const prev = frames[frames.length - 1];
    for (let b = 0; b < BONES.length; b++) {
      const k = b * 4;
      const dot =
        rot[k] * prev.rot[k] +
        rot[k + 1] * prev.rot[k + 1] +
        rot[k + 2] * prev.rot[k + 2] +
        rot[k + 3] * prev.rot[k + 3];
      if (dot < 0) for (let j = 0; j < 4; j++) rot[k + j] = -rot[k + j];
    }
  }
  frames.push({ rot, hips: toRootV(wp(get("Hips"))).divideScalar(unit) });
}
// The loop's seam: the first frame on the last frame's side too, where it can be (a bone that
// turns right round over the cycle keeps one flip; the runtime's slerp takes the short way).
// Travel: the hips' straight-line drift over the cycle (the clip climbs), taken out
// together with the mean, so the hips are a small offset round zero.
const first = frames[0].hips,
  last = frames[n - 1].hips;
const drift = last
  .clone()
  .sub(first)
  .multiplyScalar(n / (n - 1));
const flat = frames.map((f, i) => f.hips.clone().sub(drift.clone().multiplyScalar(i / n)));
const mean = flat.reduce((s, v) => s.add(v), new THREE.Vector3()).divideScalar(n);
// Where the hands grip (their mean, nearest the ladder) and the lowest foot, in hip heights from
// the mean hips (root space, the clip's own facing: the climber faces the ladder at +z).
const grips = [];
const feet = [];
for (let i = 0; i < n; i++) {
  mixer.setTime((i / n) * clip.duration);
  root.updateMatrixWorld(true);
  for (const h of ["LeftHand", "RightHand"]) grips.push(toRootV(wp(get(h))).divideScalar(unit));
  for (const f of ["LeftToeBase", "RightToeBase"])
    feet.push(
      toRootV(wp(get(f)))
        .divideScalar(unit)
        .sub(drift.clone().multiplyScalar(i / n)),
    );
}
const gripZ = grips.reduce((s, v) => s + v.z, 0) / grips.length - mean.z;
const footY = Math.min(...feet.map((v) => v.y)) - mean.y;
fs.writeFileSync(
  OUT,
  JSON.stringify({
    version: 1,
    source: "Adobe Mixamo: Climbing Ladder, baked by scripts/fps/locomotion/bake-ladder.mjs",
    fps: FPS,
    loop: true,
    /** Climb per cycle (hip heights), the hands' grip ahead of the hips, the lowest foot below. */
    climb: r4(drift.y),
    gripZ: r4(gripZ),
    footY: r4(footY),
    bones: BONES.map(([b]) => b),
    restDir,
    rot: frames.map((f) => f.rot),
    hips: flat.map((v) => v.sub(mean).toArray().map(r4)),
  }),
);
console.log(
  `ladder: ${n} frames (${clip.duration.toFixed(3)} s), climb ${r4(drift.y)} hip heights a cycle ` +
    `(drift ${drift.toArray().map(r4).join(",")}), grip z ${r4(gripZ)}, lowest foot ${r4(footY)}, unit ${unit.toFixed(1)} cm, ${fs.statSync(OUT).size} bytes`,
);
