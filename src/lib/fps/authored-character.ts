import * as THREE from "three";
import type { Seat, Weapon } from "./protocol";
import type { WeaponKit } from "./weapon";
import { createCharacter as createFallback } from "./character-rig";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import { AK_VIEWMODEL, createAuthoredViewmodel, M4_VIEWMODEL } from "./authored-viewmodel";
import { EYE_HEIGHT, CROUCH_EYE_HEIGHT } from "./map";
import { createMuzzleFlash } from "./muzzle-flash";
import { CHARACTER_MODELS } from "./model-assets";

type Motion = {
  stance?: number;
  airborne?: boolean;
  weapon?: Weapon;
  reloading?: boolean;
  death?: number | undefined;
};
/** Authored skinned bodies, bone-space IK and reference-specific clothing. */
/** Horizontal build factor for both opponents (height is fixed by the head hitbox). */
const BODY_BREADTH = 1.06;

export function createCharacter(seat: Seat, branding: THREE.Material, kit: WeaponKit) {
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
  const weapon = createAuthoredViewmodel(
    weaponPivot,
    false,
    seat === "A" ? M4_VIEWMODEL : AK_VIEWMODEL,
  );
  const flash = createMuzzleFlash();
  flash.root.traverse((object) => object.layers.set(0));
  weaponPivot.add(flash.root);
  const pistol = new THREE.Group();
  weaponPivot.add(pistol);
  pistol.name = "opponent-pistol";
  const pistolMaterial = new THREE.MeshStandardMaterial({
    color: 0x27282d,
    metalness: 0.7,
    roughness: 0.35,
  });
  for (const [y, z, w, h, d] of [
    [0, -0.1, 0.045, 0.055, 0.21],
    [-0.07, -0.04, 0.04, 0.12, 0.06],
  ]) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w!, h!, d!), pistolMaterial);
    mesh.position.set(0, y!, z!);
    pistol.add(mesh);
  }
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
  const ready = Promise.all([asset.ready, weapon.ready])
    .then(([gltf]) => {
      if (stopped) return;
      instance = cloneAuthoredModel(gltf.scene);
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
    shot(now: number) {
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
      body.position.y = baseY - crouchOffset - stride * 0.04;
      root.updateWorldMatrix(true, true);
      for (const side of sides) {
        const sign = side === "Left" ? -1 : 1,
          phase = gait + (sign === 1 ? Math.PI : 0),
          swing = Math.sin(phase) * 0.28 * stride,
          lift = Math.max(0, Math.cos(phase)) * 0.065 * stride;
        target.set(
          sign * 0.105 + swing * travelX * 0.65,
          0.12 + lift + (motion.airborne ? 0.1 : 0),
          swing * travelZ,
        );
        root.localToWorld(target);
        bend.set(0, 0, -1).transformDirection(root.matrixWorld);
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
      weapon.update(motion.weapon !== "pistol", motion.reloading ? 0.4 : 0, recoil);
      pistol.visible = motion.weapon === "pistol";
      for (const side of sides) {
        const sign = side === "Left" ? -1 : 1;
        weapon.grip(side === "Left" ? "L" : "R", target);
        // Markers describe the grasp centre; the character Hand bone is at the wrist.
        rotation(weaponPivot, worldQ);
        cv.set(
          side === "Left" ? -0.065 : 0.065,
          side === "Left" ? -0.045 : -0.03,
          0.025,
        ).applyQuaternion(worldQ);
        target.add(cv);
        if (pistol.visible)
          root.localToWorld(
            target.set(
              side === "Right" ? 0.07 : -0.24,
              side === "Right" ? 1.18 - crouchOffset : 0.95 - stance * 0.5,
              -0.12,
            ),
          );
        bend.set(sign, -0.6, -0.3).transformDirection(root.matrixWorld);
        limb(
          bones.get(side + "Arm")!,
          bones.get(side + "ForeArm")!,
          bones.get(side + "Hand")!,
          target,
          bend,
        );
        if (!pistol.visible) {
          const hand = bones.get(side + "Hand")!;
          rotation(hand.parent!, parentQ).invert();
          rotation(weaponPivot, worldQ).multiply(wristRotations[side]);
          hand.quaternion.copy(parentQ.multiply(worldQ));
          hand.updateWorldMatrix(false, true);
        }
      }
      if (!pistol.visible) for (const pose of gripPoses) pose.bone.quaternion.copy(pose.q);
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
      const tip = weapon.muzzle();
      flash.update(
        alive ? flashUntil - now : 0,
        pistol.visible ? -0.205 : tip.z,
        pistol.visible ? 0 : tip.y,
        Math.floor(flashUntil),
      );
      flash.root.position.x = pistol.visible ? 0 : tip.x;
      // The Police M4A1 is suppressed: a much smaller flash at the can.
      if (police && !pistol.visible) flash.root.scale.multiplyScalar(0.42);
    },
    dispose() {
      stopped = true;
      if (!loaded) fallback.dispose();
      instance?.dispose();
      weapon.dispose();
      flash.dispose();
      pistolMaterial.dispose();
      pistol.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      asset.release();
    },
  };
}
