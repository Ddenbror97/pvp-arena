import { describe, it, expect } from "vitest";
import { PlayerPoseHistory, MAX_SERVER_DELAY_MS } from "../workers/fps/lag-compensation";
import { ConnectionTiming, MIN_PLAYBACK_MS, MAX_REWIND_MS } from "../src/lib/fps/network";
import { createBombMatch, startBombMatch, stepBombMatch } from "../src/lib/fps/bomb/match";
import { BOMB_RULES } from "../src/lib/fps/bomb/rules";
import { TICK_MS } from "../src/lib/fps/simulation";
const slots = Array.from({ length: 10 }, (_, i) => ({ id: "p" + i, name: "P" + i, bot: true }));
function scenario(rtt: number, rewind: boolean) {
  const s = createBombMatch(slots, 0, 7);
  startBombMatch(s, 0);
  stepBombMatch(s, {}, BOMB_RULES.freezeMs + TICK_MS);
  for (const p of s.players) Object.assign(p, { hp: 0, dead: true });
  const shooter = s.players[0]!,
    target = s.players[9]!;
  Object.assign(shooter, { x: 0, y: 0, z: -11, hp: 100, dead: false, ammo: 30, lastShotAt: -1000 });
  const timing = new ConnectionTiming();
  for (let i = 0; i < 3; i++) {
    const p = timing.challenge(i * 1100)!;
    timing.pong(p.id, p.at + rtt);
  }
  const now = 20000,
    lookback = timing.lookbackFor(MIN_PLAYBACK_MS),
    h = new PlayerPoseHistory<number>();
  Object.assign(target, { x: lookback * 0.0048, y: 0, z: -5, hp: 100, dead: false });
  for (let at = now - 510; at <= now; at += 34) {
    h.record(
      s.round,
      true,
      [[9, { x: (at - (now - lookback)) * 0.0048, y: 0, z: -5, crouched: false }]],
      at,
    );
  }
  stepBombMatch(
    s,
    {
      0: {
        v: 1,
        type: "input",
        combatVersion: 2,
        round: s.round,
        seq: 1,
        forward: 0,
        strafe: 0,
        yaw: Math.PI,
        pitch: -0.02,
        weapon: "rifle",
        fire: true,
        reload: false,
        jump: false,
        sprint: false,
      },
    },
    now,
    rewind ? (_shooter, victim) => h.target(victim, now, lookback) : undefined,
  );
  return target.hp;
}
describe("Bomb mode uses the bounded shared lag compensation", () => {
  for (const rtt of [50, 100, 140, 180])
    it(`resolves a moving slot-9 target at ${rtt} ms measured RTT`, () => {
      expect(scenario(rtt, false)).toBe(100);
      expect(scenario(rtt, true)).toBeLessThan(100);
    });
  it("keeps slots separate, bounds rewind and rejects teleports and earlier rounds", () => {
    const h = new PlayerPoseHistory<number>();
    for (let at = 0; at <= 600; at += 34)
      h.record(
        1,
        true,
        [
          [0, { x: at / 1000, y: 0, z: 0, crouched: false }],
          [9, { x: 10 + at / 1000, y: 0, z: 0, crouched: false }],
        ],
        at,
      );
    expect(h.target(9, 600, MAX_REWIND_MS, MAX_SERVER_DELAY_MS)?.x).toBeCloseTo(10.12);
    expect(h.target(0, 600, 9999, 9999)?.x).toBeCloseTo(0.12);
    expect(h.target(8, 600, 100)).toBeUndefined();
    h.record(2, true, [[9, { x: 100, y: 0, z: 0, crouched: false }]], 620);
    expect(h.target(9, 620, 100)).toBeUndefined();
    h.record(2, true, [[9, { x: 200, y: 0, z: 0, crouched: false }]], 640);
    expect(h.target(9, 660, 30)).toBeUndefined();
  });
});
