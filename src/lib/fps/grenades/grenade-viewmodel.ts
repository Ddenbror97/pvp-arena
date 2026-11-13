import * as THREE from "three";
import { cloneAuthoredModel, retainAuthoredAsset } from "../authored-assets";
import {
  createGloveMaterial,
  sharpenViewmodelTextures,
  type ViewmodelVariant,
} from "../authored-viewmodel";
import { fitContinuousForearms, HANDGUARD_GRIP, poseRifleHands } from "../fitted-rifle-hands";
import {
  basisQuaternion,
  bone,
  extremeVertex,
  f,
  FINGERS,
  handFrame,
  poseHand,
  THUMB,
  vertex,
  type HandFrame,
  type HandPose,
  type Side,
} from "../hand-rig";
import { createSkinMaterial } from "../forearm-detail";
import { sleeveMesh, sleeveParts } from "../karambit-viewmodel";
import { ARENA_MODELS } from "../model-assets";
import { GRENADE_TYPES, type GrenadeType } from "./rules";
import {
  clipFor,
  readGrenadeMetadata,
  releaseSeconds,
  type GrenadeMetadata,
  type GrenadeView,
} from "./grenade-timeline";

/**
 * First-person grenades on a team's existing arms (Police: blue duty sleeves and watch; Terrorist:
 * snow-camo smock): the same rig, gloves, forearm builder and sleeves the rifles, the Karambit
 * and the C4 use. Nothing about the arms is replaced; only finger poses are baked for the grips.
 *
 * - Right hand: an open hand (base) with a grip morph per grenade shape: the round RGD-5 and the
 *   cylindrical M18 / AN-M14 (the fingers close round each body's radius). The palm's centre is
 *   placed exactly on the clip's `G_Hand` and the grenade is put in the palm (its Grip node on
 *   G_Hand), so the grenade never floats out of the hand or sinks into it.
 * - Left hand: relaxed (base) with a pinch morph; the point between the thumb and index
 *   fingertips is placed on `G_HandL`, or on the ring's pinch point while pulling (`G_Mix`),
 *   so the fingers stay on the ring as the pin comes out; the ring then leaves with the hand.
 * - Forearms aim at the clip's elbow directions (the wind-up lifts the elbow).
 *
 * Cosmetic only: the hands follow the local prediction of the server's handling rules.
 */
type HandMorphs = { contact: THREE.Vector3[] };

const OPEN_R: HandPose = {
  index: f(8, 10, 6, 6),
  middle: f(10, 12, 6, 0),
  ring: f(12, 12, 6, -6),
  little: f(14, 12, 6, -12),
  thumb: [
    [0.55, 0.05, 0.85],
    [0.7, 0.1, 0.7],
    [0.8, 0.15, 0.55],
  ],
};
/** Round RGD-5: fingers well closed, thumb over the top of the fingers on the near side. */
const GRIP_HE: HandPose = {
  index: f(52, 72, 38, 4),
  middle: f(56, 76, 40, 0),
  ring: f(60, 78, 40, -5),
  little: f(64, 76, 40, -10),
  thumb: [
    [0.45, 0.3, 0.85],
    [0.55, 0.6, 0.6],
    [0.5, 0.8, 0.35],
  ],
};
/** M18 / AN-M14 cylinders (wider): the same wrap, opened by the larger radius. */
const GRIP_CYL: HandPose = {
  index: f(46, 64, 34, 4),
  middle: f(50, 68, 36, 0),
  ring: f(54, 70, 36, -5),
  little: f(58, 70, 36, -10),
  thumb: [
    [0.5, 0.25, 0.85],
    [0.6, 0.5, 0.65],
    [0.55, 0.7, 0.45],
  ],
};
const RELAX_L: HandPose = {
  index: f(18, 26, 12, 5),
  middle: f(24, 32, 14, 0),
  ring: f(30, 36, 16, -5),
  little: f(36, 38, 16, -10),
  thumb: [
    [0.6, 0.2, 0.75],
    [0.7, 0.3, 0.6],
    [0.8, 0.35, 0.45],
  ],
};
/** Thumb and index fingertips meet (the ring); the other fingers tucked. */
const PINCH_L: HandPose = {
  index: f(38, 46, 22, 2),
  middle: f(58, 80, 40, 0),
  ring: f(64, 84, 40, -5),
  little: f(70, 84, 40, -10),
  thumb: [
    [0.62, 0.42, 0.66],
    [0.62, 0.62, 0.48],
    [0.52, 0.8, 0.3],
  ],
};

