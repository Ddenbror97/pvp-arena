import type { Guide } from "./types";

export const guide: Guide = {
  slug: "solitaire-rules",
  cluster: "Games of chance",
  keyword: "solitaire rules",
  secondary: [
    "klondike solitaire",
    "turn 3 solitaire",
    "solitaire foundations",
    "how to play solitaire",
    "solitaire redeal",
  ],
  title: "Klondike Solitaire Rules and Redeals | PvP Spin Arena",
  description:
    "Solitaire rules for Klondike: seven columns, a 24-card stock, four suit foundations, turn one or turn three, and how many times you may redeal.",
  h1: "Solitaire rules: Klondike columns, stock and foundations",
  answer:
    "Solitaire rules in the United States almost always mean Klondike. Deal seven columns with 1, 2, 3, 4, 5, 6 and 7 cards, the top card of each column face up. The other 24 cards are the stock. Build four foundations from ace to king by suit, and build the columns down in alternating colors. Turn the stock one card at a time or three at a time. A king fills an empty column. You win when every card sits on a foundation.",
  facts: [
    "Klondike uses one 52-card deck: 28 cards in the tableau and 24 in the stock.",
    "Columns hold 1 through 7 cards. Only the top card of each column starts face up.",
    "Foundations build ace to king in one suit. Tableau builds down, red on black and black on red.",
    "Only a king, or a face-up sequence headed by a king, may fill an empty column.",
    "Turn-three digital games often allow three passes through the stock. Many home games allow unlimited redeals.",
    "Freecell and Spider are different solitaires. This page does not teach their layouts.",
  ],
  sections: [
    {
      id: "layout",
      title: "The Klondike layout",
      body: `Solitaire, said with no other name, means Klondike in the US and Canada. In Britain the same layout is often just called Patience. You need one [52-card deck](/guides/52-card-deck), shuffled, with jokers removed. A clean shuffle matters even when you are playing alone, because a poor mix repeats the same blocked deals. The usual benchmark is in [how to shuffle cards](/guides/how-to-shuffle-cards).

Deal seven columns from left to right:

1. Column 1 gets 1 card, face up.
2. Column 2 gets 2 cards. The first is face down, the top is face up.
3. Continue until column 7 has 6 face down and 1 face up.

That is 28 cards. The remaining 24 go face down as the stock, usually at the upper left. Leave space to the right of the stock for the waste, and space at the upper right for four foundations. The foundations start empty. Nothing is dealt to them.

The face-down cards are the puzzle. You cannot look at them. You turn a face-down card up only when you have played the face-up card that covered it. Klondike sits with the other kitchen-table games in the [games of chance hub](/guides/topics/games-of-chance). It is a one-player packer, not a trick game like [Spades](/guides/how-to-play-spades).`,
    },
    {
      id: "building",
      title: "How to build columns and foundations",
      body: `Two building rules run the whole game. Learn them before you touch the stock.

**Foundations.** Each foundation is one suit, built up from ace to king. The ace of hearts starts the hearts foundation, then the two of hearts, and so on up to the king of hearts. You may not start a foundation with anything but an ace, and you may not put a diamond on a heart pile.

**Tableau.** On the columns, build down, and alternate colors. A red six may take a black five. A black five may take a red four. A red card never sits on a red card. Suits do not have to match on the tableau. Only the color has to switch.

You may move a whole face-up sequence if the card at the bottom of that sequence (the highest rank in it) is a legal play on the destination. Example: a black 7 with a red 6 and a black 5 on it can move onto a red 8, because the 7 is one rank lower than the 8 and the opposite color. You cannot pull the red 6 out from under the black 5. You cannot move a face-down card.

When a move uncovers a face-down card, turn that card up at once. It becomes the new top of the column and can be played on your next decision.

An empty column may be filled only by a king, or by a face-up sequence whose highest card is a king. A queen will not open a space. Parking a king early feels tidy and often buries the only card that could have freed a column later. Hold the king until the space is doing work.

You may move the top card of a foundation back to the tableau if it fits the color rule. That is legal. It is also how players undo a foundation play that trapped a king. The win condition does not change: all 52 cards on the four foundations, each running ace through king in suit.`,
    },
    {
      id: "stock",
      title: "Turn one, turn three, and redeal limits",
      body: `The stock is where most rule arguments start. Agree the turn and the redeal limit before the first card is dealt. Only the top card of the waste is playable. You cannot rifle through the waste to find a card you liked earlier.

**Turn one.** Flip one card from the stock onto the waste, face up. Play it to a column or a foundation, or leave it and flip the next. When the stock is empty, turn the waste face down, without shuffling, and it becomes the stock again. That full cycle is one pass.

**Turn three.** Flip three cards at once onto the waste. Only the top one is available. If you play it, the card that was under it is now available, and you may play that one too before you flip again. You do not get to choose which of the three you wanted. When fewer than three cards remain in the stock, flip those that are left.

Redeals are not the same in every edition:

| Version | Cards flipped | Passes through the stock |
| --- | --- | --- |
| Home turn one | 1 | Often unlimited |
| Strict turn one | 1 | One pass, then the game is stuck |
| Home turn three | 3 | Often unlimited |
| Common digital turn three | 3 | Three passes, then the stock locks |
| Some digital turn one | 1 | Three passes, with a score penalty on each recycle |

Microsoft's draw-three Solitaire is the source of the "three passes" habit. Many families never picked that limit up and keep turning until no move remains. A one-pass game is much harder, because a card buried third in a group of three may never surface. If you are comparing two deals, write the rule on the score sheet. "I almost won" under unlimited redeals is a different game from three passes.

When the stock is exhausted and you recycle, do not shuffle. The waste is turned over as a block, so the order is reversed. That reversal is why a card you could not use on one pass can become the top card on the next.`,
    },
    {
      id: "example",
      title: "A short Klondike example",
      body: `Suppose the face-up cards, left to right, are K♣, 6♥, A♦, 5♠, Q♥, 9♣, 2♠. The stock has not been touched.

The ace of diamonds goes to a foundation immediately. That uncovers whatever sat under it in column 3. Say that card is the 4♥. The 4♥ can move onto the 5♠, because red goes on black and the rank drops by one. If that move uncovers a face-down card, turn it up.

The 2♠ cannot go to a foundation yet, because the ace of spades is still buried. The Q♥ can move onto the K♣: a red queen on a black king is a legal drop of one rank. Do it if the card under the queen is more useful face up than a red queen sitting in place. If that card is face down, moving the queen turns it up, which is usually the point.

Now turn the stock. Turn one shows a 3♥. It does not fit the 4♥ (wrong direction) and it does not fit an empty foundation. Leave it on the waste. The next flip is the A♠. Start the spades foundation, then the 2♠ can come up from column 7.

Turn three would have shown those two cards plus a third, and you would have been allowed to use only the third card until you played it. If the third card was a useless 9♦, the A♠ would be stuck under it until a later pass. That is the entire practical difference between the two turns. Same layout, different cards available.

Empty column 1 only after you have a plan for the king that must refill it. If the K♣ is the only king you can see, moving it out of column 1 just to "make a space" strands you with a hole you cannot fill.`,
    },
    {
      id: "other-games",
      title: "Freecell, Spider, and what to agree",
      body: `Two other solitaires get called "solitaire" in apps. They are not Klondike, and this page does not give their full rules.

Freecell deals the whole deck face up, usually into eight columns, and gives you four empty cells as parking spots. There is no stock. Spider uses two decks. You build down in suit, and a complete king-to-ace run in one suit leaves the table. If a rules sheet starts talking about free cells or about removing a suited run, you have left Klondike.

Settle these Klondike choices out loud:

- Turn one or turn three.
- How many passes before the stock locks.
- Whether a sequence may move only when every card in it is the same suit (a strict old rule) or whenever the colors already alternate (the usual modern rule). This page uses the modern rule.
- Whether you may take a card back off a foundation. The usual answer is yes.

Published win rates are bounds, not a promise. Mathematician Persi Diaconis has called the exact chance of winning ordinary Klondike one of the open embarrassments of applied probability. A fully visible variant called Thoughtful Klondike, draw three, has been estimated near 82 percent winnable. Hidden-card turn-three is harder. Computer searches have posted lower bounds from the high teens into the mid-30s, depending on the program, and one skilled human sample won 189 of 442 games, about 43 percent. Turn one is easier than turn three because you see every stock card in order. None of those figures is a strategy you can force on a single deal.

Some casinos have offered a paid one-pass Klondike, sometimes called Las Vegas solitaire, that pays a fixed amount per card you get onto the foundations. That is a banking game with a price, not the kitchen-table puzzle. Gambling is for adults only (18+, or the legal age where you live). Agree any stake before you deal, and keep it small enough that a lost game is the end of the story.`,
    },
    {
      id: "chance",
      title: "What the shuffle decides, and a hashed coin",
      body: `Once the deck is shuffled, Klondike is a puzzle with hidden information, not a bet you can talk up. You will lose some deals no matter the order of your moves. You will also lose winnable deals by burying the wrong king or by filling a foundation too soon. The skill is the order of moves. The chance is the shuffle. If you want a number you can check, write down the turn rule and the redeal limit first. A turn-three, three-pass loss and a turn-one unlimited win are not the same experiment.

The same split shows up in dice games. [Farkle](/guides/farkle-rules) lets you choose when to bank. [Yahtzee](/guides/yahtzee-rules) lets you choose which box to fill. Klondike lets you choose which legal move to make, and then the face-down cards answer. None of the three removes the shuffle or the dice.

PVPspinArena is a different kind of chance. It runs Jackpot, [Coinflip](/coinflip) and Roulette in USDC or ETH on Base, for adults 18+ only. A Coinflip is a 50/50 between two players. Roulette is a 33-slot wheel. Purple and Silver return 32/33 before the win fee, about a 7.88% edge after it, and Green returns 14/33. Jackpot pays from a shared pot, with a win chance equal to your share. Seeds are committed before the round. Any settled round can be checked on the [fairness](/fairness) page. There is no tableau to solve and no redeal to argue about.

If a session stops being a game and starts being a chase, stop. The [responsible gambling](/responsible-gambling) page has limits and tools. A second deal of Klondike will not repair a loss on a coin.

See also [double solitaire](/guides/double-solitaire), [nertz](/guides/nertz-rules) and [kings in the corner](/guides/kings-corner-rules).`,
    },
  ],
  faqs: [
    {
      q: "What are the basic solitaire rules?",
      a: "For Klondike, deal seven columns of 1 through 7 cards with the top card face up, and put the other 24 cards in the stock. Build foundations from ace to king by suit, and build columns down in alternating colors. A king fills an empty column. Turn the stock one or three cards at a time.",
    },
    {
      q: "How many times can you go through the deck in solitaire?",
      a: "It depends on the rule you agreed. Many home games allow unlimited passes. Draw-three digital solitaire often stops after three passes. A strict one-pass game is harder and is a different bargain.",
    },
    {
      q: "Can you put any card in an empty solitaire column?",
      a: "No. Only a king, or a face-up sequence that starts with a king, may fill an empty column in standard Klondike.",
    },
    {
      q: "Is Freecell the same as Klondike?",
      a: "No. Freecell deals every card face up and uses empty cells as parking spots. Spider uses two decks and removes suited king-to-ace runs. This page teaches Klondike only.",
    },
    {
      q: "What is the difference between turn one and turn three?",
      a: "Turn one flips a single stock card onto the waste. Turn three flips three, and only the top waste card can be played until you use it. Turn three hides more cards between passes.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Klondike (solitaire)",
      url: "https://en.wikipedia.org/wiki/Klondike_(solitaire)",
    },
    { label: "Wikipedia: Patience (game)", url: "https://en.wikipedia.org/wiki/Patience_(game)" },
  ],
  related: [
    "double-solitaire",
    "nertz-rules",
    "kings-corner-rules",
    "golf-card-game-rules",
    "52-card-deck",
  ],
  howTo: true,
  updated: "2026-09-29",
};
