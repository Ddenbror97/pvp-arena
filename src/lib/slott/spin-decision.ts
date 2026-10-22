/**
 * The branch `public.slot_spin` takes before it calls `_slot_spin`.
 * Mirrors supabase/migrations/20260930180000_p2p-slott.sql. The row lock and
 * primary key (game_id, spin_no) are what make two tabs safe; this is the
 * decision those locks expose to the second transaction.
 */
export type SlotSpinDecision = "play" | "duplicate" | "stale" | "conflict";

export function slotSpinDecision(input: {
  existingKey: { gameId: number; spinNo: number } | null;
  gameId: number;
  spinNo: number;
  nextSpin: number;
  playerHasSpin: boolean;
}): SlotSpinDecision {
  if (input.existingKey) {
    if (input.existingKey.gameId !== input.gameId || input.existingKey.spinNo !== input.spinNo)
      return "conflict";
    return "duplicate";
  }
  if (input.spinNo < input.nextSpin) return input.playerHasSpin ? "duplicate" : "stale";
  if (input.spinNo > input.nextSpin) return "stale";
  return "play";
}
