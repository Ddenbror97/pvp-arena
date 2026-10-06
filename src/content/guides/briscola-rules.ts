import type { Guide } from "./types";

export const guide: Guide = {
  slug: "briscola-rules",
  cluster: "Games of chance",
  keyword: "briscola rules",
  secondary: ["how to play briscola", "briscola trump", "briscola card points", "briscola scoring"],
  title: "Briscola Rules: Trump, Points and the Deal | PvP Spin Arena",
  description:
    "Briscola rules for two or four players: the 40-card deck, a face-up trump, no requirement to follow suit, card points, and why 61 wins.",
  h1: "Briscola rules: trump, points and how a trick is won",
  answer:
    "Briscola rules are for an Italian trump game played by two, or by four in partnerships. Use a 40-card deck, Italian suits or a standard deck with the 8s, 9s and 10s removed. Deal three cards each. Flip one card as trump and tuck it under the stock. In standard briscola you may play any card. You do not have to follow suit. The highest trump wins the trick. If no trump was played, the highest card of the led suit wins. Ace is 11 points, the 3 is 10, king 4, queen or horse 3, jack 2, and the other cards 0. The deck holds 120 points, and 61 wins a two-player game.",
  facts: [
    "Remove the 8s, 9s and 10s from a 52-card deck, or use a 40-card Italian pack.",
    "Two players, or four in two partnerships. Each player is dealt three cards.",
    "The face-up card under the stock is the briscola. Its suit is trump for the hand.",
    "Standard briscola does not require you to follow suit. Any card may be played.",
    "Trick rank, high to low: ace, 3, king, queen or horse, jack, 7, 6, 5, 4, 2.",
    "Points: ace 11, 3 is 10, king 4, queen or horse 3, jack 2, and 7, 6, 5, 4, 2 are 0. Total 120. 61 wins.",
  ],
  sections: [
    {
      id: "deck-and-deal",
      title: "The deck, the deal and the trump",
      body: `Briscola is a trick-taking game and one of Italy's standard card games, with scopa and tressette. The pack has 40 cards. An Italian deck uses coins, cups, swords and batons, with a king, a horse (cavallo) and a jack (fante) as the three faces. A French stand-in starts from a [52-card deck](/guides/52-card-deck): take out every 8, 9 and 10. Queen stands in for the horse. Jack stands in for the fante. Coins correspond to diamonds if you are talking across the two packs. This page says queen for the horse and jack for the fante, and it calls the trump suit by the suit you actually turned up.

Two players is the best way to learn. Four players sit in partnerships, partners opposite, and a side keeps one pile of won tricks. Three and six are traditional variants with their own dealing patterns. Five-player briscola chiamata is a different game. This page is the two-player game, with a short note on four.

[Shuffle](/guides/how-to-shuffle-cards). Deal three cards each, one at a time. Traditionally the deal and the play run counter-clockwise, so the player on the dealer's right leads. Clockwise tables should say so. Turn the next card face up. That card is the briscola, and its suit is trump for the whole hand. Put the remaining stock face down on top of it so about half the trump card still shows. Everyone can see the suit, and the card itself will be drawn later as the last card of the stock.

The player who holds the 2 of trump is allowed, in many regions, to swap it for the face-up briscola before the first trick. That swap is a regional option. This page mentions it and does not require it. If you allow it, it happens once, before the first lead, and only for the 2.

There is no bid. Trump is the turned card. Briscola sits with the other counted card games on the [games of chance](/guides/topics/games-of-chance) topic.`,
    },
    {
      id: "no-follow",
      title: "You may play any card",
      body: `Standard briscola does not make you follow suit. On the lead, you play any one of your three cards. It may match the led suit, it may be trump, or it may be a third suit. Regional variants add a follow-suit rule. If your table uses one, say so before the deal. The game taught here is the standard one: any card is legal, from the first trick to the last, including after the stock has run out.

That freedom is the tactic. You may throw a king of a side suit under the opponent's ace rather than spend trump. You may also lose a trick on purpose when the cards in it are worth zero. Saving the ace of trump for a trick that already holds a 3 is how hands are won.

You play one card. You cannot pass. The winner of the trick leads the next one, so one player can run several leads in a row. In a four-player game the winner leads, and play still moves counter-clockwise.

[Euchre](/guides/how-to-play-euchre) and [spades](/guides/how-to-play-spades) are trump games that do require you to follow suit. Players who arrive from those games will try to follow in briscola out of habit. It is legal to follow. It is also legal to throw a useless 4 on a led ace and keep your 3 for a trick you can actually win. The second play is often the right one.

Because you see only three cards, and the stock is unknown except for the face-up trump, you are guessing which high cards are still out. There are four aces and four 3s in the deck. Those eight cards are the ones to remember. Everything else is a supporter or a discard.`,
    },
    {
      id: "trick-rank",
      title: "Which card wins the trick",
      body: `Rank for winning a trick is not the order of the points, and it is not the usual king-high order.

High to low: ace, 3, king, queen, jack, 7, 6, 5, 4, 2.

The ace beats the 3. The 3 beats a king. A 2 loses to every other rank in its suit. A 7 is just above the 6 and well below the jack.

How to award the trick:

- If any trump was played, the highest trump wins. A trump 4 beats an ace of a side suit. A trump ace beats a trump 3.
- If no trump was played, the highest card of the led suit wins. Cards of a third suit cannot win.
- If both players play trump, the higher trump wins.

Example. Trump is coins. Ada leads the ace of cups (11 points). Ben plays the 4 of coins. Ben wins, because any trump beats any side suit, and Ben takes both cards, worth 11 plus 0.

Example. Trump is still coins. Ada leads the king of swords. Ben plays the 3 of swords. Ben wins, because no trump was played and the 3 outranks the king in the led suit. Ben takes 4 points for the king and 10 for his own 3.

Example. Ada leads the 5 of cups. Ben plays the king of batons. Ada wins. Ben's king is not trump and not the led suit, so it cannot take the trick, even though a king outranks a 5. Ada takes a king that is worth 4 and a 5 that is worth 0. Ben has handed her 4 points.

The face-up trump card does not win tricks by sitting on the table. It becomes an ordinary card of the trump suit when someone draws it. Until then it only names the suit.

In four-player briscola the same comparisons apply. Partners do not have to signal in a formal system, though many pairs develop one. The higher trump still takes the four cards, or the highest card of the led suit if nobody trumped.`,
    },
    {
      id: "points",
      title: "Card points and the 120 in the deck",
      body: `Points are counted on the cards you capture. A trick full of low cards can be worth nothing.

| Card | Points | Trick rank |
| --- | --- | --- |
| Ace | 11 | Highest |
| 3 | 10 | Second |
| King | 4 | Third |
| Queen or horse | 3 | Fourth |
| Jack | 2 | Fifth |
| 7, 6, 5, 4, 2 | 0 | Then in that order |

Four suits give four of each card. The point total is 4 times (11 + 10 + 4 + 3 + 2) = 4 times 30 = 120. The zero cards do not change the total. If your count of a hand is not a number you can explain from this table, a card is in the wrong pile.

The ace and the 3 decide the score. Together they are 21 points in one suit and 84 across the deck. Kings, queens and jacks are the other 36. A side that captures every ace and every 3 already has 84 and has won.

61 wins a two-player hand because 60 is half of 120. You need the majority. A 60–60 hand is a draw. This page adds nothing to the match score for a draw, and the next deal is a new hand.

You may look through your own won cards. Keep them face down in a pile so the opponent sees the backs. Counting at the end is public: sort by the point cards, call the total, and let the other player confirm. Do it before the next shuffle.

The face-up trump, when it is an ace or a 3, is 11 or 10 points in public. The player who draws it still has to win a trick with it, or those points leave with the card.`,
    },
    {
      id: "draw-and-win",
      title: "Drawing back to three, and winning",
      body: `After each trick, each player draws one card, winner first, until everyone has three again. Then the winner leads. The face-up briscola is the last card of the stock. The player whose draw reaches it takes it into hand. Its suit is still trump.

Play the last three cards the same way. Any card is still legal. Most points wins the hand. In two-player briscola, 61 or more wins. Counting the full 120 checks that no trick went into the wrong pile.

A match is the first player to win two hands, or first to an agreed number of hand-wins. Some tables score the margin, 61 counting as a bare win and a larger total as a bigger win. Margin scoring is a house rule. This page scores a hand as a win, a loss or a 60–60 draw.

Four players use the same 120 points. Partners combine their tricks into one pile. The side with 61 or more wins the hand. Play is still any card. Partners may see each other's cards before the first trick in some regional four-player habits. This page does not require that show. Hands stay private unless you adopt the show as a stated variant.

Whoever wins the hand deals the next one, or the deal passes to the right. Either custom is fine. The trump is turned fresh every hand. Nothing about the previous trump carries over.

[Oh hell](/guides/oh-hell-card-game) is a different trump-and-trick game, with a bid. Briscola has no bid. You simply take points. The decision on each trick is whether this card is worth spending, given that you will draw back up to three until the stock dies.`,
    },
    {
      id: "table",
      title: "A short hand sketch and table habits",
      body: `Trump is cups. Ada leads the ace of coins. Ben plays the 3 of coins. No trump was played, the ace outranks the 3, and Ada takes 11 plus 10. Playing a 3 onto an ace of the same suit gives away 10 points. Saving the 3 for a later trick is the usual correction.

Table habits that keep the 120 honest:

- Won tricks go face down in front of the winner, crossed at right angles so separate tricks can be checked if a point is disputed.
- The stock is touched only to draw, winner first.
- The visible half of the briscola stays visible. Do not square the stock on top of it.
- At the end, sort aces, 3s, kings, queens and jacks. Ignore the zeros until the total is short, then find the missing card.

Stakes are optional and sit between the players. Adults only if money is involved, 18+. A unit per hand, agreed before the shuffle, is the whole of the betting rule. There is no casino percentage in briscola. A two-player online stake with a published method is a different object. [Coinflip](/coinflip) is a 50/50 between two players on this site, and it is not a model of this deck. The cards are the game if you dealt briscola.

Before you start, confirm the pack: no 8s, 9s or 10s, four aces, four 3s, 40 cards. Name the trump as soon as it is turned. Then lead.

See also [scopa](/guides/scopa-rules) and [pinochle](/guides/pinochle-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do you play briscola?",
      a: "Deal three cards each from a 40-card deck and turn one card as trump. Play any card. The highest trump wins the trick, otherwise the highest card of the led suit. Draw back to three cards, winner first. Ace is 11 points and the 3 is 10. The first to 61 points wins the hand.",
    },
    {
      q: "Do you have to follow suit in briscola?",
      a: "In standard briscola, no. Any of your three cards may be played on any lead, including after the stock runs out. Some regional variants add a follow-suit rule. Agree that before the deal if you use it.",
    },
    {
      q: "What is the rank order in briscola?",
      a: "Ace, then 3, king, queen or horse, jack, 7, 6, 5, 4, 2. The 3 is the second-highest card in a trick and is worth 10 points, one less than the ace.",
    },
    {
      q: "Why does 61 win in briscola?",
      a: "The deck contains 120 points. Half is 60, so 61 is a majority. A 60–60 result is a draw. Four of each point card is 4 times 30.",
    },
    {
      q: "Which cards do you remove to play briscola?",
      a: "From a standard deck, remove the 8s, 9s and 10s. Play with ace through 7, jack, queen and king. An Italian 40-card deck already has the right ranks, with a horse instead of a queen.",
    },
  ],
  sources: [
    { label: "Wikipedia: Briscola", url: "https://en.wikipedia.org/wiki/Briscola" },
    { label: "Pagat: Briscola", url: "https://www.pagat.com/aceten/briscola.html" },
  ],
  related: [
    "scopa-rules",
    "how-to-play-euchre",
    "pinochle-rules",
    "52-card-deck",
    "how-to-shuffle-cards",
  ],
  updated: "2026-09-29",
  howTo: true,
};
