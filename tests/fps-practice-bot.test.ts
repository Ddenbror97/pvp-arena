import { describe, expect, it } from "vitest";
import { createPracticeBot } from "../src/lib/fps/practice-bot";
import {
  createMatch,
  startMatch,
  stepMatch,
  validateInput,
  TICK_MS,
} from "../src/lib/fps/simulation";
import { canSeeOpponent } from "../src/lib/fps/visibility";

function rng() {
  let n = 123;
  return () => {
    n = (1664525 * n + 1013904223) >>> 0;
    return n / 2 ** 32;
  };
}
describe("solo Practice bot", () => {
  it("gives players 600 ms to react and a longer recovery between bursts", () => {
    const state = createMatch({ A: "human", B: "bot" }, 13, 0),
      bot = createPracticeBot(() => 0.5);
    state.phase = "live";
    Object.assign(state.players.A, { x: 9, z: 12, yaw: 0 });
    Object.assign(state.players.B, { x: 9, z: 5, yaw: Math.PI });
    for (let now = 0; now < 600; now += 34) expect(bot.input(state, now).fire).toBe(false);
    expect(bot.input(state, 600).fire).toBe(true);
    expect(bot.input(state, 1000).fire).toBe(false);
    expect(bot.input(state, 1400).fire).toBe(false);
    expect(bot.input(state, 1750).fire).toBe(true);
  });
  it("uses valid inputs, waits for perception and never fires through hidden cover", () => {
    const state = createMatch({ A: "human", B: "bot" }, 13, 0),
      bot = createPracticeBot(rng());
    startMatch(state, 0);
    let shots = 0,
      hits = 0,
      hidden = 0;
    for (let now = 0; now < 120000 && state.phase !== "completed"; now += 34) {
      const before = structuredClone(state),
        input = bot.input(state, now);
      expect(state).toEqual(before);
      expect(validateInput(input)).not.toBeNull();
      if (!canSeeOpponent(state, "B") && state.phase === "live") {
        expect(input.fire).toBe(false);
        hidden++;
      }
      stepMatch(state, { B: input }, now, TICK_MS);
      shots += state.events.filter((e) => e.type === "shot" && e.seat === "B").length;
      hits += state.events.filter((e) => e.hit?.victim === "A").length;
    }
    expect(hidden).toBeGreaterThan(0);
    expect(shots).toBeGreaterThan(0);
    expect(hits).toBeGreaterThan(0);
  });
  it("finishes a complete first-to-seven series under ordinary combat rules", () => {
    const state = createMatch({ A: "human", B: "bot" }, 13, 0),
      bot = createPracticeBot(rng());
    startMatch(state, 0);
    const rounds = new Set<number>(),
      zones = new Set<string>();
    for (
      let now = 0;
      now < 15 * 60000 && !["completed", "cancelled"].includes(state.phase);
      now += 34
    ) {
      const input = bot.input(state, now);
      stepMatch(state, { B: input }, now, TICK_MS);
      rounds.add(state.round);
      for (const e of state.events) if (e.hit) zones.add(e.hit.zone);
    }
    expect(state.phase).toBe("completed");
    expect(state.score.B).toBe(7);
    expect(state.score.A).toBe(0);
    expect(rounds.size).toBe(7);
    expect(zones.size).toBeGreaterThan(1);
  });
});