export type GrenadeViewmodel = ReturnType<typeof createGrenadeViewmodel>;
export function createGrenadeViewmodel(parent: THREE.Object3D, variant: ViewmodelVariant) {
  const arms = retainAuthoredAsset(variant.asset),
    grenadeAsset = retainAuthoredAsset(ARENA_MODELS.grenades);
  const root = new THREE.Group();
  root.name = "grenade-first-person";
  root.visible = false;
  parent.add(root);
  const armsRoot = new THREE.Group();
  armsRoot.name = "grenade-arms";
  root.add(armsRoot);
  const owned = {
    geometry: [] as THREE.BufferGeometry[],
    materials: [] as THREE.Material[],
    textures: [] as THREE.Texture[],
  };
  type Hand = {
    wrist: THREE.Group;
    content: THREE.Group;
    forearm: THREE.Group;
    align: THREE.Group;
    armContent: THREE.Group;
    gloves: THREE.Mesh | null;
    rest: THREE.Vector3;
    restInverse: THREE.Quaternion;
    morphs: HandMorphs;
    forearmRest: THREE.Vector3;
    forearmLength: number;
  };
  const makeHand = (side: Side): Hand => {
    const wrist = new THREE.Group(),
      content = new THREE.Group(),
      forearm = new THREE.Group(),
      align = new THREE.Group(),
      unalign = new THREE.Group(),
      armContent = new THREE.Group();
    wrist.name = `grenade-wrist-${side}`;
    forearm.name = `grenade-forearm-${side}`;
    wrist.add(content);
    forearm.add(align);
    align.add(unalign);
    unalign.add(armContent);
    armsRoot.add(forearm, wrist);
    return {
      wrist,
      content,
      forearm,
      align,
      armContent,
      gloves: null,
      rest: new THREE.Vector3(),
      restInverse: new THREE.Quaternion(),
      morphs: { contact: [] },
      forearmRest: new THREE.Vector3(),
      forearmLength: 0,
    };
  };
  const hands = { R: makeHand("R"), L: makeHand("L") };
  let stopped = false,
    loaded = false,
    meta: GrenadeMetadata | null = null,
    mixer: THREE.AnimationMixer | null = null,
    rig: THREE.Object3D | null = null;
  type NodeKey = "hand" | "handL" | "mix" | "pull" | "fingers" | "elbowR" | "elbowL";
  const nodes = {} as Record<NodeKey, THREE.Object3D>;
  const actions = new Map<string, THREE.AnimationAction>();
  type Model = {
    holder: THREE.Group;
    pin: THREE.Object3D;
    pinRest: THREE.Vector3;
    pinRestQ: THREE.Quaternion;
    pull: THREE.Vector3;
    /** Inverse of the Grip node's local matrix (model space). */
    gripInverse: THREE.Matrix4;
    /** The ring's pinch point in the pin node's space. */
    pinchInPin: THREE.Vector3;
  };
  const models = {} as Record<GrenadeType, Model>;
  let armsInstance: ReturnType<typeof cloneAuthoredModel> | undefined,
    grenadeInstance: ReturnType<typeof cloneAuthoredModel> | undefined;

  const ready = Promise.all([arms.ready, grenadeAsset.ready])
    .then(([armsGltf, grenadeGltf]) => {
      if (stopped) return;
      meta = readGrenadeMetadata(grenadeGltf.scene.userData);
      armsRoot.scale.setScalar(variant.forearms.scale);
      const instance = (armsInstance = cloneAuthoredModel(armsGltf.scene));
      const holder = new THREE.Group();
      armsRoot.add(holder);
      holder.add(instance.root);
      root.updateWorldMatrix(true, true);
      const arm = instance.root.getObjectByName("FPArms") as THREE.SkinnedMesh;
      const delta = poseRifleHands(instance.root, HANDGUARD_GRIP);
      const frames = { R: handFrame(instance.root, "R"), L: handFrame(instance.root, "L") };
      const bake = (side: Side, pose: HandPose) => {
        poseHand(instance.root, side, pose, frames[side]);
        const built = fitContinuousForearms(arm, armsRoot, delta, variant.forearms);
        const other = side === "R" ? built.L : built.R;
        other.gloves.dispose();
        other.skin.dispose();
        return built[side];
      };
      const toArms = new THREE.Matrix4();
      armsRoot.updateWorldMatrix(true, true);
      toArms.copy(armsRoot.matrixWorld).invert().multiply(instance.root.matrixWorld);
      const inArms = (v: THREE.Vector3) => v.clone().applyMatrix4(toArms);
      const dirInArms = (v: THREE.Vector3) => v.clone().transformDirection(toArms);
      const right = [OPEN_R, GRIP_HE, GRIP_CYL].map((pose) => bake("R", pose));
      const left = [RELAX_L, PINCH_L].map((pose) => bake("L", pose));
      for (const side of ["R", "L"] as const) {
        const frame = frames[side];
        hands[side].rest.copy(inArms(frame.wrist));
        hands[side].restInverse
          .copy(basisQuaternion(dirInArms(frame.hand), dirInArms(frame.palm)))
          .invert();
      }
      // Contact points (the same vertices in every pose, so they blend like the morphs).
      poseHand(instance.root, "R", GRIP_CYL, frames.R);
      const palm = palmCentre(right[0]!.gloves, instance.root, "R", frames.R, inArms, dirInArms);
      hands.R.morphs.contact = right.map((b) => vertex(b.gloves, palm));
      poseHand(instance.root, "L", PINCH_L, frames.L);
      const [thumbPad, indexPad] = pinchPads(
        left[1]!.gloves,
        instance.root,
        frames.L,
        inArms,
        dirInArms,
      );
      hands.L.morphs.contact = left.map((b) =>
        vertex(b.gloves, thumbPad).add(vertex(b.gloves, indexPad)).multiplyScalar(0.5),
      );

      const gloveMaterial = createGloveMaterial(
        (Array.isArray(arm.material)
          ? arm.material[0]!
          : arm.material) as THREE.MeshStandardMaterial,
      );
      owned.materials.push(gloveMaterial);
      const sleeves = sleeveParts(instance.root, variant.arms, owned.geometry);
      const skin = sleeves.duty ? null : createSkinMaterial(owned);
      for (const [side, baked] of [
        ["R", right],
        ["L", left],
      ] as const) {
        const hand = hands[side];
        const base = baked[0]!;
        const geometry = base.gloves;
        geometry.morphAttributes.position = baked
          .slice(1)
          .map((b) => b.gloves.getAttribute("position"));
        geometry.morphAttributes.normal = baked
          .slice(1)
          .map((b) => b.gloves.getAttribute("normal"));
        geometry.morphTargetsRelative = false;
        owned.geometry.push(...baked.map((b) => b.gloves));
        for (const b of baked.slice(1)) b.skin.dispose();
        hand.gloves = new THREE.Mesh(geometry, gloveMaterial);
        hand.gloves.name = `grenade-gloves-${side}`;
        hand.gloves.morphTargetInfluences = baked.slice(1).map(() => 0);
        hand.content.add(hand.gloves);
        const armParts: THREE.Mesh[] = [];
        if (skin) {
          owned.geometry.push(base.skin);
          armParts.push(new THREE.Mesh(base.skin, skin));
        } else base.skin.dispose();
        for (const part of sleeves.parts)
          armParts.push(sleeveMesh(part, base.path, variant, owned.geometry));
        hand.forearmRest
          .copy(base.path.point(0, 0, -base.path.length, new THREE.Vector3()))
          .sub(hand.rest);
        hand.forearmLength = hand.forearmRest.length();
        hand.forearmRest.normalize();
        hand.align.quaternion.setFromUnitVectors(Z_AXIS, hand.forearmRest);
        hand.align.children[0]!.quaternion.copy(hand.align.quaternion).invert();
        hand.wrist.position.copy(hand.rest);
        hand.content.position.copy(hand.rest).negate();
        hand.forearm.position.copy(hand.rest);
        hand.armContent.position.copy(hand.rest).negate();
        hand.armContent.add(...armParts);
      }
      holder.removeFromParent();

      // The grenades and the control rig.
      grenadeInstance = cloneAuthoredModel(grenadeGltf.scene);
      rig = grenadeInstance.root;
      root.add(rig);
      for (const [key, name] of [
        ["hand", "G_Hand"],
        ["handL", "G_HandL"],
        ["mix", "G_Mix"],
        ["pull", "G_Pull"],
        ["fingers", "G_Fingers"],
        ["elbowR", "G_ElbowR"],
        ["elbowL", "G_ElbowL"],
      ] as const) {
        const node = rig.getObjectByName(name);
        if (!node) throw new Error(`Grenade GLB is missing ${name}`);
        nodes[key] = node;
      }
      for (const type of GRENADE_TYPES) {
        const model = rig.getObjectByName(`GR_${type}`)!;
        const grip = rig.getObjectByName(`GR_${type}_Grip`)!;
        const pin = rig.getObjectByName(`GR_${type}_Pin`)!;
        const ringPoint = rig.getObjectByName(`GR_${type}_Ring`)!;
        const holder = new THREE.Group();
        holder.name = `grenade-held-${type}`;
        holder.matrixAutoUpdate = false;
        holder.visible = false;
        rig.add(holder);
        model.removeFromParent();
        model.position.set(0, 0, 0);
        model.quaternion.identity();
        model.scale.setScalar(1);
        holder.add(model);
        model.updateMatrix();
        grip.updateMatrix();
        pin.updateMatrix();
        ringPoint.updateMatrix();
        const pinchInPin = ringPoint.position.clone().applyMatrix4(pin.matrix.clone().invert());
        models[type] = {
          holder,
          pin,
          pinRest: pin.position.clone(),
          pinRestQ: pin.quaternion.clone(),
          pull: new THREE.Vector3(...meta.models[type].pull),
          gripInverse: grip.matrix.clone().invert(),
          pinchInPin,
        };
      }
      mixer = new THREE.AnimationMixer(rig);
      for (const clip of grenadeGltf.animations) {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        actions.set(clip.name, action);
      }
      root.traverse((object) => {
        object.layers.set(1);
        if (object instanceof THREE.Mesh) {
          object.castShadow = false;
          object.receiveShadow = false;
          object.frustumCulled = false;
        }
      });
      sharpenViewmodelTextures(root);
      loaded = true;
    })
    .catch((error) => console.warn("Grenade viewmodel unavailable.", error));

  // Per-frame scratch.
  const v = new THREE.Vector3(),
    target = new THREE.Vector3(),
    contact = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    swing = new THREE.Quaternion(),
    rootInverse = new THREE.Quaternion(),
    elbow = new THREE.Vector3(),
    m = new THREE.Matrix4(),
    m2 = new THREE.Matrix4(),
    pinchWorld = new THREE.Vector3(),
    ringOffset = new THREE.Quaternion(),
    leftQ = new THREE.Quaternion();
  let current: THREE.AnimationAction | null = null,
    shown: GrenadeType | null = null,
    lastClip = "",
    lastTime = 0,
    carried = false;

  /** Place a hand so its contact point (blended by `weights`) lands on `at`, turned to `turn`. */
  function placeHand(
    hand: Hand,
    at: THREE.Vector3,
    turn: THREE.Quaternion,
    weights: readonly number[],
    elbowDir: THREE.Vector3,
  ) {
    armsRoot.worldToLocal(target.copy(at));
    q.copy(turn).premultiply(rootInverse).multiply(hand.restInverse);
    const c = hand.morphs.contact;
    contact.copy(c[0]!);
    for (let i = 1; i < c.length; i++)
      contact.addScaledVector(v.copy(c[i]!).sub(c[0]!), weights[i - 1] ?? 0);
    contact.sub(hand.rest);
    hand.wrist.position.copy(target).sub(v.copy(contact).applyQuaternion(q));
    hand.wrist.quaternion.copy(q);
    hand.forearm.position.copy(hand.wrist.position);
    v.copy(hand.forearmRest).applyQuaternion(q);
    const angle = v.angleTo(elbowDir);
    swing.setFromUnitVectors(v, elbowDir);
    if (angle > MAX_WRIST_BEND) swing.slerp(IDENTITY, 1 - MAX_WRIST_BEND / angle);
    hand.forearm.quaternion.copy(swing).multiply(q);
    stretchForearm(hand);
    const influences = hand.gloves?.morphTargetInfluences;
    if (influences) for (let i = 0; i < influences.length; i++) influences[i] = weights[i] ?? 0;
  }

  function stretchForearm(hand: Hand) {
    const camera = parent as THREE.PerspectiveCamera;
    let stretch = 1;
    if (camera.isPerspectiveCamera) {
      const scale = armsRoot.scale.x;
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.04,
        tanH = tanV * camera.aspect;
      const dir = v.copy(hand.forearmRest).applyQuaternion(hand.forearm.quaternion);
      const length = hand.forearmLength * scale;
      const wx = hand.forearm.position.x * scale,
        wy = hand.forearm.position.y * scale,
        wz = hand.forearm.position.z * scale;
      for (; stretch < MAX_FOREARM_STRETCH; stretch += 0.1) {
        const x = wx + dir.x * length * stretch,
          y = wy + dir.y * length * stretch,
          z = wz + dir.z * length * stretch;
        if (z > -camera.near || Math.abs(x) > -z * tanH || Math.abs(y) > -z * tanV) break;
      }
    }
    const widen = Math.min(1.45, 1 + 0.22 * (stretch - 1));
    hand.align.scale.set(widen, widen, stretch);
  }

  function sample(name: string, time: number) {
    const action = actions.get(name);
    if (!action || !mixer) return false;
    if (current !== action) {
      current?.stop();
      action.reset();
      action.play();
      current = action;
    }
    action.time = time;
    action.timeScale = 0;
    action.weight = 1;
    mixer.update(0);
    return true;
  }

  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    /** Sound cues as the clips cross them: "pin-grab", "pin-out", "release", "draw", "grip". */
    onCue: null as ((name: string, type: GrenadeType) => void) | null,
    /** World-space position of the held grenade (the release point for the flight's blend-in). */
    grenadeWorld(out: THREE.Vector3) {
      if (!shown) return null;
      return models[shown].holder.getWorldPosition(out);
    },
    update(_dt: number, view: GrenadeView) {
      if (!loaded || !mixer || !meta || !rig) return;
      if (view.kind === "hidden") {
        root.visible = false;
        if (shown) models[shown].holder.visible = false;
        shown = null;
        current?.stop();
        current = null;
        lastClip = "";
        return;
      }
      root.visible = true;
      const type = view.type;
      if (shown !== type) {
        if (shown) models[shown].holder.visible = false;
        shown = type;
      }
      const { clip, time } = clipFor(meta, view);
      const name = clip;
      if (!sample(name, time)) return;
      // Cues crossed since the last frame (none after a jump or a clip change mid-way).
      if (name === lastClip && time >= lastTime && time - lastTime < 0.3) {
        for (const [at, cue] of meta.cues[name] ?? [])
          if (at > lastTime && at <= time) this.onCue?.(cue, type);
      } else if (name !== lastClip && time < 0.05) {
        for (const [at, cue] of meta.cues[name] ?? []) if (at <= time) this.onCue?.(cue, type);
      }
      lastClip = name;
      lastTime = time;

      root.updateMatrixWorld(true);
      root.getWorldQuaternion(rootInverse).invert();
      armsRoot.updateWorldMatrix(true, false);
      const model = models[type];
      const fingers = nodes.fingers.position;
      const pull = nodes.pull.position;
      const grip = clamp01(fingers.x);
      // The grenade in the right palm: its Grip node on G_Hand (scaled).
      nodes.hand.updateMatrix();
      m.copy(nodes.hand.matrix)
        .multiply(m2.makeScale(meta.scale, meta.scale, meta.scale))
        .multiply(model.gripInverse);
      model.holder.matrix.copy(m);
      const released = view.kind === "throw" && view.t >= releaseSeconds(view.throw);
      model.holder.visible = !released;
      // The pin: out along the pull, then carried off in the left pinch.
      const pullOut = clamp01(pull.x),
        carry = pull.y > 0.5;
      // Home in the fuse until pulled; gone once the left hand has dropped away with it.
      model.pin.visible =
        view.kind !== "throw" && !(view.kind === "hold" && view.t > meta.pinSeconds + 0.12);
      model.pin.position
        .copy(model.pinRest)
        .addScaledVector(model.pull, meta.models[type].pinLength * meta.pullTravel * pullOut);
      model.pin.quaternion.copy(model.pinRestQ);
      model.holder.updateMatrixWorld(true);
      // Hands.
      nodes.hand.getWorldPosition(target);
      nodes.hand.getWorldQuaternion(q);
      const isHE = type === "he";
      elbow.copy(nodes.elbowR.position).normalize();
      placeHand(hands.R, target.clone(), q.clone(), [isHE ? grip : 0, isHE ? 0 : grip], elbow);
      // Left: free target, or the ring's pinch point while pulling.
      const mixW = clamp01(nodes.mix.position.x);
      nodes.handL.getWorldPosition(target);
      if (mixW > 0) {
        model.pin.updateMatrixWorld(true);
        pinchWorld.copy(model.pinchInPin).applyMatrix4(model.pin.matrixWorld);
        target.lerp(pinchWorld, mixW);
      }
      nodes.handL.getWorldQuaternion(leftQ);
      elbow.copy(nodes.elbowL.position).normalize();
      placeHand(hands.L, target.clone(), leftQ, [clamp01(fingers.y)], elbow);
      if (carry && view.kind === "hold") {
        // The ring leaves with the left hand: keep its pinch point on the left pinch.
        if (!carried) {
          model.pin.getWorldQuaternion(ringOffset);
          ringOffset.premultiply(leftQ.clone().invert());
          carried = true;
        }
        const pinParent = model.pin.parent!;
        pinParent.updateMatrixWorld(true);
        // Pin world rotation = left rotation × offset; position puts the pinch on the target.
        const worldQ = leftQ.clone().multiply(ringOffset);
        const parentQ = pinParent.getWorldQuaternion(new THREE.Quaternion());
        model.pin.quaternion.copy(parentQ.invert().multiply(worldQ));
        model.pin.updateMatrixWorld(true);
        const now = v.copy(model.pinchInPin).applyMatrix4(model.pin.matrixWorld);
        const delta = target.clone().sub(now);
        const local = pinParent.worldToLocal(
          model.pin.getWorldPosition(new THREE.Vector3()).add(delta),
        );
        model.pin.position.copy(local);
      } else carried = false;
    },
    dispose() {
      stopped = true;
      mixer?.stopAllAction();
      if (mixer && rig) mixer.uncacheRoot(rig);
      grenadeInstance?.dispose();
      armsInstance?.dispose();
      for (const geometry of owned.geometry) geometry.dispose();
      for (const material of owned.materials) material.dispose();
      for (const texture of owned.textures) texture.dispose();
      arms.release();
      grenadeAsset.release();
      root.removeFromParent();
    },
  };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const IDENTITY = new THREE.Quaternion();
