import { TICK_MS } from "../simulation";
import { newDropBody, stepDrop, type DropBody, type DropInput, type Route } from "./drop";
import type { RappelState } from "./rappel";
import type { StaticWorld } from "./static-world";
import { stepVehicle, type DriveInput, type Vehicle } from "./vehicles";
import type { WorldMeta } from "./world";

/**
 * Where to draw the local player this frame (owner, 2026-11-09: running and looking around
 * felt laggy, not like 1v1/5v5).
 *
 * The body is predicted in fixed 30 Hz steps, as the server applies them. Drawn as is, the
 * camera stood still for four or five frames at 144 Hz and then jumped: 20 cm a jump at a
 * sprint, 2 m in a dive. Mouse look was per event, so the world juddered under a smooth turn.
 *
 * This is the 1v1 renderer's approach (presentation.ts FrameMotion) on the island's physics:
 *  - on foot (walking, jumping, falling), the body's next whole step is taken with the keys
 *    held now and the view is the part of the way to it that has passed: between two steps the
 *    camera is on the line between them, and meets walls, jambs and steps exactly where the
 *    body does;
 *  - under the canopy, in the water and aboard, the part of the next step itself (`preview`);
 *  - the view follows that point: on it while the keys are held, and over a jump of it (a key
 *    pressed or released between two steps, a correction) at the body's speed plus a bounded
 *    repayment, so no frame pops.
 *
 * Camera only. What is sent, predicted and reconciled is unchanged, and so is everything the
 * server and other players see.
 */
export type FrameView = {
  x: number;
  y: number;
  z: number;
  /** The previewed body (phase, crouch, velocity…) for anything that reads its state. */
  body: DropBody;
};

/** View further than this (m) from the preview: a teleport, not an error to ease out. */
const SNAP = 3;
/** What the view repays of a difference to the point it follows, over the body's speed (m per ms). */
const EASE_LIMIT = 0.002;
/**
 * Errors up to this (m) are the timing of a key against the fixed steps and are repaid at the
 * limit; a larger one is a server correction being smoothed by the caller, and the limit rises
 * with it (EASE_FAST per metre over) so the view does not trail that smoothing by a second.
 */
const EASE_SMALL = 0.3;
const EASE_FAST = 0.02;

const onFoot = (b: DropBody) => b.phase === "ground" || b.phase === "swim";

/**
 * Stairs (owner, 2026-11-11: "walking up any stairs is too laggy, should be smoother"). A flight
 * is climbed in whole steps (up to STEP_HEIGHT, 0.35 m: the superstore's are 0.29 m), each taken
 * in one 30 Hz tick, and the camera jumped up with every one. As in Source-engine games, a step
 * up or down while on the ground is absorbed into an offset that eases out over STEP_EASE_MS:
 * the eye glides up the flight instead of hopping. Only the part of a frame's rise that is
 * steeper than STEP_SLOPE over the ground the view covered counts as a step, so walking up a
 * hill or a ramp is followed exactly. Jumps, falls and landings (any change bigger than a step,
 * or off the ground) are not smoothed. View only.
 */
const STEP_EASE_MS = 90;
const STEP_MAX = 0.4;
/** Never trail the body by more than this (m), so a long fast flight cannot sink the eye. */
const STEP_LAG_MAX = 0.45;
/** Rise per metre walked that hills and ramps are followed at exactly (31°); a step is steeper. */
const STEP_SLOPE = 0.6;

export class BrFrameView {
  private readonly preview = newDropBody();
  /** The body after its next whole step (the keys held now). */
  private readonly probe = newDropBody();
  private readonly out: FrameView = { x: 0, y: 0, z: 0, body: this.preview };
  /** The preview's own copy of the body's rope state (a rappel). */
  private readonly rope = {} as RappelState;
  private x = 0;
  private z = 0;
  private walking = false;
  /** The eye's step offset (view y = body y − this): see STEP_EASE_MS. */
  private stepOffset = 0;
  private lastY = NaN;
  private lastX = 0;
  private lastZ = 0;
  private wasGrounded = false;
  /** The point followed, as it was last frame, and the walking body's speed (m per ms). */
  private tx = 0;
  private tz = 0;
  private speed = 0;

