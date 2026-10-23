/** House fee is 500 basis points of the pot. Integer cents, same as settlement. */
export const FEE_BPS = 500;

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function stakeQuote(stakeCents: number) {
  const pot = stakeCents * 2;
  const fee = Math.floor((pot * FEE_BPS) / 10_000);
  return { stake: stakeCents, pot, fee, payout: pot - fee };
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
    body: "The table stays open until a legal pocket assigns solids (1–7) or stripes (9–15).",
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
    body: "A table with no opponent stays open for 24 hours, then the stake is refunded. There is no cancel. Leaving a live match forfeits, and your opponent is paid.",
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
    body: "Drag across the table to aim. On a phone, drag with your finger. A drag that starts on the cue ball aims once it moves. Hold Shift, or use the arrow keys, for a finer angle.",
  },
  {
    title: "Drag back to shoot",
    body: "Click and drag back to pull the cue. Further back is more power. Let go of the mouse to shoot. On a phone, drag back with your finger and lift it to shoot. There is no shoot button.",
  },
  {
    title: "Add spin",
    body: "Open Spin. Drag the red dot: up is follow, down is draw, sideways is side spin. Double-click the ball to clear it.",
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
  mine: boolean;
  group: "solids" | "stripes" | null;
  breakShot: boolean;
  busy: boolean;
  rolling: boolean;
  offline: boolean;
  reconnecting: boolean;
  seat: "A" | "B" | null;
  cancelReason?: string | null;
};

/** Primary match line. Internal codes stay out of this sentence. */
export function matchNotice(input: MatchNoticeInput): string | null {
  if (input.offline || input.reconnecting) return "Reconnecting";
  if (input.status === "WAITING") {
    return input.seat === "A"
      ? "Waiting for an opponent. Your stake stays locked for up to 24 hours."
      : "Waiting for an opponent";
  }
  if (input.status === "STARTING") return input.seat === "A" ? "You break" : "Opponent breaks";
  if (input.status === "CANCELLED") {
    return input.cancelReason === "WAITING_EXPIRED"
      ? "No opponent joined in 24 hours. Your stake was refunded."
      : "Match cancelled. Both stakes were refunded.";
  }
  if (input.status === "COMPLETED") {
    const why = winSentence(input.winReason);
    if (input.youWon) return why ? `You won ${input.payout}. ${why}` : `You won ${input.payout}`;
    if (input.youLost) return why ? `You lost. ${why}` : "You lost.";
    return why ? `Match over. ${why}` : "Match over.";
  }
  if (input.rolling) return "Balls moving";
  if (input.busy) return "Sending your shot";
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
  if (input.shootingEight && !input.pocketChosen) return "Choose a pocket for the 8-ball";
  if (input.shootingEight) return "Pocket the 8-ball in the pocket you chose";
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
