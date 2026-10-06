import type { Guide } from "./types";

export const guide: Guide = {
  slug: "go-fish-rules",
  cluster: "Games of chance",
  keyword: "go fish rules",
  secondary: [
    "how to play go fish",
    "go fish books",
    "go fish card game",
    "go fish for kids",
    "go fish how many cards",
  ],
  title: "Go Fish Rules: Books, Asking and the Deal | PvP Spin Arena",
  description:
    "Go Fish rules for 2 to 6 players: how many cards to deal, how to ask for a rank, what Go Fish means, and how books of four decide the winner.",
  h1: "Go Fish rules: books of four, the deal and how to ask",
  answer:
    "Go Fish rules use one 52-card deck for two to six players. Deal 7 cards each (5 cards each when four or more play is a common variant). On your turn you ask one player for a rank you already hold. If they have any, they hand over every card of that rank and you ask again. If they have none, they say Go Fish and you draw one card from the stock. Four of a rank is a book. The player with the most books wins.",
  facts: [
    "Two to six players, one 52-card deck, 13 possible books of four.",
    "The usual deal is 7 cards each. Dealing 5 when four or more play is a widespread variant.",
    "You may ask only for a rank you already hold, and the asked player gives every card of that rank.",
    "Go Fish means the asked player has none of that rank. You then draw one card from the stock.",
    "A book is four cards of one rank, laid face up. Most books wins. There are 13 books in the deck.",
  ],
  sections: [
    {
      id: "deal",
      title: "Players, the deck and the deal",
      body: `Go Fish is a matching game. You collect four cards of the same rank, called a book, by asking other players for the ranks you already hold. It is usually a children's game. Adults play it too, because a hand takes about ten minutes and the only equipment is a deck and a table.

Use one standard [52-card deck](/guides/52-card-deck). Jokers stay in the box. There are 13 ranks and four suits, so the deck contains exactly 13 books. Suits do not matter. The ace of spades and the ace of hearts are the same rank for asking.

Two to six players is the normal range. Two can play, but the game is sharper with three to five, because you have a real choice of whom to ask. With six, use the 5-card deal below or the stock gets thin.

Shuffle thoroughly. A clump of four eights sitting together in the stock makes the next few draws too kind. The [how to shuffle cards](/guides/how-to-shuffle-cards) guide covers a riffle that actually mixes a deck.

### How many cards to deal

State the deal out loud before the first hand. Two versions are both widely played:

1. Deal 7 cards to each player, at any player count from two to six.
2. Deal 7 cards when two or three play, and deal 5 cards when four or more play.

A third written split deals 7 only for two players and 5 for everyone else. Pick one and keep it for the whole sitting. The rest of the cards go face down in the middle as the stock. Some families call the stock the ocean or the pool. Do not turn a card up. There is no discard pile in the basic game.

With three players and a 7-card deal, 21 cards are in hands and 31 are in the stock. With five players and a 5-card deal, 25 cards are in hands and 27 are in the stock. With six players dealt 7, you have dealt 42 cards and only 10 remain to fish from, which is why the 5-card deal is the better fit once the table is full.`,
    },
    {
      id: "turn",
      title: "A turn: asking, giving and Go Fish",
      body: `The player to the dealer's left goes first. Play passes to the left, except when a successful ask lets you continue.

On your turn, choose one other player and ask for one rank. You must already hold at least one card of that rank. "Do you have any sevens?" is legal only if a seven is in your hand. You name the rank, not the suit. You ask one player, not the table.

The asked player answers in one of two ways:

- If they hold any card of that rank, they give you all of them. One seven means one card. Three sevens means three cards. They do not get to keep one back.
- If they hold none, they say **Go Fish**. That sentence means "no." You then draw the top card of the stock and put it in your hand.

If you were given the cards you asked for, you ask again. You may ask the same player or a different one, and you may change rank. Your turn continues until an ask is met with Go Fish.

### What happens after you draw

Two rules are both common. Agree which one you are using.

- **Draw and the turn usually ends.** After Go Fish you draw one card, and play passes left, even if the drawn card is the rank you just named.
- **Lucky draw, go again.** If the card you draw is the rank you just asked for, you show it and ask again. If it is any other rank, the turn passes.

A book completed by the draw also lets you continue, at many tables, even under the stricter rule. Say which version you want before the first ask.

You may not ask for a rank you do not hold. If your hand is empty at the start of your turn and the stock still has cards, draw one card first, then ask if you can. If the stock is empty and your hand is empty, you sit out for the rest of the hand.`,
    },
    {
      id: "books",
      title: "Books, an empty hand and who wins",
      body: `The moment you hold four cards of one rank, lay them face up in front of you. That is a book. Those four cards are out of your hand. They cannot be asked for, and they do not count when someone checks whether you still have cards.

Lay the book as soon as you have it, including in the middle of a chain of asks. You do not wait for the end of the turn. If laying the book empties your hand, draw one from the stock if any cards remain, then continue if your turn is still open.

There is nothing to score inside a book. A book of aces and a book of twos are worth the same: one book. Suits never break a tie.

### When the hand ends

The hand ends when all 13 books have been laid down. If the stock runs out first, play continues. Players still ask, and a player who would have to Go Fish simply fails the ask and the turn passes, because there is nothing left to draw. When nobody has a legal ask left, count the books.

The player with the most books wins. A tie on the number of books is a draw unless the table has agreed a tie-break. A common tie-break is to play another hand. Do not invent a suit ranking to split a tie that nobody agreed.

Thirteen books means someone can win with 7 if the others split the rest, or the books can scatter 5-4-4 at a three-player table. You do not need a majority of the deck. You need more books than each other player.

If a player runs out of cards while the stock still has cards, they draw one and stay in. If they run out after the stock is gone, they are out, and the remaining players keep asking each other. An out player keeps the books they already laid.`,
    },
    {
      id: "example",
      title: "A short three-player example",
      body: `Three players, 7-card deal, lucky-draw rule off so a fish ends the turn unless you were given cards. Call them Ana, Ben and Cho. Ana is left of the dealer and starts. She holds 4, 4, 9, K, K, 2, 7.

Ana asks Ben for kings. Ben has one king and must give it. Ana now has three kings. She asks again, this time Cho, for kings. Cho has none and says Go Fish. Ana draws a 3. The 3 is not a king, so the turn passes to Ben.

Ben holds two sevens. He asks Ana for sevens. Ana has one and gives it. Ben now has three sevens. He asks Cho for sevens. Cho gives him one. Ben has four sevens, lays the book, and asks again because the ask succeeded. He asks Ana for nines. Ana has one nine and gives it. Ben asks Cho for nines, Cho says Go Fish, and Ben draws. The turn passes.

That sequence is the whole game in miniature. A hit lets you chain asks. A miss is the words Go Fish plus one draw. Books leave the hand immediately, which is why Ana's single seven was still askable until Ben collected it.

### What you are allowed to remember

Memory is the skill. When Cho tells Ana "Go Fish" on kings, everyone heard that Cho had no kings at that moment. Cho might draw a king later, so the information ages. A legal table lets you remember what was said. A legal table does not let you look through the stock or through another player's hand.

Asking a player who just failed that rank is usually a waste unless they have drawn since. Asking the player who just picked up several cards of a new rank is often right, because a successful chain tells you what they were collecting.`,
    },
    {
      id: "odds",
      title: "What a 7-card deal actually contains",
      body: `A 7-card hand from a 52-card deck is one of C(52, 7) = 133,784,560 equally likely hands, if the shuffle was fair.

The chance your hand misses a specific rank, say aces, is C(48, 7) / C(52, 7) = 73,629,072 / 133,784,560 ≈ 55.0%. So you hold at least one card of a given rank about 45.0% of the time. Across 13 ranks, the expected number of different ranks in a 7-card hand is 13 × 0.450 ≈ 5.8. A typical opening hand is five or six ranks, with one pair and the rest singletons. Four of a kind dealt cold is rare: C(48, 3) / C(52, 7) = 17,296 / 133,784,560, about 1 in 7,735 for a specific rank, and still uncommon if you count any rank.

That is why asking matters more than the deal. Books are built, not dealt. Each successful ask moves one to three cards, and a player who is holding a pair of the rank you need has to give you both.

With a 5-card deal the same idea holds, with fewer ranks in hand. C(52, 5) = 2,598,960. You still ask only for a rank you hold, so a 5-card hand gives you fewer legal questions on the first turn and a larger stock.

None of this is a system that beats the other players. They hold the cards you want, and they can hear your questions too. The edge, such as it is, is remembering who said Go Fish and who just received a stack.`,
    },
    {
      id: "house",
      title: "House rules worth settling first",
      body: `Most Go Fish arguments are a rule nobody stated. Settle these before the deal:

- **7 cards or 5.** Use 7 for everyone, or 7 below four players and 5 from four upward.
- **Lucky draw.** Does drawing the rank you asked for let you go again, or does every fish end the turn?
- **Who plays next after a miss.** The usual pass is to the left. A few tables pass the turn to the player who said Go Fish.
- **Pairs instead of books.** A teaching version for very young children discards pairs and ignores the third and fourth card. That is a different game. Standard Go Fish is books of four.
- **Trading suits.** Nobody trades one card for one card. The asked player gives every card of the named rank.

Go Fish sits with the other family games in the [games of chance hub](/guides/topics/games-of-chance). If you want a draw-and-discard game that also collects matching cards, [rummy](/guides/how-to-play-rummy) uses sets of three or four and runs in suit, and you never ask anyone for a rank.

This is a children's matching game. It is not a betting game. If adults put money on who takes the most books, that is gambling: keep it to people who are 18 or older, or the legal age where you live, and agree the stake before the deal. The [responsible gambling](/responsible-gambling) page covers limits. The cards do not form a house edge. The winner is a player at the table.

See also [old maid](/guides/old-maid-card-game), [crazy eights](/guides/crazy-eights-rules) and [slapjack](/guides/slapjack-rules).`,
    },
  ],
  faqs: [
    {
      q: "What are the basic Go Fish rules?",
      a: "Deal 7 cards each from a 52-card deck, or 5 each when four or more play. Ask for a rank you hold. If they have any, they give you all of them and you ask again. If they say Go Fish, draw one. Four of a rank is a book. Most books wins.",
    },
    {
      q: "How many cards do you deal in Go Fish?",
      a: "The usual deal is 7 cards to each player. A common variant deals 5 cards each when four or more people play, and some written rules deal 5 whenever more than two play. The undealt cards are the stock.",
    },
    {
      q: "What does Go Fish mean?",
      a: "It means the player you asked has no cards of that rank. You then draw one card from the stock. In the common rule, your turn ends unless the card you draw is the rank you asked for and the table plays the lucky-draw variant.",
    },
    {
      q: "Do you give one card or all of them?",
      a: "You give every card of the rank you were asked for. If you hold three nines and someone asks for nines, all three change hands. You do not choose to keep one.",
    },
    {
      q: "Can two people tie in Go Fish?",
      a: "Yes. The winner is whoever has the most books, and 13 books can split evenly, such as 5 to 5 in a two-player game. A tie is a draw unless you agreed to play another hand as the tie-break.",
    },
  ],
  sources: [
    { label: "Wikipedia: Go Fish", url: "https://en.wikipedia.org/wiki/Go_Fish" },
    { label: "Pagat: Go Fish", url: "https://www.pagat.com/quartet/gofish.html" },
  ],
  related: [
    "old-maid-card-game",
    "crazy-eights-rules",
    "slapjack-rules",
    "52-card-deck",
    "how-to-play-rummy",
  ],
  updated: "2026-09-29",
  howTo: true,
};
