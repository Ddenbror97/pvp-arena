import type { Guide } from "./types";

export const guide: Guide = {
  slug: "nertz-rules",
  cluster: "Games of chance",
  keyword: "nertz rules",
  secondary: ["nerts", "pounce", "racing demon", "how to play nertz", "nertz scoring"],
  title: "Nertz Rules: Setup, Scoring and the Race | PvP Spin Arena",
  description:
    "Nertz rules for the multiplayer solitaire race: each player's pile, shared ace-to-king foundations, stock turns, the shout, and common scoring.",
  h1: "Nertz rules: the pile, the race and the score",
  answer:
    "Nertz rules describe a multiplayer solitaire race, also called Nerts, Pounce or Racing Demon. Each player brings a distinct 52-card deck. Deal 13 cards to a Nertz pile with the top face up, four face-up tableau cards, and a stock with the rest. Shared foundations start with aces and build up in suit. You may build down in alternating colors on other players' tableaus. Turn the stock three cards or one. The first player to empty the Nertz pile yells Nertz and the hand stops. A common score is one point per foundation card, minus two per card left in your Nertz pile.",
  facts: [
    "Every player uses their own 52-card deck. Backs must be distinguishable so cards can be sorted.",
    "The personal layout is 13 cards in the Nertz pile, four tableau cards face up, and the rest as stock.",
    "Foundations are shared, begin with aces, and build up in suit to the king.",
    "Work piles build down in alternating colors, and you may play onto other players' tableaus.",
    "Emptying the Nertz pile and calling Nertz ends the hand at once, even if foundations are unfinished.",
    "Common score: +1 for each of your cards on foundations, and −2 for each card left in your Nertz pile.",
  ],
  sections: [
    {
      id: "names",
      title: "Nertz, Nerts, Pounce and Racing Demon",
      body: `These names are one race with local accents. Nertz and Nerts are the usual American names. Pounce is an older American name. Racing Demon is the British name, from a game described in England in the 1890s. You will also hear Peanuts, Squeal and Scramble. The layout below is the common Nertz deal: a 13-card pile, four work piles and a stock.

It is not double solitaire. Double solitaire is two Klondike fans and, in many houses, turns. Nertz is simultaneous. Nobody waits.

Each player needs a complete [52-card deck](/guides/52-card-deck) with a back the others can tell apart. Four players means four decks and 208 cards on one table. Jokers come out. Before the first hand, each player counts their deck to 52. A missing ace makes every foundation argument worse, because that suit can never finish and the empty Nertz pile becomes the only way to end the hand.

The game is a speed game with a real scoring argument at the end of every deal, which is why it belongs with the other table games on the [games of chance](/guides/topics/games-of-chance) topic. Calling the name stops the cards. It does not, by itself, decide the score.`,
    },
    {
      id: "setup",
      title: "Setting up one player's cards",
      body: `Each player [shuffles](/guides/how-to-shuffle-cards) their own deck. The opponent may cut. Then each player builds a personal layout. Do this at the same time, and do not start playing until every layout is ready.

1. Count 13 cards face down. Square them into the Nertz pile. Flip the top card face up. Only that top card is available. You never spread the pile.
2. Deal four cards face up in a row beside the Nertz pile. These are your work piles, also called the river or the tableau. Each starts as a single face-up card. There are no face-down cards under them.
3. The remaining 35 cards are your stock, face down. Leave space for a waste pile next to it.

Shared space in the middle of the table is for foundations. Nothing is dealt there. Any player may start a foundation by playing an ace into that space. Because every deck has an ace of spades, several spade foundations will exist at once. Each one is its own pile, built in suit from ace to king. You do not stack two aces on one pile.

Personal piles stay in front of their owner. You may play onto another player's work piles, but you do not touch their Nertz pile, their stock or their waste. Those three are private.

A player who cannot sit where they can reach the center should not be dealt in. The race assumes every hand can reach every foundation. Five or six players need a large table. Two players is a legal game and a good way to learn the score before you add speed.`,
    },
    {
      id: "plays",
      title: "What you may play, and where",
      body: `Play is simultaneous. A legal card may come from three places only: the top of your Nertz pile, the top card of one of your work piles, or the top card of your waste pile.

Foundations:

- An ace starts a new shared foundation.
- Build up in the same suit to the king.
- Any player may play to any foundation.
- When a foundation reaches the king, turn it face down and leave it as a finished pile so it stops attracting cards. Those cards still score for whoever played them.

Work piles:

- Build down, alternating colors. A red 6 plays on a black 7.
- Move one card at a time. This page does not let you lift a whole sequence in one grab. Playing the cards one by one is the same result and it lets other players take the newly exposed card.
- You may play onto your own work piles or anyone else's.
- An empty work pile may be filled by any available card, including a card from your Nertz pile. Some houses allow only a king to fill a space. King-only spaces are a house rule. Say so if you use them. The open fill is the default here.

You may not move a foundation card back to a work pile. You may not rearrange someone else's waste. You may not look through your Nertz pile.

Priority when two players want one spot: the card that lands flat and legal stays. A card still in the air goes back to where it came from. Do not slide a card under someone else's card after theirs has landed. This is the whole of the collision rule. Arguing about intent stops the race, so apply the landing rule and keep going.

The top of the Nertz pile is the card you most want to play. Every other move is in service of exposing the next one. Filling a work pile with the Nertz card is often better than a pretty foundation play that leaves the pile stuck.`,
    },
    {
      id: "stock-and-call",
      title: "The stock and calling Nertz",
      body: `When you have no move you want to make, turn the stock. Agree the turn before the hand.

- Turn three. Take up to three cards from the stock and flip them as a unit onto the waste, without changing their order. Play the top one if you can. The two under it wait.
- Turn one. Flip a single card. Easier for a first game.

Only you turn your stock. You may turn in the middle of other people's plays. You do not need permission. After a turn, you may play the new waste card and then go back to the Nertz pile or the work piles. When the stock is exhausted, flip the waste face down, unshuffled, to make a new stock. Unlimited redeals are standard. A three-pass limit is a house rule borrowed from software Klondike.

The hand ends when a player plays the last card off their Nertz pile and calls "Nertz." The call and the empty pile go together. Playing the card without the call still ends the hand once the table sees the pile is empty, but the call is how you stop 208 moving cards. Everyone freezes. Cards that have not landed go back to the pile they left. A card that landed legally before the call stays, and it scores.

You do not have to empty your work piles or your stock. Those cards are simply out of the scoring penalty. The penalty, in the common score, hits only the Nertz pile.

If two players empty the pile on the same beat, both calls stand, both penalties are zero, and you score the foundations as they landed. Do not replay the hand unless a card was actually played after the first empty pile was visible.

Practice the call once before a money-free learning game so nobody is embarrassed to shout. The shout is the rule, not a joke.`,
    },
    {
      id: "scoring",
      title: "Scoring the hand",
      body: `Sort cards by back design before you count. Foundations are a mix of every deck. Each player pulls their own cards out of every foundation pile, including finished ones.

The common score for the hand:

- Plus 1 for each of your cards that sits on a foundation.
- Minus 2 for each card left in your Nertz pile.

Work-pile cards, stock cards and waste cards score nothing. They do not help and they do not hurt.

A player who called Nertz has a penalty of zero and adds only their foundation cards. That player can still lose the hand on points. If you called with 4 cards on foundations, you score 4. A player who never called, with 12 cards on foundations and 3 cards left in the Nertz pile, scores 12 minus 6, which is also 6, and beats you. The call ended the hand. It did not award an automatic win. Play the next cards to foundations while you dig through the pile, or the call comes too early.

Worked table after a four-player hand:

| Player | Foundation cards | Left in Nertz | Score |
| --- | --- | --- | --- |
| Ada (called) | 9 | 0 | 9 |
| Ben | 14 | 4 | 14 − 8 = 6 |
| Cho | 7 | 6 | 7 − 12 = −5 |
| Dee | 11 | 2 | 11 − 4 = 7 |

Ada wins the hand on 9. A match is the sum of hands. First to 100 is a common match, and some tables play to 50 or play a fixed number of deals.

Scoring variants you should name if you use them:

- Minus 1 per leftover Nertz card, instead of minus 2.
- Foundations only, no penalty.
- The caller wins the hand outright, and points are ignored. That is a different game. It rewards an early shout and punishes foundation play.
- A bonus of 10 or 15 added to the caller's score on top of the card count.

This page uses plus 1 and minus 2, with no automatic win for the call, and a match to 100 if you are keeping a running total. Write the variant on the score sheet if you change it.`,
    },
    {
      id: "fair-race",
      title: "Keeping a fast hand fair",
      body: `Speed is the fun, and speed is where grabs happen. The landing rule covers collisions. A few more habits cover the rest.

Square the Nertz pile after every play so the new top card is obvious. Fan the four work piles downward only when a pile is more than one card, so colors can be read. Keep your waste in a tight pile. A spread waste is a way of seeing three cards when the rule allows one.

Do not touch another player's Nertz pile to "help." If their top card is an ace and they have not seen it, that is their tempo. Taking it for them is not a rule.

Sort and score in the open. Each player counts their own foundation cards, and a neighbour confirms the Nertz penalty. Negative scores are normal in a short hand. Do not round them up to zero unless that is a stated variant.

There is no casino taking a cut of a Nertz hand. The score moves between players. If you stake the match, adults only, 18+, and agree the unit per point or per match before the first deal. A different kind of checkable two-player result lives on the [fairness](/fairness) page, which opens committed seeds after an online round. It is not a substitute for counting cards on this table.

New groups should play one practice hand with turn-one stock and no score, then switch to the real count. The rules are short. The mistakes are almost all physical: playing from the middle of the Nertz pile, building a foundation in mixed suits, or moving a whole work-pile sequence in one slap. [Gin rummy](/guides/how-to-play-gin-rummy) is the slow cousin if you want a two-player card game with time to think. Nertz is the one you play standing up, with the decks marked, and with the score written before anyone shuffles again.

See also [klondike solitaire](/guides/solitaire-rules), [double solitaire](/guides/double-solitaire) and [kings in the corner](/guides/kings-corner-rules).`,
    },
  ],
  faqs: [
    {
      q: "What are the basic nertz rules?",
      a: "Each player has a private 52-card deck: 13 cards in a Nertz pile, four work piles, and a stock. Everyone plays at once onto shared ace-to-king foundations, and may build down in alternating colors on any work pile. The first player to empty the Nertz pile calls Nertz and stops the hand.",
    },
    {
      q: "How do you score nertz?",
      a: "A common score is one point for each of your cards played to a foundation, minus two points for each card left in your Nertz pile. Work piles and the stock do not score. First to 100 is a usual match.",
    },
    {
      q: "Is nertz the same as pounce and racing demon?",
      a: "They are the same family. Nertz and Nerts are common American names, Pounce is an older one, and Racing Demon is the British name. Deal details differ by house, so agree the pile size and the score before you start.",
    },
    {
      q: "Can you play on someone else's cards in nertz?",
      a: "You may play onto any player's work piles and onto any shared foundation. You may not touch another player's Nertz pile, stock or waste.",
    },
    {
      q: "Does yelling nertz automatically win?",
      a: "It ends the hand. Under the common score the caller still only gets one point per foundation card and a zero penalty. Another player can finish with a higher total. Some houses give the caller an automatic win, which is a variant.",
    },
  ],
  sources: [
    { label: "Wikipedia: Nerts", url: "https://en.wikipedia.org/wiki/Nerts" },
    { label: "Pagat: Nertz", url: "https://www.pagat.com/patience/nerts.html" },
  ],
  related: [
    "solitaire-rules",
    "double-solitaire",
    "kings-corner-rules",
    "speed-card-game",
    "52-card-deck",
  ],
  updated: "2026-09-29",
  howTo: true,
};
