import * as THREE from "three";
import { cloneAuthoredModel, retainAuthoredAsset } from "../authored-assets";
import type { Vector } from "../collision";
import type { GameMap } from "../maps/types";
import { ARENA_MODELS } from "../model-assets";
import { cellBurning, puffRadius, smokePhase } from "./effects";
import { simStart, simTo, type Impact, type NadeSim } from "./physics";
import { GRENADES, GRENADE_TYPES, type GrenadeType } from "./rules";
import type { Detonation, Projectile, PublicGrenadeWorld } from "./world";

/**
 * Grenades in the world, for every client: flights (replayed with the server's own deterministic
 * physics from each throw's start), the flying spoon, HE blasts, smoke clouds and fires.
 *
 * Draw cost is fixed and small: the grenades are pooled meshes (a few per type), and every
 * effect is one of two instanced sprite meshes: soft sprites (smoke, dust; normal blending) and
 * glow sprites (flames, the blast's flash and sparks; additive). The smoke sprites sit on exactly
 * the puffs the server uses for sight checks (effects.ts), dense enough that the sight lines the
 * server blocks look opaque here too; there is no quality setting that thins them.
 * Everything is created (and so compiled) up front; nothing new is compiled mid-round.
 */
const MAX_SOFT = 7000;
const MAX_GLOW = 2600;
const POOL = 4;

export type WorldGrenadeSound = {
  kind:
    | "bounce"
    | "bounce-can"
    | "spoon"
    | "he"
    | "smoke"
    | "smoke-hiss"
    | "fire"
    | "fire-crackle"
    | "fizzle";
  at: Vector;
};

