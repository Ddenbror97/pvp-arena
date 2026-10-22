import { describe, expect, it } from "vitest";
import { currentHealthFailure } from "@/lib/admin/health";

const failure = {
  id: 9,
  action: "RECOVERY_FAILED",
  game_type: "roulette",
  game_id: 40,
  created_at: "2026-10-22T12:00:00Z",
};

describe("admin health alarm", () => {
  it("drops a roulette recovery once a later round is open", () => {
    expect(
      currentHealthFailure({
        latest_failure: failure,
        roulette: {
          id: 41,
          status: "BETTING",
          pot_amount: 0,
          bet_count: 0,
          player_count: 0,
          created_at: "2026-10-22T12:05:00Z",
          betting_ends_at: null,
          spin_end_at: null,
          locked_at: null,
          completed_at: null,
          winning_color: null,
          total_payout: null,
        },
      }),
    ).toBeNull();
  });

  it("keeps a roulette recovery red while that round is still open", () => {
    expect(
      currentHealthFailure({
        latest_failure: failure,
        roulette: {
          id: 40,
          status: "SETTLEMENT",
          pot_amount: 0,
          bet_count: 0,
          player_count: 0,
          created_at: "2026-10-22T12:00:00Z",
          betting_ends_at: null,
          spin_end_at: null,
          locked_at: null,
          completed_at: null,
          winning_color: null,
          total_payout: null,
        },
      })?.action,
    ).toBe("RECOVERY_FAILED");
  });

  it("still shows a current failure from another game", () => {
    expect(
      currentHealthFailure({
        latest_failure: {
          ...failure,
          action: "RECOVERY_FAILED",
          game_type: "coinflip",
          game_id: 3,
        },
        roulette: null,
      })?.game_type,
    ).toBe("coinflip");
  });
});
