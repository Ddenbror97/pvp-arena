import { describe, expect, it } from "vitest";
import { createBombMatch, startBombMatch, stepBombMatch } from "../src/lib/fps/bomb/match";
import { BOMB_RULES } from "../src/lib/fps/bomb/rules";
import { BombReveal, bombViewFor } from "../src/lib/fps/bomb/snapshot";
import {
  beepInterval,
  clockText,
  matchResult,
  objective,
  roundBanner,
  scoreboard,
} from "../src/lib/fps/bomb/hud";
import { TICK_MS } from "../src/lib/fps/simulation";

const slots = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `P${i}`, bot: true }));
function live() {
  const s = createBombMatch(slots, 0, 5);
  startBombMatch(s, 0);
  let t = 0;
  while (s.phase !== "live") stepBombMatch(s, {}, (t += TICK_MS));
  return { s, t };
}

describe("Bomb Defusal HUD", () => {
  it("shows the freeze countdown, the round clock, and hides the clock once the bomb is planted", () => {
    const s = createBombMatch(slots, 0, 5);
    startBombMatch(s, 0);
    stepBombMatch(s, {}, TICK_MS);
    const v = bombViewFor(s, 0, null, new BombReveal(), TICK_MS);
    expect(clockText(v, TICK_MS)).toBe("0:15");
    const { s: l, t } = live();
    expect(clockText(bombViewFor(l, 0, null, new BombReveal(), t), t)).toBe("1:55");
    l.bomb = {
      state: "planted",
      x: -27,
      y: 0,
      z: -24,
      site: "A",
      plantedAt: t,
      explodesAt: t + 40000,
    };
    expect(clockText(bombViewFor(l, 0, null, new BombReveal(), t), t)).toBe("BOMB");
  });

  it("prompts the carrier to plant only inside a site, and Police to defuse only in reach", () => {
    const { s, t } = live();
    const carrier = (s.bomb as { carrier: number }).carrier;
    Object.assign(s.players[carrier]!, { x: 0, z: 30 });
    expect(objective(bombViewFor(s, carrier, null, new BombReveal(), t), t)?.text).toMatch(
      /plant it at A or B/,
    );
    Object.assign(s.players[carrier]!, { x: -27, z: -24 });
    expect(objective(bombViewFor(s, carrier, null, new BombReveal(), t), t)).toMatchObject({
      text: "Hold E to plant at A",
      tone: "action",
    });
    s.bomb = {
      state: "planted",
      x: -27,
      y: 0,
      z: -24,
      site: "A",
      plantedAt: t,
      explodesAt: t + 40000,
    };
    Object.assign(s.players[0]!, { x: 30, z: -28 });
    expect(objective(bombViewFor(s, 0, null, new BombReveal(), t), t)?.text).toMatch(/retake/);
    Object.assign(s.players[0]!, { x: -27.5, z: -24.5 });
    expect(objective(bombViewFor(s, 0, null, new BombReveal(), t), t)?.text).toBe(
      "Hold E to defuse",
    );
    s.bomb.defuser = 0;
    s.bomb.defuseStartedAt = t;
    const half = objective(
      bombViewFor(s, 0, null, new BombReveal(), t),
      t + BOMB_RULES.defuseMs / 2,
    );
    expect(half?.progress).toBeCloseTo(0.5, 2);
  });

  it("orders the scoreboard with the recipient's team first and reports the final result", () => {
    const { s, t } = live();
    s.players[7]!.kills = 3;
    s.players[7]!.headshots = 2;
    const v = bombViewFor(s, 0, null, new BombReveal(), t);
    const board = scoreboard(v);
    expect(board[0]!.team).toBe("police");
    expect(board[0]!.rows.find((r) => r.you)?.slot).toBe(0);
    expect(board[1]!.rows[0]).toMatchObject({ slot: 7, hsPercent: 67 });
    s.phase = "completed";
    s.winner = "draw";
    expect(matchResult(bombViewFor(s, 0, null, new BombReveal(), t))).toBe("draw");
    s.winner = "bravo";
    expect(matchResult(bombViewFor(s, 0, null, new BombReveal(), t))).toBe("defeat");
    expect(matchResult(bombViewFor(s, 5, null, new BombReveal(), t))).toBe("victory");
  });

  it("announces the round winner and speeds up the beeps toward detonation", () => {
    const { s, t } = live();
    s.phase = "round-end";
    s.lastRound = { round: 1, winner: "terrorist", group: "bravo", reason: "bomb" };
    expect(roundBanner(bombViewFor(s, 0, null, new BombReveal(), t))).toMatchObject({
      title: "Terrorists win",
      mine: false,
    });
    expect(beepInterval(40000)).toBeGreaterThan(beepInterval(5000));
    expect(beepInterval(0)).toBe(150);
  });

  it("gives the recipient their own full state and nobody else's", () => {
    const { s, t } = live();
    const v = bombViewFor(s, 3, null, new BombReveal(), t);
    expect(v.self.slot).toBe(3);
    expect(v.self.lastSeq).toBe(s.players[3]!.lastSeq);
    expect((v.self as { damageTo?: unknown }).damageTo).toBeUndefined();
  });
});
