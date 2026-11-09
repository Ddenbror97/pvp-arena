import { describe, expect, it } from "vitest";
import { battleRoyaleAccess, canPlayBattleRoyale } from "../src/lib/fps/br/access";

describe("Battle Royale access (public release)", () => {
  it("admits every signed-in player", () => {
    expect(battleRoyaleAccess("some-user")).toBe("player");
    expect(canPlayBattleRoyale("some-user")).toBe(true);
  });
  it("denies anonymous visitors", () => {
    expect(battleRoyaleAccess(null)).toBe("denied");
    expect(canPlayBattleRoyale(null)).toBe(false);
    expect(canPlayBattleRoyale("")).toBe(false);
  });
});
