import { expect, test } from "vitest";
import { BOT, effectiveSkill, newBotMind } from "../src/lib/fps/br/bots";

test("all BR skill tiers and endgame bonuses use the 50% multiplier, including saved minds", () => {
  expect(BOT.skillScale).toBe(0.5);
  for (const skill of [0.1, 0.4, 0.45, 0.7, 0.75, 0.95])
    for (const alive of [100, 20, 5]) {
      const mind = newBotMind(3, 12);
      mind.skill = skill;
      const bonus = alive <= 10 ? 0.15 : alive <= 25 ? 0.08 : 0;
      expect(effectiveSkill(mind, alive)).toBeCloseTo(Math.min(1, skill + bonus) / 2);
    }
  const legacy = newBotMind(0, 1);
  delete (legacy as Partial<typeof legacy>).skill;
  expect(effectiveSkill(legacy, 100)).toBe(0.275);
});
