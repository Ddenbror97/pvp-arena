import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-bankroll-management",
  cluster: "Poker",
  keyword: "poker bankroll management",
  secondary: [
    "poker bankroll",
    "buy-in rule poker",
    "poker roll",
    "bankroll for holdem",
    "poker downswing",
  ],
  title: "Poker Bankroll Management: Buy-Ins and Risk",
  description:
    "Poker bankroll management: cash and tournament buy-in counts, downswings, Kelly limits, and why a roll is not a winning system.",
  h1: "Poker bankroll management: buy-in counts, not a promise",
  answer:
    "Poker bankroll management is a rule for how many buy-ins you keep at a stake so a normal downswing does not force you to quit or to chase. It is risk control, not a winning system. If you do not have an edge after rake, a bigger roll only delays ruin. PVPspinArena is not a poker room and does not need a Hold'em roll.",
  facts: [
    "A cash-game guideline is often 20–40 full buy-ins at the stake you are playing.",
    "Tournaments usually need more buy-ins than cash because payouts are lumpier.",
    "Bankroll rules do not create an edge; they keep you solvent if an edge exists.",
    "Kelly sizing assumes a known plus-EV bet; most poker edges are guessed and after-rake.",
    "Entertainment play should use a budget, not a professional-looking roll you cannot fund.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What a bankroll is for",
      body: `A poker bankroll is money set aside for poker that you can afford to lose, sized so the stake you play is a small slice of that pile. Poker bankroll management is the policy: when to move up, when to move down, and when to stop for the month.

This [poker](/guides/topics/poker) page is for adults 18+. It sits next to a [gambling budget](/guides/gambling-budget). A budget is the entertainment cap. A roll is the same idea with extra numbers for people who sit enough hands that [variance](/guides/variance-in-gambling) looks like a job hazard.

If you do not have a skill edge after rake, you do not need 40 buy-ins. You need a smaller stake or a stop. [How to win at poker](/guides/how-to-win-at-poker) is honest about that. A fat roll is not an edge.

PVPspinArena is not a poker room. Size [Coinflip](/coinflip) from a budget, not from a 30-buy-in Hold'em rule.

### What the pile is not

It is not a score. It is not proof you are a professional. It is not a reason to tell anyone how serious you are. It is inventory. When the inventory cannot support the stake, you change the stake. When the inventory is money you need for rent, you did not have a roll. You had a problem labelled as a roll.

People also treat a winning week as a roll expansion that “unlocks” the next stake. A week is not a sample. Put the win in the pile and keep the same buy-in count rule. If the rule now allows a move-up, fine. If it does not, the week was a swing, not a promotion.`,
    },
    {
      id: "counts-table",
      title: "Teaching buy-in counts",
      body: `These are common teaching bands, not laws. Aggressive professionals play shorter. Recreational players should play longer or not at all.

| Format | Teaching roll | Why it is that wide |
| --- | --- | --- |
| Full-ring / 6-max cash, 100bb | 20–40 buy-ins | All-in pots still swing tens of buy-ins |
| Short-handed or loose-aggressive cash | 30–50 buy-ins | More money goes in; wider swings |
| Sit-and-go / small-field MTT | 30–50 buy-ins | One ticket is mostly zero |
| Larger-field MTT | 50–100+ buy-ins | Long droughts between cashes |
| House games (video / 3-card) | Use a budget | There is no win-rate roll to manage |

A “buy-in” means a standard stack: $200 at $1/$2 if the max is 100bb. If you short-buy for $60, do not pretend you have a 40-buy-in roll because 40 × $60 is a smaller number. You have changed the game.

[Poker tips](/guides/poker-tips) will tell you not to reload on tilt. Bankroll rules only work if you follow them after a loss.

### Shots and “just this once”

A shot is a temporary move-up with a small, pre-written number of buy-ins. If you lose them, you return. If you do not write the number, it was not a shot. It was a chase. One buy-in at $2/$5 when your roll is built for $1/$2 is how people turn a stable pile into a story about a cooler. The cooler happened. The sizing was the choice.

If you cannot return to the lower stake without shame, do not take the shot. Shame is not in the table. It is the usual reason the table gets ignored.`,
    },
    {
      id: "example",
      title: "Worked example: 30 buy-ins of $100 at 50NL",
      body: `This is the only numeric example on this page.

You want to play $0.25/$0.50 no-limit with a $100 max buy-in (50NL). You choose a 30-buy-in cash rule.

1. Roll required = 30 × $100 = **$3,000** set aside for poker, not for rent.
2. A 15-buy-in downswing is **$1,500**. That is ordinary, not a conspiracy. You still have 15 buy-ins left. The rule did its job.
3. If your “roll” is $400, you have four buy-ins. Two coolers put you at two. The next session you are playing scared or chasing. That is not unlucky. That is under-rolled.
4. If you are not a winner after rake, the $3,000 still trends down. The rule delayed the bust. It did not create a job.

Move-down trigger: if the roll falls below 20 buy-ins of this stake (here $2,000), drop to a $50 max or stop. Move-up trigger: if you have 40+ of the next stake *and* a sample that is not a hot week, consider it. Hot weeks lie.

[Kelly](/guides/kelly-criterion) would ask for a known edge. You do not have a clean p. Fractional Kelly thinking still says: do not put 10% of wealth into one $100 sit-down because last night felt plus.`,
    },
    {
      id: "kelly-and-edge",
      title: "Kelly, guessed edges and minus-EV seats",
      body: `The Kelly fraction needs a true probability and a price. In cash poker your “edge” is a guessed bb/100 after rake. Overestimate it and full Kelly overbets. That is why serious players use conservative counts (more buy-ins) instead of staking 10% of the roll on a feeling.

If Kelly’s formula is fed a negative edge — you are a losing or break-even player after rake — it says bet nothing for growth. Keep sitting only as entertainment, sized from a budget. A 40-buy-in structure on a minus-EV seat is a slow leak with extra paperwork.

[Expected value](/guides/expected-value-gambling) is the weekly scoreboard. Bankroll management is the constraint that keeps you from increasing stake to “win it back”. Those are different tools. Use both or you will confuse a downswing with a licence to jump to $2/$5.

### Cash versus tournament accounting

Do not mix the piles if you play both. A $3,000 cash roll that you also use for $109 MTTs will hit a 20-buy-in drought in the tournament half and starve the cash half. Keep a tournament slice with its own count, or admit you are a cash player who buys the occasional ticket from the entertainment budget. Mixing units is how a “30-buy-in cash player” is actually a 12-buy-in player with a hobby that eats the rest.

The same split applies to side games. A $50 Three Card session is not a cash buy-in. It is a house-edge purchase. Take it from the entertainment cap, not from the 30 × $100 pile, or you will wonder why the roll shrank after a night you “didn’t even play Hold'em”.`,
    },
    {
      id: "entertainment-vs-grind",
      title: "Entertainment roll versus grind roll",
      body: `### Entertainment

You play twice a month. You can lose $80 without noticing the bills. Write $80 as the cap. Buy in for $40 at a micro stake and stop if it is gone. You do not need a $3,000 spreadsheet. You need a stop. That is still poker bankroll management. It is just honest about frequency.

### Grind

You play enough hands that a 20-buy-in swing is a calendar event, not a story. Then the table above earns its keep. Track results. Drop stakes when the roll says drop. Do not take shots with money earmarked for the next month’s rent.

### House games

[Video poker](/guides/video-poker-paytables) and [Three Card Poker](/guides/three-card-poker-strategy) are house edges. There is no “move up when you have 40 machines”. There is only a budget. Do not dress a minus-EV cabinet in cash-game roll language.

### This site

A hashed PvP pot on [Jackpot](/) is one ticket. Size it like a single entertainment bet. There is no 100bb stack to reload. [Crypto poker](/guides/crypto-poker) rooms that actually deal Hold'em are where the 30-buy-in rule lives — if you sit there at all.`,
    },
    {
      id: "breaks",
      title: "When the rule is really “stop”",
      body: `Move-down is a rule. So is walking away. If you are hiding deposits, borrowing, or using the roll to chase a graph, you are not managing a bankroll. You are feeding a problem.

Write the stop before the session: time, loss, and “no second buy-in if angry”. If you cannot follow that sentence, the next document is not a solver. It is help.

[House edge](/guides/house-edge) still describes every casino side bet you add “just to change it up”. Those chips come out of the same roll.

### Distance and sleep

A roll also needs hours you can think. A 3 a.m. session after a loss is how buy-in counts fail without the spreadsheet changing. Put a clock on the policy: no poker after a written hour, no poker after alcohol, no poker when you already hit the loss cap. Those lines are bankroll management. They are not lifestyle branding.

If you live with someone, the roll should not be a secret pile. Secrets are how caps die. If you cannot say the number out loud, the number is too large or the habit is already a problem. Shrink the number. If you cannot shrink it, you need the stop pages, not a new count.

### Tracking without turning it into a second job

A simple ledger is enough: date, stake, buy-ins in, cash-out, notes. You do not need a colour-coded graph to know you are down three buy-ins this month. If the ledger makes you play more so the graph looks busier, delete the graph. The rule is the count, not the aesthetic.

Once a month, ask only two questions. Did I follow the move-down line? Did I spend rent money? If the first is no, the count is decoration. If the second is yes, stop using the word bankroll. Use the word problem. Then use the stop pages. A spreadsheet cannot do that part for you.`,
    },
    {
      id: "summary",
      title: "Summary: enough buy-ins to survive the width, or a budget if you cannot",
      body: `Poker bankroll management is a solvency rule. Twenty to forty cash buy-ins is a teaching band. Tournaments need more. Kelly does not rescue a guessed minus edge. A roll is not a winning system.

If you cannot keep a cap, use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). PVPspinArena is 18+ and is not a poker room. Use a budget here the same way you would at a table.

A last check before you sit: can you lose three buy-ins this week and still follow the move-down line without borrowing? If no, the stake is too high or the pile is not a roll. Lower the stake. That sentence is the entire policy. Everything else is commentary. Commentary does not reload you. The line does — or it sends you home, which is also a reload of a different kind.`,
    },
  ],
  faqs: [
    {
      q: "How many buy-ins do I need for cash-game poker?",
      a: "A common teaching range is 20–40 full buy-ins at your stake. More if the game is aggressive or you cannot reload from income.",
    },
    {
      q: "Do I need a bigger bankroll for tournaments?",
      a: "Usually yes. Field size and lumpy payouts mean longer losing stretches. Fifty or more buy-ins is a common MTT teaching band.",
    },
    {
      q: "Does a big bankroll make me a winning player?",
      a: "No. It only absorbs variance. If you are minus after rake, a larger roll delays the loss. It does not flip the mean.",
    },
    {
      q: "Should I use the Kelly criterion for poker stakes?",
      a: "Only with a conservative guessed edge, if at all. Full Kelly is too aggressive when p is uncertain. Most people are better with fixed buy-in counts.",
    },
    {
      q: "What if I only play for fun?",
      a: "Use a session budget you can afford to lose. You do not need a professional-looking roll you cannot fund. You do need a stop.",
    },
    {
      q: "Does PVPspinArena require a poker bankroll?",
      a: "No. It does not offer poker. Size Jackpot, Coinflip and Roulette from an entertainment budget.",
    },
  ],
  sources: [
    { label: "Wikipedia: Kelly criterion", url: "https://en.wikipedia.org/wiki/Kelly_criterion" },
    {
      label: "Wikipedia: Bankroll management",
      url: "https://en.wikipedia.org/wiki/Bankroll_management",
    },
    { label: "NCPG — responsible play", url: "https://www.ncpgambling.org/" },
  ],
  related: [
    "kelly-criterion",
    "gambling-budget",
    "variance-in-gambling",
    "how-to-win-at-poker",
    "poker-tips",
    "expected-value-gambling",
    "how-to-play-poker",
  ],
  updated: "2026-09-26",
};
