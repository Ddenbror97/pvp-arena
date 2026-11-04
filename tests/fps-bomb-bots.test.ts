import { describe, expect, it } from "vitest";
import { BOT_POINTS, bombPath, createBombBots, bombDefuser } from "../src/lib/fps/bomb/bots";
import { createBombMatch, startBombMatch, stepBombMatch } from "../src/lib/fps/bomb/match";
import { SANDGATE } from "../src/lib/fps/bomb/sandgate";
import { TICK_MS } from "../src/lib/fps/simulation";
import { BOMB_RULES } from "../src/lib/fps/bomb/rules";

const slots = Array.from({ length: 10 }, (_, i) => ({
  id: `bot-${i}`,
  name: `BOT ${i}`,
  bot: true,
}));

describe("Bomb Defusal bots on Sandgate", () => {
  it("assigns one defuser, gives a current human defuser cover, and replaces a dead defuser", () => {
    const s = createBombMatch(slots, 0, 99);
    startBombMatch(s, 0);
    s.phase = "live";
    s.bomb = { state: "planted", site: "A", x: -27, y: 0, z: -24, plantedAt: 0, explodesAt: 40000 };
    s.players
      .slice(0, 5)
      .forEach((p, i) =>
        Object.assign(p, { x: -27 + i * 0.2, z: -23.2, y: 0, defuseKit: i === 0 }),
      );
    s.players.slice(5).forEach((p) => Object.assign(p, { x: 30, z: 30, y: 0 }));
    expect(bombDefuser(s)).toBe(0);
    const bots = createBombBots(() => 0.5);
    expect(Object.values(bots.inputs(s, 1000)).filter((i) => i.use)).toHaveLength(1);
    s.players[0]!.bot = false;
    s.bomb.defuser = 0;
    expect(bombDefuser(s)).toBe(0);
    expect(Object.values(bots.inputs(s, 1100)).filter((i) => i.use)).toHaveLength(0);
    s.players[0]!.hp = 0;
    expect(bombDefuser(s)).not.toBe(0);
    expect(bombDefuser(s)).not.toBeNull();
  });
  it("looks down at the planted bomb while defusing so its spectator sees the hands", () => {
    const bots = createBombBots(() => 0.5);
    const s = createBombMatch(slots, 0, 99);
    startBombMatch(s, 0);
    s.phase = "live";
    s.roundEndsAt = 60000;
    const p = s.players[0]!;
    Object.assign(p, { x: -27, y: 0, z: -23.2, yaw: 0, pitch: 0 });
    for (const q of s.players.slice(5)) Object.assign(q, { x: 30, y: 0, z: 30 });
    s.bomb = { state: "planted", site: "A", x: -27, y: 0, z: -24, plantedAt: 0, explodesAt: 40000 };
    const input = bots.inputs(s, 1000)[0]!;
    expect(input.use).toBe(true);
    expect(input.pitch).toBeLessThan(0);
    expect(Math.abs(input.forward)).toBe(0);
  });
  it("varies opening routes and movement styles between matches", () => {
    const opening = (seed: number) => {
      let r = seed;
      const bots = createBombBots(() => (r = (r * 16807) % 2147483647) / 2147483647);
      const s = createBombMatch(slots, 0, 99);
      startBombMatch(s, 0);
      for (let t = TICK_MS; t < BOMB_RULES.freezeMs + 6000; t += TICK_MS)
        stepBombMatch(s, bots.inputs(s, t), t);
      return s.players.map((p) => ({ x: p.x, z: p.z }));
    };
    const a = opening(11),
      b = opening(91);
    expect(a.reduce((d, p, i) => d + Math.hypot(p.x - b[i]!.x, p.z - b[i]!.z), 0)).toBeGreaterThan(
      10,
    );
  });
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
    const utility: Record<string, number> = {};
    let crouched = 0,
      aliveSamples = 0;
    let lastRound = 0;
    while (s.round <= BOMB_RULES.maxRounds && s.phase !== "completed" && t < 30 * 60_000) {
      t += TICK_MS;
      const c0 = performance.now();
      stepBombMatch(s, bots.inputs(s, t), t);
      const c = performance.now() - c0;
      worst = Math.max(worst, c);
      total += c;
      ticks++;
      for (const p of s.players)
        if (p.hp > 0 && s.phase === "live") {
          aliveSamples++;
          if (p.crouched) crouched++;
        }
      for (const e of s.events) {
        if (e.type === "nade-throw") utility[e.nade!] = (utility[e.nade!] ?? 0) + 1;
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
      utility,
      crouchedShare: crouched / aliveSamples,
    });
    expect(reasons.length).toBeGreaterThanOrEqual(BOMB_RULES.winRounds);
    expect(reasons.length).toBeLessThanOrEqual(BOMB_RULES.maxRounds);
    expect(kills).toBeGreaterThan(20);
    expect(planted).toBeGreaterThan(0);
    expect(utility["smoke"] ?? 0).toBeGreaterThan(0);
    expect((utility["he"] ?? 0) + (utility["fire"] ?? 0)).toBeGreaterThan(0);
    expect(crouched / aliveSamples).toBeLessThan(0.3);
    // Not every round may time out: the bots must actually fight for the objective.
    expect(reasons.filter((x) => x.endsWith(":time")).length).toBeLessThan(reasons.length / 2);
    // A Cloudflare room steps at 30 Hz: the average tick (sim + 10 bots) must be far under 33 ms.
    expect(total / ticks).toBeLessThan(4);
  }, 600_000);
});
