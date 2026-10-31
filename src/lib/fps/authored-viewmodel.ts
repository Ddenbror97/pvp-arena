import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import { poseRifleHands, fitContinuousForearms, SHORT_FOREARMS } from "./fitted-rifle-hands";
import { ARENA_MODELS } from "./model-assets";
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
  const supportWrist = new THREE.Vector3(),
    supportGuard = new THREE.Vector3(),
    rigReady = { value: false };
  const scratch = {
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    qa: new THREE.Quaternion(),
    qb: new THREE.Quaternion(),
    c: new THREE.Vector3(),
    euler: new THREE.Euler(),
    inverse: new THREE.Matrix4(),
  };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const pen = canvas.getContext("2d")!;
  pen.fillStyle = "#292632";
  pen.fillRect(0, 0, 1024, 1024);
  let seed = 971;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = -4; i < 9; i++) {
    pen.fillStyle = i % 2 ? "#6714a4" : "#931ded";
    pen.beginPath();
    pen.moveTo(i * 220, 0);
    pen.lineTo(i * 220 + 45, 0);
    pen.lineTo(i * 220 - 700, 1024);
    pen.lineTo(i * 220 - 745, 1024);
    pen.fill();
  }
  pen.globalAlpha = 0.2;
  for (let i = 0; i < 3600; i++) {
    pen.strokeStyle = i % 3 ? "#a9a3b2" : "#020207";
    const x = random() * 1024,
      y = random() * 1024;
    pen.beginPath();
    pen.moveTo(x, y);
    pen.lineTo(x + random() * 26, y + random() * 2);
    pen.stroke();
  }
  pen.globalAlpha = 1;
  const paint = new THREE.CanvasTexture(canvas);
  paint.colorSpace = THREE.SRGBColorSpace;
  paint.wrapS = paint.wrapT = THREE.RepeatWrapping;
  paint.anisotropy = 8;
  paint.repeat.set(0.2, 0.2);
  ownedTextures.push(paint);
  const skinMap = new THREE.TextureLoader().load("/fps/forearm-skin-v1.webp");
  skinMap.colorSpace = THREE.SRGBColorSpace;
  skinMap.wrapS = skinMap.wrapT = THREE.RepeatWrapping;
  skinMap.anisotropy = 8;
  skinMap.repeat.set(2, 3);
  ownedTextures.push(skinMap);
  const skin = new THREE.MeshStandardMaterial({
    map: skinMap,
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0,
  });
  ownedMaterials.push(skin);
  const logo = new THREE.TextureLoader().load("/brand/arena-logo-email.png");
  logo.colorSpace = THREE.SRGBColorSpace;
  logo.anisotropy = 8;
  ownedTextures.push(logo);
  const logoMaterial = new THREE.MeshStandardMaterial({
    map: logo,
    transparent: true,
    alphaTest: 0.06,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    roughness: 0.48,
    metalness: 0.12,
    emissive: 0x777777,
    emissiveMap: logo,
    emissiveIntensity: 0.25,
  });
  ownedMaterials.push(logoMaterial);
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
        const supportDelta = poseRifleHands(instance.root);
        const fitted = fitContinuousForearms(arm, root, supportDelta);
        const material = (
          Array.isArray(arm.material) ? arm.material[0]! : arm.material
        ) as THREE.MeshStandardMaterial;
        // Black tactical gloves, identical for police and terrorist.
        material.color.setHex(0x2e2f35);
        material.roughness = 0.78;
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
        instance.root
          .getObjectByName("Hand_L")!
          .getWorldPosition(supportWrist)
          .applyMatrix4(scratch.inverse.copy(root.matrixWorld).invert());
      }
      instance.root.traverse((object) => {
        if (object instanceof THREE.Mesh && !(object instanceof THREE.SkinnedMesh))
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material]) {
            if (
              material instanceof THREE.MeshStandardMaterial &&
              /Receiver|Wood|Bakelite/.test(material.name)
            ) {
              material.map = paint;
              material.color.setHex(0xffffff);
              material.metalness = 0.6;
              material.roughness = 0.42;
              material.needsUpdate = true;
            }
          }
      });
      // Thin paint overlays on the authored flat receiver/furniture panels.
      instance.root.updateMatrixWorld(true);
      for (const name of ["ReceiverGeometry", "StockWoodGeometry", "MagazineGeometry"]) {
        const receiver = instance.root.getObjectByName(name) as THREE.Mesh | undefined;
        if (receiver?.isMesh) {
          receiver.geometry.computeBoundingBox();
          matrix.copy(root.matrixWorld).invert().multiply(receiver.matrixWorld);
          const bounds = receiver.geometry.boundingBox!.clone().applyMatrix4(matrix),
            center = bounds.getCenter(new THREE.Vector3());
          for (const side of [-1, 1]) {
            const position = center.clone();
            position.x = side < 0 ? bounds.min.x - 0.012 : bounds.max.x + 0.012;
            const geometry = new THREE.PlaneGeometry(
              Math.min(0.32, (bounds.max.z - bounds.min.z) * 0.65),
              Math.min(0.13, (bounds.max.y - bounds.min.y) * 0.6),
            );
            if (name === "MagazineGeometry") {
              const surface = receiver.geometry.clone().applyMatrix4(matrix);
              const proxy = new THREE.Mesh(surface, logoMaterial);
              proxy.updateMatrixWorld(true);
              const clipped = new DecalGeometry(
                proxy,
                position,
                new THREE.Euler(0, (side * Math.PI) / 2, 0),
                new THREE.Vector3(
                  Math.min(0.32, (bounds.max.z - bounds.min.z) * 0.65),
                  Math.min(0.13, (bounds.max.y - bounds.min.y) * 0.6),
                  0.06,
                ),
              );
              // Parent to the magazine itself so the branding leaves with it on reload.
              const magazineNode = instance.root.getObjectByName("Magazine")!;
              clipped.applyMatrix4(
                new THREE.Matrix4()
                  .copy(magazineNode.matrixWorld)
                  .invert()
                  .multiply(root.matrixWorld),
              );
              const decal = new THREE.Mesh(clipped, logoMaterial);
              decal.name = "pvp-receiver-decal";
              magazineNode.add(decal);
              ownedGeometry.push(clipped);
              surface.dispose();
              geometry.dispose();
              continue;
            }
            const decal = new THREE.Mesh(geometry, logoMaterial);
            decal.position.copy(position);
            decal.rotation.y = (side * Math.PI) / 2;
            decal.name = "pvp-receiver-decal";
            weaponContent.add(decal);
            ownedGeometry.push(geometry);
          }
        }
      }
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
    const anchor = (
      key: { anchor: SupportAnchor; offset: readonly number[]; rotation: readonly number[] },
      out: THREE.Vector3,
      rotation: THREE.Quaternion,
    ) => {
      if (key.anchor === "guard")
        out.copy(supportGuard).applyQuaternion(weapon.quaternion).add(weapon.position);
      else
        (key.anchor === "mag" ? magazineGrip! : bolt!).getWorldPosition(out).applyMatrix4(inverse);
      out.add(
        a.set(key.offset[0]!, key.offset[1]!, key.offset[2]!).applyQuaternion(weapon.quaternion),
      );
      rotation
        .setFromEuler(euler.set(key.rotation[0]!, key.rotation[1]!, key.rotation[2]!))
        .premultiply(weapon.quaternion);
    };
    const segment = sampleSegment(SUPPORT, p);
    anchor(segment.a, c, qa);
    anchor(segment.b, b, qb);
    support.position.copy(c.lerp(b, segment.k));
    support.quaternion.copy(qa.slerp(qb, segment.k));
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
