import { Link } from "@tanstack/react-router";
import { STRIKE_LOADING_IMAGE } from "@/lib/fps/loading";

export function ArenaLoadingScreen({
  progress,
  label,
  error,
  mapName = "Dustfront",
  modeName,
  image = STRIKE_LOADING_IMAGE,
  onRetry,
  retryLabel = "Try again",
}: {
  progress: number;
  label: string;
  error: string | null;
  /** The match map's display name. */
  mapName?: string;
  modeName?: string;
  /** The match map's loading art (maps/loading-screens.ts); null while the map is unknown. */
  image?: string | null;
  /** Shown with the error: try again (the server was unreachable). */
  onRetry?: (() => void) | undefined;
  /** The retry button's words. */
  retryLabel?: string | undefined;
}) {
  const percent = Math.max(0, Math.min(100, progress));
  return (
    <section
      className="duel-loading-screen"
      aria-label={`Preparing ${modeName || "PvPStrike"} match`}
      aria-busy={percent < 100}
    >
      {image && (
        <img
          className="duel-loading-image"
          src={image}
          width={1672}
          height={941}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
      )}
      <div className="duel-loading-shade" aria-hidden />
      <div className="duel-loading-content">
        <div className="duel-loading-heading">
          <div>
            {!modeName && <span className="duel-loading-kicker">PVPSTRIKE</span>}
            <h1>{mapName}</h1>
            {modeName && <p className="duel-loading-mode">{modeName}</p>}
          </div>
        </div>
        <div className="duel-loading-status">
          <span role="status" className={modeName ? "sr-only" : undefined}>
            {label}
          </span>
          <span>{percent}%</span>
        </div>
        <div
          className="duel-loading-track"
          role="progressbar"
          aria-label="Arena preparation"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${label} — ${percent}%`}
        >
          <div style={{ transform: `scaleX(${percent / 100})` }} />
        </div>
        {error && (
          <p className="duel-loading-error" role="alert">
            {error}
          </p>
        )}
        {error && (
          <div className="duel-loading-actions">
            {onRetry && (
              <button type="button" className="duel-loading-retry" onClick={onRetry}>
                {retryLabel}
              </button>
            )}
            {/* Never only a message: a way out of every stopped or long wait. */}
            <Link className="duel-loading-retry duel-loading-leave" to="/">
              Back to lobby
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
