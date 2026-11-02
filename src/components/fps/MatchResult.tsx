import type { ReactNode } from "react";
import { ArrowRight, LoaderCircle, Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import { duelMoney, duelQuote } from "@/lib/fps/quote";
import type { DuelProfile } from "./RoundBreak";

export type MatchResultProps = {
  winner?: DuelProfile | undefined;
  score: readonly [number, number];
  mapName: string;
  practice: boolean;
  cancelled: boolean;
  settled: boolean;
  spectate: boolean;
  stake: number;
  available?: number | undefined;
  checkingBalance: boolean;
  balanceError: boolean;
  busy: boolean;
  error: string | null;
  onPlayAgain: () => void;
  lobbyLink: ReactNode;
  walletLink: ReactNode;
};

export function MatchResult(props: MatchResultProps) {
  const {
    winner,
    score,
    mapName,
    practice,
    cancelled,
    settled,
    spectate,
    stake,
    available,
    checkingBalance,
    balanceError,
    busy,
    error,
    onPlayAgain,
    lobbyLink,
    walletLink,
  } = props;
  const short = !practice && available !== undefined && available < stake;
  const name = winner?.username || "Player";
  return (
    <section className="duel-match-result" aria-labelledby="duel-result-title" aria-busy={busy}>
      <div className="duel-result-content">
        <div className="duel-result-heading" role="status" aria-live="polite">
          <span className="duel-eyebrow">
            {cancelled ? "MATCH CANCELLED" : winner ? "MATCH WINNER" : "MATCH COMPLETE"}
          </span>
          {winner && !cancelled && (
            <div className="duel-result-portrait">
              <PlayerAvatar
                src={winner.avatar_url}
                name={name}
                className="duel-result-avatar"
                priority
              />
              <span className="duel-result-trophy">
                <Trophy size={20} aria-hidden />
              </span>
            </div>
          )}
          <h1 id="duel-result-title">
            {cancelled ? "Until next time." : winner ? name : "Well played."}
          </h1>
          {winner && !cancelled && <p className="duel-result-caption">takes the arena</p>}
          <div className="duel-result-score" aria-label={`Final score ${score[0]} to ${score[1]}`}>
            <b>{score[0]}</b>
            <span>—</span>
            <b>{score[1]}</b>
          </div>
          <p className="duel-result-map">
            {mapName} · {practice ? "Practice" : "1v1"}
          </p>
        </div>
        <div className="duel-result-replay">
          <p className="duel-result-settlement" role="status">
            {!settled
              ? "Finalizing result…"
              : practice
                ? "No wager. No rating changes."
                : cancelled
                  ? "Entry released. No match fee."
                  : "Result recorded. Balance updated."}
          </p>
          {!spectate && (
            <>
              {!practice && (
                <div className="duel-result-terms">
                  <strong>{duelMoney(stake)} entry · Best of 13</strong>
                  <span>
                    Same opponent · 5% fee · Winner receives {duelMoney(duelQuote(stake).payout)}
                  </span>
                  <small>
                    {checkingBalance
                      ? "Checking balance…"
                      : balanceError
                        ? "Balance check unavailable. Try again."
                        : available !== undefined
                          ? `Available ${duelMoney(available)} · Eligible credits included`
                          : "Balance checked before entry"}
                  </small>
                </div>
              )}
              <button
                className="duel-primary duel-result-play"
                onClick={onPlayAgain}
                disabled={busy || !settled || (!practice && checkingBalance) || short}
              >
                {busy ? (
                  <>
                    <LoaderCircle size={18} className="duel-result-spinner" aria-hidden /> Starting…
                  </>
                ) : (
                  <>
                    Play again <ArrowRight size={18} aria-hidden />
                  </>
                )}
              </button>
              {short && (
                <p className="duel-result-funds" role="status">
                  You need {duelMoney(stake - available!)} more for this entry. {walletLink}
                </p>
              )}
            </>
          )}
          {error && (
            <p className="duel-error" role="alert">
              {error}
            </p>
          )}
          <div className="duel-result-lobby">{lobbyLink}</div>
        </div>
      </div>
    </section>
  );
}
