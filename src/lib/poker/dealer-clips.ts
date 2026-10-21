/**
 * Frame sequences for the dealer. These are ordered poses from the two sprite
 * sheets, not consecutive frames of one recorded gesture. Missing travel
 * (a half-extended arm between the deck and a full reach) is not invented.
 *
 * The director still owns timing. A clip never delays a card, a bet, or a
 * payout. A newer pose replaces the clip; the same pose does not restart it.
 */
import type { DealerPose } from "./director";

export interface DealerFrameStep {
  frame: string;
  /** How long this pose stays up before the next one. The last step of a held clip is ignored. */
  ms: number;
}

export interface DealerClip {
  /** Higher clips replace lower ones. Dealing beats shuffle beats a reaction beats waiting. */
  rank: number;
  /** Stay on the last frame until a new clip arrives. */
  hold: boolean;
  /** One-shot clips return here when their steps elapse. */
  then?: string;
  frames: readonly DealerFrameStep[];
}

/**
 * Live clips follow the director pose. Gallery-only clips (point, thoughtful,
 * disappointed, cards) are not started by a game event.
 */
export const DEALER_CLIPS = {
  idle: { rank: 0, hold: true, frames: [{ frame: "idle", ms: 1 }] },
  wink: { rank: 10, hold: false, then: "idle", frames: [{ frame: "wink", ms: 420 }] },
  intro: {
    rank: 10,
    hold: true,
    frames: [
      { frame: "idle", ms: 320 },
      { frame: "wink", ms: 460 },
      { frame: "idle", ms: 1 },
    ],
  },
  shuffle: {
    rank: 40,
    hold: true,
    // shuffle-04 shows a neighbor's forearm fused to her left arm, so it is not used.
    frames: [
      { frame: "shuffle-01", ms: 180 },
      { frame: "shuffle-02", ms: 220 },
      { frame: "shuffle-03", ms: 320 },
      { frame: "shuffle-05", ms: 300 },
      { frame: "shuffle-01", ms: 1 },
    ],
  },
  deal: {
    rank: 50,
    hold: true,
    // No half-extended arm exists. deal-03, deal-04, and deal-reach keep a
    // neighbor's shoulder in the cutout, so the contact pose is deal-02.
    frames: [
      { frame: "shuffle-02", ms: 120 },
      { frame: "deal-02", ms: 360 },
      { frame: "deal-05", ms: 200 },
      { frame: "shuffle-01", ms: 1 },
    ],
  },
  "deal-side": {
    rank: 50,
    hold: true,
    frames: [
      { frame: "idle", ms: 90 },
      { frame: "deal-side", ms: 420 },
      { frame: "idle", ms: 1 },
    ],
  },
  reveal: {
    rank: 50,
    hold: true,
    frames: [
      { frame: "shuffle-02", ms: 80 },
      { frame: "deal-02", ms: 400 },
      { frame: "deal-05", ms: 180 },
      { frame: "shuffle-01", ms: 1 },
    ],
  },
  wait: { rank: 20, hold: true, frames: [{ frame: "waiting", ms: 1 }] },
  celebrate: {
    rank: 30,
    hold: false,
    then: "idle",
    frames: [{ frame: "celebrate", ms: 1200 }],
  },
  // Single poses. There is no travel into the point, the fan, or the frown.
  // The finger-on-chin cutout (playful-2) and the file named thoughtful (a point
  // with a neighbor's arm) are not used. Chin-on-hand is the clean thinking pose.
  point: { rank: 15, hold: true, frames: [{ frame: "point", ms: 1 }] },
  thoughtful: { rank: 15, hold: true, frames: [{ frame: "waiting", ms: 1 }] },
  disappointed: { rank: 30, hold: true, frames: [{ frame: "disappointed", ms: 1 }] },
  cards: { rank: 15, hold: true, frames: [{ frame: "cards-fan", ms: 1 }] },
} as const satisfies Record<string, DealerClip>;

export type DealerClipId = keyof typeof DEALER_CLIPS;

const POSE_CLIP: Record<DealerPose, DealerClipId> = {
  intro: "intro",
  idle: "idle",
  shuffle: "shuffle",
  deal: "deal",
  reveal: "reveal",
  wait: "wait",
  acknowledge: "celebrate",
};

/** Still frame when motion is reduced. One pose, no stepping. */
export const DEALER_RESTING: Record<DealerPose, string> = {
  intro: "idle",
  idle: "idle",
  shuffle: "shuffle-01",
  deal: "deal-02",
  reveal: "deal-02",
  wait: "waiting",
  acknowledge: "celebrate",
};

