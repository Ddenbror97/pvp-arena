import type { Guide } from "./types";

export const guide: Guide = {
  slug: "blackjack-switch",
  cluster: "Blackjack",
  keyword: "blackjack switch",
  secondary: [
    "blackjack switch rules",
    "blackjack switch strategy",
    "blackjack switch house edge",
    "super match side bet",
  ],
  title: "Blackjack Switch: Rules, Strategy and House Edge",
  description:
    "Blackjack switch explained: two hands, swapping the second cards, even-money blackjack, the dealer 22 push, when to switch, and the true house edge.",
  h1: "Blackjack switch: swap the top cards, accept a dealer 22 push",
  answer:
    "Blackjack Switch is a variant where you play two hands with equal bets and may swap the second card dealt to each hand before playing them. That switch is a big player advantage, so the casino takes it back two ways: a blackjack pays only even money, and a dealer total of 22 pushes every live hand except a natural. With correct switching and playing strategy the house edge is roughly half a percent.",
  facts: [
    "You must play two hands of equal size; the second card of each hand can be exchanged once, before any other decision.",
    "Blackjack pays 1:1, not 3:2, and a 21 made by switching an ace and a ten counts as 21, not blackjack.",
    "A dealer 22 pushes against every non-blackjack player hand.",
    "Cutting blackjack from 3:2 to 1:1 costs roughly 2.3% of each hand in a six-deck shoe, before the switch pays it back.",
    "The common Super Match side bet pays on pairs in your four starting cards; on a 1-5-8-40 table with six decks its edge is about 2.5%.",
  ],
  sections: [
    {
      id: "what",
      title: "What Blackjack Switch is",
      body: `Blackjack Switch was designed by Geoff Hall, who is also credited with [free bet blackjack](/guides/free-bet-blackjack). It is a licensed game that appears in some land-based casinos and at online RNG and live tables. The table layout has two betting circles per seat, and you must bet the same amount on both.

After the deal, you look at your two hands and decide whether to exchange the second card of hand one with the second card of hand two. The first cards stay put. Once you have switched or declined, you play each hand under normal rules: hit, stand, double, split.

That single decision changes the game more than it sounds. Two weak hands often become one excellent hand and one decent hand. The casino offsets the gift with two rule changes that are easy to underrate. For the base game, read [how to play blackjack](/guides/how-to-play-blackjack), and for the other variants see the [blackjack topic hub](/guides/topics/blackjack). Real-money play is for adults 18+ or the local legal age.`,
    },
    {
      id: "rules",
      title: "Blackjack Switch rules at a glance",
      body: `| Rule | Common setting |
| --- | --- |
| Hands | Two per player, equal bets |
| Switch | Second cards of the two hands may be swapped once |
| Decks | 6 or 8 |
| Dealer soft 17 | Hits |
| Blackjack pays | 1:1 |
| Dealer 22 | Pushes all live hands except a player blackjack |
| Dealer peek | Yes, with an ace or ten-value up-card |
| Doubling | Any first two cards, double after split allowed |
| Splits | Usually resplit to four hands per starting hand |
| Surrender | Rare; check the placard |

### What counts as a blackjack

Only an ace and a ten-value card dealt together as a hand's first two cards count as a blackjack. If you create A-10 by switching, it is an ordinary 21. It pays 1:1 like a blackjack would here, but it can be tied by a dealer 21 and it pushes against a dealer 22, while a natural wins in both cases.

### Order of play

1. Place equal bets on both circles, plus any side bet.
2. Receive two cards on each hand; the dealer takes an up-card and checks for blackjack where the rules require it.
3. Decide to switch or not.
4. Play hand one, then hand two.
5. The dealer completes the hand. A dealer 22 pushes both of your hands unless one of them is a natural.`,
    },
    {
      id: "switching",
      title: "When to switch: worked examples",
      body: `The aim of the switch is to maximise the combined value of both hands, not to make one hand as good as possible. Published Blackjack Switch strategies rank starting hands by value against the dealer's up-card and compare the two possible pairs of hands.

### Example 1: two stiffs become 20 and 11

Hand one is 10-5 and hand two is 6-10 against a dealer 7.

- No switch: 15 and 16, both stiff against a strong card.
- Switch: 10-10 is 20 and 6-5 is 11.

A 20 against a 7 is a strong winner and 11 is the best doubling total in the game. This switch turns two likely losers into two favourites. Take it every time.

### Example 2: a switched 21 plus a double

Hand one is 10-2 and hand two is 9-A against a dealer 6.

- No switch: 12 and soft 20.
- Switch: 10-A is 21 and 9-2 is 11.

The 21 is not a blackjack, so a dealer 21 ties it and a dealer 22 pushes it, but it still wins most of the time. You also get a double on 11 against a 6. Switch.

### Example 3: leave two good hands alone

If both hands already stand on 19 or better, or the switch only reshuffles similar totals, declining is usually right. The switch has no cost in money, but a poor switch can break a pat hand.

### Rules of thumb

- Look for switches that create a 20, a 21 or a 10 or 11 to double.
- Avoid switches that leave you with two stiffs where you had one.
- Remember that playing strategy after the switch differs from the standard [blackjack strategy chart](/guides/blackjack-strategy-chart). Because a dealer 22 pushes, standing on stiffs against dealer bust cards is worth less, and some doubles and splits change.`,
    },
    {
      id: "costs",
      title: "Even-money blackjack, the 22 push and the house edge",
      body: `### Blackjack at 1:1

In a six-deck shoe the chance of a natural on a given hand is 2 × 24/312 × 96/311 ≈ 4.75%. At 3:2 each of those pays 1.5 units; at 1:1 it pays 1 unit. Ignoring the few rounds where the dealer also has blackjack, the lost half-unit costs about 0.5 × 4.75% ≈ 2.3% of every hand. That alone is more than four times the edge of a good standard game.

### Dealer 22 pushes

Commonly quoted simulation figures put a dealer finishing on exactly 22 at roughly 7% to 8% of rounds. In a standard game every one of those rounds pays any player hand still standing. Here they push. This rule also shapes strategy, because the value of standing on 12 to 16 against a dealer 4, 5 or 6 depends on the dealer busting.

### What the switch gives back

The switch is worth more than both costs combined. Having two hands and choosing between two arrangements of their second cards means you often convert stiffs into made hands and small totals into doubling totals, as the examples show. The final house edge is the balance of these three effects.

### The resulting house edge

With correct switching and playing strategy, published analyses such as Wizard of Odds put Blackjack Switch at roughly 0.5% to 0.6% under common six- or eight-deck rules with the dealer hitting soft 17. That is comparable with a good standard shoe game and better than a 6:5 table by well over a full percentage point.

### Turnover is doubled

Because you must play two hands, your action per round doubles. At $10 per hand you wager $20 per round. With a 0.6% edge the expected cost is about $0.12 per round, so 60 rounds an hour costs about $7.20 on average, versus about $3.60 for a player betting one $10 hand at the same edge. The edge is a percentage of money wagered, which is explained in [house edge](/guides/house-edge).

### Mistakes cost more here

Players who switch by feel, or who play a standard chart after switching, can give up a percent or more. The skill is concentrated in two places: the switch decision and the post-switch stand-or-hit decisions against weak dealer cards. If you want to price your own play, the [blackjack simulator](/guides/blackjack-simulator) guide shows how to test a strategy over millions of hands.

### Counting

[Card counting](/guides/card-counting) still has some value in principle, but switch decisions and the 22 rule make counts and index plays different from the standard game, and two-hand betting raises variance.`,
    },
    {
      id: "mistakes",
      title: "Common Blackjack Switch mistakes",
      body: `Most of the edge players give away in this game comes from a handful of habits carried over from standard blackjack.

### Treating each hand separately

The switch is a joint decision. A player who looks only at hand one and thinks "I have 19, keep it" can miss that 10-9 and 2-10 become 10-10 and 2-9 after a switch: a 20 and an 11 to double instead of a 19 and a 12. Always compare both arrangements as a pair, and add up what each pair of hands is worth against the dealer's card.

### Standing on stiffs the old way

In the standard game you stand on 13 against a dealer 2, 3 or 4 in many rule sets because the dealer busts often enough. Here a dealer 22 pushes, so part of that bust value disappears. Published switch strategies tend to hit some low stiffs against weak dealer cards that a standard chart would stand on. Copying a standard chart after the switch is one of the most expensive errors.

### Chasing the natural

Because a blackjack pays only 1:1, keeping an A-10 has less value than in a normal game. A natural still wins against a dealer 21 and a dealer 22, so it remains a strong hand, but the reason to protect it is its safety, not a bonus payout.

### Forgetting the doubled bankroll

Two hands per round at $10 each means a losing round costs $20 and a bad hour costs twice what it would at a single-hand table. Size your bankroll for the combined stake. If a single-hand player would bring 40 bets, bring 40 rounds' worth, which is 80 hand-sized bets.

### Adding the side bet by default

Super Match is optional. Playing it every round at $5 adds about $0.13 of expected cost per round on the paytable shown below, which over an hour is often more than the main game's cost.`,
    },
    {
      id: "super-match",
      title: "The Super Match side bet, with the maths",
      body: `Most Blackjack Switch tables offer Super Match. It pays if your four starting cards, before switching, contain a pair or better. A common paytable is:

| Four-card result | Pays |
| --- | --- |
| One pair | 1:1 |
| Three of a kind | 5:1 |
| Two pair | 8:1 |
| Four of a kind | 40:1 |

Three of a kind pays less than two pair because, in a six-deck shoe, three of a kind is actually more common.

### Working out the edge for six decks

There are C(312, 4) = 387,278,970 possible four-card combinations.

- Four different ranks: 715 × 24⁴ = 237,219,840 (lose)
- One pair: 13 × C(24,2) × C(12,2) × 24² = 136,401,408
- Three of a kind: 13 × C(24,3) × 288 = 7,577,856
- Two pair: C(13,2) × C(24,2)² = 5,941,728
- Four of a kind: 13 × C(24,4) = 138,138

Expected profit = (136,401,408 × 1 + 7,577,856 × 5 + 5,941,728 × 8 + 138,138 × 40 − 237,219,840) ÷ 387,278,970 ≈ −2.55%.

That is a lower edge than many blackjack side bets, but still several times the main game's. Compare others in [blackjack side bets](/guides/blackjack-side-bets). Paytables vary, so recompute if the table pays differently.`,
    },
    {
      id: "pvp",
      title: "Two-hand choices and PVPspinArena's single numbers",
      body: `Blackjack Switch shows how a casino can hand you a strong option and still keep an edge by trimming payouts elsewhere. The only honest way to judge it is to add up every rule and look at the final percentage.

PVPspinArena keeps that percentage visible. [Roulette](/roulette) has 16 Purple and 16 Silver slots paying 2x and 1 Green slot paying 14x on a 33-slot wheel, so Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. [Coinflip](/coinflip) is a 50/50 between two players, with any fee shown before entry. In the [Jackpot](/), your chance equals your share of the pot. Each result comes from committed seeds that you can verify on the [fairness](/fairness) page after the round settles.

Gambling is for adults 18+. If a session is running longer or bigger than planned, the [responsible gambling](/responsible-gambling) page has limits and time-outs.

In the same cluster, see also [spanish 21](/guides/spanish-21) and [infinite blackjack](/guides/infinite-blackjack).`,
    },
  ],
  faqs: [
    {
      q: "How does Blackjack Switch work?",
      a: "You play two hands with equal bets and may swap the second card of each hand once before playing. Blackjack pays even money and a dealer 22 pushes live hands, which pays for the switch.",
    },
    {
      q: "What is the house edge in Blackjack Switch?",
      a: "Roughly 0.5% to 0.6% with correct switching and playing strategy under common rules. Players who switch by feel or use a standard chart give up much more.",
    },
    {
      q: "Is a switched ace and ten a blackjack?",
      a: "No. It counts as an ordinary 21. It can tie a dealer 21 and pushes against a dealer 22, while a natural blackjack beats both.",
    },
    {
      q: "Why does blackjack pay only 1:1 in Blackjack Switch?",
      a: "The switch is a large advantage for the player. Cutting the blackjack payout, worth about 2.3% of each hand, and pushing dealer 22s are how the casino restores its edge.",
    },
    {
      q: "Is the Super Match side bet worth it?",
      a: "On a common 1-5-8-40 paytable with six decks the edge works out to about 2.55%. That is milder than many side bets but still several times the main game's edge.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Blackjack Switch",
      url: "https://wizardofodds.com/games/blackjack-switch/",
    },
    { label: "Wikipedia: Blackjack", url: "https://en.wikipedia.org/wiki/Blackjack" },
  ],
  related: [
    "free-bet-blackjack",
    "spanish-21",
    "infinite-blackjack",
    "blackjack-side-bets",
    "blackjack-strategy-chart",
  ],
  updated: "2026-09-27",
};
