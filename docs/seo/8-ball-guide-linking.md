# 8-ball guide linking audit

Audited Friday, Oct 23, 2026, from the published guide objects in `src/content/guides`. Counts come from that source, not from an assumed URL list. The machine-readable map of links added in this change is `docs/seo/8-ball-link-map.json`.

## Inventory

| | Count |
| --- | ---: |
| Guides discovered and published | 1,135 |
| Older guides | 1,096 |
| New 8-ball guides | 39 |
| Published topic hubs | 20 |

The 39 new guides are the guide files added after `ffe5485` (the main commit before this pool release). Each one is in `GUIDES`, so each one is published at `/guides/<slug>`.

No guide was unpublished, deleted, or given a new slug.

## How the 39 were identified

`git diff --name-only --diff-filter=A ffe5485..HEAD -- src/content/guides` returned exactly 39 files. The two older pool pages, `8-ball-pool-for-money` and `pool-payday-review`, were already published and were not in that set.

## Hub and cluster structure

Guides are typed objects. A guide is published by being in `GUIDES`. Topic pages exist at `/guides/topics/<slug>` only when a cluster has at least three guides (`MIN_TOPIC_GUIDES`). Every published guide is in exactly one subcluster in `CLUSTER_GROUPS`. The guide page renders that subcluster as a related-guide block, plus the curated `related` slugs, plus breadcrumbs to the cluster topic.

The 39 were already assigned. This change did not add a cluster or a hub.

| Cluster | Topic | Subcluster | New guides |
| --- | --- | --- | --- |
| Skill wagers | `/guides/topics/skill-wagers` | 8-ball money matches | 17 |
| Skill wagers | `/guides/topics/skill-wagers` | 8-ball skill | 8 |
| Games of chance | `/guides/topics/games-of-chance` | Pool rules | 10 |
| Casino knowledge | `/guides/topics/casino-knowledge` | Pool events | 4 |

Skill wagers is the money and technique hub. Its pillar is `games-that-pay-real-money`. Games of chance holds the rule paraphrases, including card and dice games, and the pool rule pages sit in their own subcluster there. Casino knowledge holds the event pages. Moving the rule pages into Skill wagers would mix a WPA paraphrase with the cash cluster and would change breadcrumbs. They stayed where the inventory already put them.

Every cluster that contains guides is published. No cluster is missing its grouped guides. No slug is in two subclusters. No grouped slug is missing from `GUIDES`. No guide's `cluster` field disagrees with its subcluster.

## Links before this change

- Broken internal guide, topic, or site links: 0.
- Links to `/pool` (which redirects to `/8-ball-pool`): 0. Guide bodies already use `/8-ball-pool`.
- Duplicate keywords: 0.
- Guides in no subcluster: 0.
- Older guides with a body or `related` link to any of the 39: 0.
- Each of the 39 already linked, in the body, to `8-ball-pool-for-money`, `pool-payday-review`, and `games-that-pay-real-money`. The hub also linked to `skill-based-gambling`.
- Guides with no incoming body or `related` link from another guide: `futures-bet`, `wnba-betting`, and `8-ball-pool-discord`. All three still appear on their subcluster blocks. The first two were left alone. Discord now has editorial links.

Eight older guides contained a pool-like phrase. Three were not linked:

- `plinko-strategy` matched a ball-count phrase, not billiards.
- `daniel-negreanu` mentions hustling billiards as biography. A cash-table link would misstate that sentence.
- `skill-based-gambling` uses "pool" for the prize pot, not the cue game.

## What changed

Six older guides gained a link because the paragraph was already about 8-ball or a billiards cashier:

- `8-ball-pool-for-money` links to the hub and the rules page.
- `pool-payday-review` links to the hub and says that page is not a Pool Payday review.
- `games-that-pay-real-money`, `play-chess-for-money`, `solitaire-for-money`, and `gamersaloon-review` link to the hub beside the 8-ball sentence they already had.

Fifteen new guides gained one contextual link:

- Thirteen link to `8-ball-pool-rules` from a sentence that already states the WPA split or says the cashier is 8-ball.
- The hub and the rank page link to `8-ball-pool-discord` from sentences about chat and off-site payment.

`related` cards were extended on the hub, the rank page, the older money page, and the Pool Payday review. Those cards render the destination H1. They are in the JSON map with `"placement": "related"`.

| | Count |
| --- | ---: |
| Older guides edited | 6 |
| New guides edited | 15 |
| Old-to-new body links added | 7 |
| New-to-new body links added | 15 |
| New-to-old body links added | 0 (already present on all 39) |
| Related-module links added | 6 |
| Hub or topic templates changed | 0 |
| Broken links fixed | 0 found |

The other new guides already point at the hub, the two older pool pages, and their subcluster. Equipment, event, and app-review pages were not given a rules link. Their subject is not the WPA split.

## Cannibalization

`8-ball-pool-for-money` and the new money pages share a cash-match intent. The older page was left in place on purpose. The hub is the map, the rules page is the WPA comparison, and the older page remains the long fee-and-cheating article. They link to each other. They were not merged and their URLs were not changed.

## Validation

`bun scripts/check-guides.ts`: all 1,135 guides pass. That check covers title and description length, unique keywords, unknown guide and topic links, at least three in-body guide links, a topic link, a site link, and the repeated-paragraph quality rule.

220 guides still have no sources. That was already true. No citation was invented.

## Left for editorial review

- `futures-bet` and `wnba-betting` have no incoming body or `related` link. Their sports subclusters still list them. A link was not added because no neighbouring paragraph was already about those markets.
- `daniel-negreanu` mentions billiards only as biography.
- A new "8-ball" cluster was not created. The three existing hubs already cover money, rules, and events, and a fourth hub would be thin.
