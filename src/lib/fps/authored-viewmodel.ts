import * as THREE from "three";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import {
  poseRifleHands,
  fitContinuousForearms,
  magazineGrip as magazineGripFrame,
  SHORT_FOREARMS,
} from "./fitted-rifle-hands";
import { ARENA_MODELS } from "./model-assets";
import { applyVeinTint, createForearmDetailTexture } from "./forearm-detail";
import { upgradeRifleMaterials } from "./rifle-materials";
import {
  BOLT_TRAVEL,
  MAG_POSITION,
  MAG_ROTATION,
  SUPPORT,
  WEAPON_POSITION,
  WEAPON_ROTATION,
  sampleNumber,
  sampleSegment,
  sampleVec,
  type SupportAnchor,
} from "./reload-animation";

/** Relief depth of the forearm detail map, in viewmodel-root units per unit of height. */
const FOREARM_BUMP_SCALE = 0.065;

/** Magazine grip, in rifle-local units: wrap axis just ahead of the authored grip marker. */
const MAG_GRIP_OFFSET = new THREE.Vector3(0, -0.035, -0.035);
const MAG_EDGE_DOWN = new THREE.Vector3(0, -0.9, -0.43);
const MAG_TO_WRIST = new THREE.Vector3(-0.6, 0, 0.8);

