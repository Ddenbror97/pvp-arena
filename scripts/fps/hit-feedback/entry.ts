/**
 * The page behind scripts/fps/hit-feedback/capture.mjs: one character on a small stage, the
 * hit effects as the games draw them (impacts.ts `flesh`, blood-effects.ts) and, for the
 * comparison, the blood effect as it was (`before`, a copy of an earlier blood-effects.ts
 * the script takes from git), with the clock in the script's hands; and the incoming-damage
 * overlay (damage-feedback.ts) over a still.
 */
import * as THREE from "three";
import { createCharacter } from "@/lib/fps/character";
import { createDamageFeedback, type DamageFeedback } from "@/lib/fps/damage-feedback";
import { FLESH_PARTICLES } from "@/lib/fps/flesh-mist";
import { createImpactEffects } from "@/lib/fps/impacts";
import { createWeaponKit } from "@/lib/fps/weapon";
// (Resolved by capture.mjs to the earlier module.)
import { createBloodEffects as createBloodBefore } from "hit-feedback-before";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb4c8);
scene.fog = new THREE.Fog(0x9fb4c8, 60, 260);
scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x5a5448, 1.5));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
sun.position.set(6, 10, 4);
scene.add(sun);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2),
  new THREE.MeshLambertMaterial({ color: 0x77736b }),
);
scene.add(ground);
// A wall behind the target and a few blocks, so depth and scale read.
const block = (x: number, y: number, z: number, w: number, h: number, d: number, c: number) => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: c }),
  );
  m.position.set(x, y, z);
  scene.add(m);
};
block(0, 1.6, -4.2, 14, 3.2, 0.3, 0x8e8a80);
block(-4.5, 0.6, -1.5, 1.2, 1.2, 1.2, 0x6f5a3e);
block(4.2, 0.5, 1.2, 1, 1, 2, 0x55606a);
const camera = new THREE.PerspectiveCamera(74, 16 / 9, 0.05, 600);

const kit = createWeaponKit();
const actor = createCharacter("B", null, kit);
scene.add(actor.root);
actor.root.position.set(0, 0, 0);
// (The character faces −z at yaw 0: turned to face the shooter at +z.)
actor.root.rotation.y = Math.PI;

const impacts = createImpactEffects(scene);
const before = createBloodBefore(scene);
let feedback: DamageFeedback | null = null;

const size = () => {
  renderer.setSize(innerWidth, innerHeight, false);
  canvas.style.cssText = "display:block;width:100vw;height:100vh";
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
};
size();
addEventListener("resize", size);

type Hit = { point: [number, number, number]; from: [number, number, number]; zone: string };
const hitOf = (h: Hit) => {
  const d = new THREE.Vector3(...h.point).sub(new THREE.Vector3(...h.from)).normalize();
  return {
    victim: "B" as const,
    zone: h.zone as never,
    damage: 30,
    point: { x: h.point[0], y: h.point[1], z: h.point[2] },
    direction: { x: d.x, y: d.y, z: d.z },
  };
};

