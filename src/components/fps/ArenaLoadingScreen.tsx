import { Link } from "@tanstack/react-router";
import { STRIKE_LOADING_IMAGE } from "@/lib/fps/loading";

export function ArenaLoadingScreen({
  progress,
  label,
  practice,
  canEnter,
  capturing,
  waiting,
  error,
  onEnter,
}: {
  progress: number;
  label: string;
  practice: boolean;
  canEnter: boolean;
  capturing: boolean;
  waiting: boolean;
  error: string | null;
  onEnter: () => void;
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
            <span className="duel-loading-kicker">
              AIM ARENA / {practice ? "SOLO PRACTICE" : "PVP DUEL"}
            </span>
            <h1>
              PvP<span>Strike</span>
            </h1>
            <p>
              {practice
                ? "You vs Arena Bot · First to seven wins"
                : "Human vs human · Server-verified combat"}
            </p>
          </div>
          <div className="duel-loading-action">
            {waiting ? (
              <p role="status">
                You’re ready.
                <br />
                Waiting for your opponent…
              </p>
            ) : (
              <button
                className="duel-loading-enter"
                type="button"
                aria-label="Ready & enter arena"
                disabled={!canEnter || capturing}
                onClick={onEnter}
              >
                {capturing ? "Entering…" : canEnter ? "Enter arena →" : "Preparing arena…"}
              </button>
            )}
            {!waiting && <small>Mouse & keyboard · Esc opens settings</small>}
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
