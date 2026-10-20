import { OG_SITE_URL, ogImageMeta } from "@/lib/og";
import { publisherNode } from "@/lib/seo/publisher";

export type HeadLink = {
  rel: string;
  href: string;
  as?: string;
  type?: string;
  fetchPriority?: "high" | "low" | "auto";
};

/** Absolute canonical URL on https://pvpspinarena.com. */
export function canonicalUrl(path: string): string {
  if (path === "/" || path === "") return `${OG_SITE_URL}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${OG_SITE_URL}${normalized}`;
}

/**
 * Head for a public indexable page: unique title, description, canonical,
 * og:url, and JSON-LD that matches the visible page. No ratings, reviews,
 * or site search action.
 */
export function indexableHead(opts: {
  path: string;
  title: string;
  description: string;
  crumb?: string;
  /** Homepage also emits Organization and WebSite. Other pages emit WebPage. */
  site?: boolean;
  extraLinks?: HeadLink[];
}) {
  const url = canonicalUrl(opts.path);
  const page = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: opts.title,
    description: opts.description,
    isPartOf: { "@id": `${OG_SITE_URL}/#website` },
    inLanguage: "en",
  };
  const crumbs = opts.crumb
    ? [
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${OG_SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: opts.crumb, item: url },
          ],
        },
      ]
    : [];
  const graph = opts.site
    ? [
        { ...publisherNode(), "@id": `${OG_SITE_URL}/#organization` },
        {
          "@type": "WebSite",
          "@id": `${OG_SITE_URL}/#website`,
          url: `${OG_SITE_URL}/`,
          name: "PVPspinArena",
          publisher: { "@id": `${OG_SITE_URL}/#organization` },
          inLanguage: "en",
        },
        { ...page, about: { "@id": `${OG_SITE_URL}/#organization` } },
      ]
    : [page, ...crumbs];

  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
    links: [{ rel: "canonical", href: url }, ...(opts.extraLinks ?? [])],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      },
    ],
  };
}
