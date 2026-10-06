import type { Guide } from "./types";

export const guide: Guide = {
  slug: "deuces-wild",
  cluster: "Poker",
  keyword: "deuces wild",
  secondary: [
    "deuces wild video poker",
    "full pay deuces wild",
    "deuces wild paytable",
    "deuces wild strategy",
  ],
  title: "Deuces Wild Video Poker: Paytables, RTP and Strategy",
  description:
    "Deuces wild video poker explained: the full pay 25/15/9/5 paytable at 100.76%, cheaper tables to avoid, strategy by number of deuces, and worked EV examples.",
  h1: "Deuces wild video poker: paytables, return and strategy basics",
  answer:
    "Deuces wild is a video poker game where all four 2s are wild. Because wild cards make big hands common, the lowest paying hand is three of a kind. Full pay deuces wild (wild royal 25, five of a kind 15, straight flush 9, four of a kind 5) returns about 100.76% with perfect strategy and a max-coin bet. Cheaper paytables drop below 99%.",
  facts: [
    "All four deuces are wild; three of a kind is the lowest paying hand.",
    "Full pay deuces wild returns about 100.76% with optimal play at max coins.",
    "Spot full pay by the 15 / 9 / 5 pays for five of a kind, straight flush and four of a kind.",
    "A natural royal pays 800 per coin only on a 5-coin bet; with fewer coins it usually pays 250.",
    "Never discard a deuce, and with two pair keep only one pair.",
  ],
  sections: [
    {
      id: "rules",
      title: "How deuces wild works",
      body: `Deuces wild uses the same draw structure as other video poker games. You bet one to five coins, receive five cards from a single freshly shuffled 52-card deck, choose which to hold, and replace the rest once. The final hand is paid from a fixed table. The machine deals from a digital shuffle each hand, so there is nothing to count between hands.

The difference is that the four 2s substitute for any card. That changes the hand ladder in two ways:

1. **New hands appear.** Five of a kind (for example 8-8-8-2-2) and a wild royal (a royal flush that uses at least one deuce) are possible. Four deuces is its own premium hand.
2. **Low hands disappear from the paytable.** With four wild cards, pairs and two pair are too easy to make, so they pay nothing. The first paying hand is three of a kind.

Hands are evaluated at their best interpretation. 2-7-7-9-J is three sevens; 2-2-5-6-9 suited is a straight flush, not just a flush.

Deuces wild belongs to the video poker family in the [poker topic hub](/guides/topics/poker). If you are new to the format, the [video poker paytables guide](/guides/video-poker-paytables) explains Jacks or Better, the baseline game, and how paytables translate into return. Real-money play is for adults only, 18+ or your local legal age.`,
    },
    {
      id: "paytables",
      title: "Deuces wild paytables and their returns",
      body: `Pays are per coin on a five-coin bet. The top two rows are usually fixed at 800 and 200; the rows below are where casinos tighten the game.

| Hand | Full pay | "Not So Ugly" | Common short pay |
| --- | --- | --- | --- |
| Natural royal flush | 800 | 800 | 800 |
| Four deuces | 200 | 200 | 200 |
| Wild royal flush | 25 | 25 | 25 |
| Five of a kind | 15 | 16 | 15 |
| Straight flush | 9 | 10 | 9 |
| Four of a kind | 5 | 4 | 4 |
| Full house | 3 | 4 | 4 |
| Flush | 2 | 3 | 3 |
| Straight | 2 | 2 | 2 |
| Three of a kind | 1 | 1 | 1 |
| Return with optimal play | ≈ 100.76% | ≈ 99.73% | ≈ 98.9% |

### Reading the table in five seconds

Look at five of a kind, straight flush and four of a kind. **15 / 9 / 5** is full pay. **16 / 10 / 4** is the "Not So Ugly" table. Any table paying 4 for four of a kind with 15 / 9 above it is a short-pay version. Four of a kind is by far the most common premium hand in this game, so dropping it from 5 to 4 costs more than the extra full-house and flush pays give back.

Tables tighter than these exist, some well below 97%. They often look generous because the full house or flush pays more; always check the four-of-a-kind row first.

### What 100.76% really means

A return above 100% is a theoretical long-run figure for perfect play on every hand. It includes the natural royal, which arrives roughly once every 45,000 hands or so with optimal strategy, and it assumes no errors. Small mistakes easily cost more than the 0.76% margin, and a session of a few thousand hands is dominated by variance. Full-pay machines have reportedly become rare on casino floors, so treat any you find as a curiosity rather than a plan.`,
    },
    {
      id: "strategy",
      title: "Strategy basics by number of deuces",
      body: `The simplest way to learn deuces wild is to sort every hand by how many deuces you were dealt. These rules are a simplified outline for the full-pay table; exact priority lists differ by paytable and are best learned from a published strategy card.

### Four deuces

Hold all five cards. You already have the 200-coin hand.

### Three deuces

Keep a wild royal or five of a kind if you have one. Otherwise hold only the three deuces and draw two. Three deuces alone already guarantee four of a kind.

### Two deuces

Keep four of a kind or better. Keep four to a wild royal. Otherwise, hold just the two deuces in most hands, unless you also hold four to a straight flush with connected cards.

### One deuce

Keep made hands of four of a kind or better, then four to a royal, then a full house, four to a straight flush, three of a kind, a made straight or flush, and three to a royal. With nothing, hold the lone deuce and draw four.

### No deuces

Keep a natural royal, then four to a royal, then made straight flushes, fours, full houses, flushes and straights, then three of a kind, four to a straight flush, and a single pair. With nothing useful, draw five new cards.

### The rules people get wrong

- **Never throw away a deuce.** Each one is worth far more than any natural card.
- **Two pair: keep one pair.** Two pair pays nothing and drawing three cards to a pair has more chances at trips, quads and five of a kind than drawing one card to two pair.
- **No kickers.** High cards have no value because no pair pays. Holding a deuce plus an ace is a mistake.
- **Drawing five is normal.** Garbage hands are common, and a fresh five cards give four new chances at a deuce.`,
    },
    {
      id: "ev-examples",
      title: "Worked EV examples",
      body: `Two hands show why deuces wild strategy looks strange to Jacks or Better players.

### Breaking a straight flush

You hold 9♠ 10♠ J♠ Q♠ K♠, a made straight flush worth 9 per coin. Discard the 9♠ and draw one from the 47 remaining cards:

| Draw | Cards | Result | Pay per coin |
| --- | --- | --- | --- |
| A♠ | 1 | Natural royal | 800 |
| Any deuce | 4 | Wild royal | 25 |
| 9♠ | 1 | Straight flush | 9 |
| Other spades (3–8) | 6 | Flush | 2 |
| Non-spade A or 9 | 6 | Straight | 2 |
| Anything else | 29 | Nothing | 0 |

EV = (800 + 100 + 9 + 12 + 12) / 47 = 933 / 47 ≈ 19.9 per coin. Keeping the straight flush is worth 9. The draw is worth more than twice as much, so full-pay strategy breaks it. In Jacks or Better, where a straight flush pays 50, you would keep it.

### Two pair

You hold 7-7-J-J-4 with no deuces. Keeping both pairs and drawing one card only pays if the card makes a full house: 4 sevens-or-jacks plus 4 deuces = 8 cards of 47, so EV ≈ 8 × 3 / 47 ≈ 0.51. Keeping one pair and drawing three creates many more paths to trips, a full house, four of a kind and five of a kind. Published analyses show the one-pair hold is worth more, which is why the rule is to split two pair.

The general tool behind both examples is expected value; [how to calculate house edge](/guides/how-to-calculate-house-edge) shows the same method applied to whole paytables.`,
    },
    {
      id: "coins",
      title: "Max coins, variance and bankroll",
      body: `### Why five coins matters

The natural royal pays 250 per coin on one to four coins and jumps to 800 per coin (4,000 coins) on the fifth. That jump is built into the 100.76% figure. Playing one coin at a time lowers the return by roughly a percentage point, which is more than the whole full-pay margin. If five coins at the chosen denomination is too expensive, a lower denomination at max coins is the better version of the same game.

### Variance

Deuces wild is more volatile than Jacks or Better. More than half of all hands lose, and a large share of the return is concentrated in rare hands: four deuces, natural royals and wild royals. Long dry spells are normal. A bankroll that feels large for a flat 1-coin game can disappear quickly at 5 coins per hand, which at 600 hands an hour means 3,000 coins of action every hour.

### A worked session budget

At $0.25 per coin, a max bet is $1.25. At 500 hands per hour you wager $625 per hour. Even on a full-pay machine with perfect play the long-run result is only slightly positive, while a short-pay 98.9% table costs about 1.1% × $625 ≈ $6.90 per hour on average, with swings of hundreds of dollars either way. Decide the hourly cost you accept before you sit down, and stop at a written loss limit.

For how volatility and edge interact over a session, see [variance in gambling](/guides/variance-in-gambling). The [gambling budget guide](/guides/gambling-budget) covers setting limits.`,
    },
    {
      id: "variants",
      title: "Deuces wild compared with other video poker",
      body: `Deuces wild sits in a family of wild-card and bonus games. Compared with the non-wild baseline:

| Feature | Jacks or Better (9/6) | Full pay deuces wild |
| --- | --- | --- |
| Wild cards | None | Four deuces |
| Lowest paying hand | Pair of jacks | Three of a kind |
| Long-run return (optimal) | ≈ 99.54% | ≈ 100.76% |
| Hit frequency | Higher | Lower |
| Volatility | Moderate | Higher |
| Strategy complexity | Moderate | Higher (depends on deuce count) |

Joker Poker, which adds a single joker to a 53-card deck, is another wild-card game with its own paytable logic. Bonus games like Double Double Bonus keep a natural deck but pay heavily for specific four-of-a-kinds.

The practical rule is the same for every version: identify the exact paytable, learn the strategy for that table, and understand that video poker returns quoted above 99% assume perfect play. Once a machine's paytable is known, the return is a fixed property of the game, much like a [house edge](/guides/house-edge) on a table game. That is also why comparing tables beats any betting system.`,
    },
    {
      id: "pvp",
      title: "Paytable thinking on PVPspinArena",
      body: `PVPspinArena runs three player-vs-player games in USDC or ETH on the Base network, for adults 18+ only. None of them is video poker, but the paytable habit transfers directly: multiply each payout by its probability and add them up.

On [Roulette](/roulette), the 33-slot wheel has 16 Purple and 16 Silver slots paying 2x and 1 Green slot paying 14x. Purple returns (16/33) × 2 = 32/33 ≈ 96.97%, Green returns (1/33) × 14 = 14/33. Green costs much more than Purple. [Coinflip](/coinflip) is a 50/50 between two players, and in [Jackpot](/) your win chance equals your share of the pot; in both, the winner takes the pot minus any fee shown before entry.

Unlike a video poker machine, there is no hold decision to get right or wrong. Instead, each result comes from committed seeds, and you can verify any settled round on the [fairness page](/fairness). If play stops being fun, the [responsible gambling](/responsible-gambling) page has limits and support links.`,
    },
  ],
  faqs: [
    {
      q: "What is the best deuces wild paytable?",
      a: "Full pay deuces wild, which pays 25 for a wild royal, 15 for five of a kind, 9 for a straight flush and 5 for four of a kind, returns about 100.76% with perfect strategy at max coins.",
    },
    {
      q: "What is the lowest paying hand in deuces wild?",
      a: "Three of a kind. With four wild cards, pairs and two pair are too common to pay, so they return nothing.",
    },
    {
      q: "Should you hold two pair in deuces wild?",
      a: "No. Keep one pair and draw three. Two pair pays nothing, and drawing three gives more chances at three of a kind, four of a kind and five of a kind.",
    },
    {
      q: "Can you really get over 100% return on deuces wild?",
      a: "Only in theory, on a full-pay machine, at max coins, with perfect strategy over a very large number of hands. Mistakes, short-pay tables and variance usually erase the 0.76% margin.",
    },
    {
      q: "How do I tell if a deuces wild machine is full pay?",
      a: "Check the pays for five of a kind, straight flush and four of a kind on a max-coin bet. 15, 9 and 5 per coin is full pay; 4 for four of a kind is a tighter table.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Deuces Wild video poker",
      url: "https://wizardofodds.com/games/video-poker/tables/deuces-wild/",
    },
    { label: "Wikipedia: Video poker", url: "https://en.wikipedia.org/wiki/Video_poker" },
  ],
  related: [
    "video-poker-paytables",
    "three-card-poker-strategy",
    "poker-bankroll-management",
    "poker-math",
    "how-to-calculate-house-edge",
  ],
  updated: "2026-09-27",
};
