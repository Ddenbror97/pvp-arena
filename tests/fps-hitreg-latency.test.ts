import { describe, expect, it } from "vitest";
import { ShotHistory } from "../workers/fps/lag-compensation";
import { createMatch, startMatch, stepMatch, TICK_MS } from "../src/lib/fps/simulation";
import type { Input } from "../src/lib/fps/protocol";
import { RemotePresentation } from "../src/lib/fps/presentation";
import { ConnectionTiming, REMOTE_DELAY_MS, SnapshotClock } from "../src/lib/fps/network";

/**
 * Hit-registration fairness across player latency. The shooter sees a strafing target
 * through the real client pipeline (20 Hz snapshots on the physics clock, SnapshotClock,
 * RemotePresentation with REMOTE_DELAY_MS), fires, and the command reaches the server
 * after the return trip plus a server-side wait (session gate / queue). The server rewinds
 * with the real ShotHistory and the runtime's lookback inputs (ConnectionTiming with
 * measured RTT samples, plus the server-measured delay since arrival).
 */
const command = (seq: number, extra: Partial<Input> = {}): Input => ({
  v: 1,
  type: "input",
  combatVersion: 2,
  seq,
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  fire: false,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: false,
  ...extra,
});

type Aim = "drawn" | "beside" | "current";

function duel(
  rtt: number,
  serverDelay: number,
  aim: Aim,
  playbackMs = REMOTE_DELAY_MS,
  snapshotMs = 50,
) {
  const s = createMatch({ A: "a", B: "b" }, 5, 0),
    history = new ShotHistory(),
    view = new RemotePresentation(),
    clock = new SnapshotClock(),
    timing = new ConnectionTiming();
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  Object.assign(s.players.A, { x: 0, z: -2.4, y: 0 });
  Object.assign(s.players.B, { x: -1.5, z: -8.4, y: 0 });
  s.server!.spreadSeed = 12345;
  // Calibrated RTT, as the runtime measures it with server-issued challenges.
  for (let i = 0; i < 3; i++) {
    const p = timing.challenge(i * 2000)!;
    timing.pong(p.id, i * 2000 + rtt);
  }
  const packets: Array<{ at: number; pose: typeof s.players.B; sent: number; poseAt: number }> = [];
  const eye = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
  let shot: Input | undefined,
    seq = 0;
  const clientFireAt = 3600,
    arrival = clientFireAt + rtt / 2,
    executeAt = 3000 + Math.ceil((arrival + serverDelay - 3000) / 34) * 34;
  for (let now = 3001; now <= executeAt; now++) {
    while (packets[0] && packets[0].at <= now) {
      const packet = packets.shift()!;
      clock.observe(packet.sent, now);
      view.push(packet.pose, packet.poseAt);
    }
    if (now === clientFireAt) {
      expect(view.sample(clock.now(now) - playbackMs, eye)).toBe(true);
      // Body centre (0.9 m) of the target as drawn; "beside" offsets it 0.6 m sideways,
      // outside the 0.35 m body half-width; "current" uses the server's present pose.
      const tx = aim === "current" ? s.players.B.x : eye.x + (aim === "beside" ? 0.6 : 0),
        tz = aim === "current" ? s.players.B.z : eye.z;
      const dx = tx - s.players.A.x,
        dz = tz - s.players.A.z;
      shot = command(1, {
        fire: true,
        yaw: Math.atan2(-dx, -dz),
        pitch: Math.atan2(0.9 - 1.6, Math.hypot(dx, dz)),
      });
    }
    if ((now - 3000) % 34 === 0) {
      const inputs = {
        B: command(++seq, { strafe: 1 }),
        ...(now === executeAt ? { A: shot! } : {}),
      };
      // Runtime formula: shooter's view lookback + server-measured wait since arrival.
      const past =
        now === executeAt
          ? history.target("B", now, timing.lookbackFor(playbackMs), now - arrival)
          : undefined;
      stepMatch(s, inputs, now, TICK_MS, past ? { A: past } : undefined);
      history.record(s, now);
    }
    if ((now - 3000) % snapshotMs === 0)
      packets.push({
        at: now + rtt / 2,
        pose: { ...s.players.B },
        sent: now,
        poseAt: s.server!.lastStepAt,
      });
  }
  return { hit: s.players.B.hp < 100, lookbackMs: timing.lookbackMs };
}

describe("hit registration is fair across RTT and server-side delay", () => {
  for (const delay of [65, 80, 110])
    for (const rtt of [50, 100, 150, 180])
      for (const wait of [0, 90, 180]) {
        it(`30 Hz, playback ${delay}, RTT ${rtt}, wait ${wait}: drawn aim hits and 0.6m beside misses`, () => {
          expect(duel(rtt, wait, "drawn", delay, 34).hit).toBe(true);
          expect(duel(rtt, wait, "beside", delay, 34).hit).toBe(false);
        });
      }
  for (const rtt of [50, 100, 150, 180])
    for (const serverDelay of [0, 90, 180]) {
      it(`${rtt} ms RTT, ${serverDelay} ms server wait: the drawn target is hit`, () => {
        expect(duel(rtt, serverDelay, "drawn").hit).toBe(true);
      });
      it(`${rtt} ms RTT, ${serverDelay} ms server wait: 0.6 m beside the drawn target misses`, () => {
        expect(duel(rtt, serverDelay, "beside").hit).toBe(false);
      });
      if (rtt >= 100)
        it(`${rtt} ms RTT, ${serverDelay} ms server wait: aiming at the server's current pose misses`, () => {
          expect(duel(rtt, serverDelay, "current").hit).toBe(false);
        });
    }
});
