import * as THREE from "three";
import type { Seat, Weapon } from "./protocol";
import type { WeaponKit } from "./weapon";
import { createCharacter as createFallback } from "./character-rig";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import {
  AK_VIEWMODEL,
  AWP_POLICE_VIEWMODEL,
  createAuthoredViewmodel,
  DEAGLE_POLICE_VIEWMODEL,
  M4_VIEWMODEL,
  MP5_POLICE_VIEWMODEL,
} from "./authored-viewmodel";
import { EYE_HEIGHT, CROUCH_EYE_HEIGHT } from "./map";
import { createMuzzleFlash } from "./muzzle-flash";
import { ARENA_MODELS, CHARACTER_MODELS, WORLD_RIFLES } from "./model-assets";
import { KARAMBIT_SCALE } from "./karambit-viewmodel";
import type { KnifeAttack } from "./protocol";
import { GRENADE_TYPES, type GrenadeType, type ThrowKind } from "./grenades/rules";

type Motion = {
  stance?: number;
  airborne?: boolean;
  weapon?: Weapon;
  reloading?: boolean;
  death?: number | undefined;
  /**
   * The primary in the rifle slot: the AWP swaps in its third-person model. With the
   * `bothRifles` option "ak47"/"m4" pick that rifle whatever the character; "none": empty hands.
   */
  primary?: "rifle" | "awp" | "ak47" | "m4" | "mp5" | "deagle" | "none" | undefined;
  /** Overrides the flash size (the Police M4A1 is otherwise drawn suppressed). */
  silenced?: boolean | undefined;
  /** With weapon "grenade": the type in the hand, and the wind-up while the button is held. */
  nade?: GrenadeType | undefined;
  nadeHold?: ThrowKind | undefined;
  /**
   * Hanging under a parachute (BR canopy.ts): the rifle slung, both hands up on the steering
   * toggles (each pulled down 0..1), legs hanging with bent knees and swinging a little, drawn
   * up for the landing as `flare` rises (0..1). The toggles hang `toggleY` above the feet.
   */
  canopy?:
    | {
        pullL: number;
        pullR: number;
        flare: number;
        toggleY: number;
        /**
         * Diving, 0..1: the hands go forward and up the front risers and the legs trail
         * behind, stretched out (the caller swings the whole body forward about the harness).
         */
        dive?: number;
      }
    | undefined;
  /**
   * Driving (BR vehicles): sat in the seat, no weapon. Character space (feet at the origin,
   * facing −z): the hips come down by `drop`, the upper body leans forward by `lean` (radians),
   * the feet go to `foot` (the right one; the left mirrored) and the hands to the wheel or the
   * handlebar grips. The caller places the character at the seat.
   */
  seated?:
    | {
        drop: number;
        lean: number;
        foot: [number, number, number];
        handL: [number, number, number];
        handR: [number, number, number];
      }
    | undefined;
};
/**
 * Grenade in the right fist (character space, feet at the origin, facing -z): carried at the
 * waist, wound up while the pin is out (over the shoulder, low behind the hip, or at the side),
 * then thrown forward; the hand empties at the release.
 */
const NADE_POSE: Record<"carry" | ThrowKind, [number, number, number]> = {
  carry: [0.17, 1.06, -0.24],
  over: [0.22, 1.66, 0.14],
  medium: [0.24, 1.36, 0.06],
  under: [0.2, 0.78, 0.16],
};
const NADE_RELEASE: Record<ThrowKind, [number, number, number]> = {
  over: [0.08, 1.5, -0.6],
  medium: [0.08, 1.3, -0.6],
  under: [0.1, 1.15, -0.55],
};
const NADE_THROW_MS = 520;
/** Authored skinned bodies, bone-space IK and reference-specific clothing. */
/** Horizontal build factor for both opponents (height is fixed by the head hitbox). */
const BODY_BREADTH = 1.06;
/**
 * Third-person gun seat in weaponPivot space (pivot at x 0.07, y 1.25 on the body's centre):
 * bore x/y and the butt's z, and the gun scale on top of the first-person rig scale. Close
 * enough that the support hand still reaches the handguard at ±0.45 rad pitch and in reloads
 * (e2e fps-world-rifle: hand-to-grip gap < 0.13 m; measured 0.10 m).
 */
const TP_GUN = { x: 0.045, y: 0.12, butt: -0.045, scale: 0.88 };
/** The Desert Eagle's muzzle in weaponPivot space (the pivot sits right of the centre line). */
const TP_PISTOL = { x: -0.07, y: 0.15, muzzle: -0.62 };
/** Rifle stance: upper-body twist about the vertical (radians; negative brings the left
 * shoulder forward), split over the spine, and the neck's counter-turn. */
const STANCE_TWIST: Array<[string, number]> = [
  ["Spine1", -0.14],
  ["Spine2", -0.14],
  ["Neck", 0.28],
];
const upAxis = new THREE.Vector3(),
  twistQ = new THREE.Quaternion();

