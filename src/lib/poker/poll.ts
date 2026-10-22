const QUIET = new Set(["SETTLEMENT", "COMPLETED", "VOIDED"]);

/**
 * Commit and betting stay on the short poll. The broadcast carries a version,
 * not a table row, so a full `poker_table_state` read is still the update.
 * A fresh channel stretches the safety poll outside those decision windows.
 */
export function pokerRefetchMs(status: string | null | undefined, fresh: boolean): number {
  const urgent = status === "COMMIT" || status === "BETTING";
  if (urgent || !fresh) return status ? 1_500 : 3_000;
  if (status && !QUIET.has(status)) return 1_500;
  return status ? 4_000 : 8_000;
}
