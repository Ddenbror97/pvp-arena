import * as THREE from "three";
import { ARENA, BOXES, EYE_HEIGHT, SPAWNS } from "./map";
import type { Input, MatchState, Player, Seat, Weapon } from "./protocol";
import { predictMovement, TICK_MS } from "./simulation";

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
  const opponent = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.75, 4, 10),
    new THREE.MeshStandardMaterial({ color: 0x281a3c, roughness: 0.65 }),
  );
  body.position.y = 0.82;
  body.castShadow = true;
  opponent.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xbfa8d6 }),
  );
  head.position.y = 1.6;
  head.castShadow = true;
  opponent.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.04), trim);
  visor.position.set(0, 1.65, -0.22);
  opponent.add(visor);
  scene.add(opponent);
  const weaponGroup = new THREE.Group();
  camera.add(weaponGroup);
  weaponGroup.position.set(0.24, -0.3, -0.48);
  const weaponPart = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    weaponGroup.add(m);
    return m;
  };
  weaponPart(0, 0, -0.04, 0.1, 0.13, 0.4, metal);
  weaponPart(0, -0.035, -0.05, 0.104, 0.035, 0.3, trim);
  weaponPart(0, -0.13, 0.06, 0.065, 0.22, 0.09, metal).rotation.x = -0.25;
  weaponPart(0, -0.13, -0.13, 0.075, 0.23, 0.12, metal).rotation.x = 0.25;
  weaponPart(0, 0.015, -0.37, 0.035, 0.035, 0.34, metal);
  weaponPart(0, 0.075, -0.26, 0.05, 0.06, 0.04, pale);
  weaponPart(0, 0, 0.23, 0.09, 0.13, 0.25, metal);
  const muzzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.18, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd098 }),
  );
  muzzle.rotation.x = -Math.PI / 2;
  muzzle.position.set(0, 0.015, -0.62);
  weaponGroup.add(muzzle);
  muzzle.visible = false;
  const pistolPart = weaponPart(0, 0, -0.1, 0.08, 0.08, 0.18, pale);
  pistolPart.visible = false;
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
    yaw -= e.movementX * 0.002;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * 0.002));
    yaw = ((((yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  };
  const down = (e: KeyboardEvent) => {
    if (!locked()) return;
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
    while (accumulator >= TICK_MS) {
      accumulator -= TICK_MS;
      if (seat && state && predicted) {
        const active = locked() && state.phase === "live" && predicted.hp > 0;
        const input: Input = {
          v: 1,
          type: "input",
          seq: ++seq,
          forward: active ? Number(keys.has("KeyW")) - Number(keys.has("KeyS")) : 0,
          strafe: active ? Number(keys.has("KeyD")) - Number(keys.has("KeyA")) : 0,
          yaw,
          pitch,
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
    if (predicted && seat) {
      camera.position.set(predicted.x, predicted.y + EYE_HEIGHT, predicted.z);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
    } else if (state) {
      const p = state.players.A;
      camera.position.set(p.x, p.y + EYE_HEIGHT, p.z);
      camera.rotation.set(p.pitch, p.yaw, 0, "YXZ");
    }
    // Server uses positive pitch upward; Three camera rotation uses positive pitch upward too.
    opponent.position.lerp(remoteTarget, 1 - Math.exp(-dt / 60));
    if (state) {
      const other = state.players[seat === "B" ? "A" : "B"];
      opponent.visible = other.hp > 0;
      opponent.rotation.y = other.yaw;
    }
    muzzle.visible = now < muzzleUntil;
    weaponGroup.visible = !!seat && !!state && state.players[seat].hp > 0;
    weaponGroup.position.y = -0.3 + (locked() && keys.size ? Math.sin(now * 0.009) * 0.005 : 0);
    weaponGroup.position.z = -0.48 + (muzzle.visible ? 0.025 : 0);
    weaponGroup.rotation.z = state && seat && state.players[seat].reloadUntil > 0 ? -0.45 : 0;
    weaponGroup.scale.setScalar(weapon === "pistol" ? 0.72 : 1);
    pistolPart.visible = weapon === "pistol";
    renderer.render(scene, camera);
    animation = requestAnimationFrame(frame);
  };
  animation = requestAnimationFrame(frame);
  return {
    snapshot(frame, assignedSeat) {
      state = frame.state;
      seat = assignedSeat;
      if (seat) {
        const authoritative = state.players[seat];
        seq = Math.max(seq, authoritative.lastSeq);
        if (lastRound !== state.round) {
          pending = [];
          yaw = authoritative.yaw;
          pitch = authoritative.pitch;
          clear();
        }
        lastRound = state.round;
        predicted = { ...authoritative };
        pending = pending.filter((i) => i.seq > authoritative.lastSeq);
        for (const i of pending) if (state.phase === "live") predictMovement(predicted, i, TICK_MS);
        if (state.events.some((e) => e.seat === seat && e.type === "shot"))
          muzzleUntil = performance.now() + 65;
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
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
