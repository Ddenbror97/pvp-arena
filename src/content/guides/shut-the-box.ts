import type { Guide } from "./types";

export const guide: Guide = {
  slug: "shut-the-box",
  cluster: "Games of chance",
  keyword: "shut the box",
  secondary: ["shut the box rules", "shut the box strategy", "shut the box odds", "canoga dice"],
  title: "Shut the Box: Rules, Odds and Best Strategy",
  description:
    "Shut the box rules for tiles 1 to 9: how to close numbers, when one die is allowed, published shut rates near 4%, and the move that stays closest to optimal.",
  h1: "Shut the box: rules, the real shut odds and a usable strategy",
  answer:
    "Shut the box is a dice-and-tiles game. Tiles 1 through 9 start open. You roll two dice, then close one or more open tiles that add to the total. You keep rolling until you cannot match. The leftover tiles sum to your score; lowest wins, and a full close is a shut. With good play a 1–9 shut is only about 4% of turns.",
  facts: [
    "Tiles 1–9 sum to 45; a shut scores 0. Leftover pips are your score if you stall.",
    "A roll of 8 can close 8, or 7+1, 6+2, 5+3, 5+2+1, 4+3+1, 4+2+2 is illegal (only one 2), or 4+3+1.",
    "Many house rules switch to one die once every remaining tile is 6 or less.",
    "Published optimal-play studies put a full 1–9 shut near 4%, not the 10% bar-room guess.",
    "Prefer closing the single highest legal tile; that heuristic stays close to solved play.",
  ],
  sections: [
    {
      id: "rules",
      title: "Shut the box rules, turn by turn",
      body: `Shut the box (also called canoga, trick-track or batten down the hatches) uses a wooden or plastic tray with hinged tiles numbered 1 to 9, plus two standard dice. You can play solo against a score, or take turns and compare leftovers. Variations add a 10 or run 1–12; this page is the common 1–9 box. Wikipedia's [shut the box](https://en.wikipedia.org/wiki/Shut_the_box) article is the rules spine; the odds below come from counting, not folklore.

### Your turn

1. All tiles start open.
2. Roll both dice and add the faces.
3. Close any combination of **still-open** tiles that sums to that total. Each tile can be used once in the whole turn.
4. Roll again and repeat.
5. If no legal combination exists, stop. Your score is the sum of tiles still open.
6. If you close 1 through 9, you have shut the box. Score 0. In a two-player match that usually wins the stake at once.

Example: first roll is 3+5 = 8. Legal sets include {8}, {7,1}, {6,2}, {5,3}, {5,2,1}, {4,3,1}. You pick one set and flip those tiles down. You cannot close {4,4} because there is only one 4.

### The one-die rule

House rules split here. The version Durango Bill analysed, and the version many pubs use, lets you roll **one die** once every remaining tile is 6 or less (equivalently, once the closed tiles already sum to 39 or more on a 1–9 box). Some groups allow the single die as soon as the 7, 8 and 9 are gone, even if a 1–6 tile is still up. Some groups never allow one die. Write the rule before anyone rolls; it changes both the shut rate and the right endgame.

### Scoring a match

Each player takes one turn (or each takes two, if you want less variance). Lowest leftover sum wins. Ties split or replay. For money among adults, agree the unit per point of margin or a flat pot to the shut; gambling is 18+ or the local legal age.

### Worked turn (tiles 1–9, two dice always)

Start open: 1 2 3 4 5 6 7 8 9.

1. Roll 6+3 = 9. Close {9}. Open: 1–8.
2. Roll 4+4 = 8. Close {8}. Open: 1–7.
3. Roll 5+2 = 7. Close {7}. Open: 1–6.
4. Roll 6+1 = 7. Nothing adds to 7 (7 is gone; 6+1 is available). Stop. Score 1+2+3+4+5+6 = 21.

That is a typical "looked good, died on 7" turn. If step 4 had been 3+3 = 6, you would close {6} and still have 1–5, which is where the one-die rule, if you use it, starts to matter.

The game lives in the [Games of chance topic](/guides/topics/games-of-chance) with [Yahtzee](/guides/yahtzee-rules) and [Farkle](/guides/farkle-rules). Those two ask you when to stop rolling. Shut the box asks which tiles to spend on a forced total.`,
    },
    {
      id: "odds",
      title: "Two-dice totals and why the box gets tight",
      body: `Two distinguishable dice make 36 outcomes. The totals are not equal.

| Total | Ways | Chance | Tiles you might still want |
| --- | --- | --- | --- |
| 2 | 1 | 2.78% | 2 or 1+1 (impossible) |
| 3 | 2 | 5.56% | 3, 2+1 |
| 4 | 3 | 8.33% | 4, 3+1, 2+1+1 |
| 5 | 4 | 11.11% | 5, 4+1, 3+2 |
| 6 | 5 | 13.89% | 6 and many splits |
| 7 | 6 | 16.67% | 7 and many splits |
| 8 | 5 | 13.89% | 8, 7+1, 6+2… |
| 9 | 4 | 11.11% | 9, 8+1, 6+3… |
| 10 | 3 | 8.33% | 9+1, 8+2, 7+3, 6+4… |
| 11 | 2 | 5.56% | 9+2, 8+3, 7+4, 6+5… |
| 12 | 1 | 2.78% | 9+3, 8+4, 7+5, 9+2+1… |

Early in the turn you almost always have a legal set. The trap is combinatorial: each close **removes** ways to make later totals. Close 9, 8 and 7 first and you can still make 12 as 6+5+1. Close 1, 2 and 3 first and a later 12 may have no path at all.

A full shut on 1–9 is rare even with perfect choices. Independent analyses that solve the game by dynamic programming put the shut rate near **4%** under good play. A 2025 talk by Wilson (Maryland) reports about 4.12% when you maximise shut probability and about 3.95% when you minimise expected leftover score, with random play down near 0.7%. Durango Bill's pages, which include the one-die endgame, show a similar few-percent shut rate (about 4.7% in one 9-tile table). Treat "1 in 25" as the right order of magnitude. Treat "I shut it all the time" as memory keeping the hits.

Expected leftover score under strong play sits in the mid-to-high teens in those same studies, against a maximum of 45. Most turns die with a handful of awkward tiles, not with a dramatic near-miss on 9.`,
    },
    {
      id: "strategy",
      title: "Best strategy: spend the awkward tiles first",
      body: `The box is a small puzzle, so it has a real best move for each (open set, roll) pair. You do not need the full table at a pub. One rule captures most of the value.

### The high-tile rule

When two legal sets exist, pick the set that **closes the single highest tile**, or, if that is a tie, the set that leaves the most flexible small tiles. On an 8, prefer {8} over {7,1}, and prefer {7,1} over {5,2,1}. High tiles (7, 8, 9) can only be made a few ways. Small tiles can rebuild many totals.

That "prefer high or dump" heuristic (sometimes called PHOD in write-ups) lands close to the solved shut rate in Wilson's comparison: a few tenths of a percent behind true optimal, far above random.

### Worked choice: first roll 12

Legal sets on a fresh box include {9,3}, {9,2,1}, {8,4}, {8,3,1}, {7,5}, {7,4,1}, {7,3,2}, {6,5,1}, {6,4,2}, {6,3,2,1}, {5,4,3}, {5,4,2,1}. The high-tile rule takes a set that includes 9: {9,3} or {9,2,1}. Prefer {9,3} so you keep both 1 and 2, which still make 3 later. Closing {8,4} keeps 9 and hopes you roll another 9-ish total before you stall.

### One-die endgame

If the rule allows one die when every open tile is ≤6, switch when the two-dice distribution starts wasting 7–12 that you can no longer spend. With only {4,6} open, one die hits 4 or 6 on 2/6 ≈ 33%; two dice make 4 or 6 on 3+5 = 8/36 ≈ 22%, and they also make 10, which you can spend as 4+6. So two dice are better on {4,6} if 10 is still legal. With only {5} open, one die is 1/6; two dice make 5 on 4/36 and cannot use a 5+something. One die is then mandatory if the house allows it.

### What strategy cannot do

It cannot lift a 4% shut to 20%. It cannot cancel a bad first 2. It cannot turn a money game plus-EV if the payout for a shut is a flat 10-to-1 on a 4% event. Price the pot the same way you would price any other long shot in [expected value](/guides/expected-value-gambling).

### Two first-roll mistakes that cost later

- **Closing 1+2+3+4 on a 10** because it "clears junk." You just spent the only 1, 2, 3 and 4. A later 7 may have no split if 7 is already gone. Prefer {9,1} or {8,2} or {6,4} so a high tile dies and a small tile remains.
- **Closing 5+3 on an 8 when 8 is open.** You kept the hard 8 for later and spent two useful mid tiles. Take {8} unless you have a solved table that says otherwise.

Those two habits are how random play falls to a sub-1% shut rate. The dice were the same; the leftover set was worse.`,
    },
    {
      id: "variants",
      title: "12-tile boxes, pubs and money",
      body: `**1–10 or 1–12 boxes** add more ways to spend high totals and more ways to get stuck. Durango Bill's 12-tile analysis is a different game; do not reuse the 4% figure. A 12-tile shut is rarer.

**Single-tile-only rules** (you may close either the total or the two individual faces, but not a three-tile split) shrink the move list and lower the shut rate. Some British pub boards play this tighter version.

**Stop at 6.** A children's variant removes 7–9. The box shuts far more often; it is a teaching toy, not the adult game.

**High Rollers.** The 1970s–80s US game show *High Rollers* was built on the same close-the-numbers idea, with a pair of dice and a board of digits. It is useful only as a reminder that the puzzle is old and televised; the paytables on that show are not the pub game.

### Playing for a stake

Among adults, a common stake is a unit from each player into a pot that the lowest score takes, or a posted payout for a shut (the "jackpot" box). If the posted shut pays 25-to-1 and the true chance is about 1 in 25, the pot is roughly fair before anyone drinks. If it pays 10-to-1, you are buying a 4% ticket at 9.1% implied, a fat edge for the board. Count it. Do not "feel" it.

Gambling is 18+ or the local legal age. A wooden box does not change that.

### Worked leftover after two rolls

Tiles 1–9 open. First roll 11: close 9 and 2 (or 8 and 3, or 7 and 4, or 6 and 5, or 6+3+2, and so on). Optimal play spends the 9: close 9+2. Second roll 8: remaining 1,3,4,5,6,7,8. Closing 8 spends the high tile. Leftover 1,3,4,5,6,7. You now need totals you can still make; 12 is gone as a two-tile 9+3. Each later choice is smaller. That is the whole skill: keep the small tiles as glue. Random players close 1+2+8 on an 11 and then cannot make 9. The shut rate gap between those habits is a few points, not a doubled chance.`,
    },
    {
      id: "pvp",
      title: "Tile choices and a hashed PvP round",
      body: `Shut the box is one of the few party dice games where the next action is a real choice. The dice still dominate. Optimal play only lifts you from a terrible leftover expectation to a merely bad one.

The same honesty shows up on PVPspinArena. The site runs three player-vs-player games in USDC or ETH on Base. [Coinflip](/coinflip) is a 50/50. [Roulette](/roulette) uses 33 slots: 16 Purple and 16 Silver pay 2x, 1 Green pays 14x, and Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee you can write down before you click. [Jackpot](/) gives a win chance equal to your share of the pot. Results use committed seeds; check any settled round on [fairness](/fairness).

You cannot "choose tiles" on those games. You can choose a stop. If the box, or the next match, is already a chase, use [responsible gambling](/responsible-gambling). Play is 18+ only.

Sibling dice pages: [bunco](/guides/bunco-rules), [ship captain crew](/guides/ship-captain-crew), and the raw two-dice table in [dice roll probability](/guides/dice-roll-probability).

See also [pig](/guides/pig-dice-game).`,
    },
  ],
  faqs: [
    {
      q: "How do you play shut the box?",
      a: "Start with tiles 1–9 open. Roll two dice, close open tiles that add to the total, and repeat until you cannot. Score the sum of tiles still open. Closing every tile is a shut and scores 0.",
    },
    {
      q: "What are the odds of shutting the box?",
      a: "On the common 1–9 box, solved play shuts about 4% of turns. Random play is well under 1%. Twelve-tile boxes and 'no split' house rules are lower still.",
    },
    {
      q: "When can you use one die in shut the box?",
      a: "Only if the house allows it. A common rule is: once every remaining tile is 6 or less. Some groups allow it as soon as 7, 8 and 9 are gone. Some never do.",
    },
    {
      q: "What is the best shut the box strategy?",
      a: "When several closes are legal, spend the highest tile you can. Keep small tiles for later totals. That heuristic sits close to computer-optimal play and far above picking at random.",
    },
    {
      q: "Is shut the box a game of skill?",
      a: "There is a thin skill layer: the tile choice. Most of the result is the dice. Good play changes the shut rate by a few percentage points, not by a factor of two.",
    },
  ],
  sources: [
    { label: "Wikipedia: Shut the box", url: "https://en.wikipedia.org/wiki/Shut_the_box" },
    {
      label: "Durango Bill: Shut The Box analysis",
      url: "https://www.durangobill.com/ShutTheBox.html",
    },
    { label: "Encyclopaedia Britannica: dice", url: "https://www.britannica.com/topic/dice" },
  ],
  related: [
    "farkle-rules",
    "yahtzee-rules",
    "bunco-rules",
    "dice-roll-probability",
    "expected-value-gambling",
    "ship-captain-crew",
    "pig-dice-game",
  ],
  updated: "2026-09-27",
};
