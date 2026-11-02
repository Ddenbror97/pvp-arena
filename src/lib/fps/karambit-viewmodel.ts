import * as THREE from "three";
import { cloneAuthoredModel, retainAuthoredAsset } from "./authored-assets";
import { createGloveMaterial, type ViewmodelVariant } from "./authored-viewmodel";
import {
  fitContinuousForearms,
  HANDGUARD_GRIP,
  poseRifleHands,
  wrapOntoForearm,
  type ForearmPath,
} from "./fitted-rifle-hands";
import { applyVeinTint, createForearmDetailTexture } from "./forearm-detail";
import { ARENA_MODELS } from "./model-assets";
import { KarambitAnimator, type KarambitControls } from "./karambit-animator";

/**
 * First-person Karambit on a team's existing arms (Police: bare forearm, olive sleeve and watch;
 * Terrorist: white duty-jacket sleeve). Nothing about the arms is replaced: the same rig, gloves,
 * forearm builder and sleeves the rifles use are fitted to the knife here.
 *
 * - Grip: the right hand's middle, ring and little fingers keep the rifle pistol-grip wrap (a
 *   vertical handle in the fist); the index finger is re-fitted to curl through the finger ring
 *   and the thumb to close over it. The knife is then placed so its ring sits on the curled index
 *   finger and its handle runs down through the fist (fingerWraps → knifeFrame).
 * - Fingers: the closed grip and an open hand (index still through the ring, for spins and flips)
 *   are both baked from the rig; the open one is a morph target, so the fingers open and close
 *   smoothly instead of swapping poses.
 * - Animation: Blender-authored clips on a control rig (art/blender/karambit) played by
 *   KarambitAnimator (three's AnimationMixer). Each frame the controls move the wrist pivot, spin
 *   the knife about its ring and set the finger morph.
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
/** Knife orientation about its handle axis in the fist (radians): blade curving forward. */
const KNIFE_TWIST = 0;
/** Index wrap (instance space): where the index fingertip lands round the ring. */
const INDEX_TIP = new THREE.Vector3(-0.045, -0.112, -0.236);
/** Thumb tip (instance space): closed over the index finger beside the ring. */
const THUMB_TIP = new THREE.Vector3(-0.03, -0.125, -0.19);

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
      fitChain(instance.root, FINGERS.index, INDEX_TIP);
      fitThumb(instance.root, THUMB_TIP);
      const closed = fitContinuousForearms(arm, root, delta, variant.forearms);
      const wraps = fingerWraps(instance.root, root);
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
      const jacket = variant.arms === "jacket";
      if (!jacket) {
        const skin = createSkinMaterial(owned);
        owned.geometry.push(closed.R.skin);
        armParts.push(new THREE.Mesh(closed.R.skin, skin));
      } else closed.R.skin.dispose();
      for (const part of sleeveParts(instance.root, jacket, owned.geometry))
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
      const frame = knifeFrame(wraps);
      ringPivot.position.copy(frame.ring);
      ringBase.copy(frame.rotation);
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
      root.traverse((object) => {
        object.layers.set(1);
        if (object instanceof THREE.Mesh) {
          object.castShadow = false;
          object.frustumCulled = false;
        }
      });
      loaded = true;
    })
    .catch((error) => console.warn("Karambit viewmodel unavailable.", error));

  const q = new THREE.Quaternion(),
    v = new THREE.Vector3();
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
      wrist.position.copy(wristRest).add(v.copy(controls.handPosition).divideScalar(scale));
      wrist.quaternion.copy(controls.handRotation);
      forearm.position.copy(wrist.position);
      forearm.quaternion.identity().slerp(controls.handRotation, FOREARM_SHARE);
      ringPivot.quaternion.copy(ringBase).multiply(q.copy(controls.knifeRotation));
      if (gloves?.morphTargetInfluences)
        gloves.morphTargetInfluences[0] = THREE.MathUtils.clamp(1 - controls.fingers, 0, 1);
    },
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

type Wraps = Record<keyof typeof FINGERS, THREE.Vector3> & { across: THREE.Vector3 };
/**
 * Centre of each curled finger's wrap (root space): the mean of its knuckle, joints and tip
 * approximates the axis it closes round. Also the hand's lateral axis (little → index knuckle).
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
  return {
    index: wrap(FINGERS.index),
    middle: wrap(FINGERS.middle),
    ring: wrap(FINGERS.ring),
    little: wrap(FINGERS.little),
    across: at(bone("R", FINGERS.index))
      .sub(at(bone("R", FINGERS.little)))
      .normalize(),
  };
}

/**
 * Knife placement in root space from the finger wraps: the ring centre on the index wrap, the
 * handle (knife -y) down the fist through the middle/ring/little wraps, the ring axis (knife x)
 * across the knuckles, then KNIFE_TWIST about the handle so the blade curves forward.
 */
function knifeFrame(w: Wraps) {
  // Knife space: handle along -y from the ring, ring axis x, blade curving toward +z.
  const handle = w.little.clone().sub(w.index).normalize();
  const x = w.across.clone().addScaledVector(handle, -w.across.dot(handle)).normalize();
  const y = handle.clone().negate();
  const z = new THREE.Vector3().crossVectors(x, y);
  const rotation = new THREE.Quaternion()
    .setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), KNIFE_TWIST));
  return { ring: w.index.clone(), rotation };
}

function createSkinMaterial(owned: { materials: THREE.Material[]; textures: THREE.Texture[] }) {
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

/** Sleeve meshes in canonical arm space (jacket for the Terrorist, olive roll-up for Police). */
function sleeveParts(
  instance: THREE.Object3D,
  jacket: boolean,
  geometries: THREE.BufferGeometry[],
) {
  const accessories = instance.getObjectByName("FPAccessories");
  if (!accessories) return [];
  accessories.updateWorldMatrix(true, true);
  const toRoot = new THREE.Matrix4().copy(accessories.matrixWorld).invert();
  const found: { geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[] }[] =
    [];
  const take = (name: string) =>
    accessories.getObjectByName(name)?.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const geometry = o.geometry
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, o.matrixWorld));
      geometries.push(geometry);
      found.push({ geometry, material: o.material });
    });
  if (jacket) take("JacketSleeve");
  if (!found.length) take("ArmSleeve");
  return found;
}
function sleeveMesh(
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
