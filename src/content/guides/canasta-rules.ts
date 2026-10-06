import type { Guide } from "./types";

export const guide: Guide = {
  slug: "canasta-rules",
  cluster: "Games of chance",
  keyword: "canasta rules",
  secondary: [
    "how to play canasta",
    "canasta scoring",
    "canasta card game",
    "canasta melds",
    "canasta card values",
  ],
  title: "Canasta Rules: Melds, Canastas, Red Threes and Scoring",
  description:
    "Canasta rules for the classic partnership game: the 108-card deck, wild cards, red and black threes, the frozen pile, initial melds, canastas and scoring.",
  h1: "Canasta rules: melds, canastas, the pile and scoring",
  answer:
    "Canasta rules in brief: four players in two partnerships use two decks plus four jokers, 108 cards. Each player gets 11 cards, draws, discards and melds cards of one rank. Jokers and twos are wild. A meld of seven cards is a canasta, worth 500 if natural and 300 if mixed. A team needs a canasta to go out, and the first team to 5,000 points wins.",
  facts: [
    "Classic canasta uses two 52-card decks and four jokers: 108 cards.",
    "Jokers and twos are wild; a meld needs at least two natural cards and at most three wild cards.",
    "A canasta is a meld of seven or more cards: 500 points if natural, 300 if it contains wild cards.",
    "Red threes are bonus cards worth 100 each, or 800 for all four held by one team.",
    "The minimum first meld rises from 50 to 90 to 120 points as a team's score grows; the game ends at 5,000.",
  ],
  sections: [
    {
      id: "basics",
      title: "What canasta is and what you need",
      body: `Canasta is a partnership game in the [rummy](/guides/how-to-play-rummy) family. It was developed in Montevideo, Uruguay, in 1939, with Segundo Santos and Alberto Serrato usually credited, and spread through Argentina before becoming a craze in the United States around 1950. The name means "basket" in Spanish.

The rules below are for classic canasta with four players in fixed partnerships sitting opposite each other. You need:

- two standard [52-card decks](/guides/52-card-deck) plus four jokers, shuffled together into 108 cards;
- a score pad, since games run to 5,000 points and take many hands.

Unlike basic rummy, canasta only uses sets of the same rank. There are no runs. [Hand and foot rules](/guides/hand-and-foot-rules) are the partnership cousin that deals each player two piles and scores books of seven. Teams meld together: either partner can add to any meld the team owns, and the melds sit in front of one partner for the whole hand.

### Card roles

| Card | Role |
| --- | --- |
| Jokers (4) | Wild |
| Twos (8) | Wild |
| Red threes (4) | Bonus cards, laid down immediately |
| Black threes (4) | Stop cards that block the next player from taking the pile |
| Aces, 4s to kings | Natural cards used in melds |

Twelve of the 108 cards are wild, about 11%, so an 11-card hand holds 11 × 12/108 ≈ 1.2 wild cards on average. Canasta sits with the other card games in the [games of chance topic](/guides/topics/games-of-chance).`,
    },
    {
      id: "deal",
      title: "Dealing, drawing and red threes",
      body: `Deal 11 cards to each player, one at a time. Place the rest face down as the stock and turn the top card face up to start the discard pile. If that upcard is a joker, two or red three, turn up another card on top of it; the pile is then frozen from the start.

### A turn

1. **Draw** the top card of the stock, or take the entire discard pile if you are allowed to (see the next section).
2. **Meld** if you want to, by laying down new melds or adding cards to your team's existing melds.
3. **Discard** one card onto the pile.

Classic rules draw one card from the stock. Many modern American rule sets draw two cards per turn instead, so check which version your group plays.

### Red threes

A red three is never kept in the hand. When you are dealt one or draw one, you lay it face up in front of you and draw a replacement from the stock. Each red three is worth 100 points to your team, and a team holding all four gets 800. There is a catch: if your team has not made any meld by the end of the hand, your red threes count against you instead.

The chance that a particular player is dealt at least one red three in 11 cards is 1 − (97 × 96 × 95 × 94) / (108 × 107 × 106 × 105), about 35%.

### Black threes

A black three may be discarded to stop the next player from taking the pile on that turn. Black threes cannot be melded except by a player who is going out, and then only as a meld of three or four black threes with no wild cards.`,
    },
    {
      id: "melds",
      title: "Melds, the initial meld and wild card limits",
      body: `A meld is three or more cards of the same rank. It must contain at least two natural cards and no more than three wild cards. So 8-8-joker is legal; 8-joker-2 is not. You may never meld wild cards on their own in classic rules.

### Card values

| Card | Points |
| --- | --- |
| Joker | 50 |
| Two, ace | 20 |
| King down to 8 | 10 |
| 7 down to 4, black three | 5 |

### The initial meld

Each team's first meld of a hand must reach a minimum count, based on the team's total score before the hand:

| Team score | Minimum initial meld |
| --- | --- |
| Below 0 | 15 |
| 0 to 1,495 | 50 |
| 1,500 to 2,995 | 90 |
| 3,000 or more | 120 |

Only card values count toward the minimum; red three bonuses do not. You may lay down several melds at once to reach the total. Example: with a team score of 1,600 you need 90. Three kings (30), three aces (60) together make 90 and qualify; two kings and a joker (20 + 50 = 70) do not.

### Building a canasta

A meld of seven cards is a canasta. Square it into a pile, with a red card on top for a **natural** canasta (no wild cards, 500 points) or a black card on top for a **mixed** canasta (one to three wild cards, 300 points). You may add more cards to a finished canasta, but adding a wild card to a natural one turns it mixed.

### Where to spend wild cards

Wild cards are scarce and valuable, so beginners often waste them. A two used to finish a mixed canasta early earns 300, while the same card held back could help take a large pile later. Experienced players tend to follow three habits:

- use wild cards to complete a canasta that is one or two cards short, not to start new melds;
- keep natural pairs in hand when the pile is growing, because a pair is what lets you take it;
- when the opponents look close to going out, meld whatever you can, because cards left in your hand are subtracted from your score while melded cards count for you.`,
    },
    {
      id: "pile",
      title: "Taking the discard pile and freezing it",
      body: `The discard pile is the biggest swing in canasta, because taking it can add ten or twenty cards to a team's melds in one turn. When you take it, you take the whole pile, after first using the top card in a meld.

### When the pile is not frozen

You may take the pile if you can use its top card by:

- matching it with two natural cards of the same rank from your hand;
- matching it with one natural card and one wild card; or
- adding it to a meld your team already has on the table.

### When the pile is frozen

The pile is **frozen** against a team that has not yet made its initial meld, and it is frozen for everyone once a wild card (or a red three turned at the start) is in it. Discarding a wild card to freeze it is a deliberate tactic, usually signalled by placing the card sideways. While the pile is frozen, you may take it only by matching the top card with a natural pair from your hand.

You can never take the pile when its top card is a wild card or a black three.

### Why freezing matters

Suppose the pile holds 14 cards and the opponents have a strong position. Freezing it with a two means they need a natural pair of whatever card is on top, which is much harder than a natural card plus a wild. Teams that are behind often freeze the pile to slow the leaders down and play for smaller hands.`,
    },
    {
      id: "scoring",
      title: "Going out and scoring a hand",
      body: `A player may go out, ending the hand, by melding every card or melding all but one and discarding it. The team must have at least one canasta first. Before going out, a player may ask their partner "May I go out?" and must follow the answer.

### Scoring

Each team's score for the hand is its bonuses plus the value of its melded cards, minus the value of cards left in its players' hands.

| Item | Points |
| --- | --- |
| Natural canasta | 500 |
| Mixed canasta | 300 |
| Each red three | 100 (800 for all four) |
| Going out | 100 |
| Going out concealed (no earlier melds) | 100 extra, 200 in total |

### A worked hand

North–South go out. They have one natural canasta of kings (500), one mixed canasta of queens (300), two red threes (200) and the going-out bonus (100): 1,100 in bonuses. Their melded cards are 7 kings (70), 5 queens plus 2 twos (50 + 40 = 90) and three aces (60), 220 in total. Their hand scores 1,320.

East–West have one mixed canasta (300) and one red three (100), with 150 in melded cards, and are caught holding 85 points: 300 + 100 + 150 − 85 = 465.

Play continues until a team reaches 5,000; the higher total wins.

### Two-player canasta

Two-player versions usually deal 15 cards each, draw two cards per turn, and require two canastas to go out.`,
    },
    {
      id: "stakes",
      title: "Canasta for stakes and good table habits",
      body: `Canasta is often played for small stakes at clubs and in homes, typically a fixed rate per 100 points of margin at the end of the game. Everyone playing for money should be 18 or older, or the local legal gambling age, and local rules on private gambling apply.

Because canasta has so many regional versions, write down before you start:

- whether you draw one or two cards per turn;
- the initial meld table and whether you may take the pile toward it;
- how many canastas are needed to go out;
- the target score and the rate per 100 points.

Canasta rewards partnership judgement: when to freeze the pile, when to hold a pair to take it, and when to meld versus keep cards concealed for a bigger bonus. Luck still matters in the deal and in who wins a big pile. The balance is discussed in [skill-based gambling](/guides/skill-based-gambling). Keep stakes within an amount set aside in advance, and use the [responsible gambling](/responsible-gambling) tools if a game stops being fun.`,
    },
    {
      id: "pvp",
      title: "Canasta odds and a hashed PvP round",
      body: `Canasta's odds are driven by composition: 12 wild cards, 4 red threes and a 108-card stock that nobody can see. A fair game depends on a thorough shuffle of two decks, which takes more work than one, as the [how to shuffle cards](/guides/how-to-shuffle-cards) guide explains.

PVPspinArena runs three player-vs-player games with no melds to plan: Jackpot, Coinflip and [Roulette](/roulette). A Coinflip is a straight 50/50. Roulette is a 33-slot wheel where Purple and Silver return 32/33 and Green returns 14/33 before the 5% win fee. Instead of shuffled decks, results come from seeds committed before the round and revealed afterward, and any settled round can be checked on the [fairness](/fairness) page. The skill in canasta has no counterpart there; [expected value in gambling](/guides/expected-value-gambling) explains how to think about the cost of pure-chance play.

In the same cluster, see also [how to play spades](/guides/how-to-play-spades) and [how to play gin rummy](/guides/how-to-play-gin-rummy).

See also [phase 10](/guides/phase-10-rules).`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you deal in canasta?",
      a: "In classic four-player partnership canasta, each player gets 11 cards. Two-player versions usually deal 15 cards each.",
    },
    {
      q: "What are the wild cards in canasta?",
      a: "The four jokers and the eight twos. A meld may contain at most three wild cards and must have at least two natural cards.",
    },
    {
      q: "How much is a canasta worth?",
      a: "A natural canasta with no wild cards is worth 500 points. A mixed canasta containing one to three wild cards is worth 300.",
    },
    {
      q: "What do red threes do in canasta?",
      a: "They are bonus cards laid down immediately and replaced from the stock. Each is worth 100, or 800 for all four, but they count against a team that has not melded.",
    },
    {
      q: "What does it mean when the canasta pile is frozen?",
      a: "A frozen pile can only be taken with a natural pair matching the top card. It is frozen by a wild card in the pile, or for a team that has not yet made its first meld.",
    },
    {
      q: "What score do you play canasta to?",
      a: "Classic canasta is played to 5,000 points. The team with the higher score when one side passes 5,000 wins.",
    },
  ],
  sources: [
    { label: "Wikipedia: Canasta", url: "https://en.wikipedia.org/wiki/Canasta" },
    { label: "Pagat: Canasta rules", url: "https://www.pagat.com/rummy/canasta.html" },
    {
      label: "Bicycle Cards: how to play Canasta",
      url: "https://bicyclecards.com/how-to-play/canasta",
    },
  ],
  related: [
    "how-to-play-rummy",
    "how-to-play-gin-rummy",
    "52-card-deck",
    "how-to-shuffle-cards",
    "how-to-play-spades",
    "phase-10-rules",
  ],
  updated: "2026-09-27",
};
