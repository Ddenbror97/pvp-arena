import { describe, expect, it } from "vitest";
import { HIT_DAMAGE } from "../src/lib/fps/combat";
import { ARENA, BOXES, EYE_HEIGHT, PLAYER_RADIUS, SPAWNS } from "../src/lib/fps/map";
import {
  COUNTDOWN_MS,
  MAX_DRAWS,
  MOVE_SPEED,
  ROUND_END_MS,
  ROUND_MS,
  TICK_MS,
  WEAPONS,
  createMatch,
  predictMovement,
  startMatch,
  stepMatch,
  validateInput,
  type Input,
  type MatchState,
} from "../src/lib/fps/simulation";

const input = (overrides: Partial<Input> = {}): Input => ({
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
  ...overrides,
});
function live(bestOf: 5 | 9 = 5): MatchState {
  const state = createMatch({ A: "alice", B: "bob" }, bestOf, 0);
  startMatch(state, 0);
  stepMatch(state, {}, COUNTDOWN_MS, TICK_MS);
  return state;
}
function tick(state: MatchState, inputs: Parameters<typeof stepMatch>[1] = {}, dt = TICK_MS): void {
  stepMatch(state, inputs, (state.server?.lastStepAt ?? 0) + TICK_MS, dt);
}
function lane(state: MatchState): void {
  // A 6 m north-courtyard lane between the centre stack and the arcade (aim-arena layout).
  Object.assign(state.players.A, { x: 0, y: 0, z: -2.4, yaw: 0 });
  Object.assign(state.players.B, { x: 0, y: 0, z: -8.4, yaw: Math.PI });
}
function nextRound(state: MatchState): void {
  stepMatch(state, {}, state.phaseEndsAt, TICK_MS);
}

describe("visible character combat envelope", () => {
  it.each([false, true])("registers boot hits down to the floor, crouched=%s", (crouched) => {
    const state = live();
    lane(state);
    const pitch = Math.atan2(0.07 - EYE_HEIGHT, 6);
    tick(state, { B: input({ crouch: crouched, yaw: Math.PI }) });
    tick(state, {
      A: input({ seq: 1, fire: true, pitch }),
      B: input({ seq: 1, crouch: crouched, yaw: Math.PI }),
    });
    expect(state.events.some((event) => event.type === "hit" && event.seat === "A")).toBe(true);
    expect(state.players.B.hp).toBe(100 - HIT_DAMAGE.rifle.legs);
  });
  it("a crouched player's old standing head position is not a hit", () => {
    const state = live();
    lane(state);
    tick(state, { B: input({ crouch: true, yaw: Math.PI }) });
    tick(state, {
      A: input({ seq: 1, fire: true, pitch: 0 }),
      B: input({ seq: 1, crouch: true, yaw: Math.PI }),
    });
    expect(state.players.B.hp).toBe(100);
  });
});

describe("FPS protocol", () => {
  it("validates and copies the exact complete input shape", () => {
    const raw = input();
    expect(validateInput(raw)).toEqual(raw);
    expect(validateInput(raw)).not.toBe(raw);
  });
  it("rejects invalid bounds, non-finite values, missing booleans and spoofed state", () => {
    for (const raw of [
      null,
      [],
      "input",
      {},
      { ...input(), winner: "A" },
      { ...input(), x: 100 },
      { ...input(), position: { x: 2 } },
      { ...input(), forward: 1.01 },
      { ...input(), strafe: -2 },
      { ...input(), yaw: Infinity },
      { ...input(), pitch: NaN },
      { ...input(), pitch: Math.PI },
      { ...input(), seq: -1 },
      { ...input(), seq: 1.5 },
      { ...input(), seq: Number.MAX_SAFE_INTEGER + 1 },
      { ...input(), jump: undefined },
      { ...input(), sprint: 1 },
      { ...input(), weapon: "rocket" },
      { ...input(), v: 2 },
      { ...input(), type: "input".repeat(10000) },
    ])
      expect(validateInput(raw)).toBeNull();
    const { jump: _jump, ...missing } = input();
    expect(validateInput(missing)).toBeNull();
  });
});

