import { memo, useEffect, useState } from "react";
import { avatarSrc } from "@/lib/avatar";
import { money, type HandPlayer, type PokerSeat } from "@/lib/poker/api";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  FOLD: "Fold",
  CHECK: "Check",
  CALL: "Call",
  BET: "Bet",
  RAISE: "Raise",
  TIMEOUT_FOLD: "Timed out",
  TIMEOUT_CHECK: "Timed out",
};

/** Turn ring bound to the server deadline: progress is computed from server time, never a local guess. */
function TurnRing({
  deadline,
  totalMs,
  serverNow,
}: {
  deadline: string;
  totalMs: number;
  serverNow: () => number;
}) {
  const end = new Date(deadline).getTime();
  const [left, setLeft] = useState(() => Math.max(0, end - serverNow()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, end - serverNow())), 250);
    return () => clearInterval(id);
  }, [end, serverNow]);
  const elapsed = Math.min(totalMs, Math.max(0, totalMs - left));
  const C = 2 * Math.PI * 47;
  const secs = Math.ceil(left / 1000);
  return (
    <>
      <svg className="poker-turn-ring" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="47" className="poker-turn-track" />
        <circle
          key={deadline}
          cx="50"
          cy="50"
          r="47"
          className={cn("poker-turn-progress", left < 5000 && "poker-turn-low")}
          style={{
            strokeDasharray: C,
            animationDuration: `${totalMs}ms`,
            animationDelay: `-${elapsed}ms`,
            ["--ring-c" as string]: C,
          }}
        />
      </svg>
      <span className="poker-turn-secs" aria-live="off">
        {secs}s
      </span>
    </>
  );
}

export const Seat = memo(function Seat({
  seatNo,
  seat,
  player,
  isMe,
  cards,
  landed,
  faceUp,
  turn,
  actionMs,
  serverNow,
  button,
  winner,
  winningCards,
  canSit,
  onSit,
}: {
  seatNo: number;
  seat: PokerSeat | null;
  player: HandPlayer | null;
  isMe: boolean;
  /** Faces to show: own hole cards, or the server-published showdown cards. */
  cards: number[] | null;
  /** Cards that have landed (0..2). */
  landed: number;
  faceUp: boolean;
  turn: { deadline: string } | null;
  actionMs: number;
  serverNow: () => number;
  button: boolean;
  winner: { amount: number; handName: string | null } | null;
  winningCards: Set<number>;
  canSit: boolean;
  onSit: (seatNo: number) => void;
}) {
  if (!seat) {
    return (
      <div className="poker-seat poker-seat-empty" data-anchor={`seat-${seatNo}`}>
        {canSit ? (
          <button type="button" className="poker-sit-btn" onClick={() => onSit(seatNo)}>
            Sit here
          </button>
        ) : (
          <span className="poker-seat-open">Open seat</span>
        )}
      </div>
    );
  }
  const src = avatarSrc(seat.avatar_url);
  const folded = !!player?.folded;
  const stack = player ? player.stack : seat.stack + seat.pending;
  const last = player?.last_action ? ACTION_LABEL[player.last_action] : null;
  const status = folded
    ? "Folded"
    : player?.all_in
      ? "All-in"
      : seat.state === "SITTING_OUT"
        ? "Sitting out"
        : seat.leaving
          ? "Leaving"
          : null;
  return (
    <div
      className={cn(
        "poker-seat",
        isMe && "poker-seat-me",
        turn && "poker-seat-turn",
        winner && "poker-seat-win",
        folded && "poker-seat-folded",
      )}
      data-anchor={`seat-${seatNo}`}
      aria-label={`${isMe ? "You" : seat.username}, ${money(stack)}${status ? `, ${status}` : ""}${turn ? ", to act" : ""}`}
    >
      <div className="poker-avatar">
        {src ? (
          <img src={src} alt="" width={96} height={96} loading="lazy" decoding="async" />
        ) : (
          <span>{seat.username.slice(0, 2).toUpperCase()}</span>
        )}
        {turn ? (
          <TurnRing deadline={turn.deadline} totalMs={actionMs} serverNow={serverNow} />
        ) : null}
        {button ? (
          <span className="poker-button-chip" title="Dealer button" aria-label="Dealer button">
            D
          </span>
        ) : null}
      </div>
      <div className="poker-seat-side">
        <div className="poker-seat-cards">
          {[0, 1].map((i) => (
            <span key={i} className="poker-hole-slot" data-anchor={`hole-${seatNo}-${i}`}>
              {player && landed > i ? (
                <PlayingCard
                  card={faceUp && cards ? cards[i] : null}
                  dim={folded}
                  lift={isMe && !folded}
                  win={faceUp && cards != null && winningCards.has(cards[i]!)}
                />
              ) : null}
            </span>
          ))}
        </div>
        <div className="poker-plate">
          <span className="poker-plate-name">{isMe ? "You" : seat.username}</span>
          <span className="poker-plate-stack">
            <span className="poker-plate-chip" aria-hidden />
            {money(stack)}
          </span>
        </div>
      </div>
      {winner ? (
        <span className="poker-seat-badge poker-seat-badge-win">
          +{money(winner.amount)}
          {winner.handName ? ` · ${winner.handName}` : ""}
        </span>
      ) : status ? (
        <span className="poker-seat-badge">{status}</span>
      ) : last ? (
        <span className="poker-seat-badge poker-seat-badge-action">{last}</span>
      ) : null}
    </div>
  );
});
