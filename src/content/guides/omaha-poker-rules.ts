import type { Guide } from "./types";

export const guide: Guide = {
  slug: "omaha-poker-rules",
  cluster: "Poker",
  keyword: "omaha poker rules",
  secondary: [
    "pot limit omaha",
    "must use two hole cards",
    "Omaha Hi-Lo",
    "PLO versus Hold'em",
  ],
  title: "Omaha Poker Rules: How to Play PLO Step by Step",
  description:
    "Omaha poker rules made simple: dealing four hole cards, the must-use-two rule, pot limit betting, Omaha Hi-Lo and key differences from Hold'em.",
  h1: "Omaha poker rules: four cards, two of them, pot limit",
  answer:
    "Omaha poker rules give each player four hole cards, then deal five community cards in the same flop, turn, and river pattern as Texas Hold’em. At showdown you must use exactly two of your hole cards and exactly three community cards. You cannot play the board, and you cannot use three cards from your hand. The common betting form is pot limit, called PLO, where the maximum bet is the size of the pot. Omaha Hi-Lo splits the pot between the best high hand and a qualifying low. Hand rankings for the high are the familiar poker rankings. The four-card starting hand is what makes the game look richer and miss more often than Hold’em.",
  facts: [
    "Each player receives four private cards in standard Omaha.",
    "You must use exactly two hole cards and three board cards.",
    "Pot-limit Omaha caps a bet at the current pot size.",
    "Aces, pairs, and suited cards matter, but all four cards must work together.",
    "Omaha Hi-Lo awards the low only to a qualifying five-card hand of 8 or better.",
    "Seeing four cards is not the same as having a made hand.",
  ],
  sections: [
    {
      id: "deal",
      title: "How a pot-limit Omaha hand is dealt",
      body: `Omaha poker rules start with the same blinds you already know if you have played Hold’em. The dealer gives each player four hole cards, one at a time, face down. There is a betting round. Then the flop brings three community cards, another betting round, a single turn card, another round, and a river card with a final round. [Texas Hold’em rules](/guides/texas-holdem-rules) are the right comparison for that street order. If the streets themselves are new, [poker for beginners](/guides/poker-for-beginners) is the shorter start. The difference is the private hand: four cards, not two.

At showdown you choose exactly two hole cards. The other two are dead for that hand, even if they look pretty. The board supplies the other three cards. If the board is A-K-Q-J-9 and you hold 10-8-2-2, you do not have a straight. You would need to play the ten with four board cards, and the rules forbid that. You have a pair of twos, using both twos, or a worse one-pair hand if you play the ten with a board ace and nothing else useful. The ten does not “connect” by itself.

The [Poker guides](/guides/topics/poker) hub has the ranking page you will want open the first few sessions. [Poker hand rankings](/guides/poker-hand-rankings) do not change in Omaha high. A flush still beats a straight. What changes is how often everyone seems to have one.

Worked example 1. Your four cards are A♠ K♠ 9♦ 8♦. The board is Q♠ J♠ 2♣ 4♥ 7♠. You may play A♠ K♠ with Q♠ J♠ 7♠ and make a flush. You may not play A♠ alone and claim a royal. Two hole cards are the flush. That is a legal ace-high flush, and it is the hand you table.`,
    },
    {
      id: "two-card",
      title: "The must-use-two rule",
      body: `Every showdown argument in a home game is this rule. You always use two hole cards and three from the board. A set is a pair in your hand plus one matching board card, with two other board cards filling out the five. Three of a kind on the board does not gift the table a full house.

Say the board is A-A-A-K-7 and you hold Q-J-5-4. You may use Q-J plus the three aces. That is exactly two hole cards and three community cards, so the hand is trip aces with queen-jack kickers. You may not add the king as a fourth community card. If instead you held 7-7-5-4, you could use the pair of sevens plus two aces and the king, or sevens plus three aces, and the full house is the better legal five. Read only the five cards the rule allows, not all nine cards you can see. Four of a kind and full houses are common. Top pair is not.

| Idea | Hold’em | Omaha |
| --- | --- | --- |
| Hole cards | 2 | 4 |
| Cards used from hand | Any 0, 1, or 2 | Exactly 2 |
| Cards used from board | The rest, up to 5 | Exactly 3 |
| Nut flush | Best suit in hand | Best two-card suit, including the ace often in hand |
| Playing the board | Allowed | Impossible |`,
    },
    {
      id: "pot-limit",
      title: "Pot-limit betting, with the size worked out",
      body: `Pot limit means the most you may bet is the size of the pot, and the most you may raise is a pot-sized raise. A pot-sized raise is not “whatever feels like the pot.” When someone has bet, you first imagine calling. The pot then includes the original pot, their bet, and your call. You may raise by that amount. Your total chips into the pot are the call plus that raise.

The shortcut: a pot-sized raise facing a bet of B into a pot of P (P does not yet include B) is a raise to P + 3B. You put in P + 3B total if you were not the bettor.

Min-raises and the other table manners follow the house card. Some rooms allow a string of raises; pot limit still caps each one. You can be all-in for less. You cannot announce “pot” and then toss extra chips because the draw got prettier in your head.

A pot-sized flop bet is often the whole plan, because four cards make so many draws. [Coinflip](/coinflip) has no streets and no pot-sized raise. Omaha can commit a stack by the turn because the pot got large early.

Worked example 2. The pot is $30. An opponent bets $20. A pot-sized raise is 30 + 3×20 = $90 total from you. That $90 is the $20 call plus a $70 raise, and the pot after the call would have been $70, which matches the raise amount. If you wanted only to call, you put in $20. Saying “pot” when you meant “call” is a floor mistake. Say the action clearly.`,
    },
    {
      id: "starting-hands",
      title: "What a playable four-card hand looks like",
      body: `Four cards create six possible two-card combinations. A hand is strong when several of those pairs are strong together, not when one pretty pair is glued to rags. Double-suited aces, connected cards that can make the nut straight, and pairs that can make the top set are the families teachers start with. A hand like A-A-K-K double suited is a premium. A hand like A-2-7-9 with three suits and no connection is a trap, because the ace will make second-best flushes and second-best straights.

You want the nut, or a draw to it, more than in Hold’em. Second-nut flushes get paid off and lose. If the suited ace is not in your hand, your flush is often dominated.

| Shape | Why it can play | The trap |
| --- | --- | --- |
| Double-suited aces | Several strong pairs | Still outdrawn often |
| Connected rundown | Wrap straights | The bottom end loses |
| Ace with rags | Looks like a hand | Second-best flushes |
| One pair, three danglers | A single combination | The other cards do nothing |

Position still matters. Acting last is worth as much here as on the positions page, and maybe more, because equities run close and the pot gets big. This page will not become a full preflop chart. The rule to remember is: if only one of your four cards is doing the work, fold more often than your pride wants.`,
    },
    {
      id: "hilo",
      title: "Omaha Hi-Lo, or eight or better",
      body: `Omaha Hi-Lo plays the same four cards and the same must-use-two rule, then splits a qualifying pot in half. The high half uses normal rankings. The low half goes to the best five-card low, and the low must be 8-high or better. Aces count as low. Pairs and cards above 8 spoil a low. The same two hole cards do not have to be used for both halves. You may use one pair of hole cards for the high and a different pair for the low.

A scoop is when you win both halves. Quartering is when you split one half and lose the other, so you invested in a whole pot and collected a quarter. That is the classic Hi-Lo disappointment. Chasing a low that is not nut-low, or a high that is not nut-high, is how you get quartered by a hand that has both.

If no low qualifies, the high hand takes the whole pot. “Eight or better” is a requirement, not a suggestion. A 9-low is not a low in this game. Declare nothing. Table the cards and let the dealer read both ways if the room does that. Do not throw a hand away because you thought only the high counted.

Hi-Lo is a different starting-hand family: A-2-3-4 with a suit is a classic, and high-only hands that cannot make a low are playing for half the pot when a low is possible. Know which half you are drawing to before you call a pot-sized bet.`,
    },
    {
      id: "checklist",
      title: "A checklist for your first Omaha sessions",
      body: `Use this until the two-card rule is boring.

- Count four hole cards before the flop action starts.
- Before you call a big bet, name the exact two hole cards you will use.
- Check that your flush or straight uses two from your hand, not one.
- Prefer nut draws over second-best draws.
- Announce “call” or “raise” clearly under pot limit.
- In Hi-Lo, ask whether a low is possible before you celebrate a high.

Fold when the hand is pretty and illegal. A straight you can see with one hole card is a straight somebody else might actually hold. Rooms deal Omaha because pots grow, not because more cards means an easier win.`,
    },
    {
      id: "compare",
      title: "Differences you will feel at the table",
      body: `Hold’em lets you play one hole card with four board cards, or even the board alone. Omaha never does. Hold’em no-limit lets you bet your stack whenever you like. Pot-limit Omaha lets you bet the pot, which is often enough to commit a deep stack by the turn anyway. Hold’em top pair is frequently the best hand. Omaha top pair is frequently a bluff-catcher or a fold, because someone has a wrap, a flush draw, or a made straight.

You will tie more often on the high, and you will cooler more often when both players have the same straight with a redraw behind it. Bankroll advice from a tight Hold’em game is too small for PLO. That is not a moral. It is variance. If you want a game with no hand ranking at all, a hashed coin flip is the contrast. If you want Omaha, respect the two-card rule, pot the size you can say out loud, and throw away danglers that do not work with the other three cards.`,
    },
  ],
  faqs: [
    {
      q: "How many cards do you use in Omaha?",
      a: "You are dealt four hole cards and must use exactly two of them with exactly three community cards. You cannot play one hole card, and you cannot play the board by itself the way Hold’em allows. The other two hole cards are ignored at showdown. This is the rule that changes flush and straight reading. If the straight needs one card from your hand and four from the board, you do not have it.",
    },
    {
      q: "What does pot limit mean in PLO?",
      a: "The maximum bet is the size of the pot, and the maximum raise is a pot-sized raise. If the pot is P and an opponent bets B, a pot-sized raise costs you P plus three times B in total chips. You figure this by pretending to call first, then raising by the new pot. You may call, make a smaller raise if the house allows, or go all-in if your stack is shorter than the pot. Say the action clearly.",
    },
    {
      q: "What is the difference between Omaha and Texas Hold’em?",
      a: "Hold’em deals two hole cards and lets you use any combination, including the board alone. Omaha deals four and forces exactly two from the hand. Betting in the game people mean by PLO is pot limit, while many Hold’em games are no-limit. Hand rankings for the high hand are the same. Equities run closer, nut hands matter more, and top pair is much weaker. Use the Hold’em rules page for the street order and this page for the four-card constraint.",
    },
    {
      q: "How does Omaha Hi-Lo split the pot?",
      a: "The high hand takes half, and the best qualifying low takes half. A low must be five unpaired cards of 8 or lower, with aces counting low. You may use different sets of two hole cards for the high and the low. If nobody qualifies for low, the high wins the whole pot. Winning a quarter of the pot after calling big bets is a common and expensive result. Draw to the nuts on the side you are playing.",
    },
    {
      q: "Does a pair on the board give everyone three of a kind?",
      a: "No. You still have to build a legal five-card hand with exactly two of your own cards. A pair on the board helps players who can use it inside that constraint, and it does not award trips to the table. Three of a kind on the board is also easy to misread. Work out the two hole cards and the three board cards before you turn a hand up in anger.",
    },
  ],
  sources: [
    {
      label: "Pagat — public card-game rules",
      url: "https://www.pagat.com/",
    },
    {
      label: "World Series of Poker",
      url: "https://www.wsop.com/",
    },
  ],
  related: ["texas-holdem-rules", "poker-hand-rankings", "poker-for-beginners", "poker-positions"],
  updated: "2026-10-06",
};
