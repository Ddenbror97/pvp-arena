import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, ShieldCheck } from "lucide-react";
import { GuideBody, GuideInline, GuideLinkTargets } from "@/components/guides/GuideBody";
import { GuideScrollCta } from "@/components/guides/GuideScrollCta";
import { GuideWidget } from "@/components/guides/GuideWidgets";
import { GameDataSnapshot } from "@/components/guides/GameDataSnapshot";
import { SeoFaq, SeoCta } from "@/components/seo/SeoPage";
import {
  GUIDE_GAME_DATA,
  type GameSnapshotView,
  type SnapshotGame,
} from "@/lib/game-snapshot/snapshot";
import { getGameSnapshot } from "@/lib/game-snapshot/snapshot.functions";
import { getGuidePage } from "@/lib/guides/pages.functions";
import type { GuideLink, GuidePageData } from "@/lib/guides/pages";
import { OG_SITE_URL } from "@/lib/og";

const SNAPSHOT_WAIT_MS = 400;

/** Visible widget headings. Calculator pages add a WebApplication node for these. */
const WIDGET_APPLICATION: Record<string, string> = {
  "cs2-trade-up": "CS2 trade up calculator",
  "cs2-inventory": "CS2 / CSGO inventory value",
  "cs2-case-odds": "CS2 case odds",
  "cs2-float": "CS2 float checker",
  martingale: "Martingale calculator",
  rtp: "RTP calculator",
  lottery: "Lottery calculator",
  hedge: "Hedge calculator",
  arbitrage: "Arbitrage calculator",
  "gambling-tax": "Gambling tax calculator",
  "roulette-sim": "Roulette simulator",
  "bet-tracker": "Bet tracker",
};

function gameSnapshot(slug: string): Promise<GameSnapshotView | null> {
  const game = GUIDE_GAME_DATA[slug];
  if (!game) return Promise.resolve(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    getGameSnapshot({ data: game }).catch(() => null),
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), SNAPSHOT_WAIT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

export const Route = createFileRoute("/guides/$slug")({
  loader: async ({ params }) => {
    const [page, snapshot] = await Promise.all([
      getGuidePage({ data: params.slug }),
      gameSnapshot(params.slug),
    ]);
    if (!page) throw notFound();
    return { page, snapshot };
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Guide not found | PVPspinArena" }, { name: "robots", content: "noindex" }],
      };
    const { guide: g, topic } = loaderData.page;
    const url = `${OG_SITE_URL}/guides/${g.slug}`;
    const graph: Record<string, unknown>[] = [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: g.h1,
        description: g.description,
        url,
        inLanguage: "en",
        datePublished: g.updated,
        dateModified: g.updated,
        keywords: [g.keyword, ...g.secondary].join(", "),
        author: { "@type": "Organization", name: "PVPspinArena", url: OG_SITE_URL },
        publisher: { "@type": "Organization", name: "PVPspinArena", url: OG_SITE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${OG_SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Guides", item: `${OG_SITE_URL}/guides` },
          ...(topic
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: g.cluster,
                  item: `${OG_SITE_URL}/guides/topics/${topic.slug}`,
                },
              ]
            : []),
          { "@type": "ListItem", position: topic ? 4 : 3, name: g.h1, item: url },
        ],
      },
    ];
    if (g.faqs.length) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: g.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      });
    }
    const appName = g.widget ? WIDGET_APPLICATION[g.widget] : undefined;
    if (appName) {
      graph.push({
        "@type": "WebApplication",
        "@id": `${url}#calculator`,
        name: appName,
        description: g.description,
        url: `${url}#calculator`,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      });
    }
    if (g.howTo) {
      const steps = g.sections
        .flatMap((s) => s.body.split("\n").filter((l) => /^\d+\. /.test(l)))
        .slice(0, 10);
      if (steps.length)
        graph.push({
          "@type": "HowTo",
          name: g.h1,
          step: steps.map((l, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            text: l.replace(/^\d+\. /, "").replace(/\*\*|\[|\]\([^)]*\)/g, ""),
          })),
        });
    }
    return {
      meta: [
        { title: g.title },
        { name: "description", content: g.description },
        { property: "og:title", content: g.title },
        { property: "og:description", content: g.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
        },
      ],
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const { page, snapshot } = Route.useLoaderData();
  return (
    <GuideLinkTargets links={page.links}>
      <GuideArticle page={page} snapshot={snapshot} />
    </GuideLinkTargets>
  );
}

