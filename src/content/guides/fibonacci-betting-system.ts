import type { Guide } from "./types";

export const guide: Guide = {
  slug: "fibonacci-betting-system",
  cluster: "Games & odds",
  keyword: "fibonacci betting system",
  secondary: [
    "fibonacci roulette",
    "fibonacci betting",
    "fibonacci sequence bets",
    "progression system",
  ],
  title: "Fibonacci Betting System: Sequence, Risk and Edge",
  description:
    "The Fibonacci betting system: the sequence, reset rules, worked losses, and why a slower progression still cannot beat a house edge.",
  h1: "Fibonacci betting system: the sequence, the streak and the edge",
  answer:
    "The Fibonacci betting system walks a stake along the Fibonacci sequence after losses — 1, 1, 2, 3, 5, 8, 13 — and steps back two numbers after a win. It is a negative progression that grows slower than Martingale and faster than a one-unit d’Alembert step. A slower climb is still a climb. Each new number is another minus-EV dollar on an even-money colour, and a long streak still outruns a normal bankroll or a table max.",
  facts: [
    "Fibonacci stakes follow 1, 1, 2, 3, 5, 8, 13, 21… each term the sum of the two before it.",
    "After a loss you move one step right; after a win you move two steps left (house rules vary).",
    "To survive n losses from a $1 first term you need the sum of the first n+1 terms for the next bet plus the hole.",
    "The sequence does not change p or the 2x payout, so it cannot cancel a house edge.",
    "Reset rules matter for the shape of results, not for the sign of expected value.",
  ],
  sections: [
    {
      id: "sequence",
      title: "The sequence and how the stake moves",
      body: `Leonardo of Pisa’s sequence is a way to grow integers, not a way to grow an edge. The gambling version maps those integers onto even-money units.

Standard rule set:

1. Write the list 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, …
2. Start at the first 1 (some players start at the second 1; it barely matters).
3. After a loss, advance one term. After a win, move two terms back, or to the start if you run out of room.
4. Some rooms say “reset to 1 after a win”. That is a harsher, simpler variant. Know which rule you are actually using.

The Fibonacci betting system is sold as the civilised cousin of doubling. 1 → 1 → 2 → 3 → 5 is less shocking than 1 → 2 → 4 → 8 → 16. After ten losses you are at 89 units, not 1,024. That is still 89 units, and the unpaid losses behind you are the sum of the path, not the last term alone.

This page sits with the other progressions in the [Games and odds topic](/guides/topics/games-and-odds). Read [Martingale](/guides/martingale-strategy) for the exponential extreme and [Paroli](/guides/paroli-system) for the raise-on-win mirror. PVPspinArena is 18+.

Players reach for Fibonacci because they remember a school-poster spiral and want a climb that looks reasoned. A reasoned climb that still faces 2x on 16/33 is just a prettier Martingale. Write the next three terms before you sit down. If 8, 13 and 21 already look larger than the session cap, the system does not fit the budget, and no later win will make the fit better.

The first twelve terms sum to 376. That sum is the money you have already put on the table if you lose twelve times from a $1 first term before the thirteenth stake (the thirteenth term is 233). People remember “Fibonacci grows slowly” and forget to add the column. Slow relative to 2^n is not slow relative to a $40 session.`,
    },
    {
      id: "reset",
      title: "Reset rules and what a win actually does",
      body: `Martingale’s win wipes the cycle: one 2x on the last double recovers every chip in the hole plus one unit. Fibonacci’s win does not.

Suppose you are at 8 units after the path 1, 1, 2, 3, 5, 8. Losses so far = 1+1+2+3+5 = 12, and you have just lost the 8 as well if we are about to bet 13 — be careful with off-by-one when you recount. The clean way is to keep a running P/L.

A win at 8 returns 16 (2x), for +8 on that bet. If losses already booked were 12, you are still −4, and the rule then steps you back to 2 (two steps left from 8: 8 → 5 → 3, or 8 → 3 depending on whether 5 is skipped as “two steps”). House write-ups disagree on the exact cursor. The common textbook is: pointer moves two places toward the start. You are not even at base, and you are not automatically in profit.

### Why people like the two-step back

It feels like you “keep some pressure on” after a win so the next hits can finish the repair. That is a story about cursor position. It is not a repair guarantee. A win–loss–loss after you thought you were coming home sends the pointer right again.`,
    },
    {
      id: "worked",
      title: "Worked losing streak",
      body: `Unit = $1. Even-money bet. Start at the first 1.

| Step | Stake | Result | Running P/L | Next term |
| --- | --- | --- | --- | --- |
| 1 | $1 | L | −$1 | 1 |
| 2 | $1 | L | −$2 | 2 |
| 3 | $2 | L | −$4 | 3 |
| 4 | $3 | L | −$7 | 5 |
| 5 | $5 | L | −$12 | 8 |
| 6 | $8 | L | −$20 | 13 |
| 7 | $13 | L | −$33 | 21 |
| 8 | $21 | W | −$12 | 8 (two back from 21: 21, 13, 8) |
| 9 | $8 | L | −$20 | 13 |

Eight losses and one win, still −$20, sitting on a $13 request. This is a normal ugly path, not a freak 20-loss myth. On Purple, eight losses in a row have probability (17/33)^8 ≈ 0.6%, about 1 in 160 isolated attempts — common across a long night of cycles.

A $1 Martingale would have been trying to bet $256 after eight losses, with a $255 hole. Fibonacci is “kinder” and still leaves you in a hole a single win did not fill. Kinder is not plus-EV.

Run the same W/L tape as flat $1: eight losses and one win is −$7. Fibonacci turned it into −$20 because more dollars sat on the table during the cold stretch. That is the system working as designed.

### A second tape: early win, then cold

Start at 1, win (P/L +$1, pointer two back = start), then lose five times: stakes 1, 1, 2, 3, 5. Extra losses $12, net −$11, next term 8. You “reset” after the first win and still walk into a double-digit hole. The two-step-back rule only helps when wins arrive while the pointer is already high. Hoping for that arrival is not a method. It is a dependence on a streak the sequence does not cause.`,
    },
    {
      id: "edge",
      title: "Why a slower progression still cannot beat the edge",
      body: `Let e be the house edge per dollar (0.0303 on PVPspinArena Purple before the win fee, 0.027 on European red). Expected loss equals e times total wagered. Fibonacci increases total wagered after losses. Expected loss therefore rises relative to [flat betting](/guides/flat-betting) the base unit for the same number of rounds.

There is no hidden identity in 1+1+2+3+5 that equals a fair 50% coin. The sequence is a convenience for choosing integers. The wheel pays 2x on 16 of 33 slots. Those facts do not multiply to a surplus.

A compact EV reminder: whatever term F you bet, EV = −0.0303 F on Purple before the win fee. The pointer is a function of the past. The past does not appear in −0.0303 F. Sum those terms along any path and you have the expected leak on that path's turnover. The Fibonacci betting system is a path generator. It is not a discount.

[House edge](/guides/house-edge) is the one-page version. [D’Alembert](/guides/dalembert-strategy) is the linear cousin: same minus sign, different schedule. If a video says Fibonacci “hits a balance point”, ask for the EV on the next dollar. It is still −e.

Independence also kills the folk theory that a miss makes a hit more likely, which is the ghost inside every negative progression. See the [gambler’s fallacy](/guides/gamblers-fallacy) if you want that error named cleanly.`,
    },
    {
      id: "compare",
      title: "Fibonacci versus Martingale, Paroli and d’Alembert",
      body: `| After 7 losses (from $1) | Next stake | Approx. hole | One win then… |
| --- | --- | --- | --- |
| Flat | $1 | $7 | Still −$6 |
| D’Alembert | $8 | $28 | −$20 after the win |
| Fibonacci | $21 | $33 | Hole shrinks, pointer stays mid-list |
| Martingale | $128 | $127 | Back to +$1 if the $128 wins |

Paroli does not belong in the “after 7 losses” row: it would still be betting $1. That is its virtue and its limit. Fibonacci sits in the middle of the negative-progression pack: enough growth to hurt, not enough recovery to mimic Martingale’s all-or-nothing reset.

Choose among them only as entertainment aesthetics. The grown-up stake is a flat unit sized from a budget, not from a medieval sequence.`,
    },
    {
      id: "roulette",
      title: "Fibonacci on roulette, coinflip and jackpot",
      body: `### Roulette

Purple or Silver is the intended canvas. Green is not: you will walk far to the right of 89 before a 1-in-33 hit, and the 14x does not line up with a two-step-back rule designed for 2x. European red is the same system with a smaller e. American red is a larger e. Open [Roulette](/roulette) and count 33 slots if you want the p that the sequence is ignoring.

### Coinflip

A 0% fee [Coinflip](/coinflip) is ~0-EV. Fibonacci then manufactures a random walk with an expanding step after losses. Mean near zero, variance higher than flat. Someone must match 13, 21, 34. Many will not.

### Jackpot

A [Jackpot](/) ticket’s p is stake/pot, not 1/2. Mapping Fibonacci onto pot entries is a way to buy a larger share after you already lost, which is a mood decision, not a sequence identity. Skip it.

Honest results are still checkable on [fairness](/fairness). A verified L is still an L. The next term is still minus-EV on a house colour.`,
    },
    {
      id: "safer",
      title: "Risk, edge and a better rule",
      body: `If a written rule helps you stop inventing stakes, write a better one:

- one unit, always;
- stop at a dollar loss cap;
- stop at a clock;
- never advance a sequence after a loss.

The Fibonacci betting system cannot beat a house edge. A slower progression is a slower way to put extra dollars into a leak. If the pointer is already walking toward 34 because you are angry, that is chase. Stop. Use the [responsible gambling](/responsible-gambling) page. Gambling is optional and 18+ only.

Treat any completed “come back to 1” as variance. Treat the sequence as a museum piece. Price the colour with p × 2, then decide whether the entertainment is worth about −3.03% before the win fee of whatever you are about to shove along the list. If the next term is already 13 and you are explaining the sequence to yourself, the list has started making the decisions. Close it. A named integer series is not a reason to stay. The sequence was built to count rabbits, not to cancel the wheel's edge. Leave it in the maths book. If you need a sequence at all, use 1, 1, 1, 1 and a clock.

A written-line progression in the same family is the [Labouchere system](/guides/labouchere-system).`,
    },
  ],
  faqs: [
    {
      q: "What is the Fibonacci betting system?",
      a: "A negative progression that sizes even-money bets with Fibonacci numbers. You move one step up after a loss and usually two steps back after a win.",
    },
    {
      q: "Does the Fibonacci system work on roulette?",
      a: "It does not overcome the edge. It only grows the stake more slowly than doubling. Purple, European red and American red stay minus-EV on every term.",
    },
    {
      q: "How do I reset Fibonacci after a win?",
      a: "The common textbook moves two steps toward the start. Some players reset to 1. Neither rule creates an edge; they only change how lumpy the path is.",
    },
    {
      q: "Why is Fibonacci said to be safer than Martingale?",
      a: "Because 21 after seven losses is smaller than 128. You last longer before the max bet. You also recover less per win, so the hole can persist.",
    },
    {
      q: "Can Fibonacci beat a fair 50/50 game?",
      a: "No. With no edge the long-run mean is about zero. The sequence still clusters large bets after losses, which makes the ride worse than flat units.",
    },
    {
      q: "Should I use Fibonacci on Green or jackpot?",
      a: "No. Those bets are not even-money ~50% steps. The reset rule assumes a 2x hit that is common enough to walk left. Rare hits break the story.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Fibonacci sequence",
      url: "https://en.wikipedia.org/wiki/Fibonacci_sequence",
    },
    {
      label: "Wizard of Odds: betting systems",
      url: "https://wizardofodds.com/gambling/betting-systems/",
    },
    {
      label: "Wikipedia: Martingale (betting system)",
      url: "https://en.wikipedia.org/wiki/Martingale_(betting_system)",
    },
  ],
  related: [
    "crypto-jackpot",
    "kelly-criterion",
    "blackjack-basic-strategy",
    "card-counting",
    "gamblers-fallacy",
    "labouchere-system",
    "flat-betting",
  ],
  updated: "2026-09-26",
};
