import { describe, expect, it } from "vitest";
import {
  buyPrimary,
  createMatch,
  predictMovement,
  startMatch,
  stepMatch,
  TICK_MS,
} from "../src/lib/fps/simulation";
import { validateInput, type Input, type MatchState, type Seat } from "../src/lib/fps/protocol";
import { AWP, awpDamage, awpSpread, updateScope } from "../src/lib/fps/primary";
import { BUY_TIME_MS, validateBuy } from "../src/lib/fps/buy";
import {
  buyBombPrimary,
  createBombMatch,
  startBombMatch,
  stepBombMatch,
} from "../src/lib/fps/bomb/match";
import { DEFAULT_MAP } from "../src/lib/fps/maps/registry";

/**
 * The AWP: CS:GO damage and fire rate, bolt action, single 4× zoom, spawn buy. Server rules only
 * (the client presentation has its own tests and browser checks).
 */
const input = (seq: number, over: Partial<Input> = {}): Input => ({
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
  ...over,
});

/** A live 1v1 on Dustfront's open lane, `shooter` holding the AWP, 6 m from the target. */
function duel(shooter: Seat = "A", armor = 100) {
  const s = createMatch({ A: "a", B: "b" }, 5, 0);
  startMatch(s, 0);
  stepMatch(s, {}, 3000, TICK_MS);
  expect(s.phase).toBe("live");
  const target: Seat = shooter === "A" ? "B" : "A";
  // Buy at the spawn, inside the window, then move to the lane.
  expect(buyPrimary(s, shooter, "awp", 3010)).toBe(true);
  Object.assign(s.players[shooter], { x: 0, z: -2.4, y: 0 });
  Object.assign(s.players[target], { x: 0, z: -8.4, y: 0, armor });
  s.server!.spreadSeed = 4242;
  return { s, target, t: 3034 };
}
const aim = (s: MatchState, shooter: Seat, height: number) => {
  const target = s.players[shooter === "A" ? "B" : "A"];
  const dz = target.z - s.players[shooter].z;
  return { yaw: Math.atan2(0, -dz), pitch: Math.atan2(height - 1.6, Math.abs(dz)) };
};

describe("AWP damage (CS:GO table)", () => {
  it("matches CS:GO per hit group, with and without a vest", () => {
    const body = (armor: number) => ({ armor, hp: 100 }) as never;
    expect(awpDamage(body(0), "head")).toBe(459);
    expect(awpDamage(body(0), "chest")).toBe(115);
    expect(awpDamage(body(0), "stomach")).toBe(143);
    expect(awpDamage(body(0), "legs")).toBe(85);
    expect(awpDamage(body(100), "chest")).toBe(112);
    expect(awpDamage(body(100), "stomach")).toBe(139);
    expect(awpDamage(body(100), "legs")).toBe(85);
  });

  it("kills with one scoped shot to the head, chest or stomach; a leg shot leaves 15 HP", () => {
    for (const [zone, height, left] of [
      ["head", 1.62, 0],
      ["chest", 1.2, 0],
      ["stomach", 0.78, 0],
      ["legs", 0.3, 15],
    ] as const) {
      const { s, target, t } = duel();
      const a = aim(s, "A", height);
      stepMatch(s, { A: input(1, { ...a, scope: true }) }, t, TICK_MS);
      const settled = t + 34 * 5;
      for (let k = 1; k <= 5; k++)
        stepMatch(s, { A: input(1 + k, { ...a, scope: true }) }, t + 34 * k, TICK_MS);
      stepMatch(s, { A: input(10, { ...a, scope: true, fire: true }) }, settled + 34, TICK_MS);
      expect(s.players[target].hp, zone).toBe(left);
    }
  });
});

