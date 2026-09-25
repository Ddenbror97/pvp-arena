import { createFileRoute, Link } from "@tanstack/react-router";
import { CLUSTERS, GUIDES } from "@/content/guides";
import { OG_SITE_URL } from "@/lib/og";

const TITLE = "Crypto Casino Guides: Fairness, Games and Payments";
const DESC =
  "Plain-English guides to crypto casinos: provably fair checks, jackpot and coinflip odds, USDC deposits and withdrawals, and playing responsibly.";

export const Route = createFileRoute("/guides/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${OG_SITE_URL}/guides` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${OG_SITE_URL}/guides` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          url: `${OG_SITE_URL}/guides`,
          hasPart: GUIDES.map((g) => ({ "@type": "Article", headline: g.h1, url: `${OG_SITE_URL}/guides/${g.slug}` })),
        }),
      },
    ],
  }),
  component: GuidesHub,
});

function GuidesHub() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-14 pb-8">
      <header className="rounded-3xl border border-border bg-card px-5 py-10 sm:px-10 sm:py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Guides</p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight sm:text-5xl">Crypto casino guides</h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">
          Clear, factual guides to how crypto gaming works: how results are proven fair, how each game's odds work, how USDC deposits and withdrawals move, and how to stay in control.
        </p>
      </header>
      {CLUSTERS.map((c) => {
        const list = GUIDES.filter((g) => g.cluster === c.name).sort((a, b) => Number(!!b.pillar) - Number(!!a.pillar));
        if (!list.length) return null;
        return (
          <section key={c.name} aria-labelledby={`c-${c.name}`}>
            <h2 id={`c-${c.name}`} className="font-display text-2xl">{c.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((g) => (
                <Link key={g.slug} to="/guides/$slug" params={{ slug: g.slug }} className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
                  <h3 className="font-display text-base">{g.h1}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{g.description}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
