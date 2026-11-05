import type { BrInput } from "../../src/lib/fps/br/match";

const MAX_BACKLOG = 8;
const MAX_PACKET_AGE_MS = 200;
const HOLD_MS = 100;

/** Short packet gaps must not turn held movement into stop/start walking. */
export class BrInputQueue {
  private queue: { input: BrInput; at: number }[] = [];
  private held: { input: BrInput; at: number; clock: number } | null = null;

  push(input: BrInput, at: number) {
    this.queue.push({ input, at });
    if (this.queue.length > MAX_BACKLOG) this.queue.shift();
  }

  take(clock: number, now: number): BrInput | undefined {
    while (this.queue.length && now - this.queue[0]!.at > MAX_PACKET_AGE_MS) this.queue.shift();
    const next = this.queue.shift();
    if (next) {
      this.held = { ...next, clock };
      return next.input;
    }
    const held = this.held;
    if (!held || clock - held.clock > HOLD_MS || now - held.at > MAX_PACKET_AGE_MS)
      return undefined;
    // Only continuous controls survive a gap. Never repeat a shot, jump, reload,
    // plane exit or weapon selection. One room tick still grants one movement step.
    const input = { ...held.input };
    delete input.slot;
    return { ...input, fire: false, jump: false, jumpOut: false, deploy: false, reload: false };
  }
}