  /** Forget the eased position (respawn, teleport, leaving a vehicle). */
  reset() {
    this.walking = false;
    this.stepOffset = 0;
    this.lastY = NaN;
  }

  /** Ease the eye over a step: `y` is where the body stands now, under the view at x/z. */
  private smoothStep(x: number, y: number, z: number, grounded: boolean, frameMs: number) {
    const dy = y - this.lastY;
    // The part of the rise a slope does not explain.
    const step =
      Math.sign(dy) *
      Math.max(0, Math.abs(dy) - STEP_SLOPE * Math.hypot(x - this.lastX, z - this.lastZ));
    if (grounded && this.wasGrounded && Number.isFinite(dy) && Math.abs(dy) <= STEP_MAX)
      this.stepOffset += step;
    else if (!grounded) this.stepOffset = 0;
    this.stepOffset *= Math.exp(-Math.max(0, Math.min(100, frameMs)) / STEP_EASE_MS);
    this.stepOffset = Math.max(-STEP_LAG_MAX, Math.min(STEP_LAG_MAX, this.stepOffset));
    this.lastY = y;
    this.lastX = x;
    this.lastZ = z;
    this.wasGrounded = grounded;
    return y - this.stepOffset;
  }

  /**
   * @param body the predicted body (not modified)
   * @param input the movement keys held now, or null when the body is not being stepped
   * @param planeMs time since the plane spawned, now (the plane's own position is a function
   *   of it)
   * @param pendingMs time since the last fixed step (the accumulator)
   * @param frameMs this frame's duration
   * @param correction the reconciliation offset being decayed by the caller
   */
  sample(
    world: StaticWorld,
    meta: WorldMeta,
    route: Route,
    body: DropBody,
    input: DropInput | null,
    planeMs: number,
    pendingMs: number,
    frameMs: number,
    correction: { x: number; y: number; z: number },
  ): FrameView {
    const { preview, out } = this;
    Object.assign(preview, body);
    // The ride's clock is the body's own object: the preview steps a copy of it.
    if (body.zip) preview.zip = { ...body.zip };
    else delete preview.zip;
    if (body.ladder)
      preview.ladder = {
        ...body.ladder,
        ...(body.ladder.from ? { from: [...body.ladder.from] as [number, number, number] } : {}),
      };
    else delete preview.ladder;
    // The lift's too (owner, 2026-11-13: "the elevator lags a lot"): stepping the shared object
    // ran the ride's own clock ahead by every frame's partial step, and each snapshot then pulled
    // the cab and the rider back.
    if (body.lift) preview.lift = { ...body.lift };
    else delete preview.lift;
    // The rappel's too (owner, 2026-11-16: "the descend rope animation is lagging a lot"): the
    // descent runs on its own clock, so sharing the object moved the real descent on by every
    // frame's part of a step, two to four times as fast as the server's, and each snapshot
    // pulled the body and the animation back up the wall. (Into one kept copy: nothing made
    // per frame.)
    if (body.rappel) {
      const rope = Object.assign(this.rope, body.rappel);
      // (`stood` is only ever read or replaced by the step, so the copy may share it.)
      if (!body.rappel.stood) delete rope.stood;
      preview.rappel = rope;
    } else delete preview.rappel;
    // On foot (walking, and off the ground in a jump or a fall): the body's next whole step, and
    // the part of the way to it that has passed. The step is the one the fixed steps will take
    // with these keys, so what is drawn between two of them is on the line between them: the
    // walls, the door jambs and the corner assist are met once, by the whole step, exactly as
    // the body meets them (collision audit 2026-11-27, see `sample`'s note below). In the air
    // too: a part of a step pressed 6 mm into the wall a jump or a drop ran along and was put
    // back by the next whole one, every tick (the Old Fortress's wall-walks and stairs, owner:
    // "a lot laggy running with the walls and corners"); between two steps the line is within
    // 3 mm of the fall's curve.
    let walked = false;
    if (
      input &&
      body.phase === "ground" &&
      !body.zip &&
      !body.ladder &&
      !body.lift &&
      !body.rappel
    ) {
      const next = Object.assign(this.probe, body);
      delete next.zip;
      delete next.ladder;
      delete next.lift;
      delete next.rappel;
      stepDrop(world, meta, route, next, input, planeMs, TICK_MS);
      if (next.phase === "ground") {
        const part = Math.max(0, Math.min(1, pendingMs / TICK_MS));
        preview.x = body.x + (next.x - body.x) * part;
        preview.y = body.y + (next.y - body.y) * part;
        preview.z = body.z + (next.z - body.z) * part;
        this.speed = Math.hypot(next.x - body.x, next.z - body.z) / TICK_MS;
        walked = true;
      }
    }
    // Otherwise (under the canopy, in the water, aboard, on a rope): the part of the next step itself.
    if (input && !walked)
      stepDrop(
        world,
        meta,
        route,
        preview,
        input,
        planeMs,
        Math.max(0, Math.min(TICK_MS, pendingMs)),
      );
    const tx = preview.x + correction.x,
      tz = preview.z + correction.z;
    out.y = preview.y + correction.y;
    if (!input || !onFoot(preview) || !onFoot(body)) {
      // In the air and aboard the plane the preview is already continuous.
      this.walking = false;
      this.stepOffset = 0;
      this.lastY = NaN;
      out.x = tx;
      out.z = tz;
      return out;
    }
    // The view follows that point. While the keys are held it is on it: the point moves by the
    // frame's share of the step every frame. When it jumps (a key goes down part-way through a
    // step: the part already passed appears at once; a key comes up; a correction) the view
    // covers the difference at the body's own speed plus EASE_LIMIT, more for a large one, so
    // no frame pops.
    //
    // Until this audit the view was a body of its own: stepped every frame by the frame's time
    // with the game's collision, then eased toward the preview, itself a part-step. Near walls
    // the three disagreed. A part-step judged the corner assist by a shorter move than a whole
    // step and slipped 9 cm sideways at a jamb the body stayed at, back with every tick: 2 cm of
    // shake at 30 Hz. The view's own body took the other side of a post from the real one and
    // stood 1 m off it until it snapped back. Held in a corner it crept into it and was pulled
    // out (the two `held` probes that followed papered over that). Measured along the walls of
    // all 125 building models (scripts/br/map-audit/view-smooth.ts, 1.9 million frames): 5,823
    // frames moving backward, 2,875 shakes and 1,510 lurches, with the body's own steps clean
    // (wall-slide.ts: none). It also cost up to three steps of collision a frame; this is one.
    const ms = Math.max(0, Math.min(100, frameMs));
    const error = Math.hypot(tx - this.x, tz - this.z);
    if (!this.walking || error > SNAP) {
      this.walking = true;
      this.x = tx;
      this.z = tz;
    } else if (error > 0) {
      // What the point itself moved this frame, no faster than the body walks (in the air:
      // as it flies), plus the bounded repayment.
      const moved = Math.hypot(tx - this.tx, tz - this.tz);
      const own = walked ? Math.min(moved, this.speed * ms) : moved;
      const limit = own + ms * (EASE_LIMIT + Math.max(0, error - EASE_SMALL) * EASE_FAST);
      const k = error <= limit ? 1 : limit / error;
      this.x += (tx - this.x) * k;
      this.z += (tz - this.z) * k;
    }
    this.tx = tx;
    this.tz = tz;
    out.x = this.x;
    out.z = this.z;
    out.y = this.smoothStep(out.x, out.y, out.z, preview.grounded, frameMs);
    return out;
  }
}

