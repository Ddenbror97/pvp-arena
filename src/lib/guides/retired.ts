import removed20261115 from "../../../docs/seo/review-removals-2026-11-15.json";
import removed20261118 from "../../../docs/seo/review-removals-2026-11-18.json";

/**
 * Guide URLs that no longer exist, answered before the app renders.
 *
 * MOVED: a retired slug whose topic lives on under another guide (301). Only a page that
 * answers the same question goes here; an unrelated target reads to Google as a soft 404.
 * GONE: deleted on purpose with no equivalent (410, so it leaves the index sooner than a 404).
 */
export const MOVED_GUIDES: Record<string, string> = {
  "best-crypto-wallet-for-gambling-2026": "best-crypto-wallet-for-gambling",
  // Old slugs Search Console still showed impressions for on 2026-11-18.
  "beginners-luck": "gambling-superstitions",
  "blinds-and-antes-poker": "texas-holdem-rules",
  "bubble-craps": "online-craps",
  "cash-app-casino": "cash-app-bitcoin",
  "csgo-crash": "crash-gambling",
  "four-card-keno": "video-keno",
  "is-stake-legal-in-us": "crypto-casino-usa",
  "offshore-sportsbook": "sports-betting-legal-states",
  "penny-slots-las-vegas": "penny-slots-online",
  "skinport-review": "csfloat-vs-skinport",
  "crypto-wallet-for-gambling": "best-crypto-wallet-for-gambling",
  ...removed20261118.redirects,
};

export const GONE_GUIDES: ReadonlySet<string> = new Set(
  [...removed20261115.removed, ...removed20261118.removed].filter((s) => !(s in MOVED_GUIDES)),
);

/** The response for a retired guide path, or null when the path is not one. */
export function retiredGuideResponse(url: URL): Response | null {
  const m = /^\/guides\/([a-z0-9-]+)\/?$/.exec(url.pathname);
  if (!m) return null;
  const slug = m[1]!;
  const next = MOVED_GUIDES[slug];
  if (next) {
    const to = new URL(url);
    to.pathname = `/guides/${next}`;
    return new Response(null, { status: 301, headers: { location: to.toString() } });
  }
  if (!GONE_GUIDES.has(slug)) return null;
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Guide removed | PVPspinArena</title></head><body><h1>This guide was removed</h1><p>It is no longer published. <a href="/guides">Browse the guides</a>.</p></body></html>`,
    {
      status: 410,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
    },
  );
}
