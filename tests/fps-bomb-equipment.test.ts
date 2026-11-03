import { describe, it, expect } from "vitest";
import {
  createBombMatch,
  startBombMatch,
  equipDefuseKit,
  stepBombMatch,
} from "../src/lib/fps/bomb/match";
import { BOMB_RULES, defuseTime } from "../src/lib/fps/bomb/rules";
const fresh = () => {
  const s = createBombMatch(
    Array.from({ length: 10 }, (_, i) => ({ id: "u" + i, name: "User " + i, bot: false })),
    0,
  );
  startBombMatch(s, 0);
  return s;
};
describe("free Police equipment", () => {
  it("equips once during freeze without changing normal/kit defuse times", () => {
    const s = fresh();
    expect(defuseTime(s.players[0])).toBe(10000);
    expect(equipDefuseKit(s, 0, 100)).toBe(true);
    expect(equipDefuseKit(s, 0, 101)).toBe(true);
    expect(defuseTime(s.players[0])).toBe(5000);
  });
  it("rejects Terrorists, dead players, bots, invalid slots and expired/live selection", () => {
    const s = fresh();
    expect(equipDefuseKit(s, 5, 100)).toBe(false);
    s.players[0]!.hp = 0;
    expect(equipDefuseKit(s, 0, 100)).toBe(false);
    s.players[1]!.bot = true;
    expect(equipDefuseKit(s, 1, 100)).toBe(false);
    expect(equipDefuseKit(s, 99, 100)).toBe(false);
    expect(equipDefuseKit(s, 2, NaN)).toBe(false);
    expect(equipDefuseKit(s, 2, s.phaseEndsAt)).toBe(false);
    s.phase = "live";
    expect(equipDefuseKit(s, 2, 100)).toBe(false);
  });
  it("clears equipment on the next round and follows the actual halftime side", () => {
    const s = fresh();
    equipDefuseKit(s, 0, 100);
    s.phase = "round-end";
    s.phaseEndsAt = 200;
    stepBombMatch(s, {}, 300);
    expect(s.players[0]!.defuseKit).toBeUndefined();
    s.phase = "halftime";
    s.phaseEndsAt = 400;
    stepBombMatch(s, {}, 500);
    expect(s.half).toBe(2);
    expect(equipDefuseKit(s, 0, 501)).toBe(false);
    expect(equipDefuseKit(s, 5, 501)).toBe(true);
    expect(BOMB_RULES.defuseKitMs).toBe(5000);
  });
});