export type GrenadeWorldView = ReturnType<typeof createGrenadeWorldView>;
export function createGrenadeWorldView(scene: THREE.Scene, map: GameMap) {
  const asset = retainAuthoredAsset(ARENA_MODELS.grenades);
  const root = new THREE.Group();
  root.name = "grenades-world";
  scene.add(root);
  const noise = makeNoiseTexture();
  const uniforms = {
    uTime: { value: 0 },
    uNoise: { value: noise },
    uCamera: { value: new THREE.Vector3() },
  };
  const soft = makeSprites(MAX_SOFT, softMaterial(uniforms));
  const glow = makeSprites(MAX_GLOW, glowMaterial(uniforms));
  soft.mesh.name = "grenade-soft-sprites";
  glow.mesh.name = "grenade-glow-sprites";
  root.add(soft.mesh, glow.mesh);
  // In-smoke veil: when the eye is inside a cloud, a grey screen-filling quad (drawn last).
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0xb4b8b6,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      fog: false,
    }),
  );
  veil.name = "grenade-smoke-veil";
  veil.renderOrder = 999;
  veil.frustumCulled = false;
  root.add(veil);

  type Pooled = { object: THREE.Object3D; type: GrenadeType; busy: boolean; lever: THREE.Object3D };
  const pools: Record<GrenadeType, Pooled[]> = { he: [], smoke: [], fire: [] };
  const spoons: { object: THREE.Object3D; busy: boolean }[] = [];
  let instance: ReturnType<typeof cloneAuthoredModel> | undefined;
  let loaded = false,
    stopped = false;
  const PARK = new THREE.Vector3(0, -500, 0);
  const ready = asset.ready
    .then((gltf) => {
      if (stopped) return;
      instance = cloneAuthoredModel(gltf.scene);
      for (const type of GRENADE_TYPES) {
        const model = instance.root.getObjectByName(`GR_${type}`)!;
        const pin = instance.root.getObjectByName(`GR_${type}_Pin`)!;
        const lever = instance.root.getObjectByName(`GR_${type}_Lever`)!;
        pin.visible = false; // pulled before the throw
        for (let i = 0; i < POOL; i++) {
          const object = i === 0 ? model : model.clone(true);
          object.removeFromParent();
          object.position.copy(PARK);
          object.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.castShadow = true;
              o.receiveShadow = false;
            }
          });
          root.add(object);
          pools[type].push({
            object,
            type,
            busy: false,
            lever: object.getObjectByName(`GR_${type}_Lever`) ?? lever,
          });
        }
        // Flying spoons: the lever alone.
        for (let i = 0; i < 2; i++) {
          const spoon = new THREE.Group();
          const copy = lever.clone(true);
          copy.position.set(0, 0, 0);
          spoon.add(copy);
          spoon.position.copy(PARK);
          root.add(spoon);
          spoons.push({ object: spoon, busy: false });
        }
      }
      loaded = true;
    })
    .catch((error) => console.warn("Grenade models unavailable.", error));

  type Flight = {
    p: Projectile;
    sim: NadeSim;
    pooled: Pooled | null;
    /** Visual offset (m) that decays to 0: a predicted flight handed over to the server's. */
    offset: THREE.Vector3;
    /** First frames blend from the hand (the viewmodel's release point). */
    from: THREE.Vector3 | null;
    spin: THREE.Vector3;
    impacts: number;
    seen: number;
    predicted: boolean;
  };
  const flights = new Map<number, Flight>();
  const predictedFlights: Flight[] = [];
  type Spoon = { sim: NadeSim; at: number; slot: (typeof spoons)[number]; spin: number };
  const flyingSpoons: Spoon[] = [];
  type Blast = { at: number; x: number; y: number; z: number; seed: number };
  const blasts: Blast[] = [];
  const spent = new Map<number, Pooled>(); // smoke cans lying where they popped
  const sounds: WorldGrenadeSound[] = [];
  let shake = 0;

  const take = (type: GrenadeType) => {
    const free = pools[type].find((p) => !p.busy);
    if (free) free.busy = true;
    return free ?? null;
  };
  const give = (pooled: Pooled | null) => {
    if (!pooled) return;
    pooled.busy = false;
    pooled.lever.visible = true;
    pooled.object.position.copy(PARK);
  };
  const flight = (p: Projectile, predicted: boolean): Flight => ({
    p,
    sim: simStart({ x: p.o[0], y: p.o[1], z: p.o[2] }, { x: p.v[0], y: p.v[1], z: p.v[2] }),
    pooled: null,
    offset: new THREE.Vector3(),
    from: null,
    spin: spinAxis(p),
    impacts: 0,
    seen: 0,
    predicted,
  });

  const q = new THREE.Quaternion(),
    v = new THREE.Vector3(),
    forward = new THREE.Vector3();

  function placeFlight(f: Flight, serverNow: number, dt: number) {
    const age = Math.max(0, (serverNow - f.p.at) / 1000);
    simTo(f.sim, map, age, (impact: Impact) => {
      f.impacts++;
      if (impact.speed > 1.2)
        sounds.push({
          kind: f.p.type === "he" ? "bounce" : "bounce-can",
          at: { x: impact.x, y: impact.y, z: impact.z },
        });
    });
    const s = f.sim;
    if (!f.pooled) {
      f.pooled = take(f.p.type);
      if (f.pooled) {
        f.pooled.lever.visible = false;
        launchSpoon(f, serverNow);
      }
    }
    const object = f.pooled?.object;
    if (!object) return;
    // Between fixed steps: carry on along the velocity (no collision inside one 8 ms step).
    const frac = s.rest ? 0 : age - s.n * GRENADES.physics.step;
    v.set(
      s.x + s.vx * frac,
      s.y + s.vy * frac - 0.5 * GRENADES.physics.gravity * frac * frac,
      s.z + s.vz * frac,
    );
    f.offset.multiplyScalar(Math.exp(-dt / 0.09));
    v.add(f.offset);
    if (f.from && age < 0.1) v.lerpVectors(f.from, v, age / 0.1);
    object.position.copy(v);
    // Tumble while flying; at rest, lying on its side.
    if (s.rest)
      object.quaternion
        .setFromAxisAngle(X_AXIS, Math.PI / 2)
        .premultiply(q.setFromAxisAngle(Y_AXIS, f.p.id * 1.7));
    else object.quaternion.setFromAxisAngle(f.spin, age * (8 + (f.p.id % 5)));
  }

  function launchSpoon(f: Flight, serverNow: number) {
    const slot = spoons.find((s) => !s.busy);
    if (!slot) return;
    slot.busy = true;
    const kick = 1.5 + (f.p.id % 3) * 0.4;
    flyingSpoons.push({
      slot,
      at: serverNow,
      spin: 20 + (f.p.id % 7),
      sim: simStart(
        { x: f.p.o[0], y: f.p.o[1] + 0.05, z: f.p.o[2] },
        {
          x: f.p.v[0] * 0.25 + kick * 0.6,
          y: f.p.v[1] * 0.25 + 2.2,
          z: f.p.v[2] * 0.25 - kick * 0.3,
        },
      ),
    });
    sounds.push({ kind: "spoon", at: { x: f.p.o[0], y: f.p.o[1], z: f.p.o[2] } });
  }

  return {
    root,
    ready,
    get loaded() {
      return loaded;
    },
    /** The local player's own throw, predicted until the server's arrives (`seat`'s next throw). */
    predict(p: Projectile, fromHand: THREE.Vector3 | null) {
      const f = flight(p, true);
      f.from = fromHand?.clone() ?? null;
      predictedFlights.push(f);
    },
    /** A throw from the server (event or state). Takes over a predicted flight of the owner's. */
    adopt(p: Projectile, own: boolean, serverNow: number) {
      if (flights.has(p.id)) return;
      const f = flight(p, false);
      if (own) {
        const i = predictedFlights.findIndex((x) => x.p.type === p.type);
        if (i >= 0) {
          const old = predictedFlights.splice(i, 1)[0]!;
          // Keep the predicted mesh where it is drawn and ease onto the server's path.
          simTo(f.sim, map, Math.max(0, (serverNow - p.at) / 1000));
          f.pooled = old.pooled;
          if (old.pooled) {
            f.offset
              .copy(old.pooled.object.position)
              .sub(new THREE.Vector3(f.sim.x, f.sim.y, f.sim.z));
            if (f.offset.lengthSq() > 4) f.offset.set(0, 0, 0);
          }
          f.from = old.from;
        }
      }
      flights.set(p.id, f);
    },
    /** A detonation from the server: the blast, the pop, the burst. */
    detonate(d: Detonation, serverNow: number, listener: Vector | null) {
      const f = flights.get(d.id);
      if (f) {
        if (d.type === "smoke" && f.pooled) {
          // The spent can stays where it popped while the cloud lasts.
          spent.set(d.id, f.pooled);
          f.pooled.object.position.set(d.x, d.y, d.z);
          f.pooled = null;
        }
        give(f.pooled);
        flights.delete(d.id);
      }
      const at = { x: d.x, y: d.y, z: d.z };
      if (d.type === "he") {
        blasts.push({ at: d.at, x: d.x, y: d.y, z: d.z, seed: d.id });
        sounds.push({ kind: "he", at });
        if (listener) {
          const dist = Math.hypot(listener.x - d.x, listener.y - d.y, listener.z - d.z);
          shake = Math.max(shake, Math.max(0, 1 - dist / 14));
        }
      } else if (d.type === "smoke") sounds.push({ kind: "smoke", at });
      else sounds.push({ kind: d.dud ? "fizzle" : "fire", at });
      void serverNow;
    },
    /** Sounds since the last call (bounces, spoons, blasts…), with world positions. */
    drainSounds() {
      return sounds.splice(0);
    },
    /** Camera shake amplitude (0–1) from nearby blasts, decaying. */
    get shake() {
      return shake;
    },
    /**
     * Draw everything at `serverNow` (server ms). `world` is the snapshot's public grenade world;
     * flights not yet known from events are adopted from it (late join, missed events).
     */
    update(
      serverNow: number,
      world: PublicGrenadeWorld | undefined,
      camera: THREE.Camera,
      dt: number,
    ) {
      if (!loaded) return;
      uniforms.uTime.value = (serverNow % 600000) / 1000;
      camera.getWorldPosition(uniforms.uCamera.value);
      shake *= Math.exp(-dt / 0.18);
      // ------------------------------------------------ flights
      const live = new Set<number>();
      for (const p of world?.flying ?? []) {
        live.add(p.id);
        if (!flights.has(p.id)) this.adopt(p, false, serverNow);
      }
      for (const [id, f] of flights) {
        f.seen++;
        // Gone from the world without a detonation we saw (missed event, round reset).
        if (!live.has(id) && world && f.seen > 3 && serverNow - f.p.at > 300) {
          give(f.pooled);
          flights.delete(id);
          continue;
        }
        placeFlight(f, serverNow, dt);
      }
      for (let i = predictedFlights.length - 1; i >= 0; i--) {
        const f = predictedFlights[i]!;
        // A prediction the server never confirmed (refused, or the event was lost) fades out.
        if (serverNow - f.p.at > 1200) {
          give(f.pooled);
          predictedFlights.splice(i, 1);
          continue;
        }
        placeFlight(f, serverNow, dt);
      }
      for (let i = flyingSpoons.length - 1; i >= 0; i--) {
        const s = flyingSpoons[i]!;
        const age = (serverNow - s.at) / 1000;
        if (age > 1.5) {
          s.slot.busy = false;
          s.slot.object.position.copy(PARK);
          flyingSpoons.splice(i, 1);
          continue;
        }
        simTo(s.sim, map, age);
        s.slot.object.position.set(s.sim.x, s.sim.y, s.sim.z);
        if (!s.sim.rest)
          s.slot.object.quaternion
            .setFromAxisAngle(Y_AXIS, age * s.spin)
            .multiply(q.setFromAxisAngle(X_AXIS, age * s.spin * 0.7));
      }
      // Spent smoke cans: until their cloud is gone.
      const clouds = new Set((world?.smokes ?? []).map((s) => s.id));
      for (const [id, pooled] of spent)
        if (!clouds.has(id)) {
          give(pooled);
          spent.delete(id);
        }

      // ------------------------------------------------ sprites
      soft.begin();
      glow.begin();
      const eye = uniforms.uCamera.value;
      let veilAlpha = 0;
      for (const smoke of world?.smokes ?? []) {
        const phase = smokePhase(smoke, serverNow);
        if (phase.age < 0 || phase.over) continue;
        const puffs = smoke.puffs;
        const ground = puffs[1]! - GRENADES.smoke.spacing * 0.55;
        for (let i = 0; i < phase.count; i++) {
          const r = puffRadius(i, phase.total, phase.age, phase.fade);
          if (r <= 0.02) continue;
          const x = puffs[i * 3]!,
            y = puffs[i * 3 + 1]!,
            z = puffs[i * 3 + 2]!;
          const edge = 1 - (i / phase.total) * 0.2;
          const alpha = phase.density * edge;
          const shade =
            0.66 + 0.26 * Math.min(1, Math.max(0, (y - ground) / GRENADES.smoke.height));
          const seed = (smoke.id * 31 + i * 7.13) % 97;
          // Two sprites per puff, jittered, slightly larger than the puff (soft edges).
          for (let k = 0; k < 2; k++) {
            const jx = (hash(seed + k * 3.1) - 0.5) * 0.35,
              jy = (hash(seed + k * 5.7) - 0.5) * 0.25,
              jz = (hash(seed + k * 9.3) - 0.5) * 0.35;
            soft.push(
              x + jx,
              y + jy,
              z + jz,
              // A little larger than the puff: the cloud never looks smaller than what the
              // server's sight test blocks.
              r * 2.9,
              alpha * 0.72,
              seed + k,
              0,
              shade,
              shade,
              shade * 1.02,
            );
          }
          const dx = eye.x - x,
            dy = eye.y - y,
            dz = eye.z - z;
          if (dx * dx + dy * dy + dz * dz < r * r) veilAlpha += 0.5 * phase.density;
        }
        // The canister still pouring at the base.
        if (phase.fade < 0.5)
          soft.push(puffs[0]!, ground + 0.15, puffs[2]!, 0.6, 0.5, smoke.id, 0, 0.86, 0.86, 0.88);
      }
      for (const fire of world?.fires ?? []) {
        const age = serverNow - fire.at;
        const n = fire.cells.length / 4;
        const end = 1 - Math.max(0, Math.min(1, (age - (GRENADES.fire.durationMs - 900)) / 900));
        for (let i = 0; i < n; i++) {
          if (!cellBurning(fire, i, serverNow)) continue;
          const x = fire.cells[i * 4]!,
            y = fire.cells[i * 4 + 1]!,
            z = fire.cells[i * 4 + 2]!;
          const caught = Math.min(1, (age - fire.cells[i * 4 + 3]!) / 250);
          const seed = (fire.id * 13 + i * 3.7) % 89;
          const k = caught * end;
          // Flames (upright, flickering), a ground glow, and thin dark smoke above.
          glow.push(x, y, z, 0.75 * k, 0.9 * k, seed, 1, 1, 0.55, 0.18);
          glow.push(
            x + (hash(seed) - 0.5) * 0.3,
            y,
            z + (hash(seed + 1) - 0.5) * 0.3,
            0.5 * k,
            0.8 * k,
            seed + 5,
            1,
            1,
            0.7,
            0.25,
          );
          glow.push(x, y + 0.02, z, 0.9 * k, 0.35 * k, seed, 2, 1, 0.45, 0.12);
          if (i % 3 === 0)
            soft.push(
              x,
              y + 1.0 + hash(seed + uniforms.uTime.value * 0.1) * 0.4,
              z,
              0.9,
              0.12 * k,
              seed,
              0,
              0.18,
              0.17,
              0.16,
            );
        }
      }
      for (let i = blasts.length - 1; i >= 0; i--) {
        const b = blasts[i]!;
        const age = (serverNow - b.at) / 1000;
        if (age > 2.5) {
          blasts.splice(i, 1);
          continue;
        }
        if (age < 0) continue;
        // Flash (very short), fireball, sparks, then an expanding dust and smoke burst.
        if (age < 0.14)
          glow.push(
            b.x,
            b.y + 0.4,
            b.z,
            3.2 * (0.6 + age * 3),
            1.4 * (1 - age / 0.14),
            b.seed,
            0,
            1,
            0.9,
            0.7,
          );
        if (age < 0.45) {
          const k = 1 - age / 0.45;
          for (let j = 0; j < 6; j++) {
            const a = j * 1.047 + b.seed;
            glow.push(
              b.x + Math.cos(a) * age * 2.2,
              b.y + 0.3 + age * 1.6,
              b.z + Math.sin(a) * age * 2.2,
              1.4 + age * 3,
              0.8 * k,
              b.seed + j,
              0,
              1,
              0.5,
              0.15,
            );
          }
        }
        if (age < 0.7)
          for (let j = 0; j < 22; j++) {
            const a = hash(b.seed + j) * Math.PI * 2,
              up = 2 + hash(b.seed + j * 2.3) * 7,
              out = 3 + hash(b.seed + j * 4.1) * 8;
            const y = b.y + 0.1 + up * age - 4.9 * age * age;
            if (y < b.y - 0.05) continue;
            glow.push(
              b.x + Math.cos(a) * out * age,
              y,
              b.z + Math.sin(a) * out * age,
              0.08,
              1 - age / 0.7,
              j,
              0,
              1,
              0.75,
              0.35,
            );
          }
        const k = Math.max(0, 1 - age / 2.5);
        for (let j = 0; j < 14; j++) {
          const a = hash(b.seed * 3 + j) * Math.PI * 2,
            reach = (1.2 + hash(b.seed + j * 1.3) * 1.8) * (1 - Math.exp(-age * 3));
          soft.push(
            b.x + Math.cos(a) * reach,
            b.y + 0.4 + age * 0.5 + hash(b.seed + j) * 0.8,
            b.z + Math.sin(a) * reach,
            1.2 + age * 1.4,
            0.55 * k * Math.min(1, age / 0.08),
            b.seed + j,
            0,
            j % 3 === 0 ? 0.42 : 0.3,
            j % 3 === 0 ? 0.38 : 0.28,
            j % 3 === 0 ? 0.33 : 0.25,
          );
        }
      }
      soft.end();
      glow.end();
      // Inside a cloud: everything beyond arm's length is grey.
      const veilMaterial = veil.material as THREE.MeshBasicMaterial;
      veilMaterial.opacity = Math.min(0.96, veilAlpha);
      veil.visible = veilMaterial.opacity > 0.01;
      if (veil.visible) {
        camera.getWorldDirection(forward);
        veil.position.copy(eye).addScaledVector(forward, 0.2);
        camera.getWorldQuaternion(veil.quaternion);
        veil.scale.setScalar(2);
        veil.updateMatrix();
      }
      root.updateMatrixWorld(true);
    },
    /** Forget everything (round reset; the snapshot carries the new world). */
    reset() {
      for (const f of flights.values()) give(f.pooled);
      for (const f of predictedFlights) give(f.pooled);
      for (const p of spent.values()) give(p);
      flights.clear();
      predictedFlights.length = 0;
      spent.clear();
      blasts.length = 0;
      for (const s of flyingSpoons) {
        s.slot.busy = false;
        s.slot.object.position.copy(PARK);
      }
      flyingSpoons.length = 0;
      shake = 0;
    },
    dispose() {
      stopped = true;
      instance?.dispose();
      soft.dispose();
      glow.dispose();
      veil.geometry.dispose();
      (veil.material as THREE.Material).dispose();
      noise.dispose();
      asset.release();
      root.removeFromParent();
    },
  };
}

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const hash = (x: number) => {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function spinAxis(p: Projectile) {
  // Tumble about an axis across the flight (a thrown grenade rotates end over end).
  const v = new THREE.Vector3(p.v[0], 0, p.v[2]);
  if (v.lengthSq() < 1e-6) v.set(1, 0, 0);
  return new THREE.Vector3(-v.z, 0, v.x).normalize();
}

/** A soft, cloudy blob (fractal value noise in a radial falloff), shared by every sprite. */
function makeNoiseTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const lattice = (x: number, y: number, s: number) =>
    hash((((x % s) + s) % s) * 57.3 + (((y % s) + s) % s) * 113.1 + s);
  const smooth = (x: number, y: number, s: number) => {
    const x0 = Math.floor(x),
      y0 = Math.floor(y),
      fx = x - x0,
      fy = y - y0;
    const u = fx * fx * (3 - 2 * fx),
      w = fy * fy * (3 - 2 * fy);
    const a = lattice(x0, y0, s),
      b = lattice(x0 + 1, y0, s),
      c = lattice(x0, y0 + 1, s),
      d = lattice(x0 + 1, y0 + 1, s);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let n = 0,
        amp = 0.5;
      for (let o = 0, s = 4; o < 4; o++, s *= 2, amp *= 0.5)
        n += amp * smooth((x / size) * s, (y / size) * s, s);
      const dx = x / size - 0.5,
        dy = y / size - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const fall = Math.max(0, 1 - r);
      const i = (y * size + x) * 4;
      data[i] = Math.round(n * 255);
      data[i + 1] = Math.round(smoothstep(0.15, 0.85, n) * 255);
      data[i + 2] = Math.round(fall * 255);
      data[i + 3] = Math.round(Math.min(1, smoothstep(0, 0.55, fall) * (0.45 + n)) * 255);
    }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Instanced camera-facing sprites: per instance position, size, alpha, seed, mode, colour. */
function makeSprites(capacity: number, material: THREE.ShaderMaterial) {
  const geometry = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geometry.index = quad.index;
  geometry.setAttribute("position", quad.getAttribute("position"));
  geometry.setAttribute("uv", quad.getAttribute("uv"));
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  const data = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
  const color = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  for (const a of [pos, data, color]) a.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("iPos", pos);
  geometry.setAttribute("iData", data);
  geometry.setAttribute("iColor", color);
  // One invisible instance so the program compiles with the scene at load.
  geometry.instanceCount = 1;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  let n = 0;
  return {
    mesh,
    begin() {
      n = 0;
    },
    push(
      x: number,
      y: number,
      z: number,
      size: number,
      alpha: number,
      seed: number,
      mode: number,
      r: number,
      g: number,
      b: number,
    ) {
      if (n >= capacity || alpha <= 0.002 || size <= 0) return;
      pos.array[n * 3] = x;
      pos.array[n * 3 + 1] = y;
      pos.array[n * 3 + 2] = z;
      data.array[n * 4] = size;
      data.array[n * 4 + 1] = alpha;
      data.array[n * 4 + 2] = seed;
      data.array[n * 4 + 3] = mode;
      color.array[n * 3] = r;
      color.array[n * 3 + 1] = g;
      color.array[n * 3 + 2] = b;
      n++;
    },
    end() {
      geometry.instanceCount = n;
      mesh.visible = n > 0;
      if (!n) return;
      for (const a of [pos, data, color]) {
        a.clearUpdateRanges();
        a.addUpdateRange(0, n * a.itemSize);
        a.needsUpdate = true;
      }
    },
    dispose() {
      geometry.dispose();
      quad.dispose();
      material.dispose();
    },
  };
}

const SPRITE_VERTEX = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iData;
attribute vec3 iColor;
uniform float uTime;
uniform vec3 uCamera;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
varying float vSeed;
varying float vMode;
#include <fog_pars_vertex>
void main() {
  float size = iData.x;
  float mode = iData.w;
  vUv = uv;
  vAlpha = iData.y;
  vColor = iColor;
  vSeed = iData.z;
  vMode = mode;
  vec3 world;
  if (mode < 0.5) {
    // Facing the camera, turned by the seed (and slowly with time) so repeats never align.
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float a = iData.z * 2.4 + uTime * (0.05 + fract(iData.z * 0.37) * 0.08);
    vec2 p = vec2(cos(a) * position.x - sin(a) * position.y, sin(a) * position.x + cos(a) * position.y);
    world = iPos + (right * p.x + up * p.y) * size;
  } else if (mode < 1.5) {
    // Upright flame: turns about the vertical toward the camera, base on the point.
    vec3 toCam = uCamera - iPos;
    vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + vec3(1e-4, 0.0, 0.0));
    world = iPos + right * position.x * size * 0.7 + vec3(0.0, (position.y + 0.5) * size * 1.25, 0.0);
  } else {
    // Flat on the ground (a glow).
    world = iPos + vec3(position.x * size, 0.03, -position.y * size);
  }
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

function softMaterial(uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    name: "grenade-soft-sprite",
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    vertexShader: SPRITE_VERTEX,
    fragmentShader: /* glsl */ `
uniform sampler2D uNoise;
uniform float uTime;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
varying float vSeed;
#include <fog_pars_fragment>
void main() {
  // Churning inside: the noise drifts against the sprite's own falloff.
  vec2 drift = vec2(uTime * 0.03 + vSeed * 0.13, -uTime * 0.05 + vSeed * 0.29);
  vec4 shape = texture2D(uNoise, vUv);
  float churn = texture2D(uNoise, vUv * 0.7 + drift).r;
  float a = shape.a * (0.7 + 0.6 * churn) * vAlpha;
  if (a < 0.01) discard;
  vec3 color = vColor * (0.88 + 0.2 * churn);
  gl_FragColor = vec4(color, min(1.0, a));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  });
}

function glowMaterial(uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    name: "grenade-glow-sprite",
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...uniforms },
    vertexShader: SPRITE_VERTEX,
    fragmentShader: /* glsl */ `
uniform sampler2D uNoise;
uniform float uTime;
varying vec2 vUv;
varying float vAlpha;
varying vec3 vColor;
varying float vSeed;
varying float vMode;
#include <fog_pars_fragment>
void main() {
  float a;
  vec3 color = vColor;
  if (vMode > 0.5 && vMode < 1.5) {
    // A flame: turbulent tongues rising through a tapering column, yellow at the base turning
    // orange and red as they thin out. (smoothstep needs edge0 < edge1 everywhere: inverted.)
    float n = texture2D(uNoise, vec2(vUv.x * 0.7 + vSeed * 0.31, vUv.y * 0.6 - uTime * 1.9)).r;
    float m = texture2D(uNoise, vec2(vUv.x * 1.6 - vSeed * 0.17, vUv.y * 1.3 - uTime * 2.6)).g;
    float sway = (n - 0.5) * 0.35 * vUv.y;
    float width = 0.42 - 0.3 * vUv.y;
    float column = 1.0 - smoothstep(width * 0.35, width, abs(vUv.x - 0.5 + sway));
    float height = 1.0 - smoothstep(0.1, 0.9, vUv.y + (m - 0.5) * 0.55 + n * 0.25);
    a = column * height * smoothstep(0.0, 0.08, vUv.y) * vAlpha * (0.65 + 0.5 * m);
    color = mix(vec3(1.0, 0.62, 0.2), vColor, smoothstep(0.05, 0.75, vUv.y + n * 0.2)) * 0.62;
    if (a < 0.004) discard;
    gl_FragColor = vec4(color, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
    return;
  } else {
    vec4 shape = texture2D(uNoise, vUv);
    float n = texture2D(uNoise, vUv * 0.8 + vec2(vSeed * 0.21, uTime * 0.2)).r;
    a = shape.b * shape.b * (0.6 + 0.6 * n) * vAlpha;
    color *= 1.5;
  }
  if (a < 0.004) discard;
  gl_FragColor = vec4(color * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
}
