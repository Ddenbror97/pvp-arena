import * as THREE from "three";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import {
  poseRifleHands,
  fitContinuousForearms,
  reproportionFingers,
  magazineGrip as magazineGripFrame,
  SHORT_FOREARMS,
  wrapOntoForearm,
  type ForearmPath,
  type ForearmShape,
  type GripFrame,
  type ThumbCurl,
} from "./fitted-rifle-hands";
import { ARENA_MODELS, BR_GUN_MODELS } from "./model-assets";
import { createSkinMaterial } from "./forearm-detail";
import { policeGuardGrip, scaledGuardGrip } from "./police-arms";
import { upgradeRifleMaterials } from "./rifle-materials";
import {
  BOLT_RACK,
  M4_RELOAD_CLIPS,
  RELOAD_CLIPS,
  sampleNumber,
  sampleSegment,
  sampleVec,
  type ReloadClip,
  type ReloadKind,
  type SupportKey,
} from "./reload-animation";
import { AWP_BOLT, AWP_KICK, AWP_RELOAD_CLIPS, BOLT_CANT, type BoltPose } from "./awp-animation";
import {
  DEAGLE_FOREARMS,
  DEAGLE_HANDLE,
  DEAGLE_RELOAD_CLIPS,
  DEAGLE_SLIDE,
  deagleGuardGrip,
} from "./deagle-animation";
import { MP5_FOREARMS, MP5_HANDLE, MP5_LEVER, MP5_RELOAD_CLIPS } from "./mp5-animation";

/** Magazine grip, in rifle-local units: wrap axis just ahead of the authored grip marker. */
const MAG_GRIP_OFFSET = new THREE.Vector3(0, -0.035, -0.035);
const MAG_EDGE_DOWN = new THREE.Vector3(0, -0.9, -0.43);
const MAG_TO_WRIST = new THREE.Vector3(-0.6, 0, 0.8);
/** Finger wrap round the magazine: the gloved fingers close on its faces, not through them. */
const MAG_SQUEEZE = 0.84;
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
const AK_HANDLE: HandleGrip = {
  marker: false,
  offset: HANDLE_GRIP_OFFSET,
  axis: HANDLE_AXIS,
  toWrist: HANDLE_TO_WRIST,
  squeeze: HANDLE_SQUEEZE,
  elbow: HANDLE_ELBOW,
};

/**
 * One first-person weapon: its GLB (rifle + the shared arm rig), reload clips, how the support
 * hand grips it, and how the arms are dressed. The Terrorist AK is the original configuration;
 * every AK value below is the constant it always used, so the AK is unchanged.
 */
/**
 * How the support hand closes on the charging handle (or a pistol's slide) for a rack: the wrap
 * axis through the knob, the wrist direction, the finger squeeze and the elbow (from the wrist).
 * `marker`: the knob is the gun's `ChargingKnob` empty; otherwise the handle's rightmost points
 * (the AK's right-side knob).
 */
