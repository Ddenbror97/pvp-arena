/**
 * Bake Mixamo's "Swimming" (art/mixamo, Adobe Mixamo licence: free for use in games, not for
 * redistribution as animation files) into per-bone rotations for the characters
 * (src/lib/fps/swim-clip.ts). Owner, 2026-11-10: a swimming animation instead of the character
 * running in the water.
 *
 * As bake-death.mjs (root space, rotations relative to the clip's rest pose, rest directions),
 * for one stroke cycle that loops: the last frame runs into the first. The hips are an offset
 * round their mean: the clip's forward travel and its mean height are taken out (the server
 * moves the swimmer and the game sets how deep the body lies).
 *
 *   node scripts/fps/locomotion/bake-swim.mjs
 */
import fs from "node:fs";
import path from "node:path";

globalThis.self = globalThis;
const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SRC = path.join(ROOT, "art/mixamo/Swimming.fbx");
const OUT = path.join(ROOT, "public/fps/locomotion/swim-v1.json");
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
// Travel: the hips' straight-line drift over the cycle (the clip swims forward), taken out
// together with the mean, so the hips are a small offset round zero.
const first = frames[0].hips,
  last = frames[n - 1].hips;
const drift = last
  .clone()
  .sub(first)
  .multiplyScalar(n / (n - 1));
const flat = frames.map((f, i) => f.hips.clone().sub(drift.clone().multiplyScalar(i / n)));
const mean = flat.reduce((s, v) => s.add(v), new THREE.Vector3()).divideScalar(n);
fs.writeFileSync(
  OUT,
  JSON.stringify({
    version: 1,
    source: "Adobe Mixamo: Swimming, baked by scripts/fps/locomotion/bake-swim.mjs",
    fps: FPS,
    loop: true,
    /** The clip's own speed (hip heights per second), for matching the stroke to the swimmer's. */
    speed: r4(drift.length() / clip.duration),
    bones: BONES.map(([b]) => b),
    restDir,
    rot: frames.map((f) => f.rot),
    hips: flat.map((v) => v.sub(mean).toArray().map(r4)),
  }),
);
console.log(
  `swim: ${n} frames (${clip.duration.toFixed(2)} s), travel ${drift.toArray().map(r4).join(",")} hip heights a cycle, ` +
    `mean hips ${mean.toArray().map(r4).join(",")}, ${fs.statSync(OUT).size} bytes`,
);
