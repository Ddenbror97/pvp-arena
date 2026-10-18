import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getTopicPage } from "@/lib/guides/pages.functions";
import { OG_SITE_URL } from "@/lib/og";

export const Route = createFileRoute("/guides/topics/$topic")({
  loader: async ({ params }) => {
    const page = await getTopicPage({ data: params.topic });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {
        meta: [{ title: "Topic not found | PVPspinArena" }, { name: "robots", content: "noindex" }],
      };
    const t = loaderData.topic;
    const url = `${OG_SITE_URL}/guides/topics/${t.slug}`;
    const list = loaderData.articles;
    const pillar = loaderData.pillar;
    return {
      meta: [
        { title: t.title },
        { name: "description", content: t.description },
        { property: "og:title", content: t.title },
        { property: "og:description", content: t.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "CollectionPage",
                name: t.title,
                description: t.description,
                url,
                ...(pillar
                  ? {
                      mainEntity: {
                        "@type": "Article",
                        headline: pillar.h1,
                        url: `${OG_SITE_URL}/guides/${pillar.slug}`,
                      },
                    }
                  : {}),
                hasPart: list.map((g) => ({
                  "@type": "Article",
                  headline: g.h1,
                  url: `${OG_SITE_URL}/guides/${g.slug}`,
                })),
              },
              ...loaderData.groups.map((group) => ({
                "@type": "ItemList",
                name: group.name,
                itemListOrder: "https://schema.org/ItemListOrderAscending",
                numberOfItems: group.cards.length,
                itemListElement: group.cards.map((card, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: card.h1,
                  url: `${OG_SITE_URL}/guides/${card.slug}`,
                })),
              })),
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${OG_SITE_URL}/` },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Guides",
                    item: `${OG_SITE_URL}/guides`,
                  },
                  { "@type": "ListItem", position: 3, name: t.name, item: url },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  component: TopicPage,
});

function TopicPage() {
  const { topic: t, count, pillar, groups, ungrouped, others } = Route.useLoaderData();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 pb-8">
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
            <li aria-current="page" className="text-foreground">
              {t.name}
            </li>
          </ol>
        </nav>
        <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
          Topic · {count} guides
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl leading-tight sm:text-5xl">
          {t.name} guides
        </h1>
        <p className="mt-5 max-w-3xl leading-relaxed text-muted-foreground">{t.intro}</p>
      </header>

      {pillar && (
        <section aria-labelledby="start-h">
          <h2 id="start-h" className="font-display text-2xl">
            Read this first
          </h2>
          <Link
            to="/guides/$slug"
            params={{ slug: pillar.slug }}
            className="mt-5 block rounded-2xl border border-primary/40 bg-primary/5 p-6 transition-colors hover:border-primary"
          >
            <h3 className="font-display text-xl">{pillar.h1}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {pillar.answer}
            </p>
          </Link>
        </section>
      )}

      {groups.map((group) => {
        return (
          <section key={group.name} aria-labelledby={`g-${group.name}`}>
            <h2 id={`g-${group.name}`} className="font-display text-2xl">
              {group.name}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.cards.map((g) => (
                <Link
                  key={g.slug}
                  to="/guides/$slug"
                  params={{ slug: g.slug }}
                  className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
                >
                  <h3 className="font-display text-base">{g.h1}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{g.description}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {ungrouped.length > 0 && (
        <section aria-labelledby="all-h">
          <h2 id="all-h" className="font-display text-2xl">
            More in this topic
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ungrouped.map((g) => (
              <Link
                key={g.slug}
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <h3 className="font-display text-base">{g.h1}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{g.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav aria-labelledby="other-h">
        <h2 id="other-h" className="font-display text-lg">
          Other topics
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((o) => (
            <li key={o.slug}>
              <Link
                to="/guides/topics/$topic"
                params={{ topic: o.slug }}
                className="inline-block rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary"
              >
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
