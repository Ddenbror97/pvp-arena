import { Link } from "@tanstack/react-router";
import { STRIKE_LOADING_IMAGE } from "@/lib/fps/loading";

export function ArenaLoadingScreen({
  progress,
  label,
  error,
}: {
  progress: number;
  label: string;
  error: string | null;
}) {
  const percent = Math.max(0, Math.min(100, progress));
  return (
    <section
      className="duel-loading-screen"
      aria-label="Preparing PvPStrike match"
      aria-busy={percent < 100}
    >
      <img
        className="duel-loading-image"
        src={STRIKE_LOADING_IMAGE}
        width={1672}
        height={941}
        alt=""
        fetchPriority="high"
        decoding="async"
      />
      <div className="duel-loading-shade" aria-hidden />
      <Link className="duel-loading-back" to="/fps-duel">
        ← Lobby
      </Link>
      <div className="duel-loading-content">
        <div className="duel-loading-heading">
          <div>
            <span className="duel-loading-kicker">PVPSTRIKE</span>
            <h1>Dustfront</h1>
          </div>
        </div>
        <div className="duel-loading-status">
          <span role="status">{label}</span>
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
      </div>
    </section>
  );
}
