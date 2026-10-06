import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cribbage-rules",
  cluster: "Games of chance",
  keyword: "cribbage rules",
  secondary: [
    "how to play cribbage",
    "cribbage scoring chart",
    "cribbage board 121",
    "his nobs cribbage",
    "cribbage crib",
  ],
  title: "Cribbage Rules: Pegging, the Crib and 121 | PvP Spin Arena",
  description:
    "Cribbage rules for the six-card game: the crib, the starter, pegging to 31, the show, nobs and heels, and the 121-point board.",
  h1: "Cribbage rules: the crib, pegging and the show to 121",
  answer:
    "Cribbage rules for the standard game are two players, one 52-card deck, and a board to 121. Deal 6 cards each. Each player discards 2 cards into the crib, which belongs to the dealer. The non-dealer cuts a starter. If the starter is a jack, the dealer pegs 2 for his heels. Players then peg by playing cards without passing 31. After the play, each hand and the crib are scored with the starter: 15s for 2, pairs for 2, a pair royal for 6, a double pair royal for 12, and a run of n for n points. A jack of the starter's suit in hand is 1 for his nobs.",
  facts: [
    "Standard cribbage is two players. Three- and four-player forms deal 5 cards and still build a four-card crib.",
    "Deal 6, discard 2 to the dealer's crib, then cut a starter. His heels: a jack starter scores 2 for the dealer.",
    "During the play, 15 scores 2, a pair scores 2, a pair royal scores 6, a double pair royal scores 12, and a run of n scores n.",
    "His nobs is 1 point for a jack of the starter's suit in a hand or in the crib. A hand flush of four scores 4; the crib flush scores only as five cards.",
    "Game is 121. A skunk is reaching 121 before the opponent reaches 91. A double skunk, before they reach 61, is optional.",
    "The highest hand is 29: three 5s and the jack of the starter 5's suit, with that 5 cut. It shows up about 1 deal in 216,580.",
  ],
  sections: [
    {
      id: "deal",
      title: "The deal, the crib and the starter",
      body: `Cribbage is a two-player card game with a small board and a lot of addition. You score in two stages: the play, called pegging, and the show, when hands are counted. The dealer also owns an extra hand, the crib, made from cards both players throw away.

Use one [52-card deck](/guides/52-card-deck). Jokers out. Aces count 1. Kings, queens and jacks count 10 during pegging and in the show. The 10 counts 10. Suits matter for flushes and for one jack. They do not matter for 15s, pairs or runs.

Cut for the first deal. Lowest card deals. Ace is low. After that, the deal alternates. The dealer has an edge, because the crib is theirs, so an odd number of deals in a game to 121 gives the first dealer one extra crib. Take that seriously when you cut.

### Six-card deal

The dealer deals 6 cards each, one at a time, starting with the non-dealer. Each player discards 2 cards face down into the crib and keeps 4. The crib has 4. Neither player looks at it until the show.

The non-dealer throws cards that are unlikely to score together, because the crib will score for the dealer. The dealer can throw a pair or a 5 with a 10 on purpose.

The non-dealer cuts the undealt pack, leaving at least 4 cards in each portion under tournament rules. The dealer turns the top card of the lower portion. That starter counts later with both hands and with the crib. If it is a jack, the dealer pegs 2 immediately for **his heels**, also called nibs. The game can end on that cut if the dealer is on 119 or 120.

Cribbage lives in the [games of chance hub](/guides/topics/games-of-chance) with the other short deck games. It is closer to a scoring race than to a trick game like [euchre](/guides/how-to-play-euchre).`,
    },
    {
      id: "pegging",
      title: "Pegging: 15s, pairs, runs and 31",
      body: `The non-dealer plays the first card, face up, and says its value. Players alternate. You may not play a card that would push the running count past 31. If you cannot play, say "go." If your opponent also cannot play, they peg 1 for the go, unless the count is already 31, which scores 2. The count then resets to 0, and the player who did not play the last card leads the next series. When the count resets, pairs and runs from the old series are dead.

You must play if you have a legal card. You choose which legal card. Score as the card hits the table:

| Play | Points |
| --- | --- |
| Count reaches exactly 15 | 2 |
| Count reaches exactly 31 | 2 |
| Pair (same rank as the card just played) | 2 |
| Pair royal (third card of that rank) | 6 |
| Double pair royal (fourth of that rank) | 12 |
| Run of n cards, in any order | n |
| Last card of a series that is not 31 | 1 |

A card can score more than one line. Three 5s in a row: the third 5 scores 2 for 15 and 6 for a pair royal.

Runs ignore lay order. Play 4, then 6, then 5 and the 5 completes a run of 3. A pair breaks a run. After a reset, start clean.

### A pegging example

Non-dealer leads 7 (count 7). Dealer plays 8 (count 15, peg 2). Non-dealer plays 8 (count 23, pair for 2). Dealer plays 8 (count 31, pair royal for 6, and 31 for 2). Dealer pegs 8 on that card. The series is over. If either player still holds cards, the next series starts at 0.

Peg as you score, moving the rear peg ahead of the front peg. If a peg reaches 121 during the play, the game ends before the show.`,
    },
    {
      id: "show",
      title: "The show: 15s, runs, flushes, nobs",
      body: `After every card has been played, count the hands. The non-dealer counts first, then the dealer, then the crib. That order matters. A non-dealer who pegs to 121 during the show wins before the dealer counts a larger hand.

The starter counts as a fifth card with each hand and with the crib. You score every combination, and the same card may sit in several combinations.

- Every distinct group of cards that sums to 15 scores 2. Ace is 1, face cards are 10.
- A pair scores 2. Three of a kind, a **pair royal**, scores 6, because it contains three pairs. Four of a kind, a **double pair royal**, scores 12, because it contains six pairs.
- A run of n scores n. If a pair sits inside the run, each distinct run scores. A double run of three, such as 6-7-7-8, is two runs of 3 plus a pair: 8 points, before any 15s.
- A flush of four cards in a hand scores 4, and 5 if the starter matches that suit. A four-card flush in the crib scores nothing. The crib scores a flush only when all five cards, starter included, share a suit, and then it is 5.
- **His nobs** is 1 point for holding the jack of the same suit as the starter. It counts in a hand or in the crib. It is not the same score as his heels. Heels was the 2 the dealer already pegged if the starter itself was a jack.

### A 24-point hand, counted out loud

Hand: 4, 5, 6, 6. Starter: 5.

- Pair of 6s = 2. Pair of 5s = 2.
- Fifteens: 4+5+6 = 15, and each 5 combines with each 6, so 2 × 2 = 4 fifteens = 8.
- Runs: 4-5-6, and each 5 combines with each 6, so four runs of 3 = 12.

Total 2 + 2 + 8 + 12 = 24. Players often call the run portion and then add the fifteens.

The maximum is 29: jack and three 5s in hand, starter the fourth 5 of the jack's suit. That is four jack-and-5 fifteens (8), four combinations of three 5s (8), a double pair royal (12), and his nobs (1). Scores of 19, 25, 26 and 27 cannot occur. A hand that scores 0 is called a nineteen, because 19 is impossible.

The non-dealer counts first. Do not count the crib early.`,
    },
    {
      id: "board",
      title: "The 121 board, skunks and the 29",
      body: `The game ends the moment a player reaches 121, whether that point arrives on his heels, during pegging, or during the show. You do not have to land exactly. You do not keep counting after 121.

A standard board records 121 as 60 holes out, 60 holes back, and one game hole, grouped in fives. Each player has two pegs. The rear peg jumps ahead by the points just scored. In serious play, a missed score the opponent spots can be claimed by the opponent. That call is muggins. Kitchen cribbage usually lets you keep a miss. Say whether muggins is on.

### Skunks

If you reach 121 before your opponent reaches 91, you have skunked them. A double skunk is reaching 121 before they reach 61, and a triple skunk before 31 exists at some tables. Double and triple skunks are optional. American Cribbage Congress tournament match scoring pays a premium at the 91 line and does not require double-skunk points. If the stake depends on 61, write that down. Home games use it often. Official sheets often do not.

### How rare 29 is

About 1 deal in 216,580 gives a given player a 29: the six cards include a jack and the three 5s of the other suits (4,324 such deals out of 20,358,520), and the cut is the remaining 5. Discarding toward a 29 donates the crib.`,
    },
    {
      id: "three-four",
      title: "Three players, four players and the older five-card game",
      body: `Two players is the standard game this page teaches. The other counts change the deal and keep the same scoring table.

| Players | Dealt | Thrown to the crib | Notes |
| --- | --- | --- | --- |
| 2 | 6 each | 2 each | Crib starts empty. This is the main game. |
| 3 | 5 each, plus 1 dealt to the crib | 1 each | Crib still ends with 4 cards. Dealer owns it. |
| 4 | 5 each | 1 each | Two partnerships. Partners sit opposite and peg on one track. |

Four-player cribbage is a partnership game to 121, same as two-player, unless you agree a shorter game to 61. Pegging still alternates around the table, and you still may not pass 31. The non-dealing partnership counts first.

Five-card cribbage is the older game, still played in parts of Britain. Deal 5, discard 2, and each hand has 3 cards. The non-dealer is often given a start of 3 points. Pegging runs up to 31 only once and does not reset. Game is 61. His nobs, his heels, 15s, pairs and runs use the same point values. If someone taught you "five cards and once round the board," they mean this game, not a mistaken six-card deal.

### What to throw

Keep a 5. Ten-value cards make 15s with it, and they are common. The non-dealer should not throw a pair or a jack into the dealer's crib. The dealer can throw a connecting pair on purpose.

[Pitch](/guides/pitch-card-game) is the other classic that scores a jack. In pitch the jack of trump is a point by itself. In cribbage the jack scores as heels, as nobs, as a 10, or inside a run.`,
    },
    {
      id: "table",
      title: "Stakes, pace and what the board is not",
      body: `A game to 121 is often nine to twelve deals. The first dealer gets one extra crib if the game ends on an odd deal. Alternate the opening deal across a match and that edge washes out.

If you play for money, agree the unit before the cut. A common home stake is one unit for a win and double for a skunk at 91. Gambling is for adults, 18 or older, or the legal age where you live. Set a stop before you sit down. The [responsible gambling](/responsible-gambling) page is the limit list.

Count fifteens, then pairs, then runs, then the flush, then nobs. The rear peg shows the jump you just claimed. The starter is one cut. Both players then score that same fifth card, which is why the discard, made before the cut, cannot be taken back.

For another use of the same deck, [oh hell](/guides/oh-hell-card-game) is a bidding trick game with a shrinking hand. Cribbage stays at 6 cards dealt, 4 kept, until someone pegs the game hole. Count the deck back to 52. A crib card left under the board shorts the next deal.

See also [hearts](/guides/hearts-card-game-rules) and [pinochle](/guides/pinochle-rules).`,
    },
  ],
  faqs: [
    {
      q: "What are the basic cribbage rules for two players?",
      a: "Deal 6 cards each. Each player discards 2 into the dealer's crib. Cut a starter. Peg by playing cards without passing 31, scoring 15s, pairs, runs and the last card. Then count the non-dealer's hand, the dealer's hand and the crib, each with the starter. First to 121 wins.",
    },
    {
      q: "What is his nobs and what is his heels?",
      a: "His heels is 2 points for the dealer when the starter card is a jack, pegged immediately. His nobs is 1 point for a jack of the starter's suit held in a hand or in the crib, scored during the show. They are different jacks and different scores.",
    },
    {
      q: "How many points is a pair royal?",
      a: "A pair royal, three of a kind, scores 6. A double pair royal, four of a kind, scores 12. A plain pair scores 2. A run of n scores n, and each separate run scores again if pairs create more than one.",
    },
    {
      q: "What is a skunk in cribbage?",
      a: "You skunk the opponent by reaching 121 before they reach 91. A double skunk, reaching 121 before they reach 61, is a common optional stake and is not on every tournament sheet. A triple skunk before 31 is rarer and also optional.",
    },
    {
      q: "Can you win cribbage during the play?",
      a: "Yes. The game ends the moment a peg reaches 121, including on his heels or on a pegging play. If that happens, you do not finish the hand or count the crib. During the show, the non-dealer counts first and can win before the dealer scores.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Rules of cribbage",
      url: "https://en.wikipedia.org/wiki/Rules_of_cribbage",
    },
    { label: "Wikipedia: Cribbage", url: "https://en.wikipedia.org/wiki/Cribbage" },
    { label: "Pagat: Cribbage", url: "https://www.pagat.com/adders/cribbage.html" },
  ],
  related: [
    "how-to-play-euchre",
    "hearts-card-game-rules",
    "pinochle-rules",
    "31-card-game",
    "52-card-deck",
  ],
  updated: "2026-09-29",
  howTo: true,
};
