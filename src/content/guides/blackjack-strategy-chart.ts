import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blackjack-strategy-chart",
  cluster: "Blackjack",
  keyword: "blackjack chart",
  secondary: [
    "how to read a blackjack chart",
    "basic strategy chart",
    "blackjack strategy grid",
    "leftover house edge",
  ],
  title: "Blackjack Chart: How to Read It, Leftover Edge",
  description:
    "What a blackjack chart is, how to read rows and up-cards, a few key cells, leftover house edge, and why the grid shrinks leak instead of creating plus-EV.",
  h1: "Blackjack chart: how to read the grid and what leftover edge remains",
  answer:
    "A blackjack chart is a precomputed grid of the least-bad action for each player total against each dealer up-card under a named rule sheet. Reading it means matching your total (row) to the up-card (column) and taking that colour — hit, stand, double, split or surrender. The chart shrinks leak. It does not create plus-EV. The full cell-by-cell treatment lives on our [basic strategy](/guides/blackjack-basic-strategy) page. PVPspinArena does not deal blackjack.",
  facts: [
    "One chart per rule sheet: decks, S17/H17, DAS and surrender all move cells.",
    "Illustration: a matching six-deck S17 3:2 chart often leaves about 0.5% house edge.",
    "Deviations such as standing 16 versus 10 or refusing to split 8s can add more than a percent by themselves.",
    "A blackjack chart uses average remaining composition; it is not card counting.",
    "Adults 18+: the grid is damage control. PVPspinArena does not deal blackjack and has no 21 chart widget.",
  ],
  sections: [
    {
      id: "what",
      title: "What a blackjack chart actually is",
      body: `A blackjack chart is not folklore and it is not a plus-EV system. Computers enumerate dealer finishing totals and your hit, stand, double, split and surrender trees, then pick the action with the highest expected value in each cell if the rest of the shoe matches the unseen average mix.

Best means “loses the least on average”, not “wins”. Hitting hard 16 versus a dealer 7 is still a miserable hand. The cell says hit because standing is worse on average for those rules. You will bust often.

### What this page is not

This page does not reprint a 300-cell studio poster. That dump is copyrighted artwork and it is the wrong object: you need the grid that names your decks, soft-17 rule, DAS and surrender. The long explainer of what the chart changes and cannot change is [blackjack basic strategy](/guides/blackjack-basic-strategy). Use that page when you want the limits spelled out. Use this page when you need to know how to read any labelled grid.

### Cluster

The walkthrough is [how to play blackjack](/guides/how-to-play-blackjack). Variants that rewrite cells are [blackjack rules](/guides/blackjack-rules). The hub is [blackjack guides](/guides/topics/blackjack).`,
    },
    {
      id: "read",
      title: "How to read rows, columns and colours",
      body: `Almost every published grid is the same map.

### Rows

Hard totals (often 5–17 or 8–17) sit in one block. Soft totals (A,2 through A,9) sit in another. Pairs (2–2 through A–A) sit in a third. Find your hand in the correct block. A pair of 8s is the pair row, not the hard-16 row. Soft 18 is the ace-7 row, not hard 18.

### Columns

Columns are dealer up-cards, usually 2 through ace. Your two cards plus that one up-card are the entire input for a total-dependent chart.

### Colours or letters

Studios paint hit, stand, double, split and surrender in different colours. Some print H, S, D, P, R. “Double if allowed, else hit” appears on some soft and hard cells. If the table forbids that double, take the fallback.

### Caption first

Read the caption before the first cell: four decks or six, S17 or H17, DAS or no, late surrender or not. Copying a four-deck S17 wallpaper onto an eight-deck H17 6:5 app is how people invent a 2% game and call it strategy.

### Composition notes are trivia until the ugly hits are automatic

Total-dependent charts look only at your sum. Composition-dependent play notices that 16 made of 4-5-7 is not 16 made of 10-6 against a dealer 10. Those distinctions are worth hundredths. Recreational players lose the leftover edge plus the cells they refuse to hit. Learn the total-dependent grid first.

### Pair rows are not hard-total rows

8-8 is the pair-of-eights row, not hard 16. A,7 is soft 18, not hard 18. 5-5 is a pair that most charts treat as a 10 to double, not as a split. The most common reading error is grabbing the wrong block because the pip sum looks familiar. Slow down for two seconds: pair, soft, or hard. Then the column. Then the colour.

If two cards of the same rank arrive after a split, you may have a resplit decision. That is still the pair block, subject to the table’s resplit limit. It is not a new kind of chart. It is the same grid with one more stake.`,
    },
    {
      id: "cells",
      title: "A small table of high-value cells",
      body: `These are teaching illustrations for a common multi-deck S17 3:2 DAS sheet with late surrender. They are not a full chart and they move if your rules move.

| Your hand | Dealer up-card | Usual cell (illustration) |
| --- | --- | --- |
| Pair of aces | Any | Split |
| Pair of 8s | Any | Split |
| Pair of 10s | Any | Stand — do not split |
| Hard 16 | 2–6 | Stand |
| Hard 16 | 7–ace | Hit; surrender vs 9–ace if late surrender exists |
| Hard 11 | 2–10 | Double (check ace and H17 captions) |
| Soft 18 (A,7) | 9, 10, ace | Hit or double — not an automatic stand |

Each of those cells was computed. [When to double down in blackjack](/guides/when-to-double-down-blackjack) and [when to split in blackjack](/guides/when-to-split-blackjack) expand two families. If you only remember five cells away from a table, remember: split 8s, split aces, never split 10s, hit 16 versus 7 or higher, and take 3:2 or walk.

Those five are not a complete blackjack chart. They are the expensive folklore blockers. The rest of the grid is still worth loading on your phone, face down, for the first sessions — if the table allows a card. If it does not, you either memorised the matching sheet or you are guessing. Guessing is how a 0.5% leftover becomes a 2% night. Do not confuse “I know the five” with “I play the chart”.

### Insurance is not on the grid as a “yes”

Decline insurance. The 2-to-1 side bet is a leak from a full shoe. See [what is insurance in blackjack](/guides/blackjack-insurance).`,
    },
    {
      id: "leftover",
      title: "The leftover edge after you follow the chart",
      body: `A matching chart can cut a hunch-player’s 2–4% leak down to a few tenths of a percent on a clean six-deck 3:2 S17 table. Illustration: leftover house edge around 0.4% to 0.6%. That leftover is still charged on every hand.

### Worked clip

$10 units, 200 hands, matching chart, 0.5% leftover: $2,000 handled, expected cost about $10. Same clip with two refused splits of 8s, a stood 16 versus 10, and three insurance buys can add another $20–$40 of expected leak. The chart’s value is those avoided cells, not a story that you are now the house.

[Expected value](/guides/expected-value-gambling) is the scoring function behind the colours. [House edge](/guides/house-edge) is the leftover after the colours are followed.

Handle is not deposit. Deposit $80, play 300 hands of $15, and you handled $4,500. A 0.5% leftover is about $22.50 of expected cost — not 40 cents on the $80. People who “learned the chart” and then doubled the unit because the grid felt like skill often pay more in a week than they did as sloppy players on a smaller stake. The chart shrinks the percentage. It does not shrink the bill if you inflate the handle.

### 6:5 drowns the grid

Perfect play on a 6:5 table can still sit near 2% house edge. The chart cannot buy the payline back. Walk or treat it as a different, more expensive product.`,
    },
    {
      id: "variants",
      title: "Why there is no universal blackjack chart",
      body: `Change one rule and some cells move. That is why “the” chart is a family.

- **H17 versus S17:** a few doubles and stands tighten.
- **Deck count:** single-deck charts double 11 versus ace more freely; multi-deck charts are more conservative. [How many decks in blackjack](/guides/how-many-decks-blackjack) is the lever.
- **DAS:** pair cells for 2s, 3s and 6s change.
- **Surrender:** 15s and 16s become half-unit exits when the button exists.

If the site will not state those four facts, you cannot play a chart because you do not know which game you are in.

### Counting is a different grid

Basic strategy assumes average remainder. When a live shoe is rich in tens, a few cells flip; that is [card counting](/guides/card-counting), and it does not apply to per-hand crypto shuffles.`,
    },
    {
      id: "not-plus",
      title: "A blackjack chart does not create plus-EV",
      body: `This is the half the thumbnail videos skip.

The dealer still acts last. Players still bust first. Naturals still pay a posted amount that, once you include every losing total, leaves a tax. The leftover 0.5% (or whatever your rules produce) is the price of the game.

Playing the right action on 12 versus 3 does not make doubling the stake after a loss a good idea. Bet size is a separate, still-negative problem. See [martingale strategy](/guides/martingale-strategy). A martingale on a leftover 0.5% game is still a martingale: the mean stays negative and the ruin path gets fatter.

People who learn a chart sometimes raise their stakes because “now I have an edge”. They do not. They have a smaller leak. A smaller leak on a larger stake can cost more money.

A [blackjack simulator](/guides/blackjack-simulator) will show the same mean if you encode the same sheet. This site has no shoe simulator and no chart widget. Running more trials does not flip the sign. If a video overlays a grid on a 6:5 stream and calls it plus-EV, the overlay is decoration. [How many decks in blackjack](/guides/how-many-decks-blackjack) and the payout line still set the leftover before the first colour matters.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena has no 21 chart to memorise",
      body: `There is no blackjack table here and no interactive grid. The live games publish prices without colours.

- [Jackpot](/) — chance = stake / pot.
- [Coinflip](/coinflip) — 50/50, fee in the open.
- [Roulette](/roulette) — 33 slots, 2x and 14x.
- [Fairness](/fairness) — verify the committed result.

A colour wheel does not care whether you “hit 16”. If you like blackjack because the decisions feel meaningful, that feeling is real and still compatible with a negative expectation. Keep the session sized as entertainment for adults, then leave when the note says leave.

[Crypto blackjack](/guides/crypto-blackjack) lists the rule levers you still need if you sit at someone else’s hashed or RNG table.

If you like the feeling of a correct cell, keep that feeling attached to a written stop. The grid is a script for losing slowly on a clean felt. It is not a reason to open a second box, buy insurance, or sit through tired errors. Tired errors are how a 0.5% illustration becomes yesterday’s 2% leak again. When the 16-versus-10 hits start looking optional, you are no longer playing the chart. You are playing a mood. Leave.`,
    },
    {
      id: "stop",
      title: "A smaller leak is not a reason to play longer",
      body: `Keep the same [gambling budget](/guides/gambling-budget) you would use without a chart. Decide a hand count and a loss limit before you sit. If you are using the grid as permission to chase, stop.

If blackjack or any other game is becoming hard to put down, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). A perfect grid does not make a session healthier. Start on the [responsible gambling](/responsible-gambling) page if you need limits tonight.`,
    },
  ],
  faqs: [
    {
      q: "What is a blackjack chart?",
      a: "A grid of the highest-EV action for each player total versus each dealer up-card under a named rule set. It shrinks leak. It does not create plus-EV.",
    },
    {
      q: "How do I read a blackjack chart?",
      a: "Find your hard, soft or pair row, read the dealer up-card column, and take the printed action. Read the caption for decks, S17/H17, DAS and surrender first.",
    },
    {
      q: "Is there one universal blackjack chart?",
      a: "No. Decks, soft 17, DAS and surrender move cells. Use a chart labelled for the table in front of you.",
    },
    {
      q: "Does a blackjack chart beat the house?",
      a: "No. On a clean 3:2 table it can leave about half a percent house edge. That leftover is still a cost on every hand.",
    },
    {
      q: "Is a blackjack chart the same as card counting?",
      a: "No. The chart assumes an average remaining shoe. Counting tracks how this shoe differs and is usually useless on per-hand shuffles.",
    },
    {
      q: "Does PVPspinArena have a blackjack chart?",
      a: "No. PVPspinArena does not deal blackjack and has no 21 strategy widget.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: blackjack basic strategy",
      url: "https://wizardofodds.com/games/blackjack/strategy/4-decks/",
    },
    {
      label: "Wizard of Odds: blackjack house edge calculator",
      url: "https://wizardofodds.com/games/blackjack/calculator/",
    },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
  ],
  related: [
    "blackjack-basic-strategy",
    "how-to-play-blackjack",
    "when-to-double-down-blackjack",
    "when-to-split-blackjack",
    "card-counting",
    "expected-value-gambling",
  ],
  updated: "2026-09-26",
};
