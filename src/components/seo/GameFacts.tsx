import { Link } from "@tanstack/react-router";
import { GAME_FACT_PAGES, type GameFactPage } from "@/lib/seo/game-facts";

/** Crawlable rules under a game lobby. The figures match the published terms. */
export function GameFacts({ game }: { game: keyof typeof GAME_FACT_PAGES }) {
  const page: GameFactPage = GAME_FACT_PAGES[game];
  const headingId = `${page.id}-how-it-works`;
  return (
    <section
      aria-labelledby={headingId}
      className="mt-8 rounded-xl border border-border bg-card/70 p-4 sm:p-5"
    >
      <h2 id={headingId} className="font-display text-lg text-foreground">
        How {page.name} works
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The rules below are the ones used on this page. Minimums and maximums shown in the game
        before you confirm are the limits for that wager.
      </p>
      <dl className="mt-4 space-y-3">
        {page.facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-sm font-semibold text-foreground">{fact.label}</dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{fact.text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Read more in{" "}
        <Link to="/how-it-works" className="text-primary hover:underline">
          how it works
        </Link>
        ,{" "}
        <Link to="/fairness" className="text-primary hover:underline">
          fairness
        </Link>
        ,{" "}
        <Link to="/terms" className="text-primary hover:underline">
          terms
        </Link>
        , and{" "}
        <Link to="/responsible-gambling" className="text-primary hover:underline">
          responsible gambling
        </Link>
        .{page.reads.length > 0 ? " Related guides: " : ""}
        {page.reads.map((read, i) => (
          <span key={read.slug}>
            {i > 0 ? ", " : ""}
            <Link
              to={read.to}
              params={{ slug: read.slug }}
              className="text-primary hover:underline"
            >
              {read.label}
            </Link>
          </span>
        ))}
        .
      </p>
    </section>
  );
}
