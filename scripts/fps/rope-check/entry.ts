import * as THREE from "three";
import { createCharacter } from "@/lib/fps/authored-character";
import { ROPE_CLIMB } from "@/lib/fps/rope-climb";
import { createWeaponKit } from "@/lib/fps/weapon";

/**
 * Rope climb check (2026-11-12): both characters on a rope up a rock face, posed by the game's
 * own update from the distance climbed (rope-climb.ts), drawn at moments through the cycle and
 * measured: do the gripping hands stay on their spot of the rope and the standing feet on their
 * spot of the rock, how far do the arms and legs stretch. Driven by capture.mjs.
 */
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb7c6d4);
scene.add(new THREE.HemisphereLight(0xe4eaff, 0x40382c, 2));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.8);
sun.position.set(4, 6, 5);
scene.add(sun);
const kit = createWeaponKit();
const chars = {
  A: createCharacter("A", null, kit, { worldRifle: true }),
  B: createCharacter("B", null, kit, { worldRifle: true }),
};
/** The face's angle from level (rad), the rope's line up it and the face's normal. */
let ANGLE = (62 * Math.PI) / 180;
const up = new THREE.Vector3(),
  normal = new THREE.Vector3(),
  frame = new THREE.Quaternion();
const WALL = 0.5;
const face = new THREE.Group();
scene.add(face);
function setAngle(deg: number) {
  ANGLE = (deg * Math.PI) / 180;
  up.set(0, Math.sin(ANGLE), -Math.cos(ANGLE));
  normal.set(0, Math.cos(ANGLE), Math.sin(ANGLE));
  frame.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), up, normal),
  );
  face.clear();
  // The rock: a slab with lines every 25 cm (a foot that slides shows against them).
  const slab = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 400),
    new THREE.MeshStandardMaterial({ color: 0x77736b, roughness: 1 }),
  );
  slab.quaternion.copy(frame);
  slab.position.copy(normal).multiplyScalar(-WALL);
  face.add(slab);
  const rock = new THREE.Mesh(
    new THREE.BoxGeometry(6, 400, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x5f5b54, roughness: 1 }),
  );
  rock.quaternion.copy(frame);
  rock.position.copy(normal).multiplyScalar(-WALL - 0.301);
  face.add(rock);
  const lines: number[] = [];
  for (let y = -200; y <= 200; y += 0.25) {
    const a = new THREE.Vector3(-3, y, -WALL + 0.004).applyQuaternion(frame),
      b = new THREE.Vector3(3, y, -WALL + 0.004).applyQuaternion(frame);
    lines.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(lines, 3)),
    new THREE.LineBasicMaterial({ color: 0x55524c }),
  );
  face.add(grid);
  // The rope, banded every 25 cm (a hand that slides shows against the bands).
  for (let y = -200; y < 200; y += 0.25) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.019, 0.019, 0.25, 8),
      new THREE.MeshStandardMaterial({
        color: Math.round(y * 4) % 2 ? 0xb8331a : 0x30201c,
        roughness: 0.8,
      }),
    );
    seg.quaternion.copy(frame);
    seg.position.copy(up).multiplyScalar(y + 0.125);
    face.add(seg);
  }
}
setAngle(62);
const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
/** The side view is drawn square on (no perspective): the rock is a line, the rope a line. */
const flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const VIEWS: Record<string, [number, number, number]> = {
  // Camera from the climber's chest, in the rope's frame (x right, y up the rope, z off the rock).
  side: [5.2, 0.2, 0.6],
  rear: [0, 0.6, 5.4],
  orbit: [1.6, 2.6, 3.6],
  front: [2.4, 1.2, -0.2],
  hands: [0.9, 0.9, 1.1],
  feet: [1.3, -0.5, 0.5],
};
type Actor = (typeof chars)["A"];
/** Climb to `s` m at `speed` m/s by the game's update at 60 fps (so held-still settling and
 * every smoothing is as in a match), from `lead` s earlier. */