/**
 * The driven vehicle this frame: its predicted state plus the elapsed part of the next step,
 * so the chase camera and the car's own mesh move every frame instead of 30 times a second.
 *
 * And over a correction (owner, 2026-11-14: "while driving … trees is shifting and the ground
 * also. its a laggy feeling"). The room applies one input a tick; a tick whose input is late
 * repeats the last one, and a backlog is drained by skipping one (workers/fps/br-input.ts). Each
 * moves the server's car one step against the prediction: 20 cm on foot, eased out by the body's
 * correction, but 0.8 m at 85 km/h, and the car's prediction took it in one frame: the camera
 * rides on the car, so the whole world jumped under it, three times a second on a connection
 * whose packets arrive up to 40 ms late (scripts/br/drive-sim/smooth.mjs). The difference is
 * now kept as an offset on what is drawn and repaid over a few frames, at a small part of the
 * car's speed, so a step gained or lost is a slight surge instead of a jump. View only: what is
 * sent, predicted and reconciled is unchanged.
 */
/** An offset further than this (m, rad) is a teleport or a crash the prediction missed: no glide. */
const CAR_SNAP = 5;
const CAR_SNAP_YAW = 0.7;
/** The offset's time constant (ms), and the speed it is repaid at: m/s, plus a share of the car's. */
const CAR_EASE_MS = 200;
const CAR_EASE_BASE = 0.6;
const CAR_EASE_SHARE = 0.08;
/** Past this (m) the limit rises (per metre over, per second), so a large one is not trailed. */
const CAR_EASE_SMALL = 1.5;
const CAR_EASE_FAST = 4;

