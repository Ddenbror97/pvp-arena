import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { ModelManifest } from "./props-renderer";
import { spec, type Vehicle, type VehicleKind } from "./vehicles";

/**
 * Vehicles on screen: the drivable models (public/fps/br/models/vehicles.glb: a sedan, a 4x4,
 * a lifted pickup and a dirt bike, CC BY), placed from the server's rows (interpolated) or, for
 * the one you drive, from your own prediction. Presentation only (owner, 2026-11-08: "some
 * feeling"): the wheels roll with the speed and the front ones steer, and the body sits on soft
 * springs — it squats as it pulls away, dives under braking and leans out of a turn or a slide
 * — while the simulation's box stays where it is. Wrecks sit dark and still. Until the file
 * loads (or if it fails) the island's own car models and a motorbike built in code stand in.
 */
const KINDS: readonly VehicleKind[] = ["sedan", "suv", "pickup", "bike"];
const CONDITIONS = ["good", "used", "damaged"] as const;

function buildBike() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.6, metalness: 0.4 });
  const paint = new THREE.MeshStandardMaterial({
    color: 0x7a2b22,
    roughness: 0.45,
    metalness: 0.3,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xb8bcc2,
    roughness: 0.25,
    metalness: 0.9,
  });
  const tyre = new THREE.TorusGeometry(0.31, 0.085, 8, 18).rotateY(Math.PI / 2);
  for (const z of [-0.72, 0.72]) {
    const w = new THREE.Mesh(tyre, dark);
    w.position.set(0, 0.39, z);
    w.name = z < 0 ? "wheel-front" : "wheel-rear";
    g.add(w);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10).rotateZ(Math.PI / 2),
      chrome,
    );
    hub.position.copy(w.position);
    g.add(hub);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 1.1), dark);
  frame.position.set(0, 0.62, 0.02);
  frame.rotation.x = 0.12;
  g.add(frame);
  const tank = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.16, 0.34, 4, 10).rotateX(Math.PI / 2),
    paint,
  );
  tank.position.set(0, 0.86, -0.2);
  g.add(tank);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.55), dark);
  seat.position.set(0, 0.86, 0.32);
  g.add(seat);
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.36), chrome);
  engine.position.set(0, 0.52, 0.02);
  g.add(engine);
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), chrome);
  fork.position.set(0, 0.72, -0.62);
  fork.rotation.x = -0.35;
  g.add(fork);
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.68, 6).rotateZ(Math.PI / 2),
    dark,
  );
  bar.position.set(0, 1.07, -0.5);
  g.add(bar);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.08, 12).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xfff3c8, emissive: 0x665f40, roughness: 0.2 }),
  );
  lamp.position.set(0, 0.98, -0.66);
  g.add(lamp);
  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.7, 8).rotateX(Math.PI / 2),
    chrome,
  );
  exhaust.position.set(0.17, 0.44, 0.42);
  g.add(exhaust);
  const fender = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.5), paint);
  fender.position.set(0, 0.76, 0.75);
  g.add(fender);
  return g;
}

/**
 * Where the driver sits in each model (vehicle frame: nose −z, +x right, tyres at y 0), measured
 * from vehicles.glb: the hips on the seat, the feet on the pedals or pegs, the hands at nine and
 * three on the steering wheel (its centre, radius and the column's tilt back from upright) or on
 * the handlebar grips. `drop` lowers the character's hips to sitting; `lean` tips the upper body
 * forward (the bike's rider over the bars) or back (a negative lean: reclined in a low sedan).
 */
