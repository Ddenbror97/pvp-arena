import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-play-poker",
  cluster: "Poker",
  pillar: true,
  howTo: true,
  keyword: "how to play poker",
  secondary: [
    "poker rules",
    "poker streets",
    "poker blinds",
    "poker showdown",
    "texas holdem basics",
  ],
  title: "How to Play Poker: Rules, Hands and Streets",
  description:
    "How to play poker from blinds to showdown: streets, hand rankings, betting actions, rake, and why PVPspinArena is not a poker room.",
  h1: "How to play poker: blinds, streets, showdown and rake",
  answer:
    "How to play poker is a sequence, not a slogan. You post blinds, receive hole cards, bet through streets, and either fold or go to showdown, where the best five-card hand wins the pot. Skill shows up in which pots you enter and how you size bets. Rake and variance still tax every session. PVPspinArena is not a poker room: it runs Jackpot, Coinflip and Roulette only.",
  facts: [
    "A standard poker hand uses a 52-card deck; most online cash games are No-Limit Texas Hold'em.",
    "Each betting street is a chance to fold, check, call, bet or raise before more cards appear.",
    "Showdown compares the best five-card hand each remaining player can make.",
    "Rake is the room's cut of the pot or a time fee; it is how a poker room is paid.",
    "PVPspinArena does not deal poker. Its live games are Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "what-poker-is",
      title: "What poker is — and what this site is not",
      body: `Poker is a player-versus-player card game. You compete with the other seats for a shared pot. The room is not your opponent on the cards. The room is paid by rake. That is a different product from a house-banked colour wheel, where the paytable is the opponent.

This [poker](/guides/topics/poker) guide is for adults aged 18 or over. It teaches the common rules of cash-game Hold'em so you can sit down without inventing streets. It will not sell a secret winning system. There is not one.

PVPspinArena is not a poker room. If you want a hashed pot with published odds, use [Jackpot](/), [Coinflip](/coinflip) or [Roulette](/roulette). Those games do not deal hole cards. Do not treat a coinflip as a flop.

If you want the cashier-and-rake version of online tables, start with [crypto poker](/guides/crypto-poker) after you finish the streets on this page.

### Variants you will hear named

Omaha uses four hole cards and you must use exactly two. Short-deck uses a 36-card pack and changes some rankings. Five-card draw has no community cards. Stud deals a mix of up-cards and down-cards. This pillar teaches Hold'em because that is what “how to play poker” almost always means in 2026. If a table sticker says anything else, stop and ask for that game’s sheet. Playing Omaha with Hold'em habits — using one hole card, treating the board as yours alone — is how people stack off on night one.

Home games invent wild cards, “Chicago”, and split-pot lowball. Those are fine as house rules if everyone agrees before the deal. They are not the online cash default. Do not carry a home-game ranking onto a site that posts the standard list.`,
    },
    {
      id: "setup",
      title: "Table setup: deck, seats, blinds and the button",
      body: `A full table in Hold'em is usually six or nine seats. Each player is dealt two private hole cards. Five community cards will appear in the middle across three later streets. You make the best five-card hand from any mix of your hole cards and the board.

### The button

A dealer button rotates clockwise after each hand. The two seats left of the button post the small blind and the big blind. Those forced bets create a pot before anyone looks at cards. Without blinds, everyone could wait for aces forever and the game would stall.

### Why blinds matter

Blinds are not a tax you can skip. They are the reason folding every hand still costs money. Over an hour you will be in the blinds many times. That drip is why “I only play the nuts” is not a plan.

### Positions in one sentence

Seats that act after most of the table have more information. Early seats act first and should play fewer hands. The [Texas Hold'em rules](/guides/texas-holdem-rules) page names each street. [Poker for beginners](/guides/poker-for-beginners) shrinks the first-session checklist.`,
    },
    {
      id: "streets",
      title: "The four streets, in order",
      body: `Hold'em is one hand split into four betting rounds. Learn the order before you learn any slogan about “aggression”.

| Street | Cards dealt | What you decide |
| --- | --- | --- |
| Preflop | 2 hole cards each | Fold, call or raise the blinds |
| Flop | 3 community cards | Check, bet, call, raise or fold |
| Turn | 1 community card | Same actions; pots are larger |
| River | 1 community card | Last bets, then showdown if needed |

### Preflop

Action starts left of the big blind. If nobody raises, the big blind can check and see a flop “for free” with whatever two cards they were dealt. A raise reopens action.

### Flop, turn and river

After the flop, action starts with the first remaining player left of the button. That order stays for the turn and river. Each new card can make a draw or kill one. You do not have to stay for every card. Folding is a legal, often correct, action.

### How a hand ends

A hand ends when only one player has not folded, or when the river betting finishes and remaining hands are tabled. The best hand takes the pot. Ties split it. Side pots appear if someone is all-in for less than others put in; that is bookkeeping, not a different ranking.`,
    },
    {
      id: "actions",
      title: "Betting actions you will actually use",
      body: `Every street offers the same short menu. Misnaming them is how new players talk themselves into extra calls.

- **Fold.** You give up the pot. You cannot win it later. You also cannot lose more.
- **Check.** You pass the action when nobody has bet yet. Checking is free. It is not a promise you are weak.
- **Call.** You match the current bet. You stay in without raising.
- **Bet.** You put in the first chips of the street.
- **Raise.** You increase a bet that is already there.
- **All-in.** You put in the rest of your stack. In no-limit, that is always legal if you have chips left.

No-limit means you may bet any amount from a minimum raise up to your stack. Limit poker uses fixed bet sizes. Most online cash you will be offered is no-limit Hold'em. Do not mix the two rule sheets in your head.

### Minimums people miss

A raise has a minimum size, usually the size of the last increment. You cannot “min-raise” for one chip if the last raise was ten. The software will block you. Live, the dealer will correct you. Learn it before you sit with money you care about.

The [poker hand rankings](/guides/poker-hand-rankings) page is the other half of the rules: you need to know what beats what when two people get to showdown.

### Etiquette that is actually a rule

Do not splash the pot. Do not act out of turn. Do not reveal a folded hand while the pot is live. Online, do not stall every street as a tactic unless the room allows a timed tank. These are not “nice to haves”. Out-of-turn action can lock someone into a call they did not want. A revealed fold can change a river bluff. Rooms will warn you, then sit you out.

If you are all-in, you are done acting. You do not get to add chips after you see a scare card. You also do not get a refund because the next card was ugly. The cards that remain will run out if two or more people are all-in. That runout is still the same ranking list. It is not a new game.`,
    },
    {
      id: "example",
      title: "Worked example: one $1/$2 hand to the river",
      body: `This is the only numeric walkthrough on this page. It is a rules demo, not a strategy lecture.

You are on the button at $1/$2 with $200 behind. Two players limp. You raise to $8 with ace-queen offsuit. The small blind folds. The big blind and one limper call. The pot is $8 + $8 + $8 + $1 dead-ish accounting: treat it as about $25 after the small blind is dead. Teaching figure: **pot ≈ $26**.

Flop: king, eight, three, rainbow. Big blind checks. Limper checks. You bet $16. Both fold.

What the example is for:

1. Blinds created a pot before anyone chose to play.
2. A raise forced the other seats to pay more or leave.
3. You did not need the best hand in the universe. You needed the others to give up.
4. If both had called, you would still have two streets left and a king-high board that may or may not have helped you.

If they call and a queen hits the turn, you now have a pair. That pair may still lose to a king. That is poker: incomplete information, more cards, more bets. The [Texas Hold'em strategy](/guides/texas-holdem-strategy) guide is where sizing and position go next. This page only needs you to see the sequence.`,
    },
    {
      id: "rake-and-cost",
      title: "Rake, variance and why “knowing the rules” is not a wage",
      body: `Knowing how to play poker lets you sit. It does not create a salary. Two costs remain after you memorise streets.

### Rake

The room takes a slice of many pots, often a percentage with a cap, or a time charge. A break-even player still shrinks. [House edge](/guides/house-edge) is the house-banked cousin of the same idea: a posted cost per unit handled. Poker rake is a tax on pots, not a 5.26% American-roulette edge, but both are costs you should be able to state.

### Variance

Even a skilled player loses nights. Cards cluster. [Variance in gambling](/guides/variance-in-gambling) is the width around the mean. A good process can finish Sunday down. That is sample size, not proof the rules changed.

### What winning would even mean

[How to win at poker](/guides/how-to-win-at-poker) is honest about this: a win rate after rake, over a large hand sample, against weaker fields, with a bankroll that survives the swings. It is not a promise. It is a definition. If you cannot name the rake and the sample, you are describing a mood, not a result.

Set a [gambling budget](/guides/gambling-budget) before you buy in. The budget is the price of the session, not a loan the deck owes you.

### A session is not a career

People finish the rules, win a pot, and decide they are now a winning player. One pot is a sample of one. The same people lose a pot and decide the game is rigged. Both conclusions skip the boring middle: you need a large hand count before a rate means anything, and you needed a budget before the first blind. If you cannot name how many orbits you will sit and how much you will lose at most, you did not learn how to play. You learned how to click.

Write those two numbers on a note. When either hits, you leave. That is part of the rules you give yourself. The software will not enforce it. The room wants another orbit. Your note is the only dealer who works for you.`,
    },
    {
      id: "summary",
      title: "Summary: learn the streets, then decide if you even want the game",
      body: `How to play poker: post blinds, act in turn, fold or put chips in, watch five community cards appear across four streets, and compare five-card hands if more than one player remains. That is the whole mechanical loop.

Skill, if it exists at your table, is which hands you play, from which seat, for how much. Rake still comes out. Variance still swings the week. There is no hidden street that pays you for enthusiasm.

PVPspinArena will not deal you a flop. Use this cluster to learn the real game, or use [Jackpot](/) and [Coinflip](/coinflip) if you wanted a one-shot pot instead. If poker or any other game is taking money or time you cannot spare, stop. Read [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). This site is 18+.

Table talk is collected in [poker slang](/guides/poker-slang).

Where the game came from is [history of poker](/guides/history-of-poker).`,
    },
  ],
  faqs: [
    {
      q: "What is the simplest way to learn how to play poker?",
      a: "Learn Hold'em streets first: two hole cards, flop, turn, river, then showdown. Memorise the hand ranking list, then sit at the lowest stakes you can find with a written budget.",
    },
    {
      q: "Do I need the best hand before the flop to win?",
      a: "No. Most pots never reach a showdown. A better hand can fold to a bet, and a worse hand can win if everyone else folds.",
    },
    {
      q: "What beats what in poker?",
      a: "Royal flush down through high card. The full ordered list, including kickers and ties, is on the poker hand rankings guide in this cluster.",
    },
    {
      q: "Does PVPspinArena offer poker tables?",
      a: "No. It is not a poker room. It offers player-versus-player Jackpot, Coinflip and Roulette only.",
    },
    {
      q: "Is rake cheating?",
      a: "No. Posted rake is how the room is paid. Hidden extra rake is a different problem. Read the fee table before you sit.",
    },
    {
      q: "Can I practise the rules without risking rent?",
      a: "Yes. Use play-money or watch a table first. When you use real money, cap the session with a budget you can afford to lose.",
    },
  ],
  sources: [
    { label: "Wikipedia: Texas hold 'em", url: "https://en.wikipedia.org/wiki/Texas_hold_%27em" },
    { label: "Wikipedia: Poker", url: "https://en.wikipedia.org/wiki/Poker" },
    { label: "UK Gambling Commission — Poker", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "texas-holdem-rules",
    "poker-hand-rankings",
    "poker-for-beginners",
    "crypto-poker",
    "how-to-win-at-poker",
    "gambling-budget",
    "poker-slang",
    "history-of-poker",
  ],
  updated: "2026-09-26",
};
