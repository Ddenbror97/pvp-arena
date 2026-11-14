import { clampPitch, mouseLook, moveAxes } from "@/lib/fps/look";
import { BrAimRecoil, type BrRecoilState } from "./aim-recoil";
import { NEAR_MISS_M, passBy, SHOT_AT_GAP_MS } from "../shot-awareness";
import * as THREE from "three";
import { updateSceneRoots } from "./scene-transforms";
import type { ActEvent, BrAct } from "./actions";
import { AIRDROP } from "./airdrops";
import { createAtmosphere } from "./atmosphere";
import { sunLook } from "./sun";
import { GRASS_RANGE } from "./grass";
import { setTextureQuality } from "./texture-quality";
import { detectBrTier, gpuLabel, recordBrSession, tierPixelRatio } from "./quality-tier";
import { BrFrameView, BrVehicleView } from "./frame-view";
import { capturePointer } from "../pointer-capture";
import { createSceneTarget, reversedDepthOptIn, wantReversedDepth } from "./scene-target";
import { createSharpen, SHARPEN, sharpenWanted } from "./sharpen";
import { createBrAudio, SPAS12_CUE_LEAD_MS } from "./br-audio";
import { CanopyLook } from "./canopy-look";
import { BrStrides } from "./footsteps";
import { brVisibleRows, brActorPriority, HeldRows } from "./remote-visibility";
import { createBrViewmodel } from "./br-viewmodel";
import type { ShotEvent } from "./combat";
import { watchContextLoss } from "./context-loss";
import { DevOverlay, GpuTimer } from "./dev-overlay";
import {
  DROP,
  newDropBody,
  planeAt,
  routeMs,
  waterSurface,
  stepDrop,
  type DropBody,
  type DropInput,
  type DropPhase,
  type Route,
} from "./drop";
import type { Gun } from "./inventory";
import {
  INVENTORY,
  ITEMS,
  magSize,
  RARITY,
  type ItemId,
  type OpticDef,
  type WeaponDef,
  type WeaponId,
} from "./items";
import { loadIslandScene, type IslandScene } from "./island-scene";
import {
  defaultBinds,
  VIEW_RANGE,
  viewParams,
  type BrBinds,
  brResolutionScale,
} from "./br-settings";
import {
  COLLAPSE_S,
  createCanopy,
  createFarCanopies,
  DEPLOY_S,
  HARNESS_Y,
  DIVE_SWING,
  hangCanopy,
  hangPilot,
  loadCanopy,
  swingStep,
  type Canopy,
  type Swing,
} from "./canopy";
import { BrRemoteTimeline } from "./lag";
import { SnapshotClock } from "../network";
import { reloadLengthMs, reloadProgress, shellStage } from "./reload-progress";
import { SPAS12_RELOAD, spas12ClipTime } from "../spas12-animation";
import { createLootRenderer, type LootClient } from "./loot-renderer";
import { createNadeRenderer } from "./nade-renderer";
import { createAirdropSmoke } from "./airdrop-smoke";
import { createVehicleRenderer, kindOfRow } from "./vehicle-renderer";
import {
  ZIPLINE,
  ZIPLINES,
  zipLanding,
  zipLineAt,
  zipLineOf,
  zipRiderAt,
  type ZipLine,
  type ZipPose,
} from "./zipline";
import { createZiplineRenderer, type ZipRiderView } from "./zipline-renderer";
import { createRopeRenderer, type RopeClimberView } from "./rope-renderer";
import { ROPE, ropeS, ropeTangent } from "./rope";
import { ROPE_CLIMB } from "../rope-climb";
import {
  climbAt,
  LADDER,
  LADDER_CYCLE,
  ladderHeight,
  ladderReachable,
  ladders,
  type LadderState,
} from "./ladders";
import {
  buttonAt,
  floorPassing,
  liftCall,
  lifts,
  liftTarget,
  stopLabel,
  type LiftState,
} from "./lifts";
import { createLiftRenderer } from "./lift-renderer";
import { withPanes } from "./panes";
import { createPaneRenderer } from "./pane-renderer";
import { spec, stepVehicle, VEHICLES, type Vehicle } from "./vehicles";
import type { NadeEvent } from "./match";
import type { LootRow } from "./loot-world";
import { itemFromCode } from "./loot-world";
import { fitCharacterGun, loadAttachmentParts, type AttachmentParts } from "./attachment-fit";
import {
  fitCharacterGear,
  gearModelObjects,
  gearModelsReady,
  loadGearModels,
} from "./character-gear";
import { createOperatorFigure } from "./operator-figure";
import { createDoorRenderer } from "./door-renderer";
import { DOOR_REACH, hullOnDoor, rayDoor, withDoors } from "./doors";
import type { StaticWorld } from "./static-world";
import { perkInput, PHASE_CODES, type BrKitView, type BrPhase, type BrZoneView } from "./match";
import { PERK_EFFECT, perkOn } from "./perks";
import { createTrackerRenderer } from "./tracker-renderer";
import { WORLD_HALF } from "./world";
import { warmPrograms } from "../program-warmup";
import { gridRefAt, MAP_SIZE, tacticalMapBuilder } from "./tactical-map";
import { createCharacter } from "../character";
import { RenderBudget } from "../presentation";
import { deathPose } from "../death-presentation";
import { LocalGrenadeHands } from "../grenades/grenade-timeline";
import { createWeaponKit } from "../weapon";
import { TICK_MS } from "../simulation";
import { KNIFE } from "../combat";
import { AWP } from "../primary";

/**
 * The battle royale client (PLAN §7 Phase 2, LOOT-SPEC): Project Island, the plane, the local
 * player predicted with the shared drop simulation and reconciled to the server, the other
 * participants interpolated 110 ms behind (as in 1v1/5v5), loot on the ground, the first-person
 * guns with their attachments, shots, hits and pickups. The React page owns the socket, the
 * HUD and the inventory screen; this module owns the canvas and the loop (no per-frame React
 * state). Everything the player owns comes from the server (`kit`); the client only predicts
 * its own shots' sound and flash so firing feels immediate.
 */
export type CombatEvent = ShotEvent | ActEvent | NadeEvent;
export type BrView = {
  v: 1;
  type: "br-snapshot";
  tick: number;
  phase: BrPhase;
  phaseAt: number;
  /** Sent once per connection (it never changes). */
  route?: Route;
  you: {
    seat: number;
    x: number;
    y: number;
    z: number;
    vy: number;
    vx: number;
    vz: number;
    grounded: boolean;
    airCrouchOffset?: number;
    crouched: boolean;
    phase: DropPhase;
    /** On the zip-line: the ride's elapsed time (ms; zipline.ts). */
    zip?: number;
    /** Which zip-line (absent: the first). */
    zipLine?: number;
    /** On a ladder: how far up and any step on or off (ladders.ts). */
    ladder?: LadderState;
    /** In a lift: which, between which stops, how far into the ride (lifts.ts). */
    lift?: LiftState;
    seq: number;
    recoil?: BrRecoilState;
  };
  aboard: number;
  /** Before take-off: real players seated (the rest of the 100 seats are bots). */
  humans?: number;
  /**
   * [seat, x, y, z, phase code (5: eliminated), yaw, gun item code or −1, crouched, vehicle or −1,
   * optic code or −1, muzzle code or −1].
   */
  players: number[][];
  /** Far players left out of this view at half rate (the room's BR_FAR_HALF_RATE). */
  held?: number[];
  events: Array<{ seat: number; phase: DropPhase }>;
  now?: number;
  combat?: CombatEvent[];
  loot?: { add: LootRow[]; del: number[] };
  kit?: BrKitView;
  /** Tracker perk: enemy footprints near you (x, y, z, yaw, age in tenths of a second each). */
  tracks?: number[];
  /** Smoke (0) and flames (1) burning now: [id, kind, x, y, z, until]. */
  areas?: number[][];
  alive?: number;
  /** The zone, with this player's gas damage per second now (exposure included). */
  zone?: BrZoneView & { hurt?: number };
  /** Eliminated: the player being watched. */
  watch?: { seat: number; name: string; kills: number };
  result?: {
    winner: number;
    winnerName: string | null;
    place: number;
    kills: number;
    damage: number;
  };
  /** Vehicles that changed or came into range (vehicle-renderer.ts rows), and those that left. */
  vehicles?: { rows: number[][]; gone: number[] };
  /** The vehicle you drive. */
  driving?: number;
  /** Announced supply drops: [id, x, z, ground, at, landAt]. */
  drops?: number[][];
  /** Doors: every open id on the first view, then changes (id · 2 + open). */
  doors?: { open?: number[]; changes?: number[] };
  /** Broken window panes (panes.ts ids): all of them on the first view, then the new ones. */
  panes?: { broken: number[]; fresh?: boolean };
};

export type BrPrompt = {
  /**
   * What E does: pick an item up, get into a vehicle, get out, open or close a door, take the
   * zip-line at Iron Peaks, get on a ladder.
   */
  kind?: "item" | "enter" | "exit" | "door" | "zip" | "ladder" | "lift";
  id: number;
  name: string;
  rarity: string;
  color: string;
  detail: string;
};
export type BrHud = {
  phase: BrPhase;
  myPhase: DropPhase;
  /** On the Iron Peaks climbing rope (myPhase "ladder"). */
  onRope?: boolean;
  /** Which zip-line you are riding (myPhase "zip"; zipline.ts ZIPLINES). */
  zipLine?: number;
  /** Riding a lift (myPhase "lift"): the floor passing, where it is going, which way. */
  lift?: { at: string; to: string; up: boolean } | null;
  /** Under the canopy: height above the ground below (m) and airspeed (km/h), for the gauges. */
  canopy: { agl: number; kmh: number } | null;
  /** Seconds until take-off (starting) or until the jump window opens / the plane ejects you. */
  countdown: number | null;
  jumpOpen: boolean;
  aboard: number;
  /** Before take-off: real players in this match (the other seats are bots). */
  humans: number | null;
  altitude: number;
  agl: number;
  speedKmh: number;
  visible: number;
  kit: BrKitView | null;
  /** Rounds in the magazine (predicted between server updates). */
  mag: number | null;
  /** Aim-down-sights amount 0..1, and the full-screen scope while it is up. */
  aim: number;
  scope: { zoom: number; reticle: OpticDef["reticle"] | "awp" } | null;
  /** 0..1 progress of the reload or heal in hand, with its remaining seconds. */
  reload: { progress: number; left: number } | null;
  heal: { item: string; progress: number; left: number } | null;
  prompt: BrPrompt | null;
  /** The player is on foot and may act (inventory, pickups). */
  onFoot: boolean;
  /** Grenade in hand (key 4; left mouse overhand, right mouse underhand). */
  nade: "he" | "smoke" | "fire" | null;
  alive: number | null;
  zone: (BrZoneView & { hurt?: number; left: number | null; outside: boolean }) | null;
  /** Position and facing for the minimap (world metres; yaw radians). */
  me: { x: number; z: number; yaw: number };
  watch: BrView["watch"] | null;
  result: BrView["result"] | null;
  vehicle: {
    name: string;
    kmh: number;
    /** Top speed (km/h), for the speedometer's arc. */
    top: number;
    /** Which vehicle (the key hints show again for each one you get into). */
    id: number;
    health: number;
    max: number;
    bike: boolean;
    /** Tyres shot out. */
    flats: number;
  } | null;
  /** Supply drops for the map: position and whether still falling. */
  drops: Array<{ x: number; z: number; falling: boolean }>;
  /**
   * The on-screen supply drop alert: a crate about to appear (`incoming`, seconds until its
   * fall starts), falling (seconds until it lands) or just landed; where (map grid) and how far.
   */
  airdrop: {
    stage: "incoming" | "falling" | "landed";
    seconds: number;
    grid: string;
    dist: number;
  } | null;
  /** The waypoint: distance (m) and bearing from the view (radians, clockwise). */
  waypoint: { dist: number; angle: number } | null;
  /** Items within reach (nearest first; only while the inventory is open). */
  nearby: BrNearby[];
  /** Compass heading of the view (radians, 0 north, clockwise). */
  heading: number;
};
export type BrKillWeapon =
  | "ak"
  | "m4"
  | "awp"
  | "hunting"
  | "mp5"
  | "deagle"
  | "spas12"
  | "knife"
  | "he"
  | "fire"
  | "gas"
  | "vehicle"
  | "fall";
/** An item within reach, for the inventory's nearby list. */
export type BrNearby = {
  id: number;
  item: ItemId;
  name: string;
  detail: string;
  color: string;
  rarity: string;
  category: string;
  qty: number;
  dist: number;
};
export type BrMapState = {
  me: { x: number; z: number; yaw: number; phase: DropPhase };
  zone: {
    x: number;
    z: number;
    r: number;
    nx: number;
    nz: number;
    nr: number;
    phase: number;
    of: number;
    shrinking: boolean;
    left: number | null;
  } | null;
  plane: { a: [number, number]; b: [number, number] } | null;
  drops: Array<{ x: number; z: number; falling: boolean }>;
  waypoint: [number, number] | null;
};
export type BrFeed =
  | { kind: "toast"; text: string; tone: "ok" | "warn" }
  | { kind: "hit"; head: boolean; kill: boolean }
  | { kind: "hurt"; from: number }
  | {
      kind: "kill";
      text: string;
      mine: boolean;
      /** Structured row (null killer: the gas). */
      killer: string | null;
      victim: string;
      weapon: BrKillWeapon;
      self: boolean;
    }
  | { kind: "eliminated"; by: string };

export type BrArenaControls = {
  ready: Promise<void>;
  /** A small top-down picture of the island (data URL) for the minimap, once loaded. */
  mapImage(): string | null;
  /**
   * Your operator for the inventory's equipment panel, as you are kitted out now (helmet, vest,
   * backpack, the gun in hand with its attachments, or the Karambit): a PNG data URL, refreshed
   * while the inventory is open; null until it is ready.
   */
  operatorFigure(): string | null;
  /** The tactical map's base picture (tactical-map.ts), finished on first use. */
  tacticalMap(): HTMLCanvasElement | null;
  /** What the tactical map draws over its picture, at this instant (no React state). */
  mapState(): BrMapState;
  /** The player's waypoint (world metres), or null to clear it. */
  setWaypoint(p: [number, number] | null): void;
  /** Take the pointer back after an overlay closes (from a key or click: a user gesture). */
  relock(): void;
  snapshot(view: BrView): void;
  /** Combat events sent ahead of the next snapshot (`br-fast`: your hits, hits on you). */
  fast(combat: NonNullable<BrView["combat"]>): void;
  setSender(send: ((message: string) => void) | null): void;
  onHud(listener: (hud: BrHud) => void): void;
  onFeed(listener: (event: BrFeed) => void): void;
  setSensitivity(value: number): void;
  /** Rebound keys (br-settings.ts). */
  setBinds(binds: BrBinds): void;
  /** View distance in metres: fog, far scenery, building detail, ground textures (br-settings.ts). */
  setViewDistance(metres: number): void;
  setVolume(value: number): void;
  setScenePresented(presented: boolean): void;
  /** Inventory screen open: the cursor is free and the gun is lowered (movement continues). */
  setInventoryOpen(open: boolean): void;
  /** Send an inventory action (equip, drop, heal…) to the server. */
  act(action: BrAct): void;
  /** The predicted local body and unacknowledged inputs (tests and the dev overlay). */
  debug(): {
    body: DropBody;
    /** Where the camera is (headless checks of the chase camera), and where your body is drawn. */
    camera: [number, number, number];
    shown: [number, number, number];
    pending: number;
    loot: number;
    geometries: number;
    textures: number;
    programs: number;
    /** Hardware tier this arena was created with, why, and the GPU's name (quality-tier.ts). */
    tier: string;
    tierReason: string;
    gpu: string;
    visibleRemotes: number;
    fullActors: number;
    standIns: number;
    renderer: unknown;
    /** The view camera and your own character's root (diagnostics). */
    view?: { camera: unknown; me: unknown; zipBlend: number; ropeBlend: number };
    scene: unknown;
  };
  /** Point the camera (headless checks). */
  look(yaw: number, pitch: number): void;
  /** Tears everything down; returns the renderer's geometry/texture counts left after it. */
  dispose(): { geometries: number; textures: number };
};

/**
 * Ambience: measured every AMBIENCE_MS over a 5 × 5 grid AMBIENCE_STEP metres apart (an 80 m
 * square of land cover); the snowfall fades in as the ground climbs from the mountain's upper
 * slopes to the snow line (terrain.ts paints snow from 395 m).
 */
const AMBIENCE_MS = 250;
/** The waves' sound: full within SHORE_NEAR_M of the water, gone at SHORE_FAR_M (15 yards). */
const SHORE_NEAR_M = 2;
const SHORE_FAR_M = 13.7;
const AMBIENCE_STEP = 20;
const SNOW_AMBIENCE = [320, 390] as const;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** First person under the canopy: the canopy sits this much higher (its lines above the view). */
const FP_LIFT = 1;
/** Full animated characters for the nearest players; the rest are cheap stand-ins (PLAN §7). */
const CHARACTERS = 16;
const MAX_PLAYERS = 100;
const BASE_FOV = 75;

function detailOf(item: {
  item: ItemId;
  qty: number;
  durability?: number;
  mag?: number;
  extMag?: ItemId | null;
}) {
  const d = ITEMS[item.item];
  switch (d.category) {
    case "weapon":
      return `${d.short} · ${item.mag ?? 0}/${magSize({ item: item.item as WeaponId, extMag: item.extMag ?? null })}`;
    case "ammo":
    case "heal":
    case "grenade":
      return `${d.short} · ×${item.qty}`;
    case "helmet":
    case "vest":
      return `Level ${d.level} · ${Math.round(item.durability ?? d.durability)}/${d.durability}`;
    case "plate":
      return `Durability ${Math.round(item.durability ?? d.durability)}/${d.durability}`;
    case "backpack":
      return `${d.slots} slots`;
    default:
      return d.short;
  }
}

