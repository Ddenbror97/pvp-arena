import { brRewindMs } from "../../src/lib/fps/br/lag";
import type { BrInput } from "../../src/lib/fps/br/match";

const MAX_BACKLOG = 8;
/**
 * Inputs kept waiting behind the one a tick takes. The client sends one a tick and the room
 * applies one a tick, so a backlog left by a network burst never drained by itself: every
 * later input, and every shot, waited behind it (up to MAX_PACKET_AGE_MS) for the rest of the
 * match (netcode audit 2026-11-11; the fault 1v1 had on 2026-11-01). Over this depth, a tick
 * skips one input that only repeats held movement: the player gives up one step of a burst
 * (reconciled like any correction), never an action, and is back on time within a few ticks.
 */
const TARGET_BACKLOG = 1;
const MAX_PACKET_AGE_MS = 200;
const HOLD_MS = 100;

/** Short packet gaps must not turn held movement into stop/start walking. */
export class BrInputQueue {
  private queue: { input: BrInput; at: number; viewMs: number }[] = [];
  private held: { input: BrInput; at: number; clock: number } | null = null;
  /** Inputs skipped to drain a backlog, and how long the last taken input waited (telemetry). */
  skipped = 0;
  lastWaitMs = NaN;

  /**
   * `viewMs`: how old the sender's picture of the others was when this arrived (lag.ts
   * brViewLookbackMs, from the room's own round-trip measurement).
   */
  push(input: BrInput, at: number, viewMs = 0) {
    this.queue.push({ input, at, viewMs });
    if (this.queue.length > MAX_BACKLOG) this.queue.shift();
  }

  take(clock: number, now: number): BrInput | undefined {
    while (this.queue.length && now - this.queue[0]!.at > MAX_PACKET_AGE_MS) this.queue.shift();
    let next = this.queue.shift();
    if (next && this.queue.length > TARGET_BACKLOG && !acts(next.input)) {
      this.skipped++;
      next = this.queue.shift()!;
    }
    this.lastWaitMs = next ? now - next.at : NaN;
    if (next) {
      this.held = { input: next.input, at: next.at, clock };
      // Shots rewind by the sender's view plus the time this input waited here for its tick.
      return { ...next.input, rewindMs: brRewindMs(next.viewMs, now - next.at) };
    }
    const held = this.held;
    if (!held || clock - held.clock > HOLD_MS || now - held.at > MAX_PACKET_AGE_MS)
      return undefined;
    // Only continuous controls survive a gap. Never repeat a shot, jump, reload,
    // plane exit or weapon selection. One room tick still grants one movement step.
    const input = { ...held.input };
    delete input.slot;
    delete input.rewindMs;
    return { ...input, fire: false, jump: false, jumpOut: false, deploy: false, reload: false };
  }
}

/** An input that does something once: never skipped. Held movement and aim are continuous. */
function acts(input: BrInput) {
  return !!(
    input.fire ||
    input.jump ||
    input.jumpOut ||
    input.deploy ||
    input.reload ||
    input.dive ||
    input.slot !== undefined
  );
}
