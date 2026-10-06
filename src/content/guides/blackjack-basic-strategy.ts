import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blackjack-basic-strategy",
  cluster: "Games & odds",
  keyword: "blackjack basic strategy",
  secondary: ["blackjack chart", "basic strategy chart", "blackjack odds", "blackjack house edge"],
  title: "Blackjack Basic Strategy: Charts, Edge and Limits",
  description:
    "Blackjack basic strategy: what the charts change, what they cannot, rule variants, and why the remaining house edge still costs money.",
  h1: "Blackjack basic strategy: the chart, the leftover edge, the limits",
  answer:
    "Blackjack basic strategy is a chart of the lowest-house-edge action for every player total against every dealer up-card, given a published rule set. Playing it can cut a sloppy 2–4% leak down to a few tenths of a percent. It cannot remove the leftover edge, it cannot beat a 6:5 table back to even, and it is not a licence to raise stakes.",
  facts: [
    "Basic strategy is a precomputed best play for each (player cards, dealer up-card) pair under a fixed rule sheet.",
    "Correct play on common six-deck S17 3:2 tables leaves a house edge around 0.4% to 0.6%.",
    "Deviations from the chart — standing 16 versus 10, refusing to split 8s — can add more than a percent by themselves.",
    "A different rule set needs a different chart; S17 versus H17 and DAS versus no-DAS move several cells.",
    "The leftover edge is still charged on every hand; the chart is damage control, not a winning system.",
  ],
  sections: [
    {
      id: "what",
      title: "What the chart actually is",
      body: `Basic strategy is not folklore and it is not card counting. It is the action with the highest expected value for this hand if the rest of the shoe matches the unseen average composition.

Computers enumerate the dealer’s finishing totals and your hit/stand/double/split trees, then pick the least-bad move in each cell. The output is a colour grid: hit, stand, double, split, surrender.

### What “best” means

Best means “loses the least on average”, not “wins”. Standing 16 versus a dealer 7 is still a miserable hand. The chart says hit because hitting loses less than standing, on average, for those rules. You will bust often. The alternative is worse.

### One chart per rule sheet

The famous grids assume a deck count, a soft-17 rule, whether you may double after split, and whether surrender exists. Copying a four-deck S17 chart onto an eight-deck H17 6:5 app is how people invent a 2% game and call it strategy. Match the grid to the felt. Our [crypto blackjack guide](/guides/crypto-blackjack) lists the rule levers that move RTP.`,
    },
    {
      id: "changes",
      title: "What the chart changes — with numbers",
      body: `Think of two players on the same six-deck S17 3:2 table.

### Worked comparison

| Player | Style | Approx. house edge | Expected cost per $100 wagered |
| --- | --- | --- | --- |
| A | Uses a matching basic-strategy chart | 0.5% | $0.50 |
| B | Plays “hunches”: never splits 8s, stands 12–16 always, never doubles | 2.5%+ | $2.50+ |
| C | Perfect chart on a 6:5 blackjack table | ~1.9% | $1.90 |
| D | Hunches on 6:5 | 4%+ | $4.00+ |

The chart is worth real money because it stops own-goals. It is not worth a victory lap. Player A still expects to lose 50 cents per $100 handled. Play 200 hands of $25 and you have handled $5,000; 0.5% is $25 of expected cost, not 50 cents.

### High-value cells people ignore

Without reprinting a studio’s artwork, the expensive mistakes are well known:

- Always split aces and 8s; never split 10s.
- Double 11 against a dealer 10 on most multi-deck S17 charts; check H17 and single-deck variants.
- Hit hard 16 versus 7–A; stand 16 versus 2–6.
- Treat a pair of 4s and a pair of 5s as totals, not as “must split”.
- Take late surrender of 16 versus 9–A when the table offers it.

Each of those cells was computed, not vibed. [Expected value](/guides/expected-value-gambling) is the scoring function behind the colours.`,
    },
    {
      id: "cannot",
      title: "What the chart cannot do",
      body: `This is the half the thumbnail videos skip.

### It cannot erase the edge

The dealer still acts last, players still bust first, and blackjack still pays less than the true odds of a natural once you include all the losing totals. The leftover 0.5% (or whatever your rules produce) is the price of the game. Our [house edge guide](/guides/house-edge) applies unchanged.

### It cannot fix a bad felt

6:5 naturals, H17, no DAS, and double-only-on-10–11 can add more cost than the chart saves relative to a clean table. Shopping tables matters more than colouring cells on a bad one.

### It cannot see the rest of the shoe

Basic strategy uses average remaining composition. When the shoe is rich in tens, a few cells flip; that is count-based deviation, which is [card counting](/guides/card-counting), and it does not apply to per-hand crypto shuffles.

### It cannot justify a martingale

Playing the right action on 12 versus 3 does not make doubling the stake after a loss a good idea. Bet size is a separate, still-negative, problem. See [martingale strategy](/guides/martingale-strategy).`,
    },
    {
      id: "variants",
      title: "Rule variants that rewrite cells",
      body: `If you change one rule, some cells move. That is why “the” chart is a family.

### Soft 17

When the dealer hits soft 17, dealer-bust rates drop slightly. A few double and stand decisions tighten. Using an S17 grid on an H17 table leaves a measurable leak.

### Number of decks

Single-deck charts double 11 versus ace more freely and change some soft doubles. Multi-deck charts are more conservative. Infinite-deck or “each card fresh” RNG tables sit closer to the many-deck end and remove composition-dependent plays entirely.

### Surrender and DAS

Late surrender turns some 15s and 16s into a half-stake exit. DAS changes whether a pair of 2s, 3s or 6s is worth splitting. If the buttons are missing, those cells revert to hit or stand.

Print or load the grid that names your decks, S17/H17, DAS and surrender. If the site will not state those four facts, you cannot play basic strategy because you do not know which game you are in.

### Composition-dependent extras

Total-dependent charts look only at your sum and the up-card. Composition-dependent play notices that 16 made of 4-5-7 is not the same as 16 made of 10-6 against a dealer 10. A few of those distinctions are worth a hundredth of a percent. They are real, and they are not why recreational players lose. Recreational players lose the leftover edge plus the cells they refuse to hit. Learn the total-dependent grid first. Treat composition notes as trivia until the four rule facts and the ugly hits are automatic.

### Surrender cells

Where late surrender exists, many multi-deck charts surrender hard 16 versus 9, 10 and ace, and hard 15 versus 10. Refusing those exits keeps a full unit in a hand the chart already priced as a half-unit loss. That is not bravery. It is a higher mean cost.`,
    },
    {
      id: "responsible",
      title: "A chart is not a reason to play longer",
      body: `People who learn basic strategy sometimes raise their stakes because “now I have an edge”. They do not. They have a smaller leak. A smaller leak on a larger stake can cost more money.

Keep the same [gambling budget](/guides/gambling-budget) you would use without a chart. Decide a hand count and a loss limit before you sit. If you are using the chart as permission to chase, stop.

If blackjack or any other game is becoming hard to put down, use the [responsible gambling](/responsible-gambling) page and [how to stop gambling](/guides/how-to-stop-gambling). A perfect grid does not make a session healthier.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not deal blackjack",
      body: `There is no 21 table and no strategy chart to memorise here. The live games are Jackpot, Coinflip and Roulette. None of them has a hidden “correct play” matrix: the prices are on the screen.

- [Jackpot](/) — chance = your stake / pot.
- [Coinflip](/coinflip) — 50/50, fee in the open.
- [Roulette](/roulette) — count 33 slots, read 2x and 14x.
- [Fairness](/fairness) — verify the committed result.

The [games and odds topic](/guides/topics/games-and-odds) holds those live numbers. Use this page when you sit at someone else’s 21 table and need to know what a chart is for — and what it is not.

A colour wheel does not care whether you “hit 16”. A pot does not have a soft 18. If you like blackjack because the decisions feel meaningful, that feeling is real and still compatible with a negative expectation. Meaningful decisions can be the least-bad way to lose slowly. They are not a wage. Keep the session sized as entertainment, then leave when the note says leave.`,
    },
    {
      id: "insurance-pairs",
      title: "Insurance, pairs and other cells people invent",
      body: `A chart is only as good as the cells you actually follow when the hand is ugly.

### Insurance is not a hedge

Insurance is a side bet that the dealer has a ten in the hole under an ace. From a full multi-deck shoe the ten-density is too low for 2 to 1 to be a fair price. Basic strategy says decline insurance. “I have a blackjack, I should lock a win” is a feeling, not a calculation. You already have a strong hand; buying a 7% side bet to make it feel certain is how the leftover edge grows.

### Hard 12 versus 2 or 3

These cells move with deck count. Many multi-deck charts hit 12 versus 2 and 3 because busting 12 is expensive and the dealer’s weak up-card is not weak enough to stand. Single-deck charts sometimes stand. If you memorised one row from a phone wallpaper, check the caption.

### Soft hands

A soft 18 versus 9, 10 or ace is a hitting or doubling hand on most multi-deck charts, not a stand. Players who “always stand on 18” donate a measurable slice. Soft 13–17 versus dealer 5 or 6 are often doubles. The extra stake is the point of the cell: you have a spare ace and a dealer who is likely to bust.

### Worked 200-hand clip

$10 units, matching six-deck S17 chart, 0.5% leftover edge: $2,000 handled, expected cost $10. Same clip with three insurance buys, two refused splits of 8s, and a stood 16 versus 10 can add another $20–$40 of expected leak. The chart’s value is those avoided cells, not a story that you are now the house.

Write the four rule facts on a note, load the matching grid, and play the ugly hits. That is the whole technique. If you only remember five cells away from a table, remember these: split 8s, split aces, never split 10s, hit 16 versus 7 or higher, and take 3:2 or walk. Those five prevent the most expensive folklore. The rest of the grid is worth learning; those five are worth not improvising tonight.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Blackjack basic strategy is the least-bad action for each hand under a named rule set. It can move you from a sloppy few-percent leak to a leftover house edge of about half a percent on a clean 3:2 table. It cannot create a player advantage, cannot repair 6:5 paytables, and cannot turn a hashed RNG shoe into a countable live shoe.

Match the chart to the rules, keep stakes inside a budget, and do not confuse damage control with a winning system. PVPspinArena does not offer blackjack; the live alternatives publish their odds without a colour grid.

The research line that produced charts and counts is summarised on [Edward Thorp](/guides/edward-thorp).`,
    },
  ],
  faqs: [
    {
      q: "Does blackjack basic strategy beat the house?",
      a: "No. It minimises the house edge for the posted rules. The leftover edge is still negative expected value on every hand.",
    },
    {
      q: "How much does a basic strategy chart change the odds?",
      a: "On a typical six-deck 3:2 table it can cut a hunch-player’s 2–4% leak to about 0.5%. The exact leftover depends on S17/H17, DAS, surrender and deck count.",
    },
    {
      q: "Is there one universal blackjack chart?",
      a: "No. Decks, soft 17, doubling after split and surrender all move cells. Use a chart labelled for the table in front of you.",
    },
    {
      q: "Is basic strategy the same as card counting?",
      a: "No. Basic strategy assumes an average remaining shoe. Counting tracks the remaining mix and sometimes changes both the play and the bet. Online shuffles usually make counting useless.",
    },
    {
      q: "Does PVPspinArena use blackjack basic strategy?",
      a: "No. PVPspinArena does not offer blackjack. This guide explains charts so you can use them correctly on other tables, and so you do not over-claim what they do.",
    },
    {
      q: "Should I raise my bets after learning the chart?",
      a: "No. You still pay a house edge. A smaller percentage of a larger stake can cost more. Keep the same budget you would have used before.",
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
    "crypto-jackpot",
    "card-counting",
    "gamblers-fallacy",
    "martingale-strategy",
    "martingale-calculator",
    "edward-thorp",
  ],
  updated: "2026-09-26",
};