const MAX_FOREARM_STRETCH = 4;
/** Most the wrist bends between glove and sleeve to follow the elbow (radians). */
const MAX_WRIST_BEND = THREE.MathUtils.degToRad(40);

/** The palm's centre on the glove: the most palmward point near the palm's middle. */
function palmCentre(
  gloves: THREE.BufferGeometry,
  inst: THREE.Object3D,
  side: Side,
  frame: HandFrame,
  inArms: (v: THREE.Vector3) => THREE.Vector3,
  dirInArms: (v: THREE.Vector3) => THREE.Vector3,
) {
  const at = (name: string) =>
    inArms(inst.worldToLocal(inst.getObjectByName(name)!.getWorldPosition(new THREE.Vector3())));
  const centre = at(`Hand_${side}`)
    .add(at(bone(side, FINGERS.middle)))
    .add(at(bone(side, FINGERS.ring)))
    .multiplyScalar(1 / 3);
  const reach = at(`Hand_${side}`).distanceTo(at(bone(side, FINGERS.middle))) * 0.45;
  return extremeVertex(gloves, centre, reach, dirInArms(frame.palm).normalize());
}

/** The left thumb's and index fingertip's pads (the pinch). */
function pinchPads(
  gloves: THREE.BufferGeometry,
  inst: THREE.Object3D,
  frame: HandFrame,
  inArms: (v: THREE.Vector3) => THREE.Vector3,
  dirInArms: (v: THREE.Vector3) => THREE.Vector3,
): [number, number] {
  const at = (name: string) =>
    inArms(inst.worldToLocal(inst.getObjectByName(name)!.getWorldPosition(new THREE.Vector3())));
  const pad = (base: number) => {
    const tip = at(`${bone("L", base + 2)}_end`),
      joint = at(bone("L", base + 2));
    const distal = tip.clone().sub(joint).normalize();
    const facing = dirInArms(frame.palm)
      .multiplyScalar(0.8)
      .addScaledVector(distal, 0.6)
      .normalize();
    return extremeVertex(gloves, tip, tip.distanceTo(joint) * 0.9, facing);
  };
  return [pad(THUMB), pad(FINGERS.index)];
}
