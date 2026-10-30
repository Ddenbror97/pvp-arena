import * as THREE from "three";
import { DecalGeometry } from "three/addons/geometries/DecalGeometry.js";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import { poseRifleHands, fitContinuousForearms } from "./fitted-rifle-hands";

/** Real authored AK and skinned hands. Existing controller still owns every input and shot. */
export function createAuthoredViewmodel(parent: THREE.Object3D, firstPerson = true) {
  const asset = retainAuthoredAsset("/fps/models/ak47-authored.glb");
  const root = new THREE.Group();
  root.name = "authored-first-person";
  root.scale.setScalar(0.52);
  root.visible = false;
  parent.add(root);
  let stopped = false,
    loaded = false,
    instance: ReturnType<typeof cloneAuthoredModel> | undefined;
  const ownedGeometry: THREE.BufferGeometry[] = [],
    ownedTextures: THREE.Texture[] = [],
    ownedMaterials: THREE.Material[] = [];
  const muzzle = new THREE.Vector3(),
    marker = new THREE.Object3D(),
    matrix = new THREE.Matrix4();
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
      root.add(instance.root);
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
        material.color.setHex(0x777b85);
        const gloves = new THREE.Mesh(fitted.gloves, material);
        gloves.name = "fitted-rifle-gloves";
        const forearms = new THREE.Mesh(fitted.skin, skin);
        forearms.name = "continuous-rifle-forearms";
        root.add(gloves, forearms);
        root.userData["wristSeams"] = fitted.seams;
        ownedGeometry.push(fitted.gloves, fitted.skin);
        arm.visible = false;
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
              const decal = new THREE.Mesh(clipped, logoMaterial);
              decal.name = "pvp-receiver-decal";
              root.add(decal);
              ownedGeometry.push(clipped);
              surface.dispose();
              geometry.dispose();
              continue;
            }
            const decal = new THREE.Mesh(geometry, logoMaterial);
            decal.position.copy(position);
            decal.rotation.y = (side * Math.PI) / 2;
            decal.name = "pvp-receiver-decal";
            root.add(decal);
            ownedGeometry.push(geometry);
          }
        }
      }
      const tip = instance.root.getObjectByName("MuzzleDeviceTip");
      if (tip) tip.add(marker);
      root.traverse((object) => {
        object.layers.set(firstPerson ? 1 : 0);
        if (object instanceof THREE.Mesh) object.castShadow = !firstPerson;
      });
      loaded = true;
    })
    .catch((error) =>
      console.warn("Authored AK unavailable; retaining the existing weapon.", error),
    );
  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    update(rifle: boolean, reload: number, kick: number) {
      root.visible = loaded && rifle;
      if (!loaded) return;
      const magazine = instance?.root.getObjectByName("Magazine");
      if (magazine) {
        magazine.position.y = -0.002 - reload * 0.09;
        magazine.rotation.x = reload * 0.12;
      }
      const bolt = instance?.root.getObjectByName("ChargingHandle");
      if (bolt) bolt.position.z = -0.4857 + kick * 0.025;
    },
    muzzle() {
      root.updateWorldMatrix(true, true);
      marker.getWorldPosition(muzzle);
      return parent.worldToLocal(muzzle);
    },
    grip(side: "L" | "R", target: THREE.Vector3) {
      root.updateWorldMatrix(true, true);
      const grip = instance?.root.getObjectByName(`Grip${side}`);
      if (grip) return grip.getWorldPosition(target);
      return root.localToWorld(
        target.set(0, side === "L" ? -0.01 : -0.095, side === "L" ? -0.8 : -0.172),
      );
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
