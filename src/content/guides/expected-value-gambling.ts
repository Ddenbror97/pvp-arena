import type { Guide } from "./types";

export const guide: Guide = {
  slug: "expected-value-gambling",
  cluster: "Games & odds",
  keyword: "expected value gambling",
  secondary: ["expected value", "plus ev", "ev betting", "negative expected value"],
  title: "Expected Value Gambling: How to Price a Bet",
  description:
    "Expected value gambling: the EV formula, plus-EV versus minus-EV, worked casino examples, and why a good process still loses in a short sample.",
  h1: "Expected value gambling: how to price a bet before you stake",
  answer:
    "Expected value gambling is the habit of pricing a bet before the stake goes down. EV is probability-weighted profit: sum of (probability × net result) over every outcome. Plus-EV means the price is better than the real risk; minus-EV means the house or the fee is charging you. A correct EV still loses in a short sample because variance dominates small n. Process is the formula plus a budget, not a promise of a winning night.",
  facts: [
    "EV per $1 staked = (p × payout) − 1 when a miss loses the whole stake.",
    "Plus-EV is a positive number; minus-EV is a negative number; 0-EV is a fair game.",
    "House edge is minus-EV expressed as a percentage of the stake.",
    "A good EV process can still finish a session down; that is sample size, not a broken formula.",
    "PvP pots with a 0% fee are about 0-EV between players; Purple and Silver are about −3% before the win fee, and Green is about −58%.",
  ],
  sections: [
    {
      id: "formula",
      title: "The EV formula",
      body: `Expected value is the mean result of a bet if you could repeat it under the same rules forever. For a simple win-or-lose stake:

EV = p × (payout − 1) × stake − (1 − p) × stake

which rearranges to:

EV = (p × payout − 1) × stake

Payout here is the total multiplier (decimal odds). A 2x bet that wins with probability p has EV = (2p − 1) × stake. That expression is also the even-money Kelly fraction times the stake, which is why [Kelly](/guides/kelly-criterion) and EV are cousins.

If there are more than two outcomes, add a term for each. The idea does not change: weight every dollar path by its probability.

### Three-outcome sketch

Suppose a novelty bet returns $0 with probability 0.70, $2 with probability 0.25, and $10 with probability 0.05, all per $1 stake (the $2 and $10 figures are total return). EV = 0.70×0 + 0.25×2 + 0.05×10 − 1 = 0.50 + 0.50 − 1 = $0. Same RTP 100% as a fair coin, much lumpier. Expected value gambling does not require a two-outcome world. It requires a complete list.

This page lives in the [Games and odds topic](/guides/topics/games-and-odds). You will need a true p (count slots or pockets) and a posted payout. [Implied probability](/guides/implied-probability) is 1/payout; EV is what you get when p and 1/payout disagree. PVPspinArena is 18+.`,
    },
    {
      id: "plus-minus",
      title: "Plus-EV versus minus-EV",
      body: `**Plus-EV** means the average dollar result is greater than zero. You still lose some bets. You have a price worth taking if your p is right and you can survive the variance.

**Minus-EV** means the average dollar result is less than zero. You still win some bets. Winning a minus-EV bet is not evidence the bet was plus. It is a sample of one.

**Zero-EV** means a fair price. A 0% fee coinflip between two players is the usual example. The group does not leak money to a banker. Each player’s EV is about $0 before anyone talks about fun or time.

### What EV is not

- It is not the most likely session result. The mode can be a loss even when EV is only slightly negative.
- It is not a guarantee after “enough” wins. Enough trials make the *average* show; they also apply the edge more times.
- It is not a moral score. A minus-EV ticket can be a cheap night if you priced it and budgeted it. It is a bad investment if you thought it was plus.

Casinos live on minus-EV inventory. That is the product. [House edge](/guides/house-edge) is the catalogue name for the same leak.`,
    },
    {
      id: "worked",
      title: "Worked casino examples",
      body: `All figures are EV per $1 staked.

| Bet | p | Payout | p × payout | EV | Label |
| --- | --- | --- | --- | --- | --- |
| Fair coin, 0% fee | 0.50 | 2.00 | 1.00 | $0 | 0-EV |
| European red | 18/37 | 2.00 | 0.9730 | −$0.0270 | minus-EV |
| American red | 18/38 | 2.00 | 0.9474 | −$0.0526 | minus-EV |
| Purple | 16/33 | 2.00 | 0.9697 | −$0.0303 | minus-EV |
| Green | 1/33 | 14.00 | 0.4242 | −$0.5758 | minus-EV |
| Hypothetical mispriced coin | 0.55 | 2.00 | 1.10 | +$0.10 | plus-EV |

### Purple in dollars

Stake $5 on Purple. EV = −0.0303 × $5 ≈ −$0.15 per spin before the win fee. After 60 spins the expected cost is about $9, on $300 turned over, not on the $5 chip. You might be +$40 or −$150. The −$9 is the centre.

### Green in dollars

EV = −0.5758 × $5 ≈ −$2.88 per spin before the win fee. The path is a pile of −$5 results and a rare +$65 (14 × 5 − 5 = 65 profit, or $70 back including stake). Do not confuse a large multiplier with plus-EV.

Count the slots on [Roulette](/roulette) and repeat p × payout before you credit a “feeling”.

### Mixing two colours

$3 on Purple and $1 on Green in the same round is not a hedge that creates plus-EV. EV = 3×(−0.0303) + 1×(−0.5758) ≈ −$0.67 before the win fee. Green is much more expensive per dollar than Purple. If Purple hits you get $6 back on that colour and lose the $1 Green; if Green hits you get $14 and lose $3. The paths differ; the mean does not improve. A hedge that paid a fair complement would be a different price, and this wheel does not sell one.`,
    },
    {
      id: "pvp",
      title: "EV on Jackpot, Coinflip and fees",
      body: `### Coinflip

Two equal stakes, one winner, default 0% house fee. Each player’s EV ≈ $0. The site is not the counterparty. You can verify the winner on [fairness](/fairness). A 5% fee on the pot would make EV ≈ −5% of your stake, because only 95% of the combined money comes back to the winner.

Try the live rooms on [Coinflip](/coinflip) as a rules demo, not as a plus-EV hunt.

### Jackpot

Your ticket is your share of the pot. With no fee, winning pays the pot, so EV ≈ $0: you pay $s for a s/P chance at $P. With a fee f, you pay $s for a s/P chance at (1−f)P, so EV ≈ −f × s. A small ticket in a large pot is still about 0-EV or minus-fee-EV; it is not a cheap lottery ticket with a hidden plus. Watch a pot on [Jackpot](/).

### Roulette

House-banked. EV is about −3.03% of a Purple or Silver stake before the win fee, and about −57.6% on Green. No matching opponent can cancel that. The banker is the paytable.`,
    },
    {
      id: "sample",
      title: "Why a good process still loses in a short sample",
      body: `EV is a mean. A session is a draw from a wide distribution around that mean. [Variance in gambling](/guides/variance-in-gambling) is the width.

### A small-n sketch

Sixty $1 Purple bets have expected total EV ≈ −$4. The standard deviation of a single even-money-like bet is on the order of $1. The session standard deviation is on the order of √60 ≈ $8. Finishing −$20 or +$10 is routine. Finishing near −$4 is not a special achievement; finishing +$80 is a tail, not a new edge.

### Process versus outcome

A good process:

- writes p and payout before the click;
- refuses to call a minus-EV colour plus because the last five hit;
- sizes the stake from a budget, not from the last result;
- stops when the budget says stop.

That process will still print losing sessions, because most of the probability mass on a minus-EV, moderate-n path is not a profit. Judging the process by one evening is the error EV is meant to prevent.

### What would change the verdict

A different p (you counted wrong), a different payout (a fee appeared), or dependence you ignored. A streak does not change p on an independent wheel.

### How long until the mean is “visible”

A rough rule: you want the expected loss to be larger than the session standard deviation before you treat a result as evidence about EV. For even-money-like $1 Purple, EV per bet ≈ −$0.067 and sd per bet is on the order of $1. You need n such that 0.067n > √n, so √n > 1/0.067, n > about 220. Two hundred bets is a long hobby session and still only a mild signal. Twenty bets are theatre. This is why a good process “still loses”: most nights never reach the n where the mean would dominate the argument.`,
    },
    {
      id: "before-stake",
      title: "Price the bet before you stake",
      body: `Do this on paper or in your head. It takes less than thirty seconds on a simple game.

1. **Write the payout as a decimal.** 2x is 2.00.
2. **Write p from the rules.** 16/33, 18/37, 1/2, stake/pot.
3. **Multiply.** If p × payout < 1, the bet is minus-EV.
4. **Convert to dollars.** Multiply by the stake you actually plan to put down, then by the number of times you plan to repeat it. That is the expected session cost.
5. **Ask whether the entertainment is worth that cost.** If no, do not buy it. If yes, cap the loss so a tail cannot take next month’s rent.

If you cannot complete step 2, you do not have a price. Slots with hidden states are in that bucket unless you trust a published RTP and accept that your n will not match it. Simple wheels are not in that bucket.

Expected value gambling is this checklist. It is not a slogan on a Discord call. It will not make Purple plus. It will stop you from describing Purple as plus.

A jackpot cash figure after withholding is a different worksheet. The [lottery calculator](/guides/lottery-calculator) prices the ticket, not a table edge. A brokerage screen is not that ticket either, and [is day trading gambling](/guides/is-day-trading-gambling) keeps the two apart.`,
    },
    {
      id: "limits",
      title: "What EV cannot fix",
      body: `EV cannot:

- turn Purple's 96.97% return into a growth strategy;
- tell you which next colour hits;
- protect a bankroll if you ignore the dollar conversion and keep raising;
- replace [responsible](/responsible-gambling) limits when play is no longer entertainment.

EV can:

- rank two bets by cost per dollar;
- show that Green costs far more per dollar than Purple;
- show that a 0% fee flip is a different product from a house colour;
- explain why a correct analysis lost money this week.

If you want the percentage catalogue name, use house edge. If you want the ride, use variance. If you want a growth fraction on a rare plus-EV price, use Kelly. For everything on this site that pays 2x on fewer than half the slots, the EV number is negative and the decision is budget versus boredom, not edge versus market.

Write EV on a sticky note as dollars per hour at your actual pace. Forty $2 Purples an hour is $80 turned over and about $2.42 expected cost before the win fee. That is the price of the hour. If the hour is not worth $2.42 plus the chance of a worse tail, skip it. Expected value gambling is that sentence, repeated until it sticks. If you cannot name the hourly cost, you are not pricing the bet. You are hoping. Hope is not a term in the sum. Write the cost.

The [St. Petersburg paradox](/guides/st-petersburg-paradox) is the famous case where expected value is infinite and still not a bet you should take.

Expected value is a mean; the [law of large numbers](/guides/law-of-large-numbers-gambling) is why that mean shows up only after volume.`,
    },
  ],
  faqs: [
    {
      q: "What is expected value in gambling?",
      a: "The probability-weighted average profit of a bet. For a single-win multiplier, EV = (p × payout − 1) × stake. A negative result means the bet costs money on average.",
    },
    {
      q: "What does plus-EV mean?",
      a: "The price is better than the real risk, so the average dollar result is positive. You can still lose the bet. Standard casino colours are minus-EV, not plus-EV.",
    },
    {
      q: "Is a 14x Green plus-EV because the payout is large?",
      a: "No. Green’s p × 14 equals Purple’s p × 2 on the 33-slot wheel: 0.9697 and 0.4242 before the win fee. Large multipliers can be minus-EV. Always multiply, never admire the x.",
    },
    {
      q: "Why did I lose if my EV math was right?",
      a: "Because a session is a small sample. Variance around a negative mean produces many losing nights. The formula describes the centre, not tonight’s draw.",
    },
    {
      q: "Are PVPspinArena PvP games plus-EV?",
      a: "No. With a 0% fee they are about 0-EV between players. You can win a pot and still have no long-run edge over other players as a class.",
    },
    {
      q: "How do I use EV before I bet?",
      a: "Write true p and the decimal payout, multiply, subtract 1, then multiply by stake and planned repeats. If you dislike that expected cost, skip the bet.",
    },
  ],
  sources: [
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    { label: "Wizard of Odds: house edge", url: "https://wizardofodds.com/gambling/house-edge/" },
    {
      label: "Wikipedia: House advantage",
      url: "https://en.wikipedia.org/wiki/Casino_game#House_advantage",
    },
  ],
  related: [
    "crypto-jackpot",
    "variance-in-gambling",
    "odds-converter",
    "implied-probability",
    "progressive-jackpot-odds",
    "st-petersburg-paradox",
    "law-of-large-numbers-gambling",
  ],
  updated: "2026-09-26",
};
