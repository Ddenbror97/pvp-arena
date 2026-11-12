/**
 * How the 5v5 bots move as a group (owner, 2026-11-12: "bots … run on each other and take same
 * path, they run laggy when you run together"). A ten-bot match on the real room code, measured
 * per bot and tick while the round is live and the bot is alive and on the move:
 *
 *  - stacked: a living teammate within 0.6 m (bodies inside each other), and within 1.0 m;
 *  - turning: how fast the direction of travel changes (rad/s), mean and the share of time
 *    above 4 rad/s (a zig-zag);
 *  - yaw: how fast the body turns while no enemy is in sight (rad/s);
 *  - slow: moving at under 60 % of running speed while trying to run (stop-and-go);
 *  - and that the bots still play: rounds, score, plants, kills.
 *
 *   node scripts/fps/bot-motion/run.mjs [--map=sandgate|iron-district] [--rounds=6] [--seed=0.37]
 */
import { createBombBots } from "@/lib/fps/bomb/bots";
import { createBombMatch, startBombMatch, stepBombMatch, teamOf } from "@/lib/fps/bomb/match";
import type { BombMapId } from "@/lib/fps/bomb/maps";
import { MOVE_SPEED, TICK_MS } from "@/lib/fps/simulation";

export function measure(mapId: BombMapId, rounds: number, seed: number) {
  let s = Math.floor(seed * 2 ** 31) || 1;
  const random = () => (s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
  const slots = Array.from({ length: 10 }, (_, i) => ({
    id: `b${i}`,
    name: `BOT ${i}`,
    bot: true,
  }));
  let now = 1_000_000;
  const state = createBombMatch(slots, now, 11, mapId);
  startBombMatch(state, now);
  const bots = createBombBots(random);
  const prev = state.players.map((p) => ({ x: p.x, z: p.z, yaw: p.yaw, dir: NaN, live: false }));
  let samples = 0,
    stacked06 = 0,
    stacked10 = 0,
    turn = 0,
    zigzag = 0,
    turnSamples = 0,
    yaw = 0,
    yawSamples = 0,
    slow = 0,
    running = 0,
    plants = 0,
    kills = 0,
    planted = false;
  const seenRound = state.round;
  const dt = TICK_MS / 1000;
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  for (let tick = 0; tick < 400_000 && state.round - seenRound < rounds; tick++) {
    now += TICK_MS;
    const inputs = bots.inputs(state, now);
    stepBombMatch(state, inputs, now);
    if (state.phase === "completed") Object.assign(state, { phase: "freeze", phaseEndsAt: now });
    if (state.bomb.state === "planted" && !planted) plants++;
    planted = state.bomb.state === "planted";
    for (const e of state.events) if (e.type === "kill") kills++;
    const live = state.phase === "live";
    for (const p of state.players) {
      const q = prev[p.slot]!;
      const dx = p.x - q.x,
        dz = p.z - q.z,
        speed = Math.hypot(dx, dz) / dt;
      const moving = live && q.live && p.hp > 0 && speed > 0.5 && speed < MOVE_SPEED * 2;
      if (moving) {
        samples++;
        let near = Infinity;
        for (const o of state.players)
          if (o.slot !== p.slot && o.hp > 0 && teamOf(state, o) === teamOf(state, p))
            near = Math.min(near, Math.hypot(o.x - p.x, o.z - p.z));
        if (near < 0.6) stacked06++;
        if (near < 1.0) stacked10++;
        // Stop-and-go: slow while asking to run (not the quiet walk of a lurker, not crouched).
        const input = inputs[p.slot];
        if (input && !input.walk && !input.crouch) {
          running++;
          if (speed < MOVE_SPEED * 0.6) slow++;
        }
        const dir = Math.atan2(dx, dz);
        if (!Number.isNaN(q.dir)) {
          const rate = Math.abs(wrap(dir - q.dir)) / dt;
          turn += rate;
          if (rate > 4) zigzag++;
          turnSamples++;
        }
        q.dir = dir;
        yaw += Math.abs(wrap(p.yaw - q.yaw)) / dt;
        yawSamples++;
      } else q.dir = NaN;
      q.x = p.x;
      q.z = p.z;
      q.yaw = p.yaw;
      q.live = live && p.hp > 0;
    }
  }
  const pct = (n: number, d: number) => +((100 * n) / Math.max(1, d)).toFixed(1);
  return {
    map: mapId,
    rounds: state.round - seenRound,
    score: `${state.score.alpha}-${state.score.bravo}`,
    plants,
    kills,
    movingSamples: samples,
    stackedWithin06Pct: pct(stacked06, samples),
    stackedWithin10Pct: pct(stacked10, samples),
    turnRadPerS: +(turn / Math.max(1, turnSamples)).toFixed(2),
    zigzagPct: pct(zigzag, turnSamples),
    yawRadPerS: +(yaw / Math.max(1, yawSamples)).toFixed(2),
    slowPct: pct(slow, running),
  };
}
