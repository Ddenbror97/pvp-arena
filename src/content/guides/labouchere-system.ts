import type { Guide } from "./types";

export const guide: Guide = {
  slug: "labouchere-system",
  cluster: "Games & odds",
  keyword: "labouchere system",
  secondary: [
    "cancellation system",
    "split martingale",
    "labouchere roulette",
    "labouchere betting",
  ],
  title: "Labouchere System: Cancellation Lines and Why They Fail",
  description:
    "The labouchere system explained: write a cancellation line, bet first plus last, work a full example, and see why the split martingale still loses to the edge.",
  h1: "Labouchere system: the cancellation line, worked bets and why it fails",
  answer:
    "The labouchere system is a cancellation staking plan. You write numbers that sum to a profit target, bet the first plus the last, cross both off after a win, and append a loss. Clearing the line books the target. It fails because every extra dollar still faces the same short price, and a cold run grows the line until money or the table max runs out.",
  facts: [
    "Also called the cancellation system or split martingale; named for the British politician Henry Labouchère (1831–1912).",
    "A win removes two numbers; a loss adds one. Clearing a line needs a win rate above one third, not a fair coin.",
    "A 1-2-3 line has a $6 target; the first stake is already $4, not $1.",
    "On Purple (p = 16/33) you win more than one third of even-money bets, so many lines finish — and the unfinished ones are large.",
    "A stopping rule cannot turn a string of minus-EV bets into a plus-EV session.",
  ],
  sections: [
    {
      id: "what",
      title: "What the Labouchere system is",
      body: `The Labouchere system is a written negative progression for even-money bets: red or black, odd or even, Purple or Silver. You pick a profit target and break it into a line of positive numbers. Those numbers are not lucky charms. They are the accounting identity of the plan.

1. Write a sequence that sums to the target. Classic teaching lines are 1-2-3 or 1-2-3-4.
2. Stake the sum of the first and last numbers. If one number is left, stake that number.
3. After a win, cross off the two numbers you just used.
4. After a loss, append the amount you just lost to the end of the line.
5. Stop when the line is empty (target booked) or when you hit a written bankroll or table-limit stop.

The folklore says this is gentler than doubling because a win cancels two entries and a loss adds only one, so you can finish without winning half the bets. That arithmetic is real. It is also incomplete. You still have to place every stake the line demands, and those stakes grow while you are losing.

Henry Labouchère was a nineteenth-century journalist and Liberal MP. The staking rule attached itself to his name the way other salon systems attached themselves to d’Alembert and Fibonacci. The [Games and odds topic](/guides/topics/games-and-odds) collects those cousins. The [d’Alembert strategy](/guides/dalembert-strategy) page mentions Labouchere in passing; this page is the worked cancellation line. PVPspinArena is 18+.`,
    },
    {
      id: "worked",
      title: "A worked 1-2-3 line",
      body: `Target $6, unit $1, even-money bet. Opening line: 1, 2, 3. First stake = 1 + 3 = $4.

### Path A — two wins, brochure finish

| Step | Line | Stake | Result | New line | Running P/L |
| --- | --- | --- | --- | --- | --- |
| 1 | 1, 2, 3 | $4 | W | 2 | +$4 |
| 2 | 2 | $2 | W | empty | +$6 |

Two wins book the whole target. That is the postcard.

### Path B — two losses, then three wins

| Step | Line | Stake | Result | New line | Running P/L |
| --- | --- | --- | --- | --- | --- |
| 1 | 1, 2, 3 | $4 | L | 1, 2, 3, 4 | −$4 |
| 2 | 1, 2, 3, 4 | $5 | L | 1, 2, 3, 4, 5 | −$9 |
| 3 | 1, 2, 3, 4, 5 | $6 | W | 2, 3, 4 | −$3 |
| 4 | 2, 3, 4 | $6 | W | 3 | +$3 |
| 5 | 3 | $3 | W | empty | +$6 |

Same +$6. Different turnover: you wagered $4 + $5 + $6 + $6 + $3 = $24 to collect a $6 net. On a Purple or Silver bet that $24 of action has an expected leak of about $1.60 *before* you condition on finishing. The finish is not free. It is a small plus sitting on a pile of taxed dollars.

### Path C — four opening losses

Stakes $4, $5, $6, $7. After four misses you are −$22 and the line is 1, 2, 3, 4, 5, 6, 7. Next stake is $8. A [Martingale](/guides/martingale-strategy) that started at $1 would be −$15 after four misses and looking at $16. Labouchere is not automatically the smaller hole. It depends on the opening line. A 1-2-3 line starts hotter than a $1 double-up.`,
    },
    {
      id: "one-third",
      title: "The one-third win-rate claim",
      body: `Let the opening line have k numbers. Each win removes two numbers (or one, when a singleton remains). Each loss appends one number. Roughly, you clear the line when 2W − L ≥ k. With L = N − W total bets, that rearranges to W ≥ (N + k) / 3. You need a bit more than one win in three, plus you must survive every intermediate stake.

On a fair coin, p = 1/2, which is well above 1/3, so many lines complete. On Purple, p = 16/33 ≈ 48.48%, still above 1/3, so many lines still complete. That is why the system feels as if it “works”. You see the empty line and the booked target often enough to remember them.

The missing row is the line that never empties. Table max, match max or a finished bankroll stops the algorithm with a hole larger than several successful targets. The brochure counts the +$6 finishes and skips the −$80 wrecks.

### Why “above one third” is not an edge

Expected value is not a win-count ratio. It is probability times payoff on each dollar wagered. Purple pays 2x and hits 7 times in 15, so each dollar returns 32/33 and leaks 1/33 ≈ 3.03%. Crossing two numbers off a notepad does not change that price. See [house edge](/guides/house-edge) for the definition the line is trying to argue with.

A fair-coin thought experiment makes the same point without the zero. With infinite capital and no limit, a Labouchere line on a fair even-money bet completes almost surely, just as a Martingale eventually catches a head. Finite money and a cap restore the zero (or negative) expectation. You do not have infinite money.`,
    },
    {
      id: "edge",
      title: "Why a cancellation line cannot remove the edge",
      body: `House edge is a property of each wager, not of the notepad. If you stake $4, then $5, then $6 on Purple, those are three separate minus-EV bets. Adding their results to a running “cycle P/L” does not create a new random experiment with a better price.

Optional stopping does not rescue you. As long as each bet has negative expectation, any rule that decides the next stake from past wins and losses — cancel two, append one, double, add one unit — produces a session whose expected result is still negative. You cannot stop your way to a plus mean on a minus-EV price.

### Same dollars, same leak

Compare two players who each turn over $24 on Purple.

- Player F [flat betting](/guides/flat-betting) $1 twenty-four times.
- Player L completes Path B above and also wagers $24.

Expected cost on $24 of action is about $1.60 for both. L’s result is lumpier: a booked +$6 on the completed line, or a much larger minus if the line dies. Lumpier is not plus-EV. It is a different variance costume on the same mean.

### Reverse Labouchere

The reverse plan appends after wins and cancels after losses, a positive-progression cousin of [Paroli](/guides/paroli-system). It front-loads the large bets onto hot streaks instead of cold ones. The wheel still does not read the notepad. Treat it as another way to cluster dollars, not as a repair.`,
    },
    {
      id: "limits",
      title: "Bankroll, table limits and line design",
      body: `Line shape is the hidden risk knob.

- **Short aggressive line** (1-2-3 or 3-3-3): larger early stakes, faster finishes, fatter holes when it fails.
- **Long thin line** (1-1-1-1-1-1): smaller first bets, more steps, a slow grind that still balloons after a clump of losses.
- **Split the line.** Some players, when the next stake looks ugly, break a large end number into two smaller ones. That delays the crisis. It does not delete it.

### How fast the next stake grows

After n opening losses on a 1-2-3 line the next stake is 4 + n, and the hole is the triangular pile 4 + 5 + … + (3 + n). Ten opening losses: hole = 4+5+…+13 = 85, next bet $14. Ten losses on Purple have probability (17/33)^10 ≈ 0.17%, about 1 in 580 isolated starts — and a long sitting produces many starts. On a fair coin the same streak is about 1 in 1,024. The extra slots make the wreck more common.

A table max of $25, or a [Coinflip](/coinflip) opponent who will not match $14, ends the algorithm mid-line. You then sit on an unfinished cancellation with a hole the brochure never drew.

### Bankroll in units of the *first* stake

People size the bankroll against the $1 unit and forget the first bet is $4. Twenty units of $1 is five opening bets. Write the stop in dollars of the actual first stake, and write a second stop for line length (for example: abandon if the line exceeds eight numbers). Those stops are budget rules. They are the only part of Labouchere that reduces harm.`,
    },
    {
      id: "pvp",
      title: "Labouchere on roulette, coins and hashed rounds",
      body: `### Roulette

Purple or Silver is the usual canvas: 2x, 16/33, about a 3.03% edge before the win fee on [Roulette](/roulette). Green is a bad Labouchere target. A 14x hit does not cancel two even-money numbers in any coherent way, and three-number lines aimed at a 1-in-33 shot are just a long-shot parlay with extra bookkeeping.

European red (2.70% edge) and American double-zero (5.26%) inherit the same cancellation arithmetic at different tax rates. French la partage on even-money even-chance bets cuts the leak when zero hits; the line still does not beat the remaining edge. The structure of Labouchere does not improve because you drew it in French.

### Coinflip and Jackpot

A two-player coin is close to even money, so the one-third story completes more often than on Purple. Completing more often is not an edge. Average profit still tracks whatever price you actually paid, and a PvP match is a market: the other player can decline the next number on your line. A [Jackpot](/) share is not an even-money step, so do not invent a cancellation line on pot tickets.

If you care whether the W/L tape was honest, settle the round and check it on [fairness](/fairness). Honesty does not turn a cancellation plus. If the line is already dictating stakes you did not write before you sat down, that is chase. Stop, and use the tools on the [responsible gambling](/responsible-gambling) page. Gambling is 18+ and optional.

A clean no-money drill: deal 40 closed 1-2-3 lines on paper while watching the wheel. Count finished +$6 rows against abandoned holes. You should see both. If you then decide the entertainment of the finished rows is worth the expected leak, you have priced a product. You have not found a system.

In the same cluster, see also [risk of ruin](/guides/risk-of-ruin).`,
    },
  ],
  faqs: [
    {
      q: "What is the Labouchere system?",
      a: "A cancellation staking plan: write numbers that sum to a profit target, bet first plus last, cross them off after a win, and append the lost stake after a loss. Clearing the line books the target.",
    },
    {
      q: "Does the Labouchere system work?",
      a: "It often completes on even-money bets because you only need a win rate above one third. Completing is not beating the edge. Unfinished lines and the tax on every dollar keep the average negative.",
    },
    {
      q: "Is Labouchere safer than Martingale?",
      a: "It grows slower than doubling if you start with a thin line, and faster if you start with 1-2-3. Safer is the wrong word. Both are minus-EV schedules with a small-plus mode and a large-minus tail.",
    },
    {
      q: "Why do people say you only need to win one third of the time?",
      a: "Each win removes two numbers and each loss adds one, so a line can clear with a win rate a bit above one in three. You still have to fund every stake, and the bets are still short-priced.",
    },
    {
      q: "Can I use Labouchere on PVPspinArena Roulette?",
      a: "You can raise after Purple or Silver losses if you insist. The Purple or Silver edge stays about 3.03% before the win fee on every dollar, and a match or table cap can freeze an unfinished line.",
    },
    {
      q: "What is reverse Labouchere?",
      a: "A positive-progression variant that lengthens the line after wins and shortens it after losses. It clusters large bets on hot streaks. It does not change p or the payout.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Labouchère system",
      url: "https://en.wikipedia.org/wiki/Labouch%C3%A8re_system",
    },
    {
      label: "Wizard of Odds: betting systems",
      url: "https://wizardofodds.com/gambling/betting-systems/",
    },
    {
      label: "Encyclopaedia Britannica: gambling",
      url: "https://www.britannica.com/topic/gambling",
    },
  ],
  related: [
    "dalembert-strategy",
    "paroli-system",
    "martingale-strategy",
    "fibonacci-betting-system",
    "flat-betting",
    "risk-of-ruin",
  ],
  updated: "2026-09-27",
};
