import { describe, expect, it } from "vitest";
import { BALL_R, POCKETS, TABLE_H, TABLE_W, type Ball } from "../src/lib/pool/physics";
import { playShot } from "../src/lib/pool/play";
import { freshTable, type TableState } from "../src/lib/pool/rules";
import { chooseStandInShot, standInDue } from "../src/lib/pool/stand-in";

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

function layout(n: number, cue: { x: number; y: number }, object: { x: number; y: number }): TableState {
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
  it("waits a few seconds, then stops before the seat is timed out", () => {
    const deadline = Date.parse("2026-10-23T15:00:30.000Z");
    expect(standInDue("2026-10-23T15:00:30.000Z", deadline - 25_000, 30)).toBe(false);
    expect(standInDue("2026-10-23T15:00:30.000Z", deadline - 23_000, 30)).toBe(true);
    expect(standInDue("2026-10-23T15:00:30.000Z", deadline + 20_000, 30)).toBe(true);
    expect(standInDue("2026-10-23T15:00:30.000Z", deadline + 46_000, 30)).toBe(false);
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
