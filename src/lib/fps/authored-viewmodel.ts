import * as THREE from "three";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import {
  poseRifleHands,
  fitContinuousForearms,
  magazineGrip as magazineGripFrame,
  SHORT_FOREARMS,
  wrapOntoForearm,
  type ForearmPath,
} from "./fitted-rifle-hands";
import { ARENA_MODELS } from "./model-assets";
import { applyVeinTint, createForearmDetailTexture } from "./forearm-detail";
import { upgradeRifleMaterials } from "./rifle-materials";
import {
  BOLT_RACK,
  RELOAD_CLIPS,
  sampleNumber,
  sampleSegment,
  sampleVec,
  type ReloadClip,
  type ReloadKind,
  type SupportKey,
} from "./reload-animation";

/** Relief depth of the forearm detail map, in viewmodel-root units per unit of height. */
const FOREARM_BUMP_SCALE = 0.065;

/** Magazine grip, in rifle-local units: wrap axis just ahead of the authored grip marker. */
const MAG_GRIP_OFFSET = new THREE.Vector3(0, -0.035, -0.035);
const MAG_EDGE_DOWN = new THREE.Vector3(0, -0.9, -0.43);
const MAG_TO_WRIST = new THREE.Vector3(-0.6, 0, 0.8);
/**
 * Charging-handle grip, in rifle-local units: an overhand rack. The wrist comes in from the left
 * at receiver height, the palm rides the top of the receiver and the fingers wrap down its right
 * side onto the knob (wrap axis along the bore, centred over the receiver). That frame is only
 * ~60° round the bore from the handguard grip, so the forearm keeps a natural line to the lower
 * left and the arm never flips on the way up.
 */
