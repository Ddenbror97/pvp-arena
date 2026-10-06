import type { Guide } from "./types";

export const guide: Guide = {
  slug: "texas-holdem-strategy",
  cluster: "Poker",
  keyword: "texas holdem strategy",
  secondary: [
    "holdem strategy",
    "nlhe strategy",
    "position in holdem",
    "cbet strategy",
    "holdem bet sizing",
  ],
  title: "Texas Holdem Strategy: Position, Ranges, Sizing",
  description:
    "Texas holdem strategy without a solver lecture: position, ranges, bet sizing, continuation bets, and why rake still taxes the plan.",
  h1: "Texas holdem strategy: position, ranges and bet size",
  answer:
    "Texas holdem strategy is a set of defaults for incomplete information: play tighter early, wider on the button, think in ranges instead of one hand, and pick a bet size that has a job. It is not a secret system and it does not guarantee profit after rake. PVPspinArena is not a Hold'em room.",
  facts: [
    "Position is the first strategy lever; the same hand is worth more on the button than under the gun.",
    "A range is the set of hands you play the same way, not the two cards you happen to hold.",
    "A bet should be value, a bluff, or a price that denies equity — not a reflex half-pot.",
    "Stack depth changes which hands can barrel and which are showdown-bound.",
    "Strategy does not remove rake. A pretty line can still be minus after fees.",
  ],
  sections: [
    {
      id: "scope",
      title: "What this page will and will not do",
      body: `This [poker](/guides/topics/poker) article is Texas holdem strategy for adults 18+ who already know the streets. If you still need the deal order, use [Texas Hold'em rules](/guides/texas-holdem-rules). If you want equilibrium jargon, use [GTO poker strategy](/guides/gto-poker-strategy). This page stays at the levers you can name at a $1/$2 table.

It will not give you a 200-combo opening chart to screenshot. Charts go stale the moment the table is three-handed or the rake is ugly. Learn the reasons.

PVPspinArena does not host Hold'em. Strategy here does not apply to [Coinflip](/coinflip). A 50/50 pot has no flop texture.

### Cash versus tournament, one paragraph

Cash lets you reload and walk. Tournaments shrink blinds on a clock and pay a ladder. The same hand that is a fold in a deep cash pot can be a shove near the bubble when twenty big blinds are a stack and antes are eating the table. This page is cash-shaped: 100bb, no clock, leave when you want. If you sit a tournament, you need a different set of defaults — push/fold charts, ICM — that this article will not fake in a sidebar. Do not export a 2.5× cash open onto a 15bb MTT without noticing the stack.`,
    },
    {
      id: "position-table",
      title: "Position as the first lever",
      body: `You act in a fixed order. Strategy starts there.

| Seat | Information | Opening idea (full-ring cash) |
| --- | --- | --- |
| Under the gun | Worst | Strong pairs, strong aces; few suited connectors |
| Middle | Average | Add some broadways and medium pairs |
| Cutoff | Good | Wider opens; still fold junk |
| Button | Best | Widest open; steal more blinds |
| Small blind | Awkward | Complete less; raise or fold more |
| Big blind | Forced in | Defend some, not everything, versus a steal |

These are teaching bands, not a solver printout. Short-handed tables shift every row wider. A 9-max UTG open that includes K9s is already loose for many rake structures.

### Why the button is rich

You see every flop action before you choose. You can take free rivers. You can pressure missed boards. The same KJo that is a headache under the gun is a standard open on the button. That is strategy, not a mood.

### Blind versus button, again

Strategy content loves the button because it is pleasant. You will still spend two seats per orbit in the blinds. Those seats lose money even for good players. The goal is to lose less: fewer panic defences, fewer dominated aces, fewer calls that turn into turn barrels you hate. You do not need to “win the blinds back” this orbit. That sentence is chase wearing a strategy hat. Win the easy pots when you have position. Survive the forced ones.

The seat names themselves, before any range chart, are [poker positions](/guides/poker-positions).`,
    },
    {
      id: "ranges-and-sizes",
      title: "Ranges and sizes that have a job",
      body: `### Ranges, not “I have ace-jack”

Ace-jack is strong or weak depending on who raised, who called, and the board. Think “hands that raise this size from this seat”, then ask where AJ sits in that set. [Poker tips](/guides/poker-tips) is the shorter version. Here the point is: you are not representing one hand. The table is responding to a set.

### Open sizes

A common cash open is about 2.5× to 3× the big blind. Larger opens build a pot and fold out more junk; they also leave you playing bigger pots out of position when called. Smaller opens keep playable stacks behind. Neither is a law. Min-raising every hand because a streamer did it is not a plan.

### Continuation bets

When you were the preflop raiser, a flop bet (c-bet) is often correct on dry boards because the other seat missed too. It is often wrong on wet, connected boards when two players called. Auto-c-betting 100% is a leak. Auto-checking 100% is a different leak.

### Three-bets

A raise of a raise should be a value hand or a bluff with playability (blockers, suitedness), not “they raised so I must fight”. Size so the original raiser is actually uncomfortable. A tiny three-bet that always gets called is a donation with extra steps.

### Value, bluff, and the third thing

Beginners sort bets into “I have it” and “I don’t”. Strategy adds a third job: charging a draw or denying equity so a weaker hand cannot see a cheap card. A small bet on a wet flop can be that third job. A huge bet on a dry flop can be thin value or a polarised bluff. If you cannot say which job this size is doing, pick a check. Checking is a size. It is the size that keeps the pot flat until you have a sentence.

When you do bet, ask what folds and what calls. If the answer is “only better hands call and only air folds”, you are lighting a candle, not running a strategy. Change the size or skip the bet. That question is more useful than a new chart colour.`,
    },
    {
      id: "example",
      title: "Worked example: 2.5bb open, 8bb three-bet",
      body: `This is the only numeric example on this page. $1/$2, $200 stacks.

You open the cutoff to $5 with A♠ 5♠ (2.5×). The button three-bets to $16. Blinds fold. You are out of position if you call, and the three-bet is a bit more than 3× your open.

Teaching decision, not a solver output:

1. Calling $11 more to see a flop with A5s out of position is a playable but leaky default at many low-stakes tables. You will flop a pair of fives or a flush draw and still not know where you are.
2. Four-betting (for example to $40) turns the hand into a bluff-plus-some-equity fight. Fine if you have a plan for getting stacked; poor if you will panic-fold the flop every time they barrel.
3. Folding $5 is allowed. A5s is a decent hand, not a mandatory war. The $5 is the cost of an open that ran into a three-bet.

The strategy lesson is the fork: **call, four-bet, or fold — pick one with a next-street plan**. Clicking call “to see” is how beginners enter pots they cannot play. [Pot odds](/guides/poker-pot-odds) can tell you whether a later draw is priced. They cannot invent a plan you refused to make now.`,
    },
    {
      id: "stacks-and-streets",
      title: "Stack depth and later streets",
      body: `A 100bb cash stack is a different game from a 20bb turbo. Deep, implied odds matter: small pairs and suited connectors can chase a set or a flush because the leftover stack is large. Short, those hands lose value and high-card strength plus shove-or-fold math take over.

### Turn and river

Most strategy content is preflop plus c-bets because those are easy to cartoon. Money still goes in on the turn. Ask: did the card change who has the nuts? Did it complete the obvious draw? Are you betting a thin pair for value against a calling range, or are you firing a third barrel as a bluff?

If you cannot answer, checking is a strategy. So is folding to a large bet with a missed ace-high. [How to win at poker](/guides/how-to-win-at-poker) is the reminder that a pretty line still needs to beat rake over a sample.

### Blockers without a costume

You hold the ace of the flush suit, so they have fewer nut flushes. That can make a river bluff cleaner. It does not make a pair of deuces a call. Blocker talk is how people decorate a call they already wanted. Use blockers to choose *which* missed draw you bluff, not to invent showdown value. If you cannot say the sentence without the word “blocker”, you probably needed pot odds instead.

### Multiway pots

Three-way, your bluffs work less and your value can be thinner. Tighten continuation bets. Do not hero-bluff two players because a video showed a heads-up barrel.`,
    },
    {
      id: "limits",
      title: "What strategy cannot fix",
      body: `Texas holdem strategy cannot:

- cancel rake;
- make a short sample look like a win rate;
- turn a house game into Hold'em;
- apply to a hashed [Jackpot](/) ticket.

It can cut some of the extra calls that feel like “unlucky rivers”. [Expected value](/guides/expected-value-gambling) is the scoring rule behind every size. If you will not do a scrap of EV, you do not have a strategy. You have a vibe.

House products that borrow the word poker — video poker, Three Card Poker — have posted edges, not button ranges. Keep them off this page’s checklist.

### Studying without drowning

Pick one leak a week. This week: no open-limp. Next week: no auto-c-bet in three-way pots. A notebook with one line beats a folder of solver screenshots you will not open at the table. If you review, review hands where you put money in without a sentence. Those are the strategy failures. Coolers where you had kings and they had aces are variance. Do not spend the review hour on aces. Spend it on the 9-8 call that became a river hero.

When the leak list is empty, you are not done. You are between leaks. Sit a stake your roll can survive and wait for the next honest one. That patience is strategy. So is leaving a table that is all regulars. Ego wants to “test the lines”. The roll wants a weaker field. Believe the roll.

If you review with software, tag hands by the decision, not by the result. “Folded river, was good” and “called river, was good” are both possible. The tag you want is “called without a price”. That tag is strategy-relevant. The cooler tag is a diary. Keep a short diary if you must. Do not let it eat the review.`,
    },
    {
      id: "summary",
      title: "Summary: levers, not a personality",
      body: `Texas holdem strategy, at this level: tighter early, wider late, ranges instead of one hand, sizes with a job, c-bets that notice texture, and stack depth that changes which hands belong. No secret system. No wage.

If studying lines has become a reason to sit longer than the budget, stop. Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). This site is 18+ and is not a Hold'em client.

If you take one default into a session, take position. Open tighter up front, wider on the button, and fold the hands you cannot name a flop plan for. Sizing and c-bets come after that sentence is automatic. A fancy barrel from the wrong seat is still the wrong seat. Make the seat right first. Then spend a chip.

One opponent changes the ranges. [Heads up poker strategy](/guides/heads-up-poker-strategy) is that match, including the rake that can eat a short one.

The combinatorics behind those streets is [poker math](/guides/poker-math).

The book that taught a generation of Hold'em is tied to [Doyle Brunson](/guides/doyle-brunson).`,
    },
  ],
  faqs: [
    {
      q: "What is the most important Texas holdem strategy idea?",
      a: "Position. The same two cards are worth more when you act last. Tighten early; widen on the button.",
    },
    {
      q: "Should I always continuation-bet?",
      a: "No. Dry boards and heads-up pots favour more c-bets. Wet, multiway boards favour fewer. Auto-100% is a leak.",
    },
    {
      q: "Is Texas holdem strategy a winning system?",
      a: "No. It is a set of defaults. Rake and variance remain. No chart guarantees profit.",
    },
    {
      q: "How large should I open?",
      a: "Many cash tables use about 2.5× to 3× the big blind. Adjust for rake, table size and how often you get three-bet. There is no sacred number.",
    },
    {
      q: "Does GTO replace this page?",
      a: "GTO is a more precise equilibrium language. You still need these levers before a solver output means anything at a live table.",
    },
    {
      q: "Does PVPspinArena use Hold'em strategy?",
      a: "No. It does not offer Texas Hold'em. Its games are Jackpot, Coinflip and Roulette.",
    },
  ],
  sources: [
    { label: "Wikipedia: Texas hold 'em", url: "https://en.wikipedia.org/wiki/Texas_hold_%27em" },
    { label: "Wikipedia: Poker strategy", url: "https://en.wikipedia.org/wiki/Poker_strategy" },
    { label: "UK Gambling Commission — Poker", url: "https://www.gamblingcommission.gov.uk/" },
  ],
  related: [
    "texas-holdem-rules",
    "gto-poker-strategy",
    "poker-pot-odds",
    "poker-tips",
    "how-to-win-at-poker",
    "how-to-play-poker",
    "poker-math",
    "doyle-brunson",
  ],
  updated: "2026-09-26",
};
