import type { LiveHealth } from "./ops";

/**
 * The overview alarm. A roulette recovery stays red only while that same round
 * is still open. A later round means the failure already cleared.
 */
export function currentHealthFailure(live: Pick<LiveHealth, "latest_failure" | "roulette">) {
  const failure = live.latest_failure;
  if (!failure) return null;
  if (failure.action !== "RECOVERY_FAILED" || failure.game_type !== "roulette") return failure;
  const round = live.roulette;
  if (
    round &&
    round.id === failure.game_id &&
    round.status !== "COMPLETED" &&
    round.status !== "CANCELLED"
  ) {
    return failure;
  }
  return null;
}
