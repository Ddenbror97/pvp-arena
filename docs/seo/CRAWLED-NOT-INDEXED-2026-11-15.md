# Crawled but not indexed: 65-URL remediation

The owner supplied 65 Search Console examples on 15 November 2026. The recorded last crawls range from September to November and predate this work. The exact live HTTP observations are recorded in `crawled-urls-2026-11-15.json`.

## What the investigation establishes

- 51 URLs return 200, have one matching self-canonical, permit indexing and render server-side content. There is no blanket technical indexability failure in this sample.
- 13 review URLs were intentionally removed in PR #226. Another legacy URL, `lightning-link-slot`, is also absent from the current catalogue. All 14 return 404; this release does not recreate the deleted review/stub material or redirect it to unrelated articles.
- The current hub and sitemap expose the published pages. The comparison `novig-vs-prophetx` had no contextual incoming article link; it now has one from `novig-review`.
- The connected GSC planner supplies only 10–12 November performance and no URL Inspection endpoint. Both BR examples returned no performance rows for that limited window. That does not independently establish current indexing, a penalty or the reason Google excluded them.

Google's [Page indexing report documentation](https://support.google.com/webmasters/answer/7440203?hl=en) distinguishes technical eligibility from Google's indexing decision. Current 200 responses do not prove what Google received during an older crawl. These fixes must not be described as a confirmed spam-penalty diagnosis or a guaranteed indexing recovery.

## Changes made

Fifteen articles receive substantive corrections, not a catalogue-wide freshness-date change:

- `browser-battle-royale` derives its dive key from the same `BR_ACTIONS` definition as the game. The obsolete Ctrl instruction is gone. Its money-mode distinction remains accurate: BR cash play is coming soon, not live.
- `dancing-drums-slot`, `mental-2-slot` and `wisdom-of-athena-slot` replace evasive padding and unrelated PvP fee examples with supplier-specific facts, edition distinctions, original cost calculations and honest configuration limits.
- `slot-machine-for-sale` now provides an equipment inspection and delivered-cost checklist, with a clearly scoped Washington regulator example rather than an invented nationwide ownership rule.
- `novig-vs-prophetx` distinguishes the operators' public claims, separate fee schedules, executable prices and liquidity. It no longer awards an unsupported “best exchange” verdict or treats an old Sporttrade closure description as its complete current status.
- `how-many-decks-blackjack` corrects the two-to-six-deck comparison to 0.17 percentage points under the cited reference rules. It distinguishes independent draws from a finite shoe reshuffled after every hand.
- `cs2-weekly-drops`, `cheapest-covert-skins-cs2` and `cs2-knife-prices` correct misleading reward, supply, wear, fee and static-price claims.
- The two chat-bot explainers no longer claim an unmeasured majority are unlicensed or that a public website alone establishes a safer operator.
- The two trade-up articles explain actual input eligibility and the calculator's limits. `novig-review` links contextually to the refreshed comparison.

Other supplied pages with useful content remain published. A page is not removed merely because the report lists it, because it is short or because Google has not indexed it.

## Calculator corrections

The original calculator contained wrong weapon tiers, incomplete next-tier pools and invented generic knife/glove float predictions. Its source data is replaced with complete weapon lists for its five sample collections, extracted from Valve-authored item sets, loot rarity lists and paint ranges mirrored by SteamDatabase. The pinned source revision is linked in the code and article; this is not an official Valve-maintained live API.

Examples of corrected classifications: Revolution's Covert weapons are AK-47 | Head Shot and M4A4 | Temukau; M4A1-S | Emphorosaur-S is Restricted; P2000 | Wicked Sick is Classified. Original Mirage has no Classified weapon tier.

Unsupported recipes now produce an explanation with no output probabilities or EV. Wrong counts, missing tiers, unsupported StatTrak sources and invalid float ranges are rejected. Gold-item pools are explicitly not modelled. EV is withheld until every cost and net output price is entered. Default ranges refresh when the selected rarity/collection changes. Row inputs have accessible labels.

The normalized float and collection-weighted calculations are explicitly described as the tool's teaching model, not a guarantee of all current CS2 engine behaviour.

## Validation and deployment scope

All 1,054 publishing checks and 14 focused unit/quality/retirement tests pass. Local HTTP checks preserve the 51 × 200 / 14 × 404 split. Browser checks exercise the calculator's incomplete-price state, EV, invalid tiers, Covert limit, StatTrak eligibility and invalid ranges, verify the actual Q control and contextual link, and check mobile overflow and JavaScript errors.

Run changed-file lint, typecheck and the production build before release. Site only: no database migration, match Worker, game rules, secret or anti-cheat change.
