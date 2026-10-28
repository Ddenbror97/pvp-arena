import { describe, expect, it } from "vitest";
import { BALL_R, POCKETS, TABLE_H, TABLE_W, type Ball } from "../src/lib/pool/physics";
import { playShot } from "../src/lib/pool/play";
import { freshTable, legalPlacement, type TableState } from "../src/lib/pool/rules";
import {
  chooseStandInShot,
  planStandInShot,
  STAND_IN_CUE_MS,
  STAND_IN_RELEASE_MS,
  STAND_IN_STROKE_MS,
  STAND_IN_THINK_MS,
  standInBallLeave,
  standInCuePull,
  standInDue,
  standInRelease,
  STAND_IN_HIT_T,
  STAND_IN_RELEASE_HIT_T,
  standInShownPower,
  standInStroke,
} from "../src/lib/pool/stand-in";

function seed(n: number): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (n * 17 + i * 31) & 255;
  bytes[0] = n & 255;
  return bytes;
}

function move(ball: Ball, x: number, y: number, pocketed = false) {
  ball.x = x;
  ball.y = y;
  ball.pocketed = pocketed;
  ball.vx = 0;
  ball.vy = 0;
}

function layout(
  n: number,
  cue: { x: number; y: number },
  object: { x: number; y: number },
): TableState {
  const state = freshTable(seed(n));
  state.breakShot = false;
  state.ballInHand = false;
  state.kitchenOnly = false;
  state.open = false;
  state.groupA = "solids";
  state.turn = "A";
  state.shot = 3;
  for (const ball of state.balls) {
    if (ball.id === 0) move(ball, cue.x, cue.y);
    else if (ball.id === 1) move(ball, object.x, object.y);
    else if (ball.id === 8) move(ball, 220_000, TABLE_H - 220_000);
    else move(ball, ball.x, ball.y, true);
  }
  return state;
}

const side = POCKETS[1]!;
const object = { x: side.x, y: side.y + 260_000 };

