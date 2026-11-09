/**
 * Battle Royale access (public release 2026-11-09): every signed-in player. Until the release
 * this asked the database for the admin role at each layer (lobby, admission, the room's
 * connect and its periodic re-check); the sign-in and live-session checks those layers also
 * make are unchanged.
 */
export function battleRoyaleAccess(userId: string | null): "player" | "denied" {
  return userId ? "player" : "denied";
}

export function canPlayBattleRoyale(userId: string | null): boolean {
  return battleRoyaleAccess(userId) === "player";
}
