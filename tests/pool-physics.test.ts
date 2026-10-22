import { describe, expect, it } from "vitest";
import {
  BALL_R,
  POCKETS,
  TABLE_H,
  TABLE_W,
  cosMicro,
  isqrt,
  simulate,
  sinMicro,
  type Ball,
  type ShotInput,
} from "../src/lib/pool/physics";
import { playShot } from "../src/lib/pool/play";
import {
  applyPlayedShot,
  applyTimeout,
  freshTable,
  groupClear,
  legalPlacement,
  placeCue,
  rackBalls,
  seedHash,
  stateHash,
} from "../src/lib/pool/rules";
import { replayMatch } from "../src/lib/pool/verify";

const shot = (over: Partial<ShotInput> = {}): ShotInput => ({
  angleMilli: 0,
  power: 7000,
  spinX: 0,
  spinY: 0,
  placeX: null,
  placeY: null,
  calledPocket: null,
  ...over,
});

function still(id: number, x: number, y: number, pocketed = false): Ball {
  return { id, x, y, vx: 0, vy: 0, spin: 0, pocketed };
}

describe("pool physics", () => {
  it("uses an integer sine that hits the known angles", () => {
    expect(sinMicro(0)).toBe(0);
    expect(sinMicro(30_000)).toBe(500_000);
    expect(sinMicro(90_000)).toBe(1_000_000);
    expect(sinMicro(180_000)).toBe(0);
    expect(sinMicro(270_000)).toBe(-1_000_000);
    expect(cosMicro(0)).toBe(1_000_000);
    expect(isqrt(144)).toBe(12);
  });

  it("racks fifteen balls without overlap and pins the 8", () => {
    const balls = rackBalls(new Uint8Array(32).fill(7));
    expect(balls).toHaveLength(16);
    const eight = balls.find((b) => b.id === 8);
    expect(eight?.pocketed).toBe(false);
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (!a || !b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        expect(dx * dx + dy * dy).toBeGreaterThan((BALL_R * 2) ** 2);
      }
    }
  });

  it("replays an identical shot to the same hash", () => {
    const seed = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
    const table = freshTable(seed);
    const input = shot({ angleMilli: 0, power: 8000 });
    placeCue(table, { ...input, placeX: table.balls[0]?.x ?? 0, placeY: table.balls[0]?.y ?? 0 });
    const a = simulate(table.balls, input);
    const b = simulate(table.balls, input);
    const sa = applyPlayedShot(table, a, null).state;
    const sb = applyPlayedShot(table, b, null).state;
    expect(stateHash(sa)).toBe(stateHash(sb));
    expect(a.pocketed).toEqual(b.pocketed);
    expect(a.firstContact).toBe(b.firstContact);
  });

  it("transfers a head-on collision to the object ball", () => {
    const balls = [still(0, 400_000, 600_000), still(1, 500_000, 600_000)];
    const result = simulate(balls, shot({ angleMilli: 0, power: 5000 }));
    const cue = result.balls.find((b) => b.id === 0);
    const obj = result.balls.find((b) => b.id === 1);
    expect(result.firstContact).toBe(1);
    expect(obj && cue && obj.x).toBeGreaterThan(cue.x);
  });

  it("pockets a ball aimed into a corner", () => {
    const pocket = POCKETS[5];
    expect(pocket).toBeTruthy();
    if (!pocket) return;
    const aimX = pocket.x - 220_000;
    const aimY = pocket.y - 180_000;
    const balls = [still(0, aimX - 180_000, aimY - 140_000), still(8, aimX, aimY)];
    const angle = Math.round((Math.atan2(aimY - (aimY - 140_000), aimX - (aimX - 180_000)) * 180_000) / Math.PI);
    const result = simulate(balls, shot({ angleMilli: angle, power: 9000 }));
    expect(result.pocketed).toContain(8);
    expect(result.pocketOf[8]).toBe(5);
  });

  it("keeps a grazing ball inside the table", () => {
    const balls = [still(0, 200_000, TABLE_H / 2)];
    const result = simulate(balls, shot({ angleMilli: 20_000, power: 10_000 }));
    for (const b of result.balls) {
      if (b.pocketed) continue;
      expect(b.x).toBeGreaterThanOrEqual(BALL_R - 1);
      expect(b.y).toBeGreaterThanOrEqual(BALL_R - 1);
      expect(b.x).toBeLessThanOrEqual(TABLE_W - BALL_R + 1);
      expect(b.y).toBeLessThanOrEqual(TABLE_H - BALL_R + 1);
    }
  });

  it("settles a full break without leaving balls overlapping", () => {
    const table = freshTable(Uint8Array.from({ length: 32 }, (_, i) => (i * 17) % 255));
    const input = shot({ angleMilli: 2_000, power: 10_000, spinX: 200 });
    const result = simulate(table.balls, input);
    const live = result.balls.filter((b) => !b.pocketed);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i];
        const b = live[j];
        if (!a || !b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        expect(dx * dx + dy * dy).toBeGreaterThan((BALL_R * 2 - 800) ** 2);
      }
    }
  });

  it("simulates twenty breaks quickly enough for a shot clock", () => {
    const started = Date.now();
    for (let n = 0; n < 20; n++) {
      const table = freshTable(Uint8Array.from({ length: 32 }, (_, i) => i + n));
      simulate(table.balls, shot({ angleMilli: n * 1000, power: 8000 }));
    }
    expect(Date.now() - started).toBeLessThan(4000);
  });
});

