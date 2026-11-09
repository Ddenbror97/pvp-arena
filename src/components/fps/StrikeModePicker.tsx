import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Crosshair, Crown } from "lucide-react";
import { warmBrLoadingImage } from "@/lib/fps/br/loading";
import battleArtwork from "@/assets/fps/mode-battle-royale-v1.webp";
import duelArtwork from "@/assets/fps/mode-duel-v1.webp";
import bombArtwork from "@/assets/fps/mode-bomb-defusal-v1.webp";

export type StrikeMode = "battle" | "duel" | "bomb";
const MODES = [
  {
    id: "battle",
    artwork: battleArtwork,
    name: "Battle Royale",
    icon: Crown,
  },
  {
    id: "duel",
    artwork: duelArtwork,
    name: "1v1 Duel",
    icon: Crosshair,
  },
  {
    id: "bomb",
    artwork: bombArtwork,
    name: "Defuse the Bomb",
    icon: CalendarDays,
  },
] as const;

export function StrikeModePicker({
  mode,
  onSelect,
  onPlay,
  desktop = true,
  battleAllowed = false,
}: {
  mode: StrikeMode;
  onSelect: (mode: StrikeMode) => void;
  onPlay: () => void;
  /** Battle royale practice needs a mouse and keyboard (as the match page says). */
  desktop?: boolean | null;
  battleAllowed?: boolean;
}) {
  return (
    <section className="strike-mode-picker" aria-labelledby="strike-modes-title">
      <div className="strike-modes-heading">
        <h2 id="strike-modes-title">Choose your game mode</h2>
      </div>
      <div className="strike-mode-grid" role="group" aria-label="Game mode">
        {MODES.map(({ id, name, artwork, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className="strike-mode-card"
            aria-pressed={mode === id}
            onClick={() => {
              if (id === "battle" && battleAllowed) warmBrLoadingImage();
              onSelect(id);
            }}
          >
            <img src={artwork} alt="" width={768} height={768} decoding="async" />
            {id === "bomb" && <span className="strike-mode-soon">Cash · Coming soon</span>}
            {id === "battle" && <span className="strike-mode-soon">New · 100 players</span>}
            {id === "duel" && (
              <span className="strike-mode-versus" aria-hidden>
                VS
              </span>
            )}
            <div className="strike-mode-content">
              <Icon className="strike-mode-icon" aria-hidden />
              <h3>{name}</h3>
            </div>
          </button>
        ))}
      </div>
      {mode === "battle" && desktop === true && battleAllowed ? (
        <Link
          className="strike-primary strike-play-now"
          to="/fps-br"
          onPointerEnter={warmBrLoadingImage}
          onFocus={warmBrLoadingImage}
        >
          Play Now <ArrowRight size={19} aria-hidden />
        </Link>
      ) : (
        <button
          type="button"
          className="strike-primary strike-play-now"
          disabled={mode !== "duel"}
          onClick={onPlay}
        >
          {mode === "duel"
            ? "Play Now"
            : mode === "battle"
              ? battleAllowed
                ? "Desktop only"
                : "Sign in to play"
              : "Coming soon"}{" "}
          {mode === "duel" && <ArrowRight size={19} aria-hidden />}
        </button>
      )}
    </section>
  );
}