export type HandleGrip = {
  marker: boolean;
  offset: THREE.Vector3;
  axis: THREE.Vector3;
  toWrist: THREE.Vector3;
  squeeze: number;
  elbow: THREE.Vector3;
  /** Support thumb tip, relative to the knob (root units); the wrap's own placement if omitted. */
  thumb?: THREE.Vector3 | ThumbCurl;
  /** Extra move of the hand (root units), e.g. knuckles onto the slide's top edge. */
  shift?: THREE.Vector3;
  /** Fingers curled by joint angle over the part (see GripFrame.supportCurl). */
  curl?: GripFrame["supportCurl"];
};
export type ViewmodelVariant = {
  id: "ak" | "m4" | "awp" | "mp5" | "deagle";
  /**
   * Bolt-action rifle (AWP): the moving part is `Bolt` (child `BoltHandle`, knob `BoltKnob`)
   * instead of `ChargingHandle`, and the RIGHT arm is a separate rig that leaves the pistol grip
   * to work the bolt (see awp-animation.ts boltPose).
   */
  boltAction?: boolean;
  asset: string;
  clips: Record<ReloadKind, ReloadClip>;
  /** Support-hand grip on the handguard (identity for the AK handguard the rig was tuned on). */
  guard: GripFrame;
  magazine: {
    offset: THREE.Vector3;
    edgeDown: THREE.Vector3;
    toWrist: THREE.Vector3;
    squeeze: number;
    /** AK magazines rock about the front lug; AR magazines drop straight (pivot at the top). */
    rock: "lug" | "straight";
    /**
     * Elbow (from the wrist, root units) for the hand holding the magazine; the guard elbow
     * turned into the magazine grip's frame when omitted.
     */
    elbow?: THREE.Vector3;
  };
  /** Bake a charging-handle grip (AK rack). The M4 reloads use the bolt catch instead. */
  chargingHandle: boolean;
  /** That grip, when not the AK's right-side overhand rack. */
  handle?: HandleGrip;
  /** Full rearward travel of the handle / slide (the "racked" anchor); BOLT_RACK when omitted. */
  rack?: number;
  /** Offset keys on the magazine / handle anchors move the baked grip hands (see pose). */
  bakedOffsets?: boolean;
  /**
   * Between two different baked grips the nearer grip's hand follows the support rig: "rigid"
   * (default) turns with it; "slide" only moves (the hands swap at the half-way key, which the
   * clip keeps out of view), for grips whose forearms point very differently (the Deagle's
   * magazine hand and overhand rack).
   */
  bakedTravel?: "rigid" | "slide";
  /** Charging-handle kick per shot (AK reciprocating handle; the AR handle stays put). */
  boltKick: number;
  forearms: ForearmShape;
  /**
   * Arm dress. "jacket": the snow-camo smock sleeve (Terrorist / AK). "police": the steel-blue
   * duty-shirt sleeve with the field watch strapped over it (Police / M4A1). "bare": bare
   * forearm with the rolled olive sleeve and the watch on the skin (fallback / older GLBs).
   */
  arms: "jacket" | "police" | "bare";
  /**
   * Lift on the glove material (0 = the rifles' look): the pistol's hands fill the lower right of
   * the view right next to a chrome slide, where the plain dark glove reads as a black shape.
   */
  gloveDetail?: number;
  /** Re-proportion the fingers to a real hand (reproportionFingers) before any grip is fitted. */
  anatomicalFingers?: boolean;
};
/** Support-hand twist about its own axis on both rifles (radians); see GripFrame.handTwist. */
export const SUPPORT_HAND_TWIST = 1.2;
export const AK_VIEWMODEL: ViewmodelVariant = {
  id: "ak",
  asset: ARENA_MODELS.rifle,
  clips: RELOAD_CLIPS,
  // Support hand turned palm-up round the handguard (wrist and forearm unchanged), so the
  // fingers wrap it instead of gripping it side-on.
  // Fingers closed onto the wood (the turned hand's authored wrap left them in the air).
  guard: { ...scaledGuardGrip(0.72), handTwist: SUPPORT_HAND_TWIST },
  magazine: {
    offset: MAG_GRIP_OFFSET,
    edgeDown: MAG_EDGE_DOWN,
    toWrist: MAG_TO_WRIST,
    squeeze: MAG_SQUEEZE,
    rock: "lug",
  },
  chargingHandle: true,
  boltKick: 0.025,
  forearms: SHORT_FOREARMS,
  arms: "jacket",
};
/** Police M4A1: suppressed, carry handle, quad-rail handguard; blue duty sleeves, watch over the cuff. */
export const M4_VIEWMODEL: ViewmodelVariant = {
  id: "m4",
  asset: ARENA_MODELS.m4,
  clips: M4_RELOAD_CLIPS,
  // Same palm-round grip as the AK, on the quad rail.
  guard: { ...policeGuardGrip(0.8), handTwist: SUPPORT_HAND_TWIST },
  magazine: {
    offset: new THREE.Vector3(0, -0.03, -0.03),
    edgeDown: new THREE.Vector3(0, -0.94, -0.33),
    toWrist: MAG_TO_WRIST,
    squeeze: 0.95,
    rock: "straight",
  },
  chargingHandle: false,
  boltKick: 0,
  forearms: SHORT_FOREARMS,
  arms: "police",
};

/**
 * AWP (both teams' arms; the GLB is the AWP merged onto that team's rig). Support hand: the AK
 * handguard wrap opened slightly and moved down onto the fore-end axis (rig Y −0.055).
 */
const AWP_BASE = {
  id: "awp",
  boltAction: true,
  clips: AWP_RELOAD_CLIPS,
  guard: {
    ...scaledGuardGrip(0.82, new THREE.Vector3(0.004, -0.044, 0)),
    handTwist: SUPPORT_HAND_TWIST,
  },
  magazine: {
    offset: new THREE.Vector3(0, -0.02, -0.02),
    edgeDown: new THREE.Vector3(0, -0.97, -0.24),
    toWrist: MAG_TO_WRIST,
    squeeze: 0.95,
    rock: "straight",
  },
  chargingHandle: false,
  boltKick: 0,
  forearms: SHORT_FOREARMS,
} as const satisfies Omit<ViewmodelVariant, "asset" | "arms">;
export const AWP_TERRORIST_VIEWMODEL: ViewmodelVariant = {
  ...AWP_BASE,
  asset: ARENA_MODELS.awpTerrorist,
  arms: "jacket",
};
export const AWP_POLICE_VIEWMODEL: ViewmodelVariant = {
  ...AWP_BASE,
  asset: ARENA_MODELS.awpPolice,
  arms: "police",
};
/**
 * The battle royale's Hunting Rifle (art/blender/hunting): built on the AWP's node contract
 * (bolt, handle and knob, magazine and its grip, trigger, grips, scope eye at the same points),
 * so the AWP's hands, bolt cycle and both reload clips work it unchanged.
 */
export const HUNTING_POLICE_VIEWMODEL: ViewmodelVariant = {
  ...AWP_BASE,
  asset: BR_GUN_MODELS.huntingPolice,
  arms: "police",
};

