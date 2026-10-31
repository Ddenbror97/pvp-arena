import type { Input, Player } from "./protocol";
import { isMovementBlocked, predictMovement, TICK_MS } from "./simulation";
import { eyeHeight } from "./map";

/** Camera stance only. Feet/jump physics and authoritative hit volumes stay exact. */
export class CameraStance {
  private height: number | null = null;
  reset() {
    this.height = null;
  }
  sample(player: { crouched?: boolean }, ms: number) {
    const target = eyeHeight(player);
    if (this.height === null) return (this.height = target);
    const maxStep = Math.max(0, Math.min(100, ms)) * 0.01;
    this.height += Math.max(-maxStep, Math.min(maxStep, target - this.height));
    return this.height;
  }
}

/** Rate-limit only discontinuous vertical corrections. Ordinary jump velocity
 * fits inside this bound, so the physics trajectory is followed immediately. */
export class CameraVertical {
  private y: number | null = null;
  reset() {
    this.y = null;
  }
  sample(target: number, ms: number) {
    if (this.y === null) return (this.y = target);
    const step = Math.max(0, Math.min(100, ms)) * 0.012;
    this.y += Math.max(-step, Math.min(step, target - this.y));
    return this.y;
  }
}

/** Camera-only horizontal integration; network prediction remains fixed-step. */
export class FrameMotion {
  private pose: Player | null = null;
  reset() {
    this.pose = null;
  }
  sample(reference: Player, input: Input | null, ms: number, correction: CameraCorrection) {
    if (!this.pose) return (this.pose = { ...reference });
    const pose = this.pose,
      x = pose.x,
      z = pose.z;
    Object.assign(pose, reference);
    pose.x = x;
    pose.z = z;
    // A network command advances TICK_MS physics once every ceil(TICK_MS).
    // Keep the cosmetic velocity on that same clock, including slower frames.
    let elapsed = (Math.max(0, Math.min(100, ms)) * TICK_MS) / Math.ceil(TICK_MS);
    if (input)
      while (elapsed > 0) {
        const step = Math.min(TICK_MS, elapsed);
        predictMovement(pose, input, step);
        elapsed -= step;
      }
    pose.y = reference.y;
    if (reference.velocityY === undefined) delete pose.velocityY;
    else pose.velocityY = reference.velocityY;
    const tx = reference.x + correction.x,
      tz = reference.z + correction.z;
    const distance = Math.hypot(tx - pose.x, tz - pose.z);
    const blend = distance > 0.15 ? 1 : 1 - Math.exp(-Math.max(0, ms) / 250);
    const nextX = pose.x + (tx - pose.x) * blend,
      nextZ = pose.z + (tz - pose.z) * blend;
    // Reconciliation must never move the view through a wall or crate corner.
    if (isMovementBlocked(nextX, reference.y, nextZ, !!reference.crouched)) {
      pose.x = reference.x;
      pose.z = reference.z;
    } else {
      pose.x = nextX;
      pose.z = nextZ;
    }
    return pose;
  }
}

/** Presentation only: never changes the authoritative or replayed physics pose. */
export class CameraCorrection {
  x = 0;
  y = 0;
  z = 0;
  reset() {
    this.x = this.y = this.z = 0;
  }
  reconcile(before: Player, after: Player) {
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.z += before.z - after.z;
    if (Math.hypot(this.x, this.y, this.z) > 0.5) this.reset();
  }
  update(ms: number) {
    const decay = Math.exp(-Math.max(0, ms) / 65);
    this.x *= decay;
    this.y *= decay;
    this.z *= decay;
  }
}

type Pose = Pick<Player, "x" | "y" | "z" | "yaw" | "pitch"> & { at: number };
/** Interpolate only received, visible poses. No prediction of hidden opponents. */
export class RemotePresentation {
  private readonly poses: Pose[] = Array.from({ length: 8 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    at: 0,
  }));
  private start = 0;
  private count = 0;
  clear() {
    this.start = this.count = 0;
  }
  push(player: Player, at: number) {
    const last = this.count ? this.poses[(this.start + this.count - 1) % 8] : undefined;
    if (last && at <= last.at) return;
    if (last && Math.hypot(player.x - last.x, player.y - last.y, player.z - last.z) > 3)
      this.clear();
    const pose = this.poses[(this.start + this.count) % 8]!;
    pose.x = player.x;
    pose.y = player.y;
    pose.z = player.z;
    pose.yaw = player.yaw;
    pose.pitch = player.pitch;
    pose.at = at;
    if (this.count < 8) this.count++;
    else this.start = (this.start + 1) % 8;
  }
  sample(at: number, out: Pose) {
    if (!this.count) return false;
    let a = this.poses[this.start]!,
      b = a;
    for (let i = 0; i < this.count; i++) {
      const pose = this.poses[(this.start + i) % 8]!;
      b = pose;
      if (pose.at >= at) break;
      a = pose;
    }
    const t = a.at === b.at ? 0 : Math.max(0, Math.min(1, (at - a.at) / (b.at - a.at)));
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    out.z = a.z + (b.z - a.z) * t;
    out.yaw = a.yaw + Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) * t;
    out.pitch = a.pitch + (b.pitch - a.pitch) * t;
    out.at = at;
    return true;
  }
}

/** Bounded framebuffer cost; sustained slow frames lower scale, with slow recovery. */
export class RenderBudget {
  scale = 1;
  private elapsed = 0;
  private slow = 0;
  private frames = 0;
  private fastWindows = 0;
  update(ms: number) {
    if (ms <= 0 || ms > 1000) return false;
    // Sustained single-digit FPS must still trigger adaptation. Cap individual
    // stalls so one shader compilation or scheduler pause cannot dominate it.
    ms = Math.min(ms, 100);
    this.elapsed += ms;
    this.frames++;
    if (ms > 18.5) this.slow++;
    if (this.elapsed < 1500) return false;
    const ratio = this.slow / this.frames,
      before = this.scale;
    this.elapsed = this.slow = this.frames = 0;
    if (ratio > 0.05) {
      this.scale = Math.max(0.6, this.scale - 0.1);
      this.fastWindows = 0;
    } else if (ratio < 0.02) {
      if (++this.fastWindows >= 8) {
        this.scale = Math.min(1, this.scale + 0.1);
        this.fastWindows = 0;
      }
    } else this.fastWindows = 0;
    return Math.abs(before - this.scale) > 0.001;
  }
  ratio(width: number, height: number, deviceRatio: number) {
    return (
      Math.min(deviceRatio, 1.25, Math.sqrt(1_500_000 / Math.max(1, width * height))) * this.scale
    );
  }
}
