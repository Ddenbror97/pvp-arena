import { describe, it, expect } from "vitest";
import { ShotHistory } from "../workers/fps/lag-compensation";
import {
  createMatch,
  startMatch,
  stepMatch,
  TICK_MS,
  validateInput,
} from "../src/lib/fps/simulation";
import type { Input } from "../src/lib/fps/protocol";
import { RemotePresentation } from "../src/lib/fps/presentation";
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
function movingTarget() {
  const s = createMatch({ A: "a", B: "b" }, 5, 0),
    h = new ShotHistory();
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  Object.assign(s.players.A, { x: 9, z: 3, y: 0, yaw: 0 });
  Object.assign(s.players.B, { x: 7.5, z: -3, y: 0 });
  s.server!.spreadSeed = 12345;
  for (let i = 1; i <= 12; i++) {
    const at = 3000 + i * 34;
    h.record(s, at);
    stepMatch(s, { B: command(i, { strafe: 1 }) }, at, TICK_MS);
  }
  const now = s.server!.lastStepAt + 34;
  h.record(s, now);
  return { s, h, now };
}
describe("bounded authoritative shot rewind", () => {
  it.each([30, 100, 180])(
    "accounts for snapshot travel AND return input travel at %i ms RTT",
    (rtt) => {
      const s = createMatch({ A: "a", B: "b" }, 5, 0),
        history = new ShotHistory(),
        view = new RemotePresentation();
      startMatch(s, 0);
      stepMatch(s, {}, 3000, TICK_MS);
      Object.assign(s.players.A, { x: 9, z: 3, y: 0 });
      Object.assign(s.players.B, { x: 7.5, z: -3, y: 0 });
      s.server!.spreadSeed = 12345;
      const packets: Array<{ at: number; pose: typeof s.players.B; sent: number }> = [];
      const eye = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, at: 0 };
      let shot: Input | undefined,
        seq = 0,
        withoutHp = 100;
      const clientFireAt = 3600,
        arrival = clientFireAt + rtt / 2,
        executeAt = 3000 + Math.ceil((arrival - 3000) / 34) * 34;
      for (let now = 3001; now <= executeAt; now++) {
        while (packets[0] && packets[0].at <= now) {
          const packet = packets.shift()!;
          view.push(packet.pose, packet.sent);
        }
        if (now === clientFireAt) {
          expect(view.sample(now - rtt / 2 - 50, eye)).toBe(true);
          const dx = eye.x - s.players.A.x,
            dz = eye.z - s.players.A.z;
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
          if (now === executeAt) {
            const clone = structuredClone(s);
            stepMatch(clone, inputs, now, TICK_MS);
            withoutHp = clone.players.B.hp;
          }
          const past =
            now === executeAt
              ? history.target("B", now, now - (arrival - Math.min(200, rtt + 50)))
              : undefined;
          stepMatch(s, inputs, now, TICK_MS, past ? { A: past } : undefined);
        }
        if ((now - 3000) % 50 === 0) {
          history.record(s, now);
          packets.push({ at: now + rtt / 2, pose: { ...s.players.B }, sent: now });
        }
      }
      expect(s.players.B.hp).toBeLessThan(100);
      if (rtt >= 100) expect(withoutHp).toBe(100);
    },
  );
  it.each([30, 100, 180])("registers the visible moving target at %i ms RTT", (rtt) => {
    const { s, h, now } = movingTarget(),
      past = h.target("B", now, rtt + 50)!;
    const dx = past.x - s.players.A.x,
      dz = past.z - s.players.A.z;
    const shot = command(1, {
      fire: true,
      yaw: Math.atan2(-dx, -dz),
      pitch: Math.atan2(0.9 - 1.6, Math.hypot(dx, dz)),
    });
    const without = structuredClone(s);
    stepMatch(without, { A: shot }, now, TICK_MS);
    stepMatch(s, { A: shot }, now, TICK_MS, { A: past });
    expect(s.players.B.hp).toBeLessThan(100);
    expect(s.players.A.ammo).toBe(29);
    if (rtt === 180) expect(without.players.B.hp).toBe(100);
  });
  it("caps lookback at 200 ms and discards another round's history", () => {
    const { s, h, now } = movingTarget();
    expect(h.target("B", now, 5000)).toEqual(h.target("B", now, 200));
    expect(h.target("B", now, NaN)).toBeUndefined();
    s.round++;
    h.record(s, now + 34);
    expect(h.target("B", now + 34, 100)).toBeUndefined();
  });
  it("retains world occlusion and current armor/damage rules", () => {
    const { s, now } = movingTarget();
    const blocked = { x: 5, y: 0, z: 0, crouched: false },
      a = s.players.A,
      dx = blocked.x - a.x,
      dz = blocked.z - a.z;
    stepMatch(
      s,
      {
        A: command(1, {
          fire: true,
          yaw: Math.atan2(-dx, -dz),
          pitch: Math.atan2(0.9 - 1.6, Math.hypot(dx, dz)),
        }),
      },
      now,
      TICK_MS,
      { A: blocked },
    );
    expect(s.players.B.hp).toBe(100);
    expect(s.events.some((e) => e.type === "impact")).toBe(true);
  });
  it("does not accept client claims of time, ping or historical hitboxes", () => {
    for (const key of ["shotAt", "rewindMs", "ping", "historicalTargets"])
      expect(validateInput({ ...command(1), [key]: 150 })).toBeNull();
  });
});
