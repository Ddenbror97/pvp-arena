import * as THREE from "three";
import type { Seat, Weapon } from "./protocol";
import type { WeaponKit } from "./weapon";
import { createCharacter as createFallback } from "./character-rig";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import { createAuthoredViewmodel } from "./authored-viewmodel";
import { playerVolumes } from "./player-volumes";
import { createMuzzleFlash } from "./muzzle-flash";

type Motion = { airborne?: boolean; weapon?: Weapon; reloading?: boolean };
/** Authored skinned bodies, bone-space IK and reference-specific clothing. */
export function createCharacter(seat: Seat, branding: THREE.Material, kit: WeaponKit) {
  const police = seat === "A",
    root = new THREE.Group();
  root.name = police ? "officer" : "masked-fighter";
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
  const weapon = createAuthoredViewmodel(weaponPivot, false);
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
  const asset = retainAuthoredAsset("/fps/models/tactical-body.glb");
  const headAsset = retainAuthoredAsset("/fps/models/reference-head-webp.glb");
  const ownedMaterials: THREE.Material[] = [],
    ownedTextures: THREE.Texture[] = [],
    ownedGeometry: THREE.BufferGeometry[] = [];
  const bones = new Map<string, THREE.Bone>(),
    footOrientations = new Map<string, THREE.Quaternion>(),
    rest = new Map<THREE.Bone, { p: THREE.Vector3; q: THREE.Quaternion }>();
  let instance: ReturnType<typeof cloneAuthoredModel> | undefined,
    headInstance: ReturnType<typeof cloneAuthoredModel> | undefined,
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
  const accessories = new THREE.Group();
  accessories.name = "reference-headgear";
  root.add(accessories);
  const ready = Promise.all([asset.ready, headAsset.ready, weapon.ready])
    .then(([gltf, headGltf]) => {
      if (stopped) return;
      instance = cloneAuthoredModel(gltf.scene);
      body.add(instance.root);
      body.rotation.y = Math.PI;
      const remove: THREE.Object3D[] = [];
      instance.root.traverse((object) => {
        if (object instanceof THREE.Bone) {
          const name = object.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, "");
          bones.set(name, object);
          rest.set(object, { p: object.position.clone(), q: object.quaternion.clone() });
        }
        if (object instanceof THREE.Mesh) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const m of materials)
            if (m instanceof THREE.MeshStandardMaterial) {
              if (/Head|GreenCap/.test(m.name)) remove.push(object);
              if (!/Head|Headphones/.test(m.name)) {
                const tint = /Puch|Plate|Pads/.test(m.name)
                  ? police
                    ? "vec3(.22,.25,.31)"
                    : "vec3(1.0,.72,.39)"
                  : police
                    ? "vec3(.22,.32,.50)"
                    : "vec3(.18,.17,.16)";
                m.color.setHex(0xffffff);
                m.onBeforeCompile = (shader) => {
                  shader.fragmentShader = shader.fragmentShader.replace(
                    "#include <map_fragment>",
                    `#include <map_fragment>\nfloat clothLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=pow(vec3(clothLuma),vec3(.85))*${tint};`,
                  );
                };
                m.customProgramCacheKey = () => `pvp-reference-${seat}-${m.name}`;
              }
            }
        }
      });
      for (const object of remove) object.removeFromParent();
      body.updateMatrixWorld(true);
      const head = bones.get("Head")!,
        top = bones.get("HeadTop_End")!;
      const center = head
          .getWorldPosition(new THREE.Vector3())
          .lerp(top.getWorldPosition(new THREE.Vector3()), 0.5),
        bounds = new THREE.Box3().setFromObject(body);
      const scale = 1.6 / (center.y - bounds.min.y);
      body.scale.setScalar(scale);
      body.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
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
      headInstance = cloneAuthoredModel(headGltf.scene);
      accessories.add(headInstance.root);
      headInstance.root.traverse((object) => {
        if (object instanceof THREE.Mesh)
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            if (material instanceof THREE.MeshStandardMaterial && material.name.endsWith(".body")) {
              material.color.setHex(0xd7b392);
              material.roughness = 0.72;
            }
      });
      // Authored face remains visible; fitted accessories provide the requested identity.
      const metal = new THREE.MeshStandardMaterial({
          color: 0x333942,
          metalness: 0.8,
          roughness: 0.22,
        }),
        glass = new THREE.MeshStandardMaterial({
          color: police ? 0x17374d : 0x111316,
          metalness: 0.8,
          roughness: 0.12,
        });
      ownedMaterials.push(metal, glass);
      const part = (
        g: THREE.BufferGeometry,
        m: THREE.Material,
        x: number,
        y: number,
        z: number,
        s?: number[],
      ) => {
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(x, y, z);
        if (s) mesh.scale.set(s[0]!, s[1]!, s[2]!);
        accessories.add(mesh);
        ownedGeometry.push(g);
        return mesh;
      };
      for (const side of [-1, 1]) {
        part(
          new THREE.SphereGeometry(1, 16, 10),
          metal,
          side * 0.061,
          0.04,
          -0.132,
          [0.055, 0.036, 0.011],
        );
        part(
          new THREE.SphereGeometry(1, 16, 10),
          glass,
          side * 0.061,
          0.04,
          -0.142,
          [0.049, 0.031, 0.007],
        );
      }
      part(new THREE.BoxGeometry(0.03, 0.004, 0.007), metal, 0, 0.05, -0.144);
      if (police) {
        const cap = new THREE.MeshStandardMaterial({ color: 0x111d30, roughness: 0.88 });
        ownedMaterials.push(cap);
        part(
          new THREE.SphereGeometry(0.151, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
          cap,
          0,
          0.09,
          0,
          [1, 0.7, 1],
        );
        const brim = new THREE.Shape();
        brim.moveTo(-0.13, 0);
        brim.bezierCurveTo(-0.16, -0.18, -0.11, -0.23, 0, -0.23);
        brim.bezierCurveTo(0.11, -0.23, 0.16, -0.18, 0.13, 0);
        brim.closePath();
        const bill = part(
          new THREE.ExtrudeGeometry(brim, {
            depth: 0.008,
            bevelEnabled: true,
            bevelSize: 0.003,
            bevelThickness: 0.002,
            bevelSegments: 2,
            steps: 1,
            curveSegments: 16,
          }),
          cap,
          0,
          0.083,
          -0.025,
        );
        bill.rotation.x = Math.PI / 2;
      }
      if (!police) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        const pen = canvas.getContext("2d")!;
        pen.fillStyle = "#aaa390";
        pen.fillRect(0, 0, 512, 512);
        pen.fillStyle = "#242425";
        for (let y = 0; y < 512; y += 20)
          for (let x = 0; x < 512; x += 20) {
            pen.fillRect(x, y, 10, 10);
            pen.fillRect(x + 10, y + 10, 10, 10);
            pen.fillRect(x + 5, y + 5, 10, 4);
          }
        pen.globalAlpha = 0.15;
        for (let i = 0; i < 512; i += 2) {
          pen.fillStyle = i % 4 ? "#fff" : "#000";
          pen.fillRect(i, 0, 1, 512);
          pen.fillRect(0, i, 512, 1);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        ownedTextures.push(texture);
        const scarf = new THREE.MeshStandardMaterial({
          map: texture,
          bumpMap: texture,
          bumpScale: 0.001,
          roughness: 0.95,
        });
        ownedMaterials.push(scarf);
        headInstance.root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          if (object.name === "short02") object.visible = false;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (!materials.some((material) => material.name.endsWith(".body"))) return;
          for (const hood of [false, true]) {
            const geometry = object.geometry.clone(),
              positions = geometry.getAttribute("position"),
              index = geometry.index,
              faces: number[] = [],
              uv: number[] = [];
            for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
              const a = index?.getX(i) ?? i,
                b = index?.getX(i + 1) ?? i + 1,
                c = index?.getX(i + 2) ?? i + 2;
              if (
                [a, b, c].every((v) =>
                  hood
                    ? positions.getY(v) > 0.065
                    : positions.getY(v) < 0.018 && positions.getY(v) > -0.145,
                )
              )
                faces.push(a, b, c);
            }
            for (let i = 0; i < positions.count; i++) {
              uv.push(
                Math.atan2(positions.getZ(i), positions.getX(i)) / Math.PI + 1,
                (positions.getY(i) + 0.18) / 0.18,
              );
              positions.setXYZ(
                i,
                positions.getX(i) * 1.025,
                positions.getY(i) * 1.025,
                positions.getZ(i) * 1.025,
              );
            }
            geometry.setIndex(faces);
            geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
            geometry.computeVertexNormals();
            const wrap = part(geometry, scarf, 0, 0, 0);
            wrap.name = hood ? "fitted-scarf-hood" : "fitted-scarf-mask";
          }
        });
        const drape = part(new THREE.ConeGeometry(0.18, 0.22, 7), scarf, 0, -0.2, -0.01);
        drape.rotation.z = Math.PI;
        drape.scale.z = 0.6;
      }
      const badgeCanvas = document.createElement("canvas");
      badgeCanvas.width = 512;
      badgeCanvas.height = 192;
      const pen = badgeCanvas.getContext("2d")!;
      pen.fillStyle = police ? "#0d1622" : "#3c3326";
      pen.fillRect(0, 0, 512, 192);
      pen.textAlign = "center";
      pen.fillStyle = "#eee";
      pen.font = "900 110px sans-serif";
      pen.fillText(police ? "POLICE" : "PVP", 256, 140);
      const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
      badgeTexture.colorSpace = THREE.SRGBColorSpace;
      badgeTexture.anisotropy = 8;
      ownedTextures.push(badgeTexture);
      const badgeMaterial = new THREE.MeshStandardMaterial({ map: badgeTexture, roughness: 0.9 });
      ownedMaterials.push(badgeMaterial);
      const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.1), badgeMaterial);
      badge.name = "chest-badge";
      badge.rotation.y = Math.PI;
      root.add(badge);
      ownedGeometry.push(badge.geometry);
      if (police) {
        const capBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.042), badgeMaterial);
        capBadge.position.set(0, 0.135, -0.144);
        capBadge.rotation.y = Math.PI;
        accessories.add(capBadge);
        ownedGeometry.push(capBadge.geometry);
      }
      fallback.root.removeFromParent();
      fallback.dispose();
      fallback.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
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
  const aim = (bone: THREE.Bone, child: THREE.Bone, target: THREE.Vector3) => {
    bone.getWorldPosition(av);
    child.getWorldPosition(bv);
    bv.sub(av).normalize();
    cv.copy(target).sub(av).normalize();
    deltaQ.setFromUnitVectors(bv, cv);
    bone.parent!.getWorldQuaternion(parentQ);
    worldQ.copy(parentQ).invert().multiply(deltaQ).multiply(parentQ);
    bone.quaternion.premultiply(worldQ);
    bone.updateWorldMatrix(true, true);
  };
  const limb = (
    upper: THREE.Bone,
    lower: THREE.Bone,
    end: THREE.Bone,
    target: THREE.Vector3,
    bend: THREE.Vector3,
  ) => {
    upper.getWorldPosition(av);
    lower.getWorldPosition(bv);
    end.getWorldPosition(cv);
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
    update(
      dt: number,
      now: number,
      pitch: number,
      alive: boolean,
      crouched = false,
      motion: Motion = {},
    ) {
      root.visible = alive;
      anchor.position.y = playerVolumes({ x: 0, y: 0, z: 0, crouched }).head.center.y;
      if (!loaded) {
        fallback.update(dt, now, pitch, alive, crouched, motion);
        return;
      }
      const dx = initialized ? root.position.x - lastX : 0,
        dz = initialized ? root.position.z - lastZ : 0;
      initialized = true;
      lastX = root.position.x;
      lastZ = root.position.z;
      const rawDistance = Math.hypot(dx, dz),
        distance = Math.min(0.3, rawDistance),
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
      gait += distance * 9;
      const stride = Math.min(1, speed / 3);
      for (const [bone, pose] of rest) {
        bone.position.copy(pose.p);
        bone.quaternion.copy(pose.q);
      }
      body.position.y = baseY + (crouched ? -0.65 : 0);
      root.updateWorldMatrix(true, true);
      for (const side of ["Left", "Right"]) {
        const sign = side === "Left" ? -1 : 1,
          phase = gait + (sign === 1 ? Math.PI : 0),
          swing = Math.sin(phase) * 0.14 * stride,
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
        foot.parent!.getWorldQuaternion(parentQ).invert();
        root.getWorldQuaternion(worldQ);
        worldQ.multiply(footOrientations.get(side)!);
        foot.quaternion.copy(parentQ.multiply(worldQ));
        foot.updateWorldMatrix(true, true);
      }
      const recoil = Math.max(0, (flashUntil - now) / 42) * 0.025;
      weaponPivot.position.y = 1.25 + (crouched ? -0.65 : 0);
      weaponPivot.rotation.x = pitch + recoil;
      weaponPivot.rotation.z = motion.reloading ? -0.25 : 0;
      weapon.update(motion.weapon !== "pistol", motion.reloading ? 0.4 : 0, recoil);
      pistol.visible = motion.weapon === "pistol";
      for (const side of ["Left", "Right"]) {
        const sign = side === "Left" ? -1 : 1;
        weapon.grip(side === "Left" ? "L" : "R", target);
        if (pistol.visible)
          root.localToWorld(
            target.set(
              side === "Right" ? 0.07 : -0.24,
              side === "Right" ? 1.18 + (crouched ? -0.65 : 0) : 0.95 + (crouched ? -0.5 : 0),
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
      }
      bones.get("Head")!.getWorldPosition(headCenter);
      bones.get("HeadTop_End")!.getWorldPosition(topCenter);
      headCenter.lerp(topCenter, 0.5);
      root.worldToLocal(headCenter);
      accessories.position.copy(headCenter);
      accessories.rotation.x = pitch * 0.2;
      const badge = root.getObjectByName("chest-badge");
      if (badge) badge.position.set(0, 1.25 + (crouched ? -0.65 : 0), -0.205);
      const tip = weapon.muzzle();
      flash.update(
        alive ? flashUntil - now : 0,
        pistol.visible ? -0.205 : tip.z,
        pistol.visible ? 0 : tip.y,
        Math.floor(flashUntil),
      );
      flash.root.position.x = pistol.visible ? 0 : tip.x;
    },
    dispose() {
      stopped = true;
      if (!loaded) fallback.dispose();
      instance?.dispose();
      headInstance?.dispose();
      weapon.dispose();
      flash.dispose();
      pistolMaterial.dispose();
      pistol.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      for (const material of ownedMaterials) material.dispose();
      for (const texture of ownedTextures) texture.dispose();
      for (const geometry of ownedGeometry) geometry.dispose();
      asset.release();
      headAsset.release();
    },
  };
}
