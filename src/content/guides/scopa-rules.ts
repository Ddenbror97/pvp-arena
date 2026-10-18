import type { Guide } from "./types";

export const guide: Guide = {
  slug: "scopa-rules",
  cluster: "Games of chance",
  keyword: "scopa rules",
  secondary: ["how to play scopa", "scopa card game", "sette bello", "primiera", "scopa scoring"],
  title: "Scopa Rules: Captures, Scopa and Primiera | PvP Spin Arena",
  description:
    "Scopa rules for the Italian capturing game: the 40-card deck, matching and sums, a sweep for one point, primiera, and the race to 11.",
  h1: "Scopa rules: captures, sweeps and primiera",
  answer:
    "Scopa rules cover an Italian capturing game for two players, or four in partnerships. Use a 40-card Italian deck, or a standard deck with the 8s, 9s and 10s removed, leaving ace through 7 and the face cards. Deal three cards each and four face up. Match a table card of the same rank, or capture table cards that sum to your card. Clearing the table is a scopa and scores one point. At the end of the hand, most cards, most diamonds, the sette bello and the best primiera each score one. First to 11 wins.",
  facts: [
    "The pack has 40 cards: ace through 7 and three faces in each of four suits. Coins map to diamonds.",
    "Two players play head to head. Four players play as two partnerships sitting opposite.",
    "Each deal gives three cards to each player and four face-up cards on the table.",
    "A capture is one table card of the same rank, or a set of table cards that adds up to the card you play.",
    "A scopa, sweeping every table card in one capture, is worth 1 point, except on the last play of the hand.",
    "Hand points are most cards, most coins or diamonds, the 7 of coins, and primiera. Game is 11.",
  ],
  sections: [
    {
      id: "deck",
      title: "The 40-card deck and the players",
      body: `Scopa is one of the Italian national card games, alongside briscola and tressette. The name means broom. You sweep cards off the table.

The traditional pack has 40 cards in the suits of coins, cups, swords and batons. Ranks in each suit are king, horse (cavallo), jack (fante), 7, 6, 5, 4, 3, 2 and ace. A French-suited stand-in is a normal [52-card deck](/guides/52-card-deck) with the 8s, 9s and 10s removed. King, queen and jack replace king, horse and jack. For scoring, coins are diamonds. If you say "diamonds" at a table that is holding an Italian pack, point at the coins once and then use one word for the rest of the night.

Two players is the classic game. Four players play as fixed partners, partners opposite each other, and a partnership keeps one capture pile. Three players is a known variant with a different card layout. This page teaches two and four.

There is no trump. A card's rank matters for matching and for the primiera table, not for beating another card in a trick. If you want a trick game with the same 40-card pack, that is briscola, not this. Scopa is a fishing game: your card takes cards that are already on the table, or it stays on the table itself.

The race to 11 puts it with the other counted card games on the [games of chance](/guides/topics/games-of-chance) topic. A single hand rarely reaches 11. You play several deals.`,
    },
    {
      id: "deal-and-capture",
      title: "The deal and how a capture works",
      body: `[Shuffle](/guides/how-to-shuffle-cards) the 40 cards. Deal three cards to each player, and four cards face up in the center. The rest of the pack is the stock, face down. Players look at their three cards. In a partnership game, you do not show your hand to your partner.

The player to the dealer's right usually leads in Italy, because play is traditionally counter-clockwise. Clockwise play is fine if the whole table uses it. This page assumes counter-clockwise: the player on the dealer's right goes first.

On your turn you play exactly one card from your hand, face up.

- If a table card has the same rank, you may capture that card. Your card and the table card go into your capture pile, face down.
- If no single card matches, you may capture two or more table cards whose ranks add up to the rank of the card you played. Ace is 1. Cards from 2 to 7 count their pips. King, queen or horse, and jack do not take sums. They capture only an equal face.
- If several captures are available, a matching rank takes priority over a sum. If two sums both equal your card and no single match exists, you choose which sum to take.
- If nothing matches, the card you played stays on the table.

You cannot capture some of a matching set and leave a card that would also have been required. You take one legal capture: one equal card, or one summing group.

When all players have empty hands, and cards remain in the stock, deal three more to each player. Do not deal new table cards. The table keeps whatever the last plays left there. Continue until the stock cannot supply another round. The last cards of the stock are dealt in the same way, three at a time, as long as the stock allows a full round. With two players the 40 cards are four on the table plus 36, which is exactly six rounds of three cards each. It comes out even.

Captured cards stay in the player's pile and are not returned to the table. You may look back through your own pile to track diamonds and the 7. You may not look through an opponent's pile.`,
    },
    {
      id: "scopa-point",
      title: "What counts as a scopa",
      body: `If your capture takes the last cards off the table, the table is empty and you score a scopa: 1 point. Mark it immediately. The usual mark is to place one card from that capture face up, sideways, in your pile, so you can count scopas at the end without trusting memory. The rest of the capture goes face down as usual.

The last play of the hand is the exception. Whoever makes the last capture of the deal also takes any cards that remain on the table, because the hand is over. That cleanup is not a scopa, even if it happens to clear the table. A scopa has to be a clear in the middle of the hand, when later players would have had an empty table to play onto.

An empty table changes the next play. The next player has nothing to match, so their card simply starts the table again. They cannot score a scopa on that play, because a single card played onto an empty table does not capture anything.

Example. The table is 2, 3 and ace. You play a 6. No single 6 is there. 2+3+1 = 6, so you take all three cards plus your 6. The table is empty. That is a scopa, unless this was the last card of the hand.

Example that is not a scopa. The table is a king and a 5, you have no match, and you play a 4. The 4 stays. You did not capture, so you did not sweep.

Faces never sum. A jack does not capture a 4 and a 3. A jack captures a jack. Players who treat faces as 8, 9 and 10 are playing a different adding game. Keep faces as match-only.

You can score more than one scopa in a hand. Each one is a separate point. They are the swingy part of the score, which is why leaving three low cards that sum to a 7 is dangerous when the opponent still holds a 7.`,
    },
    {
      id: "hand-points",
      title: "Points at the end of the hand",
      body: `After the last capture, including the leftover table cards which go to the player who took the last trick of captures, score four categories. Each is worth 1 point. A tie in a category scores nothing for anyone.

- Most cards. There are 40. Twenty-one or more wins the point. A 20–20 split scores nothing.
- Most diamonds, or most coins. There are 10. Six or more wins. A 5–5 split scores nothing.
- Sette bello. The 7 of coins, which is the 7 of diamonds in a French pack. Whoever captured it scores 1. There is no tie.
- Primiera. The best prime scores 1.

A prime uses the primiera table. From the cards you captured, take the best card in each of the four suits and add those four values.

| Card | Prime value |
| --- | --- |
| 7 | 21 |
| 6 | 18 |
| Ace | 16 |
| 5 | 15 |
| 4 | 14 |
| 3 | 13 |
| 2 | 12 |
| King, queen or horse, jack | 10 |

You need a card in every suit. A player who is missing a suit cannot beat a player who has all four. If nobody has all four suits, the primiera point is not awarded.

Worked prime. Your best cards are 7 of coins (21), 6 of cups (18), ace of swords (16) and jack of batons (10). Prime = 65. The opponent's best is 7 of cups (21), 5 of coins (15), 7 of swords (21) and 6 of batons (18). Prime = 75. The opponent takes the primiera point. Note that the 7 of coins still gave you the sette bello if you captured it. The same card can help two categories. It does not score twice inside primiera. Only the best card in that suit counts.

Add scopas to these four. A lively hand might be 2 scopas plus cards plus diamonds: 4 points. A quiet hand might be only the sette bello: 1 point.`,
    },
    {
      id: "to-eleven",
      title: "First to 11, with a short example",
      body: `The game is first to 11 points across hands. Some tables play to 21. Eleven is the line this page uses. If both sides cross 11 on the same hand, the higher total wins. A tie at 11 or more plays another hand.

Deal passes to the right if you are playing counter-clockwise, to the player who just led, or simply alternate in a two-player game. Keep a running score in a column: scopas as they happen, then the four end-of-hand points.

A miniature end-of-hand, two players, no scopas, to show the arithmetic. Ada has 22 cards, 6 diamonds, and the 7 of diamonds. Her prime is 7, 6, ace and 5 in the four suits: 21+18+16+15 = 70. Ben has 18 cards, 4 diamonds, and a prime of 7, 7, 6 and king: 21+21+18+10 = 70.

- Cards: Ada, 1.
- Diamonds: Ada, 1.
- Sette bello: Ada, 1.
- Primiera: tie at 70, 0.

Ada scores 3 for the hand. Ben scores 0. Scopas would be added on top of this if any card in Ada's pile had been turned sideways to mark one.

Partnerships pool captures. You do not score "most cards" per player. You score it per side. Partners may talk about what is on the table. They do not name the cards in their hands. A card played that captures badly can be the right play if it stops the opponents' scopa.

Count the capture piles at the end. The two piles plus any marked scopa cards must be 40. If you are short, a card is under the stock or still on the table and was not taken with the last capture. Fix the count before you award most-cards, because one missing diamond changes two points at once.

[Thirty-one](/guides/31-card-game) scores one suit in hand. Scopa scores captures on the table. Say the total aloud before the next shuffle.`,
    },
    {
      id: "variants",
      title: "Variants worth naming, and stakes",
      body: `Scopa has many local forms. Name any of these before the deal.

- Scopa d'assi. A capture with an ace is not a scopa.
- Napola. The 3, 2 and ace of coins in one pile score an extra point.
- Game to 21 instead of 11.
- Faces counting as 8, 9 and 10 so they can form sums. This page keeps faces as equal-rank captures only.

Remember which diamonds are out and whether the 7 of coins is still unseen. Leaving the table full of small cards when you still hold a 7 is how you give away a scopa.

Money play is optional and is between the players. A point can be worth an agreed unit, settled at 11. Adults only, 18+. There is no house edge in the rules. The [fairness](/fairness) page explains how an online round's seeds are opened after the result. It does not deal this deck. If you want the card game, shuffle in view of both players and count to 40 before the first deal, every time the 8s, 9s and 10s have been taken out of a 52-card pack and might have been put back.

A clean pack check is ace through 7 plus three faces, four suits, no 8, no 9, no 10. Forty cards. Then deal three, three, and four on the table.

See also [briscola](/guides/briscola-rules) and [cribbage](/guides/cribbage-rules).`,
    },
  ],
  faqs: [
    {
      q: "How do you play scopa?",
      a: "Deal three cards each and four face up, from a 40-card deck. Play one card to capture a table card of the same rank, or table cards that sum to your card. A capture that clears the table is a scopa. At the end, score most cards, most diamonds, the 7 of diamonds and primiera. First to 11 wins.",
    },
    {
      q: "Which cards are removed for scopa?",
      a: "From a standard deck, remove all 8s, 9s and 10s. You play with aces through 7s, jacks, queens and kings. In an Italian pack those faces are jack, horse and king, and diamonds are coins.",
    },
    {
      q: "What is the sette bello?",
      a: "The 7 of coins, or the 7 of diamonds if you are using a French-suited deck. The player who captures it scores one point at the end of the hand.",
    },
    {
      q: "How does primiera scoring work?",
      a: "Take your best captured card in each suit. A 7 is worth 21, a 6 is 18, an ace is 16, a 5 is 15, a 4 is 14, a 3 is 13, a 2 is 12, and a face card is 10. The higher total wins one point. You need all four suits.",
    },
    {
      q: "Does the last play of the hand count as a scopa?",
      a: "No. The player who makes the last capture takes the remaining table cards as cleanup. That clear is not a scopa. A scopa is a clear earlier in the hand, while play will continue.",
    },
  ],
  sources: [
    { label: "Wikipedia: Scopa", url: "https://en.wikipedia.org/wiki/Scopa" },
    { label: "Pagat: Scopa", url: "https://www.pagat.com/fishing/scopa.html" },
  ],
  related: [
    "briscola-rules",
    "cribbage-rules",
    "31-card-game",
    "52-card-deck",
    "how-to-shuffle-cards",
  ],
  updated: "2026-09-29",
  howTo: true,
};