type CarPlace = Pick<Vehicle, "x" | "y" | "z" | "yaw">;

export class BrVehicleView {
  private pose: Vehicle | null = null;
  private readonly offset = { x: 0, y: 0, z: 0, yaw: 0 };

  /** Forget the offset (another vehicle, getting in). */
  reset() {
    const o = this.offset;
    o.x = o.y = o.z = o.yaw = 0;
  }

  /**
   * The server's state replaced the prediction: `before` is the car as predicted until now,
   * `after` as predicted from the new state (the same inputs replayed on it).
   */
  reconciled(before: CarPlace, after: CarPlace) {
    const o = this.offset;
    o.x += before.x - after.x;
    o.y += before.y - after.y;
    o.z += before.z - after.z;
    o.yaw += Math.atan2(Math.sin(before.yaw - after.yaw), Math.cos(before.yaw - after.yaw));
    if (Math.hypot(o.x, o.y, o.z) > CAR_SNAP || Math.abs(o.yaw) > CAR_SNAP_YAW) this.reset();
  }

  /** @param frameMs this frame's duration (the offset is repaid by it) */
  sample(
    world: StaticWorld,
    meta: WorldMeta,
    car: Vehicle,
    input: DriveInput | null,
    pendingMs: number,
    others: readonly Vehicle[],
    frameMs = 0,
  ): Vehicle {
    const pose = (this.pose ??= { ...car });
    Object.assign(pose, car);
    if (input)
      stepVehicle(world, meta, pose, input, Math.max(0, Math.min(TICK_MS, pendingMs)), others);
    const o = this.offset;
    const error = Math.hypot(o.x, o.y, o.z);
    if (error > 0 || o.yaw !== 0) {
      const ms = Math.max(0, Math.min(100, frameMs));
      const blend = 1 - Math.exp(-ms / CAR_EASE_MS);
      const limit =
        (ms / 1000) *
        (CAR_EASE_BASE +
          CAR_EASE_SHARE * Math.abs(pose.speed) +
          Math.max(0, error - CAR_EASE_SMALL) * CAR_EASE_FAST);
      // The same share off each axis: the offset shrinks along its own direction.
      const k = error > 1e-4 ? 1 - Math.min(error * blend, limit) / error : 0;
      o.x *= k;
      o.y *= k;
      o.z *= k;
      o.yaw *= 1 - blend;
      if (Math.abs(o.yaw) < 1e-5) o.yaw = 0;
      pose.x += o.x;
      pose.y += o.y;
      pose.z += o.z;
      pose.yaw += o.yaw;
    }
    return pose;
  }
}

