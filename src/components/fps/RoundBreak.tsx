import { Trophy } from "lucide-react";
import { PlayerAvatar } from "@/components/jackpot/Avatar";
import type { RoundRecap } from "@/lib/fps/protocol";

export type DuelProfile = { id: string; username: string | null; avatar_url: string | null };
export function RoundBreak({
  recap,
  seconds,
  profiles,
  countdown,
  halftime = false,
}: {
  recap?: RoundRecap | undefined;
  seconds: number;
  profiles: DuelProfile[];
  countdown: boolean;
  halftime?: boolean;
}) {
  const winner = countdown ? null : recap?.winner;
  const profile = winner ? profiles[winner === "A" ? 0 : 1] : undefined;
  const stats = winner ? recap?.players[winner] : undefined;
  const name = profile?.username ?? `Player ${winner}`;
  const accuracy = stats?.shots ? `${Math.round((stats.hits / stats.shots) * 100)}%` : "—";
  return (
    <div
      className={`duel-round-break${countdown ? "" : " duel-round-result"}`}
      role="status"
      aria-live="polite"
    >
      <section
        key={`${countdown ? "start" : recap?.round}`}
        className={`duel-round-card ${winner ? "is-victory" : ""}`}
      >
        {winner && <span className="duel-victory-halo" aria-hidden />}
        <span className="duel-eyebrow">
          {halftime
            ? "HALFTIME"
            : countdown
              ? "AIM ARENA / READY TO DUEL"
              : `ROUND ${recap?.round ?? ""} COMPLETE`}
        </span>
        <h2>
          {halftime
            ? "Switching sides."
            : countdown
              ? "Get ready."
              : winner
                ? "Round victory."
                : "Round drawn."}
        </h2>
        {halftime && <p className="duel-halftime-detail">Police ↔ Terrorist</p>}
        {winner && (
          <div className="duel-round-players">
            <article className="is-winner">
              <span className="duel-victory-portrait">
                <PlayerAvatar
                  src={profile?.avatar_url}
                  name={name}
                  className="duel-round-avatar"
                  priority
                />
                <Trophy aria-hidden />
              </span>
              <strong>{name}</strong>
              <small>ROUND WINNER</small>
              <dl>
                <div>
                  <dt>Hit rate</dt>
                  <dd>{accuracy}</dd>
                </div>
                <div>
                  <dt>Hits / shots</dt>
                  <dd>{stats ? `${stats.hits} / ${stats.shots}` : "—"}</dd>
                </div>
                <div>
                  <dt>Damage</dt>
                  <dd>{stats?.damage ?? "—"}</dd>
                </div>
                <div>
                  <dt>Head hits</dt>
                  <dd>{stats?.headHits ?? "—"}</dd>
                </div>
              </dl>
            </article>
          </div>
        )}
        <div className="duel-round-countdown">
          <b>{seconds}</b>
          <span>
            {halftime ? "Second half starts" : countdown ? "Match starts" : "Next round starts"}
            <small>Automatic start · no confirmation needed</small>
          </span>
        </div>
      </section>
    </div>
  );
}
