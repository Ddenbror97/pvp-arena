import type { Guide } from "./types";

export const guide: Guide = {
  slug: "baccarat-strategy",
  cluster: "Casino games",
  keyword: "baccarat strategy",
  secondary: [
    "best baccarat bet",
    "banker bet strategy",
    "baccarat patterns",
    "baccarat money management",
  ],
  title: "Baccarat Strategy: Banker Bet, Tie Trap and Patterns",
  description:
    "Baccarat strategy that the maths supports: why Banker is best even after commission, why Tie costs 14%, what roadmaps really show and how to size a bankroll.",
  h1: "Baccarat strategy: bet Banker, skip the Tie, ignore the roads",
  answer:
    "A sound baccarat strategy is short: bet Banker, flat or close to flat, and skip the Tie and most side bets. With eight decks and a 5% commission, Banker carries a 1.06% house edge, Player 1.24%, and Tie at 8 to 1 about 14.4%. Scorecards, roadmaps and streak systems do not change those numbers, because every hand is dealt by fixed drawing rules.",
  facts: [
    "Eight-deck punto banco: Banker wins 45.86%, Player 44.62%, Tie 9.52% of hands.",
    "Banker edge with 5% commission: 1.06%. Player edge: 1.24%.",
    "Tie at 8 to 1 costs about 14.36%; at 9 to 1 it costs about 4.84%.",
    "No-commission tables that pay half on a Banker six raise the Banker edge to about 1.46%.",
    "Player Pair and Banker Pair at 11 to 1 cost about 10.36% on eight decks.",
    "Roadmaps record past hands; they do not predict the next one.",
  ],
  sections: [
    {
      id: "why-banker",
      title: "Why Banker is the best bet, even after commission",
      body: `Baccarat gives the player almost no decisions. You pick Banker, Player or Tie, and the cards are drawn by a fixed tableau. That makes strategy a question of bet selection and money management, not play. The rules themselves, including when each hand draws a third card, are in [how to play baccarat](/guides/baccarat-rules).

The drawing rules favour the Banker hand, because Banker acts last and its third-card decision depends on what the Player drew. Over an eight-deck shoe the results come out roughly like this:

| Outcome | Probability | Share excluding ties |
| --- | --- | --- |
| Banker wins | 45.86% | 50.68% |
| Player wins | 44.62% | 49.32% |
| Tie | 9.52% | — |

If Banker paid even money it would be a player advantage. The casino charges a 5% commission on Banker wins to fix that.

### The arithmetic

Per $100 on Banker: you win $95 net 45.86% of the time and lose $100 44.62% of the time, and a tie pushes. EV = 0.4586 × 95 − 0.4462 × 100 = 43.57 − 44.62 ≈ −$1.06. Edge 1.06%.

Per $100 on Player: 0.4462 × 100 − 0.4586 × 100 ≈ −$1.24. Edge 1.24%.

The commission feels like a tax, and players often switch to Player to avoid it. That trade costs about 18 cents per $100. Small, but in the wrong direction every time.

### When the commission changes

Some tables charge 4% instead of 5%. Then Banker EV = 0.4586 × 96 − 0.4462 × 100 ≈ −$0.59, an edge near 0.6%. If you find one, it is one of the better bets on a casino floor. Commission is often tracked in a box and settled at the end of the shoe, so do keep a count of what you owe.`,
    },
    {
      id: "no-commission",
      title: "No-commission baccarat and other rule changes",
      body: `"No commission" tables remove the 5% but take the money back another way. Two common versions:

- **Banker six pays half.** A Banker win with a total of 6 pays 1 to 2 instead of 1 to 1. Banker edge rises to about 1.46%. Player stays at 1.24%, so on these tables Player is the slightly better main bet.
- **EZ Baccarat.** Banker wins with a three-card 7 are pushed rather than paid, often with a "Dragon 7" side bet attached. The Banker edge is about 1.02%, a touch better than the classic 1.06%.

Read the placard before sitting down. The strategy rule is not "always Banker"; it is "compare the edges on this table and take the lowest".

### Deck count

Fewer decks shift the numbers only slightly. Across six and eight decks the Banker edge stays close to 1.06% and Player close to 1.24%, so deck count is not worth chasing in baccarat the way it is in blackjack.

### Speed matters

The house edge is a percentage of each bet, so the number of hands per hour matters as much as the edge. A mini-baccarat table or an online table can deal far more hands in an hour than a traditional big table where players squeeze the cards. At $50 per hand on Banker, each hand costs about $0.53 in expectation, so 60 hands cost about $32 and 150 hands about $80. Slower is cheaper.`,
    },
    {
      id: "tie-sides",
      title: "The Tie bet and side bets",
      body: `The Tie bet is the main way baccarat players lose far more than the 1% they expect.

A tie happens about 9.52% of the time. At 8 to 1 you collect 9 units on a win: 9 × 0.0952 ≈ 0.857, so you lose about 14.4% of every Tie bet. True odds are about 9.5 to 1. Some tables pay 9 to 1, which brings the edge down to about 4.84%, still four times worse than Banker.

Remember also that Banker and Player bets push on a tie, so you do not need a Tie bet to "protect" them. A tie simply returns them.

### Side bets

| Side bet | Common pay | Approximate edge |
| --- | --- | --- |
| Player Pair / Banker Pair | 11 to 1 | 10.36% (8 decks) |
| Tie | 8 to 1 | 14.36% |
| Tie | 9 to 1 | 4.84% |
| Banker (5% commission) | 19 to 20 | 1.06% |
| Player | 1 to 1 | 1.24% |

The Pair bet wins when the first two cards of the chosen hand are a pair. On eight decks that happens about 7.47% of the time, and 12 × 0.0747 ≈ 0.896, a loss of about 10.4%. Dragon Bonus, Panda 8 and similar bets vary by casino and paytable, but most run well above the main bets. If a side bet does not publish its edge or RTP, assume it is expensive.

A small group of professionals has attacked side bets with card counting, and at least one well-known case used a different technique: the edge-sorting dispute involving [Phil Ivey](/guides/phil-ivey) at Crockfords in London, which the UK Supreme Court ruled in 2017 was cheating under civil law. That case is about exploiting card backs, not a strategy an ordinary player can or should copy.`,
    },
    {
      id: "patterns",
      title: "Roadmaps, streaks and pattern myths",
      body: `Baccarat tables in Asia and online display "roads": the bead plate, big road, big eye boy, small road and cockroach road. They turn the shoe's history into grids of red and blue marks, and many players follow them to decide which side to bet.

The roads are a record, not a forecast. The next hand is dealt from the remaining cards by fixed rules. A long Banker streak does not make Player "due", and it does not make Banker "hot". Both beliefs are versions of the [gambler's fallacy](/guides/gamblers-fallacy).

### Does card removal matter?

In theory, the cards already dealt change the composition of the shoe. In practice, analyses of baccarat have long found that the effect on the Banker and Player bets is tiny, too small and too rare to overcome the edge in a realistic shoe. Counting is not a practical baccarat strategy for the main bets.

### Common patterns people bet

- **Follow the shoe:** bet whichever side won last.
- **Chop:** bet the opposite of the last result.
- **Streak and wait:** wait for three or four in a row, then bet against it.

Each of these picks Banker some of the time and Player some of the time. The long-run cost is a blend of 1.06% and 1.24%. The only pattern that consistently lowers your cost is "bet Banker every hand".

### Why the roads persist

They make a slow game feel skilful, they give players something to discuss, and they keep attention on the table. That is fine as entertainment. Just know that ignoring them costs nothing.`,
    },
    {
      id: "worked-shoe",
      title: "One shoe, four players: a worked cost comparison",
      body: `An eight-deck shoe typically deals somewhere around 80 hands before the cut card comes out. Put four players at the same table for one shoe, each betting a $25 main unit, and the difference between their habits becomes visible in dollars.

| Player | Habit per hand | Expected cost for the shoe |
| --- | --- | --- |
| A | $25 on Banker | about $21 |
| B | $25 on whichever side the roads suggest | about $23 |
| C | $25 on Banker plus $5 on Player Pair | about $63 |
| D | $25 on Banker plus $5 on Tie at 8 to 1 | about $79 |

The arithmetic:

- **A:** 80 × $25 × 1.06% ≈ $21.20.
- **B:** roughly half Banker and half Player, so a blended edge near 1.15%: 80 × $25 × 1.15% ≈ $23.
- **C:** A's $21.20 plus 80 × $5 × 10.36% ≈ $41.44 on the pairs, for about $62.64.
- **D:** A's $21.20 plus 80 × $5 × 14.36% ≈ $57.44 on the ties, for about $78.64.

Player D wagers only 20% more money than player A but pays nearly four times as much. The small side chip does most of the damage. That is the most useful single lesson in baccarat strategy: the main-bet choice between Banker and Player is worth pennies, while the side-bet habit is worth dollars.

### What the shoe will actually look like

None of these players is likely to finish exactly on their expected cost. With 80 hands at $25, player A's standard deviation is about $210, so finishing $300 up or $400 down is ordinary. The expected cost is what the habit costs across many shoes. It is the right number to plan around even when a single shoe goes the other way.`,
    },
    {
      id: "money",
      title: "Bankroll and staking for baccarat",
      body: `Because the main bets are close to even money, baccarat swings are moderate. The standard deviation per hand is roughly one betting unit, so over 100 hands you can expect results to land within about ±20 units most of the time (two standard deviations), while the expected loss on Banker is only about 1 unit.

### A simple plan

1. Pick a session bankroll you can lose.
2. Set the unit at 1/30 to 1/50 of that bankroll. At $1,000, that is $20 to $33.
3. Bet Banker in flat units.
4. Stop at a loss limit (for example half the session bankroll) or a time limit, whichever comes first.

### Progressions and commission

Negative progressions such as the [Martingale strategy](/guides/martingale-strategy) behave badly on Banker because of the commission. Start at $10: lose $10, $20 and $40, then win $80 on Banker. You receive $76, so the cycle nets +$6 instead of +$10. Every recovery is short. Add table maximums and a long losing streak, and the plan fails in the usual way.

Positive progressions and "one-sided" systems do not change the edge either. The [house edge guide](/guides/house-edge) explains why the edge is charged on every dollar regardless of the order in which you stake them.

### Online and crypto tables

If you play digitally, the edges and table rules still apply. [Crypto baccarat](/guides/crypto-baccarat) covers where and how people play with crypto, and [Dragon Tiger](/guides/dragon-tiger) is a faster one-card cousin with a higher edge. The [casino games hub](/guides/topics/casino-games) compares the table games side by side.`,
    },
    {
      id: "pvp",
      title: "Where the same idea shows up on PVPspinArena",
      body: `Baccarat strategy comes down to a single question: which bet has the lowest edge on this table? That is a useful habit anywhere.

PVPspinArena runs three player-vs-player games. [Coinflip](/coinflip) is a straight 50/50 between two players, with no tie outcome at all; the winner takes the pot minus any fee shown before entry. [Roulette](/roulette) uses a 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee, so choosing between Purple, Silver and Green changes variance but not the cost per dollar. Settled rounds can be verified on the [fairness](/fairness) page.

Gambling is 18+ (or the local legal age). If baccarat or any game is taking more time or money than planned, the [responsible gambling](/responsible-gambling) page has tools and support.

In the same cluster, see also [teen patti](/guides/teen-patti) and [pai gow tiles](/guides/pai-gow-tiles).`,
    },
  ],
  faqs: [
    {
      q: "What is the best strategy for baccarat?",
      a: "Bet Banker on standard 5% commission tables, avoid the Tie and pair bets, flat bet in units you can afford, and set a loss and time limit before you start.",
    },
    {
      q: "Is it better to bet Banker or Player?",
      a: "Banker, on a standard table. Its edge is 1.06% after commission versus 1.24% for Player. On no-commission tables that pay half on a Banker six, Player becomes slightly better.",
    },
    {
      q: "Why is the Tie bet bad in baccarat?",
      a: "A tie happens about 9.5% of the time, so true odds are about 9.5 to 1. Paying 8 to 1 leaves a house edge of roughly 14.4%.",
    },
    {
      q: "Do baccarat patterns work?",
      a: "No. Roadmaps show past results only. Each hand is dealt by fixed rules from the remaining cards, and streaks do not predict what comes next.",
    },
    {
      q: "Can you count cards in baccarat?",
      a: "Card removal has a very small effect on the main bets, too small to beat the edge in practice. Counting is not a realistic baccarat strategy for Banker or Player.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: baccarat", url: "https://wizardofodds.com/games/baccarat/" },
    { label: "Wikipedia: Baccarat", url: "https://en.wikipedia.org/wiki/Baccarat" },
    {
      label: "Encyclopaedia Britannica: baccarat",
      url: "https://www.britannica.com/topic/baccarat",
    },
  ],
  related: [
    "baccarat-rules",
    "crypto-baccarat",
    "dragon-tiger",
    "craps-strategy",
    "house-edge",
    "martingale-strategy",
    "teen-patti",
    "pai-gow-tiles",
  ],
  updated: "2026-09-27",
};
