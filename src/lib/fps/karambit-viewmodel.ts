import * as THREE from "three";
import { cloneAuthoredModel, retainAuthoredAsset } from "./authored-assets";
import {
  createGloveMaterial,
  sharpenViewmodelTextures,
  type ViewmodelVariant,
} from "./authored-viewmodel";
import {
  fitContinuousForearms,
  HANDGUARD_GRIP,
  poseRifleHands,
  wrapOntoForearm,
  type ForearmPath,
} from "./fitted-rifle-hands";
import { applyVeinTint, createForearmDetailTexture } from "./forearm-detail";
import { ARENA_MODELS } from "./model-assets";
import {
  basisQuaternion,
  bone,
  f,
  FINGERS,
  handFrame,
  poseHand,
  THUMB,
  type HandPose,
} from "./hand-rig";
import { KarambitAnimator, type KarambitControls } from "./karambit-animator";

/**
 * First-person Karambit on a team's existing arms, both hands in view (Police: steel-blue duty
 * sleeves and watch; Terrorist: snow-camo smock). Nothing about the arms is replaced: the same
 * rig, gloves, forearm builder and sleeves the rifles, the grenades and the C4 use are fitted to
 * the knife here, each team from its own GLB (no mesh or material is shared between teams).
 *
 * - Right hand (fistGrip): rebuilt round the knife as a reverse-grip hammer fist. The handle lies
 *   across the fist along the knuckle line, the index finger runs through the finger ring, the
 *   other fingers wrap the handle and the thumb closes over them. The knife rides the hand.
 *   Opening is baked per finger (middle, ring, little, thumb) as morph targets, so the clips can
 *   open and close the fingers one after another for spins while the index keeps the ring.
 * - Left hand: relaxed and slightly open (base), with a loose-fist and an open-spread morph.
 * - Stance (KARAMBIT_STANCE): both wrists placed in camera space with the forearms rising from
 *   the bottom corners toward elbows off screen, so no elbow is ever in view; each forearm aims
 *   at its elbow (the wrist bends at most MAX_WRIST_BEND) and is stretched until it leaves the
 *   frustum. Horizontal placement follows the screen's aspect and the camera's field of view.
 * - Animation: Blender-authored clips on a control rig (art/blender/karambit) played by
 *   KarambitAnimator (three's AnimationMixer). Each frame the controls offset and turn each wrist
 *   in its own frame, spin the knife about its ring and set the finger morphs.
 *
 * Cosmetic only: never reads or writes gameplay state.
 */
/** The weapon group's rest: the hands are placed in camera space by the stance instead. */
export const KARAMBIT_VIEWMODEL_REST = {
  x: 0,
  y: 0,
  z: 0,
  pitch: 0,
  yaw: 0,
  roll: 0,
};
type StanceHand = {
  /** Wrist pivot (camera space, metres) at 16:9 and a 60° vertical field of view. */
  wrist: readonly number[];
  /** Hand axis, wrist to middle knuckle (camera space: x right, y up, z toward the viewer). */
  arm: readonly number[];
  /** Which way the palm faces (made square to the arm). */
  palm: readonly number[];
  /** Elbow, off screen: the forearm aims at it from the wrist (camera space, metres). */
  elbow: readonly number[];
};
/**
 * The right hand's carry: the fist low at the lower right, palm down with the back of the hand to
 * the camera, the Karambit's ring at the front of the fist and the blade curving up from its
 * outer edge. The wrist goes exactly where the former one-hand view held it (that view's weapon
 * group rest and wrist offset), so the knife keeps its place on screen; only the forearm changed:
 * it now runs straight back from the wrist to an elbow below the bottom right of the screen.
 */
const RIGHT_CARRY = {
  rest: { x: 0.13, y: 0.03, z: -0.21, pitch: 0.28, yaw: -0.15, roll: 0.38 },
  offset: [-0.07, -0.06, 0],
  arm: [-0.35, 0.35, -1],
  palm: [0.3, -1, -0.6],
} as const;
/** Wrist to elbow along the forearm (camera-space metres) for an elbow solved from the stance:
 * on the forearm's own line, so the wrist is straight at rest. */
const FOREARM_REACH = 0.42;
const STANCE_DEFAULT: Record<"R" | "L", StanceHand> = {
  // Wrist solved from RIGHT_CARRY at load; elbow straight behind the wrist (empty = solved).
  // The fist palm down as before, tipped up a little so the straight forearm leaves the screen at
  // the bottom right rather than the right edge.
  R: { wrist: [], arm: [-0.3, 0.6, -0.95], palm: [0.3, -1, -0.25], elbow: [] },
  // Left: the mirror of the knife hand's carry, open: palm down, back of the hand to the camera,
  // fingers relaxed and together reaching forward and a little inward, thumb on the inner side,
  // the forearm rising diagonally from the bottom left.
  L: {
    wrist: [-0.16, -0.12, -0.28],
    arm: [0.75, 0.3, -0.6],
    palm: [0, -1, -0.25],
    elbow: [],
  },
};
/**
 * The two-hand stance (preview overrides: `__stance`). Left hand lower left, open and ready;
 * right fist with the Karambit lower right; the centre clear for aiming.
 */
export const KARAMBIT_STANCE: Record<"R" | "L", StanceHand> = {
  R: {
    ...STANCE_DEFAULT.R,
    ...(globalThis as { __stance?: Partial<Record<"R" | "L", Partial<StanceHand>>> }).__stance?.R,
  },
  L: {
    ...STANCE_DEFAULT.L,
    ...(globalThis as { __stance?: Partial<Record<"R" | "L", Partial<StanceHand>>> }).__stance?.L,
  },
};
/** Reference framing the stance is authored for. */
const STANCE_ASPECT = 16 / 9,
  STANCE_TAN = Math.tan(THREE.MathUtils.degToRad(30));
/**
 * Display size of the Karambit relative to the 19 cm model, about its finger ring so the ring
 * stays on the index finger. Cosmetic only: reach and hits are the server's (combat.ts KNIFE).
 */
