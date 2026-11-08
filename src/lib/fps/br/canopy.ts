import * as THREE from "three";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * The players' ram-air parachute (owner's parachute spec, 2026-11-05; model built by
 * art/blender/br/build_canopy.mjs). Presentation only: where a player flies is the shared drop
 * simulation (drop.ts); this draws the canopy for that motion, the same for the local player and
 * for others (whose deploy, steering, dive and landing are read from their synced motion).
 *
 * The canopy's origin is the harness between the shoulders: place it there (HARNESS_Y above a
 * character's feet), turned to the heading it flies.
 */
export const HARNESS_Y = 1.42;
/** Deployment: lines pay out (LINES_S), then the canopy spreads and fills (to DEPLOY_S). */
export const DEPLOY_S = 1.8;
const LINES_S = 0.45;
/** After landing: the canopy loses tension and settles behind the player, then goes. */
export const COLLAPSE_S = 1.4;

/**
 * Diving (owner, 2026-11-08): the pilot and the wing swing forward together about the harness,
 * the wing ahead of and below where it glides, nose down, the pilot leaning into the dive with
 * the legs trailing. A sprung pendulum (it swings through and settles as a dive starts or ends),
 * never a roll: the old dive pose rolled the wing sideways, so a straight dive looked like a
 * turn to the left.
 */
export const DIVE_SWING = 0.7;
/** The wing's own extra nose-down in a full dive (on top of the system's swing). */
const DIVE_WING_PITCH = 0.14;
/** Pendulum: about a 1.7 s period, under-damped (one visible swing through, then settled). */
const SWING_K = (2 * Math.PI) / 1.7;
const SWING_DAMPING = 0.42;
export type Swing = { angle: number; rate: number };
/** One pendulum step toward `target` (radians, + = forward / nose down). */
export function swingStep(s: Swing, target: number, dtMs: number) {
  const dt = Math.min(0.25, Math.max(0, dtMs / 1000));
  // Small sub-steps keep the spring stable and the same at any frame rate.
  const n = Math.max(1, Math.ceil(dt / 0.016));
  for (let i = 0; i < n; i++) {
    const h = dt / n;
    s.rate += (SWING_K * SWING_K * (target - s.angle) - 2 * SWING_DAMPING * SWING_K * s.rate) * h;
    s.angle += s.rate * h;
  }
  return s.angle;
}
const hangQ = new THREE.Quaternion(),
  hangE = new THREE.Euler(0, 0, 0, "YXZ"),
  hangV = new THREE.Vector3();
/**
 * Hang the pilot (a character rooted at the feet) from the harness at `harness`: heading, the
 * swing forward (`swing`, + leans into a dive) and the bank (`roll`), all about the harness, so
 * the canopy placed at the same harness point stays on the shoulders whatever the swing.
 */
export function hangPilot(
  root: THREE.Object3D,
  harness: THREE.Vector3,
  heading: number,
  swing: number,
  roll: number,
  extraPitch = 0,
) {
  root.rotation.order = "YXZ";
  root.rotation.set(-swing + extraPitch, heading, roll);
  hangQ.setFromEuler(hangE.set(-swing + extraPitch, heading, roll, "YXZ"));
  hangV.set(0, HARNESS_Y, 0).applyQuaternion(hangQ);
  root.position.copy(harness).sub(hangV);
}
/** Turn a canopy at the harness `harness` the same way (heading, swing, bank). */
export function hangCanopy(
  root: THREE.Object3D,
  harness: THREE.Vector3,
  heading: number,
  swing: number,
  roll: number,
) {
  root.rotation.order = "YXZ";
  root.rotation.set(-swing, heading, roll);
  root.position.copy(harness);
}

export type CanopyTemplate = {
  near: THREE.Object3D;
  far: { geometry: THREE.BufferGeometry; material: THREE.Material };
};

export async function loadCanopy(loader: GLTFLoader, url: string): Promise<CanopyTemplate> {
  const gltf = await loader.loadAsync(url);
  const near = new THREE.Group();
  let far: CanopyTemplate["far"] | null = null;
  gltf.scene.updateMatrixWorld(true);
  for (const child of [...gltf.scene.children]) {
    if (child.name === "CanopyFar" && child instanceof THREE.Mesh)
      far = { geometry: child.geometry, material: child.material as THREE.Material };
    else near.add(child);
  }
  near.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const m = o.material as THREE.MeshStandardMaterial;
      m.vertexColors = true;
      o.frustumCulled = false; // morphs and deploy scaling move it beyond its bounds
    }
    if (o instanceof THREE.LineSegments) {
      o.frustumCulled = false;
      // GLTFLoader sets up morph weights on meshes only: the lines need them too.
      if (!o.morphTargetInfluences) o.updateMorphTargets();
    }
  });
  if (!far) throw new Error("canopy.glb: no CanopyFar");
  return { near, far };
}

