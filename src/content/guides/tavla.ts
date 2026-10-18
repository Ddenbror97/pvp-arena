import type { Guide } from "./types";

export const guide: Guide = {
  slug: "tavla",
  cluster: "Games of chance",
  keyword: "tavla",
  secondary: ["turkish backgammon", "tavla rules", "how to play tavla", "tavla mars"],
  title: "Tavla: Turkish Backgammon Rules and Key Differences",
  description:
    "Tavla, the Turkish form of backgammon: setup, the opening throw, mars scoring, no doubling cube, dice names, variants like mahbusa and match strategy.",
  h1: "Tavla: how Turkish backgammon is played and how it differs",
  answer:
    "Tavla is the Turkish name for backgammon and its family of games. The board, the 15 checkers, the starting setup and the movement rules match international backgammon. The main differences are in scoring and style: tavla is usually played without a doubling cube, a gammon (mars) counts two points, the triple backgammon is generally not used, and games run to a short points target, played fast.",
  facts: [
    "Tavla uses the same 24-point board, 15 checkers per side and starting position as standard backgammon.",
    "A mars, where the loser has borne off no checkers, scores 2 points; most Turkish games do not use a triple.",
    "The doubling cube is usually absent, so each game is worth either 1 or 2 points.",
    "Dice are traditionally called with Persian-derived numbers, and 6-5 (şeş beş) gives the game a regional nickname.",
    "Mahbusa is a Turkish pinning variant where landing on a lone checker traps it instead of hitting it.",
  ],
  sections: [
    {
      id: "what",
      title: "What tavla is and where the name comes from",
      body: `In Turkey, tavla is the everyday word for backgammon, and the same board is used for a small family of related games. The word shares its roots with the Greek **tavli** and ultimately the Latin **tabula**, the Roman ancestor of the "tables" games that spread across the Mediterranean and Middle East. Across much of the region the game is also called **shesh besh**, after the dice combination 6-5.

Tavla is a social game. It is closely associated with the traditional Turkish coffeehouse (kahvehane), where regulars play quickly, slap checkers down with a loud click, and call the dice aloud. A game that might take ten minutes online at a careful pace can be over in two or three at a coffeehouse table. Speed is part of the culture: experienced players count pips and spot hits at a glance, and slow play draws comments.

If you already know international backgammon, you can sit down at a tavla board and play almost immediately. The [backgammon rules](/guides/backgammon-rules) guide covers the shared mechanics in full: movement, hitting, the bar, entering and bearing off. This page focuses on what changes, and on the vocabulary you will hear. Tavla belongs with the other board, dice and tile games in the [Games of chance topic](/guides/topics/games-of-chance).`,
    },
    {
      id: "setup",
      title: "Board, setup and movement: what stays the same",
      body: `The board has 24 points in four quarters, with the bar down the middle. Each player has 15 checkers (pul) set out in the standard way, counted from their own side:

| Point | Checkers |
| --- | --- |
| 24 (farthest from home) | 2 |
| 13 (midpoint) | 5 |
| 8 | 3 |
| 6 | 5 |

That gives each side a pip count of 167. Checkers move toward the home board, each die is a separate move, doubles are played four times, a single checker can be hit and sent to the bar, a point with two or more checkers is blocked, and a checker on the bar must enter before anything else moves. Bearing off follows the usual rules, including using a higher die from the highest occupied point.

### The opening throw

Each player throws one die to decide who starts, and the higher number goes first. In many Turkish games, the winner then rolls both dice again for the first move, rather than playing the two opening numbers as in international rules. Custom varies between clubs and families, so confirm it before you start. The difference is small in practice but matters for opening theory: under the reroll custom, the first move can be a double.

### Direction and orientation

Boards are sometimes set up with home boards on the left rather than the right, which flips the direction checkers travel. Nothing in the rules changes. Beginners who learned on one orientation often misread the other for a game or two.`,
    },
    {
      id: "scoring",
      title: "Scoring: mars, no cube and points targets",
      body: `Scoring is where tavla really differs from the international game.

| Feature | Tavla (typical) | International backgammon |
| --- | --- | --- |
| Single win | 1 point | 1 point × cube |
| Gammon | Mars, 2 points | 2 points × cube |
| Backgammon (triple) | Usually not used | 3 points × cube |
| Doubling cube | Usually absent | Standard |
| Match length | Short target, commonly 5 points | Any length, often 7 or more |
| Opening move | Often a fresh roll by the winner of the throw | Plays the opening numbers |

A **mars** happens when the winner bears off all 15 checkers before the loser has borne off any. It scores 2 points. Many players use the verb for it too: to be marsed is to be gammoned. Because there is usually no triple, a checker left stranded on the bar or in the winner's home board costs nothing extra beyond the mars.

Without a cube, every game is worth exactly 1 or 2 points, and you cannot resign a game by refusing a double. You play every game to the end, which is one reason coffeehouse games move so fast: there is no pause to think about doubling.

### The value of a mars

Suppose that in a given kind of position you win 60% of games, 20% of them as a mars, and lose 40%, 10% of them as a mars. Your average result per game is 0.40 × 1 + 0.20 × 2 − 0.30 × 1 − 0.10 × 2 = +0.30 points. Mars rates change the average a lot, so tavla players weigh gammon chances heavily even without a cube.`,
    },
    {
      id: "dice",
      title: "Dice calls and table vocabulary",
      body: `Tavla players traditionally call dice using numbers borrowed from Persian, and the calls are part of the atmosphere. Spellings and pronunciation vary by region, and many players mix in Turkish numbers such as beş for five.

| Die | Traditional call |
| --- | --- |
| 1 | yek |
| 2 | dü |
| 3 | se |
| 4 | cihar |
| 5 | penç |
| 6 | şeş |

A mixed roll is called high number first, so 6-5 is **şeş beş** and 6-1 is şeş yek. Doubles have their own names. The ones most often heard are **hep yek** for 1-1, **dubara** for 2-2 and **düşeş** for 6-6; the last has passed into everyday Turkish as a phrase for an unexpected stroke of luck.

### Other common terms

- **Pul:** a checker.
- **Kapı:** literally "door", a made point.
- **Mars:** a gammon, worth 2 points.

### How lucky is düşeş?

A specific double such as 6-6 comes up on 1 roll in 36, about 2.8%. Any double comes up 1 in 6. Over 30 throws a player expects about five doubles but fewer than one 6-6 (30 ÷ 36 ≈ 0.83), so a well-timed düşeş really is a small event. The [dice roll probability](/guides/dice-roll-probability) guide covers the full two-dice table.`,
    },
    {
      id: "variants",
      title: "Mahbusa and other variants on the tavla board",
      body: `The same board hosts other games, much as Greek tavli is really a set of three games (portes, plakoto and fevga) played in rotation.

### Mahbusa

In mahbusa, a checker that lands on a single opposing checker does not hit it. Instead, it pins it: the trapped checker cannot move until the pinning checker leaves. Mahbusa is closely related to Greek plakoto. Typical features:

- All 15 checkers usually start stacked on the player's 24-point, the far corner of the board, rather than in the standard setup.
- There is no bar, since nothing is ever sent back.
- Pinning an opponent's rearmost checker on its starting point is especially strong, because that checker still has the whole board to travel.

Exact starting positions and scoring conventions vary, so check the house rules.

### No-hitting race games

A third family, related to Greek fevga and the Persian game narde, uses no hitting at all: a single checker blocks a point. The game becomes a battle to build blocks in the path of the opponent's checkers. Names and details for these games differ between regions, and players do not always agree on them.

### Practical tip

When someone says "let's play tavla" in Turkey, they almost always mean the standard backgammon-style game with mars scoring. Ask before assuming anything else.`,
    },
    {
      id: "strategy",
      title: "Strategy changes when there is no cube",
      body: `Checker play in tavla is essentially backgammon checker play, so the [backgammon strategy](/guides/backgammon-strategy) guide applies: make your 5-point and bar point early, count shots before leaving blots, prime trapped checkers, and blitz when your opponent is on the bar. Three things shift.

### 1. Gammons are always live

Without a cube, a clearly winning player never cashes out. That makes playing for a mars correct more often, and it makes saving the mars a priority when you are losing. A player who is losing badly should often run their last checkers home quickly to bear one off, rather than hang back for a shot.

### 2. Match score matters more

Short targets magnify the score. In a race to 5, if you lead 4-3, a single win ends the match, but a mars for your opponent wins it for them (3 + 2 = 5). So at 4-3 you should play safely and avoid positions with gammon risk, even at some cost in winning chances. If you trail 3-4, you should do the opposite and seek gammonish positions.

### 3. Speed hides errors

Fast play leads to routine mistakes such as missed hits, wrong bear-off order and illegal moves. In friendly games these are usually corrected on the spot, but the habit of a quick pip count before each roll saves more games than any opening trick.`,
    },
    {
      id: "stakes",
      title: "Stakes, etiquette and a fair start",
      body: `At the coffeehouse, the traditional stake is usually modest: the loser pays for the tea or coffee. Playing for real money is legal in some places and restricted in others, so check local law, and only adults 18+ (or the local legal age) should play for money. With no cube, the most you can lose in a game is 2 points, which keeps stakes predictable. A 5-point match at a fixed amount per match is an easy way to agree a budget in advance. The [bet with friends online](/guides/bet-with-friends-online) guide covers ways to keep informal wagers clear.

Etiquette is simple: roll into the board, do not touch the opponent's checkers, correct illegal moves politely, and keep the pace up. Arguments tend to come from the opening custom and scoring, so settle those first.

The opening throw is the purest chance moment in the game: one die each, with ties rethrown, so each player starts first exactly half the time. That is the structure of a [Coinflip](/coinflip) on PVPspinArena, where two players face a 50/50 and the winner takes the pot minus any fee shown before entry. Tavla then adds skill on top; a coin flip does not. PVPspinArena rounds use committed seeds that anyone can verify afterwards on [fairness](/fairness), and limits and time-outs are available on [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "Is tavla the same as backgammon?",
      a: "Mostly. The board, setup and movement rules are the same. Tavla usually drops the doubling cube, scores a gammon (mars) as 2 points, generally ignores the triple backgammon and plays to a short points target.",
    },
    {
      q: "What is a mars in tavla?",
      a: "A win where the loser has not borne off a single checker. It is worth 2 points instead of 1, the same idea as a gammon in international backgammon.",
    },
    {
      q: "What does şeş beş mean?",
      a: "It is the traditional call for a 6-5 roll, from Persian-derived numbers. The phrase is also used across the region as a nickname for backgammon itself.",
    },
    {
      q: "Who goes first in tavla?",
      a: "Each player throws one die and the higher number starts. In many Turkish games the winner then rolls both dice again for the first move, but custom varies, so agree it first.",
    },
    {
      q: "How many points is a tavla game played to?",
      a: "It varies by table. Five points is a common target, with a single win scoring 1 and a mars scoring 2.",
    },
  ],
  sources: [
    { label: "Wikipedia: Backgammon", url: "https://en.wikipedia.org/wiki/Backgammon" },
    { label: "Wikipedia: Tavli", url: "https://en.wikipedia.org/wiki/Tavli" },
    { label: "Wikipedia: Plakoto", url: "https://en.wikipedia.org/wiki/Plakoto" },
  ],
  related: [
    "backgammon-rules",
    "backgammon-strategy",
    "checkers-rules",
    "dice-roll-probability",
    "mahjong-tiles",
  ],
  updated: "2026-09-27",
};