const HANDLE_GRIP_OFFSET = new THREE.Vector3(-0.036, 0.022, 0.004);
const HANDLE_AXIS = new THREE.Vector3(0, 0, 1);
const HANDLE_TO_WRIST = new THREE.Vector3(-1, 0.3, 0.2);
const HANDLE_SQUEEZE = 0.75;
/** Wrist → elbow for the rack: back, out to the left and down, so the arm covers little of the view. */
const HANDLE_ELBOW = new THREE.Vector3(-0.42, -0.3, 0.3);

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
  const magazineRest = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    /** Front locking lug, magazine-local: the AK magazine rocks about this point. */
    lug: new THREE.Vector3(),
  };
  let boltRest = 0;
  // Support hand baked a second time gripping the magazine; it rides on the magazine itself.
  const magazineHand = new THREE.Group(),
    magazineHold = new THREE.Matrix4(),
    magazineRestMatrix = new THREE.Matrix4(),
    magazineNow = new THREE.Matrix4();
  magazineHand.name = "magazine-grip-hand";
  // ...and a third time closed on the charging-handle knob; it rides the bolt.
  const handleHand = new THREE.Group(),
    handleHold = new THREE.Matrix4(),
    boltRestMatrix = new THREE.Matrix4(),
    boltNow = new THREE.Matrix4();
  handleHand.name = "charging-handle-hand";
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
    handle: new THREE.Matrix4(),
    racked: new THREE.Matrix4(),
  };
  const skinMap = new THREE.TextureLoader().load("/fps/forearm-skin-v2.webp");
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
        const material = createGloveMaterial(
          (Array.isArray(arm.material)
            ? arm.material[0]!
            : arm.material) as THREE.MeshStandardMaterial,
        );
        ownedMaterials.push(material);
        // Sleeves and the watch are authored on the canonical forearm and wrapped onto each one.
        const accessories = instance.root.getObjectByName("FPAccessories");
        accessories?.removeFromParent();
        // Accessory geometry in canonical arm space: node transforms (meshopt quantisation
        // stores positions scaled and offset) are baked relative to the accessories root.
        accessories?.updateWorldMatrix(true, true);
        const accessoryRoot = new THREE.Matrix4()
          .copy(accessories?.matrixWorld ?? new THREE.Matrix4())
          .invert();
        const meshesOf = (name: string) => {
          const found: {
            geometry: THREE.BufferGeometry;
            material: THREE.Material | THREE.Material[];
          }[] = [];
          accessories?.getObjectByName(name)?.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            const geometry = o.geometry
              .clone()
              .applyMatrix4(new THREE.Matrix4().multiplyMatrices(accessoryRoot, o.matrixWorld));
            ownedGeometry.push(geometry);
            found.push({ geometry, material: o.material });
          });
          return found;
        };
        const sleeveParts = meshesOf("ArmSleeve"),
          watchParts = meshesOf("ArmWatch");
        /** Gloves, bare forearm, pushed-up sleeve and (left wrist) watch for one fitted arm. */
        const dress = (
          built: { gloves: THREE.BufferGeometry; skin: THREE.BufferGeometry; path: ForearmPath },
          names: { gloves: string; forearm: string; prefix: string },
          into?: THREE.Matrix4,
        ) => {
          const meshes: THREE.Mesh[] = [];
          const add = (
            geometry: THREE.BufferGeometry,
            mat: THREE.Material | THREE.Material[],
            name: string,
          ) => {
            if (into) geometry.applyMatrix4(into);
            ownedGeometry.push(geometry);
            const mesh = new THREE.Mesh(geometry, mat);
            mesh.name = name;
            meshes.push(mesh);
          };
          add(built.gloves, material, names.gloves);
          add(built.skin, skin, names.forearm);
          for (const part of sleeveParts)
            add(
              wrapOntoForearm(part.geometry, built.path),
              part.material,
              `${names.prefix}-sleeve`,
            );
          if (built.path.side === "L")
            watchParts.forEach((part, i) =>
              add(
                wrapOntoForearm(part.geometry, built.path),
                part.material,
                `${names.prefix}-watch-${i}`,
              ),
            );
          return meshes;
        };
        for (const side of ["L", "R"] as const)
          (side === "L" ? supportContent : weaponContent).add(
            ...dress(fitted[side], {
              gloves: `fitted-rifle-gloves-${side}`,
              forearm: `continuous-rifle-forearms-${side}`,
              prefix: `rifle-arm-${side}`,
            }),
          );
        root.userData["wristCuffs"] = fitted.cuffs;
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
        const guardInverse = handOnGuard.clone().invert();

        // Charging-handle grip: fist closed on the right-side knob, wrist over the receiver.
        restore(authored);
        const boltNode = instance.root.getObjectByName("ChargingHandle")!;
        const knob = knobCentre(boltNode, toInstance).add(HANDLE_GRIP_OFFSET);
        const handleFrame = magazineGripFrame(knob, HANDLE_AXIS, HANDLE_TO_WRIST, HANDLE_SQUEEZE);
        const handleDelta = poseRifleHands(instance.root, handleFrame);
        const handleFitted = fitContinuousForearms(arm, root, handleDelta, {
          ...SHORT_FOREARMS,
          elbow: { L: HANDLE_ELBOW, R: SHORT_FOREARMS.elbow.R },
        });
        const handOnHandle = rootInverse.clone().multiply(handNode.matrixWorld);
        restore(guardState);
        root.updateWorldMatrix(true, true);
        handleHold.copy(handOnHandle).multiply(guardInverse);
        boltRestMatrix.copy(rootInverse).multiply(boltNode.matrixWorld);
        const intoBolt = new THREE.Matrix4()
          .copy(boltNode.matrixWorld)
          .invert()
          .multiply(root.matrixWorld);
        handleHand.add(
          ...dress(
            handleFitted.L,
            {
              gloves: "charging-handle-gloves",
              forearm: "charging-handle-forearm",
              prefix: "charging-handle",
            },
            intoBolt,
          ),
        );
        handleHand.visible = false;
        boltNode.add(handleHand);
        handleFitted.R.gloves.dispose();
        handleFitted.R.skin.dispose();

        magazineHold.copy(handOnMag).multiply(guardInverse);
        magazineRestMatrix.copy(rootInverse).multiply(magNode.matrixWorld);
        const intoMagazine = new THREE.Matrix4()
          .copy(magNode.matrixWorld)
          .invert()
          .multiply(root.matrixWorld);
        magazineHand.add(
          ...dress(
            magFitted.L,
            {
              gloves: "magazine-grip-gloves",
              forearm: "magazine-grip-forearm",
              prefix: "magazine-grip",
            },
            intoMagazine,
          ),
        );
        magazineHand.visible = false;
        magNode.add(magazineHand);
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
        magazineRest.quaternion.copy(magazine.quaternion);
        frontLug(magazine, magazineRest.lug);
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
  /** Apply a key-posed reload clip (and bolt kick) to the weapon, magazine and support rigs. */
  function pose(clip: ReloadClip, p: number, kick: number) {
    const { a, b, c, qa, qb, euler, inverse } = scratch;
    const wp = sampleVec(clip.weaponPosition, p),
      wr = sampleVec(clip.weaponRotation, p);
    weapon.position.set(gripRight.x + wp[0], gripRight.y + wp[1], gripRight.z + wp[2]);
    weapon.rotation.set(wr[0], wr[1], wr[2]);
    // Magazine: rotate about the front lug (rest-relative), then translate in its parent.
    const mp = sampleVec(clip.magPosition, p),
      mr = sampleVec(clip.magRotation, p);
    const rock = scratch.q.setFromEuler(euler.set(mr[0], mr[1], mr[2]));
    magazine!.quaternion.copy(magazineRest.quaternion).multiply(rock);
    a.copy(magazineRest.lug)
      .sub(c.copy(magazineRest.lug).applyQuaternion(rock))
      .applyQuaternion(magazineRest.quaternion);
    magazine!.position.copy(magazineRest.position).add(a);
    magazine!.position.x += mp[0];
    magazine!.position.y += mp[1];
    magazine!.position.z += mp[2];
    const travel = sampleNumber(clip.boltTravel, p);
    bolt!.position.z = boltRest + travel + kick * 0.025;
    weapon.updateMatrixWorld(true);
    inverse.copy(root.matrixWorld).invert();
    // Resolve both bracketing keys against the live rig, then blend: the hand tracks moving parts.
    // The mag/handle anchors are the exact rigid transforms that put the handguard hand where the
    // baked magazine- or handle-grip hand is, so swapping between baked hands never pops.
    magazineNow.copy(inverse).multiply(magazine!.matrixWorld);
    const magHold = scratch.m
      .copy(magazineNow)
      .multiply(scratch.m2.copy(magazineRestMatrix).invert())
      .multiply(magazineHold);
    boltNow.copy(inverse).multiply(bolt!.matrixWorld);
    const handleNow = scratch.handle
      .copy(boltNow)
      .multiply(scratch.m2.copy(boltRestMatrix).invert())
      .multiply(handleHold);
    // Racked: the handle grip with the bolt held at full travel (the hand stays back on release).
    const racked = scratch.racked.copy(handleNow);
    if (travel !== BOLT_RACK) {
      // Shift by where the bolt would be at full travel, measured through its parent.
      const parent = bolt!.parent!;
      b.set(bolt!.position.x, bolt!.position.y, boltRest + BOLT_RACK);
      parent.localToWorld(b).applyMatrix4(inverse);
      c.setFromMatrixPosition(boltNow);
      racked.premultiply(scratch.m2.makeTranslation(b.sub(c)));
    }
    const anchor = (key: SupportKey, out: THREE.Vector3, rotation: THREE.Quaternion) => {
      const extra = scratch.q.setFromEuler(
        euler.set(key.rotation[0]!, key.rotation[1]!, key.rotation[2]!),
      );
      const hold =
        key.anchor === "mag"
          ? magHold
          : key.anchor === "handle"
            ? handleNow
            : key.anchor === "racked"
              ? racked
              : undefined;
      if (hold) {
        out.copy(supportWrist).applyMatrix4(hold);
        rotation.setFromRotationMatrix(hold).multiply(extra);
      } else {
        out.copy(supportGuard).applyQuaternion(weapon.quaternion).add(weapon.position);
        rotation.copy(extra).premultiply(weapon.quaternion);
      }
      out.add(
        a.set(key.offset[0]!, key.offset[1]!, key.offset[2]!).applyQuaternion(weapon.quaternion),
      );
    };
    const segment = sampleSegment(clip.support, p);
    anchor(segment.a, c, qa);
    anchor(segment.b, b, qb);
    support.position.copy(c.lerp(b, segment.k));
    support.quaternion.copy(qa.slerp(qb, segment.k));
    // While the magazine / handle is in hand, the matching baked grip (fingers closed on it) shows.
    const holding = (anchor: SupportKey["anchor"]) =>
      segment.a.anchor === anchor &&
      segment.b.anchor === anchor &&
      [...segment.a.offset, ...segment.b.offset].every((v) => v === 0);
    magazineHand.visible = holding("mag");
    handleHand.visible = holding("handle");
    support.visible = !magazineHand.visible && !handleHand.visible;
  }
  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    /**
     * First person: `reload` is reload progress 0 → 1 (0 when not reloading) and `kind` picks
     * the clip (empty reloads chamber a round with the charging handle).
     * Third person keeps the simple lowered-magazine cue, where `reload` is an amount 0 → 1.
     */
    update(rifle: boolean, reload: number, kick: number, kind: ReloadKind = "tactical") {
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
      pose(RELOAD_CLIPS[kind], reload > 0 && reload < 1 ? reload : 0, kick);
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

/** Centre of the charging-handle knob (its outermost right-side tip), in rifle-instance space. */
function knobCentre(bolt: THREE.Object3D, toInstance: THREE.Matrix4) {
  const points: THREE.Vector3[] = [];
  bolt.updateWorldMatrix(true, true);
  bolt.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute("position");
    const toRifle = new THREE.Matrix4().copy(toInstance).multiply(object.matrixWorld);
    for (let i = 0; i < position.count; i++)
      points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(toRifle));
  });
  const right = Math.max(...points.map((p) => p.x));
  const knob = points.filter((p) => p.x > right - 0.02);
  return knob.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(knob.length);
}

