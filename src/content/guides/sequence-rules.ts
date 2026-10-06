import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sequence-rules",
  cluster: "Games of chance",
  keyword: "sequence rules",
  secondary: [
    "how to play sequence",
    "sequence board game",
    "one eyed jack sequence",
    "sequence card game",
    "jax sequence",
  ],
  title: "Sequence Rules: Chips, Jacks, Rows | PvP Spin Arena",
  description:
    "Sequence rules from the Jax board: two decks, five chips in a row, one-eyed jacks remove, two-eyed jacks are wild, and dead cards are discarded.",
  h1: "Sequence rules: five chips in a row on the Jax board",
  answer:
    "Sequence rules are the Jax Ltd board game, now sold by Goliath. You play two standard decks, 104 cards, on a board that shows two of every card except the jacks. Jacks are not printed on the board. Two-eyed jacks are wild. One-eyed jacks remove an opponent's chip. Deal 7 cards with 2 players, 6 with 3 or 4, 5 with 6, and fewer at the larger legal tables. Play a card, put a chip on a matching space, and draw back up. Five in a row is a sequence. You cannot remove a chip that is already part of a completed sequence. A dead card, with both spaces covered, can be discarded.",
  facts: [
    "Legal tables are 2, 3, 4, 6, 8, 9, 10, or 12 players. More than three players must be in teams.",
    "Two players or two teams need two sequences to win. Three players or three teams need one.",
    "The printed deal is 7, 6, 6, 5, 4, 4, 3, 3 cards for 2, 3, 4, 6, 8, 9, 10, and 12 players.",
    "One-eyed jacks are hearts and spades. They remove an opponent chip that is not in a finished sequence.",
    "Two-eyed jacks are diamonds and clubs. They place your chip on any open space.",
    "The four corner spaces are shared bonus spaces. Four of your chips plus a corner is a sequence.",
  ],
  sections: [
    {
      id: "equipment",
      title: "Board, decks, and who can sit down",
      body: `Sequence is a board game that uses cards as the permission to place a chip. Douglas Reuter invented it. Jax Ltd published it in the 1980s, and Goliath later bought Jax. The sheet in the box is the authority. This page follows that printed game, not a homemade one-eyed-jack layout and not a phone clone with extra powers.

You need the board, two decks (104 cards), and chips in three colors. The board shows two copies of every rank and suit from a normal deck except the jacks. Jacks are in the hand and in the discard. They are not spaces you can cover by matching a jack. The four corners are printed bonus spaces, not card pictures.

Player counts that divide evenly into teams of the legal sizes are 2, 3, 4, 6, 8, 9, 10, and 12. Up to three people may play as individuals. More than three must split into teams, and the sheet allows at most three teams. Five, seven, and eleven are not printed counts. Do not deal them "just to include someone" unless you are inventing a house game on purpose.

Teammates alternate seats. In a two-team game, opponents sit between partners. In a three-team game, every third seat is your side. Table talk is an optional strict rule on the sheet: if a teammate coaches, that team discards one card each. Use it or do not. Do not invent it after someone points at a space.

The cards are ordinary ranks. If you have never sorted a [52-card deck](/guides/52-card-deck), do that once so the doubled ranks on this board make sense. Sequence is a placement game in the [games of chance hub](/guides/topics/games-of-chance), closer to a race for a line than to [rummy](/guides/how-to-play-rummy).`,
    },
    {
      id: "deal",
      title: "The deal and a legal turn",
      body: `Cut for dealer. Aces are high for the cut. The dealer shuffles. With two decks, one lazy riffle is not a mix. [How to shuffle cards](/guides/how-to-shuffle-cards) still applies, and you should mix the two decks together, not as two intact piles.

Deal the same number to each player. The printed counts are:

| Players | Cards each | Usual sides |
| --- | --- | --- |
| 2 | 7 | Individuals, two sequences to win |
| 3 | 6 | Individuals, one sequence to win |
| 4 | 6 | Two teams of two, two sequences to win |
| 6 | 5 | Two teams of three, or three teams of two |
| 8 | 4 | Two teams of four, two sequences to win |
| 9 | 4 | Three teams of three, one sequence to win |
| 10 | 3 | Two teams of five, two sequences to win |
| 12 | 3 | Two teams of six, or three teams of four |

Six players can be two teams or three, and so can twelve. The deal count stays the same either way. The win condition follows the number of teams, not the head count. Two sides need two sequences. Three sides need one. Read that twice. A full table of strangers often plays one-sequence rules at a two-team table and ends the game at the first row.

The rest of the cards are a face-down draw pile. The player left of the dealer starts, and play goes clockwise.

A normal turn is three beats:

1. Play one card face up onto your own discard pile, where everyone can see it.
2. Place one of your chips on a matching open space. Each non-jack card appears twice. Either copy is legal if it is empty.
3. Draw one card so your hand returns to its starting size.

If you forget the draw, and the next player plays a card and draws before anyone notices, the sheet says you lose the right to that card and finish with a short hand. Draw before you let go of the turn.

You do not place a chip and also play a second card. One card, one chip action, one draw.`,
    },
    {
      id: "jacks",
      title: "Jacks, corners, dead cards, and locked rows",
      body: `Jacks are the only cards that do not hunt for a printed twin.

**Two-eyed jacks** are wild. On a standard deck those are the jack of diamonds and the jack of clubs, and each deck has one of each, so the 104-card pack has four two-eyed jacks. Play the jack to your discard and put your chip on any open space that is not a corner bonus. Corners are not filled with chips.

**One-eyed jacks** are the jack of hearts and the jack of spades, four of them in the doubled pack. They are anti-wild. Play the jack and remove one opponent chip from the board. That removal is the whole chip action. You do not put your own chip on the space you just cleared in the same turn. You still draw a replacement card. You cannot remove your own chip. You cannot remove a chip that is already part of a completed sequence. Once a sequence is finished, those chips are locked. An optional advanced rule on the sheet lets you break a finished sequence. Do not use it unless every player heard it before the first chip.

**Corners** count as a chip of every color at once. A sequence that uses a corner needs only four of your chips. Two teams may count the same corner in their own rows. Nobody covers the corner with a plastic chip.

**Dead cards.** If both printed copies of a card are already covered, that card cannot be played. On your turn, discard one dead card, say that you are turning it in, and draw a replacement. The sheet allows one such exchange, and then you still take your normal turn: play a live card, chip, and draw again. A dead card is not a loss. It is a wasted slot until you trade it.

A sequence is five of your chips in a straight line: across, down, or diagonal. Four chips plus a corner also count. In a game that needs two sequences, you may reuse one space from the first sequence in the second. A straight line of nine of your chips is two sequences. You may not build the second sequence entirely out of chips that are already locked in the first, beyond that single shared space.`,
    },
    {
      id: "example",
      title: "A turn that uses a jack and a dead card",
      body: `Four players, two teams, six cards each, two sequences required. You are on green. Blue has four chips in a diagonal and one empty space that would finish it. You hold the jack of spades, the ten of hearts, and a king of clubs whose two board spaces are both already full.

Start with the dead king. Discard it, announce the dead card, and draw. Suppose you draw the five of diamonds, which still has an open copy. The dead-card trade did not replace your turn.

You could play the five and chip a useful green space, or you could spend the one-eyed jack. Blue's fourth chip is not in a finished sequence yet, so the jack can take it. You play the jack of spades, lift that blue chip, and draw. You do not drop a green chip into the hole. Blue's diagonal is now three connected chips plus a gap. Your turn is over.

If you had waited one round and Blue had completed the five, the jack could not touch any chip in that row. That is why a one-eyed jack is better spent on the chip that would finish a line than on a random chip in the open. A two-eyed jack, the jack of diamonds or clubs, would have let you fill the gap for your own second sequence instead of deleting theirs. Different jack, opposite job.

Next time around, both hearts tens might be covered. The ten of hearts in your hand would then be dead, and you would trade it at the start of the turn before you play. Do not play it to the discard and stare at the board. There is nowhere legal to put the chip, and a chip placed on the wrong copy of a different card is a misplay, not a wild.

Call the sequence when you make it. The sheet's optional announcement rule says an unannounced row does not count until your next turn. If you are not using that option, the five chips count as soon as the fifth one lands.`,
    },
    {
      id: "win",
      title: "Winning, team count, and house rules to refuse",
      body: `Check the win condition against the number of sides, then play until someone hits it.

- Two players, or two teams: the first side to complete two sequences wins.
- Three players, or three teams: the first side to complete one sequence wins.

You do not drop out for an empty hand. Draw back up until the draw pile runs out, then shuffle the discards. A side that cannot place a chip can still play a jack or trade a dead card.

House rules that change the box, and should be agreed or refused up front:

- Playing to fill the whole board and scoring one point per sequence.
- Letting one-eyed jacks break a finished sequence (the printed "advanced" option).
- Putting a chip on a corner by skipping a turn. The printed corners are free for every color and are not claimed.
- Allowing table talk. The printed alternative is a one-card penalty for coaching.

Saving a two-eyed jack until it completes a line is the main skill. Spending it on a random center space is how a team loses a race it had already drawn.

Adults sometimes stake a small amount on the match. Gambling is for adults only (18+, or the legal age where you live). Agree the stake before the cut.`,
    },
    {
      id: "stakes",
      title: "A locked row and a hashed PvP round",
      body: `The board is visible and the next card is not. You can see that Blue needs one space. You cannot see whether Blue holds that space or a two-eyed jack. A one-eyed jack removes the blocking chip only before the row is locked. At 10 or 12 players a hand is three cards, so one jack is a large share of it. [Bourré](/guides/bourre-card-game) hides a similar swing inside a trump bid.

PVPspinArena does not sell Sequence. It runs Jackpot, [Coinflip](/coinflip) and Roulette for adults 18+ only, in USDC or ETH on Base. Coinflip is a 50/50 between two players. Roulette returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee on a 33-slot wheel, a 7.88 percent on Purple or Silver after the win fee edge. Jackpot pays a shared pot in proportion to your share. Seeds are committed first. A settled round can be checked on the [fairness](/fairness) page.

There is no jack to save and no corner to share. If the session turns into chasing the last result, use the limits on the [responsible gambling](/responsible-gambling) page. A second Sequence game will not unwind a coin.

See also [klondike solitaire](/guides/solitaire-rules), [crazy eights](/guides/crazy-eights-rules) and [kings in the corner](/guides/kings-corner-rules).`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you deal in Sequence?",
      a: "The Jax sheet deals 7 cards to 2 players, 6 to 3 or 4 players, 5 to 6 players, 4 to 8 or 9 players, and 3 to 10 or 12 players.",
    },
    {
      q: "What do the jacks do in Sequence?",
      a: "Two-eyed jacks, diamonds and clubs, place your chip on any open space. One-eyed jacks, hearts and spades, remove an opponent chip that is not already part of a completed sequence.",
    },
    {
      q: "How many sequences do you need to win?",
      a: "Two players or two teams need two sequences. Three players or three teams need one. A sequence is five chips in a row, and a corner can stand in for one of them.",
    },
    {
      q: "Can you remove a chip from a finished sequence?",
      a: "Not in the base game. A completed sequence is locked. An optional advanced rule allows it. Agree that rule before anyone plays a chip.",
    },
    {
      q: "What is a dead card in Sequence?",
      a: "A card whose two board spaces are both covered. On your turn you may discard one dead card, draw a replacement, and then take a normal turn.",
    },
  ],
  sources: [
    { label: "Wikipedia: Sequence (game)", url: "https://en.wikipedia.org/wiki/Sequence_(game)" },
    { label: "Pagat: One-Eyed Jack", url: "https://www.pagat.com/misc/jack.html" },
  ],
  related: [
    "solitaire-rules",
    "crazy-eights-rules",
    "kings-corner-rules",
    "52-card-deck",
    "how-to-shuffle-cards",
  ],
  howTo: true,
  updated: "2026-09-29",
};
