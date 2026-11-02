import type { Input, Player } from "./protocol";
import { isMovementBlocked, predictMovement, TICK_MS } from "./simulation";
import { eyeHeight } from "./map";
import { DEFAULT_MAP, type GameMap } from "./maps/registry";

/** Interpolate feet height on the fixed simulation clock, including landing.
 * Partial physics previews use a different gravity step and can anticipate a
 * queued jump. Keep those previews out of the vertical camera timeline. */
export class JumpPresentation {
  private from: number | null = null;
  private to = 0;
  reset() {
    this.from = null;
  }
  advance(before: number, after: number) {
    this.from = before;
    this.to = after;
  }
  sample(current: number, fraction: number) {
    if (this.from === null) return current;
    // Reconciliation moves both endpoints together; CameraCorrection absorbs
    // the corresponding server correction without rewinding jump progress.
    return current + (this.from - this.to) * (1 - Math.max(0, Math.min(1, fraction)));
  }
}

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
  /** The match's map: camera motion collides exactly like movement. */
  constructor(private readonly map: GameMap = DEFAULT_MAP) {}
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
        predictMovement(pose, input, step, this.map);
        elapsed -= step;
      }
    pose.y = reference.y;
    if (reference.velocityY === undefined) delete pose.velocityY;
    else pose.velocityY = reference.velocityY;
    const tx = reference.x + correction.x,
      tz = reference.z + correction.z;
    const distance = Math.hypot(tx - pose.x, tz - pose.z);
    // Direction changes can legitimately differ by a whole 34 ms input tick.
    // The old 15 cm threshold converted that small timing error into a teleport.
    // Integrate current controls immediately, then repay positional error with a
    // continuous, bounded correction. Only actual teleports reset presentation.
    if (
      distance > 3 ||
      isMovementBlocked(pose.x, reference.y, pose.z, !!reference.crouched, this.map)
    ) {
      pose.x = reference.x;
      pose.z = reference.z;
    } else {
      const elapsedMs = Math.max(0, Math.min(100, ms));
      const blend = 1 - Math.exp(-elapsedMs / 65),
        limit = elapsedMs * 0.002;
      // Resolve each axis separately. Normalizing the error vector lets a
      // blocked X correction starve the Z clearance needed to leave a corner.
      const nextX = pose.x + Math.max(-limit, Math.min(limit, (tx - pose.x) * blend)),
        nextZ = pose.z + Math.max(-limit, Math.min(limit, (tz - pose.z) * blend));
      // Slide corrections along cover instead of snapping to the reference
      // when one axis intersects a corner. Movement uses the same occupancy.
      if (!isMovementBlocked(nextX, reference.y, pose.z, !!reference.crouched, this.map))
        pose.x = nextX;
      if (!isMovementBlocked(pose.x, reference.y, nextZ, !!reference.crouched, this.map))
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

type Pose = Pick<Player, "x" | "y" | "z" | "yaw" | "pitch"> & { at: number; crouch?: number };
type TimedPose = Pose & {
  /** Physics time of the first redacted snapshot after this pose (Infinity: none). */
  hiddenFrom: number;
  /** A redacted interval separates this pose from the previous one. */
  afterGap: boolean;
};
/** Visible opponent playback, with a bounded horizontal bridge for late packets.
 * Server visibility redaction is part of the same timeline: a hidden snapshot hides the
 * opponent when playback reaches that snapshot's physics time, not when it arrives.
 * Applying it on arrival removed the opponent about one interpolation delay plus network
 * latency early, in the open, before the rendered pose had reached cover. */
export class RemotePresentation {
  /** The match's map: late-packet bridging never extrapolates into its solids. */
  constructor(private readonly map: GameMap = DEFAULT_MAP) {}
  private readonly poses: TimedPose[] = Array.from({ length: 8 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    at: 0,
    hiddenFrom: Infinity,
    afterGap: false,
  }));
  /** Longest late-packet extrapolation; beyond it the opponent holds its newest pose. */
  bridgeMs = 50;
  private latestAt = -Infinity;
  private hiddenWithoutPose = false;
  private start = 0;
  private count = 0;
  private playbackAt: number | null = null;
  private projected = false;
  private projectionAllowed = false;
  private crouched = false;
  private correctionX = 0;
  private correctionZ = 0;
  private renderedX = 0;
  private renderedZ = 0;
  private readonly scratch: Pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
  clear() {
    this.start = this.count = 0;
    this.latestAt = -Infinity;
    this.hiddenWithoutPose = false;
    this.playbackAt = null;
    this.projected = this.projectionAllowed = false;
    this.correctionX = this.correctionZ = 0;
  }
  push(player: Player, at: number, visible = true) {
    // Frames apply in physics-time order only; a stale frame never rewinds playback.
    if (!Number.isFinite(at) || at <= this.latestAt) return;
    this.latestAt = at;
    let last = this.count ? this.poses[(this.start + this.count - 1) % 8] : undefined;
    if (!visible) {
      // Redacted frames carry no pose. Mark when the opponent left view on the timeline.
      if (last && last.hiddenFrom === Infinity) last.hiddenFrom = at;
      if (!last) this.hiddenWithoutPose = true;
      this.projectionAllowed = false;
      this.projected = false;
      this.correctionX = this.correctionZ = 0;
      return;
    }
    const afterGap = (!!last && last.hiddenFrom !== Infinity) || this.hiddenWithoutPose;
    this.hiddenWithoutPose = false;
    if (last && Math.hypot(player.x - last.x, player.y - last.y, player.z - last.z) > 3) {
      this.clear();
      this.latestAt = at;
      last = undefined;
    }
    const pose = this.poses[(this.start + this.count) % 8]!;
    pose.hiddenFrom = Infinity;
    pose.afterGap = afterGap;
    pose.x = player.x;
    pose.y = player.y;
    pose.z = player.z;
    pose.yaw = player.yaw;
    pose.pitch = player.pitch;
    pose.crouch = player.crouched ? 1 : 0;
    pose.at = at;
    if (this.count < 8) this.count++;
    else this.start = (this.start + 1) % 8;
    this.projectionAllowed = player.hp > 0 && player.y === 0 && !(player.velocityY ?? 0);
    this.crouched = !!player.crouched;
    if (this.projected && this.playbackAt !== null) {
      // Repay a late packet's correction over frames instead of snapping the
      // projected or held distance in a single frame. Beyond 1.5 m (a long outage) the
      // pose is too stale to glide from; snap to the authoritative timeline instead.
      this.sample(this.playbackAt, this.scratch);
      this.correctionX = this.renderedX - this.scratch.x;
      this.correctionZ = this.renderedZ - this.scratch.z;
      if (Math.hypot(this.correctionX, this.correctionZ) > 1.5)
        this.correctionX = this.correctionZ = 0;
    }
    // Keep the flag until the next draw: a post-stall burst delivers several packets in
    // one frame, and each must recompute the correction against the last drawn pose.
    if (!this.projectionAllowed) this.correctionX = this.correctionZ = 0;
  }
  /** Apply one snapshot: its bundled intermediate physics poses first, then its own pose. */
  pushFrame(
    player: Player,
    poseAt: number,
    visible: boolean,
    trail?: ReadonlyArray<{ poseAt: number; pose?: Partial<Player> }>,
  ) {
    if (trail)
      for (const entry of [...trail].sort((a, b) => a.poseAt - b.poseAt))
        if (entry.poseAt < poseAt)
          this.push({ ...player, ...(entry.pose ?? {}) } as Player, entry.poseAt, !!entry.pose);
    this.push(player, poseAt, visible);
  }
  /**
   * Horizontal velocity (m/ms) of the authoritative path around `at`, from the visible
   * segment containing it (never across a hidden interval). Side-effect free.
   */
  velocity(at: number): { x: number; z: number } {
    let best: { x: number; z: number } | null = null;
    for (let i = 0; i + 1 < this.count; i++) {
      const a = this.poses[(this.start + i) % 8]!,
        b = this.poses[(this.start + i + 1) % 8]!;
      if (b.at <= a.at || b.afterGap || a.hiddenFrom !== Infinity) {
        best = null;
        continue;
      }
      best = { x: (b.x - a.x) / (b.at - a.at), z: (b.z - a.z) / (b.at - a.at) };
      if (b.at >= at) break;
    }
    return best ?? { x: 0, z: 0 };
  }
  sample(at: number, out: Pose, elapsedMs?: number) {
    if (!this.count) return false;
    if (elapsedMs !== undefined) {
      // Playback is a clock, not a physics integration step. Capping a 400 ms
      // render stall to 100 ms leaves opponents 300 ms behind for many seconds.
      const elapsed = Math.max(0, Math.min(1000, elapsedMs));
      if (this.playbackAt !== null && Math.abs(at - this.playbackAt) < 1000) {
        const next = this.playbackAt + elapsed;
        // Network clock estimates change when packets arrive. Repay that phase
        // error gradually; never play an approaching enemy backward for a frame.
        at = next + Math.max(-elapsed * 0.05, Math.min(elapsed * 0.05, at - next));
      }
      this.playbackAt = at;
    }
    let a = this.poses[this.start]!,
      b = a;
    for (let i = 0; i < this.count; i++) {
      const pose = this.poses[(this.start + i) % 8]!;
      b = pose;
      if (pose.at >= at) break;
      a = pose;
    }
    // Redacted on the timeline: before the first pose after a hidden interval, or after
    // the newest visible pose once playback passes its redaction time.
    if (at >= b.at) a = b; // exactly on a pose: draw that pose
    const gap = a !== b && b.afterGap;
    if ((a === b && at < a.at && a.afterGap) || ((gap || at > a.at) && at >= a.hiddenFrom)) {
      this.projected = false;
      return false;
    }
    // Never interpolate across a hidden interval (the path behind cover is unknown).
    if (gap) b = a;
    const t = a.at === b.at ? 0 : Math.max(0, Math.min(1, (at - a.at) / (b.at - a.at)));
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    out.z = a.z + (b.z - a.z) * t;
    out.yaw = a.yaw + Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)) * t;
    out.pitch = a.pitch + (b.pitch - a.pitch) * t;
    out.crouch = (a.crouch ?? 0) + ((b.crouch ?? 0) - (a.crouch ?? 0)) * t;
    out.at = at;
    if (elapsedMs !== undefined) {
      const newest = this.poses[(this.start + this.count - 1) % 8]!;
      const previous = this.poses[(this.start + this.count - 2 + 8) % 8]!;
      this.projected = false;
      if (
        this.projectionAllowed &&
        this.count > 1 &&
        at > newest.at &&
        newest.hiddenFrom === Infinity &&
        !newest.afterGap
      ) {
        const span = newest.at - previous.at;
        const ahead = Math.min(this.bridgeMs, at - newest.at);
        const dx = newest.x - previous.x,
          dz = newest.z - previous.z;
        // Never bridge a teleport, airborne motion, or a stale history window.
        if (span > 0 && span <= 150 && Math.hypot(dx, dz) / span <= 0.0076) {
          const x = newest.x + (dx * ahead) / span,
            z = newest.z + (dz * ahead) / span;
          if (!isMovementBlocked(x, newest.y, z, this.crouched, this.map)) {
            out.x = x;
            out.z = z;
            this.projected = true;
          }
        }
      }
      // Holding the newest pose (beyond the bridge, or no bridge allowed) also needs the
      // catch-up to be repaid smoothly when delayed packets arrive after a stall.
      if (at > newest.at && newest.hiddenFrom === Infinity) this.projected = true;
      const decay = Math.exp(-Math.max(0, elapsedMs) / 65);
      this.correctionX *= decay;
      this.correctionZ *= decay;
      if (
        !isMovementBlocked(
          out.x + this.correctionX,
          out.y,
          out.z + this.correctionZ,
          this.crouched,
          this.map,
        )
      ) {
        out.x += this.correctionX;
        out.z += this.correctionZ;
      }
      this.renderedX = out.x;
      this.renderedZ = out.z;
    }
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
