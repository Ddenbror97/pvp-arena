import type { Guide } from "./types";

export const guide: Guide = {
  slug: "double-solitaire",
  cluster: "Games of chance",
  keyword: "double solitaire",
  secondary: [
    "double klondike",
    "two player solitaire",
    "shared foundations",
    "competitive klondike",
  ],
  title: "Double Solitaire Rules for Two Players | PvP Spin Arena",
  description:
    "Double solitaire rules for two players: two Klondike layouts, shared ace-to-king foundations, stock turns, and the race to empty your own cards.",
  h1: "Double solitaire: two layouts and shared foundations",
  answer:
    "Double solitaire is a two-player race on two Klondike layouts. Each player has a 52-card deck and a private stock. Foundations are shared and build from ace to king by suit. You may play onto either person's tableau or onto the shared foundations, building down in alternating colors. Turn the stock one card or three, by agreement. The common race ends when one player empties their tableau and stock. Some houses instead award the win to whoever placed more cards on the foundations.",
  facts: [
    "Each player uses a full 52-card deck. Different backs keep the packs separable after the game.",
    "Each tableau is a Klondike fan: seven piles, from one card up to seven, top card face up.",
    "Eight foundation piles are shared, because two decks contain two aces of every suit.",
    "Tableau builds go down by rank and alternate red and black. Foundations go up in suit.",
    "The usual win is to empty your own tableau and stock first. Foundation count is the other common score.",
    "Spite and Malice is a different game, with payoff piles, and it is not double solitaire.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What double solitaire is",
      body: `Double solitaire takes the familiar one-player Klondike layout and puts two of them on the same table. It is a race. You are trying to clear your own cards, and the other player is trying to clear theirs, often by using the same foundation piles you wanted.

It is also called double Klondike. Give each player a full [52-card deck](/guides/52-card-deck). Different back designs matter. At the end of a hand the cards have to go home to the right deck, and identical backs make that a sort, not a glance.

Spite and Malice is a different game. It uses payoff piles and a shared center, and players usually take turns. Do not mix its rules into this layout.

This page teaches the open race: you may play on your tableau, on your opponent's tableau, and on the shared foundations. A stricter turn-based version, described by Pagat, locks you out of the other player's layout and only shares the foundations. Both are played. The open race is the one most kitchen tables mean by double solitaire. Say which version you are starting before anyone deals.

The game lives with the other table races on the [games of chance](/guides/topics/games-of-chance) topic. Luck of the deal matters, and so does the order in which you uncover face-down cards.`,
    },
    {
      id: "layout",
      title: "Dealing the two Klondike layouts",
      body: `Each player deals their own tableau in front of themselves.

1. Seven columns. The first column is one card, the second is two, and so on up to seven cards in the seventh column.
2. The top card of each column is face up. Every card under it is face down.
3. That uses 28 cards. The other 24 cards are that player's stock, face down, off to one side.

Leave the middle of the table clear for foundations. You need room for eight piles: two aces of each suit will appear across two decks, so each suit has two foundation piles, each built from ace up to king.

No foundation starts until an ace is played. Do not deal aces out of the tableau onto the foundations during the deal unless your house plays that optional courtesy. The standard deal leaves every ace where it fell.

[Shuffle](/guides/how-to-shuffle-cards) each deck separately. A player should not shuffle the opponent's deck and then cut it in a way the other player cannot watch. Each player shuffles their own, and the opponent may cut.

Who starts, if you are playing in turns rather than as a free-for-all: compare the face-up card on each one-card pile. The lower rank starts. A tie moves to the two-card pile, then the three-card pile. In a true race, both players start together on a counted signal. The race is what this page treats as the default.`,
    },
    {
      id: "moves",
      title: "Legal plays on tableaus and foundations",
      body: `Tableau rules are Klondike rules, and they apply to both layouts.

- Build down. A 7 may go on an 8.
- Colors alternate. A red 7 goes on a black 8, and a black 7 goes on a red 8.
- You may move a face-up sequence if the bottom card of that sequence fits the card you are moving it onto.
- When a face-up card leaves a face-down card exposed, flip that card up at once.
- An empty column may be filled only by a king, or by a sequence that starts with a king.

Foundation rules:

- An ace starts a foundation.
- The next card is the 2 of the same suit, then the 3, up to the king.
- Any player may play to any foundation.
- You may move a card from a foundation back to a tableau only if your house allows it. Many races forbid it, because taking a card back off a foundation is a way to wreck the other player's build. This page forbids moves off foundations.

You may play a card from your tableau, from your waste pile, or, when the rules below allow, from the stock you just turned. You may also play the top card of an opponent's tableau onto a foundation or onto a legal spot on either tableau. That last permission is the sharp edge of the open race. If their black 8 is the only home for your red 7, you may take the 8 only when your move is a legal build, not merely because you want their card gone. You take a card by building on it or by playing it onward, under the same movement rules you use on your own cards.

Play one card at a time and finish each move before you start the next. In a race, a card that has left the fingers and touched a legal pile stays. Hovering does not count.`,
    },
    {
      id: "stock-and-win",
      title: "The stock, the turn count and who wins",
      body: `Each player has a private stock and a private waste pile. You never turn the other player's stock.

Agree one of these before the deal:

- Turn one. Flip one stock card face up onto your waste. Only the top waste card is playable.
- Turn three. Flip three cards as a group, without reordering them, and play the top one. When that card leaves, the next of the three is available.

When the stock is exhausted, turn the waste face down to form a new stock, without shuffling, and continue. Some houses allow only three passes through the stock, as in casino Klondike software, and then you are stuck with what is on the tableau. For a two-player race, unlimited redeals are the usual rule. Three passes is a house limit.

The common win is the first player to empty their tableau and stock. Waste counts as part of the stock side: if a card is still in your waste, you have not finished. Cards of yours that sit on the opponent's tableau or on a foundation are already out. You do not have to gather them back.

The other common scoring says nothing about who cleared first. Count the cards each player placed onto foundations. The higher count wins. Use this when both players block, or use it as the only win condition if your house prefers a full game to a sprint. State it out loud. "First to empty their tableau and stock" and "most cards to foundations" produce different play. In the race, you will bury an opponent's card under yours when you can. In the foundation count, you care more about getting your own cards up in suit.

If both players are blocked and you are using the race rules, the player with more cards on the foundations wins that deal. A tie on the count is a draw, and you redeal.

There is no dealer advantage to quote and no casino percentage. The decks are the randomness. Over many games the player who reads the layout faster will win more races, and the deal will still swing single games.`,
    },
    {
      id: "house-rules",
      title: "House rules to settle before the first card",
      body: `Double solitaire arguments are almost all layout arguments. Freeze these before the deal.

- Open race or turns. In turns, a player makes every move they want, then turns the stock once, and play passes. In a race, both play at once.
- Opponent's tableau. This page allows plays on either tableau. The turn-based Pagat version does not. If you switch to turns, decide whether the lock comes with them.
- One card or three. Three-card turns hide cards and make the race lumpier.
- Empty columns. King only is the Klondike rule used here.
- Building on the opponent. Some families allow you to play onto their tableau but not to move their cards away. That is a milder game. Say if you are playing it.
- Win line. First empty tableau and stock, or higher foundation count.

A blocked foundation is not a rules failure. Two decks can produce a red 6 that both players need under different black 7s, and only one build can be made at a time. The player who commits the card first keeps the play.

Keep score across games if you want a match: one point for a race win, or the foundation difference if you are counting cards. First to five race-wins is a practical match length. Playing the match for money is an adult choice, 18+ where that is the legal age, and the stake should be agreed per game before the shuffle.

Nothing in the card rules maps onto a house edge. If you want a two-player game whose result you can check after the fact, a committed coin toss is a different object. The [fairness](/fairness) page shows how a settled online round is opened. It does not change how these two decks play.`,
    },
    {
      id: "pace",
      title: "How to keep the race readable",
      body: `A race falls apart when both players grab the same pile. Two habits fix most of that.

First, cards in motion belong to the hand that touched a legal destination. If two hands hit one foundation together, the card that is fully on the pile stays, and the other card goes back. Do not start a debate in the middle of a run of moves. Finish the beat, then talk.

Second, flip face-down tableau cards immediately and leave them square with the column. A half-flipped card is an argument about whether it was available. The same goes for the waste: square the pile so only one card shows.

Watch kings. An empty column is a parking space, and the player who spends a king to open a buried ace often wins the next flurry. Spending a king only to block the other layout can stick your own face-down cards. In the race version of the win, your face-down cards still have to be turned and played before you can finish, so a blocked column in your own tableau costs you the game even if the other player is also stuck.

When you turn three, look at the top card and also remember that the two under it are coming. New players play the top card onto a foundation and only then notice it was covering a card they needed for the tableau. That is legal. It is also how stocks stall.

Separate the decks as soon as the hand ends. Pull foundations apart by back design before anyone scoops the tableaus. Mixing one queen into the wrong deck means the next game has two queens of one suit in a single pack, and the foundations will not come out. Count 52 before the next deal if a card went to the floor.

The same discipline shows up in slower two-player card games, including [casino war](/guides/casino-war-game), where the only skill is following the turn. Double solitaire adds a real choice of which build to make. Agree the win condition, keep the packs distinct, and the race stays a game instead of a grab.

See also [klondike solitaire](/guides/solitaire-rules), [nertz](/guides/nertz-rules) and [kings in the corner](/guides/kings-corner-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do two people play double solitaire?",
      a: "Each player deals a Klondike tableau from their own 52-card deck and keeps a private stock. Foundations in the middle are shared, ace to king by suit. Play down in alternating colors on either tableau. The common win is to empty your tableau and stock first.",
    },
    {
      q: "Can you play on the other player's cards?",
      a: "In the open race taught here, yes. You may build on either tableau and on the shared foundations. A stricter turn-based version lets you use only your own tableau plus the foundations. Agree before the deal.",
    },
    {
      q: "Do you turn one card or three?",
      a: "Either. Turning one is easier to read. Turning three matches classic Klondike and hides two cards under the one you can play. The win conditions are the same either way.",
    },
    {
      q: "Is double solitaire the same as Spite and Malice?",
      a: "No. Spite and Malice is a different competitive patience game, built around payoff piles. Double solitaire is two Klondike layouts and shared ace-to-king foundations.",
    },
    {
      q: "Who wins if both players get stuck?",
      a: "If you are racing to empty the tableau and stock and both layouts block, the player who has placed more cards on the foundations wins. An equal count is a draw and a redeal.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Klondike (solitaire)",
      url: "https://en.wikipedia.org/wiki/Klondike_solitaire",
    },
    { label: "Pagat: Double Solitaire", url: "https://www.pagat.com/patience/double.html" },
  ],
  related: [
    "solitaire-rules",
    "nertz-rules",
    "kings-corner-rules",
    "52-card-deck",
    "how-to-shuffle-cards",
  ],
  updated: "2026-09-29",
  howTo: true,
};
