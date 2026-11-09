import * as THREE from "three";
import { cloneAuthoredModel, retainAuthoredAsset } from "../authored-assets";
import {
  createGloveMaterial,
  sharpenViewmodelTextures,
  type ViewmodelVariant,
} from "../authored-viewmodel";
import { fitContinuousForearms, HANDGUARD_GRIP, poseRifleHands } from "../fitted-rifle-hands";
import { createSkinMaterial, sleeveMesh, sleeveParts } from "../karambit-viewmodel";
import { BOMB_MODELS } from "../model-assets";
import { createC4Screen } from "./c4-screen";
import {
  basisQuaternion,
  bone,
  extremeVertex,
  f,
  FINGERS,
  handFrame,
  poseHand,
  vertex,
  type HandFrame,
  type HandPose,
  type Side,
} from "../hand-rig";
import {
  C4_EXIT_SECONDS,
  cuesBetween,
  DEFUSE_EXIT_SECONDS,
  defuseClipTime,
  defuseDisplay,
  keyDepressions,
  plantDisplay,
  readC4Metadata,
  type C4Metadata,
  type C4View,
} from "./c4-timeline";

/**
 * First-person C4 on a team's existing arms (Terrorist: snow-camo smock sleeves and the shared
 * gloves). Nothing about the arms is replaced: the same rig, glove mesh, forearm builder and
 * sleeves the rifles and the Karambit use are fitted to the device here.
 *
 * - Fingers: each hand's poses are posed on the rig (finger joints only; wrists and knuckles
 *   stay where the rig has them) and baked once at load like the rifle grips. The right hand's
 *   base pose points the index finger; "press" (index flexed onto a key) and "relaxed" are morph
 *   targets, so the index finger bends to press while the other fingers stay put. The left hand
 *   closes round the device ("hold") with an "open" morph for the release.
 * - Contact: the clip (art/blender/c4) authors where the right index fingertip's pad must be on
 *   the keypad (`C4_Tip`) and how the hand is turned (`C4_HandR`). Each frame the wrist is placed
 *   so the pad, blended between the pointing and pressing poses exactly as the morph blends the
 *   glove, lands on that point: the finger always touches the authored key and never sinks
 *   through it. The left palm is placed on `C4_PalmL` the same way.
 * - Keys move only under the fingertip, by how far the pad is below the cap (keyDepressions).
 * - The LCD (c4-screen) and LEDs follow the clip's cues; sounds go out through `onCue`.
 * - Forearms and sleeves turn with their hand, so each glove cuff stays seated in its sleeve.
 *
 * Cosmetic only: `update` is driven by the room's plant state; nothing here decides anything.
 */
/** Right hand: index pointing, the other fingers loosely closed, thumb along the middle finger. */
const POINT: HandPose = {
  index: f(6, 12, 8, 2),
  middle: f(62, 88, 42, -2),
  ring: f(70, 90, 44, -6),
  little: f(76, 86, 42, -11),
  thumb: [
    [0.75, 0.45, -0.1],
    [0.7, 0.5, -0.35],
    [0.45, 0.55, -0.6],
  ],
};
/** Right hand pressing: the index finger flexes at all three joints (pad down onto the key). */
const PRESS: HandPose = { ...POINT, index: f(24, 30, 16, 2) };
/** Right hand relaxed (reaching in, guiding the device). */
const RELAXED: HandPose = {
  index: f(16, 22, 12, 4),
  middle: f(22, 30, 16, 0),
  ring: f(26, 32, 16, -5),
  little: f(30, 34, 16, -10),
  thumb: [
    [0.75, 0.3, 0.45],
    [0.8, 0.35, 0.35],
    [0.85, 0.35, 0.2],
  ],
};
/** Left hand round the device's side: fingers over the back edge, thumb on the face. */
const HOLD: HandPose = {
  index: f(48, 52, 22, 5),
  middle: f(50, 54, 22, 0),
  ring: f(52, 54, 22, -5),
  little: f(54, 52, 22, -10),
  thumb: [
    [0.55, 0.1, 0.8],
    [0.75, 0.15, 0.6],
    [0.85, 0.3, 0.4],
  ],
};
const OPEN: HandPose = {
  index: f(10, 12, 6, 6),
  middle: f(12, 14, 6, 0),
  ring: f(14, 14, 6, -6),
  little: f(16, 14, 6, -12),
  thumb: [
    [0.55, 0.05, 0.85],
    [0.7, 0.1, 0.7],
    [0.8, 0.15, 0.55],
  ],
};

