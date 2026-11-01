import type { MatchState, Player, Seat } from "../../src/lib/fps/protocol";
import { MAX_REWIND_MS } from "../../src/lib/fps/network";
export type CombatPose = Pick<Player, "x" | "y" | "z" | "crouched"> & { stance?: number };
type Frame = { at: number; players: Record<Seat, CombatPose> };
/** Private authoritative history; never serialised to a player or supplied by one. */
export class ShotHistory {
  private round = 0;
  private frames: Frame[] = [];
  record(state: MatchState, at: number) {
    if (this.round !== state.round || state.phase !== "live") this.frames = [];
    this.round = state.round;
    if (state.phase !== "live") return;
    const pose = (p: Player): CombatPose => ({ x: p.x, y: p.y, z: p.z, crouched: !!p.crouched });
    this.frames.push({ at, players: { A: pose(state.players.A), B: pose(state.players.B) } });
    while (this.frames.length > 16 || (this.frames[0] && this.frames[0].at < at - 250))
      this.frames.shift();
  }
  target(seat: Seat, now: number, lookbackMs: number): CombatPose | undefined {
    if (!Number.isFinite(lookbackMs) || lookbackMs <= 0 || !this.frames.length) return;
    const at = now - Math.min(MAX_REWIND_MS, lookbackMs);
    if (at < this.frames[0]!.at) return;
    let a = this.frames[0]!,
      b = a;
    for (const frame of this.frames) {
      b = frame;
      if (frame.at >= at) break;
      a = frame;
    }
    const p = a.players[seat],
      q = b.players[seat];
    if (Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) > 1.5) return;
    const t = a.at === b.at ? 0 : Math.max(0, Math.min(1, (at - a.at) / (b.at - a.at)));
    return {
      x: p.x + (q.x - p.x) * t,
      y: p.y + (q.y - p.y) * t,
      z: p.z + (q.z - p.z) * t,
      crouched: t < 1 ? p.crouched : q.crouched,
      stance: (p.crouched ? 1 : 0) * (1 - t) + (q.crouched ? 1 : 0) * t,
    };
  }
}
