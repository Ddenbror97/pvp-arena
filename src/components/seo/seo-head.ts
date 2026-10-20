import { OG_SITE_URL, ogImageMeta } from "@/lib/og";

export type Faq = { q: string; a: string };

/** Builds head() for an SEO content page: meta, canonical and JSON-LD (WebPage, BreadcrumbList, FAQPage). */
export function seoHead(opts: {
  path: string;
  title: string;
  description: string;
  crumb: string;
  faqs: Faq[];
}) {
  const url = `${OG_SITE_URL}${opts.path}`;
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
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": url,
              url,
              name: opts.title,
              description: opts.description,
              inLanguage: "en",
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${OG_SITE_URL}/` },
                { "@type": "ListItem", position: 2, name: opts.crumb, item: url },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: opts.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  };
}
