import type { Guide } from "./types";

export const guide: Guide = {
  slug: "coin-flip-odds",
  cluster: "Games & odds",
  keyword: "coin flip odds",
  secondary: ["coin flip probability", "odds of flipping heads", "coin flip streak odds", "is a coin flip 50/50"],
  title: "Coin Flip Odds: Probability, Streaks and Real Coins",
  description:
    "Coin flip odds explained: why each flip is 50/50, the real chance of streaks, what research says about physical coins, and how online coinflip odds work.",
  h1: "Coin flip odds: probability, streaks and real coins",
  answer:
    "The coin flip odds for a fair coin are 50/50: one chance in two of heads and one in two of tails on every flip, regardless of what came before. Streaks are more common than most people expect. Real coins show a tiny bias towards the side they started on, while a well-designed digital coinflip gives an exact 50% chance each way.",
  facts: [
    "A fair coin has a 1 in 2 chance of heads and 1 in 2 of tails on each flip.",
    "Previous flips do not affect the next one; believing otherwise is the gambler's fallacy.",
    "The chance of 5 heads in a row is 1 in 32, and of 10 in a row is 1 in 1,024.",
    "A 2023 study of 350,757 physical flips found coins landed on their starting side about 50.8% of the time.",
    "PVPspinArena's Coinflip uses one bit of an HMAC-SHA256 output, giving an exact 50% chance.",
  ],
  sections: [
    {
      id: "basics",
      title: "The basic coin flip odds",
      body: `A coin has two sides. If it is fair, each side is equally likely, so the probability of heads is 1/2 and the probability of tails is 1/2. As a percentage, that is 50% each. In betting language, the odds are "evens" or 1 to 1.

### Probability vs odds

People often use the words interchangeably, but they mean slightly different things.

- **Probability** is the chance of an outcome: 1/2, or 50%.
- **Odds** compare the chances for and against: 1 to 1 for a fair coin.

### Fair payouts

For a bet to be fair, the payout must match the odds. On a 50/50 outcome, a fair payout is 2x your stake: you get your stake back plus the same again. That is exactly what happens in a player-versus-player coinflip with no fee, where two equal stakes form a pot and the winner takes it.

### Where a fee fits in

If the site keeps a fee from the pot, the payout falls below 2x and the average player loses the fee over time. On PVPspinArena the house fee is configurable and shown openly; the default is 0%. Our [CS:GO coinflip guide](/guides/csgo-coinflip) explains how the online game works.`,
    },
    {
      id: "independence",
      title: "Every flip is independent",
      body: `The most important fact about coin flip odds is that each flip is independent. The coin has no memory. After five heads in a row, the next flip is still exactly 50/50.

### The gambler's fallacy

Many people feel that after a run of heads, tails is "due". This belief is called the gambler's fallacy. It is so common that it has a famous example: at the Monte Carlo Casino in 1913, black came up 26 times in a row on a roulette wheel, and gamblers lost large sums betting on red, convinced it had to appear.

### The hot-hand belief

The opposite belief, that a streak will continue, is also a mistake for a fair coin. Heads is not "hot" after landing several times.

### Why it feels wrong

Our brains look for patterns, and short sequences of random results often look patterned. Over a very large number of flips, heads and tails approach a 50/50 split, but that happens because the huge volume of later flips dilutes early imbalances, not because the coin corrects itself.

### What this means for betting

No pattern, timing or side choice changes your chance on the next flip. Strategies built on "due" results, such as doubling after a loss, do not improve the odds. See our [gambling budget guide](/guides/gambling-budget) for why that matters.`,
    },
    {
      id: "streaks",
      title: "Odds of streaks",
      body: `Streaks are where intuition goes most wrong. The chance of a particular side coming up n times in a row is (1/2)^n.

### A specific side in a row

- 2 heads in a row: 1 in 4 (25%)
- 3 in a row: 1 in 8 (12.5%)
- 4 in a row: 1 in 16 (6.25%)
- 5 in a row: 1 in 32 (about 3.1%)
- 6 in a row: 1 in 64 (about 1.6%)
- 7 in a row: 1 in 128 (about 0.78%)
- 10 in a row: 1 in 1,024 (about 0.098%)
- 20 in a row: 1 in 1,048,576

### Either side in a row

If you only care that the same side repeats, whichever it is, the chance doubles, because the first flip can be anything. Five of the same side in a row is 1 in 16.

### Streaks within longer runs

These numbers are for a streak starting at a particular flip. Within a long sequence, streaks are very likely somewhere. In 100 fair flips, the longest run of one side is typically around six or seven, and a run of at least five is almost certain.

### Why this matters

If you play many coinflips, you will see long losing streaks. They are normal, not a sign that something is wrong. Only verification, not streak length, tells you whether results are fair. The [provably fair calculator guide](/guides/provably-fair-calculator) shows how.`,
    },
    {
      id: "multiple",
      title: "Odds across several flips",
      body: `Sometimes you want the chance of a certain number of heads out of several flips, not a streak. This follows the binomial distribution.

### Formula

The probability of exactly k heads in n flips is C(n, k) ÷ 2^n, where C(n, k) is the number of ways to choose k flips out of n.

### Examples

- **Exactly 1 head in 2 flips**: C(2,1) = 2, so 2/4 = 50%.
- **Exactly 2 heads in 4 flips**: C(4,2) = 6, so 6/16 = 37.5%.
- **Exactly 5 heads in 10 flips**: C(10,5) = 252, so 252/1,024 ≈ 24.6%.
- **At least 1 head in 3 flips**: 1 − (1/2)^3 = 87.5%.

### A surprising point

Getting exactly half heads becomes less likely as you flip more, even though the proportion gets closer to 50%. In 10 flips, exactly 5 heads happens about 24.6% of the time. In 100 flips, exactly 50 heads happens only about 8% of the time, but the proportion will usually fall between 40% and 60%.

### Applied to betting

Over 10 coinflips at equal stakes with no fee, you are about as likely to be ahead as behind. Over many more, results drift in both directions. With a fee, the average result slowly trends downward by the fee.`,
    },
    {
      id: "physical",
      title: "Are real coins really 50/50?",
      body: `For physical coins, the answer is "almost, but not quite".

### The same-side bias

In 2007, statistician Persi Diaconis and colleagues published an analysis of coin-tossing physics. They predicted that a flipped coin is slightly more likely to land on the side that was facing up when it was tossed, because of the way coins wobble in the air.

In 2023, a team led by František Bartoš tested this with 350,757 real flips by 48 people. They found coins landed on the same side they started on about 50.8% of the time. The effect varied between people, but it was consistent overall.

### What about weight and shape?

The same study found no meaningful difference between heads and tails as such. The bias is about the starting side, not about which face is heavier. Spinning a coin on a table is different; with some coins, spinning can be heavily biased.

### Why it matters little in practice

A 50.8% bias only helps if you know the starting side and can place bets on many flips. For everyday decisions it is irrelevant. But it shows that "physically random" is not the same as perfectly fair, which is one reason digital games use cryptography instead.`,
    },
    {
      id: "digital",
      title: "Coin flip odds in online coinflip games",
      body: `An online coinflip does not toss anything. It produces random data and turns it into heads or tails. How it does that decides whether the odds are exact.

### PVPspinArena's method

For each game:

1. A random 32-byte server seed is generated and its SHA-256 hash is published before the second player joins.
2. The result is HMAC-SHA256 of the seed and the message \`PVPCasino:coinflip:v1:{game}:{draw_version}\`.
3. If the lowest bit of the first byte is 0, the result is heads; if 1, tails.

A single bit of a cryptographic output is equally likely to be 0 or 1, so the odds are exactly 50/50. There is no starting-side bias, no wobble and no way for the site to choose the result after seeing who joined.

### Why not use random numbers from 1 to 100?

Some games generate a number and call heads for 1 to 50 and tails for 51 to 100. That also works if done carefully. Using one bit is simply the most direct method for two outcomes, with no mapping step that could introduce bias.

### Checking it

You can recompute any finished game on the [Fairness page](/fairness), or read the method in our [HMAC-SHA256 guide](/guides/hmac-sha256-provably-fair).`,
    },
    {
      id: "expected-value",
      title: "Expected value in coinflip betting",
      body: `Expected value is the average result per bet if you repeated it many times.

### No fee

Two players each stake $10. The winner takes $20. Your expected value is 0.5 × $20 − $10 = $0. You break even on average.

### 2% fee

The pot pays $19.60. Expected value is 0.5 × $19.60 − $10 = −$0.20 per flip, or −2% of your stake.

### 5% fee

The pot pays $19.00. Expected value is −$0.50 per flip, or −5% of your stake.

### Volatility

Even with zero expected value, results swing. After 100 flips at $10 each, a typical spread of outcomes is roughly plus or minus $100, and larger swings are possible. That is why a session budget matters more than any strategy.

### Martingale does not help

Doubling your stake after each loss aims to recover all losses with one win. It works until you hit a long losing streak, which the table above shows is common. Seven losses in a row, a 1 in 128 event for each attempt, turns a $1 starting stake into a $128 required bet. Our upcoming [Martingale guide](/guides/martingale-strategy) covers this in detail.`,
    },
    {
      id: "next",
      title: "See the odds in action",
      body: `If you want to see these odds for yourself, watch a run of games in the [Coinflip lobby](/coinflip) and note how often streaks appear. Then pick a few finished games and verify them on the Fairness page. For an overview of how Coinflip, Jackpot and Roulette fit together on PVPspinArena, read [how it works](/how-it-works).`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `A fair coin flip is 50/50, and every flip is independent of the ones before. Streaks are far more common than intuition suggests: five of one side in a row is 1 in 32 from any given flip, and runs of six or seven are typical in 100 flips.

Real coins have a small bias towards their starting side, about 50.8% in a large 2023 study. Digital coinflips can be exactly 50/50: PVPspinArena uses one bit of an HMAC-SHA256 output from a seed committed before the game.

In PvP coinflip betting, the fee is the only thing that moves expected value away from zero. No side, timing or doubling system changes the odds, so play with a fixed budget.`,
    },
  ],
  faqs: [
    {
      q: "What are the odds of a coin flip?",
      a: "For a fair coin, 50% heads and 50% tails on every flip, or odds of 1 to 1. Past results do not change the next flip.",
    },
    {
      q: "What are the odds of flipping heads 10 times in a row?",
      a: "1 in 1,024, or about 0.098%, starting from a given flip. Across a long run of flips, the chance of such a streak somewhere is higher.",
    },
    {
      q: "Is a real coin flip truly 50/50?",
      a: "Almost. A 2023 study of over 350,000 flips found coins land on their starting side about 50.8% of the time. Digital coinflips can be exactly 50/50.",
    },
    {
      q: "Does choosing heads or tails matter in online coinflip?",
      a: "No. In a fair online coinflip, both sides have exactly the same chance. Choosing a side has no effect on the result.",
    },
    {
      q: "Can a betting system beat coin flip odds?",
      a: "No. Systems that change stakes based on past results do not change the 50% chance of each flip, and many increase the risk of big losses.",
    },
  ],
  sources: [
    { label: "Bartoš et al. (2023): Fair coins tend to land on the same side they started", url: "https://arxiv.org/abs/2310.04153" },
    { label: "Diaconis, Holmes and Montgomery (2007): Dynamical bias in the coin toss", url: "https://doi.org/10.1137/S0036144504446436" },
    { label: "Wikipedia: Gambler's fallacy", url: "https://en.wikipedia.org/wiki/Gambler%27s_fallacy" },
    { label: "Wikipedia: Binomial distribution", url: "https://en.wikipedia.org/wiki/Binomial_distribution" },
  ],
  related: ["csgo-coinflip-sites", "csgo-coinflip", "house-edge", "martingale-strategy", "hmac-sha256-provably-fair"],
  updated: "2026-09-25",
};