export const KARAMBIT_SCALE = 1.2;
/** Most the wrist bends between glove and sleeve to keep the forearm on its elbow (radians). */
const MAX_WRIST_BEND = THREE.MathUtils.degToRad(28);
const MAX_FOREARM_STRETCH = 4;
/**
 * The fist round the Karambit's handle, in the hand's own frame (instance units; the rig's hand
 * is about 1.45x life size, like the knife at KARAMBIT_SCALE). `palm` is toward the palm from the
 * knuckle line, `back` toward the wrist from it.
 *
 * The knife is held flat to the palm: its 2.7-unit thickness runs palmward and its 6.5-unit
 * height runs back from the knuckles, spine forward against the proximal phalanges, finger
 * grooves back toward the heel.
 */
const GRIP_DEFAULT = {
  /** Knife mid-plane (and ring hole) from the knuckle line, toward the palm. */
  handlePalm: 0.034,
  /** Handle axis (through the ring pivot) back from the knuckle line. */
  handleBack: 0.026,
  /** Handle rake: the little-finger end sits this much further back per unit across. */
  rake: 0.12,
  /** Proximal phalanx lean forward of straight palmward (radians), in front of the spine. */
  lean: 0.08,
  /** Fingertip round the grooved back edge: back of the handle axis, toward the palm from it. */
  tipBack: 0.057,
  tipPalm: 0,
};
const GRIP = {
  ...GRIP_DEFAULT,
  ...(globalThis as { __grip?: Partial<typeof GRIP_DEFAULT> }).__grip,
};
/**
 * Karambit model landmarks in ring-pivot space (the authored model at KARAMBIT_SCALE, measured):
 * the finger-ring hole's centre relative to the pivot, along the handle (+y, away from it) and
 * toward the blade's curve (+z).
 */
const RING_HOLE = { y: 0.018, z: 0.016 };

/** Index fingertip and thumb tip the fist is built from (instance space). */
const START_INDEX_TIP = new THREE.Vector3(-0.045, -0.112, -0.236);
const START_THUMB_TIP = new THREE.Vector3(-0.03, -0.125, -0.19);

/** Left hand: relaxed, fingers loosely curled down (base pose; owner's reference, 2026-11-08). */
const RELAX_L: HandPose = {
  index: f(28, 40, 20, 6),
  middle: f(31, 44, 22, 1),
  ring: f(34, 47, 23, -3),
  little: f(37, 50, 24, -8),
  // Lying forward along the side of the curled index finger, at its level: no flap of thumb
  // hanging below the palm, as in the reference.
  thumb: [
    [0.6, 0.25, 0.3],
    [0.9, 0, -0.05],
    [0.85, 0.15, -0.35],
  ],
};
/** The relaxed left pose (preview override: `__relaxL`, [mcp, pip, dip, spread] degrees). */
function relaxL(): HandPose {
  const o = (globalThis as { __relaxL?: Record<string, number[] | number[][]> }).__relaxL;
  if (!o) return RELAX_L;
  const g = (k: "index" | "middle" | "ring" | "little") =>
    o[k] ? f(...(o[k] as [number, number, number, number])) : RELAX_L[k];
  return {
    index: g("index"),
    middle: g("middle"),
    ring: g("ring"),
    little: g("little"),
    thumb: (o["thumb"] as HandPose["thumb"] | undefined) ?? RELAX_L.thumb,
  };
}
/** Left hand: a loose fist (bracing, the counterweight of a heavy stab). */
const CURL_L: HandPose = {
  index: f(50, 64, 32, 2),
  middle: f(55, 70, 34, 0),
  ring: f(59, 72, 34, -3),
  little: f(63, 72, 34, -6),
  thumb: [
    [0.55, 0.38, 0.74],
    [0.58, 0.58, 0.55],
    [0.52, 0.72, 0.42],
  ],
};
/** Left hand: open, fingers extended and a little apart (balance in a swing). */
const OPEN_L: HandPose = {
  index: f(10, 16, 8, 5),
  middle: f(12, 18, 9, 1),
  ring: f(14, 20, 10, -3),
  little: f(16, 22, 10, -7),
  thumb: [
    [0.5, 0.08, 0.88],
    [0.66, 0.1, 0.74],
    [0.78, 0.12, 0.6],
  ],
};

type BoneName = string;

