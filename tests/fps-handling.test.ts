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
  it("holds full auto at authoritative 600 RPM cap, stops on release and reloads once", () => {
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
        expect(now - lastShot).toBeGreaterThanOrEqual(100);
        lastShot = now;
        shots++;
        if (shots === 30) break;
      }
    }
    expect(shots).toBe(30);
    expect(state.players.A.ammo).toBe(0);
    const reloadUntil = now + WEAPONS.rifle.reloadMs;
    expect(state.players.A.reloadUntil).toBe(reloadUntil);
    now += 34;
    stepMatch(state, { A: { ...idle, seq: ++seq, reload: true } }, now, TICK_MS);
    expect(state.players.A.reloadUntil).toBe(reloadUntil);
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
  it.each(["A", "B"] as const)("automatically reloads seat %s without another input", (seat) => {
    const state = createMatch({ A: "a", B: "b" }, 5, 0);
    startMatch(state, 0);
    stepMatch(state, {}, COUNTDOWN_MS, TICK_MS);
    const player = state.players[seat];
    player.ammo = 0;
    player.reserve = 7;
    const now = COUNTDOWN_MS + 34;
    stepMatch(state, {}, now, TICK_MS);
    expect(player.reloadUntil).toBe(now + WEAPONS.rifle.reloadMs);
    stepMatch(state, {}, player.reloadUntil - TICK_MS, TICK_MS);
    expect(player.ammo).toBe(0);
    stepMatch(state, {}, player.reloadUntil, TICK_MS);
    expect(player.ammo).toBe(7);
    expect(player.reserve).toBe(0);
    expect(player.reloadUntil).toBe(0);
  });
  it.each(["no reserve", "knife", "dead"])("does not auto-reload with %s", (reason) => {
    const state = createMatch({ A: "a", B: "b" }, 5, 0);
    startMatch(state, 0);
    stepMatch(state, {}, COUNTDOWN_MS, TICK_MS);
    const player = state.players.A;
    player.ammo = 0;
    if (reason === "no reserve") player.reserve = 0;
    if (reason === "knife") player.weapon = "knife";
    if (reason === "dead") player.hp = 0;
    stepMatch(state, {}, COUNTDOWN_MS + 34, TICK_MS);
    expect(player.reloadUntil).toBe(0);
  });
  it("leaves partial magazines alone and allows manual reload", () => {
    const state = createMatch({ A: "a", B: "b" }, 5, 0);
    startMatch(state, 0);
    stepMatch(state, {}, COUNTDOWN_MS, TICK_MS);
    state.players.A.ammo = 12;
    stepMatch(state, {}, COUNTDOWN_MS + 34, TICK_MS);
    expect(state.players.A.reloadUntil).toBe(0);
    stepMatch(state, { A: { ...idle, seq: 1, reload: true } }, COUNTDOWN_MS + 68, TICK_MS);
    expect(state.players.A.reloadUntil).toBe(COUNTDOWN_MS + 68 + WEAPONS.rifle.reloadMs);
  });
});
