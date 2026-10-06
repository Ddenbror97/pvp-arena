import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crazy-4-poker",
  cluster: "Casino games",
  keyword: "crazy 4 poker",
  secondary: [
    "crazy 4 poker rules",
    "crazy 4 poker super bonus",
    "queens up side bet",
    "crazy 4 poker ante",
  ],
  title: "Crazy 4 Poker: Queens, Aces and the Ante",
  description:
    "Crazy 4 Poker deals five cards and you play four. See the ante, the play bet, queens-up qualifying, and the super bonus side.",
  h1: "Crazy 4 poker: five cards dealt, four cards played",
  answer:
    "Crazy 4 poker deals five cards and you play four of them against the dealer. You post an ante, then fold or make a play bet after you choose a discard. On the common layout the dealer qualifies with king-high or better, a pair of aces or better may raise the play bet, and Queens Up is an optional side bet rather than the qualify rule. The super bonus is its own posted price.",
  facts: [
    "You and the dealer each receive five cards. Each side discards one and plays a four-card hand.",
    "The ante is required. On the common commercial sheet the super bonus matches the ante and is required too.",
    "After the discard you fold, match the ante with a play bet, or bet up to 3x the ante with a pair of aces or better.",
    "The dealer qualifies with king-high or better on the widely published layout. Queens Up is a separate optional side bet.",
    "Four-card rank order is not five-card order: three of a kind beats a flush and a straight.",
    "A commonly published figure for one standard layout is about 3.4% of the ante. The felt controls the schedules. Adults 18+ only.",
  ],
  sections: [
    {
      id: "five-cards",
      title: "Five cards dealt, four cards played",
      body: `Crazy 4 Poker is a house-banked poker variant built on a four-card hand. The deal gives you five cards and gives the dealer five. You choose one card to discard. The dealer discards one card by a fixed house way. The remaining four cards are the hand that wins, loses, or pushes against the dealer.

### Why the extra card exists

The fifth card is not a community card and not a draw from a deck you can chase. It is a choice. Dropping the wrong card can turn a straight into junk or break a flush to keep a pair. The dealer does not freestyle that choice. The house way is a printed setting, in the same family of ideas as the setting rules on [pai gow poker](/guides/pai-gow-poker). This guide does not reprint that discard chart. The felt or the rule card does.

[Poker hand rankings](/guides/poker-hand-rankings) describe five-card order. Importing that order here will mis-rank the hand, because three of a kind outranks a straight and a flush when only four cards play. [Three Card Poker strategy](/guides/three-card-poker-strategy) is another short-deck house game with its own qualify rule and its own bets. [Let It Ride poker](/guides/let-it-ride-poker) is the paytable game where you can pull bets back. Do not carry either habit across.

This page sits in [Casino games](/guides/topics/casino-games). Adults 18+ only. If the discard starts to feel like a rescue for a lost ante, stop on [responsible gambling](/responsible-gambling).

One 52-card deck is the usual shoe. Your discard and the dealer's discard are out of both hands. The four cards that remain are the only hand the bets can see.`,
    },
    {
      id: "ante-play",
      title: "The ante and the play bet",
      body: `Before the deal you post an ante. On the common Shuffle Master style sheet you also post a super bonus equal to the ante. That second chip is easy to describe as a side bet because it settles on its own rules. On that standard layout it is still required to play the hand. Queens Up, if the table offers it, is the optional extra.

### Fold, match, or raise

You see five cards, discard one, and then choose:

- Fold. The ante loses. The play bet was never made.
- Play for 1x the ante. This is the ordinary continue.
- Play for up to 3x the ante when your four-card hand is a pair of aces or better.

You cannot raise 3x with a pair of kings, and you cannot raise a random amount between the steps the layout allows. The menu is fold, one unit, or the aces-or-better raise. A published basic strategy says when a made hand is worth the one-unit play and when it should fold. That list is paytable-specific. This guide does not copy it. Guessing "king high always plays" is how the ante leaks.

The play bet pays even money when you beat a qualifying dealer. It also pays even money, on the common sheet, when the dealer does not qualify. The ante is the bet that cares about qualification.

If you fold, the ante is lost and the play bet was never made. The super bonus may still settle. Read that rule before you treat a fold as a full escape.`,
    },
    {
      id: "queens-and-qualify",
      title: "Queens Up is not the qualify rule",
      body: `The phrase "queens up" sounds like a qualify line because other pit games say "queen high to open" or "queens or better." On Crazy 4 Poker those are different jobs.

### Two queen ideas, one king rule

Dealer qualification, on the widely published layout, is king-high or better. Queen-high or worse does not qualify. The dealer does not need queens.

### Which circle is which

| Circle | On the common sheet |
| --- | --- |
| Ante | Required |
| Play | 1x, or up to 3x with a pair of aces or better |
| Super bonus | Required and equal to the ante |
| Queens Up | Optional, pair of queens or better |

Queens Up is an optional side bet. It pays when your four-card hand is a pair of queens or better, and it loses when your hand is weaker than that. The dealer hand does not have to cooperate. A pair of queens pays the side bet even if the dealer holds a better four-card hand. A king-high hand can win the ante comparison and still lose Queens Up, because king-high is not a pair of queens.

Aces show up in the play-bet rule, not in the qualify rule. A pair of aces or better unlocks the larger play bet. Four aces sit at the top of many super bonus sheets. Neither fact changes the king's job as the qualify threshold.

If a room prints a different qualify hand, believe the room. The commonly discussed king-high rule is one standard layout, not a law of nature. The felt in front of the player controls qualification, the Queens Up column, and the super bonus column. People who say "it qualifies on queens" are usually naming the side bet. Ask which circle they mean.`,
    },
    {
      id: "super-bonus",
      title: "How the super bonus settles",
      body: `The super bonus is the chip that makes the hand feel like a jackpot game. On the common sheet it is posted with the ante, in the same amount, and it does not simply copy the ante's win or loss.

### The usual cases

A straight or better in your four-card hand is paid from the super bonus column even if the dealer beats you. The original bonus stake is handled the way that column says, often left in place while the odds are paid. The exact multiples, from a straight at the bottom of the bonus up through four aces, belong on the felt. This page does not reprint them.

Below a straight, the common published rule is pickier. If you beat or tie the dealer, or if the dealer does not qualify, the super bonus pushes. If a qualifying dealer beats your hand, the super bonus loses. If your rule card words the non-qualifier differently, follow the card.

Queens Up never substitutes for this bonus. You can hold a pair of aces, win Queens Up, raise the play bet, and still push or lose the super bonus because a pair is not a straight. You can fold the ante and still have the bonus in play if the rules say the bonus stands.

The [house edge](/guides/house-edge) quoted for the main game usually rolls the ante, the play bet, and this required bonus into one result, then divides by the ante. It is not a percentage of the Queens Up chip.`,
    },
    {
      id: "ranks",
      title: "Four-card order and the felt price",
      body: `Settle the rank order before you argue a payout. In four-card poker the common order, best to worst, is four of a kind, straight flush, three of a kind, flush, straight, two pair, one pair, and high card. Three of a kind beating a flush is the line that surprises five-card players. An ace can play low in a wheel, A-2-3-4. A king around the ace does not make K-A-2-3 a straight.

### What a published price is measuring

A commonly published figure for one standard layout, played with a known basic strategy, is about 3.4% of the ante. The felt in front of the player controls the super bonus multiples, the Queens Up schedule, and any local change to qualification. That 3.4% sentence is the combined ante, play, and super bonus result divided by the ante. You also have a second required chip equal to the ante on that sheet, and sometimes a play bet of 1x or up to 3x. The loss per ante is not the loss per chip in the circles.

Queens Up is outside that quote. Schedules differ. One published Queens Up column is a higher price than the main game, and another column can move the number again. If the side multiples are not printed, do not post the chip.

A house-way discard you do not understand can move your results away from a chart that assumes the dealer follows the card. Ask to see that card. Write the super bonus top hand and the straight price from the glass.`,
    },
    {
      id: "session",
      title: "Units, aces, and leaving",
      body: `The ante looks small until the super bonus matches it and a pair of aces invites a 3x play bet. A $10 ante can be $20 before the play bet, and $50 with a full raise. Size the ante against that stack, not against the ante circle alone. Count the bonus chip before you call the unit small.

### A session you can finish

- Post Queens Up only after you have read its column and accepted a separate price.
- Fold when your chart folds. A king-high "maybe" is how the ante becomes a habit.
- Use the 3x raise only on the hands the rules and the chart allow.
- Stop on a written loss or a clock. Four aces are rare on purpose.
- Do not raise the ante because the last straight lost.

The house way will sometimes discard a card you would have kept. That is the rule, not a tell you can talk the dealer out of. Arguing the setting after the hand is a way to stay seated past the stop.

Adults 18+ only. This is an explanation, not a license where the game is illegal for you, and not a tax opinion. If you cannot discard and fold without negotiating with yourself, the 3x button will get the chips the chart wanted to save.

PVPspinArena does not deal Crazy 4 Poker. Jackpot, Coinflip, and Roulette are the live games, in USDC or ETH on Base. A four-card pit game is not one of those tables with a new name.`,
    },
    {
      id: "keep",
      title: "What to read on the layout",
      body: `Six lines, written while the cards are still in the shoe.

### The check

You receive five cards and play four. The dealer sets four by a house way you can read. The ante is required. On the common sheet the super bonus matches it and is required. Queens Up is optional and pays on a pair of queens or better in your four-card hand. Qualification on that widely published layout is king-high or better. A pair of aces or better may play up to 3x. Everyone else who continues matches the ante or folds.

Four-card order puts three of a kind above a flush and a straight. A commonly published figure for one standard layout is about 3.4% of the ante, combining ante, play, and super bonus. The felt controls the columns. If qualify is not king-high, or the bonus is optional, write the local rule and do not quote 3.4%.

Date the note. A screenshot of Queens Up and the super bonus is the price. A story about "queens qualifying" is usually the side bet wearing the wrong name.

Then write a stop in ante units, and remember each ante drags a bonus chip with it on the standard sheet. Ranks tell you who won. The felt tells you what the bonus pays. The house way tells you which card the dealer drops. Ask for the house way card first. If that card is missing from the note, ask for it before the first ante. A discard remembered from another pit is a different game.`,
    },
  ],
  faqs: [
    {
      q: "Why does Crazy 4 Poker deal five cards?",
      a: "You discard one and play four. The dealer discards one by a house way. The fifth card is the setting choice, not a community card.",
    },
    {
      q: "Does the dealer need queens to qualify?",
      a: "On the widely published layout the dealer needs king-high or better. Queens Up is an optional side bet that pays on a pair of queens or better in your hand. The felt controls both.",
    },
    {
      q: "When can I bet more than the ante?",
      a: "When your four-card hand is a pair of aces or better, the common rules let you play up to 3x the ante. Other continuing hands play 1x, or you fold.",
    },
    {
      q: "What is a commonly published house edge?",
      a: "About 3.4% of the ante for one standard layout with a known basic strategy, counting ante, play, and the required super bonus together. Queens Up is a separate schedule. The felt controls the columns.",
    },
    {
      q: "Does PVPspinArena offer Crazy 4 Poker?",
      a: "No. This site offers Jackpot, Coinflip, and Roulette. The guide is for adults 18+ reading a house poker table dealt elsewhere.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: Crazy 4 Poker",
      url: "https://wizardofodds.com/games/crazy-4-poker/",
    },
    {
      label: "Players Edge: How to play Crazy 4 Poker",
      url: "https://playersedge.org/assets/pdf/crazy-4-poker.pdf",
    },
    {
      label: "Wizard of Odds: house edge comparison",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
  ],
  related: [
    "let-it-ride-poker",
    "three-card-poker-strategy",
    "pai-gow-poker",
    "poker-hand-rankings",
  ],
  updated: "2026-09-29",
};
