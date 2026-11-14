import { STRIKE_LOADING_IMAGE } from "@/lib/fps/loading";

export function ArenaLoadingScreen({
  progress,
  label,
  error,
  mapName = "Dustfront",
  modeName,
  image = STRIKE_LOADING_IMAGE,
  whole = false,
  onRetry,
}: {
  progress: number;
  label: string;
  error: string | null;
  /** The match map's display name. */
  mapName?: string;
  modeName?: string;
  /** The match map's loading art (maps/loading-screens.ts); null while the map is unknown. */
  image?: string | null;
  /**
   * Show the whole picture on every screen shape (a labelled map whose edges must not be cut):
   * the art uncropped, and the rest of the screen filled with a soft, blurred copy of it.
   */
  whole?: boolean;
  /** Shown with the error: try again (the server was unreachable). */
  onRetry?: (() => void) | undefined;
}) {
  const percent = Math.max(0, Math.min(100, progress));
  return (
    <section
      className="duel-loading-screen"
      aria-label="Preparing PvPStrike match"
      aria-busy={percent < 100}
    >
      {image && whole && (
        <img className="duel-loading-fill" src={image} alt="" decoding="async" aria-hidden />
      )}
      {image && (
        <img
          className={`duel-loading-image${whole ? " is-whole" : ""}`}
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
        {error && onRetry && (
          <button type="button" className="duel-loading-retry" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </section>
  );
}
