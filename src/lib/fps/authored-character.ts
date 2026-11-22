import * as THREE from "three";
import { bindDeathClip, deathClipMs, loadDeathClip } from "./death-clip";
import { bindSwimStroke, swimBob } from "./swim-stroke";
import { bindLadderClip, ladderClipReady, loadLadderClip } from "./ladder-clip";
import {
  bindRappelClip,
  loadRappelClip,
  rappelClipReady,
  type RappelClipName,
  type RappelContacts,
} from "./rappel-clip";
import { ropeClimbPose, ropeClimbPoseBuffer, type RopeRig } from "./rope-climb";
import { Gait, loadLocomotion } from "./locomotion";
import type { Seat, Weapon } from "./protocol";
import type { WeaponKit } from "./weapon";
import { createCharacter as createFallback } from "./character-rig";
import { retainAuthoredAsset, cloneAuthoredModel } from "./authored-assets";
import {
  AK_VIEWMODEL,
  AWP_POLICE_VIEWMODEL,
  HUNTING_POLICE_VIEWMODEL,
  createAuthoredViewmodel,
  DEAGLE_POLICE_VIEWMODEL,
  M4_VIEWMODEL,
  MP5_POLICE_VIEWMODEL,
  SPAS12_POLICE_VIEWMODEL,
} from "./authored-viewmodel";
import { EYE_HEIGHT, CROUCH_EYE_HEIGHT } from "./map";
import { createMuzzleFlash } from "./muzzle-flash";
import { ARENA_MODELS, CHARACTER_MODELS, WORLD_RIFLES } from "./model-assets";
import { KARAMBIT_SCALE } from "./karambit-viewmodel";
import { quietWhileHidden } from "./quiet-hidden";
import type { KnifeAttack } from "./protocol";
import { GRENADE_TYPES, type GrenadeType, type ThrowKind } from "./grenades/rules";

