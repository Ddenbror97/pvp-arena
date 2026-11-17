import "./match-score.css";

type Team = "police" | "terrorist";
type Player = { slot: number; alive: boolean; team: Team; name: string };
type Side = { team: Team; score: number; players: Player[] };

/** One score/clock treatment for 1v1 and Bomb Defusal; slots reflect the actual team size. */
export function MatchScoreHud({
  left,
  right,
  bestOf,
  round,
  half,
  clock,
  planted = false,
}: {
  left: Side;
  right: Side;
  bestOf: number;
  round: number;
  half?: 1 | 2 | undefined;
  clock: string;
  planted?: boolean;
}) {
  return (
    <div className="fps-match-hud" aria-label="Match score and round timer">
      <TeamBar players={left.players} side="mine" />
      <div className="fps-match-score">
        <b className={`team-${left.team}`} aria-label={`Your team score: ${left.score}`}>
          {left.score}
        </b>
        <div>
          <small>
            BEST OF {bestOf} · ROUND {Math.min(round, bestOf)}
            {half && <> · {half === 1 ? "1ST" : "2ND"} HALF</>}
          </small>
          <strong className={planted ? "fps-bomb-planted" : undefined}>{clock}</strong>
        </div>
        <b className={`team-${right.team}`} aria-label={`Opponent score: ${right.score}`}>
          {right.score}
        </b>
      </div>
      <TeamBar players={right.players} side="enemy" />
    </div>
  );
}
function TeamBar({ players, side }: { players: Player[]; side: "mine" | "enemy" }) {
  return (
    <div
      className={`fps-team-bar ${side}`}
      aria-label={`${side === "mine" ? "Your" : "Enemy"} team`}
    >
      {players.map((p) => (
        <i
          key={p.slot}
          role="img"
          title={p.name}
          className={`team-${p.team}${p.alive ? "" : " dead"}`}
          aria-label={`${p.name}${p.alive ? "" : " (dead)"}`}
        />
      ))}
    </div>
  );
}
