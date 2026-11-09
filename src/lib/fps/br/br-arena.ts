import { BrAimRecoil, type BrRecoilState } from "./aim-recoil";
import * as THREE from "three";
import { updateSceneRoots } from "./scene-transforms";
import type { ActEvent, BrAct } from "./actions";
import { AIRDROP } from "./airdrops";
import { createBrAudio } from "./br-audio";
import { CanopyLook } from "./canopy-look";
import { BrStrides } from "./footsteps";
import { brVisibleRows, brActorPriority } from "./remote-visibility";
import { createBrViewmodel } from "./br-viewmodel";
import type { ShotEvent } from "./combat";
import { watchContextLoss } from "./context-loss";
import { DevOverlay, GpuTimer } from "./dev-overlay";
import {
  DROP,
  newDropBody,
  planeAt,
  routeMs,
  stepDrop,
  type DropBody,
  type DropInput,
  type DropPhase,
  type Route,
} from "./drop";
import type { Gun } from "./inventory";
import { INVENTORY, ITEMS, RARITY, type ItemId, type OpticDef, type WeaponDef } from "./items";
import { loadIslandScene, type IslandScene } from "./island-scene";
import { defaultBinds, VIEW_RANGE, viewParams, type BrBinds } from "./br-settings";
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
import { createLootRenderer, type LootClient } from "./loot-renderer";
import { createNadeRenderer } from "./nade-renderer";
import { createVehicleRenderer, kindOfRow } from "./vehicle-renderer";
import { spec, stepVehicle, VEHICLES, type Vehicle } from "./vehicles";
import type { NadeEvent } from "./match";
import type { LootRow } from "./loot-world";
import { itemFromCode } from "./loot-world";
import { fitCharacterGun, loadAttachmentParts, type AttachmentParts } from "./attachment-fit";
import { fitCharacterGear, gearModelsReady, loadGearModels } from "./character-gear";
import { createOperatorFigure } from "./operator-figure";
import { createDoorRenderer } from "./door-renderer";
import { DOOR_REACH, rayDoor, withDoors } from "./doors";
import type { StaticWorld } from "./static-world";
import { PHASE_CODES, type BrKitView, type BrPhase, type BrZoneView } from "./match";
import { WORLD_HALF } from "./world";
import { tacticalMapBuilder } from "./tactical-map";
import { createCharacter } from "../character";
import { RenderBudget } from "../presentation";
import { LocalGrenadeHands } from "../grenades/grenade-timeline";
import { createWeaponKit } from "../weapon";
import { TICK_MS } from "../simulation";
import { KNIFE } from "../combat";

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
  events: Array<{ seat: number; phase: DropPhase }>;
  now?: number;
  combat?: CombatEvent[];
  loot?: { add: LootRow[]; del: number[] };
  kit?: BrKitView;
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
};

export type BrPrompt = {
  /** What E does: pick an item up, get into a vehicle, get out, open or close a door. */
  kind?: "item" | "enter" | "exit" | "door";
  id: number;
  name: string;
  rarity: string;
  color: string;
  detail: string;
};
export type BrHud = {
  phase: BrPhase;
  myPhase: DropPhase;
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
  vehicle: { name: string; kmh: number; health: number; max: number; bike: boolean } | null;
  /** Supply drops for the map: position and whether still falling. */
  drops: Array<{ x: number; z: number; falling: boolean }>;
  /** The waypoint: distance (m) and bearing from the view (radians, clockwise). */
  waypoint: { dist: number; angle: number } | null;
  /** Items within reach (nearest first; only while the inventory is open). */
  nearby: BrNearby[];
  /** Compass heading of the view (radians, 0 north, clockwise). */
  heading: number;
};
export type BrKillWeapon = "ak" | "m4" | "awp" | "knife" | "he" | "fire" | "gas" | "vehicle";
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
  | { kind: "eliminated"; by: string }
  /** Recon Chip: gunfire nearby, as a screen angle (0 ahead, clockwise). */
  | { kind: "recon"; angle: number };

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
    /** Where the camera is (headless checks of the chase camera). */
    camera: [number, number, number];
    pending: number;
    loot: number;
    geometries: number;
    textures: number;
    programs: number;
    visibleRemotes: number;
    fullActors: number;
    standIns: number;
  };
  /** Point the camera (headless checks). */
  look(yaw: number, pitch: number): void;
  dispose(): void;
};