export function createC4Viewmodel(parent: THREE.Object3D, variant: ViewmodelVariant) {
  const arms = retainAuthoredAsset(variant.asset),
    c4Asset = retainAuthoredAsset(BOMB_MODELS.c4);
  /** Camera space (metres). The clip's root sits here; the arms are under `armsRoot`. */
  const root = new THREE.Group();
  root.name = "c4-first-person";
  root.visible = false;
  parent.add(root);
  const armsRoot = new THREE.Group();
  armsRoot.name = "c4-arms";
  root.add(armsRoot);
  const owned = {
    geometry: [] as THREE.BufferGeometry[],
    materials: [] as THREE.Material[],
    textures: [] as THREE.Texture[],
  };
  const screen = createC4Screen();
  type Hand = {
    wrist: THREE.Group;
    content: THREE.Group;
    forearm: THREE.Group;
    /** Forearm stretch: local +z along the forearm, scaled along it (see stretchForearm). */
    align: THREE.Group;
    armContent: THREE.Group;
    gloves: THREE.Mesh | null;
    /** Wrist (Hand_* joint) at bake, armsRoot space. */
    rest: THREE.Vector3;
    /** Inverse of the rest hand frame (x along the hand, y out of the palm). */
    restInverse: THREE.Quaternion;
    /** Contact point per pose (base, then each morph), armsRoot space. */
    contact: THREE.Vector3[];
    /** Wrist → elbow at bake (unit, armsRoot space) and its length (armsRoot units). */
    forearmRest: THREE.Vector3;
    forearmLength: number;
    /** Where the elbow should be from the wrist (camera space, unit): low and to the side. */
    elbow: THREE.Vector3;
  };
  const makeHand = (side: Side): Hand => {
    const wrist = new THREE.Group(),
      content = new THREE.Group(),
      forearm = new THREE.Group(),
      align = new THREE.Group(),
      unalign = new THREE.Group(),
      armContent = new THREE.Group();
    wrist.name = `c4-wrist-${side}`;
    forearm.name = `c4-forearm-${side}`;
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
      contact: [],
      forearmRest: new THREE.Vector3(),
      forearmLength: 0,
      elbow: (side === "R" ? ELBOW_R : ELBOW_L).clone().normalize(),
    };
  };
  const hands = { R: makeHand("R"), L: makeHand("L") };
  let stopped = false,
    loaded = false,
    meta: C4Metadata | null = null,
    mixer: THREE.AnimationMixer | null = null;
  let clipRoot: THREE.Object3D | null = null;
  type NodeKey =
    | "device"
    | "tip"
    | "handR"
    | "palmL"
    | "fingers"
    | "dWork"
    | "dTipKey"
    | "dTipFree"
    | "dHandR"
    | "dPalmL"
    | "dFingers"
    | "dMix";
  const nodes = {} as Record<NodeKey, THREE.Object3D>;
  const actions = new Map<string, THREE.AnimationAction>();
  const keyMeshes: THREE.Mesh[] = [];
  let leds: THREE.Object3D | null = null;
  let c4Instance: ReturnType<typeof cloneAuthoredModel> | undefined,
    armsInstance: ReturnType<typeof cloneAuthoredModel> | undefined;

  const ready = Promise.all([arms.ready, c4Asset.ready])
    .then(([armsGltf, c4Gltf]) => {
      if (stopped) return;
      meta = readC4Metadata(c4Gltf.scene.userData);
      armsRoot.scale.setScalar(variant.forearms.scale);
      // Bake the hands from a throwaway clone of the team's arm rig (rifle meshes unused).
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
      const inArms = (v: THREE.Vector3) => v.clone().applyMatrix4(toArms);
      const dirInArms = (v: THREE.Vector3) => v.clone().transformDirection(toArms);
      armsRoot.updateWorldMatrix(true, true);
      toArms.copy(armsRoot.matrixWorld).invert().multiply(instance.root.matrixWorld);
      // Right hand: point (base), press, relaxed. Left: hold (base), open.
      const right = [POINT, PRESS, RELAXED].map((pose) => bake("R", pose));
      const left = [HOLD, OPEN].map((pose) => bake("L", pose));
      for (const side of ["R", "L"] as const) {
        const frame = frames[side];
        const hand = hands[side];
        hand.rest.copy(inArms(frame.wrist));
        hand.restInverse
          .copy(basisQuaternion(dirInArms(frame.hand), dirInArms(frame.palm)))
          .invert();
      }
      // Contact points on the baked gloves (same vertex in every pose, so they blend like the
      // morphs): the right index fingertip's pad, the left palm's centre.
      poseHand(instance.root, "R", POINT, frames.R);
      const pad = padVertex(right[0]!.gloves, instance.root, frames.R, inArms, dirInArms);
      hands.R.contact = right.map((b) => vertex(b.gloves, pad));
      poseHand(instance.root, "L", HOLD, frames.L);
      const palm = palmVertex(left[0]!.gloves, instance.root, frames.L, inArms, dirInArms);
      hands.L.contact = left.map((b) => vertex(b.gloves, palm));

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
        for (const b of baked.slice(1)) {
          b.skin.dispose();
        }
        hand.gloves = new THREE.Mesh(geometry, gloveMaterial);
        hand.gloves.name = `c4-gloves-${side}`;
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

      // The device and its control rig.
      c4Instance = cloneAuthoredModel(c4Gltf.scene);
      clipRoot = c4Instance.root;
      root.add(clipRoot);
      for (const [key, name] of [
        ["device", "C4_Device"],
        ["tip", "C4_Tip"],
        ["handR", "C4_HandR"],
        ["palmL", "C4_PalmL"],
        ["fingers", "C4_Fingers"],
        ["dWork", "C4_DWork"],
        ["dTipKey", "C4_DTipKey"],
        ["dTipFree", "C4_DTipFree"],
        ["dHandR", "C4_DHandR"],
        ["dPalmL", "C4_DPalmL"],
        ["dFingers", "C4_DFingers"],
        ["dMix", "C4_DMix"],
      ] as const) {
        const node = clipRoot.getObjectByName(name);
        if (!node) throw new Error(`C4 GLB is missing ${name}`);
        nodes[key] = node;
      }
      clipRoot.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        if (
          o.morphTargetDictionary &&
          Object.keys(o.morphTargetDictionary).some((k) => k.startsWith("press_"))
        )
          keyMeshes.push(o);
        if (o.name === "C4_Screen" || o.parent?.name === "C4_Screen") o.material = screen.material;
      });
      leds = clipRoot.getObjectByName("C4_LedsOn") ?? null;
      mixer = new THREE.AnimationMixer(clipRoot);
      for (const source of c4Gltf.animations) {
        // The defuse clips leave the device to the world (the planted bomb's pose).
        const clip = source.name.startsWith("c4_defuse")
          ? new THREE.AnimationClip(
              source.name,
              source.duration,
              source.tracks.filter((track) => !track.name.startsWith("C4_Device.")),
            )
          : source;
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
    .catch((error) => console.warn("C4 viewmodel unavailable.", error));

  // Per-frame scratch (no allocation in update).
  const v = new THREE.Vector3(),
    target = new THREE.Vector3(),
    contact = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    swing = new THREE.Quaternion(),
    rootInverse = new THREE.Quaternion(),
    tipDevice = new THREE.Vector3(),
    freeTip = new THREE.Vector3(),
    keyTip = new THREE.Vector3(),
    m = new THREE.Matrix4(),
    elbowTo = new THREE.Vector3(),
    deviceInRoot = new THREE.Matrix4(),
    leanAt = new THREE.Vector3(),
    leanQ = new THREE.Quaternion(),
    leanScale = new THREE.Vector3();
  const depressions: Record<string, number> = {};
  let state: C4View["kind"] = "hidden",
    clipTime = 0,
    exitTime = 0,
    lastCueTime = 0;
  let current: THREE.AnimationAction | null = null;

  /**
   * Place a hand so its contact point (blended by `weights`) lands on `at`, the hand turned to
   * `turn`'s frame (x along the hand, y out of the palm).
   */
  function placeHand(
    hand: Hand,
    at: THREE.Vector3,
    turn: THREE.Object3D,
    weights: readonly number[],
    reach?: Reach,
  ) {
    const shoulder = reach?.shoulder;
    armsRoot.worldToLocal(target.copy(at));
    turn.getWorldQuaternion(q).premultiply(rootInverse);
    // Rotation that takes the baked hand's frame to the node's frame.
    q.multiply(hand.restInverse);
    contact.copy(hand.contact[0]!);
    for (let i = 1; i < hand.contact.length; i++)
      contact.addScaledVector(v.copy(hand.contact[i]!).sub(hand.contact[0]!), weights[i - 1] ?? 0);
    contact.sub(hand.rest);
    hand.wrist.position.copy(target).sub(v.copy(contact).applyQuaternion(q));
    if (shoulder) {
      // Reaching down to the bomb: turn the hand part of the way onto the line from the shoulder,
      // so a far bomb is reached with a straight arm rather than a hand bent back at the wrist.
      elbowTo.copy(hand.wrist.position).multiplyScalar(armsRoot.scale.x).sub(shoulder).normalize();
      v.copy(hand.forearmRest).applyQuaternion(q).negate();
      swing.setFromUnitVectors(v, elbowTo);
      q.premultiply(swing.slerp(IDENTITY, 1 - reach!.align));
      hand.wrist.position.copy(target).sub(v.copy(contact).applyQuaternion(q));
    }
    hand.wrist.quaternion.copy(q);
    hand.forearm.position.copy(hand.wrist.position);
    // The forearm turns with the hand, then swings (at most MAX_WRIST_BEND, the wrist taking it)
    // toward a low elbow, so a hand turned to reach the keypad never lifts the elbow high.
    // On the planted bomb (far below the eye) the forearm instead aims at the shoulder, just under
    // the camera, so the arm reaches down from the bottom corner of the view.
    const elbow = shoulder
      ? elbowTo
          .copy(shoulder)
          .sub(v.copy(hand.wrist.position).multiplyScalar(armsRoot.scale.x))
          .normalize()
      : hand.elbow;
    v.copy(hand.forearmRest).applyQuaternion(q);
    const angle = v.angleTo(elbow);
    swing.setFromUnitVectors(v, elbow);
    const limit = reach ? reach.bend : MAX_WRIST_BEND;
    if (angle > limit) swing.slerp(IDENTITY, 1 - limit / angle);
    hand.forearm.quaternion.copy(swing).multiply(q);
    stretchForearm(hand);
    const influences = hand.gloves?.morphTargetInfluences;
    if (influences) for (let i = 0; i < influences.length; i++) influences[i] = weights[i] ?? 0;
  }

  /**
   * Lengthen a forearm (sleeve and skin, along its own axis) until it leaves the view, so an arm
   * reaching a far device (the planted bomb) still comes from beyond the screen edge instead of
   * ending in mid-air. Near the camera (the plant) it is never stretched.
   */
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
    // A stretched sleeve also widens a little toward the viewer (it stands in for the arm nearer
    // the eye, which perspective would show thicker); the cuff end barely changes.
    const widen = Math.min(1.45, 1 + 0.22 * (stretch - 1));
    hand.align.scale.set(widen, widen, stretch);
  }

  /**
   * Defuse: put the device on the planted bomb as the view camera sees it, pulled toward the eye
   * by the factor that brings it within reach (scaling about the eye keeps exactly the same image,
   * so it stays on the world bomb), and size the arms by the same factor so the fingers keep the
   * keypad's proportions (hands at the bomb look as large as hands that far away). The work frame
   * turns so the hands come from the viewer's side however the bomb lies.
   */
  function placeOnWorld(world: THREE.Matrix4, lean: number) {
    root.updateWorldMatrix(true, false);
    deviceInRoot.copy(root.matrixWorld).invert().multiply(world);
    deviceInRoot.decompose(leanAt, leanQ, leanScale);
    const distance = Math.max(0.01, leanAt.length());
    const k = THREE.MathUtils.clamp(DEFUSE_REACH / distance, 0.15, 1);
    // Leaning in (owner, 2026-11-08: the arms reaching the bomb were far too long): the device
    // starts exactly where the planted bomb is seen (scaled about the eye: the same image, the
    // arms sized alike), then comes in along the same line of sight to a life-size device at
    // working distance, as if the defuser leaned over it, so the arms are their natural length.
    const near = leanScale.x * k,
      life = meta!.scale;
    const size = near + (life - near) * lean;
    leanAt.multiplyScalar((DEFUSE_REACH + (DEFUSE_CLOSE - DEFUSE_REACH) * lean) / distance);
    m.compose(leanAt, leanQ, leanScale.setScalar(size));
    m.decompose(nodes.device.position, nodes.device.quaternion, nodes.device.scale);
    armsRoot.scale.setScalar(variant.forearms.scale * (nodes.device.scale.x / meta!.scale));
    // Viewer in device space: the work frame's -y toward it.
    v.set(0, 0, 0).applyMatrix4(m.invert());
    nodes.dWork.quaternion.setFromAxisAngle(Z_AXIS, Math.atan2(v.x, -v.y));
  }

  function play(name: string, fade: number) {
    const next = actions.get(name);
    if (!next || !mixer) return null;
    next.reset();
    next.timeScale = 1;
    next.play();
    if (current && current !== next && fade > 0) current.crossFadeTo(next, fade, false);
    else if (current && current !== next) current.stop();
    current = next;
    return next;
  }

  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    /** Sound cue names as the clip crosses them ("press:7", "armed", "grab", "place", …). */
    onCue: null as ((name: string) => void) | null,
    /**
     * Show what the room's state calls for (stepC4). The plant and the defuse are placed at their
     * `elapsed` (server clock), so a late joiner or a hitch lands on the right key; `dt` advances
     * the exit clips. A defuse needs the planted bomb's device matrix (world) and this view's
     * camera matrices current.
     */
    update(dt: number, view: C4View, bombDevice?: THREE.Matrix4) {
      if (!loaded || !mixer || !meta) return;
      const kind = view.kind;
      if (kind === "hidden") {
        if (state !== "hidden") {
          mixer.stopAllAction();
          current = null;
          screen.reset();
        }
        state = "hidden";
        root.visible = false;
        return;
      }
      const defuse = kind === "defuse" || kind === "defused" || kind === "defuse-cancel";
      if (defuse && !bombDevice) {
        root.visible = false;
        return;
      }
      root.visible = true;
      if (kind === "plant" || kind === "defuse") {
        const name = kind === "plant" ? "c4_plant" : "c4_defuse";
        const action = actions.get(name)!;
        const time =
          kind === "plant"
            ? Math.min(meta.plantSeconds, Math.max(0, view.elapsed))
            : defuseClipTime(meta, view.elapsed, view.total);
        if (state !== kind || current !== action) {
          play(name, 0);
          lastCueTime = time;
        }
        clipTime = time;
        action.time = clipTime;
        action.timeScale = 0;
        mixer.update(0);
        // Sounds for cues crossed since the last frame (skipped after a jump, e.g. a late join).
        if (clipTime - lastCueTime < 0.5)
          for (const cue of cuesBetween(meta, name, lastCueTime, clipTime)) this.onCue?.(cue);
        lastCueTime = clipTime;
      } else {
        // An exit: cross-fade from wherever the plant / defuse is into its exit clip.
        if (state !== kind) {
          const name =
            kind === "complete"
              ? "c4_plant_complete"
              : kind === "cancel"
                ? "c4_plant_cancel"
                : kind === "defused"
                  ? "c4_defuse_complete"
                  : "c4_defuse_cancel";
          const exit = play(name, 0.12);
          if (exit) exit.time = 0;
          exitTime = 0;
          this.onCue?.(kind === "complete" ? "release" : kind === "defused" ? "safe" : "cancel");
        }
        exitTime += dt;
        mixer.update(dt);
        const length =
          kind === "defused" || kind === "defuse-cancel"
            ? DEFUSE_EXIT_SECONDS[kind]
            : C4_EXIT_SECONDS;
        if (exitTime > length + 0.15) root.visible = false;
      }
      state = kind;
      if (defuse) {
        // Lean in over the first moments of the defuse; back out on the way out.
        const lean =
          kind === "defuse"
            ? smooth01(view.elapsed / DEFUSE_LEAN_S)
            : 1 - smooth01(exitTime / DEFUSE_EXIT_SECONDS[kind]);
        placeOnWorld(bombDevice!, lean);
      } else armsRoot.scale.setScalar(variant.forearms.scale);
      root.updateMatrixWorld(true);
      root.getWorldQuaternion(rootInverse).invert();
      armsRoot.updateWorldMatrix(true, false);
      // Fingers: x = index flex, y = relaxed, z = left grip.
      const fingers = (defuse ? nodes.dFingers : nodes.fingers).position;
      if (defuse) {
        const mix = clamp01(nodes.dMix.position.x);
        nodes.dTipFree.getWorldPosition(freeTip);
        nodes.dTipKey.getWorldPosition(keyTip);
        target.copy(freeTip).lerp(keyTip, mix);
      } else nodes.tip.getWorldPosition(target);
      tipDevice.copy(target);
      placeHand(
        hands.R,
        tipDevice,
        defuse ? nodes.dHandR : nodes.handR,
        [clamp01(fingers.x), clamp01(fingers.y)],
        defuse ? DEFUSE_REACH_R : PLANT_REACH_R,
      );
      (defuse ? nodes.dPalmL : nodes.palmL).getWorldPosition(target);
      freeTip.copy(target);
      placeHand(
        hands.L,
        freeTip,
        defuse ? nodes.dPalmL : nodes.palmL,
        [1 - clamp01(fingers.z)],
        defuse ? DEFUSE_REACH_L : PLANT_REACH_L,
      );
      // Keys under the fingertip (device space); display and LEDs.
      nodes.device.worldToLocal(tipDevice);
      keyDepressions(meta, tipDevice, depressions);
      for (const mesh of keyMeshes) {
        const dict = mesh.morphTargetDictionary!,
          influences = mesh.morphTargetInfluences!;
        for (const key in depressions) {
          const index = dict[`press_${key}`];
          if (index !== undefined) influences[index] = depressions[key]!;
        }
      }
      const display =
        kind === "plant" || kind === "cancel"
          ? plantDisplay(meta, clipTime)
          : kind === "complete"
            ? plantDisplay(meta, meta.plantSeconds)
            : kind === "defuse"
              ? defuseDisplay(meta, clipTime, view.elapsed / view.total)
              : kind === "defused"
                ? { mode: "safe" as const, digits: 8, length: 8 }
                : defuseDisplay(meta, clipTime, 0);
      const blink = Math.floor(performance.now() / 250) % 2 === 0;
      screen.paint(display, blink);
      if (leds)
        leds.visible =
          display.mode === "armed" || display.mode === "disarm"
            ? blink
            : display.mode === "entry" && depressionsAny(depressions);
    },
    /** A device-space point (metres) in world space (previews: aim the inspection cameras). */
    deviceToWorld(local: THREE.Vector3, out: THREE.Vector3) {
      if (!loaded) return null;
      nodes.device.updateWorldMatrix(true, false);
      return nodes.device.localToWorld(out.copy(local));
    },
    /** Fingertip pad, device and key positions for tests and previews (device space). */
    debug() {
      if (!loaded || !meta) return null;
      return { tip: nodes.tip.position.clone(), depressions: { ...depressions }, meta };
    },
    dispose() {
      stopped = true;
      mixer?.stopAllAction();
      if (mixer && clipRoot) mixer.uncacheRoot(clipRoot);
      c4Instance?.dispose();
      armsInstance?.dispose();
      screen.dispose();
      for (const geometry of owned.geometry) geometry.dispose();
      for (const material of owned.materials) material.dispose();
      for (const texture of owned.textures) texture.dispose();
      arms.release();
      c4Asset.release();
      root.removeFromParent();
    },
  };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const Z_AXIS = new THREE.Vector3(0, 0, 1);
