import type { Guide } from "./types";

export const guide: Guide = {
  slug: "backgammon-rules",
  cluster: "Games of chance",
  keyword: "backgammon rules",
  secondary: [
    "how to play backgammon",
    "backgammon setup",
    "bearing off backgammon",
    "backgammon doubling cube",
  ],
  title: "Backgammon Rules: Setup, Moves, Bearing Off and Cube",
  description:
    "Backgammon rules explained: the starting setup, how dice moves work, hitting and the bar, bearing off, gammons and the basics of the doubling cube.",
  h1: "Backgammon rules: setup, moves, hitting, bearing off and the cube",
  answer:
    "Backgammon rules in brief: each player has 15 checkers on a 24-point board and races them around into their home board, then bears them off. Two dice set the moves and doubles are played four times. A lone checker, called a blot, can be hit and sent to the bar. The first player to bear off all 15 wins, and gammons and the doubling cube multiply the stake.",
  facts: [
    "The board has 24 points in four quarters of six; each side starts with 15 checkers and a pip count of 167.",
    "Each die is a separate move; a double such as 4-4 is played as four moves of 4.",
    "You must use both dice when legally possible; if only one can be played, you must play the larger when you can.",
    "A checker on the bar must re-enter in the opponent's home board before any other checker moves.",
    "A gammon (loser has borne off nothing) scores double; a backgammon scores triple; the cube multiplies either.",
  ],
  sections: [
    {
      id: "board",
      title: "The board and the starting setup",
      body: `A backgammon board has 24 narrow triangles called points, grouped into four quarters of six. Each player has a **home board** (their last six points) and an **outer board**. The strip down the middle is the **bar**. You number the points from your own side: your home board is points 1 to 6, and the point farthest from home, where your rear checkers start, is your 24-point. Your opponent numbers the same board in reverse, so your 24-point is their 1-point.

Players move in opposite directions, like two cars in facing lanes. You move from your 24-point toward your 1-point and then off the board. The standard starting position is the same for both sides:

| Point (your numbering) | Checkers | Common name |
| --- | --- | --- |
| 24 | 2 | Back checkers (runners) |
| 13 | 5 | Midpoint |
| 8 | 3 | — |
| 6 | 5 | — |

That is 15 checkers. The **pip count**, the total number of steps needed to bear everything off, is 2×24 + 5×13 + 3×8 + 5×6 = 167 for each player at the start. Pip counts matter later, when a game turns into a pure race.

Equipment is two pairs of dice (one pair per player), a dice cup each, and a doubling cube marked 2, 4, 8, 16, 32 and 64. Backgammon sits in the [Games of chance topic](/guides/topics/games-of-chance) because the dice decide every turn, but it rewards skill heavily over many games; the [skill-based gambling](/guides/skill-based-gambling) guide explains why that mix matters legally and financially.`,
    },
    {
      id: "moving",
      title: "How moves work: dice, doubles and forced plays",
      body: `To start, each player rolls one die. The higher number moves first and plays **both** numbers just rolled as the opening move. Equal numbers are rerolled. After that, players alternate: roll two dice, then move.

### Each die is a separate move

A roll of 5-3 means one checker moves 5 and a checker (the same or another) moves 3. If one checker plays both numbers, the intermediate landing point must be open: moving a single checker 8 pips with 5-3 requires either the 5-away or the 3-away point to be available.

### Where a checker may land

- On an empty point.
- On a point holding your own checkers (there is no stacking limit).
- On a point holding exactly one opposing checker, which hits it.
- Never on a point holding two or more opposing checkers. That point is **made** or blocked.

### Doubles and forced plays

Doubles are played four times: 6-6 is four moves of 6. The chance of doubles on any roll is 6/36 = 1/6, and the average roll is worth 8.17 pips once doubles are counted (294 pips across 36 rolls ÷ 36). Those numbers explain why racing positions can be judged with arithmetic; the [dice roll probability](/guides/dice-roll-probability) guide builds the full 36-roll table.

Two rules settle most disputes. First, you must use both numbers if any legal sequence allows it, even if you would prefer not to. Second, if you can play either number but not both, you must play the larger one. If neither can be played, you lose the turn. With doubles, you play as many of the four moves as are legal.`,
    },
    {
      id: "hitting",
      title: "Blots, hitting and entering from the bar",
      body: `A single checker on a point is a **blot**. If your opponent lands on it, the blot is hit and placed on the bar. Two or more checkers make a point that cannot be hit.

### Entering from the bar

While you have a checker on the bar, you may not move any other checker. You must enter it into your opponent's home board, which is your points 19 to 24. A die showing 1 enters on your 24-point, a 2 on your 23-point, and so on up to a 6 on your 19-point. If the target point is made by the opponent, that number cannot be used to enter. If neither die works, your whole turn is lost. If two of your checkers are on the bar, both must enter before anything else moves.

### Entry odds

With k of the six entry points blocked, the chance that at least one die enters is 1 − (k/6)².

| Points blocked | Chance to enter | Chance to dance (miss) |
| --- | --- | --- |
| 1 | 35/36 ≈ 97.2% | 2.8% |
| 2 | 32/36 ≈ 88.9% | 11.1% |
| 3 | 27/36 = 75.0% | 25.0% |
| 4 | 20/36 ≈ 55.6% | 44.4% |
| 5 | 11/36 ≈ 30.6% | 69.4% |
| 6 (closed board) | 0% | 100% |

A **closed board** means all six home points are made. A player on the bar against a closed board cannot move at all until a point opens. This is why hitting is powerful: a hit costs the victim the pips already travelled and can freeze their whole army. The plans built on it, such as the blitz and the prime, are covered in the [backgammon strategy](/guides/backgammon-strategy) guide.`,
    },
    {
      id: "bearing-off",
      title: "Bearing off and how a game ends",
      body: `Once all 15 of your checkers are in your home board, you may start **bearing off**: removing checkers from the board.

### The bear-off rules

1. A die number removes a checker from the matching point: a 4 bears off from the 4-point.
2. You may instead use the number to move a checker inside the home board, for example 6-point to 2-point with a 4.
3. If the die is higher than your highest occupied point, you bear off from the highest point. With checkers only on the 3-point and 1-point, a 6 removes a checker from the 3-point.
4. If the die is higher than a point with checkers, but you still have a checker on a higher point, you must move that higher checker instead.
5. If one of your checkers is hit during the bear-off, it must re-enter and travel all the way home before you resume bearing off.

### Worked example

You have two checkers on your 5-point and one on your 2-point, and you roll 6-3. The 6 bears off one checker from the 5-point (nothing on the 6-point, so the highest point is used). The 3 cannot bear off from the 3-point because it is empty and a higher checker remains on the 5-point, so you must move 5-point to 2-point. You now have two checkers on the 2-point.

### Single game, gammon and backgammon

| Result | Condition | Value |
| --- | --- | --- |
| Single game | Loser has borne off at least one checker | 1 × cube |
| Gammon | Loser has borne off none | 2 × cube |
| Backgammon | Loser has borne off none and still has a checker on the bar or in the winner's home board | 3 × cube |`,
    },
    {
      id: "cube",
      title: "Doubling cube basics and scoring",
      body: `The doubling cube is what turns backgammon into a betting game. It starts in the middle with 64 showing, meaning the game is worth 1 point. Before rolling, either player may offer a double.

### Take or drop

- **Drop (pass):** the opponent concedes the game at its current value.
- **Take:** the game continues at double value, and the taker now owns the cube. Only the owner may offer the next double (a redouble), always before their own roll.

### The 25% take point

Ignoring gammons and cube ownership, a take is correct when your winning chance p satisfies 2 × (p − (1 − p)) ≥ −1. That simplifies to p ≥ 25%. Dropping costs exactly 1 point; taking costs 2 points only when you lose, so you need to win one game in four to break even. Owning the cube is worth something because you can redouble your opponent out later, which is why practical take points are a little lower, around the low twenties, while heavy gammon risk pushes them higher.

### Optional rules you should agree first

- **Jacoby rule** (money play): gammons and backgammons count only if the cube has been turned. It speeds up games.
- **Beaver:** a player who is doubled may immediately redouble while keeping cube ownership.
- **Automatic doubles:** a tied opening roll doubles the stake. Many players skip this.
- **Crawford rule** (match play): when a player first reaches one point short of winning the match, no doubling is allowed for that one game.

**Money play** scores each game for the agreed stake per point. **Match play** is first to a set number of points, such as 7 or 11. Agree which you are playing, and every optional rule, before the first roll.`,
    },
    {
      id: "etiquette",
      title: "Rule details and common disputes",
      body: `Most arguments at a board come from procedure rather than strategy. Standard tournament conventions resolve them.

- **Where the dice land:** roll with a cup, into the board section on your right. A die that lands outside that section, on a checker, or tilted (cocked) is rerolled with both dice.
- **When a move is final:** your turn ends when you pick up your dice. Until then you may change the move.
- **Illegal moves:** in casual play the opponent can point out and correct an illegal move. In many tournament rule sets the opponent may accept or demand correction before rolling, so it pays to watch.
- **Rolling early:** rolling before the opponent has finished (picked up their dice) is usually voided and rerolled.
- **Doubling timing:** a double must be offered before you roll. After the dice are thrown it is too late for that turn.

### Common beginner errors

1. Moving the wrong direction because both players' numbering looks alike. Your checkers always head toward your home board.
2. Forgetting the larger-number rule when only one die can be played.
3. Moving another checker while one sits on the bar.
4. Bearing off before all 15 checkers are home, including a straggler you forgot in the outer board.
5. Miscounting a double as two moves instead of four.

Regional games follow the same core. [Tavla](/guides/tavla), the Turkish form, uses the same board and setup but usually drops the cube and plays to a points target. Jumping on a checkerboard is a different game: [checkers](/guides/checkers-rules).`,
    },
    {
      id: "stakes",
      title: "Stakes, dice luck and the PvP connection",
      body: `Playing backgammon for money is legal in some places and restricted in others; check local law, and gambling is for adults 18+ or the local legal age. A per-point stake can escalate quickly: a gammon on a cube at 4 is 8 points. Agree a maximum cube value before playing if the stake matters to you.

Short sessions are dominated by dice. A clearly stronger player may lose a 5-point match often, because one lucky 6-6 at the right moment swings a game. Over hundreds of games the skill edge shows. The [variance in gambling](/guides/variance-in-gambling) guide explains why small samples mislead in both directions.

The opening roll is a clean example of fair chance: one die each, ties rerolled, so each player starts first exactly 50% of the time. That is the same structure as a [Coinflip](/coinflip) on PVPspinArena, where two players face a 50/50 and the winner takes the pot minus any fee shown before entry. The difference is that backgammon then adds hundreds of decisions, while a coin flip adds none. PVPspinArena results come from committed seeds you can check afterwards on [fairness](/fairness), which plays the role that a dice cup and a watching opponent play at a board. If stakes stop feeling like entertainment, use the tools on [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "How do you set up a backgammon board?",
      a: "From your side: two checkers on your 24-point, five on your 13-point, three on your 8-point and five on your 6-point. Your opponent mirrors this on their own numbering.",
    },
    {
      q: "What happens when you roll doubles in backgammon?",
      a: "You play the number four times. A roll of 3-3 gives four moves of 3, which can be split among checkers in any legal way.",
    },
    {
      q: "Do you have to use both dice in backgammon?",
      a: "Yes, if any legal sequence uses both. If only one number can be played, you must play the larger one when possible. If neither can be played, the turn is lost.",
    },
    {
      q: "What is a gammon in backgammon?",
      a: "A win where the loser has not borne off any checkers. It scores double the cube value. If the loser also has a checker on the bar or in the winner's home board, it is a backgammon worth triple.",
    },
    {
      q: "When should you accept a double in backgammon?",
      a: "Roughly when you win at least a quarter of the time, since taking risks two points to avoid a certain one-point loss. Cube ownership lowers that a little and gammon risk raises it.",
    },
  ],
  sources: [
    { label: "Wikipedia: Backgammon", url: "https://en.wikipedia.org/wiki/Backgammon" },
    {
      label: "Encyclopaedia Britannica: backgammon",
      url: "https://www.britannica.com/topic/backgammon",
    },
    { label: "Wikipedia: Doubling cube", url: "https://en.wikipedia.org/wiki/Doubling_cube" },
  ],
  related: [
    "backgammon-strategy",
    "tavla",
    "checkers-rules",
    "dice-roll-probability",
    "dominoes-rules",
  ],
  updated: "2026-09-27",
};
