import type { Guide } from "./types";

export const guide: Guide = {
  slug: "pinochle-rules",
  cluster: "Games of chance",
  keyword: "pinochle rules",
  secondary: [
    "partnership pinochle",
    "pinochle meld",
    "pinochle bidding",
    "how to play pinochle",
    "pinochle deck",
  ],
  title: "Pinochle Rules: Auction, Meld, Tricks | PvP Spin Arena",
  description:
    "Pinochle rules for partnership auction: a 48-card deck, 12 cards each, a bid, trump, the classic meld sheet, and 250 points in the tricks.",
  h1: "Pinochle rules for partnership auction: bid, meld, then tricks",
  answer:
    "Pinochle rules on this page are partnership auction pinochle, the common American four-player game. Use a 48-card deck: ace, ten, king, queen, jack, and nine in each suit, with two of every card. Deal 12 cards to each player. Players bid. The high bidder names trump. Everyone melds, then you play 12 tricks. Cards rank ace, ten, king, queen, jack, nine. This page uses the classic point sheet: a run is 15, a marriage is 2 and a trump marriage is 4, a pinochle is 4, aces around are 10, kings 8, queens 6, jacks 4, and a dix is 1. In the play, an ace is 11, a ten is 10, a king is 4, a queen is 3, a jack is 2, a nine is 0, and the last trick is 10. The bidding side must make the bid or they are set.",
  facts: [
    "Four players, two partnerships, 48 cards, 12 each. All cards are dealt. There is no stock in this version.",
    "Trick rank is ace, ten, king, queen, jack, nine. The ten outranks the king.",
    "Classic meld on this page: run 15, marriage 2, trump marriage 4, pinochle 4, aces 10, kings 8, queens 6, jacks 4, dix 1.",
    "Trick points: ace 11, ten 10, king 4, queen 3, jack 2, nine 0. Last trick 10. The deck holds 250 points in the play.",
    "Many US tables multiply the meld sheet by ten and count only aces, tens, and kings as 10-point counters. Do not mix the sheets.",
    "A two-hand draw game, 12 cards each and 24 in the stock, is a different pinochle. It is not the game taught here.",
  ],
  sections: [
    {
      id: "deck",
      title: "The 48-card deck and the auction",
      body: `Partnership auction pinochle is the game most American tables mean. Four players, partners across the table, one 48-card pinochle deck. Build it from two [52-card decks](/guides/52-card-deck) by pulling the 2s through 8s out of both. What remains is two copies of each card from nine through ace. One deck is not enough.

Deal 12 cards to each player. All 48 cards are dealt. There is no stock and no widow in this version. Dealing in threes or one at a time both work if everyone ends with 12. Shuffle the doubled ranks properly. Two intact suits stacked on each other is not a shuffle. [How to shuffle cards](/guides/how-to-shuffle-cards) is the method.

The player left of the dealer starts the bid, and the bid is a number only. You do not name a suit yet. On the classic sheet this page uses, a common opening floor is 50, and bids rise from there. If everyone else passes, many tables make the dealer take the minimum. The high bidder is the declarer. They name trump, and they lead the first trick.

A second American sheet multiplies every meld here by ten. Pagat's partnership page is that sheet, with bids often opening at 250. This page keeps the classic numbers, so a run is 15, not 150. Do not mix the sheets.

The other famous version is two-hand draw pinochle: 12 cards each, 24 cards in a stock, a turned trump, and a draw after each trick, with no auction. This page does not teach that deal. If someone says "just play the stock," you are in a different game.

Pinochle sits with [euchre](/guides/how-to-play-euchre) in the [games of chance hub](/guides/topics/games-of-chance): trump, partnerships, and a bid. The rank order is the part euchre players miss, because the ten beats the king.`,
    },
    {
      id: "meld",
      title: "The classic meld sheet",
      body: `After trump is named, each player shows meld. A card may count in more than one meld when the melds are different types. It may not count twice in the same type. Lay down only what you need to show the points. Then pick the cards back up for the play.

These are the common table values on the classic sheet:

| Meld | Cards | Points |
| --- | --- | --- |
| Run | A, 10, K, Q, J of trump | 15 |
| Trump marriage | King and queen of trump | 4 |
| Marriage | King and queen of a plain suit | 2 |
| Pinochle | Jack of diamonds and queen of spades | 4 |
| Aces around | One ace in each suit | 10 |
| Kings around | One king in each suit | 8 |
| Queens around | One queen in each suit | 6 |
| Jacks around | One jack in each suit | 4 |
| Dix | Nine of trump | 1 |

A bare run already contains one trump king and one trump queen. Tables argue about whether you also add the trump marriage. Pagat's ten-times sheet scores a bare run at 150, which is 15 on this page, and adds another royal marriage only when you hold an extra trump king or an extra trump queen. On that reading a bare run is 15, not 19. Other families add the marriage and score 19. Agree before the first bid. This page's worked bids use 15 for a bare run and do not add 4 on top.

Double melds are where sheets drift. Common table values, taken from the ten-times sheet and divided by ten, are: double pinochle 30, double aces around 100, double kings 80, double queens 60, double jacks 40, and a double run 150. The ten-times originals are 300, 1,000, 800, 600, 400, and 1,500. Those doubles are common table values, not a second official code. If your card is not on the list, it does not score. Tens around score nothing.

Each nine of trump is a dix worth 1. In auction pinochle there is no turned card to exchange it for. You simply meld it. A dix does not become a marriage.

On the ten-times sheet the same melds are 150, 40, 20, 40, 100, 80, 60, 40, and 10. Tricks on that sheet are different too: aces, tens, and kings are "counters" at 10 each, queens, jacks, and nines are 0, and the last trick is still 10. Both ways of counting the play total 250. They do not score the same kings and queens. Pick one sheet for the whole night.`,
    },
    {
      id: "tricks",
      title: "Rank, trick points, and being set",
      body: `Trick rank, high to low, is ace, ten, king, queen, jack, nine. Say "ace, ten, king" until it sticks. A ten beats every king, queen, jack, and nine in its suit. A nine never wins unless the higher cards are gone and nobody trumps it.

The classic points in the play:

| Card | Each | Eight of them |
| --- | --- | --- |
| Ace | 11 | 88 |
| Ten | 10 | 80 |
| King | 4 | 32 |
| Queen | 3 | 24 |
| Jack | 2 | 16 |
| Nine | 0 | 0 |
| Last trick | 10 | 10 |
| Total in the play | | 250 |

The declarer leads. Play goes left. You must follow suit. If you can beat the card that currently wins the trick, you must do so, even when your partner is winning. If you cannot follow suit, you must trump if you have a trump, and you must play a higher trump if you can. If you have no card of the led suit and no trump, you may throw anything. When two identical cards tie, the one played first wins. There are two aces of trump in the deck. The first of them beats the second.

Twelve tricks are played. Each side adds its meld to the trick points it captured. The bidding side must reach at least the number they bid. If they do, both sides score what they earned. If they fall short, they are set: they score nothing for meld or for tricks on that hand, and they lose the amount of the bid from their total. A common table rule, the one on Pagat's partnership page, also says the defenders keep their meld only if they captured some points in the play. A dix saves itself even if they took nothing. Use that rule only if you named it.

You may throw the hand in without playing if the meld cannot reach the bid even with all 250 trick points. The bidding side still loses the bid. The defenders score their meld and do not get a trick score, because no tricks were played. Throwing in denies them cards. It does not save you.`,
    },
    {
      id: "example",
      title: "A bid of 60 on the classic sheet",
      body: `Your side wins the bid at 60 and you name hearts. After the name, your hand shows a heart run (ace, ten, king, queen, jack) and one ace in each suit. Your partner shows a plain-suit marriage in clubs.

Your meld is 15 for the run plus 10 for aces around, which is 25. You do not add a trump marriage on top, because this table agreed a bare run is 15. Your partner's marriage is 2. The side has 27 in meld before a card is played.

You need 60, so you need 33 or more from the 250 points in the play. That is a modest trick target. If the defenders take every ace they can, they can still leave you enough, but a long trump and the lead are why you bid. You lead a trump ace to pull trump. The first trump ace beats the second if both appear on the same trick.

Suppose the play ends with your side taking 140 in cards including the last trick, and the defenders taking 110. Your side's total is 27 + 140 = 167, which makes 60. You score 167. The defenders score 2 + 110 = 112. Nobody is set. The same cards on the ten-times sheet are a different bid, often around 300, because the run and the aces around are 150 and 100. Do not add classic meld to ten-times tricks.

Racehorse passing is a common extra. After trump is named, the bidder's partner passes four cards across, and the bidder passes four back. Meld is then counted on the hands after the pass. Name it before the deal or leave it out.`,
    },
    {
      id: "agree",
      title: "What to agree before the first bid",
      body: `Pinochle arguments are almost all sheet arguments. Read this list once.

- **Scale.** Classic, as on this page, or the ten-times American sheet. One scale for meld and for tricks.
- **Bare run.** 15, or 19 because you also count the trump marriage. This page's example uses 15.
- **Doubles.** Whether double pinochle is 30, double aces around are 100, and a double run is 150 on the classic scale.
- **Opening bid.** 50 is a sensible floor on the classic sheet. 250 belongs to the ten-times sheet.
- **Dealer stuck.** Whether the dealer must take the minimum if the other three pass.
- **Racehorse.** Whether partners pass four cards after trump is named.
- **Defenders' meld.** Whether they must take some trick points to keep their meld, with a dix saving itself.
- **Game.** Many classic tables play to 150 or to 500. Ten-times tables often play to 1,500. If both sides cross the line on the same hand, a common rule gives the hand to the declaring side.

You must follow suit, head the trick, and trump when you are void. Players from [Spades](/guides/how-to-play-spades) or [Oh Hell](/guides/oh-hell-card-game) are used to ducking. Bidding as if you could duck is how a 60 becomes a set. [Pitch](/guides/pitch-card-game) is the shorter trump game if the meld sheet is more book than the table wants.

Where adults play pinochle for a stake per point or a set amount on the game, that is gambling, and it is for adults only (18+, or the legal age where you live). Agree the price and the sheet together. A set of 200 on the wrong scale is not a funny story if the stake was real.`,
    },
    {
      id: "stakes",
      title: "A 250-point play and a hashed coin",
      body: `The 250 points in the play are a closed box. Meld sits on top of them, and the bid is a promise that meld plus your share of that 250 will clear a number. The first of two identical trump cards wins if they meet. If you cannot say how many trump have fallen, you are guessing a bid you already made.

PVPspinArena does not deal pinochle. It runs Jackpot, [Coinflip](/coinflip) and Roulette in USDC or ETH on Base, for adults 18+ only. Coinflip is a 50/50 between two players. Roulette is a 33-slot wheel that returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee, a 7.88 percent on Purple or Silver after the win fee edge. Jackpot pays a shared pot by your share of it. Seeds are committed before the round. You can check a settled round on the [fairness](/fairness) page.

There is no meld to argue and no dix to forget. If the points stop being the game, the [responsible gambling](/responsible-gambling) page has the limits. A bigger bid will not repair the last set.

See also [hearts](/guides/hearts-card-game-rules) and [cribbage](/guides/cribbage-rules).`,
    },
  ],
  faqs: [
    {
      q: "What deck do you use for pinochle?",
      a: "Partnership auction uses 48 cards: nine through ace in four suits, two of each card. Deal all of them, 12 to each of four players. There is no stock in this version.",
    },
    {
      q: "What beats what in pinochle?",
      a: "In a suit the order is ace, ten, king, queen, jack, nine. A ten beats a king. Trump beats every plain suit. The first of two identical cards wins the trick.",
    },
    {
      q: "How many points is a pinochle meld?",
      a: "On the classic sheet this page uses, a pinochle (jack of diamonds and queen of spades) is 4. A run is 15, a trump marriage is 4, and a plain marriage is 2. The common ten-times sheet multiplies those by ten.",
    },
    {
      q: "What happens if you miss the bid in pinochle?",
      a: "The bidding side is set. They score nothing for that hand's meld or tricks, and they lose the amount of the bid. The defenders score under the rule you agreed.",
    },
    {
      q: "Is two-hand pinochle the same game?",
      a: "No. Two-hand draw pinochle deals 12 cards each, leaves 24 in a stock, and turns a trump. This page teaches four-player partnership auction instead.",
    },
  ],
  sources: [
    { label: "Wikipedia: Pinochle", url: "https://en.wikipedia.org/wiki/Pinochle" },
    {
      label: "Pagat: Single Deck Partnership Pinochle",
      url: "https://www.pagat.com/marriage/pinmain.html",
    },
  ],
  related: [
    "how-to-play-euchre",
    "hearts-card-game-rules",
    "how-to-play-spades",
    "oh-hell-card-game",
    "cribbage-rules",
  ],
  howTo: true,
  updated: "2026-09-29",
};
