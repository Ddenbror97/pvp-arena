/**
 * Rifle locomotion for the third-person characters (owner, 2026-11-10: enemies' walk and run
 * looked poor). Foot paths, toe roll, hip bounce and pelvis sway from Adobe Mixamo's rifle
 * clips (idle, walk, run, backwards, strafes, crouch walk), baked by
 * scripts/fps/locomotion/bake.mjs into public/fps/locomotion/rifle-v1.json. The character's leg
 * IK puts its ankles on these paths (authored-character.ts), so any rig of any size follows
 * them without retargeting bone rotations, and the upper body (aim, weapon, reload, throws)
 * stays as it is.
 *
 * Blending, per frame:
 *  - direction: forward / backward / left / right weights from the travel direction;
 *  - pace: forward blends walk → run by speed; the other directions stretch their stride;
 *  - crouch: the crouch walk, turned to the travel direction;
 *  - stillness: the idle stance as the speed falls to zero.
 * The cycle advances by distance travelled over the blended stride, so a planted foot moves
 * back at the body's speed: no sliding at any pace.
 *
 * Presentation only: nothing here reaches the simulation or hit registration.
 */

type Clip = {
  id: string;
  duration: number;
  velocity: [number, number];
  samples: number;
  left: number[];
  right: number[];
  toeLeft: number[];
  toeRight: number[];
  hipY: number[];
  sway: number[];
  pelvis: number[];
};
type ClipId = "idle" | "walk" | "run" | "back" | "left" | "right" | "crouch";
export type LocomotionClips = Record<ClipId, Clip>;

export const LOCOMOTION_URL = "/fps/locomotion/rifle-v1.json";

let loading: Promise<LocomotionClips | null> | null = null;
let clips: LocomotionClips | null = null;

/** Load once per page; null where it cannot (tests, offline): the procedural gait remains. */
export function loadLocomotion(): Promise<LocomotionClips | null> {
  if (clips) return Promise.resolve(clips);
  if (!loading)
    loading =
      typeof fetch === "undefined" || typeof location === "undefined"
        ? Promise.resolve(null)
        : fetch(LOCOMOTION_URL)
            .then((r) => (r.ok ? (r.json() as Promise<{ clips: LocomotionClips }>) : null))
            .then((data) => (clips = data?.clips ?? null))
            .catch(() => null);
  return loading;
}

/** For tests and tools: use already-parsed clips. */
export function setLocomotion(data: LocomotionClips | null) {
  clips = data;
  loading = Promise.resolve(data);
}

/** One frame's pose, in the character's root space (metres; forward is -z, right is +x). */
export type GaitPose = {
  left: [number, number, number];
  right: [number, number, number];
  /** Toe pitch (rad, + toe up) to add to each foot's rest orientation. */
  toeLeft: number;
  toeRight: number;
  /** Hip bounce about rest height (m, a few cm) and sideways/forward sway (m). */
  drop: number;
  swayX: number;
  swayZ: number;
  /** Pelvis yaw and roll (rad) in root space. */
  yaw: number;
  roll: number;
};

const ease = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Linear interpolation of a clip's sample row `stride` wide at phase 0..1. */
function at(arr: number[], stride: number, n: number, phase: number, k: number) {
  const x = (((phase % 1) + 1) % 1) * n;
  const i = Math.floor(x),
    f = x - i,
    j = (i + 1) % n;
  return arr[i * stride + k]! * (1 - f) + arr[j * stride + k]! * f;
}

/** A clip's mean ankle position (its neutral stance), cached. */
const means = new WeakMap<Clip, { L: number[]; R: number[] }>();
function mean(c: Clip) {
  let m = means.get(c);
  if (!m) {
    const avg = (a: number[]) =>
      [0, 1, 2].map((k) => {
        let s = 0;
        for (let i = 0; i < c.samples; i++) s += a[i * 3 + k]!;
        return s / c.samples;
      });
    m = { L: avg(c.left), R: avg(c.right) };
    means.set(c, m);
  }
  return m;
}
/**
 * The deepest the hips go (m): the server's head box is 0.4 m about the eye height
 * (player-volumes.ts), so the drawn head stays inside it. A run needs most of it for the
 * leading foot to reach the ground; the clip's own run is 14 cm lower still.
 */
export const MAX_DROP = 0.09;

const natural = (c: Clip) => Math.hypot(c.velocity[0], c.velocity[1]);
const hipMeans = new WeakMap<Clip, number>();
function meanHip(c: Clip) {
  let m = hipMeans.get(c);
  if (m === undefined) {
    m = c.hipY.reduce((a, b) => a + b, 0) / c.hipY.length;
    hipMeans.set(c, m);
  }
  return m;
}

/**
 * Per-character gait state: the cycle's phase and the idle's own clock. `legLength` is the
 * rig's rest hip height in root space (m): every baked length is in those units.
 */
export class Gait {
  private phase = 0;
  private idleTime = Math.random() * 8;
  readonly pose: GaitPose = {
    left: [0, 0, 0],
    right: [0, 0, 0],
    toeLeft: 0,
    toeRight: 0,
    drop: 0,
    swayX: 0,
    swayZ: 0,
    yaw: 0,
    roll: 0,
  };

  /**
   * @param legLength the rig's rest hip height in root space (m)
   * @param ankleHeight the rig's rest ankle height in root space (m): the clips' ankle heights
   *   are moved by the difference to their own standing ankle height, so the feet stand on the
   *   ground whatever the rig's foot proportions (a deeper heel otherwise sinks the toes).
   */
  constructor(
    readonly legLength: number,
    readonly ankleHeight = 0,
  ) {}

  reset() {
    this.phase = 0;
  }

