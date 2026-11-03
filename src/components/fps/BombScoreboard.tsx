import { Link } from "@tanstack/react-router";
import { ShieldCheck, Skull } from "lucide-react";
import type { BombView } from "@/lib/fps/bomb/snapshot";
import { BOMB_RULES } from "@/lib/fps/bomb/rules";
import { matchResult, myGroup, otherGroup, scoreboard, teamLabel } from "@/lib/fps/bomb/hud";

export function BombScoreboard({ view }: { view: BombView }) {
  const board = scoreboard(view),
    result = matchResult(view),
    mineGroup = myGroup(view);
  return (
    <section className="bomb-scoreboard" aria-label="Scoreboard">
      <header>
        {view.phase === "halftime" ? (
          <h2>Halftime · teams switch sides</h2>
        ) : result ? (
          <h2 className={`result-${result}`}>
            {result === "victory" ? "Victory" : result === "defeat" ? "Defeat" : "Draw"}
          </h2>
        ) : (
          <h2>Sandgate · Bomb Defusal</h2>
        )}
        <small>
          Round {Math.min(view.round, BOMB_RULES.maxRounds)} of {BOMB_RULES.maxRounds} ·{" "}
          {view.half === 1 ? "First" : "Second"} half
          {view.firstHalf
            ? ` · First half ${view.firstHalf[mineGroup]}–${view.firstHalf[otherGroup(mineGroup)]}`
            : ""}
        </small>
      </header>
      {board.map((side) => (
        <table key={side.team} className={`team-${side.team}`}>
          <caption>
            <b>{side.score}</b> {teamLabel(side.team)}
          </caption>
          <thead>
            <tr>
              <th>Player</th>
              <th title="Kills">K</th>
              <th title="Assists">A</th>
              <th title="Deaths">D</th>
              <th>HS%</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {side.rows.map((r) => (
              <tr key={r.slot} className={`${r.you ? "you" : ""}${r.alive ? "" : " dead"}`}>
                <td>
                  {r.name}
                  {r.bot && !r.name.startsWith("BOT") ? (
                    <span className="bomb-bot-tag">BOT</span>
                  ) : null}
                  {r.carrier ? <em> · bomb</em> : null}
                </td>
                <td>{r.kills}</td>
                <td>{r.assists}</td>
                <td>{r.deaths}</td>
                <td>{r.hsPercent}</td>
                <td>
                  <span
                    className={r.alive ? "bomb-status alive" : "bomb-status fallen"}
                    role="img"
                    aria-label={r.alive ? "Alive" : "Dead"}
                    title={r.alive ? "Alive" : "Dead"}
                  >
                    {r.alive ? (
                      <ShieldCheck size={16} aria-hidden />
                    ) : (
                      <Skull size={16} aria-hidden />
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
      {view.phase === "completed" && (
        <footer>
          A new match starts here in a few seconds. <Link to="/fps-duel">Back to lobby</Link>
        </footer>
      )}
    </section>
  );
}
