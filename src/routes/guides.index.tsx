import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { HubGuide } from "@/lib/guides/pages";
import { getGuidesHub } from "@/lib/guides/pages.functions";
import { OG_SITE_URL } from "@/lib/og";

const TITLE = "Crypto Casino Guides: Odds, Lottery and Betting";
const DESC =
  "Topic hubs for skill wagers, provably fair play, lottery odds, horse racing, sports betting, prediction markets, payments, and responsible play.";

export const Route = createFileRoute("/guides/")({
  loader: () => getGuidesHub(),
  head: ({ loaderData }) => ({
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
          "@graph": [
            {
              "@type": "CollectionPage",
              name: TITLE,
              url: `${OG_SITE_URL}/guides`,
              hasPart: (loaderData?.guides ?? []).map((g) => ({
                "@type": "Article",
                headline: g.h1,
                url: `${OG_SITE_URL}/guides/${g.slug}`,
              })),
            },
            {
              "@type": "ItemList",
              name: "Guide topics",
              itemListOrder: "https://schema.org/ItemListUnordered",
              numberOfItems: (loaderData?.clusters ?? []).filter((c) => c.topic).length,
              itemListElement: (loaderData?.clusters ?? [])
                .filter((c) => c.topic)
                .map((c, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: c.name,
                  url: `${OG_SITE_URL}/guides/topics/${c.slug}`,
                })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${OG_SITE_URL}/` },
                { "@type": "ListItem", position: 2, name: "Guides", item: `${OG_SITE_URL}/guides` },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: GuidesHub,
});

function hit(g: HubGuide, q: string) {
  if (!q) return true;
  const hay = `${g.h1} ${g.keyword} ${g.title} ${g.cluster}`.toLowerCase();
  return hay.includes(q);
}

function GuideLinks({ guides, q }: { guides: HubGuide[]; q: string }) {
  return (
    <ul className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
      {guides.map((g) => (
        <li key={g.slug} className={hit(g, q) ? undefined : "hidden"}>
          <Link
            to="/guides/$slug"
            params={{ slug: g.slug }}
            className="text-sm text-foreground/80 hover:text-primary"
          >
            {g.h1}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GuidesHub() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const { guides, clusters: hubClusters } = Route.useLoaderData();
  const clusters = useMemo(() => {
    const bySlug = new Map(guides.map((g) => [g.slug, g]));
    return hubClusters.map((c) => ({
      ...c,
      list: guides.filter((g) => g.cluster === c.name),
      pillarGuide: c.pillar ? bySlug.get(c.pillar.slug) : undefined,
      groups: c.groups.map((g) => ({
        name: g.name,
        guides: g.slugs.map((s) => bySlug.get(s)).filter((x): x is HubGuide => !!x),
      })),
    }));
  }, [guides, hubClusters]);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-8">
      <header className="rounded-3xl border border-border bg-card px-5 py-10 sm:px-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-primary">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-foreground">
              Guides
            </li>
          </ol>
        </nav>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
          Guide library
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight sm:text-5xl">
          Crypto casino guides
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">
          {guides.length} guides in {clusters.length} topics. Open a topic, then a guide. Skill
          wagers, lottery, horse racing, prediction markets, and sports bets sit beside the crypto
          casino topics, and every article stays linked here and on its topic page.
        </p>
        <label className="mt-6 block max-w-md text-sm">
          <span className="font-medium text-foreground">Search guides</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try skill wagers, lottery, provably fair"
            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
      </header>
      <section aria-labelledby="topics-h">
        <h2 id="topics-h" className="font-display text-2xl">
          Topics
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Each topic is its own page. Start there when you want the short path. The full list under
          this grid is the same set of links, grouped.
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.map((c) => {
            const { list, pillarGuide: pillar, topic } = c;
            const familyHit =
              !q ||
              list.some((g) => hit(g, q)) ||
              c.name.toLowerCase().includes(q) ||
              c.blurb.toLowerCase().includes(q);
            return (
              <li
                key={c.slug}
                className={familyHit ? "rounded-2xl border border-border bg-card p-5" : "hidden"}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="tabular-nums text-foreground">{list.length}</span> guides
                </p>
                <h3 className="mt-2 font-display text-lg">
                  {topic ? (
                    <Link
                      to="/guides/topics/$topic"
                      params={{ topic: c.slug }}
                      className="hover:text-primary"
                    >
                      {c.name}
                    </Link>
                  ) : (
                    <a href={`#topic-${c.slug}`} className="hover:text-primary">
                      {c.name}
                    </a>
                  )}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.blurb}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                  {topic && (
                    <Link
                      to="/guides/topics/$topic"
                      params={{ topic: c.slug }}
                      className="text-primary hover:underline"
                    >
                      Topic page
                    </Link>
                  )}
                  {pillar && (
                    <Link
                      to="/guides/$slug"
                      params={{ slug: pillar.slug }}
                      className={
                        hit(pillar, q) ? "text-foreground/80 hover:text-primary" : "hidden"
                      }
                    >
                      Start here
                    </Link>
                  )}
                  <a href={`#topic-${c.slug}`} className="text-foreground/80 hover:text-primary">
                    Jump to list
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      {clusters.map((c) => {
        const { list, groups, pillarGuide: pillar } = c;
        const grouped = new Set(groups.flatMap((g) => g.guides.map((x) => x.slug)));
        const ungrouped = list.filter((g) => !grouped.has(g.slug));
        const familyHit = !q || list.some((g) => hit(g, q)) || c.name.toLowerCase().includes(q);
        return (
          <section
            key={c.name}
            id={`topic-${c.slug}`}
            aria-labelledby={`c-${c.slug}`}
            className={
              familyHit
                ? "scroll-mt-24 rounded-3xl border border-border bg-card px-5 py-8 sm:px-8"
                : "hidden"
            }
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id={`c-${c.slug}`} className="font-display text-2xl">
                {c.topic ? (
                  <Link
                    to="/guides/topics/$topic"
                    params={{ topic: c.slug }}
                    className="hover:text-primary"
                  >
                    {c.name}
                  </Link>
                ) : (
                  c.name
                )}
              </h2>
              {c.topic && (
                <Link
                  to="/guides/topics/$topic"
                  params={{ topic: c.slug }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Topic page · {list.length} guides
                </Link>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{c.blurb}</p>
            {pillar && (
              <Link
                to="/guides/$slug"
                params={{ slug: pillar.slug }}
                className={
                  hit(pillar, q)
                    ? "mt-5 block rounded-2xl border border-primary/40 bg-primary/5 p-5 transition-colors hover:border-primary"
                    : "hidden"
                }
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
                  Start here
                </p>
                <h3 className="mt-2 font-display text-lg">{pillar.h1}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {c.pillar?.description}
                </p>
              </Link>
            )}
            <div className="mt-6 space-y-6">
              {groups.map((group) => {
                const visible = !q || group.guides.some((g) => hit(g, q));
                if (!group.guides.length) return null;
                return (
                  <div key={group.name} className={visible ? undefined : "hidden"}>
                    <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {group.name}
                    </h3>
                    <GuideLinks
                      guides={group.guides.filter((g) => g.slug !== pillar?.slug)}
                      q={q}
                    />
                  </div>
                );
              })}
              {ungrouped.length > 0 && (
                <div className={!q || ungrouped.some((g) => hit(g, q)) ? undefined : "hidden"}>
                  <h3 className="text-sm font-semibold">More in {c.name}</h3>
                  <GuideLinks guides={ungrouped} q={q} />
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
