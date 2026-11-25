/**
 * The battle royale's adaptive resolution (production performance audit, 2026-11-24).
 *
 * The shared RenderBudget (presentation.ts, still used by 1v1 and Defuse the Bomb) lowers the
 * scale whenever frames run late and raises it only after long runs of fast frames, holding a
 * scale that once failed as a ceiling for up to 3.2 minutes. Measured on the owner's laptop
 * that blurred the picture for nothing: on the Intel UHD the frames were late because of the
 * CPU (19-25 ms of script) and the scale fell to 0.7; on the RTX 2050 a 30-second CPU spike
 * dropped it to 0.7 for the rest of the run. A lower resolution saves GPU time only.
 *
 * Here:
 *  - A window of late frames lowers the scale only when the GPU is the bottleneck: its own
 *    time (timer queries) is most of the frame. Where the browser has no timer queries
 *    (Safari; Firefox), a step down is a trial: if the frames are not clearly faster two
 *    windows later the step is undone, and no step below that scale is tried again for a
 *    minute (then two, four ... at most eight).
 *  - With timer queries the scale goes back up as soon as the GPU has the headroom for it,
 *    predicted from its time now and the pixels the next step adds (or from what it measured
 *    at that step in the last 20 seconds), with a margin below the drop's threshold so a GPU at
 *    the boundary does not step up and down. Without them, as quickly where the whole
 *    frame is that fast (a display above 60 Hz shows it), else as before: after a run of fast
 *    windows, with the doubling wait at a scale that failed.
 *  - Isolated stalls (loading, a shader compile, GC) never count, as in RenderBudget.
 *
 * Only what is drawn changes (resolution, the ground's detail): nothing that hides or reveals
 * a player (fairness boundary).
 */

/** A window: the budget decides once per this many ms of frames. */
const WINDOW_MS = 1500;
/** A frame slower than this is late (54 fps). */
export const SLOW_MS = 18.5;
/** A frame this long is a stall (loading, GC, a compile), not load: two 60 Hz misses. */
const STALL_MS = 40;
/** Stalls in at most this share of a window's frames are isolated hitches. */
const STALL_SHARE = 0.1;
/** Late frames in more than this share of a window: the window is slow. */
const SLOW_SHARE = 0.05;
/** The GPU is the bottleneck when its time is at least this share of the frame. */
export const GPU_SHARE = 0.8;
/** Step up only if the next step's predicted GPU time is under this (ms): 30 % below SLOW_MS. */
export const RAISE_GPU_MS = SLOW_MS * 0.7;
/** A margin on the predicted cost of the next step (the ground's detail comes back with it). */
const RAISE_MARGIN = 1.15;
/** Windows the headroom must hold before a step up (3 s). */
const RAISE_WINDOWS = 2;
/** A step's measured GPU time is used for this many windows (about 20 s). */
const SEEN_WINDOWS = 13;
/** Windows after a step down that decide whether it helped. */
const TRIAL_WINDOWS = 2;
/** A step down that left the frames within this share of before did not help. */
const TRIAL_GAIN = 0.92;
/** After an unhelpful step, no step below that scale for this many windows (1 min), doubling. */
const HOLD_WINDOWS = 40;
const HOLD_MAX = 320;

export const BUDGET_MIN = 0.6;

/**
 * The low tier's late frame (33 fps). Its native size is already 720p, and below it the picture
 * of a town or a forest is a few pixels a building or a tree that blink as the camera moves
 * (owner, Intel UHD, 2026-11-24: at SLOW_MS the budget held it at 896 × 504 almost everywhere,
 * at 54–99 fps). So on the low tier the resolution gives way only to keep the game above 30 fps.
 */
export const LOW_TIER_SLOW_MS = 30;

const round = (s: number) => Math.round(s * 10) / 10;

export type BrBudgetOptions = {
  /** The resolution a budget scale draws at (br-settings.ts brResolutionScale). */
  resolution: (scale: number) => number;
  /** A frame slower than this is late (ms; default SLOW_MS). */
  slowMs?: number | undefined;
};

