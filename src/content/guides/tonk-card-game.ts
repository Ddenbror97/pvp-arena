import type { Guide } from "./types";

export const guide: Guide = {
  slug: "tonk-card-game",
  cluster: "Games of chance",
  keyword: "tonk card game",
  secondary: ["how to play tonk", "tonk rules", "tonk deadwood", "tunk card game", "knock rummy"],
  title: "Tonk Card Game Rules, Deadwood and Scoring | PvP Spin Arena",
  description:
    "Tonk card game rules: five-card hands, deadwood values, spreads, knocking, what an equal count does, and how player stakes are usually settled.",
  h1: "Tonk card game: deadwood, spreads and how to go out",
  answer:
    "The tonk card game is a rummy-family game for about two to six players. Deal five cards. On your turn, draw from the stock or the discard pile, lay down sets or runs, and discard one card. You go out by discarding your last card, or by calling tonk with a very low hand, often a count of zero or a spread hand with no deadwood. Ace counts 1, face cards count 10, and other cards count their face value. House rules vary, so agree the knock and the stake before the deal.",
  facts: [
    "Tonk, also called tunk, is usually played with one 52-card deck and five-card hands.",
    "Two to six can play; two or three is the common table, and four still works with one deck.",
    "Deadwood: ace 1, king queen and jack 10 each, and every other card its pip value.",
    "A spread is a set of three or four of one rank, or a run of three or more in one suit. Ace is low.",
    "Calling tonk and losing the compare, including a tie, means the lower or equal hand wins.",
    "A dealt hand with no deadwood, or another special spread the table names, can tonk before play starts.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What the tonk card game is",
      body: `Tonk sits in the same draw-and-meld family as [rummy](/guides/how-to-play-rummy) and [gin rummy](/guides/how-to-play-gin-rummy). The hands are shorter, the decision to stop the hand is sharper, and many tables settle a stake after every deal. It is also spelled tunk. Players in the United States have played it for decades, including among jazz musicians in the 1930s and 1940s, and a related longer game, tong-its, is widely played in the Philippines.

You need a standard [52-card deck](/guides/52-card-deck), no jokers in the version taught here, and two to six players. Five cards each is the usual deal. Some books and some Navy and union tables deal seven. If your group deals seven, say so before the first hand, because the automatic-win counts below are written for five cards.

Cards that are not part of a spread are deadwood. Their values:

| Card | Deadwood |
| --- | --- |
| Ace | 1 |
| 2 through 10 | Face value |
| Jack, queen, king | 10 each |

A five-card hand of king, queen, jack, 10 and 9 is 49. Five faces and tens can reach 50. A hand that is entirely one set or one run has deadwood of zero. Those two extremes are why the opening tonk exists in so many houses: the hand is already finished before anyone draws.

Tonk is one of the short card games collected on the [games of chance](/guides/topics/games-of-chance) topic. The skill is small and real: which card to draw, when to lay a spread, and when your deadwood is low enough to stop the hand.`,
    },
    {
      id: "deal-and-turn",
      title: "The deal and what a turn looks like",
      body: `Cut for first dealer. High card deals in many houses; low card deals in others. After that, the deal passes to the left, or to the winner of the previous hand if that is your table's custom. [Shuffle](/guides/how-to-shuffle-cards) thoroughly. Five-card hands make a stacked clump of faces very obvious.

Deal five cards to each player, one at a time, clockwise. Turn the next card face up to start the discard pile. The rest of the deck is the stock, face down. A common variant deals no upcard: the first player must draw from the stock, and the discard pile starts with that player's discard.

The player to the dealer's left goes first. At the start of your turn, before you draw, you may call tonk if you believe your deadwood is the lowest at the table. If you do not call, you must draw exactly one card, either the top of the stock or the top of the discard. You may then lay down one or more legal spreads, add cards to spreads already on the table, and you finish by discarding one card. Discarding ends the turn.

Only the top of the discard is available. Players do not dig through the pile. If you take the discard, it joins your hand and can be melded or thrown later, unless your house says a taken discard must be used in a spread at once. That stricter rule is a house rule, not the base game.

When the stock runs out, play can continue only by taking the previous discard. The first player who wants the stock and finds it empty ends the hand, and the lowest deadwood wins. Some tables call a hand dead, with no score, the moment the stock is exhausted. Agree which ending you use.`,
    },
    {
      id: "spreads",
      title: "Spreads, laying off and going out",
      body: `A spread is either a book or a run.

- A book is three or four cards of the same rank: three queens, or four sixes.
- A run is three or more cards in sequence in one suit. Ace is low, so ace-2-3 of hearts is a run. Queen-king-ace is not a run in this game.

You may lay a spread only on your own turn, after you have drawn and before you discard. Cards in a spread leave your hand and stop counting as deadwood. You may also lay off, sometimes called hitting: add the fourth card to a book, or extend a run at either end. You can hit your own spreads and other players' spreads.

Two ways to go out cover almost every win during play.

1. Discard your last card. You drew, used what you could, and the discard empties your hand. That is a normal out.
2. Empty your hand without a discard, by laying a second spread or by hitting until nothing is left. Many tables call this tonking out and pay it at a higher rate than a discard out.

A worked turn: you hold 7 of hearts, 8 of hearts, 9 of hearts, king of spades and 4 of clubs. Deadwood is 7+8+9+10+4 = 38, because nothing is spread yet. You draw the 6 of hearts, lay 6-7-8-9 of hearts, and discard the king. Your hand is now the 4 of clubs, deadwood 4. Next turn you might draw a card you can live with and call tonk, or you might hit someone else's spread with the 4 if a run or book will take it.

Some houses force you to lay a spread the moment you hold one. That rule is hard to police and changes the game, because holding a run in hand is a normal way to keep your count low while you wait to knock. This page allows spreads to stay in hand until you choose to lay them.

You can tonk on the deal if your five cards are already a spread with no deadwood, or if they match another special pattern your table has named. Show the cards at once, before anyone draws. If two players both have an opening tonk, the usual result is a dead hand and a redeal, unless the table ranks one pattern above the other.`,
    },
    {
      id: "knock",
      title: "Calling tonk and the compare",
      body: `Calling tonk, also called dropping or knocking, happens at the start of your turn, before you draw. You put your hand face up and claim the lowest deadwood. Everyone else shows the cards still in hand. Spreads already on the table do not count. Only deadwood counts.

If your count is strictly lower than every other hand, you win the compare. If any opponent has an equal count or a lower count, that opponent wins the compare. You do not win a tie. Tables have several names for beating the caller: a catch, or bumping the caller's head. The idea is the same. The caller took the risk, and equal is good enough to beat the call.

Example with three players. You call with deadwood 7. The next player has 7, and the last has 12. The player with 7 wins the compare, because equal beats the caller. You do not split with them under the common rule.

Example where the call is right. You call with 2. The others have 9 and 14. You win.

If nobody calls and nobody goes out, the lowest deadwood at the end of the stock wins. A tie at that point is often a dead hand, or a split of the stake. It is not the same as a tie against a caller, because nobody took the knock risk.

An opening tonk is separate from a knock during play. During play, collecting a very high count does nothing. The 49 and 50 hands matter on the deal only, and only in houses that use them. Once the first card is drawn, you are hunting low deadwood or an empty hand.

A few tables add waiting. After you lay a new spread, you may not knock for a set number of turns, often three, so that dropping to two cards does not end the hand immediately. A hit on your spread can also freeze your knock for one turn. Waiting does not stop you from going out by playing every card. If your group uses waiting, write down the number of turns before the session.`,
    },
    {
      id: "stakes",
      title: "Stakes between players and house rules",
      body: `Tonk is often played for a stake between the people at the table. There is no casino in the game and no built-in house percentage to quote. Adults only if money is involved: 18+, or the legal age where you live. Agree the unit before the deal, and keep it to an amount every player can lose. The [responsible gambling](/responsible-gambling) page covers limits if you also play for money online.

Two settlement habits are both common. Name which one you are using.

- A fixed stake. Each loser pays the winner one unit. Going out without a discard, or winning with an opening tonk, is often two units from each other player.
- The difference. Each loser pays the winner the gap in deadwood, sometimes with a cap. A caller who loses the compare pays the opponent who caught them, often double.

Pagat's survey of American tables shows still more payment maps: the caller who is caught pays only the low hand, or pays every player, or the low hand collects from the whole table. None of these is a house edge. They are ways of moving the same stake among players. Pick one and stick to it for the session.

Other house rules worth a sentence each before you start:

- Opening tonk on 49 or 50 as well as on zero. In a five-card game, 50 is five cards worth 10, and 49 is one 9 plus four 10-point cards. Some tables also tonk on 15 or fewer, or on 11 or fewer. If two players tonk, many groups throw the hand in.
- Seven-card tonk. The counts above do not transfer. Re-agree the opening numbers.
- A 40-card deck with 8s, 9s and 10s removed, once used in some Army games. Runs then jump from 7 to jack. This page teaches the 52-card game.
- Jokers, if you add them, are usually worth 0 and stay out of spreads unless your house makes them wild.
- Face cards counted as 11, 12 and 13 inflate every hand, so those tables usually drop the 49 and 50 opening tonk.

Write the short list on a card: five cards, ace low in runs, ace 1 and faces 10, knock loses ties, and the stake method.`,
    },
    {
      id: "table-habits",
      title: "Habits that keep a tonk hand fair",
      body: `Because the hands are five cards, one extra draw changes the result. Keep the stock square. When someone calls tonk, freeze. Counts are checked aloud: each player names the deadwood cards and the total, and a neighbour confirms.

With three or more players, play for a stake only with people you trust. Two players can avoid knocking to protect a third, or can feed a discard. Heads-up tonk removes that.

Knocking claims that every other hand is higher. If your deadwood is 8 and you are not sure, draw. An 8 that loses the compare costs more, at most tables, than an 8 you improve. Scoop every spread back into the deck before the next deal.

See also [phase 10](/guides/phase-10-rules), [31](/guides/31-card-game) and [canasta](/guides/canasta-rules).`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you deal in tonk?",
      a: "Five cards each is the usual deal, from one 52-card deck, for two to six players. Some tables deal seven. Agree the number before the game, because opening-tonk counts are written for a five-card hand.",
    },
    {
      q: "What is deadwood in tonk?",
      a: "Deadwood is every card still in your hand that is not part of a spread. Aces count 1, jacks queens and kings count 10, and 2s through 10s count their face value. Spreads on the table do not count.",
    },
    {
      q: "What happens if you knock and someone ties you?",
      a: "The player with the equal count wins the compare. A lower count wins too. The caller only wins when every other hand is strictly higher.",
    },
    {
      q: "Can you tonk on the deal?",
      a: "Yes, if the dealt hand has no deadwood, or if it matches a special spread your table has named, such as 49 or 50 points in houses that use that rule. Show it before anyone draws. Two opening tonks usually mean a dead hand.",
    },
    {
      q: "Is tonk the same as gin rummy?",
      a: "Both are knock rummy games, but tonk uses five-card hands, lays spreads during the hand, and often lets you add to other players' melds. Gin is usually ten cards, two players, and melds are shown only at the knock.",
    },
  ],
  sources: [
    { label: "Wikipedia: Tonk (card game)", url: "https://en.wikipedia.org/wiki/Tonk_(card_game)" },
    { label: "Pagat: Tonk", url: "https://www.pagat.com/rummy/tonk.html" },
  ],
  related: [
    "how-to-play-gin-rummy",
    "how-to-play-rummy",
    "31-card-game",
    "phase-10-rules",
    "52-card-deck",
  ],
  updated: "2026-09-29",
  howTo: true,
};
