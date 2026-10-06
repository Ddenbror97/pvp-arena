import type { Guide } from "./types";

export const guide: Guide = {
  slug: "free-bet-blackjack",
  cluster: "Blackjack",
  keyword: "free bet blackjack",
  secondary: [
    "free bet blackjack rules",
    "push 22 blackjack",
    "free bet blackjack strategy",
    "free bet blackjack house edge",
  ],
  title: "Free Bet Blackjack: Rules, Push 22 and House Edge",
  description:
    "Free bet blackjack explained: free doubles on 9 to 11, free splits, the dealer 22 push, worked hands, strategy changes and the real house edge.",
  h1: "Free bet blackjack: free doubles, free splits and the dealer 22 push",
  answer:
    "Free bet blackjack is a variant where the casino funds your doubles on hard 9, 10 and 11 and your splits on most pairs, so the extra bet costs you nothing if the hand loses. The price is one rule: if the dealer finishes on exactly 22, every live player hand pushes instead of winning. Under common six-deck rules the house edge lands near 1%, slightly worse than a good standard game.",
  facts: [
    "Free doubles apply to hard totals of 9, 10 and 11; soft doubles and other totals cost real money.",
    "Free splits usually cover every pair except ten-value cards, with resplits commonly allowed up to four hands.",
    "A dealer total of exactly 22 pushes all remaining player hands; a player blackjack still wins 3:2.",
    "A free chip that wins is paid like a real bet; a free chip that loses costs nothing.",
    "Typical house edge is about 1% on six decks with dealer hitting soft 17, depending on the exact rule set.",
  ],
  sections: [
    {
      id: "what",
      title: "What free bet blackjack is",
      body: `Free bet blackjack is a shoe game, usually six decks, that plays like ordinary blackjack until you reach a double or a split. At that point the dealer places a special "free bet" button or lammer next to your chip instead of asking for more money. The game is credited to Geoff Hall, the same designer behind [Blackjack Switch](/guides/blackjack-switch), and it is licensed to land-based casinos and online live-dealer studios rather than being a house rule anyone can copy.

The pitch is psychological as much as mathematical. Many players under-double and under-split in a normal game because putting a second chip out feels risky. Free bet blackjack removes that fear for the most common doubling and splitting spots. The casino pays for it with the dealer 22 push rule, which quietly takes back a slice of your ordinary wins.

If you are new to the base game, start with [how to play blackjack](/guides/how-to-play-blackjack) and the standard [blackjack rules](/guides/blackjack-rules). The rest of this page assumes you know what hit, stand, double and split mean. Other variants are grouped in the [blackjack topic hub](/guides/topics/blackjack). Blackjack for money is for adults 18+ or the local legal age.`,
    },
    {
      id: "rules",
      title: "Free doubles, free splits and how they pay",
      body: `### The core rule set

A typical free bet table uses these rules. Always read the felt and the placard, because operators tweak them.

| Rule | Common setting |
| --- | --- |
| Decks | 6 (sometimes 8) |
| Dealer soft 17 | Hits |
| Blackjack pays | 3:2 |
| Free double | Hard 9, 10, 11 on the first two cards |
| Free split | Any pair except 10-value cards |
| Resplits | Usually to four hands, free each time |
| Double after split | Allowed, free if the new hand is hard 9 to 11 |
| Dealer 22 | Pushes every live non-blackjack hand |

### How a free double pays

You bet $10 and receive 6-5 against a dealer 6. You take the free double, so the dealer puts a free-bet lammer beside your $10 and deals one card.

- If the hand wins, you are paid $10 on your chip and $10 on the lammer: +$20.
- If the hand pushes, nothing changes: $0.
- If the hand loses, you lose your $10 only: −$10.

Compare a paid double in a standard game: win +$20, lose −$20. The free version keeps the upside and deletes half the downside.

### How a free split pays

You bet $10 on 8-8 against a dealer 10 and take the free split. The first 8 keeps your $10; the second 8 gets a lammer.

| Hand 1 (your $10) | Hand 2 (free) | Net |
| --- | --- | --- |
| Win | Win | +$20 |
| Win | Lose | +$10 |
| Lose | Win | $0 |
| Lose | Lose | −$10 |

Splitting 8s against a 10 is a defensive play in the normal game because you often lose both hands. Here the worst case is the same −$10 you would have lost standing on 16.

### What still costs money

Soft doubles (for example A-7 against a 4), doubles on 8 or 12, and splits of 10s must be funded with your own chips. If you double for real after a free split, only the extra chip you add is at risk on that hand.`,
    },
    {
      id: "push-22",
      title: "The dealer 22 push: where the casino gets paid",
      body: `In standard blackjack, any dealer bust pays every player who is still standing. In free bet blackjack, a dealer who busts with exactly 22 pays nobody except player blackjacks. Every other live hand, including a paid double, a free double and every split hand, simply pushes.

### How often it happens

Commonly quoted simulation figures put the dealer finishing on exactly 22 at roughly 7% to 8% of rounds in a six-deck, hit-soft-17 game. The exact rate depends on the dealer's up-card: a dealer showing 2 through 6 has to draw more often and busts more often, and 22 is generally the most frequent single bust total, so the rule catches a large share of all dealer busts rather than a rare corner case.

### What it costs

Take a simple case. You stand on 18 against a dealer 6. In a normal game you win whenever the dealer busts. Here, any bust that lands on 22 becomes a push. If roughly one in five of the dealer's busts from that position is a 22 (an illustrative ratio, not an exact chart figure), about a fifth of the free wins you counted on disappear.

Across a whole session this rule costs the player several percent of turnover before the free bets are credited back. The free doubles and splits return most of it, but not all. That gap is the house edge.

### Why the rule hurts free bets too

A free double that pushes pays nothing on the lammer. So the dealer 22 push also shaves value off the free chips themselves, which is part of why the casino can afford to hand them out.`,
    },
    {
      id: "edge",
      title: "House edge of free bet blackjack, with the arithmetic",
      body: `Published analyses, such as the Wizard of Odds breakdown, put free bet blackjack at roughly 1% house edge under six decks, dealer hits soft 17 and 3:2 blackjack, played with the correct adjusted strategy. A well-dealt standard six-deck game with 3:2, double after split and late surrender typically runs about 0.4% to 0.6%. So the free bets feel generous but the table is slightly worse.

### Value of one free chip

The value of a free chip is simple: it pays +1 when the hand wins and 0 otherwise. So its expected value equals the probability that the hand wins.

Illustration: suppose a doubled 11 against a dealer 6 wins about 60% of the time, pushes 5% and loses 35%. These are round, illustrative figures.

- Paid double, extra chip EV = 0.60 × 1 − 0.35 × 1 = +0.25 units
- Free double, extra chip EV = 0.60 × 1 − 0.35 × 0 = +0.60 units

The free chip is worth more than double the paid one in that spot. Multiply that by every free double and split over an hour and the gift is large. The dealer 22 push is the counterweight, and it applies to every hand, not only the ones where you received a free chip.

### Why the edge is not lower

If 7% to 8% of rounds convert a win into a push for almost every live hand at the table, that is a cost spread over your whole turnover. The free bets only arrive on a minority of hands. The casino prices the two so that the net result sits around 1%. You can read the logic of edges in general in [house edge](/guides/house-edge), and compare against other games in [best casino game odds](/guides/best-casino-game-odds).

### Rules that move the number

- 8 decks instead of 6: slightly worse.
- Dealer stands on soft 17 (rare here): slightly better.
- Blackjack paying 6:5: much worse, roughly an extra 1.4% of edge, so walk away.
- Resplits limited to fewer hands: slightly worse.`,
    },
    {
      id: "strategy",
      title: "Strategy changes compared with standard basic strategy",
      body: `The standard [blackjack strategy chart](/guides/blackjack-strategy-chart) is close but not correct here. Two forces pull it in different directions: free chips make doubling and splitting more attractive, and the 22 push makes standing on stiffs against weak dealer cards less attractive.

### Take the free ones

1. **Hard 9, 10 and 11:** take the free double against every dealer up-card. The chip cannot lose you money, so the only question would be whether doubling forces you to stop drawing, and on 9 to 11 one card is almost always enough.
2. **Pairs:** take every free split, including 2s, 3s, 6s, 7s and 8s against strong dealer cards, and aces. Published free bet charts split far more often than the standard [when to split](/guides/when-to-split-blackjack) chart.
3. **5-5:** most charts treat this as a hard 10 and take the free double rather than a free split.

### Adjust the paid decisions

- Soft doubles cost real money and are worth slightly less than in a normal game because the dealer 22 push takes away some of the dealer busts you are relying on. Some charts drop marginal soft doubles.
- Stand decisions on 12 to 16 against a dealer 2 through 6 rely on the dealer busting. With 22 pushing, some of those stands become closer, and free bet charts hit a few more stiff totals than standard ones.
- Insurance stays a poor bet from a full shoe; see [blackjack insurance](/guides/blackjack-insurance).

### Practical advice

Print or memorise a chart built for your exact rules. Using a standard chart in free bet blackjack costs you a few tenths of a percent, mostly by missing free splits. Using no chart at all costs far more. The [blackjack simulator](/guides/blackjack-simulator) guide explains how to test a chart against a rule set before you sit down.`,
    },
    {
      id: "side-bets",
      title: "The Push 22 side bet and choosing a table",
      body: `Most free bet tables offer a side bet usually called "Push 22" that pays when the dealer finishes on 22. It looks like insurance against the rule that costs you money, but it is a separate wager with its own paytable and its own edge, and that edge is higher than the main game's. It does not hedge anything in a useful sense: when the dealer makes 22 you are merely paid a fixed amount on a separate bet, and the house has priced it to win over time. For a comparison of common side bets and their edges, see [blackjack side bets](/guides/blackjack-side-bets).

### Checklist before you sit

- Blackjack pays 3:2, not 6:5.
- Free splits include aces and resplits.
- Double after split is allowed.
- The table limits suit a bankroll of at least 30 to 50 main bets.
- The minimum is realistic. Free bet tables often carry higher minimums than standard tables at the same casino.

### Card counting

Counting still works in principle, because the free chips and 22 push both depend on the remaining cards, but counts and index plays are different from the standard game. General counting theory lives in [card counting](/guides/card-counting). Most players are better served by playing the correct chart and keeping sessions short.`,
    },
    {
      id: "pvp",
      title: "The same edge maths at PVPspinArena",
      body: `Free bet blackjack is a good lesson in how casinos price a gift. The free chip is real value, and the dealer 22 push is a real cost. The house edge is what is left when you subtract one from the other. Every game has that ledger, whether it is printed or not.

PVPspinArena shows its ledger in plain numbers. [Roulette](/roulette) uses a 33-slot wheel where Purple and Silver pay 2x on 16 slots each and Green pays 14x on 1 slot, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. [Coinflip](/coinflip) is a 50/50 between two players, with the winner taking the pot minus any fee shown before entry. In the [Jackpot](/), your win chance equals your share of the pot. Every settled round comes from committed seeds that you can check on the [fairness](/fairness) page.

That is a higher edge than a well-played free bet table and a different kind of game. The point is not which is better, but that you can price both before you play. PVPspinArena is for adults 18+, and limits and time-out tools are on the [responsible gambling](/responsible-gambling) page.

In the same cluster, see also [spanish 21](/guides/spanish-21) and [infinite blackjack](/guides/infinite-blackjack).`,
    },
  ],
  faqs: [
    {
      q: "What is free bet blackjack?",
      a: "A blackjack variant where the casino funds your doubles on hard 9, 10 and 11 and your splits on most pairs. In exchange, a dealer total of exactly 22 pushes every live hand except player blackjacks.",
    },
    {
      q: "What is the house edge in free bet blackjack?",
      a: "Around 1% under common six-deck rules with the dealer hitting soft 17 and 3:2 blackjack, played with a chart built for the game. That is a little worse than a good standard shoe game.",
    },
    {
      q: "Can you lose a free bet in blackjack?",
      a: "No. If the hand with a free chip loses, you lose only your original bet. If it wins, the free chip is paid like a real bet. If it pushes, nothing changes.",
    },
    {
      q: "Should you always take the free double or split?",
      a: "Almost always. The free chip cannot cost you money. The main exception on most charts is 5-5, which is better played as a free double on hard 10 than as a split.",
    },
    {
      q: "Is the Push 22 side bet worth it?",
      a: "It pays when the dealer makes 22, but it carries a higher edge than the main game. It does not remove the cost of the 22 rule; it adds a second wager the casino has priced to win.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Free Bet Blackjack",
      url: "https://wizardofodds.com/games/free-bet-blackjack/",
    },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
    {
      label: "Encyclopaedia Britannica: twenty-one (blackjack)",
      url: "https://www.britannica.com/topic/twenty-one",
    },
  ],
  related: [
    "spanish-21",
    "blackjack-switch",
    "infinite-blackjack",
    "blackjack-side-bets",
    "blackjack-strategy-chart",
  ],
  updated: "2026-09-27",
};
