import * as THREE from "three";
import { EYE_HEIGHT, SPAWNS, eyeHeight } from "./map";
import type { Input, MatchState, Player, Seat, Weapon } from "./protocol";
import { predictMovement, TICK_MS, WEAPONS } from "./simulation";
import { createCharacter } from "./character";
import { COMBAT_VERSION, recoveryProfile } from "./combat";
import { createBloodEffects } from "./blood-effects";
import { HANDLING, decay, recoverRecoil, shotRecoil, frameDelta } from "./handling";
import { createArenaEnvironment } from "./environment";
import { createImpactEffects } from "./impacts";
import { createWeaponKit, AK_MUZZLE } from "./weapon";
import {
  CameraCorrection,
  CameraStance,
  CameraVertical,
  FrameMotion,
  JumpPresentation,
  RemotePresentation,
  RenderBudget,
} from "./presentation";
import { capturePointer } from "./pointer-capture";
import { TriggerFeedback } from "./trigger-feedback";
import { createViewHands } from "./view-hands";
import { createMuzzleFlash } from "./muzzle-flash";
import { createAuthoredViewmodel } from "./authored-viewmodel";
import { REMOTE_DELAY_MS } from "./network";
import { createViewmodelMotion } from "./viewmodel-motion";

/**
 * World camera vertical FOV. 70° ≈ 102° horizontal at 16:9 — between CS:GO (≈106°) and COD
 * (≈96–100°); opponents read ~13% larger than at the previous 78° without changing hitboxes.
 */
export const WORLD_FOV = 70;
/** Authored AK rest framing in the 60° viewmodel camera: right-hand pivot, chunky receiver. */
// Hip-fire bore converges on the centered aim ray at 10 m. The old 0.24 rad
// yaw pointed past the reticle to its left after the authored rifle changed.
export const VIEWMODEL_REST = { x: 0.14, y: -0.12, z: -0.2, pitch: 0.012, yaw: 0.014, roll: -0.05 };

export type ArenaFrame = {
  state: MatchState;
  visibility?: Record<Seat, boolean>;
  serverNow: number;
  settled: boolean;
  settlementPending: boolean;
};
export type ArenaControls = {
  diagnostics: () => {
    camera: number[];
    calls: number;
    triangles: number;
    frameMs: number;
    cpuMs: number;
    geometries: number;
    textures: number;
    programs: number;
    pixelRatio: number;
    opponentVisible: boolean;
    opponentPosition: number[] | null;
    renderFrames: number;
    renderIntervalMs: number;
  };
  ready: Promise<void>;
  snapshot: (frame: ArenaFrame, seat: Seat | null) => void;
  lock: () => Promise<void>;
  dispose: () => void;
  suspend: (paused: boolean) => void;
};

