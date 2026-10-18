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

## All 31 guides, in batches of 5
Each line shows the guide's web address, its main keyword, then its Semrush estimates: searches per month and ranking difficulty out of 100.

**Batch 1** (also builds the guide pages and the /guides hub): the main guide of each topic group.
1. /guides/what-is-a-crypto-casino: "what is a crypto casino" (90/mo, 71)
2. /guides/provably-fair-casino: "provably fair casino" (210/mo, 64)
3. /guides/pvp-gambling: "peer to peer gambling" (30/mo, 20)
4. /guides/crypto-jackpot: "crypto jackpot" (110/mo, 29)
5. /guides/usdc-casino: "usdc casino" (210/mo, 25)

**Batch 2:** quick wins
6. /guides/gambling-budget: "gambling budget" (20/mo, 0), main guide for responsible play
7. /guides/csgo-coinflip: "csgo coinflip" (1,000/mo, 35)
8. /guides/cs2-roulette: "cs2 roulette" (1,300/mo, 38)
9. /guides/hmac-sha256-provably-fair: "hmac sha256" (590/mo, 29)
10. /guides/provably-fair-calculator: "provably fair calculator" (480/mo, difficulty not returned by Semrush)

**Batch 3**
11. /guides/csgo-jackpot: "csgo jackpot" (480/mo, 55)
12. /guides/metamask-casino: "metamask casino" (390/mo, 45)
13. /guides/how-to-buy-usdc: "how to buy usdc" (260/mo, 32)
14. /guides/add-base-network-metamask: "add base to metamask" (20/mo, 0)
15. /guides/crypto-wallet-for-gambling: "best crypto wallet for gambling" (320/mo, 35)

**Batch 4**
16. /guides/server-seed-client-seed: "client seed generator" (140/mo, difficulty not returned)
17. /guides/provably-fair-roulette: "provably fair roulette" (30/mo, 0)
18. /guides/coin-flip-odds: "coin flip odds" (260/mo, 62)
19. /guides/crypto-casino-withdrawals: "instant withdrawal crypto casino" (390/mo, 60)
20. /guides/csgo-gambling-history: "csgo lotto scandal" (20/mo, 0)

**Batch 5**
21. /guides/commit-reveal-scheme: "commit reveal scheme" (20/mo, 0)
22. /guides/web3-casino: "web3 casino" (260/mo, 50) (new)
23. /guides/usdc-vs-usdt-gambling: "usdc vs usdt" (4,400/mo, 50)
24. /guides/house-edge: "house edge" (390/mo, 73)
25. /guides/are-online-casinos-rigged: "are online casinos rigged" (210/mo, 51)

**Batch 6**
26. /guides/casino-terminology: "casino terminology" (140/mo, 56)
27. /guides/roulette-colors: "roulette colors" (170/mo, 49)
28. /guides/crypto-roulette: "crypto roulette" (1,900/mo, 73)
29. /guides/rng-vs-provably-fair: "rng casino" (90/mo, 63)
30. /guides/skin-gambling-vs-crypto: "skin gambling" (320/mo, 84)

**Batch 7**
31. /guides/martingale-strategy: "martingale strategy" (4,400/mo, 78)

The hardest keywords come last: by then the other guides link to them, which helps them rank.

After each batch: word count and title/description length checks, a check that every link works, and a spot check of the pages.

## Technical notes
- Content lives in one typed file per guide under `src/content/guides/`, using structured sections rather than raw HTML. The route file is `src/routes/guides.$slug.tsx`, with a loader that returns 404 for an unknown guide. The hub is `src/routes/guides.index.tsx`.
- Validation script: `scripts/check-guides.ts` checks word count, title and description length, unique page addresses and keywords, and that links resolve. It runs after each batch.
- `head()` per guide with the canonical at `https://pvpspinarena.com/guides/<slug>`. No share image unless a real one exists.
- About 65,000 words in total, so it's split across several messages. I'll report progress after each batch.
