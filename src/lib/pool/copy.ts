/** House fee is 500 basis points of the pot. Integer cents, same as settlement. */
export const FEE_BPS = 500;

/** Inclusive stake range. Matches the min and max of pool_config.stakes. */
export const POOL_STAKE_MIN = 100;
export const POOL_STAKE_MAX = 5000;

/** Dollars typed in the lobby, as integer cents. Null when the amount is outside the range. */
export function parseStakeDollars(
  raw: string,
  min = POOL_STAKE_MIN,
  max = POOL_STAKE_MAX,
): number | null {
  const t = raw.trim().replace(/^\$/, "");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isInteger(cents) || cents < min || cents > max) return null;
  return cents;
}

export function stakeDraft(cents: number): string {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function stakeQuote(stakeCents: number) {
  const pot = stakeCents * 2;
  const fee = Math.floor((pot * FEE_BPS) / 10_000);
  return { stake: stakeCents, pot, fee, payout: pot - fee };
}

/** Leave-table split. 10% of the leaver's stake stays with the site. Integer cents. */
export function leaveTake(stakeCents: number) {
  const fee = Math.trunc(stakeCents / 10);
  return { fee, back: stakeCents - fee, opponent: stakeCents };
}

const WIN_REASON: Record<string, string> = {
  EIGHT_BALL: "The 8-ball fell in the called pocket.",
  EIGHT_ON_BREAK: "The 8-ball fell on the break.",
  EIGHT_EARLY: "The 8-ball fell before that group was clear.",
  EIGHT_WRONG_POCKET: "The 8-ball fell in the wrong pocket.",
  SCRATCH_ON_EIGHT: "The cue ball scratched while the 8-ball fell.",
  EIGHT_AND_SCRATCH_ON_BREAK: "The cue ball scratched on the break 8.",
  FORFEIT: "A player forfeited.",
  TIMEOUT_FORFEIT: "Three shot-clock timeouts forfeited the match.",
};

export function winSentence(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return WIN_REASON[reason] ?? null;
}

export const POOL_RULES: readonly { title: string; body: string }[] = [
  {
    title: "Break",
    body: "Player A breaks from behind the head string. Drag the cue ball to place it, then drag the table to aim. Drag back and release to shoot. On a phone, drag with your finger.",
  },
  {
    title: "Open table",
    body: "The table stays open until a legal shot pockets a solid or a stripe. That includes the break. The first ball down makes that group yours, and your opponent takes the other group. Solids are 1–7. Stripes are 9–15. A foul does not choose a group.",
  },
  {
    title: "Your group",
    body: "Hit one of your balls first. Pocket one and you shoot again. A miss hands the table over.",
  },
  {
    title: "Fouls and scratches",
    body: "A foul or a scratched cue ball is ball in hand anywhere, except the opening break, which stays behind the head string.",
  },
  {
    title: "8-ball",
    body: "Clear your group, choose a pocket, and pocket the 8-ball there. The 8 early, in the wrong pocket, or with a scratch loses.",
  },
  {
    title: "8 on the break",
    body: "On this table the 8 on the break wins, unless the cue ball is also scratched. That scratch loses. That is a house rule, not a call-shot league rule.",
  },
  {
    title: "Shot clock",
    body: "You have 30 seconds. The clock does not restart when you reconnect. Three timeouts forfeit the match.",
  },
  {
    title: "Waiting",
    body: "A table with no opponent stays open for 24 hours, then the stake is refunded. There is no cancel. When both players are at the table, the rack opens. If the player who opened the table is away, the rack waits 60 seconds and then the table plays their shots. Leaving a live table keeps 10% of your stake with the site and returns the rest. Your opponent gets their stake back, and the table closes. Three timeouts still forfeit the match.",
  },
  {
    title: "Disconnect",
    body: "A dropped connection gets one reconnect window. An active player who stays connected is not forfeited for a brief hiccup.",
  },
  {
    title: "Money",
    body: "Each player stakes the same amount. The winner receives 95% of the pot. The 5% fee is taken from the pot, not added on top.",
  },
];

export const TUTORIAL_STEPS: readonly { title: string; body: string }[] = [
  {
    title: "Drag to aim",
    body: "Drag across the table to aim. A short line shows the shot direction and stops before the object ball. On a phone, drag with your finger. A drag that starts on the cue ball aims once it moves. Hold Shift, or use the arrow keys, for a finer angle.",
  },
  {
    title: "Drag back to shoot",
    body: "Click and drag back to pull the cue. Further back is more power. Let go of the mouse to shoot. On a phone, drag back with your finger and lift it to shoot. There is no shoot button.",
  },
  {
    title: "Add spin",
    body: "Open settings with the gear. Drag the red dot: up is follow, down is draw, sideways is side spin. Double-click the ball to clear it.",
  },
  {
    title: "Turns",
    body: "Pocket one of your balls and you shoot again. A miss or a foul gives the table to your opponent. Ball in hand means you place the cue ball, then aim.",
  },
  {
    title: "Win with the 8",
    body: "Clear your solids or stripes, choose a pocket, and pocket the 8-ball there. You have 30 seconds for each shot.",
  },
];

export type MatchNoticeInput = {
  status: string;
  youWon: boolean;
  youLost: boolean;
  payout: string;
  winReason: string | null;
  fouled: boolean;
  ballInHand: boolean;
  kitchenOnly: boolean;
  shootingEight: boolean;
  pocketChosen: boolean;
  /** The rules already named a winner, and the match status has not caught up. */
  decided: boolean;
  mine: boolean;
  group: "solids" | "stripes" | null;
  breakShot: boolean;
  busy: boolean;
  rolling: boolean;
  offline: boolean;
  reconnecting: boolean;
  seat: "A" | "B" | null;
  cancelReason?: string | null;
  /** The signed-in player is the one who left. */
  youLeft?: boolean;
  /** Stake in cents. Used when a player leaves a live table. */
  stakeCents?: number;
  /** Milliseconds until the rack opens. Used while the match is STARTING. */
  opensIn?: number | null;
  standIn?: "mine" | "theirs" | null;
};

/** Primary match line. Internal codes stay out of this sentence. */
export function matchNotice(input: MatchNoticeInput): string | null {
  if (input.offline || input.reconnecting) return "Reconnecting";
  if (input.status === "WAITING") {
    return input.seat === "A"
      ? "Waiting for an opponent. Your stake stays locked for up to 24 hours."
      : "Waiting for an opponent";
  }
  if (input.status === "STARTING") {
    const who = input.seat === "A" ? "You break" : "Opponent breaks";
    const secs = input.opensIn == null ? null : Math.max(0, Math.ceil(input.opensIn / 1000));
    if (secs == null) return `${who}. The rack opens in 60 seconds.`;
    if (secs <= 0) return `${who}. Opening the rack.`;
    return `${who}. The rack opens in ${secs} seconds.`;
  }
  if (input.status === "CANCELLED") {
    if (input.cancelReason === "WAITING_EXPIRED") {
      return "No opponent joined in 24 hours. Your stake was refunded.";
    }
    if (input.cancelReason === "PLAYER_LEFT") {
      const stake = input.stakeCents ?? 0;
      const split = leaveTake(stake);
      if (input.youLeft) {
        return `You left this table. ${formatCents(split.fee)} stayed with the site. ${formatCents(split.back)} is back in your balance.`;
      }
      if (input.seat) {
        return `The other player left. Your ${formatCents(stake)} is back. This table is closed.`;
      }
      return "A player left. This table is closed.";
    }
    return "Match cancelled. Both stakes were refunded.";
  }
  if (input.status === "COMPLETED") {
    const why = winSentence(input.winReason);
    if (input.youWon) return why ? `You won ${input.payout}. ${why}` : `You won ${input.payout}`;
    if (input.youLost) return why ? `You lost. ${why}` : "You lost.";
    return why ? `Match over. ${why}` : "Match over.";
  }
  if (input.rolling) return "Balls moving";
  if (input.busy) return "Sending your shot";
  if (input.standIn === "theirs" && !input.mine && input.status === "PLAYING") {
    return "Opponent is away. The table is playing their shots.";
  }
  if (input.standIn === "mine" && input.mine) {
    return "You were away. The table is playing your shots until you take over.";
  }
  if (input.decided) {
    const why = winSentence(input.winReason);
    if (input.youWon) return why ? `You won the rack. ${why}` : "You won the rack.";
    if (input.youLost) return why ? `You lost the rack. ${why}` : "You lost the rack.";
    return why ? `Match over. ${why}` : "Match over.";
  }
  if (input.shootingEight) {
    if (!input.mine) {
      return input.ballInHand
        ? "Opponent has ball in hand and is shooting the 8-ball."
        : "Opponent is shooting the 8-ball.";
    }
    if (input.ballInHand) {
      const line = input.pocketChosen
        ? "Place the cue ball, then pocket the 8-ball in the pocket you chose."
        : "Place the cue ball, then choose a pocket for the 8-ball.";
      return input.fouled ? `Foul. ${line}` : line;
    }
    if (!input.pocketChosen) return "Choose a pocket for the 8-ball";
    return "Pocket the 8-ball in the pocket you chose";
  }
  if (!input.mine && (input.fouled || input.ballInHand)) {
    return input.fouled ? "Foul. Opponent has ball in hand." : "Opponent has ball in hand.";
  }
  if (input.fouled && input.kitchenOnly) {
    return "Foul. Ball in hand — place the cue ball behind the head string.";
  }
  if (input.fouled || (input.ballInHand && !input.kitchenOnly)) {
    return input.fouled
      ? "Foul. Ball in hand — place the cue ball."
      : "Ball in hand — place the cue ball.";
  }
  if (input.ballInHand && input.kitchenOnly) {
    return "Ball in hand — place the cue ball behind the head string.";
  }
  if (input.mine && input.breakShot)
    return "Your turn. Drag to aim, drag back, and release to shoot.";
  if (input.mine && input.group === "solids") return "Your turn. Pocket your remaining solids.";
  if (input.mine && input.group === "stripes") return "Your turn. Pocket your remaining stripes.";
  if (input.mine) return "Your turn. Drag back and release to shoot.";
  if (input.status === "PLAYING") return "Opponent's turn";
  return null;
}

export function spinSentence(spinX: number, spinY: number): string {
  const side = spinX === 0 ? "No side spin" : spinX > 0 ? "Right English" : "Left English";
  const follow = spinY === 0 ? "no follow or draw" : spinY > 0 ? "follow" : "draw";
  return `${side}, ${follow}`;
}

export const POCKET_LABELS = [
  "Near left",
  "Left side",
  "Far left",
  "Near right",
  "Right side",
  "Far right",
] as const;