  /**
   * @param speed ground speed (m/s)
   * @param travelX travel direction in root space (+x right)
   * @param travelZ travel direction in root space (-z forward)
   * @param stance 0 standing … 1 crouched
   * @returns the pose, or null before the clips have loaded
   */
  update(dtMs: number, speed: number, travelX: number, travelZ: number, stance: number) {
    const c = clips;
    if (!c) return null;
    const unit = this.legLength;
    const s = speed / unit; // hip heights per second
    // Direction weights (clip frame: +z forward, +x the character's left).
    const fwd = Math.max(0, -travelZ),
      back = Math.max(0, travelZ),
      right = Math.max(0, travelX),
      left = Math.max(0, -travelX);
    const total = Math.max(1e-6, fwd + back + right + left);
    const pace = ease(natural(c.walk), natural(c.run), s);
    const crouch = Math.min(1, Math.max(0, stance));
    const parts: Array<[Clip, number]> = [
      // Walking pace: the clip for each direction. Running pace (1v1/5v5 move at 5 m/s in
      // every direction, the battle royale sprints at 7.5): the run, turned to the travel,
      // since Mixamo's strafes and backward walk are walks and shuffle when sped up.
      [c.walk, (fwd / total) * (1 - pace) * (1 - crouch)],
      [c.run, pace * (1 - crouch)],
      [c.back, (back / total) * (1 - pace) * (1 - crouch)],
      [c.left, (left / total) * (1 - pace) * (1 - crouch)],
      [c.right, (right / total) * (1 - pace) * (1 - crouch)],
      [c.crouch, crouch],
    ];
    // Blended natural speed and cycle length (hip heights), then the stride stretch that
    // matches the actual speed (within reason: beyond it the cadence rises instead).
    let v = 0,
      cycle = 0;
    for (const [clip, w] of parts) {
      v += natural(clip) * w;
      cycle += natural(clip) * clip.duration * w;
    }
    // Running, the stride is not lengthened (the hips cannot drop far enough for the leg to
    // reach): the cadence rises with the speed instead.
    const stretch = Math.min(1.35 - 0.35 * pace, Math.max(0.7, s / Math.max(1e-3, v)));
    const moving = ease(0.12, 0.6, speed);
    if (moving > 0) this.phase += (s * dtMs) / 1000 / Math.max(0.05, cycle * stretch);
    this.idleTime += dtMs / 1000;
    // The run and the crouch walk go forward; turned toward the travel for any other direction.
    const heading = Math.atan2(-travelX, -travelZ),
      ch = Math.cos(heading),
      sh = Math.sin(heading);
    const p = this.pose;
    const acc = (out: [number, number, number], side: "left" | "right") => {
      let x = 0,
        y = 0,
        z = 0;
      for (const [clip, w] of parts) {
        if (w <= 0) continue;
        const arr = clip[side],
          n = clip.samples,
          m = mean(clip)[side === "left" ? "L" : "R"]!;
        let dx = (at(arr, 3, n, this.phase, 0) - m[0]!) * stretch + m[0]!,
          dz = (at(arr, 3, n, this.phase, 2) - m[2]!) * stretch + m[2]!;
        if (clip === c.crouch || clip === c.run) {
          const rx = dx * ch + dz * sh,
            rz = -dx * sh + dz * ch;
          dx = rx;
          dz = rz;
        }
        x += dx * w;
        y += at(arr, 3, n, this.phase, 1) * w;
        z += dz * w;
      }
      // Still: the idle stance (its feet are planted; its clock only moves the hips).
      const idle = c.idle,
        n = idle.samples,
        t = this.idleTime / idle.duration;
      const ix = at(idle[side], 3, n, t, 0),
        iy = at(idle[side], 3, n, t, 1),
        iz = at(idle[side], 3, n, t, 2);
      // Clip frame (+z forward, +x left) to root space (-z forward, +x right).
      out[0] = -(ix + (x - ix) * moving) * unit;
      const stand = (mean(idle).L[1]! + mean(idle).R[1]!) / 2;
      out[1] = (iy + (y - iy) * moving - stand) * unit + this.ankleHeight;
      out[2] = -(iz + (z - iz) * moving) * unit;
    };
    acc(p.left, "left");
    acc(p.right, "right");
    let toeL = 0,
      toeR = 0,
      hip = 0,
      depth = 0,
      sx = 0,
      sz = 0,
      yaw = 0,
      roll = 0;
    for (const [clip, w] of parts) {
      if (w <= 0) continue;
      const n = clip.samples;
      toeL += at(clip.toeLeft, 1, n, this.phase, 0) * w;
      toeR += at(clip.toeRight, 1, n, this.phase, 0) * w;
      // The bounce about the clip's own mean height: the clip's depth (a run's lower hips, the
      // crouch) is not taken, so the head stays over the server's head hitbox.
      hip += (at(clip.hipY, 1, n, this.phase, 0) - meanHip(clip)) * w;
      if (clip !== c.crouch) depth += (meanHip(clip) - 1) * w;
      sx += at(clip.sway, 2, n, this.phase, 0) * w;
      sz += at(clip.sway, 2, n, this.phase, 1) * w;
      yaw += at(clip.pelvis, 2, n, this.phase, 0) * w;
      roll += at(clip.pelvis, 2, n, this.phase, 1) * w;
    }
    p.toeLeft = toeL * moving;
    p.toeRight = toeR * moving;
    // Standing still the hips stay at rest height (the head exactly at the shared eye height).
    p.drop = Math.max(-MAX_DROP, Math.min(0.03, (hip + depth) * unit * moving));
    p.swayX = -sx * unit * moving;
    p.swayZ = -sz * unit * moving;
    p.yaw = yaw * moving;
    p.roll = -roll * moving;
    return p;
  }
}