export function createKarambitViewmodel(parent: THREE.Object3D, variant: ViewmodelVariant) {
  const arms = retainAuthoredAsset(variant.asset),
    knifeAsset = retainAuthoredAsset(ARENA_MODELS.karambit);
  const root = new THREE.Group();
  root.name = "karambit-first-person";
  root.visible = false;
  parent.add(root);
  /** The arms at the team's forearm scale; camera-space metres divide by it. */
  const armsRoot = new THREE.Group();
  armsRoot.name = "karambit-arms";
  root.add(armsRoot);
  type Hand = {
    /** Wrist pivot: the glove (and on the right the knife) turn about it. */
    wrist: THREE.Group;
    content: THREE.Group;
    /** Forearm pivot at the wrist; `align` stretches it along its own axis. */
    forearm: THREE.Group;
    align: THREE.Group;
    armContent: THREE.Group;
    gloves: THREE.Mesh | null;
    /** Wrist joint in arms space (rest). */
    rest: THREE.Vector3;
    /** Inverse of the rest hand frame (hand axis, palm) in arms space. */
    restInverse: THREE.Quaternion;
    /** Wrist to the forearm's far end in the rest pose (unit, arms space) and its length. */
    forearmRest: THREE.Vector3;
    forearmLength: number;
  };
  const makeHand = (side: "R" | "L"): Hand => {
    const wrist = new THREE.Group(),
      content = new THREE.Group(),
      forearm = new THREE.Group(),
      align = new THREE.Group(),
      unalign = new THREE.Group(),
      armContent = new THREE.Group();
    wrist.name = `karambit-wrist-${side}`;
    forearm.name = `karambit-forearm-${side}`;
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
      forearmRest: new THREE.Vector3(),
      forearmLength: 0,
    };
  };
  const hands = { R: makeHand("R"), L: makeHand("L") };
  /** Knife pivot at the ring centre (in right wrist content space); spins about its local x. */
  const ringPivot = new THREE.Group();
  ringPivot.name = "karambit-ring";
  const knifeHolder = new THREE.Group();
  ringPivot.add(knifeHolder);
  hands.R.content.add(ringPivot);
  const ringBase = new THREE.Quaternion();
  const owned = {
    geometry: [] as THREE.BufferGeometry[],
    materials: [] as THREE.Material[],
    textures: [] as THREE.Texture[],
  };
  let stopped = false,
    loaded = false,
    animator: KarambitAnimator | null = null;
  /** Stance wrists and elbows (camera space at 16:9, 60°), solved once at load. */
  const resolved = {
    R: { wrist: new THREE.Vector3(), elbow: new THREE.Vector3() },
    L: { wrist: new THREE.Vector3(), elbow: new THREE.Vector3() },
  };
  /** Stance frames (camera space) for each hand, solved once. */
  const stanceTurn = { R: new THREE.Quaternion(), L: new THREE.Quaternion() };
  let knifeInstance: ReturnType<typeof cloneAuthoredModel> | undefined,
    armsInstance: ReturnType<typeof cloneAuthoredModel> | undefined;

  const ready = Promise.all([arms.ready, knifeAsset.ready])
    .then(([armsGltf, knifeGltf]) => {
      if (stopped) return;
      const scale = variant.forearms.scale;
      armsRoot.scale.setScalar(scale);
      // Bake the hands from a throwaway clone of the team's arm rig (rifle meshes unused).
      const instance = (armsInstance = cloneAuthoredModel(armsGltf.scene));
      const holder = new THREE.Group();
      armsRoot.add(holder);
      holder.add(instance.root);
      root.updateWorldMatrix(true, true);
      const arm = instance.root.getObjectByName("FPArms") as THREE.SkinnedMesh;
      const delta = poseRifleHands(instance.root, HANDGUARD_GRIP);
      const frameL = handFrame(instance.root, "L");
      // handFrame reads the palm side from the rifle grip's finger curl, which on this rig's
      // left hand points to the back of the hand: flip it, so flexion curls toward the real palm
      // and the stance's palm direction is the real palm.
      frameL.palm.negate();
      // Right: the hammer fist round the knife (fistGrip → knife frame and hand anatomy).
      fitChain(instance.root, FINGERS.index, START_INDEX_TIP);
      fitThumb(instance.root, START_THUMB_TIP);
      const grip = fistGrip(instance.root, armsRoot);
      // The fist's joints keep their aim; each bone's roll comes back from the bind pose (the
      // rifle's trigger hand leaves the middle fingertip twisted).
      if ((globalThis as { __rerollR?: boolean }).__rerollR !== false)
        reroll(instance.root, arm, "R");
      const closedPose = snapshot(instance.root, "Hand_R");
      // Forearms baked straight out of each glove cuff (along the hand bone, not bent toward the
      // rifle's elbows): the stance aims each hand so its forearm already points at its elbow,
      // so the sleeve stays seated in the cuff instead of swinging away from it.
      armsRoot.updateWorldMatrix(true, true);
      const fromWorld = armsRoot.matrixWorld.clone().invert();
      const straight = (side: "L" | "R") =>
        new THREE.Vector3(0, -1, 0)
          .transformDirection(instance.root.getObjectByName(`Hand_${side}`)!.matrixWorld)
          .transformDirection(fromWorld)
          .multiplyScalar(variant.forearms.elbow[side].length());
      const shape = { ...variant.forearms, elbow: { L: straight("L"), R: straight("R") } };
      const bake = () => {
        const built = fitContinuousForearms(arm, armsRoot, delta, shape);
        // The rig's glove fingers are slim for a weapon grip seen edge-on; both hands are held
        // open and close to the camera here, so the fingers are filled out a little.
        for (const side of ["L", "R"] as const)
          thickenFingers(built[side].gloves, instance.root, armsRoot, side, FINGER_FILL);
        return built;
      };
      // The left thumb is posed like the fingers (previews can keep the rig's own thumb bones:
      // `__keepThumbL`, how many from the base).
      const thumbL = [0, 1, 2].map((i) => instance.root.getObjectByName(bone("L", THUMB + i))!);
      const thumbRest = thumbL.map((b) => b.quaternion.clone());
      const keepThumb = (globalThis as { __keepThumbL?: number }).__keepThumbL ?? 0;
      const relaxLeft = (pose: HandPose) => {
        poseHand(instance.root, "L", pose, frameL);
        reroll(instance.root, arm, "L");
        for (let i = 0; i < keepThumb; i++) thumbL[i]!.quaternion.copy(thumbRest[i]!);
        instance.root.updateWorldMatrix(true, true);
      };
      relaxLeft(relaxL());
      const base = bake();
      // Right morphs: each finger (and the thumb) opened on its own, index still in the ring.
      const rightMorphs: THREE.BufferGeometry[] = [];
      for (const open of [
        () => openFinger(instance.root, FINGERS.middle),
        () => openFinger(instance.root, FINGERS.ring),
        () => openFinger(instance.root, FINGERS.little),
        () => openThumb(instance.root),
      ]) {
        restore(closedPose);
        open();
        if ((globalThis as { __rerollR?: boolean }).__rerollR !== false)
          reroll(instance.root, arm, "R");
        const built = bake();
        rightMorphs.push(built.R.gloves);
        for (const g of [built.R.skin, built.L.gloves, built.L.skin]) g.dispose();
      }
      restore(closedPose);
      // Left morphs: a loose fist and an open spread.
      const leftMorphs: THREE.BufferGeometry[] = [];
      for (const pose of [CURL_L, OPEN_L]) {
        relaxLeft(pose);
        const built = bake();
        leftMorphs.push(built.L.gloves);
        for (const g of [built.L.skin, built.R.gloves, built.R.skin]) g.dispose();
      }
      armsRoot.updateWorldMatrix(true, true);
      const toArms = new THREE.Matrix4()
        .copy(armsRoot.matrixWorld)
        .invert()
        .multiply(instance.root.matrixWorld);
      hands.R.rest.copy(
        armsRoot.worldToLocal(
          instance.root.getObjectByName("Hand_R")!.getWorldPosition(new THREE.Vector3()),
        ),
      );
      hands.R.restInverse.copy(basisQuaternion(grip.hand, grip.palm)).invert();
      hands.L.rest.copy(frameL.wrist).applyMatrix4(toArms);
      hands.L.restInverse
        .copy(
          basisQuaternion(
            frameL.hand.clone().transformDirection(toArms),
            frameL.palm.clone().transformDirection(toArms),
          ),
        )
        .invert();

      const gloveMaterial = createGloveMaterial(
        (Array.isArray(arm.material)
          ? arm.material[0]!
          : arm.material) as THREE.MeshStandardMaterial,
      );
      owned.materials.push(gloveMaterial);
      // The knife holds both hands large and close to the camera: bring out the glove's stitching,
      // padding and leather grain (stronger relief, a little more sheen and sky light).
      if ((globalThis as { __gloveTune?: boolean }).__gloveTune !== false) {
        gloveMaterial.normalScale.multiplyScalar(1.7);
        gloveMaterial.color.setScalar(1.16);
        gloveMaterial.sheen = 0.42;
        gloveMaterial.sheenColor.set(0x4c4e55);
        gloveMaterial.sheenRoughness = 0.5;
        gloveMaterial.clearcoat = 0.08;
        gloveMaterial.clearcoatRoughness = 0.5;
        gloveMaterial.envMapIntensity = 0.95;
      }
      const sleeves = sleeveParts(instance.root, variant.arms, owned.geometry);
      // A full-length duty sleeve covers the forearm; only the rolled olive sleeve shows skin.
      const skin = sleeves.duty ? null : createSkinMaterial(owned);
      for (const [side, morphs] of [
        ["R", rightMorphs],
        ["L", leftMorphs],
      ] as const) {
        const hand = hands[side];
        const built = base[side];
        const geometry = built.gloves;
        geometry.morphAttributes.position = morphs.map((m) => m.getAttribute("position"));
        geometry.morphAttributes.normal = morphs.map((m) => m.getAttribute("normal"));
        geometry.morphTargetsRelative = false;
        owned.geometry.push(geometry, ...morphs);
        hand.gloves = new THREE.Mesh(geometry, gloveMaterial);
        hand.gloves.name = `karambit-gloves-${side}`;
        hand.gloves.morphTargetInfluences = morphs.map(() => 0);
        hand.content.add(hand.gloves);
        const armParts: THREE.Mesh[] = [];
        if (skin) {
          owned.geometry.push(built.skin);
          armParts.push(new THREE.Mesh(built.skin, skin));
        } else built.skin.dispose();
        for (const part of sleeves.parts)
          armParts.push(sleeveMesh(part, built.path, variant, owned.geometry));
        hand.forearmRest
          .copy(built.path.point(0, 0, -built.path.length, new THREE.Vector3()))
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
      // The sleeves keep using this clone's materials; it is disposed with the viewmodel.
      holder.removeFromParent();

      // Knife: ring on the curled index finger, handle through the fist.
      knifeInstance = cloneAuthoredModel(knifeGltf.scene);
      const knifeMesh = knifeInstance.root.getObjectByName("Karambit")!;
      // Keep its own transform: meshopt quantisation stores positions scaled on the node.
      knifeMesh.removeFromParent();
      // Knife space is metres; the arms are scaled.
      knifeHolder.add(knifeMesh);
      knifeHolder.scale.setScalar(KARAMBIT_SCALE / scale);
      ringPivot.position.copy(grip.ring);
      ringBase.copy(grip.rotation);
      ringPivot.quaternion.copy(ringBase);
      for (const material of materialsOf(knifeMesh)) {
        if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = 1.15;
      }
      for (const side of ["R", "L"] as const) {
        const s = KARAMBIT_STANCE[side];
        stanceTurn[side].copy(basisQuaternion(vec(s.arm), vec(s.palm)));
      }
      // The right wrist: the Karambit's ring stays where the former one-hand view held it (that
      // view's weapon-group rest and wrist offset); the fist is turned about it to the stance.
      if (!KARAMBIT_STANCE.R.wrist.length) {
        const carry = RIGHT_CARRY.rest;
        const former = hands.R.rest
          .clone()
          .multiplyScalar(scale)
          .add(new THREE.Vector3(...RIGHT_CARRY.offset))
          .applyQuaternion(
            new THREE.Quaternion().setFromEuler(
              new THREE.Euler(carry.pitch, carry.yaw, carry.roll),
            ),
          )
          .add(new THREE.Vector3(carry.x, carry.y, carry.z));
        const toRing = grip.ring.clone().sub(hands.R.rest).multiplyScalar(scale);
        const formerTurn = basisQuaternion(vec(RIGHT_CARRY.arm), vec(RIGHT_CARRY.palm)).multiply(
          hands.R.restInverse,
        );
        const ringAt = former.add(toRing.clone().applyQuaternion(formerTurn));
        resolved.R.wrist
          .copy(ringAt)
          .sub(toRing.applyQuaternion(stanceTurn.R.clone().multiply(hands.R.restInverse)));
      } else resolved.R.wrist.fromArray(KARAMBIT_STANCE.R.wrist);
      resolved.L.wrist.fromArray(KARAMBIT_STANCE.L.wrist);
      // Elbows: straight behind each wrist along the hand's axis unless the stance places them.
      for (const side of ["R", "L"] as const) {
        const s = KARAMBIT_STANCE[side];
        if (s.elbow.length) resolved[side].elbow.fromArray(s.elbow);
        else
          resolved[side].elbow
            .copy(resolved[side].wrist)
            .addScaledVector(
              hands[side].forearmRest
                .clone()
                .applyQuaternion(stanceTurn[side].clone().multiply(hands[side].restInverse)),
              FOREARM_REACH,
            );
      }
      animator = new KarambitAnimator(
        knifeInstance.root,
        knifeGltf.animations,
        knifeGltf.scene.userData,
      );
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
    .catch((error) => console.warn("Karambit viewmodel unavailable.", error));

  // Per-frame scratch (no allocations in pose).
  const v = new THREE.Vector3(),
    wristAt = new THREE.Vector3(),
    elbowAt = new THREE.Vector3(),
    elbowDir = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    swing = new THREE.Quaternion();
  /** The camera the viewmodel hangs from (for aspect, field of view and the frustum). */
  let camera: THREE.PerspectiveCamera | null = null;
  const findCamera = () => {
    for (let o: THREE.Object3D | null = parent; o; o = o.parent)
      if ((o as THREE.PerspectiveCamera).isPerspectiveCamera)
        return (camera = o as THREE.PerspectiveCamera);
    return null;
  };
  /** Camera-space stance point, kept on the same spot of the screen at any aspect and FOV. */
  function framed(point: THREE.Vector3, out: THREE.Vector3) {
    const cam = camera ?? findCamera();
    const tan = cam ? Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) : STANCE_TAN;
    const aspect = cam?.aspect ?? STANCE_ASPECT;
    // Height follows the field of view; width follows it and the aspect, but ultrawide screens
    // keep the hands in reach of the centre and narrow ones keep them apart.
    const sy = tan / STANCE_TAN,
      sx = sy * THREE.MathUtils.clamp(aspect / STANCE_ASPECT, 0.74, 1.12);
    return out.set(point.x * sx, point.y * sy, point.z);
  }

  function placeHand(
    side: "R" | "L",
    offset: THREE.Vector3,
    turn: THREE.Quaternion,
    elbowOffset: THREE.Vector3,
    morphs: readonly number[],
  ) {
    const hand = hands[side];
    const scale = armsRoot.scale.x || 1;
    framed(resolved[side].wrist, wristAt).add(offset);
    framed(resolved[side].elbow, elbowAt).add(elbowOffset);
    // Wrist: stance frame, turned in its own frame by the clip, applied to the rest hand.
    q.copy(stanceTurn[side]).multiply(turn).multiply(hand.restInverse);
    hand.wrist.position.copy(wristAt).divideScalar(scale);
    hand.wrist.quaternion.copy(q);
    // Forearm: from the wrist toward the elbow, the wrist bending at most MAX_WRIST_BEND.
    hand.forearm.position.copy(hand.wrist.position);
    elbowDir.copy(elbowAt).sub(wristAt).normalize();
    v.copy(hand.forearmRest).applyQuaternion(q);
    const angle = v.angleTo(elbowDir);
    swing.setFromUnitVectors(v, elbowDir);
    if (angle > MAX_WRIST_BEND) swing.slerp(IDENTITY, 1 - MAX_WRIST_BEND / angle);
    hand.forearm.quaternion.copy(swing).multiply(q);
    stretchForearm(hand);
    const influences = hand.gloves?.morphTargetInfluences;
    if (influences)
      for (let i = 0; i < influences.length; i++)
        influences[i] = THREE.MathUtils.clamp(morphs[i] ?? 0, 0, 1);
  }

  /** Lengthen the forearm until its far end is outside the view (never an elbow on screen). */
  function stretchForearm(hand: Hand) {
    const cam = camera ?? findCamera();
    let stretch = 1;
    if (cam) {
      const scale = armsRoot.scale.x;
      const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.04,
        tanH = tanV * cam.aspect;
      const dir = v.copy(hand.forearmRest).applyQuaternion(hand.forearm.quaternion);
      const length = hand.forearmLength * scale;
      // Group offsets (sway, clip framing) are small; the wrist is read in camera space.
      const wx = hand.forearm.position.x * scale + root.parent!.position.x,
        wy = hand.forearm.position.y * scale + root.parent!.position.y,
        wz = hand.forearm.position.z * scale + root.parent!.position.z;
      for (; stretch < MAX_FOREARM_STRETCH; stretch += 0.1) {
        const x = wx + dir.x * length * stretch,
          y = wy + dir.y * length * stretch,
          z = wz + dir.z * length * stretch;
        if (z > -cam.near || Math.abs(x) > -z * tanH || Math.abs(y) > -z * tanV) break;
      }
    }
    const widen = Math.min(1.35, 1 + 0.18 * (stretch - 1));
    hand.align.scale.set(widen, widen, stretch);
  }

  const openR = [0, 0, 0, 0],
    openL = [0, 0];
  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    get animator() {
      return animator;
    },
    /** Apply the animator's controls to the rig. Call after animator.update. */
    pose(controls: KarambitControls) {
      if (!loaded) return;
      openR[0] = 1 - controls.fingers.x;
      openR[1] = 1 - controls.fingers.y;
      openR[2] = 1 - controls.fingers.z;
      openR[3] = 1 - controls.thumb;
      placeHand("R", controls.handPosition, controls.handRotation, controls.elbowR, openR);
      openL[0] = controls.fingersL.x;
      openL[1] = controls.fingersL.y;
      placeHand("L", controls.handLPosition, controls.handLRotation, controls.elbowL, openL);
      ringPivot.quaternion.copy(ringBase).multiply(controls.knifeRotation);
    },
    /** Knife blade tip in `parent` space (for effects), or null before load. */
    bladeTip(target: THREE.Vector3) {
      const tip = knifeHolder.getObjectByName("BladeTip");
      if (!loaded || !tip) return null;
      tip.updateWorldMatrix(true, false);
      return parent.worldToLocal(tip.getWorldPosition(target));
    },
    /** Show for a shader compile (hidden roots are skipped by compileAsync). */
    prepareCompile(show: boolean) {
      if (!loaded) return;
      root.visible = show;
    },
    dispose() {
      stopped = true;
      animator?.dispose();
      knifeInstance?.dispose();
      armsInstance?.dispose();
      for (const geometry of owned.geometry) geometry.dispose();
      for (const material of owned.materials) material.dispose();
      for (const texture of owned.textures) texture.dispose();
      arms.release();
      knifeAsset.release();
      root.removeFromParent();
    },
  };
}

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const IDENTITY = new THREE.Quaternion();
const vec = (v: readonly number[]) => new THREE.Vector3(v[0], v[1], v[2]).normalize();