const INTERP_MS = 110;
/** First person under the canopy: the canopy sits this much higher (its lines above the view). */
const FP_LIFT = 1;
/** Full animated characters for the nearest players; the rest are cheap stand-ins (PLAN §7). */
const CHARACTERS = 16;
const MAX_PLAYERS = 100;
const BASE_FOV = 75;

function detailOf(item: { item: ItemId; qty: number; durability?: number; mag?: number }) {
  const d = ITEMS[item.item];
  switch (d.category) {
    case "weapon":
      return `${d.short} · ${item.mag ?? 0}/${(d as WeaponDef).magazine}`;
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
  const img = g.createImageData(N, N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const x = -WORLD_HALF + ((i + 0.5) / N) * 2 * WORLD_HALF,
        zz = -WORLD_HALF + ((j + 0.5) / N) * 2 * WORLD_HALF;
      const h = island.hf.heightAt(x, zz);
      const o = (j * N + i) * 4;
      if (h < 0.5) {
        img.data.set([38, 72, 98, 255], o);
      } else {
        const k = Math.min(1, h / 260);
        img.data.set([92 + k * 70, 112 + k * 50, 70 + k * 60, 255], o);
      }
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

export function createBrArena(
  host: HTMLElement,
  base: string,
  progress: (value: number, label: string) => void,
): BrArenaControls {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    // A 14 km world and a 10 cm near plane exhaust ordinary depth precision at aerial
    // distances. Keep the same visible range and geometry without shoreline depth ties.
    logarithmicDepthBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(renderer.domElement);
  const budget = new RenderBudget();
  const gpu = new GpuTimer(renderer.getContext() as WebGL2RenderingContext);
  const overlay = new DevOverlay(host, false);
  const scene = new THREE.Scene();
  const sky = new THREE.Color(0x9fb8cc);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 1800, 9500);
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 14000);
  scene.add(new THREE.HemisphereLight(0xc9dcf0, 0x5a5040, 1.15));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.position.set(-550, 620, 450);
  scene.add(sun);
  // As in 1v1/5v5, do not repeat a whole-scene walk in every render pass.
  scene.updateMatrixWorld(true);
  scene.matrixWorldAutoUpdate = false;
  const context = watchContextLoss(renderer, { scene, camera, onRestored: () => gpu.reset() });
  const audio = createBrAudio(base);
  const strides = new BrStrides();

  const resize = () => {
    const w = host.clientWidth || innerWidth,
      h = host.clientHeight || innerHeight;
    renderer.setPixelRatio(budget.ratio(w, h, devicePixelRatio));
    renderer.setSize(w, h, false);
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
  /** Door states as the server sent them, and the island with them closed (prediction, rays). */
  let doorOpen = new Uint8Array(0);
  let solidView: StaticWorld | null = null;
  const solid = () => solidView ?? island!.island.solid;
  /** The vehicle you drive, predicted like your body (vehicles.ts runs here too). */
  let car: Vehicle | null = null;
  const nadeFx = createNadeRenderer(scene, (cue, at) => audio.grenade(cue, at));
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
  let baseTick = 0,
    baseAt = 0;
  const body: DropBody = newDropBody();
  const aimRecoil = new BrAimRecoil();
  let seq = 0;
  const pending: Array<{ seq: number; input: DropInput; clock: number }> = [];
  /** Visual offset after a correction, decayed toward zero (no camera pops). */
  const correction = new THREE.Vector3();
  const buffer: Array<{ at: number; rows: Map<number, number[]> }> = [];
  let yaw = 0,
    pitch = 0,
    sensitivity = 0.0022,
    lookX = 0,
    lookY = 0;
  const keys = new Set<string>();
  const edges = new Set<string>();
  let binds: BrBinds = defaultBinds();
  /** The view distance's ground-texture range, shortened (then off) on slow frames. */
  function applyGroundRange() {
    island?.setGroundRange(
      budget.scale >= 0.8 ? view.ground : budget.scale >= 0.7 ? Math.min(80, view.ground) : 0,
    );
  }
  let view = viewParams(VIEW_RANGE.default);
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
  /** Own shots predicted since the last loadout from the server. */
  let predictedShots = 0,
    lastShotAt = -1e9;
  /** Local Karambit swing presentation, gated like the server (draw time, shared cooldown). */
  let knifeReadyAt = 0;
  let prompt: BrPrompt | null = null;

  const serverClock = () => (baseTick + (performance.now() - baseAt) / TICK_MS) * TICK_MS;

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
  let figure: ReturnType<typeof createOperatorFigure> | null = null,
    figureUrl: string | null = null,
    figureKey = "",
    figureOpenedAt = 0,
    figureSecond = -1;
  function poseFigure(
    gear: number,
    primary: "ak47" | "m4" | "awp" | "none",
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
    const gun = (k.active >= 0 ? k.guns[k.active] : null) ?? k.guns[0] ?? k.guns[1] ?? null;
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
  // The zone: the gas wall at the current circle, a white ring where the next one will be.
  const wallMat = new THREE.MeshBasicMaterial({
    color: 0xd9663d,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 128, 1, true), wallMat);
  wall.visible = false;
  wall.frustumCulled = false;
  scene.add(wall);
  const ringPts: number[] = [];
  for (let i = 0; i <= 128; i++) {
    const a = (i / 128) * Math.PI * 2;
    ringPts.push(Math.cos(a), 0, Math.sin(a));
  }
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.Float32BufferAttribute(ringPts, 3),
    ),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
  );
  ring.visible = false;
  ring.frustumCulled = false;
  scene.add(ring);
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
    while (performance.now() < deadline) if ((mapDone = mapBuild.step(16))) break;
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
  let mapUrl: string | null = null;
  /** Facing per seat from the server; death times for the fall animation. */
  const deathAt = new Map<number, number>();

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
    solidView = withDoors(island.island.solid, island.island.doors, doorOpen);
    doorsFx = createDoorRenderer(scene, island.island.doors);
    mapUrl = drawMap(island);
    mapBuild = tacticalMapBuilder({
      hf: island.hf,
      cover: island.island.vegetation.cover,
      meta: island.meta,
      layout: island.island.layout,
      manifest: island.manifest,
    });
    viewmodel = createBrViewmodel(renderer, island.loader, base);
    viewmodel.onGrenadeCue = (cue) => audio.grenade(cue);
    viewmodel.onKnifeCue = (cue) => audio.knifeCue(cue);
    void loadAttachmentParts(
      island.loader,
      new URL("fps/br/models/attachments.glb", base).href,
    ).then((p) => {
      attachmentParts = p;
    });
    // Worn helmets, vests and packs (CC BY models; the procedural pieces stand in until then).
    void loadGearModels(island.loader, new URL("fps/br/models/gear.glb", base).href);
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
    island.update(camera);
    await renderer.compileAsync(scene, camera);
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
    const viewCompiled = renderer.compileAsync(viewmodel.viewScene, viewmodel.viewCamera);
    viewmodel.prepareCompile(false);
    await viewCompiled;
    if (disposed) return;
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
          (e.code === binds.primary || e.code === binds.secondary || e.code === binds.knife) &&
          !nadeHands.busy
        )
          putAwayNade();
        if (e.code === binds.grenade) selectNade();
        // F: inspect the Karambit (cosmetic; ignored with a gun or a grenade in hand).
        if (e.code === binds.inspect && !e.repeat && knifeDrawn()) viewmodel?.knifeInspect();
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
    yaw -= e.movementX * sensitivity * scale;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * sensitivity * scale));
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
  const noMenu = (e: Event) => e.preventDefault();
  const lock = () => {
    audio.unlock();
    if (!inventoryOpen) void renderer.domElement.requestPointerLock?.();
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
  addEventListener("blur", clearHeldControls);
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("pointerlockchange", onLockChange);
  renderer.domElement.addEventListener("contextmenu", noMenu);
  renderer.domElement.addEventListener("click", lock);

  const activeGun = (): Gun | null =>
    kit && kit.active >= 0 && !kit.dead ? (kit.guns[kit.active] as Gun | null) : null;
  function currentZoom() {
    const g = activeGun();
    if (!g || !viewmodel || viewmodel.aim < 0.5) return 1;
    return g.optic ? (ITEMS[g.optic] as OpticDef).zoom : g.item === "awp" ? 4 : 1.1;
  }
  const onFoot = () => body.phase === "ground" || body.phase === "swim";
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
    slot?: 0 | 1 | 2;
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
        binds.knife,
        binds.bandage,
        binds.medkit,
      ])
        edges.delete(c);
    const space = edge(binds.jump);
    const slot = edge(binds.primary)
      ? 0
      : edge(binds.secondary)
        ? 1
        : edge(binds.knife)
          ? 2
          : undefined;
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
    if (edge(binds.interact) && prompt) {
      if (prompt.kind === "exit") sendAct({ act: "exit" });
      else if (prompt.kind === "enter") sendAct({ act: "enter", id: prompt.id });
      else if (prompt.kind === "door") {
        if (onFoot()) sendAct({ act: "door", id: prompt.id });
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
      // Space: leave the plane (the canopy opens at once); Ctrl under it: dive.
      jumpOut: body.phase === "plane" && space,
      dive: body.phase === "parachute" && keys.has(binds.dive),
      ...(canopyLook.active ? { canopyYaw: canopyLook.course } : {}),
      fire: armed && (fireHeld || tapped) && onFoot(),
      aim: armed && (aimHeld || stab) && body.phase === "ground",
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
  function predictShot(now: number, server: number) {
    const g = activeGun();
    if (!g || !kit || !viewmodel) return;
    const d = ITEMS[g.item] as WeaponDef;
    const mag = g.mag - predictedShots;
    if (mag <= 0 || kit.heal || (kit.reloadUntil && server < kit.reloadUntil)) return;
    if (server < kit.drawUntil || now - lastShotAt < d.intervalMs) return;
    lastShotAt = now;
    predictedShots++;
    aimRecoil.shot(
      server,
      g.item !== "awp",
      (g.muzzle ? (ITEMS[g.muzzle] as { recoilScale?: number }).recoilScale : 1) ?? 1,
    );
    viewmodel.shot(now);
    audio.shot(d.model, g.muzzle === "silencer", null, d.hearM);
  }

  // ------------------------------------------------------------------ snapshots
  let aimed = false;
  function onCombat(view: BrView, now: number) {
    for (const e of view.combat ?? []) {
      if (e.type === "act") {
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
        }
        continue;
      }
      if (e.type === "hit") {
        if (e.seat === mySeat) {
          audio.hit(e.zone === "head");
          if (kit?.active === -1) audio.knifeHit();
          feed({ kind: "hit", head: e.zone === "head", kill: false });
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
      if (e.type === "recon") {
        const dx = Math.sin(e.bearing),
          dz = Math.cos(e.bearing);
        const right = dx * Math.cos(yaw) - dz * Math.sin(yaw),
          fwd = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
        feed({ kind: "recon", angle: Math.atan2(right, fwd) });
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
              : e.gun === "awp"
                ? "awp"
                : e.gun === "he" || e.gun === "fire" || e.gun === "gas" || e.gun === "vehicle"
                  ? e.gun
                  : "knife";
        feed({
          kind: "kill",
          text: `${e.byName ?? "?"} [${weapon}] ${e.name ?? "?"}`,
          killer: e.gun === "gas" ? null : (e.byName ?? "?"),
          victim: e.name ?? "?",
          weapon,
          self: e.by === e.seat && e.gun !== "gas",
          mine: e.by === mySeat || e.seat === mySeat,
        });
        if (e.by === mySeat) feed({ kind: "hit", head: false, kill: true });
        if (e.seat === mySeat) feed({ kind: "eliminated", by: e.byName ?? "?" });
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
    baseTick = view.tick;
    baseAt = now;
    if (view.kit) {
      const before = kit;
      kit = view.kit;
      predictedShots = 0;
      // Reload sound when a reload starts; heal done chime.
      const g = activeGun();
      if (g && kit.reloadUntil && kit.reloadUntil !== before?.reloadUntil)
        audio.reload(g.item as "ak47" | "m4" | "awp");
      if (before?.heal && !kit.heal && kit.hp > before.hp) audio.healed();
    }
    loot?.apply(view.loot);
    vehiclesFx?.apply(view.vehicles, now);
    doorsFx?.apply(view.doors, doorOpen);
    if (view.driving === undefined) car = null;
    else {
      const was = car;
      const row = vehiclesFx?.row(view.driving);
      if (row) car = vehiclesFx!.asVehicles().find((v) => v.id === view.driving) ?? null;
      // Just got in: look the way it points (the chase camera starts behind it).
      if (!was && car) {
        yaw = car.yaw;
        pitch = -0.15;
      }
    }
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
    for (const r of view.players) rows.set(r[0]!, r);
    buffer.push({ at: now, rows });
    while (buffer.length > 30) buffer.shift();
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
      for (const p of pending)
        stepDrop(
          solid(),
          island.meta,
          route!,
          body,
          healingInput(p.input),
          p.clock - view.phaseAt,
          TICK_MS,
        );
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
  const healingInput = (input: DropInput): DropInput =>
    kit?.heal ? { ...input, sprint: false, walk: true } : input;

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
      }
      return;
    }
    if (budget.update(dtMs)) {
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
      send?.(JSON.stringify({ v: 1, type: "br-input", seq, ...input, playbackMs: INTERP_MS }));
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
    audio.setPlaneAboard(latest.phase === "plane" && body.phase === "plane" && !kit?.dead);
    if ((fireHeld || predictTap) && !inventoryOpen && locked() && body.phase === "ground")
      predictShot(now, server);
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

    // Vehicles first: drivers are sat in them as they are drawn this frame.
    vehiclesFx?.update(now, car, dtMs);
    // Others, interpolated INTERP_MS behind.
    const t = now - INTERP_MS;
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
        pose.crouched = state[7] === 1;
        pose.stance = (ra[7] ?? 0) + ((rb[7] ?? 0) - (ra[7] ?? 0)) * k;
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
        const agl = hanging ? o.pos.y - solid().hf.heightAt(o.pos.x, o.pos.z) : 99;
        slot.actor.update(dtMs, now, 0, !dead, o.crouched, {
          stance: o.stance,
          airborne: o.phase === "freefall" || o.phase === "parachute",
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
          primary: gun === "awp" || gun === "ak47" || gun === "m4" ? gun : "none",
          // No gun drawn on foot: the Karambit in the hand (swings from "melee" events).
          weapon: !gun && o.phase === "ground" ? "knife" : "rifle",
          silenced: o.muzzle >= 0 && itemFromCode(o.muzzle) === "silencer",
          ...(dead ? { death: deathAt.get(o.seat) } : {}),
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
    const px = body.x + correction.x,
      py = body.y + correction.y,
      pz = body.z + correction.z;
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
    // Driving: your operator sat in the seat (the camera is always third person there).
    const mySeated = car ? (vehiclesFx?.seatRider(car.id, me.root) ?? null) : null;
    me.root.visible = (airborne && !canopyFp) || !!mySeated;
    if (mySeated) {
      me.update(dtMs, now, 0, true, false, { seated: mySeated, primary: "none", weapon: "rifle" });
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
    if (car) {
      // Driving (owner, 2026-11-08: "not FPS while driving", "camera angle above the car and
      // bike"): always third person, a chase camera above and behind looking down on the
      // vehicle, as in PUBG/Warzone. The mouse swings it around (and tilts it, within limits);
      // it settles back behind while you move and pulls back a little with the speed.
      if (Math.abs(car.speed) > 2) {
        const d = Math.atan2(Math.sin(car.yaw - yaw), Math.cos(car.yaw - yaw));
        yaw += d * Math.min(1, dtMs / 450);
      }
      const s = spec(car.kind);
      const fast = Math.min(1, Math.abs(car.speed) / s.maxSpeed);
      const dist = (s.bike ? 4.3 : 5.4 + 0.2 * (s.length - 4.5)) + (s.bike ? 1 : 1.4) * fast;
      // Pitch below the horizon: 0.36 rad looks down on the roof; the mouse adds or takes some.
      const tilt = Math.max(0.14, Math.min(0.8, 0.36 - pitch * 0.5));
      const pivotY = car.y + (s.bike ? 1.1 : s.height * 0.75);
      const ox = Math.sin(yaw) * Math.cos(tilt) * dist,
        oz = Math.cos(yaw) * Math.cos(tilt) * dist,
        oy = Math.sin(tilt) * dist;
      if (!chaseCamSet) chaseCam.set(ox, oy, oz);
      chaseCamSet = true;
      chaseCam.lerp(forward.set(ox, oy, oz), 1 - Math.exp(-dtMs / 70));
      const cx = car.x + chaseCam.x,
        cz = car.z + chaseCam.z;
      camera.position.set(cx, Math.max(pivotY + chaseCam.y, solid().hf.heightAt(cx, cz) + 1), cz);
      // Aim just ahead of the vehicle so the road in front is in view.
      camera.lookAt(car.x - Math.sin(yaw) * 2.5, pivotY, car.z - Math.cos(yaw) * 2.5);
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
      const eyeH = body.phase === "swim" ? 0.3 : body.crouched ? 0.95 : 1.6;
      // Landing: a short knee bend (0.3 m, gone in 0.35 s), nothing that locks you in place.
      const dip = 0.3 * Math.max(0, 1 - (now - landedAt) / 350);
      camera.position.set(px, py + eyeH - dip, pz);
      const recoil = aimRecoil.sample(server, dtMs);
      camera.rotation.set(
        Math.max(-1.45, Math.min(1.45, pitch + recoil.pitch)),
        yaw + recoil.yaw,
        0,
        "YXZ",
      );
    }
    nadeFx.update(solid(), server, now);
    doorsFx?.update(dtMs, now, camera.position);
    for (const d of latest.drops ?? []) {
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
    audio.engine(car ? Math.abs(car.speed) : 0, !!car && spec(car.kind).bike);
    const z = zoneLive(server);
    wall.visible = !!z && z.r < 7000;
    // The next circle's ring is drawn at the player's height (a line on the horizon), so only
    // on foot or swimming: from the air it lay edge-on at eye level and flickered across the
    // screen with the canopy's sway (owner, 2026-11-05). The maps show it in the air.
    ring.visible =
      !!z &&
      z.nr > 0 &&
      (z.nx !== z.x || z.nz !== z.z || z.nr !== z.r) &&
      (body.phase === "ground" || body.phase === "swim");
    if (z) {
      wall.position.set(z.x, 300, z.z);
      wall.scale.set(Math.max(0.5, z.r), 900, Math.max(0.5, z.r));
      ring.position.set(z.nx, body.y + 1, z.nz);
      ring.scale.set(z.nr, 1, z.nr);
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
    if (!mapDone) buildMapSlice(performance.now() + 4);
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
      server >= (kit?.drawUntil ?? 0);
    const reloadLeft = kit?.reloadUntil ? Math.max(0, kit.reloadUntil - server) : 0;
    const gunDef = gun ? (ITEMS[gun.item] as WeaponDef) : null;
    const reloadP = gunDef && reloadLeft > 0 ? 1 - reloadLeft / gunDef.reloadMs : 0;
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
        empty: !!gun && gun.mag - predictedShots <= 0,
        moving: [binds.forward, binds.left, binds.back, binds.right].some((k) => keys.has(k)),
        sprinting: keys.has(binds.sprint),
        airborne: !body.grounded,
        lookX,
        lookY,
        silenced: gun?.muzzle === "silencer",
        flash: !gun?.muzzle || !(ITEMS[gun.muzzle] as { hideFlash?: boolean }).hideFlash,
        knife: knifeDrawn() && body.phase === "ground",
        walking: keys.has(binds.walk) || body.crouched,
        backward: keys.has(binds.back) && !keys.has(binds.forward),
        strafe: Number(keys.has(binds.right)) - Number(keys.has(binds.left)),
      });
      lookX = lookY = 0;
      scopeUp = viewmodel.scopeView(gun);
      const z = 1 + (currentZoom() - 1) * viewmodel.aim;
      // Diving under the canopy: the view widens a little with the speed.
      const diveFov = car
        ? 8 * Math.min(1, Math.abs(car.speed) / spec(car.kind).maxSpeed)
        : body.phase === "parachute"
          ? 7 * Math.max(0, Math.min(1, mySwing.angle / DIVE_SWING))
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
    for (const o of others) {
      if (o.d > 36 * 36) continue;
      const grounded =
        o.phase === "ground" &&
        Math.abs(o.pos.y - solid().supportAt(o.pos.x, o.pos.z, 0.35, o.pos.y + 0.15)) < 0.15;
      if (strides.advance(o.seat, o.pos.x, o.pos.y, o.pos.z, grounded, o.crouched, now))
        audio.step(island.footstepSurface(o.pos.x, o.pos.y, o.pos.z), [o.pos.x, o.pos.y, o.pos.z]);
    }
    const { selectMs } = island.update(camera);
    updateSceneRoots(scene, island.root);
    if (overlay.visible) gpu.begin();
    renderer.render(scene, camera);
    viewmodel?.render(camera, !onFoot() || !!car || scopeUp || inventoryOpen || !!kit?.dead);
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
        poseFigure(
          gear,
          (gun?.item as "ak47" | "m4" | "awp" | undefined) ?? "none",
          gun?.optic ?? null,
          gun?.muzzle ?? null,
        );
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
    if (overlay.visible) gpu.end();
    overlay.frame({
      frameMs: dtMs,
      simMs: selectMs,
      gpuMs: gpu.last,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      entities: visible,
      pixelRatio: renderer.getPixelRatio(),
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
          scopeUp && gun ? { zoom: currentZoom(), reticle: optic ? optic.reticle : "awp" } : null,
        reload: reloadLeft > 0 ? { progress: reloadP, left: reloadLeft / 1000 } : null,
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
        drops: (latest.drops ?? []).map((d) => ({ x: d[1]!, z: d[2]!, falling: server < d[5]! })),
        vehicle: car
          ? {
              name: spec(car.kind).name,
              kmh: Math.abs(car.speed) * 3.6,
              health: car.health,
              max: car.maxHealth,
              bike: spec(car.kind).bike,
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
        drops: (latest?.drops ?? []).map((d) => ({ x: d[1]!, z: d[2]!, falling: server < d[5]! })),
        waypoint,
      };
    },
    setWaypoint(p) {
      waypoint = p;
    },
    relock() {
      if (!disposed && !kit?.dead) void renderer.domElement.requestPointerLock?.();
    },
    snapshot,
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
        pending: pending.length,
        loot: loot?.items.size ?? 0,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
        visibleRemotes: presentedRows.size,
        fullActors: actors.filter((a) => a.seat >= 0 && a.actor.root.visible).length,
        standIns: stand.count,
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
      removeEventListener("keydown", keyDown);
      removeEventListener("keyup", keyUp);
      removeEventListener("mousemove", onMouse);
      removeEventListener("mousedown", onDown);
      removeEventListener("mouseup", onUp);
      removeEventListener("blur", clearHeldControls);
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
      viewmodel?.dispose();
      figure?.dispose();
      audio.dispose();
      island?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
