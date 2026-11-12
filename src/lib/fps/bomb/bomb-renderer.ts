import { clampPitch, mouseLook, moveAxes, PITCH_LIMIT, wrapYaw } from "@/lib/fps/look";
import * as THREE from "three";
import { SHOT_AT_GAP_MS, SHOT_AT_M } from "../shot-awareness";
import { createPerfOverlay } from "../perf-overlay";
import { cycleEquipment } from "../equipment-cycle";
import { sharpenMapColors } from "../map-texture-quality";
import type { ArenaLoadProgress } from "../loading";
import { CROUCH_EYE_HEIGHT, EYE_HEIGHT, eyeHeight } from "../map";
import { createMapEnvironment } from "../maps/environments";
import type { Input, Player, Seat } from "../protocol";
import { drawnGun, predictMovement, TICK_MS } from "../simulation";
import { createCharacter } from "../character";
import { KNIFE, recoilPatternOf, recoveryProfile } from "../combat";
import { createKarambitViewmodel, KARAMBIT_VIEWMODEL_REST } from "../karambit-viewmodel";
import type { KarambitControls } from "../karambit-animator";
import { createBloodEffects } from "../blood-effects";
import { HANDLING, decay, frameDelta } from "../handling";
import { createImpactEffects } from "../impacts";
import { decalDepthOffset } from "../maps/depth-layers";
import { createWeaponKit } from "../weapon";
import {
  CameraCorrection,
  CameraStance,
  CameraVertical,
  FrameMotion,
  JumpPresentation,
  RemotePresentation,
  RenderBudget,
} from "../presentation";
import { capturePointer } from "../pointer-capture";
import { createMuzzleFlash } from "../muzzle-flash";
import {
  AK_VIEWMODEL,
  AWP_POLICE_VIEWMODEL,
  AWP_TERRORIST_VIEWMODEL,
  createAuthoredViewmodel,
  DEAGLE_POLICE_VIEWMODEL,
  DEAGLE_TERRORIST_VIEWMODEL,
  M4_VIEWMODEL,
  MP5_POLICE_VIEWMODEL,
  MP5_TERRORIST_VIEWMODEL,
} from "../authored-viewmodel";
import { MP5_VIEWMODEL_REST } from "../mp5-animation";
import { DEAGLE_VIEWMODEL_REST } from "../deagle-animation";
import { DEAGLE } from "../sidearm";
import {
  AWP_VIEWMODEL_REST,
  boltPose,
  RELOAD_BOLT,
  SHOT_BOLT,
  type BoltPose,
} from "../awp-animation";
import { AWP_TIMELINE } from "../awp-timeline";
import { createC4Viewmodel } from "../c4/c4-viewmodel";
import { c4Up, initialC4State, stepC4 } from "../c4/c4-timeline";
import { createWorldC4 } from "../c4/world-c4";
import {
  AK_CASING,
  casingPoolOf,
  createShellCasings,
  DEAGLE_CASING,
  M4_CASING,
  MP5_CASING,
} from "../shell-casings";
import { PlaybackDelay, REMOTE_DELAY_MS, SnapshotClock } from "../network";
import { createViewmodelMotion } from "../viewmodel-motion";
import { deathPose, deathSupport } from "../death-presentation";
import { BOMB_RULES, SLOT_COUNT, type BombInput, type Team } from "./rules";
import { bombMap, type BombMapId } from "./maps";
import type { BombView, PublicPlayer } from "./snapshot";
import { warmPrograms } from "../program-warmup";
import { createOperatorGunBatch } from "../operator-gun-batch";
import { SpectatorPlayback, spectatorGrenade } from "./spectator";
import { AWP, MP5, primaryOf, type Primary } from "../primary";
import { AwpScope } from "../awp-scope";
import { createGrenadeClient } from "../grenades/grenade-client";
import type { GrenadeCue } from "../audio";
import type { GrenadeType, ThrowKind } from "../grenades/rules";

/** The 1v1 renderer's camera and rifle framing (copied, not imported: that module is large). */
const WORLD_FOV = 70;
const VIEWMODEL_REST = { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 };
const M4_VIEWMODEL_REST = VIEWMODEL_REST;
/** Suppressed M4 muzzle: a small, dim flash (as in the 1v1 renderer). */
const SUPPRESSED_FLASH = { scale: 0.42, light: 0.7 };
/** Bodies stay where they fell until the round ends (as in the reference games). */
type Corpse = { x: number; y: number; z: number; yaw: number; at: number; floor: number };

export type BombArenaControls = {
  ready: Promise<void>;
  snapshot: (view: BombView) => void;
  setSensitivity: (value: number) => void;
  setReducedMotion: (reduced: boolean) => void;
  lock: () => Promise<void>;
  suspend: (paused: boolean) => void;
  /** Listener orientation for the audio layer (enemy sounds arrive as bearings). */
  audioPresentation: () => { yaw: number; poseAt: number; x: number; z: number };
  programs: () => string[];
  diagnostics: () => {
    calls: number;
    triangles: number;
    frameMs: number;
    cpuMs: number;
    geometries: number;
    textures: number;
    programs: number;
    pixelRatio: number;
    visibleActors: number;
    camera: number[];
    renderFrames: number;
    /** The Karambit's current base clip and its time (harness checks). */
    knifeClip: { name: string; time: number } | null;
  };
  dispose: () => void;
};

type Remote = {
  motion: RemotePresentation;
  pose: { x: number; y: number; z: number; yaw: number; pitch: number; at: number; crouch: number };
  drawn: boolean;
  animated: boolean;
  elapsed: number;
  corpse: Corpse | null;
  label: HTMLDivElement;
};

/**
 * The Practice Bomb Defusal scene: Sandgate, the local player (predicted with the shared movement
 * code), up to nine remote players from the room's per-recipient snapshots, and a dead player's
 * view through a living teammate. Cosmetic only: the room decides every hit, plant and round.
 * The 1v1 renderer is untouched; this reuses its building blocks (map environment, authored
 * operators and rifles, presentation filters).
 */