/** Preview-only arm tuning (scripts/fps/c4-capture --arm). */
const ARM = ((globalThis as { __c4arm?: Record<string, number | number[]> }).__c4arm ?? {}) as {
  elbowR?: number[];
  elbowL?: number[];
  shoulderR?: number[];
  shoulderL?: number[];
  stretch?: number;
  bend?: number;
  bendDefuse?: number;
  align?: number;
  reach?: number;
  close?: number;
  plantAlign?: number;
  plantShoulderR?: number[];
  plantShoulderL?: number[];
};
const vec = (a: number[] | undefined, x: number, y: number, z: number) =>
  a ? new THREE.Vector3(a[0], a[1], a[2]) : new THREE.Vector3(x, y, z);
/** Working distance (m) of the life-size device once leaned in (see placeOnWorld). */
const DEFUSE_CLOSE = (ARM.close as number | undefined) ?? 0.5;
/** How long the lean in takes at the start of a defuse (s). */
const DEFUSE_LEAN_S = 0.55;
const smooth01 = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
/** Eye distance (m) the defuse first brings the planted device to (see placeOnWorld). */
const DEFUSE_REACH = (ARM.reach as number | undefined) ?? 0.6;
/**
 * Longest a forearm is drawn, relative to its length (see stretchForearm). Kept short (owner,
 * 2026-11-08: the arms were far too long): the arms reach from shoulders just under the view and
 * the devices sit within natural reach, so a forearm leaves the screen at about its own length.
 */
