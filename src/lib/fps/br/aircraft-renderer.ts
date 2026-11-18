import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { AIRCRAFT, DAMAGE_STAGES, type Aircraft } from "./aircraft";
import type { SeatedPose } from "./vehicle-renderer";

/**
 * The aircraft on screen: the Cessna 172SP (plane-c172.lod0–2.glb, NLM, CC BY 4.0,
 * art/blender/br/build_plane.mjs), placed from the aircraft as shown (the pilot's prediction,
 * everyone else's interpolation). Presentation only:
 *
 * - LODs by distance: the full model with its moving parts near, the body and propeller far.
 *   Loaded lazily: the far model at once (small, seen across the island), the near ones when
 *   the camera first comes within reach of the airfield.
 * - The moving parts on their real hinges (art/br/plane-c172.json): ailerons, elevator, rudder
 *   and flaps follow the simulation's deflections, the propeller turns with the RPM (a disc at
 *   speed), the wheels roll with the ground speed and the nose wheel steers with the rudder.
 * - Damage: smoke from the cowling once damaged, thicker and with flames once critical; a wreck
 *   sits dark and burns for a while.
 */
const MODEL = "fps/br/models/plane-c172";
/** Hinges and axles in the model's frame (art/br/plane-c172.json "parts"). */
const PIVOTS = {
  prop: [0, 0.129, -2.259],
  aileronLeft: [-3.929, 0.904, 0.61],
  aileronRight: [3.929, 0.904, 0.61],
  flaps: [0, 0.778, 0.892],
  elevator: [0, 0.196, 4.809],
  rudder: [0, 0.731, 4.723],
  wheels: [0, -0.909, 0.3],
  noseWheel: [0, -0.915, -1.437],
} as const;
type Part = keyof typeof PIVOTS;
/** Deflections at full control (rad): C172 elevator ±25°, ailerons ±18°, rudder ±22°. */
const THROW = { elevator: 0.42, aileron: 0.32, rudder: 0.39, flaps: 0.52, noseSteer: 0.45 };
/** LOD distances (m): full model, the simplified one, the far one. */
const LOD_AT = [180, 650] as const;
const WHEEL_R = 0.18;

/**
 * Where the pilot (0) and passenger (1) sit (model frame): the hips on the seat cushion, the
 * feet on the rudder pedals, the hands on the control yoke (the passenger's resting on it).
 */
const RIDE = [
  { hip: [-0.3, 0.05, 0.28], foot: [0.02, -0.47, -0.95], yoke: [-0.3, 0.24, -0.55] },
  { hip: [0.3, 0.05, 0.28], foot: [-0.02, -0.47, -0.95], yoke: [0.3, 0.24, -0.55] },
] as const;
/** Sat back in the seat (a negative lean reclines, vehicle-renderer.ts). */
const LEAN = -0.15;
const STAND_HIP = 0.95;
const DROP = 0.5;

type Rig = {
  object: THREE.Object3D;
  parts: Partial<Record<Part, THREE.Object3D>>;
  materials: THREE.MeshStandardMaterial[];
};

