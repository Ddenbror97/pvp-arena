import { describe, expect, it } from "vitest";
import { MAX_CATCH_UP_STEPS, RoomClock } from "../workers/fps/room-clock";
import { TICK_MS } from "../src/lib/fps/simulation";

describe("room clock", () => {
  it("keeps real time with a timer slower than the tick", () => {
    const clock = new RoomClock();
    let steps = 0;
    // A 34 ms timer for 60 s: 30 steps a second, not 29.4.
    for (let now = 0; now <= 60_000; now += 34) steps += clock.due(now);
    expect(Math.abs(steps - 60_000 / TICK_MS)).toBeLessThanOrEqual(2);
  });

  it("catches up after a late firing, within the bound", () => {
    const clock = new RoomClock();
    expect(clock.due(0)).toBe(1);
    expect(clock.due(70)).toBe(2);
    expect(clock.due(80)).toBe(0);
    expect(clock.due(101)).toBe(1);
  });

  it("drops the backlog after a long stall instead of replaying it", () => {
    const clock = new RoomClock();
    clock.due(0);
    expect(clock.due(5000)).toBe(MAX_CATCH_UP_STEPS);
    expect(clock.dropped).toBeGreaterThan(100);
    expect(clock.due(5010)).toBe(0);
    expect(clock.due(5034)).toBe(1);
  });
});