/**
 * Front locking lug of an AK magazine, in the magazine's own space: the front edge of its top
 * (feed-lips end). Rocking about it is what seats/unseats the magazine.
 */
function frontLug(magazine: THREE.Object3D, out: THREE.Vector3) {
  const points: THREE.Vector3[] = [];
  magazine.updateWorldMatrix(true, true);
  const toMag = new THREE.Matrix4().copy(magazine.matrixWorld).invert();
  magazine.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute("position");
    const toLocal = new THREE.Matrix4().copy(toMag).multiply(object.matrixWorld);
    for (let i = 0; i < position.count; i++)
      points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(toLocal));
  });
  if (!points.length) return out.set(0, 0, 0);
  const top = Math.max(...points.map((p) => p.y));
  const lip = points.filter((p) => p.y > top - 0.03);
  const front = Math.min(...lip.map((p) => p.z));
  return out.set(0, top - 0.015, front);
}

/**
 * Tactical glove material from the authored PBR set (base colour, tangent-space normals,
 * occlusion/roughness). Physical sheen gives the suede and knit their soft grazing highlight.
 */
function createGloveMaterial(source: THREE.MeshStandardMaterial) {
  const textured = !!source.map;
  return new THREE.MeshPhysicalMaterial({
    name: "tactical-gloves",
    color: textured ? 0xffffff : 0x34353a,
    map: source.map,
    normalMap: source.normalMap,
    normalScale: source.normalScale.clone(),
    aoMap: source.aoMap,
    roughnessMap: source.roughnessMap,
    roughness: textured ? 1 : 0.9,
    metalness: 0,
    sheen: 0.22,
    sheenColor: new THREE.Color(0x2c2d31),
    sheenRoughness: 0.6,
    envMapIntensity: 0.7,
  });
}