/** A gun that can be worn on the back (the Desert Eagle stays in the thigh holster). */
export type CarryGun = "ak47" | "m4" | "awp" | "hunting" | "mp5" | "spas12";
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
  primary?:
    "rifle" | "awp" | "hunting" | "ak47" | "m4" | "mp5" | "deagle" | "spas12" | "none" | undefined;
  /**
   * The main guns carried but not in hand, worn on the back (battle royale): [right of the
   * backpack, left of it]. A gun that goes from here into the hands (or back) is carried there
   * by the right hand; `pack` (its level) sets them beside a backpack.
   */
  back?: readonly [CarryGun | null, CarryGun | null] | undefined;
  /** The backpack and the vest worn (level 1–3, 0 none). */
  pack?: number | undefined;
  vest?: number | undefined;
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
   * On the BR zip-line (zipline.ts): both hands on the pulley's handle `handleY` above the feet
   * (reaching up to it while `reach` < 1), arms up, legs hanging with a slight swing; `tuck`
   * draws the knees up (the pull-up over the tower's rail, and ready for the landing). The rifle
   * stays slung (hands empty). The caller places and leans the body under the handle.
   */
  zip?:
    | {
        /** The handle in character space (feet at the origin, facing −z). */
        handle: [number, number, number];
        reach: number;
        tuck: number;
      }
    | undefined;
  /**
   * Driving (BR vehicles): sat in the seat, no weapon. Character space (feet at the origin,
   * facing −z): the hips come down by `drop`, the upper body leans forward by `lean` (radians),
   * the feet go to `foot` (the right one; the left mirrored) and the hands to the wheel or the
   * handlebar grips. The caller places the character at the seat.
   */
  /**
   * Swimming (BR): the stroke (swim-stroke.ts) drives the whole body, the root on the water's
   * surface: a head-up front crawl when moving, an upright tread when still, eased between
   * the two (and from one to the other as the water gets shallow: `depth`, m, where known).
   * `view`: posed for the swimmer's own eyes (first person) and the head not drawn.
   * Pass `primary: "none"` with it: the hands are empty.
   */
  swim?: boolean | { view?: boolean; depth?: number } | undefined;
  /**
   * On a ladder (BR ladders.ts): the climbing cycle (ladder-clip.ts) drives the whole body,
   * `cycles` into the climb (the height climbed over the climb per cycle). The caller puts the
   * root at the feet, `standOff` m out from the rungs, its +z toward them. Pass `primary: "none"`.
   */
  ladder?: { cycles: number; standOff: number } | undefined;
  /**
   * On a climbing rope (BR rope.ts): the climb (rope-climb.ts) poses the whole body, `cycles`
   * into it (the distance climbed over ROPE_CLIMB.cycle). The caller puts the root on the rope's
   * line (the climber's point), its +y up the rope and its −z into the rock; `wall` is how far
   * in front of the rope's line the rock is there (m). Pass `primary: "none"`.
   */
  rope?: { cycles: number; wall: number } | undefined;
  /**
   * Rappelling down a wall (BR rappel.ts): the clips (rappel-clip.ts) drive the whole body,
   * `ms` into `clip`, blended `mix` of the way to `ms2` into `clip2`. The caller puts the root at
   * the body's point, upright, its −z into the wall; `wall` is how far in front of it the wall's
   * face is (m) and `lip` where the rope comes over the roof's edge (character space). A boot
   * the clip has on the wall is held on that face, the guide hand on the rope's line from the
   * edge to the harness; where the rope then runs is `rappelRope`. Pass `primary: "none"`.
   */
  rappel?:
    | {
        clip: RappelClipName;
        ms: number;
        clip2: RappelClipName | null;
        ms2: number;
        mix: number;
        wall: number;
        lip: [number, number, number];
      }
    | undefined;
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
/**
 * How far the SPAS-12's stock end sits behind the shoulder pocket (m; see seatGun). Its folding
 * stock is long: at 0.15 its end went 10 cm into the body (behind the shoulder joint's depth)
 * and from outside the gun seemed to end at the hand (owner, 2026-11-17: the stock should sit
 * in the shoulder like the AK's/M4's); a few cm keeps the pistol grip in reach.
 */
const TP_SPAS12_TUCK = 0.05;
/**
 * The hands (with the gloves and fingers) drawn a little smaller than the model's own (owner,
 * 2026-11-17: the hand on the handguard read too big next to the gun). Grip offsets are scaled
 * with them.
 */
const HAND_SCALE = 0.86;
/**
 * The Karambit as its holder sees it in first person (owner, 2026-11-17: "when a player stands
 * close to another it should look like the POV"; README of art/blender/karambit): the right
 * hand a reverse-grip hammer fist, upright, the index finger through the ring and the blade
 * curving up out of the little-finger edge; the left hand up, open and relaxed. Root space at
 * standing height (m): each wrist, the right fist's wrist-to-knuckles direction and the way the
 * back of it faces, the left hand's fingers and back.
 */
const KNIFE_HOLD = {
  // At the lower chest, so each elbow hangs below its wrist and the forearm rises to the hand
  // in line with it (lower, the elbow rose behind and the wrist bent up square).
  wristR: [0.16, 1.21, -0.3],
  fistUp: [-0.12, 0.6, -0.8],
  fistBack: [0.25, 0.5, 1],
  wristL: [-0.17, 1.2, -0.3],
  fingersL: [0.3, 0.6, -0.75],
  backL: [-1, 0.2, 0.4],
  /** The ring's centre from the wrist: along the hand, toward the thumb, into the palm (m). */
  ring: [0.072, 0.012, 0.028],
} as const;
/** The swings, timed as the first-person clips (karambit_slash 0.4 s, karambit_stab 0.72 s). */
const KNIFE_SWING_MS = { slash: 400, stab: 720 } as const;
/**
 * Their keys (t 0…1): right wrist offset (m), the fist's tilt forward and turn left (rad), and
 * the left wrist's offset. Slash: a backhand sweep from up and right across and down to the
 * left, the left hand opening out to balance it. Stab: cocked back and up, then driven forward
 * with the blade turned to lead, the left hand bracing at the chest.
 */
const KNIFE_SWING_KEYS: Record<
  "slash" | "stab",
  Array<{
    t: number;
    r: [number, number, number];
    tilt: number;
    turn: number;
    l: [number, number, number];
  }>
> = {
  slash: [
    { t: 0, r: [0, 0, 0], tilt: 0, turn: 0, l: [0, 0, 0] },
    { t: 0.25, r: [0.07, 0.09, 0.05], tilt: -0.3, turn: -0.25, l: [0, 0.02, 0.02] },
    { t: 0.55, r: [-0.26, -0.1, -0.2], tilt: 0.9, turn: 0.7, l: [-0.08, 0.04, 0.1] },
    { t: 1, r: [0, 0, 0], tilt: 0, turn: 0, l: [0, 0, 0] },
  ],
  stab: [
    { t: 0, r: [0, 0, 0], tilt: 0, turn: 0, l: [0, 0, 0] },
    { t: 0.3, r: [0.02, 0.06, 0.1], tilt: -0.4, turn: 0, l: [0.05, 0.06, 0.05] },
    { t: 0.5, r: [-0.06, 0.08, -0.42], tilt: 1.3, turn: 0.15, l: [0.07, 0.09, 0.08] },
    { t: 0.7, r: [-0.05, 0.07, -0.38], tilt: 1.2, turn: 0.15, l: [0.07, 0.09, 0.08] },
    { t: 1, r: [0, 0, 0], tilt: 0, turn: 0, l: [0, 0, 0] },
  ],
};
/**
 * Guns worn on the back (root space at rest, relative to the chest bone): the centre of each
 * gun beside the spine, behind the vest, muzzle up and a little out over the shoulder, its side
 * flat to the back and the magazine outward. With a backpack they sit out beside it.
 */
const BACK_MOUNT = {
  /** Off the spine, and up from the chest bone (m, rest root space): the two apart, their
   * stocks clear of each other over the spine. */
  x: 0.15,
  y: 0.06,
  /** Muzzle lean out from straight up (rad). */
  lean: 0.16,
  /**
   * Surfaces the guns lie on (owner, 2026-11-17: each gun flush on the back or the bag, none of
   * it in the body), past the character's own back (measured on its mesh at load), by level:
   * a vest's rear face, and a pack's half width and depth. Measured on the fitted gear.glb
   * vests and packs (character-gear.ts) on both operators; the larger of the two.
   */
  vestBack: [0, 0.036, 0.024, 0.013],
  packHalf: [0, 0.163, 0.174, 0.177],
  packDepth: [0, 0.134, 0.154, 0.164],
  /** With a pack: each gun turned a quarter on its bore, its narrow side to the pack's side. */
  leanPack: 0.02,
  /** Left between a gun and what it lies on (m), and how far a handle may press into a bag. */
  gap: 0.006,
  press: 0.03,
  /** The SPAS-12 in closer on a pack (owner, 2026-11-17: "slightly tighter"): its folding
   * stock's frame and the pump are wider than its body, which held it off the bag. */
  shotgunPack: 0.015,
};
/** Hands to back, and back to hands (ms): the outgoing gun goes first, then the other comes. */
const HOLSTER_MS = 300,
  DRAW_MS = 300;
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
  twistQ = new THREE.Quaternion(),
  gaitEuler = new THREE.Euler(),
  /** Half the server body box's width (0.7 m) less a margin: the gait keeps the feet inside. */
  FOOT_BOX = 0.34,
  /** The character's left–right axis in root space (toe roll turns about it). */
  sideAxis = new THREE.Vector3(1, 0, 0);

/**
 * Up to ~2400 points of a gun's meshes about `centre`, in the gun's own axes at its scale in the
 * hands (to lay it against the back or a pack by its real outline, not its bounding box).
 */
function gunPoints(gun: THREE.Object3D, toGun: THREE.Matrix4, centre: THREE.Vector3) {
  const meshes: THREE.Mesh[] = [];
  let total = 0;
  gun.traverse((o) => {
    if (o instanceof THREE.Mesh && o.geometry.attributes["position"]) {
      meshes.push(o);
      total += o.geometry.attributes["position"].count;
    }
  });
  const step = Math.max(1, Math.ceil(total / 2400)),
    out: number[] = [],
    m = new THREE.Matrix4(),
    v = new THREE.Vector3();
  for (const mesh of meshes) {
    const pos = mesh.geometry.attributes["position"] as THREE.BufferAttribute;
    m.multiplyMatrices(toGun, mesh.matrixWorld);
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m).sub(centre).multiply(gun.scale);
      out.push(v.x, v.y, v.z);
    }
  }
  return new Float32Array(out);
}

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
     * Battle royale: the officer without his own helmet, goggles and vest (worn gear is loot
     * there, drawn by br/character-gear.ts when worn). 1v1 and 5v5 keep them.
     */
    bareHead?: boolean;
    /**
     * Battle royale (sixteen operators posed a frame): the guns and grenades not in hand are
     * left out of the matrix refreshes while they are hidden (quiet-hidden.ts).
     */
    quietHidden?: boolean;
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
  // The Hunting Rifle (battle royale loot, 1v1 / 5v5 buy menu): built on the AWP's rig and
  // hold, its own world model.
  const hunting: ReturnType<typeof createAuthoredViewmodel> | null = createAuthoredViewmodel(
    weaponPivot,
    false,
    { ...HUNTING_POLICE_VIEWMODEL, asset: WORLD_RIFLES.hunting },
  );
  if (hunting) hunting.root.visible = false;
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
  // The SPAS-12 (shouldered like the rifles): battle royale loot and the 1v1 / 5v5 buy menu.
  const shotgun: ReturnType<typeof createAuthoredViewmodel> | null = createAuthoredViewmodel(
    weaponPivot,
    false,
    { ...SPAS12_POLICE_VIEWMODEL, asset: WORLD_RIFLES.spas12 },
  );
  if (shotgun) shotgun.root.visible = false;
  /**
   * Third person: the butt in the right shoulder pocket, the bore at shoulder height, the gun at
   * TP_GUN.scale (owner screenshot, 2026-11-03: with the grip at the chest pivot the rifles sank
   * into the vest and read too long beside the body). Offsets in weaponPivot space at zero pitch.
   */
  const seatGun = (view: typeof weapon, tuck = 0) => {
    view.root.scale.multiplyScalar(TP_GUN.scale);
    view.root.position.set(0, 0, 0);
    const pitch = weaponPivot.rotation.x;
    weaponPivot.rotation.x = 0;
    weaponPivot.updateWorldMatrix(true, true);
    // (A gun not in hand is hidden, and may be left out of the pivot's refresh: quietHidden.)
    view.root.updateWorldMatrix(true, true);
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
      view.root.position.set(TP_GUN.x - bore.x, TP_GUN.y - bore.y, TP_GUN.butt - box.max.z + tuck);
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
    view.root.updateWorldMatrix(true, true);
    const bore = view.muzzle().clone();
    view.root.position.set(TP_PISTOL.x - bore.x, TP_PISTOL.y - bore.y, TP_PISTOL.muzzle - bore.z);
    weaponPivot.rotation.x = pitch;
    weaponPivot.updateWorldMatrix(false, true);
  };
  const ownRifle = variant.id === "m4" ? "m4" : "ak47";
  /** The gun drawn this frame (attachments mount on it). */
  let heldGun: {
    id: "ak47" | "m4" | "awp" | "hunting" | "mp5" | "deagle" | "spas12";
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
      // Knife space: ring at the origin (the pivot), handle down -y, blade curving toward +z;
      // the group is turned into the fist each frame (KNIFE_HOLD).
      const holder = new THREE.Group();
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
  if (options.quietHidden)
    for (const hidden of [
      ...[weapon, awp, hunting, alt, smg, pistol, shotgun].flatMap((v) => (v ? [v.root] : [])),
      knife,
      nade,
    ])
      quietWhileHidden(hidden);
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
  const gripPoses: Array<{
    bone: THREE.Bone;
    q: THREE.Quaternion;
    /** At rest (straight), and closed right round a rope (a tighter fist than a gun's grip). */
    open: THREE.Quaternion;
    fist: THREE.Quaternion;
    left: boolean;
  }> = [];
  /** Each hand's knuckle basis (hand space), inverted: a grip is given as the knuckles' frame. */
  const knuckles = { Left: new THREE.Quaternion(), Right: new THREE.Quaternion() };
  /** That basis' axes (hand space): x along the hand (the left's fingers' way, the right's
   * against them), y out of the back of the hand, z along the knuckles to the thumb's side. */
  const knuckleAxes: Partial<Record<"Left" | "Right", [THREE.Vector3, THREE.Vector3]>> = {};
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
    gaitPhase = 0,
    speed = 0,
    flashUntil = 0,
    travelX = 0,
    travelZ = -1,
    baseX = 0,
    baseZ = 0,
    // The upper body's follow-through (see "Upper body with the stride"), eased each frame.
    leanForward = 0,
    bank = 0,
    sprintBlend = 0,
    yawRate = 0,
    lastYaw = 0,
    lead = 0,
    run = 0;
  /** Mixamo rifle gait (locomotion.ts) once both the rig and the clips are in. */
  let gait: Gait | null = null;
  /** Ankle-to-toe in root space at rest, per foot: the toe roll may not push a toe underground. */
  const toeReach = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };
  void loadLocomotion();
  void loadDeathClip();
  /** The death animation bound to this rig (death-clip.ts), made at the first death. */
  let deathRig: ReturnType<typeof bindDeathClip> = null;
  /** The swim stroke bound to this rig (swim-stroke.ts) at the first swim. */
  let swimRig: ReturnType<typeof bindSwimStroke> = null;
  /** Its cycles so far, how far into the crawl (0 treading), the lean into a turn. */
  const splashAt = new THREE.Vector3();
  let swimCycle = 0,
    swimCrawl = 0,
    swimTurn = 0,
    swimYaw = 0,
    swimWas = false,
    armsOnly = false;
  /**
   * First person in the water: the arms alone, cut from the body's own skin (the triangles
   * whose corners all hang mostly on an arm's bones, shoulder joint to fingertips), on the same
   * skeleton. Made at the first such swim; everything else of the character is hidden meanwhile
   * (`viewHidden`: what was, to show again).
   */
  let viewArms: THREE.SkinnedMesh[] | null = null;
  const viewHidden = new Set<THREE.Object3D>();
  function cutViewArms() {
    const arm = new Set<THREE.Object3D>();
    for (const side of ["Left", "Right"]) bones.get(side + "Arm")?.traverse((o) => arm.add(o));
    const skins: THREE.SkinnedMesh[] = [];
    instance?.root.traverse((o) => {
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) skins.push(o as THREE.SkinnedMesh);
    });
    const arms: THREE.SkinnedMesh[] = [];
    for (const skin of skins) {
      const g = skin.geometry;
      const index = g.index,
        joints = g.getAttribute("skinIndex"),
        weights = g.getAttribute("skinWeight");
      if (!index || !joints || !weights || Array.isArray(skin.material)) continue;
      const onArm = new Uint8Array(joints.count);
      for (let v = 0; v < joints.count; v++) {
        let best = 0;
        for (let k = 1; k < 4; k++)
          if (weights.getComponent(v, k) > weights.getComponent(v, best)) best = k;
        onArm[v] = arm.has(skin.skeleton.bones[joints.getComponent(v, best)]!) ? 1 : 0;
      }
      const kept: number[] = [];
      for (let i = 0; i + 2 < index.count; i += 3) {
        const a = index.getX(i),
          b = index.getX(i + 1),
          c = index.getX(i + 2);
        if (onArm[a] && onArm[b] && onArm[c]) kept.push(a, b, c);
      }
      if (!kept.length) continue;
      const cut = new THREE.BufferGeometry();
      for (const name in g.attributes) cut.setAttribute(name, g.getAttribute(name));
      cut.setIndex(kept);
      const mesh = new THREE.SkinnedMesh(cut, skin.material);
      mesh.name = "swim-view-arms";
      mesh.bind(skin.skeleton, skin.bindMatrix);
      mesh.position.copy(skin.position);
      mesh.quaternion.copy(skin.quaternion);
      mesh.scale.copy(skin.scale);
      // Beside the camera, posed every frame: never culled by a rest-pose bound.
      mesh.frustumCulled = false;
      mesh.visible = false;
      skin.parent!.add(mesh);
      arms.push(mesh);
    }
    return arms;
  }
  /** The climb bound to this rig (ladder-clip.ts) on the first ladder. */
  let ladderRig: ReturnType<typeof bindLadderClip> = null;
  /** The rappel bound to this rig (rappel-clip.ts) on the first rope down a wall, what its
   * frame says of the boots and hands, and where the rope runs through this body (world). */
  let rappelRig: ReturnType<typeof bindRappelClip> = null;
  const rappelContacts: RappelContacts = { plantL: 0, plantR: 0, gripL: 0, gripR: 0 };
  const rappelRope = {
    /** False until a rappel has been posed. */
    set: false,
    /** The guide hand's grip, the harness's device and the brake hand's grip (world). */
    guide: new THREE.Vector3(),
    device: new THREE.Vector3(),
    brake: new THREE.Vector3(),
    /** How firmly each hand has the rope (0..1). */
    gripL: 0,
    gripR: 0,
  };
  /** The rig's measures for the rope climb (rope-climb.ts), the pose worked out last, and held
   * still on the rope: the last phase, how long it has not changed (ms) and the settled pose's
   * weight. */
  let ropeRig: (RopeRig & { hips: number }) | null = null;
  const ropePose = ropeClimbPoseBuffer();
  let ropeLast = NaN,
    ropeStill = 0,
    ropeSettle = 0;
  // Follows the rendered head centre each frame; tests compare it with the head hitbox.
  const headCenterMarker = new THREE.Group();
  headCenterMarker.name = "head-center";
  root.add(headCenterMarker);
  const ready = Promise.all([
    asset.ready,
    weapon.ready,
    awp.ready,
    hunting?.ready,
    alt?.ready,
    smg?.ready,
    pistol?.ready,
    shotgun?.ready,
  ])
    .then(([gltf]) => {
      if (stopped) return;
      instance = cloneAuthoredModel(gltf.scene);
      if (options.bareHead && police) {
        stripHeadgear(instance.root);
        stripVest(instance.root);
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
      baseX = body.position.x;
      baseZ = body.position.z;
      root.add(body);
      body.updateMatrixWorld(true);
      for (const side of sides) {
        const foot = bones.get(side + "Foot"),
          toe = bones.get(side + "ToeBase");
        if (foot && toe)
          toeReach[side]
            .copy(root.worldToLocal(toe.getWorldPosition(new THREE.Vector3())))
            .sub(root.worldToLocal(foot.getWorldPosition(new THREE.Vector3())));
      }
      // The gait's unit: the rest hip height in root space.
      const restY = (name: string) =>
        root.worldToLocal(bones.get(name)!.getWorldPosition(new THREE.Vector3())).y;
      gait = new Gait(restY("Hips"), (restY("LeftFoot") + restY("RightFoot")) / 2);
      {
        // The rope climb's measures (rope-climb.ts): limb lengths and joints at rest.
        const at = (name: string) =>
          root.worldToLocal(bones.get(name)!.getWorldPosition(new THREE.Vector3()));
        const hipsAt = at("Hips"),
          arm = at("RightArm"),
          hipJoint = at("RightUpLeg");
        ropeRig = {
          hips: hipsAt.y,
          arm: arm.distanceTo(at("RightForeArm")) + at("RightForeArm").distanceTo(at("RightHand")),
          leg: hipJoint.distanceTo(at("RightLeg")) + at("RightLeg").distanceTo(at("RightFoot")),
          ankle: at("RightFoot").y,
          shoulder: [Math.abs(arm.x - hipsAt.x), arm.y - hipsAt.y, arm.z - hipsAt.z],
          hipJoint: [Math.abs(hipJoint.x - hipsAt.x), hipJoint.y - hipsAt.y, hipJoint.z - hipsAt.z],
        };
      }
      for (const view of [weapon, awp, hunting, alt, smg]) if (view) seatGun(view);
      // The SPAS-12's long folding stock: its end (the hook) tucked back under the arm, or the
      // pistol grip sits a forearm further out than any rifle's and both arms are held straight.
      if (shotgun) seatGun(shotgun, TP_SPAS12_TUCK);
      if (pistol) seatPistol(pistol);
      // What the back mounts need: each long gun's seat in the hands and its centre, and the
      // chest at rest (the mounts are given against it and follow it).
      for (const view of [weapon, awp, hunting, alt, smg, shotgun]) {
        if (!view) continue;
        view.root.updateWorldMatrix(true, true);
        const toGun = view.root.matrixWorld.clone().invert(),
          box = new THREE.Box3(),
          part = new THREE.Box3(),
          m = new THREE.Matrix4();
        view.root.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
          box.union(
            part
              .copy(o.geometry.boundingBox!)
              .applyMatrix4(m.multiplyMatrices(toGun, o.matrixWorld)),
          );
        });
        if (box.isEmpty()) continue;
        docks.set(view, {
          state: "absent",
          k: 1,
          side: 0,
          seatP: view.root.position.clone(),
          seatQ: view.root.quaternion.clone(),
          seatS: view.root.scale.clone(),
          seatQInverse: view.root.quaternion.clone().invert(),
          centre: box.getCenter(new THREE.Vector3()),
          points: gunPoints(view.root, toGun, box.getCenter(new THREE.Vector3())),
          reach: new Map(),
        });
      }
      {
        const chest = bones.get("Spine2");
        if (chest) {
          root.updateWorldMatrix(true, true);
          root.worldToLocal(chestRestP.setFromMatrixPosition(chest.matrixWorld));
          rotation(root, worldQ).invert();
          chestRestQInverse.copy(worldQ.multiply(rotation(chest, parentQ))).invert();
          // This operator's own back at the mounts: the rearmost skin beside the spine at
          // chest height (the gear's surfaces are given past it).
          const v = new THREE.Vector3();
          let back = 0.12;
          instance?.root.traverse((o) => {
            const m = o as THREE.SkinnedMesh;
            if (!m.isSkinnedMesh) return;
            m.skeleton.update();
            const pos = m.geometry.attributes["position"] as THREE.BufferAttribute;
            for (let i = 0; i < pos.count; i += 2) {
              m.getVertexPosition(i, v);
              root.worldToLocal(v.applyMatrix4(m.matrixWorld)).sub(chestRestP);
              if (Math.abs(Math.abs(v.x) - BACK_MOUNT.x) < 0.06 && Math.abs(v.y) < 0.18)
                back = Math.max(back, v.z);
            }
          });
          backSurface = back;
          root.userData["backSurface"] = back;
        }
      }
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
          knuckleAxes[side] = [x.clone(), z.clone()];
          wristRotations[side].multiply(basis.invert());
          knuckles[side].copy(basis);
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
            const q = bone.quaternion.clone().multiply(fingerCurl);
            // A fist: each finger folds about the knuckles' line into the palm, the thumb
            // about the hand's own line across them (worked out from the rig's knuckles: the
            // two rigs' finger bones have different axes, and a right hand folds the other
            // way round the same axis as a left).
            const axes = knuckleAxes[side];
            if (axes) {
              const inHand = finger === "Thumb" ? axes[0] : axes[1];
              const local = inHand
                .clone()
                .applyQuaternion(bones.get(side + "Hand")!.getWorldQuaternion(worldQ))
                .applyQuaternion(bone.getWorldQuaternion(worldQ).invert());
              fingerCurl.setFromAxisAngle(
                local,
                finger === "Thumb"
                  ? [0.5, 0.35, 0.2][joint - 1]!
                  : (side === "Left" ? -1 : 1) * [1.15, 1.4, 0.9][joint - 1]!,
              );
            }
            gripPoses.push({
              bone,
              q,
              open: bone.quaternion.clone(),
              fist: bone.quaternion.clone().multiply(fingerCurl),
              left: side === "Left",
            });
          }
        }
      for (const side of sides) bones.get(side + "Hand")?.scale.setScalar(HAND_SCALE);
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
  /** Turn a bone by `angle` about a world axis (in its parent's space), and refresh below it. */
  const turnBone = (bone: THREE.Bone | undefined, axis: THREE.Vector3, angle: number) => {
    if (!bone || Math.abs(angle) < 1e-5) return;
    rotation(bone.parent!, parentQ);
    twistQ.setFromAxisAngle(axis, angle);
    bone.quaternion.premultiply(parentQ.clone().invert().multiply(twistQ).multiply(parentQ));
    bone.updateWorldMatrix(false, true);
  };
  const leanAxis = new THREE.Vector3(),
    bankAxis = new THREE.Vector3();
  // Guns on the back (BACK_MOUNT): each gun's seat in the hands, its centre (its own space) and
  // where it is between the hands (k 0) and its mount on the back (k 1).
  type Dock = {
    state: "absent" | "hand" | "back";
    k: number;
    side: 0 | 1;
    seatP: THREE.Vector3;
    seatQ: THREE.Quaternion;
    seatS: THREE.Vector3;
    seatQInverse: THREE.Quaternion;
    centre: THREE.Vector3;
    /** Points of the gun's surface about its centre (its own axes, at its hands' scale), and
     * how far it reaches toward each surface it is mounted against (by mount). */
    points: Float32Array;
    reach: Map<string, number>;
  };
  const docks = new Map<object, Dock>();
  /**
   * The worn pack's sides, read from its own mesh when it changes (owner, 2026-11-17: the guns
   * against the bag with no gap and not into it): per side, a grid over height × depth behind
   * the chest (rest root space, PACK_CELL cells) of how far out the pack reaches.
   */
  const PACK_CELL = 0.02,
    PACK_Y0 = -0.8,
    PACK_NY = 70,
    PACK_Z0 = -0.1,
    PACK_NZ = 35;
  let packProfile: { key: string; sides: [Float32Array, Float32Array]; found: boolean } | null =
    null;
  const readPack = () => {
    // The visible worn gear (character-gear.ts binds it to the bones as "worn-gear" groups).
    const held: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.name !== "worn-gear") return;
      for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (!p.visible) return;
      held.push(o);
    });
    const key = held.map((o) => o.uuid).join();
    if (packProfile?.key === key) return packProfile;
    const sides: [Float32Array, Float32Array] = [
      new Float32Array(PACK_NY * PACK_NZ).fill(-1),
      new Float32Array(PACK_NY * PACK_NZ).fill(-1),
    ];
    const toRest = new THREE.Quaternion().copy(dockDelta).invert(),
      v = new THREE.Vector3(),
      m = new THREE.Matrix4(),
      toRoot = root.matrixWorld.clone().invert();
    const each = (o: THREE.Object3D, fn: (x: number, y: number, z: number) => void) =>
      o.traverse((c) => {
        const mesh = c as THREE.Mesh;
        const pos = mesh.isMesh ? mesh.geometry.attributes["position"] : undefined;
        if (!pos) return;
        m.multiplyMatrices(toRoot, mesh.matrixWorld);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m).sub(dockChestP).applyQuaternion(toRest);
          fn(v.x, v.y, v.z);
        }
      });
    // The pack is the piece reaching furthest back (a vest hugs the back, a helmet is above).
    let pack: THREE.Object3D | null = null,
      far = backSurface + 0.08;
    for (const o of held) {
      let z = -Infinity;
      each(o, (_x, _y, vz) => (z = Math.max(z, vz)));
      if (z > far) {
        far = z;
        pack = o;
      }
    }
    if (pack)
      each(pack, (x, y, z) => {
        const iy = Math.floor((y - PACK_Y0) / PACK_CELL),
          iz = Math.floor((z - PACK_Z0) / PACK_CELL);
        if (iy < 0 || iy >= PACK_NY || iz < 0 || iz >= PACK_NZ) return;
        const side = sides[x >= 0 ? 0 : 1],
          i = iy * PACK_NZ + iz;
        side[i] = Math.max(side[i]!, Math.abs(x));
      });
    return (packProfile = { key, sides, found: pack !== null });
  };
  /** The operator's own back behind the chest bone at rest (m; measured at load). */
  let backSurface = 0.17;
  const chestRestP = new THREE.Vector3(),
    chestRestQInverse = new THREE.Quaternion(),
    dockM = new THREE.Matrix4(),
    dockHandP = new THREE.Vector3(),
    dockHandQ = new THREE.Quaternion(),
    dockBackP = new THREE.Vector3(),
    dockBackQ = new THREE.Quaternion(),
    dockChestP = new THREE.Vector3(),
    dockDelta = new THREE.Quaternion(),
    dockScale = new THREE.Vector3(),
    dockAxisX = new THREE.Vector3(),
    dockAxisY = new THREE.Vector3(),
    dockAxisZ = new THREE.Vector3();
  // The Karambit hold (root space), rebuilt each frame it is in hand.
  const knifeWristR = new THREE.Vector3(),
    knifeWristL = new THREE.Vector3(),
    knifeUp = new THREE.Vector3(),
    knifeBack = new THREE.Vector3(),
    knifeFingers = new THREE.Vector3(),
    knifeBackL = new THREE.Vector3(),
    knifeX = new THREE.Vector3(),
    knifeY = new THREE.Vector3(),
    knifeZ = new THREE.Vector3(),
    knifeTurn = new THREE.Quaternion(),
    knifeM = new THREE.Matrix4();
  /** The view drawn for a carried gun id (the two rifles share the operator's and the other). */
  const viewFor = (id: CarryGun) =>
    id === "awp"
      ? awp
      : id === "hunting"
        ? hunting
        : id === "mp5"
          ? smg
          : id === "spas12"
            ? shotgun
            : id === ownRifle || !alt
              ? weapon
              : alt;
  /** Put a gun back in the hands' seat (in weaponPivot). */
  const seatInHands = (v: typeof weapon, d: Dock) => {
    if (v.root.parent === weaponPivot) return;
    weaponPivot.add(v.root);
    v.root.position.copy(d.seatP);
    v.root.quaternion.copy(d.seatQ);
    v.root.scale.copy(d.seatS);
  };
  /**
   * Guns on the back and the trip between the back and the hands (BACK_MOUNT): the gun put
   * away goes to its mount first, then the one drawn comes from its mount to the hands, the
   * right hand carrying each (its grip markers move with it). Picked up or dropped, a gun just
   * appears where it belongs. Returns the gun the right hand is carrying, if one is under way.
   * Without `motion.back` (1v1, 5v5) every gun stays in the hands as before.
   */
  const placeCarried = (motion: Motion, inHand: typeof weapon | null, dt: number) => {
    if (!docks.size) return null;
    if (!motion.back) {
      for (const [view, d] of docks) {
        if (d.state !== "absent") seatInHands(view as typeof weapon, d);
        d.state = "absent";
        d.k = 1;
      }
      return null;
    }
    const first = motion.back[0] ? viewFor(motion.back[0]) : null;
    let second = motion.back[1] ? viewFor(motion.back[1]) : null;
    // Two of the same gun: one model of each per operator, so the second is not worn.
    if (second === first) second = null;
    let reaching: typeof weapon | null = null;
    for (const [view, d] of docks) {
      const v = view as typeof weapon;
      if (v === inHand) continue;
      const side = v === first ? 0 : v === second ? 1 : -1;
      if (side < 0) {
        if (d.state !== "absent") seatInHands(v, d);
        d.state = "absent";
        d.k = 1;
        continue;
      }
      // Fresh on the back (picked up, or first seen): already there. From the hands: the trip.
      if (d.state === "absent") d.k = 1;
      d.state = "back";
      d.side = side as 0 | 1;
      if (d.k < 1) {
        d.k = Math.min(1, d.k + dt / HOLSTER_MS);
        reaching = v;
      }
    }
    const drawn = inHand ? docks.get(inHand) : undefined;
    if (inHand && drawn) {
      if (drawn.state === "absent") drawn.k = 0;
      else if (!reaching) drawn.k = Math.max(0, drawn.k - dt / DRAW_MS);
      drawn.state = "hand";
      if (drawn.k > 0) reaching ??= inHand;
    }
    const chest = bones.get("Spine2");
    if (!chest) return null;
    // How the chest has turned and moved since rest (the lean, the stride, the stance).
    root.worldToLocal(dockChestP.setFromMatrixPosition(chest.matrixWorld));
    rotation(root, worldQ).invert();
    dockDelta.copy(worldQ.multiply(rotation(chest, parentQ))).multiply(chestRestQInverse);
    weaponPivot.updateMatrix();
    for (const [view, d] of docks) {
      const v = view as typeof weapon;
      if (d.state === "absent") continue;
      if (d.state === "hand" && d.k <= 0) {
        seatInHands(v, d);
        continue;
      }
      if (v !== inHand) v.update(true, 0, 0);
      // On the back: muzzle up and leaning out, the side flat to the back, magazine outward.
      const sign = d.side === 0 ? 1 : -1,
        level = Math.max(0, Math.min(3, Math.round(motion.pack ?? 0))),
        vest = Math.max(0, Math.min(3, Math.round(motion.vest ?? 0))),
        lean = level ? BACK_MOUNT.leanPack : BACK_MOUNT.lean;
      dockAxisZ.set(-sign * Math.sin(lean), -Math.cos(lean), 0);
      // The gun's top: toward the spine flat on the back, or back beside a pack.
      if (level) dockAxisY.set(0, 0, 1);
      else dockAxisY.set(-sign, 0, 0);
      dockAxisY.addScaledVector(dockAxisZ, -dockAxisY.dot(dockAxisZ)).normalize();
      dockAxisX.crossVectors(dockAxisY, dockAxisZ);
      // How far the gun reaches from its centre along a direction (rest root space): its
      // furthest point that way, worked out once per mount.
      const reach = (x: number, y: number, z: number) => {
        const key = `${d.side}${level}${x}${y}${z}`;
        let r = d.reach.get(key);
        if (r === undefined) {
          const ax = dockAxisX.x * x + dockAxisX.y * y + dockAxisX.z * z,
            ay = dockAxisY.x * x + dockAxisY.y * y + dockAxisY.z * z,
            az = dockAxisZ.x * x + dockAxisZ.y * y + dockAxisZ.z * z,
            p = d.points;
          r = 0;
          for (let i = 0; i < p.length; i += 3)
            r = Math.max(r, p[i]! * ax + p[i + 1]! * ay + p[i + 2]! * az);
          d.reach.set(key, r);
        }
        return r;
      };
      // Its inner face just off the back (or the vest), or off the pack's side panel.
      const surface = backSurface + BACK_MOUNT.vestBack[vest]!,
        offBack = surface + reach(0, 0, -1) + BACK_MOUNT.gap;
      const z = level ? Math.max(offBack, backSurface + BACK_MOUNT.packDepth[level]! / 2) : offBack;
      let x = level
        ? BACK_MOUNT.packHalf[level]! + reach(-sign, 0, 0) + BACK_MOUNT.gap
        : BACK_MOUNT.x;
      if (level) {
        // Against the pack's side as it is where the gun lies: each of its points clear of
        // the side there by the gap, the nearest one touching (no gap, nothing in the bag).
        const pack = readPack();
        if (pack.found) {
          const key = `${pack.key}|${d.side}${level}${z.toFixed(3)}`;
          let fit = d.reach.get(key);
          if (fit === undefined) {
            const grid = pack.sides[d.side],
              p = d.points;
            // The gun's side toward the pack: the 80th percentile of how far its points reach
            // that way. Handles and knobs past it may press into the bag's soft side (up to
            // BACK_MOUNT.press): each gun's charging or bolt handle is on its own right, which
            // faces the pack on the left mount.
            const n = p.length / 3,
              depth = new Float32Array(n),
              qxs = new Float32Array(n),
              cells = new Int32Array(n);
            for (let i = 0, j = 0; i < p.length; i += 3, j++) {
              const px = p[i]!,
                py = p[i + 1]!,
                pz = p[i + 2]!;
              const qx = dockAxisX.x * px + dockAxisY.x * py + dockAxisZ.x * pz,
                qy = dockAxisX.y * px + dockAxisY.y * py + dockAxisZ.y * pz,
                qz = dockAxisX.z * px + dockAxisY.z * py + dockAxisZ.z * pz;
              qxs[j] = qx;
              depth[j] = -sign * qx;
              const iy = Math.floor((BACK_MOUNT.y + qy - PACK_Y0) / PACK_CELL),
                iz = Math.floor((z + qz - PACK_Z0) / PACK_CELL);
              cells[j] =
                iy < 0 || iy >= PACK_NY || iz < 0 || iz >= PACK_NZ ? -1 : iy * PACK_NZ + iz;
            }
            const face = depth.slice().sort()[Math.floor(n * 0.8)] ?? 0;
            fit = -Infinity;
            for (let j = 0; j < n; j++) {
              const c = cells[j]!;
              if (c < 0) continue;
              const out = grid[c]!;
              if (out < 0) continue;
              const press = Math.min(BACK_MOUNT.press, Math.max(0, depth[j]! - face));
              fit = Math.max(fit, out - sign * qxs[j]! - press);
            }
            d.reach.set(key, fit);
          }
          if (fit > -Infinity)
            x = fit + BACK_MOUNT.gap - (v === shotgun ? BACK_MOUNT.shotgunPack : 0);
        }
      }
      dockBackP.set(sign * x, BACK_MOUNT.y, z);
      dockM.makeBasis(dockAxisX, dockAxisY, dockAxisZ);
      dockBackQ.setFromRotationMatrix(dockM).premultiply(dockDelta);
      dockBackP
        .applyQuaternion(dockDelta)
        .add(dockChestP)
        .sub(dockScale.copy(d.centre).multiply(d.seatS).applyQuaternion(dockBackQ));
      if (d.k < 1) {
        // Between: from the seat in the hands, up and out past the shoulder, to the mount.
        dockM.compose(d.seatP, d.seatQ, d.seatS).premultiply(weaponPivot.matrix);
        dockM.decompose(dockHandP, dockHandQ, dockScale);
        const e = THREE.MathUtils.smootherstep(d.k, 0, 1),
          arc = Math.sin(Math.PI * e);
        dockBackP.lerp(dockHandP, 1 - e);
        dockBackP.y += 0.12 * arc;
        dockBackP.x += sign * 0.12 * arc;
        dockBackQ.slerp(dockHandQ, 1 - e);
      }
      if (v.root.parent !== root) root.add(v.root);
      v.root.position.copy(dockBackP);
      v.root.quaternion.copy(dockBackQ);
      v.root.scale.copy(d.seatS);
      v.root.updateMatrixWorld(true);
    }
    return reaching;
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
  /** Turn a bone about an axis given in root space (rad), keeping what it already has. */
  const turn = (name: string, x: number, y: number, z: number, angle: number) => {
    const bone = bones.get(name);
    if (!bone || !angle) return;
    upAxis.set(x, y, z).transformDirection(root.matrixWorld);
    twistQ.setFromAxisAngle(upAxis, angle);
    rotation(bone.parent!, parentQ);
    deltaQ.copy(parentQ).invert().multiply(twistQ).multiply(parentQ);
    bone.quaternion.premultiply(deltaQ);
    bone.updateWorldMatrix(false, true);
  };
  const ropeX = new THREE.Vector3(),
    ropeY = new THREE.Vector3(),
    ropeZ = new THREE.Vector3(),
    ropeM = new THREE.Matrix4(),
    ropeQ = new THREE.Quaternion();
  /**
   * The rope climb (rope-climb.ts) on this rig: the spine leaning back and turning into each
   * reach, the arms solved to the grips on the rope and the fists closed round it, the legs
   * solved to the steps on the rock and the soles flat on it. Everything is posed from rest.
   */
  const rapA = new THREE.Vector3(),
    rapB = new THREE.Vector3(),
    rapC = new THREE.Vector3(),
    rapLip = new THREE.Vector3(),
    rapQ = new THREE.Quaternion(),
    rapQ2 = new THREE.Quaternion();
  /**
   * The rappel on this rig: the clips' pose, then the contacts the clip only says should hold.
   * A boot on the wall is put on the wall's face (the rigs' legs differ, and the body's point
   * moves as the server moves it), its sole kept as keyed; the guide hand is put on the rope's
   * straight line from the roof's edge to the harness, and both fists turned to hold it.
   */
  const poseRappel = (r: NonNullable<Motion["rappel"]>) => {
    const rig = rappelRig!;
    body.position.set(baseX, baseY, baseZ);
    root.updateWorldMatrix(true, true);
    rig.apply(r.clip, r.ms, r.clip2, r.ms2, r.mix, rappelContacts);
    const c = rappelContacts;
    for (const side of sides) {
      const plant = side === "Left" ? c.plantL : c.plantR;
      if (plant < 0.02) continue;
      const upper = bones.get(side + "UpLeg")!,
        shin = bones.get(side + "Leg")!,
        ankle = bones.get(side + "Foot")!;
      // The ankle to the wall's face (off it by the sole's height), the knee where it was.
      rotation(ankle, rapQ);
      target.setFromMatrixPosition(ankle.matrixWorld);
      root.worldToLocal(target);
      target.z += (-r.wall + rig.ankle - target.z) * plant;
      root.localToWorld(target);
      bend
        .setFromMatrixPosition(shin.matrixWorld)
        .sub(rapA.setFromMatrixPosition(upper.matrixWorld));
      limb(upper, shin, ankle, target, bend);
      limb(upper, shin, ankle, target, bend);
      rotation(ankle.parent!, parentQ).invert();
      ankle.quaternion.copy(parentQ.multiply(rapQ));
      ankle.updateWorldMatrix(false, true);
    }
    // The rope through the body: over the edge, down to the device on the harness (in front
    // of the belt), then out to the brake hand at the hip.
    const out = rappelRope;
    out.set = true;
    out.gripL = c.gripL;
    out.gripR = c.gripR;
    root.localToWorld(rapLip.set(r.lip[0], r.lip[1], r.lip[2]));
    const hipsBone = bones.get("Hips")!;
    out.device.setFromMatrixPosition(hipsBone.matrixWorld);
    root.worldToLocal(out.device);
    out.device.y += 0.05;
    out.device.z -= 0.17;
    root.localToWorld(out.device);
    for (const side of sides) {
      const left = side === "Left";
      const grip = left ? c.gripL : c.gripR;
      const upper = bones.get(side + "Arm")!,
        fore = bones.get(side + "ForeArm")!,
        wrist = bones.get(side + "Hand")!;
      const at = left ? out.guide : out.brake;
      // The rope's way through this hand: up to the edge (the guide), up to the device (the
      // brake).
      rapA.setFromMatrixPosition(wrist.matrixWorld);
      if (left) ropeZ.copy(rapLip).sub(out.device).normalize();
      else ropeZ.copy(out.device).sub(rapA).normalize();
      // The hand lies along the forearm, across the rope.
      rapB.setFromMatrixPosition(fore.matrixWorld);
      ropeX.copy(rapA).sub(rapB).normalize();
      ropeX.addScaledVector(ropeZ, -ropeX.dot(ropeZ));
      if (ropeX.lengthSq() < 1e-4) ropeX.set(1, 0, 0).transformDirection(root.matrixWorld);
      ropeX.normalize();
      if (grip > 0.02) {
        if (left) {
          // On the line from the device to the edge, at the height the clip has the hand.
          rapC.copy(rapA).addScaledVector(ropeX, 0.085).sub(out.device);
          const along = THREE.MathUtils.clamp(rapC.dot(ropeZ), 0.12, 0.75);
          rapC.copy(out.device).addScaledVector(ropeZ, along);
          // (The wrist is behind the grip along the hand.)
          target
            .copy(rapC)
            .addScaledVector(ropeX, -0.085)
            .lerp(rapA, 1 - grip);
          bend
            .setFromMatrixPosition(fore.matrixWorld)
            .sub(rapB.setFromMatrixPosition(upper.matrixWorld));
          limb(upper, fore, wrist, target, bend);
          limb(upper, fore, wrist, target, bend);
          rapA.setFromMatrixPosition(wrist.matrixWorld);
        }
        // The fist round the rope: the knuckles' line along it, the thumb's side up it.
        rapC.copy(ropeX);
        if (!left) rapC.negate();
        ropeY.crossVectors(ropeZ, rapC).normalize();
        rapB.crossVectors(rapC, ropeY).normalize();
        worldQ.setFromRotationMatrix(ropeM.makeBasis(rapC, ropeY, rapB)).multiply(knuckles[side]);
        rotation(wrist, rapQ2);
        rapQ2.slerp(worldQ, grip);
        rotation(wrist.parent!, parentQ).invert();
        wrist.quaternion.copy(parentQ.multiply(rapQ2));
        wrist.updateWorldMatrix(false, true);
      }
      // Where the rope is in this hand: the middle of the fist.
      at.copy(rapA).addScaledVector(ropeX, 0.085);
    }
    for (const g of gripPoses)
      g.bone.quaternion.slerpQuaternions(
        g.open,
        g.fist,
        0.15 + 0.85 * (g.left ? c.gripL : c.gripR),
      );
    root.updateWorldMatrix(true, true);
  };
  const poseRope = (rope: NonNullable<Motion["rope"]>, dt: number) => {
    const rig = ropeRig!;
    // Held still for a moment: the free hand and foot come to the rope and the rock.
    const moved = Math.abs(rope.cycles - ropeLast) > 1e-5;
    ropeLast = rope.cycles;
    ropeStill = moved ? 0 : ropeStill + dt;
    const still = ropeStill > 140 ? 1 : 0;
    ropeSettle += (still - ropeSettle) * (1 - Math.exp(-dt / (still ? 120 : 70)));
    const p = ropeClimbPose(rope.cycles, rope.wall, rig, ropeSettle, ropePose);
    for (let i = 0; i < rest.length; i++) {
      const pose = rest[i]!;
      pose.bone.position.copy(pose.p);
      pose.bone.quaternion.copy(pose.q);
    }
    body.position.set(baseX + p.hips[0], baseY + p.hips[1] - rig.hips, baseZ + p.hips[2]);
    root.updateWorldMatrix(true, true);
    // The spine: the lean and the turn shared out from the pelvis to the chest; the head stays
    // on the rope above, looking up it.
    const yaw = (p.chestYaw - p.pelvisYaw) / 3,
      roll = (p.chestRoll - p.pelvisRoll) / 3;
    turn("Hips", 1, 0, 0, p.lean * 0.4);
    turn("Hips", 0, 1, 0, p.pelvisYaw);
    turn("Hips", 0, 0, 1, p.pelvisRoll);
    for (const name of ["Spine", "Spine1", "Spine2"]) {
      turn(name, 1, 0, 0, p.lean * 0.2);
      turn(name, 0, 1, 0, yaw);
      turn(name, 0, 0, 1, roll);
    }
    turn("Neck", 0, 1, 0, -p.chestYaw * 0.5);
    turn("Neck", 1, 0, 0, 0.14);
    turn("Head", 0, 1, 0, -p.chestYaw * 0.4);
    turn("Head", 0, 0, 1, -p.chestRoll);
    turn("Head", 1, 0, 0, 0.22);
    rotation(root, ropeQ);
    for (const side of sides) {
      const sign = side === "Left" ? -1 : 1;
      const { hand, foot } = side === "Left" ? p.left : p.right;
      const upper = bones.get(side + "Arm")!,
        fore = bones.get(side + "ForeArm")!,
        wrist = bones.get(side + "Hand")!;
      // The shoulder rises with a high reach.
      av.setFromMatrixPosition(upper.matrixWorld);
      root.worldToLocal(av);
      turn(
        side + "Shoulder",
        0,
        0,
        1,
        sign * 0.3 * THREE.MathUtils.smoothstep(hand.y - av.y, -0.1, 0.45),
      );
      // Elbows down, back and a little out. The grip is the middle of the fist, in the palm: the wrist
      // is behind it along the hand, which lies between "across the rope" and the forearm's
      // own line (found from a first solve to the grip itself), the knuckles' line along the
      // rope with the thumb side up. Solved again from there (and once more: the body is a
      // little broader than it is tall, so a limb's length changes as it turns).
      bend.set(sign * 0.55, -0.5, 0.65).transformDirection(root.matrixWorld);
      root.localToWorld(target.set(hand.x, hand.y, hand.z));
      limb(upper, fore, wrist, target, bend);
      av.setFromMatrixPosition(fore.matrixWorld);
      bv.setFromMatrixPosition(wrist.matrixWorld).sub(av).normalize();
      ropeX.set(-sign * 0.5, 0, -0.85).transformDirection(root.matrixWorld);
      ropeX.multiplyScalar(0.45).addScaledVector(bv, 0.55).normalize();
      target.addScaledVector(ropeX, -0.085);
      ropeZ.set(0, 1, 0).transformDirection(root.matrixWorld);
      if (side === "Right") ropeX.negate();
      // (The basis' y is the back of the hand: the rope lies in the palm, the other way.)
      ropeY.crossVectors(ropeZ, ropeX).normalize();
      ropeZ.crossVectors(ropeX, ropeY).normalize();
      target.addScaledVector(ropeY, 0.03);
      limb(upper, fore, wrist, target, bend);
      limb(upper, fore, wrist, target, bend);
      worldQ.setFromRotationMatrix(ropeM.makeBasis(ropeX, ropeY, ropeZ)).multiply(knuckles[side]);
      rotation(wrist.parent!, parentQ).invert();
      wrist.quaternion.copy(parentQ.multiply(worldQ));
      wrist.updateWorldMatrix(false, true);
      // Knees up and out, clear of the rope and the hands between them.
      root.localToWorld(target.set(foot.x, foot.y, foot.z));
      bend.set(sign * 0.6, 1, 0.1).transformDirection(root.matrixWorld);
      const ankle = bones.get(side + "Foot")!;
      // (The thigh is brought forward first: solved straight from standing, a knee this high
      // is nearly the opposite way, and the shortest turn there flips from frame to frame.)
      turn(side + "UpLeg", 1, 0, 0, Math.PI / 2);
      for (let pass = 0; pass < 3; pass++)
        limb(bones.get(side + "UpLeg")!, bones.get(side + "Leg")!, ankle, target, bend);
      // The sole flat on the rock, the toes up it and a little out; hanging a little in the
      // step.
      worldQ
        .copy(ropeQ)
        .multiply(twistQ.setFromAxisAngle(upAxis.set(0, 0, 1), -sign * 0.22))
        .multiply(twistQ.setFromAxisAngle(sideAxis, (Math.PI / 2) * (0.6 + 0.4 * foot.hold)))
        .multiply(footOrientations.get(side)!);
      rotation(ankle.parent!, parentQ).invert();
      ankle.quaternion.copy(parentQ.multiply(worldQ));
      ankle.updateWorldMatrix(false, true);
    }
    // Fingers: closed round the rope, opening as a hand lets go and reaches.
    for (const g of gripPoses)
      g.bone.quaternion.slerpQuaternions(
        g.open,
        g.fist,
        0.3 + 0.7 * (g.left ? p.left.hand.hold : p.right.hand.hold),
      );
    root.updateWorldMatrix(true, true);
  };
  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    /**
     * Length of the death animation (ms) when this rig plays it, else 0: the caller then tips
     * the body over itself (deathPose's fourth argument).
     */
    /** Swimming: how far the head is above or below its mean height in the water right now (m),
     * else 0. The first-person camera adds it (the eyes ride with the stroke). */
    get swimBob() {
      return swimWas ? swimBob(swimCycle, swimCrawl) : 0;
    },
    /**
     * Swimming: where this swimmer's hands went through the water since the last call (world x,
     * the water's height, world z, strength 0–1), each given to `emit` once.
     */
    swimSplashes(emit: (x: number, y: number, z: number, strength: number) => void) {
      const list = swimRig?.splashes;
      if (!list?.length) return;
      for (let i = 0; i < list.length; i += 3) {
        splashAt
          .set(list[i]!, 0, list[i + 1]!)
          .applyQuaternion(root.quaternion)
          .add(root.position);
        emit(splashAt.x, root.position.y, splashAt.z, list[i + 2]!);
      }
      list.length = 0;
    },
    get deathClipMs() {
      return loaded && gait ? deathClipMs() : 0;
    },
    /** The rope climb as last posed (rope-climb.ts) and the rig's measures it is fitted to: for
     * the pose check (scripts/fps/rope-check). Null before the rig has loaded. */
    /** Where the rope runs through this body on a rappel, as last posed (world). */
    rappelRope,
    get ropeClimb() {
      return ropeRig ? { rig: ropeRig, pose: ropePose } : null;
    },
    /** The roots of every gun this operator can hold (each is visible only while held). */
    guns(): THREE.Object3D[] {
      return [weapon, awp, hunting, alt, smg, pistol, shotgun].flatMap((view) =>
        view ? [view.root] : [],
      );
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
      gaitPhase += (distance * Math.PI) / ((speed > 6 ? 1.9 : 1.6) * (1 - stance) + 1.25 * stance);
      const stride = Math.min(1, speed / 3);
      for (let i = 0; i < rest.length; i++) {
        const pose = rest[i]!;
        pose.bone.position.copy(pose.p);
        pose.bone.quaternion.copy(pose.q);
      }
      // Bound with the bones at rest, before anything below poses them.
      if (motion.death !== undefined && !deathRig && gait && deathClipMs() > 0)
        deathRig = bindDeathClip(root, bones, gait.legLength);
      const swimming = alive && !!motion.swim && motion.death === undefined;
      const swimView = swimming && typeof motion.swim === "object" && !!motion.swim.view;
      if (swimming) {
        if (!swimRig && gait) swimRig = bindSwimStroke(root, bones);
        const depth = typeof motion.swim === "object" ? motion.swim.depth : undefined;
        // Into the crawl with speed; upright again where the bottom comes up to the feet (the
        // swimmer stands up there: no snap from lying in the water to walking).
        const want =
          Math.min(1, Math.max(0, (speed - 0.25) / 1.3)) *
          (depth === undefined ? 1 : Math.min(1, Math.max(0, (depth - 1.3) / 0.6)));
        const yawNow = root.rotation.y;
        if (!swimWas) {
          // Just in the water: upright, as the wader was.
          swimCrawl = swimTurn = 0;
          swimYaw = yawNow;
        }
        swimCrawl = THREE.MathUtils.damp(swimCrawl, want, want > swimCrawl ? 2.6 : 3.4, seconds);
        const turned = Math.atan2(Math.sin(yawNow - swimYaw), Math.cos(yawNow - swimYaw));
        swimYaw = yawNow;
        swimTurn = THREE.MathUtils.damp(
          swimTurn,
          seconds > 0 ? Math.max(-1, Math.min(1, -turned / seconds / 2.2)) : 0,
          5,
          seconds,
        );
        // A slow scull treading, up to a stroke every 1.15 s at full speed.
        swimCycle += seconds * (0.42 + 0.45 * swimCrawl * Math.min(1, speed / 2.5));
      }
      if (swimWas && !swimming) swimRig?.reset();
      swimWas = swimming;
      // First person in the water: only the arms are drawn (the camera is the head, and the
      // body under it would fill the view).
      if (swimView !== armsOnly) {
        armsOnly = swimView;
        if (swimView && !viewArms) viewArms = cutViewArms();
        for (const m of viewArms ?? []) m.visible = swimView;
        if (!swimView) {
          for (const o of viewHidden) o.visible = true;
          viewHidden.clear();
        }
      }
      if (swimView)
        root.traverse((o) => {
          const drawn = o as THREE.Mesh | THREE.Line | THREE.Points | THREE.Sprite;
          if (
            o.visible &&
            ((drawn as THREE.Mesh).isMesh ||
              (drawn as THREE.Line).isLine ||
              (drawn as THREE.Points).isPoints ||
              (drawn as THREE.Sprite).isSprite) &&
            !viewArms?.includes(o as THREE.SkinnedMesh)
          ) {
            o.visible = false;
            viewHidden.add(o);
          }
        });
      const climbing = alive && !!motion.ladder && motion.death === undefined;
      if (climbing) {
        void loadLadderClip();
        if (!ladderRig && gait && ladderClipReady())
          ladderRig = bindLadderClip(root, bones, gait.legLength, motion.ladder!.standOff);
      }
      const roping = alive && !!motion.rope && motion.death === undefined;
      const rappelling = alive && !!motion.rappel && motion.death === undefined;
      if (rappelling) {
        void loadRappelClip();
        if (!rappelRig && gait && rappelClipReady())
          rappelRig = bindRappelClip(root, bones, gait.legLength);
      }
      // Mixamo gait (locomotion.ts) on foot; the procedural stride in the air, seated, dead or
      // before the clips load.
      const walking =
        alive &&
        !swimming &&
        !climbing &&
        !roping &&
        !rappelling &&
        !motion.seated &&
        !motion.canopy &&
        !motion.zip &&
        !motion.airborne &&
        motion.death === undefined;
      const pose = walking ? (gait?.update(dt, speed, travelX, travelZ, stance) ?? null) : null;
      // Let the hips settle into the stride. At full extension the previous
      // pelvis height exceeded the leg's IK reach and lifted the planted foot.
      body.position.y = motion.seated
        ? baseY - motion.seated.drop
        : baseY - crouchOffset + (pose ? pose.drop : -stride * 0.04);
      body.position.x = baseX + (pose?.swayX ?? 0);
      body.position.z = baseZ + (pose?.swayZ ?? 0);
      root.updateWorldMatrix(true, true);
      if (pose && (pose.yaw || pose.roll)) {
        // The pelvis turns and rolls with the stride; the chest turns back, so the shoulders
        // stay square to the gun.
        const hips = bones.get("Hips"),
          chest = bones.get("Spine1");
        if (hips && chest) {
          twistQ.setFromEuler(gaitEuler.set(0, pose.yaw * 0.8, pose.roll * 0.8, "YXZ"));
          rotation(root, worldQ);
          twistQ.premultiply(worldQ).multiply(worldQ.invert());
          rotation(hips.parent!, parentQ);
          hips.quaternion.premultiply(parentQ.clone().invert().multiply(twistQ).multiply(parentQ));
          hips.updateWorldMatrix(false, true);
          upAxis.set(0, 1, 0).transformDirection(root.matrixWorld);
          twistQ.setFromAxisAngle(upAxis, -pose.yaw * 0.8);
          rotation(chest.parent!, parentQ);
          chest.quaternion.premultiply(parentQ.clone().invert().multiply(twistQ).multiply(parentQ));
          chest.updateWorldMatrix(false, true);
        }
      }
      {
        // Upper body with the stride (owner, 2026-11-17: the characters looked stiff, as in
        // PUBG or Warzone they should carry themselves): leaning into the pace, more at a
        // sprint, and into turns; the shoulders rolling a little with each step; the head held
        // level against it. Eased so a stop or a turn settles instead of snapping.
        const yawNow = root.rotation.y;
        let turned = yawNow - lastYaw;
        turned -= Math.round(turned / (2 * Math.PI)) * 2 * Math.PI;
        lastYaw = yawNow;
        yawRate = THREE.MathUtils.damp(
          yawRate,
          Math.max(-5, Math.min(5, turned / seconds)),
          8,
          seconds,
        );
        const upright = 1 - 0.7 * stance;
        const runTarget = pose ? pose.moving * (0.35 + 0.65 * pose.pace) * upright : 0;
        run = THREE.MathUtils.damp(run, runTarget, 8, seconds);
        lead = pose ? pose.lead : THREE.MathUtils.damp(lead, 0, 8, seconds);
        // A sprint shows from the speed (only the battle royale and the sprint key reach it);
        // a shot just fired keeps the gun up.
        const sprinting =
          pose && now - (flashUntil - 42) > 450
            ? THREE.MathUtils.smoothstep(speed, 5.6, 6.8) * upright
            : 0;
        sprintBlend = THREE.MathUtils.damp(sprintBlend, sprinting, 6, seconds);
        leanForward = THREE.MathUtils.damp(
          leanForward,
          walking ? 0.05 * run + 0.08 * sprintBlend : 0,
          6,
          seconds,
        );
        bank = THREE.MathUtils.damp(
          bank,
          walking ? Math.max(-0.11, Math.min(0.11, yawRate * speed * 0.012)) : 0,
          6,
          seconds,
        );
        leanAxis.set(1, 0, 0).transformDirection(root.matrixWorld);
        bankAxis.set(0, 0, 1).transformDirection(root.matrixWorld);
        const spine = bones.get("Spine");
        turnBone(spine, leanAxis, -leanForward);
        turnBone(spine, bankAxis, bank);
        // A little roll of the shoulders over the leading foot.
        turnBone(bones.get("Spine2"), bankAxis, -0.025 * run * lead);
        const neck = bones.get("Neck");
        turnBone(neck, leanAxis, leanForward * 0.85);
        turnBone(neck, bankAxis, -bank * 0.7 + 0.02 * run * lead);
      }
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
          phase = gaitPhase + (sign === 1 ? Math.PI : 0),
          swing = Math.sin(phase) * 0.28 * stride,
          lift = Math.max(0, Math.cos(phase)) * 0.065 * stride;
        if (motion.seated) {
          const f = motion.seated.foot;
          target.set(sign * f[0], f[1], f[2]);
        } else if (motion.zip) {
          // Hanging from the handle: legs below, feet together-ish, an easy swing in the wind;
          // tucked, the knees come up and the feet forward (over the rail, before the landing).
          const k = motion.zip.tuck,
            hang = motion.zip.reach,
            sway = Math.sin(now / 700 + (sign > 0 ? 0 : 1.3)) * 0.04 * hang * (1 - k);
          target.set(sign * (0.1 + 0.03 * k), 0.03 + 0.46 * k * hang, -0.04 - 0.24 * k + sway);
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
        } else if (pose) {
          target.fromArray(side === "Left" ? pose.left : pose.right);
          // The legs stay inside the server's 0.7 m body box (player-volumes.ts) whatever the
          // stride: the ankle is held so that its toe does too (fair at any pace).
          const r = toeReach[side],
            box = FOOT_BOX;
          target.x = THREE.MathUtils.clamp(target.x, -box + Math.abs(r.x), box - Math.abs(r.x));
          target.z = THREE.MathUtils.clamp(
            target.z,
            -box + Math.max(0, -r.z),
            box - Math.max(0, r.z),
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
        else if (motion.zip)
          bend.set(sign * 0.1, 0.2, -1); // knees forward, a little out
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
        // Heel and toe roll from the gait, about the character's own left–right axis.
        if (pose) {
          const ankle = (side === "Left" ? pose.left : pose.right)[1],
            r = toeReach[side];
          let roll = side === "Left" ? pose.toeLeft : pose.toeRight;
          // Toe height after rolling by `a` about x: ankle + r.y·cos a − r.z·sin a (≥ 5 mm).
          const toeY = (a: number) => ankle + r.y * Math.cos(a) - r.z * Math.sin(a);
          if (roll < 0 && toeY(roll) < 0.005) {
            let lo = roll,
              hi = 0;
            for (let k = 0; k < 8; k++) {
              const mid = (lo + hi) / 2;
              if (toeY(mid) < 0.005) lo = mid;
              else hi = mid;
            }
            roll = hi;
          }
          worldQ.multiply(twistQ.setFromAxisAngle(sideAxis, roll));
        }
        worldQ.multiply(footOrientations.get(side)!);
        foot.quaternion.copy(parentQ.multiply(worldQ));
        foot.updateWorldMatrix(false, true);
      }
      const recoil = Math.max(0, (flashUntil - now) / 42) * 0.025;
      // The gun rides the stride's bounce and sway with the shoulders (cosmetic; shots come
      // from the server's eye).
      weaponPivot.position.y = 1.25 - crouchOffset + (pose?.drop ?? 0);
      weaponPivot.position.x = 0.07 + (pose?.swayX ?? 0);
      weaponPivot.position.z = pose?.swayZ ?? 0;
      weaponPivot.rotation.x = pitch + recoil;
      weaponPivot.rotation.z = motion.reloading ? -0.25 : 0;
      weaponPivot.rotation.y = 0;
      // The gun goes with the shoulders: forward with the lean, a small bob and swing in step,
      // and at a sprint a low ready, the muzzle down and in across the body (it comes back up
      // the moment he fires).
      const bob = Math.abs(lead) - 0.5;
      weaponPivot.position.z -= leanForward * 0.42;
      weaponPivot.position.y += -0.05 * sprintBlend + 0.008 * run * bob;
      weaponPivot.rotation.x += -0.5 * sprintBlend + 0.018 * run * bob;
      weaponPivot.rotation.y += 0.38 * sprintBlend + 0.03 * run * lead;
      weaponPivot.rotation.z += -0.18 * sprintBlend;
      if (motion.death !== undefined && deathRig) {
        // The gun leaves the hands as the body is hit: it drops to the floor ahead of the
        // body, turning onto its side, and lies there (cosmetic).
        const s = (motion.death * deathClipMs()) / 1000,
          from = 1.25 - crouchOffset,
          land = Math.sqrt((2 * (from - 0.06)) / 9.8),
          k = Math.min(1, s / land),
          eased = k * k * (3 - 2 * k);
        weaponPivot.position.set(
          0.07 + 0.12 * eased,
          Math.max(0.06, from - 0.5 * 9.8 * s * s),
          -0.35 * eased,
        );
        weaponPivot.rotation.set(pitch * (1 - eased), 0.5 * eased, (Math.PI / 2) * eased);
      }
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
          : motion.primary === "hunting" && hunting?.loaded
            ? hunting
            : motion.primary === "mp5" && smg?.loaded
              ? smg
              : motion.primary === "deagle" && pistol?.loaded
                ? pistol
                : motion.primary === "spas12" && shotgun?.loaded
                  ? shotgun
                  : wantsAlt
                    ? alt!
                    : weapon;
      const holdingPistol = held === pistol;
      const empty = motion.primary === "none" || !!motion.canopy || !!motion.seated || !!motion.zip;
      for (const v of [weapon, awp, hunting, alt, smg, pistol, shotgun])
        if (v && v !== held) v.update(false, 0, 0);
      held.update(!empty && !holdingKnife && !holdingNade, motion.reloading ? 0.4 : 0, recoil);
      heldGun =
        empty || holdingKnife || holdingNade
          ? null
          : {
              id:
                held === awp
                  ? "awp"
                  : held === hunting
                    ? "hunting"
                    : held === smg
                      ? "mp5"
                      : held === pistol
                        ? "deagle"
                        : held === shotgun
                          ? "spas12"
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
      // The Karambit's hold and swings (KNIFE_HOLD, KNIFE_SWING_KEYS), as in first person.
      const swingT = (now - swingAt) / KNIFE_SWING_MS[swingKind],
        swinging = swingT >= 0 && swingT < 1;
      // Running with the knife the arms pump with the legs: the right one forward as the left
      // foot leads, and the reverse.
      const pump = run * (swinging ? 0 : 1) * (0.6 + 0.4 * sprintBlend);
      if (holdingKnife) {
        const keys = KNIFE_SWING_KEYS[swingKind];
        let a = keys[0]!,
          b = keys[0]!,
          k = 0;
        if (swinging)
          for (let i = 1; i < keys.length; i++)
            if (swingT <= keys[i]!.t) {
              a = keys[i - 1]!;
              b = keys[i]!;
              k = THREE.MathUtils.smoothstep(swingT, a.t, b.t);
              break;
            }
        const mix = (x: number, y: number) => x + (y - x) * k;
        const [rx, ry, rz] = KNIFE_HOLD.wristR,
          [lx, ly, lz] = KNIFE_HOLD.wristL;
        knifeWristR.set(
          rx + mix(a.r[0], b.r[0]),
          ry - crouchOffset + mix(a.r[1], b.r[1]) + pitch * 0.12 - 0.04 * pump * (1 - lead),
          rz + mix(a.r[2], b.r[2]) + 0.14 * pump * (lead + 0.2),
        );
        knifeWristL.set(
          lx + mix(a.l[0], b.l[0]) + 0.04 * pump,
          ly - crouchOffset + mix(a.l[1], b.l[1]) + pitch * 0.1 + 0.03 * pump,
          lz + mix(a.l[2], b.l[2]) - 0.18 * pump * lead,
        );
        // The fist: tilted forward (the blade leads a stab) and turned with a slash's sweep.
        knifeTurn.setFromEuler(
          gaitEuler.set(-mix(a.tilt, b.tilt) + pitch * 0.4, mix(a.turn, b.turn), 0, "YXZ"),
        );
        knifeUp.fromArray(KNIFE_HOLD.fistUp).normalize().applyQuaternion(knifeTurn);
        knifeBack.fromArray(KNIFE_HOLD.fistBack).applyQuaternion(knifeTurn);
        knifeBack.addScaledVector(knifeUp, -knifeBack.dot(knifeUp)).normalize();
        knifeFingers.fromArray(KNIFE_HOLD.fingersL).normalize();
        knifeBackL.fromArray(KNIFE_HOLD.backL);
        knifeBackL.addScaledVector(knifeFingers, -knifeBackL.dot(knifeFingers)).normalize();
      }
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
      const reaching = alive
        ? placeCarried(motion, empty || holdingKnife || holdingNade ? null : held, dt)
        : null;
      for (const side of sides) {
        const sign = side === "Left" ? -1 : 1;
        // A gun on its way between the back and the hands is in the right hand (the left lets
        // go and waits at the chest); otherwise both hands on the gun in hand.
        const gripView = reaching ?? held;
        gripView.grip(side === "Left" ? "L" : "R", target);
        // Markers describe the grasp centre; the character Hand bone is at the wrist.
        if (reaching) rotation(reaching.root, worldQ).multiply(docks.get(reaching)!.seatQInverse);
        else rotation(weaponPivot, worldQ);
        cv.set(side === "Left" ? -0.065 : 0.065, side === "Left" ? -0.045 : -0.03, 0.025)
          .multiplyScalar(HAND_SCALE)
          .applyQuaternion(worldQ);
        target.add(cv);
        if (motion.seated) {
          const h = side === "Left" ? motion.seated.handL : motion.seated.handR;
          root.localToWorld(target.set(h[0], h[1], h[2]));
        } else if (motion.zip) {
          // Both hands on the handle (IK holds them there whatever the swing); reaching, they rise
          // from the sides of the chest to it.
          const r = motion.zip.reach,
            [hx, hy, hz] = motion.zip.handle;
          root.localToWorld(
            target.set(
              sign * 0.24 + (hx + sign * 0.105 - sign * 0.24) * r,
              1.15 + (hy - 1.15) * r,
              -0.12 + (hz + 0.12) * r,
            ),
          );
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
          root.localToWorld(side === "Right" ? target.copy(knifeWristR) : target.copy(knifeWristL));
        else if (reaching && side === "Left") root.localToWorld(target.set(-0.14, 1.12, -0.24));
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
        else if (motion.zip)
          bend.set(sign, -0.1, 0.25); // elbows out, the arms up to the bar
        else if (holdingKnife)
          bend.set(sign * 0.35, -1, 0.15); // elbows down under the wrists
        else if (side === "Left" || holdingNade) bend.set(sign, -0.6, -0.3);
        else bend.set(1, -0.25, 0.05);
        bend.transformDirection(root.matrixWorld);
        limb(
          bones.get(side + "Arm")!,
          bones.get(side + "ForeArm")!,
          bones.get(side + "Hand")!,
          target,
          bend,
        );
        if (holdingKnife && !motion.canopy && !motion.seated && !motion.zip) {
          // The hands turned as in first person (the basis as the knuckles': x along the hand,
          // the left's fingers' way and the right's against them, y the back of the hand, z to
          // the thumb), then the knife into the right fist.
          const hand = bones.get(side + "Hand")!;
          const right = side === "Right";
          knifeX.copy(right ? knifeUp : knifeFingers);
          if (right) knifeX.negate();
          knifeY.copy(right ? knifeBack : knifeBackL);
          knifeZ.crossVectors(knifeX, knifeY);
          rotation(root, worldQ);
          knifeM.makeBasis(knifeX, knifeY, knifeZ);
          twistQ.setFromRotationMatrix(knifeM);
          worldQ.multiply(twistQ).multiply(knuckles[side]);
          rotation(hand.parent!, parentQ).invert();
          hand.quaternion.copy(parentQ.multiply(worldQ));
          hand.updateWorldMatrix(false, true);
          if (right) {
            // Ring on the index finger: along the fist from the wrist, toward the thumb, into
            // the palm; the handle across the fist to the little finger, the blade curving up.
            root.worldToLocal(knife.position.setFromMatrixPosition(hand.matrixWorld));
            const [along, thumb, palm] = KNIFE_HOLD.ring;
            knife.position
              .addScaledVector(knifeUp, along * HAND_SCALE)
              .addScaledVector(knifeZ, thumb * HAND_SCALE)
              .addScaledVector(knifeBack, -palm * HAND_SCALE);
            knifeY.copy(knifeBack).negate();
            knifeM.makeBasis(knifeY, knifeZ, knifeUp);
            knife.quaternion.setFromRotationMatrix(knifeM);
          }
        } else if (
          !holdingKnife &&
          !holdingNade &&
          !motion.canopy &&
          !motion.seated &&
          !motion.zip &&
          !(reaching && side === "Left")
        ) {
          const hand = bones.get(side + "Hand")!;
          rotation(hand.parent!, parentQ).invert();
          if (reaching)
            rotation(reaching.root, worldQ)
              .multiply(docks.get(reaching)!.seatQInverse)
              .multiply(wristRotations[side]);
          else rotation(weaponPivot, worldQ).multiply(wristRotations[side]);
          hand.quaternion.copy(parentQ.multiply(worldQ));
          hand.updateWorldMatrix(false, true);
        }
      }
      if (!holdingKnife && !holdingNade)
        for (const pose of gripPoses) pose.bone.quaternion.copy(pose.q); // fists (gun or toggle)
      else if (holdingKnife)
        // The knife hand closed round the handle (an open hand read as empty), the other a
        // loose guard.
        for (const pose of gripPoses)
          pose.bone.quaternion.copy(
            !pose.left ? pose.fist : swinging && swingKind === "slash" ? pose.open : pose.q,
          );
      if (climbing && ladderRig) {
        // The climb drives the whole body (hands on the rungs, feet on the rungs below).
        ladderRig.apply(motion.ladder!.cycles);
        root.updateWorldMatrix(true, true);
      } else if (roping && ropeRig) {
        // Hand over hand up the rope, the feet walking up the rock face.
        poseRope(motion.rope!, dt);
      } else if (rappelling && rappelRig) {
        // Down a wall on a rope: braced on it, hopping down it (rappel-clip.ts).
        poseRappel(motion.rappel!);
      } else if (swimming && swimRig) {
        // The stroke drives the whole body (arms, legs and the hips' place in the water); the
        // hands are open paddles.
        for (const pose of gripPoses) pose.bone.quaternion.copy(pose.open);
        swimRig.apply({
          cycle: swimCycle,
          crawl: swimCrawl,
          turn: swimTurn,
          view: swimView,
          pitch,
        });
      } else if (motion.death !== undefined && deathRig) {
        // The death animation (death-clip.ts) drives the whole body; the gun has dropped.
        deathRig.apply(motion.death * deathClipMs());
        root.updateWorldMatrix(true, true);
      } else if (motion.death !== undefined) {
        const collapse = motion.death;
        // Before the animation has loaded: relaxed, asymmetric limbs over the fitted pose
        // while the caller tips the body over (death-presentation.ts).
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
      hunting?.dispose();
      alt?.dispose();
      smg?.dispose();
      pistol?.dispose();
      shotgun?.dispose();
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

/**
 * The officer's vest in the battle royale (owner, 2026-11-10: "one vest/kevlar equipped at a
 * time, not several"): vests are loot there, so his own is taken off. It is welded into the body
 * mesh and is his torso (no shirt is modelled under it), so the shell stays and is dressed in his
 * shirt's fabric instead (its triangles' UVs, the vest's island of police-swat.glb's atlas,
 * projected onto a plain patch of the blue fabric), and the pouches, radio and buckles on it —
 * separate blocks — are dropped. On a copy of the geometry (the loaded model is shared).
 */
const VEST_ISLAND = { u: [0.39, 0.985], v: [0.585, 0.825], y: [0.9, 1.52] } as const;
const SHIRT_PATCH = { u: 0.435, du: 0.095, v: 0.015, dv: 0.09 };
const VEST_KIT = { y: [0.9, 1.5], x: 0.26 } as const;
/**
 * The torso the vest covers (bind pose, metres): above the belt, inside the arms. The belt
 * (the atlas's bottom strip, `v` past `belt`) stays.
 */
const VEST_TORSO = { y: [1.0, 1.52], x: 0.24, belt: 0.94 } as const;
/** Whether the colour map is the shirt's blue fabric at (u, v); null without a 2D canvas. */
function shirtTexels(material: THREE.Material | THREE.Material[]) {
  const map = (Array.isArray(material) ? material[0] : material) as THREE.MeshStandardMaterial;
  const image = map?.map?.image as CanvasImageSource | undefined;
  if (!image || typeof OffscreenCanvas === "undefined") return null;
  const cached = texelCache.get(image as object);
  if (cached !== undefined) return cached;
  const made = readShirtTexels(image, map.map!.flipY);
  texelCache.set(image as object, made);
  return made;
}
/** One read of the colour map per loaded model (every pooled officer shares it). */
const texelCache = new WeakMap<object, ((u: number, v: number) => boolean) | null>();
function readShirtTexels(image: CanvasImageSource, flip: boolean) {
  const n = 256;
  const ctx = new OffscreenCanvas(n, n).getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(image, 0, 0, n, n);
  } catch {
    return null;
  }
  const px = ctx.getImageData(0, 0, n, n).data;
  return (u: number, v: number) => {
    const x = Math.min(n - 1, Math.max(0, Math.floor((((u % 1) + 1) % 1) * n)));
    const yy = (((v % 1) + 1) % 1) * n;
    const y = Math.min(n - 1, Math.max(0, Math.floor(flip ? n - 1 - yy : yy)));
    const k = (y * n + x) * 4;
    return px[k + 2]! > px[k]! + 25 && px[k + 2]! > 70;
  };
}
function stripVest(root: THREE.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof THREE.SkinnedMesh) || !/Object_8$/.test(o.name)) return;
    const g = o.geometry.clone();
    const pos = g.getAttribute("position"),
      uvSrc = g.getAttribute("uv"),
      normal = g.getAttribute("normal"),
      index = g.getIndex();
    if (!index || !uvSrc) return;
    const uv = uvSrc.clone();
    g.setAttribute("uv", uv);
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
    // Each block's box; the body itself is the block with the most vertices.
    const box = new Map<number, number[]>(),
      size = new Map<number, number>();
    for (let i = 0; i < pos.count; i++) {
      const r = find(ids[i]!);
      const b = box.get(r) ?? [Infinity, -Infinity, Infinity, -Infinity];
      b[0] = Math.min(b[0]!, pos.getX(i));
      b[1] = Math.max(b[1]!, pos.getX(i));
      b[2] = Math.min(b[2]!, pos.getY(i));
      b[3] = Math.max(b[3]!, pos.getY(i));
      box.set(r, b);
      size.set(r, (size.get(r) ?? 0) + 1);
    }
    let body = -1;
    for (const [r, n] of size) if (body < 0 || n > size.get(body)!) body = r;
    const onVest = (r: number) => {
      const b = box.get(r)!;
      return (
        r !== body &&
        b[2]! >= VEST_KIT.y[0] &&
        b[3]! <= VEST_KIT.y[1] &&
        Math.max(-b[0]!, b[1]!) <= VEST_KIT.x
      );
    };
    // The vest's shell: the torso's triangles not textured with the shirt's blue fabric (the
    // vest, its webbing, edging and straps), read from the body's own colour map; without
    // one (no canvas), the vest's island of the atlas.
    const texel = shirtTexels(o.material);
    const shell = new Set<number>();
    const kept: number[] = [];
    for (let t = 0; t < tris; t++) {
      const a = index.getX(t * 3),
        b = index.getX(t * 3 + 1),
        c = index.getX(t * 3 + 2);
      if (onVest(find(ids[a]!))) continue;
      kept.push(a, b, c);
      const u = (uvSrc.getX(a) + uvSrc.getX(b) + uvSrc.getX(c)) / 3,
        v = (uvSrc.getY(a) + uvSrc.getY(b) + uvSrc.getY(c)) / 3,
        y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3,
        x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
      if (texel) {
        if (
          find(ids[a]!) === body &&
          y > VEST_TORSO.y[0] &&
          y < VEST_TORSO.y[1] &&
          Math.abs(x) < VEST_TORSO.x &&
          v < VEST_TORSO.belt &&
          !texel(u, v)
        )
          shell.add(a).add(b).add(c);
      } else if (
        u > VEST_ISLAND.u[0] &&
        u < VEST_ISLAND.u[1] &&
        v > VEST_ISLAND.v[0] &&
        v < VEST_ISLAND.v[1] &&
        y > VEST_ISLAND.y[0] &&
        y < VEST_ISLAND.y[1]
      )
        shell.add(a).add(b).add(c);
    }
    for (const i of shell) {
      // Front and back from across and up the torso, the sides from front-to-back and up.
      const side = normal ? Math.abs(normal.getX(i)) > Math.abs(normal.getZ(i)) : false;
      const across = side ? pos.getZ(i) : pos.getX(i);
      const fu = ((((across + 0.3) / 0.6) % 1) + 1) % 1,
        fv = Math.min(1, Math.max(0, (VEST_ISLAND.y[1] - pos.getY(i)) / 0.62));
      uv.setXY(i, SHIRT_PATCH.u + fu * SHIRT_PATCH.du, SHIRT_PATCH.v + fv * SHIRT_PATCH.dv);
    }
    g.setIndex(kept);
    o.geometry = g;
  });
}