const MAX_FOREARM_STRETCH = ARM.stretch ?? 1.6;
const IDENTITY = new THREE.Quaternion();
/** Elbow directions from the wrist (camera space): below and outside each hand. */
const ELBOW_R = vec(ARM.elbowR, 0.35, -0.9, 0.3),
  ELBOW_L = vec(ARM.elbowL, -0.5, -0.8, 0.35);
/**
 * How a hand reaches its device: forearms aimed at a shoulder (camera space, m) just under and
 * beside the view, the hand turned `align` of the way onto that line (the rest bent at the wrist,
 * at most `bend`), so the forearm runs straight out of the glove to the screen edge.
 */
type Reach = { shoulder: THREE.Vector3; align: number; bend: number };
const deg = THREE.MathUtils.degToRad;
/** Plant: the right forearm comes up from the lower right, the left from the lower left. */
const PLANT_REACH_R: Reach = {
    shoulder: vec(ARM.plantShoulderR, 0.65, -0.42, 0.3),
    align: ARM.plantAlign ?? 0.6,
    bend: deg(ARM.bend ?? 22),
  },
  PLANT_REACH_L: Reach = {
    shoulder: vec(ARM.plantShoulderL, -0.3, -0.45, 0.15),
    align: ARM.plantAlign ?? 0.6,
    bend: deg(ARM.bend ?? 22),
  };
