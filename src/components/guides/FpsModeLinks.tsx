import { Link } from "@tanstack/react-router";
import type { FpsMode } from "@/lib/guides/promotions";

/** Crawlable mode navigation; kept outside the research/answer text. */
export function FpsModeLinks({ preferred = "duel" }: { preferred?: FpsMode }) {
  const card = (mode: FpsMode) =>
    `rounded-xl border p-4 ${mode === preferred ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`;
  const play =
    "mt-3 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90";
  const learn = "mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline";
  return (
    <nav aria-label="Explore PvPStrike game modes" className="my-8" data-fps-mode-links>
      <h2 className="font-display text-xl">Play PvPStrike in your browser</h2>
      <p className="mt-2 text-sm text-muted-foreground">Three modes. Start with practice.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        <li className={card("duel")}>
          <h3 className="font-display text-base">
            <Link to="/fps-1v1" className="hover:text-primary">
              1v1 FPS duels
            </Link>
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Practise against a bot or choose a cash duel.
          </p>
          <Link to="/" preload="intent" className={play}>
            Open 1v1
          </Link>
          <div>
            <Link to="/fps-1v1" className={learn}>
              Rules and entry fees
            </Link>
          </div>
        </li>
        <li className={card("bomb")}>
          <h3 className="font-display text-base">
            <Link to="/how-it-works" hash="bomb-defusal" className="hover:text-primary">
              5v5 Bomb Defusal
            </Link>
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Plant or defuse with bot-filled teams.
          </p>
          <Link to="/fps-bomb" preload="intent" className={play}>
            Practice 5v5
          </Link>
          <div>
            <Link to="/how-it-works" hash="bomb-defusal" className={learn}>
              How 5v5 works
            </Link>
          </div>
        </li>
        <li className={card("br")}>
          <h3 className="font-display text-base">
            <Link
              to="/guides/$slug"
              params={{ slug: "browser-battle-royale" }}
              className="hover:text-primary"
            >
              Browser Royale
            </Link>
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Drop into Project Island. Cash mode coming soon.
          </p>
          <Link to="/fps-br" preload="intent" className={play}>
            Play Browser Royale
          </Link>
          <div>
            <Link to="/guides/$slug" params={{ slug: "browser-battle-royale" }} className={learn}>
              Browser game guide
            </Link>
          </div>
        </li>
      </ul>
    </nav>
  );
}
