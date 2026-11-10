/**
 * Bake the Mixamo rifle locomotion clips (art/mixamo, Adobe Mixamo licence: free for use in
 * games, not for redistribution as animation files) into foot paths for the characters' leg IK
 * (src/lib/fps/locomotion.ts). Owner, 2026-11-10: enemies' walk and run looked poor.
 *
 * Per clip, N evenly spaced samples of one cycle, in the clip's own frame (character facing +z,
 * its left +x), every length divided by the rig's rest hip height so any character can scale it:
 *  - left/right ankle position relative to the body's steady travel (the hips' linear trend);
 *  - left/right toe pitch (rad, + toe up) relative to the rest pose;
 *  - hip height and the hips' sway off the trend (x, z); pelvis yaw and roll (rad);
 *  - the clip's travel velocity (hip heights per second) and its direction.
 * Samples start where the left ankle is furthest along the travel direction, so clips of the
 * same gait blend in step. The right strafe is the left one mirrored (see mirror()). The output is a few kilobytes of JSON; nothing of Mixamo's files ships.
 *
 *   node scripts/fps/locomotion/bake.mjs
 */
import fs from "node:fs";
import path from "node:path";

globalThis.self = globalThis;
const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const SRC = path.join(ROOT, "art/mixamo");
const OUT = path.join(ROOT, "public/fps/locomotion/rifle-v1.json");
const N = 40;
const CLIPS = {
  idle: "Rifle_Idle.fbx",
  walk: "Rifle_Walk.fbx",
  run: "Rifle_Run.fbx",
  back: "Backwards_Rifle_Walk.fbx",
  left: "Strafe_Left.fbx",
  crouch: "Rifle_Crouch_Walk.fbx",
};
const r4 = (v) => Math.round(v * 1e4) / 1e4;

function bake(file, id) {
  const buf = fs.readFileSync(path.join(SRC, file));
  const root = new FBXLoader().parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
    "",
  );
  const get = (n) => {
    const o = root.getObjectByName("mixamorig" + n);
    if (!o) throw Error(`${file}: no mixamorig${n}`);
    return o;
  };
  const hips = get("Hips"),
    foot = { L: get("LeftFoot"), R: get("RightFoot") },
    toe = { L: get("LeftToeBase"), R: get("RightToeBase") };
  root.updateMatrixWorld(true);
  const wp = (o) => o.getWorldPosition(new THREE.Vector3());
  const unit = wp(hips).y;
  const toePitch = (s) => {
    const d = wp(toe[s]).sub(wp(foot[s]));
    return Math.atan2(d.y, Math.hypot(d.x, d.z));
  };
  const restPitch = { L: toePitch("L"), R: toePitch("R") };
  const restHipsQ = hips.getWorldQuaternion(new THREE.Quaternion()).invert();
  const clip = root.animations[0];
  const mixer = new THREE.AnimationMixer(root);
  // Played once and held at the end, so sample N is the cycle's end (not wrapped to its start).
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const raw = [];
  for (let i = 0; i <= N; i++) {
    mixer.setTime((clip.duration * i) / N);
    root.updateMatrixWorld(true);
    const e = new THREE.Euler().setFromQuaternion(
      hips.getWorldQuaternion(new THREE.Quaternion()).multiply(restHipsQ),
      "YXZ",
    );
    raw.push({
      h: wp(hips),
      L: wp(foot.L),
      R: wp(foot.R),
      pL: toePitch("L") - restPitch.L,
      pR: toePitch("R") - restPitch.R,
      yaw: e.y,
      roll: e.z,
    });
  }
  // Steady travel: the hips' displacement over the cycle (sample N is the loop's end).
  const vx = (raw[N].h.x - raw[0].h.x) / clip.duration,
    vz = (raw[N].h.z - raw[0].h.z) / clip.duration;
  const moving = Math.hypot(vx, vz) > 5; // cm/s
  const trend = (i) => ({
    x: raw[0].h.x + ((moving ? vx : 0) * (clip.duration * i)) / N,
    z: raw[0].h.z + ((moving ? vz : 0) * (clip.duration * i)) / N,
  });
  const rows = raw.slice(0, N).map((s, i) => {
    const t = trend(i);
    return {
      L: [(s.L.x - t.x) / unit, s.L.y / unit, (s.L.z - t.z) / unit],
      R: [(s.R.x - t.x) / unit, s.R.y / unit, (s.R.z - t.z) / unit],
      pL: s.pL,
      pR: s.pR,
      hy: s.h.y / unit,
      sx: (s.h.x - t.x) / unit,
      sz: (s.h.z - t.z) / unit,
      yaw: s.yaw,
      roll: s.roll,
    };
  });
  // Phase 0: the left ankle furthest along the travel (forward for the idle).
  const dir = moving ? [vx / Math.hypot(vx, vz), vz / Math.hypot(vx, vz)] : [0, 1];
  let start = 0;
  rows.forEach((r, i) => {
    const a = r.L[0] * dir[0] + r.L[2] * dir[1],
      b = rows[start].L[0] * dir[0] + rows[start].L[2] * dir[1];
    if (a > b) start = i;
  });
  const cyc = rows.slice(start).concat(rows.slice(0, start));
  const flat = (k) => cyc.flatMap((r) => r[k]).map(r4);
  return {
    id,
    duration: r4(clip.duration),
    velocity: [r4(moving ? vx / unit : 0), r4(moving ? vz / unit : 0)],
    samples: N,
    left: flat("L"),
    right: flat("R"),
    toeLeft: flat("pL"),
    toeRight: flat("pR"),
    hipY: flat("hy"),
    sway: cyc.flatMap((r) => [r.sx, r.sz]).map(r4),
    pelvis: cyc.flatMap((r) => [r.yaw, r.roll]).map(r4),
  };
}