export class BrRenderBudget {
  scale = 1;
  /** Why the scale last changed (dev overlay, lab). */
  reason = "";
  private readonly resolution: (scale: number) => number;
  private readonly slowMs: number;
  /** Step up only if the next step's predicted GPU time is under this (ms). */
  private readonly raiseGpuMs: number;
  private window = 0;
  // This window's frames.
  private elapsed = 0;
  private frames = 0;
  private slow = 0;
  private stalls = 0;
  private sumMs = 0;
  private sumGpu = 0;
  private gpuFrames = 0;
  // Stepping up.
  private fastWindows = 0;
  /** Without timer queries: the lowest scale that was too slow, retried after `retryWindows`. */
  private ceiling = Infinity;
  private retryWindows = 8;
  private heldWindows = 0;
  /** GPU time measured at each scale, and the window it was measured in. */
  private readonly seen = new Map<number, { gpu: number; at: number }>();
  /**
   * A step down being judged: the scale it left, the frame time before it, and the GPU's time
   * before and during it (null without timer queries).
   */
  private trial: {
    from: number;
    before: number;
    windows: number;
    sum: number;
    gpuBefore: number | null;
    gpuSum: number;
    gpuWindows: number;
  } | null = null;
  /**
   * The share of the GPU's time that follows the pixels, as the last resolution step measured
   * it (1 until one has: every pixel's). Intel UHD's is a fifth to a half; a step back up is
   * predicted with it, so a resolution lowered in a heavy place comes back where it can.
   */
  pixelShare = 1;
  /** No step below `scale` before window `until` (a step that did not help). */
  private hold: { scale: number; until: number } | null = null;
  private holdWindows = HOLD_WINDOWS;

  constructor(options: BrBudgetOptions) {
    this.resolution = options.resolution;
    this.slowMs = options.slowMs ?? SLOW_MS;
    this.raiseGpuMs = this.slowMs * (RAISE_GPU_MS / SLOW_MS);
  }

  /**
   * One displayed frame: its interval (ms) and the GPU's latest measured frame time (ms;
   * null where the browser has no timer queries or none has arrived). True when the scale
   * changed (the caller resizes).
   */
  update(ms: number, gpuMs: number | null): boolean {
    if (!(ms > 0) || ms > 1000) return false;
    ms = Math.min(ms, 100);
    this.elapsed += ms;
    this.frames++;
    if (ms >= STALL_MS) this.stalls++;
    else {
      this.sumMs += ms;
      if (ms > this.slowMs) this.slow++;
    }
    if (gpuMs !== null && Number.isFinite(gpuMs) && gpuMs >= 0) {
      this.sumGpu += gpuMs;
      this.gpuFrames++;
    }
    if (this.elapsed < WINDOW_MS) return false;
    return this.decide();
  }

