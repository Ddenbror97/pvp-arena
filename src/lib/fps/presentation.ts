import type { Player } from "./protocol";

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
  private fastWindows = 0;
  update(ms: number) {
    if (ms <= 0 || ms > 1000) return false;
    // Sustained single-digit FPS must still trigger adaptation. Cap individual
    // stalls so one shader compilation or scheduler pause cannot dominate it.
    ms = Math.min(ms, 100);
    this.elapsed += ms;
    if (ms > 19) this.slow += ms;
    if (this.elapsed < 1500) return false;
    const ratio = this.slow / this.elapsed,
      before = this.scale;
    this.elapsed = this.slow = 0;
    if (ratio > 0.25) {
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
