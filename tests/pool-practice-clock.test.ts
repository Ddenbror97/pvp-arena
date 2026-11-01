import { describe, it, expect } from "vitest";
import { startPracticeClock, tickPracticeClock } from "../src/lib/pool/practice-clock";
import { applyTimeout, freshTable } from "../src/lib/pool/rules";
describe("Practice uses the PvP presence-aware clock", () => {
  it("renews a 30-second window for a player still aiming at the table", () => {
    const initial = startPracticeClock(1000);
    expect(initial.deadline).toBe(31000);
    const active = tickPracticeClock(initial, 31000, true);
    expect(active.timeout).toBe(false);
    expect(active.clock.deadline).toBe(61000);
    expect(active.clock.graceUsed).toBe(false);
  });
  it("grants one reconnect window to an absent seat before applying the same timeout rules", () => {
    const initial = startPracticeClock(0);
    const grace = tickPracticeClock(initial, 30000, false);
    expect(grace.timeout).toBe(false);
    expect(grace.clock.graceUsed).toBe(true);
    expect(grace.clock.deadline).toBe(60000);
    expect(tickPracticeClock(grace.clock, 59999, false).timeout).toBe(false);
    expect(tickPracticeClock(grace.clock, 60000, false).timeout).toBe(true);
    const result = applyTimeout(freshTable(new Uint8Array(32)));
    expect(result.turn).toBe("B");
    expect(result.ballInHand).toBe(true);
    expect(result.timeouts.A).toBe(1);
  });
  it("returning does not mint another reconnect grace for that shot", () => {
    const grace = tickPracticeClock(startPracticeClock(0), 30000, false);
    const returned = tickPracticeClock(grace.clock, 60000, true);
    expect(returned.timeout).toBe(false);
    expect(returned.clock.graceUsed).toBe(true);
    expect(tickPracticeClock(returned.clock, 90000, false).timeout).toBe(true);
  });
  it("uses the existing third-timeout forfeit without awarding cash", () => {
    let table = freshTable(new Uint8Array(32));
    for (let n = 0; n < 3; n++) {
      table.turn = "A";
      table = applyTimeout(table);
    }
    expect(table.winner).toBe("B");
    expect(table.reason).toBe("TIMEOUT_FORFEIT");
  });
});
