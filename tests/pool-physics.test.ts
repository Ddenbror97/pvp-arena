import { describe, expect, it } from "vitest";
import {
  BALL_R,
  PHYSICS_V1,
  PHYSICS_V2,
  PHYSICS_V3,
  PHYSICS_V4,
  PHYSICS_V5,
  PHYSICS_V6,
  PHYSICS_V7,
  POCKETS,
  cushionLimit,
  pocketAtPoint,
  TABLE_H,
  TABLE_W,
  cosMicro,
  isqrt,
  launchSpeed,
  rollDrop,
  simulate,
  sinMicro,
  type Ball,
  type ShotInput,
} from "../src/lib/pool/physics";
import { confirmedWinner, playShot } from "../src/lib/pool/play";
import {
  applyPlayedShot,
  applyShot,
  calledPocketChoice,
  applyTimeout,
  defaultCueSpot,
  freshTable,
  groupClear,
  legalPlacement,
  placeCue,
  seatGroup,
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
    const angle = Math.round(
      (Math.atan2(aimY - (aimY - 140_000), aimX - (aimX - 180_000)) * 180_000) / Math.PI,
    );
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

  it("keeps the v2 cue speed through 60% and adds break speed only after that", () => {
    expect(launchSpeed(10_000, PHYSICS_V1)).toBe(14_000);
    expect(launchSpeed(10_000, PHYSICS_V2)).toBe(14_000);
    expect(launchSpeed(6_000, PHYSICS_V3)).toBe(8_400);
    expect(launchSpeed(10_000, PHYSICS_V3)).toBe(28_000);
    expect(launchSpeed(10_000, PHYSICS_V4)).toBe(16_800);
    expect(launchSpeed(6_000, PHYSICS_V4)).toBe(5_040);
    expect(launchSpeed(1, PHYSICS_V4)).toBe(1);
    expect(launchSpeed(10_000, PHYSICS_V5)).toBe(16_800);
    expect(launchSpeed(6_000, PHYSICS_V5)).toBe(5_040);
    expect(launchSpeed(10_000, PHYSICS_V6)).toBe(20_000);
    expect(launchSpeed(5_000, PHYSICS_V6)).toBe(10_000);
    expect(launchSpeed(1, PHYSICS_V6)).toBe(2);
    expect(launchSpeed(10_000, PHYSICS_V7)).toBe(20_000);
    expect(launchSpeed(5_000, PHYSICS_V7)).toBe(10_000);
    expect(launchSpeed(1, PHYSICS_V7)).toBe(2);
    expect(launchSpeed(10_000)).toBe(20_000);
    expect(rollDrop(14_000, PHYSICS_V2)).toBe(4 + Math.trunc(14_000 / 900));
    expect(rollDrop(28_000, PHYSICS_V3)).toBe(2 + Math.trunc(28_000 / 1_500));
    expect(rollDrop(16_800, PHYSICS_V4)).toBe(2 + Math.trunc(16_800 / 1_500));
    expect(rollDrop(16_800, PHYSICS_V5)).toBe(2 + Math.trunc(16_800 / 1_500));
    expect(rollDrop(20_000, PHYSICS_V6)).toBe(2 + Math.trunc(20_000 / 260));
    expect(rollDrop(20_000, PHYSICS_V7)).toBe(1 + Math.trunc(20_000 / 340));
    expect(rollDrop(800, PHYSICS_V7)).toBe(1 + Math.trunc(800 / 340));
    expect(rollDrop(14_000, PHYSICS_V1)).toBe(32 + Math.trunc(14_000 / 160));
    expect(freshTable(new Uint8Array(32)).physics).toBe(PHYSICS_V7);
  });

  it("sends a full-power smash farther than the previous roll", () => {
    const seeds = [7, 19, 41];
    const spread = (physics: "pool-phys-v2" | "pool-phys-v3", salt: number) => {
      const table = freshTable(Uint8Array.from({ length: 32 }, (_, i) => i + salt), physics);
      const start = new Map(table.balls.map((ball) => [ball.id, { x: ball.x, y: ball.y }]));
      const result = simulate(table.balls, shot({ angleMilli: 0, power: 10_000 }), true, physics);
      const peak = new Map<number, number>();
      for (const frame of [table.balls, ...result.frames, result.balls]) {
        for (const ball of frame) {
          if (ball.id === 0) continue;
          const from = start.get(ball.id);
          if (!from) continue;
          const travelled = Math.hypot(ball.x - from.x, ball.y - from.y);
          peak.set(ball.id, Math.max(peak.get(ball.id) ?? 0, travelled));
        }
      }
      const distances = [...peak.values()];
      const mean = distances.reduce((sum, value) => sum + value, 0) / distances.length;
      return { mean, far: distances.filter((value) => value > 700_000).length };
    };
    let v2Mean = 0;
    let v3Mean = 0;
    let v2Far = 0;
    let v3Far = 0;
    for (const salt of seeds) {
      const older = spread(PHYSICS_V2, salt);
      const newer = spread(PHYSICS_V3, salt);
      v2Mean += older.mean;
      v3Mean += newer.mean;
      v2Far += older.far;
      v3Far += newer.far;
    }
    expect(v3Mean / seeds.length).toBeGreaterThan((v2Mean / seeds.length) * 2);
    expect(v3Mean / seeds.length).toBeGreaterThan(450_000);
    expect(v3Far).toBeGreaterThan(v2Far);
    expect(v3Far).toBeGreaterThanOrEqual(6);
  });

  it("runs a full smash slower than v3 and still past the v2 roll", () => {
    const salt = 7;
    const meanOf = (physics: "pool-phys-v2" | "pool-phys-v3" | "pool-phys-v4") => {
      const table = freshTable(Uint8Array.from({ length: 32 }, (_, i) => i + salt), physics);
      const start = new Map(table.balls.map((ball) => [ball.id, { x: ball.x, y: ball.y }]));
      const result = simulate(table.balls, shot({ angleMilli: 0, power: 10_000 }), false, physics);
      let sum = 0;
      let count = 0;
      for (const ball of result.balls) {
        if (ball.id === 0) continue;
        const from = start.get(ball.id);
        if (!from) continue;
        sum += Math.hypot(ball.x - from.x, ball.y - from.y);
        count += 1;
      }
      return sum / count;
    };
    const v2 = meanOf(PHYSICS_V2);
    const v3 = meanOf(PHYSICS_V3);
    const v4 = meanOf(PHYSICS_V4);
    expect(v4).toBeLessThan(v3);
    expect(v4).toBeGreaterThan(v2);
  });

  it("replays an open v2 match on v2 when the rack says so", async () => {
    const seed = Uint8Array.from({ length: 32 }, (_, i) => i + 11);
    const table = freshTable(seed, PHYSICS_V2);
    const cue = table.balls.find((b) => b.id === 0);
    if (!cue) throw new Error("cue");
    const input = shot({ angleMilli: 0, power: 10_000, placeX: cue.x, placeY: cue.y });
    const played = playShot(table, input);
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    const published = await seedHash(seed);
    const steps = [{ kind: "shot" as const, input, hash: played.hash }];
    const same = await confirmedWinner(seed, published, steps, PHYSICS_V2);
    const drifted = await confirmedWinner(seed, published, steps, PHYSICS_V3);
    expect(same).toEqual({ ok: true, winner: played.state.winner, hash: played.hash });
    expect(drifted.ok).toBe(false);
  });

  it("reaches the rack from the head string only under the newer roll", () => {
    const table = freshTable(Uint8Array.from({ length: 32 }, (_, i) => i + 7));
    const cue = table.balls.find((b) => b.id === 0);
    if (!cue) throw new Error("cue");
    const input = shot({ angleMilli: 0, power: 10_000, placeX: cue.x, placeY: cue.y });
    placeCue(table, input);
    const reached = simulate(table.balls, input, false, "pool-phys-v2");
    const stopped = simulate(table.balls, input, false, "pool-phys-v1");
    expect(reached.firstContact).not.toBeNull();
    expect(stopped.firstContact).toBeNull();
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
  const rackSim = (
    state: ReturnType<typeof freshTable>,
    pocketed: number[],
    firstContact: number,
    cueScratch = false,
  ) => {
    const down = new Set(pocketed);
    return {
      balls: state.balls.map((ball) => ({
        ...ball,
        vx: 0,
        vy: 0,
        spin: 0,
        pocketed: ball.pocketed || down.has(ball.id),
      })),
      pocketed,
      pocketOf: Object.fromEntries(pocketed.filter((id) => id !== 0).map((id) => [id, 0])),
      firstContact,
      railAfterContact: true,
      breakRails: 4,
      cueScratch,
      frames: [],
    };
  };

  it("gives the breaker solids when the first ball down is a solid", () => {
    const state = freshTable(new Uint8Array(32).fill(3));
    const applied = applyShot(state, rackSim(state, [1], 1));
    expect(applied.event.foul).toBe(false);
    expect(applied.state.open).toBe(false);
    expect(applied.state.groupA).toBe("solids");
    expect(seatGroup(applied.state, "A")).toBe("solids");
    expect(seatGroup(applied.state, "B")).toBe("stripes");
    expect(applied.state.turn).toBe("A");
    expect(applied.event.continue).toBe(true);
  });

  it("keeps the first ball when the break pockets both groups", () => {
    const state = freshTable(new Uint8Array(32).fill(4));
    const applied = applyShot(state, rackSim(state, [11, 1], 11));
    expect(applied.state.groupA).toBe("stripes");
    expect(seatGroup(applied.state, "A")).toBe("stripes");
    expect(seatGroup(applied.state, "B")).toBe("solids");
    expect(applied.state.turn).toBe("A");
  });

  it("gives seat B solids when they pocket the first solid", () => {
    const state = freshTable(new Uint8Array(32).fill(5));
    state.turn = "B";
    state.breakShot = false;
    state.ballInHand = false;
    const applied = applyShot(state, rackSim(state, [3], 3));
    expect(applied.state.open).toBe(false);
    expect(applied.state.groupA).toBe("stripes");
    expect(seatGroup(applied.state, "B")).toBe("solids");
    expect(applied.state.turn).toBe("B");
  });

  it("does not assign a group when the break scratches", () => {
    const state = freshTable(new Uint8Array(32).fill(6));
    const applied = applyShot(state, rackSim(state, [1, 0], 1, true));
    expect(applied.event.foul).toBe(true);
    expect(applied.state.open).toBe(true);
    expect(applied.state.groupA).toBeNull();
    expect(applied.state.turn).toBe("B");
    expect(applied.state.ballInHand).toBe(true);
  });

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

  it("keeps a wrong-ball pocket down and gives the other seat ball in hand", () => {
    const state = freshTable(new Uint8Array(32).fill(8));
    state.breakShot = false;
    state.ballInHand = false;
    state.open = false;
    state.groupA = "solids";
    const cue = state.balls.find((b) => b.id === 0);
    const stripe = state.balls.find((b) => b.id === 9);
    const pocket = POCKETS[2];
    const wall = cushionLimit(state.physics);
    if (!cue || !stripe || !pocket) throw new Error("setup");
    for (const ball of state.balls) {
      if (ball.id === 0 || ball.id === 9) continue;
      ball.pocketed = ball.id !== 1 && ball.id !== 8;
      if (ball.id === 1) {
        ball.x = wall.minX + 80_000;
        ball.y = wall.maxY - 40_000;
      }
      if (ball.id === 8) {
        ball.x = wall.minX + 80_000;
        ball.y = wall.minY + 40_000;
      }
    }
    stripe.x = pocket.x - 180_000;
    stripe.y = pocket.y + 8_000;
    cue.x = stripe.x - 120_000;
    cue.y = stripe.y;
    const sim = simulate(state.balls, shot({ angleMilli: 0, power: 7_500 }));
    expect(sim.firstContact).toBe(9);
    expect(sim.pocketed).toContain(9);
    const applied = applyPlayedShot(state, sim, null);
    expect(applied.event.foul).toBe(true);
    expect(applied.event.foulReason).toBe("WRONG_BALL");
    expect(applied.event.continue).toBe(false);
    expect(applied.state.winner).toBeNull();
    expect(applied.state.turn).toBe("B");
    expect(applied.state.ballInHand).toBe(true);
    expect(applied.state.kitchenOnly).toBe(false);
    expect(applied.state.open).toBe(false);
    expect(applied.state.groupA).toBe("solids");
    expect(applied.state.balls.find((b) => b.id === 9)?.pocketed).toBe(true);
    expect(applied.state.balls.find((b) => b.id === 1)?.pocketed).toBe(false);
    expect(seatGroup(applied.state, "B")).toBe("stripes");
  });

  it("locks the 8-ball pocket after the first call", () => {
    expect(calledPocketChoice(null, 4)).toBe(4);
    expect(calledPocketChoice(4, 1)).toBe(4);
    expect(calledPocketChoice(null, 9)).toBeNull();
    expect(pocketAtPoint(POCKETS[4]!.x, POCKETS[4]!.y)).toBe(4);
    expect(pocketAtPoint(TABLE_W / 2, TABLE_H / 2)).toBeNull();
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
    const wall = cushionLimit(PHYSICS_V5);
    if (!cue || !eight || !pocket) throw new Error("setup");
    eight.x = pocket.x - 200_000;
    eight.y = wall.maxY - 8_000;
    cue.x = eight.x - 100_000;
    cue.y = eight.y;
    const sim = simulate(state.balls, shot({ angleMilli: 0, power: 6000 }));
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

  it("puts a scratched cue back on the cloth for the incoming player", () => {
    const state = freshTable(new Uint8Array(32).fill(6));
    state.breakShot = false;
    state.kitchenOnly = false;
    state.ballInHand = true;
    state.turn = "B";
    const cue = state.balls.find((ball) => ball.id === 0);
    if (!cue) throw new Error("cue");
    cue.pocketed = true;
    const spot = defaultCueSpot(state);
    expect(spot).not.toBeNull();
    if (!spot) return;
    expect(legalPlacement(state, spot.x, spot.y)).toBe(true);
    expect(spot.x).toBeGreaterThan(cushionLimit(PHYSICS_V5).minX);
    expect(spot.y).toBeGreaterThan(cushionLimit(PHYSICS_V5).minY);
    state.kitchenOnly = true;
    const kitchen = defaultCueSpot(state);
    expect(kitchen).not.toBeNull();
    if (!kitchen) return;
    expect(kitchen.x).toBeLessThanOrEqual(Math.floor(TABLE_W / 4));
    expect(legalPlacement(state, kitchen.x, kitchen.y)).toBe(true);
  });

  it("keeps the kitchen behind the head string", () => {
    const state = freshTable(new Uint8Array(32).fill(6));
    expect(legalPlacement(state, Math.floor(TABLE_W / 4), Math.floor(TABLE_H / 2))).toBe(true);
    expect(legalPlacement(state, Math.floor(TABLE_W / 2), Math.floor(TABLE_H / 2))).toBe(false);
  });

  it("hashes the animated shot the same way the paid shot is hashed", () => {
    const seed = Uint8Array.from({ length: 32 }, (_, i) => i + 4);
    const table = freshTable(seed);
    const cue = table.balls.find((ball) => ball.id === 0);
    if (!cue) throw new Error("cue");
    const input = shot({ angleMilli: 1_500, power: 9_000, placeX: cue.x, placeY: cue.y });
    const paid = playShot(table, input);
    expect(paid.ok).toBe(true);
    if (!paid.ok) return;
    const placed = structuredClone(table);
    placeCue(placed, input);
    const sim = simulate(placed.balls, input, true, table.physics);
    const animated = stateHash(applyPlayedShot(placed, sim, input.calledPocket).state);
    expect(animated).toBe(paid.hash);
    const stale = structuredClone(table);
    const object = stale.balls.find((ball) => ball.id === 1);
    if (!object) throw new Error("object");
    object.x += 8_000;
    const other = playShot(stale, input);
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(other.hash).not.toBe(paid.hash);
  });

  it("stops a firm hit inside one length and keeps a cluster off the far cushion", () => {
    const pathOf = (frames: readonly Ball[][], id: number, x0: number, y0: number) => {
      let path = 0;
      let x = x0;
      let y = y0;
      for (const frame of frames) {
        const ball = frame.find((item) => item.id === id);
        if (!ball || ball.pocketed) break;
        path += Math.hypot(ball.x - x, ball.y - y);
        x = ball.x;
        y = ball.y;
      }
      return path;
    };
    const y = Math.floor(TABLE_H / 2);
    const open = simulate(
      [{ id: 0, x: Math.floor(TABLE_W / 4), y, vx: 0, vy: 0, spin: 0, pocketed: false }],
      shot({ power: 10_000 }),
      true,
      PHYSICS_V6,
    );
    const openPath = pathOf(open.frames, 0, Math.floor(TABLE_W / 4), y);
    expect(open.frames.length).toBeLessThan(320);
    expect(openPath).toBeGreaterThan(TABLE_W * 1.35);
    expect(openPath).toBeLessThan(TABLE_W * 1.75);
    const hit = simulate(
      [
        { id: 0, x: 500_000, y, vx: 0, vy: 0, spin: 0, pocketed: false },
        { id: 1, x: 900_000, y, vx: 0, vy: 0, spin: 0, pocketed: false },
      ],
      shot({ power: 5_000 }),
      true,
      PHYSICS_V6,
    );
    expect(pathOf(hit.frames, 1, 900_000, y)).toBeLessThan(TABLE_W * 0.85);
    const table = freshTable(Uint8Array.from({ length: 32 }, (_, i) => i + 7));
    const start = new Map(table.balls.map((ball) => [ball.id, { x: ball.x, y: ball.y }]));
    const broke = simulate(table.balls, shot({ power: 10_000 }), true, PHYSICS_V6);
    let moved = 0;
    for (const [id, from] of start) {
      if (id === 0) continue;
      const travelled = pathOf(broke.frames, id, from.x, from.y);
      expect(travelled).toBeLessThan(TABLE_W * 0.85);
      if (travelled > 200_000) moved += 1;
    }
    expect(moved).toBeGreaterThanOrEqual(3);
  });

  it("lets a struck ball roll out instead of freezing on the heavier cloth", () => {
    const pathOf = (frames: readonly Ball[][], id: number, x0: number, y0: number) => {
      let path = 0;
      let x = x0;
      let y = y0;
      let last = 0;
      for (const frame of frames) {
        const ball = frame.find((item) => item.id === id);
        if (!ball || ball.pocketed) break;
        path += Math.hypot(ball.x - x, ball.y - y);
        x = ball.x;
        y = ball.y;
        last = Math.hypot(ball.vx, ball.vy);
      }
      return { path, last };
    };
    const y = Math.floor(TABLE_H / 2);
    const balls = [
      { id: 0, x: 500_000, y, vx: 0, vy: 0, spin: 0, pocketed: false },
      { id: 1, x: 900_000, y, vx: 0, vy: 0, spin: 0, pocketed: false },
    ];
    const older = simulate(balls, shot({ power: 5_000 }), true, PHYSICS_V6);
    const coast = simulate(balls, shot({ power: 5_000 }), true, PHYSICS_V7);
    const oldPath = pathOf(older.frames, 1, 900_000, y);
    const next = pathOf(coast.frames, 1, 900_000, y);
    expect(oldPath.path).toBeLessThan(TABLE_W * 0.85);
    expect(next.path).toBeGreaterThan(oldPath.path * 1.25);
    expect(next.path).toBeGreaterThan(TABLE_W * 0.88);
    expect(next.path).toBeLessThan(TABLE_W * 1.08);
    expect(coast.frames.length).toBeGreaterThan(older.frames.length + 40);
    expect(coast.frames.length).toBeLessThan(360);
    expect(next.last).toBeLessThan(40);
    const open = simulate(
      [{ id: 0, x: Math.floor(TABLE_W / 4), y, vx: 0, vy: 0, spin: 0, pocketed: false }],
      shot({ power: 10_000 }),
      true,
      PHYSICS_V7,
    );
    const openPath = pathOf(open.frames, 0, Math.floor(TABLE_W / 4), y);
    expect(openPath.path).toBeGreaterThan(TABLE_W * 1.8);
    expect(openPath.path).toBeLessThan(TABLE_W * 2.15);
    expect(open.frames.length).toBeLessThan(400);
  });

  it("stops a ball on the cushion nose and leaves older racks on the outer wall", () => {
    const wall = cushionLimit(PHYSICS_V5);
    const lone = (x: number, y: number): Ball => ({
      id: 0,
      x,
      y,
      vx: 0,
      vy: 0,
      spin: 0,
      pocketed: false,
    });
    const furthest = (physics: "pool-phys-v4" | "pool-phys-v5", angleMilli: number) => {
      const start = lone(700_000, Math.floor(TABLE_H / 2));
      const result = simulate([start], shot({ angleMilli, power: 9_000 }), true, physics);
      let maxX = start.x;
      let minY = start.y;
      for (const frame of result.frames) {
        const ball = frame.find((item) => item.id === 0);
        if (!ball || ball.pocketed) continue;
        maxX = Math.max(maxX, ball.x);
        minY = Math.min(minY, ball.y);
      }
      return { maxX, minY };
    };
    const across = furthest(PHYSICS_V5, 0);
    const down = furthest(PHYSICS_V5, 270_000);
    const old = furthest(PHYSICS_V4, 0);
    expect(across.maxX).toBeLessThanOrEqual(wall.maxX);
    expect(across.maxX).toBeGreaterThan(wall.maxX - 60_000);
    expect(down.minY).toBeGreaterThanOrEqual(wall.minY);
    expect(down.minY).toBeLessThan(wall.minY + 60_000);
    expect(old.maxX).toBeGreaterThan(TABLE_W - BALL_R - 5_000);
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