export type CanopyPose = {
  /** Seconds since the canopy began to open (on leaving the plane). */
  deploy: number;
  /** Seconds since landing (negative while flying). */
  landed: number;
  /** Steering toggles pulled, 0..1 each side. */
  brakeL: number;
  brakeR: number;
  /** Diving, 0..1 (eased by the caller). */
  dive: number;
  /** Clock for the airflow (seconds). */
  time: number;
};

const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** One player's canopy (a clone of the template; morphs are per clone). */
export function createCanopy(template: CanopyTemplate) {
  const root = new THREE.Group();
  const body = template.near.clone(true);
  root.add(body);
  const morphed: Array<THREE.Mesh | THREE.LineSegments> = [];
  let lines: THREE.Object3D | null = null;
  body.traverse((o) => {
    if (o instanceof THREE.LineSegments) lines = o;
    if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
    // Line.clone() does not copy morph weights (Mesh.clone() does): set them up per clone.
    if (!o.morphTargetInfluences) o.updateMorphTargets();
    if (o.morphTargetInfluences) morphed.push(o);
  });
  return {
    root,
    /**
     * Lines only up close: a metre-thin cord is a pixel at most past ~120 m, and a bundle of
     * one-pixel lines reads as a pale blob there.
     */
    setLines(on: boolean) {
      if (lines) lines.visible = on;
    },
    /** Pose for this frame; returns false once a landed canopy has gone. */
    pose(p: CanopyPose) {
      const lines = clamp01(p.deploy / LINES_S);
      const fill = clamp01((p.deploy - LINES_S * 0.7) / (DEPLOY_S - LINES_S * 0.7));
      const spread = fill > 0 ? easeOutBack(fill) : 0;
      // Packed above the head, then the lines pay out and the wing spreads and fills.
      let sx = 0.16 + 0.84 * spread,
        sy = 0.12 + 0.88 * (1 - (1 - lines) ** 2);
      const sz = 0.4 + 0.6 * spread;
      // Airflow: the wing breathes and rocks a little (less once the dive loads it).
      const calm = 1 - 0.6 * p.dive;
      sy *= 1 + 0.008 * Math.sin(p.time * 2.3) * calm;
      // The system's swing (hangCanopy) carries the dive; the wing adds a little nose-down of
      // its own. No roll from the dive: only the toggles bank it.
      let rx = -DIVE_WING_PITCH * p.dive,
        rz = (p.brakeL - p.brakeR) * 0.16 + 0.012 * Math.sin(p.time * 1.4) * calm;
      let dy = 0;
      if (p.landed >= 0) {
        // Losing tension: it sinks back and down behind the pilot and folds.
        const e = clamp01(p.landed / COLLAPSE_S);
        const k = e * e * (3 - 2 * e);
        rx += 1.25 * k;
        rz *= 1 - k;
        sy *= 1 - 0.55 * k;
        sx *= 1 - 0.35 * k;
        dy = -0.6 * k;
        if (e >= 1) {
          root.visible = false;
          return false;
        }
      }
      root.visible = true;
      body.scale.set(sx, sy, sz);
      body.position.y = dy;
      body.rotation.set(rx, 0, rz);
      // A spread canopy only steers once it flies; the flare comes with both toggles.
      const flare = Math.min(p.brakeL, p.brakeR);
      for (const m of morphed) {
        const inf = m.morphTargetInfluences!;
        inf[0] = (p.brakeL - flare) * fill;
        inf[1] = (p.brakeR - flare) * fill;
        inf[2] = flare * fill;
      }
      return true;
    },
  };
}
export type Canopy = ReturnType<typeof createCanopy>;

/** Distant canopies: one instanced draw (no lines). */
export function createFarCanopies(template: CanopyTemplate, max: number) {
  const mesh = new THREE.InstancedMesh(template.far.geometry, template.far.material, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    s = new THREE.Vector3(1, 1, 1),
    p = new THREE.Vector3();
  return {
    mesh,
    begin() {
      mesh.count = 0;
    },
    /** A canopy over a player standing at `feet`, flying `heading`, banked `bank`. */
    add(feet: THREE.Vector3, heading: number, bank: number, scale = 1) {
      if (mesh.count >= max) return;
      p.set(feet.x, feet.y + HARNESS_Y, feet.z);
      q.setFromEuler(e.set(0, heading, bank, "YXZ"));
      s.setScalar(scale);
      mesh.setMatrixAt(mesh.count++, m.compose(p, q, s));
    },
    end() {
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
