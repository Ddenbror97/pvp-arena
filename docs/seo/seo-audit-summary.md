# 8-ball guide quality audit

Audited 23 October 2026, 16:02 BRT (America/Sao_Paulo), from the published guide objects in `src/content/guides`. Scores below are editorial priorities. They are not Google metrics, and they are not a prediction of rankings or of a spam-update outcome.

## Executive summary

Thirty-nine new 8-ball guides were inspected as rendered content objects, not as a list of unique titles. Each one is a typed guide in `src/content/guides`, published by membership in `GUIDES`, and served at `/guides/<slug>` by `src/routes/guides.$slug.tsx`.

The pages were not byte-identical. They were a scaled template. Every page carried the same Miniclip versus skill-cash versus PVPspinArena payment table (`who-pays`), the same 5% pot arithmetic (`two-pots`, seven wording variants of one example), a commercial closer (`where`) that linked the same three money URLs with the same anchor sentences, a checklist, and usually a closing pad (`more`). Section titles were unique. The bodies were not. About half of a typical article was that frame.

The rule, event, and technique pages underneath the frame were often careful: WPA paraphrases with stated limits, refusals to invent purses, rakes, make percentages, or cheat steps. The quality problem was the frame, plus search-volume commentary used as a reason for the page to exist, plus a stale physics id.

That frame was removed from the 38 pages whose question is not the cashier comparison. The comparison table and one worked pot stay on `/guides/8-ball-pool-hub`. No URL was deleted, redirected, or given `noindex`.

## Pages audited

39. They are the guide files added after `ffe5485`. The older pages `8-ball-pool-for-money` and `pool-payday-review` were benchmarks and were not rewritten here.

| Cluster | Topic | Count | Slugs |
| --- | --- | ---: | --- |
| Skill wagers | 8-ball money matches | 17 | hub, pool betting, real money, crypto, games for money, cash app, rigged, hustling, skill games, free coins, unblocked, 1v1, casino, best games, strike, discord, rank |
| Skill wagers | 8-ball skill | 8 | how to win, break, aim, shots, terminology, FargoRate, cue, table size |
| Casino knowledge | Pool events | 4 | tournaments, US Open, Mosconi Cup, APA |
| Games of chance | Pool rules | 10 | 8-ball rules, scratch, 9-ball, 10-ball, straight, cutthroat, one-pocket, bank, killer, snooker |

All 39 have sources. Missing sources elsewhere in the catalogue (220 older guides) were left alone. No citation was invented to fill a gap.

## Critical findings

No open P0. Nothing in the 39 was a cheat procedure, a fake testimonial, a hidden block, or a broken canonical.

The pre-edit P1 was scaled content. Evidence:

- Section ids `who-pays`, `where`, `two-pots`, and `checklist` were on all 39 pages. `more` was on 37. `first-mover` was on the hub.
- The Miniclip payment table was the same grid, including the sentence "Competitor cells stay blank on purpose."
- `two-pots` had seven wording variants of one calculation: pot, 5% fee, 95% credit, break-even win rate 52.63%, 24-hour refund. The second stake amount changed. The arithmetic did not.
- The hub said "Zero-volume phrases are placed here so the page exists before the searches do," and a section stuffed NFT, web3, USDT, Solana, and Ethereum labels into one page.
- Twenty-four pages said new matches use `pool-phys-v2`. Current new racks use the physics id in `PHYSICS_VERSION` (`pool-phys-v7` in `src/lib/pool/physics.ts`). Older racks stay on the id they started with. Pinning v2 was false for a new match.

Post-edit, the only 10-word sequences shared by all 39 pages are the limit notice at the end of each guide: the match link, the fairness link, 18 and over, and responsible gambling. That notice is short and is the same kind of line as a footer. It is not a second article.

A true product sentence, "the 8 on the break wins unless the cue ball scratches," still appears on about 21 pages. Those pages are about a money rack or the rules card, and the sentence is the rule. It was not rewritten into 21 synonyms.

## Main quality patterns

- Unique section titles hid a shared cashier module. Titles were a weak quality signal.
- Search-volume and keyword-difficulty sentences opened many answers. They told the reader why a page had been commissioned. They were removed from answers, facts, and the sentences that were only those counts. Refusals that were attached to a number (do not invent a purse, do not name an APK, do not call an app a scam) stayed, without the count.
- Rule and event pages were the strongest unique material. Bank pool, 9-ball, the Mosconi note, and the APA Equalizer do not become the same article if the cashier grid is gone.
- Money pages that looked like doorways (free coins, unblocked, rank, discord, strike, cash app) already had a distinct safety or product limit. They needed the grid removed, not a merge.
- No page was marked acceptable because its title, H1, or meta description was unique.

