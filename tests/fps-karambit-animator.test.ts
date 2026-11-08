import * as THREE from "three";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  KARAMBIT_INSPECTS,
  KARAMBIT_TRICKS,
  KarambitAnimator,
  TRICK_DELAY,
  type KarambitFrame,
} from "../src/lib/fps/karambit-animator";

const CONTROLS = [
  "KR_Hand",
  "KR_HandL",
  "KR_Elbow",
  "KR_ElbowL",
  "KR_Knife",
  "KR_Fingers",
  "KR_Thumb",
  "KR_FingersL",
  "KR_View",
];
/** A stand-in for the Blender control rig and clips (same node names and clip names). */
function rig() {
  const root = new THREE.Group();
  for (const name of CONTROLS) {
    const node = new THREE.Object3D();
    node.name = name;
    root.add(node);
  }
  const clip = (name: string, length: number, handX = 0.01, viewX = 0) =>
    new THREE.AnimationClip(name, length, [
      new THREE.VectorKeyframeTrack("KR_Hand.position", [0, length], [0, 0, 0, handX, 0, 0]),
      new THREE.QuaternionKeyframeTrack(
        "KR_Knife.quaternion",
        [0, length],
        [0, 0, 0, 1, 0, 0, 0, 1],
      ),
      new THREE.VectorKeyframeTrack("KR_Fingers.position", [0, length], [1, 1, 1, 1, 1, 1]),
      new THREE.VectorKeyframeTrack("KR_HandL.position", [0, length], [0, 0, 0, 0, handX, 0]),
      new THREE.VectorKeyframeTrack("KR_View.position", [0, length], [viewX, 0, 0, viewX, 0, 0]),
    ]);
  const clips = [
    clip("karambit_equip", 0.6),
    clip("karambit_idle", 4, 0.01, 0.04),
    clip("karambit_inspect", 3.5),
    clip("karambit_inspect_spin", 3.2),
    clip("karambit_air", 0.5, 0, 0),
    clip("karambit_slash", 0.4),
    clip("karambit_stab", 0.72),
    clip("karambit_unequip", 0.25, 0),
    clip("karambit_walk", 0.8),
    clip("karambit_sprint", 0.56),
    clip("karambit_land", 0.38),
    ...KARAMBIT_TRICKS.map((name) => clip(name, 1.2)),
  ];
  const cues = JSON.stringify({
    karambit_equip: [
      [0.02, "equip"],
      [0.45, "catch"],
    ],
    karambit_slash: [[0.05, "slash"]],
  });
  return { root, clips, cues };
}
const still: KarambitFrame = {
  dt: 1 / 60,
  equipped: true,
  moving: 0,
  walking: false,
  backward: false,
  strafe: 0,
  airborne: false,
  reducedMotion: false,
};
function run(a: KarambitAnimator, seconds: number, frame: Partial<KarambitFrame> = {}) {
  for (let t = 0; t < seconds; t += 1 / 60) a.update({ ...still, ...frame });
}

