const MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Sign in to play.",
  PROFILE_REQUIRED: "Finish setting up your profile first.",
  INSUFFICIENT_BALANCE: "Not enough balance for that entry.",
  BELOW_MIN_ENTRY: "That's below the minimum entry.",
  ABOVE_MAX_ENTRY: "That's above the maximum entry.",
  GAME_CLOSED: "Entries are closed for this round. Try the next one.",
  RATE_LIMITED: "Slow down — too many entries in a few seconds.",
  SELF_EXCLUDED: "Your account is self-excluded from play.",
  INVALID_USERNAME: "Usernames are 3–20 letters, numbers or underscores.",
  USERNAME_TAKEN: "That username is taken.",
  AGE_CONFIRMATION_REQUIRED: "You must confirm you are 18 or older.",
  FAUCET_COOLDOWN: "Credit claims are no longer available.",
  FORBIDDEN: "You don't have access to this.",
  BELOW_MIN_WAGER: "That's below the minimum wager.",
  ABOVE_MAX_WAGER: "That's above the maximum wager.",
  INVALID_SIDE: "Pick Heads or Tails.",
  TOO_MANY_OPEN_GAMES: "You already have the maximum number of open games.",
  GAME_NOT_JOINABLE: "Someone else already joined that game.",
  GAME_EXPIRED: "That game expired before you joined.",
  GAME_NOT_FOUND: "That game doesn't exist.",
  CANNOT_JOIN_OWN_GAME: "You can't join your own game.",
  GAME_NOT_CANCELLABLE: "This game can no longer be cancelled.",
  POT_LIMIT_REACHED: "This pot has reached its maximum size. Try the next round.",
  SESSION_REVOKED: "Your session has ended. Please sign in again.",
  SESSION_EXPIRED: "Your session has ended. Please sign in again.",
  INVALID_AVATAR: "That avatar isn't available.",
  BETTING_CLOSED: "Betting is closed for this spin. Try the next round.",
  TOO_MANY_BETS: "You've reached the bet limit for this round.",
  ROUND_FULL: "This round is full. Try the next one.",
  EXPOSURE_LIMIT_REACHED:
    "This round has reached its payout limit for that colour. Try a smaller bet or the next round.",
  INVALID_COLOR: "Pick a colour.",
  IDEMPOTENCY_KEY_REUSED: "Please try again.",
  REAL_MONEY_DISABLED: "Real-money play not yet open.",
  LEDGER_NOT_READY: "Real-money play not yet open.",
  TEST_CREDITS_RETIRED: "Test credits are no longer available.",
  INVALID_STAKE: "Pick one of the listed stakes.",
  NOT_YOUR_TURN: "Wait for your turn.",
  TURN_NOT_OPEN: "Your turn opens in a moment.",
  NOT_A_PLAYER: "You're watching this match — only its two players can spin.",
  STALE_ACTION: "That spin already happened. The match is up to date.",
  MATCH_NOT_ACTIVE: "This match isn't running.",
  TURN_NOT_EXPIRED: "Your opponent still has time left.",
  INVALID_IDEMPOTENCY_KEY: "Please try again.",
  BOTS_DISABLED: "Automated opponents are not available right now.",
  BOT_UNFUNDED: "No automated opponent is available for that stake.",
  BOT_EXPOSURE_LIMIT: "No automated opponent is available for that stake.",
  BOT_NOT_WITHDRAWABLE: "Bot balances can't be withdrawn.",
};

export function friendlyError(e: unknown): string {
  const msg =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e && "message" in e
        ? String((e as { message: unknown }).message)
        : String(e);
  if (msg.includes("SESSION_REVOKED") || msg.includes("SESSION_EXPIRED"))
    void recoverRevokedSession();
  for (const code of Object.keys(MESSAGES)) if (msg.includes(code)) return MESSAGES[code]!;
  return "Something went wrong. Please try again.";
}

/**
 * The server rejected this device's sign-in session (signed out elsewhere or expired).
 * Try once to renew it; if that fails, clear the stale local session and send the user to sign in.
 */
let recovering = false;
async function recoverRevokedSession() {
  if (recovering || typeof window === "undefined") return;
  recovering = true;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      await supabase.auth.signOut({ scope: "local" });
      window.location.assign("/auth");
    }
  } finally {
    recovering = false;
  }
}
