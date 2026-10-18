import type { Guide } from "./types";

export const guide: Guide = {
  slug: "dream-catcher-game",
  cluster: "Game shows",
  keyword: "dream catcher",
  secondary: [
    "dream catcher rtp",
    "dream catcher wheel",
    "dream catcher multipliers",
    "dream catcher odds",
  ],
  title: "Dream Catcher: Wheel Segments, Multipliers and RTP",
  description:
    "Dream Catcher explained: the 54-segment money wheel, 2x and 7x multiplier respins, the odds and RTP of each number, and which bet loses least.",
  h1: "Dream Catcher: segments, multipliers, odds and RTP by number",
  answer:
    "Dream Catcher is Evolution's live money wheel. A host spins a 54-segment wheel with numbers 1, 2, 5, 10, 20 and 40, each paying its number to 1, plus a 2x and a 7x segment that trigger a respin and multiply the next win. RTP varies by number, from roughly 90.6% on 40 to about 96.6% on 10.",
  facts: [
    "The wheel has 54 segments: 23 × 1, 15 × 2, 7 × 5, 4 × 10, 2 × 20, 1 × 40, 1 × 2x and 1 × 7x.",
    "Each number pays its own value to 1: a $1 bet on 20 returns $21 when 20 lands.",
    "Multiplier segments trigger a respin; multipliers stack, so 2x followed by 7x makes the next win pay 14x.",
    "Across all settled rounds the average multiplier is 52/45 ≈ 1.156.",
    "The 10 is usually listed as the best bet, at about 96.58% RTP; the 40 is the worst, near 90.6%.",
  ],
  sections: [
    {
      id: "what",
      title: "What Dream Catcher is",
      body: `Dream Catcher is a live money-wheel game from Evolution, first released in 2017. It was the studio's first big "game show" format and the template for later titles such as [Crazy Time](/guides/crazy-time), [Monopoly Live](/guides/monopoly-live) and [Funky Time](/guides/funky-time). A presenter stands beside a large vertical wheel, players bet on numbers during a short window, and the host spins the wheel by hand. A leather flapper at the top stops on the winning segment.

The format borrows from the carnival and casino Big Six wheel, which is covered generically on the [wheel game casino](/guides/wheel-of-fortune-casino-game) page. Dream Catcher's additions are a live studio feed, a modern betting interface, and two multiplier segments that turn a single spin into a chain.

There is no skill decision inside a round. You choose which numbers to back and how much, then watch. That makes Dream Catcher a clean example of how a wheel's odds come straight from its segment counts, and how a small tweak such as a multiplier segment reshuffles value between bets. Like every game in the [Game shows topic](/guides/topics/game-shows), it is for adults 18+ (or the local legal age) and is only available through operators licensed to carry Evolution's stream.`,
    },
    {
      id: "wheel",
      title: "The wheel: segments, payouts and raw odds",
      body: `| Number | Segments | Chance per spin | Pays |
| --- | --- | --- | --- |
| 1 | 23 | 42.6% | 1 to 1 |
| 2 | 15 | 27.8% | 2 to 1 |
| 5 | 7 | 13.0% | 5 to 1 |
| 10 | 4 | 7.4% | 10 to 1 |
| 20 | 2 | 3.7% | 20 to 1 |
| 40 | 1 | 1.9% | 40 to 1 |
| 2x | 1 | 1.9% | respin, doubles next win |
| 7x | 1 | 1.9% | respin, multiplies next win by 7 |

Two things stand out. First, the payouts are "number to 1" and the house edge comes from giving each number slightly fewer segments than a fair wheel would. A fair payout for a 1-in-54 segment would be 53 to 1, but the 40 pays only 40 to 1.

Second, the wheel is lopsided towards small numbers: 1 and 2 together hold 38 of the 54 segments, just over 70% of the wheel. Most spins pay small amounts to most of the table. The excitement lives in the six segments for 20 and 40 and the two multiplier segments.

### How the payouts compare to a fair price

A fair wheel pays so that probability × total return = 1. For the 1, that would mean paying 54/23 ≈ 2.35 total, or 1.35 to 1. Dream Catcher pays 1 to 1 (2.00 total). For the 40, fair would be 53 to 1; it pays 40 to 1. The gap between fair and actual is the edge, before the multipliers put some of it back.`,
    },
    {
      id: "multipliers",
      title: "How the 2x and 7x multipliers work",
      body: `When the flapper stops on 2x or 7x, no bet wins or loses. The wheel is spun again, and whatever number lands next has its payout multiplied. If another multiplier lands during the respin, the multipliers stack: 2x then 7x means the next win pays 14 times the normal amount, and 7x then 7x means 49 times. Players cannot change their bets between the multiplier and the respin.

### Worked example

You have $5 on 20.

1. The wheel lands on 7x. Nothing is settled; the host respins.
2. The wheel lands on 2x. The running multiplier is now 14x. Another respin.
3. The wheel lands on 20. Your payout is 20 × 14 = 280 to 1, so $5 wins $1,400 plus your stake back.

If step 3 had landed on 5 instead, your bet on 20 would have lost as normal.

### The average multiplier

Each spin has a 2/54 chance of hitting a multiplier. Working through the chain, the expected multiplier on a settled round is 52/45 ≈ 1.156. In other words, the two multiplier segments add about 15.6% to the average payout on every number. That sounds generous until you see that the base payouts were set low enough to absorb it.

Most of the time you will see no multiplier at all: 52/54 ≈ 96.3% of rounds settle on the first spin. Stacked multipliers need two multiplier hits in a row, which happens about once in 729 rounds; a specific pair such as 2x then 7x comes up about once in 2,916. They are memorable because they are rare.`,
    },
    {
      id: "rtp",
      title: "Dream Catcher RTP by number",
      body: `The return on a bet can be calculated from the segment counts. A number with c segments ends up as the settled result with probability c/52 (the two multiplier segments only delay the result). The expected winnings, including multipliers, are c × n / 45, where n is the payout. Adding the returned stake gives:

**RTP = c/52 + c × n / 45**

| Number | Calculation | RTP (calculated) |
| --- | --- | --- |
| 1 | 23/52 + 23/45 | ≈ 95.3% |
| 2 | 15/52 + 30/45 | ≈ 95.5% |
| 5 | 7/52 + 35/45 | ≈ 91.2% |
| 10 | 4/52 + 40/45 | ≈ 96.6% |
| 20 | 2/52 + 40/45 | ≈ 92.7% |
| 40 | 1/52 + 40/45 | ≈ 90.8% |

Evolution publishes its own per-number RTPs in the game's help screen. The widely quoted figures agree on the key points: the 10 is best at about 96.58%, the 2 and 1 are close behind, and the 5, 20 and 40 are markedly worse, with the 40 lowest at around 90.6%. Where your table's help screen differs from the calculation above, trust the help screen.

### What the table means in money

- $100 through the 10 costs about $3.40 on average.
- $100 through the 40 costs about $9.40 on average, almost three times as much.
- The 5 is a common "middle" pick that quietly sits near the bottom of the table.

The general method is in [how to calculate house edge](/guides/how-to-calculate-house-edge), and [RTP explained](/guides/rtp-explained) covers what these percentages do and do not promise over a session.`,
    },
    {
      id: "strategy",
      title: "Is there a Dream Catcher strategy?",
      body: `There is no way to change the probability of any segment. What you can change is which RTP you pay and how much variance you take on.

### Choosing numbers

If the goal is to lose least per dollar, the 10 is the best single number, followed by 2 and 1. Spreading chips across every number feels safe because something always wins, but your return is the stake-weighted average of each bet's RTP. A $1 bet on each of the six numbers averages about 93.7%, worse than backing 10 alone.

### Variance and bankroll

- A bet on 1 wins about 44% of settled rounds, so swings are small.
- A bet on 10 wins about 7.7% of settled rounds. Losing runs of 20 to 30 rounds are normal: the chance of 25 misses in a row is (48/52)^25 ≈ 13%.
- A bet on 40 wins about 1.9% of settled rounds. Going 100 rounds without it happens about 14% of the time.

Size stakes so that the normal losing run for your chosen number does not end the session. [Variance in gambling](/guides/variance-in-gambling) shows how to think about swing size separately from edge.

### Systems and history boards

The screen shows recent results, and stats sites log thousands more. A number that has not landed for 80 spins has the same chance on the next spin as always. Doubling up after misses runs into the same problem described in the [Martingale strategy](/guides/martingale-strategy) guide, made worse by a 40-to-1 payout that is below fair odds.`,
    },
    {
      id: "compare",
      title: "Dream Catcher vs Crazy Time and the land-based Big Six",
      body: `Dream Catcher is often the first live wheel people try, and it helps to know how it differs from its neighbours before choosing a table.

| Feature | Dream Catcher | Crazy Time | Land-based Big Six |
| --- | --- | --- | --- |
| Segments | 54 | 54 | usually 54 |
| Number spots | 1, 2, 5, 10, 20, 40 | 1, 2, 5, 10 | varies by casino |
| Extra value | 2x and 7x respins | Top Slot plus four bonus games | usually none |
| Best listed RTP | about 96.6% (10) | about 96% (1) | often well below 90% on some spots |
| Pace | steady, one spin at a time | slower when bonuses run | set by the dealer |

### What the differences mean for a player

Dream Catcher is the simplest of the Evolution wheels. Every outcome is settled on the main wheel, so a round rarely takes longer than a minute or so, and the only surprise is a multiplier respin. Crazy Time moves much of its value into bonus rounds, which makes the base bets weaker and the swings larger. A casino-floor Big Six wheel is similar in shape, but paytables vary between properties and some spots carry edges far above Dream Catcher's. The generic maths of those wheels is on [wheel of fortune odds](/guides/wheel-of-fortune-odds).

### Reading the live screen

The interface shows the betting window countdown, your chips, a results strip of recent numbers, and the multiplier display during respins. Operators set their own minimum and maximum stakes and a maximum payout per round, so a large stacked multiplier on the 40 can hit a cap. Check the table limits before betting on 20 or 40 with larger stakes. The results strip is a record, not a trend line; treating it as one is the [gambler's fallacy](/guides/gamblers-fallacy).

### Common mistakes

- Backing the 5 as a "balanced" choice without checking that it is one of the worst RTPs on the wheel.
- Covering all six numbers and assuming the edge averages out to something small.
- Raising stakes after a multiplier lands elsewhere, as if the wheel owes the next one.
- Ignoring the payout cap when chasing a stacked multiplier on 40.`,
    },
    {
      id: "pvp",
      title: "Dream Catcher next to a PvP wheel",
      body: `Dream Catcher shows how a wheel's edge can be different for every bet on the same spin. PVPspinArena's [Roulette](/roulette) takes the opposite approach. Its 33-slot wheel has 16 Purple and 16 Silver slots paying 2x and 1 Green paying 14x. Purple returns 16/33 × 2 = 96.97% and Green returns 1/33 × 14 = 42.42% before the 5% win fee. Purple and Silver share an edge. Green costs far more.

Because rounds are settled from committed seeds, any finished spin can be checked on the [fairness](/fairness) page. If you enjoy wheel games, set a budget first and use the [responsible gambling](/responsible-gambling) tools when a session stops being fun.`,
    },
  ],
  faqs: [
    {
      q: "What is the best number to bet on in Dream Catcher?",
      a: "The 10 has the highest RTP, about 96.58%, followed closely by 2 and 1. It still has a house edge; it simply loses the least per dollar on average.",
    },
    {
      q: "How do Dream Catcher multipliers work?",
      a: "Landing on 2x or 7x triggers a respin, and the next number's payout is multiplied. Multipliers stack, so 2x then 7x makes the next winning number pay 14 times its normal amount.",
    },
    {
      q: "How often does 40 land in Dream Catcher?",
      a: "It has one segment, so about 1 in 52 settled rounds, or roughly 1.9%. Stretches of 100 rounds without a 40 happen around 14% of the time.",
    },
    {
      q: "Is Dream Catcher the same as the Big Six wheel?",
      a: "It is built on the same idea: a vertical wheel with numbered segments paying their value to 1. Dream Catcher adds a live studio stream and the 2x and 7x multiplier respins.",
    },
    {
      q: "Can you win at Dream Catcher long term?",
      a: "No. Every number returns less than 100% over time. Short sessions can finish ahead, but the average result tracks the RTP of the numbers you back.",
    },
  ],
  sources: [
    { label: "Evolution: official site", url: "https://www.evolution.com/" },
    {
      label: "Wizard of Odds: Dream Catcher",
      url: "https://wizardofodds.com/games/dream-catcher/",
    },
    { label: "Wikipedia: Big Six wheel", url: "https://en.wikipedia.org/wiki/Big_Six_wheel" },
  ],
  related: [
    "crazy-time",
    "monopoly-live",
    "funky-time",
    "wheel-of-fortune-casino-game",
    "wheel-of-fortune-odds",
    "rtp-explained",
  ],
  updated: "2026-09-27",
};
