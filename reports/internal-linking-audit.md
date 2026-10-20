# Internal linking audit

Date: 2026-10-20. Scope is the guide library in this branch, including the rebuilt pages and the guides that were already published.

## A. Inventory

| Item | Count |
| --- | ---: |
| Guide pages in `GUIDES` | 873 |
| Existing guides (already in a topic group before this pass) | 739 |
| Newly built guides | 134 |
| Unique canonical guide routes | 873 |
| Published topic hubs | 20 |
| Guides left ungrouped after this pass | 0 |

The plan listed 150 searches. Sixteen were not built, because a live guide already owns that intent or the page would point people around self-exclusion: how to play keno, 4 card keno, bubble craps, poker table, penny slots Las Vegas, CS:GO crash, CS2 upgrader, Skinport, beginners luck, non GamStop casino, offshore casinos, offshore sportsbook, Cash App casino, Apple Pay casino, binary options, and 0DTE options. Those slugs are not routes.

Routing is TanStack Start. A guide is `src/content/guides/<slug>.ts`, registered in `src/content/guides/index.ts`, and served at `/guides/<slug>`. Topic hubs are `/guides/topics/<topic>` and publish only when a cluster has at least three guides. The sitemap is generated from `GUIDES` and the published topics. There is one canonical URL per guide: `https://pvpspinarena.com/guides/<slug>`, with no trailing slash. Article and BreadcrumbList schema use that URL.

No guide slug is registered twice. No grouped slug points at a missing file.

### Host and URL conventions

Canonicals use the apex host `https://pvpspinarena.com`. The worker route list also includes `www.pvpspinarena.com/*`. This app does not redirect www to the apex. Both hosts can render the same pages, so the www URLs in the popular-pages report are duplicates of the apex URLs, not a second article. Proposed fix, not applied here: a Cloudflare redirect from `www.pvpspinarena.com` to `https://pvpspinarena.com`, keeping the path. Canonical tags were left on the apex.

## B. Linking summary

| Item | Count |
| --- | ---: |
| Contextual body links added | 136 |
| Source articles whose body changed | 32 |
| New pages with at least one inbound body link | 134 |
| Existing guides that gained a new inbound body link | 1 (`palace-card-game`, from the 31 card game) |
| New pages that also gained sibling cards in `related` | 125 |
| Sibling `related` entries added | 241 |
| Topic groups added or extended | 7 clusters gained new groups; US casino law, poker rooms, and horse-racing "How to bet" gained the matching new slugs |

Existing body links were kept. The checker still passes all 873 guides (1,850–2,400 words, titles, descriptions, and link targets).

Before this pass, 106 of the 134 new guides had no inbound link from another article's body. They were reachable from the guides index and, once registered, from an ungrouped list on the topic hub. Every older guide already had at least one inbound body link.

## How the links are structured

Sibling discovery uses the existing `CLUSTER_GROUPS` list. A guide's "More in …" block lists the other slugs in its group, up to 16, and skips any slug already in `related`. New groups stay inside one topic and stay small enough that the block can show the whole set:

- Sweepstakes: three cashier groups, not one list of every brand.
- Foundations: two brand-cashier groups, plus earn-by-playing. State pages joined the existing US casino law group.
- CS:GO heritage: skin lobbies, case shops, trade bots, and Roblox item sites.
- Slots: cluster/ways titles, fish and cabinet names, feature titles, and three smaller cabinets.
- Skill wagers: skill cashiers and rewards apps.
- Sports betting: line words and props.
- Casino knowledge: the Strip, pictures and songs, cabinets and rooms.
- Poker rooms: Replay, Black Chip, and the PokerStars casino tab joined the existing rooms group.
- Horse racing terms joined the existing how-to-bet group.

Each new guide also got one contextual mention inside the older article that already explains the parent idea. The anchor is a description of the page, not the bare keyword. Examples: the sweepstakes overview names six cashier notes; case opening names six case shops; roulette colors names the CSGORoll format note; the national legal page names Pennsylvania, Delaware, Kentucky, and South Carolina.

Cross-cluster links were added only where the reader is already on that journey. Skin wheels are mentioned from both the PvP explanation and the roulette color page, because those are different questions about the same format. A rewards app is mentioned from the social-casino page only when the product is a sweeps-style token, not from a poker page.

## C. Donor pages

Clicks and impressions are the figures from the popular-pages report. They are not backlink counts. This repo has no backlink export. Inbound figures below are internal body links from other guides.

| Source | Target | Why | Anchor | Where | Already there | Priority | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | topic hubs | The homepage is the live Jackpot table. Header and footer already link to `/guides`. There is no article paragraph to host a guide list. | — | `HomeArena` | Nav only | Low | Not added. A guide list would change the game screen. |
| `www` homepage | same | Same page on the www host. Canonical is the apex. | — | — | Duplicate host | — | Not changed. Redirect proposed above. |
| `/guides/wallet-security-checklist` | `fake-casino-sites`, `metamask-scams`, `seed-phrase`, `is-metamask-safe` | Phishing, seed phrases, and wallet scams. No new guide is a wallet-security page. | existing anchors | Phishing and threat-model sections | Yes | High | Kept. No new link. 3 inbound body links. 389 words of room left. |
| `/guides/what-to-do-if-you-win-the-lottery` | `claim-lottery-winnings-anonymously`, `lottery-taxes`, `lump-sum-vs-annuity`, `scratch-off-odds` | Claim, tax, and payout choices. No new guide is a lottery page. | existing anchors | Steps and the worked example | Yes | High | Kept. 2 inbound body links. |
| `/guides/roulette-colors` | `/guides/csgoroll-review` | The color page already explains this site's coloured wheel. CSGORoll is a skin wheel with a different fee. | CSGORoll format note | `crypto-wheels` | No | High | Added. `crypto-roulette` was already linked. 14 inbound body links on the color page. |
| `/guides/31-card-game` | `/guides/palace-card-game` | Both are short card games. Palace was already linking to 31. The reverse link was missing. | Palace setup and powers | `money` | No | High | Added. |
| `/guides/pvp-gambling` | `csgoroll-review`, `csgoempire-review`, `csgo-big-review`, `csgoluck-review` | The pillar explains player pots. These four are skin-era lobbies that use that shape and do not publish one edge. | coloured skin wheel, bundled empire lobby, CSGOBig's mode list, CSGOLuck's game list | Summary | No | High | Added. 54 inbound body links on the pillar. |
| `/guides/palace-card-game` | `/guides/31-card-game` | Same card-game neighborhood. | Thirty-one | existing stakes section | Yes | High | Kept. |

## D. What was checked after the edit

- `bun scripts/check-guides.ts`: all 873 guides pass.
- `npx tsc --noEmit`: pass.
- `npx eslint` on `src/content/guides/index.ts` after Prettier: pass.
- Dev server: `/guides/topics/sweepstakes` renders the three new sweepstakes groups and links the new slugs. `/guides/pvp-gambling` contains the skin-wheel paragraph. `/guides/31-card-game` links Palace. `/guides/yay-casino-review` links the Zula sibling.
- No self-links were added. New targets resolve to published slugs. Canonical host and trailing-slash style were not changed.
- Full `vitest` and `vite build` were not run. This pass edits guide text and the group list only, and the guide checker plus the typecheck cover that surface. Database integration tests are unchanged.

## E. Pages left without a forced link

Homepage guide lists, wallet-security links to brand reviews, and lottery links to unrelated new pages were not added. A donor click count was not treated as a reason to point that page at an unrelated guide.