export function mountBombArena(
  host: HTMLElement,
  send: (input: BombInput) => void,
  onLock: (locked: boolean) => void,
  hooks: {
    onLoadProgress?: (progress: ArenaLoadProgress) => void;
    /**
     * A locally presented shot (for the audio layer): true for the Police M4; `awp` the AWP;
     * `gun` the MP5 or the Desert Eagle.
     */
    onLocalShot?: (m4: boolean, awp?: boolean, gun?: "mp5" | "deagle") => void;
    /** AWP zoom edges (true: zooming in), for the scope sounds. */
    onScope?: (entering: boolean) => void;
    onKnifeCue?: (cue: string) => void;
    /** Own hit on an opponent confirmed (the hit marker shows): its sound. */
    onHitConfirmed?: () => void;
    /** An opponent's bullet struck within SHOT_AT_M of the player: its sound. */
    onShotAt?: () => void;
    onPovReload?: (
      reload: {
        m4: boolean;
        awp: boolean;
        gun?: "mp5" | "deagle";
        empty: boolean;
        offset: number;
      } | null,
    ) => void;
    /** First-person C4 plant cues ("press:7", "armed", "grab", "place", "release", "cancel"). */
    onC4Cue?: (name: string) => void;
    /** Grenade sounds (own handling centred; world sounds with a bearing and a gain). */
    onGrenadeSound?: (cue: GrenadeCue, options: { gain?: number; bearing?: number }) => void;
  } = {},
  /** The match's map (welcome / snapshot `mapId`); the page remounts when a new match draws another. */
  mapId: BombMapId = "sandgate",
): BombArenaControls {
  const map = bombMap(mapId).map;
  const lighting = map.presentation.lighting;
  hooks.onLoadProgress?.({ value: 10, label: "Preparing graphics" });
  const scene = new THREE.Scene(),
    viewScene = new THREE.Scene();
  scene.background = new THREE.Color(lighting.background);
  scene.fog = new THREE.Fog(lighting.fog.color, lighting.fog.near, lighting.fog.far);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    powerPreference: "high-performance",
    desynchronized: true,
  });
  if (!context) throw new Error("WebGL 2 is unavailable in this browser");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    powerPreference: "high-performance",
  });
  const budget = new RenderBudget(),
    cameraStance = new CameraStance(),
    cameraVertical = new CameraVertical();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lighting.exposure;
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(WORLD_FOV, 1, 0.06, map.presentation.viewDistance);
  const viewCamera = new THREE.PerspectiveCamera(60, 1, 0.03, 8);
  viewCamera.layers.set(1);
  camera.rotation.order = "YXZ";
  camera.position.set(0, EYE_HEIGHT, -37);
  scene.add(camera);
  // The world is lit by the sun and the hemisphere only, as on the 1v1 maps. No point lights:
  // their count is part of every material's shader key, so a light appearing mid-round (the
  // bomb's LED, the explosion) recompiled every visible material (render audit 2026-11-03).
  const hemisphere = new THREE.HemisphereLight(
    lighting.hemisphere.sky,
    lighting.hemisphere.ground,
    lighting.hemisphere.intensity,
  );
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(lighting.sun.color, lighting.sun.intensity);
  sun.position.set(...lighting.sun.position);
  sun.castShadow = true;
  const shadow = map.presentation.shadow;
  sun.shadow.mapSize.set(shadow.mapSize, shadow.mapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = shadow.far;
  sun.shadow.camera.left = -shadow.extent;
  sun.shadow.camera.right = shadow.extent;
  sun.shadow.camera.top = shadow.extent;
  sun.shadow.camera.bottom = -shadow.extent;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  // Operator fallback bodies stay plain; sponsor graphics belong to the environment only.
  const plain = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.8 });
  const environment = createMapEnvironment(scene, map);
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) object.matrixAutoUpdate = false;
  });
  const impacts = createImpactEffects(scene);
  const blood = createBloodEffects(scene, map);
  const weaponKit = createWeaponKit();
  // Five operators per side (Police "A" with the M4, Terrorists "B" with the AK). A slot always
  // uses the same body of its side (slot % 5), so halftime only changes which pool draws it.
  const pools: Record<Team, ReturnType<typeof createCharacter>[]> = {
    police: Array.from({ length: BOMB_RULES.teamSize }, () =>
      createCharacter("A", plain, weaponKit, { worldRifle: true }),
    ),
    terrorist: Array.from({ length: BOMB_RULES.teamSize }, () =>
      createCharacter("B", plain, weaponKit, { worldRifle: true }),
    ),
  };
  const allActors = [...pools.police, ...pools.terrorist];
  for (const actor of allActors) {
    actor.root.visible = false;
    scene.add(actor.root);
  }
  // The guns in the operators' hands: one draw call per part for all ten of them.
  const gunBatch = createOperatorGunBatch(scene, SLOT_COUNT);
  let reflections: THREE.WebGLRenderTarget | undefined;
  const captureReflections = () => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const hidden = allActors.map((a) => [a.root, a.root.visible] as const);
    for (const [root] of hidden) root.visible = false;
    const next = pmrem.fromScene(scene, 0.04, 0.1, 100);
    for (const [root, visible] of hidden) root.visible = visible;
    pmrem.dispose();
    reflections?.dispose();
    reflections = next;
    scene.environment = next.texture;
    viewScene.environment = next.texture;
  };
  captureReflections();
  scene.environmentIntensity = lighting.environmentIntensity;
  viewScene.environmentIntensity = scene.environmentIntensity;
  viewScene.fog = scene.fog;
  // Contact shadows under every operator (one shared texture/material).
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  {
    const pen = shadowCanvas.getContext("2d")!,
      shade = pen.createRadialGradient(32, 32, 2, 32, 32, 32);
    shade.addColorStop(0, "rgba(0,0,0,.32)");
    shade.addColorStop(1, "rgba(0,0,0,0)");
    pen.fillStyle = shade;
    pen.fillRect(0, 0, 64, 64);
  }
  const contactTexture = new THREE.CanvasTexture(shadowCanvas);
  const contactMaterial = new THREE.MeshBasicMaterial({
    map: contactTexture,
    transparent: true,
    depthWrite: false,
    ...decalDepthOffset(1),
  });
  const contactGeometry = new THREE.PlaneGeometry(0.8, 0.8);
  // Keep actor visibility/floor placement, but submit their identical shadows in one draw.
  const contacts = new THREE.InstancedMesh(contactGeometry, contactMaterial, SLOT_COUNT);
  contacts.name = "operator-contact-shadows";
  contacts.frustumCulled = false;
  contacts.count = 0;
  contacts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(contacts);
  // ------------------------------------------------------------------ the bomb
  const bomb = new THREE.Group();
  bomb.name = "bomb";
  {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x4b4a32, roughness: 0.7, metalness: 0.2 }),
    );
    body.position.y = 0.06;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.02, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x1b1d1a, roughness: 0.5 }),
    );
    panel.position.set(-0.05, 0.13, 0);
    const wires = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a2a1e, roughness: 0.6 }),
    );
    wires.rotation.z = Math.PI / 2;
    wires.position.set(0, 0.125, 0.08);
    bomb.add(body, panel, wires);
  }
  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), ledMaterial);
  led.position.set(0.1, 0.135, 0);
  bomb.add(led);
  // The real C4 replaces the placeholder block once it loads (same model as the first-person plant).
  const worldC4 = createWorldC4();
  bomb.add(worldC4.root);
  void worldC4.ready.then(() => {
    for (const child of [...bomb.children]) if (child !== worldC4.root) child.visible = false;
  });
  bomb.visible = false;
  scene.add(bomb);
  const blast = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 14),
    new THREE.MeshBasicMaterial({
      color: 0xffb060,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  blast.visible = false;
  scene.add(blast);
  let blastAt = -Infinity;
  // ------------------------------------------------------------------ first-person rifle
  const weaponGroup = new THREE.Group();
  weaponGroup.name = "first-person-weapon";
  viewCamera.add(weaponGroup);
  viewScene.add(viewCamera);
  const muzzle = createMuzzleFlash();
  weaponGroup.add(muzzle.root);
  const flashLight = new THREE.PointLight(0xffb35f, 0, 2);
  flashLight.layers.set(1);
  weaponGroup.add(flashLight);
  const viewLight = new THREE.HemisphereLight(0xe4eaff, 0x392346, 1.8);
  viewLight.layers.set(1);
  viewScene.add(viewLight);
  const viewSun = new THREE.DirectionalLight(0xffe0c6, 3);
  viewSun.position.set(-1, 3, 2);
  viewSun.layers.set(1);
  viewScene.add(viewSun);
  const viewRim = new THREE.DirectionalLight(0xbfd6ff, 1.6);
  viewRim.position.set(2, 1.4, -2.5);
  viewRim.layers.set(1);
  viewScene.add(viewRim);
  const views = {
    ak: createAuthoredViewmodel(weaponGroup),
    m4: createAuthoredViewmodel(weaponGroup, true, M4_VIEWMODEL),
    // The AWP (spawn buy menu) on each team's arms; prepared before Ready like the rifles.
    awpT: createAuthoredViewmodel(weaponGroup, true, AWP_TERRORIST_VIEWMODEL),
    awpP: createAuthoredViewmodel(weaponGroup, true, AWP_POLICE_VIEWMODEL),
    // The MP5 and the Desert Eagle (both bought at B) on each team's arms.
    mp5T: createAuthoredViewmodel(weaponGroup, true, MP5_TERRORIST_VIEWMODEL),
    mp5P: createAuthoredViewmodel(weaponGroup, true, MP5_POLICE_VIEWMODEL),
    deagleT: createAuthoredViewmodel(weaponGroup, true, DEAGLE_TERRORIST_VIEWMODEL),
    deagleP: createAuthoredViewmodel(weaponGroup, true, DEAGLE_POLICE_VIEWMODEL),
  };
  let view = views.ak;
  /** A gun slot (primary 1 or sidearm 2) is drawn. */
  const isGun = (w: string | undefined) => w === "rifle" || w === "sidearm";
  const knifeViews = {
    terrorist: createKarambitViewmodel(weaponGroup, AK_VIEWMODEL),
    police: createKarambitViewmodel(weaponGroup, M4_VIEWMODEL),
  };
  let knifeView = knifeViews.terrorist;
  let knifeReadyAt = 0,
    knifeDrawnAt = 0,
    lastKnifeEquipped = false,
    lastWheelSwitch = 0;
  for (const v of Object.values(knifeViews))
    void v.ready.then(() => {
      if (v.animator) v.animator.onCue = (cue) => hooks.onKnifeCue?.(cue);
    });
  // Terrorist C4 plant (the Police never get it): the team's arms on the device, played on the
  // room's plant clock. It shares the view scene, its lights and the rifle's camera.
  const c4View = createC4Viewmodel(viewCamera, AK_VIEWMODEL);
  c4View.onCue = (name) => hooks.onC4Cue?.(name);
  // Police defuse (the Terrorists never get it): the Police arms on the planted bomb itself.
  const c4DefuseView = createC4Viewmodel(viewCamera, M4_VIEWMODEL);
  c4DefuseView.onCue = (name) => hooks.onC4Cue?.(name);
  // Grenades (4) on each team's own arms, and every grenade, cloud and fire in the world.
  const grenades = createGrenadeClient({
    scene,
    viewCamera,
    map,
    variants: { police: M4_VIEWMODEL, terrorist: AK_VIEWMODEL },
    sound: (cue, o) => hooks.onGrenadeSound?.(cue, o),
  });
  const plantedDevice = new THREE.Matrix4();
  let c4 = initialC4State(),
    rifleDown = 0;
  const casings = {
    ak: createShellCasings(1, AK_CASING),
    m4: createShellCasings(1, M4_CASING),
    mp5: createShellCasings(1, MP5_CASING),
    deagle: createShellCasings(1, DEAGLE_CASING),
  };
  for (const pool of Object.values(casings)) viewScene.add(pool.mesh);
  const ejectAt = new THREE.Vector3(),
    ejectRight = new THREE.Vector3(),
    ejectUp = new THREE.Vector3(),
    ejectBack = new THREE.Vector3();
  const ejectCase = (now: number) => {
    if (!view.ejectionPort(ejectAt)) return;
    weaponGroup.updateWorldMatrix(true, false);
    weaponGroup.localToWorld(ejectAt);
    ejectRight.set(1, 0, 0).transformDirection(weaponGroup.matrixWorld);
    ejectUp.set(0, 1, 0).transformDirection(weaponGroup.matrixWorld);
    ejectBack.set(0, 0, 1).transformDirection(weaponGroup.matrixWorld);
    casings[casingPoolOf(view.variant)].emit(ejectAt, ejectRight, ejectUp, ejectBack, now);
  };
  // ------------------------------------------------------------------ teammate name tags
  const overlay = document.createElement("div");
  overlay.className = "bomb-tags";
  overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
  host.appendChild(overlay);
  const remotes: Remote[] = Array.from({ length: SLOT_COUNT }, () => {
    const label = document.createElement("div");
    label.className = "bomb-tag";
    label.style.display = "none";
    overlay.appendChild(label);
    return {
      motion: new RemotePresentation(map),
      pose: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0, crouch: 0 },
      drawn: false,
      animated: false,
      elapsed: 0,
      corpse: null,
      label,
    };
  });
  // ------------------------------------------------------------------ loading
  let stopped = false,
    prepared = 0;
  const assets = [
    views.ak.ready,
    views.m4.ready,
    views.awpT.ready,
    views.awpP.ready,
    views.mp5T.ready,
    views.mp5P.ready,
    views.deagleT.ready,
    views.deagleP.ready,
    ...Object.values(knifeViews).map((v) => v.ready),
    c4View.ready,
    c4DefuseView.ready,
    grenades.ready,
    worldC4.ready,
    environment.ready,
    ...allActors.map((a) => a.ready),
  ];
  const visualReady = Promise.all(
    assets.map((asset) =>
      asset.then(() => {
        if (!stopped)
          hooks.onLoadProgress?.({
            value: 15 + Math.round((++prepared / assets.length) * 60),
            label: "Preparing map, operators and weapons",
          });
      }),
    ),
  ).then(async () => {
    if (stopped) return;
    const mapRoot = scene.getObjectByName(map.id);
    if (mapRoot) sharpenMapColors(mapRoot, renderer.capabilities.getMaxAnisotropy());
    scene.updateMatrixWorld(true);
    captureReflections();
    for (const actor of allActors)
      actor.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = false;
      });
    renderer.shadowMap.needsUpdate = true;
    hooks.onLoadProgress?.({ value: 80, label: "Compiling arena graphics" });
    // Every part of every operator (body, world rifle, its muzzle flash, knife, fallback rig)
    // is made visible for this one compile: parts hidden until their first update() were
    // otherwise compiled mid-round, on first sight of an enemy or first shot (render audit:
    // four programs compiled after Ready, a visible hitch on real hardware).
    const hidden: THREE.Object3D[] = [];
    for (const target of [...allActors.map((a) => a.root), bomb, blast])
      target.traverse((o) => {
        if (!o.visible) {
          hidden.push(o);
          o.visible = true;
        }
      });
    for (const actor of allActors) for (const gun of actor.guns()) gunBatch.add(gun);
    let compiled: Promise<unknown>;
    try {
      // Compile the instanced variant before Ready, even when no remote actor is visible yet.
      contacts.count = Math.max(1, contacts.count);
      gunBatch.prime();
      compiled = renderer.compileAsync(scene, camera);
    } finally {
      for (const o of hidden) o.visible = false;
      gunBatch.update();
    }
    await compiled;
    if (stopped) return;
    hooks.onLoadProgress?.({ value: 90, label: "Preparing weapon graphics" });
    // Casings have no instances until the first shot (the compile skips them): one each here.
    // The C4 views (plant, defuse) compile with the rifles, so the first plant does not hitch.
    for (const pool of Object.values(casings)) pool.mesh.count = 1;
    const c4Was = [c4View.root.visible, c4DefuseView.root.visible];
    c4View.root.visible = c4DefuseView.root.visible = true;
    grenades.prepareCompile(true);
    for (const v of Object.values(knifeViews)) v.root.visible = true;
    const viewCompiled = renderer.compileAsync(viewScene, viewCamera);
    for (const v of Object.values(knifeViews)) v.root.visible = false;
    grenades.prepareCompile(false);
    for (const pool of Object.values(casings)) pool.mesh.count = 0;
    // Upload every texture now. compileAsync builds the shaders but three uploads a texture on
    // its first draw, so walking into an unseen part of Sandgate (244 MB of textures) stalled
    // the GPU for one 35-40 ms frame (real-GPU benchmark, RTX 2050, 2026-11-03).
    uploadTextures(scene);
    uploadTextures(viewScene);
    [c4View.root.visible, c4DefuseView.root.visible] = c4Was as [boolean, boolean];
    await viewCompiled;
    if (stopped) return;
    warmPrograms(renderer);
    hooks.onLoadProgress?.({ value: 100, label: "Arena ready" });
  });
  const uploaded = new Set<THREE.Texture>();
  const uploadTextures = (root: THREE.Object3D) =>
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.material) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        for (const value of Object.values(m))
          if (value instanceof THREE.Texture && !uploaded.has(value)) {
            uploaded.add(value);
            renderer.initTexture(value);
          }
    });
  // ------------------------------------------------------------------ local state
  let latest: BombView | null = null,
    predicted: Player | null = null,
    renderPose: Player | null = null,
    pending: BombInput[] = [],
    seq = -1,
    yaw = 0,
    pitch = 0,
    fire = false,
    fireLatched = false,
    /** Right mouse held (grenade: underhand; both buttons: medium). */
    alt = false,
    altLatched = false,
    /** Primary (1), sidearm (2, when bought), Karambit (3), or a grenade (4) of type `nade`. */
    weapon: "rifle" | "knife" | "grenade" | "sidearm" = "rifle",
    nade: GrenadeType = "he",
    reload = false,
    jump = false,
    sensitivity = 1,
    reducedMotion =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
    suspended = false,
    lastRound = -1,
    lastEventId = -1,
    serverOffset = 0,
    recoilPitch = 0,
    recoilYaw = 0,
    kick = 0,
    shotIndex = 0,
    muzzleUntil = 0,
    lastLocalShot = -Infinity,
    presentedShots = 0,
    landKick = 0,
    wasAirborne = false,
    lookX = 0,
    lookY = 0;
  const keys = new Set<string>();
  const inputStepMs = Math.ceil(TICK_MS);
  const correction = new CameraCorrection(),
    frameMotion = new FrameMotion(map),
    jumpPresentation = new JumpPresentation(),
    viewmodelMotion = createViewmodelMotion(),
    remoteClock = new SnapshotClock(),
    playbackDelay = new PlaybackDelay();
  let playbackMs = REMOTE_DELAY_MS;
  const spectatorPlayback = new SpectatorPlayback();
  let presentationSlot = -1,
    spectatorReload = 0;
  const previewInput: Input = {
    v: 1,
    type: "input",
    seq: 0,
    forward: 0,
    strafe: 0,
    yaw: 0,
    pitch: 0,
    fire: false,
    reload: false,
    weapon: "rifle",
    jump: false,
    sprint: false,
    crouch: false,
  };
  const crosshair = host.parentElement?.querySelector<HTMLElement>(".duel-crosshair");
  const hitMarker = host.parentElement?.querySelector<HTMLElement>(".duel-hit-marker");
  /** When the last "being shot at" cue played (shot-awareness.ts). */
  let shotAtAt = -Infinity;
  /** AWP 4× zoom (right mouse); the lens overlay is a sibling element of the canvas host. */
  const scope = new AwpScope();
  const scopeOverlay = host.parentElement?.querySelector<HTMLElement>(".awp-scope");
  let scopeOn = false,
    lastOverlay = false,
    lastFov = WORLD_FOV,
    lastAwpHud = false,
    /** Client time of the last presented AWP shot (bolt cycle and case ejection). */
    awpShotAt = -Infinity,
    awpEjected = true,
    drawStart = -Infinity,
    lastAwpDrawn = false,
    lastPrimary: Primary = "rifle";
  const locked = () => document.pointerLockElement === renderer.domElement;
  const clear = () => {
    keys.clear();
    fire = fireLatched = alt = altLatched = reload = jump = false;
  };
  const me = () => (latest ? latest.self : null);
  const ownAwp = () => !!latest && primaryOf(latest.self) === "awp";
  /** Planting or defusing: the room freezes movement (looking around is allowed). */
  const busy = () => {
    const b = latest?.bomb;
    if (!b || !latest) return false;
    return (
      (b.state === "planting" && b.carrier === latest.you) ||
      (b.state === "planted" && b.defuser === latest.you)
    );
  };
  const canMove = () =>
    !suspended && latest?.phase === "live" && !!predicted && predicted.hp > 0 && !busy();
  const mouse = (e: MouseEvent) => {
    if (!locked()) return;
    const look = HANDLING.sensitivity * sensitivity * scope.sensitivity();
    const view = mouseLook(yaw, pitch, e.movementX, e.movementY, look);
    yaw = wrapYaw(view.yaw);
    pitch = view.pitch;
    lookX += e.movementX;
    lookY += e.movementY;
  };
  const GAME_KEYS = [
    "Space",
    "KeyW",
    "KeyS",
    "KeyA",
    "KeyD",
    "KeyR",
    "KeyE",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "ControlLeft",
    "ControlRight",
  ];
  const down = (e: KeyboardEvent) => {
    if (!locked()) return;
    if (e.code === "Escape") {
      clear();
      document.exitPointerLock();
      return;
    }
    if (GAME_KEYS.includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === "KeyR") reload = true;
    if (e.code === "Space" && !e.repeat) jump = true;
    // 1: the primary, 2: the Desert Eagle (when bought), 3: the Karambit (as in CS; a released
    // grenade leaves the hand first). 4: a grenade; again: the next type.
    const hasSidearm = !!latest?.self.sidearm;
    if (
      (e.code === "Digit1" || (e.code === "Digit2" && hasSidearm) || e.code === "Digit3") &&
      !grenades.hands.busy
    ) {
      weapon = e.code === "Digit1" ? "rifle" : e.code === "Digit2" ? "sidearm" : "knife";
      fire = fireLatched = alt = altLatched = false;
      scope.reset();
      grenades.putAway();
    }
    if (
      (e.code === "Digit4" || e.code === "Digit5") &&
      !e.repeat &&
      latest &&
      predicted &&
      predicted.hp > 0 &&
      !busy()
    ) {
      const type = grenades.select(weapon, latest.self.grenades, performance.now());
      if (type) {
        weapon = "grenade";
        nade = type;
        scope.reset();
      }
    }
    if (e.code === "KeyF" && !e.repeat && weapon === "knife") knifeView.animator?.inspect();
    if (e.code === "KeyF" && !e.repeat && weapon === "grenade")
      grenades.hands.inspect(performance.now());
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const mousedown = (e: MouseEvent) => {
    if (!locked()) return;
    // Grenade: left overhand, right underhand, both medium (held: the pin; released: the throw).
    if (weapon === "grenade") {
      if (e.button === 2) alt = true;
      else if (e.button === 0) fire = true;
      return;
    }
    if (weapon === "knife") {
      if (e.button === 2) alt = altLatched = true;
      else if (e.button === 0) fire = fireLatched = true;
      if (e.button === 0 || e.button === 2) presentLocalAttack(e.button === 2 ? "stab" : "slash");
      return;
    }
    // AWP: right mouse toggles the 4× zoom (the room applies it from input.scope).
    if (e.button === 2) {
      if (ownAwp() && latest?.phase === "live" && predicted && predicted.hp > 0 && !busy())
        scope.toggle();
      return;
    }
    if (e.button !== 0) return;
    fire = fireLatched = true;
    // The AWP and the Deagle are semi-automatic: present only the click (the room fires on the
    // trigger edge).
    if (ownAwp() || weapon === "sidearm") presentLocalShot(performance.now());
  };
  const presentLocalAttack = (kind: "slash" | "stab") => {
    const now = performance.now();
    if (
      weapon !== "knife" ||
      latest?.phase !== "live" ||
      !predicted ||
      predicted.hp <= 0 ||
      busy() ||
      suspended ||
      now < knifeReadyAt ||
      now < knifeDrawnAt
    )
      return;
    knifeReadyAt = now + KNIFE[kind].cooldownMs;
    knifeView.animator?.attack(kind);
  };
  const wheel = (e: WheelEvent) => {
    if (!locked() || !Number.isFinite(e.deltaY) || !e.deltaY) return;
    e.preventDefault();
    const now = performance.now();
    if (
      now - lastWheelSwitch < 150 ||
      grenades.hands.busy ||
      !latest ||
      !predicted ||
      predicted.hp <= 0 ||
      busy()
    )
      return;
    lastWheelSwitch = now;
    const next = cycleEquipment(
      weapon,
      nade,
      latest.self.grenades,
      e.deltaY,
      !!latest.self.sidearm,
    );
    if (next.weapon === "grenade") {
      if (!grenades.draw(next.nade!, weapon, latest.self.grenades, now)) return;
      nade = next.nade!;
    } else grenades.putAway();
    weapon = next.weapon;
    fire = fireLatched = alt = altLatched = false;
    scope.reset();
  };
  const mouseup = (e: MouseEvent) => {
    if (e.button === 0) fire = false;
    if (e.button === 2) alt = false;
  };
  const contextmenu = (e: Event) => {
    if (locked()) e.preventDefault();
  };
  const pointer = () => {
    if (!locked()) clear();
    onLock(locked());
  };
  const hidden = () => {
    if (document.hidden) {
      clear();
      if (locked()) document.exitPointerLock();
    }
  };
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    renderer.setPixelRatio(budget.ratio(w, h, window.devicePixelRatio));
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    viewCamera.aspect = camera.aspect;
    viewCamera.updateProjectionMatrix();
  };
  // F3: performance window (fps, frame and GPU time, draw calls, render scale, graphics card).
  const perf = createPerfOverlay(renderer, host);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  document.addEventListener("mousemove", mouse);
  document.addEventListener("keydown", down);
  document.addEventListener("keyup", up);
  document.addEventListener("mousedown", mousedown);
  document.addEventListener("mouseup", mouseup);
  document.addEventListener("wheel", wheel, { passive: false });
  document.addEventListener("contextmenu", contextmenu);
  document.addEventListener("pointerlockchange", pointer);
  document.addEventListener("visibilitychange", hidden);
  window.addEventListener("blur", clear);

  /** Local trigger presentation, gated like the room (100 ms, ammunition, no reload). */
  const presentLocalShot = (now: number) => {
    const own = me();
    if (
      !isGun(weapon) ||
      !own ||
      !predicted ||
      predicted.hp <= 0 ||
      latest?.phase !== "live" ||
      busy()
    )
      return;
    const deagle = weapon === "sidearm";
    const awp = !deagle && primaryOf(own) === "awp";
    const mp5 = !deagle && primaryOf(own) === "mp5";
    const interval = deagle ? DEAGLE.cycleMs : awp ? AWP.cycleMs : mp5 ? MP5.cycleMs : 100;
    if (
      own.reloadUntil ||
      (deagle ? (own.sidearmAmmo ?? 0) : own.ammo) - presentedShots <= 0 ||
      now - lastLocalShot < interval ||
      ((awp || deagle) && serverClock() - own.lastShotAt < interval)
    )
      return;
    lastLocalShot = now;
    presentedShots++;
    if (awp) {
      scope.shot(now);
      awpShotAt = now;
      awpEjected = false;
    }
    kick = 1;
    muzzleUntil = now + 42;
    shotIndex++;
    // The AWP's case leaves the port when the bolt is drawn back, not at the shot.
    if (!awp) ejectCase(now);
    hooks.onLocalShot?.(view.variant === "m4", awp, deagle ? "deagle" : mp5 ? "mp5" : undefined);
  };
  const serverClock = () => Date.now() + serverOffset;
  const emitInput = (now: number) => {
    if (!latest || !predicted) return;
    const controlled = !document.hidden && document.hasFocus() && locked();
    const alive = predicted.hp > 0 && !suspended;
    const moving = controlled && canMove();
    const input: BombInput = {
      v: 1,
      type: "input",
      seq: ++seq,
      round: latest.round,
      playbackMs,
      forward: moving ? moveAxes(keys).forward : 0,
      strafe: moving ? moveAxes(keys).strafe : 0,
      yaw,
      pitch,
      fire: controlled && alive && (weapon === "grenade" ? fire : fire || fireLatched),
      ...(controlled &&
      alive &&
      (weapon === "grenade" ? alt : weapon === "knife" && (alt || altLatched))
        ? { alt: true }
        : {}),
      reload: controlled && alive && reload && isGun(weapon),
      weapon,
      ...(weapon === "grenade" ? { nade } : {}),
      jump: moving && jump,
      sprint: false,
      walk: moving && (keys.has("ShiftLeft") || keys.has("ShiftRight")),
      // The room kneels a defuser (crouched); predict it so the view does not snap.
      crouch:
        controlled &&
        alive &&
        (keys.has("ControlLeft") ||
          keys.has("ControlRight") ||
          (latest.bomb.state === "planted" && latest.bomb.defuser === latest.you)),
      ...(controlled && alive && keys.has("KeyE") ? { use: true } : {}),
      ...(controlled && alive && scope.wanted ? { scope: true } : {}),
    };
    const beforeX = predicted.x,
      beforeZ = predicted.z;
    if (moving) {
      // Movement speed follows the predicted zoom (scoped AWP: 100 u/s), as in the room.
      if (scopeOn) predicted.scoped = true;
      else delete predicted.scoped;
      const beforeY = predicted.y,
        beforeTuck = predicted.airCrouchOffset ?? 0;
      predictMovement(predicted, input, TICK_MS, map);
      const tuck = (predicted.airCrouchOffset ?? 0) - beforeTuck;
      jumpPresentation.advance(beforeY + (predicted.velocityY ? tuck : 0), predicted.y);
      pending.push(input);
      if (pending.length > 60) pending.shift();
    } else if (latest.phase === "live" && predicted.hp > 0) {
      // Crouching while planting/defusing still changes stance on the server.
      predicted.crouched = !!input.crouch;
    }
    if (weapon === "grenade" && latest.phase === "live" && predicted.hp > 0) {
      const result = grenades.tick({
        fire: !busy() && input.fire,
        alt: !busy() && !!input.alt,
        now: performance.now(),
        serverNow: serverClock(),
        airborne: (predicted.velocityY ?? 0) !== 0,
        eye: { x: predicted.x, y: predicted.y + eyeHeight(predicted), z: predicted.z },
        yaw,
        pitch,
        velocity: {
          x: ((predicted.x - beforeX) * 1000) / TICK_MS,
          y: predicted.velocityY ?? 0,
          z: ((predicted.z - beforeZ) * 1000) / TICK_MS,
        },
      });
      if (result === "done") weapon = grenades.back;
    }
    if (input.fire && weapon === "rifle" && !ownAwp()) presentLocalShot(now);
    if (weapon === "knife" && (input.fire || input.alt))
      presentLocalAttack(input.alt ? "stab" : "slash");
    if (!suspended) send(input);
    fireLatched = altLatched = reload = jump = false;
  };

  // ------------------------------------------------------------------ frame
  let animation = 0,
    previous = performance.now(),
    accumulator = 0,
    lastDraw = 0,
    renderFrames = 0,
    frameMs = 0,
    cpuMs = 0,
    visibleActors = 0,
    hadFocus = document.hasFocus();
  const began = performance.now();
  const frustum = new THREE.Frustum(),
    viewProjection = new THREE.Matrix4(),
    bounds = new THREE.Sphere(new THREE.Vector3(), 1.65),
    tagPoint = new THREE.Vector3(),
    shadowRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.PI / 2,
    ),
    shadowPosition = new THREE.Vector3(),
    shadowScale = new THREE.Vector3(),
    shadowMatrix = new THREE.Matrix4();
  const actorMotion = {
    stance: 0,
    airborne: false,
    weapon: "rifle" as "rifle" | "knife" | "grenade" | "sidearm",
    reloading: false,
    death: undefined as number | undefined,
    primary: "rifle" as Primary | "deagle",
    nade: undefined as GrenadeType | undefined,
    nadeHold: undefined as ThrowKind | undefined,
  };
  const actorOf = (p: PublicPlayer) => pools[p.team][p.slot % BOMB_RULES.teamSize]!;
  scene.matrixWorldAutoUpdate = false;
  viewScene.matrixWorldAutoUpdate = false;

  const frame = (now: number) => {
    if (stopped) return;
    const cpuStart = performance.now();
    frameMs = now - previous;
    const tickDt = frameDelta(now, previous);
    const focused = !document.hidden && document.hasFocus();
    if (focused !== hadFocus) {
      if (!focused) clear();
      else frameMotion.reset();
      hadFocus = focused;
    }
    const controlled = focused && locked();
    previous = now;
    accumulator += tickDt;
    while (accumulator >= inputStepMs) {
      accumulator -= inputStepMs;
      emitInput(now);
    }
    correction.update(tickDt);
    if (now - began > 2500 && controlled && latest?.phase === "live" && budget.update(frameMs))
      resize();
    if (!focused && now - lastDraw < 1000 / 15) {
      animation = requestAnimationFrame(frame);
      return;
    }
    const renderInterval = lastDraw ? now - lastDraw : 0;
    playbackMs = playbackDelay.sample(renderInterval);
    const dt = frameDelta(now, lastDraw || now - tickDt);
    lastDraw = now;
    renderFrames++;
    const serverNow = Date.now() + serverOffset;
    const alive = !!predicted && predicted.hp > 0;
    const spectating = latest && !alive ? latest.spectating : null;
    const playbackAt = remoteClock.now(now) - playbackMs;
    const watched = spectating !== null ? spectatorPlayback.sample(playbackAt) : null;
    const own = watched ?? me();
    const povNow = watched ? playbackAt : serverNow;
    const heldWeapon = watched?.weapon ?? weapon;
    if (own && latest) {
      const police = latest.players[own.slot]?.team === "police";
      const primary = primaryOf(own);
      view =
        heldWeapon === "sidearm"
          ? police
            ? views.deagleP
            : views.deagleT
          : primary === "awp"
            ? police
              ? views.awpP
              : views.awpT
            : primary === "mp5"
              ? police
                ? views.mp5P
                : views.mp5T
              : police
                ? views.m4
                : views.ak;
      knifeView = police ? knifeViews.police : knifeViews.terrorist;
      grenades.setTeam(police ? "police" : "terrorist");
      if (presentationSlot !== own.slot) {
        presentationSlot = own.slot;
        scope.reset();
        if (watched) scope.progress = watched.scoped ? 1 : 0;
        muzzleUntil = 0;
        kick = 0;
        recoilPitch = recoilYaw = 0;
        awpShotAt = -Infinity;
        awpEjected = true;
        lastAwpDrawn = !!watched && primaryOf(watched) === "awp" && heldWeapon === "rifle";
        drawStart = now - AWP_TIMELINE.equipMs;
        lastKnifeEquipped = false;
        viewmodelMotion.reset();
        hooks.onPovReload?.(null);
        spectatorReload = 0;
      }
    }
    if (watched) {
      for (const event of spectatorPlayback.shots(playbackAt)) {
        if (event.weapon === "knife") knifeView.animator?.attack(event.attack ?? "slash");
        else {
          const age = Math.max(0, playbackAt - event.at!);
          shotIndex++;
          kick = 1;
          muzzleUntil = now + Math.max(0, 42 - age);
          if (event.primary === "awp") {
            scope.shot(now - age);
            awpShotAt = now - age;
            awpEjected = false;
          } else ejectCase(now);
          hooks.onLocalShot?.(
            view.variant === "m4",
            event.primary === "awp",
            event.weapon === "sidearm" ? "deagle" : event.primary === "mp5" ? "mp5" : undefined,
          );
        }
      }
      const reload = watched.reloadUntil > povNow ? watched.reloadUntil : 0;
      if (reload !== spectatorReload) {
        spectatorReload = reload;
        hooks.onPovReload?.(
          reload
            ? {
                m4: view.variant === "m4",
                awp: view.variant === "awp",
                ...(view.variant === "mp5" || view.variant === "deagle"
                  ? { gun: view.variant }
                  : {}),
                empty: drawnGun(watched).ammo === 0,
                offset: Math.max(0, (povNow - (reload - drawnGun(watched).reloadMs)) / 1000),
              }
            : null,
        );
      }
    } else if (spectatorReload) {
      hooks.onPovReload?.(null);
      spectatorReload = 0;
    }
    // Recoil: the room's spray state (combat v2), recovered on the same profile as the 1v1 view.
    if (own) {
      const profile = recoveryProfile(own.sprayCount ?? 0, recoilPatternOf(own));
      const age = Math.max(0, povNow - own.lastShotAt),
        since = Math.max(
          0,
          povNow - Math.max(own.recoilUpdatedAt ?? povNow, own.lastShotAt + profile.delayMs),
        );
      const factor = age >= profile.resetMs ? 0 : Math.exp((-profile.rate * since) / 1000);
      const blend = 1 - Math.exp(-dt / 25);
      recoilPitch += ((own.recoilPitch ?? 0) * factor - recoilPitch) * blend;
      recoilYaw += ((own.recoilYaw ?? 0) * factor - recoilYaw) * blend;
    }
    kick = decay(kick, HANDLING.kickDecay, dt);
    landKick = decay(landKick, 14, dt);
    // ---------------------------------------------------------------- remote players
    const showWeapon = !!own && own.hp > 0 && !!latest && latest.phase !== "completed";
    // AWP zoom: predicted like the room's rule; the lens hides the viewmodel, true 4× camera.
    if (watched) scope.wanted = !!watched.scoped;
    const zoomed = scope.update(showWeapon ? own : null, dt, now, povNow);
    if (zoomed !== scopeOn) {
      scopeOn = zoomed;
      hooks.onScope?.(zoomed);
    }
    if (scope.overlay !== lastOverlay) {
      lastOverlay = scope.overlay;
      scopeOverlay?.classList.toggle("is-on", lastOverlay);
    }
    const fov = scope.fov(WORLD_FOV);
    if (fov !== lastFov) {
      lastFov = fov;
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const awpHud = !!own && primaryOf(own) === "awp";
    if (awpHud !== lastAwpHud && host.parentElement) {
      lastAwpHud = awpHud;
      host.parentElement.dataset["awp"] = awpHud ? "1" : "";
    }
    // Sample once before the camera: frustum tests and tags must use this frame's view.
    if (latest)
      for (const p of latest.players) {
        if (p.slot === latest.you) continue;
        const r = remotes[p.slot]!;
        r.drawn = !r.corpse && p.alive && r.motion.sample(playbackAt, r.pose, renderInterval);
      }
    // ---------------------------------------------------------------- camera
    if (predicted && alive) {
      renderPose ??= { ...predicted };
      Object.assign(renderPose, predicted);
      const active = controlled && canMove();
      if (active) {
        previewInput.forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
        previewInput.strafe = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
        previewInput.yaw = yaw;
        previewInput.jump = jump;
        previewInput.walk = keys.has("ShiftLeft") || keys.has("ShiftRight");
        previewInput.crouch = keys.has("ControlLeft") || keys.has("ControlRight");
        predictMovement(renderPose, previewInput, accumulator, map);
      }
      const motion = frameMotion.sample(
        renderPose,
        active ? previewInput : null,
        tickDt,
        correction,
      );
      camera.position.set(
        motion.x,
        cameraVertical.sample(
          jumpPresentation.sample(predicted.y, accumulator / inputStepMs) +
            cameraStance.sample(
              predicted.airCrouchOffset || renderPose.airCrouchOffset ? predicted : renderPose,
              dt,
            ) +
            correction.y,
          dt,
        ),
        motion.z,
      );
      // A nearby HE blast shakes the view a little (the aim itself never moves).
      const quake = grenades.shake * 0.012;
      camera.rotation.set(
        Math.min(PITCH_LIMIT, pitch + recoilPitch) + quake * Math.sin(now * 0.09),
        yaw + recoilYaw + quake * Math.sin(now * 0.071 + 1),
        quake * 0.6 * Math.sin(now * 0.05),
        "YXZ",
      );
    } else if (spectating !== null && remotes[spectating]?.drawn) {
      const r = remotes[spectating]!;
      camera.position.set(
        r.pose.x,
        r.pose.y + EYE_HEIGHT * (1 - r.pose.crouch) + CROUCH_EYE_HEIGHT * r.pose.crouch,
        r.pose.z,
      );
      camera.rotation.set(clampPitch(r.pose.pitch + recoilPitch), r.pose.yaw + recoilYaw, 0, "YXZ");
    } else if (predicted) {
      // Dead with nobody to watch: a slow overhead view of where the player fell.
      camera.position.set(predicted.x, predicted.y + 6, predicted.z + 4);
      camera.rotation.set(-0.95, 0, 0, "YXZ");
    }
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProjection);
    visibleActors = 0;
    contacts.count = 0;
    for (const actor of allActors) actor.root.visible = false;
    if (latest)
      for (const p of latest.players) {
        const r = remotes[p.slot]!;
        r.label.style.display = "none";
        if (p.slot === latest.you) continue;
        const actor = actorOf(p);
        let drawn = false;
        if (r.corpse) {
          const c = r.corpse,
            collapse = deathPose(now - c.at, c.y, c.floor, actor.deathClipMs);
          actor.root.position.set(
            c.x + Math.sin(c.yaw) * collapse.backward,
            collapse.height,
            c.z + Math.cos(c.yaw) * collapse.backward,
          );
          actor.root.rotation.set(collapse.pitch, c.yaw, collapse.roll);
          actorMotion.death = collapse.progress;
          drawn = true;
        } else if (r.drawn) {
          actor.root.position.set(r.pose.x, r.pose.y, r.pose.z);
          actor.root.rotation.set(0, r.pose.yaw, 0);
          actorMotion.death = undefined;
          drawn = true;
        }
        r.drawn = drawn && !r.corpse;
        // First-person spectating: the watched teammate is the camera, not a body.
        if (!drawn || p.slot === spectating) {
          r.animated = false;
          continue;
        }
        actor.root.visible = true;
        actor.root.updateWorldMatrix(true, false);
        bounds.center.set(0, 0.85, 0).applyMatrix4(actor.root.matrixWorld);
        r.elapsed += dt;
        if (!frustum.intersectsSphere(bounds)) {
          actor.root.visible = false;
          r.animated = false;
          continue;
        }
        visibleActors++;
        if (!r.animated && !r.corpse) {
          const v = r.motion.velocity(r.pose.at),
            ry = actor.root.rotation.y;
          actor.resetMotion(
            Math.hypot(v.x, v.z) * 1000,
            v.x * Math.cos(ry) - v.z * Math.sin(ry),
            v.x * Math.sin(ry) + v.z * Math.cos(ry),
          );
          r.elapsed = Math.min(r.elapsed, dt);
        }
        r.animated = true;
        actorMotion.stance = r.corpse ? 0 : r.pose.crouch;
        actorMotion.airborne = !r.corpse && r.pose.y > 0.01;
        actorMotion.reloading = !!p.reloading;
        actorMotion.primary = p.weapon === "sidearm" ? "deagle" : (p.primary ?? "rifle");
        actorMotion.weapon = p.nade ? "grenade" : (p.weapon ?? "rifle");
        actorMotion.nade = p.nade;
        actorMotion.nadeHold = p.nadeHold;
        actor.update(
          Math.min(r.elapsed, 250),
          now,
          r.corpse ? 0 : r.pose.pitch,
          !r.corpse,
          !r.corpse && r.pose.crouch > 0.5,
          actorMotion,
        );
        r.elapsed = 0;
        shadowPosition.set(
          actor.root.position.x,
          (r.corpse
            ? r.corpse.floor
            : deathSupport(actor.root.position.x, r.pose.y, actor.root.position.z, map)) + 0.008,
          actor.root.position.z,
        );
        shadowScale.set(1, 1 + (actorMotion.death ?? 0), 1);
        shadowMatrix.compose(shadowPosition, shadowRotation, shadowScale);
        contacts.setMatrixAt(contacts.count++, shadowMatrix);
        actor.root.updateMatrixWorld();
        // Teammate name tag above the head (never for enemies).
        const mine = latest.players[latest.you]!;
        if (!r.corpse && p.team === mine.team) {
          tagPoint.set(r.pose.x, r.pose.y + 2.05 - r.pose.crouch * 0.55, r.pose.z).project(camera);
          if (tagPoint.z < 1) {
            r.label.style.display = "block";
            r.label.style.transform = `translate(-50%,-100%) translate(${((tagPoint.x + 1) / 2) * host.clientWidth}px,${((1 - tagPoint.y) / 2) * host.clientHeight}px)`;
          }
        }
      }
    contacts.instanceMatrix.needsUpdate = true;
    gunBatch.update();

    // ---------------------------------------------------------------- the bomb
    const b = (watched ? spectatorPlayback.bomb(playbackAt) : undefined) ?? latest?.bomb;
    const bombAt =
      b && (b.state === "dropped" || b.state === "planted") && b.x !== undefined
        ? { x: b.x, y: b.y!, z: b.z! }
        : null;
    bomb.visible = !!bombAt;
    if (bombAt) {
      bomb.position.set(bombAt.x, bombAt.y, bombAt.z);
      bomb.updateMatrixWorld(true);
    }
    if (b?.state === "planted") {
      // The LED blinks faster as the timer runs down (cosmetic; the HUD shows no countdown).
      const left = Math.max(0, b.explodesAt - serverNow),
        period = 120 + (left / BOMB_RULES.bombMs) * 880,
        on = (serverNow % period) / period < 0.25;
      ledMaterial.color.setHex(on ? 0xff2a1a : 0x401010);
      worldC4.setLit(on, true);
    } else {
      ledMaterial.color.setHex(0x401010);
      worldC4.setLit(false, false);
    }
    const sinceBlast = now - blastAt;
    blast.visible = sinceBlast < 900;
    if (blast.visible) {
      const t = sinceBlast / 900;
      blast.scale.setScalar(1 + t * 9);
      (blast.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - t);
      blast.updateMatrixWorld();
    }
    // The explosion's flash: a brief brightening of the sky light (no shader change).
    hemisphere.intensity =
      lighting.hemisphere.intensity *
      (1 + (sinceBlast < 1400 ? 2.5 * Math.max(0, 1 - sinceBlast / 1400) : 0));
    // ---------------------------------------------------------------- first-person rifle
    // ---------------------------------------------------------------- first-person C4 plant
    // Terrorist carrier planting: the room's plant clock drives the clip; when the room ends the
    // plant (planted or interrupted) the exit clip plays and the rifle comes back up.
    c4 = stepC4(c4, {
      showWeapon,
      team: latest?.players[own?.slot ?? latest.you]?.team,
      you: own?.slot ?? -1,
      bomb: b,
      serverNow: povNow,
      now,
    });
    {
      const kind = c4.view.kind;
      const defuse = kind === "defuse" || kind === "defused" || kind === "defuse-cancel";
      // The defuse copy is placed through the view camera: bring it to this frame's camera first.
      viewCamera.position.copy(camera.position);
      viewCamera.quaternion.copy(camera.quaternion);
      viewCamera.updateMatrixWorld();
      c4View.update(dt / 1000, defuse ? { kind: "hidden" } : c4.view);
      c4DefuseView.update(
        dt / 1000,
        defuse ? c4.view : { kind: "hidden" },
        defuse ? (worldC4.deviceMatrix(plantedDevice) ?? undefined) : undefined,
      );
      // The first-person copy stands in for the world bomb while it shows (same pose and image).
      worldC4.root.visible = !c4DefuseView.root.visible;
    }
    // The C4 takes both hands: an idle grenade is put away (a thrown one finishes first).
    if (c4Up(c4.view) && (grenades.up || weapon === "knife") && !grenades.hands.busy) {
      grenades.putAway();
      weapon = "rifle";
    }
    // The rifle drops out as the C4 comes up, and rises again once the exit clip is done.
    rifleDown = c4Up(c4.view)
      ? Math.min(1, rifleDown + dt / 180)
      : Math.max(0, rifleDown - dt / 350);
    // With a grenade up the rifle hides inside the group (view.update below): the group itself
    // stays, so its muzzle light stays in the view scene and no shader is recompiled for a
    // different light count when the grenade is drawn.
    // Keep its light in the scene while C4 hands replace the rifle, as with grenades.
    // Hiding the whole group changes the light count and compiles C4 shaders mid-action.
    weaponGroup.visible = showWeapon && !scope.overlay;
    // Casings in flight hide with the rifle: drawn without the weapon's muzzle light (the AWP's
    // lens hides it while a case is still falling) they need a second shader variant.
    for (const pool of Object.values(casings)) pool.mesh.visible = weaponGroup.visible;
    const tip = view.loaded ? view.muzzle() : null;
    const barrel = tip?.z ?? -0.6,
      barrelY = tip?.y ?? 0;
    muzzle.update(muzzleUntil - now, barrel, barrelY, shotIndex);
    muzzle.root.position.x = tip?.x ?? 0;
    const suppressed = view.variant === "m4";
    if (suppressed) muzzle.root.scale.multiplyScalar(SUPPRESSED_FLASH.scale);
    flashLight.position.set(0, barrelY, barrel - 0.02);
    flashLight.intensity = muzzle.root.visible
      ? 2.5 * (suppressed ? SUPPRESSED_FLASH.light : 1)
      : 0;
    const moving = watched
      ? !!watched.moving
      : locked() && (keys.has("KeyW") || keys.has("KeyS") || keys.has("KeyA") || keys.has("KeyD"));
    const presentationMoving = watched ? moving : moving && canMove();
    const airborne = watched ? !!watched.velocityY : !!predicted && predicted.y > 0.01;
    if (wasAirborne && !airborne) landKick = 0.018;
    wasAirborne = airborne;
    const reloadLeft = own?.reloadUntil ? Math.max(0, own.reloadUntil - povNow) : 0;
    const ownGun = own ? drawnGun(own) : null;
    const reloadMs = ownGun ? ownGun.reloadMs : 1800;
    const reloadProgress = reloadLeft ? Math.min(1, reloadLeft / reloadMs) : 0;
    for (const other of Object.values(views)) if (other !== view) other.update(false, 0, 0);
    const reloadKind = ownGun?.ammo === 0 ? "empty" : "tactical";
    // AWP bolt: after a shot (local presentation or the room's clock, whichever is newer) and at
    // the end of an empty reload; the case leaves the port as the bolt reaches the rear.
    let bolt: BoltPose | null = null;
    if (view.variant === "awp" && own) {
      if (reloadLeft > 0) {
        if (reloadKind === "empty") bolt = boltPose((1 - reloadProgress) * reloadMs, RELOAD_BOLT);
      } else {
        const sinceShot = Math.min(now - awpShotAt, povNow - own.lastShotAt);
        if (sinceShot >= 0 && sinceShot < AWP.cycleMs) bolt = boltPose(sinceShot, SHOT_BOLT);
        if (!awpEjected && now - awpShotAt >= AWP_TIMELINE.bolt.eject) {
          awpEjected = true;
          ejectCase(now);
        }
      }
    }
    view.update(
      showWeapon && rifleDown < 0.98 && isGun(heldWeapon) && (watched ? true : !grenades.up),
      reloadLeft ? 1 - reloadProgress : 0,
      kick,
      reloadKind,
      bolt,
    );
    const sway = viewmodelMotion.update({
      dt,
      lookX: watched ? 0 : lookX,
      lookY: watched ? 0 : lookY,
      moving: presentationMoving,
      sprinting: false,
      airborne,
      reloading: reloadLeft > 0,
      kick,
      shot: shotIndex,
    });
    lookX = lookY = 0;
    const knife = heldWeapon === "knife" && knifeView.loaded && showWeapon && rifleDown < 0.98;
    if (knife !== lastKnifeEquipped) {
      lastKnifeEquipped = knife;
      if (knife) knifeDrawnAt = now + KNIFE.drawMs;
    }
    let knifePose: KarambitControls | null = null;
    for (const v of Object.values(knifeViews)) v.root.visible = false;
    if (knifeView.animator) {
      knifePose = knifeView.animator.update({
        dt: dt / 1000,
        equipped: knife,
        moving: presentationMoving ? 1 : 0,
        walking: watched ? !!watched.crouched : keys.has("ShiftLeft") || keys.has("ShiftRight"),
        backward: !watched && keys.has("KeyS"),
        strafe: !watched && locked() ? moveAxes(keys).strafe : 0,
        airborne,
        reducedMotion,
      });
      if (knife && knifePose) {
        knifeView.pose(knifePose);
        knifeView.root.visible = true;
      }
    }
    const rest = knife
      ? KARAMBIT_VIEWMODEL_REST
      : view.variant === "awp"
        ? AWP_VIEWMODEL_REST
        : view.variant === "mp5"
          ? MP5_VIEWMODEL_REST
          : view.variant === "deagle"
            ? DEAGLE_VIEWMODEL_REST
            : view.variant === "m4"
              ? M4_VIEWMODEL_REST
              : VIEWMODEL_REST;
    const motionScale = reducedMotion ? 0.5 : 1;
    // AWP, MP5 and Deagle draw: the gun swings up from below (bought, switched to, or the side
    // swapped).
    const awpDrawn =
      view.variant !== "ak" && view.variant !== "m4" && isGun(heldWeapon) && showWeapon;
    if (awpDrawn && !lastAwpDrawn) drawStart = now;
    lastAwpDrawn = awpDrawn;
    const drawT = awpDrawn ? Math.min(1, (now - drawStart) / AWP_TIMELINE.equipMs) : 1;
    const draw = 1 - drawT * drawT * (3 - 2 * drawT);
    weaponGroup.position.set(
      rest.x + sway.x * motionScale + (knifePose?.viewPosition.x ?? 0),
      rest.y + sway.y * motionScale - landKick - draw * 0.22 + (knifePose?.viewPosition.y ?? 0),
      rest.z + sway.z * motionScale + (knifePose?.viewPosition.z ?? 0),
    );
    weaponGroup.rotation.set(
      rest.pitch + sway.pitch * motionScale - draw * 0.7,
      rest.yaw + sway.yaw * motionScale,
      rest.roll + sway.roll * motionScale,
    );
    if (rifleDown > 0) {
      const drop = rifleDown * rifleDown * (3 - 2 * rifleDown);
      weaponGroup.position.y -= 0.3 * drop;
      weaponGroup.rotation.x -= 0.65 * drop;
    }
    for (const pool of Object.values(casings)) pool.update(dt, now);
    const spread =
      Math.round(((moving ? 3 : 0) + (airborne ? 4 : 0) + Math.min(5, recoilPitch * 45)) * 100) /
      100;
    crosshair?.style.setProperty("--duel-spread", `${spread}px`);
    crosshair?.classList.toggle("is-reloading", reloadLeft > 0);
    impacts.update(dt, now);
    blood.update(dt, now);
    if (!alive && grenades.up) {
      grenades.putAway();
      weapon = "rifle";
    }
    grenades.frame({
      dt,
      now,
      serverNow,
      world: latest?.grenades,
      owner: latest?.you ?? null,
      camera,
      move:
        locked() && (keys.has("KeyW") || keys.has("KeyS") || keys.has("KeyA") || keys.has("KeyD"))
          ? keys.has("ShiftLeft") || keys.has("ShiftRight")
            ? 0.5
            : 1
          : 0,
      alive: !!showWeapon,
      ...(watched ? { presentation: spectatorGrenade(watched, povNow) } : {}),
      listener: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        yaw: camera.rotation.y,
      },
    });
    environment.update?.(dt, now);
    camera.layers.set(0);
    renderer.info.autoReset = false;
    renderer.info.reset();
    perf.begin();
    renderer.autoClear = true;
    renderer.render(scene, camera);
    if (showWeapon || c4View.root.visible || c4DefuseView.root.visible || grenades.up) {
      renderer.autoClear = false;
      renderer.clearDepth();
      viewCamera.position.copy(camera.position);
      viewCamera.quaternion.copy(camera.quaternion);
      if (knife && knifePose) viewCamera.quaternion.multiply(knifePose.viewRotation);
      viewCamera.updateMatrixWorld();
      renderer.render(viewScene, viewCamera);
    }
    cpuMs = performance.now() - cpuStart;
    perf.end(frameMs, cpuMs);
    animation = requestAnimationFrame(frame);
  };
  animation = requestAnimationFrame(frame);

  // ------------------------------------------------------------------ snapshots
  const scratch = { hp: 100 } as Player;
  return {
    ready: visualReady,
    setSensitivity: (value) => {
      sensitivity = Number.isFinite(value) ? Math.max(0.1, Math.min(3, value)) : 1;
    },
    setReducedMotion: (reduced) => {
      reducedMotion = !!reduced;
    },
    lock: () => capturePointer(renderer.domElement),
    suspend(paused) {
      suspended = paused;
      if (paused) {
        clear();
        pending = [];
        correction.reset();
        frameMotion.reset();
        remoteClock.clear();
      }
    },
    audioPresentation: () => ({
      yaw: camera.rotation.y,
      poseAt: remoteClock.now(performance.now()) - playbackMs,
      x: camera.position.x,
      z: camera.position.z,
    }),
    /** Tooling: the compiled shader programs (to find anything compiled after Ready). */
    programs: () =>
      (renderer.info.programs ?? []).map(
        (p) => `${p.name}|${(p as unknown as { cacheKey: string }).cacheKey}`,
      ),
    diagnostics: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      frameMs,
      cpuMs,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      programs: renderer.info.programs?.length ?? 0,
      pixelRatio: renderer.getPixelRatio(),
      visibleActors,
      camera: [camera.position.x, camera.position.y, camera.position.z, camera.rotation.y],
      renderFrames,
      knifeClip: knifeView.animator?.clip ?? null,
    }),
    snapshot(next) {
      if (next.type !== "bomb-snapshot") return;
      const at = performance.now();
      remoteClock.observe(next.serverNow, at);
      playbackDelay.observe(at, 0);
      const measured = next.serverNow - Date.now();
      serverOffset = lastRound === -1 ? measured : serverOffset + (measured - serverOffset) * 0.05;
      const newRound = next.round !== lastRound || next.you !== latest?.you;
      const self = next.self;
      if (primaryOf(self) !== lastPrimary) {
        lastPrimary = primaryOf(self);
        presentedShots = 0;
        lastLocalShot = -Infinity;
        awpShotAt = -Infinity;
        awpEjected = true;
      }
      if (newRound) {
        grenades.reset();
        weapon = "rifle";
        pending = [];
        yaw = self.yaw;
        pitch = self.pitch;
        recoilPitch = recoilYaw = kick = 0;
        shotIndex = presentedShots = 0;
        scope.reset();
        awpShotAt = -Infinity;
        awpEjected = true;
        muzzleUntil = 0;
        if (!locked()) clear();
        impacts.reset();
        blood.reset();
        for (const r of remotes) {
          r.motion.clear();
          r.corpse = null;
          r.animated = false;
        }
        cameraStance.reset();
        cameraVertical.reset();
        jumpPresentation.reset();
        correction.reset();
        frameMotion.reset();
        playbackDelay.reset();
      }
      // A new life at freeze time (the room respawns everyone): look where the spawn faces.
      if (latest && latest.phase !== "freeze" && next.phase === "freeze") {
        yaw = self.yaw;
        pitch = self.pitch;
      }
      lastRound = next.round;
      seq = Math.max(seq, self.lastSeq);
      const before = predicted;
      predicted = { ...self } as Player;
      pending = pending.filter((i) => i.seq > self.lastSeq);
      latest = next;
      spectatorPlayback.push(next);
      if (canMove()) for (const i of pending) predictMovement(predicted, i, TICK_MS, map);
      else pending = [];
      if (before && !newRound) correction.reconcile(before, predicted);
      // Remote players onto their playback timelines (enemies only while the room reveals them).
      for (const p of next.players) {
        if (p.slot === next.you) continue;
        const r = remotes[p.slot]!;
        r.label.textContent = p.name + (p.carrier ? " · bomb" : "");
        if (!p.alive) {
          if (!r.corpse && r.drawn && next.phase !== "freeze") {
            r.corpse = {
              x: r.pose.x,
              y: r.pose.y,
              z: r.pose.z,
              yaw: r.pose.yaw,
              at: performance.now(),
              floor: deathSupport(r.pose.x, r.pose.y, r.pose.z, map),
            };
          }
          r.motion.push({ ...scratch, hp: 0 } as Player, next.serverNow, false);
          continue;
        }
        r.corpse = null;
        if (!p.pose) {
          r.motion.push(scratch, next.serverNow, false);
          continue;
        }
        Object.assign(scratch, p.pose, { hp: 100 });
        r.motion.push(scratch, next.serverNow, true);
      }
      // Events, once each.
      let ownShots = 0;
      for (const e of next.events) {
        if (e.id !== undefined) {
          if (e.id <= lastEventId) continue;
          lastEventId = e.id;
        }
        if (e.type === "sound") continue;
        const ev = e as Exclude<BombView["events"][number], { type: "sound" }>;
        if (ev.type === "shot" && ev.slot !== undefined) {
          if (ev.slot === next.you) {
            if (ev.weapon !== "knife") ownShots++;
          } else {
            const p = next.players[ev.slot];
            if (p)
              actorOf(p).shot(
                performance.now(),
                ev.weapon === "knife" ? (ev.attack ?? "slash") : undefined,
              );
          }
        }
        if (ev.type === "impact" && ev.impact && ev.weapon !== "knife")
          impacts.emit(ev.impact, performance.now());
        if (ev.type === "nade-throw" || ev.type === "nade-detonate")
          grenades.event(ev, ev.slot === next.you, serverClock(), camera.position);
        if (
          ev.type === "nade-throw" &&
          ev.projectile &&
          ev.slot !== undefined &&
          ev.slot !== next.you
        ) {
          const p = next.players[ev.slot];
          if (p) actorOf(p).throw(performance.now(), ev.projectile.kind, ev.projectile.type);
        }
        if (
          (ev.type === "hit" || ev.type === "headshot") &&
          ev.point &&
          ev.direction &&
          ev.nade !== "fire"
        )
          blood.emit(
            {
              victim: "A" as Seat,
              zone: (ev.zone ?? "chest") as never,
              damage: ev.damage ?? 0,
              point: ev.point,
              direction: ev.direction,
            },
            performance.now(),
          );
        if (
          (ev.type === "hit" || ev.type === "headshot") &&
          ev.slot === next.you &&
          ev.victim !== next.you
        ) {
          hitMarker?.getAnimations().forEach((a) => a.cancel());
          hitMarker?.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], {
            duration: 180,
            fill: "forwards",
          });
          hooks.onHitConfirmed?.();
        }
        // An enemy's bullet struck close by (impact points are public). Teammates' do not count.
        if (
          ev.type === "impact" &&
          ev.impact &&
          ev.weapon !== "knife" &&
          ev.slot !== undefined &&
          ev.slot !== next.you &&
          next.players[ev.slot]?.team !== next.players[next.you]?.team &&
          Math.hypot(
            ev.impact.point.x - camera.position.x,
            ev.impact.point.y - camera.position.y,
            ev.impact.point.z - camera.position.z,
          ) < SHOT_AT_M &&
          performance.now() - shotAtAt > SHOT_AT_GAP_MS
        ) {
          shotAtAt = performance.now();
          hooks.onShotAt?.();
        }
        if (ev.type === "bomb-exploded") {
          const bb = next.bomb as { x?: number; y?: number; z?: number };
          if (bb.x !== undefined) {
            blast.position.set(bb.x, (bb.y ?? 0) + 0.5, bb.z!);
          }
          blastAt = performance.now();
        }
      }
      presentedShots = Math.max(0, presentedShots - ownShots);
    },
    dispose() {
      stopped = true;
      perf.dispose();
      cancelAnimationFrame(animation);
      observer.disconnect();
      if (locked()) document.exitPointerLock();
      document.removeEventListener("mousemove", mouse);
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
      document.removeEventListener("mousedown", mousedown);
      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("wheel", wheel);
      document.removeEventListener("contextmenu", contextmenu);
      document.removeEventListener("pointerlockchange", pointer);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", clear);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      const collect = (o: THREE.Object3D) => {
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
      };
      scene.traverse(collect);
      viewScene.traverse(collect);
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      sun.shadow.map?.dispose();
      contactTexture.dispose();
      muzzle.dispose();
      views.ak.dispose();
      views.m4.dispose();
      views.awpT.dispose();
      views.awpP.dispose();
      views.mp5T.dispose();
      views.mp5P.dispose();
      views.deagleT.dispose();
      views.deagleP.dispose();
      for (const v of Object.values(knifeViews)) v.dispose();
      c4View.dispose();
      grenades.dispose();
      c4DefuseView.dispose();
      worldC4.dispose();
      for (const pool of Object.values(casings)) pool.dispose();
      weaponKit.dispose();
      environment.dispose();
      reflections?.dispose();
      impacts.dispose();
      blood.dispose();
      gunBatch.dispose();
      for (const actor of allActors) actor.dispose();
      overlay.remove();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
