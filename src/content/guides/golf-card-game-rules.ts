import type { Guide } from "./types";

export const guide: Guide = {
  slug: "golf-card-game-rules",
  cluster: "Games of chance",
  keyword: "golf card game",
  secondary: [
    "how to play golf cards",
    "six card golf",
    "nine card golf",
    "golf card game scoring",
    "golf card game knock",
  ],
  title: "Golf Card Game: Six-Card Rules and Scoring | PvP Spin Arena",
  description:
    "Golf card game rules for the six-card layout: card values, replacing a card, knocking, column pairs, and how nine-card golf differs.",
  h1: "Golf card game: six-card scoring, knocking and nine-card golf",
  answer:
    "The golf card game is a draw-and-discard game for two to six players using a 52-card deck. This page teaches six-card golf as the main game: deal 6 cards face down in two rows of three, draw or take the discard, and replace one card. You may knock to end the round, and each other player gets one more turn. Lowest score wins. Ace is 1, cards 2 through 10 score their face value, jack and queen are 10, and king is 0. A pair of the same rank in a column scoring zero is a common house rule, and it is not universal. Nine-card golf, a 3 by 3 grid, is the variant.",
  facts: [
    "Six-card golf is the game taught here: 2 to 6 players, 6 cards in two rows of three, lowest score wins.",
    "Ace scores 1, 2 through 10 score face value, jack and queen score 10, king scores 0.",
    "On your turn, draw from the stock or take the discard, then replace one layout card. A stock draw may be thrown away instead.",
    "Knocking ends the round after every other player takes one more turn. Some tables end when one grid is fully face up.",
    "A matching pair in the same column scoring zero is common in six-card golf and is not used at every table.",
    "Nine-card golf deals a 3 by 3 grid. A column of three equal ranks scores zero. Four of a kind as zero is a further house rule.",
  ],
  sections: [
    {
      id: "setup",
      title: "Six-card golf: the grid this page teaches",
      body: `Golf the card game borrows the sport's idea and nothing else. Low score wins. You play a series of deals, often nine, called holes. This page teaches **six-card golf** as the main game and treats nine-card golf as a variant with its own grid. Four-card golf, sometimes played with power cards under names like Cabo, is a third game. Do not mix the grids.

Two to six players use one [52-card deck](/guides/52-card-deck). Six players dealt 6 cards use 36 cards, so the stock still has 16, which is enough for a round. If you seat more than six, add a second deck. Jokers stay out of the main game. A version that adds jokers and scores them negative is a house rule, noted later.

Deal 6 cards to each player, face down, in two rows of three. That is three columns. Players do not show the cards. In the version walked through here, each player may look at any two of their own cards once, then put them back face down and play from memory. You may not look again for free.

The rest of the deck is the stock, face down. Turn one card up beside it. That card starts the discard pile.

A widespread six-card alternative turns those two peeked cards face up so the whole table sees them, and it often ends the hole when one player's grid is entirely face up rather than by a knock. Both versions use this same 2 by 3 grid. This page's turn order uses the knock. The face-up ending is described with the other variants so you can recognize it.

Deal passes to the left each hole. Nine holes make a game, and the lowest total wins. Eighteen holes is the long game. You can also stop when someone reaches 100 and still give the win to the lowest total.

Golf is in the [games of chance hub](/guides/topics/games-of-chance). The draw-or-discard choice is the same shape as a turn in [31](/guides/31-card-game), with a grid instead of a three-card hand.`,
    },
    {
      id: "turn",
      title: "Draw, replace one card, or knock",
      body: `The player to the dealer's left starts. On your turn you do one of these:

1. **Draw the top card of the stock.** Then either swap it with one of your six cards, or discard it and leave your grid alone. The card you remove from the grid goes face up on the discard pile. If you are replacing a face-down card, you do not get to look at it first and then change your mind. Point at the spot, then swap.
2. **Take the top card of the discard pile.** You must use it. Swap it with one grid card. You may not put it back and pretend the turn did not happen.
3. **Knock.** You do not draw. Knocking says you think your grid is low enough. Each other player, in order, takes one more turn. Those turns are ordinary draws. They may not knock. Then every grid is turned face up and scored.

The round also ends if the stock runs out. Shuffle the discard, leave its top card, and continue if you still have a stock to draw. If you would rather not, agree in advance that an empty stock ends the hole immediately and you score what is on the table.

You replace exactly one card per turn, unless you drew from the stock and threw that draw away, in which case you replaced zero. You never replace two cards. You never pass the draw to a partner. Six-card golf is played as individuals.

### What you know

You know the two cards you peeked at, until you replace them, and you know the discard. You do not know the other four cards unless you replace them or the hole ends.

Some tables place each replacement face up, so the grid becomes public as the hole goes on. Face-down replacement is a memory game. Face-up replacement is arithmetic everyone can check. Use one. Do not knock and also play "the hole ends only when every card has been turned" unless you agreed both endings.

After the last extra turn, turn every remaining card up and score. A sheet with nine columns is enough for a nine-hole game.`,
    },
    {
      id: "score",
      title: "Card values and the column-pair rule",
      body: `Score each face-up grid with these values. They are the common kitchen values for the six-card game:

| Card | Points |
| --- | --- |
| Ace | 1 |
| 2 through 10 | Face value |
| Jack | 10 |
| Queen | 10 |
| King | 0 |

A two scores 2 on this page. Some six-card tables score a two as minus 2, which changes every column that holds one.

### Pairs in a column

A pair of the same rank in the same column scores **zero** for that column, under the rule taught here. Two nines stacked on each other are 0, not 18. Two kings are 0 either way, because each king is already 0. Two queens are 0 with the pair rule and 20 without it.

This column cancel is the usual scoring in six-card golf, and it is still a house rule. It is not universal. Some tables add every card and ignore pairs. Some tables cancel a pair anywhere in the grid, even across a diagonal. Some tables cancel only a vertical pair, which is the rule on this page.

Agree before the first hole. The difference on one grid is often 10 to 20 points, which is a large share of a hole.

A column is the two stacked cards. The top-left card pairs with the card under it. A pair beside it, or on a diagonal, scores in full unless you adopted the anywhere-pair house rule. Three matching cards zero only the column that holds two of them. A jack and a queen are different ranks, so a jack on a queen scores 20.`,
    },
    {
      id: "example",
      title: "A scored grid and when the knock is right",
      body: `Your six cards, after the extra turns, look like this. Top row: 9, 4, king. Bottom row: 9, 2, 7.

With the column rule:

- Column 1 is 9 on 9, so 0.
- Column 2 is 4 on 2, so 6.
- Column 3 is king on 7, so 0 + 7 = 7.
- Hole total: 13.

Without the column rule the same grid is 9 + 4 + 0 + 9 + 2 + 7 = 31. Thirteen against thirty-one is why you name the pair rule before anyone knocks.

Knock when the cards you know are low. A peeked queen and a peeked 10 still in the grid are 20 points before you see the other four cards. Draw and bury them. If you already hold a king, a 3, an ace and a column pair of 4s, a knock is reasonable. The other players still get one turn, and they will take a king you just discarded. Throw a queen, then knock later, or knock without offering a 0.

A failed knock still scores the real total. Some houses add 10 for a failed knock, or double it, or score a successful knock as 0. Those penalties are optional. This page scores the cards as they lie. Nine hole totals, then compare. There is no par. The lowest sum wins.`,
    },
    {
      id: "nine",
      title: "Nine-card golf, scored differently",
      body: `Nine-card golf is the main variant. It is sometimes called Crazy Nines. Deal 9 cards face down in a 3 by 3 square. Use a second deck once you have five or more players, because 6 × 9 = 54, which is more than 52. Four players deal 36 and can stay on one deck.

Turn two or three cards face up to start. Draw or take the discard, replace one card, and discard the card you removed. Many nine-card tables skip the knock. The hole ends when one 3 by 3 is fully face up, either immediately or after each other player takes one more turn. Say which.

### How nine-card scoring differs

Each card uses the same face values: ace 1, 2 through 10 face value, jack 10, queen 10, king 0. A pair does **not** zero a column. A column of **three** equal ranks scores zero. That is the usual nine-card bonus. Three 8s stacked in one column are 0. Two 8s in that column are 8 + 8 plus whatever the third card is.

A row of three equal ranks scoring zero is a common extra. A diagonal is less common. Four of a kind scoring zero is a further house rule, and it is not part of the basic nine-card count. It matters for four 8s or four queens. Four kings are already zeros.

An example column of queen, 5, queen is 25. A column of 4, 4, 4 is 0. The other six cards still add up. Nine-card holes run longer. Deal six-card golf when you want nine holes in under an hour.`,
    },
    {
      id: "variants",
      title: "Variants worth naming before hole 1",
      body: `Most golf arguments are a rule from a different grid. Lock this list:

- **Six cards, knock, column pairs score zero, face values as in the table.** That is the main game on this page.
- **Two cards start face up,** and the hole ends when one grid is fully face up. Common six-card alternative. Turn the pair rule on or off out loud.
- **Twos score minus 2.** A real six-card variant. This page scores twos as 2.
- **Failed knock costs 10,** or doubles. Optional. Off unless you say it.
- **Nine-card:** column of three scores zero. Four of a kind as zero only if you added it.
- **Any pair anywhere scores zero.** A looser six-card house rule. It makes diagonal nines as good as a column.

[Yahtzee](/guides/yahtzee-rules) also fills a card over a fixed number of rounds, with dice and 13 boxes. Golf is nine holes and a grid.

If adults stake a unit per hole or on the nine-hole total, 18+ applies, or the legal age where you live. Agree the unit first. A six-card hole is mostly the deal and the two cards you were allowed to see. The [responsible gambling](/responsible-gambling) page covers limits for games played for money.

Read each grid out loud: "zero, six, seven, thirteen." A hidden king scored as a ten ruins the sheet. Shuffle between holes. A just-scored grid is a pile of pairs, and dealing it back in order hands someone three zeros. The [shuffle](/guides/how-to-shuffle-cards) has to break those columns.

Count the deck back to 52 before you box it.

See also [trash](/guides/trash-card-game), [klondike solitaire](/guides/solitaire-rules) and [kings in the corner](/guides/kings-corner-rules).`,
    },
  ],
  faqs: [
    {
      q: "What are the rules of the six-card golf card game?",
      a: "Deal 6 cards face down in two rows of three. Each player may look at two cards. On your turn, draw from the stock or take the discard and replace one card, or knock. After a knock, everyone else takes one turn. Lowest score wins the hole. Ace is 1, jack and queen are 10, king is 0.",
    },
    {
      q: "Do pairs cancel in golf?",
      a: "In the six-card game taught here, two cards of the same rank in one column score zero. That column rule is common and it is not universal. Some tables add every card. In nine-card golf, a pair does not cancel. A column of three equal ranks scores zero.",
    },
    {
      q: "What do face cards score in golf?",
      a: "Jack and queen score 10 each. King scores 0. Ace scores 1. Number cards score their face value, so a two is 2. Some six-card tables score a two as minus 2 instead. Say which value you are using before the first hole.",
    },
    {
      q: "How does nine-card golf differ?",
      a: "Deal 9 cards in a 3 by 3 grid, and add a second deck if five or more people play. A column of three matching ranks scores zero. Pairs do not. The hole often ends when one grid is all face up. Four of a kind scoring zero is an extra house rule, not the basic count.",
    },
    {
      q: "How many holes do you play?",
      a: "Nine holes is the usual game, like a short round of golf. The lowest total score wins. Eighteen holes is the longer option. You can also play until a player reaches 100, then stop, and the lowest total still wins.",
    },
  ],
  sources: [
    { label: "Pagat: Golf", url: "https://www.pagat.com/draw/golf.html" },
    { label: "Wikipedia: Golf (card game)", url: "https://en.wikipedia.org/wiki/Golf_(card_game)" },
  ],
  related: [
    "trash-card-game",
    "solitaire-rules",
    "kings-corner-rules",
    "how-to-play-rummy",
    "52-card-deck",
  ],
  updated: "2026-09-29",
  howTo: true,
};