const api = {
  ready: actor.ready.then(() => {
    actor.update(16, 100, 0, true, false, {});
    actor.root.updateMatrixWorld(true);
  }),
  view(eye: [number, number, number], at: [number, number, number], fov = 74) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.position.set(...eye);
    camera.lookAt(...at);
  },
  /** One hit, then the clock run on to `ms` after it in 60 Hz steps, and a frame drawn. */
  shot(which: "before" | "after" | "none", h: Hit, ms: number, wall = false) {
    impacts.reset();
    before.reset();
    const t0 = 1000;
    // (A firefight: a bullet has also just struck the wall behind.)
    if (wall)
      impacts.emit(
        { point: { x: 1, y: 1.4, z: -4.05 }, normal: { x: 0, y: 0, z: 1 }, surface: "concrete" },
        t0,
      );
    if (which === "after") impacts.flesh(hitOf(h), t0);
    if (which === "before") before.emit(hitOf(h), t0);
    for (let t = 1000 / 60; t <= ms + 1e-6; t += 1000 / 60) {
      impacts.update(1000 / 60, t0 + t);
      before.update(1000 / 60, t0 + t);
    }
    renderer.render(scene, camera);
    // (What is live in the particle pool, for the report.)
    const points = scene.getObjectByName("impact-particles") as THREE.Points;
    const alpha = points.geometry.getAttribute("aAlpha"),
      place = points.geometry.getAttribute("position");
    let live = 0,
      peak = 0;
    for (let i = 0; i < alpha.count; i++)
      if (place.getX(i) < 9e4) {
        live++;
        peak = Math.max(peak, alpha.getX(i));
      }
    return {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      live,
      peakAlpha: Math.round(peak * 100) / 100,
    };
  },
  /** The costs: per-hit and per-frame CPU, draw calls, heap growth over many hits. */
  measure(h: Hit) {
    const hit = hitOf(h);
    const time = (f: () => void, n: number) => {
      const a = performance.now();
      for (let i = 0; i < n; i++) f();
      return ((performance.now() - a) / n) * 1000; // µs
    };
    const gc = (globalThis as { gc?: () => void }).gc;
    const heap = () =>
      (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ??
      NaN;
    const out: Record<string, number> = {};
    let t = 5000;
    // Warm both, so the timings are of compiled code.
    for (let i = 0; i < 2000; i++) {
      impacts.flesh(hit, t);
      impacts.update(16, (t += 16));
      before.emit(hit, t);
      before.update(16, t);
    }
    impacts.reset();
    before.reset();
    out.emitAfterUs = time(() => impacts.flesh(hit, t), 20000);
    out.emitBeforeUs = time(() => before.emit(hit, t), 20000);
    out.updateAfterUs = time(() => impacts.update(16, (t += 0.001)), 20000);
    out.updateBeforeUs = time(() => before.update(16, t), 20000);
    impacts.reset();
    before.reset();
    out.updateIdleAfterUs = time(() => impacts.update(16, (t += 16)), 20000);
    // Heap over 20 000 hits at 20 a second with the frames between (nothing may accumulate).
    gc?.();
    const h0 = heap();
    for (let i = 0; i < 20000; i++) {
      impacts.flesh(hit, t);
      for (let k = 0; k < 3; k++) impacts.update(16.7, (t += 16.7));
    }
    gc?.();
    out.heapGrowthKb = (heap() - h0) / 1024;
    // Draw calls with the effect live, each way, and with none.
    const calls = (which: "before" | "after" | "none", wall = false) =>
      api.shot(which, h, 100, wall).calls;
    out.callsNone = calls("none");
    out.callsBefore = calls("before");
    out.callsAfter = calls("after");
    // (With a wall impact live as well, as in a firefight: its hole and the debris' points.)
    out.callsFightNone = calls("none", true);
    out.callsFightBefore = calls("before", true);
    out.callsFightAfter = calls("after", true);
    // Frame time (this machine's renderer) with the mist filling the view and without.
    const frames = (which: "before" | "after" | "none") => {
      api.shot(which, h, 100);
      const gl = renderer.getContext(),
        px = new Uint8Array(4);
      const a = performance.now();
      for (let i = 0; i < 12; i++) {
        renderer.render(scene, camera);
        // (Reading a pixel back waits for the frame to be drawn.)
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      }
      return (performance.now() - a) / 12;
    };
    // (Interleaved and the least of three: the first frames after a change are slow.)
    const least = { none: Infinity, before: Infinity, after: Infinity };
    for (let round = 0; round < 3; round++)
      for (const which of ["none", "before", "after"] as const)
        least[which] = Math.min(least[which], frames(which));
    out.frameNoneMs = least.none;
    out.frameBeforeMs = least.before;
    out.frameAfterMs = least.after;
    out.particlesPerHit = FLESH_PARTICLES;
    out.geometries = renderer.info.memory.geometries;
    out.textures = renderer.info.memory.textures;
    return out;
  },
  /** The incoming-damage overlay over the stage, in a given state. */
  overlay(state: {
    health: number | null;
    hits?: Array<{
      key: number;
      x: number;
      z: number;
      damage: number;
      armoured: boolean;
      ago: number;
    }>;
    yaw?: number;
  }) {
    feedback ??= createDamageFeedback(document.body, { reducedMotion: true });
    feedback.reset();
    const now = 100_000;
    // (Eased in real play: run the clock until it has settled.)
    for (const h of state.hits ?? [])
      feedback.hit({ key: h.key, x: h.x, z: h.z }, h.damage, h.armoured, now - h.ago);
    const yaw = state.yaw ?? 0;
    for (let t = now - 3000; t <= now; t += 16) {
      if (t >= now - 40)
        for (const h of state.hits ?? [])
          if (h.ago <= 40 && t - 16 < now - h.ago)
            feedback.hit({ key: h.key, x: h.x, z: h.z }, h.damage, h.armoured, now - h.ago);
      feedback.update(t, 0, 0, -Math.sin(yaw), -Math.cos(yaw), state.health);
    }
    renderer.render(scene, camera);
    return feedback.stats();
  },
  /** The overlay's cost: µs per frame idle and busy, page writes per frame. */
  measureOverlay() {
    const f = createDamageFeedback(document.body, { reducedMotion: false });
    const run = (health: number, hits: boolean, n = 6000) => {
      let t = 10_000;
      f.reset();
      f.update(t, 0, 0, 0, -1, health);
      const w0 = f.stats().writes;
      const a = performance.now();
      for (let i = 0; i < n; i++) {
        t += 16.7;
        if (hits && i % 20 === 0)
          f.hit({ key: i % 4, x: Math.sin(i), z: Math.cos(i) }, 25, i % 3 === 0, t);
        f.update(t, 0, 0, Math.sin(i / 50), -Math.cos(i / 50), health);
      }
      return {
        us: ((performance.now() - a) / n) * 1000,
        writesPerFrame: (f.stats().writes - w0) / n,
      };
    };
    const out = {
      idle: run(1, false),
      lowHealth: run(0.4, false),
      critical: run(0.15, false),
      underFire: run(0.3, true),
      elements: f.stats().elements,
      nodesInPage: document.querySelectorAll(".fps-dmg, .fps-dmg *").length,
    };
    f.dispose();
    return {
      ...out,
      nodesAfterDispose: document.querySelectorAll(".fps-dmg").length - (feedback ? 1 : 0),
    };
  },
  /** The low-health picture's middle: the largest alpha inside the cleared ellipse. */
  centreAlpha() {
    const c = document.querySelector<HTMLCanvasElement>(".fps-dmg-low")!;
    const g = c.getContext("2d")!;
    const { data } = g.getImageData(0, 0, c.width, c.height);
    let inside = 0,
      edge = 0;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++) {
        const u = (x + 0.5) / c.width - 0.5,
          v = (y + 0.5) / c.height - 0.5;
        const a = data[(y * c.width + x) * 4 + 3]!;
        if ((u / 0.27) ** 2 + (v / 0.25) ** 2 <= 1) inside = Math.max(inside, a);
        if (y > c.height * 0.9) edge = Math.max(edge, a);
      }
    return { inside, edge };
  },
};
(window as unknown as { fx: typeof api }).fx = api;
