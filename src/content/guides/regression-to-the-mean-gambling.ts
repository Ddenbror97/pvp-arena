import type { Guide } from "./types";

export const guide: Guide = {
  slug: "regression-to-the-mean-gambling",
  cluster: "Casino knowledge",
  keyword: "regression to the mean",
  secondary: [
    "regression toward the mean",
    "regression to the mean gambling",
    "regression to the mean sports",
    "hot streak regression",
  ],
  title: "Regression to the Mean: Streaks, Hot Tables and Form",
  description:
    "Regression to the mean explained for gamblers: why extreme streaks look average next time, hot tables, sports form, and how to discount a lucky record.",
  h1: "Regression to the mean: why hot streaks cool off",
  answer:
    "Regression to the mean is the tendency for an extreme result to be followed by a less extreme one, simply because the extreme result was partly luck. Nothing pushes it back. A hot table, a tipster's great month or a team's 10–2 start usually looks more ordinary next time because the lucky part does not repeat, while any real skill does.",
  facts: [
    "Francis Galton described the effect in 1886 while studying the heights of parents and their adult children.",
    "The expected next result is the long-run mean plus r times the distance of the observed result from it, where r is how much of the result is repeatable.",
    "In pure-chance games such as roulette, r is zero: the next result is expected to be exactly average.",
    "Regression does not mean results swing below average to compensate. That is the gambler's fallacy.",
    "The smaller the sample, the more a record should be pulled back towards average before you trust it.",
  ],
  sections: [
    {
      id: "what",
      title: "What regression to the mean is",
      body: `Any measured result is a mix of two things: a stable part that would show up again, and a random part that would not. Call the stable part skill, true rate or quality. Call the random part luck. When a result is far from average, it is usually far from average for both reasons at once, because that is the easiest way to land in the tail.

Measure again and the stable part carries over. The luck is drawn fresh, and fresh luck is on average zero. So the second result is expected to sit closer to the average than the first. That is regression to the mean.

Francis Galton named it in 1886 when he noticed that very tall parents tended to have children who were tall, but less extremely tall than the parents, and very short parents had children who were short but closer to the average. He first called it "regression towards mediocrity". Nothing in heredity pulls children towards the average. The parents' extreme heights included a component that is not passed on.

### The formula

If μ is the long-run average and r (between 0 and 1) is the share of the variation that is repeatable, then:

**Expected next result = μ + r × (observed result − μ)**

- r = 1: results are all skill; no regression.
- r = 0: results are all luck; full regression to μ.
- In between: partial regression. Most of real life, including sports and poker, lives here.

The value of r is not a fixed property of a game. It rises with sample size, because luck averages out over more trials while skill does not. That is the [law of large numbers](/guides/law-of-large-numbers-gambling) at work inside a single record.`,
    },
    {
      id: "not-fallacy",
      title: "Regression is not the gambler's fallacy",
      body: `These two ideas get mixed up constantly, and the difference matters for money.

- **Gambler's fallacy:** after a run of one outcome, the opposite is now more likely, so the results will balance out. This is false for independent events. The [gambler's fallacy](/guides/gamblers-fallacy) guide covers the independence mistake.
- **Regression to the mean:** after an extreme run, the next run is expected to be ordinary, not opposite. The earlier extreme is not cancelled.

A worked example on a 33-slot wheel with 16 Purple slots, where each spin is Purple with probability 16/33 ≈ 48.5%.

You watch 10 spins and see 8 Purple, an 80% rate.

| Belief | Expected Purples in the next 10 spins | Expected 20-spin rate |
| --- | --- | --- |
| Hot-hand ("Purple is running") | More than 4.85 | Above 64% |
| Gambler's fallacy ("Silver is due") | Fewer than 4.85 | Below 64% |
| Regression to the mean (correct) | Exactly 4.85 | (8 + 4.85) / 20 ≈ 64% |

The correct row still expects the 20-spin rate to be well above 48.5%, because the first 8 Purples happened and nothing undoes them. What regresses is the next batch, which is expected to be average. Over 1,000 spins the same early excess is diluted to a rate of about 48.8%.

So regression predicts that hot streaks cool, not that they reverse. If someone tells you a cold slot is about to pay because of regression to the mean, they are describing the gambler's fallacy with a better-sounding name.`,
    },
    {
      id: "casino",
      title: "Hot tables, hot machines and hot players",
      body: `In house-banked games of pure chance the repeatable part of any streak is zero. The wheel, the shuffled shoe and the random number generator in a slot have no memory and no form. So r = 0 and regression is total: whatever a table did in the last hour, its expected next hour is the game's ordinary average.

This explains a pattern every casino regular has seen.

1. A table has a spectacular run. People notice, crowd round and start betting.
2. The next stretch of play is ordinary, which feels like a collapse compared with what drew the crowd.
3. The crowd concludes the table has "gone cold", or that the house "turned it off".

Nothing changed. The crowd selected the table **because** it was in the lucky tail, then watched it return to normal. Selection on an extreme result guarantees disappointment on average.

The same thing happens to people. A player who wins three pots in a row at a [Jackpot](/) table has not become better at Jackpot, because there is no skill in the draw. Their chance in the next round is still their share of the pot. Their three-win run tells you about the past, not about them.

### Why streaks feel meaningful

Streaks are more common than intuition expects. In 100 flips of a fair coin, a run of six or more of the same result turns up about 80% of the time. Seeing one feels like a signal. It is usually just the length of runs that randomness produces. [Variance in gambling](/guides/variance-in-gambling) shows how wide normal swings are.

### The big first win

Regression also shapes how a gambler reads their own history. Someone whose first few sessions happened to land in the lucky tail forms a picture of themselves as a winner. The sessions that follow are ordinary, so they feel like a slump that needs fixing, and the natural fix is to play longer or bet bigger to get back to "normal". But the early sessions were the unusual ones. The expected result of a house-banked game is the edge times the turnover, and that is where results drift back to. Judging a game by its best stretch, rather than by its maths, is one of the most expensive ways to misread regression.`,
    },
    {
      id: "sports",
      title: "Sports form, tipsters and betting records",
      body: `Sport sits between pure luck and pure skill, so regression is partial and the size of the correction is what matters.

### Teams and players

A team starting 10–2 is probably good and probably lucky. A hitter batting .400 in April is common in baseball. Over a full Major League season nobody has finished at .400 or better since Ted Williams hit .406 in 1941. Early-season leaders regress because a few weeks of at-bats contain a lot of luck.

Popular jinxes are often regression stories. The "Sports Illustrated cover jinx" is the belief that athletes decline after appearing on the magazine's cover. A standard explanation is that athletes tend to get the cover after an exceptional stretch, and exceptional stretches tend to be followed by ordinary ones. The sophomore slump after a great first season is the same pattern.

### A tipster's record

Take a bettor picking point-spread games at odds of −110. Break-even is 110 / 210 ≈ 52.4%. They show you a 60% record over 100 picks.

Luck alone gives a standard deviation of about √(0.5 × 0.5 / 100) = 5 percentage points over 100 picks. Suppose, as an illustration, that true skill among serious bettors varies with a standard deviation of about 2 points around 50%. Then:

- Repeatable share over 100 picks: r = 2² / (2² + 5²) = 4/29 ≈ 0.14
- Best estimate of true rate: 50% + 0.14 × 10 ≈ 51.4%, below break-even.

The same 60% over 1,000 picks is far more convincing. Luck's standard deviation falls to about 1.6 points, r rises to 4 / (4 + 2.5) ≈ 0.62, and the estimate becomes about 56%.

The 2-point skill spread is an assumption made for the example, not a measured figure. The structure is what carries over: a short, impressive record should be pulled most of the way back to average. [How to win at sports betting](/guides/how-to-win-at-sports-betting) covers what a real edge looks like, and [implied probability](/guides/implied-probability) shows where break-even rates come from.`,
    },
    {
      id: "discount",
      title: "How to discount a lucky record",
      body: `A simple routine keeps regression from costing you money.

1. **Find the average.** For a casino game it is the house's return. For a bettor it is break-even at the odds they take. For a team it is roughly league average.
2. **Estimate the luck in the sample.** For a win rate p over n trials, luck's standard deviation is about √(p(1 − p)/n).
3. **Ask how much real difference is plausible.** Skill spreads between competitors are usually modest compared with short-run luck.
4. **Shrink the record.** Move the observed result towards the average by the share that is luck.
5. **Distrust selected records.** A record that was chosen because it looked great, such as a tipster advertising their best month, has already been picked from the lucky tail.

### How sample size changes the picture

| Record | Luck std dev | Share that is likely luck (with a 2-point skill spread) |
| --- | --- | --- |
| 60% over 25 picks | 10 pts | about 96% |
| 60% over 100 picks | 5 pts | about 86% |
| 60% over 500 picks | 2.2 pts | about 56% |
| 60% over 2,000 picks | 1.1 pts | about 24% |

The regression effect is strongest when the result is extreme **and** the sample is small. That combination is exactly what gets advertised.

For a wider view of how people misread chance, the [casino knowledge topic](/guides/topics/casino-knowledge) groups this page with the [Monty Hall problem](/guides/monty-hall-problem) and other probability puzzles.`,
    },
    {
      id: "pvpspinarena",
      title: "Regression to the mean on PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on Base, and none of them has form. Every round is drawn from committed seeds, and any settled round can be verified on [fairness](/fairness). That means r = 0 for every streak you see.

- On [Roulette](/roulette), a run of Green does not make Green hotter or colder. Each spin is 16/33 Purple, 16/33 Silver and 1/33 Green, with every bet returning 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee on average.
- On Coinflip, a player who has won five flips in a row still has a 50/50 next flip.
- On Jackpot, a player's win chance is their share of the current pot, whatever they won last round.

The useful habit is to treat your own session the same way. A great first hour is not evidence that the next hour will be great. It is evidence that the first hour was lucky. If you notice yourself raising stakes because you are "running hot", or chasing because you "must be due", step back. Tools for limits and breaks are on [responsible gambling](/responsible-gambling). Play on PVPspinArena is 18+.`,
    },
  ],
  faqs: [
    {
      q: "What is regression to the mean in simple terms?",
      a: "An extreme result is usually partly luck. When you measure again, the luck is drawn fresh, so the next result tends to be closer to average. Nothing forces it back; the lucky part just does not repeat.",
    },
    {
      q: "Is regression to the mean the same as the gambler's fallacy?",
      a: "No. The gambler's fallacy says a streak will be balanced by the opposite result. Regression says the next results will be ordinary, not opposite. The earlier streak is not cancelled.",
    },
    {
      q: "Does regression to the mean mean a cold slot machine will pay soon?",
      a: "No. Slot outcomes are independent. A machine's next spin has the same odds whatever it did before, so there is no deficit to make up.",
    },
    {
      q: "How does regression to the mean affect sports betting?",
      a: "Hot starts, winning streaks and short tipster records overstate true ability. Betting as if recent form will continue at the same level tends to overvalue teams and people who were lucky.",
    },
    {
      q: "How many bets do I need before a record means something?",
      a: "It depends on how big a real edge could be. For win rates near 50%, 100 picks still carry about 5 percentage points of luck, so a strong record usually needs many hundreds of bets.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Regression toward the mean",
      url: "https://en.wikipedia.org/wiki/Regression_toward_the_mean",
    },
    {
      label: "Encyclopaedia Britannica: Francis Galton",
      url: "https://www.britannica.com/biography/Francis-Galton",
    },
    {
      label: "Wikipedia: Sports Illustrated cover jinx",
      url: "https://en.wikipedia.org/wiki/Sports_Illustrated_cover_jinx",
    },
  ],
  related: [
    "law-of-large-numbers-gambling",
    "monty-hall-problem",
    "st-petersburg-paradox",
    "gamblers-fallacy",
    "variance-in-gambling",
  ],
  updated: "2026-09-27",
};
