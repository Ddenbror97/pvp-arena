import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crazy-eights-rules",
  cluster: "Games of chance",
  keyword: "crazy eights rules",
  secondary: [
    "how to play crazy eights",
    "crazy eights scoring",
    "wild eights",
    "crazy eights for kids",
    "eights card game",
  ],
  title: "Crazy Eights Rules, Wild Cards, Score | PvP Spin Arena",
  description:
    "Crazy eights rules for 2 to 7 players: match suit or rank, eights are wild, draw when you cannot play, and score 50 for each eight left.",
  h1: "Crazy eights rules: match a suit or rank, and eights are wild",
  answer:
    "Crazy eights rules use a 52-card deck for two to seven players. Deal 7 cards when the table is small, and 5 cards when many people are playing. A common split is 7 with two players and 5 with three or more. Match the suit or the rank of the top discard. An eight is wild: play it on anything and name the suit the next player must follow. If you cannot play, draw one card from the stock. Some houses make you draw until you can play. The first player out scores the cards left in other hands: eights 50, face cards 10, aces 1, and every other card its face value. Play one hand, or play to a target, often 100.",
  facts: [
    "Two to seven players. One deck up to five players. Six or seven players often use two decks.",
    "Deal 7 cards in a two-player game and 5 cards when more people sit down.",
    "Play one card that matches the suit or the rank, or play any eight and name a suit.",
    "This page's draw rule is one card when you cannot play. Drawing until you can play is the other common rule.",
    "Out-of-hand scoring: 8 = 50, king queen or jack = 10, ace = 1, other cards face value.",
    "A short game is one hand. A match is often first to 100, or 50 points times the number of players.",
  ],
  sections: [
    {
      id: "setup",
      title: "Players, the deal, and the starter card",
      body: `Crazy Eights is the best-known American member of the eights group. Mau-Mau, Switch, and Uno are relatives. The job is to empty your hand. You do it by matching, not by taking tricks and not by building melds the way you do in [rummy](/guides/how-to-play-rummy).

Sit two to seven people around one [52-card deck](/guides/52-card-deck). Jokers are out. With six or seven players a single deck runs out of cards fast, so shuffle two decks together, 104 cards, and keep the same match rules. Five or fewer players should stay on one deck.

Deal depends on the crowd:

- Two players: 7 cards each.
- Three or more: 5 cards each.

That is the usual split, and it matches the short form "seven, or five if many people are playing." Deal one card at a time, face down, clockwise. Put the rest of the deck face down in the middle as the stock. Turn the top card face up beside it. That card starts the discard pile.

If the starter is an eight, the player to the dealer's left names the suit before playing, then plays a card of that suit or another eight. If the starter is any other card, that player must match its suit or its rank, or play an eight.

Shuffle properly when money or bragging rights are on the table. [How to shuffle cards](/guides/how-to-shuffle-cards) is the method. Crazy Eights belongs with the other pack games in the [games of chance hub](/guides/topics/games-of-chance).`,
    },
    {
      id: "play",
      title: "What you may play on your turn",
      body: `Play passes to the left. On your turn you play one card, face up, on the discard pile. The card has to meet one of these tests:

1. It matches the suit of the top card. A top 6 of clubs accepts any club.
2. It matches the rank of the top card. A top 6 of clubs accepts any 6.
3. It is an eight. Eights match anything.

When you play an eight you name a suit out loud. You do not name a rank. The next player must play a card of the suit you named, or another eight and a new suit name. They cannot play a matching rank from a different suit just because the eight you covered was a six. The eight replaced the requirement.

You play one card. You do not lay three kings at once. Sets belong to rummy and to [canasta](/guides/canasta-rules), not to this game.

**This page's draw rule:** if you have no legal card, draw one card from the stock. If that card is legal, you may play it immediately. If it is not, your turn ends and you keep it. You may not dig through the stock.

**The other common rule:** draw until you pull a card you can play, or until the stock runs out. Published descriptions disagree. Parlett's account, repeated on Wikipedia, has you draw until you can play. Plenty of family sheets stop after one card. Say which rule you are using before the deal. A one-card draw leaves you stuck more often. Drawing until you can play makes the hand move and makes the stock disappear faster.

A further published option lets you draw even when you already hold a legal card. Use that only if the table agreed. Under the rule on this page, a legal card means you play. You do not fish for a better one.

If the stock runs out, turn the discard pile face down as a new stock. Leave the top discard in place. Do not shuffle that top card back in. If the new stock is also unplayable for you, and you cannot draw a legal card, you pass.`,
    },
    {
      id: "scoring",
      title: "How the winner scores the cards left",
      body: `The hand ends the moment a player plays their last card. That player scores the cards still held by everyone else. You do not score cards that were already discarded.

| Card left in an opponent's hand | Points |
| --- | --- |
| Each eight | 50 |
| Each king, queen, or jack | 10 |
| Each ace | 1 |
| Each 2 through 10 | Face value |

An ace is 1 on this sheet, not 11 and not 14. A two is 2. A ten is 10. Add every opponent. If three people still hold cards, all three hands count for the winner.

Worked count: one opponent holds 8♠, K♥, 7♦, A♣. That is 50 + 10 + 7 + 1 = 68. A second opponent holds 9♣ and 9♥. That is 18. You score 86 for the hand. The other players score 0 for the hand unless you are playing a difference rule.

If the stock and the discard both jam so that nobody can play, do not invent a winner. A fair stop is to score the hand for the player with the lowest total in hand. They receive the difference between their total and each other hand. Write that tie-break down if your games often choke the stock. With a one-card draw rule, jammed hands happen.

**Match length.** Three honest options:

- One hand, and the out-player wins.
- First to 100 points.
- First to 50 times the number of players: 100 with two, 150 with three, 200 with four, up to 350 with seven.

One hundred is the target most families mean. The multiplier is the figure in several published write-ups. Pick one before you deal. Going out on an eight is legal. Name the suit anyway if the table likes the ritual. The power does not pass to a next player, because the hand is over.`,
    },
    {
      id: "example",
      title: "A sample turn around a three-player table",
      body: `Three players, five cards each. The starter is the 4 of hearts. You are left of the dealer and you hold 8♣, 4♠, J♥, 2♣, 9♦.

The 4♠ matches rank. The J♥ matches suit. The 8♣ is wild. The 2♣ and 9♦ do not play. You could drop the jack and keep the heart suit alive, or drop the 4♠ and switch the pile to spades. You play the 4♠, because the next player has been collecting hearts and you would rather not feed that suit.

They cannot follow spades and draw one card, the 6 of diamonds. It does not match, so the turn ends. Under the draw-until rule they would have kept pulling. Write down which rule you chose, because this is the exact moment the games diverge.

The third player plays the 6 of spades. The top card is still your 4♠, because the middle player drew and did not play. A 6 of spades matches that spade, so the play is legal.

Back to you. You play the 8♣ and call diamonds. The middle player, who just drew a diamond, can answer. That is the risk of a wild eight: you name a suit, you do not name a victim. If you wanted to strand the player who is closest to going out, call the suit they have been failing, not the suit someone just drew.

Suppose you then go out on a later turn while they hold an eight and a king, and the third player holds a five. You score 50 + 10 + 5 = 65. First to 100 means you need another modest hand. One-hand play means you already won.`,
    },
    {
      id: "variants",
      title: "Skip, reverse, and draw-two are add-ons",
      body: `David Parlett called Crazy Eights a pattern people hang extra rules on. The extras are playable. They are not required, and they should be named before the deal rather than discovered when someone plays a queen.

Common add-ons, all optional:

- **Queen skips.** The next player misses a turn. If you go out on a queen, the skip does not fire.
- **Ace reverses.** Play switches direction. With two players, a reverse is the same as a skip. Say that out loud so nobody treats it as both.
- **Two draws two.** The next player draws two cards unless they play a two, in which case the draw stacks to four for the player after that. This is the rule most likely to be smuggled in from Uno. It is not part of the base score sheet.
- **Last card.** You must say "last card" or "eight" when you play down to one card. Forget, and you draw. This is a memory penalty, not a scoring rule.
- **Countdown.** Each player starts at 8. Your score is both the number of cards you are dealt next hand and your personal wild rank. First to zero wins. Fun, and a different game.

Special powers do not apply if the hand ends on that card. The player is already out. You do not skip, reverse, or draw because of a card that ended the deal.

Keep the score values stable even when you add powers. An eight is still 50 in the hands you catch. Changing eights to 20 and aces to 15 is how two people remember two different wins.

[Gin rummy](/guides/how-to-play-gin-rummy) is the next step up if matching a discard feels thin and you want a knock. [Thirty-one](/guides/31-card-game) is the short three-card cousin if you want a hand that ends on a total. Neither replaces the eight.

Adults sometimes play crazy eights for a cent a point or a fixed stake on the match. That is gambling, and it is for adults only (18+, or the legal age where you live). Agree the stake first. The eight in your opponent's hand is worth 50 only on the sheet you wrote down.`,
    },
    {
      id: "stakes",
      title: "A wild suit and a hashed coin flip",
      body: `The decisions in Crazy Eights are small and real. You choose which suit to kill, when to spend an eight, and whether a face card is safer in the discard than in your hand at the scoring. You do not choose the stock. A one-card draw rule makes that stock colder, because a single miss ends the turn. The draw-until rule makes it longer and noisier.

Either way the score is a count of cardboard, not a system. Catching an eight is 50 points of luck as much as tactics. Playing to 100 just gives that luck more hands to average out.

If you want a result with no suit to name, PVPspinArena runs Jackpot, [Coinflip](/coinflip) and Roulette in USDC or ETH on Base. Play is 18+ only. Coinflip is a 50/50 between two players. Roulette is a 33-slot wheel that returns 32/33 on Purple or Silver and 14/33 on Green before the 5% win fee, a 7.88 percent on Purple or Silver after the win fee edge. Jackpot pays the pot according to your share. Seeds are committed before the round. Check any settled round on the [fairness](/fairness) page.

The [responsible gambling](/responsible-gambling) page is the limit when a match stops being a match. Drawing until you hit a playable card is a house rule. It is not a way to get even.

See also [go fish](/guides/go-fish-rules), [president](/guides/president-card-game-rules) and [BS](/guides/bs-card-game-rules).`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you deal in crazy eights?",
      a: "Deal 7 cards to each player in a two-player game, and 5 cards when three or more play. With six or seven players, use two decks.",
    },
    {
      q: "What do eights do in crazy eights?",
      a: "An eight may be played on any card. You name the suit. The next player must play that suit or another eight.",
    },
    {
      q: "What if you cannot play in crazy eights?",
      a: "On this page you draw one card. If it plays, you may play it. If it does not, the turn ends. A common alternative is to draw until you can play. Agree which rule before the deal.",
    },
    {
      q: "How do you score crazy eights?",
      a: "The player who goes out scores everyone else's cards. Eights are 50, face cards are 10, aces are 1, and other cards count their face value. Many tables play to 100.",
    },
    {
      q: "Do you have to say last card in crazy eights?",
      a: "Only if the table added that house rule. It is not part of the base game. If you use it, forgetting usually costs a draw from the stock.",
    },
  ],
  sources: [
    { label: "Wikipedia: Crazy Eights", url: "https://en.wikipedia.org/wiki/Crazy_Eights" },
    { label: "Pagat: Crazy Eights", url: "https://www.pagat.com/eights/crazy8s.html" },
  ],
  related: [
    "go-fish-rules",
    "president-card-game-rules",
    "bs-card-game-rules",
    "skip-bo-rules",
    "52-card-deck",
  ],
  howTo: true,
  updated: "2026-09-29",
};
