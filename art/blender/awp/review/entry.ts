/**
 * AWP review page (bundled by capture.mjs). Loads the merged first-person GLBs and renders:
 *  - side-overlay: the AWP on the arm rig vs the shipped AK (red ghost): pistol grips, bore line
 *  - fp-*: the game's first-person framing (60° viewmodel camera, VIEWMODEL rest transform on the
 *    weapon group, viewmodel root scaled 0.52) with the hands fitted as authored-viewmodel does
 *    (fitted-rifle-hands.ts: poseRifleHands → fitContinuousForearms, duty sleeve wrapped on)
 *  - bolt-* / mag-drop: the animated parts moved about their own origins
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  fitContinuousForearms,
  poseRifleHands,
  SHORT_FOREARMS,
  wrapOntoForearm,
} from "../../../../src/lib/fps/fitted-rifle-hands";
import { scaledGuardGrip } from "../../../../src/lib/fps/police-arms";

type Rest = { x: number; y: number; z: number; pitch: number; yaw: number; roll: number };
export type Spec = {
  /** Bolt travel (+Z, Bolt parent space), handle lift (rad about the bolt axis), mag drop. */
  boltTravel: number;
  handleLift: number;
  magDrop: number;
  /** Support-hand grip on the fore-end (scaledGuardGrip args) and twist. */
  guard: { scale: number; shift: [number, number, number]; twist: number };
  rests: Record<string, Rest>;
};
declare global {
  interface Window {
    review: (spec: Spec) => Promise<Record<string, string>>;
  }
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const load = (url: string) => loader.loadAsync(url).then((g) => g.scene);

function renderer(w: number, h: number) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(w, h);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(r.domElement);
  return r;
}

function lights(scene: THREE.Scene, r: THREE.WebGLRenderer, background = 0xb9a990) {
  const pmrem = new THREE.PMREMGenerator(r);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.background = new THREE.Color(background);
  scene.add(new THREE.HemisphereLight(0xe3ecf7, 0x6e5c46, 1.3));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(-1.5, 3, 1.2);
  scene.add(sun);
}

/** Tactical glove material from the authored set (authored-viewmodel.ts createGloveMaterial). */
function gloveMaterial(source: THREE.MeshStandardMaterial) {
  return new THREE.MeshPhysicalMaterial({
    color: source.map ? 0xffffff : 0x34353a,
    map: source.map,
    normalMap: source.normalMap,
    normalScale: source.normalScale.clone(),
    aoMap: source.aoMap,
    roughnessMap: source.roughnessMap,
    roughness: source.map ? 1 : 0.9,
    metalness: 0,
    sheen: 0.22,
    sheenColor: new THREE.Color(0x2c2d31),
    sheenRoughness: 0.6,
    envMapIntensity: 0.7,
  });
}

/** The fitted first-person arms on `model` (inside `root`), as the runtime builds them. */
function fitArms(model: THREE.Object3D, root: THREE.Object3D, spec: Spec, police: boolean) {
  const arm = model.getObjectByName("FPArms") as THREE.SkinnedMesh;
  const guard = {
    ...scaledGuardGrip(spec.guard.scale, new THREE.Vector3(...spec.guard.shift)),
    handTwist: spec.guard.twist,
  };
  const delta = poseRifleHands(model, guard);
  const fitted = fitContinuousForearms(arm, root, delta, SHORT_FOREARMS);
  const glove = gloveMaterial(arm.material as THREE.MeshStandardMaterial);
  const accessories = model.getObjectByName("FPAccessories")!;
  accessories.removeFromParent();
  accessories.updateWorldMatrix(true, true);
  const accessoryRoot = accessories.matrixWorld.clone().invert();
  const meshesOf = (name: string) => {
    const found: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
    accessories.getObjectByName(name)?.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      found.push({
        geometry: o.geometry
          .clone()
          .applyMatrix4(new THREE.Matrix4().multiplyMatrices(accessoryRoot, o.matrixWorld)),
        material: o.material as THREE.Material,
      });
    });
    return found;
  };
  const sleeve = meshesOf(police ? "PoliceSleeve" : "JacketSleeve");
  const watch = police ? meshesOf("JacketWatch") : [];
  for (const side of ["L", "R"] as const) {
    const built = fitted[side];
    root.add(new THREE.Mesh(built.gloves, glove));
    for (const part of sleeve)
      root.add(new THREE.Mesh(wrapOntoForearm(part.geometry, built.path, SHORT_FOREARMS), part.material));
    if (side === "L")
      for (const part of watch)
        root.add(new THREE.Mesh(wrapOntoForearm(part.geometry, built.path), part.material));
  }
  arm.visible = false;
}

