import * as THREE from "three";
import type { ActEvent, BrAct } from "./actions";
import { createBrAudio } from "./br-audio";
import { createBrViewmodel } from "./br-viewmodel";
import type { ShotEvent } from "./combat";
import { watchContextLoss } from "./context-loss";
import { DevOverlay, GpuTimer } from "./dev-overlay";
import {
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
import { createLootRenderer, type LootClient } from "./loot-renderer";
import { createNadeRenderer } from "./nade-renderer";
import { createVehicleRenderer, kindOfRow } from "./vehicle-renderer";
import { spec, stepVehicle, VEHICLES, type Vehicle } from "./vehicles";
import type { NadeEvent } from "./match";
import type { LootRow } from "./loot-world";
import { itemFromCode } from "./loot-world";
import { PHASE_CODES, type BrKitView, type BrPhase, type BrZoneView } from "./match";
import { WORLD_HALF } from "./world";
import { createCharacter } from "../character";
import { RenderBudget } from "../presentation";
import { createWeaponKit } from "../weapon";
import { TICK_MS } from "../simulation";

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
    crouched: boolean;
    phase: DropPhase;
    seq: number;
  };
  aboard: number;
  /** [seat, x, y, z, phase code (5: eliminated), yaw, gun item code or −1, crouched]. */
  players: number[][];
  events: Array<{ seat: number; phase: DropPhase }>;
  now?: number;
  combat?: CombatEvent[];
  loot?: { add: LootRow[]; del: number[] };
  kit?: BrKitView;
  /** Smoke (0) and flames (1) burning now: [id, kind, x, y, z, until]. */
  areas?: number[][];
  alive?: number;
  zone?: BrZoneView;
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
};

export type BrPrompt = {
  /** What E does: pick an item up, get into a vehicle, get out. */
  kind?: "item" | "enter" | "exit";
  id: number;
  name: string;
  rarity: string;
  color: string;
  detail: string;
};
export type BrHud = {
  phase: BrPhase;
  myPhase: DropPhase;
  /** Seconds until take-off (starting) or until the jump window opens / the plane ejects you. */
  countdown: number | null;
  jumpOpen: boolean;
  aboard: number;
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
  /** Fully aimed through a red dot, holographic or reflex sight: its reticle. */
  sight: OpticDef["reticle"] | null;
  /** 0..1 progress of the reload or heal in hand, with its remaining seconds. */
  reload: { progress: number; left: number } | null;
  heal: { item: string; progress: number; left: number } | null;
  prompt: BrPrompt | null;
  /** The player is on foot and may act (inventory, pickups). */
  onFoot: boolean;
  /** Grenade in hand (key 4; left mouse overhand, right mouse underhand). */
  nade: "he" | "smoke" | "fire" | null;
  alive: number | null;
  zone: (BrZoneView & { left: number | null; outside: boolean }) | null;
  /** Position and facing for the minimap (world metres; yaw radians). */
  me: { x: number; z: number; yaw: number };
  watch: BrView["watch"] | null;
  result: BrView["result"] | null;
  vehicle: { name: string; kmh: number; health: number; max: number; bike: boolean } | null;
  /** Supply drops for the map: position and whether still falling. */
  drops: Array<{ x: number; z: number; falling: boolean }>;
};
export type BrFeed =
  | { kind: "toast"; text: string; tone: "ok" | "warn" }
  | { kind: "hit"; head: boolean; kill: boolean }
  | { kind: "hurt"; from: number }
  | { kind: "kill"; text: string; mine: boolean }
  | { kind: "eliminated"; by: string }
  /** Recon Chip: gunfire nearby, as a screen angle (0 ahead, clockwise). */
  | { kind: "recon"; angle: number };

export type BrArenaControls = {
  ready: Promise<void>;
  /** A small top-down picture of the island (data URL) for the minimap, once loaded. */
  mapImage(): string | null;
  snapshot(view: BrView): void;
  setSender(send: ((message: string) => void) | null): void;
  onHud(listener: (hud: BrHud) => void): void;
  onFeed(listener: (event: BrFeed) => void): void;
  setSensitivity(value: number): void;
  /** Inventory screen open: the cursor is free and the gun is lowered (movement continues). */
  setInventoryOpen(open: boolean): void;
  /** Send an inventory action (equip, drop, heal…) to the server. */
  act(action: BrAct): void;
  /** The predicted local body and unacknowledged inputs (tests and the dev overlay). */
  debug(): {
    body: DropBody;
    pending: number;
    loot: number;
    geometries: number;
    textures: number;
    programs: number;
  };
  /** Point the camera (headless checks). */
  look(yaw: number, pitch: number): void;
  dispose(): void;
};