/**
 * HK MP5 (art/blender/mp5; both teams' arms). Support hand wrapped round the handguard exactly as
 * on the M4 (owner, 2026-11-09: same hold, thumb included); the reloads
 * work the cocking lever on the LEFT of the tube (the HK lock-back and slap, mp5-animation.ts),
 * so the handle grip closes on that knob from the left. The lever is non-reciprocating: no kick.
 */
const MP5_BASE = {
  id: "mp5",
  clips: MP5_RELOAD_CLIPS,
  guard: {
    // The M4's wrap (owner, 2026-11-09: held like the M4), moved onto the MP5's handguard (back
    // and down from the AK axis the authored wrap is built round) and closed tighter so no
    // finger stands up beside it.
    ...scaledGuardGrip(0.55, new THREE.Vector3(0.008, -0.025, 0.15)),
    handTwist: SUPPORT_HAND_TWIST,
  },
  magazine: {
    offset: new THREE.Vector3(0, -0.03, -0.022),
    edgeDown: new THREE.Vector3(0, -0.95, -0.3),
    toWrist: MAG_TO_WRIST,
    squeeze: 0.9,
    rock: "straight",
  },
  chargingHandle: true,
  handle: MP5_HANDLE,
  rack: MP5_LEVER.travel,
  bakedOffsets: true,
  boltKick: 0,
  forearms: MP5_FOREARMS,
} as const satisfies Omit<ViewmodelVariant, "asset" | "arms">;
export const MP5_TERRORIST_VIEWMODEL: ViewmodelVariant = {
  ...MP5_BASE,
  asset: BR_GUN_MODELS.mp5Terrorist,
  arms: "jacket",
};
export const MP5_POLICE_VIEWMODEL: ViewmodelVariant = {
  ...MP5_BASE,
  asset: BR_GUN_MODELS.mp5Police,
  arms: "police",
};

/**
 * Desert Eagle (art/blender/deagle; both teams' arms): a two-hand pistol grip, the support hand
 * cupped round the shooting hand (deagle-animation.ts). The slide is the "charging handle": it
 * blows back on every shot, locks back on the last round and is racked overhand on an empty
 * reload.
 */
const DEAGLE_BASE = {
  id: "deagle",
  clips: DEAGLE_RELOAD_CLIPS,
  guard: deagleGuardGrip(),
  magazine: {
    offset: new THREE.Vector3(0, -0.01, -0.02),
    edgeDown: new THREE.Vector3(0, -0.96, 0.27),
    toWrist: MAG_TO_WRIST,
    squeeze: 0.85,
    rock: "straight",
    // Gun space, in line with the hand holding the magazine (≈10° off its axis): a straight
    // forearm out to the left instead of one bent down at the wrist.
    elbow: new THREE.Vector3(-0.72, -0.2, 0.62),
  },
  chargingHandle: true,
  handle: DEAGLE_HANDLE,
  rack: DEAGLE_SLIDE.travel,
  bakedOffsets: true,
  bakedTravel: "slide",
  boltKick: DEAGLE_SLIDE.travel,
  forearms: DEAGLE_FOREARMS,
  gloveDetail: 1,
  anatomicalFingers: true,
} as const satisfies Omit<ViewmodelVariant, "asset" | "arms">;
export const DEAGLE_TERRORIST_VIEWMODEL: ViewmodelVariant = {
  ...DEAGLE_BASE,
  asset: BR_GUN_MODELS.deagleTerrorist,
  arms: "jacket",
};
export const DEAGLE_POLICE_VIEWMODEL: ViewmodelVariant = {
  ...DEAGLE_BASE,
  asset: BR_GUN_MODELS.deaglePolice,
  arms: "police",
};

/**
 * Right hand on the AWP bolt knob: the fist (centred on the pistol-grip marker) moves onto the
 * knob ball, offset to the knob's outer side, keeping the grip's turn (rig units). A turn toward
 * the knob's shaft was written once but never applied (an aliased slerp always gave none); the
 * bolt animation was tuned without it, and applying it lifts the forearm off the rifle.
 */
const KNOB_FIST_OFFSET = new THREE.Vector3(-0.05, 0.015, 0);
/** The hand follows the handle's lift about the bore only partly (the wrist turns the rest). */
const KNOB_FOLLOW_ROLL = 0.35;
/** The hand's arc off the grip on the way to the knob (rig units, scaled by sin(πt)). */
const KNOB_ARC = new THREE.Vector3(0.02, 0.05, 0.03);

/** Share of a turning handle's rotation (the MP5 lever into its notch) the gripping hand follows. */
const HANDLE_TURN_FOLLOW = 0.3;
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/** M4 bolt-catch strike: wrist offset from the magazine-grip wrist, beyond the paddle shift. */
const BOLT_CATCH_PALM = new THREE.Vector3(-0.012, -0.012, 0.018);

/**
 * Anisotropic filtering for every texture on a first-person model. The glove, sleeve and rifle
 * maps load from the GLBs at the default (1), which smears fabric weave, stitching and glove
 * relief at the grazing angles a viewmodel is seen at.
 */
