# Remediation log: 39 new 8-ball guides

Date: 23 October 2026, 16:02 BRT (America/Sao_Paulo).

No slug, canonical, robots directive, or sitemap rule was changed. No guide was removed from `GUIDES`. No redirect was added. `noindex` was not applied to any of the 39.

## Why the edits are shaped this way

`scripts/check-guides.ts` publishes a guide only when the title is 40–59 characters, the description is 120–159, the keyword appears in the first 100 words of H1 plus answer, there are 4–6 FAQs, section bodies contain at least three distinct guide links, a topic link, and a non-guide site link, `related` slugs exist, and no 200-character paragraph repeats inside that one guide. The edits keep those constraints. They do not add a citation that was not already on the page.

## Changes

### 1. Cashier module removed from 38 guides

Affected URLs: every `/guides/<slug>` in the set of 39 except the hub.

Removed section ids, where present: `who-pays`, `two-pots`, `more`.

Reason: those sections were the Miniclip payment table, the shared 5% example, and a closing restatement. Bank pool, the Mosconi note, and the ghost-ball page do not become more useful by repeating them.

The hub keeps `who-pays` and a single `$25` versus `$25` example, including the 24-hour unmatched refund. The second worked stake on the hub was the same arithmetic with a different dollar amount and was removed.

### 2. Hub keyword section removed

URL: `/guides/8-ball-pool-hub`.

Removed the `first-mover` section and the fact "Zero-volume phrases are placed here so the page exists before the searches do." Replaced the FAQ "Why are some phrases on this page with no search volume?" with "What if the other player never joins?" The answer is the existing 24-hour refund rule.

The opening no longer lists keyword-difficulty figures for the head terms, and it no longer says the hub exists in order to rank. It still separates a coin client, a skill-cash app, and a two-player cash pot, and it points at `/8-ball-pool` for the match.

### 3. Shared closer rewritten

Every `where` section was rewritten. Neighbour links that were already topical stayed. The repeated sentence "The cash page that stays as it was written" was removed from pages that are not cashier comparisons.

Money pages that still need the older fee article and the Pool Payday review keep those links, with wording that is specific to that page: `pool-betting`, `8-ball-pool-real-money`, `pool-games-for-money`, `pool-cash-app-review`, `best-pool-games`, `8-ball-strike-review`, and the hub.

Rules, skill, and event `related` arrays no longer pad every card row with `8-ball-pool-for-money`, `pool-payday-review`, and `games-that-pay-real-money`. The hub is included instead, so the cashier has one door.

A short limit notice remains on all 39: the match, the fairness page, adults 18 and over, responsible gambling. It replaced a longer identical closer ("does not pay you twice", "a state is not named").

### 4. Physics id

`pool-phys-v2` was removed from all 39 files. New-match sentences now say the current physics id is stored on the rack. Replay sentences say the physics id stored with that rack. That matches `src/routes/fairness.tsx` and `src/lib/seo/game-facts.ts`, and it stays true when `PHYSICS_VERSION` changes. The code constant was not edited.

### 5. Search-volume copy

Facts, answers, and sentences whose only job was a Semrush count, a keyword difficulty, or a cost-per-click were removed. FAQs that asked why a search count or a CPC mattered were replaced with player questions already answered on that page:

- Rules: bar cards are not a complete catalogue.
- Strike: 5% is not a guess about Strike's fee.
- Scratch: which scratch rule this table uses.
- Cash app: a popular name is not an audit.
- Play-for-money: an easy phrase is not a good bet.
- Crypto: there is no separate bitcoin table.
- Best games: an ad price is not quality.
- Killer: this site does not stake it.
- Bank: what a foul costs. The `$2.38` fact and FAQ were removed.
- 9-ball: the leftover "2,900 searches" fact was removed.

`pool-betting` had called this site "the middle shape" of bar stake, app, and sportsbook. The product is the two-player pot, which is the first of those three. The sentence was corrected. A dangling "It is not the stake" left over from a deleted CPC sentence was removed.

`pool-hustling` said the opponent keeps their stake after a leave. The rules page says that stake is refunded and there is no winner. The hustling sentence now matches the rules page.

`8-ball-pool-free-coins`, `8-ball-pool-real-money`, and `8-ball-pool-unblocked` had H2s about October counts or query size after those counts were deleted. The headings were renamed to the claim the section still makes.

### 6. What was kept

WPA paraphrases, the APA Mosconi limit, FargoRate ratios as attributed, the ghost-ball and spin explanation, the cloth size and pocket radii, the Discord seed-phrase warning, the APK refusal, and the unknown-fee reviews. Checklists that were actually about the game stayed.

## Validation

| Check | Result |
| --- | --- |
| `bun scripts/check-guides.ts` | All 1,135 guides pass. The 220 unsourced guides are pre-existing and were not given invented citations. |
| `bunx tsc --noEmit` | No errors in `src/content/guides`. Existing errors are in `src/components/coinflip/OpenGames.tsx` and `src/routes/coinflip.tsx`, files this change does not touch. |
| `bunx eslint` on the 39 guide files | Clean after Prettier layout on short `related` arrays. |
| `bun run build` | Production build completed. |
| 10-word overlap, after | The only sequence on all 39 pages is the limit notice. The payment table is not among sequences shared by 8 or more pages. |
| Routes | Slugs unchanged. `guides/$slug` still emits one H1, a self canonical, and `index, follow` for a found guide. Sitemap rows are generated from the same catalogue. |
| Browser | Not used. Production HTML for the 39 URLs was not fetched. |

## Not done, on purpose

- No 301 from a rules or event URL to the hub or the homepage.
- No `noindex`.
- No merge of cutthroat and killer, 9-ball and 10-ball, or the four event pages.
- No new structured data.
- FargoRate's live homepage and the WPA PDF were not re-read line by line. Those paraphrases are flagged for human review in `seo-audit-summary.md`.
