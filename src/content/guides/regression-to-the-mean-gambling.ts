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
    "For two measurements with the same mean and standard deviation, a linear prediction uses μ + r × (first result − μ), with r their correlation.",
    "For independent trials with unchanged probabilities, the previous result does not change the next trial’s expectation.",
    "Regression does not mean results swing below average to compensate. That is the gambler's fallacy.",
    "An extreme record selected from many short records needs comparison with an appropriate baseline and sample size.",
  ],
  sections: [
    {
      id: "what",
      title: "What regression to the mean is",
      body: 'Any measured result is a mix of two things: a stable part that would show up again, and a random part that would not. Call the stable part skill, true rate or quality. Call the random part luck. When a result is far from average, it is usually far from average for both reasons at once, because that is the easiest way to land in the tail.\n\nMeasure again and the stable part carries over. The luck is drawn fresh, and fresh luck is on average zero. So the second result is expected to sit closer to the average than the first. That is regression to the mean.\n\nFrancis Galton named it in 1886 when he noticed that very tall parents tended to have children who were tall, but less extremely tall than the parents, and very short parents had children who were short but closer to the average. He first called it "regression towards mediocrity". Nothing in heredity pulls children towards the average. The parents\' extreme heights included a component that is not passed on.\n\n### The formula\n\nFor a linear prediction between measurements with the same mean μ and standard deviation, let r be their correlation. Then:\n\n**Expected next result = μ + r × (observed result − μ)**\n\n- r = 1: results are all skill; no regression.\n- r = 0: results are all luck; full regression to μ.\n- In between: partial regression. Most of real life, including sports and poker, lives here.\n\nThis is a model with assumptions, rather than a general way to estimate a player’s skill from one score. Different measurement scales need the corresponding standard-deviation factor. [Bland and Altman’s examples](https://www.bmj.com/content/309/6957/780) explain why selecting extreme observations creates the effect. The [law of large numbers](/guides/law-of-large-numbers-gambling) addresses a related question about averages across trials.',
    },
    {
      id: "not-fallacy",
      title: "Regression is not the gambler's fallacy",
      body: "These two ideas get mixed up constantly, and the difference matters for money.\n\n- **Gambler's fallacy:** after a run of one outcome, the opposite is now more likely, so the results will balance out. This is false for independent events. The [gambler's fallacy](/guides/gamblers-fallacy) guide covers the independence mistake.\n- **Regression to the mean:** after an extreme run, the next run is expected to be ordinary, not opposite. The earlier extreme is not cancelled.\n\nA worked example on a 33-slot wheel with 16 Purple slots, where each spin is Purple with probability 16/33 ≈ 48.5%.\n\nYou watch 10 spins and see 8 Purple, an 80% rate.\n\n| Belief | Expected Purples in the next 10 spins | Expected 20-spin rate |\n| --- | --- | --- |\n| Hot-hand (\"Purple is running\") | More than 4.85 | Above 64% |\n| Gambler's fallacy (\"Silver is due\") | Fewer than 4.85 | Below 64% |\n| Regression to the mean (correct) | Exactly 4.85 | (8 + 4.85) / 20 ≈ 64% |\n\nThe correct row still expects the 20-spin rate to be well above 48.5%, because the first 8 Purples happened and nothing undoes them. What regresses is the next batch, which is expected to be average. Over 1,000 spins the same early excess is diluted to a rate of about 48.8%.\n\nSo regression predicts that hot streaks cool, not that they reverse. If someone tells you a cold slot is about to pay because of regression to the mean, they are describing the gambler's fallacy with a better-sounding name.",
    },
    {
      id: "casino",
      title: "Hot tables, hot machines and hot players",
      body: 'For independent roulette spins under unchanged rules, the earlier sequence does not change the next spin’s probabilities. A finite card shoe needs a different analysis because cards already dealt alter what remains. Keep those mechanisms separate before applying a streak argument.\n\nThis explains a pattern every casino regular has seen.\n\n1. A table has a spectacular run. People notice, crowd round and start betting.\n2. The next stretch of play is ordinary, which feels like a collapse compared with what drew the crowd.\n3. The crowd concludes the table has "gone cold", or that the house "turned it off".\n\nNothing changed. The crowd selected the table **because** it was in the lucky tail, then watched it return to normal. Selection on an extreme result guarantees disappointment on average.\n\nThe same thing happens to people. A player who wins three pots in a row at a [Jackpot](/) table has not become better at Jackpot, because there is no skill in the draw. Their chance in the next round is still their share of the pot. Their three-win run tells you about the past, not about them.\n\n### Why streaks feel meaningful\n\nStreaks are more common than intuition expects. In 100 flips of a fair coin, a run of six or more of the same result turns up about 80% of the time. Seeing one feels like a signal. It is usually just the length of runs that randomness produces. [Variance in gambling](/guides/variance-in-gambling) shows how wide normal swings are.\n\n### The big first win\n\nRegression also shapes how a gambler reads their own history. Someone whose first few sessions happened to land in the lucky tail forms a picture of themselves as a winner. The sessions that follow are ordinary, so they feel like a slump that needs fixing, and the natural fix is to play longer or bet bigger to get back to "normal". But the early sessions were the unusual ones. The expected result of a house-banked game is the edge times the turnover, and that is where results drift back to. Judging a game by its best stretch, rather than by its maths, is one of the most expensive ways to misread regression.',
    },
    {
      id: "sports",
      title: "Sports form, tipsters and betting records",
      body: "Sport sits between pure luck and pure skill, so regression is partial and the size of the correction is what matters.\n\n### Teams and players\n\nA team starting 10–2 is probably good and probably lucky. A hitter batting .400 in April is common in baseball. Over a full Major League season nobody has finished at .400 or better since Ted Williams hit .406 in 1941. Early-season leaders regress because a few weeks of at-bats contain a lot of luck.\n\nPopular jinxes are often regression stories. The \"Sports Illustrated cover jinx\" is the belief that athletes decline after appearing on the magazine's cover. A standard explanation is that athletes tend to get the cover after an exceptional stretch, and exceptional stretches tend to be followed by ordinary ones. The sophomore slump after a great first season is the same pattern.\n\n### A tipster's record\n\nTake a bettor picking point-spread games at odds of −110. Break-even is 110 / 210 ≈ 52.4%. They show you a 60% record over 100 picks.\n\nLuck alone gives a standard deviation of about √(0.5 × 0.5 / 100) = 5 percentage points over 100 picks. Suppose, as an illustration, that true skill among serious bettors varies with a standard deviation of about 2 points around 50%. Then:\n\n- Repeatable share over 100 picks: r = 2² / (2² + 5²) = 4/29 ≈ 0.14\n- Best estimate of true rate: 50% + 0.14 × 10 ≈ 51.4%, below break-even.\n\nThe same 60% over 1,000 picks is far more convincing. Luck's standard deviation falls to about 1.6 points, r rises to 4 / (4 + 2.5) ≈ 0.62, and the estimate becomes about 56%.\n\nThe 2-point skill spread is an assumption made for the example, not a measured figure. The structure is what carries over: a short, impressive record should be pulled most of the way back to average. [How to win at sports betting](/guides/how-to-win-at-sports-betting) covers what a real edge looks like, and [implied probability](/guides/implied-probability) shows where break-even rates come from.",
    },
    {
      id: "discount",
      title: "How to discount a lucky record",
      body: "A simple routine keeps regression from costing you money.\n\n1. **Find the average.** For a casino game it is the house's return. For a bettor it is break-even at the odds they take. For a team it is roughly league average.\n2. **Estimate the luck in the sample.** For a win rate p over n trials, luck's standard deviation is about √(p(1 − p)/n).\n3. **Ask how much real difference is plausible.** Skill spreads between competitors are usually modest compared with short-run luck.\n4. **Shrink the record.** Move the observed result towards the average by the share that is luck.\n5. **Distrust selected records.** A record that was chosen because it looked great, such as a tipster advertising their best month, has already been picked from the lucky tail.\n\n### How sample size changes the picture\n\n| Record | Luck std dev | Share that is likely luck (with a 2-point skill spread) |\n| --- | --- | --- |\n| 60% over 25 picks | 10 pts | about 96% |\n| 60% over 100 picks | 5 pts | about 86% |\n| 60% over 500 picks | 2.2 pts | about 56% |\n| 60% over 2,000 picks | 1.1 pts | about 24% |\n\nThe regression effect is strongest when the result is extreme **and** the sample is small. That combination is exactly what gets advertised.\n\nFor a wider view of how people misread chance, the [casino knowledge topic](/guides/topics/casino-knowledge) groups this page with the [Monty Hall problem](/guides/monty-hall-problem) and other probability puzzles.",
    },
    {
      id: "pvpspinarena",
      title: "Apply the reasoning to an independent round",
      body: "A fair [Coinflip](/coinflip) provides a simple example. Conditional on unchanged rules and independent draws, five previous wins leave the next win probability at one half. The earlier wins remain part of the account history, but do not improve the next entry.\n\nA [committed seed](/guides/server-seed-client-seed) lets a reader check the disclosed calculation. That verification and statistical independence are separate properties; verifying a hash alone does not establish every assumption about a sequence. [Responsible gambling](/responsible-gambling) explains limits when a streak starts influencing spending.",
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
      label: "Bland and Altman: Regression towards the mean (BMJ, 1994)",
      url: "https://pubmed.ncbi.nlm.nih.gov/8019287/",
    },
    {
      label: "Bland and Altman: worked examples of regression towards the mean",
      url: "https://www.bmj.com/content/309/6957/780",
    },
  ],
  related: [
    "law-of-large-numbers-gambling",
    "monty-hall-problem",
    "st-petersburg-paradox",
    "gamblers-fallacy",
    "variance-in-gambling",
  ],
  updated: "2026-11-26",
};
