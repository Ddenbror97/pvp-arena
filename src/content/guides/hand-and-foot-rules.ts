import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hand-and-foot-rules",
  cluster: "Games of chance",
  keyword: "hand and foot rules",
  secondary: [
    "hand and foot card game",
    "clean and dirty books",
    "hand and foot scoring",
    "foot pile canasta",
  ],
  title: "Hand and Foot Rules: Books, Melds and Scoring",
  description:
    "Hand and foot rules cover two piles, books of seven, and a score that rewards red threes. House minimums differ, so agree before the deal.",
  h1: "Hand and foot rules: books, melds and scoring",
  answer:
    "Hand and foot rules cover a partnership card game in the canasta family: each player gets a hand pile and a foot pile, books are melds of seven, and a common score pays more for a clean book than a dirty one and adds a bonus for red threes. There is no single standard. Agree the deck count, the deal size, and the going-out requirement before the shuffle.",
  facts: [
    "Pagat records no standard Hand and Foot rules; the four-player partnership game is the version most sheets describe.",
    "Classic canasta uses two decks plus jokers. Published Hand and Foot sheets for four players use about five decks with jokers, because every player holds two piles.",
    "A book is seven cards of one rank. A clean book has no wild cards. A dirty book contains wild cards.",
    "On the sheets from Pagat and Bicycle, a turn is draw two from the stock (or take up to seven discards), meld, then discard one.",
    "Those same sheets use opening-meld minimums of 50, 90, 120, and 150 across four rounds.",
    "On the Pagat four-player sheet, a red three laid on the table scores 100, and a red three still in an unplayed foot scores minus 100.",
  ],
  sections: [
    {
      id: "partnership",
      title: "Partnership, decks and the canasta parent",
      body: `Hand and Foot is a North American partnership game related to canasta. Pagat, which publishes player-contributed card rules, says outright that there are numerous variations and no standard rules. Bicycle calls it a canasta variation that became popular in the United States in the 1950s. Treat every number below as a published sheet you can adopt, then write down the spots where your table differs.

Partners sit opposite each other. Melds belong to the partnership. Either partner may add to a meld the team has started. The usual game is four players. Pagat also describes two to six, with four or six in teams and the other counts playing as individuals.

### What the pack is

Classic [canasta rules](/guides/canasta-rules) use two [52-card decks](/guides/52-card-deck) plus jokers, 108 cards. That pack is the parent. It is a tight stock once Hand and Foot deals two piles to each person. [Rummy 500 rules](/guides/rummy-500-rules) are the one-hand race to 500, not this two-pile partnership. Bicycle's sheet uses five to six decks with jokers. Pagat's four-player sheet uses five decks with two jokers per deck, 270 cards. For other player counts, Pagat's note is one more deck than the number of players. Agree the count before you shuffle. If the stock dies early, you used too few decks for the deal size you chose.

You need a score pad. Both sheets play four deals, and the higher total wins. Some houses name a point goal instead. Name it before round one. The wider card shelf is the [games of chance topic](/guides/topics/games-of-chance), and a short note on this website is on the [about page](/about).`,
    },
    {
      id: "two-piles",
      title: "The hand pile, the foot pile and the deal",
      body: `The name is the rule that separates this game from canasta. Each player is dealt two face-down stacks. The first is the hand. You may look at it. The second is the foot. You may not look at it until the hand is gone. Pagat's four-player sheet deals 13 and 13. Bicycle's sheet deals 11 and 11. Both are common. Pick one number and use it for every player, including the dealer.

On the Pagat sheet the partners split the dealing: one deals the four hands, the other deals the four feet, each passing stacks clockwise. Any fair deal that gives every player two equal stacks is fine if you agree it. Place the feet face down near the center, separate from the hands, so nobody lifts the wrong pile.

The rest of the cards are the stock, face down. Turn one card up to start the discard pile. On both published sheets, if that upcard is a red three, a two, or a joker, bury it in the stock and turn a new card. Pagat notes a house option that leaves the wild or red three in place so the first legal pickup takes it. Choose one.

Play passes clockwise from the left of the dealer. The deal passes left after the hand. Keep the **foot** sealed. Peeking, or playing a foot card while the **hand** still has cards, is a foul. A 13-card stack beside an 11-card stack means the deal is wrong, so count both piles before anyone sorts.`,
    },
    {
      id: "books",
      title: "Melds, clean books and dirty books",
      body: `A meld is a set of the same rank, at least three cards, from ace down to 4. Threes are not melded as ordinary ranks. Twos and jokers are wild. A meld of seven is a book, also called a pile on some sheets. Square a finished book. A red card on top marks a clean book. A black card, or a wild card turned sideways, marks a dirty book.

A clean book is seven natural cards of one rank and no wild cards. A dirty book is seven cards of one rank that include wild cards. That split is the part both sheets share. The wild-card limit is not shared.

### Two published limits

Pagat's four-player sheet requires at least twice as many natural cards as wild cards: at most one wild in a meld of three to five, and at most two in a meld of six or seven. That sheet also requires a wild book before you may go out. Bicycle uses wild cards with at least four natural cards, forbids an all-wild meld, and scores clean at 500 and dirty at 300.

Pagat uses the same 500 and 300, then adds bonuses Bicycle's page does not list in the same way.

| Bonus on the Pagat sheet | Points |
| --- | --- |
| Clean book of seven | 500 |
| Dirty book of seven | 300 |
| Wild book of seven | 1500 |
| Going out | 100 |
| Red three on the table | 100 |

Those bonuses sit on top of the card points. Pagat allows another meld of a rank only after the first book is finished.`,
    },
    {
      id: "turn",
      title: "A turn, red threes and the discard pile",
      body: `On both the Pagat and Bicycle sheets, a turn is draw two cards from the stock, meld if you can and want to, then discard one card. The alternative draw is to take up to seven cards from the discard pile instead of the two from the stock. If the pile has fewer than seven, you may take all of it. You never take more than seven.

The conditions on those sheets are strict. The top discard must not be a three. You need two cards of that rank already in hand, and you meld them with the top discard immediately. Cards buried in the pile do not count toward a first-meld minimum. In round one, two nines and a two can take a discarded nine for a 50-point dirty meld. A two buried in the pile cannot.

Before your first turn, lay down any red threes in the hand and draw replacements from the stock. Do the same any time you draw a red three, or when you find one in the foot. Red threes are bonus cards, not meld cards. On the Pagat sheet each one on the table is 100 for the team. Each one still buried because the opponents went out before you opened that foot is minus 100. A discarded **black three** blocks the next player from taking the pile. The opening meld must hit the round minimum. Red threes and book bonuses do not count toward it.`,
    },
    {
      id: "foot",
      title: "Picking up the foot and going out",
      body: `You play the hand until it is empty. Pagat describes two timings, and they feel different at the table. If you meld every card of the hand, you pick up the foot at once and finish the turn from it, including the discard. If you meld down to one card and discard that last card, you pick up the foot at the start of your next turn. Announce the foot so the table sees the new hand. Playing a foot card while the hand still has cards undoes the point of the two piles.

Going out ends the hand. The requirement is the widest split between published sheets, so say it out loud before the deal.

Pagat's four-player sheet allows you to go out only if all of these are true: the partnership has finished at least two dirty books, two clean books, and one wild book, each of exactly seven; your partner has picked up the foot and played at least part of a turn from it; you asked your partner and the partner agreed. If the partner says no, you must keep cards. The sheet says you keep at least two, one to discard and one still in hand, so the turn is legal. You then go out by melding the rest of the foot, or by melding all but one and discarding the last. Bicycle's sheet is shorter: one **clean** book, one **dirty** book, and the final card must be a discard. It does not require a wild book or a partner's permission.`,
    },
    {
      id: "score",
      title: "How the score adds and subtracts",
      body: `Score when someone goes out, or when the stock dies. Card points count for you if the card is in a meld. They count against you if the card is still in a hand or a foot. Book bonuses are extra, and only a team that actually finished the book collects them.

Both the Pagat four-player sheet and the Bicycle sheet use the same card points:

- Joker: 50
- Two or ace: 20
- 8 through king: 10
- 4 through 7, and a black three: 5

A clean book of kings is the 70 inside the cards plus 500. A dirty book spends wild cards you might have wanted elsewhere, which is why players argue before they dirty a meld.

Red threes follow the sheet. On Pagat's page they are plus 100 on the table and minus 100 if a sealed foot still holds them. Houses that pay a different number should write it beside the 500 and 300.

The going-out bonus on the Pagat sheet is 100, and only the team that goes out receives it. A hand that ends because the stock ran out pays no one that 100. Add bonuses and melded card points, then subtract every card still in a hand or a foot. After four deals, the higher total wins.`,
    },
    {
      id: "agree",
      title: "What to agree before the first deal",
      body: `Read the disagreements once, then play. A table that mixes Pagat's wild book with Bicycle's 11-card deal without saying so will argue at the first going-out. The list that prevents that is short.

- Deck count, including how many jokers per deck.
- 11 cards or 13 in each pile.
- Whether a wild book exists, and what it scores.
- How many clean books and dirty books you need before anyone may go out.
- Whether the partner must already be in the foot, and whether you must ask permission.
- Whether the last card must be a discard.
- The red-three bonus, and the penalty if a foot was never opened.
- The four opening minimums, if you are not using 50, 90, 120, and 150.

Write the answers on the score pad. The first deal is the worst time to discover that one partnership thought a clean book was 500 and the other thought the whole game used canasta's canasta bonus and nothing else.

Hand and Foot only makes sets of one rank. Runs of consecutive cards belong to basic [rummy](/guides/how-to-play-rummy), which is a different game with one hand and a different score. [Phase 10 rules](/guides/phase-10-rules) are a contract game: each hand demands a named set of sets and runs, and there is no foot pile. If your group wants a lighter ladder of requirements, Phase 10 is that game. If your group wants shared books, two hidden piles, and a red-three bonus, stay here and freeze the sheet.`,
    },
  ],
  faqs: [
    {
      q: "How many decks do hand and foot rules use?",
      a: "Pagat's four-player sheet uses five decks with jokers, 270 cards. Bicycle says five or six. Other counts on Pagat use one more deck than the number of players. Agree before you shuffle.",
    },
    {
      q: "What is a clean book versus a dirty book?",
      a: "A book is seven cards of one rank. Clean means no wild cards. Dirty means at least one wild, and wild cards are twos and jokers. A common bonus is 500 clean and 300 dirty. The wild-card limit is a house rule.",
    },
    {
      q: "When do you pick up the foot?",
      a: "When the hand pile is empty. On the Pagat sheet, melding the entire hand lets you pick up the foot and continue that same turn. Melding down to one card and discarding it means you pick up the foot at the start of your next turn. You do not look at the foot before then.",
    },
    {
      q: "Do red threes score if they are still in the foot?",
      a: "On the Pagat four-player sheet, a red three on the table scores 100 for the team, and a red three still in a foot you never opened scores minus 100. Lay red threes down as soon as you hold them and draw replacements. Other houses change the 100. Agree the number.",
    },
    {
      q: "Can two people play Hand and Foot?",
      a: "Pagat allows two to six. Two, three, or five play as individuals. Four players in partnership is the version most sheets describe. Keep the two piles and the books, and agree how you go out without a partner.",
    },
  ],
  sources: [
    { label: "Pagat: Hand and Foot", url: "https://www.pagat.com/rummy/handfoot.html" },
    {
      label: "Bicycle Cards: Hand and Foot",
      url: "https://bicyclecards.com/how-to-play/hand-and-foot",
    },
    { label: "Wikipedia: Canasta", url: "https://en.wikipedia.org/wiki/Canasta" },
  ],
  related: ["canasta-rules", "rummy-500-rules", "how-to-play-rummy", "52-card-deck"],
  updated: "2026-09-29",
  howTo: true,
};