/** Radial fill of the glove fingers (1 = the rig's own thickness). */
const FINGER_FILL = (globalThis as { __fingerFill?: number }).__fingerFill ?? 1.08;
/**
 * Fill out a baked glove's fingers: each vertex near a finger segment (knuckle to joint to tip)
 * moves away from that segment's axis by `fill`, faded in past the knuckle so the palm and the
 * back of the hand keep their shape, and only radially, so the fingers keep their length.
 */
function thickenFingers(
  gloves: THREE.BufferGeometry,
  inst: THREE.Object3D,
  space: THREE.Object3D,
  side: "L" | "R",
  fill: number,
) {
  if (fill === 1) return;
  space.updateWorldMatrix(true, true);
  const at = (name: string) =>
    space.worldToLocal(inst.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()));
  type Segment = { a: THREE.Vector3; d: THREE.Vector3; len2: number; fade: boolean };
  const segments: Segment[] = [];
  for (const base of [FINGERS.index, FINGERS.middle, FINGERS.ring, FINGERS.little, THUMB]) {
    const joints = [
      at(bone(side, base)),
      at(bone(side, base + 1)),
      at(bone(side, base + 2)),
      at(`${bone(side, base + 2)}_end`),
    ];
    // The thumb's first bone runs inside the palm (the thenar pad): leave it.
    for (let i = base === THUMB ? 1 : 0; i < 3; i++) {
      const d = joints[i + 1]!.clone().sub(joints[i]!);
      segments.push({ a: joints[i]!, d, len2: d.lengthSq(), fade: i === (base === THUMB ? 1 : 0) });
    }
  }
  const positions = gloves.getAttribute("position") as THREE.BufferAttribute;
  const p = new THREE.Vector3(),
    c = new THREE.Vector3(),
    radial = new THREE.Vector3();
  const reach = 0.032;
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    let best: Segment | null = null,
      bestT = 0,
      bestD = Infinity;
    for (const s of segments) {
      const t = c.copy(p).sub(s.a).dot(s.d) / s.len2;
      const tc = Math.min(1, Math.max(0, t));
      const d = c.copy(s.a).addScaledVector(s.d, tc).distanceTo(p);
      if (d < bestD) {
        bestD = d;
        best = s;
        bestT = t;
      }
    }
    if (!best || bestD > reach) continue;
    const w = best.fade ? THREE.MathUtils.smoothstep(bestT, 0.12, 0.4) : 1;
    if (w <= 0) continue;
    c.copy(best.a).addScaledVector(best.d, bestT);
    radial.copy(p).sub(c);
    p.addScaledVector(radial, (fill - 1) * w);
    positions.setXYZ(i, p.x, p.y, p.z);
  }
  positions.needsUpdate = true;
  gloves.computeBoundingSphere();
}

