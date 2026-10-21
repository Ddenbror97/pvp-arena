# SEO quality remediation

Re-ran `bun scripts/seo-spam-audit.ts` on all 1,096 published guides after rewriting the 25 pages that the previous audit marked for policy review. URLs were kept. No guide was removed or noindexed. The 224 guides that still have no sources were left unsourced on purpose.

## Audit totals

| | Before | After |
| --- | ---: | ---: |
| Published guides | 1,096 | 1,096 |
| Keep | 879 | 906 |
| Improve | 192 | 190 |
| Policy investigation | 25 | 0 |
| Human-review policy flag | 25 | 0 |
| Duplicate clusters | 3 | 0 |
| Guides with substantive Jaccard above 0.38 | (sport shell max 0.499) | 0 |
| Guides with entity Jaccard above 0.72 | 0 | 0 |
| Guides with no sources | 224 | 224 |
| Mean quality score | 93 | 93 |

The mean score did not move. The change is that a critical quality failure now caps that score at 49 and forces policy review, and none of the 1,096 guides currently trip that cap. Six of the rewritten pages are still labeled Improve because the scorer prefers longer pages and tables. They were not padded to chase Keep.

## What changed outside the 25 URLs

- `scripts/check-guides.ts` and `scripts/check-new-guides.ts` no longer require 1,850–2,400 words. They fail on the skeleton sentences, on the fee closer appearing twice, and on a repeated paragraph of 200 or more characters.
- Missing sources print a warning. They are not filled with invented citations.
- Nine guides that pasted the same fee or boilerplate paragraph more than once had the extra copies removed: `bet-with-friends-online`, `coin-flip-for-money`, `duel-arena-gambling`, `head-to-head-betting`, `online-coin-flip-game`, `osrs-gambling`, `peer-to-peer-gambling`, `rock-paper-scissors-for-money`, `skill-based-gambling`.
- `roobet-alternatives` had one repeated diligence paragraph. The second copy was removed.
- A dead UK Gambling Commission bonus URL (HTTP 404) on the bonus pages was replaced with LCCP social responsibility code 5.1.1, which caps UK licensee wagering at 10 times the bonus funds.

The other Keep and Improve guides were not rewritten.

## The 25 URLs

Every row was Policy investigation before, with the keyword-insertion sentence or the shared sport shell. After, policy risk is `none`, the canonical is the same URL, and the sitemap includes the slug because every published guide is emitted by `src/routes/sitemap[.]xml.tsx`. The guide route sets `https://pvpspinarena.com/guides/{slug}` as the canonical and `index, follow` as the robots directive.

| URL | Words after | Sources | Nearest Jaccard | Audit action |
| --- | ---: | ---: | ---: | --- |
| https://pvpspinarena.com/guides/deposit-match-bonus | 924 | 2 | 0.009 | Keep |
| https://pvpspinarena.com/guides/casino-referral-bonus | 710 | 2 | 0.006 | Keep |
| https://pvpspinarena.com/guides/reload-bonus-casino | 760 | 2 | 0.009 | Keep |
| https://pvpspinarena.com/guides/casino-comps | 878 | 2 | 0.003 | Keep |
| https://pvpspinarena.com/guides/crypto-casino-affiliate-program | 806 | 3 | 0.006 | Keep |
| https://pvpspinarena.com/guides/malta-gaming-authority-license | 912 | 4 | 0.006 | Improve |
| https://pvpspinarena.com/guides/gambling-tax-uk | 949 | 4 | 0.003 | Keep |
| https://pvpspinarena.com/guides/gasless-transactions | 848 | 2 | 0.015 | Keep |
| https://pvpspinarena.com/guides/account-abstraction-wallet | 839 | 2 | 0.015 | Keep |
| https://pvpspinarena.com/guides/ton-wallet | 777 | 2 | 0.015 | Keep |
| https://pvpspinarena.com/guides/pai-gow-poker | 972 | 1 | 0.001 | Keep |
| https://pvpspinarena.com/guides/casino-war-game | 916 | 1 | 0.002 | Keep |
| https://pvpspinarena.com/guides/sic-bo-online | 890 | 1 | 0.002 | Improve |
| https://pvpspinarena.com/guides/penny-slots-online | 774 | 1 | 0.010 | Keep |
| https://pvpspinarena.com/guides/high-limit-slots | 716 | 1 | 0.010 | Improve |
| https://pvpspinarena.com/guides/blackjack-tournaments | 812 | 1 | 0.004 | Keep |
| https://pvpspinarena.com/guides/heads-up-poker-strategy | 914 | 2 | 0.005 | Keep |
| https://pvpspinarena.com/guides/polymarket-vs-kalshi | 902 | 4 | 0.002 | Keep |
| https://pvpspinarena.com/guides/nfl-betting | 764 | 2 | 0.016 | Improve |
| https://pvpspinarena.com/guides/nba-betting | 673 | 1 | 0.010 | Keep |
| https://pvpspinarena.com/guides/ufc-betting | 772 | 1 | 0.014 | Improve |
| https://pvpspinarena.com/guides/soccer-betting | 717 | 2 | 0.016 | Keep |
| https://pvpspinarena.com/guides/tennis-betting | 753 | 1 | 0.010 | Keep |
| https://pvpspinarena.com/guides/boxing-betting | 838 | 2 | 0.014 | Improve |
| https://pvpspinarena.com/guides/f1-betting | 856 | 1 | 0.010 | Keep |

Prior nearest Jaccard on these URLs was about 0.37–0.50, except heads-up poker, which the skeleton sentence caught even though its Jaccard was 0.003.

## Checks

- `bun scripts/check-guides.ts`: all 1,096 pass. Warning only: 224 guides have no sources.
- `npx vitest run tests/seo-public.test.ts tests/guide-quality.test.ts`: 12 tests passed.
- `npx vite build`: succeeded. The SSR guide bundle contains the new NFL, sic bo, and heads-up answers and does not contain the skeleton sentence.
- `npx tsc --noEmit`: fails in `vite.config.ts` on a pre-existing `file` possibly undefined. That file was not part of this change.
- Live worker HTML was not rendered here. Node cannot load the Cloudflare image wasm the built worker imports, and `vite preview` expects a different server entry. Canonicals, sitemap inclusion, and indexability above come from the route source, the audit inventory (every rewritten row is `indexable=yes`, `in_sitemap=yes`, canonical equals the public URL), and the passing SEO tests.