describe("AWP bolt action and fire rate", () => {
  it("fires once per trigger press and not again until the 1.463 s cycle completes", () => {
    const { s, t } = duel();
    s.players.B.hp = 10_000; // keep the round going
    const a = aim(s, "A", 1.2);
    stepMatch(s, { A: input(1, { ...a, fire: true }) }, t, TICK_MS);
    expect(s.players.A.ammo).toBe(AWP.magazine - 1);
    // Held trigger: no second shot, even after the cycle.
    let seq = 2,
      now = t;
    for (; now < t + AWP.cycleMs + 200; now += 34)
      stepMatch(s, { A: input(seq++, { ...a, fire: true }) }, now + 34, TICK_MS);
    expect(s.players.A.ammo).toBe(AWP.magazine - 1);
    // Released and pressed within the cycle: refused; after it: fires.
    const t2 = s.server!.lastStepAt;
    stepMatch(s, { A: input(seq++, { ...a }) }, t2 + 34, TICK_MS);
    stepMatch(s, { A: input(seq++, { ...a, fire: true }) }, t2 + 68, TICK_MS);
    expect(s.players.A.ammo).toBe(AWP.magazine - 2);
    stepMatch(s, { A: input(seq++, { ...a }) }, t2 + 102, TICK_MS);
    stepMatch(s, { A: input(seq++, { ...a, fire: true }) }, t2 + 136, TICK_MS);
    expect(s.players.A.ammo, "inside the cycle").toBe(AWP.magazine - 2);
  });

  it("reloads 10 rounds from 30 in 3.67 s, and keeps the rifle's numbers untouched", () => {
    const { s, t } = duel();
    s.players.A.ammo = 3;
    stepMatch(s, { A: input(1, { reload: true }) }, t, TICK_MS);
    expect(s.players.A.reloadUntil).toBe(t + AWP.reloadMs);
    let now = t;
    for (let seq = 2; now <= t + AWP.reloadMs + 40; seq++)
      stepMatch(s, { A: input(seq) }, (now += 34), TICK_MS);
    expect(s.players.A.ammo).toBe(10);
    expect(s.players.A.reserve).toBe(23);
    expect(s.players.B.ammo).toBe(30);
  });
});

describe("AWP scope and accuracy", () => {
  it("scopes only with the AWP drawn, drops the zoom on a shot and resumes after the bolt cycle", () => {
    const { s, t } = duel();
    s.players.B.hp = 10_000;
    const a = aim(s, "A", 1.2);
    stepMatch(s, { A: input(1, { ...a, scope: true }) }, t, TICK_MS);
    expect(s.players.A.scoped).toBe(true);
    stepMatch(s, { A: input(2, { ...a, scope: true, fire: true }) }, t + 34, TICK_MS);
    expect(s.players.A.scoped).toBeUndefined();
    stepMatch(s, { A: input(3, { ...a, scope: true }) }, t + 68, TICK_MS);
    expect(s.players.A.scoped, "bolt still cycling").toBeUndefined();
    let seq = 4,
      now = t + 68;
    while (now < t + 34 + AWP.cycleMs + 40)
      stepMatch(s, { A: input(seq++, { ...a, scope: true }) }, (now += 34), TICK_MS);
    expect(s.players.A.scoped, "zoom resumes").toBe(true);
    // The rifle and the knife never scope.
    const p = { ...s.players.B, weapon: "rifle" as const };
    expect(updateScope(p, true, now)).toBe(false);
  });

  it("no-scopes are very inaccurate, scoped standing shots near perfect, running ruins the scope", () => {
    const standingScoped = awpSpread({
      scoped: true,
      speedFraction: 0,
      airborne: false,
      crouched: false,
    });
    const walkingScoped = awpSpread({
      scoped: true,
      speedFraction: 0.225,
      airborne: false,
      crouched: false,
    });
    const runningScoped = awpSpread({
      scoped: true,
      speedFraction: 0.5,
      airborne: false,
      crouched: false,
    });
    const noScope = awpSpread({
      scoped: false,
      speedFraction: 0,
      airborne: false,
      crouched: false,
    });
    const jumping = awpSpread({ scoped: true, speedFraction: 0, airborne: true, crouched: false });
    expect(standingScoped).toBeLessThan(0.001);
    expect(walkingScoped).toBe(standingScoped); // under 34 % of full speed
    expect(runningScoped).toBeGreaterThan(standingScoped * 20);
    expect(noScope).toBeGreaterThan(0.08);
    expect(jumping).toBeGreaterThan(0.1);
    // A no-scope at a chest 30 m away misses most of the time.
    let hits = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const { s } = duel();
      s.players.B.z = -32.4;
      s.server!.spreadSeed = seed;
      const a = aim(s, "A", 1.2);
      stepMatch(s, { A: input(1, { ...a, fire: true }) }, 3034, TICK_MS);
      if (s.players.B.hp < 100) hits++;
    }
    expect(hits).toBeLessThan(60);
  });

  it("moves slower with the AWP (200 u/s) and slower again scoped (100 u/s)", () => {
    const dist = (primary?: "awp", scoped?: boolean) => {
      const s = createMatch({ A: "a", B: "b" }, 5, 0);
      const p = {
        ...s.players.A,
        x: 0,
        z: -2.4,
        y: 0,
        ...(primary ? { primary } : {}),
        ...(scoped ? { scoped } : {}),
      };
      for (let i = 0; i < 8; i++)
        predictMovement(p, input(i, { forward: 1 }), TICK_MS, DEFAULT_MAP);
      return Math.hypot(p.x, p.z + 2.4);
    };
    const rifle = dist(),
      awp = dist("awp"),
      scoped = dist("awp", true);
    expect(awp / rifle).toBeCloseTo(200 / 215, 2);
    expect(scoped / rifle).toBeCloseTo(100 / 215, 2);
  });

  it("accepts the scope flag on the wire and nothing else new", () => {
    expect(validateInput({ ...input(1), scope: true })?.scope).toBe(true);
    expect(validateInput({ ...input(1), scope: "yes" })).toBeNull();
  });
});