describe("authoritative movement", () => {
  it("uses feet coordinates and Three forward, normalizes diagonals, ignores client dt", () => {
    const straight = live(),
      diagonal = live();
    tick(straight, { A: input({ forward: 1 }) }, 1e9);
    tick(diagonal, { A: input({ forward: 1, strafe: 1 }) }, NaN);
    const distance = (MOVE_SPEED * TICK_MS) / 1000;
    expect(straight.players.A.y).toBe(0);
    expect(straight.players.A.z).toBeCloseTo(SPAWNS.A.z - distance);
    expect(
      Math.hypot(diagonal.players.A.x - SPAWNS.A.x, diagonal.players.A.z - SPAWNS.A.z),
    ).toBeCloseTo(distance);
    const turned = live();
    tick(turned, { A: input({ yaw: Math.PI / 2, forward: 1 }) });
    expect(turned.players.A.x).toBeCloseTo(SPAWNS.A.x - distance);
  });
  it("rejects fast calls, time reversal, repeated and out-of-order sequences", () => {
    const state = live();
    tick(state, { A: input({ seq: 5, forward: 1, fire: true }) });
    const before = structuredClone(state);
    for (let i = 0; i < 100; i++)
      stepMatch(state, { A: input({ seq: i + 6, forward: 1 }) }, state.server!.lastStepAt + 1, 1e6);
    stepMatch(state, {}, -100, TICK_MS);
    expect(state).toEqual(before);
    tick(state, { A: input({ seq: 5, forward: 1, fire: true }) });
    tick(state, { A: input({ seq: 4, forward: 1, fire: true }) });
    expect(state.players.A.z).toBe(before.players.A.z);
    expect(state.players.A.ammo).toBe(before.players.A.ammo);
  });
  it("does not catch up movement after long pauses or trust invalid runtime input", () => {
    const state = live();
    stepMatch(state, { A: input({ forward: 1 }) }, COUNTDOWN_MS + 10000, 10000);
    expect(SPAWNS.A.z - state.players.A.z).toBeCloseTo((MOVE_SPEED * TICK_MS) / 1000);
    const before = state.players.A.z;
    tick(state, { A: { ...input({ seq: 1 }), forward: Infinity } });
    expect(state.players.A.z).toBe(before);
  });
  it("collides with cover and arena boundaries without tunnelling", () => {
    const state = live();
    for (let seq = 0; seq < 300; seq++)
      tick(state, { A: input({ seq, forward: 1, sprint: true }) });
    // North up the spawn alley until the edge building (its face is at z = -14.5).
    expect(state.players.A.z).toBeCloseTo(-14.5 + PLAYER_RADIUS);
    Object.assign(state.players.A, { x: 9, z: 12.4 });
    for (let seq = 300; seq < 600; seq++) tick(state, { A: input({ seq, strafe: 1 }) });
    expect(state.players.A.x).toBeCloseTo(ARENA.width / 2 - PLAYER_RADIUS);
  });
  it("shares prediction and jump gravity, including missing-input landing", () => {
    const state = live(),
      predicted = structuredClone(state.players.A);
    const command = input({ jump: true, forward: 1 });
    predictMovement(predicted, command, 1e9);
    tick(state, { A: command });
    expect(state.players.A.x).toBe(predicted.x);
    expect(state.players.A.y).toBe(predicted.y);
    expect(state.players.A.z).toBe(predicted.z);
    expect(state.players.A.y).toBeGreaterThan(0);
    for (let i = 0; i < 50; i++) tick(state);
    expect(state.players.A.y).toBe(0);
    expect(state.players.A.velocityY).toBe(0);
    expect(EYE_HEIGHT).toBe(1.6);
  });
});

