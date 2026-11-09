import { advanceCombatRecoil, recoverCombatRecoil, type RecoilPattern } from "../combat";
import type { Player } from "../protocol";
export type BrRecoilState = {
  pitch: number;
  yaw: number;
  spray: number;
  shotAt: number;
  updatedAt: number;
  shots: number;
};
/** Predict the same recoil the server adds to aim; replay only shots not acknowledged yet. */
export class BrAimRecoil {
  private base: BrRecoilState = {
    pitch: 0,
    yaw: 0,
    spray: 0,
    shotAt: -1e9,
    updatedAt: 0,
    shots: 0,
  };
  private pending: Array<{
    id: number;
    at: number;
    rifle: boolean;
    scale: number;
    pattern: RecoilPattern;
  }> = [];
  /** The pattern of the gun that fired last (its recovery speed applies, as on the server). */
  private pattern: RecoilPattern = "rifle";
  private serial = 0;
  private pitch = 0;
  private yaw = 0;
  reset() {
    this.pending = [];
    this.pitch = this.yaw = 0;
    this.serial = this.base.shots;
  }
  sync(state: BrRecoilState) {
    if (state.shots < this.base.shots) {
      this.pending = [];
      this.serial = state.shots;
      this.pitch = this.yaw = 0;
    }
    this.base = { ...state };
    this.serial = Math.max(this.serial, state.shots);
    this.pending = this.pending.filter((s) => s.id > state.shots);
  }
  shot(at: number, rifle: boolean, scale: number, pattern: RecoilPattern = "rifle") {
    if (!this.pending.length) this.serial = this.base.shots;
    if (rifle) this.pattern = pattern;
    this.pending.push({ id: ++this.serial, at, rifle, scale, pattern });
    if (this.pending.length > 16) this.pending.shift();
  }
  sample(now: number, dt: number) {
    this.pending = this.pending.filter((s) => now - s.at < 500 && s.id > this.base.shots);
    const p = {
      weapon: "rifle",
      recoilPattern: this.pattern,
      recoilPitch: this.base.pitch,
      recoilYaw: this.base.yaw,
      sprayCount: this.base.spray,
      lastShotAt: this.base.shotAt,
      recoilUpdatedAt: this.base.updatedAt,
    } as Player & { recoilPattern?: RecoilPattern };
    for (const s of this.pending) {
      if (s.at < p.lastShotAt) continue;
      recoverCombatRecoil(p, s.at);
      if (s.rifle) {
        p.recoilPattern = s.pattern;
        const a = p.recoilPitch!,
          b = p.recoilYaw!;
        advanceCombatRecoil(p);
        p.recoilPitch = a + (p.recoilPitch! - a) * s.scale;
        p.recoilYaw = b + (p.recoilYaw! - b) * s.scale;
      }
      p.lastShotAt = s.at;
    }
    recoverCombatRecoil(p, now);
    const k = 1 - Math.exp(-Math.max(0, Math.min(100, dt)) / 25);
    this.pitch += (p.recoilPitch! - this.pitch) * k;
    this.yaw += (p.recoilYaw! - this.yaw) * k;
    return { pitch: this.pitch, yaw: this.yaw };
  }
}
