import type { Guide } from "./types";

export const guide: Guide = {
  slug: "checkers-rules",
  cluster: "Games of chance",
  keyword: "checkers rules",
  secondary: [
    "how to play checkers",
    "english draughts rules",
    "checkers king rules",
    "forced capture checkers",
  ],
  title: "Checkers Rules: Setup, Forced Jumps, Kings and Draws",
  description:
    "Official checkers rules for the 8x8 game: setup, who moves first, forced captures, multi-jumps, kings, draws, tournament ballots and playing for stakes.",
  h1: "Checkers rules: setup, moves, forced captures, kings and draws",
  answer:
    "Standard checkers rules, also called English draughts, use an 8x8 board with 12 pieces per side on the dark squares. The darker side moves first. Pieces move one square diagonally forward and capture by jumping. Captures are compulsory, multiple jumps must be completed, and a piece reaching the far row becomes a king that can move backward. You win by capturing or blocking every enemy piece.",
  facts: [
    "Each side has 12 pieces on the 32 dark squares of the first three rows; the darker side moves first.",
    "Captures are mandatory, but when several captures exist you may choose which one to take.",
    "A multiple jump must be completed, and a man that reaches the king row ends its move there.",
    "Kings in English draughts move one square diagonally in any direction; they do not fly across the board.",
    "Checkers was solved in 2007: with perfect play from the start, the result is a draw.",
  ],
  sections: [
    {
      id: "which",
      title: "Which game counts as checkers",
      body: `In North America "checkers" means the game the rest of the English-speaking world calls **draughts**, formally English draughts. It is one member of a large family, and the rules differ enough that players should say which version they mean before a money game.

| Version | Board | Pieces each | Men capture backward? | Kings |
| --- | --- | --- | --- | --- |
| English draughts / American checkers | 8x8 | 12 | No | Move one square |
| International draughts | 10x10 | 20 | Yes | Fly any distance |
| Russian draughts | 8x8 | 12 | Yes | Fly any distance |
| Brazilian draughts | 8x8 | 12 | Yes | Fly any distance |
| Italian draughts | 8x8 | 12 | No | Move one square; men cannot capture kings |

This page covers English draughts, the version governed by national checkers federations in the English-speaking world and by international bodies for the 8x8 game. Unlike most pages in the [Games of chance topic](/guides/topics/games-of-chance), checkers has no dice, cards or hidden information. Every result comes from the players' decisions, which puts it at the pure-skill end of the spectrum described in [skill-based gambling](/guides/skill-based-gambling).`,
    },
    {
      id: "setup",
      title: "Board, setup and who moves first",
      body: `The board is 8x8 with alternating light and dark squares. Only the 32 dark squares are used. Place the board so each player has a dark square in their near-left corner (the single corner) and a light square in their near-right corner, next to the pair of dark squares called the double corner.

Each player puts 12 pieces on the dark squares of the three rows nearest them. The two middle rows start empty.

### Colours and first move

Pieces are traditionally called Black and White, though sets are often red and black. Under official rules the darker side moves first: Black in a black-and-white set, or whichever side is designated Black by the federation's rules in a red-and-black set. In casual play people often toss a coin to decide colours.

### Square numbering

Tournament records number the dark squares 1 to 32, starting from Black's side. Black begins on squares 1 to 12, White on 21 to 32. A move is written as "11-15", and a capture as "15x24". Knowing this notation makes published games and puzzles readable.

### Touch-move

In official play, if you touch one of your pieces that has a legal move, you must move it. Adjusting a piece on its square requires saying so first. Many casual games ignore this, which is why it is worth agreeing before a game for stakes.`,
    },
    {
      id: "moves",
      title: "Moving and forced captures",
      body: `An uncrowned piece is called a **man**. A man moves one square diagonally forward onto an empty dark square. It never moves backward.

### Capturing

A man captures by jumping diagonally forward over an adjacent enemy piece onto the empty square directly beyond it. The jumped piece is removed. In English draughts, men capture only forward.

### Captures are compulsory

If you have a capture available, you must take it. This single rule drives most checkers tactics. The old custom of **huffing**, where a player who missed a capture had the offending piece removed by the opponent, is no longer part of standard rules: today the capture is simply required, and an illegal non-capturing move must be corrected.

### Multiple jumps

If, after a jump, the same piece can jump again, it must continue. A sequence can change direction between jumps (for a man, still only forward). You must finish the whole chain; you cannot stop halfway.

### Choosing between captures

When more than one capture is available, you may choose any of them, even one that takes fewer pieces than another. Once you start a sequence, though, you must complete it. This differs from international draughts, where you must take the maximum number of pieces.

### Why forced captures matter

Because an opponent must take, you can force their piece onto a square of your choosing. The classic **shot** gives up one piece to set up a double or triple jump in return. Spotting these two-for-one and three-for-one combinations is the first real skill in checkers, and missing one usually decides a game between beginners.`,
    },
    {
      id: "kings",
      title: "Kings and the king row",
      body: `When a man reaches the far row (the **king row**, the opponent's back row), it is crowned. The opponent places a second piece of the same colour on top of it to mark it as a king.

### Crowning ends the move

If a man reaches the king row by a jump, its move ends there, even if the new king could immediately jump again backward. It must wait until the next turn. This rule often saves the defender a piece.

### How kings move

In English draughts, a king moves one square diagonally in any direction, forward or backward, and captures by jumping forward or backward. It does not fly across open diagonals as kings do in international or Russian draughts. A king can combine forward and backward jumps in a single multi-jump sequence.

### Defending the king row

Because a king is worth far more than a man, both sides guard their back rows. A common opening principle is to keep some back-row pieces at home for as long as practical; the squares near the double corner are especially useful defenders. Once kings appear, the game shifts from shots and exchanges to endgame technique.

### Endgame values

As a rough guide, many coaches treat a king as worth about one and a half to two men, depending on the position. Two kings against one king is a win with correct technique, but the lone king can draw by reaching and holding the double corner if the stronger side does not know the method.`,
    },
    {
      id: "results",
      title: "Winning, draws and tournament rules",
      body: `You win when your opponent has no legal move on their turn. That happens in two ways: all their pieces are captured, or every remaining piece is blocked. You also win if your opponent resigns.

### Draws

- **Agreement:** both players accept a draw.
- **No progress:** tournament rule sets let a player claim a draw when the opponent cannot show progress toward a win within a set number of moves, commonly 40 moves by each side.
- **Repetition:** many rule sets treat repeated positions as a draw.

### Three-move ballot

At top level, the natural opening moves lead to well-known draws. To keep games fresh, tournaments assign the first three moves (Black, White, Black) by drawing an opening from an approved deck of well over a hundred choices. Each pairing usually plays the ballot twice, switching colours.

### Checkers is solved

A research team led by Jonathan Schaeffer at the University of Alberta built the program Chinook. In 2007 they published a proof in the journal Science that checkers, played perfectly by both sides from the standard start, is a draw. The game has roughly 5 × 10^20 possible positions, and the computation ran on and off for about 18 years.

Before that, Marion Tinsley dominated human play; he held the world title in the 1950s and again from the mid-1970s into the early 1990s, and reportedly lost only a handful of serious games in his career.`,
    },
    {
      id: "stakes",
      title: "Playing checkers for stakes",
      body: `Checkers for money has a long history in parks, barbershops and clubs, often as fast games with a small stake per game. Because there is no chance element, the better player wins the large majority of games, and a draw is common between equals. Treat any money game as a skill contest, not luck, and only play for stakes if you are 18+ (or the local legal age) and it is lawful where you are. Many places treat pure skill contests differently from gambling; the [skill-based gambling](/guides/skill-based-gambling) guide covers that distinction.

### Agree these before the first move

1. Which version: English draughts, or a variant with flying kings and backward captures.
2. How colours and the first move are decided.
3. Touch-move: on or off.
4. What happens to a draw: stake returned, or replay.
5. A time limit per move or per game, if speed matters.

### Watch for hustles

A skilled player can let you win early games at a low stake, then raise it. A player who knows the forced-capture shots will set traps an intermediate player walks into repeatedly. If a stranger insists on raising the stake after losing a few easy games, that is a warning sign, not a lucky streak. The [head-to-head betting](/guides/head-to-head-betting) guide covers how one-on-one wagers can be structured fairly.`,
    },
    {
      id: "chance",
      title: "Skill, chance and the PvP comparison",
      body: `Checkers sits at one extreme: complete information and no randomness. [Backgammon](/guides/backgammon-rules) adds dice, so a weaker player can win any single game. [Dominoes](/guides/dominoes-rules) adds hidden tiles and the luck of the draw. Each step adds chance and shrinks the edge a stronger player holds per game.

PVPspinArena sits at the other extreme. Its three player-vs-player games are decided entirely by chance. A [Coinflip](/coinflip) is a fair 50/50 between two players, and the winner takes the pot minus any fee shown before entry. In Jackpot, your win chance equals your share of the pot. Roulette uses a 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Nobody can out-think these results, so the only decisions are how much to stake and when to stop.

What checkers and a hashed PvP round share is transparency. On a checkerboard you can see every piece. On PVPspinArena, results come from committed seeds, and you can verify any settled round yourself on [fairness](/fairness). If you play for money in either setting, set a limit first, and use the tools at [responsible gambling](/responsible-gambling) if the stakes stop being fun.

In the same cluster, see also [backgammon strategy](/guides/backgammon-strategy) and [tavla](/guides/tavla).`,
    },
  ],
  faqs: [
    {
      q: "Do you have to jump in checkers?",
      a: "Yes. Under standard rules, if a capture is available you must take it. If several captures are possible, you may choose which one, but you must complete the whole jump sequence.",
    },
    {
      q: "Who goes first in checkers?",
      a: "Under official rules the darker pieces (Black) move first. In casual games players often toss a coin for colours.",
    },
    {
      q: "Can a king move backward in checkers?",
      a: "Yes. A king moves one square diagonally in any direction and can capture forward or backward. Uncrowned men move and capture only forward.",
    },
    {
      q: "Can you keep jumping after becoming a king?",
      a: "No. If a man reaches the king row during a jump, its move ends there. The new king may jump on the following turn.",
    },
    {
      q: "Is checkers a solved game?",
      a: "Yes. In 2007 researchers at the University of Alberta, using the program Chinook, proved that perfect play by both sides leads to a draw.",
    },
    {
      q: "Is huffing still a rule in checkers?",
      a: "Not in standard rules. Captures are simply compulsory, and an illegal move must be corrected, although some casual players still use huffing as a house rule.",
    },
  ],
  sources: [
    { label: "Wikipedia: English draughts", url: "https://en.wikipedia.org/wiki/English_draughts" },
    {
      label: "Encyclopaedia Britannica: checkers",
      url: "https://www.britannica.com/topic/checkers",
    },
    {
      label: "Science (2007): Checkers Is Solved",
      url: "https://www.science.org/doi/10.1126/science.1144079",
    },
  ],
  related: [
    "backgammon-rules",
    "backgammon-strategy",
    "tavla",
    "dominoes-rules",
    "skill-based-gambling",
  ],
  updated: "2026-09-27",
};