type Rider = {
  hip: [number, number, number];
  drop: number;
  lean: number;
  foot: [number, number, number];
} & (
  | { wheel: { at: [number, number, number]; r: number; tilt: number } }
  | { grips: { at: [number, number, number]; half: number } }
);
export const RIDERS: Record<VehicleKind, Rider> = {
  sedan: {
    hip: [-0.38, 0.47, 0.16],
    drop: 0.5,
    lean: -0.12,
    foot: [0.16, -0.12, -0.74],
    wheel: { at: [-0.38, 0.79, -0.32], r: 0.15, tilt: 0.5 },
  },
  suv: {
    hip: [-0.4, 0.9, 0.34],
    drop: 0.5,
    lean: 0,
    foot: [0.16, -0.28, -0.66],
    wheel: { at: [-0.4, 1.21, -0.13], r: 0.16, tilt: 0.45 },
  },
  pickup: {
    hip: [-0.32, 1.07, 0.04],
    drop: 0.5,
    lean: 0,
    foot: [0.16, -0.26, -0.68],
    wheel: { at: [-0.31, 1.36, -0.4], r: 0.16, tilt: 0.45 },
  },
  bike: {
    hip: [0, 0.98, 0.25],
    drop: 0.14,
    lean: 0.32,
    foot: [0.2, -0.56, -0.12],
    grips: { at: [0, 1.18, -0.3], half: 0.36 },
  },
};
/** The character's hip height standing (character space); seated it is this less `drop`. */
const STAND_HIP = 0.95;
export type SeatedPose = {
  drop: number;
  lean: number;
  foot: [number, number, number];
  handL: [number, number, number];
  handR: [number, number, number];
};

