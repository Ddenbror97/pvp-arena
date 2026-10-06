import type { Guide } from "./types";

export const guide: Guide = {
  slug: "loss-aversion-gambling",
  cluster: "Casino knowledge",
  keyword: "loss aversion",
  secondary: [
    "loss aversion gambling",
    "prospect theory gambling",
    "loss aversion bias",
    "kahneman tversky loss aversion",
  ],
  title: "Loss Aversion: Prospect Theory and Betting Decisions",
  description:
    "Loss aversion explained: Kahneman and Tversky's prospect theory, why losses weigh about twice as much as gains, and how the bias shapes every betting choice.",
  h1: "Loss aversion: how prospect theory explains betting decisions",
  answer:
    "Loss aversion is the finding that losing a sum hurts more than winning the same sum feels good, typically by a factor of about 1.5 to 2.5. Daniel Kahneman and Amos Tversky built it into prospect theory in 1979. In gambling it explains why people refuse fair bets, chase losses to get back to even, cash out winners early and take long shots when behind.",
  facts: [
    "Kahneman and Tversky published prospect theory in Econometrica in 1979; Kahneman received the 2002 economics Nobel.",
    "Their 1992 estimates put the loss-aversion coefficient at about 2.25: a loss weighs roughly twice an equal gain.",
    "Under those parameters, a 50/50 bet risking $100 needs a win of about $251 before it feels acceptable.",
    "People tend to become risk seeking when behind and risk averse when ahead of their reference point.",
    "Loss aversion changes how bets feel, never their expected value: about a 7.88% Purple or Silver edge after the win fee does not change the edge either way.",
  ],
  sections: [
    {
      id: "what",
      title: "What loss aversion means",
      body: `Offer a room of adults a coin flip: heads you win $150, tails you lose $100. The bet has a positive expected value of +$25, yet most people turn it down. Kahneman described this classroom question many times, and the typical answer is that people want the win to be roughly twice the loss before they will play. That gap between the arithmetic and the gut is loss aversion.

The idea is simple to state. Outcomes are felt as gains or losses relative to a reference point, usually the status quo or where you started, and a loss of a given size produces a stronger reaction than a gain of the same size. It is not the same as risk aversion in classical economics, which comes from the diminishing value of extra wealth. Loss aversion appears even for small stakes where wealth effects are negligible, which is why economists found it so hard to explain with traditional models.

### Where it came from

Daniel Kahneman and Amos Tversky, two Israeli psychologists, published "Prospect Theory: An Analysis of Decision under Risk" in Econometrica in 1979. It became one of the most cited papers in economics. Tversky died in 1996; Kahneman received the Nobel Memorial Prize in Economic Sciences in 2002, with the prize citation crediting their joint work on judgement and decision-making under uncertainty.

This guide sits in the [Casino knowledge topic](/guides/topics/casino-knowledge) alongside other biases that shape betting, including the [sunk cost fallacy](/guides/sunk-cost-fallacy-gambling), which loss aversion helps to explain.`,
    },
    {
      id: "prospect-theory",
      title: "Prospect theory in four ideas",
      body: `Prospect theory replaced the older model of a perfectly rational expected-utility maximiser with four observations about how people actually choose.

1. **Reference dependence.** People evaluate changes, not final wealth. Winning $50 after losing $200 feels like a small gain on a bad night, not like being $150 poorer.
2. **Loss aversion.** The value curve is steeper for losses than for gains.
3. **Diminishing sensitivity.** The difference between $0 and $100 feels bigger than between $1,000 and $1,100, on both the gain and loss side. Gains produce a concave curve; losses produce a convex one.
4. **Probability weighting.** People overweight small probabilities and underweight moderate to large ones.

### The fourfold pattern

Put diminishing sensitivity and probability weighting together and you get four predictable attitudes to risk.

| Situation | Typical attitude | Everyday example |
| --- | --- | --- |
| High chance of a gain | Risk averse | Taking a sure $90 over a 95% chance of $100 |
| High chance of a loss | Risk seeking | Gambling to avoid a near-certain loss |
| Low chance of a gain | Risk seeking | Buying lottery tickets |
| Low chance of a loss | Risk averse | Buying insurance |

The second row matters most in a casino. A player who is behind sees a sure loss if they stop and a chance of escape if they bet again, so they become more willing to take risks exactly when they can least afford them. The third row explains why long shots with tiny probabilities feel more attractive than their odds justify.

In 1992 Tversky and Kahneman refined the model as cumulative prospect theory, with median estimates of about 0.88 for the curvature of the value function and about 2.25 for the loss-aversion coefficient, usually written as lambda.`,
    },
    {
      id: "maths",
      title: "The maths: pricing a coin flip with prospect theory",
      body: `Using the 1992 parameters, a gain of x is valued at x to the power 0.88, and a loss of x is valued at −2.25 times x to the power 0.88. For simplicity, ignore probability weighting and treat each side of a 50/50 flip as weight 0.5.

Losing $100 is valued at −2.25 × 100^0.88 ≈ −2.25 × 57.5 ≈ −129.4. Now vary the amount you could win.

| Win if heads | Lose if tails | Expected value | Prospect value | Feels |
| --- | --- | --- | --- | --- |
| $100 | $100 | $0 | −36.0 | Clearly bad |
| $150 | $100 | +$25 | −23.6 | Still bad |
| $200 | $100 | +$50 | −11.8 | Mildly bad |
| $251 | $100 | +$75.50 | ≈ 0 | Break-even |
| $300 | $100 | +$100 | +11.0 | Acceptable |

The break-even win is 100 × 2.25^(1/0.88) ≈ $251. Under these parameters, a typical person needs odds of about 2.5 to 1 in their favour before a coin flip for $100 feels neutral. A fair flip at even money feels decisively negative, even though it costs nothing on average.

### One bet versus many

In 1963 Paul Samuelson reported that a colleague refused a single bet to win $200 or lose $100 but said he would happily take 100 of them. Aggregated, the bets almost guarantee a profit, and the colleague could see it. Shlomo Benartzi and Richard Thaler later called the habit of judging each bet in isolation "myopic loss aversion". The same framing effect works in reverse for negative-EV bets: judged one at a time, a small house edge feels trivial; added up over hundreds of rounds, it is the [expected value](/guides/expected-value-gambling) that decides the outcome.`,
    },
    {
      id: "betting",
      title: "How loss aversion shapes betting behaviour",
      body: `Prospect theory predicts several patterns that anyone who has watched a casino floor will recognise.

### Chasing and the break-even effect

Below the reference point, people become risk seeking. Thaler and Eric Johnson found in 1990 that people who had lost money were attracted to gambles offering a chance to break even. That is chasing in laboratory form, and it links loss aversion directly to the sunk cost pattern.

### The house money effect

The same study found the opposite after gains: people treated winnings as "house money" and took risks with it they would never take with their own cash. A $200 win pushed back into the machine is still $200 of your money.

### Cashing out early

Investors tend to sell winning shares too early and hold losing ones too long, a pattern Hersh Shefrin and Meir Statman called the disposition effect in 1985. Gamblers show it when they lock in a small win on a crash game at 1.3x but let a losing sports bet run, or when they accept a sportsbook cash-out offer that includes a margin just to stop feeling exposed. The [cash out betting guide](/guides/cash-out-betting) shows how those offers are priced.

### Long shots

Probability weighting makes a 1-in-33 or 1-in-100 chance feel larger than it is. Researchers have proposed this as one explanation for the favourite-longshot bias in horse racing, where long shots tend to return less per dollar than favourites, though several other explanations are also debated.

Treating a losing day in the market like a bet you must win back is the habit [is day trading gambling](/guides/is-day-trading-gambling) separates from a casino ticket.`,
    },
    {
      id: "evidence",
      title: "How strong is the evidence?",
      body: `Loss aversion is among the best-replicated findings in behavioural science, but its size depends on context.

### Support

The endowment effect is a classic demonstration. In a 1990 experiment by Kahneman, Jack Knetsch and Thaler, students given a coffee mug asked for roughly twice as much to sell it as other students were willing to pay to buy one. Owning the mug made giving it up feel like a loss. A large 2020 replication of the original prospect theory questions, run across 19 countries, found that most of the core patterns reappeared.

### Debate

Some researchers, notably David Gal and Derek Rucker in a 2018 review, argue that loss aversion has been overstated and that many effects attributed to it have other explanations, such as status quo bias or the way questions are asked. Other studies find weak loss aversion for very small stakes and stronger effects as stakes rise. The fair summary is that the asymmetry is real and common, while the exact coefficient of 2.25 is an average from one set of experiments, not a universal constant.

### Individual differences

People vary widely. Experienced traders and professional gamblers often show less loss aversion in their area of expertise, possibly because they think in terms of many repeated decisions. Everyone becomes more vulnerable when tired, emotional or behind, which is exactly when betting decisions tend to be made in a hurry. The practical takeaway is to expect the bias in yourself and plan around it rather than assume you are immune.`,
    },
    {
      id: "rules",
      title: "Working with loss aversion instead of against it",
      body: `Knowing about a bias does not switch it off, but a few habits reduce its grip.

1. **Price bets in expected value.** Convert every bet to an average cost per dollar before feelings get a vote. On about a 7.88% Purple or Silver edge after the win fee, $50 of turnover costs about $3.33 on average.
2. **Bracket broadly.** Judge a session or a month, not a single spin. It makes small edges visible and stops one loss feeling like a disaster.
3. **Set the reference point in advance.** Decide the session budget and treat it as already spent, as the [gambling budget guide](/guides/gambling-budget) recommends. Then being "behind" loses its sting.
4. **Watch for risk seeking when down.** If you notice yourself reaching for bigger stakes or longer odds after losses, that is the second row of the fourfold pattern. Stop.
5. **Treat winnings as your money.** A win is not house money; it is a balance you can keep.
6. **Expect swings.** The [variance guide](/guides/variance-in-gambling) shows how large normal downswings are, so they are less of a shock.

Gambling on PVPspinArena is 18+ only. Limits and cooling-off tools are on the [responsible gambling](/responsible-gambling) page.`,
    },
    {
      id: "pvp",
      title: "Loss aversion in a PvP round",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on Base, and each shows a different side of prospect theory.

A [Coinflip](/coinflip) is a fair 50/50 between two players, and the winner takes the pot minus any fee shown before entry. Prospect theory predicts that a symmetric flip feels worse than neutral, and that is exactly how many players describe it. The feeling is the bias; the maths is close to even.

[Roulette](/roulette) runs shared rounds on a 33-slot wheel. Purple or Silver pays 2x with probability 16/33, and Green pays 14x with probability 1/33. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Probability weighting makes Green's 3.03% chance feel bigger than it is, but its return is much lower than Purple's. In Jackpot, a small share of a large pot is a long shot with the same appeal.

Results come from committed seeds and can be checked on the [fairness page](/fairness), so a loss is never a sign that the next round has shifted in your favour. Loss aversion can make the next bet feel urgent. The numbers on the wheel stay exactly where they were.

In the same cluster, see also [illusion of control](/guides/illusion-of-control) and [skinner box](/guides/skinner-box-slot-machines).`,
    },
  ],
  faqs: [
    {
      q: "What is loss aversion in simple terms?",
      a: "It is the tendency to feel a loss more strongly than a gain of the same size. Losing $100 typically hurts about twice as much as winning $100 feels good.",
    },
    {
      q: "Who discovered loss aversion?",
      a: "Daniel Kahneman and Amos Tversky, who described it as part of prospect theory in a 1979 paper. Kahneman later received the 2002 Nobel prize in economics.",
    },
    {
      q: "How does loss aversion affect gamblers?",
      a: "It makes fair bets feel bad, pushes people to take bigger risks when behind to get back to even, and encourages cashing out winners early.",
    },
    {
      q: "What is the loss aversion ratio?",
      a: "Estimates usually fall between about 1.5 and 2.5. Tversky and Kahneman's 1992 median estimate was 2.25, but the ratio varies between people and situations.",
    },
    {
      q: "Is loss aversion the same as risk aversion?",
      a: "No. Risk aversion comes from money being worth less as you get more of it. Loss aversion is about gains and losses measured from a reference point, and it appears even at small stakes.",
    },
  ],
  sources: [
    { label: "Wikipedia: Loss aversion", url: "https://en.wikipedia.org/wiki/Loss_aversion" },
    { label: "Wikipedia: Prospect theory", url: "https://en.wikipedia.org/wiki/Prospect_theory" },
    {
      label: "NobelPrize.org: Economic Sciences 2002",
      url: "https://www.nobelprize.org/prizes/economic-sciences/2002/summary/",
    },
  ],
  related: [
    "sunk-cost-fallacy-gambling",
    "illusion-of-control",
    "skinner-box-slot-machines",
    "expected-value-gambling",
    "gamblers-fallacy",
  ],
  updated: "2026-09-27",
};
