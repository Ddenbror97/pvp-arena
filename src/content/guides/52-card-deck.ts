import type { Guide } from "./types";

export const guide: Guide = {
  slug: "52-card-deck",
  cluster: "Games of chance",
  keyword: "52 card deck",
  secondary: [
    "deck of cards",
    "how many cards in a deck",
    "playing card suits",
    "card draw probability",
  ],
  title: "52 Card Deck: Suits, History and Card Probabilities",
  description:
    "The 52 card deck explained: 4 suits of 13 ranks, where the French suits came from, jokers, and the exact odds of common draws, pairs, aces and poker hands.",
  h1: "The 52 card deck: composition, history and the odds of common draws",
  answer:
    "A standard 52 card deck has four suits (clubs, diamonds, hearts and spades) of 13 ranks each: ace, 2 through 10, jack, queen and king. Half the cards are red and half black, and 12 are face cards. Most packs add two jokers. Because every card is equally likely on a fair shuffle, the odds of common draws follow from simple counting.",
  facts: [
    "52 cards = 4 suits × 13 ranks; 26 red, 26 black, 12 face cards.",
    "The chance of drawing any ace is 4/52 = 1/13, about 7.7%.",
    "The chance of being dealt a pocket pair in two cards is 3/51, about 5.9%.",
    "There are 2,598,960 possible five-card hands.",
    "A deck can be ordered in 52! ≈ 8.07 × 10^67 ways.",
  ],
  sections: [
    {
      id: "composition",
      title: "What is in a standard deck",
      body: `The modern international deck, sometimes called the French or Anglo-American pack, is built from two independent attributes: suit and rank.

| Attribute | Values | Count |
| --- | --- | --- |
| Suits | ♣ clubs, ♦ diamonds, ♥ hearts, ♠ spades | 4 |
| Ranks | A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K | 13 |
| Colours | Red (hearts, diamonds), black (clubs, spades) | 2 × 26 |
| Face or court cards | J, Q, K in each suit | 12 |
| Number cards (2–10) | Nine per suit | 36 |
| Aces | One per suit | 4 |

Every card is a unique suit–rank combination, which is why the count is exactly 4 × 13 = 52.

### Jokers and extras

Most packs include two jokers, often one more colourful than the other, plus one or two advertising or rule cards. Jokers are not part of the 52 and are removed for most games. The joker is usually traced to the United States in the second half of the 19th century, where it was added as an extra top trump in euchre; the exact date is not firmly established.

### Rank order depends on the game

There is no universal rank order. Aces are high in poker and bridge, low or dual in many rummy games, and worth 1 or 11 in blackjack. Suits have no ranking in poker, while bridge ranks them spades, hearts, diamonds, clubs for bidding. For card-by-card values in the most common casino game, see [blackjack rules](/guides/blackjack-rules); for poker, see [poker hand rankings](/guides/poker-hand-rankings).`,
    },
    {
      id: "history",
      title: "Where the deck came from",
      body: `Playing cards are generally thought to have originated in China and spread west. Cards reached Europe in the late 14th century, most likely through the Mamluk Sultanate of Egypt, whose packs used suits of cups, coins, swords and polo sticks, with non-human court cards.

European makers adapted the suits by region:

| Suit system | Suits | Where it is still used |
| --- | --- | --- |
| Latin (Italian and Spanish) | Cups, coins, swords, clubs or batons | Spain, Italy, Latin America |
| German | Hearts, bells, acorns, leaves | Germany, Central Europe |
| Swiss | Roses, bells, acorns, shields | Parts of Switzerland |
| French | Hearts, diamonds (tiles), clubs (trefoils), spades (pikes) | Most of the world |

The French suits, which appeared in the late 15th century, won out largely because the simple shapes were cheap to stencil. English speakers kept older names for two of them: "spades" is thought to come from the Italian or Spanish word for swords (spade, espadas), and "clubs" from the Latin suit of batons, even though the French symbol is a trefoil.

### Features added later

- **Corner indices**, the small rank and suit in the corners, became standard in the 19th century and let players fan a hand.
- **Double-ended court cards**, which read the same either way up, spread in the same period.
- **Rounded corners** and standard sizes followed with industrial printing.

In the traditional Paris pattern, the court cards were given names such as David (king of spades), Charles (king of hearts), Caesar (king of diamonds) and Alexander (king of clubs). These names are a French design tradition, not a statement about who the cards were originally meant to depict.

The ornate ace of spades in English packs is commonly linked to the country's historic tax on playing cards, under which the ace of spades carried the official duty mark.`,
    },
    {
      id: "single-draws",
      title: "Probabilities of a single card",
      body: `On a fair, well-shuffled deck, every card is equally likely to be in any position. The chance of an event on one draw is the number of cards that satisfy it divided by 52.

| You draw | Favourable cards | Probability | Odds against |
| --- | --- | --- | --- |
| A specific card (A♠) | 1 | 1.92% | 51 to 1 |
| Any ace | 4 | 7.69% | 12 to 1 |
| Any heart | 13 | 25% | 3 to 1 |
| A red card | 26 | 50% | 1 to 1 |
| A face card (J, Q, K) | 12 | 23.1% | 10 to 3 |
| A ten-value card in blackjack (10, J, Q, K) | 16 | 30.8% | 9 to 4 |
| A red ace | 2 | 3.85% | 25 to 1 |

### Odds versus probability

Probability is favourable over total (4/52). Odds against are unfavourable to favourable (48 to 4, or 12 to 1). Mixing them up is the most common error in casual card maths; the [implied probability guide](/guides/implied-probability) explains the conversion.

### Position does not matter

The chance that the top card is an ace is 1/13. So is the chance that the 30th card is an ace, or the bottom card, as long as you have not seen any cards in between. What changes the probability is information: once you see that the first card is an ace, the chance the second is an ace drops to 3/51. That idea, removal, is the basis of everything from [card counting](/guides/card-counting) to poker blockers.

### How long until an ace?

The expected number of cards dealt up to and including the first ace is (52 + 1) / (4 + 1) = 10.6. The four aces split the other 48 cards into five gaps of average size 9.6.`,
    },
    {
      id: "multi-draws",
      title: "Probabilities of two or more cards",
      body: `When you draw several cards without replacement, multiply the conditional probabilities, or count combinations with C(n, k), the number of ways to choose k items from n.

### Two cards

| Event | Calculation | Probability |
| --- | --- | --- |
| Both aces | (4/52) × (3/51) | 0.45% (1 in 221) |
| A pair of any rank | 3/51 | 5.88% (1 in 17) |
| Both the same suit | 12/51 | 23.5% |
| Both red | (26/52) × (25/51) | 24.5% |
| Blackjack natural (single deck) | 2 × (4/52) × (16/51) | 4.83% (about 1 in 21) |

The pair calculation is short because the first card can be anything; you only need the second to match it, and 3 of the remaining 51 do.

### Five cards

There are C(52, 5) = 2,598,960 possible five-card hands. A few useful results:

- **At least one ace:** 1 − C(48,5)/C(52,5) = 1 − 1,712,304/2,598,960 ≈ 34.1%.
- **One pair exactly:** 1,098,240 hands, about 42.3%.
- **Flush (including straight flushes):** 4 × C(13,5) = 5,148 hands, about 0.198%.
- **Four of a kind:** 624 hands, about 1 in 4,165.
- **Royal flush:** 4 hands, 1 in 649,740.

The full ladder of poker hands and how they rank is on the [poker hand rankings page](/guides/poker-hand-rankings), and the counting technique behind Hold'em decisions is in the [poker math guide](/guides/poker-math).

### Worked example: at least one heart in three cards

Count the complement. No hearts in three cards is (39/52) × (38/51) × (37/50) = 54,834/132,600 ≈ 41.4%. So at least one heart is about 58.6%. "At least one" problems are almost always easier from the complement.`,
    },
    {
      id: "shuffle",
      title: "Shuffles, 52 factorial and randomness",
      body: `The number of distinct orders of a 52 card deck is 52! (52 factorial) = 52 × 51 × 50 × … × 1 ≈ 8.07 × 10^67. That number is so large that a truly random shuffle has almost certainly never produced the same order twice in the history of playing cards.

The catch is the word "truly". Human shuffles are not perfectly random, and a deck straight from the box is in suit and rank order. Mathematical work by Dave Bayer and Persi Diaconis in 1992 showed that about seven riffle shuffles are needed to mix a 52 card deck well by a standard measure; fewer leave detectable structure. The details, including overhand and wash shuffles, are in [how to shuffle cards](/guides/how-to-shuffle-cards).

### Why structure matters for gamblers

- **Clumping:** a poorly mixed deck keeps cards from the previous hand near each other.
- **Tracking:** skilled players have exploited predictable shuffles to follow groups of cards.
- **Digital decks:** online games shuffle with random number generators, so the physical problem disappears, but the quality of the generator becomes the question. See [how random number generators work](/guides/how-random-number-generators-work).

### The calendar myth

A popular claim says the deck was designed as a calendar: 52 weeks, 4 seasons, 13 lunar months, and a pip total of 364 (1 through 13, times four) plus one joker for 365 days. The numbers do add up that way, but there is no historical evidence that card makers designed the deck on that basis. Treat it as folklore.

More games that use the deck, from rummy to spades, are collected in the [games of chance topic hub](/guides/topics/games-of-chance).`,
    },
    {
      id: "games",
      title: "How games use the deck",
      body: `The same 52 cards support very different probability problems depending on how many are dealt and whether the deck is reshuffled.

| Game | Cards used | Key probability feature |
| --- | --- | --- |
| Blackjack | Usually 6–8 decks shuffled together | Removal of cards shifts odds within a shoe |
| Texas Hold'em | 1 deck, 2 hole cards + 5 shared | Outs and combos from 47 or 46 unseen cards |
| Baccarat | 6–8 decks | Tens and faces count as zero |
| Video poker | 1 deck, fresh each hand | Draw decisions against a paytable |
| Casino war | Usually 6 decks | Ties are the house's main lever |
| Rummy, spades, bridge | 1 deck, all or most cards dealt | Hidden information and inference |

Two principles carry across all of them:

1. **With replacement or without?** A fresh deck each hand makes every hand independent. A shoe dealt down without reshuffling creates dependence, which is why blackjack can be counted and video poker cannot.
2. **Multiple decks dilute removal.** Taking one ace out of a single deck changes the ace share from 7.69% to 5.88%. Taking one out of six decks (312 cards, 24 aces) moves it much less, from 7.69% to 23/311 ≈ 7.40%. The [how many decks guide](/guides/how-many-decks-blackjack) shows how that affects the house edge.

Card games played for money are for adults only, 18+ or your local legal age.`,
    },
    {
      id: "pvp",
      title: "Counting outcomes on a hashed PvP round",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network, for adults 18+ only. There is no deck, but the counting method is the same: favourable outcomes over total outcomes.

On [Roulette](/roulette), the wheel has 33 slots. Purple covers 16, so P(Purple) = 16/33 ≈ 48.5%, a little like the chance of drawing a red card from a deck that has one extra green card added. Purple and Silver pay 2x and Green pays 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Unlike a shoe, every round starts fresh: there is no removal effect, so past results say nothing about the next spin.

[Coinflip](/coinflip) is a plain 50/50, and in [Jackpot](/) your win chance equals your share of the pot. Each result comes from committed seeds, and you can check any settled round on the [fairness page](/fairness).

See also [hearts](/guides/hearts-card-game-rules), [klondike solitaire](/guides/solitaire-rules), [go fish](/guides/go-fish-rules) and [phase 10](/guides/phase-10-rules).`,
    },
  ],
  faqs: [
    {
      q: "How many cards are in a standard deck?",
      a: "A standard deck has 52 cards: four suits of 13 ranks. Most packs also include two jokers, which are left out of most games.",
    },
    {
      q: "What are the four suits in a deck of cards?",
      a: "Clubs, diamonds, hearts and spades. Hearts and diamonds are red; clubs and spades are black. These are the French suits, used in most of the world.",
    },
    {
      q: "How many face cards are in a 52 card deck?",
      a: "There are 12 face cards: a jack, queen and king in each of the four suits. Aces are not usually counted as face cards.",
    },
    {
      q: "What are the odds of drawing an ace from a deck?",
      a: "4 in 52, which simplifies to 1 in 13, or about 7.7%. The odds against are 12 to 1.",
    },
    {
      q: "Is the 52 card deck based on the calendar?",
      a: "The numbers fit neatly, with 52 weeks and 4 seasons, but there is no historical evidence that the deck was designed as a calendar. It is best treated as folklore.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Standard 52-card deck",
      url: "https://en.wikipedia.org/wiki/Standard_52-card_deck",
    },
    {
      label: "Encyclopaedia Britannica: playing card",
      url: "https://www.britannica.com/topic/playing-card",
    },
    {
      label: "Wikipedia: Poker probability",
      url: "https://en.wikipedia.org/wiki/Poker_probability",
    },
  ],
  related: [
    "how-to-shuffle-cards",
    "how-to-play-spades",
    "how-to-play-rummy",
    "poker-hand-rankings",
    "card-counting",
    "poker-math",
  ],
  updated: "2026-09-27",
};
