import * as THREE from "three";
import { ARENA, BOXES, EYE_HEIGHT, SPAWNS } from "./map";
import type { Input, MatchState, Player, Seat, Weapon } from "./protocol";
import { predictMovement, TICK_MS, WEAPONS } from "./simulation";
import { createCharacter } from "./character";
import { HANDLING, decay, recoverRecoil, shotRecoil } from "./handling";

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
  scene.background = new THREE.Color(0x90b7d3);
  scene.fog = new THREE.Fog(0x8eabc1, 32, 95);
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
  const hemisphere = new THREE.HemisphereLight(0xbbe1ff, 0x2b1637, 2.8);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffefd8, 3.4);
  sun.position.set(-12, 25, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const concrete = new THREE.MeshStandardMaterial({ color: 0x565663, roughness: 0.82 });
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
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material = concrete,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    scene.add(m);
    return m;
  };
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
  box(0, -0.2, 0, ARENA.width, 0.4, ARENA.depth);
  for (const sign of [-1, 1]) {
    box(sign * (ARENA.width / 2 + 0.4), 3, 0, 0.8, 6, ARENA.depth + 1);
    box(0, 3, sign * (ARENA.depth / 2 + 0.4), ARENA.width + 1, 6, 0.8);
    box(sign * (ARENA.width / 2 - 0.05), 0.13, 0, 0.09, 0.08, ARENA.depth, trim);
    box(0, 0.13, sign * (ARENA.depth / 2 - 0.05), ARENA.width, 0.08, 0.09, trim);
    box(sign * (ARENA.width / 2 - 0.05), 5, 0, 0.09, 0.09, ARENA.depth, trim);
    box(0, 5.5, sign * (ARENA.depth / 2 - 0.05), ARENA.width, 0.1, 0.08, trim);
    for (const z of [-12, -6, 0, 6, 12]) {
      box(sign * (ARENA.width / 2 - 0.03), 3, z, 0.08, 6, 0.08, metal);
      box(sign * (ARENA.width / 2 + 0.4), 6.2, z, 0.3, 1, 0.3, metal);
    }
    box(sign * (ARENA.width / 2 + 0.4), 6.6, 0, 0.2, 0.15, ARENA.depth + 1, metal);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), branding);
    board.position.set(0, 4, sign * (ARENA.depth / 2 - 0.06));
    if (sign === 1) board.rotation.y = Math.PI;
    scene.add(board);
    for (const x of [-8, 8]) {
      box(x, 3, sign * 16, 1.2, 6, 1, metal);
      box(x, 4.5, sign * 15.4, 0.1, 2.4, 0.06, trim);
    }
    // Decorative upper deck remains beyond the server-enforced playable boundary.
    box(sign * 13, 2.1, 0, 2, 0.3, 32, metal);
    for (const z of [-7, 7]) {
      const light = new THREE.PointLight(0x983cff, 12, 9, 2);
      light.position.set(sign * 10, 2.5, z);
      scene.add(light);
    }
  }
  for (const b of BOXES) {
    box(b.x, b.y, b.z, b.w, b.h, b.d, metal);
    box(b.x, b.y + b.h / 2 + 0.02, b.z, b.w, 0.04, b.d, concrete);
    box(b.x, b.y, b.z + b.d / 2 + 0.01, b.w, 0.07, 0.03, trim);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w + 0.01, b.h + 0.01, b.d + 0.01)),
      new THREE.LineBasicMaterial({ color: 0x716878 }),
    );
    edges.position.set(b.x, b.y, b.z);
    scene.add(edges);
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3.65, 3.72, 80),
    new THREE.MeshBasicMaterial({ color: 0x9a3cff, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.015;
  scene.add(ring);
  const floorMark = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.1), branding);
  floorMark.rotation.x = -Math.PI / 2;
  floorMark.position.set(0, 0.02, 10);
  scene.add(floorMark);
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
    if (["Space", "KeyW", "KeyS", "KeyA", "KeyD", "KeyR", "Digit1", "Digit2"].includes(e.code))
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
      camera.position.set(predicted.x, predicted.y + EYE_HEIGHT, predicted.z);
      camera.rotation.set(Math.min(1.45, pitch + recoilPitch), yaw + recoilYaw, 0, "YXZ");
    } else if (state) {
      const p = state.players.A;
      camera.position.set(p.x, p.y + EYE_HEIGHT, p.z);
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
      actor.update(dt, now, other.pitch, other.hp > 0);
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
        }
        lastRound = state.round;
        predicted = { ...authoritative };
        pending = pending.filter((i) => i.seq > authoritative.lastSeq);
        for (const i of pending) if (state.phase === "live") predictMovement(predicted, i, TICK_MS);
        for (const e of state.events) {
          if (e.id !== undefined && e.id <= lastEventId) continue;
          if (e.id !== undefined) lastEventId = e.id;
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
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose();
        }
      });
      logoTexture.dispose();
      characters.A.dispose();
      characters.B.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