export function createCharacter(
  seat: Seat,
  branding: THREE.Material,
  kit: WeaponKit,
  /**
   * worldRifle: the lightweight third-person rifle (many operators on screen).
   * bothRifles: also load the other side's rifle, so any character can carry either (BR loot).
   */
  options: {
    worldRifle?: boolean;
    bothRifles?: boolean;
    /**
     * Battle royale: the officer without his own helmet and goggles (helmets are loot there,
     * drawn by br/character-gear.ts when worn). 1v1 and 5v5 keep them.
     */
    bareHead?: boolean;
  } = {},
) {
  const police = seat === "A",
    root = new THREE.Group();
  root.name = police ? "officer" : "masked-fighter";
  // Falling is local to the character's facing direction, not the world's X axis.
  root.rotation.order = "YXZ";
  const fallback = createFallback(seat, branding, kit);
  root.add(fallback.root);
  const anchor = new THREE.Group();
  anchor.name = "combat-head";
  anchor.position.y = 1.6;
  root.add(anchor);
  const body = new THREE.Group();
  body.name = "authored-tactical-body";
  const weaponPivot = new THREE.Group();
  weaponPivot.position.set(0.07, 1.25, 0);
  root.add(weaponPivot);
  // Police carry the suppressed M4A1, the Terrorist the AK (same as their first-person view).
  const variant = seat === "A" ? M4_VIEWMODEL : AK_VIEWMODEL;
  const weapon = createAuthoredViewmodel(
    weaponPivot,
    false,
    options.worldRifle
      ? { ...variant, asset: WORLD_RIFLES[variant.id === "m4" ? "m4" : "ak"] }
      : variant,
  );
  // The AWP (bought from the spawn menu): the lightweight third-person model for everyone.
  const awp = createAuthoredViewmodel(weaponPivot, false, {
    ...AWP_POLICE_VIEWMODEL,
    asset: WORLD_RIFLES.awp,
  });
  awp.root.visible = false;
  const altVariant = variant.id === "m4" ? AK_VIEWMODEL : M4_VIEWMODEL;
  const alt = options.bothRifles
    ? createAuthoredViewmodel(
        weaponPivot,
        false,
        options.worldRifle
          ? { ...altVariant, asset: WORLD_RIFLES[altVariant.id === "m4" ? "m4" : "ak"] }
          : altVariant,
      )
    : null;
  if (alt) alt.root.visible = false;
  // The MP5 (shouldered like the rifles) and the Desert Eagle (pistol hold): bought or carried
  // in every mode (lightweight third-person models, shared between characters).
  const smg: ReturnType<typeof createAuthoredViewmodel> | null = createAuthoredViewmodel(
    weaponPivot,
    false,
    { ...MP5_POLICE_VIEWMODEL, asset: WORLD_RIFLES.mp5 },
  );
  const pistol: ReturnType<typeof createAuthoredViewmodel> | null = createAuthoredViewmodel(
    weaponPivot,
    false,
    { ...DEAGLE_POLICE_VIEWMODEL, asset: WORLD_RIFLES.deagle },
  );
  if (smg) smg.root.visible = false;
  if (pistol) pistol.root.visible = false;
  /**
   * Third person: the butt in the right shoulder pocket, the bore at shoulder height, the gun at
   * TP_GUN.scale (owner screenshot, 2026-11-03: with the grip at the chest pivot the rifles sank
   * into the vest and read too long beside the body). Offsets in weaponPivot space at zero pitch.
   */
  const seatGun = (view: typeof weapon) => {
    view.root.scale.multiplyScalar(TP_GUN.scale);
    view.root.position.set(0, 0, 0);
    const pitch = weaponPivot.rotation.x;
    weaponPivot.rotation.x = 0;
    weaponPivot.updateWorldMatrix(true, true);
    const toPivot = weaponPivot.matrixWorld.clone().invert(),
      box = new THREE.Box3(),
      part = new THREE.Box3(),
      m = new THREE.Matrix4();
    view.root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(
        part.copy(o.geometry.boundingBox!).applyMatrix4(m.multiplyMatrices(toPivot, o.matrixWorld)),
      );
    });
    const bore = view.muzzle().clone();
    if (!box.isEmpty())
      view.root.position.set(TP_GUN.x - bore.x, TP_GUN.y - bore.y, TP_GUN.butt - box.max.z);
    weaponPivot.rotation.x = pitch;
    weaponPivot.updateWorldMatrix(false, true);
  };
  /**
   * The Desert Eagle: an isosceles two-hand hold, the pistol out in front of the chest on the
   * centre line at about shoulder height (no shoulder pocket: both arms reach forward to it).
   */
  const seatPistol = (view: typeof weapon) => {
    view.root.scale.multiplyScalar(TP_GUN.scale);
    view.root.position.set(0, 0, 0);
    const pitch = weaponPivot.rotation.x;
    weaponPivot.rotation.x = 0;
    weaponPivot.updateWorldMatrix(true, true);
    const bore = view.muzzle().clone();
    view.root.position.set(TP_PISTOL.x - bore.x, TP_PISTOL.y - bore.y, TP_PISTOL.muzzle - bore.z);
    weaponPivot.rotation.x = pitch;
    weaponPivot.updateWorldMatrix(false, true);
  };
  const ownRifle = variant.id === "m4" ? "m4" : "ak47";
  /** The gun drawn this frame (attachments mount on it). */
  let heldGun: {
    id: "ak47" | "m4" | "awp" | "mp5" | "deagle";
    view: typeof weapon;
  } | null = null;
  const flash = createMuzzleFlash();
  flash.root.traverse((object) => object.layers.set(0));
  weaponPivot.add(flash.root);
  // Karambit (secondary): the same knife GLB as first person, held low in the right fist.
  const knife = new THREE.Group();
  knife.name = "opponent-karambit";
  knife.visible = false;
  root.add(knife);
  const knifeAsset = retainAuthoredAsset(ARENA_MODELS.karambit);
  let knifeInstance: ReturnType<typeof cloneAuthoredModel> | undefined;
  void knifeAsset.ready
    .then((gltf) => {
      if (stopped) return;
      knifeInstance = cloneAuthoredModel(gltf.scene);
      const mesh = knifeInstance.root.getObjectByName("Karambit");
      if (!mesh) return;
      mesh.removeFromParent();
      // Knife space: ring at the origin, handle down -y, blade curving toward +z. Turned so
      // the blade curls forward (-z, the way the character faces) below the fist.
      const holder = new THREE.Group();
      holder.rotation.y = Math.PI;
      holder.scale.setScalar(KARAMBIT_SCALE);
      holder.add(mesh);
      knife.add(holder);
      mesh.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = true;
      });
    })
    .catch(() => {});
  // Grenades: the same models as first person (art/blender/grenades), real size.
  const nade = new THREE.Group();
  nade.name = "opponent-grenade";
  nade.visible = false;
  root.add(nade);
  const nadeModels = {} as Partial<Record<GrenadeType, THREE.Object3D>>;
  const nadeAsset = retainAuthoredAsset(ARENA_MODELS.grenades);
  let nadeInstance: ReturnType<typeof cloneAuthoredModel> | undefined;
  void nadeAsset.ready
    .then((gltf) => {
      if (stopped) return;
      nadeInstance = cloneAuthoredModel(gltf.scene);
      for (const type of GRENADE_TYPES) {
        const model = nadeInstance.root.getObjectByName(`GR_${type}`);
        if (!model) continue;
        model.removeFromParent();
        model.position.set(0, -0.06, 0);
        model.scale.setScalar(1.15);
        model.visible = false;
        model.traverse((o) => {
          if (o instanceof THREE.Mesh) o.castShadow = true;
        });
        nade.add(model);
        nadeModels[type] = model;
      }
    })
    .catch(() => {});
  let throwAt = -Infinity,
    throwKind: ThrowKind = "over";
  let releasedGrenade: GrenadeType | null = null;
  const nadeFrom = new THREE.Vector3(),
    nadeTo = new THREE.Vector3();
  /** Last opponent swing: drives a short arm/knife sweep (presentation of server events). */
  let swingAt = -Infinity,
    swingKind: KnifeAttack = "slash";
  weapon.root.visible = false;
  // Police (A) and Terrorist (B) are complete authored characters (body, gear and head),
  // fitted in Blender to the Mixamo bone names driven below (art/blender/chars).
  const asset = retainAuthoredAsset(CHARACTER_MODELS[police ? "police" : "terrorist"]);
  const bones = new Map<string, THREE.Bone>(),
    footOrientations = new Map<string, THREE.Quaternion>(),
    rest: { bone: THREE.Bone; p: THREE.Vector3; q: THREE.Quaternion }[] = [];
  const sides = ["Left", "Right"] as const;
  const gripPoses: Array<{ bone: THREE.Bone; q: THREE.Quaternion }> = [];
  const wristRotations = {
    Left: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)),
    Right: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
  };
  const fingerCurl = new THREE.Quaternion(),
    curlAxis = new THREE.Vector3(0, 0, 1);
  let instance: ReturnType<typeof cloneAuthoredModel> | undefined,
    loaded = false,
    stopped = false,
    baseY = 0,
    lastX = 0,
    lastZ = 0,
    initialized = false,
    gait = 0,
    speed = 0,
    flashUntil = 0,
    travelX = 0,
    travelZ = -1;
  // Follows the rendered head centre each frame; tests compare it with the head hitbox.
  const headCenterMarker = new THREE.Group();
  headCenterMarker.name = "head-center";
  root.add(headCenterMarker);
  const ready = Promise.all([
    asset.ready,
    weapon.ready,
    awp.ready,
    alt?.ready,
    smg?.ready,
    pistol?.ready,
  ])
    .then(([gltf]) => {
      if (stopped) return;
      instance = cloneAuthoredModel(gltf.scene);
      if (options.bareHead && police) {
        stripHeadgear(instance.root);
        root.userData["bareHead"] = true;
      }
      body.add(instance.root);
      body.rotation.y = Math.PI;
      instance.root.traverse((object) => {
        if (object instanceof THREE.Bone) {
          const name = object.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, "");
          bones.set(name, object);
          // GLTFLoader sanitizes spaces in the sourced Valve finger names.
          if (name.startsWith("arm_")) bones.set(name.replaceAll("_", " "), object);
          rest.push({ bone: object, p: object.position.clone(), q: object.quaternion.clone() });
        }
      });
      body.updateMatrixWorld(true);
      const head = bones.get("Head")!,
        top = bones.get("HeadTop_End")!;
      const center = head
          .getWorldPosition(new THREE.Vector3())
          .lerp(top.getWorldPosition(new THREE.Vector3()), 0.5),
        bounds = new THREE.Box3().setFromObject(body);
      const scale = 1.6 / (center.y - bounds.min.y);
      // Same height (eyes stay on the server head hitbox), slightly broader build and kit,
      // which reads as a heavier COD/CS operator silhouette at range.
      const girth = scale * BODY_BREADTH;
      body.scale.set(girth, scale, girth);
      body.position.set(-center.x * girth, -bounds.min.y * scale, -center.z * girth);
      baseY = body.position.y;
      root.add(body);
      body.updateMatrixWorld(true);
      for (const view of [weapon, awp, alt, smg]) if (view) seatGun(view);
      if (pistol) seatPistol(pistol);
      const rootRotation = root.getWorldQuaternion(new THREE.Quaternion()).invert();
      for (const side of ["Left", "Right"])
        footOrientations.set(
          side,
          rootRotation
            .clone()
            .multiply(bones.get(side + "Foot")!.getWorldQuaternion(new THREE.Quaternion())),
        );
      fallback.root.removeFromParent();
      fallback.dispose();
      fallback.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      // Each source rig has a different wrist/finger basis (Mixamo vs Valve).
      // Solve that basis from its actual knuckles before applying the weapon-space grasp.
      for (const side of sides) {
        const valve = "arm " + side.toLowerCase() + " finger ";
        const middle = bones.get(side + "HandMiddle1") ?? bones.get(valve + "3a");
        const index = bones.get(side + "HandIndex1") ?? bones.get(valve + "2a");
        if (middle && index) {
          const x = middle.position
            .clone()
            .normalize()
            .multiplyScalar(side === "Left" ? 1 : -1);
          const z = index.position.clone().sub(middle.position).normalize();
          const y = new THREE.Vector3().crossVectors(z, x).normalize();
          z.crossVectors(x, y).normalize();
          const basis = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().makeBasis(x, y, z),
          );
          wristRotations[side].multiply(basis.invert());
        }
      }
      // Sourced bodies have straight bind-pose fingers. Bake a closed grip once;
      // solve wrist orientation in weapon space after arm IK, not from the elbow.
      for (const side of sides)
        for (const finger of ["Index", "Middle", "Ring", "Pinky", "Thumb"]) {
          for (let joint = 1; joint <= 3; joint++) {
            const digit =
              finger === "Thumb" ? 1 : finger === "Index" ? 2 : finger === "Middle" ? 3 : null;
            const bone =
              bones.get(side + "Hand" + finger + joint) ??
              (digit
                ? bones.get(
                    "arm " + side.toLowerCase() + " finger " + digit + ["a", "b", "c"][joint - 1],
                  )
                : undefined);
            if (!bone) continue;
            const angle =
              finger === "Thumb"
                ? -0.35
                : side === "Right" && finger === "Index"
                  ? -0.35
                  : -[0.65, 1.05, 0.7][joint - 1]!;
            fingerCurl.setFromAxisAngle(curlAxis, angle);
            gripPoses.push({ bone, q: bone.quaternion.clone().multiply(fingerCurl) });
          }
        }
      loaded = true;
    })
    .catch((error) =>
      console.warn("Authored character unavailable; retaining the existing rig.", error),
    );
  const av = new THREE.Vector3(),
    bv = new THREE.Vector3(),
    cv = new THREE.Vector3(),
    dv = new THREE.Vector3(),
    pole = new THREE.Vector3(),
    joint = new THREE.Vector3(),
    finish = new THREE.Vector3();
  const parentQ = new THREE.Quaternion(),
    deltaQ = new THREE.Quaternion(),
    worldQ = new THREE.Quaternion();
  const matrixPosition = new THREE.Vector3(),
    matrixScale = new THREE.Vector3();
  const rotation = (object: THREE.Object3D, out: THREE.Quaternion) => {
    object.matrixWorld.decompose(matrixPosition, out, matrixScale);
    return out;
  };
  const aim = (bone: THREE.Bone, child: THREE.Bone, target: THREE.Vector3) => {
    av.setFromMatrixPosition(bone.matrixWorld);
    bv.setFromMatrixPosition(child.matrixWorld);
    bv.sub(av).normalize();
    cv.copy(target).sub(av).normalize();
    deltaQ.setFromUnitVectors(bv, cv);
    rotation(bone.parent!, parentQ);
    worldQ.copy(parentQ).invert().multiply(deltaQ).multiply(parentQ);
    bone.quaternion.premultiply(worldQ);
    // The root was composed once before IK; ancestors are already current.
    // Refresh only this changed subtree instead of walking back to the scene.
    bone.updateWorldMatrix(false, true);
  };
  const limb = (
    upper: THREE.Bone,
    lower: THREE.Bone,
    end: THREE.Bone,
    target: THREE.Vector3,
    bend: THREE.Vector3,
  ) => {
    av.setFromMatrixPosition(upper.matrixWorld);
    bv.setFromMatrixPosition(lower.matrixWorld);
    cv.setFromMatrixPosition(end.matrixWorld);
    const l1 = av.distanceTo(bv),
      l2 = bv.distanceTo(cv);
    dv.copy(target).sub(av);
    const distance = THREE.MathUtils.clamp(dv.length(), 0.02, l1 + l2 - 0.001);
    dv.normalize();
    pole.copy(bend).addScaledVector(dv, -bend.dot(dv)).normalize();
    const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
    joint
      .copy(av)
      .addScaledVector(dv, along)
      .addScaledVector(pole, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
    finish.copy(target);
    aim(upper, lower, joint);
    aim(lower, end, finish);
  };
  const target = new THREE.Vector3(),
    bend = new THREE.Vector3(),
    headCenter = new THREE.Vector3(),
    topCenter = new THREE.Vector3();
  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    /** The gun in the hands after the last update (null: knife, grenade or empty hands). */
    heldWeapon() {
      if (!heldGun || !heldGun.view.loaded) return null;
      const master = heldGun.view.root.getObjectByName("Weapon_Master");
      return master ? { id: heldGun.id, view: heldGun.view, master, pivot: weaponPivot } : null;
    },
    /** A grenade left this player's hand (server event): the throw plays from the wind-up. */
    throw(now: number, kind: ThrowKind, type: GrenadeType) {
      throwAt = now;
      throwKind = kind;
      releasedGrenade = type;
    },
    shot(now: number, attack?: KnifeAttack) {
      if (attack) {
        swingAt = now;
        swingKind = attack;
        fallback.shot(now, attack);
        return;
      }
      flashUntil = now + 42;
      fallback.shot(now);
    },
    /**
     * The drawn pose jumped (reappearing after redaction, or re-entering the view): start
     * the gait from the opponent's current speed and heading instead of reading the jump
     * as one huge stride (a sprint pop, legs snapping toward the jump).
     */
    resetMotion(speedMs = 0, localX = 0, localZ = -1) {
      fallback.resetMotion(speedMs, localX, localZ);
      initialized = false;
      speed = Math.max(0, Math.min(7, speedMs));
      const length = Math.hypot(localX, localZ);
      if (length > 1e-4) {
        travelX = localX / length;
        travelZ = localZ / length;
      }
    },
    update(
      dt: number,
      now: number,
      pitch: number,
      alive: boolean,
      crouched = false,
      motion: Motion = {},
    ) {
      root.visible = alive || motion.death !== undefined;
      const stance = motion.stance ?? (crouched ? 1 : 0);
      const crouchOffset = stance * 0.65;
      anchor.position.y = THREE.MathUtils.lerp(EYE_HEIGHT, CROUCH_EYE_HEIGHT, stance);
      if (!loaded) {
        fallback.update(dt, now, pitch, root.visible, crouched, motion);
        return;
      }
      const dx = initialized ? root.position.x - lastX : 0,
        dz = initialized ? root.position.z - lastZ : 0;
      initialized = true;
      lastX = root.position.x;
      lastZ = root.position.z;
      const rawDistance = Math.hypot(dx, dz),
        distance = alive ? Math.min(0.3, rawDistance) : 0,
        seconds = Math.max(0.001, dt / 1000);
      speed = THREE.MathUtils.damp(speed, Math.min(7, distance / seconds), 12, seconds);
      if (rawDistance > 0.0001) {
        const yaw = root.rotation.y;
        travelX = THREE.MathUtils.damp(
          travelX,
          (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / rawDistance,
          12,
          seconds,
        );
        travelZ = THREE.MathUtils.damp(
          travelZ,
          (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / rawDistance,
          12,
          seconds,
        );
      }
      gait += (distance * Math.PI) / ((speed > 6 ? 1.9 : 1.6) * (1 - stance) + 1.25 * stance);
      const stride = Math.min(1, speed / 3);
      for (let i = 0; i < rest.length; i++) {
        const pose = rest[i]!;
        pose.bone.position.copy(pose.p);
        pose.bone.quaternion.copy(pose.q);
      }
      // Let the hips settle into the stride. At full extension the previous
      // pelvis height exceeded the leg's IK reach and lifted the planted foot.
      body.position.y = motion.seated
        ? baseY - motion.seated.drop
        : baseY - crouchOffset - stride * 0.04;
      root.updateWorldMatrix(true, true);
      if (motion.seated?.lean) {
        // Lean the upper body from the lower spine, about the character's own left–right axis.
        const spine = bones.get("Spine");
        if (spine) {
          upAxis.set(1, 0, 0).transformDirection(root.matrixWorld);
          rotation(spine.parent!, parentQ);
          twistQ.setFromAxisAngle(upAxis, -motion.seated.lean);
          spine.quaternion.premultiply(parentQ.clone().invert().multiply(twistQ).multiply(parentQ));
          spine.updateWorldMatrix(false, true);
        }
      }
      for (const side of sides) {
        const sign = side === "Left" ? -1 : 1,
          phase = gait + (sign === 1 ? Math.PI : 0),
          swing = Math.sin(phase) * 0.28 * stride,
          lift = Math.max(0, Math.cos(phase)) * 0.065 * stride;
        if (motion.seated) {
          const f = motion.seated.foot;
          target.set(sign * f[0], f[1], f[2]);
        } else if (motion.canopy) {
          // Hanging: feet a little forward and apart, knees bent, an easy alternating swing;
          // the flare draws the knees up for the landing.
          const f = motion.canopy.flare,
            d = (motion.canopy.dive ?? 0) * (1 - f),
            sway = Math.sin(now / 900 + (sign > 0 ? 0 : 1.7)) * 0.035 * (1 - 0.7 * d);
          // Diving: legs together and trailing behind, nearly straight, one a little higher.
          target.set(
            sign * (0.13 - 0.05 * d),
            0.2 + 0.24 * f - (0.14 - (sign > 0 ? 0.07 : 0)) * d,
            -0.1 - 0.16 * f + sway + 0.42 * d,
          );
        } else
          target.set(
            sign * 0.105 + swing * travelX * 0.65,
            0.12 + lift + (motion.airborne ? 0.1 : 0),
            swing * travelZ,
          );
        root.localToWorld(target);
        // Sat: knees up and a little out (a rider's knees grip the tank, out to the side).
        if (motion.seated) bend.set(sign * 0.35, 1, -0.8);
        else bend.set(0, 0, -1);
        bend.transformDirection(root.matrixWorld);
        limb(
          bones.get(side + "UpLeg")!,
          bones.get(side + "Leg")!,
          bones.get(side + "Foot")!,
          target,
          bend,
        );
        const foot = bones.get(side + "Foot")!;
        rotation(foot.parent!, parentQ).invert();
        rotation(root, worldQ);
        worldQ.multiply(footOrientations.get(side)!);
        foot.quaternion.copy(parentQ.multiply(worldQ));
        foot.updateWorldMatrix(false, true);
      }
      const recoil = Math.max(0, (flashUntil - now) / 42) * 0.025;
      weaponPivot.position.y = 1.25 - crouchOffset;
      weaponPivot.rotation.x = pitch + recoil;
      weaponPivot.rotation.z = motion.reloading ? -0.25 : 0;
      const throwT = (now - throwAt) / NADE_THROW_MS;
      const throwing = throwT >= 0 && throwT < 1;
      const holdingNade = (motion.weapon === "grenade" && !!motion.nade) || throwing;
      if (!throwing && (!holdingNade || (motion.nade && motion.nade !== releasedGrenade)))
        releasedGrenade = null;
      const holdingKnife = motion.weapon === "knife" && !holdingNade;
      const wantsAlt =
        !!alt &&
        alt.loaded &&
        (motion.primary === "ak47" || motion.primary === "m4") &&
        motion.primary !== ownRifle;
      const held =
        motion.primary === "awp" && awp.loaded
          ? awp
          : motion.primary === "mp5" && smg?.loaded
            ? smg
            : motion.primary === "deagle" && pistol?.loaded
              ? pistol
              : wantsAlt
                ? alt!
                : weapon;
      const holdingPistol = held === pistol;
      const empty = motion.primary === "none" || !!motion.canopy || !!motion.seated;
      for (const v of [weapon, awp, alt, smg, pistol]) if (v && v !== held) v.update(false, 0, 0);
      held.update(!empty && !holdingKnife && !holdingNade, motion.reloading ? 0.4 : 0, recoil);
      heldGun =
        empty || holdingKnife || holdingNade
          ? null
          : {
              id:
                held === awp
                  ? "awp"
                  : held === smg
                    ? "mp5"
                    : held === pistol
                      ? "deagle"
                      : held === weapon
                        ? ownRifle
                        : ownRifle === "m4"
                          ? "ak47"
                          : "m4",
              view: held,
            };
      knife.visible = holdingKnife && alive;
      // Grenade in the fist: carried, wound up while held, thrown (the hand empties at release).
      if (holdingNade) {
        const kind = throwing ? throwKind : (motion.nadeHold ?? null);
        const start = NADE_POSE[kind ?? "carry"];
        nadeFrom.set(start[0], start[1] - crouchOffset, start[2]);
        if (throwing) {
          const rel = NADE_RELEASE[throwKind];
          // Forward to the release (≈0.12 s), then follow through down and in.
          const a = Math.min(1, throwT / 0.25),
            b = Math.max(0, (throwT - 0.25) / 0.75);
          nadeTo.set(rel[0], rel[1] - crouchOffset, rel[2]);
          nadeFrom.lerp(nadeTo, a * a);
          if (b > 0) nadeFrom.lerp(nadeTo.set(-0.05, 0.95 - crouchOffset, -0.3), b);
        }
        nade.position.copy(nadeFrom);
        nade.rotation.set(throwing ? -throwT * 6 : 0, 0, 0);
        for (const type of GRENADE_TYPES) {
          const model = nadeModels[type];
          // This event means the projectile has already left the hand. Keep the hand empty
          // through the follow-through and any delayed pre-release pose snapshots.
          if (model)
            model.visible = type === (motion.nade ?? "he") && !throwing && type !== releasedGrenade;
        }
        nade.visible = alive;
      } else nade.visible = false;
      // Swing: slash sweeps right → left and down, stab thrusts forward (≈0.3 s).
      const swingT = (now - swingAt) / (swingKind === "stab" ? 320 : 260),
        swing = swingT >= 0 && swingT < 1 ? Math.sin(Math.PI * swingT) : 0,
        sweep = swingT >= 0 && swingT < 1 ? swingT * 2 - 1 : 0;
      const knifeAt = target.set(
        0.1 + (swingKind === "slash" ? -sweep * 0.22 * swing : 0),
        1.1 - crouchOffset + (swingKind === "slash" ? -sweep * 0.1 * swing : 0.06 * swing),
        -0.24 - (swingKind === "stab" ? 0.3 : 0.12) * swing,
      );
      knife.position.copy(knifeAt);
      knife.rotation.set(pitch * 0.5 + (swingKind === "stab" ? 1.1 : 0.4) * swing, 0, 0);
      // Rifle stance (owner, 2026-11-04: the stock went into the body, not the shoulder): the
      // upper body bladed, left shoulder forward and right shoulder back, so the butt rests in
      // the right shoulder pocket and the support arm reaches the handguard; the neck turns
      // back so the head still faces the aim.
      // The pistol is held square to the target (isosceles): no blading.
      if (!empty && !holdingKnife && !holdingNade && !holdingPistol && alive) {
        upAxis.set(0, 1, 0).transformDirection(root.matrixWorld);
        for (const [name, angle] of STANCE_TWIST) {
          const bone = bones.get(name);
          if (!bone) continue;
          rotation(bone.parent!, parentQ);
          twistQ.setFromAxisAngle(upAxis, angle);
          bone.quaternion.premultiply(parentQ.clone().invert().multiply(twistQ).multiply(parentQ));
          bone.updateWorldMatrix(false, true);
        }
      }
      for (const side of sides) {
        const sign = side === "Left" ? -1 : 1;
        held.grip(side === "Left" ? "L" : "R", target);
        // Markers describe the grasp centre; the character Hand bone is at the wrist.
        rotation(weaponPivot, worldQ);
        cv.set(
          side === "Left" ? -0.065 : 0.065,
          side === "Left" ? -0.045 : -0.03,
          0.025,
        ).applyQuaternion(worldQ);
        target.add(cv);
        if (motion.seated) {
          const h = side === "Left" ? motion.seated.handL : motion.seated.handR;
          root.localToWorld(target.set(h[0], h[1], h[2]));
        } else if (motion.canopy) {
          // On the toggles above the shoulders; the pulled side comes down to the chest.
          // Diving: both hands forward and up on the front risers, pulling them down.
          const pull = side === "Left" ? motion.canopy.pullL : motion.canopy.pullR,
            d = (motion.canopy.dive ?? 0) * (1 - motion.canopy.flare);
          root.localToWorld(
            target.set(
              sign * (0.3 - 0.05 * d),
              motion.canopy.toggleY - 0.42 * pull * (1 - d) - 0.1 * d,
              0.02 - 0.3 * d,
            ),
          );
        } else if (holdingKnife)
          root.localToWorld(
            side === "Right"
              ? target.copy(knife.position).add(cv.set(-0.01, 0.06, 0.07))
              : target.set(-0.24, 0.95 - stance * 0.5, -0.12),
          );
        else if (holdingNade)
          root.localToWorld(
            side === "Right"
              ? target.copy(nade.position).add(cv.set(0.05, -0.02, 0.05))
              : // The left hand stays in front of the chest (it pulled the pin), low otherwise.
                target.set(-0.16, (motion.nadeHold ? 1.15 : 0.98) - stance * 0.5, -0.22),
          );
        // Elbows: the support elbow down and out; the firing elbow out to the side, so the
        // upper arm clears the stock in the shoulder pocket instead of closing over it.
        if (motion.seated)
          bend.set(sign * 0.8, -1, 0.25); // elbows down and a little out
        else if (motion.canopy)
          bend.set(sign, -0.15, 0.35); // elbows out and a little back
        else if (side === "Left" || holdingKnife || holdingNade) bend.set(sign, -0.6, -0.3);
        else bend.set(1, -0.25, 0.05);
        bend.transformDirection(root.matrixWorld);
        limb(
          bones.get(side + "Arm")!,
          bones.get(side + "ForeArm")!,
          bones.get(side + "Hand")!,
          target,
          bend,
        );
        if (!holdingKnife && !holdingNade && !motion.canopy && !motion.seated) {
          const hand = bones.get(side + "Hand")!;
          rotation(hand.parent!, parentQ).invert();
          rotation(weaponPivot, worldQ).multiply(wristRotations[side]);
          hand.quaternion.copy(parentQ.multiply(worldQ));
          hand.updateWorldMatrix(false, true);
        }
      }
      if (!holdingKnife && !holdingNade)
        for (const pose of gripPoses) pose.bone.quaternion.copy(pose.q); // fists (gun or toggle)
      if (motion.death !== undefined) {
        const collapse = motion.death;
        // Layer relaxed, asymmetric limbs over the fitted pose. The weapon and
        // hands remain attached while the body collapses and settles.
        bones.get("LeftUpLeg")!.rotation.x += collapse * 0.22;
        bones.get("LeftLeg")!.rotation.x -= collapse * 0.42;
        bones.get("RightUpLeg")!.rotation.x += collapse * 0.1;
        bones.get("RightLeg")!.rotation.x -= collapse * 0.2;
        bones.get("LeftArm")!.rotation.z += collapse * 0.14;
        bones.get("RightArm")!.rotation.z -= collapse * 0.08;
        root.updateWorldMatrix(true, true);
      }
      headCenter.setFromMatrixPosition(bones.get("Head")!.matrixWorld);
      topCenter.setFromMatrixPosition(bones.get("HeadTop_End")!.matrixWorld);
      headCenter.lerp(topCenter, 0.5);
      root.worldToLocal(headCenter);
      headCenterMarker.position.copy(headCenter);
      const tip = held.muzzle();
      flash.update(
        alive && !empty && !holdingKnife && !holdingNade ? flashUntil - now : 0,
        tip.z,
        tip.y,
        Math.floor(flashUntil),
      );
      flash.root.position.x = tip.x;
      // The Police M4A1 is suppressed: a much smaller flash at the can.
      if (motion.silenced ?? (police && held === weapon)) flash.root.scale.multiplyScalar(0.42);
    },
    dispose() {
      stopped = true;
      if (!loaded) fallback.dispose();
      instance?.dispose();
      weapon.dispose();
      awp.dispose();
      alt?.dispose();
      smg?.dispose();
      pistol?.dispose();
      flash.dispose();
      knifeInstance?.dispose();
      knifeAsset.release();
      nadeInstance?.dispose();
      nadeAsset.release();
      asset.release();
    },
  };
}

/**
 * The officer's helmet, goggles and their straps are separate blocks of the body mesh, all
 * above the collar (police-swat.glb bind pose, metres: helmet shell y 1.60–1.80, goggles
 * 1.71–1.80, clips and straps 1.56–1.74). Drop every block of the body (not the face) that
 * starts above HEADGEAR_FROM, on a copy of the geometry (the loaded model is shared).
 */
const HEADGEAR_FROM = 1.55;
function stripHeadgear(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.SkinnedMesh) || !/Object_6$/.test(o.name)) return;
    const g = o.geometry.clone();
    const pos = g.getAttribute("position"),
      index = g.getIndex();
    if (!index) return;
    // Blocks: triangles joined through shared (welded) positions.
    const key = new Map<string, number>(),
      parent: number[] = [];
    const vid = (i: number) => {
      const k = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
      let v = key.get(k);
      if (v === undefined) {
        v = parent.length;
        key.set(k, v);
        parent.push(v);
      }
      return v;
    };
    const find = (a: number) => {
      while (parent[a] !== a) a = parent[a] = parent[parent[a]!]!;
      return a;
    };
    const ids = Array.from({ length: pos.count }, (_, i) => vid(i));
    const tris = index.count / 3;
    for (let t = 0; t < tris; t++) {
      const a = find(ids[index.getX(t * 3)]!);
      parent[a] = find(ids[index.getX(t * 3 + 1)]!);
      parent[find(ids[index.getX(t * 3 + 1)]!)] = find(ids[index.getX(t * 3 + 2)]!);
    }
    const low = new Map<number, number>();
    for (let i = 0; i < pos.count; i++) {
      const r = find(ids[i]!);
      low.set(r, Math.min(low.get(r) ?? Infinity, pos.getY(i)));
    }
    const kept: number[] = [];
    for (let t = 0; t < tris; t++) {
      const v = index.getX(t * 3);
      if ((low.get(find(ids[v]!)) ?? 0) >= HEADGEAR_FROM) continue;
      kept.push(v, index.getX(t * 3 + 1), index.getX(t * 3 + 2));
    }
    g.setIndex(kept);
    o.geometry = g;
  });
}
