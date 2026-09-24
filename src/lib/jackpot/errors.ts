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
  FAUCET_COOLDOWN: "You've already claimed test credits this hour.",
  FORBIDDEN: "You don't have access to this.",
  BELOW_MIN_WAGER: "That's below the minimum wager.",
  ABOVE_MAX_WAGER: "That's above the maximum wager.",
  INVALID_SIDE: "Pick Heads or Tails.",
  TOO_MANY_OPEN_GAMES: "You already have the maximum number of open coinflips.",
  GAME_NOT_JOINABLE: "Someone else already joined that game.",
  GAME_EXPIRED: "That game expired before you joined.",
  GAME_NOT_FOUND: "That game doesn't exist.",
  CANNOT_JOIN_OWN_GAME: "You can't join your own game.",
  GAME_NOT_CANCELLABLE: "This game can no longer be cancelled.",
  POT_LIMIT_REACHED: "This pot has reached its maximum size. Try the next round.",
  SESSION_REVOKED: "Your session has ended. Please sign in again.",
  INVALID_AVATAR: "That avatar isn't available.",
};

export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  for (const code of Object.keys(MESSAGES)) if (msg.includes(code)) return MESSAGES[code]!;
  return "Something went wrong. Please try again.";
}
