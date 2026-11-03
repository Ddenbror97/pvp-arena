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
import { KARAMBIT_RUN_POSE, KarambitAnimator, type KarambitControls } from "./karambit-animator";

/**
 * First-person Karambit on a team's existing arms (Police: steel-blue duty-shirt sleeve;
 * Terrorist: snow-camo smock sleeve; the watch is on the left wrist, out of this view). Nothing
 * about the arms is replaced: the same rig, gloves, forearm builder and sleeves the rifles use are
 * fitted to the knife here.
 *
 * - Grip (fistGrip): the right hand is rebuilt round the knife as a reverse-grip hammer fist.
 *   The handle lies across the fist along the knuckle line, flat to the palm. The index finger runs
 *   through the finger ring. The other fingers drop in front of the spine, wrap under the handle
 *   and curl round its back edge, and the thumb closes over them. The knife frame follows from
 *   that grip, so no compensating knife rotation is needed.
 * - Fingers: the closed grip and an open hand (index still through the ring, for spins and flips)
 *   are both baked from the rig; the open one is a morph target, so the fingers open and close
 *   smoothly instead of swapping poses.
 * - Idle: the carry stance (setCarryStance). The palm is down with the back of the hand to the
 *   camera. The ring sits at the front of the fist and the blade leaves the little-finger side,
 *   curving up above the sleeve.
 * - Animation: Blender-authored clips on a control rig (art/blender/karambit) played by
 *   KarambitAnimator (three's AnimationMixer). Each frame the controls move the wrist pivot, spin
 *   the knife about its ring and set the finger morph. The clips were authored against the
 *   earlier pistol-grip seating. Outside the idle stance the hand is turned by the fixed
 *   difference between the two seatings, so swings and spins keep their authored blade path.
 *
 * Cosmetic only: never reads or writes gameplay state.
 */
export const KARAMBIT_VIEWMODEL_REST = {
  x: 0.13,
  y: 0.03,
  z: -0.21,
  pitch: 0.28,
  yaw: -0.15,
  roll: 0.38,
};
/**
 * Horizontal rest offset for the screen's aspect. The rest is framed for 16:9; on narrower
 * screens (4:3, 5:4) the fist would slide off the right edge, so it moves in proportionally.
 * Wider screens keep the 16:9 offset (the hand stays near the crosshair instead of drifting out).
 */
export function karambitRestX(aspect: number) {
  return KARAMBIT_VIEWMODEL_REST.x * Math.min(1, Math.max(0.5, aspect / (16 / 9)));
}
/**
 * Display size of the Karambit relative to the 19 cm model, about its finger ring so the ring
 * stays on the index finger. Cosmetic only: reach and hits are the server's (combat.ts KNIFE).
 */
export const KARAMBIT_SCALE = 1.2;
/** Share of the wrist's rotation the forearm follows (the rest reads as wrist flex). */
const FOREARM_SHARE = 0.6;
/**
 * The fist round the Karambit's handle, in the hand's own frame (instance units; the rig's hand
 * is about 1.45x life size, like the knife at KARAMBIT_SCALE). `palm` is toward the palm from the
 * knuckle line, `back` toward the wrist from it.
 *
 * The knife is held flat to the palm (as in the reference: palm down, blade broadside from
 * above): its 2.7-unit thickness runs palmward and its 6.5-unit height runs back from the
 * knuckles, spine forward against the proximal phalanges, finger grooves back toward the heel.
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

/** Index fingertip and thumb tip of the clips' authored pistol-grip fist (instance space). */
const AUTHORED_INDEX_TIP = new THREE.Vector3(-0.045, -0.112, -0.236);
const AUTHORED_THUMB_TIP = new THREE.Vector3(-0.03, -0.125, -0.19);

type BoneName = string;
const bone = (side: "R" | "L", n: number) => `Bone_${side}${String(n).padStart(3, "0")}`;
const FINGERS = { index: 5, middle: 9, ring: 13, little: 17 } as const;