/** Rendering is disposable and cosmetic. Only validated server snapshots determine damage and results. */
export function mountArena(
  host: HTMLElement,
  send: (input: Input) => void,
  onLock: (locked: boolean) => void,
  onLocalShot?: (weapon: Weapon, seq: number) => void,
): ArenaControls {
  const scene = new THREE.Scene();
  // The weapon pass needs only its rig and lights. Re-traversing the entire
  // arena for this second pass wastes matrix, skeleton and light setup work.
  const viewScene = new THREE.Scene();
  scene.background = new THREE.Color(0x8bacd0);
  scene.fog = new THREE.Fog(0x94b5d4, 95, 260);
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
  const budget = new RenderBudget();
  const cameraStance = new CameraStance();
  const cameraVertical = new CameraVertical();
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(WORLD_FOV, 1, 0.06, 260);
  const viewCamera = new THREE.PerspectiveCamera(60, 1, 0.03, 8);
  viewCamera.layers.set(1);
  camera.rotation.order = "YXZ";
  camera.position.set(0, EYE_HEIGHT, SPAWNS.A.z);
  scene.add(camera);
  const hemisphere = new THREE.HemisphereLight(0xc4d3ef, 0x353038, 1.35);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffefd8, 3.4);
  // Centre the light across the two opposing spawn directions.
  sun.position.set(21, 19, -24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 65;
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = 1024;
  logoCanvas.height = 384;
  const logo = logoCanvas.getContext("2d")!;
  logo.fillStyle = "#100a20";
  logo.fillRect(0, 0, 1024, 384);
  logo.fillStyle = "#a245ff";
  logo.beginPath();
  logo.moveTo(0, 384);
  logo.lineTo(320, 0);
  logo.lineTo(365, 0);
  logo.lineTo(45, 384);
  logo.fill();
  logo.textAlign = "center";
  logo.font = "italic 900 160px sans-serif";
  logo.fillStyle = "#eee6ff";
  logo.fillText("PVP", 512, 205);
  logo.font = "italic 700 64px sans-serif";
  logo.fillStyle = "#af5bff";
  logo.fillText("spinArena", 512, 285);
  const logoTexture = new THREE.CanvasTexture(logoCanvas);
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  let artDisposed = false;
  new THREE.ImageLoader().load("/brand/arena-logo-email.png", (image) => {
    if (artDisposed) return;
    logo.fillStyle = "#0c0818";
    logo.fillRect(0, 0, 1024, 384);
    const gradient = logo.createLinearGradient(0, 384, 1024, 0);
    gradient.addColorStop(0, "#5424a0");
    gradient.addColorStop(0.5, "#170c31");
    gradient.addColorStop(1, "#271044");
    logo.fillStyle = gradient;
    logo.beginPath();
    logo.moveTo(0, 384);
    logo.lineTo(250, 0);
    logo.lineTo(310, 0);
    logo.lineTo(60, 384);
    logo.fill();
    logo.drawImage(image, 200, 24, 624, 332);
    logoTexture.needsUpdate = true;
  });
  const branding = new THREE.MeshStandardMaterial({
    map: logoTexture,
    emissive: 0x442066,
    emissiveMap: logoTexture,
    emissiveIntensity: 0.7,
    roughness: 0.65,
  });
  const environment = createArenaEnvironment(scene, branding);
  // The arena is static. Compose its local transforms once, not every render pass.
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) object.matrixAutoUpdate = false;
  });
  const impacts = createImpactEffects(scene);
  const blood = createBloodEffects(scene);
  // Capture this arena once for rough metallic reflections, excluding all players.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const reflections = pmrem.fromScene(scene, 0.04, 0.1, 100);
  scene.environment = reflections.texture;
  scene.environmentIntensity = 0.45;
  viewScene.environment = scene.environment;
  viewScene.environmentIntensity = scene.environmentIntensity;
  viewScene.fog = scene.fog;
  pmrem.dispose();
  const weaponKit = createWeaponKit();
  const characters = {
    A: createCharacter("A", branding, weaponKit),
    B: createCharacter("B", branding, weaponKit),
  };
  scene.add(characters.A.root, characters.B.root);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 64;
  const shadowPen = shadowCanvas.getContext("2d")!,
    shade = shadowPen.createRadialGradient(32, 32, 2, 32, 32, 32);
  shade.addColorStop(0, "rgba(0,0,0,.32)");
  shade.addColorStop(1, "rgba(0,0,0,0)");
  shadowPen.fillStyle = shade;
  shadowPen.fillRect(0, 0, 64, 64);
  const contactTexture = new THREE.CanvasTexture(shadowCanvas);
  const contactMaterial = new THREE.MeshBasicMaterial({
    map: contactTexture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const contactShadows = {} as Record<Seat, THREE.Mesh>;
  for (const [side, actor] of Object.entries(characters)) {
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), contactMaterial);
    contact.name = "contact-shadow";
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.008;
    actor.root.add(contact);
    contactShadows[side as Seat] = contact;
  }
  characters.A.root.visible = false;
  characters.B.root.visible = false;
  const weaponGroup = new THREE.Group();
  weaponGroup.name = "first-person-weapon";
  viewCamera.add(weaponGroup);
  viewScene.add(viewCamera);
  weaponGroup.position.set(0.24, -0.3, -0.48);
  const rifle = weaponKit.rifle();
  // The shoulder stock sits behind the eye in a first-person stance.
  const shoulderStock = rifle.getObjectByName("stock")!;
  shoulderStock.scale.z = 0.5;
  shoulderStock.position.z = 0.08;
  weaponGroup.add(rifle);
  const magazine = rifle.getObjectByName("curved-magazine")!,
    chargingHandle = rifle.getObjectByName("charging-handle")!;
  rifle.traverse((object) => {
    object.layers.set(1);
    if (object instanceof THREE.Mesh) object.castShadow = false;
  });
  const pistolPart = new THREE.Group();
  pistolPart.name = "pistol-viewmodel";
  weaponGroup.add(pistolPart);
  const pistolSteel = new THREE.MeshStandardMaterial({
    color: 0x292631,
    roughness: 0.4,
    metalness: 0.6,
  });
  for (const [y, z, w, h, d] of [
    [0, -0.13, 0.045, 0.052, 0.19],
    [-0.075, -0.065, 0.04, 0.13, 0.055],
  ]) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w!, h!, d!), pistolSteel);
    part.position.set(0, y!, z!);
    part.layers.set(1);
    pistolPart.add(part);
  }
  const muzzle = createMuzzleFlash();
  weaponGroup.add(muzzle.root);
  const smokeMaterial = new THREE.MeshBasicMaterial({
    color: 0xbcb3cb,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 5), smokeMaterial);
  smoke.layers.set(1);
  weaponGroup.add(smoke);
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
  // Cool rim light from behind-right separates gloves, forearm and steel edges from the map.
  const viewRim = new THREE.DirectionalLight(0xbfd6ff, 1.6);
  viewRim.position.set(2, 1.4, -2.5);
  viewRim.layers.set(1);
  viewScene.add(viewRim);
  const weaveCanvas = document.createElement("canvas");
  weaveCanvas.width = weaveCanvas.height = 128;
  const weavePen = weaveCanvas.getContext("2d")!,
    weavePixels = weavePen.createImageData(128, 128);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const offset = (y * 128 + x) * 4;
      const value = 105 + ((x + y) % 4 < 2 ? 40 : 0) + Math.sin(x * 0.23 + y * 0.13) * 10;
      for (let c = 0; c < 3; c++) weavePixels.data[offset + c] = value;
      weavePixels.data[offset + 3] = 255;
    }
  weavePen.putImageData(weavePixels, 0, 0);
  const weave = new THREE.CanvasTexture(weaveCanvas);
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping;
  weave.repeat.set(3, 5);
  const glove = new THREE.MeshStandardMaterial({
    color: 0x121218,
    roughness: 0.82,
    bumpMap: weave,
    bumpScale: 0.001,
  });
  const sleeve = new THREE.MeshStandardMaterial({
    color: 0x171922,
    roughness: 0.91,
    bumpMap: weave,
    bumpScale: 0.0018,
  });
  const hands = createViewHands(glove, sleeve);
  weaponGroup.add(hands.root);
  const authoredView = createAuthoredViewmodel(weaponGroup);
  const visualReady = Promise.all([
    authoredView.ready,
    characters.A.ready,
    characters.B.ready,
  ]).then(async () => {
    if (stopped) return;
    // Cache static arena shadows; moving characters have inexpensive contact shadows.
    for (const actor of Object.values(characters))
      actor.root.traverse((object) => {
        if (object instanceof THREE.Mesh) object.castShadow = false;
      });
    renderer.shadowMap.needsUpdate = true;
    // Prepare hidden combat effects and both lighting variants before Ready.
    // compileAsync uses parallel shader compilation where the driver supports it.
    await renderer.compileAsync(scene, camera);
    if (stopped) return;
    await renderer.compileAsync(viewScene, viewCamera);
    if (stopped) return;
    renderer.domElement.dataset["authoredModels"] =
      authoredView.loaded && characters.A.loaded && characters.B.loaded ? "ready" : "fallback";
  });
  // Floor PBR/environment reflections stay world anchored. A throttled planar
  // capture reused a stale projection and made the floor swim during mouse look.
  let recoilPitch = 0,
    recoilYaw = 0,
    kick = 0,
    shotIndex = 0,
    confirmedShot = -1e12,
    lastEventId = -1;
  let smokeUntil = 0,
    landKick = 0,
    wasAirborne = false,
    lookX = 0,
    lookY = 0;
  const viewmodelMotion = createViewmodelMotion();
  let lastServerOffset = 0;
  const crosshair = host.parentElement?.querySelector<HTMLElement>(".duel-crosshair");
  const hitMarker = host.parentElement?.querySelector<HTMLElement>(".duel-hit-marker");
  let state: MatchState | null = null,
    seat: Seat | null = "A",
    predicted: Player | null = null;
  let pending: Input[] = [],
    seq = -1,
    yaw = 0,
    pitch = 0,
    weapon: Weapon = "rifle",
    fire = false,
    fireLatched = false,
    flashPending = false,
    reload = false,
    jump = false;
  const keys = new Set<string>();
  // Match the existing runtime's integer-millisecond tick; avoid steadily filling its command queue.
  const inputStepMs = Math.ceil(TICK_MS);
  let animation = 0,
    previous = performance.now(),
    accumulator = 0,
    muzzleUntil = 0,
    stopped = false,
    lastRound = 0;
  let visibility: Record<Seat, boolean> = { A: true, B: true };
  const remoteTarget = new THREE.Vector3();
  const correction = new CameraCorrection();
  const frameMotion = new FrameMotion();
  const jumpPresentation = new JumpPresentation();
  const triggerFeedback = new TriggerFeedback();
  const remoteMotion = new RemotePresentation();
  const remotePose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
  let renderPose: Player | null = null;
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
  const locked = () => document.pointerLockElement === renderer.domElement;
  const clear = () => {
    keys.clear();
    fire = false;
    fireLatched = false;
    flashPending = false;
    reload = false;
    jump = false;
  };
  const mouse = (e: MouseEvent) => {
    if (!locked()) return;
    yaw -= e.movementX * HANDLING.sensitivity;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * HANDLING.sensitivity));
    lookX += e.movementX;
    lookY += e.movementY;
    yaw = ((((yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  };
  const down = (e: KeyboardEvent) => {
    if (!locked()) return;
    if (e.code === "Escape") {
      clear();
      document.exitPointerLock();
      return;
    }
    if (
      [
        "Space",
        "KeyW",
        "KeyS",
        "KeyA",
        "KeyD",
        "KeyR",
        "Digit1",
        "Digit2",
        "ControlLeft",
        "ControlRight",
      ].includes(e.code)
    )
      e.preventDefault();
    keys.add(e.code);
    if (e.code === "KeyR") reload = true;
    if (e.code === "Space" && !e.repeat) jump = true;
    if (e.code === "Digit1") weapon = "rifle";
    if (e.code === "Digit2") weapon = "pistol";
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const presentLocalShot = (commandSeq: number) => {
    if (authorizationSuspended || !document.hasFocus() || state?.phase !== "live" || !seat) return;
    const own = state.players[seat],
      now = performance.now();
    const interval =
      state.combatVersion === COMBAT_VERSION && weapon === "rifle"
        ? 100
        : WEAPONS[weapon].fireIntervalMs;
    if (
      triggerFeedback.request(own, weapon, commandSeq, now, Date.now() + lastServerOffset, interval)
    ) {
      kick = 1;
      muzzleUntil = now + 42;
      smokeUntil = now + 240;
      flashPending = true;
      onLocalShot?.(weapon, commandSeq);
    }
  };
  const mousedown = (e: MouseEvent) => {
    if (!locked() || e.button !== 0) return;
    fire = true;
    fireLatched = true;
    presentLocalShot(seq + 1);
  };
  const mouseup = () => {
    fire = false;
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
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  document.addEventListener("mousemove", mouse);
  document.addEventListener("keydown", down);
  document.addEventListener("keyup", up);
  document.addEventListener("mousedown", mousedown);
  document.addEventListener("mouseup", mouseup);
  document.addEventListener("pointerlockchange", pointer);
  document.addEventListener("visibilitychange", hidden);
  window.addEventListener("blur", clear);
  let authorizationSuspended = false;
  let frameMs = 0,
    cpuMs = 0;
  const opponentFrustum = new THREE.Frustum(),
    viewProjection = new THREE.Matrix4(),
    opponentBounds = new THREE.Sphere(new THREE.Vector3(), 1.65),
    actorMotion = { airborne: false, weapon: "rifle" as Weapon, reloading: false };
  let actorElapsed = 0;
  let opponentDeathAt: number | null = null;
  let lastSpread = -1,
    lastReloading = false;
  let lastDraw = 0,
    renderFrames = 0,
    renderIntervalMs = 0,
    hadFocus = document.hasFocus();
  const began = performance.now();
  scene.updateMatrixWorld(true);
  viewScene.updateMatrixWorld(true);
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
    correction.update(tickDt);
    if (now - began > 2500 && controlled && state?.phase === "live" && budget.update(frameMs))
      resize();
    while (accumulator >= inputStepMs) {
      accumulator -= inputStepMs;
      if (seat && state && predicted) {
        const active =
          !authorizationSuspended && controlled && state.phase === "live" && predicted.hp > 0;
        const input: Input = {
          v: 1,
          type: "input",
          seq: ++seq,
          ...(state.combatVersion === COMBAT_VERSION ? { combatVersion: COMBAT_VERSION } : {}),
          forward: active ? Number(keys.has("KeyW")) - Number(keys.has("KeyS")) : 0,
          strafe: active ? Number(keys.has("KeyD")) - Number(keys.has("KeyA")) : 0,
          yaw: Math.max(
            -Math.PI * 2,
            Math.min(Math.PI * 2, yaw + (state.combatVersion === COMBAT_VERSION ? 0 : recoilYaw)),
          ),
          pitch: Math.max(
            -1.45,
            Math.min(1.45, pitch + (state.combatVersion === COMBAT_VERSION ? 0 : recoilPitch)),
          ),
          fire: active && (fire || fireLatched),
          reload: active && reload,
          weapon,
          jump: active && jump,
          sprint: active && keys.has("ShiftLeft"),
          crouch: active && (keys.has("ControlLeft") || keys.has("ControlRight")),
        };
        if (state.phase === "live" && !authorizationSuspended) {
          const beforeY = predicted.y;
          predictMovement(predicted, input, TICK_MS);
          jumpPresentation.advance(beforeY, predicted.y);
          pending.push(input);
          if (pending.length > 60) pending.shift();
        }
        if (input.fire && input.weapon === "rifle") presentLocalShot(input.seq);
        send(input);
        fireLatched = false;
        reload = false;
        jump = false;
      }
    }
    // Only drawing is throttled. Fixed input/network work stays above this gate.
    if (!focused && now - lastDraw < 1000 / 15) {
      animation = requestAnimationFrame(frame);
      return;
    }
    renderIntervalMs = lastDraw ? now - lastDraw : 0;
    const dt = frameDelta(now, lastDraw || now - tickDt);
    lastDraw = now;
    renderFrames++;
    // A slow frame must not expire the entire first muzzle flash unseen.
    if (flashPending) {
      muzzleUntil = now + 42;
      flashPending = false;
    }
    if (state?.combatVersion === COMBAT_VERSION && predicted) {
      const own = state.players[seat ?? "A"],
        profile = recoveryProfile(own.sprayCount ?? 0),
        serverNow = Date.now() + lastServerOffset;
      const age = Math.max(0, serverNow - own.lastShotAt),
        sinceUpdate = Math.max(
          0,
          serverNow - Math.max(own.recoilUpdatedAt ?? serverNow, own.lastShotAt + profile.delayMs),
        );
      const factor = age >= profile.resetMs ? 0 : Math.exp((-profile.rate * sinceUpdate) / 1000);
      const blend = 1 - Math.exp(-dt / 25);
      recoilPitch += ((own.recoilPitch ?? 0) * factor - recoilPitch) * blend;
      recoilYaw += ((own.recoilYaw ?? 0) * factor - recoilYaw) * blend;
    } else if (!fire || now - confirmedShot > 220) {
      recoilPitch = recoverRecoil(recoilPitch, dt);
      recoilYaw = recoverRecoil(recoilYaw, dt);
    }
    kick = decay(kick, HANDLING.kickDecay, dt);
    landKick = decay(landKick, 14, dt);
    if (predicted && seat) {
      // Render the unsent fraction of a physics tick immediately. Network input
      // and authoritative physics still run at their original fixed cadence.
      renderPose ??= { ...predicted };
      Object.assign(renderPose, predicted);
      if (!authorizationSuspended && controlled && state?.phase === "live" && predicted.hp > 0) {
        previewInput.forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
        previewInput.strafe = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
        previewInput.yaw = yaw;
        previewInput.jump = jump;
        previewInput.sprint = keys.has("ShiftLeft");
        previewInput.crouch = keys.has("ControlLeft") || keys.has("ControlRight");
        predictMovement(renderPose, previewInput, accumulator);
      }
      const active =
        !authorizationSuspended && controlled && state?.phase === "live" && predicted.hp > 0;
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
            cameraStance.sample(renderPose, dt) +
            correction.y,
          dt,
        ),
        motion.z,
      );
      camera.rotation.set(Math.min(1.45, pitch + recoilPitch), yaw + recoilYaw, 0, "YXZ");
    } else if (state) {
      const p = state.players.A;
      camera.position.set(p.x, p.y + eyeHeight(p), p.z);
      camera.rotation.set(p.pitch, p.yaw, 0, "YXZ");
    }
    // Server uses positive pitch upward; Three camera rotation uses positive pitch upward too.
    camera.updateMatrixWorld();
    if (state) {
      const otherSeat = seat === "B" ? "A" : "B",
        other = state.players[otherSeat];
      characters[otherSeat === "A" ? "B" : "A"].root.visible = false;
      const actor = characters[otherSeat];
      if (other.hp > 0) opponentDeathAt = null;
      else opponentDeathAt ??= now;
      const deathProgress =
        opponentDeathAt === null ? 0 : Math.min(1, (now - opponentDeathAt) / 450);
      const visible = visibility[otherSeat] !== false;
      if (visible) {
        if (remoteMotion.sample(Date.now() + lastServerOffset - REMOTE_DELAY_MS, remotePose, dt)) {
          actor.root.position.set(remotePose.x, remotePose.y, remotePose.z);
          actor.root.rotation.y = remotePose.yaw;
        } else actor.root.position.copy(remoteTarget);
        viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        opponentFrustum.setFromProjectionMatrix(viewProjection);
        // Conservative whole-rig bounds include the weapon and crouch. This is
        // cosmetic culling only; server visibility and hitboxes are unchanged.
        opponentBounds.center.copy(actor.root.position).y += 0.9;
        actorElapsed += dt;
        const inView = opponentFrustum.intersectsSphere(opponentBounds);
        if (inView) {
          actorMotion.airborne = other.y > 0.01;
          actorMotion.weapon = other.weapon;
          actorMotion.reloading = other.reloadUntil > Date.now() + lastServerOffset;
          actor.update(
            Math.min(actorElapsed, 250),
            now,
            remotePose.pitch,
            true,
            !!other.crouched,
            actorMotion,
          );
          actorElapsed = 0;
          // Keep the defeated opponent readable through the round break rather
          // than removing the model on the same frame as the lethal hit.
          actor.root.rotation.z =
            (-Math.PI / 2) * (deathProgress * deathProgress * (3 - 2 * deathProgress));
          actor.root.position.y += 0.12 * deathProgress;
        } else actor.root.visible = false;
        contactShadows[otherSeat].position.y = 0.008 - actor.root.position.y;
        if (actor.root.visible) actor.root.updateMatrixWorld();
      } else actor.root.visible = false;
    }

    const renderedWeapon = state && seat ? state.players[seat].weapon : weapon;
    const authoredTip =
      renderedWeapon === "rifle" && authoredView.loaded ? authoredView.muzzle() : null;
    const barrel = authoredTip?.z ?? (renderedWeapon === "rifle" ? AK_MUZZLE.z : -0.225);
    const barrelY = authoredTip?.y ?? (renderedWeapon === "rifle" ? AK_MUZZLE.y : 0);
    muzzle.update(muzzleUntil - now, barrel, barrelY, shotIndex);
    muzzle.root.position.x = authoredTip?.x ?? 0;
    flashLight.position.set(0, barrelY, barrel - 0.02);
    flashLight.intensity = muzzle.root.visible ? 2.5 : 0;
    smoke.visible = now < smokeUntil;
    smokeMaterial.opacity = smoke.visible ? Math.max(0, (smokeUntil - now) / 240) * 0.13 : 0;
    smoke.position.set(0, 0.025 + (1 - Math.max(0, (smokeUntil - now) / 240)) * 0.08, barrel);
    smoke.scale.setScalar(1 + (1 - Math.max(0, (smokeUntil - now) / 240)) * 1.3);
    weaponGroup.visible = !!seat && !!state && state.players[seat].hp > 0;
    const moving =
      locked() && (keys.has("KeyW") || keys.has("KeyS") || keys.has("KeyA") || keys.has("KeyD"));
    const airborne = !!predicted && predicted.y > 0.01;
    if (wasAirborne && !airborne) landKick = 0.018;
    wasAirborne = airborne;
    const reloadRemaining =
      state && seat
        ? Math.max(0, state.players[seat].reloadUntil - (Date.now() + lastServerOffset))
        : 0;
    const reloadProgress = reloadRemaining
      ? Math.min(1, reloadRemaining / WEAPONS[renderedWeapon].reloadMs)
      : 0;
    const authoredRifle = authoredView.loaded && renderedWeapon === "rifle";
    // The authored rifle animates the reload on its own rig; the fallback/pistol keep the tilt cue.
    const reloadTilt = reloadRemaining && !authoredRifle ? Math.sin(reloadProgress * Math.PI) : 0;
    hands.update(renderedWeapon === "pistol", reloadTilt);
    hands.root.visible = renderedWeapon === "pistol" || !authoredView.loaded;
    // An empty AK has no bolt hold-open: that reload chambers a round with the charging handle.
    // Ammo only changes when the server completes the reload, so this holds for its whole window.
    const reloadKind = state && seat && state.players[seat].ammo === 0 ? "empty" : "tactical";
    authoredView.update(
      renderedWeapon === "rifle",
      reloadRemaining ? 1 - reloadProgress : 0,
      kick,
      reloadKind,
    );
    magazine.position.y = -reloadTilt * 0.08;
    magazine.rotation.x = reloadTilt * 0.14;
    chargingHandle.position.z = -0.04 + kick * 0.008;
    // Breathing, look sway, stride bob, sprint tuck and recoil roll (viewmodel-motion.ts).
    const sway = viewmodelMotion.update({
      dt,
      lookX,
      lookY,
      moving,
      sprinting: keys.has("ShiftLeft") && !predicted?.crouched,
      airborne,
      reloading: reloadRemaining > 0,
      kick,
      shot: shotIndex,
    });
    lookX = lookY = 0;
    weaponGroup.position.set(
      (authoredRifle ? VIEWMODEL_REST.x : 0.23) + sway.x,
      (authoredRifle ? VIEWMODEL_REST.y : -0.24) + sway.y - landKick - reloadTilt * 0.07,
      (authoredRifle ? VIEWMODEL_REST.z : -0.62) + sway.z,
    );
    weaponGroup.rotation.set(
      (authoredRifle ? VIEWMODEL_REST.pitch : 0) + sway.pitch + reloadTilt * 0.13,
      (authoredRifle ? VIEWMODEL_REST.yaw : 0.18) + sway.yaw,
      (authoredRifle ? VIEWMODEL_REST.roll : -0.02) + sway.roll - reloadTilt * 0.55,
    );
    weaponGroup.scale.setScalar(renderedWeapon === "pistol" ? 0.72 : 1);
    pistolPart.visible = renderedWeapon === "pistol";
    rifle.visible = renderedWeapon === "rifle" && !authoredView.loaded;
    const spread =
      Math.round(((moving ? 3 : 0) + (airborne ? 4 : 0) + Math.min(5, recoilPitch * 45)) * 100) /
      100;
    if (spread !== lastSpread) {
      crosshair?.style.setProperty("--duel-spread", `${spread}px`);
      lastSpread = spread;
    }
    if (lastReloading !== reloadRemaining > 0) {
      lastReloading = reloadRemaining > 0;
      crosshair?.classList.toggle("is-reloading", lastReloading);
    }
    impacts.update(dt, now);
    blood.update(dt, now);
    camera.layers.set(0);
    renderer.info.autoReset = false;
    renderer.info.reset();
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    camera.layers.set(1);
    viewCamera.position.copy(camera.position);
    viewCamera.quaternion.copy(camera.quaternion);
    viewCamera.updateMatrixWorld();
    renderer.render(viewScene, viewCamera);
    camera.layers.set(0);
    cpuMs = performance.now() - cpuStart;
    animation = requestAnimationFrame(frame);
  };
  animation = requestAnimationFrame(frame);
  return {
    diagnostics: () => ({
      camera: [camera.position.x, camera.position.y, camera.position.z, camera.rotation.y],
      prediction: predicted ? [predicted.x, predicted.y, predicted.z] : null,
      correction: [correction.x, correction.y, correction.z],
      pendingInputs: pending.length,
      accumulator,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      frameMs,
      cpuMs,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      programs: renderer.info.programs?.length ?? 0,
      pixelRatio: renderer.getPixelRatio(),
      opponentVisible: characters[seat === "B" ? "A" : "B"].root.visible,
      opponentPosition: characters[seat === "B" ? "A" : "B"].root.visible
        ? characters[seat === "B" ? "A" : "B"].root.position.toArray()
        : null,
      renderFrames,
      renderIntervalMs,
    }),
    ready: visualReady,
    suspend(paused) {
      authorizationSuspended = paused;
      if (paused) {
        clear();
        pending = [];
        correction.reset();
        frameMotion.reset();
        if (seat && state) predicted = { ...state.players[seat] };
      }
    },
    snapshot(frame, assignedSeat) {
      const resetPresentation =
        authorizationSuspended ||
        seat !== assignedSeat ||
        lastRound !== frame.state.round ||
        frame.state.phase !== "live";
      authorizationSuspended = false;
      state = frame.state;
      visibility = frame.visibility ?? { A: true, B: true };
      seat = assignedSeat;
      const measuredOffset = frame.serverNow - Date.now();
      lastServerOffset =
        lastRound === 0
          ? measuredOffset
          : lastServerOffset + (measuredOffset - lastServerOffset) * 0.05;
      if (seat) {
        const authoritative = state.players[seat];
        seq = Math.max(seq, authoritative.lastSeq);
        if (lastRound !== state.round) {
          pending = [];
          // The server resets the loadout at respawn; do not replay last round's pistol choice.
          weapon = authoritative.weapon;
          yaw = authoritative.yaw;
          pitch = authoritative.pitch;
          // Physical movement keys can remain held through the winner card.
          // Clearing them here loses a keydown arriving with the respawn packet
          // and makes movement stop until the player presses the key again.
          if (lastRound === 0 || !locked()) clear();
          else fire = reload = jump = false;
          recoilPitch = 0;
          recoilYaw = 0;
          kick = 0;
          shotIndex = 0;
          triggerFeedback.reset();
          fireLatched = false;
          flashPending = false;
          muzzleUntil = 0;
          smokeUntil = 0;
          impacts.reset();
          blood.reset();
        }
        lastRound = state.round;
        const before = predicted;
        predicted = { ...authoritative };
        pending = pending.filter((i) => i.seq > authoritative.lastSeq);
        for (const i of pending) if (state.phase === "live") predictMovement(predicted, i, TICK_MS);
        if (resetPresentation) {
          cameraStance.reset();
          cameraVertical.reset();
          jumpPresentation.reset();
          correction.reset();
          frameMotion.reset();
          remoteMotion.clear();
          opponentDeathAt = null;
        } else if (before) correction.reconcile(before, predicted);
        for (const e of state.events) {
          if (e.id !== undefined && e.id <= lastEventId) continue;
          if (e.id !== undefined) lastEventId = e.id;
          if (e.type === "impact" && e.impact) impacts.emit(e.impact, performance.now());
          if (e.hit) blood.emit(e.hit, performance.now());
          if (e.type === "shot") {
            if (e.seat === seat) {
              const now = performance.now();
              if (now - confirmedShot > 300) shotIndex = 0;
              if (state.combatVersion !== COMBAT_VERSION) {
                const recoil = shotRecoil(authoritative.weapon, shotIndex++);
                recoilPitch = Math.min(HANDLING.maxPitch, recoilPitch + recoil.pitch);
                recoilYaw = Math.max(
                  -HANDLING.maxYaw,
                  Math.min(HANDLING.maxYaw, recoilYaw + recoil.yaw),
                );
              } else {
                shotIndex = authoritative.sprayCount ?? 0;
              }
              const alreadyPresented = triggerFeedback.confirm(e.shotSeq);
              if (!alreadyPresented) {
                kick = 1;
                muzzleUntil = now + 42;
                smokeUntil = now + 240;
              }
              confirmedShot = now;
            } else if (e.seat) characters[e.seat].shot(performance.now());
          }
          if (e.seat === seat && (e.type === "hit" || e.type === "headshot")) {
            hitMarker?.getAnimations().forEach((a) => a.cancel());
            hitMarker?.animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], {
              duration: 180,
              fill: "forwards",
            });
          }
        }
      }
      if (!seat)
        for (const e of state.events) {
          if (e.id !== undefined && e.id <= lastEventId) continue;
          if (e.id !== undefined) lastEventId = e.id;
          if (e.type === "impact" && e.impact) impacts.emit(e.impact, performance.now());
          if (e.type === "shot" && e.seat) characters[e.seat].shot(performance.now());
        }
      lastRound = state.round;
      const other = state.players[seat === "B" ? "A" : "B"];
      remoteTarget.set(other.x, other.y, other.z);
      if (visibility[seat === "B" ? "A" : "B"] === false) remoteMotion.clear();
      else remoteMotion.push(other, frame.serverNow);
    },
    lock: () => capturePointer(renderer.domElement),
    dispose() {
      stopped = true;
      cancelAnimationFrame(animation);
      observer.disconnect();
      if (locked()) document.exitPointerLock();
      document.removeEventListener("mousemove", mouse);
      document.removeEventListener("keydown", down);
      document.removeEventListener("keyup", up);
      document.removeEventListener("mousedown", mousedown);
      document.removeEventListener("mouseup", mouseup);
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
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) materials.add(m);
          if (o instanceof THREE.InstancedMesh) o.dispose();
        }
      };
      scene.traverse(collect);
      viewScene.traverse(collect);
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      sun.shadow.map?.dispose();
      artDisposed = true;
      logoTexture.dispose();
      contactTexture.dispose();
      weave.dispose();
      muzzle.dispose();
      authoredView.dispose();
      weaponKit.dispose();
      environment.dispose();
      reflections.dispose();
      impacts.dispose();
      blood.dispose();
      characters.A.dispose();
      characters.B.dispose();
      renderer.dispose();
      // Each mount owns its context. Release the native drawing buffers on SPA
      // navigation rather than waiting for the browser's context/GC limit.
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
