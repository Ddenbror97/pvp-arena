import * as THREE from "three";
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
import { loadIslandScene, type IslandScene } from "./island-scene";
import { PHASE_CODES, type BrPhase } from "./match";
import { RenderBudget } from "../presentation";
import { TICK_MS } from "../simulation";

/**
 * The battle royale client (PLAN §7 Phase 2): Project Island, the plane, the local player
 * predicted with the shared drop simulation and reconciled to the server, and the other
 * participants interpolated 110 ms behind (as in 1v1/5v5). The React page owns the socket and
 * the HUD; this module owns the canvas and the loop (no per-frame React state).
 */
export type BrView = {
  v: 1;
  type: "br-snapshot";
  tick: number;
  phase: BrPhase;
  phaseAt: number;
  route: Route;
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
  players: number[][];
  events: Array<{ seat: number; phase: DropPhase }>;
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
};

export type BrArenaControls = {
  ready: Promise<void>;
  snapshot(view: BrView): void;
  setSender(send: ((message: string) => void) | null): void;
  onHud(listener: (hud: BrHud) => void): void;
  setSensitivity(value: number): void;
  /** The predicted local body and unacknowledged inputs (tests and the dev overlay). */
  debug(): { body: DropBody; pending: number };
  dispose(): void;
};

const INTERP_MS = 110;
const DROP_JUMP_OPENS_MS = 10_000;
const MAX_PLAYERS = 100;

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
  const camera = new THREE.PerspectiveCamera(75, 1, 0.3, 14000);
  scene.add(new THREE.HemisphereLight(0xc9dcf0, 0x5a5040, 1.15));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.position.set(-550, 620, 450);
  scene.add(sun);
  const context = watchContextLoss(renderer, { scene, camera, onRestored: () => gpu.reset() });

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
  let send: ((message: string) => void) | null = null;
  let hudListener: ((hud: BrHud) => void) | null = null;
  let latest: BrView | null = null;
  let route: Route | null = null;
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
    sensitivity = 0.0022;
  const keys = new Set<string>();
  let spaceEdge = false;
  let disposed = false;

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
  const chutes: THREE.Object3D[] = [];
  const self = new THREE.Group(); // the local player's canopy, seen in third person
  scene.add(self);

  const ready = (async () => {
    island = await loadIslandScene(base, progress);
    if (disposed) return;
    scene.add(island.root);
    const model = async (id: string) => {
      const m = island!.manifest.models[id];
      if (!m) return null;
      return (await island!.loader.loadAsync(m.lods[0]!.file)).scene;
    };
    const [yc130, chute] = await Promise.all([model("yc130"), model("parachute")]);
    if (yc130) plane.add(yc130);
    chuteTemplate = chute;
    if (chute) {
      const mine = chute.clone();
      mine.visible = false;
      self.add(mine);
    }
    progress(0.95, "Preparing shaders");
    camera.position.set(0, 900, 0);
    island.update(camera);
    await renderer.compileAsync(scene, camera);
    progress(1, "Ready");
  })();

  // ------------------------------------------------------------------ input
  const onKey = (down: boolean) => (e: KeyboardEvent) => {
    if (e.code === "F3" && down) {
      e.preventDefault();
      overlay.toggle();
      return;
    }
    if (down && e.code === "Space" && !keys.has("Space")) spaceEdge = true;
    if (down) keys.add(e.code);
    else keys.delete(e.code);
  };
  const keyDown = onKey(true),
    keyUp = onKey(false);
  const onMouse = (e: MouseEvent) => {
    if (document.pointerLockElement !== renderer.domElement) return;
    yaw -= e.movementX * sensitivity;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * sensitivity));
  };
  const lock = () => void renderer.domElement.requestPointerLock?.();
  addEventListener("keydown", keyDown);
  addEventListener("keyup", keyUp);
  addEventListener("mousemove", onMouse);
  renderer.domElement.addEventListener("click", lock);

  /** The input for this 30 Hz step, from the keys and the camera direction. */
  function sample(): DropInput {
    const f = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
      s = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const space = spaceEdge;
    spaceEdge = false;
    return {
      forward: f,
      strafe: s,
      yaw,
      jump: body.phase === "ground" && keys.has("Space"),
      crouch: keys.has("KeyC"),
      sprint: keys.has("ShiftLeft"),
      walk: keys.has("AltLeft"),
      // Space: leave the plane, then open the parachute.
      jumpOut: body.phase === "plane" && space,
      deploy: body.phase === "freefall" && space,
      dive: body.phase === "freefall" && keys.has("ControlLeft"),
    };
  }

  // ------------------------------------------------------------------ snapshots
  function snapshot(view: BrView) {
    latest = view;
    route = view.route;
    baseTick = view.tick;
    baseAt = performance.now();
    const rows = new Map<number, number[]>();
    for (const r of view.players) rows.set(r[0]!, r);
    buffer.push({ at: performance.now(), rows });
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
    if (island && view.phase !== "waiting" && view.phase !== "starting")
      for (const p of pending)
        stepDrop(
          island.island.solid,
          island.meta,
          view.route,
          body,
          p.input,
          p.clock - view.phaseAt,
          TICK_MS,
        );
    const jump = before.distanceTo(new THREE.Vector3(body.x, body.y, body.z));
    // Small differences are smoothed out; large ones (teleport, plane) snap.
    if (jump < 3) correction.add(before.sub(new THREE.Vector3(body.x, body.y, body.z)));
    else correction.set(0, 0, 0);
  }

  // ------------------------------------------------------------------ loop
  let last = performance.now(),
    accumulator = 0,
    lastHud = 0;
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1);
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
      if (latest.phase !== "waiting" && latest.phase !== "starting")
        stepDrop(
          island.island.solid,
          island.meta,
          route,
          body,
          input,
          clock - latest.phaseAt,
          TICK_MS,
        );
    }
    correction.multiplyScalar(Math.exp(-dtMs / 90));
    if (context.lost) return;

    // The plane, from the shared route and the server clock.
    const planeMs = serverClock() - latest.phaseAt;
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
    if (a && b) {
      const k = b.at > a.at ? Math.min(1, Math.max(0, (t - a.at) / (b.at - a.at))) : 1;
      for (const [seat, rb] of b.rows) {
        const ra = a.rows.get(seat) ?? rb;
        v.set(
          ra[1]! + (rb[1]! - ra[1]!) * k,
          ra[2]! + (rb[2]! - ra[2]!) * k,
          ra[3]! + (rb[3]! - ra[3]!) * k,
        );
        visible++;
        const phase = PHASE_CODES[rb[4]!]!;
        if (phase === "parachute" && chuteTemplate) {
          let c = chutes[chuteCount];
          if (!c) {
            c = chuteTemplate.clone();
            chutes.push(c);
            scene.add(c);
          }
          c.visible = true;
          c.position.copy(v);
          chuteCount++;
        }
        if (ground < MAX_PLAYERS) {
          // Freefallers lie flat; everyone else stands.
          q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), phase === "freefall" ? -Math.PI / 2 : 0);
          m4.compose(v, q, one);
          stand.setMatrixAt(ground++, m4);
        }
      }
    }
    for (let i = chuteCount; i < chutes.length; i++) chutes[i]!.visible = false;
    stand.count = ground;
    stand.instanceMatrix.needsUpdate = true;

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
    if (body.phase === "plane" && plane.visible) {
      camera.position.set(
        plane.position.x - fx * 70,
        plane.position.y + 18 - fy * 70,
        plane.position.z - fz * 70,
      );
      camera.lookAt(plane.position);
    } else if (body.phase === "freefall" || body.phase === "parachute") {
      camera.position.set(px - fx * 9, py + 3 - fy * 9, pz - fz * 9);
      camera.lookAt(px + fx * 20, py + 1 + fy * 20, pz + fz * 20);
    } else {
      const eye = body.phase === "swim" ? 0.3 : body.crouched ? 0.95 : 1.6;
      camera.position.set(px, py + eye, pz);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
    }
    const { selectMs } = island.update(camera);
    gpu.begin();
    renderer.render(scene, camera);
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
    if (now - lastHud > 100 && hudListener) {
      lastHud = now;
      const groundY = island.hf.heightAt(body.x, body.z);
      const countdown =
        latest.phase === "starting"
          ? Math.max(0, (latest.phaseAt - serverClock()) / 1000)
          : latest.phase === "plane" && body.phase === "plane"
            ? Math.max(
                0,
                ((planeMs < DROP_JUMP_OPENS_MS ? DROP_JUMP_OPENS_MS : routeMs(route)) - planeMs) /
                  1000,
              )
            : null;
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
      });
    }
  }
  requestAnimationFrame(frame);

  return {
    ready,
    snapshot,
    setSender(fn) {
      send = fn;
    },
    onHud(listener) {
      hudListener = listener;
    },
    setSensitivity(value) {
      sensitivity = value;
    },
    debug() {
      return { body: { ...body }, pending: pending.length };
    },
    dispose() {
      disposed = true;
      removeEventListener("keydown", keyDown);
      removeEventListener("keyup", keyUp);
      removeEventListener("mousemove", onMouse);
      renderer.domElement.removeEventListener("click", lock);
      resizeObserver.disconnect();
      context.dispose();
      gpu.dispose();
      overlay.dispose();
      island?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
