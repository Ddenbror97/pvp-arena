import type { Guide } from "./types";

export const guide: Guide = {
  slug: "st-petersburg-paradox",
  cluster: "Casino knowledge",
  keyword: "st petersburg paradox",
  secondary: [
    "st. petersburg paradox",
    "st petersburg game",
    "infinite expected value",
    "bernoulli expected utility",
  ],
  title: "St Petersburg Paradox: Infinite EV and Finite Bankrolls",
  description:
    "The St Petersburg paradox explained: a coin game with infinite expected value, why nobody pays much for it, utility, finite bankrolls and the martingale link.",
  h1: "St Petersburg paradox: infinite expected value, finite wallets",
  answer:
    "The St Petersburg paradox is a coin-flipping game whose expected payout is infinite, yet almost nobody would pay more than about $20 to play it. You flip until heads appears, and the prize doubles with every tail. The paradox shows that expected value alone is not a full guide to betting decisions. Utility, bankroll limits and a banker's ability to pay all matter.",
  facts: [
    "Nicolaus Bernoulli posed the problem in 1713 in letters to the French mathematician Pierre Rémond de Montmort.",
    "Daniel Bernoulli published his solution in 1738 in the journal of the St Petersburg Academy, which gave the paradox its name.",
    "With a $2 first prize doubling each round, every possible round adds exactly $1 to the expected value, so the sum never stops.",
    "Log utility, Daniel Bernoulli's proposal, prices the game at about $10.95 for someone worth $1,000 and about $20.87 for a millionaire.",
    "If the banker can pay at most 2^N dollars, the game's expected value drops to N + 1 dollars.",
  ],
  sections: [
    {
      id: "game",
      title: "The St Petersburg game",
      body: `A fair coin is flipped until it lands heads. If heads comes on the first flip you win $2. If the first heads is on the second flip you win $4, on the third flip $8, and so on. The prize doubles for every tail before the first heads.

| First heads on flip | Probability | Prize | Contribution to EV |
| --- | --- | --- | --- |
| 1 | 1/2 | $2 | $1 |
| 2 | 1/4 | $4 | $1 |
| 3 | 1/8 | $8 | $1 |
| 10 | 1/1,024 | $1,024 | $1 |
| 20 | about 1 in 1.05 million | $1,048,576 | $1 |
| k | 1/2ᵏ | $2ᵏ | $1 |

Expected value is the sum of probability times prize across every outcome: $1 + $1 + $1 + … with no end. Formally it diverges to infinity. So in the language of [expected value in gambling](/guides/expected-value-gambling), a rational player who only cares about EV should pay any finite price, $100, $1 million or their entire net worth, for one play.

Nobody does. Ask people what they would pay and the answers cluster at a few dollars to perhaps $20. That gap between the infinite theoretical value and the small practical price is the paradox.

It matters because EV is the standard tool this whole site uses to judge bets. The St Petersburg game is the best-known case where applying it naively gives an absurd answer, and understanding why sharpens every other use of the tool.

### A game of mostly small prizes

Half of all plays pay $2. Three-quarters pay $4 or less. Seven-eighths pay $8 or less. The median payout is between $2 and $4. The infinite EV lives entirely in astronomically rare outcomes, each contributing one dollar, stacked forever.`,
    },
    {
      id: "history",
      title: "Where the paradox came from",
      body: `The problem dates from the early 18th century correspondence that shaped probability theory.

- **1713:** Nicolaus Bernoulli described the game, in a slightly different form, in letters to Pierre Rémond de Montmort, who published the exchange in the second edition of his book on games of chance.
- **1728:** Gabriel Cramer, a Swiss mathematician, replied to Nicolaus with a suggestion that the value of money to a person grows more slowly than the amount itself. He considered both a square-root rule and a cap on meaningful wealth.
- **1738:** Daniel Bernoulli, Nicolaus's cousin, published his "Exposition of a New Theory on the Measurement of Risk" in the *Commentarii* of the Imperial Academy of Sciences in St Petersburg. He proposed that utility grows with the logarithm of wealth, and the paradox took the city's name from the journal.

Daniel Bernoulli's paper is widely treated as the origin of expected utility theory, which later became central to economics. He also made an observation that still matters to anyone setting a bet size: the same gain means less to a rich person than to a poor one, so the same gamble can be sensible for one and reckless for the other.

In 1934 Karl Menger pointed out that utility alone cannot fully dissolve the paradox. If prizes grow fast enough, for example so that the **utility** of the prize doubles each round, the expected utility is infinite too. This "super-St Petersburg" version pushed later writers towards the more practical answers below.`,
    },
    {
      id: "utility",
      title: "The utility answer: money is not linear",
      body: `Bernoulli's key move was to value outcomes by how much they improve your life, not by their face value. With logarithmic utility, going from $1,000 to $2,000 feels about the same as going from $1 million to $2 million. Each doubling is worth one step.

Apply that to the prize alone, ignoring your wealth. The expected log₂ of the prize is 1/2 × 1 + 1/4 × 2 + 1/8 × 3 + … = 2. The dollar amount whose log₂ is 2 is $4. So a log-utility player with no other money would value the game at about $4.

Including the player's wealth gives a more realistic price. The maximum you should pay is the amount c at which your expected log-wealth after paying c and playing equals your log-wealth now. Solving that numerically for this page:

| Your wealth | Maximum price under log utility |
| --- | --- |
| $10 | about $4.97 |
| $100 | about $7.79 |
| $1,000 | about $10.95 |
| $1,000,000 | about $20.87 |
| $1,000,000,000 | about $30.84 |

Even a billionaire should pay only about $31. The price rises by roughly $10 each time wealth grows a thousandfold, because each thousandfold is about ten doublings.

Cramer's square-root rule gives a similar answer. The expected square root of the prize is about 2.414, which squares back to a certainty equivalent of about $5.83.

The link to modern betting maths is direct. Maximising expected log-wealth is exactly the rule behind the [Kelly criterion](/guides/kelly-criterion), which sizes each bet as a fraction of bankroll so that growth is maximised and ruin is never certain.`,
    },
    {
      id: "finite",
      title: "The finite bankroll answer: nobody can pay",
      body: `A more down-to-earth resolution says the infinite prizes are fiction. Every real banker has a limit. Suppose the banker can pay at most 2ᴺ dollars, so any game that would pay more pays 2ᴺ instead.

Rounds 1 to N each contribute $1, as before. All the rounds after N together contribute 2ᴺ × (1/2ᴺ) = $1. So the capped game is worth exactly **N + 1 dollars**.

| Banker can pay up to | N | Expected value of one play |
| --- | --- | --- |
| $1,024 | 10 | $11 |
| $1,048,576 (about $1 million) | 20 | $21 |
| $1,073,741,824 (about $1 billion) | 30 | $31 |
| About $1.1 trillion | 40 | $41 |
| About $1.1 quadrillion | 50 | $51 |

A game backed by a quadrillion dollars, far more than any institution on Earth could pay, is worth about $51. The intuitive $10 to $20 answer is not irrational at all. It is roughly what the game is worth when played against any bank that could actually exist.

### What repeated play looks like

The [law of large numbers](/guides/law-of-large-numbers-gambling) needs a finite expected value, so the uncapped game breaks it. Averages never settle. A simulation run for this page gave these median average payouts per game:

- 10 games: about $5.80
- 1,000 games: about $12.60
- 100,000 games: about $18.30

The average creeps up roughly with log₂ of the number of games, a result William Feller formalised. You would need about a million games for the typical average to reach the low $20s. Most of the time the average sits low, then an occasional monster payout drags it upward.`,
    },
    {
      id: "martingale",
      title: "The mirror image: martingale and doubling systems",
      body: `The St Petersburg game pays small amounts often and enormous amounts very rarely. The [Martingale strategy](/guides/martingale-strategy) is its mirror: it wins small amounts often and loses an enormous amount rarely. Both are built from the same doubling sequence, and both look magical only when bankrolls are infinite.

With an infinite bankroll and no table limit, doubling after every loss on a fair coin guarantees a $1 profit eventually. That "guarantee" is as fictional as the St Petersburg game's infinite EV, and for the same reason: it depends on being able to survive an unlimited run of tails.

Put a real limit on it. On a bet that wins with probability 16/33, such as Purple on a 33-slot wheel paying 2x, allow seven doubles starting at $1. The stakes are $1, $2, $4 … $64, and covering all seven needs $127.

- P(all seven lose) = (17/33)⁷ ≈ 1.23%, losing $127.
- Otherwise the sequence ends with a $1 profit.
- EV = 0.9877 × $1 − 0.0123 × $127 ≈ −$0.57 per sequence.

That −$0.57 is exactly the 7.88% Purple or Silver edge times the expected turnover of about $8.57 per sequence. The doubling changed the shape of the results, not their mean. [Risk of ruin](/guides/risk-of-ruin) shows how quickly a finite bankroll meets its long run, and the [double or nothing strategy](/guides/double-or-nothing-strategy) guide looks at letting a win ride, which is the St Petersburg structure from the player's side.`,
    },
    {
      id: "lessons",
      title: "What the paradox teaches bettors",
      body: `- **EV is necessary but not sufficient.** A bet can have positive EV and still be a bad idea if the downside could ruin you or the upside is too rare to matter in your lifetime.
- **Check the tail.** When most of a bet's value comes from outcomes you will almost never see, ask whether the counterparty could pay them and whether you would still be playing when they happen.
- **Size by bankroll, not by EV.** Bernoulli's point that a gamble's worth depends on your wealth is the root of fractional staking.
- **Beware infinite-looking systems.** Any system whose promise depends on unlimited doubling, unlimited credit or unlimited time is borrowing from a St Petersburg-style fiction.

More puzzles like this sit in the [casino knowledge topic](/guides/topics/casino-knowledge), including the [Monty Hall problem](/guides/monty-hall-problem).`,
    },
    {
      id: "pvpspinarena",
      title: "Doubling on PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on Base, and every one of them has finite, published odds. No round has an infinite tail.

- On [Roulette](/roulette), Purple and Silver pay 2x on 16 of 33 slots and Green pays 14x on 1 slot. Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. A chain of doubles is a capped St Petersburg run with that edge applied to each link.
- On [Coinflip](/coinflip), two players take a 50/50. Letting a win ride doubles the stake each round and halves the chance of surviving, so the chain's value is exactly what you started with, minus any fee shown before entry at each step.
- On Jackpot, your chance equals your share of the pot, so a long-shot entry has a small chance at a large payout without any doubling at all.

Seeds are committed before each round and every settled result can be checked on [fairness](/fairness). Play is 18+, and if a doubling chain is starting to feel like a way to win back losses, the limits on [responsible gambling](/responsible-gambling) are the right tool.`,
    },
  ],
  faqs: [
    {
      q: "What is the St Petersburg paradox?",
      a: "It is a coin game where you flip until heads and the prize doubles with every tail. Its expected payout is infinite, yet people will only pay a few dollars to play. The gap between the two is the paradox.",
    },
    {
      q: "How much should you pay to play the St Petersburg game?",
      a: "Under Daniel Bernoulli's log utility, about $11 if you are worth $1,000 and about $21 if you are worth $1 million. Against a banker who can pay at most about $1 million, the game is worth $21 in plain EV.",
    },
    {
      q: "How did Daniel Bernoulli solve the St Petersburg paradox?",
      a: "He argued that people value money by the utility it brings, which grows roughly with the logarithm of wealth. Under log utility the expected value of the game becomes finite and small.",
    },
    {
      q: "Is the St Petersburg paradox related to the martingale strategy?",
      a: "Yes. Both rely on a doubling sequence and both only work with infinite money. With any real bankroll or table limit, martingale keeps the house edge on every dollar wagered.",
    },
    {
      q: "Why doesn't the law of large numbers fix the paradox?",
      a: "The law of large numbers requires a finite expected value. The St Petersburg game's average payout keeps creeping upward, roughly with the logarithm of the number of games played, and never settles.",
    },
  ],
  sources: [
    {
      label: "Stanford Encyclopedia of Philosophy: The St. Petersburg Paradox",
      url: "https://plato.stanford.edu/entries/paradox-stpetersburg/",
    },
    {
      label: "Wikipedia: St. Petersburg paradox",
      url: "https://en.wikipedia.org/wiki/St._Petersburg_paradox",
    },
    {
      label: "Encyclopaedia Britannica: Daniel Bernoulli",
      url: "https://www.britannica.com/biography/Daniel-Bernoulli",
    },
  ],
  related: [
    "law-of-large-numbers-gambling",
    "monty-hall-problem",
    "regression-to-the-mean-gambling",
    "martingale-strategy",
    "expected-value-gambling",
    "kelly-criterion",
  ],
  updated: "2026-09-27",
};
