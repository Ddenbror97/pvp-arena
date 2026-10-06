import type { Guide } from "./types";

export const guide: Guide = {
  slug: "infinite-blackjack",
  cluster: "Blackjack",
  keyword: "infinite blackjack",
  secondary: [
    "infinite blackjack evolution",
    "infinite blackjack rtp",
    "six card charlie",
    "infinite blackjack side bets",
  ],
  title: "Infinite Blackjack: Evolution's Live Game Explained",
  description:
    "Infinite blackjack from Evolution explained: the shared opening hand, unlimited seats, the Six Card Charlie rule, side bets and the 99.47% RTP.",
  h1: "Infinite blackjack: one shared hand, unlimited players, six-card Charlie",
  answer:
    "Infinite Blackjack is Evolution's live-dealer blackjack game where any number of players join the same round and all receive the same first two cards. Each player then makes their own hit, stand, double and split decisions against a single dealer hand. It uses eight decks, pays blackjack 3:2, adds a Six Card Charlie rule and has a published RTP of 99.47% with optimal strategy, about a 0.53% house edge.",
  facts: [
    "Every player at the table receives the same initial two cards, and the dealer plays one hand against everyone.",
    "Seats are unlimited, so there is no waiting for a spot and no Bet Behind needed.",
    "Six Card Charlie: a hand of six cards that has not busted wins automatically.",
    "Evolution publishes a theoretical RTP of 99.47% for the main game with optimal strategy.",
    "Side bets include Any Pair, 21+3, Hot 3 and Bust It, each with a lower RTP than the main game.",
  ],
  sections: [
    {
      id: "what",
      title: "What Infinite Blackjack is",
      body: `Infinite Blackjack is a live casino product from Evolution, the studio behind most of the live dealer tables you see at online casinos. A real dealer in a studio deals real cards on camera. What makes it different from a normal seven-seat live table is the scale: the same round can host thousands of players at once.

The trick is a shared opening hand. Everyone gets the same two cards. Everyone sees the same dealer up-card. From there each player chooses their own actions, so two people at the same table can finish with different hands and different results even though they started identically.

This is a studio format, not a new set of maths. The underlying game is ordinary blackjack with a few rule tweaks. If you need the basics, start with [how to play blackjack](/guides/how-to-play-blackjack). For how live tables differ from RNG tables in general, see [live dealer casino](/guides/live-dealer-casino). Variants are collected in the [blackjack topic hub](/guides/topics/blackjack). Real-money play is for adults 18+ or the local legal age.`,
    },
    {
      id: "round",
      title: "How a round works: rules and payouts",
      body: `### Step by step

1. **Betting window.** A countdown opens. You place a main bet and any side bets. There is no seat to claim.
2. **The deal.** The dealer deals two cards for the common player hand and cards for the dealer's hand. Every player's screen shows the same two player cards.
3. **Decisions.** A timer runs while each player chooses to hit, stand, double, split or take insurance when offered. Your choice affects only your own hand.
4. **Drawing.** The dealer draws further cards for players who asked for them. When decisions diverge, the game keeps everyone's results consistent with a single sequence of cards and a single dealer hand; the in-game help describes the exact dealing order.
5. **Dealer's hand.** The dealer completes one hand under fixed rules and every player hand is settled against it.

### What happens if you run out of time

If the decision timer expires, the game applies a default action rather than holding up the table. Check the help screen for your version; in practice you should treat the timer as a hard limit and decide early.

### Why a shared hand matters

A shared hand means your decisions are the only thing that separates you from everyone else. Two players who follow the same strategy get the same result. The chat and on-screen statistics can make it feel social, but the round is still you against the dealer. Other players' choices do not change your odds, and a "table consensus" is not advice.

### Rules and payouts

The table below reflects Evolution's standard published rules. Operators sometimes run versions with different limits, so the help screen is the final word.

| Rule | Infinite Blackjack |
| --- | --- |
| Decks | 8 |
| Players per round | Unlimited |
| Blackjack pays | 3:2 |
| Dealer soft 17 | Stands |
| Insurance | Offered against a dealer ace, pays 2:1 |
| Double | On any first two cards |
| Split | Allowed on pairs, with limits on resplitting |
| Six Card Charlie | A six-card non-bust hand wins automatically |
| Main game RTP | 99.47% with optimal strategy |

### Reading the RTP

An RTP of 99.47% means an expected return of $99.47 per $100 wagered over the long run, a house edge of 0.53%. That figure assumes you play the optimal strategy for these exact rules every hand. Real players who guess, take insurance or follow hunches lose more.

### Insurance

Insurance is the same 2:1 side contract on a ten in the hole as in any blackjack game, and it is a poor price from an eight-deck shoe. The details are in [blackjack insurance](/guides/blackjack-insurance).`,
    },
    {
      id: "charlie",
      title: "Six Card Charlie: how it changes decisions",
      body: `Six Card Charlie is the most distinctive rule in Infinite Blackjack. Any hand that reaches six cards without busting wins, regardless of what the dealer ends up with. It is rare, because most hands finish in two to four cards, but it changes strategy when you already hold five.

### Worked examples with five cards

Suppose you hold five cards and have not busted. Hitting now has a new upside: any card that keeps you at 21 or under wins automatically. Using full-shoe card frequencies as a close approximation (each rank is about 1/13 of the shoe, with ten-value cards 4/13):

| Five-card total | Cards that win automatically | Approximate chance |
| --- | --- | --- |
| Hard 12 | A through 9 | 36/52 ≈ 69.2% |
| Hard 14 | A through 7 | 28/52 ≈ 53.8% |
| Hard 16 | A through 5 | 20/52 ≈ 38.5% |
| Hard 17 | A through 4 | 16/52 ≈ 30.8% |

Compare that with standing on a stiff total against a strong dealer card, which usually wins well under half the time. That is why optimal strategy for this game hits some five-card totals that a standard [blackjack strategy chart](/guides/blackjack-strategy-chart) would stand on.

### Why the rule barely moves the edge

Five-card hands are uncommon, so the Charlie rule helps the player only a little on average. It exists partly because it gives the live round a memorable moment, and partly to offset other rules in the house's favour. Its effect is already included in the 99.47% RTP.`,
    },
    {
      id: "edge",
      title: "House edge, pace and what a session costs",
      body: `### The edge in context

| Game | Typical house edge |
| --- | --- |
| Infinite Blackjack, optimal strategy | 0.53% |
| Good standard six-deck shoe, 3:2 | about 0.4% to 0.6% |
| [Free bet blackjack](/guides/free-bet-blackjack) | about 1% |
| Any table paying 6:5 on blackjack | about 1.9% to 2% |

Infinite Blackjack sits in the normal range for a fair blackjack table. It is not a special deal and not a trap.

### Pace

Live rounds are slower than RNG blackjack because of the betting window, the dealing and the decision timer. As an illustration, at 40 rounds an hour and $10 per round, a 0.53% edge costs about 40 × $10 × 0.0053 ≈ $2.12 per hour on average. An RNG table running 200 hands an hour at the same edge would cost about $10.60 per hour at the same stake. Slower is cheaper in expectation, though variance still dominates any single session. The idea that the edge applies to every dollar wagered is explained in [house edge](/guides/house-edge).

### Decks and counting

The game uses an eight-deck shoe, and deck count changes the edge in predictable ways; that maths is in [how many decks in blackjack](/guides/how-many-decks-blackjack). A shared hand means everyone sees the same cards, but the studio controls shuffles and penetration, and your only lever would be bet size. General counting principles are in [card counting](/guides/card-counting).`,
    },
    {
      id: "compare",
      title: "Infinite Blackjack versus a standard live table",
      body: `Evolution and other studios also run classic seven-seat live blackjack, so it is worth knowing what you trade by choosing the infinite format.

| Feature | Infinite Blackjack | Classic seven-seat live table |
| --- | --- | --- |
| Seats | Unlimited | Seven, plus Bet Behind on many tables |
| Your cards | Shared with every player | Your own hand |
| Waiting for a seat | Never | Common at popular limits |
| Rules | Fixed studio rules, Six Card Charlie | Vary by table and operator |
| Pace | Set by a round timer | Set by the slowest seated player |
| Minimum bet | Often low, because seats are not scarce | Often higher at busy tables |

### When the infinite format suits you

If you want to play a short session at low stakes without waiting, the shared format is convenient, and the rules are reasonable. The fixed timer also stops a round dragging while one player thinks.

### When a classic table suits you

If you prefer your own cards, a slower pace or a table whose rules happen to be better than the infinite version, a seated game may be the choice. Rule sets on classic live tables differ by operator, so compare the dealer soft 17 rule, doubling and splitting limits and the blackjack payout before assuming one is better. A classic table paying 6:5 is far worse than Infinite Blackjack's 3:2.

### Strategy is the same idea in both

In both formats, the right play depends only on your cards, the dealer's up-card and the rules. The difference in Infinite Blackjack is that Six Card Charlie and the eight-deck, stand-on-soft-17 rules slightly change the correct chart. [When to double down](/guides/when-to-double-down-blackjack) and [when to split](/guides/when-to-split-blackjack) cover the standard decisions that carry over almost unchanged.`,
    },
    {
      id: "side-bets",
      title: "Infinite Blackjack side bets",
      body: `Four side bets are standard on Evolution's Infinite Blackjack. Each is settled independently of your main hand.

- **Any Pair:** wins if your first two cards form a pair, with higher pays for a suited or identical pair.
- **21+3:** your two cards plus the dealer's up-card are treated as a three-card poker hand; flushes, straights, three of a kind, straight flushes and suited trips pay on a scale.
- **Hot 3:** pays on the total of your two cards plus the dealer's up-card, with the top prizes for 21 and for 7-7-7.
- **Bust It:** pays if the dealer busts, with higher pays the more cards the dealer needs to bust.

Evolution shows each side bet's paytable and RTP in the game's help panel. All of them return less than the main game's 99.47%, so they raise the average cost of every round you play them. Worked edges for the most common versions, including 21+3 and Perfect Pairs, are in [blackjack side bets](/guides/blackjack-side-bets).

### A simple rule

If you want the lowest-cost version of Infinite Blackjack, play the main bet only, use a chart built for eight decks with the dealer standing on soft 17, and decline insurance.`,
    },
    {
      id: "pvp",
      title: "Shared rounds at PVPspinArena",
      body: `Infinite Blackjack and PVPspinArena's Roulette share one idea: many players take part in the same round and see the same outcome. The difference is who you play against and how the price is set.

PVPspinArena [Roulette](/roulette) runs shared rounds on a 33-slot wheel. 16 Purple and 16 Silver slots pay 2x and 1 Green slot pays 14x, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. There are no decisions after the bet, so no chart can lower or raise it. [Coinflip](/coinflip) pairs two players on a 50/50, and the [Jackpot](/) gives each player a win chance equal to their share of the pot, with any fee shown before entry. Every settled round can be verified on the [fairness](/fairness) page from its committed seeds.

PVPspinArena is for adults 18+. If you are chasing a result or staying longer than planned, the [responsible gambling](/responsible-gambling) page has tools to set limits and take a break.

In the same cluster, see also [spanish 21](/guides/spanish-21) and [blackjack switch](/guides/blackjack-switch).`,
    },
  ],
  faqs: [
    {
      q: "What is Infinite Blackjack?",
      a: "A live-dealer blackjack game from Evolution where unlimited players share the same first two cards and dealer hand, then make their own decisions. It uses eight decks and has a 99.47% RTP with optimal play.",
    },
    {
      q: "What is the RTP of Infinite Blackjack?",
      a: "Evolution publishes 99.47% for the main game with optimal strategy, which is a house edge of 0.53%. Side bets have lower RTPs, shown in the game's help panel.",
    },
    {
      q: "What does Six Card Charlie mean?",
      a: "Any hand that reaches six cards without busting wins automatically, regardless of the dealer's total. It makes hitting some five-card stiffs correct.",
    },
    {
      q: "Do other players affect my hand in Infinite Blackjack?",
      a: "No. Everyone starts with the same two cards, but your decisions only affect your own hand, and every hand is settled against the same dealer hand.",
    },
    {
      q: "Can you count cards in Infinite Blackjack?",
      a: "Cards come from an eight-deck shoe, but the studio controls shuffling and penetration, and bet size is your only lever. For most players the correct chart matters far more.",
    },
  ],
  sources: [
    { label: "Evolution: live casino games", url: "https://www.evolution.com/" },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
    { label: "Wizard of Odds: Blackjack", url: "https://wizardofodds.com/games/blackjack/" },
  ],
  related: [
    "free-bet-blackjack",
    "spanish-21",
    "blackjack-switch",
    "how-many-decks-blackjack",
    "live-dealer-casino",
  ],
  updated: "2026-09-27",
};
