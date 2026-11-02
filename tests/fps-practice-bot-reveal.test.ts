import { describe, expect, it } from "vitest";
import { createPracticeBot } from "../src/lib/fps/practice-bot";
import { MAP_IDS } from "../src/lib/fps/maps/registry";
import { createMatch, startMatch, stepMatch, TICK_MS } from "../src/lib/fps/simulation";
import { revealsOpponent } from "../src/lib/fps/visibility";

/**
 * Every first-round patrol (3 styles × 3 openings, drawn at random by the runtime) brings the
 * practice bot into view of a human idling at spawn within a bounded time on every map. The
 * runtime solo-bot test (tests/fps-runtime.test.ts) waits for exactly this reveal on the
 * default map, so its timeout must exceed REVEAL_BOUND_S. Every map is held to the same bound
 * so practice starts promptly everywhere (LOST TRAIL's bot paths were fixed to meet it).
 */
const REVEAL_BOUND_S = 20;

function revealSeconds(mapId: string, seed: number) {
  let n = seed;
  const rng = () => (n = (1664525 * n + 1013904223) >>> 0) / 2 ** 32;
  const bot = createPracticeBot(rng),
    state = createMatch({ A: "human", B: "bot" }, 13, 0, undefined, mapId);
  startMatch(state, 0);
  let liveAt: number | null = null,
    patrol = "";
  for (let now = 0; now < 40_000; now += TICK_MS) {
    stepMatch(state, { B: bot.input(state, now) }, now, TICK_MS);
    if (state.phase !== "live") continue;
    if (liveAt === null) {
      liveAt = now;
      const plan = bot.plan();
      patrol = `${plan.style}/${plan.opening}`;
    }
    if (revealsOpponent(state, "A") && state.players.B.lastSeq > 0)
      return { patrol, seconds: (now - liveAt) / 1000 };
  }
  return { patrol, seconds: Infinity };
}

describe("practice bot reveal time for an idle human", () => {
  it.each(MAP_IDS.map((id) => [id]))(
    "every first-round patrol on %s reveals the bot within the bound",
    (mapId) => {
      const worst = new Map<string, number>();
      // Seeds until all 9 style × opening patrols have been drawn at least once.
      for (let seed = 1; seed <= 400 && worst.size < 9; seed++) {
        const { patrol, seconds } = revealSeconds(mapId, seed * 7919);
        worst.set(patrol, Math.max(worst.get(patrol) ?? 0, seconds));
      }
      expect(worst.size).toBe(9);
      for (const [patrol, seconds] of worst)
        expect(seconds, `${mapId} ${patrol}`).toBeLessThan(REVEAL_BOUND_S);
    },
    120_000,
  );
});
