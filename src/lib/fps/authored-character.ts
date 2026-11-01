import * as THREE from "three";
import type { Seat, Weapon } from "./protocol";
import type { WeaponKit } from "./weapon";
import { createCharacter as createFallback } from "./character-rig";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import { createAuthoredViewmodel } from "./authored-viewmodel";
import { buildHeadWrap, createKnitTexture, createShemaghTextures } from "./head-wrap";
import { EYE_HEIGHT, CROUCH_EYE_HEIGHT } from "./map";
import { createMuzzleFlash } from "./muzzle-flash";
import { ARENA_MODELS, CHARACTER_MODELS, CHARACTER_SET } from "./model-assets";

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
  // Operators: the Blender-built Police (A) / Terrorist (B) bodies carry their own clothing,
  // gear and PBR materials; only the legacy shared body is tinted and dressed at runtime.
  const operators = CHARACTER_SET !== "legacy",
    // Sourced characters bring their own sculpted head; the shared head stays hidden.
    ownHead = CHARACTER_SET === "sourced";
  const asset = retainAuthoredAsset(
    ownHead
      ? CHARACTER_MODELS[police ? "policeSourced" : "terroristSourced"]
      : operators
        ? CHARACTER_MODELS[police ? "police" : "terrorist"]
        : CHARACTER_MODELS.legacy,
  );
  const headAsset = retainAuthoredAsset(ARENA_MODELS.head);
  const ownedMaterials: THREE.Material[] = [],
    ownedTextures: THREE.Texture[] = [],
    ownedGeometry: THREE.BufferGeometry[] = [];
  const bones = new Map<string, THREE.Bone>(),
    footOrientations = new Map<string, THREE.Quaternion>(),
    rest: { bone: THREE.Bone; p: THREE.Vector3; q: THREE.Quaternion }[] = [];
  const sides = ["Left", "Right"] as const;
  let badge: THREE.Object3D | undefined;
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
      // Helmet/headset/eyewear are authored around the head centre and follow the fitted head.
      const headKit = instance.root.getObjectByName("head-kit");
      headKit?.removeFromParent();
      instance.root.traverse((object) => {
        if (object instanceof THREE.Bone) {
          const name = object.name.replace(/^mixamorig:?/, "").replace(/_\d+$/, "");
          bones.set(name, object);
          rest.push({ bone: object, p: object.position.clone(), q: object.quaternion.clone() });
        }
        if (object instanceof THREE.Mesh && !operators) {
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
      headInstance = cloneAuthoredModel(headGltf.scene);
      accessories.add(headInstance.root);
      headInstance.root.visible = !ownHead;
      if (headKit) accessories.add(headKit);
      headInstance.root.traverse((object) => {
        if (object instanceof THREE.Mesh)
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            if (material instanceof THREE.MeshStandardMaterial && material.name.endsWith(".body")) {
              material.color.setHex(0xffffff);
              material.roughness = 0.72;
            }
      });
      headInstance.root.traverse((object) => {
        if (object instanceof THREE.Mesh)
          for (const m of Array.isArray(object.material) ? object.material : [object.material])
            if (m instanceof THREE.MeshStandardMaterial && m.alphaTest > 0)
              m.alphaToCoverage = true;
      });
      // The extracted source includes shoulder fragments; taper these into the uniform's neck opening.
      headInstance.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some((m) => m.name.endsWith(".body"))) return;
        const geometry = object.geometry.clone(),
          p = geometry.getAttribute("position");
        for (let i = 0; i < p.count; i++) {
          const y = p.getY(i),
            blend = THREE.MathUtils.smoothstep(-y, 0.08, 0.16),
            x = p.getX(i),
            z = p.getZ(i);
          p.setXYZ(
            i,
            THREE.MathUtils.lerp(x, THREE.MathUtils.clamp(x, -0.068, 0.068), blend),
            y - THREE.MathUtils.smoothstep(-y, 0.12, 0.18) * 0.05,
            THREE.MathUtils.lerp(z, THREE.MathUtils.clamp(z, -0.062, 0.074), blend),
          );
        }
        geometry.computeVertexNormals();
        object.geometry = geometry;
        ownedGeometry.push(geometry);
      });
      // Authored face remains visible; fitted accessories provide the requested identity.
      const metal = new THREE.MeshStandardMaterial({
          color: 0x333942,
          metalness: 0.8,
          roughness: 0.22,
        }),
        glass = new THREE.MeshStandardMaterial({
          color: police ? 0x294556 : 0x38342b,
          metalness: 0.05,
          roughness: 0.23,
          transparent: true,
          opacity: 0.86,
          depthWrite: false,
          side: THREE.DoubleSide,
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
      // Fit aviators to the authored eye sockets; the previous ellipsoids were wider than the face.
      const eyes = headInstance.root.getObjectByName("low-poly") as THREE.Mesh;
      const legacyKit = !operators;
      eyes.geometry.computeBoundingBox();
      const eyeBox = eyes.geometry.boundingBox!,
        eyeCenter = eyeBox.getCenter(new THREE.Vector3());
      const lens = new THREE.Shape();
      lens.moveTo(-0.025, 0.012);
      lens.bezierCurveTo(-0.017, 0.022, 0.018, 0.021, 0.026, 0.011);
      lens.bezierCurveTo(0.029, -0.004, 0.008, -0.026, -0.004, -0.021);
      lens.bezierCurveTo(-0.019, -0.019, -0.029, -0.001, -0.025, 0.012);
      const lensGeometry = new THREE.ShapeGeometry(lens, 20);
      const frameShape = new THREE.Shape(
        lens.getPoints(20).map((p) => p.clone().multiplyScalar(1.08)),
      );
      frameShape.holes.push(new THREE.Path(lens.getPoints(20)));
      const frameGeometry = new THREE.ShapeGeometry(frameShape, 20);
      for (const side of legacyKit ? [-1, 1] : []) {
        const x = eyeCenter.x + side * 0.033,
          y = eyeCenter.y,
          z = eyeBox.min.z - 0.012;
        const frame = part(frameGeometry.clone(), metal, x, y, z);
        frame.rotation.y = Math.PI;
        const pane = part(lensGeometry.clone(), glass, x, y, z - 0.001);
        pane.rotation.y = Math.PI;
        pane.name = side < 0 ? "fitted-aviator-L" : "fitted-aviator-R";
        const arm = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x + side * 0.028, y + 0.004, z),
          new THREE.Vector3(side * 0.09, y + 0.009, -0.025),
          new THREE.Vector3(side * 0.09, y - 0.004, 0.014),
        ]);
        part(new THREE.TubeGeometry(arm, 12, 0.0012, 5, false), metal, 0, 0, 0);
      }
      lensGeometry.dispose();
      frameGeometry.dispose();
      if (legacyKit) {
        const bridge = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.011, eyeCenter.y + 0.008, eyeBox.min.z - 0.013),
          new THREE.Vector3(eyeCenter.x, eyeCenter.y + 0.013, -0.128),
          new THREE.Vector3(0.006, eyeCenter.y + 0.008, eyeBox.min.z - 0.013),
        ]);
        part(new THREE.TubeGeometry(bridge, 12, 0.001, 5, false), metal, 0, 0, 0);
      }
      if (police) {
        // Hair above the cap/helmet line would poke through the shell.
        const hair = headInstance.root.getObjectByName("short02") as THREE.Mesh;
        if (hair) {
          const geometry = hair.geometry.clone(),
            p = geometry.getAttribute("position"),
            faces: number[] = [],
            index = geometry.index;
          for (let i = 0; i < (index?.count ?? p.count); i += 3) {
            const ids = [0, 1, 2].map((j) => index?.getX(i + j) ?? i + j);
            if (ids.every((v) => p.getY(v) < 0.075)) faces.push(...ids);
          }
          geometry.setIndex(faces);
          hair.geometry = geometry;
          ownedGeometry.push(geometry);
        }
      }
      if (police && legacyKit) {
        const cap = new THREE.MeshStandardMaterial({ color: 0x111d30, roughness: 0.88 });
        ownedMaterials.push(cap);
        const crown = new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, 1.5);
        const cp = crown.getAttribute("position");
        for (let i = 0; i < cp.count; i++)
          cp.setXYZ(i, cp.getX(i) * 0.111, cp.getY(i) * 0.14 + 0.065, cp.getZ(i) * 0.134);
        crown.computeVertexNormals();
        part(crown, cap, 0, 0, 0).name = "fitted-police-cap";
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
        bill.scale.set(0.82, 0.82, 1);
      }
      if (!police && !ownHead) {
        // Fitted shemagh: one cloth layer grown from the head mesh itself, with an eye slit.
        const shemagh = createShemaghTextures();
        ownedTextures.push(shemagh.map, shemagh.bump);
        const scarf = new THREE.MeshStandardMaterial({
          map: shemagh.map,
          bumpMap: shemagh.bump,
          bumpScale: 0.25,
          roughness: 0.93,
          side: THREE.DoubleSide,
        });
        ownedMaterials.push(scarf);
        headInstance.root.getObjectByName("short02")!.visible = false;
        let skinGeometry: THREE.BufferGeometry | undefined;
        headInstance.root.traverse((object) => {
          if (!(object instanceof THREE.Mesh) || skinGeometry) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (materials.some((m) => m.name.endsWith(".body"))) skinGeometry = object.geometry;
        });
        const wrap = buildHeadWrap(skinGeometry!, { eyeCenter });
        const knit = createKnitTexture();
        ownedTextures.push(knit);
        const balaclavaMaterial = new THREE.MeshStandardMaterial({
          map: knit,
          bumpMap: knit,
          bumpScale: 0.4,
          roughness: 0.97,
          side: THREE.DoubleSide,
        });
        ownedMaterials.push(balaclavaMaterial);
        part(wrap.balaclava, balaclavaMaterial, 0, 0, 0).name = "fitted-balaclava";
        part(wrap.scarf, scarf, 0, 0, 0).name = "fitted-shemagh-wrap";
        // A soft folded cowl follows the neck and drapes over the chest instead of a rigid cone.
        const p: number[] = [],
          uv: number[] = [],
          indices: number[] = [],
          sides = 64,
          rings = 16;
        for (let r = 0; r <= rings; r++)
          for (let j = 0; j <= sides; j++) {
            const t = r / rings,
              angle = (j / sides) * Math.PI * 2;
            const radius =
              THREE.MathUtils.lerp(0.088, 0.155, t) +
              Math.sin(angle * 9 + t * 5) * 0.004 * Math.sin(Math.PI * t);
            p.push(
              Math.cos(angle) * radius,
              -0.09 - t * 0.15 - Math.max(0, -Math.sin(angle)) * 0.045 * t,
              Math.sin(angle) * radius * 0.8 + 0.01,
            );
            uv.push(j / sides, t * 0.45);
            if (r < rings && j < sides) {
              const a = r * (sides + 1) + j,
                b = a + sides + 1;
              indices.push(a, a + 1, b, b, a + 1, b + 1);
            }
          }
        const cowl = new THREE.BufferGeometry();
        cowl.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
        cowl.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
        cowl.setIndex(indices);
        cowl.computeVertexNormals();
        const drape = part(cowl, scarf, 0, 0, 0);
        drape.name = "folded-neck-scarf";
      }
      // The operator models carry printed POLICE patches on the plate carrier.
      if (legacyKit) {
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
        const badgeMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.1), badgeMaterial);
        badge = badgeMesh;
        badge.name = "chest-badge";
        badge.rotation.y = Math.PI;
        root.add(badge);
        ownedGeometry.push(badgeMesh.geometry);
        if (police) {
          const capPatch = new THREE.PlaneGeometry(0.082, 0.027, 12, 3),
            pp = capPatch.getAttribute("position");
          for (let i = 0; i < pp.count; i++) {
            const x = -pp.getX(i),
              y = pp.getY(i) + 0.13;
            pp.setXYZ(
              i,
              x,
              y,
              -0.134 * Math.sqrt(Math.max(0.02, 1 - (x / 0.111) ** 2 - ((y - 0.065) / 0.14) ** 2)) -
                0.0015,
            );
          }
          capPatch.computeVertexNormals();
          const capBadge = new THREE.Mesh(capPatch, badgeMaterial);
          capBadge.name = "curved-cap-badge";
          accessories.add(capBadge);
          ownedGeometry.push(capPatch);
        }
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
      }
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
      accessories.position.copy(headCenter);
      accessories.rotation.x = pitch * 0.2;
      if (badge) badge.position.set(0, 1.25 - crouchOffset, -0.205);
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