export function createVehicleRenderer(
  scene: THREE.Scene,
  loader: GLTFLoader,
  manifest: ModelManifest,
  base = "/",
) {
  const root = new THREE.Group();
  scene.add(root);
  const templates = new Map<VehicleKind, THREE.Object3D>();
  /** Wheel radius per kind (m), from the model's fit data, for the rolling. */
  const radii = new Map<VehicleKind, number>();
  templates.set("bike", buildBike());
  const stand = Promise.all(
    (["sedan", "suv", "pickup"] as const).map(async (k) => {
      const m = manifest.models[spec(k).model];
      if (!m) return;
      try {
        const g = (await loader.loadAsync(m.lods[0]!.file)).scene;
        // The island's car models lie along x: turn them so the length runs along z.
        const holder = new THREE.Group();
        g.rotation.y = Math.PI / 2;
        holder.add(g);
        if (!templates.has(k) || !templates.get(k)!.userData["drivable"]) templates.set(k, holder);
      } catch {
        // Fallback below: a plain box of the right size.
      }
    }),
  );
  const drivable = loader
    .loadAsync(new URL("fps/br/models/vehicles.glb", base).href)
    .then((g) => {
      for (const k of KINDS) {
        const node = g.scene.getObjectByName(k);
        if (!node) continue;
        node.removeFromParent();
        node.position.set(0, 0, 0);
        node.userData["drivable"] = true;
        const fit = node.userData["fit"] as { radius?: number } | undefined;
        if (fit?.radius) radii.set(k, fit.radius);
        node.traverse((o) => {
          if (o instanceof THREE.Mesh) o.castShadow = true;
        });
        // Body and wheels in a holder: the springs move the body, the wheels stay on the road.
        const holder = new THREE.Group();
        holder.userData["drivable"] = true;
        const body = new THREE.Group();
        body.name = "body";
        holder.add(body);
        const wheels: THREE.Object3D[] = [];
        for (const child of [...node.children])
          if (child.name.startsWith("wheel-")) wheels.push(child);
          else body.add(child);
        for (const w of wheels) holder.add(w);
        templates.set(k, holder);
      }
    })
    .catch(() => {
      // The stand-ins stay.
    });
  const ready = Promise.all([stand, drivable]);
  type Shown = {
    object: THREE.Object3D;
    kind: VehicleKind;
    a: number[];
    b: number[];
    at: number;
    prevAt: number;
    wrecked: boolean;
    /** Presentation: wheel roll angle, last speed, and the body's spring (pitch, roll). */
    spin: number;
    lastSpeed: number;
    lastYaw: number;
    sp: number;
    spv: number;
    sr: number;
    srv: number;
    /** The sprung body (cars; null: a stand-in) and the steering shown. */
    body: THREE.Object3D | null;
    steer: number;
  };
  const shown = new Map<number, Shown>();
  const wreckMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 });
  function make(kind: VehicleKind) {
    const t = templates.get(kind);
    if (t) return t.clone(true);
    const s = spec(kind);
    return new THREE.Mesh(
      new THREE.BoxGeometry(s.width, s.height * 0.8, s.length).translate(
        0,
        s.height * 0.4 + 0.3,
        0,
      ),
      new THREE.MeshStandardMaterial({ color: 0x55606a }),
    );
  }
  /**
   * Wheels and springs for one vehicle this frame: the wheels roll by the distance covered and
   * the front ones turn with the steering; the body pitches with the acceleration (squat, dive)
   * and rolls out of the turn (centripetal) and with a slide, through a damped spring.
   */
  function animate(
    s: Shown,
    speed: number,
    yaw: number,
    steer: number,
    slip: number,
    dtMs: number,
  ) {
    const dt = Math.min(0.1, Math.max(0.001, dtMs / 1000));
    if (s.wrecked) return;
    const sp = spec(s.kind);
    const r = radii.get(s.kind) ?? 0.33;
    s.spin = (s.spin - (speed * dt) / r) % (Math.PI * 2);
    const accel = (speed - s.lastSpeed) / dt;
    const yawRate = Math.atan2(Math.sin(yaw - s.lastYaw), Math.cos(yaw - s.lastYaw)) / dt;
    s.lastSpeed = speed;
    s.lastYaw = yaw;
    // Targets: nose up while accelerating, down while braking; lean out of the turn.
    const soft = sp.bike ? 0 : 1;
    const pitchTarget = THREE.MathUtils.clamp(accel * 0.006, -0.05, 0.04) * soft;
    const lateral = speed * yawRate + slip * 2;
    // (+z roll lifts the right side.) Turning left (yaw rising, `lateral` > 0) a car's body
    // rolls out to the right; a bike leans into the turn, further.
    const rollTarget = sp.bike
      ? THREE.MathUtils.clamp(lateral * 0.045, -0.5, 0.5)
      : THREE.MathUtils.clamp(-lateral * 0.006, -0.07, 0.07);
    const k = 70,
      c = 2 * 0.55 * Math.sqrt(k);
    s.spv += (k * (pitchTarget - s.sp) - c * s.spv) * dt;
    s.sp += s.spv * dt;
    s.srv += (k * (rollTarget - s.sr) - c * s.srv) * dt;
    s.sr += s.srv * dt;
    const body = s.body;
    s.steer = steer;
    if (sp.bike) {
      // A bike leans as a whole, wheels and all, about where the tyres touch the ground.
      s.object.rotateZ(s.sr);
    } else if (body) {
      body.rotation.set(s.sp, 0, s.sr);
      // About the axle line, not the floor: lift by what the pitch/roll would sink.
      body.position.y = Math.abs(s.sp) * 0.3 + Math.abs(s.sr) * 0.4;
    }
    const lock = (sp.steer / (1 + Math.abs(speed) / (sp.bike ? 9 : 14))) * steer;
    for (const w of s.object.children) {
      if (!w.name.startsWith("wheel-")) continue;
      const front = /-(FL|FR|F)$/.test(w.name);
      w.rotation.set(s.spin, front ? -lock : 0, 0, "YXZ");
    }
  }
  const place = (o: THREE.Object3D, r: number[]) => {
    o.position.set(r[2]!, r[3]!, r[4]!);
    o.rotation.set(r[6]!, r[5]!, r[7]!, "YXZ");
  };
  return {
    ready,
    /** Rows from the server (vehicles that changed, entered or left range). */
    apply(update: { rows: number[][]; gone: number[] } | undefined, now: number) {
      if (!update) return;
      for (const id of update.gone) {
        const s = shown.get(id);
        if (s) s.object.removeFromParent();
        shown.delete(id);
      }
      for (const r of update.rows) {
        let s = shown.get(r[0]!);
        if (!s) {
          const kind = KINDS[r[1]!] ?? "sedan";
          const object = make(kind);
          root.add(object);
          s = {
            object,
            kind,
            a: r,
            b: r,
            at: now,
            prevAt: now,
            wrecked: false,
            spin: 0,
            lastSpeed: r[8] ?? 0,
            lastYaw: r[5] ?? 0,
            sp: 0,
            spv: 0,
            sr: 0,
            srv: 0,
            body: object.getObjectByName("body") ?? null,
            steer: 0,
          };
          shown.set(r[0]!, s);
        } else {
          s.a = s.b;
          s.prevAt = s.at;
          s.b = r;
          s.at = now;
        }
        if (r[12] === 1 && !s.wrecked) {
          s.wrecked = true;
          s.object.traverse((o) => {
            if (o instanceof THREE.Mesh) o.material = wreckMat;
          });
        }
      }
    },
    /** The latest server row for a vehicle (prompts, the HUD, prediction resets). */
    row(id: number) {
      return shown.get(id)?.b;
    },
    rows() {
      return [...shown.values()].map((s) => s.b);
    },
    /** Interpolate others; `mine` (predicted) is placed directly. */
    update(now: number, mine: Vehicle | null, dtMs = 16) {
      for (const [id, s] of shown) {
        if (mine && id === mine.id) {
          s.object.position.set(mine.x, mine.y, mine.z);
          s.object.rotation.set(mine.pitch, mine.yaw, mine.roll, "YXZ");
          animate(s, mine.speed, mine.yaw, mine.steer ?? 0, mine.slip ?? 0, dtMs);
          continue;
        }
        // One update behind: glide from the previous row to the latest over their interval.
        const span = Math.max(1, s.at - s.prevAt);
        const k = Math.min(1, Math.max(0, (now - s.at) / span));
        const a = s.a,
          b = s.b;
        const lerp = (i: number) => a[i]! + (b[i]! - a[i]!) * Math.min(1, k);
        const dy = Math.atan2(Math.sin(b[5]! - a[5]!), Math.cos(b[5]! - a[5]!));
        place(s.object, [
          b[0]!,
          b[1]!,
          lerp(2),
          lerp(3),
          lerp(4),
          a[5]! + dy * Math.min(1, k),
          lerp(6),
          lerp(7),
        ]);
        animate(s, lerp(8), a[5]! + dy * Math.min(1, k), b[14] ?? 0, lerp(15), dtMs);
      }
    },
    /**
     * Put a driver in vehicle `id` as it is drawn this frame (call after update): sets `root`'s
     * world place and turn (it must sit in the scene root) and returns the sat pose for the
     * character, hands following the steering; null if the vehicle is not shown.
     */
    seatRider(id: number, root: THREE.Object3D): SeatedPose | null {
      const s = shown.get(id);
      if (!s || s.wrecked) return null;
      const R = RIDERS[s.kind];
      const frame = s.body ?? s.object;
      frame.updateWorldMatrix(true, false);
      const hipUp = STAND_HIP - R.drop;
      const rx = R.hip[0],
        ry = R.hip[1] - hipUp,
        rz = R.hip[2];
      root.position.set(rx, ry, rz).applyMatrix4(frame.matrixWorld);
      frame.getWorldQuaternion(root.quaternion);
      let handL: [number, number, number], handR: [number, number, number];
      if ("wheel" in R) {
        const { at, r, tilt } = R.wheel;
        // Nine and three, turned with the wheel (a right turn is clockwise as the driver sees it).
        const a = -s.steer * 1.5;
        const hand = (theta: number): [number, number, number] => [
          at[0] - rx + r * Math.cos(theta),
          at[1] - ry + r * Math.sin(theta) * Math.cos(tilt),
          at[2] - rz + r * Math.sin(theta) * Math.sin(tilt) + 0.03,
        ];
        handR = hand(a);
        handL = hand(Math.PI + a);
      } else {
        const { at, half } = R.grips;
        // The bars turn about the head tube: the right grip comes back on a right turn.
        const lock = (spec(s.kind).steer / (1 + Math.abs(s.lastSpeed) / 9)) * s.steer;
        const c = Math.cos(lock),
          sn = Math.sin(lock);
        handR = [at[0] - rx + half * c, at[1] - ry, at[2] - rz + half * sn];
        handL = [at[0] - rx - half * c, at[1] - ry, at[2] - rz - half * sn];
      }
      return {
        drop: R.drop,
        lean: R.lean,
        foot: [R.foot[0], R.hip[1] + R.foot[1] - ry, R.foot[2]],
        handL,
        handR,
      };
    },
    /** Rows as vehicles (for prediction collisions with others). */
    asVehicles(): Vehicle[] {
      return [...shown.values()].map(({ b }) => ({
        id: b[0]!,
        kind: KINDS[b[1]!] ?? "sedan",
        condition: CONDITIONS[b[13]!] ?? "good",
        x: b[2]!,
        y: b[3]!,
        z: b[4]!,
        yaw: b[5]!,
        pitch: b[6]!,
        roll: b[7]!,
        speed: b[8]!,
        health: b[9]!,
        maxHealth: b[10]!,
        driver: b[11]!,
        destroyed: b[12] === 1,
        steer: b[14] ?? 0,
        slip: b[15] ?? 0,
      }));
    },
    dispose() {
      root.removeFromParent();
    },
  };
}
export const kindOfRow = (r: number[]) => KINDS[r[1]!] ?? "sedan";
