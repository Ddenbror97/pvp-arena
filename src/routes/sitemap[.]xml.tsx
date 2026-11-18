import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://pvpspinarena.com";

// Public, indexable static pages. Auth, account pages, prestige and
// per-round game pages are intentionally excluded (they carry noindex).
export const STATIC_PATHS = [
  "/",
  "/coinflip",
  "/roulette",
  "/slott",
  "/poker",
  "/8-ball-pool",
  "/fps-1v1",
  "/fairness",
  "/about",
  "/how-it-works",
  "/terms",
  "/privacy",
  "/responsible-gambling",
  "/editorial",
  "/leaderboards",
  "/guides",
];

function urlEntry(loc: string, lastmod?: string | null): string {
  const lm = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `  <url><loc>${BASE_URL}${loc}</loc>${lm}</url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { allGuideMeta, publishedTopics } = await import("@/lib/guides/catalog");
        const entries: string[] = STATIC_PATHS.map((p) => urlEntry(p));
        for (const g of allGuideMeta()) entries.push(urlEntry(`/guides/${g.slug}`, g.updated));
        // A topic page changes when one of its guides does: its lastmod is the newest of theirs.
        const newest = new Map<string, string>();
        for (const g of allGuideMeta())
          if (g.updated > (newest.get(g.cluster) ?? "")) newest.set(g.cluster, g.updated);
        for (const t of publishedTopics())
          entries.push(urlEntry(`/guides/topics/${t.slug}`, newest.get(t.name)));

        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
        return new Response(body, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=300" },
        });
      },
    },
  },
});