/** Defuse (kneeling over the bomb): both forearms from just under the view, wrists near straight. */
const DEFUSE_REACH_R: Reach = {
    shoulder: vec(ARM.shoulderR, 0.2, -0.32, 0.05),
    align: ARM.align ?? 0.9,
    bend: deg(ARM.bendDefuse ?? 18),
  },
  DEFUSE_REACH_L: Reach = {
    shoulder: vec(ARM.shoulderL, -0.2, -0.32, 0.05),
    align: ARM.align ?? 0.9,
    bend: deg(ARM.bendDefuse ?? 18),
  };
/** Most the wrist bends between glove and sleeve to keep the elbow low (radians). */
const MAX_WRIST_BEND = deg(45);
function depressionsAny(d: Record<string, number>) {
  for (const k in d) if (d[k]! > 0.5) return true;
  return false;
}

/** The index fingertip's pad on the glove: the surface point under the last phalanx that
 * faces the key (palmward and a little forward of the tip). */
function padVertex(
  gloves: THREE.BufferGeometry,
  inst: THREE.Object3D,
  frame: HandFrame,
  inArms: (v: THREE.Vector3) => THREE.Vector3,
  dirInArms: (v: THREE.Vector3) => THREE.Vector3,
) {
  const at = (name: string) =>
    inArms(inst.worldToLocal(inst.getObjectByName(name)!.getWorldPosition(new THREE.Vector3())));
  const tip = at(`${bone("R", FINGERS.index + 2)}_end`),
    joint = at(bone("R", FINGERS.index + 2));
  const distal = tip.clone().sub(joint).normalize();
  const reach = tip.distanceTo(joint) * 0.9;
  const facing = dirInArms(frame.palm).multiplyScalar(0.8).addScaledVector(distal, 0.6).normalize();
  return extremeVertex(gloves, tip, reach, facing);
}
/** The left palm's centre on the glove: the most palmward point near the palm's middle. */
function palmVertex(
  gloves: THREE.BufferGeometry,
  inst: THREE.Object3D,
  frame: HandFrame,
  inArms: (v: THREE.Vector3) => THREE.Vector3,
  dirInArms: (v: THREE.Vector3) => THREE.Vector3,
) {
  const at = (name: string) =>
    inArms(inst.worldToLocal(inst.getObjectByName(name)!.getWorldPosition(new THREE.Vector3())));
  const centre = at("Hand_L")
    .add(at(bone("L", FINGERS.middle)))
    .add(at(bone("L", FINGERS.ring)))
    .multiplyScalar(1 / 3);
  const reach = at("Hand_L").distanceTo(at(bone("L", FINGERS.middle))) * 0.45;
  return extremeVertex(gloves, centre, reach, dirInArms(frame.palm).normalize());
}
