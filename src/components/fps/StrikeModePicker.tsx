import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Crosshair,
  Crown,
  Layers,
  Swords,
  Users,
} from "lucide-react";
import { STRIKE_SHOWCASE } from "@/lib/fps/showcase";

export type StrikeMode = "battle" | "duel" | "bomb";
const MODES = [
  {
    id: "battle",
    name: "Battle Royale",
    copy: "Be the last one standing.",
    icon: Crown,
    detail: "100 players",
    tag: "Large map",
    tagIcon: Clock3,
  },
  {
    id: "duel",
    name: "1v1 Duel",
    copy: "Pure skill. No teams.",
    icon: Crosshair,
    detail: "1 vs 1",
    tag: "Fast rounds",
    tagIcon: Clock3,
  },
  {
    id: "bomb",
    name: "Defuse the Bomb",
    copy: "Plant, defuse, and outplay.",
    icon: CalendarDays,
    detail: "5 vs 5",
    tag: "Tactical",
    tagIcon: Layers,
  },
] as const;

export function StrikeModePicker({
  mode,
  onSelect,
  onPlay,
}: {
  mode: StrikeMode;
  onSelect: (mode: StrikeMode) => void;
  onPlay: () => void;
}) {
  return (
    <section className="strike-mode-picker" aria-labelledby="strike-modes-title">
      <div className="strike-modes-heading">
        <span>PVPSTRIKE</span>
        <h2 id="strike-modes-title">Choose your game mode</h2>
        <p>Find your next rival. Make every round count.</p>
      </div>
      <div className="strike-mode-grid" role="group" aria-label="Game mode">
        {MODES.map(({ id, name, copy, icon: Icon, detail, tag, tagIcon: TagIcon }) => (
          <button
            type="button"
            key={id}
            className="strike-mode-card"
            aria-pressed={mode === id}
            onClick={() => onSelect(id)}
          >
            <img src={STRIKE_SHOWCASE} alt="" width={1672} height={941} decoding="async" />
            {id !== "duel" && (
              <span className="strike-mode-soon">
                {id === "bomb" ? "Cash · Coming soon" : "Coming soon"}
              </span>
            )}
            {id === "duel" && <Swords className="strike-mode-versus" aria-hidden />}
            <div className="strike-mode-content">
              <Icon className="strike-mode-icon" aria-hidden />
              <h3>{name}</h3>
              <p>{copy}</p>
              <div className="strike-mode-tags">
                <span>
                  <Users aria-hidden />
                  {detail}
                </span>
                <span>
                  <TagIcon aria-hidden />
                  {tag}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="strike-primary strike-play-now"
        disabled={mode !== "duel"}
        onClick={onPlay}
      >
        {mode === "duel" ? "Play Now" : "Coming soon"}{" "}
        {mode === "duel" && <ArrowRight size={19} aria-hidden />}
      </button>
      <p className="strike-mode-format">
        {mode === "duel"
          ? "First to seven · Best of 13"
          : mode === "bomb"
            ? "Bomb Defusal Practice is available in Training."
            : "Battle Royale is coming soon."}
      </p>
    </section>
  );
}