describe("Spawn buy (B)", () => {
  it("validates purchases strictly", () => {
    expect(validateBuy({ v: 1, type: "buy", item: "awp" })).toEqual({
      v: 1,
      type: "buy",
      item: "awp",
    });
    expect(validateBuy({ v: 1, type: "buy", item: "rifle" })?.item).toBe("rifle");
    expect(validateBuy({ v: 1, type: "buy", item: "negev" })).toBeNull();
    expect(validateBuy({ v: 1, type: "buy", item: "awp", extra: 1 })).toBeNull();
  });

  it("1v1: buys in the countdown, at the spawn early in a round, never later or away from spawn", () => {
    const s = createMatch({ A: "a", B: "b" }, 5, 0);
    startMatch(s, 0);
    expect(s.phase).toBe("countdown");
    expect(buyPrimary(s, "A", "awp", 100)).toBe(true);
    expect(s.players.A).toMatchObject({ primary: "awp", ammo: 10, reserve: 30 });
    stepMatch(s, {}, 3000, TICK_MS);
    expect(buyPrimary(s, "A", "rifle", 3100)).toBe(true);
    expect(s.players.A.primary).toBeUndefined();
    expect(s.players.A.ammo).toBe(30);
    s.players.A.x += 20; // walked away from the spawn
    expect(buyPrimary(s, "A", "awp", 3200)).toBe(false);
    s.players.A.x -= 20;
    expect(buyPrimary(s, "A", "awp", 3000 + BUY_TIME_MS + 100)).toBe(false);
  });

  it("1v1: the bought AWP carries over to the next round with fresh ammunition", () => {
    const { s, t } = duel();
    s.players.A.ammo = 1;
    s.players.B.hp = 0;
    stepMatch(s, { A: input(1) }, t, TICK_MS);
    expect(s.phase).toBe("round-end");
    stepMatch(s, {}, s.phaseEndsAt + 1, TICK_MS);
    expect(s.phase).toBe("live");
    expect(s.players.A).toMatchObject({ primary: "awp", ammo: 10, reserve: 30 });
    expect(s.players.B.primary).toBeUndefined();
  });

  it("Bomb Defusal: buys during freeze time; one scoped AWP body shot kills a vested enemy", () => {
    const slots = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true }));
    const s = createBombMatch(slots, 0, 9);
    startBombMatch(s, 0);
    expect(s.phase).toBe("freeze");
    expect(buyBombPrimary(s, 0, "awp", 10)).toBe(true);
    expect(s.players[0]).toMatchObject({ primary: "awp", ammo: 10, reserve: 30 });
    let t = 0;
    while (s.phase !== "live") stepBombMatch(s, {}, (t += TICK_MS));
    // Mid plaza: shooter and target 8 m apart in the open.
    Object.assign(s.players[0]!, { x: 0, z: -12, y: 0 });
    Object.assign(s.players[5]!, { x: 0, z: -4, y: 0 });
    for (const q of s.players)
      if (q.slot !== 0 && q.slot !== 5) Object.assign(q, { x: 36, z: 36 - q.slot });
    const yaw = Math.PI,
      pitch = Math.atan2(1.2 - 1.6, 8);
    const bomb = (seq: number, over: Partial<Input> = {}) => ({
      0: input(seq, { yaw, pitch, scope: true, ...over }),
    });
    for (let k = 0; k < 6; k++) stepBombMatch(s, bomb(k + 1), (t += TICK_MS));
    expect(s.players[0]!.scoped).toBe(true);
    stepBombMatch(s, bomb(20, { fire: true }), (t += TICK_MS));
    expect(s.players[5]!.hp).toBe(0);
    // Out of the window later in the round.
    expect(buyBombPrimary(s, 0, "rifle", t + BUY_TIME_MS + 1000)).toBe(false);
  });
});
