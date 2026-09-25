# Build 31 SEO guides for PVPspinArena

## What changes from the roadmap
- **Your Fairness page keeps the keyword "provably fair".** A separate guide targeting the same keyword would compete with it in Google. So guide #1 now targets **"provably fair casino"** (Semrush: 210/mo, difficulty 64) and links to Fairness as the main page.
- **New guide #31: "web3 casino"** (Semrush: 260/mo, difficulty 50). It also covers "decentralized casino" (170/mo, difficulty 48). Neither overlaps an existing guide.
- The other 29 guides stay as in the roadmap: same keywords, page addresses, titles and descriptions.

## Every guide
- **1,850–2,500 words**, counted by a script before publishing. A guide outside that range is not done.
- **Semrush keywords only:** one main keyword, plus 3–6 related and question keywords from the roadmap data. Keywords are placed naturally: in the title, the main heading, the first 100 words, one or two sub-headings and the conclusion. No keyword stuffing.
- **SEO structure:**
  - One H1, then a short direct answer at the top that AI search tools can quote.
  - A key-facts box, then logical H2/H3 sections.
  - A worked example from how PVPspinArena really works.
  - 4–6 FAQs, a responsible-gambling note, sources, the author and the date it was updated.
- **Page tags:** its own title (40–59 characters), description (120–159), link to itself as the main address (canonical), share tags, and Article + BreadcrumbList data. HowTo data on the step-by-step guides.
- **Links:** 3–6 links to other guides, 1–3 links to game or info pages, and a link back to its topic's main guide.
- **Facts only:** no invented statistics, licences, "instant" payouts, "risk-free" or "how to win" promises. 18+ note on every page. Outside facts (for example the CS:GO history) cite sources checked by web search.

## New pages on the site
- **/guides:** a hub listing all 31 guides, grouped into the 6 topic groups.
- **/guides/[guide-name]:** one page per guide, same dark look as the rest of the site, with a table of contents, reading time and breadcrumbs.
- **Links into the guides:**
  - a "Guides" link in the footer
  - links from Fairness, How it works and About
  - all guides added to the dynamic sitemap

## Order of work (5 batches, so each can be checked)
1. Guide pages, the hub, and the first 6 guides (the main guide of each topic group).
2. The 7 quick wins.
3.–5. The remaining 18 guides, 6 per batch.

After each batch: word count and title/description length checks, a check that every link works, and a spot check of the pages.

## Technical notes
- Content lives in one typed file per guide under `src/content/guides/`, using structured sections rather than raw HTML. The route file is `src/routes/guides.$slug.tsx`, with a loader that returns 404 for an unknown guide. The hub is `src/routes/guides.index.tsx`.
- Validation script: `scripts/check-guides.ts` checks word count, title and description length, unique page addresses and keywords, and that links resolve. It runs after each batch.
- `head()` per guide with the canonical at `https://pvpspinarena.com/guides/<slug>`. No share image unless a real one exists.
- About 65,000 words in total, so it's split across several messages. I'll report progress after each batch.
