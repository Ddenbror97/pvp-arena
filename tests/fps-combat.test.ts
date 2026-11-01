import { describe, it, expect } from "vitest";
import {
  createMatch,
  startMatch,
  stepMatch,
  TICK_MS,
  type Input,
  type MatchState,
} from "../src/lib/fps/simulation";
import {
  HIT_DAMAGE,
  applyVestDamage,
  recoveryProfile,
  sprayOffset,
  recoverCombatRecoil,
} from "../src/lib/fps/combat";
import { combatVolumes } from "../src/lib/fps/player-volumes";
import { snapshotForPlayer } from "../src/lib/fps/visibility";
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
function live(version: 1 | 2 = 2) {
  const s = createMatch({ A: "a", B: "b" }, 5, 0, version);
  s.server!.spreadSeed = 12345;
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  return s;
}
function lane(s: MatchState) {
  // A 6 m north-courtyard lane between the centre stack and the arcade (aim-arena layout).
  Object.assign(s.players.A, { x: 0, z: -2.4, y: 0, yaw: 0 });
  Object.assign(s.players.B, { x: 0, z: -8.4, y: 0, yaw: Math.PI });
}
function tick(s: MatchState, seq: number, extra: Partial<Input> = {}) {
  stepMatch(s, { A: input(seq, extra) }, s.server!.lastStepAt + 34, TICK_MS);
}
function spray(compensate = false) {
  const s = live(),
    ys: number[] = [];
  let seq = 0;
  for (let n = 0; n < 100; n++) {
    tick(s, ++seq, {
      fire: true,
      ...(compensate
        ? { pitch: -(s.players.A.recoilPitch ?? 0), yaw: -(s.players.A.recoilYaw ?? 0) }
        : {}),
    });
    const impact = s.events.find((e) => e.type === "impact")?.impact;
    if (impact) ys.push(impact.point.y);
  }
  return { s, ys };
}
describe("PvPStrike authoritative combat v2", () => {
  it.each(["rifle", "pistol"] as const)("requires exactly three landed %s headshots", (weapon) => {
    const s = live();
    lane(s);
    tick(s, 1, { fire: true, weapon });
    expect(s.players.B.hp).toBe(66);
    expect(s.score.A).toBe(0);
    for (let n = 2; n <= 11; n++) tick(s, n, { weapon });
    tick(s, 12, { fire: true, weapon });
    expect(s.players.B.hp).toBe(32);
    expect(s.score.A).toBe(0);
    for (let n = 13; n <= 23; n++) tick(s, n, { weapon });
    tick(s, 24, { fire: true, weapon });
    expect(s.players.B.hp).toBe(0);
    expect(s.score.A).toBe(1);
    expect(s.players.A.headshots).toBe(1);
  });
  for (const crouched of [false, true])
    for (const zone of ["head", "chest", "stomach", "legs"] as const)
      it(`uses the ${crouched ? "crouched" : "standing"} ${zone} damage zone`, () => {
        const s = live();
        lane(s);
        s.players.B.crouched = crouched;
        const target = combatVolumes(s.players.B)[zone];
        tick(s, 1, { fire: true, pitch: Math.atan2(target.center.y - 1.6, 6) });
        const damage = applyVestDamage({ ...s.players.B, armor: 100 }, "rifle", zone);
        expect(s.players.B.hp).toBe(100 - damage);
        expect(s.events.find((e) => e.hit)?.hit).toMatchObject({
          zone,
          damage,
          victim: "B",
        });
      });
  it("retains the original rules for a legacy checkpoint", () => {
    const s = live(1);
    delete s.combatVersion;
    lane(s);
    tick(s, 1, { fire: true });
    expect(s.players.B.hp).toBe(0);
  });
  it("retains unarmored v2 checkpoints and restores new-match vests on respawn", () => {
    const s = live();
    delete s.armorVersion;
    delete s.players.B.armor;
    lane(s);
    const volume = combatVolumes(s.players.B).chest;
    tick(s, 1, { fire: true, pitch: Math.atan2(volume.center.y - 1.6, 6) });
    expect(s.players.B.hp).toBe(100 - HIT_DAMAGE.rifle.chest);
    const modern = live();
    modern.players.A.armor = 2;
    modern.phase = "round-end";
    modern.phaseEndsAt = 0;
    tick(modern, 1);
    expect(modern.players.A.armor).toBe(100);
    expect(modern.players.B.armor).toBe(100);
  });
  it("reduces torso damage, consumes finite kevlar, and leaves head and legs unprotected", () => {
    const p = live().players.B;
    expect(applyVestDamage(p, "rifle", "chest")).toBe(26);
    expect(applyVestDamage(p, "rifle", "stomach")).toBe(23);
    expect(applyVestDamage(p, "rifle", "head")).toBe(34);
    expect(applyVestDamage(p, "rifle", "legs")).toBe(20);
    p.armor = 1;
    expect(applyVestDamage(p, "rifle", "chest")).toBe(32);
    expect(p.armor).toBe(0);
    expect(applyVestDamage(p, "rifle", "chest")).toBe(34);
  });
  it("sprays a learnable rising and alternating horizontal pattern", () => {
    const pattern = Array.from({ length: 30 }, (_, n) => sprayOffset("rifle", n + 1));
    expect(pattern[29]!.pitch).toBeGreaterThan(pattern[2]!.pitch * 4);
    expect(pattern.some((p) => p.yaw > 0.03)).toBe(true);
    expect(pattern.some((p) => p.yaw < -0.03)).toBe(true);
    expect(sprayOffset("rifle", 19)).toEqual(pattern[18]);
  });
  it("server-side compensation tightens real impacts rather than just moving the camera", () => {
    const uncontrolled = spray(),
      controlled = spray(true);
    expect(uncontrolled.s.players.A.ammo).toBe(0);
    expect(uncontrolled.ys.length).toBeGreaterThan(6);
    expect(controlled.ys.length).toBe(30);
    expect(Math.max(...uncontrolled.ys) - Math.min(...uncontrolled.ys)).toBeGreaterThan(0.6);
    expect(Math.max(...controlled.ys) - Math.min(...controlled.ys)).toBeLessThan(0.12);
  });
  it("recovers a short burst faster than a full spray", () => {
    const long = spray().s,
      short = live();
    let seq = 0;
    while ((short.players.A.sprayCount ?? 0) < 3) tick(short, ++seq, { fire: true });
    stepMatch(short, {}, short.players.A.lastShotAt + 300, TICK_MS);
    stepMatch(long, {}, long.players.A.lastShotAt + 300, TICK_MS);
    expect(short.players.A.recoilPitch).toBe(0);
    expect(long.players.A.recoilPitch).toBeGreaterThan(0);
    expect(recoveryProfile(3).resetMs).toBeLessThan(recoveryProfile(30).resetMs);
    stepMatch(long, {}, long.players.A.lastShotAt + 700, TICK_MS);
    expect(long.players.A.recoilPitch).toBe(0);
  });
  it("recovers authoritative recoil independently of render frequency", () => {
    const values = [30, 60, 144].map((fps) => {
      const p = live().players.A;
      p.sprayCount = 30;
      p.lastShotAt = 0;
      p.recoilUpdatedAt = 0;
      p.recoilPitch = 0.2;
      p.recoilYaw = 0.05;
      for (let t = 1000 / fps; t < 350; t += 1000 / fps) recoverCombatRecoil(p, t);
      recoverCombatRecoil(p, 350);
      return p.recoilPitch!;
    });
    expect(values[0]).toBeCloseTo(values[1]!, 10);
    expect(values[1]).toBeCloseTo(values[2]!, 10);
  });
  it("has no blood event when cover intercepts the shot", () => {
    const s = live();
    tick(s, 1, { fire: true });
    expect(s.events.some((e) => e.hit)).toBe(false);
  });
  it("attaches blood only to a real surface near the hit", () => {
    const s = live();
    // Through the east arch; the edge building's wall is 0.9 m behind the target.
    Object.assign(s.players.A, { x: 8.3, z: -9.1 });
    Object.assign(s.players.B, { x: 8.3, z: -13.6 });
    tick(s, 1, { fire: true });
    const hit = s.events.find((e) => e.hit)?.hit;
    expect(hit?.splatter).toBeDefined();
    expect(hit!.splatter!.distance).toBeLessThanOrEqual(3.5);
    expect(hit!.splatter!.point.z).toBeLessThan(s.players.B.z);
  });
  it("emits steps only for real grounded movement, not idle or blocked input", () => {
    const s = live();
    let steps = 0;
    for (let n = 1; n <= 10; n++) {
      tick(s, n);
      steps += s.events.filter((e) => e.type === "step").length;
    }
    expect(steps).toBe(0);
    for (let n = 11; n <= 50; n++) {
      tick(s, n, { strafe: 1 });
      steps += s.events.filter((e) => e.type === "step").length;
    }
    expect(steps).toBeGreaterThan(0);
    // Pressed against the west house: strafing right (+x) is blocked.
    Object.assign(s.players.A, { x: -16.35, z: 6 });
    s.players.A.stepDistance = 0;
    for (let n = 51; n <= 70; n++) {
      tick(s, n, { strafe: 1 });
      expect(s.events.some((e) => e.type === "step")).toBe(false);
    }
  });
  it("hides raw sound positions and blood coordinates for unseen enemies", () => {
    const s = live();
    s.events = [
      {
        type: "step",
        seat: "B",
        text: "Footstep",
        audio: { kind: "step", position: { x: s.players.B.x, y: 0, z: s.players.B.z } },
      },
      {
        type: "hit",
        seat: "A",
        text: "Hit",
        hit: {
          victim: "B",
          zone: "head",
          damage: 50,
          point: { x: 1, y: 1, z: 1 },
          direction: { x: 0, y: 0, z: 1 },
        },
      },
    ];
    const { server: _, ...state } = s,
      result = snapshotForPlayer({ state }, "A");
    expect(result.visibility.B).toBe(false);
    expect(result.state.events[0]!.audio).not.toHaveProperty("position");
    expect(result.state.events[1]).not.toHaveProperty("hit");
    expect(result.state).not.toHaveProperty("server");
  });
  it("holding the pistol trigger cannot fire automatically", () => {
    const s = live();
    for (let n = 1; n <= 40; n++) tick(s, n, { weapon: "pistol", fire: true });
    expect(s.players.A.ammo).toBe(11);
    tick(s, 41, { weapon: "pistol", fire: false });
    tick(s, 42, { weapon: "pistol", fire: true });
    expect(s.players.A.ammo).toBe(10);
  });
});
