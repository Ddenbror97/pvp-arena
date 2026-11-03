import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { ModelManifest } from "./props-renderer";
import { spec, type Vehicle, type VehicleKind } from "./vehicles";

/**
 * Vehicles on screen: the island's own car models (sedan, cruiser, pickup), a motorbike built in
 * code (no licensed model was available; a few hundred triangles), placed from the server's rows
 * (interpolated) or, for the car you drive, from your own prediction. Wrecks sit dark and still.
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

export function createVehicleRenderer(
  scene: THREE.Scene,
  loader: GLTFLoader,
  manifest: ModelManifest,
) {
  const root = new THREE.Group();
  scene.add(root);
  const templates = new Map<VehicleKind, THREE.Object3D>();
  templates.set("bike", buildBike());
  const ready = Promise.all(
    (["sedan", "suv", "pickup"] as const).map(async (k) => {
      const m = manifest.models[spec(k).model];
      if (!m) return;
      try {
        const g = (await loader.loadAsync(m.lods[0]!.file)).scene;
        // The car models lie along x: turn them so the length runs along z (forward −z).
        const holder = new THREE.Group();
        g.rotation.y = Math.PI / 2;
        holder.add(g);
        templates.set(k, holder);
      } catch {
        // Fallback below: a plain box of the right size.
      }
    }),
  );
  type Shown = {
    object: THREE.Object3D;
    a: number[];
    b: number[];
    at: number;
    prevAt: number;
    wrecked: boolean;
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
          const object = make(KINDS[r[1]!] ?? "sedan");
          root.add(object);
          s = { object, a: r, b: r, at: now, prevAt: now, wrecked: false };
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
    update(now: number, mine: Vehicle | null) {
      for (const [id, s] of shown) {
        if (mine && id === mine.id) {
          s.object.position.set(mine.x, mine.y, mine.z);
          s.object.rotation.set(mine.pitch, mine.yaw, mine.roll, "YXZ");
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
      }
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
      }));
    },
    dispose() {
      root.removeFromParent();
    },
  };
}
export const kindOfRow = (r: number[]) => KINDS[r[1]!] ?? "sedan";
