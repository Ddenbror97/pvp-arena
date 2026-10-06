import type { Guide } from "./types";

export const guide: Guide = {
  slug: "plinko-odds",
  cluster: "Games & odds",
  keyword: "plinko odds",
  secondary: ["plinko probability", "plinko rtp", "plinko payout table", "high risk plinko"],
  title: "Plinko Odds: Rows, Risk and House Edge Maths",
  description:
    "Plinko odds by row count and risk: path probabilities, typical RTP, house edge, and a worked board you can compare with the general plinko guide.",
  h1: "Plinko odds: rows, risk levels and the real percentages",
  answer:
    "Plinko odds are binomial path probabilities plus a multiplier row. After n fair pegs the chance of k steps to one side is C(n, k) / 2^n. Row count sets n and the tail thickness. Risk level reallocates multipliers; it does not have to change RTP. House edge is 1 minus the sum of (probability × payout). Typical published boards sit near 97% to 99% RTP. Play rules and myths live on the general plinko gambling guide; this page stays on the maths.",
  facts: [
    "With fair 50/50 pegs, bucket chance after n rows is C(n, k) / 2^n for k steps to one side.",
    "An 8-row board has 256 equally likely paths; a 16-row board has 65,536.",
    "House edge = 1 − Σ (bucket probability × bucket multiplier).",
    "Low, medium and high risk can share one RTP and still feel opposite because the tails differ.",
    "PVPspinArena does not offer plinko; published odds here are for Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "model",
      title: "The probability model behind plinko odds",
      body: `Treat each peg as an independent fair coin. After n rows the ball has taken n left-or-right steps. The number of paths that finish with k steps toward one edge is the binomial coefficient C(n, k). If every bounce is 50/50:

P(k) = C(n, k) / 2^n

The board is usually symmetric, so the leftmost and rightmost buckets share the same path count. The centre collects the most paths. That is why edge multipliers can look huge: they pay for rare paths, not for a generous game.

This page is the maths twin of [plinko gambling](/guides/plinko-gambling). Use that guide for the product loop, fairness claims and why a pretty bounce is not a proof. Use this page to price a board.

If a studio weights pegs, or maps a seed straight to a bucket instead of a path, the binomial table is the wrong model. Then you need the info-panel probabilities. No panel, no price.

Adults 18+ only. Plinko odds do not become plus-EV because you watched the last ten balls. This cluster sits in [games and odds](/guides/topics/games-and-odds).`,
    },
    {
      id: "rows",
      title: "Row counts: 8, 12 and 16",
      body: `Row count is n. More rows means more buckets and a thinner tail. Raising n does not raise the chance of “hitting something good.” It moves more of the return into rarer landings if the operator puts the jackpot-style multipliers on the edges.

### 8 rows (256 paths, 9 buckets)

| k (steps to one side) | Paths C(8, k) | P | Fair payout (1/P) |
| --- | --- | --- | --- |
| 0 or 8 | 1 | 0.3906% | 256x |
| 1 or 7 | 8 | 3.125% | 32x |
| 2 or 6 | 28 | 10.938% | 9.14x |
| 3 or 5 | 56 | 21.875% | 4.57x |
| 4 (centre) | 70 | 27.344% | 3.66x |

### 12 rows (4,096 paths, 13 buckets)

C(12, 0) = 1 → 0.0244%. C(12, 1) = 12 → 0.293%. C(12, 2) = 66 → 1.611%. C(12, 3) = 220 → 5.371%. C(12, 4) = 495 → 12.085%. C(12, 5) = 792 → 19.336%. C(12, 6) = 924 → 22.559% in the centre.

The two outermost buckets are about 16 times rarer than on 8 rows. A 1,000x sticker on a 12-row edge is still a short pay versus the 4,096x fair price.

Fair 12-row payouts if the house paid true odds: 4096x, 341.3x, 62.1x, 18.6x, 8.3x, 5.2x, 4.4x in the centre. No live board pays that column. A “1,000x high risk” sticker on k=0 is a 76% haircut versus fair. Always compare m_k to 1/P(k), not to last night’s screenshot.

### 16 rows (65,536 paths, 17 buckets)

C(16, 0) = 1 → 0.001526%. Fair edge payout is 65,536x. C(16, 8) = 12,870 → 19.638% in the dead centre. Operators love 16-row high-risk tables because a 1,000x or 2,000x label looks generous next to a path that almost never happens.

| k | C(16, k) | P | Fair 1/P |
| --- | --- | --- | --- |
| 0 | 1 | 0.001526% | 65,536x |
| 1 | 16 | 0.02441% | 4,096x |
| 2 | 120 | 0.1831% | 546x |
| 3 | 560 | 0.8545% | 117x |
| 8 | 12,870 | 19.638% | 5.09x |

A 1,000x cell on k=0 pays about 1.5% of fair. A 100x cell on k=2 pays about 18% of fair. Those two sentences are the whole “jackpot row” story.

Count buckets on the screenshot: rows + 1 if the layout is the usual one-bucket-per-k. If the count does not match, stop using the binomial row and read the panel.`,
    },
    {
      id: "risk",
      title: "Risk levels as a multiplier reallocation",
      body: `Low, medium and high risk are three multiplier vectors on the same P(k). They are not three different bounce physics.

Write the plinko payout table as a vector m_k. Expected return per $1 is Σ P(k) m_k. House edge is 1 minus that sum. Risk is how the operator spreads the same (or a nearby) sum across k.

- **Low risk.** Centre m_k sits near 0.5x to 1.1x. Edges sit in single digits. Session standard deviation is small.
- **Medium risk.** Centre drops further below 1x. Mid-side buckets rise. Variance rises.
- **High risk plinko.** Several centre buckets can sit at 0.2x. The two outermost buckets take three-digit multipliers. Most balls lose. A few balls print a screenshot. That is a variance skin, not a better plinko RTP.

If two tables are built to 99% RTP, every risk level returns about 99 cents per dollar dropped. High risk does not “pay better.” It concentrates the same return into fewer balls. That is a variance choice, the same family of idea as a 14x colour versus a 2x colour.

Do not compare risk labels across brands. “High” on site A can be milder than “medium” on site B. Compare m_k, not the adjective.

A useful invariant: if you scale every multiplier by the same constant c, RTP scales by c and the edge becomes 1 − cE. Houses do not do that. They lower the centre and raise the tails so that Σ P m stays near a target. When a streamer says “high risk has better odds,” ask for E. If they cannot produce it, they said “higher screenshot” and called it odds.`,
    },
    {
      id: "edge-formula",
      title: "House edge from a published row",
      body: `The [house edge](/guides/house-edge) of a plinko board is not a vibe. It is a finite sum.

1. List every bucket multiplier m_i.
2. Attach P_i from the binomial table for that row count, or from the info panel if pegs are biased.
3. Compute E = Σ P_i m_i. That is expected return per $1, also called RTP as a decimal.
4. House edge = 1 − E.

A 98% RTP board has a 2% edge on every ball. [RTP explained](/guides/rtp-explained) is the definition page. This page only needs the identity so you can finish a sum.

### Speed is a multiplier on the dollar leak

The edge applies to total wagered, not to the deposit. Fifty $1 balls are $50 of action. Recycled wins can turn the same $50 into $200 of action. At 2%, expected cost is $4, not $1. [Expected value gambling](/guides/expected-value-gambling) is the dollar form of the same line: EV = (E − 1) × stake per ball.

If the site hides P_i, treat the advertised RTP as a claim. Some operators ship several RTP skins of the same art. Read the instance in front of you.`,
    },
    {
      id: "worked-board",
      title: "Worked 8-row board: low risk versus high risk",
      body: `Same 256 paths. Two multiplier rows built to land near 99% RTP. These are teaching numbers, not a promise that any live brand uses them.

### Low-risk multipliers

5.6x, 2.1x, 1.1x, 1.0x, 0.5x, 1.0x, 1.1x, 2.1x, 5.6x

Contribution to E (paths × multiplier):

| Bucket | Paths | m | Paths × m |
| --- | --- | --- | --- |
| Edges (k=0,8) | 1+1 | 5.6 | 11.2 |
| k=1,7 | 8+8 | 2.1 | 33.6 |
| k=2,6 | 28+28 | 1.1 | 61.6 |
| k=3,5 | 56+56 | 1.0 | 112.0 |
| Centre k=4 | 70 | 0.5 | 35.0 |
| **Sum** | 256 | — | **253.4** |

E = 253.4 / 256 = 0.9898. RTP ≈ 98.98%. House edge ≈ 1.02%.

### High-risk multipliers

29x, 4x, 1.5x, 0.3x, 0.2x, 0.3x, 1.5x, 4x, 29x

| Bucket | Paths | m | Paths × m |
| --- | --- | --- | --- |
| Edges (k=0,8) | 1+1 | 29 | 58.0 |
| k=1,7 | 8+8 | 4 | 64.0 |
| k=2,6 | 28+28 | 1.5 | 84.0 |
| k=3,5 | 56+56 | 0.3 | 33.6 |
| Centre k=4 | 70 | 0.2 | 14.0 |
| **Sum** | 256 | — | **253.6** |

E = 253.6 / 256 = 0.9906. RTP ≈ 99.06%. House edge ≈ 0.94%.

Same order of leak. Opposite session shape. On low risk, a $1 ball often returns $0.50 to $2.10. On high risk, the centre 27% of balls return $0.20, and the 0.39% edges return $29.

A 100-ball, $1 session has about $1 of expected cost on either table. The high-risk path has a much wider distribution around that $1.`,
    },
    {
      id: "variance",
      title: "Same edge, different tails",
      body: `Once E is fixed, risk only changes the second moment. A rough check: variance per $1 ball is Σ P_i (m_i − E)^2.

On the low-risk row, most mass sits within about 0.5 of E. On the high-risk row, the 29x cells dominate the variance even though they are 2/256 of the mass: each contributes (29 − 0.99)^2 / 256 ≈ 3.07 to the variance from one side, about 6.1 from both edges, before the 0.2x centre adds a little more. You do not need a perfect variance number to use the board. You need to know that a 29x cell at 0.39% will not “show up tonight” just because the last twenty balls died in the middle.

Independence: P(k) does not update after a centre landing. The next ball is still C(n, k)/2^n. Streaks are samples, not a debt the pegs owe you.

### Expected balls to first edge

On 8 rows, P(k=0 or 8) = 2/256 = 1/128. Expected balls to the first outer hit is 128 if you stop at the first one. That is a mean, not a promise the 129th ball pays. On 16 rows, P(k=0 or 16) = 2/65,536. Expected balls to that pair is 32,768. A 200-ball “session” on 16-row high risk is almost all centre and near-centre. Plan the screenshot rate with 1/P, not with hope.

If you came here from a stream overlay that shows “hot edges,” the overlay is decorating a memoryless process. The percentages on this page do not move.`,
    },
    {
      id: "compare",
      title: "How to price a live board in five lines",
      body: `Open the info panel. Write:

1. n (rows) and bucket count.
2. Whether pegs are 50/50. If yes, copy P(k) from the tables above.
3. The multiplier row for the risk you will actually click.
4. E = Σ P m. Edge = 1 − E.
5. Expected cost = stake × balls × edge.

If step 2 or 3 is missing, you cannot complete the sum. Skip the board. The general [plinko gambling](/guides/plinko-gambling) guide is the product page when you need rules, auto-drop cost, and why PVPspinArena does not run a drop game.

PVPspinArena publishes a 33-slot wheel instead. You can count the slots on [Roulette](/roulette) and compute about a 7.88% Purple or Silver edge after the win fee without a binomial table. Jackpot and Coinflip use pot share, not a bucket row.

Do not import a “row strategy.” Changing n or risk changes variance. It does not create an edge. The only plus-EV move on a 1–3% board is not dropping the ball.

### Paper check you can do in sixty seconds

Pick the board on screen. Write n, risk label, and the nine or more multipliers. If n is 8, copy P from the 256-path table. Multiply down the row. If E lands between 0.97 and 0.99 you have a typical crypto board. If E lands at 0.94, the art is the same and the leak is fatter. If you cannot finish the multiply, you do not have plinko odds. You have a cartoon.

Those bin probabilities are the same maths as a [plinko board](/guides/plinko-board).`,
    },
  ],
  faqs: [
    {
      q: "How do you calculate plinko odds?",
      a: "For fair pegs, P(k) = C(n, k) / 2^n. Multiply each bucket probability by its multiplier, sum the products, and subtract from 1 to get house edge.",
    },
    {
      q: "Do more rows improve plinko odds?",
      a: "No. More rows thin the tails and add buckets. If the operator parks huge multipliers on those tails, variance rises. RTP is a separate setting.",
    },
    {
      q: "Does high risk have a better RTP?",
      a: "Not by definition. High risk reallocates multipliers toward the edges. Many brands hold RTP nearly constant across risk labels. Always sum the row in front of you.",
    },
    {
      q: "What is a typical plinko RTP?",
      a: "Many crypto boards advertise about 97% to 99% RTP, a 1% to 3% house edge per ball. Confirm the instance; studios ship more than one RTP.",
    },
    {
      q: "Where is the full plinko game guide?",
      a: "On the plinko gambling page. This page is the binomial maths, worked boards and edge formula only.",
    },
    {
      q: "Does PVPspinArena have plinko?",
      a: "No. It offers Jackpot, Coinflip and Roulette only. Use this maths to price a board elsewhere, then compare it with published PvP odds.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Binomial distribution",
      url: "https://en.wikipedia.org/wiki/Binomial_distribution",
    },
    { label: "Wikipedia: Return to player", url: "https://en.wikipedia.org/wiki/Return_to_player" },
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
  ],
  related: ["plinko-gambling", "house-edge", "rtp-explained", "pachinko-odds", "plinko-board"],
  updated: "2026-09-26",
};