/**
 * Give every finger bone of one hand its anatomical roll back. The rifle pose leaves this rig's
 * left finger bones twisted about their own length by different amounts (from wrapping the
 * hand round the handguard); aiming them elsewhere keeps those twists, so the glove's fingers
 * corkscrew. Each bone keeps the direction it points in, and its roll is taken from the bind
 * pose relative to the hand (the hand's current turn applied), joint by joint from the knuckle.
 */
function reroll(inst: THREE.Object3D, arm: THREE.SkinnedMesh, side: "L" | "R") {
  inst.updateWorldMatrix(true, true);
  const bones = arm.skeleton.bones;
  const bindRotation = (o: THREE.Object3D) => {
    const i = bones.indexOf(o as THREE.Bone);
    const m = arm.skeleton.boneInverses[i]!.clone().invert();
    return new THREE.Quaternion().setFromRotationMatrix(m);
  };
  const hand = inst.getObjectByName(`Hand_${side}`)!;
  const handNow = hand.getWorldQuaternion(new THREE.Quaternion());
  const handBindInverse = bindRotation(hand).invert();
  const y = new THREE.Vector3(),
    z = new THREE.Vector3(),
    x = new THREE.Vector3(),
    m = new THREE.Matrix4(),
    world = new THREE.Quaternion(),
    parent = new THREE.Quaternion();
  for (const base of [FINGERS.index, FINGERS.middle, FINGERS.ring, FINGERS.little, THUMB]) {
    const chain = [0, 1, 2].map((i) => inst.getObjectByName(bone(side, base + i))!);
    const end = inst.getObjectByName(`${bone(side, base + 2)}_end`)!;
    const joints = [...chain, end].map((o) => o.getWorldPosition(new THREE.Vector3()));
    chain.forEach((joint, i) => {
      y.copy(joints[i + 1]!)
        .sub(joints[i]!)
        .normalize();
      // The bone's bind-pose Z, carried by the hand's turn since the bind pose.
      z.set(0, 0, 1)
        .applyQuaternion(bindRotation(joint))
        .applyQuaternion(handBindInverse)
        .applyQuaternion(handNow);
      z.addScaledVector(y, -z.dot(y)).normalize();
      x.crossVectors(y, z);
      world.setFromRotationMatrix(m.makeBasis(x, y, z));
      joint.parent!.getWorldQuaternion(parent).invert();
      joint.quaternion.copy(parent.multiply(world));
      joint.updateWorldMatrix(false, true);
    });
  }
  inst.updateWorldMatrix(true, true);
}