/** A 256 px top-down map of the island from the heightfield (land shaded by height, water). */
function drawMap(island: IslandScene) {
  const N = 256;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  const img = g.createImageData(N, N),
    px = img.data;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const x = -WORLD_HALF + ((i + 0.5) / N) * 2 * WORLD_HALF,
        zz = -WORLD_HALF + ((j + 0.5) / N) * 2 * WORLD_HALF;
      const h = island.hf.heightAt(x, zz);
      const o = (j * N + i) * 4;
      const k = Math.min(1, h / 260),
        land = h >= 0.5;
      px[o] = land ? 92 + k * 70 : 38;
      px[o + 1] = land ? 112 + k * 50 : 72;
      px[o + 2] = land ? 70 + k * 60 : 98;
      px[o + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  g.strokeStyle = "rgba(220,214,190,0.55)";
  g.lineWidth = 1;
  for (const r of island.meta.roads) {
    if (!r.points.length) continue;
    g.beginPath();
    r.points.forEach(([x, zz], i) => {
      const px = ((x + WORLD_HALF) / (2 * WORLD_HALF)) * N,
        pz = ((zz + WORLD_HALF) / (2 * WORLD_HALF)) * N;
      if (i) g.lineTo(px, pz);
      else g.moveTo(px, pz);
    });
    g.stroke();
  }
  return c.toDataURL("image/png");
}

/** GPU time per frame (ms) from which slow frames are taken to be the GPU's (60 fps: 16.7). */
const GPU_BUSY_MS = 10;

export function createBrArena(
  host: HTMLElement,
  base: string,
  progress: (value: number, label: string) => void,
): BrArenaControls {
  // A 14 km world and a 10 cm near plane exhaust ordinary depth precision at aerial distances.
  // Logarithmic depth on the canvas by default. Opt-in (scene-target.ts): reversed-Z into a
  // float depth target, which keeps the GPU's early depth test (it also changes the far haze).
  const reversedDepth = wantReversedDepth(reversedDepthOptIn());
  // The hardware tier decides what cannot change later: canvas MSAA and texture sizes
  // (quality-tier.ts). Nothing that hides or reveals a player depends on it.
  const tier = detectBrTier();
  // F3: which graphics mode and GPU this is (the first question when the picture looks coarse).
  const tierNote = `graphics ${tier.tier === "low" ? "performance" : tier.tier === "balanced" ? "balanced" : "high"} (${tier.reason})\n${gpuLabel(tier.gpu) || "gpu unknown"}`;
  const renderer = new THREE.WebGLRenderer({
    antialias: !reversedDepth && tier.tier !== "low",
    powerPreference: "high-performance",
    reversedDepthBuffer: reversedDepth,
    logarithmicDepthBuffer: !reversedDepth,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  setTextureQuality(renderer, tier.tier);
  const sceneTarget = renderer.capabilities.reversedDepthBuffer
    ? createSceneTarget(renderer, tier.tier === "low" ? 0 : 4)
    : null;
  // Sharpening over the finished scene (sharpen.ts). Not on the low tier, where a fullscreen
  // pass is not free, and not with the offscreen scene target (its own present pass).
  const sharpen =
    !sceneTarget && tier.tier !== "low" && sharpenWanted() ? createSharpen(renderer) : null;
  const sharpenScene = () =>
    sharpen?.apply(brResolutionScale(budget.scale) < 1 ? SHARPEN.scaledStrength : SHARPEN.strength);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(renderer.domElement);
  const budget = new RenderBudget();
  /** When the match left the lobby (frame clock), for the budget's warm-up; null in the lobby. */
  let playingSince: number | null = null;
  /** For the next session's tier: time played, and time at the budget's floor (ms). */
  let playedMs = 0,
    floorMs = 0;
  const gpu = new GpuTimer(renderer.getContext() as WebGL2RenderingContext);
  const overlay = new DevOverlay(host, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 14000);
  scene.add(new THREE.HemisphereLight(0xc9dcf0, 0x5a5040, 1.15));
  // The sun (sun.ts): the light, the sky and the water's mirror image all follow it.
  const sunNow = sunLook();
  const sun = new THREE.DirectionalLight(sunNow.light, sunNow.intensity);
  sun.position.copy(sunNow.direction).multiplyScalar(1000);
  scene.add(sun);
  // Gradient sky and distant ranges; the fog fades the island into the same horizon haze.
  const atmosphere = createAtmosphere(sunNow);
  scene.add(atmosphere.root);
  scene.background = atmosphere.haze;
  scene.fog = new THREE.Fog(atmosphere.haze, 1800, 9500);
  // As in 1v1/5v5, do not repeat a whole-scene walk in every render pass.
  scene.updateMatrixWorld(true);
  scene.matrixWorldAutoUpdate = false;
  const context = watchContextLoss(renderer, { scene, camera, onRestored: () => gpu.reset() });
  const audio = createBrAudio(base);
  const strides = new BrStrides();

  const resize = () => {
    const w = host.clientWidth || innerWidth,
      h = host.clientHeight || innerHeight;
    const scale = brResolutionScale(budget.scale);
    renderer.setPixelRatio(tierPixelRatio(tier.tier, w, h, devicePixelRatio, scale));
    renderer.setSize(w, h, false);
    sceneTarget?.resize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  // ------------------------------------------------------------------ state
  let island: IslandScene | null = null;
  let loot: LootClient | null = null;
  let viewmodel: ReturnType<typeof createBrViewmodel> | null = null;
  /** The attachment pack (other players' guns; the viewmodel loads the same file). */
  let attachmentParts: AttachmentParts | null = null;
  let vehiclesFx: ReturnType<typeof createVehicleRenderer> | null = null;
  let doorsFx: ReturnType<typeof createDoorRenderer> | null = null;
  /** The zip-line (zipline-renderer.ts) and its landing platform's top. */
  let zipFx: ReturnType<typeof createZiplineRenderer> | null = null;
  /** The lifts drawn: cabs, doors, call panels and displays (lift-renderer.ts). */
  let liftFx: ReturnType<typeof createLiftRenderer> | null = null;
  /** The lift you can take from where you stand (its id and your stop), for its doors. */
  let liftNear: { id: number; stop: number } | null = null;
  /** The breakable panorama glass (pane-renderer.ts; its broken flags feed the physics view). */
  let paneFx: ReturnType<typeof createPaneRenderer> | null = null;
  let trackFx: ReturnType<typeof createTrackerRenderer> | null = null;
  let zipLandY = 0;
  /**
   * The zip-line camera: 0 first person … 1 the elevated follow view (eased in on taking hold,
   * out after the landing), its damped offset from the rider, and the ride's start (client).
   */
  let zipBlend = 0;
  let zipCamSet = false;
  const zipCam = new THREE.Vector3();
  let zipRiding = false;
  /** The ride's clock as drawn (ms; -1 off the line). */
  let zipShownMs = -1;
  /** Where your body was drawn this frame (debug). */
  const shown = new THREE.Vector3();
  /** The Iron Peaks climbing rope (rope-renderer.ts). */
  let ropeFx: ReturnType<typeof createRopeRenderer> | null = null;
  const ropeClimbers: RopeClimberView[] = [];
  /**
   * The rope's third-person camera (owner's spec §4): 0 first person … 1 the orbit view (eased in
   * on taking hold, out once off the rope), its damped offset from the climber, and the view as
   * first person had it (blended from).
   */
  let ropeBlend = 0;
  let ropeCamSet = false;
  const ropeCam = new THREE.Vector3();
  const ropeFpPos = new THREE.Vector3();
  const ropeFpQ = new THREE.Quaternion();
  const ropeUp = new THREE.Quaternion();
  const ropePivot = new THREE.Vector3();
  /** When you took hold of a ladder (ms; 0 off it). */
  let ladderAt = 0;
  /** First person on a ladder: the head leaned back off the rungs (m), and which way. */
  let ladderLean = 0;
  let ladderLeanYaw = 0;
  /** The last rung each climber passed (seat; -1 you), for the steps' sound. */
  const rungSeen = new Map<number, number>();
  /** When each climber's hand last took the rope (ms): the grab's level follows the pace. */
  const ropeGrabAt = new Map<number, number>();
  let zipStartedAt = 0;
  let zipPrevSpeed = 0;
  const zipSwing = { angle: 0, rate: 0 };
  const zipPoseMe = {} as ZipPose;
  const zipPoseOther = {} as ZipPose;
  /** Others' rides seen on the deck (seat → client time first seen), for the reach and pull. */
  const zipSeen = new Map<number, number>();
  const zipRiders: ZipRiderView[] = [];
  const zipEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const zipLocal = new THREE.Vector3();
  const zipFpPos = new THREE.Vector3();
  const zipFpQ = new THREE.Quaternion();
  /** Door states as the server sent them, and the island with them closed (prediction, rays). */
  let doorOpen = new Uint8Array(0);
  /**
   * Doors this player has just used, open or shut here before the server says so (owner,
   * 2026-11-10: "opening doors sometimes pushes the character"). The door used to stay shut
   * in the prediction for a round trip, the body stopped against it, and when the server's
   * door arrived the replayed inputs carried it through in one lunge. The use request reaches
   * the server ahead of every later input, so opening it here at once is what the server
   * will do; `seq` is the last input sent before it (those are replayed with the door as it
   * was), `id` −1 a request nothing was guessed for.
   */
  const doorGuesses: Array<{ id: number; was: number; seq: number; at: number }> = [];
  const setDoorHere = (id: number, open: number) =>
    doorsFx?.apply({ changes: [id * 2 + open] }, doorOpen);
  let solidView: StaticWorld | null = null;
  const solid = () => solidView ?? island!.island.solid;
  /** The vehicle you drive, predicted like your body (vehicles.ts runs here too). */
  let car: Vehicle | null = null;
  const nadeFx = createNadeRenderer(scene, (cue, at) => audio.grenade(cue, at));
  // A landed supply crate's green marker smoke, until someone takes from it (airdrop-smoke.ts).
  const dropSmoke = createAirdropSmoke(scene);
  /** Grenade in hand: key 4 draws one (again: the next type carried); 1/2 back to the guns. */
  let nadeHand: "he" | "smoke" | "fire" | null = null;
  let send: ((message: string) => void) | null = null;
  let hudListener: ((hud: BrHud) => void) | null = null;
  let feedListener: ((event: BrFeed) => void) | null = null;
  const feed = (e: BrFeed) => feedListener?.(e);
  let latest: BrView | null = null;
  let route: Route | null = null;
  let kit: BrKitView | null = null;
  let mySeat = -1;
  const body: DropBody = newDropBody();
  const aimRecoil = new BrAimRecoil();
  let seq = 0;
  const pending: Array<{ seq: number; input: DropInput; clock: number }> = [];
  /** Visual offset after a correction, decayed toward zero (no camera pops). */
  const correction = new THREE.Vector3();
  /** Where you and your vehicle are drawn this frame, between the 30 Hz steps (frame-view.ts). */
  const frameView = new BrFrameView();
  const vehicleView = new BrVehicleView();
  /** The movement keys held now, for the frame view: no key edges are consumed. */
  const heldInput: DropInput = { forward: 0, strafe: 0, yaw: 0 };
  /** Eye height, eased (a crouch does not snap the camera 65 cm in one frame). */
  let eyeHeight = 1.6;
  /** Other players' rows per snapshot, stamped with the snapshot's server time (lag.ts). */
  const buffer: Array<{ at: number; rows: Map<number, number[]> }> = [];
  const remoteTimeline = new BrRemoteTimeline();
  const heldRows = new HeldRows();
  let yaw = 0,
    pitch = 0,
    sensitivity = 0.0022,
    lookX = 0,
    lookY = 0;
  const keys = new Set<string>();
  const edges = new Set<string>();
  let binds: BrBinds = defaultBinds();
  /**
   * The view distance's ground-texture range, shortened on slow frames but never off (owner,
   * 2026-11-09: with the range at 0 the whole ground and the airfield asphalt fell back to the
   * blurry aerial albedo for the rest of the match).
   */
  /**
   * In the plane, in free fall or under the canopy. The lite ground shading is never the
   * budget's choice there (owner, 2026-11-11: "still blurry … at 500 meters, it only gets
   * crispy when the character has landed"): lite drops exactly the detail the ground has from
   * the air, and the budget's first step turned it on whenever a few frames of the drop ran
   * late (the whole island streaming in), for the rest of the descent. The near textures it
   * exists to save are not on screen from the air anyway.
   */
  let aloft = false;
  let groundLite = false;
  function applyGroundRange() {
    island?.setGroundRange(budget.scale >= 0.8 ? view.ground : Math.min(80, view.ground));
    groundLite = tier.tier === "low" || (budget.scale < 1 && !aloft);
    island?.setGroundLite(groundLite);
    // Ground grass (grass.ts): by the graphics tier only. It is part of the map: never cut
    // back when the frame budget steps down (owner, 2026-11-13).
    island?.setGrassRange(GRASS_RANGE[tier.tier]);
  }
  let view = viewParams(VIEW_RANGE.default);
  /** 0 on the ground, 1 in the air: how far the fog has opened up (see the frame loop). */
  let airClear = 0;
  /** Trees and building detail follow the slider once it rests (each change rebuilds far trees). */
  let viewTimer: ReturnType<typeof setTimeout> | undefined;
  /** A click always fires at least once, even if released between two frames. */
  // Grenade handling as in 1v1/5v5: hold to pull the pin, release to throw (left overhand,
  // right underhand, both medium); the throw goes to the server when it leaves the hand.
  const nadeHands = new LocalGrenadeHands();
  const nadeButtons = { left: false, right: false, tapLeft: false, tapRight: false };
  function putAwayNade() {
    nadeHand = null;
    nadeHands.clear();
  }
  let fireTapped = false,
    predictTap = false,
    // A right click with the Karambit out: a stab even if the button is up before the next
    // sample or frame (like fireTapped/predictTap for the left button).
    stabTapped = false,
    predictStab = false;
  let fireHeld = false,
    aimHeld = false,
    inventoryOpen = false;
  let disposed = false;
  let scenePresented = false;
  /**
   * The SPAS-12's shell-by-shell reload on this client: whether the gun was empty when it
   * started, the stage (by its `reloadUntil`) whose sound has played, and when a reload was
   * cut short (ms, frame clock).
   */
  const shellReload = { empty: false, cueFor: 0, brokenAt: -Infinity };
  /** Own shots predicted since the last loadout from the server. */
  let predictedShots = 0,
    lastShotAt = -1e9;
  /** The AWP's own scope was up last frame (its zoom clicks). */
  let awpScopeUp = false;
  /** Local Karambit swing presentation, gated like the server (draw time, shared cooldown). */
  let knifeReadyAt = 0;
  let prompt: BrPrompt | null = null;

  /**
   * The server's clock (ms), for our own timers (reload, draw, heal, grenades). It was re-anchored
   * to each snapshot's arrival, 15 times a second: every late or early packet moved it back or
   * forward by the network's jitter, and the reload clips (driven by it) stepped and stuttered
   * (owner, 2026-11-11: "reload animation is laggy compared to 1v1/5v5"). The least-delayed
   * snapshot of the last 5 s sets it instead (as the 1v1/5v5 clock settles on a smoothed offset),
   * and it never runs backwards.
   */
  const ownClock = new SnapshotClock();
  let clockFloor = -Infinity;
  const serverClock = () => (clockFloor = Math.max(clockFloor, ownClock.now(performance.now())));

  // ------------------------------------------------------------------ meshes
  const plane = new THREE.Group();
  plane.visible = false;
  scene.add(plane);
  const stand = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.35, 1.1, 4, 8).translate(0, 0.9, 0),
    new THREE.MeshStandardMaterial({ color: 0x3d4a3a, roughness: 0.9 }),
    MAX_PLAYERS,
  );
  stand.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  stand.count = 0;
  stand.frustumCulled = false;
  scene.add(stand);
  /** Supply drops keep the round cargo canopy; players fly the ram-air wing (canopy.ts). */
  let chuteTemplate: THREE.Object3D | null = null;
  let crateTemplate: THREE.Object3D | null = null;
  /** Your own canopy, those of the nearest others (full) and the rest (one instanced draw). */
  let myCanopy: Canopy | null = null;
  let wingTemplate: Parameters<typeof createCanopy>[0] | null = null;
  const canopyPool: Canopy[] = [];
  let farCanopies: ReturnType<typeof createFarCanopies> | null = null;
  /**
   * Each flier's canopy, read from their synced motion: when it began to open and when they
   * landed (for the deploy and collapse animations), heading, turn rate and sink rate (steering,
   * bank and dive), and where they landed (the collapse stays there).
   */
  type ChuteTrack = {
    x: number;
    y: number;
    z: number;
    h: number;
    turn: number;
    sink: number;
    since: number;
    landedAt: number;
    flying: boolean;
    /** The pilot-and-wing pendulum (as your own: dive forward, flare back). */
    swing: Swing;
    /** Bank into turns (system roll), smoothed. */
    roll: number;
  };
  /** Supply crates (airdrops.ts): the crate and its canopy while it falls. */
  const crates = new Map<number, { crate: THREE.Object3D; chute: THREE.Object3D | null }>();
  const chuteTrack = new Map<number, ChuteTrack>();
  /** Full canopies drawn for others (the nearest fliers and fresh landings), at most. */
  const NEAR_CANOPIES = 12;
  // The 1v1/5v5 operators (police "A", terrorist "B"), pooled as in the 5v5 renderer.
  const weaponKit = createWeaponKit();
  const plain = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.8 });
  const actors = Array.from({ length: CHARACTERS }, (_, i) => {
    const a = createCharacter(i % 2 ? "B" : "A", plain, weaponKit, {
      worldRifle: true,
      bothRifles: true,
      // Helmets are loot in the battle royale: the officer's own one is left off.
      bareHead: true,
    });
    a.root.visible = false;
    scene.add(a.root);
    return { actor: a, seat: -1, deadAt: 0 };
  });
  // Your own operator, seen from behind in freefall (and under the canopy in the third-person
  // view, V); first person on foot and, by default, under the canopy.
  const me = createCharacter("A", plain, weaponKit, { worldRifle: true, bareHead: true });
  // The inventory's picture of you (operator-figure.ts): its own officer, never in the world.
  const figureActor = createCharacter("A", plain, weaponKit, {
    worldRifle: true,
    bothRifles: true,
    bareHead: true,
  });
  // The shader warm-up's stand-ins for the worn gear and the gun attachments (see "Preparing
  // shaders"). Their materials are the templates' own, which outlive the arena.
  const warmGear = new THREE.Group(),
    warmParts = new THREE.Group();
  let figure: ReturnType<typeof createOperatorFigure> | null = null,
    figureUrl: string | null = null,
    figureKey = "",
    figureOpenedAt = 0,
    figureSecond = -1;
  function poseFigure(
    gear: number,
    primary: "ak47" | "m4" | "awp" | "hunting" | "mp5" | "deagle" | "spas12" | "none",
    optic: ItemId | null,
    muzzle: ItemId | null,
  ) {
    // Settled at the ready (the same pose as the old picture), the knife when no gun.
    for (let i = 0; i < 40; i++)
      figureActor.update(16, 10_000 + i * 16, 0, true, false, {
        primary,
        weapon: primary === "none" ? "knife" : "rifle",
      });
    fitCharacterGun(figureActor, attachmentParts, optic, muzzle);
    fitCharacterGear(figureActor, gear);
    figureActor.root.updateMatrixWorld(true);
  }
  /** Pose the figure as the kit is: what is worn, and the gun in hand (or the Karambit). */
  function figureState(k: BrKitView) {
    const level = (id: string | null | undefined) =>
      id ? Math.min(3, (ITEMS[id as ItemId] as { level?: number } | undefined)?.level ?? 0) : 0;
    const gear = level(k.helmet?.item) + 4 * level(k.vest?.item) + 16 * level(k.backpack);
    const gun =
      (k.active >= 0 ? k.guns[k.active] : null) ?? k.guns[0] ?? k.guns[1] ?? k.guns[2] ?? null;
    return { gear, gun };
  }
  me.root.visible = false;
  scene.add(me.root);
  // First-person canopy (owner's parachute spec §5): gloved hands on the steering toggles,
  // risers up to the canopy, following the canopy's heading (right-drag looks around freely);
  // the hand on the side you turn pulls down. Cheap boxes and lines, built once.
  const harness = new THREE.Group();
  harness.visible = false;
  scene.add(harness);
  const glove = new THREE.MeshLambertMaterial({ color: 0x2a2c2f }),
    sleeve = new THREE.MeshLambertMaterial({ color: 0x4b5340 }),
    toggleMat = new THREE.MeshLambertMaterial({ color: 0xd9b23a });
  const handRig = [-1, 1].map((side) => {
    const g = new THREE.Group();
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.07), glove);
    const toggle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), toggleMat);
    toggle.position.y = 0.055;
    g.add(hand, toggle);
    harness.add(g);
    // The forearm: a thin sleeve from the shoulder up to the hand (re-aimed every frame).
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 1, 6), sleeve);
    harness.add(arm);
    return { side, g, arm };
  });
  const armFrom = new THREE.Vector3(),
    armTo = new THREE.Vector3(),
    armDir = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0);
  const riserPos = new Float32Array(4 * 3);
  const risers = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(riserPos, 3)),
    new THREE.LineBasicMaterial({ color: 0xd8d4c8, transparent: true, opacity: 0.85 }),
  );
  risers.frustumCulled = false;
  harness.add(risers);
  /**
   * Canopy camera: behind and above (default, PUBG-style: you, the whole canopy and the ground
   * below) or first person (V); bank and landing dip, smoothed. Your canopy's deploy and landing
   * times drive its animations.
   */
  let myDeployAt = -1,
    myHeading = 0,
    diveEase = 0,
    myLanded: { at: number; x: number; y: number; z: number; h: number } | null = null;
  /** The pilot-and-wing pendulum (dive swing forward, flare and brake swing back). */
  const mySwing: Swing = { angle: 0, rate: 0 };
  const canopyLook = new CanopyLook();
  const chuteHarness = new THREE.Vector3();
  let previousCanopyHeading: number | null = null;
  const flightHeading = () =>
    Math.hypot(body.vx, body.vz) > 0.5 ? Math.atan2(-body.vx, -body.vz) : yaw;
  const syncCanopyLook = () => canopyLook.sync(body.phase === "parachute", flightHeading(), pitch);
  /** The chase camera's offset from the pilot (damped). */
  const chaseCam = new THREE.Vector3();
  let chaseCamSet = false;
  let chuteFirstPerson = false,
    bank = 0,
    chutePitch = 0,
    wasAirborne = false,
    landedAt = -1e9,
    pull = 0;
  // The zone: the gas wall at the current circle. (The next circle is on the map and the
  // minimap only: drawn in the world it was a flat ring at your height, a long white line through
  // the trees and the hills, owner 2026-11-11.)
  const wallMat = new THREE.MeshBasicMaterial({
    color: 0xd9663d,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
    // One pass for both sides (see blended-once.ts): two passes cost a program lookup each.
    forceSinglePass: true,
  });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 128, 1, true), wallMat);
  wall.visible = false;
  wall.frustumCulled = false;
  scene.add(wall);
  // The waypoint (set on the tactical map): a tall light beam where it stands in the world.
  let waypoint: [number, number] | null = null;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 1, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd34d,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
    }),
  );
  beam.visible = false;
  beam.frustumCulled = false;
  scene.add(beam);
  // The tactical map's base picture, built in slices once the island is loaded (tactical-map.ts).
  let mapBuild: ReturnType<typeof tacticalMapBuilder> | null = null,
    mapDone = false;
  function buildMapSlice(deadline: number) {
    if (!mapBuild || mapDone) return;
    // The terrain is drawn by a worker (tactical-map.ts); frames only poll for it. Where no
    // worker runs, or the map is opened before it is ready (no deadline), it is rasterised
    // here two rows at a time (about a millisecond), so a slice keeps to its deadline.
    const wait = Number.isFinite(deadline);
    while (performance.now() < deadline) {
      if ((mapDone = mapBuild.step(wait ? 2 : 64, wait))) break;
      if (mapBuild.waiting()) break;
    }
    // The minimap takes the finished picture (the same terrain, roads and buildings). Encoded
    // off the frame: toDataURL draws everything still pending on both canvases, reads the
    // picture back and encodes it before it returns, one long frame early in every match.
    (mapDone ? mapBuild.minimap() : null)?.toBlob(
      (blob) => {
        if (!blob || disposed) return;
        mapUrl = mapBlobUrl = URL.createObjectURL(blob);
      },
      "image/jpeg",
      0.9,
    );
  }
  /** The zone now, between snapshots: the shrink is linear on the server clock (zone.ts). */
  let zoneSnapAt = 0;
  function zoneLive(server: number) {
    const z = latest?.zone;
    if (!z || body.phase === "plane") return null;
    if (!z.shrinking || z.until === null || z.until <= zoneSnapAt) return z;
    const k = Math.max(0, Math.min(1, (server - zoneSnapAt) / (z.until - zoneSnapAt)));
    return {
      ...z,
      x: z.x + (z.nx - z.x) * k,
      z: z.z + (z.nz - z.z) * k,
      r: z.r + (z.nr - z.r) * k,
    };
  }
  let mapUrl: string | null = null,
    mapBlobUrl: string | null = null;
  /** Facing per seat from the server; death times for the fall animation. */
  const deathAt = new Map<number, number>();
  /**
   * Another rider's time into their ride: from where they are on the cable (the views carry
   * positions, not ride clocks), or, still on the deck taking hold, from when we first saw it
   * (their taking-hold sound plays then, at them).
   */
  const othersZipMs = (seat: number, x: number, z: number, now: number) => {
    // Which line they are on (the nearest cable or start), and how far along it.
    const { line, ms: along } = zipRiderAt(x, z);
    othersZipLine = line;
    if (along !== null) {
      if (!zipSeen.has(seat)) zipSeen.set(seat, now - along);
      return along;
    }
    let seen = zipSeen.get(seat);
    if (seen === undefined) {
      seen = now;
      zipSeen.set(seat, now);
      audio.zipEnter([x, line.start.y - 2, z]);
    }
    return Math.min(line.T.ride, now - seen);
  };
  /** The line of the rider othersZipMs last looked at. */
  let othersZipLine: ZipLine = ZIPLINES[0]!;
  /** Each line's landing platform's top (zipline.ts landing). */
  let zipLandYs: number[] = [];

  const downloads = new AbortController();
  const ready = (async () => {
    const loaded = await loadIslandScene(base, progress, downloads.signal);
    if (disposed) {
      loaded.dispose();
      return;
    }
    island = loaded;
    scene.add(island.root);
    island.root.updateMatrixWorld(true);
    island.setViewDistance(view.trees, view.detail);
    applyGroundRange();
    loot = createLootRenderer(scene, island.loader, base);
    vehiclesFx = createVehicleRenderer(scene, island.loader, island.manifest, base);
    doorOpen = new Uint8Array(island.island.doors.doors.length);
    paneFx = createPaneRenderer(scene, island.island.panes);
    // The Tracker perk's footprints: one instanced draw, compiled now (never mid-fight).
    trackFx = createTrackerRenderer(scene);
    void renderer.compileAsync(trackFx.mesh, camera, scene).catch(() => {});
    solidView = withDoors(
      withPanes(island.island.solid, island.island.panes, paneFx.broken),
      island.island.doors,
      doorOpen,
    );
    doorsFx = createDoorRenderer(scene, island.island.doors, island.doorLook);
    zipFx = createZiplineRenderer(scene, (x, z) => island!.hf.heightAt(x, z));
    liftFx = createLiftRenderer(scene, island.loader, base, lifts(island.hf));
    ropeFx = createRopeRenderer(scene, island.hf);
    zipLandY = zipLanding((x, z) => island!.hf.heightAt(x, z)).y;
    zipLandYs = ZIPLINES.map((l) => l.landing((x, z) => island!.hf.heightAt(x, z)).y);
    mapUrl = drawMap(island);
    // Twice the detail where memory allows (houses legible zoomed in; the map view scales the
    // picture to MAP_SIZE, so the resolution is free to differ).
    mapBuild = tacticalMapBuilder(
      {
        hf: island.hf,
        cover: island.island.vegetation.cover,
        meta: island.meta,
        layout: island.island.layout,
        manifest: island.manifest,
      },
      tier.tier === "low" ? MAP_SIZE : MAP_SIZE * 2,
    );
    viewmodel = createBrViewmodel(renderer, island.loader, base);
    viewmodel.onGrenadeCue = (cue) => audio.grenade(cue);
    viewmodel.onKnifeCue = (cue) => audio.knifeCue(cue);
    // Both are waited for below (they catch their own failures): their materials are compiled
    // with everything else before "Ready".
    const attachmentsLoaded = loadAttachmentParts(
      island.loader,
      new URL("fps/br/models/attachments.glb", base).href,
    ).then((p) => (attachmentParts = p));
    // Worn helmets, vests and packs (CC BY models; the procedural pieces stand in until then).
    const gearLoaded = loadGearModels(island.loader, new URL("fps/br/models/gear.glb", base).href);
    const model = async (id: string) => {
      const m = island!.manifest.models[id];
      if (!m) return null;
      return (await island!.loader.loadAsync(m.lods[0]!.file)).scene;
    };
    progress(0.92, "Loading weapons");
    const [yc130, chute, crate, wing] = await Promise.all([
      model("yc130"),
      model("parachute"),
      model("airdrop-crate"),
      loadCanopy(island.loader, new URL("fps/br/models/canopy.glb", base).href).catch(() => null),
      loot.ready,
      viewmodel.ready,
      audio.prepare(),
      vehiclesFx.ready,
      attachmentsLoaded,
      gearLoaded,
      me.ready,
    ]);
    if (disposed) return;
    if (yc130) plane.add(yc130);
    chuteTemplate = chute;
    crateTemplate = crate;
    if (wing) {
      wingTemplate = wing;
      myCanopy = createCanopy(wing);
      myCanopy.root.visible = false;
      scene.add(myCanopy.root);
      farCanopies = createFarCanopies(wing, MAX_PLAYERS);
      scene.add(farCanopies.mesh);
    }
    progress(0.96, "Preparing shaders");
    camera.position.set(0, 900, 0);
    island.update(camera, true); // every LOD selected, so compileAsync sees every material
    // What is first put on later in a match joins the scene for the compile, hidden (compile
    // prepares hidden meshes too): the worn gear and the officer's hat, and the gun attachments.
    // Wearers and guns get clones, which share these materials. Left out, each stalled the frame
    // it first showed in (scripts/br/client-sim/programs.mjs lists what is built after Ready).
    warmGear.visible = warmParts.visible = false;
    for (const o of gearModelObjects()) warmGear.add(o.clone(true));
    for (const o of (await attachmentsLoaded).values()) warmParts.add(o.clone(true));
    scene.add(warmGear, warmParts);
    await renderer.compileAsync(scene, camera);
    scene.remove(warmGear, warmParts);
    if (disposed) return;
    // The inventory figure: its off-screen target needs its own shader variants.
    await figureActor.ready;
    if (disposed) return;
    figure = createOperatorFigure(renderer, figureActor.root);
    // Fully kitted for the compile (every piece visible: hidden ones are skipped).
    poseFigure(63, "m4", null, null);
    await figure.prepare();
    figureKey = "";
    if (disposed) return;
    // The Karambit hands are hidden until drawn: show them for this compile too.
    viewmodel.prepareCompile(true);
    // The attachments again under the view scene's lights (optics and muzzles on your own gun).
    viewmodel.viewScene.add(warmParts);
    const viewCompiled = renderer.compileAsync(viewmodel.viewScene, viewmodel.viewCamera);
    viewmodel.prepareCompile(false);
    await viewCompiled;
    viewmodel.viewScene.remove(warmParts);
    await viewmodel.prepareAttachments();
    if (disposed) return;
    // Link logs and uniform tables are read on a program's first draw otherwise (a stall on the
    // frame the first enemy, vehicle or explosion comes into view): read them all now.
    warmPrograms(renderer);
    progress(1, "Ready");
  })();

  // ------------------------------------------------------------------ input
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    if (down && e.isTrusted) audio.unlock();
    if (e.code === "F3" && down) {
      e.preventDefault();
      overlay.toggle();
      return;
    }
    if (e.code === "Tab" || e.code === binds.walk || e.code === "AltLeft") e.preventDefault();
    if (down && !keys.has(e.code)) {
      edges.add(e.code);
      // The hand changes at once (a click right after 4 throws, it never fires the gun).
      if (e.code === binds.camera && !inventoryOpen) chuteFirstPerson = !chuteFirstPerson;
      if (!inventoryOpen) {
        if (
          (e.code === binds.primary ||
            e.code === binds.secondary ||
            e.code === binds.pistol ||
            e.code === binds.knife) &&
          !nadeHands.busy
        )
          putAwayNade();
        if (e.code === binds.grenade) selectNade();
        // F: inspect the Karambit, or look the SPAS-12 over (cosmetic; the other guns and the
        // grenades have no inspection).
        if (e.code === binds.inspect && !e.repeat) {
          if (knifeDrawn()) viewmodel?.knifeInspect();
          else if (onFoot() && !car) viewmodel?.gunInspect(performance.now());
        }
      }
    }
    if (down) keys.add(e.code);
    else keys.delete(e.code);
  };
  const keyDown = onKey(true),
    keyUp = onKey(false);
  // Headless checks (scripts/br/client-sim) cannot take the pointer: they set this flag.
  const locked = () =>
    document.pointerLockElement === renderer.domElement ||
    (globalThis as { __brAssumeLock?: boolean }).__brAssumeLock === true;
  const onMouse = (e: MouseEvent) => {
    if (!locked() || inventoryOpen) return;
    syncCanopyLook();
    if (canopyLook.active) {
      canopyLook.mouse(e.movementX, e.movementY, sensitivity);
      return;
    }
    const scale = 1 / Math.max(1, currentZoom());
    // (No yaw wrap here: the island's prediction and the canopy camera follow yaw as it turns.)
    ({ yaw, pitch } = mouseLook(yaw, pitch, e.movementX, e.movementY, sensitivity * scale));
    lookX += e.movementX;
    lookY += e.movementY;
  };
  const onDown = (e: MouseEvent) => {
    if (!locked() || inventoryOpen) return;
    if (e.isTrusted) audio.unlock();
    syncCanopyLook();
    if (canopyLook.active) {
      if (e.button === 2) canopyLook.dragging = true;
      e.preventDefault();
      return;
    }
    if (nadeHand) {
      // Grenade in hand: the buttons throw (left overhand, right underhand, both medium).
      if (e.button === 0) nadeButtons.left = nadeButtons.tapLeft = true;
      if (e.button === 2) nadeButtons.right = nadeButtons.tapRight = true;
      return;
    }
    // Driving: the mouse steers the view only.
    if (car) return;
    if (e.button === 0) fireHeld = fireTapped = predictTap = true;
    if (e.button === 2) {
      aimHeld = true;
      if (knifeDrawn()) stabTapped = predictStab = true;
    }
  };
  const onUp = (e: MouseEvent) => {
    if (e.button === 2) canopyLook.release();
    if (e.button === 0) fireHeld = nadeButtons.left = false;
    if (e.button === 2) aimHeld = nadeButtons.right = false;
  };
  // The mouse wheel walks the hands through what is carried, as in 1v1/5v5 (owner,
  // 2026-11-11): the main guns, the pistol, the Karambit, then each grenade type held; wheel down
  // is the next one, up the one before. Bounded so a trackpad burst is one switch.
  let wheelSlot: 0 | 1 | 2 | 3 | undefined;
  let lastWheel = -Infinity;
  const onWheel = (e: WheelEvent) => {
    if (!locked() || inventoryOpen || !Number.isFinite(e.deltaY) || e.deltaY === 0) return;
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel < 150 || !kit || kit.dead || car || !onFoot() || nadeHands.busy) return;
    lastWheel = now;
    const order: Array<0 | 1 | 2 | 3 | "he" | "smoke" | "fire"> = [
      ...(kit.guns[0] ? ([0] as const) : []),
      ...(kit.guns[1] ? ([1] as const) : []),
      ...(kit.guns[2] ? ([3] as const) : []),
      2,
      ...(["he", "smoke", "fire"] as const).filter((t) =>
        kit!.bag.some((b) => b.item === `grenade-${t}` && b.qty > 0),
      ),
    ];
    // Where the hands are now (wire slots: 0 / 1 the main guns, 3 the pistol, 2 the Karambit).
    const here = nadeHand ?? (kit.active === -1 ? 2 : kit.active === 2 ? 3 : (kit.active as 0 | 1));
    const i = Math.max(0, order.indexOf(here));
    const next = order[(i + (e.deltaY < 0 ? -1 : 1) + order.length) % order.length]!;
    if (next === here) return;
    if (typeof next === "number") {
      putAwayNade();
      wheelSlot = next;
    } else {
      nadeHand = next;
      fireHeld = aimHeld = false;
      nadeHands.equip(next, now);
    }
  };
  const noMenu = (e: Event) => e.preventDefault();
  const lock = () => {
    audio.unlock();
    // Raw mouse deltas where the browser has them (no OS pointer acceleration), as in 1v1.
    if (!inventoryOpen) void capturePointer(renderer.domElement).catch(() => {});
  };
  const clearHeldControls = () => {
    canopyLook.release();
    keys.clear();
    edges.clear();
    fireHeld = fireTapped = predictTap = aimHeld = stabTapped = predictStab = false;
    nadeButtons.left = nadeButtons.right = nadeButtons.tapLeft = nadeButtons.tapRight = false;
    putAwayNade();
  };
  const onLockChange = () => {
    if (!locked()) clearHeldControls();
  };
  const onVisibility = () => {
    if (document.visibilityState !== "visible") clearHeldControls();
  };
  addEventListener("keydown", keyDown);
  addEventListener("keyup", keyUp);
  addEventListener("mousemove", onMouse);
  addEventListener("mousedown", onDown);
  addEventListener("mouseup", onUp);
  addEventListener("wheel", onWheel, { passive: false });
  addEventListener("blur", clearHeldControls);
  // A match in progress asks before the tab closes or reloads (a stray browser shortcut, the
  // close button): the browser shows its own "leave site?" prompt instead of dropping the match.
  const confirmLeave = (e: BeforeUnloadEvent) => {
    const phase = latest?.phase;
    if ((phase !== "plane" && phase !== "active") || kit?.dead) return;
    e.preventDefault();
    e.returnValue = "";
  };
  addEventListener("beforeunload", confirmLeave);
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("pointerlockchange", onLockChange);
  renderer.domElement.addEventListener("contextmenu", noMenu);
  renderer.domElement.addEventListener("click", lock);

  const activeGun = (): Gun | null =>
    kit && kit.active >= 0 && !kit.dead ? (kit.guns[kit.active] as Gun | null) : null;
  function currentZoom() {
    const g = activeGun();
    if (!g || !viewmodel || viewmodel.aim < 0.5) return 1;
    return g.optic
      ? (ITEMS[g.optic] as OpticDef).zoom
      : ((ITEMS[g.item] as WeaponDef).scope?.zoom ?? 1.1);
  }
  const onFoot = () => body.phase === "ground" || body.phase === "swim";
  /** On the climbing rope (a "ladder" whose climb is the rope's: ladders.ts). */
  const onRope = () =>
    body.phase === "ladder" && !!island && !!ladders(island.hf)[body.ladder?.id ?? -1]?.rope;
  const sendAct = (a: BrAct) => send?.(JSON.stringify({ v: 1, type: "br-act", ...a }));

  function selectNade() {
    if (!onFoot()) return;
    const carried = (["he", "smoke", "fire"] as const).filter((t) =>
      kit?.bag.some((b) => b.item === `grenade-${t}` && b.qty > 0),
    );
    if (nadeHands.busy) return; // mid-throw: the hand is not free
    const i = nadeHand ? carried.indexOf(nadeHand) : -1;
    nadeHand = carried.length ? carried[(i + 1) % carried.length]! : null;
    if (nadeHand) {
      fireHeld = aimHeld = false;
      nadeHands.equip(nadeHand, performance.now());
    } else nadeHands.clear();
    if (!carried.length) feed({ kind: "toast", text: "NO GRENADES", tone: "warn" });
  }

  /** The input for this 30 Hz step, from the keys and the camera direction. */
  function sample(): DropInput & {
    pitch: number;
    fire: boolean;
    aim: boolean;
    reload: boolean;
    slot?: 0 | 1 | 2 | 3;
  } {
    const f = Number(keys.has(binds.forward)) - Number(keys.has(binds.back)),
      s = Number(keys.has(binds.right)) - Number(keys.has(binds.left));
    syncCanopyLook();
    canopyLook.keyboard(flightHeading(), s !== 0);
    const edge = (code: string) => {
      const had = edges.has(code);
      edges.delete(code);
      return had;
    };
    // An overlay (inventory, map, tablet) is open: no discrete actions leak from the keys
    // (movement continues, as in PUBG: the match never pauses).
    if (inventoryOpen)
      for (const c of [
        binds.interact,
        binds.reload,
        binds.cancel,
        binds.primary,
        binds.secondary,
        binds.pistol,
        binds.knife,
        binds.bandage,
        binds.medkit,
      ])
        edges.delete(c);
    const space = edge(binds.jump);
    // Wire slots: 0 / 1 the main guns, 3 the pistol, 2 the Karambit.
    const wheeled = inventoryOpen ? undefined : wheelSlot;
    wheelSlot = undefined;
    const slot = edge(binds.primary)
      ? 0
      : edge(binds.secondary)
        ? 1
        : edge(binds.pistol)
          ? 3
          : edge(binds.knife)
            ? 2
            : wheeled;
    if (nadeHand) {
      const carried = () =>
        kit?.bag.reduce((n, b) => n + (b.item === `grenade-${nadeHand}` ? b.qty : 0), 0) ?? 0;
      if (!onFoot() || kit?.dead) putAwayNade();
      else {
        const t = performance.now();
        const step = nadeHands.step(
          nadeButtons.left || nadeButtons.tapLeft,
          nadeButtons.right || nadeButtons.tapRight,
          t,
          !body.grounded,
        );
        if (step === "spawn" && nadeHands.throwing)
          sendAct({ act: "throw", nade: nadeHand, kind: nadeHands.throwing.kind });
        // The next grenade of the type comes up after the throw, or the hand empties.
        if (step === "done") {
          if (carried() > 0) nadeHands.equip(nadeHand, t);
          else putAwayNade();
        } else if (!nadeHands.busy && carried() === 0) putAwayNade();
      }
    }
    nadeButtons.tapLeft = nadeButtons.tapRight = false;
    const reload = edge(binds.reload);
    // Discrete actions: E picks up what the prompt shows; 5 medkit, 6 bandage (hotbar).
    const interactPressed = edge(binds.interact);
    // On the climbing rope E lets go (stepping off within a stride of either end): the server
    // decides (ladders.ts ropeRelease).
    if (interactPressed && body.phase === "ladder" && onRope()) sendAct({ act: "ladder" });
    else if (interactPressed && prompt) {
      if (prompt.kind === "exit") sendAct({ act: "exit" });
      else if (prompt.kind === "enter") sendAct({ act: "enter", id: prompt.id });
      else if (prompt.kind === "zip") {
        // Once per press: the server validates and starts the ride (a held key does not repeat).
        if (onFoot() && body.phase === "ground") sendAct({ act: "zip" });
      } else if (prompt.kind === "ladder") {
        if (onFoot() && body.phase === "ground") sendAct({ act: "ladder" });
      } else if (prompt.kind === "lift") {
        // The server checks you stand in the cab or at its door and starts the ride.
        if (onFoot() && body.phase === "ground" && prompt.id >= 0)
          sendAct({ act: "lift", floor: prompt.id });
      } else if (prompt.kind === "door") {
        if (onFoot()) {
          const d = island?.island.doors.doors[prompt.id];
          const was = doorOpen[prompt.id] ?? 0;
          // (Shutting a door you stand in is refused by the server: nothing to guess.)
          const guess =
            !!d && !(was === 1 && hullOnDoor(d, body.x, body.y, body.z, eyeHeight + 0.2, 0.35));
          doorGuesses.push({ id: guess ? prompt.id : -1, was, seq, at: performance.now() });
          if (guess) setDoorHere(prompt.id, was ? 0 : 1);
          sendAct({ act: "door", id: prompt.id });
        }
      } else if (onFoot()) sendAct({ act: "pickup", id: prompt.id });
    }
    if (edge(binds.bandage) && onFoot()) sendAct({ act: "heal", item: "bandage" });
    if (edge(binds.medkit) && onFoot()) sendAct({ act: "heal", item: "medkit" });
    if (edge(binds.cancel) && kit?.heal) sendAct({ act: "cancel" });
    const armed = !inventoryOpen && locked();
    const tapped = fireTapped,
      stab = stabTapped;
    fireTapped = stabTapped = false;
    return {
      forward: f,
      strafe: s,
      yaw,
      pitch,
      jump: body.phase === "ground" && keys.has(binds.jump),
      crouch: keys.has(binds.crouch),
      sprint: keys.has(binds.sprint) && !aimHeld,
      walk: keys.has(binds.walk),
      // Space: leave the plane (the canopy opens at once); the dive key (Q) under it: dive.
      jumpOut: body.phase === "plane" && space,
      dive: body.phase === "parachute" && keys.has(binds.dive),
      ...(canopyLook.active ? { canopyYaw: canopyLook.course } : {}),
      // Never from the driver's seat (the server refuses it too; owner, 2026-11-11: shots and
      // tracers came out of a car while driving).
      fire: armed && (fireHeld || tapped) && onFoot() && !car,
      aim: armed && (aimHeld || stab) && body.phase === "ground" && !car,
      reload,
      ...(slot !== undefined ? { slot } : {}),
    };
  }

  /** The Karambit is in the hand: on foot, alive, no gun drawn, no grenade up, not driving. */
  function knifeDrawn() {
    return !!kit && !kit.dead && kit.active === -1 && onFoot() && !nadeHand && !car;
  }
  /** Our own swing at once (animation and sound); the server decides the hit, same gates. */
  function predictKnife(server: number, attack: "slash" | "stab") {
    if (!kit || !viewmodel || !knifeDrawn() || body.phase !== "ground") return;
    if (server < kit.drawUntil || server < knifeReadyAt) return;
    knifeReadyAt = server + KNIFE[attack].cooldownMs;
    viewmodel.knifeAttack(attack);
  }

  /** Predict our own shot for immediate sound, flash and kick (the server decides the hit). */
  function predictShot(now: number, server: number, pull: boolean) {
    const g = activeGun();
    if (!g || !kit || !viewmodel) return;
    const d = ITEMS[g.item] as WeaponDef;
    // Semi-automatic (the Deagle): one shot per press, as the server counts trigger pulls.
    if (d.semiAuto && !pull) return;
    const mag = g.mag - predictedShots;
    if (mag <= 0 || kit.heal || (kit.reloadUntil && server < kit.reloadUntil)) return;
    if (server < kit.drawUntil || now - lastShotAt < d.intervalMs) return;
    lastShotAt = now;
    predictedShots++;
    aimRecoil.shot(
      server,
      !!d.recoil,
      (g.muzzle ? (ITEMS[g.muzzle] as { recoilScale?: number }).recoilScale : 1) ?? 1,
      d.recoil ?? "rifle",
    );
    viewmodel.shot(now);
    audio.shot(d.model, g.muzzle === "silencer", null, d.hearM);
  }

  // ------------------------------------------------------------------ snapshots
  let aimed = false;
  /** When the last "being shot at" cue played (shot-awareness.ts). */
  let shotAtAt = -Infinity;
  /** When the ambience was last measured (ms, frame clock). */
  let ambienceAt = -Infinity;
  /** Last frame's position, for the swimming sound's stroke. */
  let swimFromX = 0,
    swimFromZ = 0;
  /** Who hit this player, and when (ms, local). */
  const hitMeAt = new Map<number, number>();
  function onCombat(view: BrView, now: number) {
    // Shooters that hit this player in this batch: their shots sound as damage, not near misses.
    // (A hit can arrive ahead of its shot now, in a `br-fast` message: remembered briefly.)
    const hitMeBy = new Set<number>();
    for (const e of view.combat ?? [])
      if (e.type === "hit" && e.victim === mySeat) {
        hitMeBy.add(e.seat);
        hitMeAt.set(e.seat, now);
      }
    for (const [seat, at] of hitMeAt) {
      if (now - at > 400) hitMeAt.delete(seat);
      else hitMeBy.add(seat);
    }
    let ownHitShown = false;
    const ownHitHead = (view.combat ?? []).some(
      (e) => e.type === "hit" && e.seat === mySeat && e.zone === "head",
    );
    for (const e of view.combat ?? []) {
      if (e.type === "act") {
        // The answer to a door request: a refusal puts the guessed door back.
        if (e.act === "door" && e.seat === mySeat) {
          const g = doorGuesses.shift();
          if (g && g.id >= 0 && !e.ok) setDoorHere(g.id, g.was);
        }
        if (e.ok && e.act === "pickup") {
          audio.pickup();
          feed({
            kind: "toast",
            text: `Picked up ${ITEMS[e.item as ItemId]?.name ?? "item"}${(e.qty ?? 1) > 1 ? ` ×${e.qty}` : ""}`,
            tone: "ok",
          });
        } else if (!e.ok && e.reason) {
          audio.denied();
          feed({ kind: "toast", text: e.reason.toUpperCase(), tone: "warn" });
        }
        continue;
      }
      if (e.type === "melee") {
        if (e.seat !== mySeat) {
          audio.knifeSwing(e.attack, e.origin, e.hearM);
          actors.find((a) => a.seat === e.seat)?.actor.shot(now, e.attack);
        }
        continue;
      }
      if (e.type === "shot") {
        if (e.seat !== mySeat) {
          audio.shot(e.gun, e.silenced, e.origin, e.hearM);
          const slot = actors.find((a) => a.seat === e.seat);
          slot?.actor.shot(now);
          // A bullet going close by without hitting: "you are being shot at".
          const end: [number, number, number] = e.impact ?? [
            e.origin[0] + e.dir[0] * 600,
            e.origin[1] + e.dir[1] * 600,
            e.origin[2] + e.dir[2] * 600,
          ];
          if (
            !hitMeBy.has(e.seat) &&
            kit &&
            !kit.dead &&
            now - shotAtAt > SHOT_AT_GAP_MS &&
            passBy(e.origin, end, [body.x, body.y + eyeHeight, body.z]) < NEAR_MISS_M
          ) {
            shotAtAt = now;
            audio.shotAt();
          }
        }
        continue;
      }
      if (e.type === "hit") {
        // (A shotgun's pellets land together: one marker and one sound for the lot, a
        // headshot's if any of them was one.)
        if (e.seat === mySeat && !ownHitShown) {
          ownHitShown = true;
          audio.hit(ownHitHead);
          if (kit?.active === -1) audio.knifeHit();
          feed({ kind: "hit", head: ownHitHead, kill: false });
        }
        if (e.victim === mySeat) {
          const src = latest?.players.find((r) => r[0] === e.seat);
          const from = src ? Math.atan2(-(src[1]! - body.x), -(src[3]! - body.z)) - yaw : 0;
          feed({ kind: "hurt", from });
          if (e.broke.length) audio.armourBreak();
        }
        continue;
      }
      if (e.type === "nade") {
        nadeFx.thrown(e.id, e.nade, e.o, e.v, e.at);
        continue;
      }
      if (e.type === "boom") {
        nadeFx.boom(e.id, e.x, e.y, e.z, now);
        if (e.id >= 0) audio.grenade("he", [e.x, e.y, e.z]);
        else audio.boom([e.x, e.y, e.z]);
        continue;
      }
      if (e.type === "area") {
        const total = e.nade === "smoke" ? 18_000 : 7000;
        nadeFx.area(e.id, e.nade, e.x, e.y, e.z, e.until - total, e.until, serverClock());
        continue;
      }
      if (e.type === "hurt") {
        if (e.victim === mySeat) feed({ kind: "hurt", from: 0 });
        else if (e.seat === mySeat) feed({ kind: "hit", head: false, kill: false });
        continue;
      }
      if (e.type === "elim") {
        // The kill feed's row: who, with what, whom (gas and self-eliminations told apart).
        const weapon: BrKillWeapon =
          e.gun === "m4a1s"
            ? "m4"
            : e.gun === "ak47"
              ? "ak"
              : e.gun === "awp" ||
                  e.gun === "hunting" ||
                  e.gun === "mp5" ||
                  e.gun === "deagle" ||
                  e.gun === "spas12"
                ? e.gun
                : e.gun === "he" ||
                    e.gun === "fire" ||
                    e.gun === "gas" ||
                    e.gun === "vehicle" ||
                    e.gun === "fall"
                  ? e.gun
                  : "knife";
        feed({
          kind: "kill",
          text: `${e.byName ?? "?"} [${weapon}] ${e.name ?? "?"}`,
          killer: e.gun === "gas" || e.gun === "fall" ? null : (e.byName ?? "?"),
          victim: e.name ?? "?",
          weapon,
          self: e.by === e.seat && e.gun !== "gas" && e.gun !== "fall",
          mine: e.by === mySeat || e.seat === mySeat,
        });
        if (e.by === mySeat) feed({ kind: "hit", head: false, kill: true });
        if (e.seat === mySeat)
          feed({ kind: "eliminated", by: e.gun === "fall" ? "a fall" : (e.byName ?? "?") });
        deathAt.set(e.seat, now);
      }
    }
  }

  function snapshot(view: BrView) {
    // A reconnect can replay the current tick with fresh one-time baselines. The
    // transport already rejects callbacks from the replaced socket; consume these
    // even if that tick was drawn before (otherwise kit/loot/door sync is lost).
    if (latest && view.phaseAt === latest.phaseAt && view.tick <= latest.tick && !view.route)
      return;
    const now = performance.now();
    // First view: face the plane's direction of travel, looking a little down at the island.
    if (!aimed) {
      aimed = true;
      const r = view.route ?? route;
      if (r) yaw = Math.atan2(-r.dir[0], -r.dir[1]);
      pitch = -0.3;
    }
    mySeat = view.you.seat;
    const previousGun = kit?.guns[kit.active]?.item;
    latest = view;
    if (view.you.recoil) aimRecoil.sync(view.you.recoil);
    if (view.kit && (view.kit.dead || view.kit.guns[view.kit.active]?.item !== previousGun))
      aimRecoil.reset();
    zoneSnapAt = view.tick * TICK_MS;
    route = view.route ?? route;
    {
      const sent = view.tick * TICK_MS;
      // A new room (or a long stall): start the clock over rather than wait 5 s for it.
      if (Math.abs(sent - ownClock.now(now)) > 2000) {
        ownClock.clear();
        clockFloor = -Infinity;
      }
      ownClock.observe(sent, now);
    }
    if (view.kit) {
      const before = kit;
      kit = view.kit;
      predictedShots = 0;
      // Reload sound when a reload starts; heal done chime.
      const g = activeGun();
      if (g && kit.reloadUntil && kit.reloadUntil !== before?.reloadUntil) {
        if (g.item === "spas12") {
          // Shell by shell: each stage is its own `reloadUntil`. The first one starts the
          // reload (whether the gun was empty then decides the clip to its end).
          if (!before?.shells) {
            shellReload.empty = g.mag <= 0;
            audio.shellReload("start");
          }
        } else audio.reload(g.item, g.mag <= 0);
        // The AWP as in 1v1/5v5 (and the Hunting Rifle, its bolt): a reload takes you out of
        // the scope; scope again afterwards. (The SPAS-12 has a recoil pattern.)
        if (!(ITEMS[g.item] as WeaponDef).recoil) aimHeld = false;
      }
      // A shell-by-shell reload cut short (a shot asked for with shells in the gun): the gun
      // comes back up over the server's break time instead of snapping to rest.
      const tube = g ? (ITEMS[g.item] as WeaponDef).shells : undefined;
      if (
        tube &&
        before?.shells &&
        before.shells.stage !== 2 &&
        !kit.reloadUntil &&
        g!.item === before.guns[before.active]?.item
      )
        shellReload.brokenAt = now;
      if (before?.heal && !kit.heal && kit.hp > before.hp) audio.healed();
    }
    loot?.apply(view.loot);
    vehiclesFx?.apply(view.vehicles, now);
    doorsFx?.apply(view.doors, doorOpen);
    // Panes shot out (all broken ones on the first view; new breaks with shards and the sound).
    if (view.tracks) trackFx?.apply(view.tracks, now);
    if (view.panes) paneFx?.apply(view.panes.broken, !!view.panes.fresh, (at) => audio.glass(at));
    // Each door that opens or closes (anyone's, the first view excepted) sounds at the door.
    if (island)
      for (const c of view.doors?.changes ?? []) {
        const d = island.island.doors.doors[c >> 1];
        if (d) audio.door([d.x, (d.y0 + d.y1) / 2, d.z]);
      }
    if (view.driving === undefined) car = null;
    else {
      const was = car;
      const row = vehiclesFx?.row(view.driving);
      if (row) car = vehiclesFx!.asVehicles().find((v) => v.id === view.driving) ?? null;
      // A trigger held while getting in must not fire on the way out.
      if (car) fireHeld = fireTapped = predictTap = aimHeld = false;
      // Just got in: look the way it points (the chase camera starts behind it).
      if (!was && car) {
        yaw = car.yaw;
        pitch = -0.15;
      }
    }
    // Authoritative entry starts the ignition; exit/death also stops it in hidden tabs.
    audio.engine(
      car && !car.destroyed && !kit?.dead ? car : null,
      Number(keys.has(binds.forward)) - Number(keys.has(binds.back)),
    );
    for (const a of view.areas ?? [])
      nadeFx.area(
        a[0]!,
        a[1] ? "fire" : "smoke",
        a[2]!,
        a[3]!,
        a[4]!,
        a[5]! - (a[1] ? 7000 : 18_000),
        a[5]!,
        serverClock(),
      );
    onCombat(view, now);
    const rows = new Map<number, number[]>();
    for (const r of view.players) {
      rows.set(r[0]!, r);
      heldRows.sent(r[0]!, r, now);
    }
    // Far players the room sends at half rate: carried forward in the views between.
    for (const seat of view.held ?? []) {
      const row = heldRows.held(seat, now);
      if (row) rows.set(seat, row);
    }
    heldRows.keep(rows);
    // On the server's clock: a late packet takes its own place in the motion.
    if (view.tick * TICK_MS < (buffer.at(-1)?.at ?? -Infinity) - 2000) buffer.length = 0;
    if (remoteTimeline.observe(view.tick * TICK_MS, now)) {
      buffer.push({ at: view.tick * TICK_MS, rows });
      while (buffer.length > 30) buffer.shift();
    }
    // (A door request never answered within two seconds is forgotten: the server's doors rule.)
    while (doorGuesses.length && performance.now() - doorGuesses[0]!.at > 2000) doorGuesses.shift();
    // Reconcile: server state as of its last applied input, then replay the newer ones.
    const before = new THREE.Vector3(body.x, body.y, body.z);
    const y = view.you;
    Object.assign(body, {
      x: y.x,
      y: y.y,
      z: y.z,
      vx: y.vx,
      vz: y.vz,
      velocityY: y.vy,
      phase: y.phase,
      grounded: y.grounded,
      airCrouchOffset: y.airCrouchOffset ?? 0,
      crouched: y.crouched,
    });
    if (y.zip !== undefined) body.zip = { ms: y.zip, ...(y.zipLine ? { id: y.zipLine } : {}) };
    else delete body.zip;
    if (y.ladder)
      body.ladder = {
        ...y.ladder,
        ...(y.ladder.from ? { from: [...y.ladder.from] as [number, number, number] } : {}),
      };
    else delete body.ladder;
    if (y.lift) body.lift = { ...y.lift };
    else delete body.lift;
    while (pending.length && pending[0]!.seq <= y.seq) pending.shift();
    if (car && island) {
      // Driving: replay the unacknowledged inputs on the server's vehicle state.
      const others = vehiclesFx!.asVehicles();
      for (const p of pending) stepVehicle(solid(), island.meta, car, p.input, TICK_MS, others);
    } else if (
      island &&
      ((view.phase !== "waiting" && view.phase !== "starting") ||
        y.phase === "ground" ||
        y.phase === "swim")
    )
      // (Before take-off only the warm-up's players are on the ground.)
      for (const p of pending) {
        // Inputs sent before a door request met that door as it was.
        for (const g of doorGuesses)
          if (g.id >= 0) doorOpen[g.id] = p.seq <= g.seq ? g.was : g.was ? 0 : 1;
        stepDrop(
          solid(),
          island.meta,
          route!,
          body,
          healingInput(p.input),
          p.clock - view.phaseAt,
          TICK_MS,
        );
      }
    for (const g of doorGuesses) if (g.id >= 0) doorOpen[g.id] = g.was ? 0 : 1;
    const jump = before.distanceTo(new THREE.Vector3(body.x, body.y, body.z));
    // Snapshot delivery continues in hidden tabs where animation frames may be paused.
    // A server-confirmed landing/elimination must still stop airborne ambience immediately.
    if (body.phase !== "parachute" || kit?.dead) audio.setParachuteOpen(false);
    // Small differences are smoothed out; large ones (teleport, plane) snap.
    if (jump < 3) correction.add(before.sub(new THREE.Vector3(body.x, body.y, body.z)));
    else correction.set(0, 0, 0);
  }
  /** Items within pickup reach of the eye and in sight, nearest first (at most 14). */
  function nearbyLoot(): BrNearby[] {
    if (!loot) return [];
    const ex = body.x,
      ey = body.y + (body.crouched ? 0.95 : 1.6),
      ez = body.z;
    const out: BrNearby[] = [];
    for (const i of loot.items.values()) {
      const dx = i.x - ex,
        dy = i.y + 0.15 - ey,
        dz = i.z - ez;
      const d = Math.hypot(dx, dy, dz);
      if (d > INVENTORY.reachM) continue;
      const hit = solid().raycast(ex, ey, ez, dx, dy, dz, d);
      if (hit && hit.distance < d - 0.3) continue;
      const def = ITEMS[i.item];
      out.push({
        id: i.id,
        item: i.item,
        name: def.name,
        detail: detailOf(i),
        color: RARITY[def.rarity].color,
        rarity: RARITY[def.rarity].label,
        category: def.category,
        qty: i.qty,
        dist: d,
      });
    }
    return out.sort((a, b) => a.dist - b.dist).slice(0, 14);
  }
  /** While healing the server walks the player (match.ts); predict the same. */
  // (And the carried tablet's movement perks, as the server applies them: match.ts perkInput.)
  const healingInput = (input: DropInput): DropInput =>
    perkInput(kit?.heal ? { ...input, sprint: false, walk: true } : input, kit?.tablet);

  // ------------------------------------------------------------------ loop
  let last = performance.now(),
    accumulator = 0,
    lastHud = 0;
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    one = new THREE.Vector3(1, 1, 1),
    eye = new THREE.Vector3(),
    forward = new THREE.Vector3();
  type OtherPose = {
    seat: number;
    pos: THREE.Vector3;
    phase: DropPhase | "dead";
    yaw: number;
    gun: number;
    crouched: boolean;
    /** Silent Steps: their run carries less far. */
    soft?: boolean;
    stance: number;
    optic: number;
    muzzle: number;
    gear: number;
    /** The vehicle they drive, or −1. */
    vehicle: number;
    d: number;
    priority: number;
  };
  const posePool: OtherPose[] = [];
  const others: OtherPose[] = [];
  const near = new Set<number>();
  const presentedRows = new Map<number, number[]>();
  const actorForward = new THREE.Vector3();
  const horizontalAxis = new THREE.Vector3(1, 0, 0);
  function frame(now: number) {
    if (disposed) return;
    requestAnimationFrame(frame);
    const dtMs = Math.min(100, now - last);
    last = now;
    if (!island || !latest || !route) {
      if (island && !context.lost) {
        island.update(camera);
        updateSceneRoots(scene, island.root);
        renderer.render(scene, camera);
        sharpenScene();
        sceneTarget?.present();
      }
      return;
    }
    // Like the 1v1 and Bomb renderers: adapt only once the match is in play and warmed up. The
    // lobby is when the island streams in; its loading hitches are not the GPU's speed.
    if (latest.phase !== "waiting" && latest.phase !== "starting") playingSince ??= now;
    else playingSince = null;
    if (playingSince !== null && now - playingSince > 2500) {
      playedMs += dtMs;
      if (budget.scale <= 0.6001) floorMs += dtMs;
    }
    // Lower resolution only buys time when the GPU is what is slow. Where the GPU's own time is
    // measured and short, a late frame is something else (the display's 60 Hz pacing, a busy
    // main thread, another window): it counts as on time, so the picture is not blurred for
    // nothing (owner, 2026-11-09: no frame-rate problem, but a soft, low-resolution island).
    const gpuIdle = gpu.last !== null && gpu.last < GPU_BUSY_MS;
    if (
      playingSince !== null &&
      now - playingSince > 2500 &&
      budget.update(gpuIdle ? Math.min(dtMs, 16) : dtMs)
    ) {
      resize();
      applyGroundRange();
    }
    const server = serverClock();
    // Fixed 30 Hz: one input per step, sent and predicted (as the server will apply it).
    accumulator += dtMs;
    while (accumulator >= TICK_MS) {
      accumulator -= TICK_MS;
      const input = sample();
      const clock = serverClock();
      seq++;
      send?.(
        JSON.stringify({
          v: 1,
          type: "br-input",
          seq,
          ...input,
          // The delay the others are drawn with now: the room rewinds a shot by it.
          playbackMs: remoteTimeline.playbackMs,
        }),
      );
      pending.push({ seq, input, clock });
      while (pending.length > 90) pending.shift();
      if (car)
        stepVehicle(solid(), island.meta, car, input, TICK_MS, vehiclesFx?.asVehicles() ?? []);
      else if (
        (latest.phase !== "waiting" && latest.phase !== "starting") ||
        body.phase === "ground" ||
        body.phase === "swim"
      )
        stepDrop(
          solid(),
          island.meta,
          route,
          body,
          healingInput(input),
          clock - latest.phaseAt,
          TICK_MS,
        );
    }
    audio.setParachuteOpen(body.phase === "parachute" && !kit?.dead);
    // Swimming: the water loop, louder with the stroke (horizontal speed this frame).
    {
      const swimming = body.phase === "swim" && !kit?.dead;
      const moved = (Math.hypot(body.x - swimFromX, body.z - swimFromZ) / Math.max(1, dtMs)) * 1000;
      swimFromX = body.x;
      swimFromZ = body.z;
      // Wading counts too (owner, 2026-11-10: "the water sound is a bit late"): it used to
      // start only once the water was deep enough to swim (1.4 m), a few steps in. Now from
      // the ankles, louder with the depth and with how fast the legs push through it.
      let wade = 0;
      if (!swimming && island && body.phase === "ground" && body.grounded && !kit?.dead) {
        const surface = waterSurface(
          island.meta,
          solid().hf.heightAt(body.x, body.z),
          body.x,
          body.z,
        );
        if (surface !== null) wade = Math.min(1, Math.max(0, (surface - body.y - 0.1) / 0.8));
      }
      audio.setSwimming(
        swimming || wade > 0,
        swimming ? Math.min(1, moved / DROP.swimSpeed) : wade * Math.min(1, moved / 4),
        swimming ? 0.12 : 0,
      );
    }
    audio.setPlaneAboard(latest.phase === "plane" && body.phase === "plane" && !kit?.dead);
    // Ambience (owner, 2026-11-10: forest sounds in the forests across the map, snowfall on the
    // big snow mountain): a few times a second, how much forest is round you and how high the
    // ground under you climbs towards the snow, both only near the ground (not from the plane
    // or high under the canopy).
    if (now - ambienceAt > AMBIENCE_MS) {
      ambienceAt = now;
      const cover = island.island.vegetation.cover,
        hf = solid().hf;
      let trees = 0;
      for (let i = -2; i <= 2; i++)
        for (let j = -2; j <= 2; j++)
          if (cover.classAt(body.x + i * AMBIENCE_STEP, body.z + j * AMBIENCE_STEP) === "forest")
            trees++;
      const ground = hf.heightAt(body.x, body.z);
      const near = 1 - smooth(25, 90, body.y - ground);
      const plane = body.phase === "plane";
      audio.setAmbience(
        plane ? 0 : near * smooth(0.12, 0.6, trees / 25),
        plane ? 0 : near * smooth(SNOW_AMBIENCE[0], SNOW_AMBIENCE[1], ground),
      );
      // Waves on the shore (owner, 2026-11-12: "should hear it when getting 10-15 yards away
      // from any water with waves, light sound"): the nearest water, looked for along eight
      // bearings out to fifteen yards; full at the water's edge and in it, nothing from
      // SHORE_FAR_M. Inland water is calmer, so a little quieter. On the ground only.
      let shoreAt = Infinity,
        inland = false;
      if (!plane && body.y - ground < 8)
        search: for (let d = 0; d <= SHORE_FAR_M; d += 1.5)
          for (let k = 0; k < (d === 0 ? 1 : 8); k++) {
            const x = body.x + Math.sin((k * Math.PI) / 4) * d,
              z = body.z + Math.cos((k * Math.PI) / 4) * d;
            const level = waterSurface(island.meta, hf.heightAt(x, z), x, z);
            // (Water you are well above, a lake under a cliff, is not at your feet.)
            if (level === null || body.y - level > 6) continue;
            shoreAt = d;
            inland = level !== 0;
            break search;
          }
      audio.setShore((1 - smooth(SHORE_NEAR_M, SHORE_FAR_M, shoreAt)) * (inland ? 0.7 : 1));
    }
    if ((fireHeld || predictTap) && !inventoryOpen && locked() && body.phase === "ground" && !car)
      predictShot(now, server, predictTap);
    // Karambit: left slashes, right stabs; held buttons repeat at the cooldown, as on the server.
    if ((fireHeld || predictTap || aimHeld || predictStab) && !inventoryOpen && locked())
      predictKnife(server, fireHeld || predictTap ? "slash" : "stab");
    predictTap = predictStab = false;
    correction.multiplyScalar(Math.exp(-dtMs / 90));
    if (context.lost) return;

    // The plane, from the shared route and the server clock.
    const planeMs = server - latest.phaseAt;
    plane.visible = latest.phase === "plane" && planeMs <= routeMs(route) + 5000;
    if (plane.visible) {
      const [px, py, pz] = planeAt(route, planeMs);
      plane.position.set(px, py + 6, pz);
      // The YC-130's nose points along −z (its tail fin is at +z): turn it to face the route.
      plane.rotation.set(0, Math.atan2(route.dir[0], route.dir[1]) + Math.PI, 0);
    }

    // The keys held now drive this frame's view of you (or your vehicle) between fixed steps.
    heldInput.forward = Number(keys.has(binds.forward)) - Number(keys.has(binds.back));
    heldInput.strafe = Number(keys.has(binds.right)) - Number(keys.has(binds.left));
    heldInput.yaw = yaw;
    heldInput.jump = body.phase === "ground" && keys.has(binds.jump);
    heldInput.crouch = keys.has(binds.crouch);
    heldInput.sprint = keys.has(binds.sprint) && !aimHeld && !kit?.heal;
    heldInput.walk = keys.has(binds.walk) || !!kit?.heal; // healing walks you (healingInput)
    heldInput.dive = body.phase === "parachute" && keys.has(binds.dive);
    if (canopyLook.active) heldInput.canopyYaw = canopyLook.course;
    else delete heldInput.canopyYaw;
    const carPose = car
      ? vehicleView.sample(
          solid(),
          island.meta,
          car,
          heldInput,
          accumulator,
          vehiclesFx?.asVehicles() ?? [],
        )
      : null;
    // Vehicles first: drivers are sat in them as they are drawn this frame.
    vehiclesFx?.update(now, carPose, dtMs, camera.position);
    paneFx?.update(dtMs);
    trackFx?.update(now);
    // Others, interpolated on the server's clock, behind it by this connection's delay.
    const t = remoteTimeline.sample(now, dtMs);
    let a = buffer[0],
      b = buffer[buffer.length - 1];
    for (let i = 0; i + 1 < buffer.length; i++)
      if (buffer[i]!.at <= t && buffer[i + 1]!.at >= t) {
        a = buffer[i];
        b = buffer[i + 1];
        break;
      }
    let ground = 0,
      visible = 0;
    others.length = 0;
    camera.getWorldDirection(actorForward);
    if (a && b) {
      const k = b.at > a.at ? Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at))) : 1;
      brVisibleRows(a, b, t, presentedRows);
      for (const [seat, rb] of presentedRows) {
        const ra = a.rows.get(seat) ?? rb;
        const index = others.length;
        let pose = posePool[index];
        if (!pose) {
          pose = {
            seat,
            pos: new THREE.Vector3(),
            phase: "ground",
            yaw: 0,
            gun: -1,
            crouched: false,
            stance: 0,
            optic: -1,
            muzzle: -1,
            gear: 0,
            vehicle: -1,
            d: 0,
            priority: 0,
          };
          posePool.push(pose);
        }
        const pos = pose.pos.set(
          ra[1]! + (rb[1]! - ra[1]!) * k,
          ra[2]! + (rb[2]! - ra[2]!) * k,
          ra[3]! + (rb[3]! - ra[3]!) * k,
        );
        // Shortest-way yaw interpolation.
        const ya = ra[5] ?? 0,
          yb = rb[5] ?? 0;
        const dy = Math.atan2(Math.sin(yb - ya), Math.cos(yb - ya));
        pose.seat = seat;
        const state = t < b.at ? ra : rb;
        pose.phase = state[4] === 5 ? "dead" : PHASE_CODES[state[4]!]!;
        pose.yaw = ya + dy * k;
        pose.gun = state[6] ?? -1;
        // Bit 1: crouched. Bit 2: Silent Steps on a run (heard less far).
        pose.crouched = ((state[7] ?? 0) & 1) === 1;
        pose.soft = ((state[7] ?? 0) & 2) !== 0;
        pose.stance = ((ra[7] ?? 0) & 1) + (((rb[7] ?? 0) & 1) - ((ra[7] ?? 0) & 1)) * k;
        pose.optic = state[9] ?? -1;
        pose.muzzle = state[10] ?? -1;
        pose.gear = state[11] ?? 0;
        pose.vehicle = state[8] ?? -1;
        pose.d = pos.distanceToSquared(camera.position);
        const facing =
          pose.d > 0
            ? ((pos.x - camera.position.x) * actorForward.x +
                (pos.y - camera.position.y) * actorForward.y +
                (pos.z - camera.position.z) * actorForward.z) /
              Math.sqrt(pose.d)
            : 1;
        pose.priority = brActorPriority(pose.d, facing, near.has(seat), pose.phase !== "dead");
        others.push(pose);
      }
    }
    others.sort((x, y) => x.priority - y.priority);
    visible = others.length;
    // Characters for the nearest; a seat keeps its actor while it stays near (no flicker).
    near.clear();
    for (let i = 0; i < Math.min(CHARACTERS, others.length); i++) near.add(others[i]!.seat);
    for (const slot of actors) if (!near.has(slot.seat)) slot.seat = -1;
    // Canopies: track every flier (deploy, steering, sink, landing) from their motion.
    farCanopies?.begin();
    let fullCanopies = 0;
    const sec = dtMs / 1000;
    for (const o of others) {
      const flying = o.phase === "parachute";
      let tr = chuteTrack.get(o.seat);
      if (flying) {
        if (!tr || !tr.flying) {
          tr = {
            x: o.pos.x,
            y: o.pos.y,
            z: o.pos.z,
            h: o.yaw,
            turn: 0,
            sink: 4,
            since: now,
            landedAt: -1,
            flying: true,
            swing: { angle: 0, rate: 0 },
            roll: 0,
          };
          chuteTrack.set(o.seat, tr);
        }
        // Others' canopies face the way they drift (from their interpolated motion), not
        // where the pilot looks; smoothed so a glance never spins a canopy.
        const dx = o.pos.x - tr.x,
          dz = o.pos.z - tr.z;
        let turnNow = 0;
        if (Math.hypot(dx, dz) > 0.05 && sec > 0) {
          const target = Math.atan2(-dx, -dz);
          const d = Math.atan2(Math.sin(target - tr.h), Math.cos(target - tr.h)) * 0.15;
          tr.h += d;
          turnNow = d / sec;
        }
        tr.turn += (turnNow - tr.turn) * Math.min(1, sec * 3);
        if (sec > 0) tr.sink += ((tr.y - o.pos.y) / sec - tr.sink) * Math.min(1, sec * 2);
        tr.x = o.pos.x;
        tr.y = o.pos.y;
        tr.z = o.pos.z;
      } else if (tr?.flying) {
        // Just landed: the canopy collapses where they touched down.
        tr.flying = false;
        tr.landedAt = now;
      }
      if (!tr || (!flying && now - tr.landedAt > COLLAPSE_S * 1000)) continue;
      const brakeR = Math.min(1, Math.max(0, -tr.turn / 0.8)),
        brakeL = Math.min(1, Math.max(0, tr.turn / 0.8));
      const dive = Math.min(1, Math.max(0, (tr.sink - 7) / 10));
      const trFlare = flying
        ? Math.min(1, Math.max(0, 1 - (tr.y - solid().hf.heightAt(tr.x, tr.z) - 1.5) / 6))
        : 0;
      swingStep(tr.swing, flying ? DIVE_SWING * dive * (1 - trFlare) - 0.22 * trFlare : 0, dtMs);
      tr.roll +=
        ((flying ? Math.max(-1, Math.min(1, tr.turn / DROP.parachute.turnRate)) * 0.21 : 0) -
          tr.roll) *
        (1 - Math.exp(-dtMs / 180));
      if (fullCanopies < NEAR_CANOPIES && (near.has(o.seat) || o.d < 400 * 400) && wingTemplate) {
        let c = canopyPool[fullCanopies];
        if (!c) {
          c = createCanopy(wingTemplate);
          canopyPool.push(c);
          scene.add(c.root);
        }
        fullCanopies++;
        chuteHarness.set(tr.x, tr.y + HARNESS_Y, tr.z);
        hangCanopy(c.root, chuteHarness, tr.h, tr.swing.angle, tr.roll);
        c.setLines(o.d < 120 * 120);
        c.pose({
          deploy: (now - tr.since) / 1000,
          landed: flying ? -1 : (now - tr.landedAt) / 1000,
          brakeL,
          brakeR,
          dive,
          time: now / 1000 + o.seat,
        });
      } else if (flying) farCanopies?.add(o.pos, tr.h, (brakeL - brakeR) * 0.16, 1);
    }
    for (let i = fullCanopies; i < canopyPool.length; i++) canopyPool[i]!.root.visible = false;
    farCanopies?.end();
    for (const o of others) {
      let slot = near.has(o.seat) ? actors.find((s) => s.seat === o.seat) : undefined;
      if (!slot && near.has(o.seat)) {
        slot = actors.find((s) => s.seat === -1);
        if (slot) {
          slot.seat = o.seat;
          slot.actor.resetMotion();
        }
      }
      if (slot) {
        const root = slot.actor.root;
        root.visible = true;
        // Driving: sat in the seat, hands on the wheel or the bars (no gun).
        const seated =
          o.vehicle >= 0 && o.phase === "ground" ? vehiclesFx?.seatRider(o.vehicle, root) : null;
        if (seated) {
          slot.actor.update(dtMs, now, 0, true, false, {
            seated,
            primary: "none",
            weapon: "rifle",
          });
          fitCharacterGear(slot.actor, o.gear);
          continue;
        }
        // On the zip-line: hanging under their trolley, both hands on its handle, facing down
        // the cable; the reach, pull-up and landing tuck from their place along it.
        if (o.phase === "zip") {
          const ms = othersZipMs(o.seat, o.pos.x, o.pos.z, now);
          const line = othersZipLine;
          line.pose(ms, zipLandYs[line.id] ?? zipLandY, zipPoseOther);
          root.position.copy(o.pos);
          root.quaternion.setFromEuler(zipEuler.set(0.08, line.heading, 0, "YXZ"));
          root.updateMatrixWorld(true);
          root.worldToLocal(zipLocal.set(zipPoseOther.hx, zipPoseOther.hy, zipPoseOther.hz));
          slot.actor.update(dtMs, now, 0, true, false, {
            zip: {
              handle: [zipLocal.x, zipLocal.y, zipLocal.z],
              reach: zipPoseOther.reach,
              tuck: zipPoseOther.tuck,
            },
            primary: "none",
            weapon: "rifle",
          });
          fitCharacterGear(slot.actor, o.gear);
          continue;
        }
        // On a ladder: the climb (ladder-clip.ts), its phase the height they have climbed; stepping
        // on or off, standing (below).
        const climb =
          o.phase === "ladder" && island ? climbAt(island.hf, o.pos.x, o.pos.y, o.pos.z) : null;
        if (climb?.ladder.rope) {
          // On the climbing rope: hand over hand up its line, leaning with the face.
          root.position.copy(o.pos);
          ropeFrame(climb.ladder.rope, climb.s, climb.ladder.yaw, 1, root.quaternion);
          slot.actor.update(dtMs, now, 0, true, false, {
            rope: {
              cycles: climb.s / ROPE_CLIMB.cycle,
              wall: ropeWall(island!.hf, root.position, root.quaternion),
            },
            primary: "none",
            weapon: "rifle",
          });
          fitCharacterGear(slot.actor, o.gear);
          continue;
        }
        if (climb) {
          root.position.copy(o.pos);
          root.rotation.set(0, climb.ladder.yaw + Math.PI, 0);
          slot.actor.update(dtMs, now, 0, true, false, {
            ladder: { cycles: climb.s / LADDER_CYCLE, standOff: LADDER.standOff },
            primary: "none",
            weapon: "rifle",
          });
          fitCharacterGear(slot.actor, o.gear);
          continue;
        }
        const tr = chuteTrack.get(o.seat);
        const hanging = o.phase === "parachute" && !!tr;
        // Under a canopy the body faces where it flies, hung from the harness (swing, bank).
        if (hanging) {
          chuteHarness.set(o.pos.x, o.pos.y + HARNESS_Y, o.pos.z);
          hangPilot(root, chuteHarness, tr.h, tr.swing.angle, tr.roll);
        } else {
          root.position.copy(o.pos);
          root.rotation.set(o.phase === "freefall" ? -Math.PI / 2.2 : 0, o.yaw, 0);
        }
        const gun = itemFromCode(o.gun);
        const dead = o.phase === "dead";
        if (dead && !deathAt.has(o.seat)) deathAt.set(o.seat, now - 5000);
        if (!dead) deathAt.delete(o.seat);
        // Falling when killed, as in 1v1/5v5 (owner, 2026-11-09): the shared collapse (an
        // accelerating fall backwards that settles, a little roll) onto the floor under him.
        // Cosmetic only; the eliminated player's position is the server's.
        const collapse =
          dead && !hanging
            ? deathPose(
                now - deathAt.get(o.seat)!,
                o.pos.y,
                Math.min(o.pos.y, solid().supportAt(o.pos.x, o.pos.z, 0.15, o.pos.y + 0.4)),
                slot.actor.deathClipMs,
              )
            : null;
        if (collapse) {
          root.rotation.set(collapse.pitch, o.yaw, collapse.roll);
          root.position.y = collapse.height;
          root.position.x += Math.sin(o.yaw) * collapse.backward;
          root.position.z += Math.cos(o.yaw) * collapse.backward;
        }
        const agl = hanging ? o.pos.y - solid().hf.heightAt(o.pos.x, o.pos.z) : 99;
        slot.actor.update(dtMs, now, 0, !dead, o.crouched, {
          stance: o.stance,
          airborne: o.phase === "freefall" || o.phase === "parachute",
          // In the water: the swimming stroke instead of the run.
          ...(o.phase === "swim" && !dead ? { swim: true } : {}),
          ...(hanging
            ? {
                canopy: {
                  pullR: Math.min(1, Math.max(0, -tr.turn / 0.8)),
                  pullL: Math.min(1, Math.max(0, tr.turn / 0.8)),
                  flare: Math.min(1, Math.max(0, 1 - (agl - 1.5) / 6)),
                  toggleY: HARNESS_Y + 0.42,
                  dive: Math.max(0, Math.min(1, tr.swing.angle / DIVE_SWING)),
                },
              }
            : {}),
          primary:
            o.phase !== "swim" &&
            (gun === "awp" ||
              gun === "hunting" ||
              gun === "ak47" ||
              gun === "m4" ||
              gun === "mp5" ||
              gun === "deagle" ||
              gun === "spas12")
              ? gun
              : "none",
          // No gun drawn on foot: the Karambit in the hand (swings from "melee" events).
          weapon: !gun && o.phase === "ground" ? "knife" : "rifle",
          silenced: o.muzzle >= 0 && itemFromCode(o.muzzle) === "silencer",
          // Collapse progress 0–1 (the limbs relax with it), not the time of death.
          ...(collapse ? { death: collapse.progress } : {}),
        });
        fitCharacterGun(
          slot.actor,
          attachmentParts,
          itemFromCode(o.optic) ?? null,
          itemFromCode(o.muzzle) ?? null,
        );
        fitCharacterGear(slot.actor, o.gear);
        continue;
      }
      // Far away in a vehicle: inside it, nothing to draw.
      if (ground < MAX_PLAYERS && o.vehicle < 0) {
        const lying = o.phase === "freefall" || o.phase === "dead";
        q.setFromAxisAngle(horizontalAxis, lying ? -Math.PI / 2 : 0);
        m4.compose(o.pos, q, one);
        stand.setMatrixAt(ground++, m4);
      }
    }
    for (const slot of actors) if (slot.seat === -1) slot.actor.root.visible = false;
    stand.count = ground;
    stand.instanceMatrix.needsUpdate = true;
    // Camera: chase the plane, third person in the air, first person on the ground.
    // You, as drawn this frame: the predicted body plus the elapsed part of the next step.
    // (The same condition as the fixed step: before take-off only the warm-up walks.)
    const stepping =
      !car &&
      ((latest.phase !== "waiting" && latest.phase !== "starting") ||
        body.phase === "ground" ||
        body.phase === "swim");
    const viewPose = frameView.sample(
      solid(),
      island.meta,
      route,
      body,
      stepping ? heldInput : null,
      server - latest.phaseAt,
      accumulator,
      dtMs,
      correction,
    );
    let px = viewPose.x,
      py = viewPose.y,
      pz = viewPose.z;
    syncCanopyLook();
    if (canopyLook.active) {
      const view = canopyLook.view(dtMs);
      yaw = view.yaw;
      pitch = view.pitch;
    }
    const fx = -Math.sin(yaw) * Math.cos(pitch),
      fy = Math.sin(pitch),
      fz = -Math.cos(yaw) * Math.cos(pitch);
    const underCanopy = body.phase === "parachute";
    // The canopy (and the body under it) faces where it flies, not where you look.
    const chuteHeading =
      underCanopy && Math.hypot(body.vx, body.vz) > 0.5 ? Math.atan2(-body.vx, -body.vz) : yaw;
    if (underCanopy && myDeployAt < 0) myDeployAt = now;
    if (!underCanopy && myDeployAt >= 0) {
      // Touched down: the canopy collapses where you landed.
      myDeployAt = -1;
      myLanded = { at: now, x: px, y: py, z: pz, h: myHeading };
    }
    if (underCanopy) myHeading = chuteHeading;
    const airborne = body.phase === "freefall" || underCanopy;
    // Clear air while flying (owner, 2026-11-08: see the map from the plane and the canopy to
    // pick a landing): the haze starts later and thins toward the far plane, easing back on
    // the ground. Only the fog moves — nothing more is drawn, so it costs no frame time — and
    // everyone in the air sees the same.
    {
      const up = body.phase === "plane" || airborne ? 1 : 0;
      if (aloft !== !!up) {
        aloft = !!up;
        applyGroundRange();
      }
      airClear += (up - airClear) * Math.min(1, (dtMs / 1000) * (up ? 1.5 : 0.6));
      const fog = scene.fog as THREE.Fog;
      // Moderate: buildings end at 4 km and far forests at the tree ring, and a fog much
      // clearer than this would show them stop.
      fog.near = view.fog[0] + view.fog[0] * 0.8 * airClear;
      fog.far =
        view.fog[1] + (Math.min(view.far * 0.97, view.fog[1] * 1.3) - view.fog[1]) * airClear;
    }
    const canopyFp = underCanopy && chuteFirstPerson && !car;
    const groundBelow = solid().hf.heightAt(px, pz);
    const agl = py - groundBelow;
    // Toggles: the turning side pulled, both half down braking (S), both for the landing flare.
    const flare = underCanopy ? Math.min(1, Math.max(0, 1 - (agl - 1.5) / 6)) : 0;
    const braking = underCanopy && keys.has(binds.back) ? 0.5 : 0;
    const actualDive = underCanopy
      ? Math.max(
          0,
          Math.min(
            1,
            (-body.velocityY - DROP.parachute.brakeDown) /
              (DROP.parachute.diveDown - DROP.parachute.brakeDown),
          ),
        )
      : 0;
    diveEase += (actualDive - diveEase) * (1 - Math.exp(-dtMs / 180));
    const brakeR = Math.min(1, Math.max(0, pull) + braking + flare),
      brakeL = Math.min(1, Math.max(0, -pull) + braking + flare);
    // The pendulum: a dive swings pilot and wing forward together (the wing ahead and below),
    // pushing on (W) a little; braking (S) and the landing flare swing them back.
    const throttle = Number(keys.has(binds.forward)) - Number(keys.has(binds.back));
    const swing = swingStep(
      mySwing,
      underCanopy
        ? DIVE_SWING * actualDive * (1 - flare) +
            (throttle > 0 ? 0.05 : throttle < 0 ? -0.08 : 0) -
            0.22 * flare
        : 0,
      dtMs,
    );
    // Into a turn the system banks (the pilot swings out under the wing).
    const systemRoll = underCanopy ? bank * 1.5 : 0;
    if (myCanopy) {
      if (underCanopy) {
        // In first person the lines meet a metre higher, above the view (never across it), and
        // the wing swings half as far (it stays above the view in a dive).
        chuteHarness.set(px, py + HARNESS_Y + (canopyFp ? FP_LIFT : 0), pz);
        hangCanopy(
          myCanopy.root,
          chuteHarness,
          chuteHeading,
          canopyFp ? swing * 0.5 : swing,
          systemRoll,
        );
        myCanopy.pose({
          deploy: (now - myDeployAt) / 1000,
          landed: -1,
          brakeL,
          brakeR,
          dive: diveEase,
          time: now / 1000,
        });
      } else if (myLanded && now - myLanded.at < COLLAPSE_S * 1000) {
        chuteHarness.set(myLanded.x, myLanded.y + HARNESS_Y, myLanded.z);
        hangCanopy(myCanopy.root, chuteHarness, myLanded.h, 0, 0);
        myCanopy.pose({
          deploy: 99,
          landed: (now - myLanded.at) / 1000,
          brakeL: 0,
          brakeR: 0,
          dive: 0,
          time: now / 1000,
        });
      } else myCanopy.root.visible = false;
    }
    // The zip-line (zipline.ts): your ride as drawn this frame, on the preview's sub-step clock.
    const riding = body.phase === "zip" && !kit?.dead;
    if (riding && !zipRiding) {
      zipStartedAt = now;
      zipCamSet = false;
      zipPrevSpeed = 0;
      zipSwing.angle = zipSwing.rate = 0;
      audio.zipEnter(null);
    }
    zipRiding = riding;
    // On a ladder: the view turns to face it as you take hold (then the mouse looks round freely).
    const onLadder = body.phase === "ladder" && !kit?.dead;
    if (onLadder && !ladderAt) ladderAt = now;
    if (!onLadder) ladderAt = 0;
    const held0 = onLadder && island ? ladders(island.hf)[body.ladder?.id ?? 0] : null;
    if (held0 && now - ladderAt < (held0.rope ? 1200 : 450)) {
      const l = held0;
      {
        const e = 1 - Math.exp(-dtMs / 140);
        yaw += Math.atan2(Math.sin(l.yaw - yaw), Math.cos(l.yaw - yaw)) * e;
        // On the rope the camera swings round behind you: level the view, so the orbit settles
        // on its default, above and behind, looking down at you (the mouse moves it after).
        if (l.rope) pitch += (0 - pitch) * e;
      }
    }
    // The ride as shown: its own clock running with the frame, eased onto the predicted one (a
    // server correction never snaps the rider along the cable), and the body drawn, the camera
    // and the trolley all from that one pose (hands always on the handle).
    const predictedZipMs = riding ? (viewPose.body.zip?.ms ?? body.zip?.ms ?? 0) : 0;
    // Your line (ZIPLINES): its shape, timing and landing.
    const myLine = zipLineOf(viewPose.body.zip ?? body.zip);
    if (!riding) zipShownMs = -1;
    else if (zipShownMs < 0 || Math.abs(predictedZipMs - zipShownMs) > 1500)
      zipShownMs = predictedZipMs;
    else {
      zipShownMs += dtMs;
      zipShownMs += (predictedZipMs - zipShownMs) * (1 - Math.exp(-dtMs / 220));
    }
    const myZipMs = riding ? Math.max(0, zipShownMs) : 0;
    if (riding) {
      myLine.pose(myZipMs, zipLandYs[myLine.id] ?? zipLandY, zipPoseMe);
      px = zipPoseMe.x;
      py = zipPoseMe.y;
      pz = zipPoseMe.z;
      // Taking hold: the view turns to look down the line (the mouse still moves it).
      if (now - zipStartedAt < 1200) {
        const e = 1 - Math.exp(-dtMs / 300);
        yaw += Math.atan2(Math.sin(myLine.heading - yaw), Math.cos(myLine.heading - yaw)) * e;
        pitch += (-0.12 - pitch) * e;
      }
    }
    // Third person on the line, first person again by the time the feet are on the platform
    // (both eased, never a cut). The view starts back into the rider's head as they come off
    // the end of the cable, and the figure is only ever drawn riding: it used to come back
    // after the landing, with the rider drawn standing there empty-handed for half a second
    // (owner, 2026-11-12: "a view of the character standing still … looks weird").
    const zipLeaving = riding && myZipMs >= myLine.T.done - ZIP_VIEW_BACK_MS;
    zipBlend =
      riding && !zipLeaving
        ? Math.min(1, zipBlend + dtMs / 700)
        : Math.max(0, zipBlend - dtMs / (riding ? ZIP_VIEW_BACK_MS : 450));
    const zipShow = riding && zipBlend > 0.3;
    audio.zipRide(riding && myZipMs >= myLine.T.ride ? zipPoseMe.speed / myLine.cruise : null);
    shown.set(px, py, pz);
    // On the climbing rope: third person while you hold it (eased in on taking hold, out once
    // you have stepped off or let go; never first person on the rope).
    // As on the zip-line, the view is back in first person by the time you stand on the ground
    // again: it starts back while you step off (over the edge or onto the slope at the foot),
    // so the figure is not seen standing there. (Let go of mid-rope, the view comes back
    // during the fall, and the figure is drawn falling until the camera is close.)
    const roping = onRope() && !kit?.dead;
    const ropeSt = roping ? viewPose.body.ladder : undefined;
    const ropeLeaving =
      ropeSt?.stage === "off" && ropeSt.t >= (ropeSt.low ? 520 : 1100) - ROPE_VIEW_BACK_MS;
    ropeBlend =
      roping && !ropeLeaving
        ? Math.min(1, ropeBlend + dtMs / 450)
        : Math.max(0, ropeBlend - dtMs / ROPE_VIEW_BACK_MS);
    if (!roping && ropeBlend === 0) ropeCamSet = false;
    const ropeShow = ropeBlend > 0.25 && !zipShow;
    // Driving: your operator sat in the seat (the camera is always third person there).
    const mySeated = car ? (vehiclesFx?.seatRider(car.id, me.root) ?? null) : null;
    me.root.visible = (airborne && !canopyFp) || !!mySeated || zipShow || ropeShow;
    if (mySeated) {
      me.update(dtMs, now, 0, true, false, { seated: mySeated, primary: "none", weapon: "rifle" });
      if (kit) fitCharacterGear(me, figureState(kit).gear);
    } else if (zipShow && !airborne) {
      me.root.position.set(px, py, pz);
      if (riding) {
        // A damped pendulum: the legs trail on the push and run ahead into the brake.
        const accel = dtMs > 0 ? (zipPoseMe.speed - zipPrevSpeed) / (dtMs / 1000) : 0;
        zipPrevSpeed = zipPoseMe.speed;
        swingStep(zipSwing, Math.max(-0.2, Math.min(0.2, -accel * 0.012)), dtMs);
        me.root.quaternion.setFromEuler(
          zipEuler.set(0.08 + zipSwing.angle, myLine.heading, 0, "YXZ"),
        );
        me.root.updateMatrixWorld(true);
        me.root.worldToLocal(zipLocal.set(zipPoseMe.hx, zipPoseMe.hy, zipPoseMe.hz));
        me.update(dtMs, now, 0, true, false, {
          zip: {
            handle: [zipLocal.x, zipLocal.y, zipLocal.z],
            reach: zipPoseMe.reach,
            tuck: zipPoseMe.tuck,
          },
          primary: "none",
          weapon: "rifle",
        });
      }
      if (kit) fitCharacterGear(me, figureState(kit).gear);
    } else if (ropeShow && !airborne) {
      me.root.position.set(px, py, pz);
      const st = viewPose.body.ladder;
      const l = roping && st && island ? ladders(island.hf)[st.id] : null;
      if (l?.rope && st) {
        // Leaning with the face once on it; upright stepping on from the slope and off over the
        // edge (or back onto the slope at the foot).
        const k =
          st.stage === "climb"
            ? 1
            : st.stage === "on"
              ? st.top
                ? Math.min(1, st.t / 1100)
                : Math.min(1, st.t / 700)
              : 1 - Math.min(1, st.t / (st.low ? 520 : 1100));
        const w = k * k * (3 - 2 * k);
        // (The climb's phase from where the body is drawn, between the server's steps.)
        const s = st.stage === "climb" ? (ropeS(l.rope, px, py, pz, 0.5) ?? st.s) : st.s;
        ropeFrame(l.rope, s, l.yaw, w, me.root.quaternion);
        me.update(dtMs, now, 0, true, false, {
          rope: {
            cycles: s / ROPE_CLIMB.cycle,
            wall: ropeWall(island!.hf, me.root.position, me.root.quaternion),
          },
          primary: "none",
          weapon: "rifle",
        });
      } else {
        // Let go of the rope: falling beside it while the view comes back to first person.
        me.root.quaternion.setFromEuler(zipEuler.set(0, yaw, 0, "YXZ"));
        me.update(dtMs, now, 0, true, false, { airborne: true, primary: "none", weapon: "rifle" });
      }
      me.root.updateMatrixWorld(true);
      if (kit) fitCharacterGear(me, figureState(kit).gear);
    } else if (me.root.visible) {
      // Leaving the plane: a short tumble upright as the lines pay out and the canopy fills.
      const tumble = underCanopy ? Math.max(0, 1 - (now - myDeployAt) / (DEPLOY_S * 1000)) : 0;
      if (underCanopy) {
        // Hung from the harness: swings and banks with the wing above it.
        chuteHarness.set(px, py + HARNESS_Y, pz);
        hangPilot(me.root, chuteHarness, chuteHeading, swing, systemRoll, -0.9 * tumble * tumble);
      } else {
        me.root.position.set(px, py, pz);
        me.root.rotation.set(body.phase === "freefall" ? -Math.PI / 2.2 : 0, yaw, 0);
      }
      me.update(dtMs, now, 0, true, false, {
        airborne: true,
        ...(underCanopy
          ? {
              canopy: {
                pullL: brakeL,
                pullR: brakeR,
                flare,
                toggleY: HARNESS_Y + 0.42,
                dive: Math.max(0, Math.min(1, swing / DIVE_SWING)),
              },
            }
          : {}),
      });
      // What you wear, on the figure seen from behind in the air (owner, 2026-11-11: the
      // officer's cap was missing under the parachute). It was fitted only in a car seat.
      // Before you have a kit (the plane and the drop): nothing looted, so the officer's cap.
      fitCharacterGear(me, kit ? figureState(kit).gear : 0);
    }
    // Steering feel: bank into the turn, nose up a touch when braking (smoothed, small).
    const headingDelta =
      previousCanopyHeading === null
        ? 0
        : Math.atan2(
            Math.sin(chuteHeading - previousCanopyHeading),
            Math.cos(chuteHeading - previousCanopyHeading),
          );
    const turnKey = underCanopy
      ? Math.max(
          -1,
          Math.min(1, -headingDelta / ((DROP.parachute.turnRate * Math.max(dtMs, 1)) / 1000)),
        )
      : 0;
    previousCanopyHeading = underCanopy ? chuteHeading : null;
    const throttleKey = Number(keys.has(binds.forward)) - Number(keys.has(binds.back));
    const k = 1 - Math.exp(-dtMs / 180);
    bank += ((underCanopy ? -turnKey * (0.14 + 0.04 * diveEase) : 0) - bank) * k;
    // First person: the view tips down with the pendulum (into the dive, back in the flare).
    chutePitch += ((underCanopy ? -0.45 * swing - throttleKey * 0.035 : 0) - chutePitch) * k;
    pull += ((underCanopy ? turnKey : 0) - pull) * Math.min(1, dtMs / 150);
    if (wasAirborne && (body.phase === "ground" || body.phase === "swim")) landedAt = now;
    wasAirborne = airborne;
    harness.visible = canopyFp && !inventoryOpen;
    if (harness.visible) {
      harness.position.set(px, py, pz);
      harness.rotation.y = chuteHeading;
      // Hands at the toggles just above eye level; the turning side pulls down.
      // Resting, the hands sit just above the view; the turning side pulls into it.
      for (const { side, g, arm } of handRig) {
        const down = Math.max(0, side * pull) * 0.26 - Math.max(0, -side * pull) * 0.04;
        g.position.set(side * 0.34, 1.88 - down, -0.42);
        g.rotation.z = side * -0.15;
        armFrom.set(side * 0.24, 1.25, 0.08);
        armTo.copy(g.position);
        armDir.subVectors(armTo, armFrom);
        arm.position.copy(armFrom).addScaledVector(armDir, 0.5);
        arm.scale.set(1, armDir.length(), 1);
        arm.quaternion.setFromUnitVectors(up, armDir.normalize());
      }
      // Risers: from each toggle up to the canopy's lines (meeting above the shoulders).
      for (let i = 0; i < 2; i++) {
        const { g } = handRig[i]!;
        riserPos.set([g.position.x, g.position.y + 0.07, g.position.z], i * 6);
        riserPos.set([(i ? 1 : -1) * 0.24, HARNESS_Y + FP_LIFT + 0.5, 0], i * 6 + 3);
      }
      risers.geometry.attributes["position"]!.needsUpdate = true;
    }
    if (car && carPose) {
      // Driving (owner, 2026-11-08: "not FPS while driving", "camera angle above the car and
      // bike"): always third person, a chase camera above and behind looking down on the
      // vehicle, as in PUBG/Warzone. The mouse swings it around (and tilts it, within limits);
      // it settles back behind while you move and pulls back a little with the speed.
      if (Math.abs(carPose.speed) > 2) {
        const d = Math.atan2(Math.sin(carPose.yaw - yaw), Math.cos(carPose.yaw - yaw));
        yaw += d * Math.min(1, dtMs / 1200);
      }
      const s = spec(carPose.kind);
      const fast = Math.min(1, Math.abs(carPose.speed) / s.maxSpeed);
      const dist = (s.bike ? 4.3 : 5.4 + 0.2 * (s.length - 4.5)) + (s.bike ? 1 : 1.4) * fast;
      // Pitch below the horizon: 0.36 rad looks down on the roof; the mouse adds or takes some.
      const tilt = Math.max(0.14, Math.min(0.8, 0.36 - pitch * 0.5));
      const pivotY = carPose.y + (s.bike ? 1.1 : s.height * 0.75);
      const ox = Math.sin(yaw) * Math.cos(tilt) * dist,
        oz = Math.cos(yaw) * Math.cos(tilt) * dist,
        oy = Math.sin(tilt) * dist;
      if (!chaseCamSet) chaseCam.set(ox, oy, oz);
      chaseCamSet = true;
      chaseCam.lerp(forward.set(ox, oy, oz), 1 - Math.exp(-dtMs / 70));
      const cx = carPose.x + chaseCam.x,
        cz = carPose.z + chaseCam.z;
      camera.position.set(cx, Math.max(pivotY + chaseCam.y, solid().hf.heightAt(cx, cz) + 1), cz);
      // Aim just ahead of the vehicle so the road in front is in view.
      camera.lookAt(carPose.x - Math.sin(yaw) * 2.5, pivotY, carPose.z - Math.cos(yaw) * 2.5);
    } else if (body.phase === "plane" && plane.visible) {
      camera.position.set(
        plane.position.x - fx * 70,
        plane.position.y + 18 - fy * 70,
        plane.position.z - fz * 70,
      );
      camera.lookAt(plane.position);
    } else if (canopyFp) {
      // Hanging under the canopy: eye just below the risers, free look, a little bank.
      camera.position.set(px, py + 1.5, pz);
      camera.rotation.set(pitch + chutePitch, yaw, bank, "YXZ");
    } else if (airborne) {
      // Behind and above (owner's parachute spec §4): orbit the pilot with the mouse (it never
      // steers), the whole canopy and the ground below in view; pulled back while the canopy
      // opens, damped, never into the ground. The view's pitch is held between looking well
      // down and a little up, so the camera never sits inside the canopy.
      const opening = underCanopy ? Math.max(0, 1 - (now - myDeployAt) / (DEPLOY_S * 1000)) : 0;
      // Diving (owner, 2026-11-08): the camera rises behind and looks down the dive, a little
      // further back, its aim led ahead along the way the pilot and wing swing, so you see the
      // pilot, the whole wing out in front and the ground coming up.
      const diving = underCanopy ? Math.max(0, Math.min(1, mySwing.angle / DIVE_SWING)) : 0;
      const dist = 6.4 + 3.5 * opening + 0.9 * diving;
      const camPitch = Math.max(-0.75, Math.min(0.3, pitch)) - 0.14 - 0.22 * diving;
      const lead = 2.2 * diving;
      const pivotY = py + 2.5 - 1.2 * diving;
      // The offset from the pilot is what is damped (no snapping), not the camera's place in
      // the world: the camera moves with you at any speed, only its orbit eases.
      const ox = Math.sin(yaw) * Math.cos(camPitch) * dist,
        oz = Math.cos(yaw) * Math.cos(camPitch) * dist,
        oy = 2.5 - Math.sin(camPitch) * dist;
      if (!chaseCamSet) chaseCam.set(ox, oy, oz);
      chaseCamSet = true;
      chaseCam.lerp(forward.set(ox, oy, oz), 1 - Math.exp(-dtMs / 90));
      const cx = px + chaseCam.x,
        cz = pz + chaseCam.z;
      camera.position.set(cx, Math.max(py + chaseCam.y, solid().hf.heightAt(cx, cz) + 1.2), cz);
      camera.lookAt(px - Math.sin(chuteHeading) * lead, pivotY, pz - Math.cos(chuteHeading) * lead);
      // A little roll with the canopy's bank.
      camera.rotateZ(bank * 0.5);
    } else {
      chaseCamSet = false;
      const seen = viewPose.body;
      const eyeTarget = seen.phase === "swim" ? 0.3 : seen.crouched ? 0.95 : 1.6;
      // As in 1v1 (CameraStance): the stance changes at 10 m/s, not in one frame.
      const eyeStep = Math.min(100, dtMs) * 0.01;
      eyeHeight += Math.max(-eyeStep, Math.min(eyeStep, eyeTarget - eyeHeight));
      const eyeH = eyeHeight;
      // Landing: a short knee bend (0.3 m, gone in 0.35 s), nothing that locks you in place.
      const dip = 0.3 * Math.max(0, 1 - (now - landedAt) / 350);
      // On a ladder the head leans back off the rungs (they are a hand's length from the face).
      const held =
        seen.phase === "ladder" && island ? ladders(island.hf)[seen.ladder?.id ?? 0] : null;
      const rungs = held?.rope ? null : held;
      ladderLean += ((rungs ? 0.2 : 0) - ladderLean) * (1 - Math.exp(-dtMs / 120));
      const out = rungs?.yaw ?? ladderLeanYaw;
      if (rungs) ladderLeanYaw = rungs.yaw;
      camera.position.set(
        px + Math.sin(out) * ladderLean,
        py + eyeH - dip,
        pz + Math.cos(out) * ladderLean,
      );
      const recoil = aimRecoil.sample(server, dtMs);
      camera.rotation.set(clampPitch(pitch + recoil.pitch), yaw + recoil.yaw, 0, "YXZ");
    }
    if (zipBlend > 0 && !car) {
      // The zip-line's elevated follow view (owner's spec §5): above and behind the rider, looking
      // down at them and the line ahead; the mouse orbits it (the ride never changes). Further
      // back with the speed, closer for the landing; pulled in where the ground or a structure
      // is in the way. Blended with the first-person view in and out (position and rotation).
      const k = zipBlend * zipBlend * (3 - 2 * zipBlend);
      zipFpPos.copy(camera.position);
      zipFpQ.copy(camera.quaternion);
      const fast = riding ? Math.max(0, Math.min(1, zipPoseMe.speed / myLine.cruise)) : 0;
      const ending = riding
        ? Math.max(0, Math.min(1, (myZipMs - (myLine.T.drop - 2500)) / 2500))
        : 1;
      const dist = 4.0 + 0.9 * fast - 0.6 * ending;
      const tilt = Math.max(0.12, Math.min(1.05, 0.5 - pitch * 0.7));
      // Pivot at the hanging rider's chest; a little off to the right of the line, so the cable
      // runs past the camera into the shot instead of across the lens.
      const pivotY = py + 1.6;
      const side = 0.95;
      let ox = Math.sin(yaw) * Math.cos(tilt) * dist + Math.cos(yaw) * side,
        oy = Math.sin(tilt) * dist,
        oz = Math.cos(yaw) * Math.cos(tilt) * dist - Math.sin(yaw) * side;
      for (let i = 0; i < 6; i++) {
        const cx = px + ox,
          cy = pivotY + oy,
          cz = pz + oz;
        if (
          cy > solid().hf.heightAt(cx, cz) + 0.8 &&
          !solid().blocked(cx, cy - 0.25, cz, 0.5, 0.25)
        )
          break;
        ox *= 0.78;
        oy *= 0.85;
        oz *= 0.78;
      }
      // The orbit's offset is damped (it starts at your eye: the view pulls out of your head).
      if (!zipCamSet) zipCam.set(0, 0.05, 0);
      zipCamSet = true;
      zipCam.lerp(forward.set(ox, oy, oz), 1 - Math.exp(-dtMs / 160));
      const cx = px + zipCam.x,
        cz = pz + zipCam.z;
      camera.position.set(cx, Math.max(pivotY + zipCam.y, solid().hf.heightAt(cx, cz) + 0.8), cz);
      // Down past the rider (in the lower middle, boots to the trolley in frame) to the line
      // ahead, so the valley and Pine Ridge fill the upper part of the view.
      camera.lookAt(px - Math.sin(yaw) * 3.5, py + 0.9, pz - Math.cos(yaw) * 3.5);
      // (Not slerpQuaternions(fp, camera.quaternion): it copies its first argument over the
      // second before reading it, so the follow view's rotation would be lost.)
      camera.position.lerpVectors(zipFpPos, camera.position, k);
      camera.quaternion.copy(zipFpQ.slerp(camera.quaternion, k));
    }
    if (ropeBlend > 0 && !car && zipBlend === 0 && island) {
      // The climbing rope's orbit camera (owner's spec §4): one smooth third-person controller
      // round the climber. By default above and behind, out from the rock (3.2 m back, 2.3 m
      // up, looking down 35° at you, the rope and the face above); the mouse orbits it all the
      // way round (the sides, the front where the face leaves room) and from low behind
      // (looking up the rope) to high overhead (looking down past you to the slope below). It
      // never changes the climb. Where the rock is in the way the camera comes in, then rises
      // where the face lies back; never into the ground. Blended from and back to first person.
      const k = ropeBlend * ropeBlend * (3 - 2 * ropeBlend);
      ropeFpPos.copy(camera.position);
      ropeFpQ.copy(camera.quaternion);
      // Pivot at the chest: up the rope's line from the feet (or upright, stepping on or off).
      ropeUp.copy(me.root.quaternion);
      ropePivot.set(0, 1.25, 0.05).applyQuaternion(ropeUp).add(shown);
      const dist = 3.9;
      let tilt = Math.max(-0.3, Math.min(1.38, 0.62 - pitch * 0.9));
      let ox = 0,
        oy = 0,
        oz = 0;
      const clear = (x: number, y: number, z: number) =>
        y > solid().hf.heightAt(x, z) + 0.6 && !solid().blocked(x, y - 0.25, z, 0.5, 0.25);
      search: for (let lift = 0; lift < 6; lift++) {
        for (let r = dist; r >= 1.2; r *= 0.82) {
          ox = Math.sin(yaw) * Math.cos(tilt) * r;
          oy = Math.sin(tilt) * r;
          oz = Math.cos(yaw) * Math.cos(tilt) * r;
          if (clear(ropePivot.x + ox, ropePivot.y + oy, ropePivot.z + oz)) break search;
        }
        // No room at this height (the rock in front): higher, where the face lies back.
        tilt = Math.min(1.38, tilt + 0.18);
      }
      // The offset is damped (from your eye on taking hold: the view pulls out of your head).
      if (!ropeCamSet) ropeCam.set(0, 0.35, 0);
      ropeCamSet = true;
      ropeCam.lerp(forward.set(ox, oy, oz), 1 - Math.exp(-dtMs / 140));
      const cx = ropePivot.x + ropeCam.x,
        cz = ropePivot.z + ropeCam.z;
      camera.position.set(
        cx,
        Math.max(ropePivot.y + ropeCam.y, solid().hf.heightAt(cx, cz) + 0.6),
        cz,
      );
      // At the chest (a touch up the rope): the climber in the middle, the way up above.
      camera.lookAt(forward.set(0, 0.2, 0).applyQuaternion(ropeUp).add(ropePivot));
      camera.position.lerpVectors(ropeFpPos, camera.position, k);
      camera.quaternion.copy(ropeFpQ.slerp(camera.quaternion, k));
    }
    if (zipFx) {
      // Trolleys: one under each rider (yours and others'), and the parked one at Iron Peaks
      // unless someone there is holding it.
      zipRiders.length = 0;
      const parked = ZIPLINES.map(() => true);
      const add = (line: ZipLine, p: ZipPose, swing: number) => {
        if (p.stage === "reach" || p.stage === "pull") parked[line.id] = false;
        const along = (p.hx - line.start.x) * line.dir[0] + (p.hz - line.start.z) * line.dir[1];
        zipRiders.push({
          x: p.hx,
          y: p.hy + ZIPLINE.handleDrop,
          z: p.hz,
          u: Math.max(0, Math.min(1, along / line.span)),
          swing,
          line: line.id,
        });
      };
      if (riding) add(myLine, zipPoseMe, -zipSwing.angle * 0.6);
      for (const o of others)
        if (o.phase === "zip") {
          const ms = othersZipMs(o.seat, o.pos.x, o.pos.z, now);
          const line = othersZipLine;
          line.pose(ms, zipLandYs[line.id] ?? zipLandY, zipPoseOther);
          add(line, zipPoseOther, 0);
        }
      if (zipSeen.size)
        for (const seat of zipSeen.keys())
          if (!others.some((o) => o.seat === seat && o.phase === "zip")) zipSeen.delete(seat);
      zipFx.update(zipRiders, parked);
    }
    if (ropeFx && island) {
      // The rope sways a little round whoever is on it (you and others in view).
      ropeClimbers.length = 0;
      if (roping) ropeClimbers.push({ x: shown.x, y: shown.y, z: shown.z });
      for (const o of others)
        // (Stepping on or off too: the rope eases out to them as they come near its line.)
        if (o.phase === "ladder" && ropeClimbers.length < 4 && o.d < 150 * 150)
          ropeClimbers.push({ x: o.pos.x, y: o.pos.y, z: o.pos.z });
      ropeFx.update(ropeClimbers, now / 1000, camera.position);
    }
    // The lifts: the cab and its doors from your ride or where you stand (lift-renderer.ts).
    liftFx?.update(
      camera.position,
      // The ride as drawn this frame (the preview's copy, a partial step ahead): the cab moves
      // with the camera, not in 30 Hz steps under it.
      body.phase === "lift" && body.lift ? (viewPose.body.lift ?? body.lift) : null,
      body.phase === "ground" ? liftNear : null,
      dtMs,
    );
    nadeFx.update(solid(), server, now, camera);
    doorsFx?.update(dtMs, now, camera.position);
    const smoking: Array<[number, number, number, number]> = [];
    for (const d of latest.drops ?? []) {
      // Announced ahead (the warning): nothing in the sky until the crate's fall starts.
      if (server < d[4]!) continue;
      if (server >= d[5]! && !d[6]) smoking.push([d[1]!, d[3]!, d[2]!, d[5]!]);
      let c = crates.get(d[0]!);
      if (!c && crateTemplate) {
        const crate = crateTemplate.clone();
        const chuteObj = chuteTemplate ? chuteTemplate.clone() : null;
        scene.add(crate);
        if (chuteObj) scene.add(chuteObj);
        c = { crate, chute: chuteObj };
        crates.set(d[0]!, c);
      }
      if (!c) continue;
      const y = d[3]! + Math.max(0, ((d[5]! - server) / 1000) * AIRDROP.fallSpeed);
      c.crate.position.set(d[1]!, y, d[2]!);
      if (c.chute) {
        c.chute.visible = server < d[5]!;
        c.chute.position.set(d[1]!, y + 1.6, d[2]!);
      }
    }
    dropSmoke.update(smoking, server, camera.position);
    audio.engine(
      car && !car.destroyed && !kit?.dead ? car : null,
      Number(keys.has(binds.forward)) - Number(keys.has(binds.back)),
    );
    const z = zoneLive(server);
    wall.visible = !!z && z.r < 7000;
    if (z) {
      wall.position.set(z.x, 300, z.z);
      wall.scale.set(Math.max(0.5, z.r), 900, Math.max(0.5, z.r));
    }
    beam.visible = !!waypoint;
    if (waypoint) {
      // Thin up close, wider far away (always a few pixels on screen), 600 m tall.
      const d = Math.hypot(waypoint[0] - camera.position.x, waypoint[1] - camera.position.z);
      const w = Math.max(0.6, d * 0.004);
      const g = island.hf.heightAt(waypoint[0], waypoint[1]);
      beam.position.set(waypoint[0], g + 300, waypoint[1]);
      beam.scale.set(w, 600, w);
    }
    // Spare frame time builds the tactical map (a few ms a frame until done).
    if (!mapDone) buildMapSlice(performance.now() + 2);
    // Eliminated: follow the player being watched from behind.
    const watchSeat = kit?.dead ? latest.watch?.seat : undefined;
    const watched = watchSeat !== undefined ? others.find((o) => o.seat === watchSeat) : undefined;
    if (watched) {
      camera.position.set(
        watched.pos.x + Math.sin(watched.yaw) * 4,
        watched.pos.y + 2.4,
        watched.pos.z + Math.cos(watched.yaw) * 4,
      );
      camera.lookAt(
        watched.pos.x - Math.sin(watched.yaw) * 6,
        watched.pos.y + 1.4,
        watched.pos.z - Math.cos(watched.yaw) * 6,
      );
    }
    // First-person gun, aim and zoom (lowered while a grenade is in hand).
    const gun = onFoot() && !nadeHand && !car ? activeGun() : null;
    const aiming =
      !!gun &&
      aimHeld &&
      !inventoryOpen &&
      locked() &&
      body.phase === "ground" &&
      !kit?.heal &&
      !(kit?.reloadUntil && server < kit.reloadUntil) &&
      server >= (kit?.drawUntil ?? 0) &&
      // The AWP as in 1v1/5v5: a shot drops the scope while the bolt is worked; it comes back
      // afterwards if aim is still held (the server restarts the scope's settle the same way).
      !(
        !(ITEMS[gun.item] as WeaponDef).recoil &&
        now - lastShotAt < (ITEMS[gun.item] as WeaponDef).intervalMs
      );
    const reloadLeft = kit?.reloadUntil ? Math.max(0, kit.reloadUntil - server) : 0;
    const gunDef = gun ? (ITEMS[gun.item] as WeaponDef) : null;
    // Against the reload's real length (the Quick Hands perk shortens it; against the full
    // length the clip started part-way through and jumped at the end).
    let reloadP = gunDef
      ? reloadProgress(kit?.reloadUntil ?? 0, server, reloadLengthMs(gunDef.reloadMs, kit?.tablet))
      : 0;
    // The SPAS-12, shell by shell: the server's stage picks the part of the clip (the start,
    // one shell's pass, the end), and the cues sound where the clip makes them.
    let shellsEmpty: boolean | null = null;
    if (gunDef?.shells) {
      reloadP = 0;
      if (kit?.shells && kit.reloadUntil) {
        const { stage } = kit.shells;
        const { ms, progress } = shellStage(
          gunDef.shells,
          kit.shells,
          kit.reloadUntil,
          server,
          kit.tablet,
        );
        reloadP = spas12ClipTime(stage, progress);
        shellsEmpty = shellReload.empty;
        if (shellReload.cueFor !== kit.reloadUntil) {
          const cue =
            stage === 1
              ? progress >= SPAS12_RELOAD.seatAt - SPAS12_CUE_LEAD_MS.shell / ms
                ? "shell"
                : null
              : stage === 2 && shellReload.empty
                ? progress >= SPAS12_RELOAD.boltHomeAt - SPAS12_CUE_LEAD_MS.bolt / ms
                  ? "bolt"
                  : null
                : null;
          if (cue) {
            shellReload.cueFor = kit.reloadUntil;
            audio.shellReload(cue);
          }
        }
      } else if (now - shellReload.brokenAt < gunDef.shells.breakMs) {
        reloadP = spas12ClipTime(2, (now - shellReload.brokenAt) / gunDef.shells.breakMs);
        shellsEmpty = false;
      }
    }
    let scopeUp = false;
    if (viewmodel) {
      viewmodel.grenade(
        dtMs,
        nadeHand && onFoot() && !car
          ? nadeHands.view(
              performance.now(),
              keys.has(binds.sprint)
                ? 2
                : [binds.forward, binds.left, binds.back, binds.right].some((k) => keys.has(k))
                  ? 1
                  : 0,
            )
          : { kind: "hidden" },
      );
      viewmodel.setGun(gun);
      viewmodel.update(dtMs, now, {
        gun,
        aiming,
        reload: reloadP,
        empty: shellsEmpty ?? (!!gun && gun.mag - predictedShots <= 0),
        moving: [binds.forward, binds.left, binds.back, binds.right].some((k) => keys.has(k)),
        sprinting: keys.has(binds.sprint),
        airborne: !body.grounded,
        lookX,
        lookY,
        silenced: gun?.muzzle === "silencer",
        flash: !gun?.muzzle || !(ITEMS[gun.muzzle] as { hideFlash?: boolean }).hideFlash,
        knife: knifeDrawn() && body.phase === "ground",
        aimSway: perkOn(kit?.tablet, "steady-aim") ? PERK_EFFECT.aimSway : 1,
        walking: keys.has(binds.walk) || body.crouched,
        backward: keys.has(binds.back) && !keys.has(binds.forward),
        strafe: moveAxes(keys, binds).strafe,
      });
      lookX = lookY = 0;
      scopeUp = viewmodel.scopeView(gun);
      // The AWP's zoom clicks on the scope's edges (as in 1v1/5v5); the Hunting Rifle's too.
      const awpScope = scopeUp && !!gun && !(ITEMS[gun.item] as WeaponDef).recoil;
      if (awpScope !== awpScopeUp) {
        if (awpScope || awpScopeUp) audio.zoom(awpScope);
        awpScopeUp = awpScope;
      }
      const z = 1 + (currentZoom() - 1) * viewmodel.aim;
      // Diving under the canopy: the view widens a little with the speed.
      const diveFov = car
        ? 8 * Math.min(1, Math.abs(car.speed) / spec(car.kind).maxSpeed)
        : body.phase === "parachute"
          ? 7 * Math.max(0, Math.min(1, mySwing.angle / DIVE_SWING))
          : // On the zip-line the view widens with the speed (blended in with the camera).
            zipRiding
            ? 9 * Math.max(0, Math.min(1, zipPoseMe.speed / myLine.cruise)) * zipBlend
            : 0;
      const fov =
        (2 * Math.atan(Math.tan(((BASE_FOV + diveFov) * Math.PI) / 360) / z) * 180) / Math.PI;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    // Loot and the pickup prompt.
    if (loot) {
      eye.copy(camera.position);
      loot.update(eye);
      prompt = null;
      if (car) {
        prompt = {
          kind: "exit",
          id: car.id,
          name: spec(car.kind).name,
          rarity: "",
          color: "#9fbf7a",
          detail: "Exit",
        };
      } else if (onFoot() && !kit?.dead && vehiclesFx) {
        for (const r of vehiclesFx.rows()) {
          const k = kindOfRow(r);
          if (r[12] === 1 || r[11]! >= 0) continue;
          const d = Math.hypot(r[2]! - body.x, r[4]! - body.z);
          if (d > VEHICLES.enterReach + spec(k).length / 2 || Math.abs(r[3]! - body.y) > 2)
            continue;
          prompt = {
            kind: "enter",
            id: r[0]!,
            name: spec(k).name,
            rarity: "",
            color: "#9fbf7a",
            detail: `${k === "bike" ? "Ride" : "Enter"} · health ${Math.round((r[9]! / r[10]!) * 100)} %`,
          };
          break;
        }
      }
      // In a lift's cab or at its door on the landing (lifts.ts liftCall): E takes the express
      // to its other end; on a lift with more stops, the floor button in the crosshair.
      const cab =
        !prompt && body.phase === "ground" && !kit?.dead && island
          ? liftCall(lifts(island.hf), body.x, body.y, body.z)
          : null;
      liftNear = cab ? { id: cab.lift.id, stop: cab.stop } : null;
      if (cab) {
        camera.getWorldDirection(forward);
        const aimed =
          cab.lift.stops.length > 2
            ? buttonAt(cab.lift, cab.stop, eye.x, eye.y, eye.z, forward.x, forward.y, forward.z)
            : -1;
        const to = liftTarget(cab.lift, cab.stop, aimed);
        const name = (i: number) => {
          const l = stopLabel(cab.lift, i);
          return l === "L" ? "Lobby" : l === "R" ? "Roof" : `Floor ${l}`;
        };
        prompt = {
          kind: "lift",
          id: to,
          name: to >= 0 ? `Lift to ${name(to).toLowerCase()}` : "Lift",
          rarity: "",
          color: "#c8a46a",
          detail:
            to < 0
              ? `You are on ${name(cab.stop).toLowerCase()} · look at a floor button`
              : `${to > cab.stop ? "Up" : "Down"} ${Math.abs(cab.lift.stops[to]! - cab.lift.stops[cab.stop]!).toFixed(0)} m`,
        };
      }
      // At a ladder's foot or its top exit (on the deck, nearer it than the zip-line's handle).
      const rung =
        !prompt && body.phase === "ground" && !kit?.dead && island
          ? ladderReachable(island.hf, body.x, body.y, body.z)
          : null;
      const zipHere =
        body.phase === "ground" && !kit?.dead ? zipLineAt(body.x, body.y, body.z) : null;
      if (
        rung &&
        (rung.end === "bottom" ||
          !zipHere ||
          Math.hypot(body.x - rung.ladder.exit.x, body.z - rung.ladder.exit.z) <
            Math.hypot(body.x - zipHere.stand.x, body.z - zipHere.stand.z))
      )
        prompt = rung.ladder.rope
          ? {
              kind: "ladder",
              id: rung.ladder.id,
              name: "Climbing Rope",
              rarity: "",
              color: "#d0582c",
              detail:
                rung.end === "mid"
                  ? `Take hold · ${Math.round(ladderHeight(rung.ladder) - (rung.s ?? 0))} m to the summit`
                  : `${rung.end === "bottom" ? "Up the face to the summit" : "Down the face"} · ${Math.round(ladderHeight(rung.ladder))} m`,
            }
          : {
              kind: "ladder",
              id: rung.ladder.id,
              name: "Ladder",
              rarity: "",
              color: "#c9ccd1",
              detail: `${rung.end === "bottom" ? "Up to the deck" : "Down to the ground"} · ${Math.round(ladderHeight(rung.ladder))} m`,
            };
      // By a zip-line's handle (the Iron Peaks watchtower's deck, the broadcast tower's platform).
      if (!prompt && zipHere)
        prompt = {
          kind: "zip",
          id: zipHere.id,
          name: "Zip-Line",
          rarity: "",
          color: "#d9b44a",
          detail: `${zipHere.id === 0 ? "To Pine Ridge" : "To the Iron Peaks watchtower"} · ${Math.round(zipHere.length)} m · ${Math.round(zipHere.T.done / 1000)} s`,
        };
      if (!prompt && onFoot() && !kit?.dead) {
        camera.getWorldDirection(forward);
        const item = loot.target(eye, forward, INVENTORY.reachM, solid());
        if (item) {
          const d = ITEMS[item.item];
          prompt = {
            id: item.id,
            name: d.name,
            rarity: RARITY[d.rarity].label,
            color: RARITY[d.rarity].color,
            detail: detailOf(item),
          };
        }
      }
      // A door in the crosshair within reach (not through a wall): open or close it.
      if (!prompt && onFoot() && !kit?.dead && island) {
        camera.getWorldDirection(forward);
        const set = island.island.doors;
        const hit = rayDoor(
          set,
          doorOpen,
          eye.x,
          eye.y,
          eye.z,
          forward.x,
          forward.y,
          forward.z,
          DOOR_REACH,
          true,
        );
        const wall = island.island.solid.raycast(
          eye.x,
          eye.y,
          eye.z,
          forward.x,
          forward.y,
          forward.z,
          DOOR_REACH,
        );
        if (hit && (!wall || wall.distance > hit.distance - 0.05)) {
          const open = doorOpen[hit.id] === 1;
          prompt = {
            kind: "door",
            id: hit.id,
            name: open ? "Close door" : "Open door",
            rarity: "",
            color: "#d8c9a8",
            detail: "Door",
          };
        }
      }
    }
    audio.setListener(camera.position.x, camera.position.y, camera.position.z, yaw);
    if (
      strides.advance(
        mySeat,
        body.x,
        body.y,
        body.z,
        body.phase === "ground" && body.grounded && !car && !kit?.dead,
        keys.has(binds.walk) || body.crouched || !!kit?.heal,
        now,
      )
    )
      audio.step(island.footstepSurface(body.x, body.y, body.z), null);
    // On a ladder: a metal step on every rung passed (yours from the climb, others' from where
    // their row puts them).
    // On the climbing rope: a boot on the rock at each foot's step up the face (twice a cycle
    // of the clip), on the face's own surface sound.
    const rungStep = (
      key: number,
      s: number | null,
      at: [number, number, number] | null,
      rope: boolean,
    ) => {
      const i = s === null ? null : Math.floor(s / (rope ? ROPE_CLIMB.cycle / 2 : LADDER.rung));
      const was = rungSeen.get(key);
      if (i === null) {
        rungSeen.delete(key);
        ropeGrabAt.delete(key);
      } else {
        rungSeen.set(key, i);
        if (rope && (was === undefined || was !== i)) {
          // A hand closes on the rope here (taking hold, and at each change of hands): the
          // owner's grab and creak, quieter on a slow climb; and from the second on, the
          // opposite boot stepping onto the rock with it.
          const last = ropeGrabAt.get(key);
          // (Not twice for one grab: a climber stopped right at a change of hands.)
          if (last !== undefined && now - last < 150) return;
          ropeGrabAt.set(key, now);
          const pace = last ? ROPE_CLIMB.cycle / 2 / ((now - last) / 1000) / ROPE.speed : 1;
          audio.ropeGrab(at, pace);
          if (was !== undefined) {
            const [x, y, z] = at ?? [body.x, body.y, body.z];
            audio.step(island!.footstepSurface(x, y, z), at);
          }
        } else if (!rope && was !== undefined && was !== i) audio.ladderStep(at);
      }
    };
    rungStep(
      -1,
      body.phase === "ladder" && body.ladder?.stage === "climb" ? body.ladder.s : null,
      null,
      onRope(),
    );
    for (const o of others) {
      if (o.phase !== "ladder" || o.d > 36 * 36) {
        if (rungSeen.has(o.seat)) rungSeen.delete(o.seat);
        continue;
      }
      const c = climbAt(island.hf, o.pos.x, o.pos.y, o.pos.z);
      rungStep(o.seat, c?.s ?? null, [o.pos.x, o.pos.y, o.pos.z], !!c?.ladder.rope);
    }
    for (const o of others) {
      if (o.d > (o.soft ? (36 * PERK_EFFECT.stepRadius) ** 2 : 36 * 36)) continue;
      const grounded =
        o.phase === "ground" &&
        Math.abs(o.pos.y - solid().supportAt(o.pos.x, o.pos.z, 0.35, o.pos.y + 0.15)) < 0.15;
      if (strides.advance(o.seat, o.pos.x, o.pos.y, o.pos.z, grounded, o.crouched, now))
        audio.step(island.footstepSurface(o.pos.x, o.pos.y, o.pos.z), [o.pos.x, o.pos.y, o.pos.z]);
    }
    const { selectMs } = island.update(camera);
    island.warm(renderer);
    updateSceneRoots(scene, island.root);
    gpu.begin();
    renderer.render(scene, camera);
    // The scene pass's counts (the viewmodel, portrait and present passes reset renderer.info).
    const sceneCalls = renderer.info.render.calls,
      sceneTriangles = renderer.info.render.triangles;
    sharpenScene();
    viewmodel?.render(camera, !onFoot() || !!car || scopeUp || inventoryOpen || !!kit?.dead);
    sceneTarget?.present();
    // The inventory's picture of you: re-drawn when what you wear or hold changes (and, for a
    // few seconds after opening, while late models such as worn gear finish loading).
    if (inventoryOpen && figure && kit) {
      const { gear, gun } = figureState(kit);
      const key = `${gear}|${gun?.item ?? "-"}|${gun?.optic ?? "-"}|${gun?.muzzle ?? "-"}|${!!attachmentParts}|${gearModelsReady()}`;
      if (!figureOpenedAt) figureOpenedAt = now;
      const settling =
        now - figureOpenedAt < 4000 && Math.floor((now - figureOpenedAt) / 1000) !== figureSecond;
      if (key !== figureKey || settling) {
        figureKey = key;
        figureSecond = Math.floor((now - figureOpenedAt) / 1000);
        poseFigure(gear, gun?.item ?? "none", gun?.optic ?? null, gun?.muzzle ?? null);
        figureUrl = figure.render() ?? figureUrl;
      }
    } else figureOpenedAt = 0;
    audio.captain(
      scenePresented &&
        plane.visible &&
        body.phase === "plane" &&
        !kit?.dead &&
        document.visibilityState === "visible",
    );
    gpu.end();
    overlay.frame({
      frameMs: dtMs,
      simMs: selectMs,
      gpuMs: gpu.last,
      calls: sceneCalls,
      triangles: sceneTriangles,
      entities: visible,
      pixelRatio: renderer.getPixelRatio(),
      note: `${tierNote}\nbudget ${budget.scale.toFixed(1)}, ground ${groundLite ? "lite" : "full"}`,
    });
    if (now - lastHud > 66 && hudListener) {
      lastHud = now;
      const groundY = island.hf.heightAt(body.x, body.z);
      const countdown =
        latest.phase === "starting"
          ? Math.max(0, (latest.phaseAt - server) / 1000)
          : latest.phase === "plane" && body.phase === "plane"
            ? Math.max(
                0,
                ((planeMs < DROP.jumpOpensMs ? DROP.jumpOpensMs : routeMs(route)) - planeMs) / 1000,
              )
            : null;
      const heal = kit?.heal
        ? {
            item: ITEMS[kit.heal.item as ItemId].name,
            progress:
              1 - Math.max(0, kit.heal.until - server) / ITEMS[kit.heal.item as "bandage"].useMs,
            left: Math.max(0, kit.heal.until - server) / 1000,
          }
        : null;
      const optic = gun?.optic ? (ITEMS[gun.optic] as OpticDef) : null;
      hudListener({
        phase: latest.phase,
        myPhase: body.phase,
        onRope: onRope(),
        zipLine: body.zip?.id ?? 0,
        lift: (() => {
          const st = body.lift;
          const l = st && island ? lifts(island.hf)[st.id] : null;
          if (!st || !l || body.phase !== "lift") return null;
          return { at: floorPassing(l, body.y), to: stopLabel(l, st.to), up: st.to > st.from };
        })(),
        canopy:
          body.phase === "parachute"
            ? {
                agl: Math.max(0, Math.round(body.y - solid().hf.heightAt(body.x, body.z))),
                kmh: Math.round(Math.hypot(body.vx, body.vz, body.velocityY) * 3.6),
              }
            : null,
        countdown,
        jumpOpen: latest.phase === "plane" && planeMs >= DROP.jumpOpensMs,
        aboard: latest.aboard + (body.phase === "plane" ? 1 : 0),
        humans: latest.humans ?? null,
        altitude: body.y,
        agl: body.y - groundY,
        speedKmh: Math.hypot(body.vx, body.vz, body.velocityY) * 3.6,
        visible,
        kit,
        mag: gun ? Math.max(0, gun.mag - predictedShots) : null,
        aim: viewmodel?.aim ?? 0,
        scope:
          scopeUp && gun
            ? {
                zoom: currentZoom(),
                reticle: optic
                  ? optic.reticle
                  : ((ITEMS[gun.item] as WeaponDef).scope?.reticle ?? "awp"),
              }
            : null,
        // (Between two shells the stage's time is up for a frame or two before the next one
        // arrives: still reloading.)
        reload:
          reloadLeft > 0 || (gunDef?.shells && kit?.shells && kit.reloadUntil)
            ? { progress: reloadP, left: reloadLeft / 1000 }
            : null,
        heal,
        prompt,
        onFoot: onFoot() && !kit?.dead,
        nade: nadeHand,
        alive: latest.alive ?? null,
        zone: (() => {
          const zl = zoneLive(server);
          return zl
            ? {
                ...zl,
                left: zl.until !== null ? Math.max(0, (zl.until - server) / 1000) : null,
                outside:
                  (zl.r <= 0 || Math.hypot(body.x - zl.x, body.z - zl.z) > zl.r) &&
                  body.phase !== "plane",
              }
            : null;
        })(),
        waypoint: waypoint
          ? {
              dist: Math.hypot(waypoint[0] - body.x, waypoint[1] - body.z),
              // Bearing relative to the view (0 ahead, clockwise positive), radians.
              angle: (() => {
                const a =
                  Math.atan2(waypoint[0] - body.x, -(waypoint[1] - body.z)) -
                  Math.atan2(-Math.sin(yaw), Math.cos(yaw));
                return Math.atan2(Math.sin(a), Math.cos(a));
              })(),
            }
          : null,
        nearby: inventoryOpen && loot && onFoot() && !kit?.dead ? nearbyLoot() : [],
        heading:
          ((Math.atan2(-Math.sin(yaw), Math.cos(yaw)) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI),
        me: { x: body.x, z: body.z, yaw },
        watch: latest.watch ?? null,
        result: latest.result ?? null,
        drops: (latest.drops ?? [])
          .filter((d) => server >= d[4]!)
          .map((d) => ({ x: d[1]!, z: d[2]!, falling: server < d[5]! })),
        airdrop: (() => {
          // The newest drop that is coming, falling or landed in the last few seconds.
          for (const d of [...(latest.drops ?? [])].reverse()) {
            const stage =
              server < d[4]!
                ? "incoming"
                : server < d[5]!
                  ? "falling"
                  : server < d[5]! + 6000
                    ? "landed"
                    : null;
            if (!stage) continue;
            return {
              stage,
              seconds: Math.max(
                0,
                Math.ceil(((stage === "incoming" ? d[4]! : d[5]!) - server) / 1000),
              ),
              grid: gridRefAt(d[1]!, d[2]!),
              dist: Math.hypot(d[1]! - body.x, d[2]! - body.z),
            } as const;
          }
          return null;
        })(),
        vehicle: car
          ? {
              name: spec(car.kind).name,
              kmh: Math.abs(car.speed) * 3.6,
              top: spec(car.kind).maxSpeed * 3.6,
              id: car.id,
              health: car.health,
              max: car.maxHealth,
              bike: spec(car.kind).bike,
              flats: [1, 2, 4, 8].filter((b) => (car!.flat ?? 0) & b).length,
            }
          : null,
      });
    }
  }
  requestAnimationFrame(frame);

  return {
    ready,
    mapImage: () => mapUrl,
    operatorFigure: () => figureUrl,
    tacticalMap() {
      if (!mapBuild) return null;
      // Opened before it finished: finish now (one short stall, only that once).
      if (!mapDone) buildMapSlice(Infinity);
      return mapBuild.canvas;
    },
    mapState() {
      const server = serverClock();
      const z = zoneLive(server);
      return {
        me: { x: body.x, z: body.z, yaw, phase: body.phase },
        zone: z
          ? {
              x: z.x,
              z: z.z,
              r: z.r,
              nx: z.nx,
              nz: z.nz,
              nr: z.nr,
              phase: z.phase,
              of: z.of,
              shrinking: z.shrinking,
              left: z.until !== null ? Math.max(0, (z.until - server) / 1000) : null,
            }
          : null,
        plane: latest?.phase === "plane" && route ? { a: route.a, b: route.b } : null,
        drops: (latest?.drops ?? [])
          .filter((d) => server >= d[4]!)
          .map((d) => ({ x: d[1]!, z: d[2]!, falling: server < d[5]! })),
        waypoint,
      };
    },
    setWaypoint(p) {
      waypoint = p;
    },
    relock() {
      if (!disposed && !kit?.dead) void capturePointer(renderer.domElement).catch(() => {});
    },
    snapshot,
    fast(combat) {
      // The next view leaves these out for this connection (BrSeatSync.early).
      if (latest) onCombat({ combat } as BrView, performance.now());
    },
    setSender(fn) {
      send = fn;
    },
    onHud(listener) {
      hudListener = listener;
    },
    onFeed(listener) {
      feedListener = listener;
    },
    setSensitivity(value) {
      sensitivity = value;
    },
    setBinds(next) {
      binds = { ...next };
      keys.clear();
      edges.clear();
    },
    setViewDistance(metres) {
      const next = viewParams(metres);
      if (JSON.stringify(next) === JSON.stringify(view)) return;
      view = next;
      const fog = scene.fog as THREE.Fog;
      fog.near = view.fog[0];
      fog.far = view.fog[1];
      camera.far = view.far;
      camera.updateProjectionMatrix();
      applyGroundRange();
      clearTimeout(viewTimer);
      viewTimer = setTimeout(() => island?.setViewDistance(view.trees, view.detail), 200);
    },
    setVolume(value) {
      audio.setVolume(value);
    },
    setScenePresented(presented) {
      scenePresented = presented;
    },
    setInventoryOpen(open) {
      inventoryOpen = open;
      fireHeld = fireTapped = predictTap = aimHeld = false;
      if (open) {
        canopyLook.release();
        nadeButtons.left = nadeButtons.right = nadeButtons.tapLeft = nadeButtons.tapRight = false;
      }
      if (open && locked()) document.exitPointerLock();
    },
    act: sendAct,
    debug() {
      return {
        body: { ...body },
        camera: [camera.position.x, camera.position.y, camera.position.z],
        shown: [shown.x, shown.y, shown.z],
        pending: pending.length,
        loot: loot?.items.size ?? 0,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        tier: tier.tier,
        tierReason: tier.reason,
        gpu: tier.gpu,
        visibleRemotes: presentedRows.size,
        fullActors: actors.filter((a) => a.seat >= 0 && a.actor.root.visible).length,
        standIns: stand.count,
        /** The renderer and scene themselves, for diagnostics (scripts/br/leak-check). */
        renderer: renderer as unknown,
        scene: scene as unknown,
        view: { camera: camera as unknown, me: me.root as unknown, zipBlend, ropeBlend },
      };
    },
    look(y, p) {
      aimed = true;
      yaw = y;
      pitch = p;
      syncCanopyLook();
      if (canopyLook.active) canopyLook.point(y, p);
    },
    dispose() {
      downloads.abort();
      clearTimeout(viewTimer);
      disposed = true;
      mapBuild?.dispose();
      if (mapBlobUrl) URL.revokeObjectURL(mapBlobUrl);
      removeEventListener("keydown", keyDown);
      removeEventListener("keyup", keyUp);
      removeEventListener("mousemove", onMouse);
      removeEventListener("mousedown", onDown);
      removeEventListener("mouseup", onUp);
      removeEventListener("wheel", onWheel);
      removeEventListener("blur", clearHeldControls);
      removeEventListener("beforeunload", confirmLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerlockchange", onLockChange);
      renderer.domElement.removeEventListener("contextmenu", noMenu);
      renderer.domElement.removeEventListener("click", lock);
      resizeObserver.disconnect();
      context.dispose();
      gpu.dispose();
      overlay.dispose();
      loot?.dispose();
      doorsFx?.dispose();
      zipFx?.dispose();
      liftFx?.dispose();
      paneFx?.dispose();
      trackFx?.dispose();
      ropeFx?.dispose();
      nadeFx.dispose();
      dropSmoke.dispose();
      viewmodel?.dispose();
      figure?.dispose();
      // The operator pool, your own figure and the inventory's figure, and the rifle kit they
      // share (cleanup 2026-11-09: none of these were disposed, so every match left 100
      // character rigs' geometry and textures on the GPU).
      for (const slot of actors) slot.actor.dispose();
      me.dispose();
      figureActor.dispose();
      weaponKit.dispose();
      plain.dispose();
      audio.dispose();
      island?.dispose();
      atmosphere.dispose();
      // Then everything still in the scene, whatever subsystem put it there (the 1v1
      // renderer does the same): no leak depends on a list staying complete.
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((o) => {
        if (o instanceof THREE.Sprite) materials.add(o.material);
        if (
          o instanceof THREE.Mesh ||
          o instanceof THREE.LineSegments ||
          o instanceof THREE.Points
        ) {
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
          if (o instanceof THREE.InstancedMesh) o.dispose();
        }
      });
      // The warm-up groups left the scene after the compile, but the renderer listens on each
      // of their materials until it is disposed: through those listeners every finished match's
      // renderer stayed reachable from the gear and attachment templates.
      for (const group of [warmGear, warmParts])
        group.traverse((o) => {
          const material = (o as THREE.Mesh).material;
          for (const m of Array.isArray(material) ? material : material ? [material] : [])
            materials.add(m);
        });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      sun.shadow.map?.dispose();
      sceneTarget?.dispose();
      sharpen?.dispose();
      recordBrSession(tier.tier, floorMs / 1000, playedMs / 1000);
      scene.clear();
      // What the renderer still tracks after every owner has let go: 0 geometries and 0
      // textures when nothing leaked (scripts/br/leak-check reads this across remounts).
      const leaked = { ...renderer.info.memory };
      renderer.dispose();
      // Each mount owns its context: its drawing buffers are released now, as in 1v1 and 5v5,
      // not when the browser collects the canvas (the leak check found every finished match's
      // renderer still alive after a forced collection).
      renderer.forceContextLoss();
      renderer.domElement.remove();
      return leaked;
    },
  };
}

/** The view's way back from third to first person, ending as the feet touch down (ms): the
 * last of a zip-line ride (its brake's end and the drop onto the platform), and of the step
 * off a climbing rope. */
const ZIP_VIEW_BACK_MS = 800;
const ROPE_VIEW_BACK_MS = 550;
const wallP = new THREE.Vector3(),
  wallZ = new THREE.Vector3();
/**
 * How far in front of the rope's line the rock is at a climber (m): from the hips' height on
 * the rope, into the face (the body's −z) to the terrain. The feet are placed on it
 * (rope-climb.ts), so they stand on the rock where the face is not quite the rope's own line
 * (its foot, the lip of the plateau).
 */
function ropeWall(
  ground: { heightAt(x: number, z: number): number },
  at: THREE.Vector3,
  frame: THREE.Quaternion,
) {
  wallP.set(0, 0.75, 0).applyQuaternion(frame).add(at);
  wallZ.set(0, 0, -1).applyQuaternion(frame);
  const above = (d: number) =>
    wallP.y + wallZ.y * d - ground.heightAt(wallP.x + wallZ.x * d, wallP.z + wallZ.z * d);
  let lo = ROPE.offFace - 0.2,
    hi = ROPE.offFace + 0.3;
  if (above(lo) <= 0) return lo;
  if (above(hi) > 0) return hi;
  for (let k = 0; k < 6; k++) {
    const mid = (lo + hi) / 2;
    if (above(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
const frameT = { x: 0, y: 0, z: 0 },
  frameX = new THREE.Vector3(),
  frameY = new THREE.Vector3(),
  frameZ = new THREE.Vector3(),
  frameM = new THREE.Matrix4();
/**
 * A climber's body on the rope (rope-climb.ts's frame): +y up the rope's line at `s` (blended from
 * upright by `w`, 0 … 1, stepping on and off), +z out from the rock face (the climber faces
 * `yaw`, into it), into `out`.
 */
function ropeFrame(
  rope: NonNullable<ReturnType<typeof ladders>[number]["rope"]>,
  s: number,
  yaw: number,
  w: number,
  out: THREE.Quaternion,
) {
  ropeTangent(rope, s, frameT);
  frameY.set(frameT.x * w, frameT.y * w + (1 - w), frameT.z * w).normalize();
  frameZ.set(Math.sin(yaw), 0, Math.cos(yaw));
  frameZ.addScaledVector(frameY, -frameZ.dot(frameY)).normalize();
  frameX.crossVectors(frameY, frameZ).normalize();
  frameM.makeBasis(frameX, frameY, frameZ);
  return out.setFromRotationMatrix(frameM);
}
