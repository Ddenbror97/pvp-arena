import type { Guide } from "./types";

export const guide: Guide = {
  slug: "chuck-a-luck",
  cluster: "Games of chance",
  keyword: "chuck a luck",
  secondary: [
    "chuck-a-luck game",
    "birdcage dice game",
    "chuck a luck odds",
    "chuck a luck house edge",
  ],
  title: "Chuck-a-Luck: Birdcage Dice Rules and 7.87% Edge",
  description:
    "Chuck a luck explained: birdcage dice rules and payouts, why it feels like a 50/50, the exact 7.87% house edge, and its links to sic bo and crown and anchor.",
  h1: "Chuck a luck: the birdcage dice game, its payouts and its 7.87% edge",
  answer:
    "Chuck a luck is a three-dice game where you bet on a number from 1 to 6, the operator spins the dice in a wire birdcage, and you are paid 1 to 1 for each die showing your number: even money for one, 2 to 1 for two, 3 to 1 for three. It looks close to fair, but the house edge is 17/216, about 7.87%.",
  facts: [
    "Three dice give 216 outcomes; your number appears at least once in only 91 of them (42.1%).",
    "Standard pays of 1, 2 and 3 to 1 give an expected loss of 17 cents per dollar.",
    "If all six numbers are covered equally, the operator can never lose on a spin.",
    "Paying 10 to 1 on a triple cuts the edge to about 4.63%.",
    "The single-number bet in sic bo and the symbols bet in crown and anchor use the same maths.",
  ],
  sections: [
    {
      id: "what",
      title: "What chuck a luck is",
      body: `Chuck a luck, sometimes called birdcage, is a banking dice game: players bet against the operator, not each other. Three dice sit inside an hourglass-shaped wire cage. The operator turns the cage end over end, the dice tumble through the narrow waist, and they settle at the bottom where everyone can see them.

The game is usually traced back to grand hazard, an older three-dice banking game, and it was common in nineteenth-century America at fairs, riverboats and gambling halls. It survived into the twentieth century as a carnival and charity-night staple because it is simple to run: one cage, a cloth with six numbers, and a stack of chips. The British cousin, crown and anchor, uses dice marked with a crown, an anchor and the four card suits instead of numbers, and is associated with sailors and fairgrounds. The payouts and the edge are the same.

Chuck a luck belongs in the [Games of chance topic](/guides/topics/games-of-chance) with other simple dice games, and it sits next to the midway games covered in [carnival games](/guides/carnival-games). Where money is involved, it is an 18+ game (or your local legal age).`,
    },
    {
      id: "rules",
      title: "Rules and payouts",
      body: `The layout shows the numbers 1 to 6. The round runs like this:

1. Players place chips on one or more numbers.
2. The operator spins the cage and lets the three dice settle.
3. For each number, count how many dice show it.
4. Bets on numbers that appear are paid by the count; bets on numbers that miss are taken.

| Dice showing your number | Standard payout | Net on a $1 bet |
| --- | --- | --- |
| None | Lose | −$1 |
| One | 1 to 1 | +$1 |
| Two | 2 to 1 | +$2 |
| Three | 3 to 1 | +$3 |

You get your stake back on any win, plus the payout. A $5 bet on 4 with a roll of 4, 4, 2 returns $15: your $5 plus $10 in winnings.

### Extra bets on some layouts

Some cages and cloths add bets borrowed from sic bo: high (total 11 to 17) or low (4 to 10), a specific triple, or any triple. These are house options rather than part of the classic game, so check the posted pays before you bet. The next sections price them.`,
    },
    {
      id: "math",
      title: "The maths: where 7.87% comes from",
      body: `Pick a number, say 6. Each die shows 6 with probability 1/6 and misses with probability 5/6, and the dice are independent. Count how many of the 216 outcomes give zero, one, two or three sixes:

| Sixes showing | Ways out of 216 | Probability | Net result on $1 |
| --- | --- | --- | --- |
| 0 | 5 × 5 × 5 = 125 | 57.87% | −$1 |
| 1 | 3 × 1 × 5 × 5 = 75 | 34.72% | +$1 |
| 2 | 3 × 1 × 1 × 5 = 15 | 6.94% | +$2 |
| 3 | 1 | 0.46% | +$3 |

Expected value per $1:

EV = (75 × 1 + 15 × 2 + 1 × 3 − 125 × 1) / 216 = (75 + 30 + 3 − 125) / 216 = −17/216 ≈ −0.0787.

So the house edge is about 7.87%. Over 1,000 one-dollar bets you should expect to lose about $79, give or take a lot of variance. For comparison, single-zero roulette's even-money bets carry 2.70%. The general method is laid out in [how to calculate house edge](/guides/how-to-calculate-house-edge), and [house edge](/guides/house-edge) compares figures across games.

### Win rate versus edge

You win something on 91 of 216 spins, 42.1% of the time. That feels close to a coin flip, and the occasional 2 to 1 or 3 to 1 hit reinforces the feeling. The 57.9% of spins where you lose a full unit are what the payouts fail to cover.`,
    },
    {
      id: "illusion",
      title: "Why it looks fair, and the six-player proof",
      body: `The trap in chuck a luck is a tempting piece of bad arithmetic: "There are three dice and six numbers, so my number has a 3/6 = 50% chance, and I am paid even money, so the game is fair, and the multi-dice wins are a bonus." The mistake is adding probabilities that overlap. Three dice do not give three separate chances at a single hit; sometimes two or three dice land on the same number, which uses up chances without paying extra at the right rate.

The cleanest way to see the edge is to put $1 on every number and watch the operator's cash.

| Roll type | Example | Ways out of 216 | Operator's net |
| --- | --- | --- | --- |
| Three different numbers | 1, 4, 6 | 120 | Pays 3 × $1, collects 3 × $1: $0 |
| A pair and a single | 2, 2, 5 | 90 | Pays $2 + $1, collects $4: +$1 |
| A triple | 3, 3, 3 | 6 | Pays $3, collects $5: +$2 |

The operator never loses on that spin. Expected profit per spin = (0 × 120 + 1 × 90 + 2 × 6) / 216 = 102/216 on $6 wagered, which is exactly 17/216 per dollar again. When numbers match, the operator saves money; that saving is the edge.

This is also why "cover every number" and "bet the number that is due" do not help. Each spin is independent, and [the gambler's fallacy](/guides/gamblers-fallacy) explains why a number that has not appeared for ten spins is no more likely on the eleventh.`,
    },
    {
      id: "session",
      title: "What 7.87% means over a night of spins",
      body: `An edge is an average. On any single spin you either lose $1 or win $1 to $3, so short sessions swing widely. The spread is easy to estimate.

For a $1 single-number bet, the average squared result is (125 × 1 + 75 × 1 + 15 × 4 + 1 × 9) / 216 = 269/216 ≈ 1.245. Subtract the squared mean (0.0787² ≈ 0.006) and the variance is about 1.239, so the standard deviation of one bet is about $1.11.

| Number of $1 bets | Expected result | Typical swing (one standard deviation) | Rough chance of being ahead |
| --- | --- | --- | --- |
| 10 | −$0.79 | ±$3.52 | a bit under half |
| 100 | −$7.87 | ±$11.13 | about 1 in 4 |
| 1,000 | −$78.70 | ±$35.20 | about 1 in 80 |

The swing grows with the square root of the number of bets, while the expected loss grows in a straight line. That is why a player can walk away from a fair-day cage a winner, and why the cage makes money over a season. The idea is the [law of large numbers](/guides/law-of-large-numbers-gambling) at work, and [variance in gambling](/guides/variance-in-gambling) covers the swing side.

### For a fundraiser

If you run a charity cage, the edge is your margin. Taking $1,000 in bets over an evening at standard pays should leave roughly $79 in the cash box, though a run of triples can wipe out a small float. Keep the float large enough to pay a few 3 to 1 wins in a row.`,
    },
    {
      id: "variants",
      title: "Payout variants, side bets and sic bo",
      body: `Small changes to the triple payout move the edge a lot, because the triple is where the game underpays most.

| Pays for one / two / three matches | Expected value per $1 | House edge |
| --- | --- | --- |
| 1 / 2 / 3 (standard) | −17/216 | 7.87% |
| 1 / 2 / 10 | −10/216 | 4.63% |
| 1 / 2 / 12 | −8/216 | 3.70% |
| 1 / 1 / 1 (any match pays even money) | −34/216 | 15.74% |

The last row is worth knowing: some fundraiser cloths simplify payouts to "even money if your number shows". That doubles the edge.

### Side bets borrowed from sic bo

- **High or low (even money, triples lose):** 105 winning outcomes out of 216, so the edge is 6/216 ≈ 2.78%. This is the best bet on any layout that offers it.
- **Any triple:** 6 outcomes in 216. At 30 to 1, EV = (30 × 6 − 210) / 216 ≈ −13.9%.
- **A specific triple:** 1 outcome in 216. At 180 to 1 the edge is about 16.2%; at 150 to 1 it is about 30.1%.

When a cage game posts unfamiliar pays, the quick test is always the same: multiply each payout by its number of ways, subtract the losing ways, divide by 216.

### Chuck a luck, sic bo and crown and anchor

These three games share one engine: three dice and a bet on how many show a chosen face.

- **Crown and anchor** swaps numbers for six symbols. The standard 1, 2, 3 payouts and 7.87% edge carry over unchanged.
- **Sic bo** is the casino version, with a large layout, a shaker or automated dice, and dozens of bets. Its single-number bet is chuck a luck under another name, with 1, 2 and 3 to 1 pays on most tables. The other sic bo bets range from about 2.8% on big and small to well over 15% on specific triples and some totals.
- **Grand hazard** was the older banking game from which chuck a luck is usually said to descend.

If sic bo is your next stop, [sic bo online](/guides/sic-bo-online) covers the table and [sic bo strategy](/guides/sic-bo-strategy) ranks its bets from least bad to worst. For the two-dice ancestor of craps, see [hazard](/guides/hazard-dice-game), and for how three-dice totals are counted in general, [dice roll probability](/guides/dice-roll-probability).`,
    },
    {
      id: "pvp",
      title: "Chuck a luck next to a hashed PvP round",
      body: `Chuck a luck is a useful yardstick. Its 7.87% edge is a little higher than the 7.88% Purple or Silver on PVPspinArena's Roulette, where a 33-slot wheel has 16 Purple and 16 Silver slots paying 2x and 1 Green slot paying 14x. Every Roulette bet returns 32/33 ≈ 96.97%, the same maths applied to a different layout: count the winning outcomes, multiply by the pay, compare with the stake.

The other two PVPspinArena games are player-vs-player. In [Coinflip](/coinflip), two players take opposite sides of a 50/50, and in Jackpot, your chance equals your share of the pot. In both, the winner takes the pot minus any fee shown before entry.

The birdcage exists so players can see the dice move. Online, the equivalent is a commit-reveal record: each result comes from seeds committed before the round, and any settled round can be recomputed on the [fairness](/fairness) page. That tells you the result was not changed. It does not change the edge, and neither does any betting system. Set a budget first, and use the [responsible gambling](/responsible-gambling) tools if a fair-day game starts to feel like a chase.

In the same cluster, see also [farkle rules](/guides/farkle-rules) and [yahtzee rules](/guides/yahtzee-rules).

See also [horse race dice](/guides/horse-race-dice-game).`,
    },
  ],
  faqs: [
    {
      q: "What is the house edge in chuck a luck?",
      a: "With the standard 1, 2 and 3 to 1 payouts, the house edge is 17/216, about 7.87%. You lose about 7.9 cents per dollar bet on average.",
    },
    {
      q: "Is chuck a luck a fair game?",
      a: "No. It looks fair because three dice and six numbers suggest a 50% chance, but your number shows at least once only 42.1% of the time, and the payouts do not make up the gap.",
    },
    {
      q: "What is the difference between chuck a luck and sic bo?",
      a: "Chuck a luck offers mainly the single-number bet. Sic bo uses the same three dice but adds totals, combinations and triples. Sic bo's single-number bet is essentially chuck a luck.",
    },
    {
      q: "Why is chuck a luck called birdcage?",
      a: "The dice are spun inside an hourglass-shaped wire cage that resembles a birdcage. Turning it end over end tumbles the dice and shows them openly to all players.",
    },
    {
      q: "What is the best bet in chuck a luck?",
      a: "If the layout offers high or low at even money with triples losing, that bet has about a 2.78% edge. The standard single-number bet carries 7.87%.",
    },
  ],
  sources: [
    { label: "Wikipedia: Chuck-a-luck", url: "https://en.wikipedia.org/wiki/Chuck-a-luck" },
    { label: "Wikipedia: Crown and anchor", url: "https://en.wikipedia.org/wiki/Crown_and_anchor" },
    { label: "Wizard of Odds: Sic Bo", url: "https://wizardofodds.com/games/sic-bo/" },
  ],
  related: [
    "sic-bo-strategy",
    "sic-bo-online",
    "hazard-dice-game",
    "carnival-games",
    "cee-lo-rules",
    "house-edge",
    "farkle-rules",
    "yahtzee-rules",
    "horse-race-dice-game",
  ],
  updated: "2026-09-27",
};