## Duplicate and cannibalization risks

Before the edit, `/guides/8-ball-pool-hub` and the other 38 pages answered "who pays, and what does 5% cost?" in the same table. That is the cannibalization that mattered. It is reduced by leaving the table on the hub.

These pairs still share a subject and should stay separate. Their answers are not the same:

- Hub versus `8-ball-pool-real-money`: which product, versus when the dollar balance moves.
- Hub versus `pool-betting`: the table, versus bar stake versus app versus sportsbook.
- `pool-cash-app-review` versus `8-ball-strike-review` versus `pool-payday-review`: three unknown cashiers. Merging them would produce one review that still cannot price any of them.
- `8-ball-pool-free-coins`, `8-ball-pool-unblocked`, and `8-ball-pool-rank`: coins, a filter workaround, and a progression ladder.
- `cutthroat-pool` versus `killer-pool`: five balls versus lives.
- `9-ball-rules` versus `10-ball-pool`: rotation versus a called 10.
- `one-pocket-pool` versus `bank-pool`: one pocket versus a called bank.
- `pool-tournaments`, `us-open-pool`, `mosconi-cup`, `apa-pool-league`: a missing bracket, one open event, one sourced Cup note, one league handicap.

No merge, redirect, or `noindex` was executed. A redirect would need a genuine replacement URL and a review of internal links. The recommendation is to keep the 39 URLs.

`8-ball-pool-for-money` remains the longer fee article. It was not merged with the hub.

## Technical issues

Inspected in source, not by fetching production HTML for all 39 routes.

- Found guides: `robots` `index, follow`. Unknown slugs: `noindex`. Canonical is `${OG_SITE_URL}/guides/${slug}`.
- One H1, the guide `h1` field. Sections render under it.
- Article and FAQ structured data are built from the same fields the page shows. No extra schema was added.
- Sitemap entries come from `allGuideMeta()` in `src/routes/sitemap[.]xml.tsx`. Slugs did not change, so inclusion did not change.
- No guide in this set uses a widget. The shared OG image is the site cover. That is existing catalogue behavior, not a new defect.
- Internal links required by `scripts/check-guides.ts` still resolve: at least three guide links in section bodies, one topic link, one site link, and known `related` slugs.
- Keyword stuffing in the sense of density above a few percent was not the issue before, and the zero-volume keyword list on the hub was removed.
- `pool-phys-v2` no longer appears in these 39 files. Replay copy now says the physics id stored with that rack, which matches the fairness page and does not go stale on the next physics bump.

## Changes implemented

See `docs/seo/seo-remediation-log.md`. In short: the shared cashier sections were deleted except on the hub; the hub's zero-volume section and FAQ were replaced; volume-only facts and FAQs were removed; one hustle leave-table sentence was aligned with the rules page; physics ids were unpinned.

## Remaining risks and human review

- The limit notice and the "group is the … guides" sentence are still shared. They are navigation and a legal-age line. If they grow back into a paragraph, they become the old problem again.
- Money and skill pages still state the break-8 rule and the 5% fee when the answer depends on them. That is acceptable. Pasting the hub's table back onto those pages is not.
- FargoRate ratios (about 100 points as 2:1, 200 as 4:1, 300 as 8:1, daily optimization at 6am GMT) are attributed to FargoRate and were not re-read on FargoRate's site in this pass.
- Mosconi figures are only as good as the APA note they cite. If that note changes, the paraphrase has to change.
- WPA paraphrases cite the rules PDF effective 21 October 2026. They were not re-diffed against the PDF line by line in this pass.
- The 24-hour unmatched-table refund and the 10% leave fee are existing product copy. This pass did not re-run the database tests for them.
- Production HTML for all 39 URLs was not fetched in a browser. The user has treated browser runs as stale. Validation was `bun scripts/check-guides.ts` (all 1,135 guides pass), `tsc --noEmit` (no errors in these files; existing errors are in coinflip files this change does not touch), eslint on the 39 files, and `bun run build`.

This audit does not claim the guides will pass a Google spam update, avoid a penalty, or rank. The goal was to remove the identifiable scaled-content pattern and leave each URL with a question it can actually answer.