  private decide(): boolean {
    this.window++;
    const sustained = this.stalls > this.frames * STALL_SHARE;
    // Late frames: the stalls count only when they are most of the window (sustained).
    const counted = sustained ? this.frames : this.frames - this.stalls;
    const late = (this.slow + (sustained ? this.stalls : 0)) / Math.max(1, counted);
    const meanMs = sustained
      ? this.elapsed / Math.max(1, this.frames)
      : this.sumMs / Math.max(1, this.frames - this.stalls);
    // The GPU's time, where most of the window's frames had a measurement.
    const gpu = this.gpuFrames >= this.frames / 2 ? this.sumGpu / this.gpuFrames : null;
    this.elapsed = this.frames = this.slow = this.stalls = this.sumMs = 0;
    this.sumGpu = this.gpuFrames = 0;
    const before = this.scale;
    if (gpu !== null) this.seen.set(before, { gpu, at: this.window });

    // A step down being judged: undone if the frames did not get clearly faster.
    if (this.trial) {
      const t = this.trial;
      t.sum += meanMs;
      if (gpu !== null) {
        t.gpuSum += gpu;
        t.gpuWindows++;
      }
      if (++t.windows < TRIAL_WINDOWS) return false;
      this.trial = null;
      // What the step took off the GPU's time: the share of it that is the pixels'.
      const q = this.resolution(before) / Math.max(1e-6, this.resolution(t.from));
      if (t.gpuBefore !== null && t.gpuWindows && q < 1 - 1e-6)
        this.pixelShare = Math.min(
          1,
          Math.max(0.1, (1 - t.gpuSum / t.gpuWindows / t.gpuBefore) / (1 - q * q)),
        );
      if (t.sum / t.windows > t.before * TRIAL_GAIN) {
        this.scale = t.from;
        this.hold = { scale: t.from, until: this.window + this.holdWindows };
        this.holdWindows = Math.min(HOLD_MAX, this.holdWindows * 2);
        this.ceiling = Infinity;
        this.fastWindows = 0;
        this.reason = "a lower resolution did not help: restored";
        return true;
      }
      this.holdWindows = HOLD_WINDOWS;
    }

    const slowWindow = late > SLOW_SHARE;
    // Lower resolution only buys GPU time: where it is measured, only when it is most of the frame.
    const gpuBound = gpu === null ? true : gpu >= GPU_SHARE * meanMs;
    const held = this.hold && this.window < this.hold.until && before <= this.hold.scale + 1e-6;
    if (slowWindow && gpuBound && !held && before > BUDGET_MIN + 1e-6) {
      if (gpu === null) {
        // Without the GPU's time: as RenderBudget, a scale that failed is retried slowly.
        if (before >= this.ceiling - 1e-6) this.retryWindows = Math.min(128, this.retryWindows * 2);
        this.ceiling = Math.min(this.ceiling, before);
      }
      this.scale = round(Math.max(BUDGET_MIN, before - 0.1));
      // A step that lowers the resolution is a trial: undone, and not tried again for a
      // while, unless the frames got clearly faster. A GPU that is most of the frame need not
      // be the pixels' doing (Intel UHD, low tier, a Downtown fight: 0.8 of the pixels took its
      // GPU time from 17.7 to 16.5 ms and the game from 37 to 38.7 fps; release audit
      // 2026-11-24). Without the GPU's time every step is one, as before.
      if (gpu === null || this.resolution(this.scale) < this.resolution(before) - 1e-6)
        this.trial = {
          from: before,
          before: meanMs,
          windows: 0,
          sum: 0,
          gpuBefore: gpu,
          gpuSum: 0,
          gpuWindows: 0,
        };
      this.fastWindows = this.heldWindows = 0;
      this.reason = gpu === null ? "slow frames" : "GPU-bound frames";
      return true;
    }

    if (before >= 1 - 1e-6) {
      this.fastWindows = 0;
      return false;
    }
    const next = round(Math.min(1, before + 0.1));
    if (gpu !== null) {
      // Up as soon as the GPU has room for the next step, whatever else makes frames late.
      const known = this.seen.get(next);
      const fresh = known && this.window - known.at <= SEEN_WINDOWS ? known.gpu : null;
      const r = this.resolution(next) / Math.max(1e-6, this.resolution(before));
      // (The margin on a measured step too: a scale left for slow frames came back at once
      // when its own time was just under the line, and was left again, every few seconds.)
      const predicted = (fresh ?? gpu * (1 + this.pixelShare * (r * r - 1))) * RAISE_MARGIN;
      if (predicted < this.raiseGpuMs) {
        if (++this.fastWindows >= RAISE_WINDOWS) {
          this.scale = next;
          this.fastWindows = 0;
          this.reason = "GPU headroom";
          return true;
        }
      } else this.fastWindows = 0;
      return false;
    }
    // Without the GPU's time: frames so fast that even the whole frame, grown by the next
    // step's pixels, would leave the same headroom go up as quickly as with it (a display
    // faster than 60 Hz shows it; at 60 Hz vsync hides it and the slow path below decides).
    const r = this.resolution(next) / Math.max(1e-6, this.resolution(before));
    if (late < 0.02 && meanMs * r * r * RAISE_MARGIN < this.raiseGpuMs) {
      if (++this.fastWindows >= RAISE_WINDOWS) {
        this.scale = next;
        this.fastWindows = this.heldWindows = 0;
        this.ceiling = Infinity;
        this.retryWindows = 8;
        this.reason = "fast frames";
        return true;
      }
      return false;
    }
    // Otherwise after a run of fast windows (RenderBudget's hysteresis).
    if (++this.heldWindows >= 40 && before >= this.ceiling - 1e-6) {
      this.ceiling = Infinity;
      this.retryWindows = 8;
    }
    if (late < 0.02) {
      const needed = next >= this.ceiling - 1e-6 ? this.retryWindows : 8;
      if (++this.fastWindows >= needed) {
        this.scale = next;
        this.fastWindows = this.heldWindows = 0;
        this.reason = "fast frames";
        return true;
      }
    } else this.fastWindows = 0;
    return false;
  }
}
