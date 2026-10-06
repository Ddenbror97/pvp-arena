import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cee-lo-rules",
  cluster: "Games of chance",
  keyword: "cee lo rules",
  secondary: ["cee-lo dice game", "4-5-6 dice game", "how to play cee lo", "cee lo odds"],
  title: "Cee Lo Rules: How to Play 4-5-6 Dice and the Odds",
  description:
    "Cee lo rules for the three-dice 4-5-6 game: winning and losing rolls, points, banker vs player play, and the exact odds, including the banker's real edge.",
  h1: "Cee lo rules: 4-5-6, points, banker vs player and the odds",
  answer:
    "Under standard cee lo rules, each player rolls three dice until they get a scoring result. 4-5-6 wins outright, 1-2-3 loses outright, three of a kind is a strong win, and a pair plus an odd die sets a point equal to the odd die. Anything else is rerolled. In the banker version, the banker's roll sets the target and each player tries to beat it.",
  facts: [
    "Three dice give 216 outcomes; exactly half of them (108) are rerolled as 'nothing'.",
    "4-5-6, 1-2-3 and triples each come up 6 times in 216 rolls, about 2.78% apiece.",
    "Each point from 1 to 6 appears 15 times in 216 rolls, about 6.94% each.",
    "With ties pushing, the banker's edge against each player works out to 2/81, about 2.47%.",
    "If ties go to the banker instead, that edge jumps to roughly 10.2%, which is why the tie rule matters.",
  ],
  sections: [
    {
      id: "what",
      title: "What cee lo is",
      body: `Cee lo (also written cee-lo, see-low or simply "4-5-6") is a fast three-dice gambling game played in a circle, often on a pavement or floor, with the dice thrown into a bowl or against a wall. It needs no table, no layout and no dealer, which is why it spread as a street and dorm game.

The commonly told origin of the name is the Chinese "sì wǔ liù", meaning four-five-six, the best roll in the game. Japan has a close relative called chinchirorin, played by rolling three dice into a rice bowl. Rules drift from group to group, so treat the version below as the most common core and agree on the details before any money moves.

Money play is for adults only: 18+ or your local legal age. Cee lo sits in the [Games of chance topic](/guides/topics/games-of-chance) alongside other small-group dice games such as [Mexico](/guides/mexico-dice-game) and [poker dice](/guides/poker-dice).`,
    },
    {
      id: "rolls",
      title: "The rolls: what wins, loses and rerolls",
      body: `A player keeps rolling all three dice until they throw one of the scoring combinations. Here is the full breakdown of the 216 equally likely outcomes.

| Roll | Example | Meaning | Ways out of 216 | Chance |
| --- | --- | --- | --- | --- |
| 4-5-6 | 4, 5, 6 in any order | Automatic win (the "cee lo") | 6 | 2.78% |
| Three of a kind | 3, 3, 3 | Very strong; higher triples beat lower | 6 | 2.78% |
| Pair + odd die | 2, 2, 5 | Point = the odd die (here 5) | 90 | 41.67% |
| 1-2-3 | 1, 2, 3 in any order | Automatic loss | 6 | 2.78% |
| Anything else | 1, 4, 6 | No score; roll again | 108 | 50.00% |

The 90 point rolls split evenly: each point value 1 through 6 can pair with any of the five other faces, in three positions, so 5 × 3 = 15 ways for each point.

### Ranking in the everyone-rolls game

When all players roll and the best result takes the pot, the order is: 4-5-6, then triples from 6-6-6 down to 1-1-1, then points from 6 down to 1, then 1-2-3. Tied players roll off.

### How long a turn lasts

Half of all throws score, so the number of throws per turn follows a geometric pattern with p = 1/2. The average is two throws. A player needs five or more throws only 1 time in 16, which keeps the game quick.`,
    },
    {
      id: "banker",
      title: "Banker vs player: step by step",
      body: `The banker version is the classic money game and the one most people mean by cee lo rules.

1. The banker puts up a bank, for example $50. Each player announces a bet, and the total of player bets cannot exceed the bank.
2. The banker rolls until getting a scoring result.
3. **Banker wins everything** on 4-5-6, any triple, or a pair with a 6 (point 6, which no player can beat).
4. **Banker loses everything** on 1-2-3 or a pair with a 1 (point 1, which every player beats or ties).
5. On a point of 2, 3, 4 or 5, each player in turn rolls to beat it. A player wins with 4-5-6, any triple or a higher point, and loses with 1-2-3 or a lower point.
6. A tied point is usually a push: the player's bet is returned. Some groups treat it as a banker win or make the player roll again.
7. The bank passes to the next player when the banker loses an automatic roll, when the bank is broken, or after an agreed number of rounds.

### A worked round

The bank is $50. Three players bet $10, $15 and $20, a total of $45, so the bank covers everyone. The banker throws 2, 6, 1 (nothing), then 3, 3, 4: a point of 4. Player one throws 5, 5, 2, a point of 2, and loses $10 to the bank. Player two throws 6, 6, 5, a point of 5, and collects $15. Player three throws 1, 1, 4, a point of 4, which ties: the $20 is returned. The bank ends the round at $45 and the banker keeps it, since nothing automatic ended the turn.

### Why the automatic rules matter

Points of 6 and 1 are not special by magic. A banker point of 6 can only be beaten by 4-5-6 or triples, and a point of 1 can only be tied or beaten, so most groups skip the formality and settle those rolls instantly. That shortcut changes the maths slightly in the banker's favour, which the next section shows.`,
    },
    {
      id: "odds",
      title: "Cee lo odds: how big is the banker's edge?",
      body: `Only scoring rolls matter, so work with the 108 scoring outcomes. On the banker's roll:

| Banker result | Scoring ways | Chance given a score |
| --- | --- | --- |
| Automatic win (4-5-6, triple, point 6) | 6 + 6 + 15 = 27 | 25.00% |
| Automatic loss (1-2-3, point 1) | 6 + 15 = 21 | 19.44% |
| Point 2, 3, 4 or 5 | 15 each, 60 total | 55.56% |

### Player against each point

A player facing point k wins with 4-5-6 (6), a triple (6) or any higher point (15 each), loses with 1-2-3 (6) or any lower point, and pushes on a tie (15).

| Banker point | Player wins | Player loses | Push | Player EV per $1 |
| --- | --- | --- | --- | --- |
| 2 | 72 | 21 | 15 | +51/108 ≈ +$0.47 |
| 3 | 57 | 36 | 15 | +21/108 ≈ +$0.19 |
| 4 | 42 | 51 | 15 | −9/108 ≈ −$0.08 |
| 5 | 27 | 66 | 15 | −39/108 ≈ −$0.36 |

Averaged over the four points, a player gains 6/108 per dollar once a point is set.

### Putting it together

Player EV = P(banker auto-loss) − P(banker auto-win) + P(point) × (6/108)
= 21/108 − 27/108 + (60/108)(6/108)
≈ −0.0556 + 0.0309 ≈ −0.0247.

So the banker holds about a 2.47% edge on every dollar bet against the bank. That is small, similar to a good casino table game, and it evens out if the bank rotates fairly. Players who refuse to take the bank are quietly paying that 2.47% to whoever does.

### When the tie rule changes

If tied points go to the banker, the player loses an extra (60/108)(15/108) ≈ 7.7% per dollar, and the banker's edge climbs to about 10.2%. Always ask how ties are settled; it is the single biggest number in the game. [House edge](/guides/house-edge) explains how to read a figure like this, and [expected value](/guides/expected-value-gambling) walks through the same kind of weighted average.`,
    },
    {
      id: "pot-game",
      title: "The everyone-rolls pot game: how strong is your roll?",
      body: `Without a banker, every player antes the same amount, everyone rolls, and the best result takes the pot. Your job after you roll is simple: know how often the rest of the circle will beat you. Using the 108 scoring outcomes again, here is the chance that one opponent's result strictly beats yours, and the chance that none of three opponents does.

| Your result | One opponent beats it | No one of three beats it |
| --- | --- | --- |
| 4-5-6 | 0% (a 4-5-6 ties) | 100% |
| Point 6 | 12/108 ≈ 11.1% | ≈ 70.2% |
| Point 5 | 27/108 = 25.0% | ≈ 42.2% |
| Point 4 | 42/108 ≈ 38.9% | ≈ 22.8% |
| Point 3 | 57/108 ≈ 52.8% | ≈ 10.5% |
| Point 2 | 72/108 ≈ 66.7% | ≈ 3.7% |
| Point 1 | 87/108 ≈ 80.6% | ≈ 0.7% |

The right-hand column is (1 − b)³, where b is the single-opponent figure. Ties are left out, which is why the columns do not include roll-offs; a tie at the top sends only the tied players to a fresh throw.

Two things stand out. First, a point of 4 already loses more often than it wins in a four-player circle. Second, the pot game has no house edge at all: with equal antes and equal chances, each player's expected share is exactly what they put in. The only way to lose money on average is to play against someone who cheats, or to play a banker who never gives up the bank.

### How many players?

The more players, the stronger a result must be to take the pot. With six opponents, even a point of 5 survives only 0.75^6 ≈ 17.8% of the time. Large circles turn cee lo into a hunt for 4-5-6 and triples, which is part of its appeal and part of why pots swing so fast.`,
    },
    {
      id: "fair",
      title: "Fair dice, fair throws and common scams",
      body: `Every number above assumes three fair dice and a random throw. On the street, that assumption fails in predictable ways.

- **Loaded or shaved dice.** A die weighted toward 6 raises the chance of triples and pair-with-6. Insist on dice everyone can inspect, and swap them in from a neutral pocket.
- **Controlled throws.** A soft slide or a "whip" throw along the ground can keep a die from tumbling. Throwing into a bowl or off a wall so the dice bounce is the traditional defence.
- **Rule switching.** A banker who announces tie rules only after a tie is a banker to walk away from.
- **Short banks.** Agree that the bank is on the ground and visible before anyone rolls.

The mathematical edge in cee lo is small. The practical edge from cheating is not. Card-table hustles work the same way; [three card monte](/guides/three-card-monte) is the classic example of a game that looks like chance but is not.`,
    },
    {
      id: "pvp",
      title: "Cee lo and PvP dice online",
      body: `The banker structure is the interesting part of cee lo: one player takes a small built-in edge, and rotating the bank shares it out. Head-to-head online games make the same idea explicit. [Dice duel](/guides/dice-duel-game) compares player-vs-player dice formats if that is the side of cee lo you enjoy.

PVPspinArena runs three player-vs-player games: Jackpot, [Coinflip](/coinflip) and Roulette. Coinflip is the purest version of a fair street bet: two players, 50/50, and the winner takes the pot minus any fee shown before entry. Roulette has a fixed edge that is much higher on Green than on Purple or Silver on a 33-slot wheel, so it is closer to always betting against the bank. Instead of watching someone's wrist, you verify: every settled round comes from committed seeds that you can recompute on the [fairness](/fairness) page.

Keep stakes to money you are happy to lose, set a stopping point before you start, and use the [responsible gambling](/responsible-gambling) tools if a dice circle turns into chasing losses.`,
    },
  ],
  faqs: [
    {
      q: "What are the basic cee lo rules?",
      a: "Roll three dice until you score. 4-5-6 wins, 1-2-3 loses, triples are strong wins, and a pair plus an odd die makes a point equal to the odd die. The higher result wins.",
    },
    {
      q: "What beats 4-5-6 in cee lo?",
      a: "Nothing. 4-5-6 is the top roll and wins automatically. In an everyone-rolls game, two players who both throw 4-5-6 roll off.",
    },
    {
      q: "Does the banker have an advantage in cee lo?",
      a: "Yes, a small one. With ties pushing and the usual automatic rules for points of 6 and 1, the banker's edge is about 2.47% per dollar bet against the bank.",
    },
    {
      q: "What happens on a tie in cee lo?",
      a: "It depends on house rules. Most groups push, returning the bet. Some reroll, and some give ties to the banker, which raises the banker's edge to about 10%.",
    },
    {
      q: "What does a pair with a 6 mean in cee lo?",
      a: "It is a point of 6, the highest point. In the banker game it counts as an automatic banker win because only 4-5-6 or triples could beat it.",
    },
  ],
  sources: [
    { label: "Wikipedia: Cee-lo", url: "https://en.wikipedia.org/wiki/Cee-lo" },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
  ],
  related: [
    "dice-duel-game",
    "mexico-dice-game",
    "poker-dice",
    "chuck-a-luck",
    "dice-roll-probability",
    "house-edge",
  ],
  updated: "2026-09-27",
};