describe("stand-in aim", () => {
  it("waits a moment, then stops before the seat is timed out", () => {
    const deadline = Date.parse("2026-10-23T15:00:30.000Z");
    expect(STAND_IN_THINK_MS).toBe(2_000);
    expect(STAND_IN_STROKE_MS).toBeLessThan(800);
    expect(standInDue("2026-10-23T15:00:30.000Z", deadline - 29_000, 30)).toBe(false);
    expect(standInDue("2026-10-23T15:00:30.000Z", deadline - 27_000, 30)).toBe(true);
    expect(standInDue("2026-10-23T15:00:30.000Z", deadline + 20_000, 30)).toBe(true);
    expect(standInDue("2026-10-23T15:00:30.000Z", deadline + 46_000, 30)).toBe(false);
  });

  it("draws the ghost cue from address into the hit without turning solid", () => {
    const address = standInStroke(8_000, 0);
    const drawn = standInStroke(8_000, 0.34);
    const release = standInStroke(8_000, 0.5);
    expect(address.gap).toBeCloseTo(1.28);
    expect(address.alpha).toBeCloseTo(0.42);
    expect(drawn.gap).toBeGreaterThan(address.gap + 3);
    expect(release.gap).toBeLessThan(drawn.gap);
    expect(release.alpha).toBeCloseTo(0.42);
    expect(standInStroke(8_000, 1).alpha).toBe(0);
  });

  it("lets go from the drawn cue instead of drawing a second time", () => {
    const drawn = standInStroke(8_000, 0.34);
    const start = standInRelease(8_000, 0);
    const hit = standInRelease(8_000, 0.42);
    expect(start.gap).toBeCloseTo(drawn.gap);
    expect(start.alpha).toBeCloseTo(drawn.alpha);
    expect(hit.gap).toBeLessThan(start.gap - 1);
    expect(standInRelease(8_000, 1).alpha).toBe(0);
    expect(STAND_IN_RELEASE_MS).toBeLessThan(STAND_IN_CUE_MS);
    expect(standInBallLeave(STAND_IN_RELEASE_MS, true)).toBeLessThan(STAND_IN_RELEASE_MS);
    expect(standInStroke(8_000, STAND_IN_HIT_T).gap).toBeCloseTo(1.05);
    expect(standInRelease(8_000, STAND_IN_RELEASE_HIT_T).gap).toBeCloseTo(1.05);
    expect(standInBallLeave(1_000, false)).toBe(Math.round(1_000 * STAND_IN_HIT_T));
    expect(standInBallLeave(1_000, true)).toBe(Math.round(1_000 * STAND_IN_RELEASE_HIT_T));
  });

  it("draws the ghost cue back until the shot is fully pulled", () => {
    expect(standInCuePull(0)).toBe(0);
    expect(standInCuePull(STAND_IN_CUE_MS)).toBe(1);
    expect(standInCuePull(STAND_IN_CUE_MS / 2)).toBeGreaterThan(0.7);
    expect(standInShownPower(4_000, 0)).toBe(640);
    expect(standInShownPower(4_000, 1)).toBe(4_000);
  });

  it("picks the same shot for the same rack and seed", () => {
    const state = freshTable(seed(4));
    const a = chooseStandInShot(state, seed(4));
    const b = chooseStandInShot(structuredClone(state), seed(4));
    expect(b).toEqual(a);
    const played = playShot(state, a);
    expect(played.ok).toBe(true);
    if (played.ok && state.breakShot) {
      expect(a.placeX).not.toBeNull();
      expect(a.placeX!).toBeLessThanOrEqual(Math.floor(TABLE_W / 4));
      expect(a.placeX!).toBeGreaterThanOrEqual(BALL_R);
    }
  });

  it("breaks the rack hard enough to spread it, and does not pocket every break", () => {
    let pocketed = 0;
    const samples = 16;
    for (let n = 1; n <= samples; n++) {
      const bytes = seed(n);
      const state = freshTable(bytes);
      const start = new Map(state.balls.map((ball) => [ball.id, { x: ball.x, y: ball.y }]));
      const shot = chooseStandInShot(state, bytes);
      const played = playShot(state, shot);
      expect(played.ok, `break ${n}`).toBe(true);
      if (!played.ok) continue;
      let far = 0;
      for (const ball of played.state.balls) {
        if (ball.id === 0) continue;
        const from = start.get(ball.id);
        if (!from) continue;
        if (Math.hypot(ball.x - from.x, ball.y - from.y) > 200_000) far += 1;
      }
      expect(far, `break ${n} spread`).toBeGreaterThanOrEqual(3);
      if (played.event.pocketed.some((id) => id >= 1 && id <= 15)) pocketed += 1;
    }
    expect(pocketed).toBeLessThan(samples);
  }, 60_000);

  it("aims before any ball is rolled", () => {
    const bytes = seed(4);
    const state = freshTable(bytes);
    const started = performance.now();
    let planned = planStandInShot(state, bytes);
    for (let i = 0; i < 40; i++) planned = planStandInShot(state, bytes);
    const chosen = chooseStandInShot(state, bytes);
    expect((performance.now() - started) / 40).toBeLessThan(8);
    expect(planned.angleMilli).toBe(chosen.angleMilli);
    expect(planned.placeX).toBe(chosen.placeX);
    expect(planned.placeY).toBe(chosen.placeY);
    expect(planned.calledPocket).toBe(chosen.calledPocket);
    expect(planned.power).toBeGreaterThanOrEqual(chosen.power);
  });

  it("places a scratched cue for the seat that received ball in hand", () => {
    const state = freshTable(seed(8));
    state.breakShot = false;
    state.kitchenOnly = false;
    state.ballInHand = true;
    state.open = false;
    state.groupA = "solids";
    state.turn = "B";
    const cue = state.balls.find((ball) => ball.id === 0);
    if (!cue) throw new Error("cue");
    cue.pocketed = true;
    const shot = chooseStandInShot(state, seed(8));
    expect(shot.placeX).not.toBeNull();
    expect(shot.placeY).not.toBeNull();
    expect(legalPlacement(state, shot.placeX ?? 0, shot.placeY ?? 0)).toBe(true);
    const played = playShot(state, shot);
    expect(played.ok).toBe(true);
  });

  it("makes a straight shot more often than a hard cut, and misses some of each", () => {
    const samples = 20;
    let straight = 0;
    let cut = 0;
    for (let n = 1; n <= samples; n++) {
      const bytes = seed(100 + n);
      const easy = layout(100 + n, { x: object.x, y: object.y + 520_000 }, object);
      const easyShot = chooseStandInShot(easy, bytes);
      const easyPlay = playShot(easy, easyShot);
      expect(easyPlay.ok).toBe(true);
      if (easyPlay.ok && easyPlay.event.pocketed.includes(1)) straight += 1;

      const hard = layout(200 + n, { x: object.x - 120_000, y: object.y + 520_000 }, object);
      const hardShot = chooseStandInShot(hard, bytes);
      const hardPlay = playShot(hard, hardShot);
      expect(hardPlay.ok).toBe(true);
      if (hardPlay.ok && hardPlay.event.pocketed.includes(1)) cut += 1;
    }
    expect(straight).toBeGreaterThan(cut);
    expect(straight).toBeGreaterThan(0);
    expect(straight).toBeLessThan(samples);
    expect(cut).toBeGreaterThan(0);
    expect(cut).toBeLessThan(samples);
  }, 60_000);
});