const INTERP_MS = 110;
/** Full animated characters for the nearest players; the rest are cheap stand-ins (PLAN §7). */
const CHARACTERS = 16;
const DROP_JUMP_OPENS_MS = 10_000;
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
    case "plate":
      return `Level ${d.level} · ${Math.round(item.durability ?? d.durability)}/${d.durability}`;
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
  const context = watchContextLoss(renderer, { scene, camera, onRestored: () => gpu.reset() });
  const audio = createBrAudio(base);

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
  let vehiclesFx: ReturnType<typeof createVehicleRenderer> | null = null;
  /** The vehicle you drive, predicted like your body (vehicles.ts runs here too). */
  let car: Vehicle | null = null;
  const nadeFx = createNadeRenderer(scene);
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
  /** A click always fires at least once, even if released between two frames. */
  let throwOver = false,
    throwUnder = false;
  let fireTapped = false,
    predictTap = false;
  let fireHeld = false,
    aimHeld = false,
    inventoryOpen = false;
  let disposed = false;
  /** Own shots predicted since the last loadout from the server. */
  let predictedShots = 0,
    lastShotAt = -1e9;
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
  let chuteTemplate: THREE.Object3D | null = null;
  let crateTemplate: THREE.Object3D | null = null;
  /** Supply crates (airdrops.ts): the crate and its canopy while it falls. */
  const crates = new Map<number, { crate: THREE.Object3D; chute: THREE.Object3D | null }>();
  const chutes: THREE.Object3D[] = [];
  const self = new THREE.Group(); // the local player's canopy, seen in third person
  scene.add(self);
  // The 1v1/5v5 operators (police "A", terrorist "B"), pooled as in the 5v5 renderer.
  const weaponKit = createWeaponKit();
  const plain = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.8 });
  const actors = Array.from({ length: CHARACTERS }, (_, i) => {
    const a = createCharacter(i % 2 ? "B" : "A", plain, weaponKit, { worldRifle: true });
    a.root.visible = false;
    scene.add(a.root);
    return { actor: a, seat: -1, deadAt: 0 };
  });
  // Your own operator, seen from behind in freefall and under the canopy (first person on foot).
  const me = createCharacter("A", plain, weaponKit, { worldRifle: true });
  me.root.visible = false;
  scene.add(me.root);
  /** Tracers: short-lived streaks for shots others fire (and yours, from the server). */
  const tracerGeo = new THREE.BufferGeometry();
  const TRACERS = 64;
  const tracerPos = new Float32Array(TRACERS * 6);
  tracerGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(tracerPos, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const tracers = new THREE.LineSegments(
    tracerGeo,
    new THREE.LineBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.55 }),
  );
  tracers.frustumCulled = false;
  scene.add(tracers);
  const tracerLife: number[] = new Array(TRACERS).fill(0);
  let tracerNext = 0;
  function tracer(a: [number, number, number], b: [number, number, number], now: number) {
    const i = tracerNext++ % TRACERS;
    tracerPos.set([...a, ...b], i * 6);
    tracerLife[i] = now + 70;
    tracerGeo.attributes["position"]!.needsUpdate = true;
  }
  // The zone: the gas wall at the current circle, a white ring where the next one will be.
  const wallMat = new THREE.MeshBasicMaterial({
    color: 0x3d7bd9,
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
  let mapUrl: string | null = null;
  /** Facing per seat from the server; death times for the fall animation. */
  const deathAt = new Map<number, number>();

  const ready = (async () => {
    island = await loadIslandScene(base, progress);
    if (disposed) return;
    scene.add(island.root);
    loot = createLootRenderer(scene, island.loader, base);
    vehiclesFx = createVehicleRenderer(scene, island.loader, island.manifest);
    mapUrl = drawMap(island);
    viewmodel = createBrViewmodel(renderer, island.loader, base);
    const model = async (id: string) => {
      const m = island!.manifest.models[id];
      if (!m) return null;
      return (await island!.loader.loadAsync(m.lods[0]!.file)).scene;
    };
    progress(0.92, "Loading weapons");
    const [yc130, chute, crate] = await Promise.all([
      model("yc130"),
      model("parachute"),
      model("airdrop-crate"),
      loot.ready,
      viewmodel.ready,
      vehiclesFx.ready,
    ]);
    if (yc130) plane.add(yc130);
    chuteTemplate = chute;
    crateTemplate = crate;
    if (chute) {
      const mine = chute.clone();
      mine.visible = false;
      mine.position.y = 1.8; // the lines meet at the shoulders
      self.add(mine);
    }
    progress(0.96, "Preparing shaders");
    camera.position.set(0, 900, 0);
    island.update(camera);
    await renderer.compileAsync(scene, camera);
    await renderer.compileAsync(viewmodel.viewScene, viewmodel.viewCamera);
    progress(1, "Ready");
  })();

  // ------------------------------------------------------------------ input
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    if (e.code === "F3" && down) {
      e.preventDefault();
      overlay.toggle();
      return;
    }
    if (e.code === "Tab" || e.code === "AltLeft") e.preventDefault();
    if (down && !keys.has(e.code)) {
      edges.add(e.code);
      // The hand changes at once (a click right after 4 throws, it never fires the gun).
      if (e.code === "Digit1" || e.code === "Digit2") nadeHand = null;
      if (e.code === "Digit4") selectNade();
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
    if (!locked()) return;
    const scale = 1 / Math.max(1, currentZoom());
    yaw -= e.movementX * sensitivity * scale;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * sensitivity * scale));
    lookX += e.movementX;
    lookY += e.movementY;
  };
  const onDown = (e: MouseEvent) => {
    if (!locked()) return;
    if (nadeHand) {
      // Grenade in hand: the buttons throw (left overhand, right underhand, both medium).
      if (e.button === 0) throwOver = true;
      if (e.button === 2) throwUnder = true;
      return;
    }
    if (e.button === 0) fireHeld = fireTapped = predictTap = true;
    if (e.button === 2) aimHeld = true;
  };
  const onUp = (e: MouseEvent) => {
    if (e.button === 0) fireHeld = false;
    if (e.button === 2) aimHeld = false;
  };
  const noMenu = (e: Event) => e.preventDefault();
  const lock = () => {
    audio.unlock();
    if (!inventoryOpen) void renderer.domElement.requestPointerLock?.();
  };
  const onLockChange = () => {
    if (!locked()) fireHeld = aimHeld = false;
  };
  addEventListener("keydown", keyDown);
  addEventListener("keyup", keyUp);
  addEventListener("mousemove", onMouse);
  addEventListener("mousedown", onDown);
  addEventListener("mouseup", onUp);
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
    const i = nadeHand ? carried.indexOf(nadeHand) : -1;
    nadeHand = carried.length ? carried[(i + 1) % carried.length]! : null;
    if (nadeHand) fireHeld = aimHeld = false;
    if (!carried.length) feed({ kind: "toast", text: "NO GRENADES", tone: "warn" });
  }

  /** The input for this 30 Hz step, from the keys and the camera direction. */
  function sample(): DropInput & {
    pitch: number;
    fire: boolean;
    aim: boolean;
    reload: boolean;
    slot?: 0 | 1;
  } {
    const f = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
      s = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const edge = (code: string) => {
      const had = edges.has(code);
      edges.delete(code);
      return had;
    };
    const space = edge("Space");
    const slot = edge("Digit1") ? 0 : edge("Digit2") ? 1 : undefined;
    if (nadeHand && (throwOver || throwUnder) && onFoot()) {
      sendAct({
        act: "throw",
        nade: nadeHand,
        kind: throwOver && throwUnder ? "medium" : throwOver ? "over" : "under",
      });
      const left =
        kit?.bag.reduce((n, b) => n + (b.item === `grenade-${nadeHand}` ? b.qty : 0), 0) ?? 0;
      if (left <= 1) nadeHand = null;
    }
    throwOver = throwUnder = false;
    const reload = edge("KeyR");
    // Discrete actions: E picks up what the prompt shows; 3 bandage, 5 medkit (hotbar).
    if (edge("KeyE") && prompt) {
      if (prompt.kind === "exit") sendAct({ act: "exit" });
      else if (prompt.kind === "enter") sendAct({ act: "enter", id: prompt.id });
      else if (onFoot()) sendAct({ act: "pickup", id: prompt.id });
    }
    if (edge("Digit3") && onFoot()) sendAct({ act: "heal", item: "bandage" });
    if (edge("Digit5") && onFoot()) sendAct({ act: "heal", item: "medkit" });
    if (edge("KeyX") && kit?.heal) sendAct({ act: "cancel" });
    const armed = !inventoryOpen && locked();
    const tapped = fireTapped;
    fireTapped = false;
    return {
      forward: f,
      strafe: s,
      yaw,
      pitch,
      jump: body.phase === "ground" && keys.has("Space"),
      crouch: keys.has("KeyC"),
      sprint: keys.has("ShiftLeft") && !aimHeld,
      walk: keys.has("AltLeft"),
      // Space: leave the plane, then open the parachute.
      jumpOut: body.phase === "plane" && space,
      deploy: body.phase === "freefall" && space,
      dive: body.phase === "freefall" && keys.has("ControlLeft"),
      fire: armed && (fireHeld || tapped) && onFoot(),
      aim: armed && aimHeld && body.phase === "ground",
      reload,
      ...(slot !== undefined ? { slot } : {}),
    };
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
      if (e.type === "shot") {
        if (e.seat !== mySeat) {
          audio.shot(e.gun, e.silenced, e.origin, e.hearM);
          const slot = actors.find((a) => a.seat === e.seat);
          slot?.actor.shot(now);
        }
        const end =
          e.impact ??
          ([
            e.origin[0] + e.dir[0] * 150,
            e.origin[1] + e.dir[1] * 150,
            e.origin[2] + e.dir[2] * 150,
          ] as [number, number, number]);
        // Start the streak a little ahead of the shooter so it never crosses their own face.
        const start: [number, number, number] = [
          e.origin[0] + e.dir[0] * 1.5,
          e.origin[1] + e.dir[1] * 1.5 - 0.08,
          e.origin[2] + e.dir[2] * 1.5,
        ];
        tracer(start, end, now);
        continue;
      }
      if (e.type === "hit") {
        if (e.seat === mySeat) {
          audio.hit(e.zone === "head");
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
        audio.boom([e.x, e.y, e.z]);
        continue;
      }
      if (e.type === "area") {
        const total = e.nade === "smoke" ? 18_000 : 7000;
        nadeFx.area(e.id, e.nade, e.x, e.y, e.z, e.until - total, e.until);
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
        const gun =
          e.gun === "m4a1s"
            ? "M4"
            : e.gun === "ak47"
              ? "AK-47"
              : e.gun === "awp"
                ? "AWP"
                : e.gun === "he"
                  ? "HE"
                  : "Fire";
        feed({
          kind: "kill",
          text: `${e.byName ?? "?"} [${gun}] ${e.name ?? "?"}`,
          mine: e.by === mySeat || e.seat === mySeat,
        });
        if (e.by === mySeat) feed({ kind: "hit", head: false, kill: true });
        if (e.seat === mySeat) feed({ kind: "eliminated", by: e.byName ?? "?" });
        deathAt.set(e.seat, now);
      }
    }
  }

  function snapshot(view: BrView) {
    const now = performance.now();
    // First view: face the plane's direction of travel, looking a little down at the island.
    if (!aimed) {
      aimed = true;
      const r = view.route ?? route;
      if (r) yaw = Math.atan2(-r.dir[0], -r.dir[1]);
      pitch = -0.3;
    }
    mySeat = view.you.seat;
    latest = view;
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
      crouched: y.crouched,
    });
    while (pending.length && pending[0]!.seq <= y.seq) pending.shift();
    if (car && island) {
      // Driving: replay the unacknowledged inputs on the server's vehicle state.
      const others = vehiclesFx!.asVehicles();
      for (const p of pending)
        stepVehicle(island.island.solid, island.meta, car, p.input, TICK_MS, others);
    } else if (island && view.phase !== "waiting" && view.phase !== "starting")
      for (const p of pending)
        stepDrop(
          island.island.solid,
          island.meta,
          route!,
          body,
          healingInput(p.input),
          p.clock - view.phaseAt,
          TICK_MS,
        );
    const jump = before.distanceTo(new THREE.Vector3(body.x, body.y, body.z));
    // Small differences are smoothed out; large ones (teleport, plane) snap.
    if (jump < 3) correction.add(before.sub(new THREE.Vector3(body.x, body.y, body.z)));
    else correction.set(0, 0, 0);
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
  const suppressorsHidden = new WeakSet<object>();
  function frame(now: number) {
    if (disposed) return;
    requestAnimationFrame(frame);
    const dtMs = Math.min(100, now - last);
    last = now;
    if (!island || !latest || !route) {
      if (island && !context.lost) {
        island.update(camera);
        renderer.render(scene, camera);
      }
      return;
    }
    if (budget.update(dtMs)) resize();
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
        stepVehicle(
          island.island.solid,
          island.meta,
          car,
          input,
          TICK_MS,
          vehiclesFx?.asVehicles() ?? [],
        );
      else if (latest.phase !== "waiting" && latest.phase !== "starting")
        stepDrop(
          island.island.solid,
          island.meta,
          route,
          body,
          healingInput(input),
          clock - latest.phaseAt,
          TICK_MS,
        );
    }
    if ((fireHeld || predictTap) && !inventoryOpen && locked() && body.phase === "ground")
      predictShot(now, server);
    predictTap = false;
    correction.multiplyScalar(Math.exp(-dtMs / 90));
    if (context.lost) return;

    // The plane, from the shared route and the server clock.
    const planeMs = server - latest.phaseAt;
    plane.visible = latest.phase === "plane" && planeMs <= routeMs(route) + 5000;
    if (plane.visible) {
      const [px, py, pz] = planeAt(route, planeMs);
      plane.position.set(px, py + 6, pz);
      plane.rotation.set(0, Math.atan2(route.dir[0], route.dir[1]), 0);
    }

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
      chuteCount = 0,
      visible = 0;
    const others: Array<{
      seat: number;
      pos: THREE.Vector3;
      phase: DropPhase | "dead";
      yaw: number;
      gun: number;
      crouched: boolean;
      d: number;
    }> = [];
    if (a && b) {
      const k = b.at > a.at ? Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at))) : 1;
      for (const [seat, rb] of b.rows) {
        const ra = a.rows.get(seat) ?? rb;
        const pos = new THREE.Vector3(
          ra[1]! + (rb[1]! - ra[1]!) * k,
          ra[2]! + (rb[2]! - ra[2]!) * k,
          ra[3]! + (rb[3]! - ra[3]!) * k,
        );
        // Shortest-way yaw interpolation.
        const ya = ra[5] ?? 0,
          yb = rb[5] ?? 0;
        const dy = Math.atan2(Math.sin(yb - ya), Math.cos(yb - ya));
        others.push({
          seat,
          pos,
          phase: rb[4] === 5 ? "dead" : PHASE_CODES[rb[4]!]!,
          yaw: ya + dy * k,
          gun: rb[6] ?? -1,
          crouched: rb[7] === 1,
          d: pos.distanceToSquared(camera.position),
        });
      }
    }
    others.sort((x, y) => x.d - y.d);
    visible = others.length;
    // Characters for the nearest; a seat keeps its actor while it stays near (no flicker).
    const near = new Set(others.slice(0, CHARACTERS).map((o) => o.seat));
    for (const slot of actors) if (!near.has(slot.seat)) slot.seat = -1;
    for (const o of others) {
      if (o.phase === "parachute" && chuteTemplate) {
        let c = chutes[chuteCount];
        if (!c) {
          c = chuteTemplate.clone();
          chutes.push(c);
          scene.add(c);
        }
        c.visible = true;
        c.position.set(o.pos.x, o.pos.y + 1.8, o.pos.z);
        c.rotation.y = o.yaw;
        chuteCount++;
      }
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
        root.position.copy(o.pos);
        root.rotation.set(o.phase === "freefall" ? -Math.PI / 2.2 : 0, o.yaw, 0);
        // The M4 is unsuppressed in the battle royale (attachments are not sent for others).
        if (!suppressorsHidden.has(root)) {
          const sup = root.getObjectByName("SuppressorGeometry");
          if (sup) {
            sup.visible = false;
            suppressorsHidden.add(root);
          }
        }
        const gun = itemFromCode(o.gun);
        const dead = o.phase === "dead";
        if (dead && !deathAt.has(o.seat)) deathAt.set(o.seat, now - 5000);
        if (!dead) deathAt.delete(o.seat);
        slot.actor.update(dtMs, now, 0, !dead, o.crouched, {
          airborne: o.phase === "freefall" || o.phase === "parachute",
          primary: gun === "awp" ? "awp" : "rifle",
          ...(dead ? { death: deathAt.get(o.seat) } : {}),
        });
        continue;
      }
      if (ground < MAX_PLAYERS) {
        const lying = o.phase === "freefall" || o.phase === "dead";
        q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), lying ? -Math.PI / 2 : 0);
        m4.compose(o.pos, q, one);
        stand.setMatrixAt(ground++, m4);
      }
    }
    for (const slot of actors) if (slot.seat === -1) slot.actor.root.visible = false;
    for (let i = chuteCount; i < chutes.length; i++) chutes[i]!.visible = false;
    stand.count = ground;
    stand.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < TRACERS; i++)
      if (tracerLife[i]! && now > tracerLife[i]!) {
        tracerLife[i] = 0;
        tracerPos.fill(0, i * 6, i * 6 + 6);
        tracerGeo.attributes["position"]!.needsUpdate = true;
      }

    // Camera: chase the plane, third person in the air, first person on the ground.
    const px = body.x + correction.x,
      py = body.y + correction.y,
      pz = body.z + correction.z;
    const fx = -Math.sin(yaw) * Math.cos(pitch),
      fy = Math.sin(pitch),
      fz = -Math.cos(yaw) * Math.cos(pitch);
    const mine = self.children[0];
    if (mine) mine.visible = body.phase === "parachute";
    self.position.set(px, py, pz);
    self.rotation.y = yaw;
    const airborne = body.phase === "freefall" || body.phase === "parachute";
    me.root.visible = airborne;
    if (airborne) {
      me.root.position.set(px, py, pz);
      me.root.rotation.set(body.phase === "freefall" ? -Math.PI / 2.2 : 0, yaw, 0);
      me.update(dtMs, now, 0, true, false, { airborne: true });
    }
    if (car) {
      // Driving: a chase camera you can swing around with the mouse; it settles back behind
      // the vehicle while it moves.
      if (Math.abs(car.speed) > 2) {
        const d = Math.atan2(Math.sin(car.yaw - yaw), Math.cos(car.yaw - yaw));
        yaw += d * Math.min(1, dtMs / 500);
      }
      const s = spec(car.kind);
      const back = s.bike ? 4.6 : 6.8,
        up = s.bike ? 1.9 : 2.5;
      camera.position.set(
        car.x + Math.sin(yaw) * Math.cos(pitch * 0.5) * back,
        car.y + up - Math.sin(pitch * 0.5) * back,
        car.z + Math.cos(yaw) * Math.cos(pitch * 0.5) * back,
      );
      camera.lookAt(car.x - Math.sin(yaw) * 6, car.y + 1.2, car.z - Math.cos(yaw) * 6);
    } else if (body.phase === "plane" && plane.visible) {
      camera.position.set(
        plane.position.x - fx * 70,
        plane.position.y + 18 - fy * 70,
        plane.position.z - fz * 70,
      );
      camera.lookAt(plane.position);
    } else if (airborne) {
      camera.position.set(px - fx * 9, py + 3 - fy * 9, pz - fz * 9);
      camera.lookAt(px + fx * 20, py + 1 + fy * 20, pz + fz * 20);
    } else {
      const eyeH = body.phase === "swim" ? 0.3 : body.crouched ? 0.95 : 1.6;
      camera.position.set(px, py + eyeH, pz);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
    }
    nadeFx.update(island.island.solid, server, now);
    vehiclesFx?.update(now, car);
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
      const y = d[3]! + Math.max(0, ((d[5]! - server) / 1000) * 6);
      c.crate.position.set(d[1]!, y, d[2]!);
      if (c.chute) {
        c.chute.visible = server < d[5]!;
        c.chute.position.set(d[1]!, y + 1.6, d[2]!);
      }
    }
    audio.engine(car ? Math.abs(car.speed) : 0, !!car && spec(car.kind).bike);
    const z = latest.zone;
    wall.visible = !!z && z.r < 7000;
    ring.visible = !!z && z.nr > 0 && (z.nx !== z.x || z.nz !== z.z || z.nr !== z.r);
    if (z) {
      wall.position.set(z.x, 300, z.z);
      wall.scale.set(z.r, 900, z.r);
      ring.position.set(z.nx, body.y + 1, z.nz);
      ring.scale.set(z.nr, 1, z.nr);
    }
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
      !!gun && aimHeld && !inventoryOpen && locked() && body.phase === "ground" && !kit?.heal;
    const reloadLeft = kit?.reloadUntil ? Math.max(0, kit.reloadUntil - server) : 0;
    const gunDef = gun ? (ITEMS[gun.item] as WeaponDef) : null;
    const reloadP = gunDef && reloadLeft > 0 ? 1 - reloadLeft / gunDef.reloadMs : 0;
    let scopeUp = false;
    if (viewmodel) {
      viewmodel.setGun(gun);
      viewmodel.update(dtMs, now, {
        gun,
        aiming,
        reload: reloadP,
        empty: !!gun && gun.mag - predictedShots <= 0,
        moving: keys.has("KeyW") || keys.has("KeyA") || keys.has("KeyS") || keys.has("KeyD"),
        sprinting: keys.has("ShiftLeft"),
        airborne: !body.grounded,
        lookX,
        lookY,
        silenced: gun?.muzzle === "silencer",
        flash: !gun?.muzzle || !(ITEMS[gun.muzzle] as { hideFlash?: boolean }).hideFlash,
      });
      lookX = lookY = 0;
      scopeUp = viewmodel.scopeView(gun);
      const z = 1 + (currentZoom() - 1) * viewmodel.aim;
      const fov = (2 * Math.atan(Math.tan((BASE_FOV * Math.PI) / 360) / z) * 180) / Math.PI;
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
        const item = loot.target(eye, forward, INVENTORY.reachM, island.island.solid);
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
    }
    audio.setListener(camera.position.x, camera.position.y, camera.position.z, yaw);
    const { selectMs } = island.update(camera);
    gpu.begin();
    renderer.render(scene, camera);
    viewmodel?.render(camera, !onFoot() || scopeUp || inventoryOpen || !!kit?.dead);
    gpu.end();
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
                ((planeMs < DROP_JUMP_OPENS_MS ? DROP_JUMP_OPENS_MS : routeMs(route)) - planeMs) /
                  1000,
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
        countdown,
        jumpOpen: latest.phase === "plane" && planeMs >= DROP_JUMP_OPENS_MS,
        aboard: latest.aboard + (body.phase === "plane" ? 1 : 0),
        altitude: body.y,
        agl: body.y - groundY,
        speedKmh: Math.hypot(body.vx, body.vz, body.velocityY) * 3.6,
        visible,
        kit,
        mag: gun ? Math.max(0, gun.mag - predictedShots) : null,
        aim: viewmodel?.aim ?? 0,
        scope:
          scopeUp && gun ? { zoom: currentZoom(), reticle: optic ? optic.reticle : "awp" } : null,
        sight: optic && viewmodel?.sightView(gun) ? optic.reticle : null,
        reload: reloadLeft > 0 ? { progress: reloadP, left: reloadLeft / 1000 } : null,
        heal,
        prompt,
        onFoot: onFoot() && !kit?.dead,
        nade: nadeHand,
        alive: latest.alive ?? null,
        zone: latest.zone
          ? {
              ...latest.zone,
              left:
                latest.zone.until !== null
                  ? Math.max(0, (latest.zone.until - server) / 1000)
                  : null,
              outside:
                Math.hypot(body.x - latest.zone.x, body.z - latest.zone.z) > latest.zone.r &&
                onFoot(),
            }
          : null,
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
    setInventoryOpen(open) {
      inventoryOpen = open;
      fireHeld = aimHeld = false;
      if (open && locked()) document.exitPointerLock();
    },
    act: sendAct,
    debug() {
      return {
        body: { ...body },
        pending: pending.length,
        loot: loot?.items.size ?? 0,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0,
      };
    },
    look(y, p) {
      aimed = true;
      yaw = y;
      pitch = p;
    },
    dispose() {
      disposed = true;
      removeEventListener("keydown", keyDown);
      removeEventListener("keyup", keyUp);
      removeEventListener("mousemove", onMouse);
      removeEventListener("mousedown", onDown);
      removeEventListener("mouseup", onUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      renderer.domElement.removeEventListener("contextmenu", noMenu);
      renderer.domElement.removeEventListener("click", lock);
      resizeObserver.disconnect();
      context.dispose();
      gpu.dispose();
      overlay.dispose();
      loot?.dispose();
      viewmodel?.dispose();
      audio.dispose();
      island?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