function softPuff() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createAircraftRenderer(scene: THREE.Scene, loader: GLTFLoader, base = "/") {
  const root = new THREE.Group();
  root.name = "aircraft";
  root.visible = false;
  scene.add(root);
  const rigs: Array<Rig | null> = [null, null, null];
  const loading: Array<Promise<void> | null> = [null, null, null];
  const load = (lod: number) =>
    (loading[lod] ??= loader
      .loadAsync(new URL(`${MODEL}.lod${lod}.glb`, base).href)
      .then((g) => {
        const object = g.scene;
        const parts: Rig["parts"] = {};
        const materials: THREE.MeshStandardMaterial[] = [];
        object.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = lod === 0;
            const m = o.material as THREE.MeshStandardMaterial;
            if (m && !materials.includes(m)) materials.push(m);
          }
        });
        for (const name of Object.keys(PIVOTS) as Part[]) {
          const node = object.getObjectByName(name);
          if (!node || !node.parent) continue;
          const p = PIVOTS[name];
          const hinge = new THREE.Group();
          hinge.name = `${name}-hinge`;
          hinge.position.set(p[0], p[1], p[2]);
          node.parent.add(hinge);
          node.position.sub(hinge.position);
          hinge.add(node);
          parts[name] = hinge;
        }
        object.visible = false;
        root.add(object);
        rigs[lod] = { object, parts, materials };
      })
      .catch(() => {
        loading[lod] = null; // try again on a later frame
      }));
  // The far model at once (71 kB): the aircraft is seen from anywhere on the island.
  const ready = load(2);

  // The propeller's disc at speed (the blades blur into it).
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 40),
    new THREE.MeshBasicMaterial({
      color: 0x2a2a2a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  disc.position.set(PIVOTS.prop[0], PIVOTS.prop[1], PIVOTS.prop[2] - 0.12);
  disc.renderOrder = 2;
  root.add(disc);

  // Smoke and flames from the cowling: a small pool of soft sprites.
  const puffTex = typeof document !== "undefined" ? softPuff() : null;
  const puffs: Array<{ s: THREE.Sprite; life: number; age: number; vy: number; fire: boolean }> =
    [];
  const fx = new THREE.Group();
  scene.add(fx);
  for (let i = 0; i < 48; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: puffTex,
        color: 0x555555,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    s.visible = false;
    fx.add(s);
    puffs.push({ s, life: 1, age: 1, vy: 0, fire: false });
  }
  let nextPuff = 0,
    emitAcc = 0;
  const emit = (at: THREE.Vector3, fire: boolean, vx: number, vz: number) => {
    const p = puffs[nextPuff]!;
    nextPuff = (nextPuff + 1) % puffs.length;
    p.s.position.set(at.x + (Math.random() - 0.5) * 0.4, at.y, at.z + (Math.random() - 0.5) * 0.4);
    p.life = fire ? 0.5 + Math.random() * 0.3 : 2.2 + Math.random() * 1.5;
    p.age = 0;
    p.vy = fire ? 1.5 : 1.1 + Math.random() * 0.6;
    p.fire = fire;
    p.s.userData["v"] = [vx * 0.15, vz * 0.15];
    const m = p.s.material as THREE.SpriteMaterial;
    m.color.setHex(fire ? 0xff8a2a : 0x4a4a4a);
    m.blending = fire ? THREE.AdditiveBlending : THREE.NormalBlending;
    p.s.visible = true;
  };

  let propAngle = 0,
    wheelAngle = 0,
    lod = -1,
    wrecked = false,
    wreckAt = 0;
  const v = new THREE.Vector3(),
    q = new THREE.Quaternion();
  const smokeAt = new THREE.Vector3();
  return {
    ready,
    root,
    /**
     * Each frame: the aircraft as shown (null: none), the frame's ms, and the camera's place (for
     * the LOD and the lazy loads).
     */
    update(a: Aircraft | null, dtMs: number, camera: THREE.Vector3, now = performance.now()) {
      const dt = Math.min(0.1, dtMs / 1000);
      if (!a) {
        root.visible = false;
        return;
      }
      root.position.set(a.x, a.y, a.z);
      root.quaternion.set(a.qx, a.qy, a.qz, a.qw);
      const d = camera.distanceTo(root.position);
      // Lazy loads: the near models once the camera comes within reach of them.
      if (d < LOD_AT[1] + 400) load(1);
      if (d < LOD_AT[0] + 300) load(0);
      const want = d < LOD_AT[0] ? 0 : d < LOD_AT[1] ? 1 : 2;
      // The nearest loaded at or below the wanted detail (else the nearest loaded at all).
      let pick = -1;
      for (let i = want; i <= 2 && pick < 0; i++) if (rigs[i]) pick = i;
      for (let i = want - 1; i >= 0 && pick < 0; i--) if (rigs[i]) pick = i;
      if (pick !== lod) {
        for (let i = 0; i < 3; i++) if (rigs[i]) rigs[i]!.object.visible = i === pick;
        lod = pick;
      }
      root.visible = pick >= 0;
      const rig = pick >= 0 ? rigs[pick]! : null;
      // The propeller: its angle with the RPM (2,700 at full, shown slower than real so it
      // never strobes), the disc as it blurs.
      const rpm = a.rpm;
      propAngle = (propAngle + Math.min(rpm * 70, 32) * dt) % (Math.PI * 2);
      (disc.material as THREE.MeshBasicMaterial).opacity =
        0.32 * Math.max(0, Math.min(1, (rpm - 0.3) / 0.4));
      if (rig) {
        const P = rig.parts;
        if (P.prop) P.prop.rotation.z = propAngle;
        if (P.elevator) P.elevator.rotation.x = -a.elev * THROW.elevator;
        if (P.aileronRight) P.aileronRight.rotation.x = -a.ail * THROW.aileron;
        if (P.aileronLeft) P.aileronLeft.rotation.x = a.ail * THROW.aileron;
        if (P.rudder) P.rudder.rotation.y = a.rud * THROW.rudder;
        if (P.flaps) P.flaps.rotation.x = (a.flap / 2) * THROW.flaps;
        // The wheels roll with the ground speed along the body (forward is −z).
        const fwd = -(
          a.vx * (2 * (a.qx * a.qz + a.qw * a.qy)) +
          a.vy * (2 * (a.qy * a.qz - a.qw * a.qx)) +
          a.vz * (1 - 2 * (a.qx * a.qx + a.qy * a.qy))
        );
        if (a.grounded) wheelAngle -= (fwd * dt) / WHEEL_R;
        if (P.wheels) P.wheels.rotation.x = wheelAngle;
        if (P.noseWheel) {
          const lock = 1 - 0.8 * Math.max(0, Math.min(1, (Math.abs(fwd) - 5) / 25));
          P.noseWheel.rotation.set(wheelAngle, -a.rud * THROW.noseSteer * lock, 0, "YXZ");
        }
        // A wreck: the paint burnt dark.
        if (a.destroyed !== wrecked) {
          wrecked = a.destroyed;
          wreckAt = now;
          for (const r of rigs)
            for (const m of r?.materials ?? []) {
              m.userData["color"] ??= m.color.getHex();
              m.color.setHex(wrecked ? 0x1c1a18 : (m.userData["color"] as number));
            }
        }
      }
      // Smoke (damaged), heavier with flames (critical), the wreck burning for 40 s.
      const share = a.health / a.maxHealth;
      const burning = a.destroyed ? now - wreckAt < 40_000 : share < DAMAGE_STAGES.critical;
      const smoking = burning || share < DAMAGE_STAGES.damaged;
      if (smoking && d < 2500) {
        v.set(0, 0.35, -1.7).applyQuaternion(q.set(a.qx, a.qy, a.qz, a.qw));
        smokeAt.set(a.x + v.x, a.y + v.y, a.z + v.z);
        emitAcc += dt * (burning ? 28 : 9);
        while (emitAcc >= 1) {
          emitAcc -= 1;
          emit(smokeAt, burning && Math.random() < 0.45, a.vx, a.vz);
        }
      }
      for (const p of puffs) {
        if (!p.s.visible) continue;
        p.age += dt;
        if (p.age >= p.life) {
          p.s.visible = false;
          continue;
        }
        const k = p.age / p.life;
        const [vx, vz] = (p.s.userData["v"] as [number, number]) ?? [0, 0];
        p.s.position.x += vx * dt;
        p.s.position.z += vz * dt;
        p.s.position.y += p.vy * dt;
        const size = p.fire ? 0.6 + k * 0.5 : 0.8 + k * 3.2;
        p.s.scale.set(size, size, size);
        (p.s.material as THREE.SpriteMaterial).opacity = (p.fire ? 0.8 : 0.5) * (1 - k);
      }
    },
    /**
     * Sit a character in a seat: its root placed (in the world) so the hips are on the seat
     * cushion, and its feet and hands in its own frame (vehicle-renderer.ts SeatedPose).
     */
    seatRider(seat: 0 | 1, rider: THREE.Object3D): SeatedPose | null {
      if (!root.visible || wrecked) return null;
      const R = RIDE[seat];
      root.updateWorldMatrix(true, false);
      const rx = R.hip[0],
        ry = R.hip[1] - (STAND_HIP - DROP),
        rz = R.hip[2];
      rider.position.set(rx, ry, rz).applyMatrix4(root.matrixWorld);
      root.getWorldQuaternion(rider.quaternion);
      const hand = (side: number): [number, number, number] => [
        R.yoke[0] + side * 0.12 - rx,
        R.yoke[1] - ry,
        R.yoke[2] - rz,
      ];
      return {
        drop: DROP,
        lean: LEAN,
        foot: [R.foot[0], R.hip[1] + R.foot[1] - ry, R.foot[2]],
        handL: hand(-1),
        handR: hand(1),
      };
    },
    /** Hide the aircraft from the cockpit view (the passenger looking out is fine). */
    dispose() {
      scene.remove(root);
      scene.remove(fx);
    },
  };
}

/** How far the wing's tips are from the CG (m): the chase camera's minimum distance. */
export const AIRCRAFT_SPAN = AIRCRAFT.span;
