# Duplicate content across the 39 new 8-ball guides

Compared 23 October 2026 (BRT) from the guide objects, before and after the edit. Navigation, the footer, and the shared responsible-gambling sentence are not treated as article duplication. The payment table was.

## How the overlap was measured

Guide bodies were split into words. A 10-word sequence was counted once per page, then across pages. Exact 80-character sentence copies were rare before the edit, which is why a sentence-level diff understated the problem. The shared module had been paraphrased per page. The section ids were not paraphrased: `who-pays`, `two-pots`, `where`, and `checklist` were on every page.

Jaccard similarity on 8-word shingles peaked near 0.14 (`pool-betting` versus `fargo-rate`) and was the wrong tool. Two pages can share a whole table and still look dissimilar if the rest of the words change.

## What was duplicated before the edit

| Shared block | Pages | What it said | Why it was one article |
| --- | ---: | --- | --- |
| `who-pays` | 39 | Miniclip versus Pool Payday or Skillz versus this 8-ball table: fee, payout, replay, minimum stake | The grid was the same, including blank competitor cells. Rule pages introduced it with a different sentence and then pasted it. |
| `two-pots` | 39 | Stake, pot, 5% fee, 95% credit, 52.63% break-even, 24-hour refund | Seven variants. The second stake was $1, $2, $5, $10, $25, or a repeat of $25. The lesson was identical. |
| `where` | 39 | "The cash page that stays as it was written," the Pool Payday review, games that pay real money, then the same 18+ closer | Same four commercial destinations on bank pool and on the money hub. |
| `more` | 37 | Restatement of the unique section plus another search-volume paragraph | Length without a new step. |
| `first-mover` | hub only | NFT, web3, USDT, Solana, Ethereum, and other zero-volume labels | The page said the phrases were placed so the URL would exist before the searches did. |

Representative pair, before the edit:

- `/guides/8-ball-pool-hub` section "Three products people call the same game."
- `/guides/bank-pool` section "The paying rows are 8-ball, not a bank race."

Bank pool's unique material is the called bank, the race to five or eight, spotted extras, and the kitchen scratch. The payment grid did not add a bank-pool fact. The same pair holds for Mosconi, 9-ball, killer, the cue page, and the aim page.

## Clusters

### Cashier cluster

Pages: the 17 money-match guides, plus the cashier sections that had been bolted onto skill, event, and rules pages.

Shared intent that did not deserve 39 URLs: who pays, and what does 5% cost?

Distinct intents that do deserve their own URL:

| Page | Intent that is not the grid |
| --- | --- |
| `/guides/8-ball-pool-hub` | Which of three lookalike clients is a money match. Keeps the grid and one worked pot. |
| `/guides/pool-betting` | Bar stake, app prize, and sportsbook ticket are different products. |
| `/guides/8-ball-pool-real-money` | When the US-dollar balance moves, and which payment-app names are not rails. |
| `/guides/crypto-8-ball-pool` | Crypto funds the balance. It does not create a token table. |
| `/guides/pool-games-for-money` | Entry-fee app versus a posted pot. No invented bracket. |
| `/guides/pool-cash-app-review` | Pool Cash is not graded without a receipt. |
| `/guides/8-ball-strike-review` | Strike's fee is unknown and stays blank. |
| `/guides/8-ball-pool-free-coins` | Coins are not a dollar balance. |
| `/guides/8-ball-pool-unblocked` | Not a school unblocker and not an APK. |
| `/guides/8-ball-pool-discord` | No official chat table. A seed phrase is never a stake. |
| `/guides/is-8-ball-pool-rigged` | The replay is the check. No cheat steps. |
| `/guides/8-ball-pool-1v1` | Two accounts, one opponent. |
| `/guides/8-ball-pool-casino` | The payer is the other player, not a house bankroll. |
| `/guides/8-ball-pool-rank` | A free-game rank does not set the stake. |
| `/guides/best-pool-games` | Three kinds of cashier, not a top-ten list. |
| `/guides/pool-hustling` | A hidden bet is not a posted pot. |
| `/guides/skill-games-for-money-pool` | A skill label does not remove the fee or settle the law. |

