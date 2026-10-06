import type { Guide } from "./types";

export const guide: Guide = {
  slug: "dominoes-scoring",
  cluster: "Games of chance",
  keyword: "dominoes scoring",
  secondary: ["all fives score", "domino pip count", "bergen points", "block dominoes score"],
  title: "Dominoes Scoring: Points, Variants and the Board",
  description:
    "Dominoes scoring depends on the variant: pips left, multiples of five, or a target. How to play the tiles stays on the rules page.",
  h1: "Dominoes scoring: pips, multiples of five, and the point target",
  answer:
    "Dominoes scoring depends on which game you already agreed to play. Block and draw games usually write down the pips left when the hand ends. All Fives writes points during the hand when the open ends add to a multiple of five. Bergen scores 2 or 3 for matching ends, and train games and Texas 42 keep their own sheets. How the tiles are dealt, matched, and drawn is on the dominoes rules page. This page is only the score.",
  facts: [
    "In a blocking game the score is the pip total of the losing hands after someone empties a hand or the board blocks.",
    "In the usual draw game the score adds the pips left in the losing hand, and many rules also count pips still in the stock.",
    "Wikipedia notes that most draw rules leave two tiles in the stock.",
    "All Fives, also called Fives or Muggins in many books, scores when the open ends total a multiple of five.",
    "Bergen scores 2 for a double header and 3 for a triple header, which is a match of the open ends, not a pip sum.",
    "Mexican Train, Chicken Foot, and Texas 42 each keep a score this page only points at.",
  ],
  sections: [
    {
      id: "which-sheet",
      title: "Pick the sheet before the first hand",
      body: `**Dominoes scoring** is a family of sheets, not one universal total. The tiles can look the same and still feed a different column. A block game waits until the hand ends and then adds pips. A scoring game such as All Fives can award points in the middle of the layout, whenever the open ends hit a multiple of five. Bergen awards 2 or 3 for a shape of the ends. A train game adds pips against you at the end of a round. Texas 42 bids on a hand worth 42 points and is a trick game, so its sheet is not a line of matched ends at all.

Write the variant name in dark ink at the top of the pad before anyone plays. If two players think they are on different sheets, the argument arrives at the last tile. The [dominoes rules](/guides/dominoes-rules) page is where the deal, the line of play, doubles, and the boneyard live. Come back here only to see which number gets written, and when.

### Name the sheet out loud

- Block or draw: pips left when the hand ends.
- All Fives: multiples of five on the open ends.
- Bergen: 2 or 3 for matching ends, plus a small award for ending the hand.
- Trains or 42: use that game’s own page, then one scoring sentence from this one.

The cluster of tile and dice games is the [Games of chance topic](/guides/topics/games-of-chance). PVPspinArena publishes these explainers. Who runs the site is on the [about](/about) page.`,
    },
    {
      id: "block-draw",
      title: "Block and draw: pips left with the loser",
      body: `In a blocking game, scoring happens when the hand is over. Someone has emptied a hand, or nobody can move and the board is blocked. The winner’s score is the pip count of the tiles still held by the losing side. Partnership versions do the same with the opponents’ hands. If the board blocks, many tables give the hand to the lighter hand, meaning the lower pip total, and that winner still records the pips on the heavier side. Some rules also add whatever remains in the stock. Agree on that line before you start, because it changes the number without changing the tiles.

A draw game, the one people often just call dominoes, lets a player draw from the stock when a tile will not fit. Wikipedia’s summary of the usual score is the pips in the losing player’s hand plus the pips still in the stock. Most of those rules leave two tiles in the stock that are never drawn. Those two still count in the total if your sheet says the stock counts. They do not count if your sheet says only the losing hand counts. The difference is the argument.

### What a pip is

- Each spot on a tile is one pip. A blank end is zero.
- A double shows its pips twice, once on each end, when you add the tile.
- The winner of the hand records the loser’s leftover pips, not a bonus invented at the table.

How a hand becomes blocked, and how drawing works, stays on the [dominoes rules](/guides/dominoes-rules) page. This paragraph only says which pips move to the score pad.`,
    },
    {
      id: "all-fives",
      title: "All Fives: multiples of five",
      body: `All Fives is the scoring game in which a play counts when the open ends of the layout add to a multiple of five. The event is the sum of the exposed ends, including a double’s shown pips when that double is an end your rules count. Five, ten, fifteen, and twenty are the sums people watch for.

Published versions do not all record the sum the same way. In the common United States form, the player scores the end total itself, so an end total of ten is ten points on the sheet. The British public-house game called 5s-and-3s is a relative, not a duplicate: Wikipedia describes it as one point for each time five or three divides the sum of the ends. A table that mixes those two methods will double-count or under-count the same layout. Pick one method and keep it for the whole match.

| Sheet | When you write | What you write |
| --- | --- | --- |
| Block | Hand over | Pips left on the losing side |
| Draw | Hand over | Losing hand, plus stock if you agreed |
| All Fives | Ends total a multiple of 5 | That end total, in the usual U.S. form |
| Bergen | Ends match | 2 or 3, not a pip sum |

The target for an All Fives match is a house number you should write before the first hand. This page does not crown a single official target, because printed books disagree. Ending the hand still matters: the player who goes out is commonly awarded the pips left against the others, often after the table’s own rounding rule. State that rounding rule with the target.`,
    },
    {
      id: "bergen",
      title: "Bergen, as a short score note",
      body: `Bergen is a different score wearing the same tiles. You do not add the pips on the open ends. You score when the play makes the open ends match. Pagat’s published statement of the game, which matches the short note in the Wikipedia dominoes article, is the one to keep on a single card.

A double header is both open ends showing the same number. That scores 2. The lead that starts on a double makes both ends that number, so the first tile of that kind scores 2 as well. A triple header scores 3: one end is a double and the other end matches it, so three ends of that suit are showing, because a double is played across the line. Going out, or winning a blocked round under Pagat’s main line, scores 2. Pagat records a game of 15 points for two players and 10 points for three or four, and it reduces a header that would carry someone past the target. Those target details are the score note. The deal, the two tiles that stay in the boneyard, and the several ways to settle a blocked hand are a rules conversation, not this sheet.

### The Bergen numbers to memorize

- Double header: 2 points.
- Triple header: 3 points.
- Domino, or the blocked-hand win in that write-up: 2 points.

If your card says something else, you are on a variant. Say so before the first double hits the table. Pip-count games and Bergen should never share a column.`,
    },
    {
      id: "trains",
      title: "Mexican Train and Chicken Foot, one sentence each",
      body: `Train games look like a hub with lines, and their score is still mostly leftover pips. They are not All Fives, and they are not Bergen. This page will not reteach the engine, the marker, or the foot. Each game already has a rules page. The scoring sentence is all that belongs here.

Mexican Train: at the end of a round each player scores the pips left in hand, and the lowest total after the rounds wins. Setup, the engine, markers, and doubles are on the [Mexican Train rules](/guides/mexican-train-rules) page.

Chicken Foot: leftover pips count against you, and any extra penalty a table charges for holding the double blank is written on the [Chicken Foot](/guides/chicken-foot-dominoes) page rather than restated here. The center double and the three-tile foot are on that page too. Keep a running total for each player on that game’s own pad, and start the next round from the engine that game’s rules name, which this page does not restate.

### Keep their sheets separate

- Do not award a multiple-of-five bonus on a train unless the table wrote that house rule down.
- Do not import Bergen’s 2 and 3 into a train round.
- Lowest total wins in these two games, which is the reverse feeling of a block game where the winner banks the loser’s pips.

If the group wants a line game with an end-of-hand pip total and no hub, that is ordinary block or draw scoring above, and the play itself is on the [dominoes rules](/guides/dominoes-rules) page.`,
    },
    {
      id: "texas-42",
      title: "Texas 42 bidding points, as a pointer",
      body: `Texas 42 does not score a line of open ends. It is a four-player trick game, and the points live inside the bid. The hand is built so that the tricks and the count tiles add to 42. Players bid how many of those points their side will take. That bid, the count tiles, the marks, and the contracts that take every trick are the subject of the [Texas 42](/guides/texas-42-dominoes) page. This guide only marks the door: if someone says the score is a bid, you have left block, draw, All Fives, Bergen, and the train games.

Do not convert a 42 bid into leftover pips, and do not ask whether the open ends sum to five. There is no open-end sum in the trick. A player who wants the pip-count feeling can sit a block game instead. A player who wants the bid should open the 42 page and use its sheet. Mixing the two on one pad makes both numbers meaningless.

### A one-line test

- If the talk is “pips left,” stay in the block or draw section.
- If the talk is “multiple of five,” stay in All Fives.
- If the talk is “I bid,” open the Texas 42 page and stop using this sheet.

Write the bid on the 42 sheet only, next to the side that made it, and leave this pad for pip games and for All Fives before anyone plays a trick. The pointer is the whole section on purpose. Bidding strategy and trump choice are not scoring footnotes.`,
    },
    {
      id: "record-the-hand",
      title: "How to record the hand you actually played",
      body: `Recording is a short ritual once the variant is chosen. Do it the same way every hand so the target means something. The steps below assume the tiles have already been played under a rules page you agreed to. They do not teach the match, the draw, or the bid.

1. Name the variant at the top of the sheet: block, draw, All Fives, Bergen, Mexican Train, Chicken Foot, or 42.
2. When the scoring event happens, pause and announce the number before anyone gathers the tiles.
3. Add only the pips or points that this variant counts, using the table above.
4. Write that number next to the player or the side that the variant awards it to.
5. For a low-score train game, add the pips against the people who still hold tiles.
6. Stop the match when the written target is reached, or when the train rounds are finished, or when the 42 marks are finished on that game’s own page.

### After you write it

- Read the number back aloud so the table hears the same total.
- Keep All Fives mid-hand marks in a different column from the end-of-hand pip award.
- If money is on the game, keep it 18 and older, and keep the points as points.

A disputed tile goes back to the [dominoes rules](/guides/dominoes-rules) page for how play works, then returns here for which number the sheet accepts. The [about](/about) page is the publisher note if you need to know who wrote this explainer.`,
    },
  ],
  faqs: [
    {
      q: "How does dominoes scoring work in a block game?",
      a: "When the hand ends, the winner records the pips left in the losing hands. If the board blocks, many tables give the hand to the lower pip count and still score the heavier side. Agree whether the stock counts.",
    },
    {
      q: "What is an All Fives score?",
      a: "You score when the open ends add to a multiple of five. In the usual United States form you record that end total. The British 5s-and-3s game scores divisor points instead, and also scores threes.",
    },
    {
      q: "How does Bergen scoring differ?",
      a: "Bergen scores 2 for a double header and 3 for a triple header. Pagat also scores 2 for going out. It is not a sum of every pip on the table.",
    },
    {
      q: "Do Mexican Train and Chicken Foot use All Fives?",
      a: "No. Each round scores pips left in hand, and the lowest total wins. Any double-blank penalty in Chicken Foot is on that game’s page. Texas 42 scores a bid, not open ends.",
    },
    {
      q: "Where are the rules for how to play?",
      a: "Dealing, matching ends, doubles, and the boneyard are on the dominoes rules page. This page starts after those actions and only says what to write on the pad.",
    },
  ],
  sources: [
    { label: "Wikipedia: Dominoes", url: "https://en.wikipedia.org/wiki/Dominoes" },
    { label: "Pagat: Bergen", url: "https://www.pagat.com/domino/bergen.html" },
    { label: "Pagat: domino game index", url: "https://www.pagat.com/domino/" },
  ],
  related: ["dominoes-rules", "mexican-train-rules", "chicken-foot-dominoes", "texas-42-dominoes"],
  updated: "2026-09-29",
  howTo: true,
};
