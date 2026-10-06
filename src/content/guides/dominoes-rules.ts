import type { Guide } from "./types";

export const guide: Guide = {
  slug: "dominoes-rules",
  cluster: "Games of chance",
  keyword: "dominoes rules",
  secondary: ["how to play dominoes", "block dominoes", "draw dominoes", "dominoes scoring"],
  title: "Dominoes Rules: Block, Draw, Scoring and Variants",
  description:
    "Dominoes rules for block and draw games: the double-six set, dealing, matching ends, doubles, passing, scoring hands, All Fives and popular domino variants.",
  h1: "Dominoes rules: the set, block and draw games, scoring and variants",
  answer:
    "Basic dominoes rules: use a double-six set of 28 tiles, deal seven each to two players, and take turns matching one end of a tile to an open end of the line. In the block game you pass if you cannot play; in the draw game you pick from the boneyard until you can. The first to play every tile wins the hand and scores the pips left in opponents' hands.",
  facts: [
    "A double-n set has (n + 1)(n + 2) ÷ 2 tiles: 28 for double-six, 55 for double-nine and 91 for double-twelve.",
    "In a double-six set each number appears on 7 tiles and 8 tile ends; the whole set holds 168 pips.",
    "Block dominoes has no drawing: a player who cannot match an open end passes.",
    "In the draw game, a player who cannot play draws from the boneyard until a tile fits.",
    "All Fives (Muggins) scores during play whenever the open ends add up to a multiple of 5.",
  ],
  sections: [
    {
      id: "set",
      title: "The domino set: tiles, suits and pip totals",
      body: `A domino is a rectangular tile split into two ends, each marked with pips from blank (0) up to the set's maximum. Every combination appears exactly once. A tile with the same number on both ends is a **double**.

| Set | Tiles | Numbers | Tiles showing each number | Total pips |
| --- | --- | --- | --- | --- |
| Double-six | 28 | 0–6 | 7 | 168 |
| Double-nine | 55 | 0–9 | 10 | 495 |
| Double-twelve | 91 | 0–12 | 13 | 1,092 |
| Double-fifteen | 136 | 0–15 | 16 | 2,040 |

The tile count comes from choosing two numbers with repetition allowed: for a double-n set, (n + 1)(n + 2) ÷ 2. For double-six that is 7 × 8 ÷ 2 = 28.

Each group of tiles sharing a number is called a **suit**. In a double-six set the 5-suit is 5-0, 5-1, 5-2, 5-3, 5-4, 5-5 and 5-6: seven tiles, but eight 5-ends, because the double carries two. Pip totals follow from that: each number appears on 8 ends, so the double-six set holds 8 × (0 + 1 + … + 6) = 8 × 21 = 168 pips.

Chinese dominoes, which developed centuries earlier and are tied to dice combinations, use a different 32-tile set; they are covered in the [pai gow tiles](/guides/pai-gow-tiles) guide. European dominoes appear in 18th-century Italy and France and spread from there. Most Western games, and this page, use the double-six set unless stated otherwise.`,
    },
    {
      id: "terms",
      title: "Setup and the words you will hear",
      body: `### Shuffling and drawing hands

Turn all tiles face down and mix them (the **shuffle** or **wash**). Each player draws a hand and stands the tiles on edge so only they can see the faces. The tiles left over form the **boneyard** (also called the stock or sleeping tiles).

### Who plays first

Common methods, in order of popularity:

1. The player holding the highest double sets it (plays it first). If nobody holds a double, the heaviest tile starts.
2. Each player draws one tile before the deal; the heaviest tile decides who sets.
3. After the first hand, the winner of the previous hand sets, or the lead rotates.

### Vocabulary

- **Bone:** a tile.
- **Line of play (layout):** the chain of tiles on the table.
- **Open end:** an end of the line that can be matched.
- **Heavy / light:** a tile with many or few pips.
- **Spinner:** in some games, the first double, which can be played on all four sides.
- **Domino!:** called by a player who plays their last tile.
- **Blocked:** nobody can play, which ends the hand.

Doubles are traditionally laid crosswise, across the line. It does not change the matching rule: the next tile must still match the double's number. Everything else is an agreed house rule, so settle scoring targets and first-play method before you start.`,
    },
    {
      id: "block",
      title: "Block dominoes rules",
      body: `The block game is the simplest domino game and the base for many others.

### Deal

With a double-six set, two players take 7 tiles each and 14 stay in the boneyard, unused. Three players usually take 7 each as well (7 left over), and four players take 7 each, using all 28 tiles, often as two partnerships sitting opposite each other.

### Play

1. The first player sets a tile.
2. Play goes clockwise. On your turn, place one tile so that one of its ends matches an open end of the line. A 4-2 can go next to any open 4 or open 2.
3. The line has two open ends (unless a spinner is used).
4. If you cannot play, you **pass**. There is no drawing in the block game.

### End of hand

The hand ends when a player dominoes (plays their last tile) or when the game is blocked because nobody can play.

### Scoring

- **Domino:** the winner scores the total pips remaining in all opponents' hands. Some groups instead score the difference between their own remaining pips and the opponents'.
- **Blocked:** everyone counts their remaining pips. The lowest total wins the hand and scores the opponents' pips (or the difference, under that house rule).

Games are commonly played to 100 or 150 points; agree the target first.

### Worked example

You domino. Your opponent still holds 6-4, 3-2 and 5-0, which is 10 + 5 + 5 = 20 pips. You score 20. If the game had blocked with you holding 1-0 (1 pip) against their 20, you would still win the hand on the lower count.`,
    },
    {
      id: "draw",
      title: "Draw dominoes rules",
      body: `The draw game changes one rule: if you cannot play, you take tiles from the boneyard until you draw one that fits, then play it. That keeps hands moving and reduces blocked games.

### Deal

- Two players: 7 tiles each (14 in the boneyard).
- Three or four players: 5 tiles each.

These numbers vary slightly between rule books. Many groups also agree that the last two tiles of the boneyard cannot be drawn, so there is always some hidden information.

### Play

Play exactly as in the block game, but when you cannot match an open end:

1. Draw one tile from the boneyard.
2. If it fits, you may play it (most rules say you must play it).
3. If not, keep drawing until a tile fits or the boneyard is exhausted (down to its protected last tiles, if you use that rule).
4. If the boneyard is empty and you still cannot play, pass.

Scoring works as in block dominoes: the player who dominoes scores opponents' remaining pips, and a blocked hand goes to the lowest count.

### Why drawing changes strategy

In the block game, holding many tiles of one suit is powerful, because opponents who lack that suit are forced to pass. In the draw game, a missing suit only costs time and extra tiles. Extra tiles mean extra pips if someone else goes out, so heavy tiles are a liability: dump doubles and high tiles early when you can do so safely.`,
    },
    {
      id: "fives",
      title: "Scoring during play: All Fives and Fives and Threes",
      body: `Point games score while tiles are being played, not only at the end of a hand.

### All Fives (Muggins)

Played as a draw game, usually with a spinner: the first double can be played on all four sides. After each play, add up the pips on all open ends. If the total is a multiple of 5, the player who just played scores that total. A double at an open end counts both halves.

Worked sequence:

- Line ends show 6 and 4. Total 10, so the player scores 10.
- The next player adds 4-1 to the 4 end. Ends are now 6 and 1: total 7, no score.
- The next player adds a 1-4, bringing ends to 6 and 4: total 10 again, 10 points.
- In a different position, a double-3 played crosswise on an open 3 counts as 6, so with a 4 at the other end the total is 3 + 3 + 4 = 10, which scores 10.

At the end of each hand, the player who dominoes scores the opponents' remaining pips rounded to the nearest 5. Games often run to 150 or 250. In the traditional version, if a player misses a score they were entitled to, an opponent may call "muggins" and take the points.

### Fives and Threes

A long-standing British pub game. Score when the open ends total a multiple of 5 or of 3: one point per 5 and one per 3 that divides the total. A total of 15 scores 8 (three 5s plus five 3s). A total of 6 scores 2, and 10 scores 2. Games are often played to 61 on a cribbage board.`,
    },
    {
      id: "variants",
      title: "Popular domino variants",
      body: `Dominoes is less a single game than a family. Once you know matching and scoring, the variants mostly change the layout and the set.

| Game | Set | Key rule | Guide |
| --- | --- | --- | --- |
| Mexican Train | Double-twelve | Personal trains plus a shared public train | [Mexican Train rules](/guides/mexican-train-rules) |
| Chicken Foot | Double-nine or larger | Doubles must be covered by three tiles, forming a "foot" | [Chicken foot dominoes](/guides/chicken-foot-dominoes) |
| Texas 42 | Double-six | Four-player trick-taking with bids and trumps | [Texas 42 dominoes](/guides/texas-42-dominoes) |
| All Fives / Muggins | Double-six | Score multiples of 5 during play | This page |
| Fives and Threes | Double-six | Score multiples of 5 and 3 | This page |
| Pai gow | Chinese 32-tile set | Banking game of tile pairs | [Pai gow tiles](/guides/pai-gow-tiles) |

Larger sets suit bigger groups. Double-six works for two to four players; double-nine suits up to about six or eight; double-twelve handles eight or more comfortably, which is why Mexican Train uses it.

Dominoes shares a tile-table culture with mahjong, but play is quite different: mahjong builds sets and pairs from a four-copy set, while dominoes matches ends from a set with one copy of each tile. The [mahjong tiles](/guides/mahjong-tiles) guide covers that system. Point systems for block, draw, and All Fives are on [dominoes scoring](/guides/dominoes-scoring). This page stays with how the tiles are played.`,
    },
    {
      id: "odds",
      title: "Counting suits, luck and a fair shuffle",
      body: `Dominoes mixes luck and skill. The deal is random, but good players track which suits are exhausted. In a double-six set each number has 8 ends. If you hold two 5s and four more 5-ends are on the table, only two remain unseen, and when an opponent passes on an open 5 you know they hold none of them.

### A quick probability

In a two-player block game, your opponent holds 7 of the 21 tiles you cannot see. The chance they hold a particular tile, such as the double-6, is 7/21 = 1/3. The chance they hold neither of two specific tiles is (14/21) × (13/20) ≈ 43%. Estimates like these tell you whether playing to a suit is likely to force a pass.

Luck still dominates short sessions: a hand full of doubles is hard to play well. Over many hands, counting and blocking decide results. The [variance in gambling](/guides/variance-in-gambling) guide explains why a handful of hands proves little either way.

If you play for stakes, keep it among adults 18+ (or the local legal age), agree the points value first, and set a limit. PVPspinArena's player-vs-player games take the table shuffle out of human hands: a [Coinflip](/coinflip) is a fair 50/50, and every result comes from committed seeds you can verify after the round on [fairness](/fairness). More tile, dice and board games sit in the [Games of chance topic](/guides/topics/games-of-chance), and support tools are on [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How many dominoes do you get in a two-player game?",
      a: "With a double-six set, each player usually takes 7 tiles and 14 stay in the boneyard. In the draw game with three or four players, hands are usually 5 tiles each.",
    },
    {
      q: "What is the difference between block and draw dominoes?",
      a: "In block dominoes you pass when you cannot play. In draw dominoes you take tiles from the boneyard until you find one that fits.",
    },
    {
      q: "How do you score in dominoes?",
      a: "In basic games, the player who plays their last tile scores the pips left in opponents' hands. In point games such as All Fives, you also score when the open ends add up to a multiple of 5.",
    },
    {
      q: "Who goes first in dominoes?",
      a: "Most commonly, the player with the highest double sets it. If nobody has a double, the heaviest tile starts. Later hands often go to the previous winner.",
    },
    {
      q: "What happens when dominoes is blocked?",
      a: "If nobody can play, the hand ends. Players count their remaining pips, and the lowest total wins the hand and scores the opponents' pips or the difference.",
    },
    {
      q: "How many tiles are in a double-twelve domino set?",
      a: "91 tiles. The formula for a double-n set is (n + 1)(n + 2) ÷ 2, so double-twelve gives 13 × 14 ÷ 2 = 91.",
    },
  ],
  sources: [
    { label: "Wikipedia: Dominoes", url: "https://en.wikipedia.org/wiki/Dominoes" },
    {
      label: "Encyclopaedia Britannica: dominoes",
      url: "https://www.britannica.com/topic/dominoes",
    },
  ],
  related: [
    "mexican-train-rules",
    "chicken-foot-dominoes",
    "texas-42-dominoes",
    "mahjong-tiles",
    "pai-gow-tiles",
  ],
  updated: "2026-09-27",
};
