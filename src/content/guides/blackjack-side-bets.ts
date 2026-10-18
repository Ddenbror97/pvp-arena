import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blackjack-side-bets",
  cluster: "Blackjack",
  keyword: "blackjack side bets",
  secondary: [
    "perfect pairs blackjack",
    "21+3 side bet",
    "lucky ladies blackjack",
    "bust it side bet",
    "royal match blackjack",
  ],
  title: "Blackjack Side Bets: Perfect Pairs, 21+3 and Edges",
  description:
    "Blackjack side bets compared: Perfect Pairs, 21+3, Lucky Ladies, Royal Match and Bust It, with the probability maths and the house edge of each paytable.",
  h1: "Blackjack side bets: how Perfect Pairs, 21+3 and Lucky Ladies pay",
  answer:
    "Blackjack side bets are optional wagers placed next to the main bet that pay on specific card combinations, such as a pair in your first two cards (Perfect Pairs), a poker hand made with the dealer's up-card (21+3) or a two-card 20 (Lucky Ladies). They are settled separately from the hand. Their house edges usually run from about 3% to over 20%, far above a well-played main game.",
  facts: [
    "Perfect Pairs at 25-12-6 has a 6.11% edge with six decks and 4.10% with eight decks.",
    "Classic 21+3 paying 9:1 on any flush, straight or three of a kind has a 3.24% edge with six decks.",
    "One common Lucky Ladies paytable works out near 25% house edge with six decks.",
    "A Royal Match paying 5:2 on suited cards and 25:1 on suited K-Q has about a 7.88% Purple or Silver edge after the win fee with six decks.",
    "A $5 side bet at 4% costs more per hand than a $10 main bet at 0.5%.",
  ],
  sections: [
    {
      id: "what",
      title: "What blackjack side bets are",
      body: `A side bet is a separate wager placed in its own circle before the deal. It is settled on the cards alone, usually your first two cards and sometimes the dealer's up-card or final hand. Your hit and stand decisions do not change it, and it does not change the main hand.

Casinos like side bets because they carry much higher edges than blackjack itself. A player who uses correct [blackjack basic strategy](/guides/blackjack-basic-strategy) faces an edge of around 0.5% on a good table. Most side bets charge several times that on every dollar you put in the extra circle.

Insurance is technically a side bet too, but it has its own page: [blackjack insurance](/guides/blackjack-insurance) covers why the 2:1 price is usually wrong. This page covers the optional bets printed on the felt. For the rest of the blackjack cluster, see the [blackjack topic hub](/guides/topics/blackjack). Real-money play is for adults 18+ or the local legal age.

### How the numbers below were worked out

Every edge on this page is computed from a fresh shoe with exact combinations: count the ways each outcome can happen, multiply by its payout, subtract the losing ways and divide by the total. Paytables differ between casinos, so always recompute if the felt shows different numbers.`,
    },
    {
      id: "perfect-pairs",
      title: "Perfect Pairs: odds and house edge",
      body: `Perfect Pairs pays if your first two cards are a pair. There are three grades:

- **Mixed pair:** same rank, different colours (for example 8♠ 8♥).
- **Coloured pair:** same rank, same colour, different suits (8♠ 8♣).
- **Perfect pair:** identical cards (8♠ 8♠), only possible with more than one deck.

### Six-deck arithmetic

With 312 cards, take any first card. Of the 311 cards left, 5 are identical copies, 6 are the other suit of the same colour and 12 are the same rank in the other colour. That is 23 pairing cards and 288 non-pairing cards.

On a 25-12-6 paytable (perfect 25:1, coloured 12:1, mixed 6:1):

Expected value = (5 × 25 + 6 × 12 + 12 × 6 − 288) ÷ 311 = (125 + 72 + 72 − 288) ÷ 311 = −19 ÷ 311 ≈ −6.11%

### Deck count and paytable change everything

| Paytable | Six decks | Eight decks |
| --- | --- | --- |
| 25-12-6 | 6.11% | 4.10% |
| 30-10-5 | 5.79% | 3.37% |

For eight decks there are 415 cards left after the first: 7 identical, 8 coloured, 16 mixed, 384 non-pairing. On 25-12-6 that gives (175 + 96 + 96 − 384) ÷ 415 ≈ −4.10%. More decks make identical pairs more likely, which is why the same paytable is cheaper in an eight-deck shoe.`,
    },
    {
      id: "twenty-one-three",
      title: "21+3: poker hands with the dealer's card",
      body: `21+3 treats your two cards and the dealer's up-card as a three-card poker hand. It wins on a flush, straight, three of a kind or better.

### Six-deck counts

There are C(312, 3) = 5,013,320 three-card combinations.

| Hand | Combinations | Probability |
| --- | --- | --- |
| Suited three of a kind | 52 × C(6,3) = 1,040 | 0.02% |
| Straight flush | 12 × 4 × 6³ = 10,368 | 0.21% |
| Three of a kind (all) | 13 × C(24,3) = 26,312 | 0.52% |
| Straight (all) | 12 × 24³ = 165,888 | 3.31% |
| Flush (all) | 4 × C(78,3) = 304,304 | 6.07% |

Removing the overlaps, 485,096 combinations win something, 9.68% of all hands.

### Classic 9:1 paytable

The original version paid 9:1 on any winning hand. Expected value = 0.09676 × 10 − 1 ≈ −3.24%. That is one of the milder side bets.

### Five-tier paytable

Many tables now pay by rank. On a table paying suited trips 100:1, straight flush 40:1, three of a kind 30:1, straight 10:1 and flush 5:1, the six-deck edge works out to about 4.62%. The big numbers look better, but flushes, the most common winner, dropped from 9:1 to 5:1.`,
    },
    {
      id: "lucky-ladies",
      title: "Lucky Ladies and Royal Match",
      body: `### Lucky Ladies

Lucky Ladies pays when your first two cards total 20. In a six-deck shoe there are C(312,2) = 48,516 two-card combinations, and 5,136 of them make 20: 4,560 pairs of ten-value cards and 576 ace-nine combinations. That is a 10.59% hit rate.

One common paytable pays 4:1 on any 20, 9:1 on a suited 20, 19:1 on a matched 20 (identical cards), 125:1 on a pair of queens of hearts and 1,000:1 on queens of hearts when the dealer has blackjack.

| Result | Combinations | Pays |
| --- | --- | --- |
| Queen of hearts pair | 15 | 125:1 (1,000:1 with dealer blackjack) |
| Other matched 20 | 225 | 19:1 |
| Suited 20 | 1,008 | 9:1 |
| Unsuited 20 | 3,888 | 4:1 |
| Anything else | 43,380 | loses |

Before the dealer-blackjack bonus: (15 × 125 + 225 × 19 + 1,008 × 9 + 3,888 × 4 − 43,380) ÷ 48,516 ≈ −26.0%. The 1,000:1 upgrade adds back only about 1.3 points, leaving an edge near 24.7%. That is one of the most expensive bets in a casino.

### Royal Match

Royal Match pays on suited first two cards. On a version paying 5:2 for any suited pair of cards and 25:1 for a suited king and queen, the six-deck count is 12,012 suited combinations, of which 144 are suited K-Q. Expected value = (11,868 × 2.5 + 144 × 25 − 36,504) ÷ 48,516 ≈ −6.67%.`,
    },
    {
      id: "bust-it",
      title: "Bust It, Match the Dealer and other variants",
      body: `### Bust It and dealer-bust bets

Bust It, sometimes sold under similar names, pays if the dealer busts, with higher pays the more cards the dealer's busted hand contains. A dealer busts roughly 28% of the time in a typical shoe game, so the base pay has to be small to keep an edge, and the big pays for six, seven or eight-card busts are rare. The edge depends heavily on the paytable and on whether the dealer hits soft 17. Treat any unpublished paytable as expensive.

### Match the Dealer

Common on [Spanish 21](/guides/spanish-21) tables, it pays when one or both of your first two cards match the rank of the dealer's up-card, with more for a suited match.

### Game-specific side bets

- **Super Match** on [Blackjack Switch](/guides/blackjack-switch) pays on pairs and better in your four starting cards.
- **Push 22** on [free bet blackjack](/guides/free-bet-blackjack) pays when the dealer finishes on 22.
- **Hot 3** and **Any Pair** appear on [Infinite Blackjack](/guides/infinite-blackjack) alongside 21+3 and Bust It.

### Progressive side bets

Some tables link a side bet to a progressive jackpot. The return depends on the jackpot size, and most of the time the meter is well below the level where the bet would be close to fair. The same logic is covered for slots in [progressive jackpot odds](/guides/progressive-jackpot-odds).`,
    },
    {
      id: "cost",
      title: "What side bets cost per hour",
      body: `Edges are percentages of money wagered, so a small side bet can cost more than a large main bet.

| Bet | Stake | Edge | Expected cost per hand |
| --- | --- | --- | --- |
| Main hand, good rules and chart | $10 | 0.5% | $0.05 |
| 21+3, classic 9:1, six decks | $5 | 3.24% | $0.16 |
| Perfect Pairs 25-12-6, six decks | $5 | 6.11% | $0.31 |
| Lucky Ladies, paytable above | $5 | about 24.7% | about $1.24 |

At 60 hands an hour, the main hand costs about $3 on average. Adding a $5 Lucky Ladies bet adds about $74 an hour in expected cost. Adding Perfect Pairs adds about $18. Those are averages; any single hour can go either way, but the averages are what a long run converges to. The concept is laid out in [house edge](/guides/house-edge) and [expected value](/guides/expected-value-gambling).

### Reading a side-bet paytable at the table

You rarely have time to count combinations while a dealer waits. A quicker test is to compare each pay with the true odds of the event, which you can work out once and remember. For six decks:

| Event on your first two cards | Probability | Fair odds against | Typical pay |
| --- | --- | --- | --- |
| Any pair | 23/311 ≈ 7.40% | about 12.5 to 1 | 5:1 to 6:1 (mixed pair) |
| Identical pair | 5/311 ≈ 1.61% | about 61 to 1 | 25:1 to 30:1 |
| Suited cards | 77/311 ≈ 24.76% | about 3 to 1 | 5:2 on Royal Match |
| Two-card 20 | 5,136/48,516 ≈ 10.59% | about 8.4 to 1 | 4:1 on Lucky Ladies |

A paytable can still be close to fair overall if a few rare outcomes pay well above their odds, but when every common outcome pays well below its fair price, as with Lucky Ladies, no jackpot line can rescue it. The most common winning line matters most, because it is where most of the money goes.

### Variance, not just edge

Side bets also change how your session swings. A 25:1 pay that hits 1.6% of the time produces long stretches of losses between wins. If you play a side bet, size it so that 50 losing rounds in a row would not change your plans for the main game. For how swings and edge interact, see [variance in gambling](/guides/variance-in-gambling).

### When side bets make sense

Only if you have priced them and decided the entertainment is worth that cost. Some advantage players have targeted specific side bets with dedicated counts, but that is specialist work, and casinos respond by changing paytables or deck counts. For most players the best side bet is none.`,
    },
    {
      id: "pvp",
      title: "The Roulette edge at PVPspinArena",
      body: `The Royal Match example is a different price from PVPspinArena Roulette. PVPspinArena [Roulette](/roulette) uses a 33-slot wheel: 16 Purple and 16 Silver pay 2x and 1 Green pays 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. The difference is visibility. Those Roulette returns are stated up front, while a blackjack side bet's edge depends on a paytable and deck count you have to work out yourself.

[Coinflip](/coinflip) is a 50/50 between two players and the [Jackpot](/) gives you a chance equal to your share of the pot, with any fee shown before entry. Results come from committed seeds and can be checked on the [fairness](/fairness) page after settlement.

Whatever you play, price it before you bet. PVPspinArena is for adults 18+, and limits and time-outs are on the [responsible gambling](/responsible-gambling) page.`,
    },
  ],
  faqs: [
    {
      q: "Which blackjack side bet has the best odds?",
      a: "Of the common ones, classic 21+3 paying 9:1 is among the cheapest at about 3.24% with six decks, and Perfect Pairs with eight decks can be near 3.4% to 4.1%. All are far above the main game's edge.",
    },
    {
      q: "What is the house edge on Perfect Pairs?",
      a: "It depends on the paytable and decks. At 25-12-6 it is 6.11% with six decks and 4.10% with eight decks. At 30-10-5 it is 5.79% and 3.37%.",
    },
    {
      q: "How does the 21+3 side bet work?",
      a: "Your two cards plus the dealer's up-card form a three-card poker hand. Flushes, straights, three of a kind and better win. About 9.7% of six-deck hands win something.",
    },
    {
      q: "Is Lucky Ladies a good bet?",
      a: "No. It wins about 10.6% of the time, and on a common paytable the house edge is near 25%, one of the highest on any casino table.",
    },
    {
      q: "Do side bets affect my main blackjack hand?",
      a: "No. They are settled on the cards dealt and do not change your hit, stand, double or split decisions, or the result of the main bet.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: blackjack side bets",
      url: "https://wizardofodds.com/games/blackjack/side-bets/",
    },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
  ],
  related: [
    "blackjack-insurance",
    "free-bet-blackjack",
    "blackjack-switch",
    "infinite-blackjack",
    "blackjack-strategy-chart",
  ],
  updated: "2026-09-27",
};