describe("Karambit animation state machine", () => {
  it("equips, then settles into idle, firing the clip's sound cues once", () => {
    const { root, clips, cues } = rig();
    const a = new KarambitAnimator(root, clips, { cues }),
      heard: string[] = [];
    a.onCue = (cue) => heard.push(cue);
    run(a, 0.3);
    expect(a.state).toBe("equip");
    run(a, 0.5);
    expect(a.state).toBe("idle");
    expect(heard).toEqual(["equip", "catch"]);
  });
  it("plays a random idle trick only after 8–15 s of stillness, never the same twice running", () => {
    const { root, clips } = rig();
    let n = 0.37;
    const a = new KarambitAnimator(root, clips, {}, () => (n = (n * 7.13 + 0.29) % 1));
    run(a, 1);
    run(a, TRICK_DELAY.min - 1.5);
    expect(a.state).toBe("idle");
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      for (let t = 0; t < TRICK_DELAY.max + 3 && a.state !== "trick"; t += 1 / 60) run(a, 1 / 60);
      expect(a.state).toBe("trick");
      seen.push((a as unknown as { lastTrick: string }).lastTrick);
      while (a.state === "trick") run(a, 1 / 60);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(new Set(seen).size).toBe(KARAMBIT_TRICKS.length);
  });
  it("moving cancels a trick and never starts one", () => {
    const { root, clips } = rig();
    const a = new KarambitAnimator(root, clips, {}, () => 0);
    run(a, 1 + TRICK_DELAY.min + 0.1);
    expect(a.state).toBe("trick");
    run(a, 0.05, { moving: 1 });
    expect(a.state).toBe("idle");
    run(a, TRICK_DELAY.max + 1, { moving: 1 });
    expect(a.state).toBe("idle");
  });
  it("attacks interrupt inspect immediately; inspect is not restarted while playing", () => {
    const { root, clips } = rig();
    const a = new KarambitAnimator(root, clips, {});
    run(a, 1);
    a.inspect();
    expect(a.state).toBe("inspect");
    run(a, 1);
    a.inspect();
    expect(a.state).toBe("inspect");
    a.attack("stab");
    expect(a.state).toBe("stab");
    a.inspect();
    expect(a.state).toBe("stab");
    run(a, 0.9);
    expect(a.state).toBe("idle");
  });
  it("switching weapons interrupts everything; drawing again starts from the equip", () => {
    const { root, clips } = rig();
    const a = new KarambitAnimator(root, clips, {});
    run(a, 1);
    a.attack("slash");
    run(a, 0.1, { equipped: false });
    expect(a.state).toBe("hidden");
    a.attack("slash");
    expect(a.state).toBe("hidden");
    run(a, 0.05);
    expect(a.state).toBe("equip");
  });
  it("reduced motion shrinks the viewmodel camera choreography", () => {
    const { root, clips } = rig();
    const a = new KarambitAnimator(root, clips, {});
    run(a, 1);
    const normal = a.update({ ...still }).viewPosition.x;
    const reduced = a.update({ ...still, reducedMotion: true }).viewPosition.x;
    expect(normal).toBeCloseTo(0.04, 4);
    expect(reduced).toBeCloseTo(0.01, 4);
  });
  it("F picks an inspect at random, never the same one twice running", () => {
    const { root, clips } = rig();
    let n = 0.21;
    const a = new KarambitAnimator(root, clips, {}, () => (n = (n * 5.31 + 0.17) % 1));
    run(a, 1);
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      a.inspect();
      expect(a.state).toBe("inspect");
      seen.push((a as unknown as { lastInspect: string }).lastInspect);
      run(a, 4);
      expect(a.state).toBe("idle");
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(new Set(seen)).toEqual(new Set(KARAMBIT_INSPECTS));
  });
  it("inspect keeps playing while moving; an attack or a weapon switch cuts it", () => {
    const { root, clips } = rig();
    const a = new KarambitAnimator(root, clips, {});
    run(a, 1);
    a.inspect();
    run(a, 0.5, { moving: 1 });
    expect(a.state).toBe("inspect");
    a.attack("slash");
    expect(a.state).toBe("slash");
    run(a, 1);
    a.inspect();
    run(a, 0.2, { equipped: false });
    expect(a.state).toBe("hidden");
  });
  it("drives both hands from the clips", () => {
    const { root, clips } = rig();
    const a = new KarambitAnimator(root, clips, {});
    run(a, 1);
    const c = a.update({ ...still });
    // The stand-in idle moves the right wrist along x and the left wrist along y.
    expect(c.handPosition.x).toBeGreaterThan(0);
    expect(c.handLPosition.y).toBeGreaterThan(0);
    expect(c.fingers.toArray()).toEqual([1, 1, 1]);
  });
  it("the airborne lift eases in on take-off and out on landing", () => {
    const { root, clips } = rig();
    const a = new KarambitAnimator(root, clips, {});
    run(a, 1);
    const weight = () => (a as unknown as { weights: { air: number } }).weights.air;
    run(a, 0.05, { airborne: true });
    expect(weight()).toBeGreaterThan(0.2);
    expect(weight()).toBeLessThan(0.6);
    run(a, 0.6, { airborne: true });
    expect(weight()).toBeGreaterThan(0.95);
    run(a, 0.6);
    expect(weight()).toBeLessThan(0.05);
  });
  it("the shipped GLB carries the two-hand control rig and every clip", () => {
    const glb = fs.readFileSync(path.resolve(__dirname, "../public/fps/models/karambit.glb"));
    const length = glb.readUInt32LE(12);
    const json = JSON.parse(glb.subarray(20, 20 + length).toString("utf8")) as {
      nodes: { name?: string }[];
      animations: { name: string }[];
    };
    const nodes = new Set(json.nodes.map((n) => n.name));
    for (const name of [...CONTROLS, "Karambit", "BladeTip"]) expect(nodes.has(name)).toBe(true);
    const animations = new Set(json.animations.map((x) => x.name));
    for (const name of [
      "karambit_equip",
      "karambit_unequip",
      "karambit_idle",
      ...KARAMBIT_INSPECTS,
      ...KARAMBIT_TRICKS,
      "karambit_slash",
      "karambit_stab",
      "karambit_walk",
      "karambit_sprint",
      "karambit_land",
      "karambit_air",
    ])
      expect(animations.has(name)).toBe(true);
  });
});
