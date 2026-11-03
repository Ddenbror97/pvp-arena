import type { MatchState, Player, Seat } from "../../src/lib/fps/protocol";
import { MAX_REWIND_MS } from "../../src/lib/fps/network";
/** Server-measured command wait has an independent bound, shared by both modes. */
export const MAX_SERVER_DELAY_MS = 200;
export type CombatPose = Pick<Player, "x" | "y" | "z" | "crouched"> & { stance?: number };
/** Bounded server-owned pose history, independent of a mode's player count. */
export class PlayerPoseHistory<Id extends string | number> {
  private round = 0;
  private frames: Array<{ at: number; players: Map<Id, CombatPose> }> = [];
  record(round: number, live: boolean, players: Iterable<readonly [Id, CombatPose]>, at: number) {
    if (this.round !== round || !live) this.frames = [];
    this.round = round;
    if (!live) return;
    const poses = new Map<Id, CombatPose>();
    for (const [id, p] of players)
      poses.set(id, { x: p.x, y: p.y, z: p.z, crouched: !!p.crouched });
    this.frames.push({ at, players: poses });
    while (
      this.frames.length > 24 ||
      (this.frames[0] && this.frames[0].at < at - MAX_REWIND_MS - MAX_SERVER_DELAY_MS - 2 * 34)
    )
      this.frames.shift();
  }
  target(id: Id, now: number, lookbackMs: number, serverDelayMs = 0): CombatPose | undefined {
    if (!Number.isFinite(lookbackMs) || lookbackMs <= 0 || !this.frames.length) return;
    const delay = Number.isFinite(serverDelayMs)
      ? Math.max(0, Math.min(MAX_SERVER_DELAY_MS, serverDelayMs))
      : 0;
    const at = now - delay - Math.min(MAX_REWIND_MS, lookbackMs);
    if (at < this.frames[0]!.at) return;
    let a = this.frames[0]!,
      b = a;
    for (const frame of this.frames) {
      b = frame;
      if (frame.at >= at) break;
      a = frame;
    }
    const p = a.players.get(id),
      q = b.players.get(id);
    if (!p || !q) return;
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
/** Preserve the existing two-seat API and semantics for 1v1. */
export class ShotHistory {
  private history = new PlayerPoseHistory<Seat>();
  record(state: MatchState, at: number) {
    this.history.record(
      state.round,
      state.phase === "live",
      [
        ["A", state.players.A],
        ["B", state.players.B],
      ],
      at,
    );
  }
  target(seat: Seat, now: number, lookbackMs: number, serverDelayMs = 0) {
    return this.history.target(seat, now, lookbackMs, serverDelayMs);
  }
}