function pose(model: THREE.Object3D, travel: number, lift: number, drop: number) {
  const bolt = model.getObjectByName("Bolt")!,
    handle = model.getObjectByName("BoltHandle")!,
    mag = model.getObjectByName("Magazine")!;
  bolt.userData.rest ??= bolt.position.z;
  mag.userData.rest ??= mag.position.y;
  bolt.position.z = bolt.userData.rest + travel;
  handle.rotation.z = lift;
  mag.position.y = mag.userData.rest - drop;
}

const shot = (r: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
  r.render(scene, camera);
  return r.domElement.toDataURL("image/png");
};

function marker(color: number, size = 0.006) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(size, 12, 8),
    new THREE.MeshBasicMaterial({ color, depthTest: false }),
  );
}

window.review = async (spec) => {
  const out: Record<string, string> = {};
  // ------------------------------------------------ side overlay vs the AK
  {
    const r = renderer(1800, 760);
    const scene = new THREE.Scene();
    lights(scene, r, 0xd8d8d8);
    const awp = await load("/fps/models/awp-police.glb");
    const ak = await load("/fps/models/ak47-authored.glb");
    scene.add(awp);
    const ghost = new THREE.MeshBasicMaterial({
      color: 0xff2020,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      depthTest: false,
    });
    const akGun = ak.getObjectByName("Gun_ak47")!;
    akGun.traverse((o) => {
      if (o instanceof THREE.Mesh) o.material = ghost;
    });
    scene.add(akGun);
    // Bore line (Y = 0) and the right-hand frames.
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.1, 0, 0.6),
        new THREE.Vector3(0.1, 0, -2.4),
      ]),
      new THREE.LineBasicMaterial({ color: 0x0050ff, depthTest: false }),
    );
    scene.add(line);
    awp.updateWorldMatrix(true, true);
    for (const [name, color] of [
      ["GripR", 0x00c000],
      ["GripL", 0x00c000],
      ["Trigger", 0xff00ff],
      ["BoltKnob", 0xffaa00],
      ["ScopeEye", 0x00ffff],
      ["MagazineGrip", 0xffff00],
      ["EjectionPort", 0xff8000],
      ["MagRelease", 0x8000ff],
    ] as const) {
      const m = marker(color);
      awp.getObjectByName(name)!.getWorldPosition(m.position);
      scene.add(m);
    }
    for (const bone of ["Bone_R.007_end", "Bone_R007_end"]) {
      const b = awp.getObjectByName(bone);
      if (b) {
        const m = marker(0xff0000, 0.005);
        b.getWorldPosition(m.position);
        scene.add(m);
      }
    }
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10);
    const frame = (z0: number, z1: number, y0: number, y1: number) => {
      cam.left = -(z0 + z1) / 2 + z0;
      cam.right = (z1 - z0) / 2;
      cam.top = (y1 - y0) / 2;
      cam.bottom = -(y1 - y0) / 2;
      // Camera on +X looking −X: screen right is −Z (muzzle to the right).
      cam.position.set(3, (y0 + y1) / 2, (z0 + z1) / 2);
      cam.lookAt(0, (y0 + y1) / 2, (z0 + z1) / 2);
      cam.updateProjectionMatrix();
    };
    frame(-0.62, 0.62, -0.36, 0.16);
    out["a-side-overlay-grip"] = shot(r, scene, cam);
    frame(-2.6, 0.75, -0.65, 0.58);
    out["a-side-overlay-full"] = shot(r, scene, cam);
    r.domElement.remove();
    r.dispose();
  }
  // ------------------------------------------------ first-person framing
  for (const [team, police] of [
    ["police", true],
    ["terrorist", false],
  ] as const) {
    for (const [restName, rest] of Object.entries(spec.rests)) {
      if (team === "terrorist" && restName !== "ak") continue;
      const r = renderer(1280, 720);
      const scene = new THREE.Scene();
      lights(scene, r);
      const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 0.03, 8);
      const weaponGroup = new THREE.Group();
      weaponGroup.position.set(rest.x, rest.y, rest.z);
      weaponGroup.rotation.set(rest.pitch, rest.yaw, rest.roll);
      const root = new THREE.Group();
      root.scale.setScalar(SHORT_FOREARMS.scale);
      weaponGroup.add(root);
      scene.add(camera);
      camera.add(weaponGroup);
      const model = await load(`/fps/models/awp-${team}.glb`);
      root.add(model);
      root.updateWorldMatrix(true, true);
      fitArms(model, root, spec, police);
      // Floor plane far below for a horizon cue.
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({ color: 0xa48d6c, roughness: 0.95 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.7;
      scene.add(floor);
      out[`b-fp-${team}-${restName}`] = shot(r, scene, camera);
      if (team === "police" && restName === "ak") {
        // ADS: camera at ScopeEye looking down the scope.
        const eye = model.getObjectByName("ScopeEye")!;
        model.updateWorldMatrix(true, true);
        const adsCam = new THREE.PerspectiveCamera(60, 1280 / 720, 0.005, 8);
        eye.getWorldPosition(adsCam.position);
        eye.getWorldQuaternion(adsCam.quaternion);
        scene.add(adsCam);
        out["b-ads-scope-eye"] = shot(r, scene, adsCam);
      }
      r.domElement.remove();
      r.dispose();
    }
  }
  // ------------------------------------------------ moving parts close-ups
  {
    const r = renderer(1200, 636);
    const scene = new THREE.Scene();
    lights(scene, r, 0xd8d8d8);
    const model = await load("/fps/models/awp-police.glb");
    model.getObjectByName("FPRig")!.visible = false;
    model.getObjectByName("FPAccessories")!.visible = false;
    scene.add(model);
    const pivots: THREE.Mesh[] = [];
    for (const [name, color] of [
      ["Bolt", 0x00c000],
      ["BoltHandle", 0x0080ff],
      ["BoltKnob", 0xffaa00],
      ["Magazine", 0xff00ff],
    ] as const) {
      const m = marker(color, 0.005);
      pivots.push(m);
      m.userData.node = name;
      scene.add(m);
    }
    const place = () => {
      model.updateWorldMatrix(true, true);
      for (const m of pivots) model.getObjectByName(m.userData.node)!.getWorldPosition(m.position);
    };
    const side = new THREE.OrthographicCamera(-0.5, 0.5, 0.25, -0.28, 0.01, 10);
    side.position.set(3, -0.02, -0.36);
    side.lookAt(0, -0.02, -0.36);
    const rear = new THREE.PerspectiveCamera(40, 1200 / 640, 0.01, 10);
    rear.position.set(0.32, 0.2, 0.12);
    rear.lookAt(0.0, 0.0, -0.36);
    const states: [string, number, number, number][] = [
      ["c-bolt-rest", 0, 0, 0],
      ["c-bolt-lifted", 0, spec.handleLift, 0],
      ["c-bolt-back", spec.boltTravel, spec.handleLift, 0],
      ["c-mag-dropped", 0, 0, spec.magDrop],
    ];
    for (const [name, travel, lift, drop] of states) {
      pose(model, travel, lift, drop);
      place();
      out[`${name}-side`] = shot(r, scene, side);
      out[`${name}-rear`] = shot(r, scene, rear);
    }
    r.domElement.remove();
    r.dispose();
  }
  return out;
};