describe("combat", () => {
  it("uses shared symmetric boxes to occlude head and body shots", () => {
    for (const b of BOXES)
      expect(
        BOXES.some(
          (mirror) => Math.abs(mirror.x + b.x) < 1e-9 && mirror.z === b.z && mirror.h === b.h,
        ),
      ).toBe(true);
    const state = live();
    tick(state, { A: input({ fire: true }) });
    expect(state.players.A.ammo).toBe(29);
    expect(state.players.B.hp).toBe(100);
  });
  it("hits heads from eye height and awards kills, score and headshots", () => {
    const state = live();
    lane(state);
    tick(state, { A: input({ fire: true }) });
    expect(state.players.B.hp).toBe(66);
    for (let seq = 1; seq <= 8; seq++)
      tick(state, {
        A: input({
          seq,
          fire: true,
          pitch: -(state.players.A.recoilPitch ?? 0),
          yaw: -(state.players.A.recoilYaw ?? 0),
        }),
      });
    expect(state.players.B.hp).toBe(0);
    expect(state.players.A.kills).toBe(1);
    expect(state.players.A.headshots).toBe(1);
    expect(state.score).toEqual({ A: 1, B: 0 });
    expect(state.phase).toBe("round-end");
  });
  it("resolves simultaneous lethal shots as a draw regardless of seat", () => {
    const state = live();
    lane(state);
    state.players.A.hp = state.players.B.hp = 34;
    tick(state, { A: input({ fire: true }), B: input({ fire: true, yaw: Math.PI }) });
    expect(state.players.A.hp).toBe(0);
    expect(state.players.B.hp).toBe(0);
    expect(state.players.A.kills).toBe(1);
    expect(state.players.B.kills).toBe(1);
    expect(state.score).toEqual({ A: 0, B: 0 });
    expect(state.events.some((e) => e.type === "draw")).toBe(true);
  });
  it("distinguishes body damage from head damage", () => {
    const state = live();
    lane(state);
    tick(state, { A: input({ fire: true, pitch: Math.atan2(-0.8, 6) }) });
    expect(state.players.B.hp).toBe(77);
    expect(state.events.some((e) => e.type === "hit")).toBe(true);
    expect(state.players.A.headshots).toBe(0);
  });
  it("aims both shots against tick-start positions while both players move", () => {
    const state = live();
    lane(state);
    state.players.A.hp = state.players.B.hp = 34;
    // Without the shared tick-start snapshot, opposite movement would make the
    // narrow head targets miss at this lateral speed.
    tick(state, {
      A: input({ fire: true, strafe: 1 }),
      B: input({ fire: true, strafe: 1, yaw: Math.PI }),
    });
    expect(state.players.A.hp).toBe(0);
    expect(state.players.B.hp).toBe(0);
    expect(state.score).toEqual({ A: 0, B: 0 });
  });
  it("enforces pistol damage and its independent fire and reload timings", () => {
    const state = live();
    lane(state);
    tick(state, { A: input({ weapon: "pistol", fire: true, pitch: Math.atan2(-0.8, 6) }) });
    expect(state.players.B.hp).toBe(83);
    expect(state.players.A.ammo).toBe(11);
    for (let seq = 1; seq <= 7; seq++)
      tick(state, { A: input({ seq, weapon: "pistol", fire: true, yaw: Math.PI / 2 }) });
    expect(state.players.A.ammo).toBe(11);
    tick(state, { A: input({ seq: 8, weapon: "pistol", fire: false, yaw: Math.PI / 2 }) });
    tick(state, { A: input({ seq: 9, weapon: "pistol", fire: true, yaw: Math.PI / 2 }) });
    expect(state.players.A.ammo).toBe(10);
    tick(state, { A: input({ seq: 10, weapon: "pistol", reload: true }) });
    expect(state.players.A.reloadUntil - state.server!.lastStepAt).toBeCloseTo(
      WEAPONS.pistol.reloadMs,
    );
    stepMatch(state, {}, state.players.A.reloadUntil, TICK_MS);
    expect(state.players.A.ammo).toBe(12);
  });
  it("enforces fire cadence, empty magazine, reload delay and finite reserves", () => {
    const state = live();
    tick(state, { A: input({ fire: true }) });
    tick(state, { A: input({ seq: 1, fire: true }) });
    expect(state.players.A.ammo).toBe(29);
    for (let seq = 2; seq <= 4; seq++) tick(state, { A: input({ seq, fire: true }) });
    expect(state.players.A.ammo).toBe(28);
    state.players.A.ammo = 0;
    state.players.A.reserve = 2;
    tick(state, { A: input({ seq: 5, fire: true }) });
    expect(state.players.A.ammo).toBe(0);
    tick(state, { A: input({ seq: 6, fire: true, reload: true }) });
    const deadline = state.players.A.reloadUntil;
    tick(state, { A: input({ seq: 7, fire: true, reload: true }) });
    expect(state.players.A.reloadUntil).toBe(deadline);
    expect(state.players.A.ammo).toBe(0);
    stepMatch(state, {}, deadline, TICK_MS);
    expect(state.players.A.ammo).toBe(2);
    expect(state.players.A.reserve).toBe(0);
    expect(state.players.A.reloadUntil).toBe(0);
  });
  it("weapon switching cannot create ammo or bypass reload, sprint prevents firing", () => {
    const state = live(),
      total = state.players.A.ammo + state.players.A.reserve;
    tick(state, { A: input({ weapon: "pistol", fire: true, sprint: true }) });
    expect(state.players.A.ammo).toBe(WEAPONS.pistol.magazine);
    expect(state.players.A.ammo + state.players.A.reserve).toBe(total);
    tick(state, { A: input({ seq: 1, weapon: "rifle", reload: true }) });
    expect(state.players.A.reloadUntil).toBeGreaterThan(0);
    tick(state, { A: input({ seq: 2, weapon: "pistol", fire: true }) });
    expect(state.players.A.weapon).toBe("rifle");
    expect(state.players.A.ammo + state.players.A.reserve).toBe(total);
  });
});

