import { TICK_MS } from "../simulation";
import { newDropBody, stepDrop, type DropBody, type DropInput, type Route } from "./drop";
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
 *  - `preview`: the predicted body plus the part of the next step that has already elapsed,
 *    with the keys held now. Used as is in the air and aboard the plane.
 *  - on foot, the view also integrates its own position every frame by the frame's time and
 *    eases toward the preview, so a key pressed between two steps moves the camera on that
 *    frame without a pop, and the small disagreement is repaid within about a tenth of a second.
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
/** Easing toward the preview: time constant (ms) and its speed limit (m per ms). */
const EASE_MS = 65;
const EASE_LIMIT = 0.002;
/**
 * Errors up to this (m) are the timing of a key against the fixed steps and are repaid at the
 * limit; a larger one is a server correction being smoothed by the caller, and the limit rises
 * with it (EASE_FAST per metre over) so the view does not trail that smoothing by a second.
 */
const EASE_SMALL = 0.3;
const EASE_FAST = 0.02;

/** The view's footing: probe radius, and how far (m) above or below the preview it may stand. */
const VIEW_RADIUS = 0.35;
const VIEW_REACH = 1.2;

const onFoot = (b: DropBody) => b.phase === "ground" || b.phase === "swim";

export class BrFrameView {
  private readonly preview = newDropBody();
  private readonly scratch = newDropBody();
  private readonly out: FrameView = { x: 0, y: 0, z: 0, body: this.preview };
  private x = 0;
  private z = 0;
  private walking = false;

  /** Forget the eased position (respawn, teleport, leaving a vehicle). */
  reset() {
    this.walking = false;
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
    const { preview, scratch, out } = this;
    Object.assign(preview, body);
    if (input)
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
      out.x = tx;
      out.z = tz;
      return out;
    }
    if (!this.walking || Math.hypot(tx - this.x, tz - this.z) > SNAP) {
      this.walking = true;
      this.x = tx;
      this.z = tz;
    } else {
      // The view's own step for this frame, with the same physics and collision.
      Object.assign(scratch, preview);
      scratch.x = this.x;
      scratch.z = this.z;
      // Stand the view's own body on the ground under the VIEW, not at the preview's height.
      // On a staircase the two are a step or more apart: with the preview's height the view's
      // body started inside the flight (or the easing below was "blocked" by it), stood still
      // while the real body walked on, then jumped after it: going down, half the frames moved
      // backwards and the camera trailed by up to 2.5 m (owner, 2026-11-10: "the stairs at
      // Blackwater Prison lag out").
      const footY = preview.grounded
        ? world.supportAt(this.x, this.z, VIEW_RADIUS, preview.y + VIEW_REACH)
        : preview.y;
      scratch.y = Math.abs(footY - preview.y) <= VIEW_REACH ? footY : preview.y;
      let left = Math.max(0, Math.min(100, frameMs));
      while (left > 0) {
        const step = Math.min(TICK_MS, left);
        stepDrop(world, meta, route, scratch, input, planeMs, step);
        left -= step;
      }
      if (onFoot(scratch)) {
        this.x = scratch.x;
        this.z = scratch.z;
      }
      // Repay what is left of the difference, continuously and bounded, one axis at a time
      // (so a wall that blocks one axis does not hold the other back).
      const ms = Math.max(0, Math.min(100, frameMs));
      const blend = 1 - Math.exp(-ms / EASE_MS),
        error = Math.hypot(tx - this.x, tz - this.z),
        limit = ms * (EASE_LIMIT + Math.max(0, error - EASE_SMALL) * EASE_FAST);
      const nx = this.x + Math.max(-limit, Math.min(limit, (tx - this.x) * blend)),
        nz = this.z + Math.max(-limit, Math.min(limit, (tz - this.z) * blend));
      const height = preview.crouched ? 1.1 : 1.7;
      // (From above a step's height at the view's own footing, so a flight's next steps do
      // not count as a wall.)
      const clearY = scratch.y + 0.4;
      if (!world.blocked(nx, clearY, this.z, height - 0.4, 0.3)) this.x = nx;
      if (!world.blocked(this.x, clearY, nz, height - 0.4, 0.3)) this.z = nz;
    }
    out.x = this.x;
    out.z = this.z;
    return out;
  }
}

/**
 * The driven vehicle this frame: its predicted state plus the elapsed part of the next step,
 * so the chase camera and the car's own mesh move every frame instead of 30 times a second.
 */
export class BrVehicleView {
  private pose: Vehicle | null = null;
  sample(
    world: StaticWorld,
    meta: WorldMeta,
    car: Vehicle,
    input: DriveInput | null,
    pendingMs: number,
    others: readonly Vehicle[],
  ): Vehicle {
    const pose = (this.pose ??= { ...car });
    Object.assign(pose, car);
    if (input)
      stepVehicle(world, meta, pose, input, Math.max(0, Math.min(TICK_MS, pendingMs)), others);
    return pose;
  }
}
