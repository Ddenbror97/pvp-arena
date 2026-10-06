import type { Guide } from "./types";

export const guide: Guide = {
  slug: "dragon-tiger",
  cluster: "Casino games",
  keyword: "dragon tiger",
  secondary: [
    "dragon tiger rules",
    "dragon tiger odds",
    "dragon tiger tie bet",
    "dragon tiger house edge",
  ],
  title: "Dragon Tiger: Rules, Tie Bet, Suited Tie and Edge",
  description:
    "Dragon Tiger rules and odds: one card each, higher wins, why ties cost half your bet, the 32.77% tie at 8 to 1, the suited tie and every side bet edge.",
  h1: "Dragon Tiger: rules, the tie bet, suited tie and house edge",
  answer:
    "Dragon Tiger is a two-card game: one card is dealt to Dragon and one to Tiger, and the higher card wins, with aces low. Dragon and Tiger bets pay even money but usually lose half on a tie, giving a 3.73% house edge with eight decks. The Tie bet at 8 to 1 costs about 32.8%, and the Suited Tie at 50 to 1 about 14%.",
  facts: [
    "One card each; highest card wins; aces are low and kings high.",
    "With eight decks a tie happens 31 times in 415, about 7.47%.",
    "Dragon or Tiger losing half on a tie: 3.73% house edge.",
    "Tie at 8 to 1: 32.77% edge. At 11 to 1: 10.36%.",
    "Suited Tie at 50 to 1: 13.98% edge.",
    "Big/Small and suit side bets lose on a 7 and cost 7.69%.",
  ],
  sections: [
    {
      id: "rules",
      title: "Dragon Tiger rules",
      body: `Dragon Tiger is often described as a stripped-down cousin of baccarat. Where baccarat uses two or three cards per hand and a drawing tableau, Dragon Tiger deals a single card to each side and compares them.

1. The game uses standard 52-card decks, commonly eight shuffled together in a shoe.
2. Players bet on Dragon, Tiger or Tie, plus any side bets the table offers.
3. The dealer places one card face up in the Dragon box and one in the Tiger box.
4. Cards rank by value: ace (lowest), 2, 3 … 10, jack, queen, king (highest). Suits do not matter for the main bets.
5. The higher card wins. A winning Dragon or Tiger bet pays 1 to 1.
6. If the ranks match, it is a tie. Tie bets are paid, and Dragon and Tiger bets usually lose half their stake.

That is the entire game. There are no decisions after the bet, no third card and no commission on the main bets. Rounds are very quick, which is part of the appeal and part of the cost.

The game is widely played in Asia and in live-dealer studios. It is commonly said to have originated in Cambodia, though the history is not well documented. Live online versions follow the same rules; [live dealer casino](/guides/live-dealer-casino) covers how those studios operate.`,
    },
    {
      id: "main-bet",
      title: "The main bet and why ties cost half",
      body: `The key number is the chance of a tie. With eight decks there are 416 cards, 32 of each rank. After the Dragon card is dealt, 415 cards remain and 31 share its rank.

P(tie) = 31/415 ≈ 7.47%

The remaining 92.53% splits evenly between Dragon and Tiger, so each wins about 46.27% of rounds.

### The half-loss rule

On a tie, a Dragon or Tiger bet typically loses half. Per $100:

- Win: 0.4627 × +$100 = +$46.27
- Loss: 0.4627 × −$100 = −$46.27
- Tie: 0.0747 × −$50 = −$3.73

Expected result: −$3.73 per $100, a **3.73% house edge**. The tie rule is the entire edge; wins and losses cancel exactly.

If a table takes the whole bet on a tie, the edge doubles to 7.47%. Always check which rule applies before you play.

### How it compares

| Game and bet | House edge |
| --- | --- |
| Baccarat, Banker (5% commission) | 1.06% |
| Baccarat, Player | 1.24% |
| Casino War, going to war on ties | about 2.9% |
| Dragon Tiger, main bet (half-loss tie) | 3.73% |
| Dragon Tiger, main bet (full-loss tie) | 7.47% |

Dragon Tiger's main bet is roughly three and a half times as expensive as baccarat's Banker bet. If you like the simplicity but want lower cost, see [baccarat strategy](/guides/baccarat-strategy). [Casino war](/guides/casino-war-game) is the other close relative, with a different tie mechanic.`,
    },
    {
      id: "tie-bets",
      title: "The Tie and Suited Tie bets",
      body: `### Tie

The Tie bet wins when both cards share a rank. True odds are about 12.4 to 1 (415 ÷ 31 − 1). A common payout is 8 to 1:

EV per unit = 9 × 0.0747 − 1 ≈ −0.328

That is a **32.77% house edge**, one of the most expensive bets on any casino floor. The payout matters enormously:

| Tie pays | House edge (8 decks) |
| --- | --- |
| 8 to 1 | 32.77% |
| 9 to 1 | 25.30% |
| 10 to 1 | 17.83% |
| 11 to 1 | 10.36% |
| 12 to 1 | 2.89% |

Some tables and live studios pay 11 to 1, which is far better than 8 to 1 but still almost three times the main bet's edge.

### Suited Tie

A Suited Tie wins when the cards match in both rank and suit, for example two 9s of hearts. Eight decks contain 8 copies of every card, so after the first card 7 of the remaining 415 match it exactly.

P(suited tie) = 7/415 ≈ 1.69%

At 50 to 1: 51 × 0.01687 − 1 ≈ −0.140, a **13.98% house edge**. It sounds like a long-shot premium bet, and it is still cheaper than the plain Tie at 8 to 1. Both are poor value next to the main bet.

### Tie as "insurance"

Some players add a small Tie bet to protect their Dragon or Tiger bet against the half loss. It works on the rounds that tie: $10 on Tie at 8 to 1 wins $80, more than covering the $50 half loss on a $100 main bet. But the Tie bet has its own expected cost of about $3.28, which is added to the main bet's $3.73. The pair costs about $7.01 per round instead of $3.73. You have bought a smoother result on 7.47% of rounds at nearly double the price on all of them.`,
    },
    {
      id: "side-bets",
      title: "Side bets: Big/Small, suits and colours",
      body: `Tables often let you bet on the properties of one side's card. Rules vary, so read the placard, but the common versions look like this:

| Side bet | Wins when | Pays | House edge |
| --- | --- | --- | --- |
| Big | Card is 8 to king | 1 to 1 | 7.69% |
| Small | Card is ace to 6 | 1 to 1 | 7.69% |
| Suit | Card is the chosen suit | 3 to 1 | 7.69% |
| Odd/Even, Red/Black | Card matches choice | 1 to 1 | typically similar |

In each case, a 7 loses. There are 13 ranks; six are above 7 and six below. Big wins 6/13 ≈ 46.15% of the time and loses 7/13, so EV = 6/13 − 7/13 = −1/13 ≈ −7.69%. A suit bet wins when the card is one of 12 non-7 ranks in your suit: 12/52, and 4 × 12/52 − 1 = −1/13 again.

Every side bet here is about twice as expensive as the main Dragon or Tiger bet.

### Can the shoe be counted?

In principle, the cards already dealt change the odds on bets like Big/Small and Tie, because each round removes only two cards from a finite shoe. Casinos manage that risk with deep cuts, frequent shuffles or continuous shufflers, and online games often reshuffle regularly. For an ordinary player, counting Dragon Tiger is not a practical plan. For card-composition basics, see the [52 card deck](/guides/52-card-deck) guide.`,
    },
    {
      id: "worked",
      title: "Worked example: one hour at a Dragon Tiger table",
      body: `Dragon Tiger's speed makes it a good game for seeing how edge and pace combine. Assume a live table deals 100 rounds in an hour; many run close to that, and automated or online tables can run faster. Three players each bring $500.

| Player | Per round | Money wagered | Expected cost |
| --- | --- | --- | --- |
| A | $20 on Dragon | $2,000 | about $75 |
| B | $20 on Dragon + $2 on Tie (8 to 1) | $2,200 | about $140 |
| C | $10 on Tiger + $10 on Big | $2,000 | about $114 |

- **A:** $2,000 × 3.73% ≈ $74.60.
- **B:** A's $74.60 plus $200 × 32.77% ≈ $65.54, about $140 in total. A $2 chip nearly doubles the hourly cost.
- **C:** $1,000 × 3.73% + $1,000 × 7.69% ≈ $37.30 + $76.90 ≈ $114.

### What swings to expect

A $20 main bet has a standard deviation of about $19 per round, so over 100 rounds player A's result has a spread of roughly ±$190 around the −$75 average. Ending the hour between about −$265 and +$115 is ordinary, at two standard deviations. A $500 bankroll handles that, but a longer session or a larger unit changes the picture quickly.

### What happens on ties

In 100 rounds you should expect about seven ties. Each one costs player A $10 (half of $20). Seven ties × $10 ≈ $75, which is almost exactly the expected cost above. That is the whole edge made visible: the wins and losses on non-tie rounds cancel out over time, and the tie rule collects the house's share.

### Choosing a table

- Look for the half-loss tie rule on the main bet. A full-loss rule doubles the cost.
- If you will play the Tie at all, prefer 11 to 1 over 8 to 1.
- Check the minimum. On a fast game, a lower minimum does more to protect your bankroll than any bet choice.
- In live studios, read the help screen for RTP. A main-bet RTP of 96.27% corresponds to the 3.73% edge.`,
    },
    {
      id: "strategy",
      title: "How to play Dragon Tiger sensibly",
      body: `Dragon Tiger has no playing decisions, so strategy comes down to bet choice and speed.

1. **Bet only Dragon or Tiger.** At 3.73% (with the half-loss tie) it is the cheapest bet on the table. Choosing between them makes no difference.
2. **Skip the Tie unless it pays 11 to 1 or better,** and even then treat it as expensive entertainment.
3. **Count your hands per hour.** Two cards per round makes this one of the fastest table games. At $20 a round, each hand costs about $0.75 in expectation. Eighty hands an hour is about $60; two hundred is about $150.
4. **Ignore roadmaps.** Dragon Tiger tables often show the same bead plates and big roads as baccarat. They record the past, and the next card does not know about them. Betting on "streaks" is the [gambler's fallacy](/guides/gamblers-fallacy).
5. **Flat bet with a written limit.** Progressions reshape results without touching the edge; the [house edge](/guides/house-edge) guide explains why.

The [casino games hub](/guides/topics/casino-games) puts Dragon Tiger in context with other table games.`,
    },
    {
      id: "pvp",
      title: "A higher-card game versus a pure 50/50",
      body: `Dragon Tiger is close to a coin flip with a small tax: the house edge exists only because ties cost half your bet. Remove the tie and the main bet would be a fair 50/50.

PVPspinArena [Coinflip](/coinflip) is that fair 50/50 between two players, with no tie outcome; the winner takes the pot minus any fee shown before entry. The [coin flip odds](/guides/coin-flip-odds) guide covers the probability side. On PVPspinArena [Roulette](/roulette), Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Any settled round can be checked on the [fairness](/fairness) page.

Gambling is 18+ (or the local legal age). If fast games are making it hard to stick to limits, the [responsible gambling](/responsible-gambling) page has tools that help.

In the same cluster, see also [teen patti](/guides/teen-patti) and [pai gow tiles](/guides/pai-gow-tiles).`,
    },
  ],
  faqs: [
    {
      q: "How do you play Dragon Tiger?",
      a: "Bet on Dragon, Tiger or Tie. One card is dealt to each side, the higher card wins, and aces are low. Dragon and Tiger pay even money.",
    },
    {
      q: "What happens on a tie in Dragon Tiger?",
      a: "Tie bets win, and Dragon and Tiger bets usually lose half their stake. Some tables take the full stake, which doubles the house edge.",
    },
    {
      q: "What is the house edge in Dragon Tiger?",
      a: "About 3.73% on Dragon or Tiger with eight decks and the half-loss tie rule. The Tie bet at 8 to 1 is about 32.77%, and the Suited Tie at 50 to 1 about 13.98%.",
    },
    {
      q: "Is Dragon or Tiger better?",
      a: "Neither. Both sides have identical odds. The game is symmetrical, so the choice makes no difference to your expected result.",
    },
    {
      q: "Is Dragon Tiger better than baccarat?",
      a: "Not on cost. Baccarat's Banker bet has a 1.06% edge versus 3.73% for Dragon Tiger's main bet, and Dragon Tiger rounds are faster.",
    },
  ],
  sources: [
    { label: "Wizard of Odds: Dragon Tiger", url: "https://wizardofodds.com/games/dragon-tiger/" },
    { label: "Wizard of Odds: casino war", url: "https://wizardofodds.com/games/casino-war/" },
    { label: "Wizard of Odds: baccarat", url: "https://wizardofodds.com/games/baccarat/" },
  ],
  related: [
    "baccarat-strategy",
    "baccarat-rules",
    "casino-war-game",
    "sic-bo-strategy",
    "live-dealer-casino",
    "coin-flip-odds",
    "teen-patti",
    "pai-gow-tiles",
  ],
  updated: "2026-09-27",
};