export function clipForPose(pose: DealerPose): DealerClipId {
  return POSE_CLIP[pose];
}

export function clipFrames(id: string): readonly string[] {
  const clip = DEALER_CLIPS[id as DealerClipId];
  if (!clip) return [];
  return clip.frames.map((f) => f.frame);
}

/** Time until a clip holds or returns. The held last step does not count. */
export function clipActiveMs(id: DealerClipId): number {
  const clip = DEALER_CLIPS[id];
  const steps = clip.hold ? clip.frames.slice(0, -1) : clip.frames;
  return steps.reduce((sum, step) => sum + step.ms, 0);
}

function restingFrame(id: DealerClipId): string {
  const poses = Object.keys(POSE_CLIP) as DealerPose[];
  for (const pose of poses) {
    if (POSE_CLIP[pose] === id) return DEALER_RESTING[pose];
  }
  return DEALER_CLIPS[id].frames[0]?.frame ?? "idle";
}

export interface DealerSample {
  frame: string;
  clip: string;
  /** When the next pose should be drawn. Null while holding or paused. */
  nextAt: number | null;
}

/**
 * Clock-driven clip player. React schedules the timeouts; this object only
 * decides which frame is up, so a stale callback cannot outrank a newer pose.
 */
export class DealerClipRunner {
  private token = 0;
  private clipId: DealerClipId = "idle";
  private poseName: DealerPose = "idle";
  private reduced = false;
  private startedAt = 0;
  private pausedAt: number | null = null;
  private dead = false;

  pose(pose: DealerPose, now: number, reduced: boolean): number {
    if (this.dead) return this.token;
    const next = clipForPose(pose);
    if (next === this.clipId && reduced === this.reduced && pose === this.poseName) return this.token;
    this.poseName = pose;
    this.reduced = reduced;
    this.pausedAt = null;
    this.clipId = next;
    this.startedAt = now;
    this.token += 1;
    return this.token;
  }

  /** Gallery and the idle wink. Always restarts, including a replay of the same clip. */
  play(id: DealerClipId, now: number, reduced = false): number {
    if (this.dead) return this.token;
    if (!(id in DEALER_CLIPS)) return this.token;
    this.reduced = reduced;
    this.pausedAt = null;
    this.clipId = id;
    this.startedAt = now;
    this.token += 1;
    return this.token;
  }

  /** A blink while she is resting. Ignored during a gameplay clip. */
  nudge(id: "wink", now: number): number {
    if (this.dead || this.reduced || this.clipId !== "idle") return this.token;
    return this.play(id, now);
  }

  pause(now: number) {
    if (this.pausedAt == null) this.pausedAt = now;
  }

  resume(now: number) {
    if (this.pausedAt == null) return;
    this.startedAt += now - this.pausedAt;
    this.pausedAt = null;
  }

  dispose() {
    this.dead = true;
    this.token += 1;
  }

  sample(now: number): DealerSample {
    if (this.dead) return { frame: "idle", clip: "idle", nextAt: null };
    if (this.reduced) {
      return { frame: restingFrame(this.clipId), clip: this.clipId, nextAt: null };
    }
    const t = this.pausedAt ?? now;
    this.settle(t);
    const clip = DEALER_CLIPS[this.clipId];
    const elapsed = t - this.startedAt;
    let acc = 0;
    for (let i = 0; i < clip.frames.length; i++) {
      const step = clip.frames[i]!;
      const end = acc + step.ms;
      const last = i === clip.frames.length - 1;
      if (elapsed < end || last) {
        const holding = last && clip.hold;
        const nextAt = this.pausedAt != null || holding ? null : this.startedAt + end;
        return { frame: step.frame, clip: this.clipId, nextAt };
      }
      acc = end;
    }
    const last = clip.frames[clip.frames.length - 1]!;
    return { frame: last.frame, clip: this.clipId, nextAt: null };
  }

  private settle(now: number, depth = 0) {
    if (depth > 4) return;
    const clip = DEALER_CLIPS[this.clipId];
    if (clip.hold || !clip.then) return;
    const total = clip.frames.reduce((sum, step) => sum + step.ms, 0);
    if (now - this.startedAt < total) return;
    const next = clip.then as DealerClipId;
    if (!(next in DEALER_CLIPS)) return;
    this.startedAt += total;
    this.clipId = next;
    this.settle(now, depth + 1);
  }
}