export function sharpenViewmodelTextures(root: THREE.Object3D, level = 8) {
  const slots = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"] as const;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const slot of slots) {
        const texture = (material as THREE.MeshStandardMaterial)[slot];
        if (texture && texture.anisotropy < level) {
          texture.anisotropy = level;
          texture.needsUpdate = true;
        }
      }
    }
  });
}

/** Real authored rifle and skinned hands. Existing controller still owns every input and shot. */
export function createAuthoredViewmodel(
  parent: THREE.Object3D,
  firstPerson = true,
  variant: ViewmodelVariant = AK_VIEWMODEL,
) {
  const asset = retainAuthoredAsset(variant.asset);
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
    marker = new THREE.Object3D();
  let magazine: THREE.Object3D | undefined,
    bolt: THREE.Object3D | undefined,
    boltHandle: THREE.Object3D | undefined,
    boltKnob: THREE.Object3D | undefined,
    handleRest = 0,
    magazineGrip: THREE.Object3D | undefined,
    ejectionPort: THREE.Object3D | undefined;
  /** M4: the magazine-grip hand moved onto the bolt catch (root space, rest pose). */
  const catchShift = new THREE.Matrix4(),
    catchHold = new THREE.Matrix4();
  const magazineRest = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    /** Front locking lug, magazine-local: the AK magazine rocks about this point. */
    lug: new THREE.Vector3(),
  };
  let boltRest = 0,
    boltTurnRest = 0;
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
  const handleFollow = new THREE.Object3D();
  handleFollow.name = "charging-handle-follow";
  /** The support rig's place at the current segment's two keys (root space). */
  const keyA = new THREE.Object3D(),
    keyB = new THREE.Object3D();
  // AWP: the right (trigger) arm as its own rig in weapon-content space, so it can work the bolt.
  const triggerArm = new THREE.Group();
  triggerArm.name = "trigger-arm";
  triggerArm.matrixAutoUpdate = false;
  const knobRest = new THREE.Vector3(),
    palmRest = new THREE.Vector3(),
    knobHold = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
  const supportWrist = new THREE.Vector3(),
    supportGuard = new THREE.Vector3(),
    rigReady = { value: false };
  const scratch = {
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    qa: new THREE.Quaternion(),
    qb: new THREE.Quaternion(),
    qc: new THREE.Quaternion(),
    c: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    m: new THREE.Matrix4(),
    m2: new THREE.Matrix4(),
    euler: new THREE.Euler(),
    inverse: new THREE.Matrix4(),
    handle: new THREE.Matrix4(),
    racked: new THREE.Matrix4(),
  };
  // The bare forearm's material, made only if one is drawn: every current rifle has full-length
  // duty sleeves, and the third-person rifles have no arms at all. Made up front it cost each
  // of a match's viewmodels (about 20 in 1v1, 50 in 5v5, 95 in battle royale) a 512 x 1024 canvas
  // of veins drawn and blurred (15 ms and 2 MB each) and a load of the skin photo.
  let skin: THREE.Material | null = null;
  const ready = asset.ready
    .then((gltf) => {
      if (stopped) return;
      instance = cloneAuthoredModel(gltf.scene);
      weaponContent.add(instance.root);
      if (!firstPerson) {
        // POV sleeves/watch are siblings of FPRig. Remove the whole presentation
        // rig and its loose accessories from the world rifle.
        for (const name of ["FPArms", "FPAccessories", "FPRig"])
          instance.root.getObjectByName(name)?.removeFromParent();
      }
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
        if (variant.anatomicalFingers) reproportionFingers(instance.root);
        const authored = snapshot();
        const supportDelta = poseRifleHands(instance.root, variant.guard);
        const fitted = fitContinuousForearms(arm, root, supportDelta, variant.forearms);
        const material = createGloveMaterial(
          (Array.isArray(arm.material)
            ? arm.material[0]!
            : arm.material) as THREE.MeshStandardMaterial,
          variant.gloveDetail,
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
        // Full-length duty sleeves (art/blender/arms/build_jacket_sleeve.py) cover the forearm,
        // so the rolled olive sleeve and the bare skin go. Terrorist: snow-camo smock, no watch.
        // Police: steel-blue shirt matching the character, the watch strapped over the sleeve.
        const dutySleeve =
          variant.arms === "jacket"
            ? meshesOf("JacketSleeve")
            : variant.arms === "police"
              ? meshesOf("PoliceSleeve")
              : [];
        const jacket = dutySleeve.length > 0;
        if (jacket) {
          sleeveParts.splice(0, sleeveParts.length, ...dutySleeve);
          watchParts.splice(
            0,
            watchParts.length,
            ...(variant.arms === "police" ? meshesOf("JacketWatch") : []),
          );
        }
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
          // Under the jacket sleeve the bare forearm is never visible: skip it.
          if (jacket) built.skin.dispose();
          else
            add(
              built.skin,
              (skin ??= createSkinMaterial({ materials: ownedMaterials, textures: ownedTextures })),
              names.forearm,
            );
          for (const part of sleeveParts)
            add(
              wrapOntoForearm(part.geometry, built.path, variant.forearms),
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
          (side === "L" ? supportContent : variant.boltAction ? triggerArm : weaponContent).add(
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
          .add(variant.magazine.offset);
        const frame = magazineGripFrame(
          axisPoint,
          variant.magazine.edgeDown,
          variant.magazine.toWrist,
          variant.magazine.squeeze,
        );
        const magDelta = poseRifleHands(instance.root, frame);
        const magFitted = fitContinuousForearms(arm, root, magDelta, {
          ...variant.forearms,
          elbow: {
            L: variant.magazine.elbow ?? frame.direction(variant.forearms.elbow.L),
            R: variant.forearms.elbow.R,
          },
        });
        const handOnMag = rootInverse.clone().multiply(handNode.matrixWorld);
        const guardInverse = handOnGuard.clone().invert();

        const boltNode = instance.root.getObjectByName(
          variant.boltAction ? "Bolt" : "ChargingHandle",
        )!;
        if (variant.chargingHandle) {
          // Charging-handle grip: fist closed on the knob (the AK's: right-side knob, wrist over
          // the receiver; the MP5's left-side lever; the Deagle's slide serrations).
          restore(authored);
          const h = variant.handle ?? AK_HANDLE;
          const knobNode = h.marker ? instance.root.getObjectByName("ChargingKnob") : undefined;
          const knob = (
            knobNode
              ? knobNode.getWorldPosition(new THREE.Vector3()).applyMatrix4(toInstance)
              : knobCentre(boltNode, toInstance)
          ).add(h.offset);
          const handleFrame = {
            ...magazineGripFrame(knob, h.axis, h.toWrist, h.squeeze),
            ...(h.thumb && {
              supportThumb:
                h.thumb instanceof THREE.Vector3
                  ? knob.clone().sub(h.offset).add(h.thumb)
                  : h.thumb,
            }),
            ...(h.shift && { supportHandShift: h.shift }),
            ...(h.curl && { supportCurl: h.curl }),
          };
          const handleDelta = poseRifleHands(instance.root, handleFrame);
          const handleFitted = fitContinuousForearms(arm, root, handleDelta, {
            ...variant.forearms,
            elbow: { L: h.elbow, R: variant.forearms.elbow.R },
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
          // The hand rides a stand-in for the handle that moves with it but turns only part of
          // the way (HANDLE_TURN_FOLLOW): the wrist turns the rest, so the forearm stays low.
          handleFollow.position.copy(boltNode.position);
          handleFollow.quaternion.copy(boltNode.quaternion);
          handleFollow.scale.copy(boltNode.scale);
          boltNode.parent!.add(handleFollow);
          handleFollow.add(handleHand);
          handleFitted.R.gloves.dispose();
          handleFitted.R.skin.dispose();
        } else {
          restore(guardState);
          root.updateWorldMatrix(true, true);
          boltRestMatrix.copy(rootInverse).multiply(boltNode.matrixWorld);
        }

        magazineHold.copy(handOnMag).multiply(guardInverse);
        magazineRestMatrix.copy(rootInverse).multiply(magNode.matrixWorld);
        const catchNode = instance.root.getObjectByName("BoltCatch");
        if (catchNode) {
          // Bolt catch strike: the magazine-grip wrist shifted so the palm heel (about where the
          // magazine grip's palm sat) lands on the paddle above the magwell.
          const paddle = catchNode.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse);
          const palm = magGripNode.getWorldPosition(new THREE.Vector3()).applyMatrix4(rootInverse);
          catchShift.makeTranslation(paddle.sub(palm).add(BOLT_CATCH_PALM));
        }
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
      if (variant.id === "m4") toneM4Materials(instance.root);
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
      // An optic mount that comes with a sight (the MP5's claw mount): shown by the
      // attachment fitter only while an optic is on the gun.
      const opticMount = instance.root.getObjectByName("OpticMountGeometry");
      if (opticMount) opticMount.visible = false;
      magazine = instance.root.getObjectByName("Magazine");
      ejectionPort = instance.root.getObjectByName("EjectionPort");
      magazineGrip = instance.root.getObjectByName("MagazineGrip");
      bolt = instance.root.getObjectByName(variant.boltAction ? "Bolt" : "ChargingHandle");
      if (variant.boltAction) {
        boltHandle = instance.root.getObjectByName("BoltHandle");
        boltKnob = instance.root.getObjectByName("BoltKnob");
        handleRest = boltHandle?.rotation.z ?? 0;
      }
      if (magazine) {
        magazineRest.position.copy(magazine.position);
        magazineRest.quaternion.copy(magazine.quaternion);
        if (variant.magazine.rock === "lug") frontLug(magazine, magazineRest.lug);
      }
      boltRest = bolt?.position.z ?? 0;
      boltTurnRest = bolt?.rotation.z ?? 0;
      if (variant.boltAction && boltKnob && boltHandle && firstPerson) {
        // Bolt hold for the right hand, in rest root space (= weapon-content space).
        boltKnob.getWorldPosition(knobRest);
        root.worldToLocal(knobRest);
        palmRest.copy(gripRight);
        weapon.add(triggerArm);
      }
      // Re-centre both rigs on their pivots without moving anything at rest.
      weapon.position.copy(gripRight);
      weaponContent.position.copy(gripRight).negate();
      triggerArm.matrix.makeTranslation(-gripRight.x, -gripRight.y, -gripRight.z);
      support.position.copy(supportWrist);
      supportContent.position.copy(supportWrist).negate();
      supportGuard.copy(supportWrist).sub(gripRight);
      rigReady.value = firstPerson && !!magazine && !!bolt && !!magazineGrip;
      if (firstPerson) instance.root.getObjectByName("FPAccessories")?.removeFromParent();
      root.traverse((object) => {
        object.layers.set(firstPerson ? 1 : 0);
        if (object instanceof THREE.Mesh) object.castShadow = !firstPerson;
      });
      if (firstPerson) sharpenViewmodelTextures(root);
      loaded = true;
    })
    .catch((error) =>
      console.warn(`Authored ${variant.id} unavailable; retaining the existing weapon.`, error),
    );
  const trigger = {
    knob: new THREE.Vector3(),
    held: new THREE.Vector3(),
    q: new THREE.Quaternion(),
    roll: new THREE.Quaternion(),
    m: new THREE.Matrix4(),
    toContent: new THREE.Matrix4(),
    z: new THREE.Vector3(0, 0, 1),
    one: new THREE.Vector3(1, 1, 1),
  };
  /**
   * AWP right arm: on the pistol grip at rest; with `boltState.hand` it travels (rigidly, in
   * weapon-content space) onto the bolt knob and then rides it through the lift and the draw.
   */
  function poseTriggerArm(boltState: BoltPose | null) {
    const hand = boltState?.hand ?? 0;
    const { knob, held, q, roll, m, toContent, z, one } = trigger;
    if (hand <= 0 || !boltKnob) {
      triggerArm.matrix.makeTranslation(-gripRight.x, -gripRight.y, -gripRight.z);
      triggerArm.updateMatrixWorld(true);
      return;
    }
    // Knob now, in weapon-content space (rest root space).
    toContent.copy(weaponContent.matrixWorld).invert();
    boltKnob.getWorldPosition(knob).applyMatrix4(toContent);
    // Fist centre on the knob, partly rolled with the lift (its grip turn kept, see KNOB_FIST_OFFSET).
    roll.setFromAxisAngle(z, (boltState?.lift ?? 0) * AWP_BOLT.lift * KNOB_FOLLOW_ROLL);
    knobHold.quaternion.copy(roll);
    knobHold.position.copy(knob).add(held.copy(KNOB_FIST_OFFSET).applyQuaternion(roll));
    // Blend grip → knob about the palm, with a short arc off the grip on the way.
    q.identity().slerp(knobHold.quaternion, hand);
    held
      .copy(palmRest)
      .lerp(knobHold.position, hand)
      .addScaledVector(KNOB_ARC, boltState?.travel ?? 0);
    // matrix = T(-gripRight) · T(held) · R(q) · T(-palm)
    m.compose(held, q, one).multiply(
      scratch.m2.makeTranslation(-palmRest.x, -palmRest.y, -palmRest.z),
    );
    triggerArm.matrix.makeTranslation(-gripRight.x, -gripRight.y, -gripRight.z).multiply(m);
    triggerArm.updateMatrixWorld(true);
  }
  /** Apply a key-posed reload clip (and bolt kick) to the weapon, magazine and support rigs. */
  function pose(clip: ReloadClip, p: number, kick: number, boltState: BoltPose | null = null) {
    const { a, b, c, qa, qb, euler, inverse } = scratch;
    const wp = sampleVec(clip.weaponPosition, p),
      wr = sampleVec(clip.weaponRotation, p);
    const cant = boltState?.cant ?? 0;
    // AWP: a heavy recoil kick (back and muzzle up) on top of the clip, and the roll toward the
    // camera while the bolt is worked.
    const awpKick = variant.boltAction ? kick : 0;
    weapon.position.set(
      gripRight.x + wp[0],
      gripRight.y + wp[1] + cant * BOLT_CANT.y,
      gripRight.z + wp[2] + cant * BOLT_CANT.z + awpKick * AWP_KICK.back,
    );
    weapon.rotation.set(
      wr[0] + cant * BOLT_CANT.pitch + awpKick * AWP_KICK.pitch,
      wr[1] + cant * BOLT_CANT.yaw,
      wr[2] + cant * BOLT_CANT.roll,
    );
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
    bolt!.position.z =
      boltRest +
      Math.max(travel, kick * variant.boltKick) +
      (boltState?.back ?? 0) * AWP_BOLT.travel;
    const turn = clip.handleTurn ? sampleNumber(clip.handleTurn, p) : 0;
    bolt!.rotation.z = boltTurnRest + turn;
    // The support hand's view of the handle: same travel, part of the turn.
    if (handleFollow.parent) {
      handleFollow.position.copy(bolt!.position);
      handleFollow.quaternion
        .copy(bolt!.quaternion)
        .multiply(scratch.q.setFromAxisAngle(Z_AXIS, -turn * (1 - HANDLE_TURN_FOLLOW)));
    }
    if (boltHandle) boltHandle.rotation.z = handleRest + (boltState?.lift ?? 0) * AWP_BOLT.lift;
    weapon.updateMatrixWorld(true);
    if (variant.boltAction) poseTriggerArm(boltState);
    inverse.copy(root.matrixWorld).invert();
    // Resolve both bracketing keys against the live rig, then blend: the hand tracks moving parts.
    // The mag/handle anchors are the exact rigid transforms that put the handguard hand where the
    // baked magazine- or handle-grip hand is, so swapping between baked hands never pops.
    magazineNow.copy(inverse).multiply(magazine!.matrixWorld);
    const magHold = scratch.m
      .copy(magazineNow)
      .multiply(scratch.m2.copy(magazineRestMatrix).invert())
      .multiply(magazineHold);
    boltNow.copy(inverse).multiply((handleFollow.parent ? handleFollow : bolt!).matrixWorld);
    const handleNow = scratch.handle
      .copy(boltNow)
      .multiply(scratch.m2.copy(boltRestMatrix).invert())
      .multiply(handleHold);
    // Racked: the handle grip with the bolt held at full travel (the hand stays back on release).
    const racked = scratch.racked.copy(handleNow);
    const rack = variant.rack ?? BOLT_RACK;
    if (bolt!.position.z !== boltRest + rack) {
      // Shift by where the bolt would be at full travel, measured through its parent.
      const parent = bolt!.parent!;
      b.set(bolt!.position.x, bolt!.position.y, boltRest + rack);
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
              : key.anchor === "catch"
                ? catchHold
                    .copy(weapon.matrix)
                    .multiply(scratch.m2.makeTranslation(-gripRight.x, -gripRight.y, -gripRight.z))
                    .multiply(catchShift)
                    .multiply(magazineHold)
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
    keyA.position.copy(c);
    keyA.quaternion.copy(qa);
    keyB.position.copy(b);
    keyB.quaternion.copy(qb);
    support.position.copy(c.lerp(b, segment.k));
    support.quaternion.copy(scratch.qc.copy(qa).slerp(qb, segment.k));
    // While the magazine / handle is in hand, the matching baked grip (fingers closed on it) shows.
    const holding = (anchor: SupportKey["anchor"]) =>
      segment.a.anchor === anchor &&
      segment.b.anchor === anchor &&
      [...segment.a.offset, ...segment.b.offset].every((v) => v === 0);
    magazineHand.visible = holding("mag");
    handleHand.visible = holding("handle");
    for (const h of [magazineHand, handleHand]) {
      h.position.set(0, 0, 0);
      h.quaternion.identity();
      h.scale.set(1, 1, 1);
    }
    if (variant.bakedOffsets) {
      // The baked grips also carry offset keys (the hand hovering over the lever before the
      // slap, the heel of the palm off the magazine for the smack): the closed hand moves, its
      // forearm keeps its own line, instead of the handguard rig being re-aimed at the part.
      const onHandle = (k: SupportKey) => k.anchor === "handle" || k.anchor === "racked";
      // "racked": the hand stays where the handle was at full travel after letting go.
      const shift = (k: SupportKey) =>
        k.anchor === "racked" ? (variant.rack ?? BOLT_RACK) - (bolt!.position.z - boltRest) : 0;
      const baked = (k: SupportKey) =>
        k.anchor === "mag" ? magazineHand : onHandle(k) && handleFollow.parent ? handleHand : null;
      const ha = baked(segment.a),
        hb = baked(segment.b);
      if (ha && ha === hb) {
        offsetInto(ha, segment.a, segment.b, segment.k);
        if (ha === handleHand)
          ha.position.z += shift(segment.a) + (shift(segment.b) - shift(segment.a)) * segment.k;
        ha.visible = true;
      } else if (ha && hb) {
        // Between two different grips (magazine → slide): the nearer grip's closed hand travels
        // the blended path, so no handguard rig is re-aimed through the middle of the screen.
        const near = segment.k < 0.5 ? segment.a : segment.b;
        const hand = segment.k < 0.5 ? ha : hb;
        offsetInto(hand, near, near, 0);
        if (hand === handleHand) hand.position.z += shift(near);
        travelBaked(hand, near === segment.a ? keyA : keyB, variant.bakedTravel === "slide");
        hand.visible = true;
      }
    }
    support.visible = !magazineHand.visible && !handleHand.visible;
  }
  /**
   * Move a baked grip hand along with the support rig: by the rigid move that takes the rig
   * from its place at the grip's key (`key`, root space) to where it is now (`support`).
   */
  function travelBaked(hand: THREE.Object3D, key: THREE.Object3D, slide = false) {
    const { m, m2, inverse, a } = scratch;
    key.updateMatrix();
    support.updateMatrix();
    // Δ (root space) = support · key⁻¹ (or only its translation when sliding), carried into the
    // hand's parent space.
    const parent = hand.parent!;
    parent.updateWorldMatrix(true, false);
    hand.updateMatrix();
    if (slide) m.makeTranslation(a.copy(support.position).sub(key.position));
    else m.copy(support.matrix).multiply(m2.copy(key.matrix).invert());
    inverse.copy(parent.matrixWorld).invert();
    m.premultiply(root.matrixWorld)
      .multiply(m2.copy(root.matrixWorld).invert())
      .premultiply(inverse)
      .multiply(parent.matrixWorld)
      .multiply(hand.matrix);
    m.decompose(hand.position, hand.quaternion, hand.scale);
  }
  /** Move a baked hand by the blended key offsets (root units, weapon frame) in its parent. */
  function offsetInto(hand: THREE.Object3D, ka: SupportKey, kb: SupportKey, k: number) {
    const { a, b } = scratch;
    a.set(ka.offset[0]!, ka.offset[1]!, ka.offset[2]!)
      .lerp(b.set(kb.offset[0]!, kb.offset[1]!, kb.offset[2]!), k)
      .applyQuaternion(weapon.quaternion);
    if (a.lengthSq() === 0) return;
    const parent = hand.parent!;
    parent.updateWorldMatrix(true, false);
    b.set(0, 0, 0);
    root.localToWorld(a);
    root.localToWorld(b);
    parent.worldToLocal(a);
    parent.worldToLocal(b);
    hand.position.copy(a.sub(b));
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
    update(
      rifle: boolean,
      reload: number,
      kick: number,
      kind: ReloadKind = "tactical",
      /** AWP: the bolt and right hand (awp-animation.ts boltPose), or null at rest. */
      boltState: BoltPose | null = null,
    ) {
      root.visible = loaded && rifle;
      if (!loaded) return;
      if (!rigReady.value) {
        if (magazine) {
          magazine.position.y = magazineRest.position.y - reload * 0.09;
          magazine.rotation.x = reload * 0.12;
        }
        if (bolt) bolt.position.z = boltRest + kick * variant.boltKick;
        return;
      }
      pose(variant.clips[kind], reload > 0 && reload < 1 ? reload : 0, kick, boltState);
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
    /** Ejection port in `parent` space (shell casings), or null before load / without one. */
    ejectionPort(target: THREE.Vector3) {
      if (!loaded || !ejectionPort) return null;
      ejectionPort.updateWorldMatrix(true, false);
      return parent.worldToLocal(ejectionPort.getWorldPosition(target));
    },
    variant: variant.id,
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
export function createGloveMaterial(source: THREE.MeshStandardMaterial, detail = 0) {
  const textured = !!source.map;
  const material = new THREE.MeshPhysicalMaterial({
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
  if (detail > 0) {
    // Brighter base (the map's charcoal stays charcoal, its weave and seams start to show),
    // deeper normals for the knuckle pads and stitching, and a fabric sheen that rims every
    // finger and knuckle so their round form reads against the dark gun instead of a flat blob.
    material.color.multiplyScalar(1 + 0.45 * detail);
    material.normalScale.multiplyScalar(1 + 0.9 * detail);
    material.roughness = 1 - 0.12 * detail;
    material.sheen = 0.22 + 0.68 * detail;
    material.sheenColor.set(0x6c7079);
    material.sheenRoughness = 0.38;
    material.envMapIntensity = 0.7 + 0.6 * detail;
    // Soft-clip the base map's brightest texels (lint and dust specks in the bake), which the
    // lift above would otherwise turn into white streaks across the back of the hand; the
    // stitching stays lighter than the fabric, just not white.
    const knee = (1.6 * detail).toFixed(3);
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        diffuseColor.rgb = diffuseColor.rgb / (vec3(1.0) + ${knee} * diffuseColor.rgb);
        // One neutral charcoal for the whole glove: the thumb's panel is baked a warmer, darker
        // brown than the back of the hand and read as a different glove.
        float gloveLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        diffuseColor.rgb = mix(vec3(gloveLuma), diffuseColor.rgb, 0.15);
        diffuseColor.rgb = pow(diffuseColor.rgb, vec3(0.88));
        // The fingers' and thumb's knit panels are baked much darker than the back of the hand,
        // so the thumb read as a black worm from another glove: lift them to the hand's tone.
        diffuseColor.rgb *= mix(1.0, 1.35, clamp(vGloveDigit, 0.0, 1.0));`,
      );
      shader.fragmentShader = "varying float vGloveDigit;\n" + shader.fragmentShader;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float digit;\nvarying float vGloveDigit;",
        )
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGloveDigit = digit;");
      // The thumb and fingertips face down into the warm ground bounce and turned brown next to
      // the sky-lit back of the hand: keep most of the light's brightness, little of its tint.
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `outgoingLight = mix(vec3(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722))), outgoingLight, 0.35);
        #include <opaque_fragment>`,
      );
    };
    material.customProgramCacheKey = () => `glove-detail-v5-${knee}`;
  }
  return material;
}

/**
 * M4A1 finish under the arena's sky light: anodised aluminium and phosphate steel read as dark
 * satin, not chrome. The source maps are kept; only the scalar factors are adjusted.
 */
function toneM4Materials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.SkinnedMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      // M4Finish and CarryHandleFinish get their anodized finish in rifle-materials.
      if (material.name === "SuppressorFinish") {
        material.envMapIntensity = 0.5;
      } else if (material.name === "PVPAccent") {
        material.envMapIntensity = 0.7;
      }
    }
  });
}