describe("match lifecycle", () => {
  it("starts once, freezes waiting/countdown and alternates reset spawns preserving sequence and totals", () => {
    const state = createMatch({ A: "a", B: "b" }, 5, 0);
    stepMatch(state, { A: input({ forward: 1 }) }, 100, TICK_MS);
    expect(state.tick).toBe(0);
    startMatch(state, 100);
    startMatch(state, 200);
    expect(state.phaseEndsAt).toBe(100 + COUNTDOWN_MS);
    tick(state, { A: input({ forward: 1 }) });
    expect(state.players.A.z).toBe(SPAWNS.A.z);
    stepMatch(state, {}, state.phaseEndsAt, TICK_MS);
    lane(state);
    state.players.B.hp = 34;
    tick(state, { A: input({ seq: 8, fire: true }) });
    const roundEnd = state.phaseEndsAt;
    expect(roundEnd - state.server!.lastStepAt).toBeCloseTo(ROUND_END_MS);
    nextRound(state);
    expect(state.round).toBe(2);
    expect(state.players.A.x).toBe(SPAWNS.B.x);
    expect(state.players.A.y).toBe(0);
    expect(state.players.A.lastSeq).toBe(8);
    expect(state.players.A.kills).toBe(1);
    expect(state.players.A.ammo).toBe(30);
    tick(state, { A: input({ seq: 8, forward: 1 }) });
    expect(state.players.A.x).toBe(SPAWNS.B.x);
    expect(state.players.A.z).toBe(SPAWNS.B.z);
  });
  for (const bestOf of [5, 9] as const)
    it(`ends best of ${bestOf} at a majority, with terminal states immutable`, () => {
      const state = live(bestOf);
      const majority = Math.floor(bestOf / 2) + 1;
      for (let round = 1; round <= majority; round++) {
        state.players.B.hp = 50;
        stepMatch(state, {}, state.phaseEndsAt, TICK_MS);
        if (round < majority) nextRound(state);
      }
      expect(state.phase).toBe("completed");
      expect(state.winner).toBe("A");
      expect(state.score.A).toBe(majority);
      const snapshot = structuredClone(state);
      stepMatch(state, { A: input({ forward: 1 }) }, 1e9, TICK_MS);
      startMatch(state, 1e9);
      expect(state).toEqual(snapshot);
    });
  it("timeouts award higher HP, equal HP draws are capped and cancel the match", () => {
    const state = live();
    expect(state.phaseEndsAt).toBe(COUNTDOWN_MS + ROUND_MS);
    for (let draw = 0; draw < MAX_DRAWS; draw++) {
      stepMatch(state, {}, state.phaseEndsAt, TICK_MS);
      if (draw < MAX_DRAWS - 1) nextRound(state);
    }
    expect(state.phase).toBe("cancelled");
    expect(state.winner).toBeNull();
    expect(state.round).toBe(MAX_DRAWS);
    const snapshot = structuredClone(state);
    tick(state);
    expect(state).toEqual(snapshot);
  });
  it("awards timeout rounds to either seat by HP and cancels repeated lethal draws", () => {
    const timeout = live();
    timeout.players.A.hp = 99;
    stepMatch(timeout, {}, timeout.phaseEndsAt, TICK_MS);
    expect(timeout.score.B).toBe(1);
    const state = live();
    for (let draw = 0; draw < MAX_DRAWS; draw++) {
      lane(state);
      state.players.A.hp = state.players.B.hp = 34;
      tick(state, {
        A: input({ seq: draw, fire: true }),
        B: input({ seq: draw, fire: true, yaw: Math.PI }),
      });
      if (draw < MAX_DRAWS - 1) nextRound(state);
    }
    expect(state.phase).toBe("cancelled");
    expect(state.winner).toBeNull();
  });
  it("replays identical inputs deterministically across serialized snapshots", () => {
    const state = live();
    for (let seq = 0; seq < 150; seq++) {
      const restored = JSON.parse(JSON.stringify(state)) as MatchState;
      const inputs = { A: input({ seq, strafe: 0.5, jump: seq === 2, fire: seq % 3 === 0 }) };
      tick(state, inputs);
      tick(restored, inputs);
      expect(restored).toEqual(state);
    }
  });
});
describe("round recap and automatic three-second break", () => {
  it("counts actual fired bullets and all three head hits with damage capped at remaining health", () => {
    const state = live();
    lane(state);
    tick(state, { A: input({ fire: true }) });
    expect(state.lastRound).toBeUndefined();
    expect(state.server?.roundStats?.A).toMatchObject({
      shots: 1,
      hits: 1,
      headHits: 1,
      damage: 34,
    });
    const a = state.players.A;
    stepMatch(
      state,
      { A: input({ seq: 1, fire: true, yaw: -(a.recoilYaw ?? 0), pitch: -(a.recoilPitch ?? 0) }) },
      state.server!.lastStepAt + 140,
      TICK_MS,
    );
    expect(state.lastRound).toBeUndefined();
    stepMatch(
      state,
      { A: input({ seq: 2, fire: true, yaw: -(a.recoilYaw ?? 0), pitch: -(a.recoilPitch ?? 0) }) },
      state.server!.lastStepAt + 140,
      TICK_MS,
    );
    expect(state.lastRound).toMatchObject({
      round: 1,
      winner: "A",
      players: {
        A: { shots: 3, hits: 3, headHits: 3, damage: 100, health: 100 },
        B: { shots: 0, hits: 0, health: 0 },
      },
    });
  });
  it("does not count rejected cadence, reload attempts or dry fire as shots", () => {
    const state = live();
    lane(state);
    tick(state, { A: input({ fire: true, yaw: Math.PI / 2 }) });
    tick(state, { A: input({ seq: 1, fire: true, yaw: Math.PI / 2 }) });
    state.players.A.ammo = 0;
    stepMatch(state, { A: input({ seq: 2, fire: true }) }, state.server!.lastStepAt + 150, TICK_MS);
    stepMatch(state, {}, state.phaseEndsAt, TICK_MS);
    expect(state.lastRound?.players.A).toMatchObject({ shots: 1, hits: 0, damage: 0 });
  });
  it("holds the elimination and winner presentation then resets once with no second countdown", () => {
    const state = live();
    state.players.B.hp = 50;
    stepMatch(state, {}, state.phaseEndsAt, TICK_MS);
    const ended = state.server!.lastStepAt,
      deadline = state.phaseEndsAt,
      position = state.players.A.z,
      ammo = state.players.A.ammo,
      recap = structuredClone(state.lastRound);
    expect(deadline - ended).toBe(3800);
    stepMatch(state, { A: input({ fire: true, forward: 1 }) }, deadline - 50, TICK_MS);
    expect(state.phase).toBe("round-end");
    expect(state.players.A.z).toBe(position);
    expect(state.players.A.ammo).toBe(ammo);
    stepMatch(state, { A: input({ seq: 10, fire: true, forward: 1 }) }, deadline, TICK_MS);
    expect(state.phase).toBe("live");
    expect(state.round).toBe(2);
    expect(state.players.A.ammo).toBe(30);
    expect(state.players.B.hp).toBe(100);
    expect(state.lastRound).toEqual(recap);
    expect(state.server?.roundStats?.A.shots).toBe(0);
  });
});