// ---------------------------------------------------------------- the chase camera

/** The free look holds this long (ms) after the mouse last moved, then eases back behind. */
export const CHASE_HOLD_MS = 1500;
/** Over this long (ms) the pull back behind the vehicle comes in. */
export const CHASE_EASE_MS = 900;
/** The time constant (ms) of the settle behind the vehicle once it is under way. */
export const CHASE_SETTLE_MS = 1200;

/**
 * The vehicle camera's heading: it settles behind the vehicle as it drives, and the mouse swings
 * it round (owner, 2026-11-15: "the free camera angel looking around … audit and fix"). The pull
 * back behind used to act all the time, in proportion to how far the view had been swung: it
 * fought the mouse while it moved (a quarter turn was pulled back at 75° a second) and took the
 * view away the moment the mouse stopped. Now the view stays where the mouse put it for
 * CHASE_HOLD_MS, and the pull comes in gently after that.
 */
export class BrChaseLook {
  private idle = Infinity;
  /** The mouse moved the view. */
  moved() {
    this.idle = 0;
  }
  reset() {
    this.idle = Infinity;
  }
  /** How much of the pull back acts now (0..1). */
  get pull() {
    const k = Math.max(0, Math.min(1, (this.idle - CHASE_HOLD_MS) / CHASE_EASE_MS));
    return k * k * (3 - 2 * k);
  }
  /** The view's heading after `ms`, for a vehicle heading `carYaw` (`moving`: under way). */
  step(yaw: number, carYaw: number, moving: boolean, ms: number) {
    this.idle += ms;
    if (!moving) return yaw;
    const d = Math.atan2(Math.sin(carYaw - yaw), Math.cos(carYaw - yaw));
    return yaw + d * (1 - Math.exp(-ms / CHASE_SETTLE_MS)) * this.pull;
  }
}

/** The chase camera follows the vehicle's height with this time constant (ms). */
export const CHASE_HEIGHT_MS = 90;
/** It is never further than this (m) from the height it follows. */
export const CHASE_HEIGHT_LAG = 0.9;

/**
 * A height followed smoothly (a critically damped spring, exact for any frame time): the chase
 * camera's height behind a vehicle. The vehicle rides the ground under its wheels, and the
 * ground is a 3.9 m lattice: at 30 m/s its slope changes eight times a second, and a camera
 * fixed to the vehicle took each change as a jolt (measured on a road: the view's vertical
 * acceleration over 30 m/s² in one frame in twenty, up to 115). The vehicle moves a few
 * centimetres against the picture instead, as on its springs, and the world holds still.
 */
export class BrFollowHeight {
  private y = NaN;
  private v = 0;
  constructor(
    private readonly tauMs: number = CHASE_HEIGHT_MS,
    private readonly maxLag: number = CHASE_HEIGHT_LAG,
  ) {}
  reset() {
    this.y = NaN;
    this.v = 0;
  }
  sample(target: number, ms: number) {
    if (Number.isNaN(this.y) || ms <= 0) {
      if (Number.isNaN(this.y)) this.y = target;
      return this.y;
    }
    const w = 1000 / this.tauMs,
      dt = ms / 1000;
    const x = this.y - target;
    const e = Math.exp(-w * dt);
    const k = this.v + w * x;
    this.y = target + (x + k * dt) * e;
    this.v = (this.v - w * k * dt) * e;
    // On a long climb the spring trails the ground by a fixed amount: never by too much.
    if (Math.abs(this.y - target) > this.maxLag) {
      this.y = target + Math.sign(this.y - target) * this.maxLag;
      this.v = 0;
    }
    return this.y;
  }
}