describe("pool rules", () => {
  it("assigns the first legally pocketed group and keeps the turn", () => {
    const state = freshTable(new Uint8Array(32).fill(3));
    state.breakShot = false;
    state.ballInHand = false;
    state.kitchenOnly = false;
    const cue = state.balls.find((b) => b.id === 0);
    const one = state.balls.find((b) => b.id === 1);
    if (!cue || !one) throw new Error("rack");
    cue.x = 300_000;
    cue.y = 400_000;
    one.x = 420_000;
    one.y = 400_000;
    const pocket = POCKETS[2];
    if (!pocket) throw new Error("pocket");
    one.x = pocket.x - 160_000;
    one.y = pocket.y;
    cue.x = one.x - 120_000;
    cue.y = one.y;
    const input = shot({ angleMilli: 0, power: 8000 });
    const sim = simulate(state.balls, input);
    const applied = applyPlayedShot(state, sim, null);
    expect(sim.pocketed).toContain(1);
    expect(applied.event.foul).toBe(false);
    expect(applied.state.open).toBe(false);
    expect(applied.state.groupA).toBe("solids");
    expect(applied.state.turn).toBe("A");
    expect(applied.event.continue).toBe(true);
  });

  it("gives ball-in-hand to the opponent after a scratch", () => {
    const state = freshTable(new Uint8Array(32).fill(1));
    state.breakShot = false;
    state.ballInHand = false;
    state.open = false;
    state.groupA = "solids";
    const cue = state.balls.find((b) => b.id === 0);
    const one = state.balls.find((b) => b.id === 1);
    const pocket = POCKETS[0];
    if (!cue || !one || !pocket) throw new Error("setup");
    for (const b of state.balls) if (b.id !== 0 && b.id !== 1 && b.id !== 8) b.pocketed = true;
    cue.x = pocket.x + 80_000;
    cue.y = pocket.y + 80_000;
    one.x = pocket.x + 200_000;
    one.y = pocket.y + 200_000;
    const sim = simulate(state.balls, shot({ angleMilli: 180_000 + 45_000, power: 9000 }));
    expect(sim.cueScratch).toBe(true);
    const applied = applyPlayedShot(state, sim, null);
    expect(applied.event.foul).toBe(true);
    expect(applied.state.turn).toBe("B");
    expect(applied.state.ballInHand).toBe(true);
    expect(applied.state.winner).toBeNull();
  });

  it("loses when the 8 falls before the group is clear", () => {
    const state = freshTable(new Uint8Array(32).fill(9));
    state.breakShot = false;
    state.ballInHand = false;
    state.open = false;
    state.groupA = "solids";
    const cue = state.balls.find((b) => b.id === 0);
    const eight = state.balls.find((b) => b.id === 8);
    const pocket = POCKETS[5];
    if (!cue || !eight || !pocket) throw new Error("setup");
    eight.x = pocket.x - 150_000;
    eight.y = pocket.y;
    cue.x = eight.x - 100_000;
    cue.y = eight.y;
    const sim = simulate(state.balls, shot({ angleMilli: 0, power: 8500 }));
    expect(sim.pocketed).toContain(8);
    const applied = applyPlayedShot(state, sim, 5);
    expect(applied.state.winner).toBe("B");
    expect(applied.state.reason).toBe("EIGHT_EARLY");
  });

  it("wins when the called 8 falls in the called pocket", () => {
    const state = freshTable(new Uint8Array(32).fill(4));
    state.breakShot = false;
    state.ballInHand = false;
    state.open = false;
    state.groupA = "solids";
    for (const b of state.balls) if (b.id >= 1 && b.id <= 7) b.pocketed = true;
    expect(groupClear(state.balls, "solids")).toBe(true);
    const cue = state.balls.find((b) => b.id === 0);
    const eight = state.balls.find((b) => b.id === 8);
    const pocket = POCKETS[2];
    if (!cue || !eight || !pocket) throw new Error("setup");
    eight.x = pocket.x - 140_000;
    eight.y = pocket.y + 10_000;
    cue.x = eight.x - 110_000;
    cue.y = eight.y;
    const sim = simulate(state.balls, shot({ angleMilli: 0, power: 8000 }));
    expect(sim.pocketOf[8]).toBe(2);
    const applied = applyPlayedShot(state, sim, 2);
    expect(applied.state.winner).toBe("A");
    expect(applied.state.reason).toBe("EIGHT_BALL");
    const wrong = applyPlayedShot(state, sim, 0);
    expect(wrong.state.winner).toBe("B");
    expect(wrong.state.reason).toBe("EIGHT_WRONG_POCKET");
  });

  it("rejects an 8-ball shot that does not call a pocket", () => {
    const state = freshTable(new Uint8Array(32).fill(2));
    state.breakShot = false;
    state.open = false;
    state.groupA = "solids";
    for (const b of state.balls) if (b.id >= 1 && b.id <= 7) b.pocketed = true;
    const before = stateHash(state);
    const sim = simulate(state.balls, shot());
    const applied = applyPlayedShot(state, sim, null);
    expect(applied.event.reason).toBe("CALL_POCKET");
    expect(stateHash(applied.state)).toBe(before);
  });

  it("forfeits on the third timeout and only then", () => {
    const state = freshTable(new Uint8Array(32).fill(5));
    const once = applyTimeout(state);
    expect(once.winner).toBeNull();
    expect(once.turn).toBe("B");
    expect(once.timeouts.A).toBe(1);
    expect(once.ballInHand).toBe(true);
    const twice = applyTimeout({ ...once, turn: "A" });
    const third = applyTimeout({ ...twice, turn: "A" });
    expect(third.winner).toBe("B");
    expect(third.reason).toBe("TIMEOUT_FORFEIT");
  });

  it("keeps the kitchen behind the head string", () => {
    const state = freshTable(new Uint8Array(32).fill(6));
    expect(legalPlacement(state, Math.floor(TABLE_W / 4), Math.floor(TABLE_H / 2))).toBe(true);
    expect(legalPlacement(state, Math.floor(TABLE_W / 2), Math.floor(TABLE_H / 2))).toBe(false);
  });

  it("pays only the winner a full replay of the shots produces", async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, i) => i + 9);
    const table = freshTable(seed);
    const cue = table.balls.find((b) => b.id === 0);
    if (!cue) throw new Error("cue");
    const input = shot({ placeX: cue.x, placeY: cue.y, angleMilli: 0, power: 8000 });
    const played = playShot(table, input);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(stateHash(table)).toBe(stateHash(freshTable(seed)));
    const replay = await replayMatch(seed, await seedHash(seed), [
      { kind: "shot", input, hash: played.hash },
    ]);
    expect(replay.ok).toBe(true);
    expect(replay.winner).toBe(played.state.winner);
    expect(replay.finalHash).toBe(played.hash);
  });
});
