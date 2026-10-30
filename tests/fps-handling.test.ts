import { describe, it, expect } from "vitest";
import { recoverRecoil, shotRecoil, spreadScale, frameDelta } from "../src/lib/fps/handling";
import {
  createMatch,
  startMatch,
  stepMatch,
  TICK_MS,
  COUNTDOWN_MS,
  WEAPONS,
  type Input,
} from "../src/lib/fps/simulation";
const idle: Input = {
  v: 1,
  type: "input",
  seq: 0,
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  fire: false,
  reload: false,
  weapon: "rifle",
  jump: false,
  sprint: false,
};
describe("FPS handling polish", () => {
  it("never runs negative-time interpolation on the first frame after a slow scene load", () => {
    expect(frameDelta(100, 800)).toBe(0);
    expect(frameDelta(116, 100)).toBe(16);
    expect(frameDelta(3000, 100)).toBe(100);
    const blend = 1 - Math.exp(-frameDelta(100, 800) / 60);
    expect(blend).toBeGreaterThanOrEqual(0);
    expect(blend).toBeLessThanOrEqual(1);
  });
  it("recovers identically at 30, 60 and 144 rendering FPS", () => {
    const results = [30, 60, 144].map((fps) => {
      let value = 0.1;
      for (let n = 0; n < fps; n++) value = recoverRecoil(value, 1000 / fps);
      return value;
    });
    expect(results[0]).toBeCloseTo(results[1]!, 10);
    expect(results[1]).toBeCloseTo(results[2]!, 10);
  });
  it("uses bounded predictable recoil and greater moving/airborne spray", () => {
    expect(shotRecoil("rifle", 3)).toEqual(shotRecoil("rifle", 3));
    expect(shotRecoil("rifle", 1000).pitch).toBeLessThan(0.012);
    expect(spreadScale(1, false, false)).toBe(1);
    expect(spreadScale(10, false, false)).toBeGreaterThan(1);
    expect(spreadScale(10, true, false)).toBeGreaterThan(spreadScale(10, false, false));
    expect(spreadScale(10, false, true)).toBeGreaterThan(spreadScale(10, true, false));
  });
  it("holds full auto at existing authoritative rate, stops on release and reloads once", () => {
    const state = createMatch({ A: "fixture-a", B: "fixture-b" }, 5, 0);
    startMatch(state, 0);
    stepMatch(state, {}, COUNTDOWN_MS, TICK_MS);
    // Existing cover separates the players, so this exercises a full magazine without a kill ending the round.
    let now = COUNTDOWN_MS,
      seq = 0,
      shots = 0,
      lastShot = -Infinity;
    for (let n = 0; n < 180; n++) {
      now += 34;
      stepMatch(state, { A: { ...idle, seq: ++seq, fire: true } }, now, TICK_MS);
      if (state.events.some((e) => e.type === "shot")) {
        expect(now - lastShot).toBeGreaterThanOrEqual(WEAPONS.rifle.fireIntervalMs);
        lastShot = now;
        shots++;
      }
    }
    expect(shots).toBe(30);
    expect(state.players.A.ammo).toBe(0);
    now += 34;
    stepMatch(state, { A: { ...idle, seq: ++seq, reload: true } }, now, TICK_MS);
    expect(state.players.A.reloadUntil).toBe(now + WEAPONS.rifle.reloadMs);
    now += WEAPONS.rifle.reloadMs + 34;
    stepMatch(state, { A: { ...idle, seq: ++seq } }, now, TICK_MS);
    expect(state.players.A.ammo).toBe(30);
    expect(state.players.A.reserve).toBe(60);
    expect(state.events.some((e) => e.type === "shot")).toBe(false);
    now += 34;
    stepMatch(state, { A: { ...idle, seq: ++seq, fire: true } }, now, TICK_MS);
    expect(state.players.A.sprayCount).toBe(1);
    const ammo = state.players.A.ammo;
    now += 170;
    stepMatch(state, { A: { ...idle, seq: ++seq } }, now, TICK_MS);
    expect(state.players.A.ammo).toBe(ammo);
  });
});
