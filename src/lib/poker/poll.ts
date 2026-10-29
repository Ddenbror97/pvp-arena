const QUIET = new Set(["SETTLEMENT", "COMPLETED", "VOIDED"]);

/**
 * Seated commit and betting stay on the short poll: a missed reveal voids the
 * hand. Spectators follow the version broadcast, so a fresh channel stretches
 * their safety poll. A dead channel stays fast for everyone. `seated` defaults
 * to true so callers that omit it keep the short poll.
 */
export function pokerRefetchMs(
  status: string | null | undefined,
  fresh: boolean,
  seated = true,
): number {
  if (!seated && fresh) return status ? 4_000 : 8_000;
  const urgent = status === "COMMIT" || status === "BETTING";
  if (urgent || !fresh) return status ? 1_500 : 3_000;
  if (status && !QUIET.has(status)) return 1_500;
  return status ? 4_000 : 8_000;
}
