import { describe, expect, it } from "vitest";
import {
  createMatch,
  startMatch,
  stepMatch,
  COUNTDOWN_MS,
  ROUND_END_MS,
  HALFTIME_MS,
  TICK_MS,
} from "../src/lib/fps/simulation";
import { SPAWNS } from "../src/lib/fps/map";
import {
  spawnSide,
  characterSide,
  sideName,
  isHalftime,
  halftimeRound,
} from "../src/lib/fps/sides";
import { validateInput, type MatchState, type Input } from "../src/lib/fps/protocol";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoundBreak } from "../src/components/fps/RoundBreak";

describe("single halftime side switch", () => {
  it("rejects stale movement and trigger packets after the side switch", () => {
    const s = createMatch({ A: "a", B: "b" }, 5, 0);
    startMatch(s, 0);
    stepMatch(s, {}, 3000, TICK_MS);
    s.round = 2;
    s.phase = "round-end";
    s.phaseEndsAt = 3034;
    stepMatch(s, {}, 3034, TICK_MS);
    const before = { ...s.players.A };
    const old: Input = {
      v: 1,
      type: "input",
      combatVersion: 2,
      seq: 900,
      round: 2,
      forward: 1,
      strafe: 0,
      yaw: 0,
      pitch: 0,
      fire: true,
      reload: false,
      weapon: "rifle",
      jump: false,
      sprint: false,
    };
    stepMatch(s, { A: old }, 3068, TICK_MS);
    expect(s.players.A.x).toBe(before.x);
    expect(s.players.A.z).toBe(before.z);
    expect(s.players.A.ammo).toBe(before.ammo);
    expect(s.players.A.lastSeq).toBe(before.lastSeq);
    stepMatch(s, { A: { ...old, round: 3 } }, 3102, TICK_MS);
    expect(s.players.A.lastSeq).toBe(900);
    expect(s.players.A.ammo).toBe(29);
    stepMatch(s, {}, 3136, TICK_MS, undefined, {
      A: { ...old, seq: 901, forward: 0, combatOnly: true },
    });
    expect(s.players.A.lastSeq).toBe(900);
    expect(validateInput({ ...old, round: 0 })).toBeNull();
  });
  it("announces an automatic halftime without an accept dialog", () => {
    const html = renderToStaticMarkup(
      createElement(RoundBreak, { seconds: 5, countdown: false, halftime: true, profiles: [] }),
    );
    expect(html).toContain("HALFTIME");
    expect(html).toContain("Switching sides.");
    expect(html).toContain("Police ↔ Terrorist");
    expect(html).toContain("Second half starts");
    expect(html).not.toContain("<button");
  });
  for (const bestOf of [5, 9, 13] as const)
    it(`best of ${bestOf}: swaps spawns/models once with identities and scores intact`, () => {
      let state = createMatch(
        { A: "human-a", B: bestOf === 13 ? "practice-bot" : "human-b" },
        bestOf,
        0,
      );
      startMatch(state, 0);
      stepMatch(state, {}, COUNTDOWN_MS, TICK_MS);
      let switches = 0,
        previous = characterSide(state, "A");
      for (let round = 1; round <= bestOf; round++) {
        expect(state.round).toBe(round);
        const swapped = round > Math.floor(bestOf / 2);
        expect(state.players.A.x).toBe(SPAWNS[swapped ? "B" : "A"].x);
        expect(state.players.B.x).toBe(SPAWNS[swapped ? "A" : "B"].x);
        expect(sideName(state, "A")).toBe(swapped ? "Terrorist" : "Police");
        expect(sideName(state, "B")).toBe(swapped ? "Police" : "Terrorist");
        if (previous !== characterSide(state, "A")) switches++;
        previous = characterSide(state, "A");
        state.players.A.lastSeq = round * 100;
        state.players.A.kills = round;
        state.players.B.hp = round % 2 ? 50 : 100;
        state.players.A.hp = round % 2 ? 100 : 50;
        stepMatch(state, {}, state.phaseEndsAt, TICK_MS);
        expect(state.players.A.id).toBe("human-a");
        expect(state.players.B.id).toBe(bestOf === 13 ? "practice-bot" : "human-b");
        if (state.phase === "completed") break;
        const half = round === halftimeRound(state),
          score = { ...state.score };
        expect(isHalftime(state)).toBe(half);
        expect(state.phaseEndsAt - state.server!.lastStepAt).toBe(
          half ? HALFTIME_MS : ROUND_END_MS,
        );
        if (half) state = JSON.parse(JSON.stringify(state)) as MatchState;
        const deadline = state.phaseEndsAt;
        stepMatch(state, {}, deadline - 34, TICK_MS);
        expect(state.round).toBe(round);
        stepMatch(state, {}, deadline, TICK_MS);
        expect(state.score).toEqual(score);
        expect(state.players.A.lastSeq).toBe(round * 100);
        expect(state.players.A.kills).toBe(round);
        expect(state.players.A.hp).toBe(100);
        expect(state.players.A.ammo).toBe(30);
      }
      expect(switches).toBe(1);
      expect(state.phase).toBe("completed");
      expect(state.winner).toBe("A");
      expect(state.score).toEqual({ A: Math.floor(bestOf / 2) + 1, B: Math.floor(bestOf / 2) });
    });
  it("preserves legacy checkpoint spawns/models without inventing a halftime", () => {
    const s = createMatch({ A: "a", B: "b" }, 5, 0);
    delete s.sideVersion;
    s.round = 2;
    s.phase = "round-end";
    expect(spawnSide(s, "A")).toBe("B");
    expect(characterSide(s, "A")).toBe("A");
    expect(isHalftime(s)).toBe(false);
  });
});