/** Every bone's rotation under `hand` (restored by `restore`). */
function snapshot(inst: THREE.Object3D, hand: string) {
  const saved: Array<[THREE.Object3D, THREE.Quaternion]> = [];
  inst.getObjectByName(hand)!.traverse((o) => saved.push([o, o.quaternion.clone()]));
  return saved;
}
function restore(saved: Array<[THREE.Object3D, THREE.Quaternion]>) {
  for (const [o, q] of saved) o.quaternion.copy(q);
}

function materialsOf(object: THREE.Object3D) {
  const out: THREE.Material[] = [];
  object.traverse((o) => {
    if (o instanceof THREE.Mesh)
      out.push(...(Array.isArray(o.material) ? o.material : [o.material]));
  });
  return out;
}

/** CCD-fit one finger chain (base, base+1, base+2, tip) to a target in instance space. */
function fitChain(root: THREE.Object3D, base: number, target: THREE.Vector3) {
  ccd(
    root,
    [bone("R", base), bone("R", base + 1), bone("R", base + 2), `${bone("R", base + 2)}_end`],
    target,
  );
}
function fitThumb(root: THREE.Object3D, target: THREE.Vector3) {
  ccd(root, [bone("R", 20), bone("R", 21), bone("R", 22), `${bone("R", 22)}_end`], target);
}
function ccd(root: THREE.Object3D, names: BoneName[], target: THREE.Vector3) {
  const chain = names.map((name) => root.getObjectByName(name)!);
  if (chain.some((b) => !b)) throw new Error(`Incomplete finger ${names[0]}`);
  root.updateWorldMatrix(true, true);
  const tip = chain.at(-1)!,
    goal = root.localToWorld(target.clone());
  const origin = new THREE.Vector3(),
    from = new THREE.Vector3(),
    to = new THREE.Vector3(),
    tipPosition = new THREE.Vector3();
  for (let iteration = 0; iteration < 24; iteration++) {
    for (let j = chain.length - 2; j >= 0; j--) {
      const joint = chain[j]!;
      joint.getWorldPosition(origin);
      from.copy(tip.getWorldPosition(tipPosition)).sub(origin).normalize();
      to.copy(goal).sub(origin).normalize();
      const step = new THREE.Quaternion().slerp(
        new THREE.Quaternion().setFromUnitVectors(from, to),
        0.6,
      );
      const rotation = joint.getWorldQuaternion(new THREE.Quaternion()).premultiply(step);
      joint.quaternion.copy(
        joint.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation),
      );
      root.updateWorldMatrix(true, true);
    }
    if (tip.getWorldPosition(origin).distanceTo(goal) < 0.0005) break;
  }
}

