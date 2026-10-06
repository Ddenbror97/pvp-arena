import type { Guide } from "./types";

export const guide: Guide = {
  slug: "edward-thorp",
  cluster: "Casino knowledge",
  keyword: "edward thorp",
  secondary: ["ed thorp", "edward o thorp", "beat the dealer thorp", "thorp card counting"],
  title: "Edward Thorp: Beat the Dealer, Kelly and Card Counting",
  description:
    "Edward Thorp's story: the maths behind Beat the Dealer, the first card counting system, Kelly bet sizing, the roulette computer and his move to finance.",
  h1: "Edward Thorp: the mathematician who proved blackjack could be beaten",
  answer:
    "Edward Thorp is the American mathematician who proved, with computer analysis, that blackjack can be beaten by tracking which cards have left the deck. His 1962 book Beat the Dealer introduced card counting to the public. He then co-built a wearable roulette computer with Claude Shannon, popularised Kelly bet sizing for gamblers and investors, and ran one of the first quantitative hedge funds.",
  facts: [
    "Born in Chicago in 1932; PhD in mathematics from UCLA (1958).",
    'Presented "Fortune\'s Formula: The Game of Blackjack" to the American Mathematical Society in January 1961.',
    "Beat the Dealer (1962) introduced the ten-count and made card counting public knowledge.",
    "Built a wearable roulette-prediction computer with Claude Shannon around 1960–1961.",
    "Co-wrote Beat the Market (1967) and co-founded Princeton Newport Partners in 1969.",
  ],
  sections: [
    {
      id: "early",
      title: "From physics student to blackjack problem",
      body: `Edward Oakley Thorp was born in Chicago in 1932 and grew up in California. He studied physics and then mathematics at UCLA, earning a PhD in 1958. He later taught at MIT, New Mexico State University and the University of California, Irvine.

His route into gambling was academic. In 1956, four US Army engineers (Roger Baldwin, Wilbert Cantey, Herbert Maisel and James McDermott) published a paper in the *Journal of the American Statistical Association* giving a near-optimal playing strategy for blackjack. Worked out with desk calculators, it cut the house edge to roughly half a percent. Thorp took their strategy card to Las Vegas, played small stakes, and noticed something the paper had set aside: the deck changes as it is dealt.

That observation is the whole idea. Roulette and dice have no memory; each spin or roll starts fresh. A blackjack deck does have memory until it is shuffled. If the remaining cards are rich in tens and aces, the player gains; if they are rich in fives and sixes, the dealer gains. Thorp's question was how much, and whether a player could bet more when the balance tipped his way.

This page covers Thorp himself. The general history of famous players sits on the [famous gamblers](/guides/famous-gamblers) hub in the [Casino knowledge topic](/guides/topics/casino-knowledge).`,
    },
    {
      id: "computer",
      title: "The computer proof and Beat the Dealer",
      body: `Thorp moved to MIT in 1959 and used the institute's IBM 704 to calculate the player's expectation for decks with specific cards removed. The results showed that removing fives helped the player most, and that a deck rich in ten-value cards could give the player a positive edge.

In January 1961 he presented the findings to the American Mathematical Society under the title "Fortune's Formula: The Game of Blackjack", and published "A Favorable Strategy for Twenty-One" in the *Proceedings of the National Academy of Sciences* the same year. Newspapers picked up the story, and investors called.

### The Reno test

Two backers, the gambler Emmanuel "Manny" Kimmel and his associate Eddie Hand, put up $10,000. By Thorp's own account, a weekend in Reno and Lake Tahoe roughly doubled the bank before casinos began shuffling on him and barring him. The exact figure comes from his own writing, so treat it as his record rather than an audited one.

### The book

*Beat the Dealer* appeared in 1962 and became a bestseller. It gave readers a complete basic strategy and a counting method, and it changed casino blackjack permanently.

### The ten-count

Thorp's main system tracked two numbers: ten-value cards seen and all other cards seen. A full deck holds 16 tens and 36 others, a ratio of 36 ÷ 16 = 2.25. As tens stayed in the deck and small cards came out, the ratio of remaining "others" to remaining tens fell, and the player's edge rose. Thorp's tables mapped ratios to bet sizes and to strategy changes.

The ten-count was accurate but hard to run at speed. The revised 1966 edition added a simpler point count, the approach that became the Hi-Lo system most counters learn today. See [card counting](/guides/card-counting) for how the modern count works.`,
    },
    {
      id: "response",
      title: "How casinos responded",
      body: `The commonly told account is that in 1964 Las Vegas casinos changed their blackjack rules in response to *Beat the Dealer*, restricting doubling down and splitting. Recreational players, who could not count and did not care, disliked the worse rules and play fell off, so the changes were reversed within weeks. Casinos learned a lesson that still holds: most blackjack players are not counters, and punishing everyone to stop a few costs money.

The lasting countermeasures were quieter:

- **More decks.** Multi-deck shoes dilute the effect of each removed card. A true count of +2 is harder to reach in six decks than in one. See [how many decks in blackjack](/guides/how-many-decks-blackjack).
- **Earlier shuffles.** Cutting off a large share of the shoe (poor "penetration") keeps the count from ever getting extreme.
- **Barring.** Private casinos in Nevada could, and still can, refuse to deal to a player they suspect of counting.
- **Surveillance files.** Casinos and agencies built photo books of known counters.

Thorp himself used disguises on later trips and reported being cheated by dealers who were dealing second cards. Card counting in your head is legal; the question of what a casino may do in response is covered in [is card counting illegal](/guides/is-card-counting-illegal).`,
    },
    {
      id: "roulette-kelly",
      title: "The roulette computer and the Kelly criterion",
      body: `### A wearable computer with Claude Shannon

At MIT, Thorp approached Claude Shannon, the founder of information theory, about predicting roulette. A roulette ball and rotor obey physics: if you can time the ball's speed and the rotor's speed early in a spin, you can predict, imperfectly, which section of the wheel the ball will land in.

Working in Shannon's home laboratory around 1960–1961, the pair built a small computer that fitted in a shoe and a pocket. A toe switch timed the wheel; a tone in an earpiece signalled which octant (one-eighth of the wheel) to bet on. Thorp later reported an expected return of about +44% on bets placed on the predicted octant. Trials in Las Vegas in 1961 were hampered by fragile wires, and the device was never used seriously. It is widely credited as one of the first wearable computers. Nevada later outlawed such devices.

### Kelly bet sizing

Shannon also pointed Thorp to a 1956 Bell Labs paper by John L. Kelly Jr. on the growth rate of capital when a gambler has an edge. Thorp was among the first to apply it to real gambling.

For an even-money bet that wins with probability p, the Kelly fraction of bankroll to stake is:

f* = 2p − 1

At p = 0.51 that is 0.02, or 2% of bankroll. Blackjack is not a clean even-money bet, so counters use an approximation: edge ÷ variance. With a 1% edge and a per-hand variance of about 1.3, f ≈ 0.01 ÷ 1.3 ≈ 0.77%. On a $10,000 bankroll that is a $77 bet, and many professionals bet half of that to cut the swings. The full treatment is in the [Kelly criterion](/guides/kelly-criterion) guide.

Kelly's key point is that betting too big is worse than betting too small. Staking twice the Kelly fraction gives an expected growth rate of roughly zero, even with a genuine edge.`,
    },
    {
      id: "finance",
      title: "From casinos to Wall Street",
      body: `Thorp saw the stock market as a larger, better-paying casino. With the economist Sheen Kassouf he wrote *Beat the Market* (1967), which described hedging stock warrants: buy the stock, sell overpriced warrants on it, and hold a position that profits from the mispricing while being largely insulated from the stock's direction. By Thorp's account, he was using a pricing formula equivalent to what became the Black-Scholes model before its 1973 publication.

In 1969 he co-founded Princeton Newport Partners with Jay Regan, one of the earliest quantitative hedge funds. The fund reported strong, steady returns for nearly two decades. It closed at the end of the 1980s after a federal investigation into trading at the firm's Princeton office; Thorp, who ran the California side, was not charged.

He later ran other funds, and by his own account he examined Bernard Madoff's reported returns for a client in 1991 and concluded they could not be real, years before the fraud was exposed in 2008.

His 2017 memoir, *A Man for All Markets*, covers the whole arc. The through-line is the same in every chapter: find a measurable edge, size the bet to survive the variance, and walk away when the edge is gone.

| Year | Milestone |
| --- | --- |
| 1956 | Baldwin group publishes blackjack strategy |
| 1961 | AMS talk, PNAS paper and roulette computer tests |
| 1962 | *Beat the Dealer* |
| 1966 | Revised edition adds a simpler point count |
| 1967 | *Beat the Market* with Sheen Kassouf |
| 1969 | Princeton Newport Partners founded |
| 2017 | *A Man for All Markets* |`,
    },
    {
      id: "lessons",
      title: "What Thorp's method teaches every player",
      body: `### An edge must be measured, not felt

Thorp did not trust intuition. He computed the expected value of each deck state before betting on it. Most gambling "systems" skip this step. A progression like the Martingale changes stake sizes but never changes the expectation of a single bet; see [expected value](/guides/expected-value-gambling).

### Independence decides everything

Card counting works only because blackjack cards are dealt without replacement. On a game with independent trials, such as roulette, there is nothing to count; past spins carry no information. Continuous shuffling machines turn blackjack into that kind of game.

### Size to survive

A 1% edge produces violent swings. A counter can be down hundreds of units over thousands of hands and still be playing correctly. Kelly sizing and a bankroll of hundreds of betting units are what separate an edge from a [risk of ruin](/guides/risk-of-ruin) problem.

### The house adapts

Every edge Thorp found was eventually closed, diluted or policed. Advantage play is a moving target.`,
    },
    {
      id: "pvp",
      title: "Thorp's questions applied to a PvP round",
      body: `PVPspinArena runs three player-vs-player games: Jackpot, Coinflip and Roulette, played in USDC or ETH on Base. Asking Thorp's questions of each is a quick way to understand them.

- **Is there memory?** No. Each round uses fresh committed seeds, so past results carry no information, exactly like a freshly shuffled deck.
- **What is the expectation?** On [Roulette](/roulette), 16 Purple and 16 Silver slots pay 2x and 1 Green pays 14x on a 33-slot wheel. Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. [Coinflip](/coinflip) is a 50/50 between two players, with the winner taking the pot minus any fee shown before entry.
- **Can the result be checked?** Yes. Any settled round can be verified on the [fairness](/fairness) page.

Thorp would note that Kelly sizing gives a stake of zero on a negative-expectation bet. If you play, treat it as paid entertainment with a fixed budget, and use the limits on the [responsible gambling](/responsible-gambling) page. Play is 18+ only.

In the same cluster, see also [phil ivey](/guides/phil-ivey) and [mit blackjack team](/guides/mit-blackjack-team).`,
    },
  ],
  faqs: [
    {
      q: "Who is Edward Thorp?",
      a: "An American mathematician, born in 1932, who proved that blackjack could be beaten by card counting, wrote Beat the Dealer (1962), co-invented a wearable roulette computer with Claude Shannon, and later became a pioneering hedge fund manager.",
    },
    {
      q: "Did Edward Thorp invent card counting?",
      a: "He was the first to prove it mathematically and publish a complete system. Some players had tracked cards informally before, but Beat the Dealer turned it into a public, testable method.",
    },
    {
      q: "How much money did Edward Thorp win at blackjack?",
      a: "His blackjack winnings were modest by later standards. By his account, the first Reno trip roughly doubled a $10,000 bank. His real fortune came from finance, not casinos.",
    },
    {
      q: "What is the Kelly criterion Thorp used?",
      a: "A rule for sizing bets when you have an edge. For an even-money bet with win probability p, stake 2p − 1 of your bankroll. With no edge or a negative edge, the Kelly stake is zero.",
    },
    {
      q: "What books did Edward Thorp write?",
      a: "The best known are Beat the Dealer (1962, revised 1966), Beat the Market (1967, with Sheen Kassouf), The Mathematics of Gambling (1984) and his memoir A Man for All Markets (2017).",
    },
  ],
  sources: [
    { label: "Wikipedia: Edward O. Thorp", url: "https://en.wikipedia.org/wiki/Edward_O._Thorp" },
    { label: "Wikipedia: Beat the Dealer", url: "https://en.wikipedia.org/wiki/Beat_the_Dealer" },
    { label: "Wikipedia: Kelly criterion", url: "https://en.wikipedia.org/wiki/Kelly_criterion" },
  ],
  related: [
    "famous-gamblers",
    "ken-uston",
    "mit-blackjack-team",
    "card-counting",
    "kelly-criterion",
    "don-johnson-blackjack",
    "phil-ivey",
  ],
  updated: "2026-09-27",
};