/** Real authored AK and skinned hands. Existing controller still owns every input and shot. */
export function createAuthoredViewmodel(parent: THREE.Object3D, firstPerson = true) {
  const asset = retainAuthoredAsset(ARENA_MODELS.rifle);
  const root = new THREE.Group();
  root.name = "authored-first-person";
  root.scale.setScalar(SHORT_FOREARMS.scale);
  root.visible = false;
  parent.add(root);
  // Weapon_Master pivots at the right-hand grip: rifle, magazine, bolt and trigger arm move together.
  // The support arm is a separate rig pivoting at its wrist so it can leave the gun during reload.
  const weapon = new THREE.Group(),
    weaponContent = new THREE.Group(),
    support = new THREE.Group(),
    supportContent = new THREE.Group();
  weapon.name = "Weapon_Master";
  support.name = "support-arm";
  weapon.add(weaponContent);
  support.add(supportContent);
  root.add(weapon, support);
  let stopped = false,
    loaded = false,
    instance: ReturnType<typeof cloneAuthoredModel> | undefined;
  const ownedGeometry: THREE.BufferGeometry[] = [],
    ownedTextures: THREE.Texture[] = [],
    ownedMaterials: THREE.Material[] = [];
  const muzzle = new THREE.Vector3(),
    gripLeft = new THREE.Vector3(),
    gripRight = new THREE.Vector3(),
    marker = new THREE.Object3D(),
    matrix = new THREE.Matrix4();
  let magazine: THREE.Object3D | undefined,
    bolt: THREE.Object3D | undefined,
    magazineGrip: THREE.Object3D | undefined;
  const magazineRest = { position: new THREE.Vector3(), rotation: new THREE.Euler() };
  let boltRest = 0;
  // Support hand baked a second time gripping the magazine; it rides on the magazine itself.
  const magazineHand = new THREE.Group(),
    magazineHold = new THREE.Matrix4(),
    magazineRestMatrix = new THREE.Matrix4(),
    magazineNow = new THREE.Matrix4();
  magazineHand.name = "magazine-grip-hand";
  const supportWrist = new THREE.Vector3(),
    supportGuard = new THREE.Vector3(),
    rigReady = { value: false };
  const scratch = {
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    qa: new THREE.Quaternion(),
    qb: new THREE.Quaternion(),
    c: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    m: new THREE.Matrix4(),
    m2: new THREE.Matrix4(),
    euler: new THREE.Euler(),
    inverse: new THREE.Matrix4(),
  };
  const skinMap = new THREE.TextureLoader().load("/fps/forearm-skin-v1.webp");
  skinMap.colorSpace = THREE.SRGBColorSpace;
  skinMap.wrapS = skinMap.wrapT = THREE.RepeatWrapping;
  skinMap.anisotropy = 8;
  skinMap.repeat.set(2, 3);
  ownedTextures.push(skinMap);
  // Veins, wrist tendons and muscle separation as relief plus a cool vein tint.
  const skinDetail = createForearmDetailTexture();
  ownedTextures.push(skinDetail);
  const skin = applyVeinTint(
    new THREE.MeshPhysicalMaterial({
      map: skinMap,
      color: 0xffffff,
      roughness: 0.56,
      metalness: 0,
      bumpMap: skinDetail,
      bumpScale: FOREARM_BUMP_SCALE,
      // Warm grazing-angle sheen stands in for subsurface scattering on the forearm's edges.
      sheen: 0.35,
      sheenColor: new THREE.Color(0xff9c80),
      sheenRoughness: 0.55,
    }),
    1,
  );
  ownedMaterials.push(skin);
  const ready = asset.ready
    .then((gltf) => {
      if (stopped) return;
      instance = cloneAuthoredModel(gltf.scene);
      weaponContent.add(instance.root);
      if (!firstPerson) instance.root.getObjectByName("FPRig")?.removeFromParent();
      // Fit the original hand rig to this rifle before baking the connected wrist surfaces.
      instance.root.getObjectByName("SpareMagazine")?.removeFromParent();
      const arm = instance.root.getObjectByName("FPArms") as THREE.SkinnedMesh | undefined;
      if (firstPerson && arm?.isSkinnedMesh) {
        // Bone states are snapshotted so a second grip (on the magazine) can be fitted and
        // baked from the authored pose, then the handguard pose restored for everything else.
        const rig = instance.root.getObjectByName("FPRig")!,
          joints: THREE.Object3D[] = [];
        rig.traverse((o) => joints.push(o));
        const snapshot = () =>
          joints.map((o) => [o.position.clone(), o.quaternion.clone(), o.scale.clone()] as const);
        const restore = (state: ReturnType<typeof snapshot>) => {
          joints.forEach((o, i) => {
            o.position.copy(state[i]![0]);
            o.quaternion.copy(state[i]![1]);
            o.scale.copy(state[i]![2]);
          });
          instance!.root.updateWorldMatrix(true, true);
        };
        const authored = snapshot();
        const supportDelta = poseRifleHands(instance.root);
        const fitted = fitContinuousForearms(arm, root, supportDelta);
        const material = (
          Array.isArray(arm.material) ? arm.material[0]! : arm.material
        ) as THREE.MeshStandardMaterial;
        // Matte black tactical gloves (synthetic leather), identical for police and terrorist.
        material.color.setHex(0x34353a);
        material.roughness = 0.9;
        material.metalness = 0;
        material.envMapIntensity = 0.55;
        for (const side of ["L", "R"] as const) {
          const gloves = new THREE.Mesh(fitted[side].gloves, material);
          gloves.name = `fitted-rifle-gloves-${side}`;
          const forearms = new THREE.Mesh(fitted[side].skin, skin);
          forearms.name = `continuous-rifle-forearms-${side}`;
          (side === "L" ? supportContent : weaponContent).add(gloves, forearms);
          ownedGeometry.push(fitted[side].gloves, fitted[side].skin);
        }
        root.userData["wristSeams"] = fitted.seams;
        arm.visible = false;
        const handNode = instance.root.getObjectByName("Hand_L")!;
        const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
        handNode.getWorldPosition(supportWrist).applyMatrix4(rootInverse);
        const handOnGuard = rootInverse.clone().multiply(handNode.matrixWorld);
        const guardState = snapshot();

        // Magazine grip: palm on the magazine's left face, fingers round its front edge.
        restore(authored);
        const magNode = instance.root.getObjectByName("Magazine")!,
          magGripNode = instance.root.getObjectByName("MagazineGrip")!;
        const toInstance = new THREE.Matrix4().copy(instance.root.matrixWorld).invert();
        const axisPoint = magGripNode
          .getWorldPosition(new THREE.Vector3())
          .applyMatrix4(toInstance)
          .add(MAG_GRIP_OFFSET);
        const frame = magazineGripFrame(axisPoint, MAG_EDGE_DOWN, MAG_TO_WRIST);
        const magDelta = poseRifleHands(instance.root, frame);
        const magFitted = fitContinuousForearms(arm, root, magDelta, {
          ...SHORT_FOREARMS,
          elbow: { L: frame.direction(SHORT_FOREARMS.elbow.L), R: SHORT_FOREARMS.elbow.R },
        });
        const handOnMag = rootInverse.clone().multiply(handNode.matrixWorld);
        restore(guardState);
        root.updateWorldMatrix(true, true);
        magazineHold.copy(handOnMag).multiply(handOnGuard.invert());
        magazineRestMatrix.copy(rootInverse).multiply(magNode.matrixWorld);
        const intoMagazine = new THREE.Matrix4()
          .copy(magNode.matrixWorld)
          .invert()
          .multiply(root.matrixWorld);
        magFitted.L.gloves.applyMatrix4(intoMagazine);
        magFitted.L.skin.applyMatrix4(intoMagazine);
        const heldGloves = new THREE.Mesh(magFitted.L.gloves, material),
          heldForearm = new THREE.Mesh(magFitted.L.skin, skin);
        heldGloves.name = "magazine-grip-gloves";
        heldForearm.name = "magazine-grip-forearm";
        magazineHand.add(heldGloves, heldForearm);
        magazineHand.visible = false;
        magNode.add(magazineHand);
        ownedGeometry.push(magFitted.L.gloves, magFitted.L.skin);
        magFitted.R.gloves.dispose();
        magFitted.R.skin.dispose();
      }
      upgradeRifleMaterials(instance.root, ownedMaterials);
      const tip = instance.root.getObjectByName("MuzzleDeviceTip");
      if (tip) tip.add(marker);
      root.updateWorldMatrix(true, true);
      marker.getWorldPosition(muzzle);
      parent.worldToLocal(muzzle);
      for (const [name, out] of [
        ["GripL", gripLeft],
        ["GripR", gripRight],
      ] as const) {
        const grip = instance.root.getObjectByName(name);
        if (grip) {
          grip.getWorldPosition(out);
          root.worldToLocal(out);
        } else out.set(0, name === "GripL" ? -0.01 : -0.095, name === "GripL" ? -0.8 : -0.172);
      }
      magazine = instance.root.getObjectByName("Magazine");
      magazineGrip = instance.root.getObjectByName("MagazineGrip");
      bolt = instance.root.getObjectByName("ChargingHandle");
      if (magazine) {
        magazineRest.position.copy(magazine.position);
        magazineRest.rotation.copy(magazine.rotation);
      }
      boltRest = bolt?.position.z ?? 0;
      // Re-centre both rigs on their pivots without moving anything at rest.
      weapon.position.copy(gripRight);
      weaponContent.position.copy(gripRight).negate();
      support.position.copy(supportWrist);
      supportContent.position.copy(supportWrist).negate();
      supportGuard.copy(supportWrist).sub(gripRight);
      rigReady.value = firstPerson && !!magazine && !!bolt && !!magazineGrip;
      root.traverse((object) => {
        object.layers.set(firstPerson ? 1 : 0);
        if (object instanceof THREE.Mesh) object.castShadow = !firstPerson;
      });
      loaded = true;
    })
    .catch((error) =>
      console.warn("Authored AK unavailable; retaining the existing weapon.", error),
    );
  /** Apply the key-posed reload (and bolt kick) to the weapon, magazine and support rigs. */
  function pose(p: number, kick: number) {
    const { a, b, c, qa, qb, euler, inverse } = scratch;
    const wp = sampleVec(WEAPON_POSITION, p),
      wr = sampleVec(WEAPON_ROTATION, p);
    weapon.position.set(gripRight.x + wp[0], gripRight.y + wp[1], gripRight.z + wp[2]);
    weapon.rotation.set(wr[0], wr[1], wr[2]);
    const mp = sampleVec(MAG_POSITION, p),
      mr = sampleVec(MAG_ROTATION, p);
    magazine!.position.set(
      magazineRest.position.x + mp[0],
      magazineRest.position.y + mp[1],
      magazineRest.position.z + mp[2],
    );
    magazine!.rotation.set(
      magazineRest.rotation.x + mr[0],
      magazineRest.rotation.y + mr[1],
      magazineRest.rotation.z + mr[2],
    );
    bolt!.position.z = boltRest + sampleNumber(BOLT_TRAVEL, p) + kick * 0.025;
    weapon.updateMatrixWorld(true);
    inverse.copy(root.matrixWorld).invert();
    // Resolve both bracketing keys against the live rig, then blend: the hand tracks moving parts.
    // The magazine anchor is the exact rigid transform that puts the handguard hand where the
    // magazine-grip hand is, so swapping between the two baked hands never pops.
    magazineNow.copy(inverse).multiply(magazine!.matrixWorld);
    const hold = scratch.m.copy(magazineNow).multiply(scratch.m2.copy(magazineRestMatrix).invert());
    hold.multiply(magazineHold);
    const anchor = (
      key: { anchor: SupportAnchor; offset: readonly number[]; rotation: readonly number[] },
      out: THREE.Vector3,
      rotation: THREE.Quaternion,
    ) => {
      const extra = scratch.q.setFromEuler(
        euler.set(key.rotation[0]!, key.rotation[1]!, key.rotation[2]!),
      );
      if (key.anchor === "mag") {
        out.copy(supportWrist).applyMatrix4(hold);
        rotation.setFromRotationMatrix(hold).multiply(extra);
      } else {
        if (key.anchor === "guard")
          out.copy(supportGuard).applyQuaternion(weapon.quaternion).add(weapon.position);
        else bolt!.getWorldPosition(out).applyMatrix4(inverse);
        rotation.copy(extra).premultiply(weapon.quaternion);
      }
      out.add(
        a.set(key.offset[0]!, key.offset[1]!, key.offset[2]!).applyQuaternion(weapon.quaternion),
      );
    };
    const segment = sampleSegment(SUPPORT, p);
    anchor(segment.a, c, qa);
    anchor(segment.b, b, qb);
    support.position.copy(c.lerp(b, segment.k));
    support.quaternion.copy(qa.slerp(qb, segment.k));
    // While the magazine is in hand, the magazine-grip hand (fingers round the mag) is shown.
    const held = segment.a.anchor === "mag" && segment.b.anchor === "mag";
    magazineHand.visible = held;
    support.visible = !held;
  }
  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    /**
     * First person: `reload` is reload progress 0 → 1 (0 when not reloading).
     * Third person keeps the simple lowered-magazine cue, where `reload` is an amount 0 → 1.
     */
    update(rifle: boolean, reload: number, kick: number) {
      root.visible = loaded && rifle;
      if (!loaded) return;
      if (!rigReady.value) {
        if (magazine) {
          magazine.position.y = -0.002 - reload * 0.09;
          magazine.rotation.x = reload * 0.12;
        }
        if (bolt) bolt.position.z = -0.4857 + kick * 0.025;
        return;
      }
      pose(reload > 0 && reload < 1 ? reload : 0, kick);
    },
    muzzle() {
      // Live, so flashes stay on the muzzle however the rig is posed.
      if (loaded && marker.parent) {
        marker.updateWorldMatrix(true, false);
        marker.getWorldPosition(muzzle);
        parent.worldToLocal(muzzle);
      }
      return muzzle;
    },
    grip(side: "L" | "R", target: THREE.Vector3) {
      return root.localToWorld(target.copy(side === "L" ? gripLeft : gripRight));
    },
    dispose() {
      stopped = true;
      instance?.dispose();
      for (const geometry of ownedGeometry) geometry.dispose();
      for (const material of ownedMaterials) material.dispose();
      for (const texture of ownedTextures) texture.dispose();
      asset.release();
      root.removeFromParent();
    },
  };
}