/**
 * Lift one finger off the handle: each joint unbends by a fixed angle about the hand's knuckle
 * axis, so the finger keeps its natural curve (a loosened grip, not a straightened one), and the
 * morph between the fist and this pose stays short enough that the finger never thins or kinks.
 */
function openFinger(inst: THREE.Object3D, base: number) {
  unbend(
    inst,
    [bone("R", base), bone("R", base + 1), bone("R", base + 2)],
    `${bone("R", base + 2)}_end`,
    [THREE.MathUtils.degToRad(85), THREE.MathUtils.degToRad(62), THREE.MathUtils.degToRad(24)],
  );
}
/** Lift the thumb off the fingers. */
function openThumb(inst: THREE.Object3D) {
  unbend(
    inst,
    [bone("R", THUMB), bone("R", THUMB + 1), bone("R", THUMB + 2)],
    `${bone("R", THUMB + 2)}_end`,
    [THREE.MathUtils.degToRad(34), THREE.MathUtils.degToRad(34), THREE.MathUtils.degToRad(24)],
    true,
  );
}
/**
 * Unbend a joint chain (the reverse of flexion): each joint turns by its angle about the hand's
 * knuckle axis for a finger, or the axis square to the bone and the palm for the thumb, with the
 * sign that would curl the straight finger into the palm reversed. (Testing the tip's motion
 * instead fails for a fully curled finger, whose tip already points back at the palm.)
 */
function unbend(
  inst: THREE.Object3D,
  names: string[],
  endName: string,
  angles: number[],
  thumb = false,
) {
  const frame = handFrame(inst, "R");
  const world = inst.matrixWorld;
  const palm = frame.palm.clone().transformDirection(world).normalize(),
    hand = frame.hand.clone().transformDirection(world).normalize(),
    across = frame.across.clone().transformDirection(world).normalize();
  const end = inst.getObjectByName(endName)!;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    axis = new THREE.Vector3(),
    turn = new THREE.Quaternion(),
    q = new THREE.Quaternion(),
    parentWorld = new THREE.Quaternion();
  names.forEach((name, i) => {
    inst.updateWorldMatrix(true, true);
    const joint = inst.getObjectByName(name)!;
    let along = hand;
    if (thumb) {
      const child = i + 1 < names.length ? inst.getObjectByName(names[i + 1]!)! : end;
      along = b.copy(child.getWorldPosition(b)).sub(joint.getWorldPosition(a)).normalize();
      axis.crossVectors(along, palm).normalize();
    } else axis.copy(across);
    // Flexion turns `along` toward the palm; unbending is the other way.
    const flex = new THREE.Vector3().crossVectors(axis, along).dot(palm) > 0 ? 1 : -1;
    turn.setFromAxisAngle(axis, -flex * angles[i]!);
    joint.getWorldQuaternion(q).premultiply(turn);
    joint.parent!.getWorldQuaternion(parentWorld).invert();
    joint.quaternion.copy(parentWorld.multiply(q));
  });
  inst.updateWorldMatrix(true, true);
}

/**
 * Rebuild the right hand's grip round the Karambit (instance space, on the authored rifle hand:
 * wrist and knuckles stay where the rig has them, only the finger joints turn, so the glove's
 * skinning and detail survive):
 *
 * - The handle lies across the fist along the knuckle line (index → little, with a slight rake
 *   toward the heel), flat to the palm: the middle, ring and little fingers drop their proximal
 *   phalanges in front of its spine, wrap the middle phalanges under its flat face and curl the
 *   tips round its grooved back edge.
 * - The index finger runs through the finger ring's hole and curls round like the others.
 * - The thumb closes over the index and middle fingers.
 *
 * The knife frame follows: the handle (knife -y) toward the little finger, the ring hole axis
 * (knife x) along the index finger, the blade curving (knife +z) forward of the fist. Returns it
 * in root space with the hand axis (wrist → middle knuckle) and palm normal for the stance.
 */
