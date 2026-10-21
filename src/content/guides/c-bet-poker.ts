import type { Guide } from "./types";

export const guide: Guide = {
  slug: "c-bet-poker",
  cluster: "Poker",
  keyword: "c bet poker",
  secondary: [
    "continuation bet",
    "flop texture",
    "dry board",
    "half pot bet",
  ],
  title: "C Bet Poker: Flop Textures and Pot Dollars",
  description:
    "C bet poker is the preflop raiser's flop bet. A glossary defines rainbow and ragged boards. A half-pot picture is arithmetic, not a profit promise.",
  h1: "C bet poker: the raiser's flop bet, the board, and a dollar pot",
  answer:
    "C bet poker means the preflop raiser bets the next street, usually the flop. The PokerStars glossary opened 20 October 2026 defines a bet, a rainbow board, and a ragged flop, and it does not print a required size. A dollar picture below is arithmetic on a made-up pot. It is not a promise that the bet profits.",
  facts: [
    "Last tested 20 October 2026 on the PokerStars glossary and on the Pagat Hold'em page for the street order.",
    "A continuation bet is the preflop raiser's bet on a later street. The glossary does not print a mandatory fraction of the pot.",
    "A rainbow flop has three suits, so no flush completes on the turn. A ragged flop is one that looks like it helped nobody much.",
    "The glossary's semi-bluff is a bet that can win immediately or improve if called. It is not a required flop size.",
    "No win rate is printed on those pages. This note is education, not a claim you will profit.",
    "This site charges 5% of the pot only after a flop. The fee does not change because you bet.",
  ],
  sections: [
    {
      id: "what",
      title: "What a c bet poker flop bet is",
      body: `In c bet poker the preflop raiser is the player who bets the flop. The bet continues the raise. It is still just a bet, which the PokerStars glossary defines as the first chips placed on a street.

Pagat's Hold'em page, opened the same day, puts the flop after the first betting round. Three community cards, then a betting round that starts left of the dealer.

You can bet, check, call, or fold under the rules of the game. Nothing on the glossary says the raiser must bet. A check is legal.

The name is a habit, not a law. If you called preflop, your flop bet is not this continuation. It is someone else's bet to respond to.

The [poker topic](/guides/topics/poker) is the hub. [The order of the streets](/guides/how-to-play-poker) is the longer start if the flop itself is new.

This page will not print a frequency. A solver chart you did not open is not a source.`,
    },
    {
      id: "dry",
      title: "Ragged boards, rainbow boards, and a blank turn",
      body: `The glossary calls a ragged flop one that does not appear to help anybody very much, and it gives J-6-2 as the picture. Few straights are available, and the high card is lonely.

A rainbow flop, on the same page, has three different suits, so no flush can be made on the turn. Pair that with a ragged rank and the board is dry in ordinary speech.

A blank is a later card that does not seem to change the standings. The glossary's example is an A-J-T flop and a turn deuce.

On a dry flop, a bet from the raiser represents a made hand more cleanly, because fewer draws can call with a strong plan. The glossary defines representing as playing as if you hold a certain hand.

That is a description, not a percent. The page does not say how often the bet should happen. Anyone who quotes a rate is adding a number this article refuses.

[A weak-hand bet](/guides/bluffing-in-poker) is the cousin when you want a fold and have little else. A continuation can be that, or it can be value. The board does not tell you which.`,
    },
    {
      id: "wet",
      title: "Connected boards and the glossary's scare card",
      body: `A wet board is the opposite picture: ranks close together, often with two of a suit. The glossary does not use the word wet. It does give the materials.

Its scare-card example starts with T-8 on a Q-J-9 flop. The straight is already there, and a ten is described as a card that can wreck the hand that was ahead.

More hands can continue on that texture. A pair, a draw, and a made straight can all have a reason to call. A small bet does not fold as many of them as it might on J-6-2.

The glossary's semi-bluff is a bet or raise you hope is not called, while you still have outs if it is. K-Q on T-5-J is the page's picture.

That shape can be a continuation when you were the raiser. It is not an order.

No page we opened prints the chance that a flush draw completes. Leave a specific out-count unpublished unless you are doing the count from the deck yourself, and even then it is not a profit promise.

[Three hole cards through the flop](/guides/pineapple-poker) add more draws. The bet is still optional.`,
    },
    {
      id: "size",
      title: "A half-pot picture that is only arithmetic",
      body: `The glossary does not print a correct fraction. Half the pot, a third of the pot, and the whole pot are choices. None of them is "the" size.

Dollar example 1 uses a pot of $24 after the preflop raise is called. Half of $24 is $12. If one player calls $12, the pot becomes $48.

Dollar example 2 uses the same $24 and a bet of one third. One third of $24 is $8. If that bet is called, the pot becomes $40.

Both pictures assume a single caller and no rake inside the example. A real table may take a fee. That fee was not on the glossary, so it stays not published.

A larger bet risks more when you are behind, and it asks the caller to pay more. A smaller bet risks less and gives a draw a cheaper card. Neither fact is a schedule that wins by itself.

[Bubble dollars](/guides/icm-poker) are a tournament price. They do not set this flop size.`,
    },
    {
      id: "check",
      title: "Checking the flop is allowed",
      body: `The raiser may check. The glossary's free-card note is the related idea: sometimes a later street is cheaper because earlier action, or your image, stops a bet.

Checking a dry board can be right when your hand hates a call and has little to bluff with. Checking a wet board can be right when you do not want to build a pot you will hate on a scare card.

Betting can also be right, for value or as a semi-bluff. The point of this section is that the continuation is a choice. The word "auto" is the mistake.

If everyone checks, the turn is free in the sense that no more chips enter. It is not free of the money already in the pot, and it is not a sign you are owed the next card.

Position still matters. Acting last, you see the checks before you decide.

Acting first, your check gives that information away. Pagat says the flop round starts left of the dealer.`,
    },
    {
      id: "compare",
      title: "A flop bet beside a house game and a posted fee",
      body: `The continuation does not create the fee. The room or the site does. These three lines keep that split visible.

| | Fee or edge | Who you play against | Payout speed | Provably fair | Minimum bet |
| --- | --- | --- | --- | --- | --- |
| A continuation on a cash table | Room rake not published on the glossary | Other players | Whatever that cashier prints. Not tested here | Not published on the glossary | Not published |
| House-banked casino | Not published | The house | Not published | Not published | Not published |
| PVPspinArena | 5% of the pot only after a flop, on six-max No-Limit Hold'em | Other players | Balance updates when the hand settles | Yes, seed committed before the hand | Shown on the table |

How PvP compares: a flop bet is a decision among players. [Poker](/poker) here is six-max No-Limit Hold'em, and the fee is 5% of the pot only after a flop, whether you bet or check.

A settled hand can be recomputed on the [fairness page](/fairness). That check does not grade your flop choice, and it does not pay you for a good texture.

| Board, from glossary language | What is on it | What a continuation is not |
| --- | --- | --- |
| Ragged, such as J-6-2 | Few obvious draws | A required bet |
| Rainbow | Three suits, no flush on the turn | A promise of a fold |
| Blank turn, such as a deuce after A-J-T | A card that changes little | A new made hand by itself |
| Scare card, such as a ten on Q-J-9 | A card that can wreck the leader | A reason to ignore the pot size |

[The two-card rules](/guides/texas-holdem-rules) still govern the hand. A texture does not rewrite them.`,
    },
    {
      id: "dollars",
      title: "The site fee on a pot that already saw a flop",
      body: `Dollar example 3 uses this site, not the $24 picture. Suppose the pot reaches $40 and has seen a flop. Five percent is $2, so the winner keeps $38.

The $2 is charged because the hand saw a flop, not because the bet was half the pot. A check that leads to a later bet does not erase the fee once the flop is dealt under this site's rule.

The $12 bet in the first picture is not a fee. It is a wager the caller can take by winning the hand. You can lose it.

Cash-out minimum here is $20 in BTC, USDC, or ETH. We did not time a cash-out. Nothing in that sentence depends on flop texture.`,
    },
    {
      id: "checks",
      title: "Checks before the raiser puts chips in",
      body: `Name the board before you act. The c bet poker habit is to bet first and look second, and that order is the leak.

- [ ] Confirm you are 18, or older if local law sets a higher age.
- [ ] Confirm you were the preflop raiser. If you were not, this is not your continuation.
- [ ] Say whether the flop is ragged, rainbow, connected, or two-suited.
- [ ] Pick a size you can explain as a fraction of this pot.
- [ ] Refuse any win-rate percent that has no date and no source.
- [ ] Allow a check. The bet is not mandatory.
- [ ] Count the money already in the pot before you add more.
- [ ] Keep a tournament bubble price off a cash flop unless you are actually in a tournament.
- [ ] Remember this site's fee is 5% after the flop, not a texture bonus.
- [ ] If the next flop is a chase, call 1-800-GAMBLER.`,
    },
    {
      id: "limits",
      title: "Who should not treat the bet as income",
      body: `Do not play for money if you are under 18, or under a higher local age. Do not play where the game is illegal. Do not stake rent, savings, or money with a due date.

Do not bet every flop because a paragraph said dry boards have fewer draws. Fewer draws is not the same as a fold, and a fold is not the same as profit over a month.

No opened page prints a win rate for a c bet poker flop. A correct-looking bet can still be called and lose.

A losing session does not make the next continuation "due." The board is a new set of cards. The glossary does not store a debt.

This page is an editorial note. It is not a system, not a staking pitch, and not a promise you will win. Anyone selling a percent without the inputs is selling a story.

If play stops being a bounded spend, call 1-800-GAMBLER and open [responsible gambling](/responsible-gambling).`,
    },
  ],
  faqs: [
    {
      q: "What is a c bet poker decision?",
      a: "It is the preflop raiser's choice to bet a later street, most often the flop. The glossary defines a bet as the first chips placed on a street, and it does not require the raiser to be the one who places them. A check is allowed. The continuation is a habit with a name, not a rule of Hold'em. Pagat still starts the flop action left of the dealer.",
    },
    {
      q: "What does a ragged or rainbow flop mean?",
      a: "The glossary calls a ragged flop one that does not seem to help anybody much, and it offers J-6-2. A rainbow flop has three different suits, so a flush cannot finish on the turn. Those are descriptions of the board. They are not a required bet size and not a fold frequency. A deuce on a later street can be a blank, meaning it changes little. None of that guarantees a profit.",
    },
    {
      q: "How big is the bet in the dollar picture?",
      a: "On a $24 pot, half is $12 and one third is $8. A single call of $12 makes the pot $48. A single call of $8 makes it $40. Those are arithmetic examples with no rake inside them. The glossary does not name a correct fraction. A real room may charge a fee that this page did not find printed, so that fee stays not published.",
    },
    {
      q: "Does the raiser have to bet?",
      a: "No. Checking is legal. A dry board can be checked when a bluff has little behind it, and a connected board can be checked when you do not want a large pot. Betting can still be value or a semi-bluff, which the glossary describes as a bet you hope folds the field while you keep outs. The choice depends on the hand and the price. It is not automatic.",
    },
    {
      q: "Will this bet make money over time?",
      a: "This page does not say that. No opened source prints a win rate for betting the flop. A single pot can be won or lost, and a month of them can finish behind. Semi-bluffs are not free rolls. Do not stake money you need, and do not treat a dry board as income. If a clip quotes a percent without inputs, leave that percent unpublished.",
    },
    {
      q: "Does this site charge extra because you bet the flop?",
      a: "No. The fee is 5% of the pot only after a flop, on six-max No-Limit Hold'em, whether the raiser bets or checks. A $40 pot that has seen a flop pays the winner $38. You can recompute the hand on the fairness page. That check does not score the flop decision. Cash-out minimum is $20 in BTC, USDC, or ETH.",
    },
  ],
  sources: [
    {
      label: "PokerStars poker glossary",
      url: "https://www.pokerstars.com/poker/terms/",
    },
    {
      label: "Pagat — Texas Hold'em streets and a limit example",
      url: "https://www.pagat.com/poker/variants/texasholdem.html",
    },
  ],
  related: [
    "bluffing-in-poker",
    "texas-holdem-rules",
    "how-to-play-poker",
    "pineapple-poker",
    "icm-poker",
    "gto-poker-strategy",
  ],
  updated: "2026-10-20",
};
