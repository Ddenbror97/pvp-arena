import type { Guide } from "./types";

export const guide: Guide = {
  slug: "risk-of-ruin",
  cluster: "Games & odds",
  keyword: "risk of ruin",
  secondary: [
    "risk of ruin formula",
    "gambler's ruin",
    "gamblers ruin problem",
    "risk of ruin gambling",
  ],
  title: "Risk of Ruin: The Gambler's Ruin Formula Explained",
  description:
    "Risk of ruin explained: the gambler's ruin formula, worked roulette and coin flip numbers, positive-edge ruin, bet sizing and why bold play beats timid play.",
  h1: "Risk of ruin: the formula, worked numbers and what it means",
  answer:
    "Risk of ruin is the probability that you lose your whole bankroll before reaching a goal, or ever, given your edge, the variance of each bet and your bankroll measured in betting units. On a negative-edge game the risk of eventual ruin is 100% if you keep playing. On a positive-edge game it falls exponentially as the bankroll grows in units.",
  facts: [
    "The gambler's ruin problem goes back to a 1656 letter from Blaise Pascal to Pierre de Fermat, and Christiaan Huygens included it in his 1657 book on probability.",
    "On a fair coin, betting 1 unit at a time from i units towards a target of N, the risk of ruin is exactly 1 − i/N.",
    "Flat-betting 1 unit on a 16/33 shot, a 10-unit bankroll has about a 79% chance of going broke before doubling. A 50-unit bankroll has about 99.9%.",
    "With a positive edge and no target, risk of ruin is (q/p) raised to the bankroll in units. Doubling the bankroll squares it.",
    "On a negative-edge game, the best chance of reaching a fixed target comes from betting boldly, not in small units.",
  ],
  sections: [
    {
      id: "definition",
      title: "What risk of ruin means",
      body: `Risk of ruin (often shortened to RoR) answers one question: if I keep making this bet, at this size, how likely am I to lose everything I set aside for it?

"Everything" means the bankroll you have dedicated to the activity, not your life savings, although for some gamblers those end up being the same thing. "Ruin" is reaching zero, or reaching a level where you can no longer place the next bet.

Three inputs drive the answer.

1. **Edge per bet.** Positive, zero or negative expected value per unit staked.
2. **Variance per bet.** How widely each result can swing. A 14x long shot swings much more than an even-money bet with the same edge.
3. **Bankroll in units.** Not dollars, but how many bets of your chosen size the bankroll covers. $1,000 at $10 a bet is 100 units; the same $1,000 at $100 a bet is 10 units.

A fourth input, the **goal**, turns the question into a race: will you hit the target before you hit zero? Without a goal, the question becomes whether you ever go broke over an unlimited number of bets.

This page covers the mathematics. To size a real session budget with your own numbers, use the [bankroll calculator](/guides/bankroll-calculator). For blackjack-specific ruin figures from simulations, the [blackjack simulator](/guides/blackjack-simulator) guide keeps those.`,
    },
    {
      id: "formula",
      title: "The gambler's ruin formula",
      body: `The classic model has you start with i units and bet 1 unit at a time on an even-money bet. You win each bet with probability p and lose with probability q = 1 − p. You stop at 0 (ruin) or at N (target).

The problem is old. The earliest known mention is in a 1656 letter from Blaise Pascal to Pierre de Fermat, and Christiaan Huygens included a version in his 1657 treatise on games of chance, one of the first printed books on probability.

### Fair game (p = q = 1/2)

**P(ruin) = 1 − i / N**

Start with 10 units and aim for 20, and your risk of ruin is 50%. Aim for 11 and it is 1 − 10/11 ≈ 9.1%. Aim for 100 and it is 90%. On a fair game, ruin probability depends only on how far the target is compared with your bankroll.

### Unfair game (p ≠ q)

Let r = q / p. Then:

**P(ruin) = (rⁱ − rᴺ) / (1 − rᴺ)**

### No target, playing forever

- If p ≤ q (fair or negative edge), ruin is **certain**: P(ruin) = 1.
- If p > q (positive edge), **P(ruin) = (q / p)ⁱ**.

The fair case being certain ruin surprises people. A fair random walk eventually visits every level, including zero. The only escape is a finite goal or finite time.

### Beyond even money

For bets with other payouts, a widely used approximation is **RoR ≈ exp(−2 × μ × B / σ²)**, where μ is the edge per unit bet, σ² is the variance per unit bet and B is the bankroll in units. It only applies when μ is positive. For an even-money bet with a 2% edge it gives almost exactly the same answers as the exact formula.`,
    },
    {
      id: "worked",
      title: "Worked numbers on a negative-edge bet",
      body: `Take an even-money bet that wins with probability 16/33 ≈ 48.48%, such as Purple on a 33-slot wheel paying 2x. The edge is −1/33 ≈ −3.03%, and r = q/p = (17/33)/(16/33) = 17/16.

### Trying to double a bankroll with 1-unit bets

| Starting units (i) | Target (N) | Risk of ruin at 16/33 | Risk of ruin on a fair coin |
| --- | --- | --- | --- |
| 5 | 10 | 57.5% | 50% |
| 10 | 20 | 64.7% | 50% |
| 20 | 40 | 77.1% | 50% |
| 50 | 100 | 95.4% | 50% |

On a fair coin the chance of doubling never changes. On a negative-edge bet it collapses as the number of steps grows, because more steps give the edge more time to work. Taking 50 small steps towards a goal means 50 units of negative drift to fight through.

### Small targets with a big bankroll

Start with 100 units and aim to finish 10 units ahead. On a fair coin the risk of ruin is 1 − 100/110 ≈ 9.1%. At 16/33 it is about 45.5%. Being 90 units away from ruin and only 10 from the goal is not enough protection when every step drifts the wrong way.

### Chance of ever being ahead

With unlimited bankroll on the 16/33 bet, the chance of **ever** reaching +k units is (p/q)ᵏ = (16/17)ᵏ.

| Ever up by | Probability |
| --- | --- |
| 1 unit | 94.1% |
| 5 units | 73.9% |
| 10 units | 54.5% |
| 20 units | 29.7% |

No bankroll, however large, improves on those numbers. They are a ceiling set by the edge alone.`,
    },
    {
      id: "positive",
      title: "Risk of ruin with a positive edge",
      body: `A positive edge changes the question from "when" to "whether". With p > q and no target, the risk of ever going broke is (q/p) raised to the bankroll in units.

Suppose a bettor has a genuine 2% edge on an even-money proposition: p = 0.51, q = 0.49.

| Bankroll in units | Risk of ruin, ever |
| --- | --- |
| 20 | 44.9% |
| 50 | 13.5% |
| 100 | 1.8% |

Two patterns stand out.

- **Even a real edge can go broke.** With 20 units, a 2% edge still loses everything nearly half the time. Variance does not care that you are right on average.
- **Doubling the bankroll squares the risk.** 13.5% at 50 units becomes 0.135² ≈ 1.8% at 100 units, because (q/p)¹⁰⁰ = ((q/p)⁵⁰)². The same effect comes from halving your bet size.

### Higher-variance bets need more units

The approximation exp(−2μB/σ²) shows why variance matters as much as edge. Take a hypothetical game with a 1% edge and a standard deviation of 1.15 units per bet, a figure in the range often quoted for blackjack hands. With 100 units, RoR ≈ exp(−2 × 0.01 × 100 / 1.3225) ≈ 22%. With 300 units it drops to about 1%.

### Proportional betting avoids ruin in theory

If you bet a fixed fraction of your current bankroll instead of a fixed amount, you can never technically reach zero, because each bet shrinks as the bankroll shrinks. That is the idea behind the [Kelly criterion](/guides/kelly-criterion). In practice minimum bet sizes, and the pain of a bankroll shrinking towards nothing, bring back a practical version of ruin.`,
    },
    {
      id: "bold-play",
      title: "Bold play versus timid play",
      body: `If the edge is against you and you need to reach a specific target, the ruin formula points to an unexpected conclusion: bet big.

Say you have 50 units and must reach 100. Betting 1 unit at a time on the 16/33 bet gives a 0.13% chance of success. Betting all 50 units once gives 48.48%. Betting 25 units at a time wins twice in a row with probability (16/33)² ≈ 21.8%; a win and a loss returns you to 50 units to try again, and counting those repeats the overall chance is p² / (1 − 2pq) ≈ 43.4%. That is slightly below all-in but hundreds of times better than timid play.

Lester Dubins and Leonard Savage formalised this in their 1965 book *How to Gamble If You Must*: in a sub-fair casino with a fixed goal, bold play (staking as much as needed to reach the goal, or everything you have if less) maximises the probability of reaching it.

This is not a recommendation. It is a statement about a narrow problem: one fixed target, a negative edge, and nothing else you care about. Most people gamble for entertainment over time, which is the opposite problem, and for that goal small bets make the budget last. The lesson for everyone is the same, though. Small bets on a negative edge do not reduce the cost. They spread it over more rounds. The expected loss is always the edge times the total amount wagered, as [house edge](/guides/house-edge) explains.

### Progressions and ruin

Doubling systems such as the [Martingale strategy](/guides/martingale-strategy) look like they lower risk because most sessions end with a small win. What they actually do is concentrate risk into rare, large losses that reach ruin quickly. A constant stake, covered in [flat betting](/guides/flat-betting), makes the risk easier to see and to budget.

The story of [Archie Karas](/guides/archie-karas), who reportedly ran a small stake into a fortune and then lost it, is often retold as a risk-of-ruin lesson: at a negative edge, a bankroll that keeps playing keeps being exposed.`,
    },
    {
      id: "pvpspinarena",
      title: "Risk of ruin on PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on Base, and the ruin maths maps onto each one.

- **[Roulette](/roulette):** Purple and Silver are the 16/33 bet used in the tables above. Green pays 14x on 1 slot in 15, with different edges: about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee but far higher variance, so a bankroll of Green bets reaches ruin with bigger swings along the way.
- **[Coinflip](/coinflip):** two players on a 50/50. With no fee it is the fair-coin column, where risk of ruin is 1 − i/N. Any fee shown before entry pulls the numbers towards the negative-edge column.
- **[Jackpot](/):** your win chance equals your share of the pot. Small shares are long shots, which behave like high-variance bets: long losing runs are normal.

Every result comes from committed seeds and can be checked on [fairness](/fairness). Fair draws are what make the formulas on this page reliable.

The practical move is to decide your ruin level before you start: the amount you are prepared to lose in a session, measured in bets. If that number is small, your risk of hitting it is high, and that is fine as long as it is money set aside for entertainment. Deposit limits and breaks are on [responsible gambling](/responsible-gambling). Play is 18+. More systems and odds guides sit in the [games and odds topic](/guides/topics/games-and-odds).

In the same cluster, see also [labouchere system](/guides/labouchere-system).`,
    },
  ],
  faqs: [
    {
      q: "What is risk of ruin in gambling?",
      a: "It is the probability of losing your entire bankroll before reaching a goal, or at all, given your edge, the variance of your bets and how many bets your bankroll covers.",
    },
    {
      q: "What is the gambler's ruin formula?",
      a: "Betting 1 unit at a time from i units towards N, with win chance p and r = q/p, P(ruin) = (rⁱ − rᴺ)/(1 − rᴺ). On a fair coin it simplifies to 1 − i/N.",
    },
    {
      q: "Can you avoid risk of ruin with a big enough bankroll?",
      a: "Only with a positive edge. With a negative or zero edge and no stopping point, ruin is certain eventually. A bigger bankroll only delays it.",
    },
    {
      q: "How do I lower my risk of ruin?",
      a: "Bet smaller relative to your bankroll, choose lower-variance bets and set a stopping point. With a positive edge, halving your bet size squares your risk of ruin, which is a large reduction.",
    },
    {
      q: "Is bold play really better than small bets?",
      a: "Only for reaching one fixed target on a negative-edge game. For entertainment over time, small bets make a budget last longer, but the expected loss is still the edge times the total amount wagered.",
    },
  ],
  sources: [
    { label: "Wikipedia: Gambler's ruin", url: "https://en.wikipedia.org/wiki/Gambler%27s_ruin" },
    { label: "Wikipedia: Risk of ruin", url: "https://en.wikipedia.org/wiki/Risk_of_ruin" },
    { label: "Wikipedia: Random walk", url: "https://en.wikipedia.org/wiki/Random_walk" },
  ],
  related: [
    "labouchere-system",
    "flat-betting",
    "bankroll-calculator",
    "kelly-criterion",
    "martingale-strategy",
    "variance-in-gambling",
  ],
  updated: "2026-09-27",
};