function fistGrip(inst: THREE.Object3D, root: THREE.Object3D) {
  inst.updateWorldMatrix(true, true);
  const at = (name: string) =>
    inst.worldToLocal(inst.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()));
  const knuckle = (base: number) => at(bone("R", base));
  const lengths = (base: number) => {
    const p = [
      knuckle(base),
      at(bone("R", base + 1)),
      at(bone("R", base + 2)),
      at(`${bone("R", base + 2)}_end`),
    ];
    return [p[0]!.distanceTo(p[1]!), p[1]!.distanceTo(p[2]!), p[2]!.distanceTo(p[3]!)] as const;
  };
  const wrist = at("Hand_R");
  const across = knuckle(FINGERS.index).sub(knuckle(FINGERS.little)).normalize();
  const hand = knuckle(FINGERS.middle).sub(wrist);
  hand.addScaledVector(across, -hand.dot(across)).normalize();
  // Palm side: the way the authored fingers already curl.
  const palm = new THREE.Vector3().crossVectors(across, hand).normalize();
  const curl = at(`${bone("R", FINGERS.middle + 2)}_end`).sub(knuckle(FINGERS.middle));
  if (palm.dot(curl) < 0) palm.negate();
  const back = hand.clone().negate();

  // Handle axis: a line across the fist (index → little), raked back toward the heel.
  const toLittle = across.clone().negate().addScaledVector(back, GRIP.rake).normalize();
  const origin = knuckle(FINGERS.middle)
    .addScaledVector(palm, GRIP.handlePalm)
    .addScaledVector(back, GRIP.handleBack);
  /** Point on the handle axis level with a knuckle (same distance across the hand). */
  const onAxis = (point: THREE.Vector3) =>
    origin.clone().addScaledVector(toLittle, point.clone().sub(origin).dot(toLittle));

  /** Set `joint` so its child points at `target` (rotation only). */
  function aim(joint: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3) {
    inst.updateWorldMatrix(true, true);
    const from = joint.getWorldPosition(new THREE.Vector3());
    const now = child.getWorldPosition(new THREE.Vector3()).sub(from).normalize();
    const to = inst.localToWorld(target.clone()).sub(from).normalize();
    const rotation = joint
      .getWorldQuaternion(new THREE.Quaternion())
      .premultiply(new THREE.Quaternion().setFromUnitVectors(now, to));
    joint.quaternion.copy(
      joint.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation),
    );
    inst.updateWorldMatrix(true, true);
  }
  /**
   * Curl one finger: the proximal phalanx along `direction` (its length kept), then the middle
   * and distal phalanges as a two-bone chain onto `tip`, bending outward round the handle.
   */
  function curlFinger(base: number, direction: THREE.Vector3, tip: THREE.Vector3) {
    const bones = [0, 1, 2].map((i) => inst.getObjectByName(bone("R", base + i))!);
    const end = inst.getObjectByName(`${bone("R", base + 2)}_end`)!;
    const [l1, l2, l3] = lengths(base);
    const pip = knuckle(base).addScaledVector(direction.clone().normalize(), l1);
    aim(bones[0]!, bones[1]!, pip);
    const toTip = tip.clone().sub(pip);
    const distance = THREE.MathUtils.clamp(
      toTip.length(),
      Math.abs(l2 - l3) + 1e-5,
      l2 + l3 - 1e-5,
    );
    const forward = toTip.normalize();
    const outward = palm.clone().add(back);
    const pole = outward.addScaledVector(forward, -outward.dot(forward)).normalize();
    const along = (l2 * l2 - l3 * l3 + distance * distance) / (2 * distance);
    const bend = Math.sqrt(Math.max(0, l2 * l2 - along * along));
    const dip = pip.clone().addScaledVector(forward, along).addScaledVector(pole, bend);
    aim(bones[1]!, bones[2]!, dip);
    aim(bones[2]!, end, pip.clone().addScaledVector(forward, distance));
  }
  /** Round the grooved back edge of the handle, level with a finger. */
  const tipFor = (base: number) =>
    onAxis(knuckle(base)).addScaledVector(back, GRIP.tipBack).addScaledVector(palm, GRIP.tipPalm);
  const down = palm
    .clone()
    .multiplyScalar(Math.cos(GRIP.lean))
    .addScaledVector(hand, Math.sin(GRIP.lean));

  // Middle, ring and little fingers: the fist round the handle.
  for (const base of [FINGERS.middle, FINGERS.ring, FINGERS.little])
    curlFinger(base, down, tipFor(base));

  // Knife frame: handle (-y) toward the little finger, blade curve (+z) forward of the fist,
  // ring hole (x) palmward along the index finger.
  const y = toLittle.clone().negate();
  const z = hand.clone().addScaledVector(y, -hand.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  // The ring hole sits on the index finger: slide the pivot along the axis so the hole is level
  // with the index knuckle, then run the index finger's proximal phalanx through it.
  const indexKnuckle = knuckle(FINGERS.index);
  const hole = onAxis(indexKnuckle).addScaledVector(z, RING_HOLE.z);
  const pivot = hole.clone().addScaledVector(y, -RING_HOLE.y).addScaledVector(z, -RING_HOLE.z);
  curlFinger(FINGERS.index, hole.clone().sub(indexKnuckle), tipFor(FINGERS.index));

  // Thumb: over the index and middle fingers' middle phalanges, outside the fist.
  const over = at(bone("R", FINGERS.index + 1))
    .add(at(bone("R", FINGERS.index + 2)))
    .add(at(bone("R", FINGERS.middle + 1)))
    .add(at(bone("R", FINGERS.middle + 2)))
    .multiplyScalar(0.25)
    .addScaledVector(palm, 0.016);
  fitThumb(inst, over);

  // Into root space.
  root.updateWorldMatrix(true, true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(inst.matrixWorld);
  const dir = (v: THREE.Vector3) => v.clone().transformDirection(toRoot);
  const rotation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(dir(x), dir(y), dir(z)),
  );
  return {
    ring: pivot.applyMatrix4(toRoot),
    rotation,
    hand: dir(hand),
    palm: dir(palm),
  };
}

export function createSkinMaterial(owned: {
  materials: THREE.Material[];
  textures: THREE.Texture[];
}) {
  const skinMap = new THREE.TextureLoader().load("/fps/forearm-skin-v2.webp");
  skinMap.colorSpace = THREE.SRGBColorSpace;
  skinMap.wrapS = skinMap.wrapT = THREE.RepeatWrapping;
  skinMap.anisotropy = 8;
  skinMap.repeat.set(2, 3);
  const detail = createForearmDetailTexture();
  owned.textures.push(skinMap, detail);
  const skin = applyVeinTint(
    new THREE.MeshPhysicalMaterial({
      map: skinMap,
      color: 0xffffff,
      roughness: 0.56,
      metalness: 0,
      bumpMap: detail,
      bumpScale: 0.065,
      sheen: 0.35,
      sheenColor: new THREE.Color(0xff9c80),
      sheenRoughness: 0.55,
    }),
    1,
  );
  owned.materials.push(skin);
  return skin;
}

/**
 * Sleeve meshes in canonical arm space: the team's full-length duty sleeve (snow-camo smock for the
 * Terrorist, blue shirt for Police), else the rolled olive sleeve (`duty` false: skin shows).
 */
export function sleeveParts(
  instance: THREE.Object3D,
  arms: ViewmodelVariant["arms"],
  geometries: THREE.BufferGeometry[],
) {
  const found: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[] }[] =
    [];
  const accessories = instance.getObjectByName("FPAccessories");
  if (!accessories) return { parts: found, duty: false };
  accessories.updateWorldMatrix(true, true);
  const toRoot = new THREE.Matrix4().copy(accessories.matrixWorld).invert();
  const take = (name: string) =>
    accessories.getObjectByName(name)?.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const geometry = o.geometry
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld));
      geometries.push(geometry);
      found.push({ geometry, material: o.material });
    });
  if (arms === "jacket") take("JacketSleeve");
  else if (arms === "police") take("PoliceSleeve");
  const duty = found.length > 0;
  if (!duty) take("ArmSleeve");
  return { parts: found, duty };
}
export function sleeveMesh(
  part: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[] },
  path: ForearmPath,
  variant: ViewmodelVariant,
  geometries: THREE.BufferGeometry[],
) {
  const geometry = wrapOntoForearm(part.geometry, path, variant.forearms);
  geometries.push(geometry);
  const mesh = new THREE.Mesh(geometry, part.material);
  mesh.name = "karambit-sleeve";
  return mesh;
}
