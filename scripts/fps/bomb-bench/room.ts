/**
 * Bomb Defusal room cost (Node): one BombRoom tick = bots + simulation step, plus one filtered
 * snapshot per connected human (serialised, as the room sends it). Worst case is 10 humans:
 * every snapshot then runs the reveal test for 5 enemies per recipient.
 *
 *   node scripts/fps/bomb-bench/run.mjs
 */
import { createBombBots } from "../../../src/lib/fps/bomb/bots";
import { createBombMatch, startBombMatch, stepBombMatch } from "../../../src/lib/fps/bomb/match";
import { BombReveal, bombViewFor } from "../../../src/lib/fps/bomb/snapshot";
import { TICK_MS } from "../../../src/lib/fps/simulation";

import { gameMapOf, isBombMapId } from "../../../src/lib/fps/bomb/maps";
import { canSee } from "../../../src/lib/fps/bomb/visibility";
import { AimWatch, type WatchPlayer } from "../../../src/lib/fps/anticheat/aim-watch";
/**
 * AIM=trace: the room's anti-cheat aim analysis as PR #205 had it (a sight test per watched
 * player and enemy every tick); AIM=reveal: as it is now (the snapshot's own answers); unset:
 * no aim analysis (the cost before PR #205).
 */
const AIM = process.env.AIM;
/** MAP=iron-district measures the second 5v5 map (default Sandgate). */
const MAP_ID = isBombMapId(process.env.MAP) ? process.env.MAP : "sandgate";
const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * p)]!;
function run(humans: number, ticks: number) {
  const slots = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true }));
  const s = createBombMatch(slots, 0, 99, MAP_ID);
  startBombMatch(s, 0);
  const bots = createBombBots(() => 0.5);
  const reveal = new BombReveal();
  const aim = new AimWatch();
  let t = 0;
  const step: number[] = [],
    views: number[] = [],
    aimMs: number[] = [],
    bytes: number[] = [];
  for (let i = 0; i < ticks; i++) {
    t += TICK_MS;
    const a = performance.now();
    stepBombMatch(s, bots.inputs(s, t), t);
    const b = performance.now();
    // The room's aim analysis (bomb.ts watchAim), for the `humans` watched players.
    if (AIM && s.phase === "live") {
      const map = gameMapOf(s);
      const smoke = { smokes: s.grenades?.smokes ?? [], now: t };
      const bySlot = new Map(s.players.map((p) => [p!.id, p!]));
      const all: WatchPlayer[] = s.players.map((p) => ({
        id: p!.id,
        yaw: p!.yaw,
        pitch: p!.pitch,
        x: p!.x,
        y: p!.y,
        z: p!.z,
        alive: p!.hp > 0,
      }));
      const watched = all.filter((w, i) => i < humans && w.alive);
      const enemy = (a: WatchPlayer, b: WatchPlayer) =>
        bySlot.get(a.id)!.group !== bySlot.get(b.id)!.group;
      aim.observe(
        t,
        watched,
        all,
        (a, b) =>
          enemy(a, b) &&
          ((AIM === "reveal"
            ? reveal.last(bySlot.get(a.id)!.slot, bySlot.get(b.id)!.slot, t)
            : undefined) ??
            canSee(map, bySlot.get(a.id)!, bySlot.get(b.id)!, smoke)),
        (a, b) => !enemy(a, b) || (a.x - b.x) ** 2 + (a.z - b.z) ** 2 < 22 ** 2,
      );
    }
    const b2 = performance.now();
    let size = 0;
    // Humans are bot-driven here (same cost to simulate); snapshots for `humans` recipients.
    for (let h = 0; h < humans; h++)
      size += JSON.stringify(bombViewFor(s, h, null, reveal, t)).length;
    const c = performance.now();
    aimMs.push(b2 - b);
    step.push(b - a);
    views.push(c - b2);
    if (humans) bytes.push(size / humans);
    if (s.phase === "completed") break;
  }
  const total = step.map((v, i) => v + views[i]! + aimMs[i]!);
  return {
    map: MAP_ID,
    aim: AIM ?? "off",
    humans,
    aimAvgMs: +(aimMs.reduce((a, b) => a + b, 0) / aimMs.length).toFixed(3),
    aimP99Ms: +pct(aimMs, 0.99).toFixed(3),
    ticks: step.length,
    rounds: s.round,
    stepAvgMs: +(step.reduce((a, b) => a + b, 0) / step.length).toFixed(3),
    stepP99Ms: +pct(step, 0.99).toFixed(3),
    viewsAvgMs: +(views.reduce((a, b) => a + b, 0) / views.length).toFixed(3),
    viewsP99Ms: +pct(views, 0.99).toFixed(3),
    tickP99Ms: +pct(total, 0.99).toFixed(3),
    tickMaxMs: +Math.max(...total).toFixed(3),
    budgetUsedP99: `${((100 * pct(total, 0.99)) / TICK_MS).toFixed(1)}%`,
    snapshotBytesAvg: bytes.length
      ? Math.round(bytes.reduce((a, b) => a + b, 0) / bytes.length)
      : 0,
    snapshotBytesMax: bytes.length ? Math.max(...bytes) : 0,
    downlinkKBps: bytes.length
      ? +(((bytes.reduce((a, b) => a + b, 0) / bytes.length) * (1000 / 34)) / 1024).toFixed(1)
      : 0,
  };
}
// Warm the JIT, then 8 minutes of play per configuration.
run(10, 2000);
for (const h of (process.env.HUMANS ?? "1,5,10").split(",").map(Number))
  console.log(JSON.stringify(run(h, Number(process.env.TICKS ?? 14000))));
