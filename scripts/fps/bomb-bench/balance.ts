/**
 * Bomb Defusal balance runs (Node): full bot-only matches on one map with the shipped bots, rules
 * and simulation. Per round: winning side, end reason, plant site, plant time, first-kill time and
 * where it happened, and stuck bots (a living bot that has not moved 0.5 m in 20 s of live time).
 * Bots are not humans: this measures the layout's structural bias under identical play, not the
 * balance of real matches (that needs telemetry from played rounds).
 *
 *   MAP=iron-district MATCHES=12 node scripts/fps/bomb-bench/run.mjs balance
 */
import { createBombBots } from "../../../src/lib/fps/bomb/bots";
import {
  createBombMatch,
  startBombMatch,
  stepBombMatch,
  teamOf,
} from "../../../src/lib/fps/bomb/match";
import { isBombMapId } from "../../../src/lib/fps/bomb/maps";
import { TICK_MS } from "../../../src/lib/fps/simulation";

const MAP_ID = isBombMapId(process.env.MAP) ? process.env.MAP : "sandgate";
const MATCHES = Number(process.env.MATCHES ?? 8);
type Round = {
  match: number;
  round: number;
  winner: string;
  reason: string;
  site?: string;
  plantS?: number;
  firstKillS?: number;
  firstKillAt?: [number, number, number];
  stuck: number;
};
const rounds: Round[] = [];
/** Kills and headshot kills over all matches; bots' own CPU time per tick (ms). */
let kills = 0,
  headshots = 0,
  headHits = 0,
  bodyHits = 0;
const counted = new WeakSet<object>();
const botMs: number[] = [];
for (let m = 0; m < MATCHES; m++) {
  let r = 1000 + m * 7919;
  const random = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const slots = Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, name: `B${i}`, bot: true }));
  const s = createBombMatch(slots, 0, 17 + m, MAP_ID);
  startBombMatch(s, 0);
  const bots = createBombBots(random);
  let t = 0,
    round = s.round,
    liveAt = -1,
    plantS: number | undefined,
    site: string | undefined,
    firstKillS: number | undefined,
    firstKillAt: [number, number, number] | undefined;
  const lastMove = new Map<number, { x: number; z: number; at: number }>();
  let stuck = new Set<number>();
  for (let i = 0; i < 400_000 && s.phase !== "completed"; i++) {
    t += TICK_MS;
    const deadBefore = new Set(s.players.filter((p) => p.hp <= 0).map((p) => p.slot));
    const b0 = performance.now();
    const inputs = bots.inputs(s, t);
    if (s.phase === "live") botMs.push(performance.now() - b0);
    stepBombMatch(s, inputs, t);
    for (const e of s.events)
      if (!counted.has(e)) {
        counted.add(e);
        if (e.type === "headshot") headHits++;
        else if (e.type === "hit") bodyHits++;
      }
    if (s.phase === "live" && liveAt < 0) liveAt = t;
    if (s.phase === "live") {
      for (const p of s.players) {
        if (p.hp <= 0) continue;
        const lm = lastMove.get(p.slot);
        if (!lm || Math.hypot(p.x - lm.x, p.z - lm.z) > 0.5)
          lastMove.set(p.slot, { x: p.x, z: p.z, at: t });
        else if (t - lm.at > 20_000 && s.bomb.state !== "planted") stuck.add(p.slot);
      }
      if (firstKillS === undefined) {
        const victim = s.players.find((p) => p.hp <= 0 && !deadBefore.has(p.slot));
        if (victim) {
          firstKillS = +((t - liveAt) / 1000).toFixed(1);
          firstKillAt = [+victim.x.toFixed(1), +victim.y.toFixed(1), +victim.z.toFixed(1)];
        }
      }
      if (s.bomb.state === "planted" && plantS === undefined) {
        plantS = +((t - liveAt) / 1000).toFixed(1);
        site = s.bomb.site;
      }
    }
    if (s.round !== round || s.phase === "completed") {
      const last = s.lastRound!;
      rounds.push({
        match: m,
        round,
        winner: last.winner,
        reason: last.reason,
        ...(site ? { site } : {}),
        ...(plantS !== undefined ? { plantS } : {}),
        ...(firstKillS !== undefined ? { firstKillS, firstKillAt } : {}),
        stuck: stuck.size,
      } as Round);
      round = s.round;
      liveAt = -1;
      plantS = site = firstKillS = firstKillAt = undefined;
      lastMove.clear();
      stuck = new Set();
    }
  }
  void teamOf;
  for (const p of s.players) {
    kills += p.kills;
    headshots += p.headshots;
  }
}
botMs.sort((a, b) => a - b);
const q = (f: number) => +(botMs[Math.floor(botMs.length * f)] ?? 0).toFixed(3);
const n = rounds.length;
const pct = (k: number) => `${((100 * k) / Math.max(1, n)).toFixed(1)}%`;
const count = (f: (r: Round) => boolean) => rounds.filter(f).length;
const median = (xs: number[]) =>
  xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : null;
console.log(
  JSON.stringify(
    {
      map: MAP_ID,
      matches: MATCHES,
      rounds: n,
      policeWins: pct(count((r) => r.winner === "police")),
      terroristWins: pct(count((r) => r.winner === "terrorist")),
      reasons: Object.fromEntries(
        ["elimination", "bomb", "defuse", "time"].map((k) => [k, count((r) => r.reason === k)]),
      ),
      plants: { A: count((r) => r.site === "A"), B: count((r) => r.site === "B") },
      plantWinRate: {
        A:
          pct(count((r) => r.site === "A" && r.winner === "terrorist")) +
          ` of ${count((r) => r.site === "A")}`,
        B:
          pct(count((r) => r.site === "B" && r.winner === "terrorist")) +
          ` of ${count((r) => r.site === "B")}`,
      },
      medianPlantS: median(rounds.flatMap((r) => (r.plantS !== undefined ? [r.plantS] : []))),
      medianFirstKillS: median(
        rounds.flatMap((r) => (r.firstKillS !== undefined ? [r.firstKillS] : [])),
      ),
      roundsWithStuckBots: count((r) => r.stuck > 0),
      kills,
      headshotKills: headshots,
      headshotShare: `${((100 * headshots) / Math.max(1, kills)).toFixed(1)}%`,
      hits: headHits + bodyHits,
      headHitShare: `${((100 * headHits) / Math.max(1, headHits + bodyHits)).toFixed(1)}%`,
      botTicksOver5ms: botMs.filter((v) => v > 5).length,
      botTicks: botMs.length,
      botMsPerTick: {
        mean: +(botMs.reduce((a, b) => a + b, 0) / Math.max(1, botMs.length)).toFixed(3),
        p50: q(0.5),
        p99: q(0.99),
        max: q(1 - 1e-9),
      },
      firstKills: rounds.flatMap((r) => (r.firstKillAt ? [r.firstKillAt] : [])),
    },
    null,
    0,
  ),
);
