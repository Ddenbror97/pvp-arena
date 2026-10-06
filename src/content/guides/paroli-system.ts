import type { Guide } from "./types";

export const guide: Guide = {
  slug: "paroli-system",
  cluster: "Games & odds",
  keyword: "paroli system",
  secondary: ["paroli betting", "reverse martingale", "positive progression", "paroli roulette"],
  title: "Paroli System: Positive Progression and Its Limits",
  description:
    "The Paroli system: raise after wins, cap the streak, worked examples, and why a positive progression cannot remove a house edge.",
  h1: "Paroli system: positive progression, examples and hard limits",
  answer:
    "The Paroli system is a positive progression: you raise the stake after a win, usually doubling, and you reset after a loss or after a short cap such as three wins. It is often called a reverse martingale. The appeal is that losing streaks stay near the base unit while winning streaks try to pyramid. The hard limit is arithmetic. Changing the stake after a result does not change the probability or the payout, so it cannot remove a house edge.",
  facts: [
    "Paroli doubles (or otherwise raises) after wins and returns to the base unit after a loss or a cap.",
    "A three-step Paroli on $1 risks $1 on a miss and aims for $7 profit if three 2x wins land in a row.",
    "Most sequences end on the first or second bet; the pyramid is the rare path.",
    "Positive progressions reshape when you win more dollars; they do not raise p.",
    "On about a 7.88% Purple or Silver edge after the win fee colour, every extra dollar the pyramid puts in play still has negative EV.",
  ],
  sections: [
    {
      id: "what",
      title: "What the Paroli system is",
      body: `Paroli is one of the oldest named staking plans. It is built for even-money bets: red or black, player or banker without commission maths, Purple or Silver on a coloured wheel. You pick a base unit. After a win you let the winnings ride, or you add another unit, depending on the house’s wording. After a loss you go back to one unit. After a chosen number of consecutive wins — commonly three — you lock the profit and start over.

That is the whole rulebook. There is no secret fourth step that cancels zeros. The system is a schedule for how large the next stake is. Probability stays on the wheel.

Paroli is the counterpart of the [Martingale strategy](/guides/martingale-strategy), which raises after losses. Both are progressions. Both live in the [Games and odds topic](/guides/topics/games-and-odds). PVPspinArena is 18+. If a progression is already chasing mood rather than a written cap, use the [responsible gambling](/responsible-gambling) page and stop.

Paroli is easy to like because it punishes you one unit at a time when you miss and only asks for courage when you are already winning. That emotional design is not an edge. It is a way to stay at the table long enough to donate the same percentage on a larger pile. If you want the feeling of a cap, write a dollar stop and skip the doubles.`,
    },
    {
      id: "rules-example",
      title: "Rules and a worked three-win Paroli",
      body: `Classic three-step Paroli on a 2x bet, base $1:

1. Bet $1. If you lose, −$1 and restart. If you win, you have $2 in front of you.
2. Bet $2. If you lose, you are back to −$1 for the cycle (the first dollar plus the recycled win). If you win, you have $4.
3. Bet $4. If you lose, the cycle is −$1. If you win, you take $8 total return on the last bet, and the booked profit for the three-win path is $7 relative to the start of the cycle.

### Worked paths

| Path (W = win, L = loss) | Stakes | Cycle result | Notes |
| --- | --- | --- | --- |
| L | $1 | −$1 | Most common stop |
| W, L | $1, $2 | −$1 | Recycled the first win |
| W, W, L | $1, $2, $4 | −$1 | Two wins, still −$1 |
| W, W, W | $1, $2, $4 | +$7 | The advertised pyramid |

On a 50% coin the three-win path has probability 1/8. On Purple, p = 16/33 per hop, so P(WWW) = (16/33)³ ≈ 10.2%, not 12.5%. The three losing-shaped rows are more likely than they would be on a fair coin. That is the edge leaking through the pretty table.

You can sit on [Roulette](/roulette) and mark W/L without raising a dollar. The sequence frequencies will not match a brochure that assumed 50%.

### Cycle probabilities on Purple

Let p = 16/33, q = 17/33.

- P(L) = q ≈ 53.33%, result −$1
- P(W then L) = p q ≈ 24.89%, result −$1
- P(W, W, L) = p² q ≈ 11.62%, result −$1
- P(W, W, W) = p³ ≈ 10.16%, result +$7

Expected cycle result ≈ 0.5333(−1) + 0.2489(−1) + 0.1162(−1) + 0.1016(+7) ≈ −$0.90 + $0.71 ≈ −$0.19. The average cycle is negative. The brochure path is the 10% tail. A fair coin would have P(WWW) = 12.5% and a milder leak; this wheel taxes the pyramid twice: fewer completed climbs, and every dollar still short.`,
    },
    {
      id: "reverse",
      title: "Why it is called a reverse martingale",
      body: `Martingale says: after a loss, double, so one win reimburses the pile. Paroli says: after a win, double, so one loss only costs the base unit and a win streak builds a pile. The cash-flow shapes invert.

- **Martingale:** many small pluses, rare catastrophic minus.
- **Paroli:** many small minuses (usually −1 unit), rare larger plus (the completed pyramid).

Neither shape has a better EV than flat betting the same total dollars. They allocate dollars to different moments. Martingale puts the large bets on the table when you are already cold. Paroli puts the large bets on the table when you are already hot. The next round is still independent. A “hot” table does not raise p. See [gambler’s fallacy](/guides/gamblers-fallacy) if that sentence is the one you came to argue with — it is the same independence fact.

Reverse-martingale branding is marketing. The maths is “stake is a function of the last result”. The wheel does not read the function. If you like the reverse-martingale story because it “only risks one unit”, measure the rare $7 win against the stack of −$1 cycles you will print to buy a ticket to that win. The story sells the ticket. The table still charges the edge on every dollar that rides.`,
    },
    {
      id: "edge",
      title: "Why a positive progression cannot remove the edge",
      body: `House edge is a property of each dollar wagered. If you wager $1, then $2, then $4 on Purple, you have wagered $7, each slice at about −3.03% before the win fee. Expected leak ≈ $0.21 on that completed three-bet path *before* you condition on winning all three. Conditional on winning all three you are +$7, but that path is underpaid relative to a fair 50% coin.

### Same dollars, same leak

Compare two players who each wager $7 in a night on Purple.

- Player F flat-bets $1 seven times.
- Player P runs Paroli and, through a mix of short cycles, also puts $7 through the wheel.

Player P’s dollars are clustered on later steps of winning cycles. Player F’s dollars are spread. The expected cost on $7 turned over is about $0.47 for both. P’s result distribution is lumpier. Lumpier is not plus-EV.

[House edge](/guides/house-edge) does not care about your mood or your cap of three. The [Fibonacci](/guides/fibonacci-betting-system) and [d’Alembert](/guides/dalembert-strategy) plans fail for the same reason at different speeds.

### Dollars actually risked

A completed three-step attempt that dies on the first bet risks $1. One that dies on the third risks $1+$2+$4 = $7 to finish −$1. The rare win risks the same $7 to finish +$7. Weighted average turnover per cycle is 1×q + 3×pq + 7×p²q + 7×p³. On Purple that is a few dollars per cycle, each at about −3.03% before the win fee. The cycle EV is that turnover times the edge. If a video quotes only the +$7, ask for the other three rows.`,
    },
    {
      id: "limits",
      title: "Caps, table limits and bankroll",
      body: `Paroli is gentler on a small bankroll than Martingale because the large bets are optional and rare. That is a real practical difference. It is not an edge.

### The cap is doing the safety work

Without a cap, “let it ride” is a way to hand a winning streak back to the same minus-EV price. The three-win stop is a budget rule in costume. You could flat-bet and stop after a $7 win and skip the folklore.

### Table and match limits

A site max bet, or a [Coinflip](/coinflip) opponent who will not match $32, ends the pyramid early. You then sit on a partial ride the brochure did not draw. PvP matching is a market, not a dealer who must take the double.

### Bankroll

You still need enough units to eat a string of −$1 cycles. Twenty failed cycles are −$20 at a $1 base. That is ordinary. If −$20 is a problem, the base is too large, Paroli or not.`,
    },
    {
      id: "games",
      title: "Paroli on roulette and on PvP",
      body: `### Roulette

Purple or Silver is the usual canvas: 2x, ~48.48% hit, about a 3.03% edge before the win fee. Green is a bad Paroli target because three 14x hits in a row is (1/33)³, about 1 in 35,937, and the intermediate doubles become nonsense relative to any normal bankroll.

European red is a milder version of the same idea (2.70% edge). The structure of Paroli does not improve on French or American rules; it only inherits them.

### Coinflip and Jackpot

A 0% fee flip is ~0-EV. Paroli still produces many −1 unit cycles and a few pyramids. Average profit tends to zero before you count time and mood. A [Jackpot](/) share is not an even-money step, so the three-win ladder does not map. Do not invent a Paroli on pot tickets; you would be stacking long shots.

Verify a finished sequence on [fairness](/fairness) if you care whether the Ws and Ls were honest. Honesty does not turn Paroli plus.`,
    },
    {
      id: "safer",
      title: "Hard limits and safer structure",
      body: `If you like a rule because it stops you from inventing stakes mid-session, keep the stop and drop the pyramid:

- flat unit you can lose ten times;
- a loss cap and a time cap written first;
- no raise after a win except as a pre-committed “this $X is play money from profit”, not a double-up duty;
- no raise after a loss, ever.

The Paroli system is not a cheat code. It is a way to buy a lumpy distribution with the same negative mean. Treat completed pyramids as variance, not as skill. If the ladder is already sliding into larger units you did not plan, that is chase. Stop, and use the help links on the responsible gambling page. Gambling is 18+ and optional.

A clean experiment, no money: mark 30 closed cycles on paper while watching the wheel. Count how many printed −$1 and how many printed +$7. You should see a pile of minus ones. If you then decide the entertainment of the rare +$7 is worth the expected −$0.19 per cycle, you have priced a product. You have not found a system. Thirty cycles at about −$0.19 each is an expected −$5.70 before unfinished moods. That is Paroli in one line: a small lumpy fee with a poster of +$7. Pay it only if the poster is the entertainment.

If you want the cap without the pyramid, that is [flat betting](/guides/flat-betting).`,
    },
  ],
  faqs: [
    {
      q: "What is the Paroli system?",
      a: "A positive progression that raises the stake after wins and resets after a loss or after a short cap, often three wins. It is also called a reverse martingale.",
    },
    {
      q: "Does the Paroli system work?",
      a: "It can produce occasional larger wins from a small base, but it does not beat a house edge. Most cycles lose one unit. The average still tracks the edge on money wagered.",
    },
    {
      q: "Is Paroli safer than Martingale?",
      a: "It is usually gentler on a small bankroll because you do not double after losses. Safer is not the same as plus-EV. Both systems lose on minus-EV bets.",
    },
    {
      q: "Why cap Paroli at three wins?",
      a: "Without a cap, a later loss gives the streak back to the same short price. The cap is a stop rule. It is not a mathematically optimal horizon that cancels the edge.",
    },
    {
      q: "Can I use Paroli on PVPspinArena Roulette?",
      a: "You can raise after Purple or Silver wins if you insist. The Purple or Silver edge stays about 3.03% before the win fee on every dollar, and three wins in a row are less likely than on a fair coin.",
    },
    {
      q: "Is Paroli a good idea on Green?",
      a: "No. Green hits 1 in 33. A three-win ladder is extremely rare, and the intermediate stakes grow without an edge to justify them.",
    },
  ],
  sources: [
    {
      label: "Wizard of Odds: betting systems",
      url: "https://wizardofodds.com/gambling/betting-systems/",
    },
    {
      label: "Wikipedia: Martingale (betting system)",
      url: "https://en.wikipedia.org/wiki/Martingale_(betting_system)",
    },
    {
      label: "Encyclopaedia Britannica: gambling",
      url: "https://www.britannica.com/topic/gambling",
    },
  ],
  related: [
    "crypto-jackpot",
    "dalembert-strategy",
    "fibonacci-betting-system",
    "kelly-criterion",
    "blackjack-basic-strategy",
    "flat-betting",
  ],
  updated: "2026-09-26",
};
