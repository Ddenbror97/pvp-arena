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

function rng(seed = 123) {
  let n = seed;
  return () => {
    n = (1664525 * n + 1013904223) >>> 0;
    return n / 2 ** 32;
  };
}
describe("solo Practice bot", () => {
  it("uses every style and opening before repeating and avoids back-to-back repeats", () => {
    const bot = createPracticeBot(rng()),
      plans = [];
    for (let round = 1; round <= 12; round++) {
      const state = createMatch({ A: "human", B: "bot" }, 13, 0);
      state.round = round;
      bot.input(state, round * 1000);
      plans.push(bot.plan());
    }
    for (let i = 0; i < plans.length; i += 3) {
      expect(new Set(plans.slice(i, i + 3).map((p) => p.style)).size).toBe(3);
      expect(new Set(plans.slice(i, i + 3).map((p) => p.opening)).size).toBe(3);
    }
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i]!.style).not.toBe(plans[i - 1]!.style);
      expect(plans[i]!.opening).not.toBe(plans[i - 1]!.opening);
    }
  });
  it("varies between games and mirrors the route for swapped spawns", () => {
    const openings = new Set();
    for (const seed of [17, 123, 98765, 0xabcdef]) {
      const bot = createPracticeBot(rng(seed)),
        state = createMatch({ A: "human", B: "bot" }, 13, 0);
      bot.input(state, 0);
      openings.add(bot.plan().opening);
    }
    expect(openings.size).toBeGreaterThan(1);
    const east = createMatch({ A: "human", B: "bot" }, 13, 0),
      west = structuredClone(east);
    west.players.B.x = -east.players.B.x;
    const a = createPracticeBot(() => 0.5),
      b = createPracticeBot(() => 0.5);
    a.input(east, 0);
    b.input(west, 0);
    expect(b.plan().waypoints).toEqual(a.plan().waypoints.map((p) => ({ x: -p.x, z: p.z })));
  });
  it("traverses distinct paths with ordinary movement inputs over three round plans", () => {
    const bot = createPracticeBot(rng()),
      traces = [];
    for (let round = 1; round <= 3; round++) {
      const s = createMatch({ A: "human", B: "bot" }, 13, 0);
      s.round = round;
      s.phase = "live";
      s.phaseEndsAt = 1000000;
      const trace = [];
      for (let tick = 0; tick < 350; tick++) {
        const now = round * 20000 + tick * 34,
          command = bot.input(s, now);
        expect(validateInput(command)).not.toBeNull();
        stepMatch(s, { B: { ...command, fire: false } }, now, TICK_MS);
        if (tick % 30 === 0) trace.push([Math.round(s.players.B.x), Math.round(s.players.B.z)]);
      }
      expect(Math.hypot(s.players.B.x - 18.2, s.players.B.z)).toBeGreaterThan(2);
      traces.push(JSON.stringify(trace));
    }
    expect(new Set(traces).size).toBe(3);
  });
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
  it.each([123, 17, 98765])(
    "finishes a complete first-to-seven series under ordinary combat rules (seed %i)",
    (seed) => {
      const state = createMatch({ A: "human", B: "bot" }, 13, 0),
        bot = createPracticeBot(rng(seed));
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
      // A patient round can draw; first-to-seven still ends after seven wins.
      expect(rounds.size).toBeGreaterThanOrEqual(7);
      expect(rounds.size).toBeLessThanOrEqual(9);
      expect(zones.size).toBeGreaterThan(1);
    },
  );
});
