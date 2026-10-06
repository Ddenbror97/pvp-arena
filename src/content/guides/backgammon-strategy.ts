import type { Guide } from "./types";

export const guide: Guide = {
  slug: "backgammon-strategy",
  cluster: "Games of chance",
  keyword: "backgammon strategy",
  secondary: [
    "backgammon opening moves",
    "backgammon priming game",
    "backgammon blitz",
    "when to double in backgammon",
  ],
  title: "Backgammon Strategy: Openings, Primes, Blitz and Cube",
  description:
    "Backgammon strategy that holds up: the best opening moves, shot counting, priming and blitz plans, race pip counts and when to double, take or drop.",
  h1: "Backgammon strategy: opening moves, priming, blitz and cube decisions",
  answer:
    "Good backgammon strategy starts with choosing a game plan that fits the position: race when you lead the pip count, build a prime to trap checkers, blitz when your opponent is on the bar and weak at home, and hold an anchor when behind. Play standard opening moves, count shots before leaving blots, and double when you are strong but your opponent can still take.",
  facts: [
    "The five main game plans are the running game, the holding game, the priming game, the blitz and the back game.",
    "Rolls of 3-1, 4-2, 5-3 and 6-1 make a valuable point on the opening move and are almost always played that way.",
    "A blot 6 pips away is hit by 17 of 36 rolls (47%); one 12 pips away is hit by just 3 of 36.",
    "Six consecutive made points form a full prime that no checker behind it can pass.",
    "In long races, a common rule of thumb is to double with an 8% pip lead, redouble at 9%, and take up to 12% behind.",
  ],
  sections: [
    {
      id: "plans",
      title: "Pick a game plan before you pick a move",
      body: `Strong players decide what kind of game they are in, then choose moves that serve that plan. The [backgammon rules](/guides/backgammon-rules) guide covers the mechanics; this page assumes you know how hitting, the bar and bearing off work.

| Plan | When it fits | Main goal | Main risk |
| --- | --- | --- | --- |
| Running game | You lead the race after a few exchanges | Get home safely, avoid contact | Leaving a late shot |
| Holding game | You trail the race but own an anchor on their 5-point or bar point | Wait for a shot as they bring checkers home | Your board crumbles while you wait |
| Priming game | You have builders near a row of made points | Trap their back checkers behind a wall | Your own timing runs out first |
| Blitz | They are on the bar and your home board is strong | Close them out and win a gammon | Getting hit back with no board |
| Back game | You trail badly and hold two deep anchors | Hit a late shot and contain it | Being gammoned if timing fails |

The pip count drives the choice. Count both sides regularly: a lead of 10 or more pips in the middlegame usually argues for simplifying toward a race, while trailing by 20 argues for keeping contact. Timing, meaning how many spare pips you can play before being forced to break your key points, decides whether a holding or back game is viable.`,
    },
    {
      id: "openings",
      title: "Opening moves that experts agree on",
      body: `The opening roll is never a double, so there are 15 possible first moves. Computer analysis since the 1990s has settled most of them, and the differences between the top choices on the closer rolls are small.

| Roll | Standard play | Idea |
| --- | --- | --- |
| 3-1 | 8/5 6/5 | Makes the 5-point, the best point on the board |
| 4-2 | 8/4 6/4 | Makes the 4-point |
| 6-1 | 13/7 8/7 | Makes the bar point, starting a prime |
| 5-3 | 8/3 6/3 | Makes the 3-point |
| 6-5 | 24/13 | Runs one back checker to safety |
| 6-4 | 24/18 13/9, 8/2 6/2 or 24/14 | Close in value |
| 6-3 | 24/18 13/10 or 24/15 | Split and build, or run |
| 6-2 | 24/18 13/11 | Split and bring a builder |
| 5-4 | 24/20 13/8 or 13/8 13/9 | Split, or bring two down |
| 5-2 | 13/8 13/11 | Two builders from the midpoint |
| 5-1 | 13/8 24/23 | Safe 5, small split |
| 4-3 | 24/20 13/9 or 13/9 13/10 | Split or build |
| 4-1 | 24/23 13/9 | Split and bring a builder |
| 3-2 | 24/21 13/11 or 13/10 13/11 | Split or build |
| 2-1 | 13/11 24/23 or 13/11 6/5 | Split, or slot the 5-point |

Neural-network programs changed opening theory. TD-Gammon, developed by Gerald Tesauro at IBM in the early 1990s, learned by playing itself and preferred splitting the back checkers (24/23) on 2-1, 4-1 and 5-1 more than many human experts did at the time. Modern programs such as GNU Backgammon and eXtreme Gammon broadly agree.

Replies to the opening follow the same logic: make points when you can, hit loose blots in your home board or outer board when the return risk is acceptable, and split back checkers when the opponent has few builders aimed at your split.`,
    },
    {
      id: "shots",
      title: "Count shots before you leave a blot",
      body: `Every exposed checker should be a decision, not an accident. The chance of being hit depends on distance, assuming no points block the path.

| Distance | Hitting rolls | Chance |
| --- | --- | --- |
| 1 | 11 | 30.6% |
| 2 | 12 | 33.3% |
| 3 | 14 | 38.9% |
| 4 | 15 | 41.7% |
| 5 | 15 | 41.7% |
| 6 | 17 | 47.2% |
| 7 | 6 | 16.7% |
| 8 | 6 | 16.7% |
| 9 | 5 | 13.9% |
| 10 | 3 | 8.3% |
| 11 | 2 | 5.6% |
| 12 | 3 | 8.3% |

Two lessons stand out. Blots within 6 pips (direct shots) are two to three times more exposed than blots 7 or more away (indirect shots). And distance 6 is the worst, because every 6 plus combinations such as 5-1, 4-2, 3-3 and 2-2 all reach it. The [dice roll probability](/guides/dice-roll-probability) guide shows how the 36 ordered rolls produce these counts.

### Worked example

You must leave a blot either 6 or 9 pips from an enemy checker. At 6 you are hit 17/36 of the time, at 9 only 5/36. Unless the 6-away blot builds a much stronger position, prefer the 9. If two enemy checkers can reach you, count every roll that hits with either, without double counting.

### Duplication and diversification

If your opponent needs 4s to hit one blot and 4s to make a key point, leave the blot there: the same numbers do double duty, so fewer rolls hurt you. Keep your own builders diversified, so that many different numbers make the point you want.`,
    },
    {
      id: "prime",
      title: "The priming game and timing",
      body: `A **prime** is a row of consecutive made points. A full 6-prime cannot be passed: a checker behind it has no legal jump. Even a 5-prime is strong, since only one specific number escapes.

### Building a prime

1. Start with the points nearest your home board edge: 6, 5, 7 (bar) and 4. The 5-point and bar point are the most valuable early.
2. Bring builders to your outer board, spaced so that different rolls cover the gaps.
3. Slot (place a single checker on) a key point when the opponent has few return shots, then cover it next turn.

### Rolling the prime forward

Once you have trapped a checker, you can walk the wall toward your home board by slotting the point in front and clearing the rearmost point. The trapped checker stays behind it until you close it out or it is forced to break.

### Timing

A priming battle is often decided by who must break first. If both sides hold primes, the player with more spare pips to play elsewhere keeps their structure longer. Count how many rolls you can absorb before breaking a point. Having your back checkers stuck behind an enemy prime is not fatal if you have timing and they do not.`,
    },
    {
      id: "blitz",
      title: "The blitz and the back game",
      body: `A **blitz** is an all-out attack on checkers in your home board. You hit loose blots, sometimes hitting two checkers in one roll, and make home points quickly so that the checkers on the bar cannot enter.

### When to blitz

- Your opponent has one or more checkers on the bar or exposed in your home board.
- You have several builders within range of your home points.
- Their home board is weak, so a return hit costs you little.

The entry arithmetic makes the blitz work. With four of your home points made, a checker on the bar enters only 20/36 ≈ 56% of the time. With five made, 11/36 ≈ 31%. A closeout, all six points made with a checker on the bar, produces a high share of gammons, because the closed-out player cannot move until you open a point.

### The back game

The opposite plan is the back game: holding two anchors deep in the opponent's home board, typically points like your 1 and 3 or 2 and 3, and waiting for a late shot as they bear in. It needs timing, meaning your other checkers must not be forced into a crushed home board before the shot arrives. Back games lose many gammons when they fail, so they are a rescue plan for badly losing positions, not a first choice.

A **holding game** is milder: one anchor on the opponent's 5-point or bar point, which gives lasting shot chances while keeping gammon risk low.`,
    },
    {
      id: "cube",
      title: "Race counts and doubling cube decisions",
      body: `Most money swings come from the cube, not the checkers. Three questions drive every cube decision: am I strong enough to double, is my opponent still able to take, and am I too good to double because playing on for a gammon is worth more?

### The take point

Ignoring gammons, a take is correct with 25% or better winning chances: dropping loses 1 point, while taking loses 2 only when you lose. Solve 2 × (2p − 1) ≥ −1 and you get p ≥ 0.25. Because the taker owns the cube and may later redouble, practical take points without gammons are a little below 25%.

### Race rule of thumb

In long races, a widely taught rule (often credited to the backgammon writer Walter Trice) compares the lead to the leader's pip count:

- Double with a lead of about 8%.
- Redouble with about 9%.
- The trailer can take with the lead up to about 12%.

Worked example: you are on roll with 100 pips, your opponent has 110. Your lead is 10%. That is a strong double and a take. At 100 versus 114, the lead is 14%, so the opponent should drop. More refined methods such as the Keith count adjust for wasted pips and gaps.

### Too good to double

If you are winning a gammon often enough, cashing 1 point costs you equity. Play on and double later only if the gammon chance fades. The [expected value](/guides/expected-value-gambling) guide explains how to compare the two options as averages.`,
    },
    {
      id: "improve",
      title: "Improving, variance and where PvP chance fits",
      body: `The fastest way to improve is to play, then review your games with an analysis program. Programs flag the biggest errors and rank alternatives by equity. Focus on the large mistakes first: cube errors and blunders that leave direct shots, not tiny opening choices.

Expect variance. A better player can lose several sessions in a row because the dice cluster; a 5-point match may be decided by one double 6. Over thousands of games the edge shows, which is why the [variance in gambling](/guides/variance-in-gambling) guide matters to backgammon players too. If you play for stakes, you must be 18+ (or the local legal age), keep a fixed budget, and cap the cube value beforehand.

Games that are pure chance have no strategy to learn. On PVPspinArena, [Roulette](/roulette) runs a 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee that no betting plan changes, and results are verifiable on [fairness](/fairness). Backgammon differs because decisions move the odds; chance games differ because nothing does. More board, dice and tile games are collected in the [Games of chance topic](/guides/topics/games-of-chance), including [tavla](/guides/tavla), the Turkish form. If chasing a bad run starts to feel urgent, the tools on [responsible gambling](/responsible-gambling) are there for that moment.`,
    },
  ],
  faqs: [
    {
      q: "What is the best opening move in backgammon?",
      a: "With 3-1, play 8/5 6/5 to make your 5-point. It is widely rated the best opening roll. Other point-making rolls are 4-2, 6-1 and 5-3.",
    },
    {
      q: "Is backgammon more luck or skill?",
      a: "Both. Dice dominate single games, but skill decides results over many games, especially through cube handling. Stronger players win consistently over long samples.",
    },
    {
      q: "When should you double in a backgammon race?",
      a: "A common rule of thumb is to double with a lead of about 8% of your pip count, redouble at 9%, and expect a take up to about 12%.",
    },
    {
      q: "What is a prime in backgammon?",
      a: "A row of consecutive made points. Six in a row is a full prime that no checker behind it can pass, which traps the opponent's back checkers.",
    },
    {
      q: "What is a blitz in backgammon?",
      a: "An aggressive plan that hits blots in your home board and makes points quickly while the opponent is on the bar, aiming to close them out and win a gammon.",
    },
  ],
  sources: [
    { label: "Wikipedia: Backgammon", url: "https://en.wikipedia.org/wiki/Backgammon" },
    { label: "Wikipedia: TD-Gammon", url: "https://en.wikipedia.org/wiki/TD-Gammon" },
    { label: "GNU Backgammon", url: "https://www.gnu.org/software/gnubg/" },
    { label: "Wikipedia: Doubling cube", url: "https://en.wikipedia.org/wiki/Doubling_cube" },
  ],
  related: [
    "backgammon-rules",
    "tavla",
    "checkers-rules",
    "dice-roll-probability",
    "variance-in-gambling",
  ],
  updated: "2026-09-27",
};