/**
 * Mixamo's "Strafe Right" is a single side-step from standing, not a cycle, so the right strafe
 * is the left one mirrored: feet swapped, x negated, yaw and roll negated, phase shifted half a
 * cycle so it still starts at the left ankle's furthest point along the travel.
 */
function mirror(c, id) {
  const n = c.samples,
    half = n / 2;
  const at = (arr, stride, i) =>
    arr.slice(((i + half) % n) * stride, ((i + half) % n) * stride + stride);
  const out = { ...c, id, velocity: [-c.velocity[0], c.velocity[1]] };
  const rows = [...Array(n).keys()];
  const flipX = (v) => [-v[0], v[1], v[2]];
  out.left = rows.flatMap((i) => flipX(at(c.right, 3, i)));
  out.right = rows.flatMap((i) => flipX(at(c.left, 3, i)));
  out.toeLeft = rows.flatMap((i) => at(c.toeRight, 1, i));
  out.toeRight = rows.flatMap((i) => at(c.toeLeft, 1, i));
  out.hipY = rows.flatMap((i) => at(c.hipY, 1, i));
  out.sway = rows.flatMap((i) => {
    const [x, z] = at(c.sway, 2, i);
    return [-x, z];
  });
  out.pelvis = rows.flatMap((i) => at(c.pelvis, 2, i).map((v) => -v));
  return out;
}

const clips = Object.fromEntries(Object.entries(CLIPS).map(([id, f]) => [id, bake(f, id)]));
clips.right = mirror(clips.left, "right");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({
    version: 1,
    source: "Adobe Mixamo (rifle locomotion), baked by scripts/fps/locomotion/bake.mjs",
    clips,
  }),
);
for (const c of Object.values(clips))
  console.log(
    `${c.id.padEnd(7)} ${c.duration.toFixed(2)} s  speed ${Math.hypot(...c.velocity).toFixed(2)} hip/s  dir ${c.velocity.map((v) => v.toFixed(2)).join(",")}  hipY ${Math.min(...c.hipY).toFixed(2)}–${Math.max(...c.hipY).toFixed(2)}`,
  );
console.log("wrote", path.relative(ROOT, OUT), fs.statSync(OUT).size, "bytes");
