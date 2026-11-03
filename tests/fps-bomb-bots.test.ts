import { describe, expect, it } from "vitest";
import { BOT_POINTS, bombPath, createBombBots } from "../src/lib/fps/bomb/bots";
import { createBombMatch, startBombMatch, stepBombMatch } from "../src/lib/fps/bomb/match";
import { SANDGATE } from "../src/lib/fps/bomb/sandgate";
import { TICK_MS } from "../src/lib/fps/simulation";

const slots = Array.from({ length: 10 }, (_, i) => ({
  id: `bot-${i}`,
  name: `BOT ${i}`,
  bot: true,
}));

describe("Bomb Defusal bots on Sandgate", () => {
  it("every named point is reachable from both spawns on the bots' ground graph", () => {
    const points = [
      ...Object.values(BOT_POINTS.plant),
      ...BOT_POINTS.holdA,
      ...BOT_POINTS.holdB,
      BOT_POINTS.holdMid,
      ...BOT_POINTS.approachA,
      ...BOT_POINTS.approachB,
      ...BOT_POINTS.midA,
      ...BOT_POINTS.midB,
      BOT_POINTS.lurk,
    ];
    for (const from of [SANDGATE.spawns.A, SANDGATE.spawns.B])
      for (const p of points) {
        const route = bombPath(from, p);
        expect(route.length, `${JSON.stringify(p)} from ${JSON.stringify(from)}`).toBeGreaterThan(
          0,
        );
        const end = route.at(-1)!;
        expect(Math.hypot(end.x - p.x, end.z - p.z)).toBeLessThan(1);
      }
  });

  it("ten bots play real rounds: plants, defuses or explosions and kills happen; ticks stay cheap", () => {
    let r = 11;
    const random = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const bots = createBombBots(random);
    const s = createBombMatch(slots, 0, 99);
    startBombMatch(s, 0);
    const reasons: string[] = [];
    let planted = 0,
      kills = 0,
      t = 0,
      worst = 0,
      total = 0,
      ticks = 0;
    let lastRound = 0;
    while (s.round <= 16 && s.phase !== "completed" && t < 30 * 60_000) {
      t += TICK_MS;
      const c0 = performance.now();
      stepBombMatch(s, bots.inputs(s, t), t);
      const c = performance.now() - c0;
      worst = Math.max(worst, c);
      total += c;
      ticks++;
      for (const e of s.events) {
        if (e.type === "bomb-planted") planted++;
        if (e.type === "kill") kills++;
      }
      if (s.lastRound && s.lastRound.round !== lastRound) {
        lastRound = s.lastRound.round;
        reasons.push(`${s.lastRound.winner}:${s.lastRound.reason}`);
      }
    }
    console.log({
      reasons,
      planted,
      kills,
      avgMs: +(total / ticks).toFixed(3),
      worstMs: +worst.toFixed(1),
    });
    expect(reasons.length).toBeGreaterThanOrEqual(16);
    expect(kills).toBeGreaterThan(20);
    expect(planted).toBeGreaterThan(0);
    // Not every round may time out: the bots must actually fight for the objective.
    expect(reasons.filter((x) => x.endsWith(":time")).length).toBeLessThan(reasons.length / 2);
    // A Cloudflare room steps at 30 Hz: the average tick (sim + 10 bots) must be far under 33 ms.
    expect(total / ticks).toBeLessThan(4);
  }, 600_000);
});
