import type { Guide } from "./types";

export const guide: Guide = {
  slug: "variance-in-gambling",
  cluster: "Games & odds",
  keyword: "variance in gambling",
  secondary: ["gambling variance", "volatility gambling", "downswing", "variance vs house edge"],
  title: "Variance in Gambling: Why Short Sessions Mislead",
  description:
    "Variance in gambling: why short sessions swing, how bet size and hit rate change the ride, and why a hot streak is not proof of an edge.",
  h1: "Variance in gambling: why short sessions lie and long ones settle",
  answer:
    "Variance in gambling is the spread of actual results around the expected value. Short sessions lie because that spread is wide when n is small: a minus-EV game can finish up, and a fair game can finish down, without contradicting the model. Bet size and hit rate change how violent the ride is. A hot streak is a draw from the same distribution, not proof you found an edge. Long samples settle toward the mean; they do not refund the house edge.",
  facts: [
    "Variance is the noise around EV; house edge is the direction of EV.",
    "Session standard deviation grows like √n times the per-bet spread, while expected loss grows like n.",
    "Low hit-rate bets swing more. Green on this wheel is also a worse price than Purple, not the same RTP.",
    "A winning streak is not evidence the edge flipped; independent rounds have no memory.",
    "Larger stakes scale both the mean and the swings in dollars, not the percentages.",
  ],
  sections: [
    {
      id: "what",
      title: "What variance means at a table",
      body: `Expected value is the centre of the dartboard. Variance is how far the darts land from that centre. In gambling the darts are session results. A Purple or Silver bet, about 92.12% after the win fee, has a centre near −7.88% of turnover. A two-hour sitting can land at +40% or −80% of turnover and still be a legal dart.

Statistically, variance is the expected squared deviation from the mean. Players meet it as volatility, swing, downswing, variance. The useful facts are the same: short n is noisy; high-payout rares are noisier; raising the stake scales the dollar noise.

This sits in the [Games and odds topic](/guides/topics/games-and-odds). Price the centre with [expected value](/guides/expected-value-gambling) and [house edge](/guides/house-edge) first, then use this page for the width. PVPspinArena is 18+.

A useful translation: if EV is the slope of a long road, variance is the potholes. Driving further does not fill the potholes; it applies the slope to more kilometres. That is why “I’ll play until it evens out” is how a minus-EV night becomes a minus-EV week.`,
    },
    {
      id: "short-sessions",
      title: "Why short sessions lie",
      body: `[Law of large numbers](/guides/law-of-large-numbers-gambling) needs a large number. A session of 20–80 bets is a small number for any game that is not almost deterministic.

### Mean grows faster than noise, but only later

For independent bets, expected total loss scales with n (n times EV per bet). The standard deviation of the total scales with √n. The ratio |mean| / sd therefore grows like √n. That is why casinos are calm about millions of spins and you are not calm about forty.

- At n = 25, √n = 5. Noise is large relative to about a 7.88% Purple or Silver edge after the win fee.
- At n = 100, √n = 10. Still plenty of room to finish a session up on a minus-EV colour.
- At n = 10,000, √n = 100. The edge has had time to show in the books. Almost no hobby session lives here.

### “I’m up, so the model is wrong”

Being up after 40 Purple bets is compatible with about a −7.88% EV after the win fee. The model predicted a distribution, not a single point. Treating a lucky sample as a new p is how people double the next stake. [RTP explained](/guides/rtp-explained) covers the same idea from the payback-percentage side: 96% is not a 96% win chance, and it is not tonight’s result either.

### Downswing length, not just session P/L

Variance also shows up as the longest losing run inside a session. On a 48.48% hit, the chance of 6 losses in a row is (17/33)^6 ≈ 2.3%, about 1 in 43 isolated starts. In 80 bets you have many overlapping windows. Seeing a six-loss clump is normal weather. Seeing it after you raised the unit is how a “small session” becomes a large hole. Track the clump size you can survive, not only the closing balance.`,
    },
    {
      id: "bet-size-hit-rate",
      title: "How bet size and hit rate change the ride",
      body: `Two knobs dominate the feel of a session when RTP is held fixed.

### Bet size

Stake $1 or $10 on the same colour and the percentage edge is identical. Dollar variance scales with the stake (and with stake squared for variance itself). A $10 unit makes a five-loss run look like a crisis; a $1 unit makes it look like a blip. If the session budget is $40, $10 units can end the night in four misses. That is not bad luck in a mysterious sense. It is a budget with no room for the left tail.

### Hit rate

Purple wins about 48.48% of the time and pays 2x. Green wins about 3.03% of the time and pays 14x. That is a lower return than Purple, and much higher variance. Green sessions are long flatlines broken by a spike. Purple sessions tick up and down every other spin. Slots with rare bonuses are Green-like. Even-money table bets are Purple-like.

| Bet | Hit rate | Payout | EV / $1 | Session feel over 30 bets |
| --- | --- | --- | --- | --- |
| Purple $1 | 48.48% | 2x | −$0.067 | Frequent small wins and losses |
| Green $1 | 3.03% | 14x | −$0.58 | Mostly −$1, rare +$13 |
| Fair flip $1 | 50% | 2x | $0 | Similar tick to Purple, no drift |
| Green $5 | 3.03% | 14x | −$2.88 | Same shape, five times the dollars |

You can watch both colours on [Roulette](/roulette) in the same minute. The wheel does not make Green “due” after a quiet stretch. It only makes Green rare.`,
    },
    {
      id: "vs-edge",
      title: "Variance versus house edge",
      body: `People mash these together because both make you lose. They are not the same lever.

- **House edge** is the expected leak per dollar wagered. It is in the paytable. Systems cannot remove it.
- **Variance** is how far a finite path wanders around that leak. Stake size, hit rate and n set it.

A low-edge, high-variance game (rare huge jackpot, small published edge) can bust a small bankroll faster than a higher-edge, low-variance even-money bet, because you never survive to the mean. A high-edge, low-variance game grinds you in a straightish line. Neither is a strategy. Both are reasons to pick a stake that matches the budget’s stomach.

PvP [Coinflip](/coinflip) with a 0% fee has ~0 edge and still has full-stake variance: one flip is ±100% of the stake. Edge and variance parted company there. You can be in a fair game and have a brutal hour.

Daily fantasy swings for the same reason a short sample lies. [DFS strategy](/guides/dfs-strategy) is about that spread. A practice wheel that does not change the edge is the [roulette simulator](/guides/roulette-simulator).`,
    },
    {
      id: "worked",
      title: "A worked session, not a prophecy",
      body: `Suppose 50 independent $2 Purple bets. Turnover = $100. Expected result ≈ −$3.03 before the win fee.

Model each bet as +$2 profit with p = 16/33 and −$2 with q = 17/33 (you lose the $2 stake). Per-bet EV ≈ −$0.061. Per-bet variance is large relative to that mean: you either win $2 or lose $2, roughly a coin with a thumb on one side.

A rough sd for the 50-bet total is on the order of $14. That is not a precise lab figure; it is enough to see the shape. Outcomes between about −$30 and +$25 are unsurprising. An outcome of +$40 is a tail, not a new RTP. An outcome of −$100 (a wipe) is also a tail, and it is how sessions die when the unit is too large for the remaining balance.

### Jackpot share

A $5 ticket in a $100 [Jackpot](/) pot (0% fee) has p = 5% at $100, EV ≈ $0, and a huge variance: usually −$5, rarely +$95. Ten such tickets in a night are not “due” a hit. The distribution is still 10 independent long shots (or fewer if you re-enter the same style of pot). Short sessions of jackpot tickets lie even harder than Purple, because hits are scarce.

Chance of zero hits in ten independent 5% tickets: 0.95^10 ≈ 60%. Most ten-ticket nights are a clean −$50. That is not a broken generator. That is a 5% shot refusing to appear on cue. People then write “variance” when they mean “I bought a rare event ten times”. Both descriptions are true; only the second one sizes the next ticket honestly.`,
    },
    {
      id: "streaks",
      title: "A hot streak is not an edge",
      body: `Independent rounds have no memory. A verified fair generator does not get “hot” in a causal sense. It produces a clump of wins that was always allowed by the binomial (or multinomial) tail.

The [gambler’s fallacy](/guides/gamblers-fallacy) is the belief that a clump of losses makes a win more likely. The hot-hand error is the belief that a clump of wins makes another win more likely. Both treat variance as a signal about p. Both are wrong on a memoryless wheel.

### What you can check

You can check that the last streak was honest: open [fairness](/fairness) and recompute the seeds. That confirms the darts were real. It does not raise p on the next dart.

### What you should not do

Do not raise the unit because the session is “running”. That converts a lucky sample into extra turnover at the same negative EV. Do not raise the unit because the session is “cold” and must bounce. That is chase. If the ride is no longer entertainment, stop. Variance is not a debt the table owes you.`,
    },
    {
      id: "manage",
      title: "Managing the ride without chasing",
      body: `You cannot delete variance. You can choose a unit and a stop so the left tail does not take money you need.

- **Small unit versus session budget.** If you cannot absorb ten losses in a row, the unit is too big for even-money colours. For Green, think in dozens of misses.
- **Time and money stops.** Fast rounds manufacture n. n manufactures both the mean leak and the chance of a loud swing.
- **Do not resize from the streak.** Resize from the remaining budget, downward if needed, never upward to recover.
- **Match the game to the stomach.** Want a longer, tickier session? Purple or a fee-free flip. Want a lottery feel? Green or a small jackpot share. Same or similar EV per dollar is possible; the ride is not.

Variance in gambling is why one friend cashed out smiling and another swore the site was broken, on the same edge. Long books settle. Short nights argue. Believe the paytable, size the unit, and treat a streak as weather.

If you want a single pre-session sentence: “My expected cost is e times turnover; my plausible range is a few session sds around that.” Write both numbers. If the left edge of the range would hurt rent, shrink the unit until it would not. That is variance management. It is not an edge. Short sessions will still lie. You just stop letting the lie set the next stake. Write the range first.

A hot or cold run is the same process as [regression to the mean](/guides/regression-to-the-mean-gambling): extreme samples tend to be followed by ordinary ones.

How far a downswing can go before the bankroll dies is [risk of ruin](/guides/risk-of-ruin).`,
    },
  ],
  faqs: [
    {
      q: "What is variance in gambling?",
      a: "The spread of results around expected value. High variance means bigger swings for the same average cost. It is not the same thing as house edge.",
    },
    {
      q: "Why do short sessions mislead?",
      a: "Because noise scales with √n and the edge scales with n. At small n the noise dominates, so a minus-EV game can look generous and a fair game can look cursed.",
    },
    {
      q: "Does a higher payout mean higher variance?",
      a: "Usually, if RTP is similar, because hits must be rarer. Green at 14x is choppier than Purple at 2x on the same 33-slot wheel, with different edges: about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee.",
    },
    {
      q: "Is a hot streak proof I have an edge?",
      a: "No. Independent rounds produce streaks by chance. Verify fairness if you want honesty; do not rewrite p because the last ten won.",
    },
    {
      q: "How do I reduce variance?",
      a: "Use a smaller stake, pick a higher hit-rate bet, or play fewer rounds. You cannot reduce the percentage house edge by smoothing the ride.",
    },
    {
      q: "Can PvP games have variance with no house edge?",
      a: "Yes. A 0% fee coinflip or jackpot is about 0-EV and still moves your whole stake when you lose. Edge and variance are separate.",
    },
  ],
  sources: [
    { label: "Wikipedia: Variance", url: "https://en.wikipedia.org/wiki/Variance" },
    {
      label: "Wikipedia: Law of large numbers",
      url: "https://en.wikipedia.org/wiki/Law_of_large_numbers",
    },
    {
      label: "Wizard of Odds: house edge and volatility",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
  ],
  related: [
    "crypto-jackpot",
    "odds-converter",
    "implied-probability",
    "progressive-jackpot-odds",
    "rtp-explained",
    "regression-to-the-mean-gambling",
    "risk-of-ruin",
    "law-of-large-numbers-gambling",
  ],
  updated: "2026-09-26",
};
