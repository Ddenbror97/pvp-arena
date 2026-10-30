import * as THREE from "three";
import { EYE_HEIGHT, SPAWNS, eyeHeight } from "./map";
import type { Input, MatchState, Player, Seat, Weapon } from "./protocol";
import { predictMovement, TICK_MS, WEAPONS } from "./simulation";
import { createCharacter } from "./character";
import { HANDLING, decay, recoverRecoil, shotRecoil } from "./handling";
import { createArenaEnvironment } from "./environment";
import { createImpactEffects } from "./impacts";

export type ArenaFrame = {
  state: MatchState;
  serverNow: number;
  settled: boolean;
  settlementPending: boolean;
};
export type ArenaControls = {
  snapshot: (frame: ArenaFrame, seat: Seat | null) => void;
  lock: () => Promise<void>;
  dispose: () => void;
};

/** Rendering is disposable and cosmetic. Only validated server snapshots determine damage and results. */
export function mountArena(
  host: HTMLElement,
  send: (input: Input) => void,
  onLock: (locked: boolean) => void,
): ArenaControls {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x68717d);
  scene.fog = new THREE.Fog(0x77808a, 40, 90);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(78, 1, 0.06, 110);
  camera.rotation.order = "YXZ";
  camera.position.set(0, EYE_HEIGHT, SPAWNS.A.z);
  scene.add(camera);
  const hemisphere = new THREE.HemisphereLight(0xc4d3df, 0x4b4238, 1.8);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffefd8, 3.4);
  // Centre the light across the two opposing spawn directions.
  sun.position.set(-12, 25, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 65;
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const metal = new THREE.MeshStandardMaterial({
    color: 0x171620,
    metalness: 0.6,
    roughness: 0.45,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0x822aff,
    emissive: 0x7422ff,
    emissiveIntensity: 3,
  });
  const pale = new THREE.MeshStandardMaterial({ color: 0xe9d8ff, metalness: 0.3, roughness: 0.4 });
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
  const branding = new THREE.MeshStandardMaterial({
    map: logoTexture,
    emissive: 0x442066,
    emissiveMap: logoTexture,
    emissiveIntensity: 0.7,
    roughness: 0.65,
  });
  const environment = createArenaEnvironment(scene, branding);
  const impacts = createImpactEffects(scene);
  // Capture this arena once for rough metallic reflections, excluding all players.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const reflections = pmrem.fromScene(scene, 0.04, 0.1, 100);
  scene.environment = reflections.texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();
  const characters = { A: createCharacter("A", branding), B: createCharacter("B", branding) };
  scene.add(characters.A.root, characters.B.root);
  characters.A.root.visible = false;
  characters.B.root.visible = false;
  const weaponGroup = new THREE.Group();
  weaponGroup.name = "first-person-weapon";
  camera.add(weaponGroup);
  weaponGroup.position.set(0.24, -0.3, -0.48);
  const rifleParts: THREE.Mesh[] = [];
  const gunMetal = metal.clone();
  gunMetal.color.setHex(0x454052);
  gunMetal.metalness = 0.3;
  gunMetal.roughness = 0.5;
  const gunTrim = trim.clone();
  gunTrim.emissiveIntensity = 0.35;
  gunTrim.color.setHex(0x7434bc);
  const weaponPart = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
  ) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material === metal ? gunMetal : material === trim ? gunTrim : material,
    );
    m.position.set(x, y, z);
    weaponGroup.add(m);
    rifleParts.push(m);
    // A dedicated viewmodel render pass keeps the held weapon out of arena walls.
    m.layers.set(1);
    m.castShadow = false;
    return m;
  };
  weaponPart(0, 0, -0.04, 0.1, 0.13, 0.4, metal);
  weaponPart(0, -0.035, -0.05, 0.104, 0.035, 0.3, trim);
  weaponPart(0, -0.13, 0.06, 0.065, 0.22, 0.09, metal).rotation.x = -0.25;
  weaponPart(0, -0.13, -0.13, 0.075, 0.23, 0.12, metal).rotation.x = 0.25;
  weaponPart(0, 0.015, -0.37, 0.035, 0.035, 0.34, metal);
  weaponPart(0, 0.075, -0.26, 0.05, 0.06, 0.04, pale);
  weaponPart(0, 0, 0.23, 0.09, 0.13, 0.25, metal);
  weaponPart(0, 0.04, -0.25, 0.11, 0.08, 0.22, metal);
  for (let i = 0; i < 4; i++) weaponPart(0, 0.085, -0.25 + i * 0.045, 0.065, 0.012, 0.012, trim);
  for (let i = 0; i < 4; i++)
    weaponPart(0, -0.13 - i * 0.045, -0.13 + i * 0.022, 0.078, 0.06, 0.105, metal).rotation.x =
      0.12 + i * 0.1;
  const receiverLogo = weaponPart(-0.053, 0, -0.04, 0.003, 0.09, 0.27, branding);
  receiverLogo.name = "pvp-receiver-branding";
  const muzzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.18, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd098 }),
  );
  muzzle.rotation.x = -Math.PI / 2;
  muzzle.position.set(0, 0.015, -0.62);
  weaponGroup.add(muzzle);
  muzzle.layers.set(1);
  muzzle.visible = false;
  const pistolPart = weaponPart(0, 0, -0.1, 0.08, 0.08, 0.18, pale);
  rifleParts.pop();
  pistolPart.visible = false;
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
  const viewLight = new THREE.HemisphereLight(0xe4eaff, 0x392346, 3);
  viewLight.layers.set(1);
  scene.add(viewLight);
  const viewSun = new THREE.DirectionalLight(0xffe0c6, 3);
  viewSun.position.set(-1, 3, 2);
  viewSun.layers.set(1);
  scene.add(viewSun);
  const glove = new THREE.MeshStandardMaterial({ color: 0x25202f, roughness: 0.82 });
  for (const [x, y, z, rx] of [
    [0.035, -0.2, 0.09, -0.3],
    [-0.08, -0.09, -0.24, -1.1],
  ]) {
    const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.1, 4, 7), glove);
    hand.position.set(x!, y!, z!);
    hand.rotation.x = rx!;
    hand.layers.set(1);
    weaponGroup.add(hand);
  }
  let recoilPitch = 0,
    recoilYaw = 0,
    kick = 0,
    shotIndex = 0,
    confirmedShot = -1e12,
    lastEventId = -1;
  let smokeUntil = 0,
    landKick = 0,
    wasAirborne = false,
    turnSway = 0;
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
  const remoteTarget = new THREE.Vector3();
  const locked = () => document.pointerLockElement === renderer.domElement;
  const clear = () => {
    keys.clear();
    fire = false;
    reload = false;
    jump = false;
  };
  const mouse = (e: MouseEvent) => {
    if (!locked()) return;
    yaw -= e.movementX * HANDLING.sensitivity;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * HANDLING.sensitivity));
    turnSway = Math.max(-0.025, Math.min(0.025, turnSway + e.movementX * 0.00003));
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
    if (e.code === "Space") jump = true;
    if (e.code === "Digit1") weapon = "rifle";
    if (e.code === "Digit2") weapon = "pistol";
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  const mousedown = (e: MouseEvent) => {
    if (locked() && e.button === 0) fire = true;
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
    renderer.setSize(w, h);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
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
  const frame = (now: number) => {
    if (stopped) return;
    const dt = Math.min(100, now - previous);
    previous = now;
    accumulator += dt;
    while (accumulator >= inputStepMs) {
      accumulator -= inputStepMs;
      if (seat && state && predicted) {
        const active = locked() && state.phase === "live" && predicted.hp > 0;
        const input: Input = {
          v: 1,
          type: "input",
          seq: ++seq,
          forward: active ? Number(keys.has("KeyW")) - Number(keys.has("KeyS")) : 0,
          strafe: active ? Number(keys.has("KeyD")) - Number(keys.has("KeyA")) : 0,
          yaw: Math.max(-Math.PI * 2, Math.min(Math.PI * 2, yaw + recoilYaw)),
          pitch: Math.max(-1.45, Math.min(1.45, pitch + recoilPitch)),
          fire: active && fire,
          reload: active && reload,
          weapon,
          jump: active && jump,
          sprint: active && keys.has("ShiftLeft"),
          crouch: active && (keys.has("ControlLeft") || keys.has("ControlRight")),
        };
        if (state.phase === "live") {
          predictMovement(predicted, input, TICK_MS);
          pending.push(input);
          if (pending.length > 60) pending.shift();
        }
        send(input);
        reload = false;
        jump = false;
      }
    }
    if (!fire || now - confirmedShot > 220) {
      recoilPitch = recoverRecoil(recoilPitch, dt);
      recoilYaw = recoverRecoil(recoilYaw, dt);
    }
    kick = decay(kick, HANDLING.kickDecay, dt);
    turnSway = decay(turnSway, 12, dt);
    landKick = decay(landKick, 14, dt);
    if (predicted && seat) {
      camera.position.set(predicted.x, predicted.y + eyeHeight(predicted), predicted.z);
      camera.rotation.set(Math.min(1.45, pitch + recoilPitch), yaw + recoilYaw, 0, "YXZ");
    } else if (state) {
      const p = state.players.A;
      camera.position.set(p.x, p.y + eyeHeight(p), p.z);
      camera.rotation.set(p.pitch, p.yaw, 0, "YXZ");
    }
    // Server uses positive pitch upward; Three camera rotation uses positive pitch upward too.
    if (state) {
      const otherSeat = seat === "B" ? "A" : "B",
        other = state.players[otherSeat];
      characters[otherSeat === "A" ? "B" : "A"].root.visible = false;
      const actor = characters[otherSeat];
      actor.root.position.lerp(remoteTarget, 1 - Math.exp(-dt / 60));
      actor.root.rotation.y = other.yaw;
      actor.update(dt, now, other.pitch, other.hp > 0, !!other.crouched);
    }
    muzzle.visible = now < muzzleUntil;
    const renderedWeapon = state && seat ? state.players[seat].weapon : weapon;
    const barrel = renderedWeapon === "rifle" ? -0.62 : -0.25;
    muzzle.position.z = barrel;
    flashLight.position.set(0, 0.015, barrel);
    flashLight.intensity = muzzle.visible ? 2.5 : 0;
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
    const reloadTilt = reloadRemaining ? Math.sin(reloadProgress * Math.PI) : 0;
    weaponGroup.position.set(
      0.235 + turnSway + (moving ? Math.sin(now * 0.008) * 0.003 : 0),
      -0.29 +
        (moving ? Math.sin(now * 0.016) * 0.004 : Math.sin(now * 0.0018) * 0.0015) -
        landKick -
        reloadTilt * 0.07 -
        (airborne ? 0.008 : 0),
      -0.46 + kick * 0.025,
    );
    weaponGroup.rotation.set(
      kick * 0.025 + reloadTilt * 0.13,
      -0.025 - turnSway,
      -0.02 - reloadTilt * 0.55,
    );
    weaponGroup.scale.setScalar(renderedWeapon === "pistol" ? 0.72 : 1);
    pistolPart.visible = renderedWeapon === "pistol";
    for (const part of rifleParts) part.visible = renderedWeapon === "rifle";
    crosshair?.style.setProperty(
      "--duel-spread",
      `${(moving ? 3 : 0) + (airborne ? 4 : 0) + Math.min(5, recoilPitch * 45)}px`,
    );
    crosshair?.classList.toggle("is-reloading", reloadRemaining > 0);
    impacts.update(dt, now);
    camera.layers.set(0);
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    camera.layers.set(1);
    const background = scene.background;
    scene.background = null;
    renderer.render(scene, camera);
    scene.background = background;
    camera.layers.set(0);
    animation = requestAnimationFrame(frame);
  };
  animation = requestAnimationFrame(frame);
  return {
    snapshot(frame, assignedSeat) {
      state = frame.state;
      seat = assignedSeat;
      lastServerOffset = frame.serverNow - Date.now();
      if (seat) {
        const authoritative = state.players[seat];
        seq = Math.max(seq, authoritative.lastSeq);
        if (lastRound !== state.round) {
          pending = [];
          yaw = authoritative.yaw;
          pitch = authoritative.pitch;
          clear();
          recoilPitch = 0;
          recoilYaw = 0;
          kick = 0;
          shotIndex = 0;
          muzzleUntil = 0;
          smokeUntil = 0;
          impacts.reset();
        }
        lastRound = state.round;
        predicted = { ...authoritative };
        pending = pending.filter((i) => i.seq > authoritative.lastSeq);
        for (const i of pending) if (state.phase === "live") predictMovement(predicted, i, TICK_MS);
        for (const e of state.events) {
          if (e.id !== undefined && e.id <= lastEventId) continue;
          if (e.id !== undefined) lastEventId = e.id;
          if (e.type === "impact" && e.impact) impacts.emit(e.impact, performance.now());
          if (e.type === "shot") {
            if (e.seat === seat) {
              const now = performance.now();
              if (now - confirmedShot > 300) shotIndex = 0;
              const recoil = shotRecoil(authoritative.weapon, shotIndex++);
              recoilPitch = Math.min(HANDLING.maxPitch, recoilPitch + recoil.pitch);
              recoilYaw = Math.max(
                -HANDLING.maxYaw,
                Math.min(HANDLING.maxYaw, recoilYaw + recoil.yaw),
              );
              kick = 1;
              confirmedShot = now;
              muzzleUntil = now + 42;
              smokeUntil = now + 240;
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
      const other = state.players[seat === "B" ? "A" : "B"];
      remoteTarget.set(other.x, other.y, other.z);
    },
    async lock() {
      await renderer.domElement.requestPointerLock();
    },
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
      scene.traverse((o) => {
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
      });
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      sun.shadow.map?.dispose();
      logoTexture.dispose();
      environment.dispose();
      reflections.dispose();
      impacts.dispose();
      characters.A.dispose();
      characters.B.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
