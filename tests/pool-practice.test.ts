import { describe, it, expect } from "vitest";
import { choosePracticeShot } from "../src/lib/pool/practice-bot";
import { chooseStandInShot } from "../src/lib/pool/stand-in";
import { freshTable, legalPlacement, type TableState } from "../src/lib/pool/rules";
import { playShot } from "../src/lib/pool/play";
const seed = (n: number) => Uint8Array.from({ length: 32 }, (_, i) => (n * 19 + i * 31) & 255);
function random(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function layout(x: number, y: number, eight = false): TableState {
  const s = freshTable(seed(1));
  s.breakShot = false;
  s.ballInHand = false;
  s.kitchenOnly = false;
  s.open = false;
  s.groupA = "solids";
  for (const b of s.balls) {
    b.pocketed = b.id !== 0 && b.id !== (eight ? 8 : 1) && b.id !== 8;
    b.vx = b.vy = b.spin = 0;
    if (b.id === 0) {
      b.x = 1270000 + x;
      b.y = 1080000;
    }
    if (b.id === (eight ? 8 : 1)) {
      b.x = 1270000;
      b.y = y;
    } else if (b.id === 8) {
      b.x = 240000;
      b.y = 950000;
    }
  }
  return s;
}
describe("dedicated free pool opponent", () => {
  it("pots straightforward routes substantially more reliably than the AFK stand-in", () => {
    let practice = 0,
      afk = 0,
      total = 0;
    for (const x of [-300000, 0, 300000])
      for (const y of [250000, 450000, 650000])
        for (let n = 1; n <= 4; n++) {
          const s = layout(x, y);
          const copy = structuredClone(s);
          const a = playShot(s, choosePracticeShot(s, random(n * 93)));
          const b = playShot(s, chooseStandInShot(s, seed(n)));
          expect(s).toEqual(copy);
          expect(a.ok).toBe(true);
          if (a.ok && a.event.pocketed.includes(1) && !a.event.foul) practice++;
          if (b.ok && b.event.pocketed.includes(1) && !b.event.foul) afk++;
          total++;
        }
    console.info({ practice, afk, total });
    expect(practice).toBeGreaterThanOrEqual(total * 0.8);
    expect(practice - afk).toBeGreaterThanOrEqual(Math.ceil(total * 0.2));
  });
  it("places a scratched cue legally and calls a pocket when shooting the 8", () => {
    const s = layout(0, 450000, true);
    s.ballInHand = true;
    s.balls[0]!.pocketed = true;
    const shot = choosePracticeShot(s, random(19));
    expect(legalPlacement(s, shot.placeX!, shot.placeY!)).toBe(true);
    expect(shot.calledPocket).not.toBeNull();
    const result = playShot(s, shot);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.foul).toBe(false);
      expect(result.state.winner).toBe("A");
    }
  });
  for (const n of [4, 31, 76])
    it(`finishes a complete legal rack from the break (seed ${n})`, () => {
      let state = freshTable(seed(n));
      const rng = random(n);
      let fouls = 0;
      const started = performance.now();
      for (let shots = 0; shots < 160 && !state.winner; shots++) {
        const input = choosePracticeShot(state, rng);
        if (state.ballInHand)
          expect(legalPlacement(state, input.placeX!, input.placeY!)).toBe(true);
        const result = playShot(state, input);
        expect(result.ok).toBe(true);
        if (!result.ok) throw Error(result.error);
        expect(result.state.shot).toBe(state.shot + 1);
        if (result.event.foul) fouls++;
        state = result.state;
      }
      console.info({
        seed: n,
        shots: state.shot,
        fouls,
        winner: state.winner,
        ms: Math.round(performance.now() - started),
      });
      expect(state.winner).not.toBeNull();
      expect(state.shot).toBeLessThan(100);
    });
});
