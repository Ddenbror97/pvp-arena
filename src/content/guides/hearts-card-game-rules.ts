import type { Guide } from "./types";

export const guide: Guide = {
  slug: "hearts-card-game-rules",
  cluster: "Games of chance",
  keyword: "hearts card game",
  secondary: [
    "how to play hearts",
    "shoot the moon",
    "hearts scoring",
    "queen of spades hearts",
    "hearts card pass",
  ],
  title: "Hearts Card Game: Pass, Score, Moon | PvP Spin Arena",
  description:
    "Hearts card game rules for four players: pass three cards, avoid hearts and the queen of spades, shoot the moon, and lose at 100 points.",
  h1: "Hearts card game rules for passing, penalty cards and the moon",
  answer:
    "The hearts card game most tables mean is four players, a 52-card deck, and 13 cards each. Pass three cards left, then right, then across, then hold a hand with no pass. Avoid hearts, which score 1 each, and the queen of spades, which scores 13. If you take all 14 of those penalty cards you shoot the moon: you score 0 and each opponent scores 26, or, in a variant, you score minus 26. The two of clubs leads. Hearts cannot be led until they are broken, unless you hold only hearts. The first player to 100 loses.",
  facts: [
    "Four players, 52 cards, 13 each. There is no trump. Ace is high and the two is low.",
    "Pass three cards: left, right, across, then a hold hand. Repeat that cycle.",
    "Each heart taken scores 1. The queen of spades scores 13. A hand totals 26 penalty points.",
    "Shooting the moon means taking all 13 hearts and the queen of spades.",
    "The player with the two of clubs leads it. You must follow suit if you can.",
    "The jack of diamonds is not a bonus in the base game. Omnibus hearts scores it as minus 10.",
  ],
  sections: [
    {
      id: "setup",
      title: "Deal, pass, and the first lead",
      body: `Hearts is a trick-avoidance game from the whist family. Books sometimes reserve the name Black Lady for the form that adds the queen of spades. Apps, Microsoft Hearts, and almost every kitchen table just call that form Hearts. This page teaches that four-player game. It is not the 1880s game that scored hearts only, and it is not British Black Maria, which also penalises the ace and king of spades.

Use one [52-card deck](/guides/52-card-deck). Jokers stay in the box. Deal 13 cards to each player, one at a time, face down. A full shuffle is part of a fair deal. [How to shuffle cards](/guides/how-to-shuffle-cards) covers why seven riffles is the usual bar.

Before anyone leads, each player passes three cards face down. The cycle is:

1. First hand: pass three cards to the left.
2. Next hand: pass three to the right.
3. Next hand: pass three across.
4. Next hand: hold. Nobody passes.

Then the cycle repeats. Choose your three and put them down before you look at the three coming to you. You may not pass a card you just received, because you have not picked those cards up yet.

The player who holds the two of clubs leads it to the first trick. Play goes clockwise. Hearts lives next to [Spades](/guides/how-to-play-spades) and [Oh Hell](/guides/oh-hell-card-game) in the [games of chance hub](/guides/topics/games-of-chance): same 13-card deal, a different reason to win a trick.`,
    },
    {
      id: "tricks",
      title: "Trick play, breaking hearts, and the first trick",
      body: `There is no trump. The highest card of the suit that was led wins the trick. The winner leads the next trick. Cards rank ace, king, queen, jack, 10, down to 2.

You must follow the suit that was led if you have any card of that suit. If you cannot follow, you may play any card. That discard is how hearts and the queen of spades get dumped on someone else.

Two restrictions keep the opening quiet:

- On the first trick, do not play a heart or the queen of spades if you have any other legal card. If your only cards are penalty cards, agree a fix before the deal. A rare all-penalty hand is a misdeal at some tables.
- Do not lead a heart until hearts are broken. Hearts break when a heart is played on an earlier trick, usually as a discard. The queen of spades does not break hearts by herself. If every card left in your hand is a heart, you may lead a heart even though hearts are not broken.

After the first trick you may lead spades, clubs, or diamonds, and that includes leading the queen of spades. Leading her is usually a mistake. Save her until you are void in another suit, then discard her on a trick you will not win.

Count the suit as it falls. Thirteen cards of each suit are in the deal before the pass, and the pass moves three of them. After a few tricks you should know whether the queen is still out and whether a heart lead is safe. Winning a cheap club trick feels harmless until that trick also contains the queen.`,
    },
    {
      id: "scoring",
      title: "Scoring, 100 points, and shooting the moon",
      body: `Score at the end of each hand, not after each trick. Keep a running total.

| Card taken in tricks | Points |
| --- | --- |
| Each heart | 1 |
| Queen of spades | 13 |
| All other cards | 0 |
| Hand total | 26 |

Thirteen hearts plus the queen is 26. If the four scores for a hand do not add to 26, and nobody shot the moon, you miscounted.

**Shoot the moon** if one player takes every heart and the queen of spades. That is all 14 penalty cards. Two ways to score it are both common. Pick one and write it down.

- **Main rule on this page:** the shooter scores 0. Each of the other three players scores 26.
- **Variant:** the shooter scores minus 26. The other players score 0 for the hand.

Do not mix them. Giving everyone else 26 can push a leader over 100. Subtracting 26 from yourself can pull you out of a hole without touching their totals. The cards required are the same. Only the arithmetic changes.

Play until a player's total reaches 100 or more at the end of a hand. That player loses. The player with the lowest score wins. If two players cross 100 on the same hand, the higher score loses and the lowest score still wins. Stopping in the middle of a hand because someone "would" reach 100 is not the rule. Finish the hand, then look at the pad.

A plain hand might end 4, 0, 17, 5. The 17 is four hearts plus the queen. Nobody is near 100, so you deal again and pass in the next direction.`,
    },
    {
      id: "example",
      title: "Two hands worked on the score pad",
      body: `Hand 1, no moon. You pass the king and queen of spades and a high heart to the left, hoping to void spades. You receive three low clubs. The two of clubs is in your hand, so you lead it.

You never win a trick. The player across takes the queen of spades and two hearts (15). The player on your right takes the other 11 hearts (11). You and the player on your left score 0. The pad reads 0, 15, 0, 11. Check: 15 + 11 = 26.

Hand 2, you try the moon. You kept the ace, king, and queen of hearts, plus long spades including the queen. After the pass you also hold the ace of spades. You win trick after trick on purpose. By the tenth trick you have every heart that has been played and the queen. You still need the hearts that have not appeared. If an opponent has been saving a heart and you run out of winners, the moon fails and you eat a large ordinary score, often most of the 26.

Suppose you do take all 14 penalty cards. Under the main rule your line stays put and the other three each gain 26. Under the minus-26 variant your line drops by 26 and theirs do not move. Say the pad was 20, 40, 55, 70 and you are the 70. The main rule makes it 46, 66, 81, 70. The variant makes it 20, 40, 55, 44. Same cards, different game.

The jack of diamonds does nothing in either hand. Leave it as an ordinary diamond unless you have agreed omnibus hearts.`,
    },
    {
      id: "variants",
      title: "Omnibus hearts and other variants",
      body: `Agree the short list before the first pass. Most arguments are about rules nobody named.

- **Moon scoring:** 26 to each opponent, or minus 26 to the shooter.
- **Pass order:** left, right, across, hold is the usual cycle. Some tables start by passing right.
- **Pass count:** three cards is standard. A few tables pass two, or pass cards of the dealer's choice.
- **First trick:** the ban on hearts and the queen is standard in the American game. Do not drop it quietly.
- **Game length:** 100 is the usual losing score. Some tables play to 50 for a shorter night, or a fixed number of hands.

**Omnibus hearts** adds the jack of diamonds as a bonus card. The player who takes it scores minus 10. It is not one of the 14 penalty cards, and taking it is not required to shoot the moon. Treat omnibus as a different game you opted into. Do not discover the jack after someone has already captured it.

**Black Maria** adds penalties for the ace of spades and the king of spades as well as the queen. Do not use those numbers in ordinary hearts.

**Spot hearts** makes the heart ace worth more than the heart two. The base game on this page scores every heart as 1.

Three, five, or six players need a stripped deck so the deal comes out even. This page stays with four players and all 52 cards. If you want a partnership trick game with a bid instead of a penalty suit, play [euchre](/guides/how-to-play-euchre) or Spades rather than inventing a team rule in the middle of a hearts hand.

Where adults play hearts for a stake per point, or for a set amount on the loss at 100, gambling is for adults only (18+, or the legal age where you live). Agree the price before the first pass. The deal still dominates a single hand. Passing and ducking change the score over a match. They do not make the queen safe.`,
    },
    {
      id: "stakes",
      title: "Penalty points and a hashed PvP round",
      body: `Hearts looks skillful because the pass and the ducks are real choices. The ceiling is still the deal. A hand with the queen and no exit suit is a tax. A hand that can take every trick is a moon only if you notice in time and the other players cannot slip a heart past you. Over a long match the player who counts suits loses less often. Over one hand the cards can ignore that.

That is the same shape as any priced game of chance: a choice inside a distribution you do not control. [Pitch](/guides/pitch-card-game) prices trump and jacks. Hearts prices 14 specific cards and leaves the rest at zero.

PVPspinArena runs three player-versus-player games in USDC or ETH on Base. Adults only, 18+. [Coinflip](/coinflip) is a straight 50/50 between two players. Roulette uses a 33-slot wheel and returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee, a 7.88 percent on Purple or Silver after the win fee edge. Jackpot gives you a win chance equal to your share of the pot. None of them has a queen to dump. Every round uses seeds committed before the result, and you can check a settled round on the [fairness](/fairness) page.

Keep the stake where a loss is affordable. The [responsible gambling](/responsible-gambling) page has the limits. Shooting the moon is a card-table phrase. It is not a reason to raise the next coin.

See also [pinochle](/guides/pinochle-rules) and [cribbage](/guides/cribbage-rules).`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you pass in hearts?",
      a: "Pass three cards. The usual cycle is left, right, across, then a hold hand with no pass. Put your pass down before you look at the cards you receive.",
    },
    {
      q: "What is shooting the moon in hearts?",
      a: "You take all 13 hearts and the queen of spades. On the main rule you score 0 and each opponent scores 26. A common variant scores you minus 26 instead.",
    },
    {
      q: "Can you lead hearts at the start of a hand?",
      a: "No. Hearts must be broken by a heart played on an earlier trick, unless your hand contains only hearts. The queen of spades does not break hearts.",
    },
    {
      q: "Who loses in hearts?",
      a: "The first player to reach 100 or more at the end of a hand loses. The lowest score wins. Finish the hand before you check the total.",
    },
    {
      q: "Does the jack of diamonds score in hearts?",
      a: "Not in the base game. In omnibus hearts the jack of diamonds scores minus 10 for the player who takes it. Agree that variant before the deal.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Hearts (card game)",
      url: "https://en.wikipedia.org/wiki/Hearts_(card_game)",
    },
    { label: "Pagat: Hearts", url: "https://www.pagat.com/reverse/hearts.html" },
  ],
  related: [
    "how-to-play-spades",
    "how-to-play-euchre",
    "oh-hell-card-game",
    "pinochle-rules",
    "cribbage-rules",
  ],
  howTo: true,
  updated: "2026-09-29",
};
