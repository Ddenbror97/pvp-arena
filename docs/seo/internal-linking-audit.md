# Internal linking audit, 21 October 2026

Corpus checked against the published guide index, not filenames. The supplied click and impression figures are a snapshot. They are not live Search Console exports, and they are not a measure of backlink authority.

## Inventory

| Item                                            | Count                                          |
| ----------------------------------------------- | ---------------------------------------------- |
| Published guides                                | 1,096                                          |
| Topic clusters                                  | 20, all published (each has at least 3 guides) |
| Guides outside a sibling group                  | 0                                              |
| Guides with no inbound guide link               | 0                                              |
| Guides that already contain a table             | 908                                            |
| Guides that already contain a list or checklist | 1,011                                          |

Canonical tags use `https://pvpspinarena.com`. HTTP on both hosts already 308s to HTTPS. Before this change, `https://www.pvpspinarena.com` returned 200, so the www host was a second copy of the same pages. GET and HEAD on www now 308 to the apex host. POST is left alone so a callback body is not dropped.

Sibling groups already render in the "More in …" block. This pass did not add links just because two guides share a group.

## Donor pages

| Page                                        | Snapshot                         | What was already true                                                                                                                                             | Change                                                                                                                                                                                                    |
| ------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` and `www`                               | 9 clicks / 38 and 13 impressions | Canonical is the apex. Footer already linked the guide index.                                                                                                     | www redirects to the apex. Footer adds five topic hubs: provably fair, wallets, CS2 and PvP, odds, lottery.                                                                                               |
| `/guides/wallet-security-checklist`         | 3 / 3                            | Checklist and sibling links existed. Only three guides linked in. No table.                                                                                       | Comparison of play, savings, and hardware wallets. Link from the wallet-creation guide, which is the setup step this checklist assumes.                                                                   |
| `/guides/what-to-do-if-you-win-the-lottery` | 2 / 62                           | Steps, papers checklist, worked example, and the lottery-scams guide were already in the body.                                                                    | Left as written. No casino links added.                                                                                                                                                                   |
| `/guides/31-card-game`                      | 1 / 94                           | Odds table and the Palace sibling were already linked.                                                                                                            | Left as written.                                                                                                                                                                                          |
| `/guides/roulette-colors`                   | 1 / 93                           | Colour myths already say past colours do not predict the next spin.                                                                                               | Comparison table of European, American, and the 33-slot wheel. Link to the "how to win at roulette" limit.                                                                                                |
| `/guides/pvp-gambling`                      | 1 / 31                           | Fee example existed. CS2 roulette was not linked from the house-wheel paragraph.                                                                                  | Link to CS2 roulette and to betting with friends. Table of the five published game prices.                                                                                                                |
| `/guides/palace-card-game`                  | 1 / 19                           | Already links the closer shedding games, including the slap pile and 31.                                                                                          | Slapjack, Go Fish, War, and Sequence were not forced in. They are not the same play.                                                                                                                      |
| `/guides/decentralized-casino-explained`    | 1 / 1                            | Custody was prose. One inbound link.                                                                                                                              | Custody table, plus links to smart-contract casinos, SHA-256, and the wallet checklist.                                                                                                                   |
| `/guides/cs2-roulette`                      | 0 / 608                          | Title and description already state 2x and 14x. The verification steps said `r mod 15` while the live wheel has 33 slots. The odds stopped before the 5% win fee. | Modulus corrected to 33. After-fee returns added from the published wheel: about 92.12% on Purple or Silver and about 40.30% on Green. The "future" roulette guide link now points at the published page. |

The 608 impressions and zero clicks are not explained by this audit. The page's title already matches a colour-wheel query. The stale 15-slot modulus was a factual error on that page, not a proven cause of the click rate.

## Real game figures used

Taken from the published game facts and the roulette verifier, which uses the wheel length rather than a fixed 15:

- Jackpot and Coinflip: 5% of the pot.
- Roulette: 33 slots, 16 Purple, 16 Silver, 1 Green. Purple and Silver pay 2x, Green pays 14x, then 5% comes off a winning payout.
- P2P Slott: 10% of the pot when a player wins. A bomb keeps both stakes.
- Poker: 5% of a pot only when a flop is dealt.

No player session, quote, or win was invented. Live round totals stay in the existing game-data block. They are not copied into the prose.

## Left unchanged on purpose

Guides that already had a relevant table, checklist, or worked example were not given a second one. Sibling links that would only share the words casino, game, money, or strategy were not added. Word counts stay inside 1,850–2,400.