export function createKarambitViewmodel(parent: THREE.Object3D, variant: ViewmodelVariant) {
  const arms = retainAuthoredAsset(variant.asset),
    knifeAsset = retainAuthoredAsset(ARENA_MODELS.karambit);
  const root = new THREE.Group();
  root.name = "karambit-first-person";
  root.visible = false;
  parent.add(root);
  /** Wrist pivot: hand, forearm, sleeve and knife move rigidly about it. */
  const wrist = new THREE.Group();
  wrist.name = "karambit-wrist";
  const wristContent = new THREE.Group();
  wrist.add(wristContent);
  /**
   * Forearm pivot at the wrist: the forearm and sleeve stay joined to the glove cuff and take a
   * share of the wrist's rotation (FOREARM_SHARE), so a flick of the wrist does not swing the
   * whole sleeve across the screen; the elbow, off screen, absorbs the rest.
   */
  const forearm = new THREE.Group();
  forearm.name = "karambit-forearm";
  const armContent = new THREE.Group();
  forearm.add(armContent);
  root.add(forearm);
  root.add(wrist);
  /** Knife pivot at the ring centre (in wrist content space); spins about its local x. */
  const ringPivot = new THREE.Group();
  ringPivot.name = "karambit-ring";
  const knifeHolder = new THREE.Group();
  ringPivot.add(knifeHolder);
  wristContent.add(ringPivot);
  const ringBase = new THREE.Quaternion();
  /** Hand turn and ring target that put the knife on the clips' authored path (see pose). */
  const clipTurn = new THREE.Quaternion(),
    clipRing = new THREE.Vector3(),
    ringRest = new THREE.Vector3(),
    turn = new THREE.Quaternion(),
    handTurned = new THREE.Quaternion(),
    shift = new THREE.Vector3();
  const owned = {
    geometry: [] as THREE.BufferGeometry[],
    materials: [] as THREE.Material[],
    textures: [] as THREE.Texture[],
  };
  let stopped = false,
    loaded = false,
    gloves: THREE.Mesh | null = null,
    animator: KarambitAnimator | null = null;
  const wristRest = new THREE.Vector3();
  const restHand = new THREE.Vector3(),
    restPalm = new THREE.Vector3();
  /** Forearm rotation in the idle carry stance (see setCarryStance). */
  const armCarry = new THREE.Quaternion();
  let knifeInstance: ReturnType<typeof cloneAuthoredModel> | undefined,
    armsInstance: ReturnType<typeof cloneAuthoredModel> | undefined;

  const ready = Promise.all([arms.ready, knifeAsset.ready])
    .then(([armsGltf, knifeGltf]) => {
      if (stopped) return;
      const scale = variant.forearms.scale;
      root.scale.setScalar(scale);
      // Bake the hand from a throwaway clone of the team's arm rig (rifle meshes unused).
      const instance = (armsInstance = cloneAuthoredModel(armsGltf.scene));
      const holder = new THREE.Group();
      root.add(holder);
      holder.add(instance.root);
      root.updateWorldMatrix(true, true);
      const arm = instance.root.getObjectByName("FPArms") as THREE.SkinnedMesh;
      const delta = poseRifleHands(instance.root, HANDGUARD_GRIP);
      // Rebuild the right hand round the knife: a hammer fist closed on a handle laid across the
      // knuckles, the index finger through the ring (fistGrip → knife frame and hand anatomy).
      // The clips' authored seating (see knifeFrame), measured before the fist is rebuilt.
      fitChain(instance.root, FINGERS.index, AUTHORED_INDEX_TIP);
      fitThumb(instance.root, AUTHORED_THUMB_TIP);
      const authored = knifeFrame(fingerWraps(instance.root, root));
      const grip = fistGrip(instance.root, root);
      restHand.copy(grip.hand);
      restPalm.copy(grip.palm);
      const closed = fitContinuousForearms(arm, root, delta, variant.forearms);
      // Open hand: index stays hooked through the ring, the others and the thumb straighten.
      openHand(instance.root);
      const open = fitContinuousForearms(arm, root, delta, variant.forearms);
      open.R.skin.dispose();
      open.L.gloves.dispose();
      open.L.skin.dispose();
      closed.L.gloves.dispose();
      closed.L.skin.dispose();
      const handNode = instance.root.getObjectByName("Hand_R")!;
      handNode.getWorldPosition(wristRest);
      root.worldToLocal(wristRest);

      // Dress the right arm: gloves (with the open-hand morph), forearm skin, sleeve.
      const gloveMaterial = createGloveMaterial(
        (Array.isArray(arm.material)
          ? arm.material[0]!
          : arm.material) as THREE.MeshStandardMaterial,
      );
      owned.materials.push(gloveMaterial);
      const glovesGeometry = closed.R.gloves;
      glovesGeometry.morphAttributes.position = [open.R.gloves.getAttribute("position")];
      glovesGeometry.morphAttributes.normal = [open.R.gloves.getAttribute("normal")];
      glovesGeometry.morphTargetsRelative = false;
      owned.geometry.push(glovesGeometry, open.R.gloves);
      gloves = new THREE.Mesh(glovesGeometry, gloveMaterial);
      gloves.name = "karambit-gloves";
      gloves.morphTargetInfluences = [0];
      const parts: THREE.Mesh[] = [gloves],
        armParts: THREE.Mesh[] = [];
      const sleeves = sleeveParts(instance.root, variant.arms, owned.geometry);
      // A full-length duty sleeve covers the forearm; only the rolled olive sleeve shows skin.
      if (!sleeves.duty) {
        const skin = createSkinMaterial(owned);
        owned.geometry.push(closed.R.skin);
        armParts.push(new THREE.Mesh(closed.R.skin, skin));
      } else closed.R.skin.dispose();
      for (const part of sleeves.parts)
        armParts.push(sleeveMesh(part, closed.R.path, variant, owned.geometry));
      // Everything rides the wrist pivot.
      wrist.position.copy(wristRest);
      wristContent.position.copy(wristRest).negate();
      wristContent.add(...parts);
      forearm.position.copy(wristRest);
      armContent.position.copy(wristRest).negate();
      armContent.add(...armParts);

      // Knife: ring on the curled index finger, handle down through the fist.
      knifeInstance = cloneAuthoredModel(knifeGltf.scene);
      const knifeMesh = knifeInstance.root.getObjectByName("Karambit")!;
      // Keep its own transform: meshopt quantisation stores positions scaled on the node.
      knifeMesh.removeFromParent();
      // Knife space is metres; the viewmodel root is scaled.
      knifeHolder.add(knifeMesh);
      knifeHolder.scale.setScalar(KARAMBIT_SCALE / scale);
      ringPivot.position.copy(grip.ring);
      ringBase.copy(grip.rotation);
      // Clips: turn the hand by (authored seating) · (this grip)⁻¹ and shift it so the ring lands
      // where the clips put it, so swings and spins follow their authored path.
      clipTurn.copy(authored.rotation).multiply(grip.rotation.clone().invert());
      clipRing.copy(authored.ring);
      ringRest.copy(grip.ring);
      ringPivot.quaternion.copy(ringBase);
      for (const material of materialsOf(knifeMesh)) {
        if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = 1.15;
      }
      // The sleeves keep using this clone's materials; it is disposed with the viewmodel.
      holder.removeFromParent();
      animator = new KarambitAnimator(
        knifeInstance.root,
        knifeGltf.animations,
        knifeGltf.scene.userData,
      );
      setCarryStance();
      root.traverse((object) => {
        object.layers.set(1);
        if (object instanceof THREE.Mesh) {
          object.castShadow = false;
          object.frustumCulled = false;
        }
      });
      sharpenViewmodelTextures(root);
      loaded = true;
    })
    .catch((error) => console.warn("Karambit viewmodel unavailable.", error));

  const q = new THREE.Quaternion(),
    v = new THREE.Vector3();
  /**
   * The idle carry stance from anatomy (as seen in first person: palm down, back of the hand to
   * the camera, the hand reaching forward into the scene). The hand axis (wrist to middle
   * knuckle) points along `arm` (camera space: x right, y up, z toward the viewer) and the palm
   * faces `palm`. The forearm turns with the hand, so the glove cuff stays in the sleeve. The
   * knife needs nothing: it is held in the fist.
   */
  function setCarryStance(
    arm: readonly number[] = KARAMBIT_RUN_POSE.arm,
    palm: readonly number[] = KARAMBIT_RUN_POSE.palm,
  ) {
    if (!animator) return;
    const rest = KARAMBIT_VIEWMODEL_REST;
    const toRoot = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(rest.pitch, rest.yaw, rest.roll))
      .invert();
    const cam = (v: readonly number[]) =>
      new THREE.Vector3(...(v as [number, number, number])).normalize().applyQuaternion(toRoot);
    const basis = (along: THREE.Vector3, side: THREE.Vector3) => {
      const x = along.clone().normalize();
      const y = side.clone().addScaledVector(x, -side.dot(x)).normalize();
      return new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y)),
      );
    };
    const target = basis(cam(arm), cam(palm));
    // The idle clip's own wrist rotation is under the carry (handRotation = idle · carry).
    const idleHand = animator.idleRest().hand;
    const hand = target.clone().multiply(basis(restHand, restPalm).invert());
    animator.setRunRotation(idleHand.invert().multiply(hand));
    // Forearm: turned exactly with the hand, so the wrist keeps the rig's own angle and the glove
    // cuff stays seated in the sleeve (the cuff belongs to the glove, the sleeve to the forearm).
    armCarry.copy(hand);
  }
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
      const scale = root.scale.x || 1;
      // Outside the idle stance the clips drive the hand: turn it so the knife (seated in this
      // grip) follows the clips' authored path, easing out as the stance takes over.
      const w = THREE.MathUtils.clamp(controls.carry, 0, 1);
      const clip = 1 - w * w * (3 - 2 * w);
      turn.identity().slerp(clipTurn, clip);
      handTurned.copy(controls.handRotation).multiply(turn);
      // Keep the ring on its authored spot: shift the wrist by what the turn moved it.
      shift
        .copy(clipRing)
        .sub(wristRest)
        .sub(v.copy(ringRest).sub(wristRest).applyQuaternion(turn))
        .applyQuaternion(controls.handRotation)
        .multiplyScalar(clip);
      wrist.position
        .copy(wristRest)
        .add(v.copy(controls.handPosition).divideScalar(scale))
        .add(shift);
      wrist.quaternion.copy(handTurned);
      forearm.position.copy(wrist.position);
      forearm.quaternion
        .identity()
        .slerp(handTurned, FOREARM_SHARE)
        .slerp(armCarry, controls.carry);
      ringPivot.quaternion.copy(ringBase).multiply(q.copy(controls.knifeRotation));
      if (gloves?.morphTargetInfluences)
        gloves.morphTargetInfluences[0] = THREE.MathUtils.clamp(1 - controls.fingers, 0, 1);
    },
    /** Re-aim the idle carry stance (previews): see setCarryStance. */
    setCarryStance,
    /** Knife blade tip in `parent` space (for effects), or null before load. */
    bladeTip(target: THREE.Vector3) {
      const tip = knifeHolder.getObjectByName("BladeTip");
      if (!loaded || !tip) return null;
      tip.updateWorldMatrix(true, false);
      return parent.worldToLocal(tip.getWorldPosition(target));
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

/** Straighten the middle, ring and little fingers and the thumb (index keeps the ring). */
function openHand(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  for (const base of [FINGERS.middle, FINGERS.ring, FINGERS.little]) {
    const knuckle = root.getObjectByName(bone("R", base))!;
    const k = root.worldToLocal(knuckle.getWorldPosition(new THREE.Vector3()));
    // Relaxed, slightly curled and fanned: fingertips forward and a little down of the knuckles.
    const spread = (base - FINGERS.middle) * 0.004;
    fitChain(
      root,
      base,
      k.clone().add(new THREE.Vector3(-0.04 - spread, -0.035 - spread * 3, -0.1)),
    );
  }
  const thumbBase = root.getObjectByName(bone("R", 20))!;
  const t = root.worldToLocal(thumbBase.getWorldPosition(new THREE.Vector3()));
  fitThumb(root, t.add(new THREE.Vector3(-0.09, 0.015, -0.07)));
}

type Wraps = Record<keyof typeof FINGERS, THREE.Vector3> & {
  across: THREE.Vector3;
  /** Hollow each curled finger closes round (circle through knuckle, middle joint and tip). */
  hollow: Record<"middle" | "ring" | "little", THREE.Vector3>;
};
/** Centre of the circle through three points (falls back to their mean when collinear). */
function circumcentre(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  const ab = b.clone().sub(a),
    ac = c.clone().sub(a),
    n = new THREE.Vector3().crossVectors(ab, ac);
  const d = 2 * n.lengthSq();
  if (d < 1e-12)
    return a
      .clone()
      .add(b)
      .add(c)
      .multiplyScalar(1 / 3);
  const t1 = new THREE.Vector3().crossVectors(n, ab).multiplyScalar(ac.lengthSq()),
    t2 = new THREE.Vector3().crossVectors(ac, n).multiplyScalar(ab.lengthSq());
  return a.clone().add(t1.add(t2).multiplyScalar(1 / d));
}
/**
 * Centre of each curled finger's wrap (root space): the mean of its knuckle, joints and tip
 * (on the finger: where the ring sits on the index). Also each finger's curl hollow, the
 * hand's lateral axis (little → index knuckle).
 */
function fingerWraps(instance: THREE.Object3D, root: THREE.Object3D): Wraps {
  root.updateWorldMatrix(true, true);
  const at = (name: string) =>
    root.worldToLocal(instance.getObjectByName(name)!.getWorldPosition(new THREE.Vector3()));
  const wrap = (base: number) =>
    at(bone("R", base))
      .add(at(bone("R", base + 1)))
      .add(at(bone("R", base + 2)))
      .add(at(`${bone("R", base + 2)}_end`))
      .multiplyScalar(0.25);
  const curl = (base: number) =>
    circumcentre(at(bone("R", base)), at(bone("R", base + 1)), at(`${bone("R", base + 2)}_end`));
  return {
    index: wrap(FINGERS.index),
    middle: wrap(FINGERS.middle),
    ring: wrap(FINGERS.ring),
    little: wrap(FINGERS.little),
    hollow: {
      middle: curl(FINGERS.middle),
      ring: curl(FINGERS.ring),
      little: curl(FINGERS.little),
    },
    across: at(bone("R", FINGERS.index))
      .sub(at(bone("R", FINGERS.little)))
      .normalize(),
  };
}

/**
 * The seating the Blender clips were authored against (the earlier pistol-grip fist), kept so
 * attacks, inspect and tricks swing the blade along their authored path: knife placement in root
 * space from the finger wraps: the ring centre on the index finger, the
 * handle (knife -y) down the fist through the hollow the middle, ring and little fingers close
 * round (so the fingers wrap the handle instead of lying across it), the ring axis (knife x)
 * across the knuckles.
 */
function knifeFrame(w: Wraps) {
  // Knife space: handle along -y from the ring, ring axis x, blade curving toward +z.
  const fist = w.hollow.ring.clone().add(w.hollow.little).multiplyScalar(0.5);
  const handle = fist.sub(w.index).normalize();
  const x = w.across.clone().addScaledVector(handle, -w.across.dot(handle)).normalize();
  const y = handle.clone().negate();
  const z = new THREE.Vector3().crossVectors(x, y);
  const rotation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(x, y, z),
  );
  return { ring: w.index.clone(), rotation };
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
