import { describe, expect, it } from "vitest";
import { PlaybackDelay, ConnectionTiming } from "../src/lib/fps/network";
import { validateInput, type Input } from "../src/lib/fps/protocol";
import { createMatch, startMatch, stepMatch, TICK_MS } from "../src/lib/fps/simulation";

const input = (seq: number, extra: Partial<Input> = {}): Input => ({
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
const trigger = (seq: number) => input(seq, { combatOnly: true, fire: true, playbackMs: 65 });
function live() {
  const s = createMatch({ A: "a", B: "b" }, 5, 0);
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  return s;
}

describe("zero-time trigger input", () => {
  it("uses trigger-time aim even when a later movement command turns the camera", () => {
    const s = live();
    Object.assign(s.players.A, { x: 0, z: -2.4, y: 0 });
    Object.assign(s.players.B, { x: 0, z: -8.4, y: 0 });
    stepMatch(s, { A: input(2, { yaw: Math.PI / 2 }) }, 3034, TICK_MS, undefined, {
      A: trigger(1),
    });
    expect(s.players.B.hp).toBeLessThan(100);
    expect(s.players.A.yaw).toBe(Math.PI / 2);
  });
  it("rejects movement time, reloads and invalid playback hints in trigger messages", () => {
    expect(validateInput(trigger(1))).not.toBeNull();
    for (const extra of [
      { forward: 1 },
      { strafe: 1 },
      { jump: true },
      { reload: true },
      { sprint: true },
      { walk: true },
      { playbackMs: 64 },
      { playbackMs: 111 },
      { playbackMs: NaN },
    ])
      expect(validateInput({ ...trigger(1), ...extra })).toBeNull();
  });
  it("fires a short tap without moving or waiting for a normal movement input", () => {
    const s = live(),
      before = { ...s.players.A };
    stepMatch(s, {}, 3034, TICK_MS, undefined, { A: trigger(1) });
    expect(s.players.A.ammo).toBe(before.ammo - 1);
    expect(s.players.A.x).toBe(before.x);
    expect(s.players.A.z).toBe(before.z);
    expect(s.players.A.lastSeq).toBe(1);
    expect(s.events.find((e) => e.type === "shot")?.shotSeq).toBe(1);
    stepMatch(s, {}, 3068, TICK_MS, undefined, { A: trigger(1) });
    expect(s.players.A.ammo).toBe(before.ammo - 1);
  });
  it("does not add movement or double fire when regular and immediate commands share a tick", () => {
    const s = live(),
      reference = structuredClone(s);
    const move = input(2, { strafe: 1, fire: true });
    stepMatch(s, { A: move }, 3034, TICK_MS, undefined, { A: trigger(1) });
    stepMatch(reference, { A: move }, 3034, TICK_MS);
    expect(s.players.A.x).toBe(reference.players.A.x);
    expect(s.players.A.z).toBe(reference.players.A.z);
    expect(s.players.A.ammo).toBe(reference.players.A.ammo);
  });
  it("a trigger flood cannot exceed AK cadence or advance the movement clock", () => {
    const s = live(),
      before = { ...s.players.A };
    for (let i = 1; i <= 30; i++)
      stepMatch(s, {}, 3000 + i * 34, TICK_MS, undefined, { A: trigger(i) });
    expect(before.ammo - s.players.A.ammo).toBe(10);
    expect(s.players.A.x).toBe(before.x);
    expect(s.players.A.z).toBe(before.z);
  });
  it("keeps reload and weapon authority on the server", () => {
    const s = live();
    s.players.A.reloadUntil = 5000;
    stepMatch(s, {}, 3034, TICK_MS, undefined, { A: trigger(1) });
    expect(s.players.A.ammo).toBe(30);
    stepMatch(s, {}, 3068, TICK_MS, undefined, { A: { ...trigger(2), weapon: "pistol" } });
    expect(s.players.A.weapon).toBe("rifle");
    expect(s.players.A.ammo).toBe(30);
  });
});

describe("adaptive playback", () => {
  it("warms conservatively, lowers delay smoothly on a clean 30 Hz stream and grows for sustained jitter", () => {
    const d = new PlaybackDelay();
    expect(d.sample(16)).toBe(110);
    for (let i = 0; i < 160; i++) {
      d.observe(i * 34, 0);
      d.sample(34);
    }
    expect(d.sample(16)).toBe(65);
    let now = 160 * 34,
      previous = 65;
    for (let i = 0; i < 30; i++) {
      now += 150;
      d.observe(now, 25);
      const next = d.sample(34);
      expect(next - previous).toBeLessThanOrEqual(3.401);
      previous = next;
    }
    expect(previous).toBe(110);
    d.reset();
    expect(d.sample(16)).toBe(110);
  });
  it("aligns bounded playback hints with server-measured RTT without trusting client ping", () => {
    const t = new ConnectionTiming();
    for (let i = 0; i < 3; i++) {
      const c = t.challenge(i * 2000)!;
      t.pong(c.id, i * 2000 + 100);
    }
    expect(t.lookbackFor(65)).toBe(165);
    expect(t.lookbackFor(80)).toBe(180);
    expect(t.lookbackFor(-500)).toBe(165);
    expect(t.lookbackFor(99999)).toBe(210);
    expect(t.lookbackFor(undefined)).toBe(t.lookbackMs);
  });
});
