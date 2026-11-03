import { AWP } from "./primary";
import { AWP_TIMELINE } from "./awp-timeline";

/**
 * The AWP's single true-4× zoom: the vertical field of view whose tangent is a quarter of the
 * unzoomed one, so everything on screen is exactly four times larger.
 */
export function scopedFov(baseFovDeg: number, zoom: number = AWP.zoom) {
  const half = (baseFovDeg * Math.PI) / 360;
  return (Math.atan(Math.tan(half) / zoom) * 360) / Math.PI;
}

/** Mouse sensitivity scale while zoomed: angles shrink with the tangent, so aim feels the same. */
export const SCOPED_SENSITIVITY = 1 / AWP.zoom;

/** What the client knows about its own player when predicting the server's zoom. */
export type ScopeSubject = {
  hp: number;
  weapon: import("./protocol").Weapon;
  primary?: "rifle" | "awp";
  reloadUntil: number;
  lastShotAt: number;
};

/**
 * Client-side AWP zoom. Right mouse toggles the wish (`wanted`), sent to the server every input
 * tick as `input.scope`; the server decides (primary.ts updateScope) and the client predicts the
 * same rule so zooming is immediate. A shot drops the zoom (CS: it resumes after the bolt if the
 * wish is still held); a reload, a weapon switch, death or a new round cancel the wish.
 */
export class AwpScope {
  wanted = false;
  /** Presentation 0 (hip) → 1 (fully zoomed), eased over AWP_TIMELINE.adsMs. */
  progress = 0;
  /** Local shot presented at this client time: the zoom is predicted off until the bolt cycles. */
  private shotAt = -Infinity;
  private wasReloading = false;
  toggle() {
    this.wanted = !this.wanted;
    return this.wanted;
  }
  reset() {
    this.wanted = false;
    this.progress = 0;
    this.shotAt = -Infinity;
    this.wasReloading = false;
  }
  /** The local trigger pull was presented: zoom drops at once (it may resume after the bolt). */
  shot(now: number) {
    this.shotAt = now;
    this.progress = 0;
  }
  /**
   * Advance one frame. `serverNow` is the estimated server clock; `now` the client clock of the
   * `shot()` calls. Returns whether the zoom is (predicted) on, so the caller can play the
   * zoom sounds on its edges.
   */
  update(p: ScopeSubject | null, dt: number, now: number, serverNow: number) {
    const awp = !!p && p.primary === "awp" && p.weapon === "rifle" && p.hp > 0;
    const reloading = !!p && p.reloadUntil > serverNow;
    // A reload cancels the zoom wish (CS: no resume zoom after a reload).
    if (reloading && !this.wasReloading) this.wanted = false;
    this.wasReloading = reloading;
    if (!awp) this.wanted = false;
    const cycling =
      now - this.shotAt < AWP.cycleMs || (!!p && serverNow - p.lastShotAt < AWP.cycleMs);
    const on = this.wanted && awp && !reloading && !cycling;
    const step = dt / AWP_TIMELINE.adsMs;
    this.progress = on ? Math.min(1, this.progress + step) : Math.max(0, this.progress - step * 2);
    return on;
  }
  /** Eased presentation amount (smoothstep). */
  get amount() {
    const t = this.progress;
    return t * t * (3 - 2 * t);
  }
  /** The lens and reticle are drawn (and the viewmodel hidden) past the halfway point. */
  get overlay() {
    return this.progress >= 0.5;
  }
  /** World camera field of view for this frame. */
  fov(base: number) {
    // The FOV snaps in with the lens (sniper zoom is optical, not a slow dolly).
    return this.overlay ? scopedFov(base) : base;
  }
  sensitivity() {
    return this.overlay ? SCOPED_SENSITIVITY : 1;
  }
}
