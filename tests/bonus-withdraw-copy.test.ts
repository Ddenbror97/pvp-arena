import { describe, expect, it } from "vitest";
import {
  bonusWithdrawBlockedMessage,
  depositWagerBlockedMessage,
  depositWagerShortfall,
  parseWithdrawCashSnapshot,
} from "@/lib/crypto/bonus-withdraw";

const snap = {
  room_cents: 0,
  bonus_cents: 0,
  deposit_cents: 4000,
  deposit_floor_cents: 2000,
  wagered_cents: 500,
  wager_required_cents: 2000,
};

describe("deposit wager cashout copy", () => {
  it("parses the wager fields from the wallet snapshot", () => {
    expect(
      parseWithdrawCashSnapshot({
        room_cents: 0,
        bonus_cents: 100,
        deposit_cents: 4000,
        deposit_floor_cents: 2000,
        wagered_cents: 500,
        wager_required_cents: 2000,
      }),
    ).toEqual({
      room_cents: 0,
      bonus_cents: 100,
      deposit_cents: 4000,
      deposit_floor_cents: 2000,
      wagered_cents: 500,
      wager_required_cents: 2000,
    });
  });

  it("asks for the remaining half of deposits before any cashout", () => {
    expect(depositWagerShortfall(snap)).toBe(1500);
    expect(depositWagerBlockedMessage(snap)).toContain("$15.00");
    expect(bonusWithdrawBlockedMessage(snap, 2000)).toBe(depositWagerBlockedMessage(snap));
  });
});