function climbTo(actor: Actor, s: number, speed: number, lead = 0.6) {
  const steps = Math.max(1, Math.round(lead * 60));
  for (let i = steps; i >= 0; i--) {
    const at = s - (speed * i) / 60;
    actor.root.position.copy(up).multiplyScalar(at);
    actor.root.quaternion.copy(frame);
    actor.update(1000 / 60, 1000 + (steps - i) * (1000 / 60), 0, true, false, {
      rope: { cycles: at / ROPE_CLIMB.cycle, wall: WALL },
      primary: "none",
      weapon: "rifle",
    });
  }
  actor.root.updateMatrixWorld(true);
}
declare global {
  interface Window {
    ready: Promise<unknown>;
    sheet: (o: {
      seat: "A" | "B";
      view: string;
      phases: number[];
      angle?: number;
      speed?: number;
      still?: boolean;
      cell?: [number, number];
    }) => void;
    measure: (o: { seat: "A" | "B"; speed: number; angle?: number }) => Record<string, number>;
    rig: (seat: "A" | "B") => unknown;
  }
}
window.ready = Promise.all([chars.A.ready, chars.B.ready]);
window.rig = (seat) => chars[seat].ropeClimb?.rig ?? null;
window.sheet = ({
  seat,
  view,
  phases,
  angle = 62,
  speed = 2,
  still = false,
  cell = [320, 480],
}) => {
  setAngle(angle);
  for (const c of Object.values(chars)) c.root.removeFromParent();
  const actor = chars[seat];
  scene.add(actor.root);
  const [w, h] = cell;
  renderer.setSize(w * phases.length, h);
  renderer.setScissorTest(true);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
  phases.forEach((phase, i) => {
    const s = 30 + phase * ROPE_CLIMB.cycle;
    climbTo(actor, s, speed);
    if (still)
      for (let k = 0; k < 40; k++)
        actor.update(1000 / 60, 5000 + k * (1000 / 60), 0, true, false, {
          rope: { cycles: s / ROPE_CLIMB.cycle, wall: WALL },
          primary: "none",
          weapon: "rifle",
        });
    actor.root.updateMatrixWorld(true);
    const chest = new THREE.Vector3(0, 1.15, 0.15).applyQuaternion(frame).add(actor.root.position);
    renderer.setViewport(i * w, 0, w, h);
    renderer.setScissor(i * w, 0, w, h);
    renderer.clear();
    if (view === "side") {
      const half = 1.25;
      flat.left = (-half * w) / h;
      flat.right = (half * w) / h;
      flat.top = half;
      flat.bottom = -half;
      flat.updateProjectionMatrix();
      const mid = new THREE.Vector3(0, 1.0, -0.1).applyQuaternion(frame).add(actor.root.position);
      flat.position.set(8, 0, 0).applyQuaternion(frame).add(mid);
      flat.up.copy(up);
      flat.lookAt(mid);
      renderer.render(scene, flat);
      return;
    }
    const focus =
      view === "hands"
        ? new THREE.Vector3(0, 1.75, 0).applyQuaternion(frame).add(actor.root.position)
        : view === "feet"
          ? new THREE.Vector3(0, 0.55, -0.3).applyQuaternion(frame).add(actor.root.position)
          : chest;
    cam.position.fromArray(VIEWS[view]!).applyQuaternion(frame).add(focus);
    cam.up.copy(view === "orbit" ? new THREE.Vector3(0, 1, 0) : up);
    cam.lookAt(focus);
    renderer.render(scene, cam);
  });
};
window.measure = ({ seat, speed, angle = 62 }) => {
  setAngle(angle);
  const actor = chars[seat];
  scene.add(actor.root);
  const found = new Map<string, THREE.Object3D>();
  actor.root.traverse((o) => {
    if ((o as THREE.Bone).isBone)
      found.set(o.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, ""), o);
  });
  /** A bone by its Mixamo name (the sourced rig's middle knuckle is "arm <side> finger 3a"). */
  const bone = (n: string) =>
    found.get(n) ??
    found.get(
      n.replace(
        /^(Left|Right)Hand(Middle|Index)1$/,
        (_, side: string, finger: string) =>
          `arm_${side.toLowerCase()}_finger_${finger === "Middle" ? 3 : 2}a`,
      ),
    )!;
  const w = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  const last: Record<string, THREE.Vector3 | null> = {};
  const out = {
    handSlideCm: 0,
    handOffRopeCm: 0,
    footSlideCm: 0,
    footOffRockCm: 0,
    armStretch: 0,
    legStretch: 0,
    kneeMinDeg: 180,
    elbowMinDeg: 180,
    standPart: 0,
    frames: 0,
    handSlideAt: 0,
    footSlideAt: 0,
    footMissCm: 0,
    footTargetSlideCm: 0,
  };
  const lastTarget: Record<string, THREE.Vector3 | null> = {};
  const frames = Math.round((6 / speed) * 60);
  for (let i = 0; i <= frames; i++) {
    const s = 30 + (speed * i) / 60;
    actor.root.position.copy(up).multiplyScalar(s);
    actor.root.quaternion.copy(frame);
    actor.update(1000 / 60, 1000 + i * (1000 / 60), 0, true, false, {
      rope: { cycles: s / ROPE_CLIMB.cycle, wall: WALL },
      primary: "none",
      weapon: "rifle",
    });
    actor.root.updateMatrixWorld(true);
    const pose = actor.ropeClimb!.pose;
    out.frames++;
    for (const side of ["Left", "Right"] as const) {
      const p = side === "Left" ? pose.left : pose.right;
      const arm = w(bone(side + "Arm")),
        fore = w(bone(side + "ForeArm")),
        hand = w(bone(side + "Hand")),
        knuckle = w(bone(side + "HandMiddle1")),
        hip = w(bone(side + "UpLeg")),
        knee = w(bone(side + "Leg")),
        ankle = w(bone(side + "Foot")),
        toe = w(bone(side + "ToeBase"));
      out.armStretch = Math.max(
        out.armStretch,
        arm.distanceTo(hand) / (arm.distanceTo(fore) + fore.distanceTo(hand)),
      );
      out.legStretch = Math.max(
        out.legStretch,
        hip.distanceTo(ankle) / (hip.distanceTo(knee) + knee.distanceTo(ankle)),
      );
      const ang = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
        (a.clone().sub(b).angleTo(c.clone().sub(b)) * 180) / Math.PI;
      out.kneeMinDeg = Math.min(out.kneeMinDeg, ang(hip, knee, ankle));
      out.elbowMinDeg = Math.min(out.elbowMinDeg, ang(arm, fore, hand));
      // The middle of the grip (in the palm, 8.5 cm along the hand from the wrist) against the
      // rope's line.
      const along0 = knuckle.clone().sub(hand).normalize();
      const across = w(bone(side + "HandIndex1"))
        .sub(knuckle)
        .normalize();
      const back = across.clone().cross(along0.clone().multiplyScalar(side === "Left" ? 1 : -1));
      const fist = hand
        .clone()
        .addScaledVector(along0, 0.085)
        .addScaledVector(back.normalize(), -0.03);
      const key = side + "hand";
      if (p.hand.hold === 1) {
        const along = fist.dot(up);
        out.handOffRopeCm = Math.max(
          out.handOffRopeCm,
          fist.clone().addScaledVector(up, -along).length() * 100,
        );
        if (last[key] && fist.distanceTo(last[key]!) * 100 > out.handSlideCm) {
          out.handSlideCm = fist.distanceTo(last[key]!) * 100;
          out.handSlideAt = (s / ROPE_CLIMB.cycle) % 1;
        }
        last[key] = fist;
      } else last[key] = null;
      const fkey = side + "foot";
      if (p.foot.hold === 1) {
        const aimed = actor.root.localToWorld(new THREE.Vector3(p.foot.x, p.foot.y, p.foot.z));
        out.footMissCm = Math.max(out.footMissCm, aimed.distanceTo(ankle) * 100);
        if ((window as unknown as { TRACE?: boolean }).TRACE && side === "Left")
          console.log(
            "trace",
            ((s / ROPE_CLIMB.cycle) % 1).toFixed(3),
            (aimed.distanceTo(ankle) * 100).toFixed(2),
            last[fkey] ? (ankle.distanceTo(last[fkey]!) * 100).toFixed(2) : "-",
            (hip.distanceTo(ankle) / (hip.distanceTo(knee) + knee.distanceTo(ankle))).toFixed(3),
            (hip.distanceTo(knee) + knee.distanceTo(ankle)).toFixed(3),
          );
        if (lastTarget[fkey])
          out.footTargetSlideCm = Math.max(
            out.footTargetSlideCm,
            aimed.distanceTo(lastTarget[fkey]!) * 100,
          );
        lastTarget[fkey] = aimed;
        out.standPart += 0.5;
        // The sole under the ankle and the toe: both on the rock.
        const off = (v: THREE.Vector3) => Math.abs(v.dot(normal) + WALL);
        out.footOffRockCm = Math.max(
          out.footOffRockCm,
          Math.abs(off(ankle) - actor.ropeClimb!.rig.ankle) * 100,
          off(toe) * 100 - 6,
        );
        if (last[fkey] && ankle.distanceTo(last[fkey]!) * 100 > out.footSlideCm) {
          out.footSlideCm = ankle.distanceTo(last[fkey]!) * 100;
          out.footSlideAt = (s / ROPE_CLIMB.cycle) % 1;
        }
        last[fkey] = ankle;
      } else last[fkey] = lastTarget[fkey] = null;
    }
  }
  out.standPart /= out.frames;
  return out;
};
