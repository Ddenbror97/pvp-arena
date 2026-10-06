import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sic-bo-strategy",
  cluster: "Casino games",
  keyword: "sic bo strategy",
  secondary: ["best sic bo bets", "sic bo big small", "sic bo house edge", "sic bo tips"],
  title: "Sic Bo Strategy: The Least Bad Bets and Bankroll",
  description:
    "Sic bo strategy by the numbers: Big and Small at 2.78%, why triples and doubles cost 14–33%, how to check any paytable, and a bankroll plan that fits.",
  h1: "Sic bo strategy: which bets are least bad and how to size them",
  answer:
    "The best sic bo strategy is to stick to Big or Small (or Odd/Even where offered), which lose only on triples and carry a 2.78% house edge, and to avoid specific triples, doubles and most totals, which usually cost 9% to 33%. Check the paytable, because the same bet can pay differently from table to table. Nothing about the dice history predicts the next roll.",
  facts: [
    "Three dice give 216 equally likely outcomes.",
    "Big and Small each win 105 of 216 rolls and pay 1 to 1: a 2.78% house edge.",
    "Single-number bets paying 1, 2 and 3 to 1 cost 7.87%, the same as chuck-a-luck.",
    "Any triple at 30 to 1 costs 13.89%; a specific triple at 180 to 1 costs 16.20%.",
    "Totals of 7 or 14 at 12 to 1 are the cheapest total bets on a common paytable, at 9.72%.",
    "Formula for any bet: edge = 1 − (payout + 1) × probability.",
  ],
  sections: [
    {
      id: "foundation",
      title: "The one formula sic bo strategy needs",
      body: `Sic bo is three dice and a large menu of bets. The game overview, table layout and online versions are covered in [sic bo online](/guides/sic-bo-online). Strategy here means one thing: knowing what each bet costs, so you can pick the cheapest ones.

Three dice produce 6 × 6 × 6 = 216 equally likely outcomes. Every bet on the table wins on some number of them. If a bet wins on w outcomes and pays p to 1, its return per unit is (p + 1) × w / 216, and its house edge is one minus that.

### Example: Small

Small wins when the total is 4 to 10, unless the roll is a triple. Totals 3 to 10 account for 108 outcomes. Three of those are triples (1-1-1, 2-2-2 and 3-3-3), and a total of 3 is only possible as 1-1-1. So Small wins on 108 − 3 = 105 outcomes. At 1 to 1, the return is 2 × 105 / 216 = 210/216, a 2.78% edge. Big is the mirror image.

That triple clause is the whole house edge on Big and Small. Without it, the bets would be exactly fair.

### Why it matters

Paytables vary by casino, by country and by software provider. If you learn the formula, you can price any bet in a few seconds, including ones this guide does not list. Dice combinatorics in more depth are in [dice roll probability](/guides/dice-roll-probability).`,
    },
    {
      id: "ranking",
      title: "Every common bet ranked by house edge",
      body: `The table below uses one common paytable. Your table may differ; recompute with the formula if it does.

| Bet | Wins on (of 216) | Pays | House edge |
| --- | --- | --- | --- |
| Big or Small | 105 | 1 to 1 | 2.78% |
| Odd or Even (where offered) | 105 | 1 to 1 | 2.78% |
| Single number (1, 2, 3 to 1) | 91 | varies | 7.87% |
| Total 7 or 14 | 15 | 12 to 1 | 9.72% |
| Total 8 or 13 | 21 | 8 to 1 | 12.50% |
| Total 10 or 11 | 27 | 6 to 1 | 12.50% |
| Any triple | 6 | 30 to 1 | 13.89% |
| Total 5 or 16 | 6 | 30 to 1 | 13.89% |
| Total 4 or 17 | 3 | 60 to 1 | 15.28% |
| Specific triple | 1 | 180 to 1 | 16.20% |
| Two-dice combination | 30 | 5 to 1 | 16.67% |
| Total 6 or 15 | 10 | 17 to 1 | 16.67% |
| Specific double | 16 | 10 to 1 | 18.52% |
| Total 9 or 12 | 25 | 6 to 1 | 18.98% |

### Where paytables get worse

Lower payouts on the same bets are common and expensive:

- Specific triple at 150 to 1: 151/216 returned, a 30.09% edge.
- Any triple at 24 to 1: 150/216 returned, a 30.56% edge.
- Specific double at 8 to 1: 144/216 returned, a 33.33% edge.

At those rates, a third of every bet is gone in expectation. The attraction is the headline number. A 150 to 1 payout sounds generous until you notice the true odds are 215 to 1.`,
    },
    {
      id: "single-number",
      title: "Single-number bets and the chuck-a-luck link",
      body: `A single-number bet picks one face, say 4. You win 1 to 1 if one die shows 4, 2 to 1 if two do, and 3 to 1 if all three do.

Counting the outcomes:

- No 4s: 5 × 5 × 5 = 125
- Exactly one 4: 3 × 25 = 75
- Exactly two 4s: 3 × 5 = 15
- Three 4s: 1

Expected result per unit = (75 × 1 + 15 × 2 + 1 × 3 − 125) / 216 = −17/216 ≈ −7.87%.

The intuition that trips people up: with three dice and six faces, "half the time" one of them should be a 4. In fact at least one 4 appears 91 times in 216, about 42%. The multiple payouts on doubles and triples do not make up the gap.

This is the same bet as the carnival and pub game [chuck-a-luck](/guides/chuck-a-luck), which also runs 7.87%. Some Asian tables pay 12 to 1 (or more) when all three dice match your number. Then the numerator becomes 75 + 30 + 12 − 125 = −8, an edge of about 3.70%. If you prefer single numbers, that paytable is worth finding.`,
    },
    {
      id: "myths",
      title: "Hedges, combinations and hot-number myths",
      body: `### Betting Big and Small together

Some players cover both to "stay in the game". On any non-triple roll one bet wins and one loses, so you break even. On a triple both lose. That happens 6 times in 216, so you lose 2 units about 2.78% of the time. You pay the same edge on double the action and win nothing. There is no hedge in sic bo that removes the edge; every combination is a blend of the edges of its parts.

### Stacking long shots onto a safe bet

Adding an any-triple bet to your Small bet to "cover" the triple loss is a common idea. It does cover it: the triple pays 30 to 1. But you now pay 13.89% on the triple money in addition to 2.78% on the Small money. The combination costs more per round than Small alone.

### Result boards

Electronic sic bo tables display recent rolls and label numbers as "hot" or "cold". Dice have no memory, and the shaker resets every round. A total that has not appeared for 50 rolls is exactly as likely next roll as it always was. Waiting for it is the [gambler's fallacy](/guides/gamblers-fallacy).

### Multiplier variants

Some live studios add random multipliers to certain outcomes and reduce the base payouts to fund them. Their RTP can be higher or lower than a classic table. Read the RTP in the help screen rather than assuming the standard numbers apply.`,
    },
    {
      id: "bankroll",
      title: "A bankroll plan for sic bo",
      body: `Big and Small behave like even-money bets, so the swings are about one unit per roll. For a $10 bet on Small:

- Expected loss per roll: $10 × 2.78% ≈ $0.28.
- Over 100 rolls: about −$28 expected, with a standard deviation of roughly $100.

That spread means a 100-roll session commonly finishes anywhere from about −$225 to +$170 at two standard deviations. The average is the cheap part; the variance is what you need a bankroll for.

### A simple structure

1. Set a session budget, for example $300.
2. Use a unit of 1/30 of it: $10.
3. Bet Big or Small (or Odd/Even) flat.
4. If you want the occasional long shot, cap it at one small chip per few rounds, and count it as entertainment spending at its real price.
5. Stop at a written loss limit or time limit.

The [bankroll calculator](/guides/bankroll-calculator) can model other sizes, and [variance in gambling](/guides/variance-in-gambling) explains why short sessions stray far from the expected loss.

### Compared with other dice games

Big and Small at 2.78% are more expensive than the craps pass line at 1.41% and much more expensive than the craps odds bet at 0%. If low cost is the priority, [craps strategy](/guides/craps-strategy) is worth a look. The [casino games hub](/guides/topics/casino-games) ranks the rest of the table games.`,
    },
    {
      id: "worked",
      title: "Worked session: three players, 100 rolls",
      body: `Put three players at the same sic bo table for 100 rolls, each spending $10 a roll, and the edges above turn into dollars.

| Player | Bet each roll | Expected cost | Typical outcome |
| --- | --- | --- | --- |
| A | $10 on Small | about $28 | Swings of ±$100 either side |
| B | $5 Small + $5 on total 9 | about $109 | Many small losses, occasional $30 wins |
| C | $10 on a specific triple at 180 to 1 | about $162 | Usually no hit at all |

The maths behind each row:

- **A:** 100 × $10 × 2.78% ≈ $27.80.
- **B:** 100 × $5 × 2.78% ≈ $13.90 on Small plus 100 × $5 × 18.98% ≈ $94.90 on total 9, about $108.80 in total. Half the money is on a cheap bet and half on an expensive one, so the blended edge is about 10.9%, nearly four times player A's cost for the same $10 a roll. Split bets inherit the worse edge in proportion to the money placed on it.
- **C:** 100 × $10 × 16.20% ≈ $162. A specific triple hits 1 time in 216, so in 100 rolls the chance of seeing at least one is 1 − (215/216)^100 ≈ 37%. Most sessions for player C end at −$1,000. The ones that hit once end near +$810.

Player C's results are the clearest example of how a large payout hides a high edge. The average is −$162, but almost nobody experiences the average; they either lose everything they staked or win big once.

### Reading an unfamiliar paytable

When you meet a table or app with different numbers:

1. Count the winning outcomes out of 216 (or look them up in the ranking above).
2. Add 1 to the payout to get the total return on a win.
3. Multiply, divide by 216, and subtract from 1.

Example: a specific double paying 11 to 1 wins on 16 outcomes. 12 × 16 = 192, and 192/216 ≈ 88.9%, an 11.1% edge. Better than 10 to 1, still four times the cost of Small.`,
    },
    {
      id: "pvp",
      title: "The same arithmetic in a PvP round",
      body: `The sic bo formula, return equals payout times probability, works on every game. Apply it to PVPspinArena [Roulette](/roulette): Purple wins on 16 of 33 slots and pays 2x, so 2 × 16/33 = 32/33. Green wins on 1 of 33 and pays 14x, so 14 × 1/33 = 14/33. Purple and Silver return 32/33 before the 5% win fee, about a 7.88% edge after it. Green returns 14/33, so the colour choice changes the cost, not only the variance.

Round results come from committed seeds and can be checked on the [fairness](/fairness) page. Gambling is 18+ (or the local legal age). If you find yourself raising stakes to recover losses, the [responsible gambling](/responsible-gambling) page has limits and support.

In the same cluster, see also [teen patti](/guides/teen-patti) and [pai gow tiles](/guides/pai-gow-tiles).`,
    },
  ],
  faqs: [
    {
      q: "What is the best bet in sic bo?",
      a: "Big or Small, or Odd/Even where offered. Each loses only on triples and carries a 2.78% house edge, far lower than any triple, double or total bet.",
    },
    {
      q: "Is there a winning sic bo strategy?",
      a: "No. Every bet has a built-in edge and the dice are independent. The best you can do is pick low-edge bets, flat bet, and set limits before playing.",
    },
    {
      q: "What are the odds of a triple in sic bo?",
      a: "Any triple comes up 6 times in 216, about 2.78% or 1 in 36. A specific triple, such as three 5s, comes up 1 time in 216.",
    },
    {
      q: "Why do Big and Small lose on triples?",
      a: "That rule is the house edge. Without it, Big and Small would be fair even-money bets. Removing 3 winning triples from each side creates the 2.78% edge.",
    },
    {
      q: "Is sic bo better than craps?",
      a: "Not on cost. Big and Small at 2.78% are about twice as expensive as the craps pass line at 1.41%, and craps also offers a 0% odds bet.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: sic bo", url: "https://wizardofodds.com/games/sic-bo/" },
    { label: "Wikipedia: Sic bo", url: "https://en.wikipedia.org/wiki/Sic_bo" },
    { label: "Wikipedia: Chuck-a-luck", url: "https://en.wikipedia.org/wiki/Chuck-a-luck" },
  ],
  related: [
    "sic-bo-online",
    "chuck-a-luck",
    "craps-strategy",
    "dice-roll-probability",
    "baccarat-strategy",
    "house-edge",
    "teen-patti",
    "pai-gow-tiles",
  ],
  updated: "2026-09-27",
};
