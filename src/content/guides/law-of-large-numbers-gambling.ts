import type { Guide } from "./types";

export const guide: Guide = {
  slug: "law-of-large-numbers-gambling",
  cluster: "Casino knowledge",
  keyword: "law of large numbers",
  secondary: [
    "law of large numbers gambling",
    "law of large numbers casino",
    "why the house always wins",
    "law of averages gambling",
  ],
  title: "Law of Large Numbers: Why the House Wins Over Volume",
  description:
    "The law of large numbers in gambling: why averages converge to the house edge, why totals still swing, and roulette maths for 10 to 10,000 bets.",
  h1: "Law of large numbers in gambling: why volume favours the house",
  answer:
    "The law of large numbers says that as you repeat an independent bet, your average result per bet gets closer and closer to its expected value. In gambling that expected value is the house edge. One session can win, but across thousands of bets the average loss per dollar settles near the edge, which is why a casino with enormous volume earns a predictable percentage.",
  facts: [
    "Jacob Bernoulli proved the first version of the law in Ars Conjectandi, published in 1713 after his death.",
    "The law is about averages. The spread of your total result keeps growing, roughly with the square root of the number of bets.",
    "On a 33-slot wheel paying 2x on 16 Purple slots, a $1 flat bettor is ahead after 10 spins about 34% of the time, after 1,000 spins about 16%.",
    "A house taking one million $1 Purple bets expects about $30,300 before the win fee, give or take roughly $2,000.",
    "The law does not say past results get balanced out. That belief is the gambler's fallacy.",
  ],
  sections: [
    {
      id: "what-it-says",
      title: "What the law of large numbers actually says",
      body: `Take any bet whose outcomes are independent and identically distributed: every spin of the same wheel, every flip of the same coin, every hand dealt from a freshly shuffled shoe with the same rules. Give that bet an expected value, call it μ. The law of large numbers says that the average of your first n results, (X₁ + X₂ + … + Xₙ) / n, converges to μ as n grows.

There are two formal versions.

- **Weak law:** for any small margin you choose, the probability that the sample average sits outside μ ± that margin shrinks towards zero as n grows.
- **Strong law:** with probability 1, the sequence of averages eventually settles at μ and stays there.

For a gambler the difference rarely matters. Both say the same practical thing: over enough repetitions, the average result per bet stops being a surprise.

Jacob Bernoulli worked on the idea for about two decades and it appeared in *Ars Conjectandi* in 1713, eight years after his death. He framed it as drawing coloured pebbles from an urn: draw often enough and the observed proportion approaches the true proportion. A roulette wheel is an urn you draw from with replacement, so his framing fits casino games almost exactly.

The expected value of a casino bet is negative by design. The size of that negative number is the [house edge](/guides/house-edge), and that page keeps the definition and the table of edges by game. This page is about what happens when you repeat a bet with that edge many times. If you want the arithmetic behind μ itself, [expected value in gambling](/guides/expected-value-gambling) walks through it.`,
    },
    {
      id: "averages-vs-totals",
      title: "Averages converge, totals still swing",
      body: `This is the part most people get backwards. The law says your **average** converges. It says nothing reassuring about your **total**.

Use a concrete bet: $1 on Purple on a 33-slot wheel where 16 Purple slots pay 2x, 16 Silver slots pay 2x and 1 Green slot pays 14x. A Purple bet wins $1 with probability 16/33 and loses $1 with probability 17/33.

- Expected value per bet: (16/33)(+1) + (17/33)(−1) = −1/33 ≈ −$0.0303.
- Variance per bet: 1 − (1/33)² ≈ 0.999, so the standard deviation is almost exactly $1.

After n bets the expected total is −n/33, and the standard deviation of the total is about √n dollars. The expected loss grows in proportion to n. The noise grows only with √n. That mismatch is the whole law in one line.

| Bets (n) | Expected result | Std dev of total | P(ahead) | P(exactly even) |
| --- | --- | --- | --- | --- |
| 10 | −$0.30 | $3.16 | 34.0% | 24.5% |
| 100 | −$3.03 | $10.00 | 34.3% | 7.6% |
| 1,000 | −$30.30 | $31.61 | 16.1% | 1.6% |
| 10,000 | −$303.03 | $99.95 | about 1 in 850 | ~0% |

The probabilities come from the exact binomial distribution, not a rule of thumb. Read the table two ways.

### From the player's seat

At 10 spins the edge is invisible. A loss of 30 cents is buried under a $3 swing. About a third of sessions of 10 or 100 spins finish ahead, so plenty of players have real memories of beating the wheel. At 1,000 spins the expected loss is about one standard deviation, and roughly 16% of sessions still finish ahead. At 10,000 spins finishing ahead is about 1 in 850.

### From the average's seat

The standard deviation of the **average** is 1/√n: about 32 cents per bet at n = 10, 3 cents at n = 1,000, 1 cent at n = 10,000. That shrinking spread around −3.03 cents is the convergence Bernoulli proved.

A fair game shows the same effect with no drift. On a 50/50 coin flip the average result converges to zero, yet the typical distance of your total from zero after 10,000 flips is about 100 units. Being $100 up or down after 10,000 flips is ordinary, not a sign that anything is owed back. [Variance in gambling](/guides/variance-in-gambling) goes deeper on that spread.`,
    },
    {
      id: "house-side",
      title: "Why the house wins over volume",
      body: `A single player might make a few hundred bets in a night. A casino, or any operator running a house-banked game, sees millions. Put the house on the other side of the same Purple bet.

- One million $1 bets.
- Expected hold: 1,000,000 × 1/33 ≈ $30,303.
- Standard deviation of the hold: about √1,000,000 ≈ $1,000.

So the house can say with about 95% confidence that its result lands between roughly $28,300 and $32,300. That is a band of about $4,000 around a $30,300 forecast. The house is not gambling in any meaningful sense. It is running a business with a known margin and a small statistical wobble.

### Why big bets still matter to a casino

The √n rule assumes equal stakes. One player betting $1 million on a single spin adds as much variance as a trillion $1 bets would add in total. That is why physical casinos set table maximums and why high-roller play is priced and managed separately. Volume only protects the house when no single bet dominates it.

### Why the edge does not need to be large

At a 1% edge, the expected result after n bets is 0.01n and the noise is about √n. The expected loss overtakes one standard deviation at n = 10,000 bets and two standard deviations at 40,000. A slot machine resolves hundreds of spins an hour. A busy casino floor passes those counts every few minutes. Small edges are enough when volume is huge.

The same arithmetic explains why a player cannot turn a negative game into a positive one by playing more. Extra volume is exactly what lets the house's average show up.`,
    },
    {
      id: "law-of-averages",
      title: "The law of large numbers is not the law of averages",
      body: `The phrase "law of averages" is often used to mean something the mathematics does not say: that after a run of Silver, Purple is now due, or that a losing player is owed a comeback.

The real law works by **dilution**, not correction. Suppose the first 10 spins you watch contain 8 Purple. Over the next 990 spins you expect 480 more Purples, because each spin still has a 16/33 chance. Your running total is then about 488 out of 1,000, or 48.8%. The early excess of about 3.2 Purples above expectation has not been cancelled. It is still there. It has simply become a small share of a large sample.

The belief that the wheel actively corrects itself is the [gambler's fallacy](/guides/gamblers-fallacy), and that page covers the independence mistake in detail. The related effect where an extreme result tends to be followed by a less extreme one, without any balancing force, is [regression to the mean](/guides/regression-to-the-mean-gambling).

A quick test of which idea you are using: if your reasoning changes the probability of the **next** spin, it is the fallacy. If it only changes what you expect the **long-run percentage** to look like, it is the law.`,
    },
    {
      id: "speed",
      title: "How fast results converge: variance sets the pace",
      body: `Two bets with the same edge can converge at very different speeds. Purple and Green on this wheel do not share an edge. Purple returns 32/33 before the win fee, so the expected loss is 1/33 of the stake. Green returns 14/33, so the expected loss is 19/33. Green also swings more.

| Bet | Win chance | Net win | Std dev per $1 bet | Bets for edge to reach 2 std devs |
| --- | --- | --- | --- | --- |
| Purple or Silver | 16/33 | +$1 | ≈ $1.00 | ≈ 4,400 |
| Green | 1/33 | +$13 | ≈ $2.40 | ≈ 70 |

The last column solves n × |edge| = 2√n × σ, which gives n = (2σ / |edge|)². Green's leak is large enough that the price shows up after a few dozen bets, even though each result swings more. A long shot priced at the same edge as Purple would take longer. This Green is not that bet.

Same-edge long shots, lottery tickets and high-volatility slots still produce more "I won big" stories than even-money bets do. They do not return more. They keep the noise large for longer, so more players quit while ahead of their expected result.

### When the law does not apply cleanly

The theorem has conditions. Real gambling sometimes breaks them.

- **Changing odds.** In blackjack the composition of the remaining shoe shifts the edge hand to hand. That dependence is what [card counting](/guides/card-counting) exploits.
- **Changing stakes.** Progressions such as the [Martingale strategy](/guides/martingale-strategy) vary the stake with results. The law still applies per dollar wagered, so expected loss remains edge × total turnover.
- **Infinite expected value.** When a game's expected value is not finite, averages do not settle at all. The [St Petersburg paradox](/guides/st-petersburg-paradox) is the classic example.
- **Skill games.** In poker or player-vs-player matches your expected value depends on opponents, so it can move as the field changes.`,
    },
    {
      id: "pvpspinarena",
      title: "The law of large numbers on PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on Base, and each one shows the law differently.

- **[Roulette](/roulette)** is the table above. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Picking Green changes both the cost and how fast that cost shows up.
- **[Coinflip](/coinflip)** is two players on a 50/50. Over many flips your win rate converges to 50%, and your average result converges to minus whatever fee was shown before entry. Your total can still sit well above or below that line for a long time.
- **[Jackpot](/)** gives each player a win chance equal to their share of the pot. Over many rounds your share of wins converges to your average share of pots, so your average return converges to what you put in minus any fee shown before entry.

Every round comes from committed seeds, and any settled round can be checked on [fairness](/fairness). Verification tells you each draw was honest. It is the honesty of each draw that makes the law of large numbers a reliable forecast rather than a hope.

The practical use for a player is budgeting, not beating the game. Multiply your planned turnover by the edge and you have the expected cost of a session. Everything else is variance. If sessions are getting longer so that you can "let the averages work", that is chasing, and the tools on [responsible gambling](/responsible-gambling) are there for it. Gambling on PVPspinArena is 18+. More guides on probability sit in the [casino knowledge topic](/guides/topics/casino-knowledge).`,
    },
  ],
  faqs: [
    {
      q: "What is the law of large numbers in simple terms?",
      a: "If you repeat the same independent bet many times, your average result per bet gets closer to the bet's expected value. For casino games that expected value is the house edge, so the average loss per dollar becomes predictable.",
    },
    {
      q: "Does the law of large numbers mean I am due a win?",
      a: "No. The law works by diluting past results with new ones, not by correcting them. Each spin or flip keeps the same probability no matter what came before.",
    },
    {
      q: "Why does the house always win in the long run?",
      a: "Expected loss grows in proportion to the number of bets, while random swings grow only with the square root. With millions of bets, the house's result lands very close to edge times turnover.",
    },
    {
      q: "How many bets does it take for the house edge to show?",
      a: "It depends on the edge and the variance. On Purple, the 3.03% edge before the win fee outweighs two standard deviations after about 4,400 bets. Green, at a much larger edge, reaches that point after about 70 bets.",
    },
    {
      q: "Can a betting system beat the law of large numbers?",
      a: "No. The law applies to every dollar you wager. Changing stakes changes how your results are spread out, but expected loss is still the edge times your total turnover.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Law of large numbers",
      url: "https://en.wikipedia.org/wiki/Law_of_large_numbers",
    },
    {
      label: "Encyclopaedia Britannica: Law of large numbers",
      url: "https://www.britannica.com/science/law-of-large-numbers",
    },
    { label: "Wizard of Odds: House edge", url: "https://wizardofodds.com/gambling/house-edge/" },
  ],
  related: [
    "regression-to-the-mean-gambling",
    "monty-hall-problem",
    "st-petersburg-paradox",
    "house-edge",
    "gamblers-fallacy",
    "variance-in-gambling",
  ],
  updated: "2026-09-27",
};