Recommended action for the whole cluster: **Keep separate.** Primary URL for the comparison table and the worked pot: `/guides/8-ball-pool-hub`. Do not redirect the other sixteen there. They would arrive on a page that does not answer coins, Discord, or an unknown app fee.

### Rules cluster

Pages: `8-ball-pool-rules`, `pool-scratch-rules`, `9-ball-rules`, `10-ball-pool`, `straight-pool`, `cutthroat-pool`, `one-pocket-pool`, `bank-pool`, `killer-pool`, `pool-vs-snooker`.

Shared only the cashier frame and, for several, the sentence that this site does not stake that game. The rules themselves do not overlap enough to merge.

| Pair a reader might combine | Why they stay separate |
| --- | --- |
| 9-ball and 10-ball | Order and a push, versus a called 10. |
| Cutthroat and killer | Five balls for three players, versus lives. |
| One-pocket and bank | A race in one pocket, versus a called bank in a race to five or eight. |
| Scratch and 8-ball rules | The cue-ball penalty across rooms, versus the full 8-ball card. |
| Snooker and any pool page | Different equipment, reds, and pockets. |

Recommended action: **Keep separate.** Primary rules URL for this table's 8-ball card: `/guides/8-ball-pool-rules`. The other nine are not replacements for it.

`cutthroat-pool` and `killer-pool` are the weakest pair. Both say house rules vary and this site does not stake them. They still describe different scoring. Merging them would bury one game under the other's name. Improve in place, which is what this edit did, rather than redirect.

### Skill cluster

Pages: `how-to-win-8-ball-pool`, `8-ball-pool-break`, `8-ball-pool-aim`, `pool-shots`, `pool-terminology`, `fargo-rate`, `best-pool-cue`, `pool-table-size`.

The break, the ghost ball, the shot names, and the cloth size are different questions. FargoRate is a rating site's number, not a cue-buying guide.

Recommended action: **Keep separate.** Do not fold them into "how to win."

### Events cluster

Pages: `pool-tournaments`, `us-open-pool`, `mosconi-cup`, `apa-pool-league`.

Shared refusal: this site has not published a bracket, a purse, or a copied date. The positive facts are different (no field, an open 9-ball event, one APA Cup note, the Equalizer and the function gambling ban).

Recommended action: **Keep separate.** A single "pool events" URL would either invent the missing purse or become four short chapters with one title. The tournaments page already points at the other three.

## After the edit

10-word sequences on all 39 pages: only the closing limit notice (the 8-ball table, the fairness page, adults 18 and over, responsible gambling).

10-word sequences on 8 to 38 pages, and what they are:

| Count | Sequence family | Judgment |
| ---: | --- | --- |
| 25 | "the group is the skill wagers guides" plus the hub link | Topic navigation inside one cluster. Short. Do not grow it. |
| 21 | "8 on the break wins unless the cue ball scratches" | The actual rule, on pages about this table. |
| 13 | "playing surface is 2.54 m by 1.27 m" | The actual cloth, where size or speed matters. |
| 10 | "the group is the games of chance guides" | Same navigation note for the rules cluster. |

The Miniclip table, the 52.63% break-even paragraph, and "the cash page that stays as it was written" do not appear on 10 or more pages. The table remains on the hub only.

## Merge recommendations not executed

No permanent redirect. No `noindex`. No slug change.

If a later review still wants fewer URLs, the only pair worth a second look is cutthroat and killer, and even that pair should stay if both scoring systems remain explained. Every other proposed combination loses a question the surviving URL does not answer.

Internal links that pointed at the deleted sections were in-page anchors only in the sense of section ids. Nothing in the catalogue linked to `#who-pays` as a public URL that now 404s. `related` cards on rules, skill, and event pages no longer force `8-ball-pool-for-money`, `pool-payday-review`, and `games-that-pay-real-money` onto every guide. Money pages still list those three, because that is the neighbourhood. The hub still links them in the body.
