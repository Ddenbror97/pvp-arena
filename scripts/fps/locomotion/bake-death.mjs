/**
 * Bake Mixamo's "Death From The Front" (art/mixamo, Adobe Mixamo licence) into per-bone
 * rotations for the characters (src/lib/fps/death-clip.ts). Owner, 2026-11-10: replace the rigid
 * tip-over in 1v1, 5v5 and the battle royale with this animation.
 *
 * Everything is in the characters' root space (facing -z, right +x; the clip faces +z, so its
 * values are turned half a turn about y). Per frame:
 *  - for each bone, its world rotation relative to the clip's rest pose (q(t) · q_rest⁻¹);
 *  - the hips' position, divided by the rest hip height.
 * Per bone, its rest direction (to its child), so a rig whose rest pose differs (A- vs T-pose)
 * is first turned onto the clip's rest pose (death-clip.ts).
 *
 *   node scripts/fps/locomotion/bake-death.mjs
 */
import fs from "node:fs";
import path from "node:path";

globalThis.self = globalThis;
const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SRC = path.join(ROOT, "art/mixamo/Death_From_The_Front.fbx");
const OUT = path.join(ROOT, "public/fps/locomotion/death-front-v1.json");
/** Bones driven, parents first, each with the child its direction points to. */
export const DEATH_BONES = [
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
const rest = new Map(DEATH_BONES.map(([b]) => [b, wq(get(b))]));
const restDir = DEATH_BONES.map(([b, c]) =>
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
const action = mixer.clipAction(clip);
action.setLoop(THREE.LoopOnce, 1);
action.clampWhenFinished = true;
action.play();
// Up to the last frame that still moves (the rest of the clip lies still).
const frames = [];
let lastMoving = 0;
const n = Math.floor(clip.duration * FPS);
for (let i = 0; i <= n; i++) {
  mixer.setTime(i / FPS);
  root.updateMatrixWorld(true);
  const rot = DEATH_BONES.flatMap(([b]) =>
    toRootQ(wq(get(b)).multiply(rest.get(b).clone().invert()))
      .toArray()
      .map(r4),
  );
  const hips = toRootV(wp(get("Hips")))
    .divideScalar(unit)
    .toArray()
    .map(r4);
  if (frames.length) {
    const prev = frames[frames.length - 1];
    // q and -q are the same rotation: keep each bone on the previous frame's side, so the
    // runtime's interpolation does not swing the long way round.
    for (let b = 0; b < DEATH_BONES.length; b++) {
      const k = b * 4;
      const dot =
        rot[k] * prev.rot[k] +
        rot[k + 1] * prev.rot[k + 1] +
        rot[k + 2] * prev.rot[k + 2] +
        rot[k + 3] * prev.rot[k + 3];
      if (dot < 0) for (let j = 0; j < 4; j++) rot[k + j] = -rot[k + j];
    }
    const d = Math.max(
      ...rot.map((v, k) => Math.abs(v - prev.rot[k])),
      ...hips.map((v, k) => Math.abs(v - prev.hips[k])),
    );
    if (d > 0.01) lastMoving = i;
  }
  frames.push({ rot, hips });
}
const kept = frames.slice(0, lastMoving + 2);
fs.writeFileSync(
  OUT,
  JSON.stringify({
    version: 1,
    source: "Adobe Mixamo: Death From The Front, baked by scripts/fps/locomotion/bake-death.mjs",
    fps: FPS,
    bones: DEATH_BONES.map(([b]) => b),
    restDir,
    rot: kept.map((f) => f.rot),
    hips: kept.map((f) => f.hips),
  }),
);
console.log(
  `death: ${kept.length} frames (${(kept.length / FPS).toFixed(2)} s of ${clip.duration.toFixed(2)} s), ` +
    `hips end ${kept[kept.length - 1].hips.join(",")}, ${fs.statSync(OUT).size} bytes`,
);