function GuideArticle({
  page,
  snapshot,
}: {
  page: GuidePageData;
  snapshot: GameSnapshotView | null;
}) {
  const { guide: g, minutes, related, topic, family, familyName, pillar, snapshotLinks } = page;
  const updated = new Date(g.updated + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <article className="mx-auto w-full max-w-6xl pb-8">
      <header className="rounded-3xl border border-border bg-card px-5 py-10 sm:px-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-primary">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/guides" className="hover:text-primary">
                Guides
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              {topic ? (
                <Link
                  to="/guides/topics/$topic"
                  params={{ topic: topic.slug }}
                  className="hover:text-primary"
                >
                  {g.cluster}
                </Link>
              ) : (
                <span>{g.cluster}</span>
              )}
            </li>
          </ol>
        </nav>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
          {g.cluster} guide
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight sm:text-5xl">{g.h1}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {g.answer}
        </p>
        <p className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {minutes} min read
          </span>
          <span>
            By the PVPspinArena team · Updated <time dateTime={g.updated}>{updated}</time>
          </span>
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-12">
          {pillar && (
            <p className="text-sm text-muted-foreground">
              Part of our {g.cluster} series. New to the topic? Start with{" "}
              <Link
                to="/guides/$slug"
                params={{ slug: pillar.slug }}
                className="text-primary hover:underline"
              >
                {pillar.h1}
              </Link>
              .
            </p>
          )}
          {g.facts.length > 0 && (
            <aside className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
              <h2 className="font-display text-base text-primary">Key facts</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {g.facts.map((f) => (
                  <li key={f}>
                    <GuideInline text={f} />
                  </li>
                ))}
              </ul>
            </aside>
          )}

          {g.widget && <GuideWidget type={g.widget} />}

          {g.sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
              <h2 id={`${s.id}-h`} className="font-display text-2xl leading-tight sm:text-3xl">
                {s.title}
              </h2>
              <div className="mt-4 max-w-3xl space-y-4 leading-relaxed text-muted-foreground">
                <GuideBody body={s.body} id={s.id} />
              </div>
            </section>
          ))}

          <LiveGameData
            initial={snapshot}
            game={GUIDE_GAME_DATA[g.slug] ?? null}
            howTo={snapshotLinks.howTo}
            fair={snapshotLinks.fair}
          />

          <SeoFaq faqs={g.faqs} />

          <aside className="rounded-2xl border border-gold/30 bg-gold/5 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-base text-gold">
              <ShieldCheck className="h-4 w-4" /> Play responsibly · 18+
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Gambling involves risk and you can lose what you stake. Only play with money you can
              afford to lose, check the laws where you live, and use limits or self-exclusion if you
              need them. See our{" "}
              <Link to="/responsible-gambling" className="text-primary hover:underline">
                responsible gambling page
              </Link>
              .
            </p>
          </aside>

          {g.sources.length > 0 && (
            <section aria-labelledby="sources-h">
              <h2 id="sources-h" className="font-display text-lg">
                Sources
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {g.sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="hidden lg:block">
          <nav
            aria-label="On this page"
            className="sticky top-24 rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              On this page
            </p>
            <ol className="mt-3 space-y-2 text-sm">
              {g.widget && (
                <li>
                  <a href="#calculator" className="text-muted-foreground hover:text-primary">
                    Calculator
                  </a>
                </li>
              )}
              {g.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-muted-foreground hover:text-primary">
                    {s.title}
                  </a>
                </li>
              ))}
              {GUIDE_GAME_DATA[g.slug] && (
                <li>
                  <a href="#live-data" className="text-muted-foreground hover:text-primary">
                    Live game data
                  </a>
                </li>
              )}
              <li>
                <a href="#faq" className="text-muted-foreground hover:text-primary">
                  FAQ
                </a>
              </li>
            </ol>
          </nav>
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-h" className="mt-16">
          <h2 id="related-h" className="font-display text-2xl">
            Related guides
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                to="/guides/$slug"
                params={{ slug: r.slug }}
                className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
                  {r.cluster}
                </p>
                <h3 className="mt-2 font-display text-base">{r.h1}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(family.length > 0 || topic) && (
        <nav
          aria-labelledby="family-h"
          className="mt-12 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 id="family-h" className="font-display text-lg">
            {family.length
              ? `More in ${familyName && familyName !== "Start here" ? familyName : g.cluster}`
              : g.cluster}
          </h2>
          {family.length > 0 && (
            <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {family.map((f) => (
                <li key={f.slug}>
                  <Link
                    to="/guides/$slug"
                    params={{ slug: f.slug }}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {f.h1}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {topic && (
            <Link
              to="/guides/topics/$topic"
              params={{ topic: topic.slug }}
              className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
            >
              All {g.cluster} guides →
            </Link>
          )}
        </nav>
      )}

      <div className="mt-16">
        <SeoCta
          {...(g.cta ?? {
            title: "See it on a live round",
            text: "Watch Jackpot, Coinflip and Roulette rounds as they happen, and check any result on the Fairness page.",
            primary: { to: "/", label: "Jackpot" },
            secondary: { to: "/fairness", label: "Fairness" },
          })}
        />
      </div>
      <GuideScrollCta key={g.slug} cluster={g.cluster} />
    </article>
  );
}

function LiveGameData({
  initial,
  game,
  howTo,
  fair,
}: {
  initial: GameSnapshotView | null;
  game: SnapshotGame | null;
  howTo: GuideLink | null;
  fair: GuideLink | null;
}) {
  const [view, setView] = useState(initial);
  useEffect(() => {
    if (view || !game) return;
    let stop = false;
    void getGameSnapshot({ data: game }).then((next) => {
      if (!stop && next) setView(next);
    });
    return () => {
      stop = true;
    };
  }, [game, view]);
  if (!game) return null;
  if (!view)
    return (
      <section
        id="live-data"
        aria-hidden
        className="scroll-mt-24 rounded-2xl border border-border bg-card"
      />
    );
  return <GameDataSnapshot view={view} howTo={howTo} fair={fair} />;
}
