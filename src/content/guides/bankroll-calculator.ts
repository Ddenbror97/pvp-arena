import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bankroll-calculator",
  cluster: "Games & odds",
  keyword: "bankroll calculator",
  secondary: ["gambling bankroll calculator", "bankroll size", "session budget calculator"],
  title: "Bankroll Calculator for Casino Players | PvP Spin Arena",
  description:
    "Work out a stake size your bankroll can survive. Enter bankroll, edge and volatility to see risk of ruin and sensible stop-loss settings.",
  h1: "Bankroll Calculator: Sizing Stakes to Survive Variance",
  answer:
    "A bankroll calculator turns a cash roll, a stake size, a win chance and a house edge into session maths: how many bets you can place, how fast expected loss accumulates, and a rough sense of risk of ruin if you keep firing the same stake. It does not invent an edge. On minus-EV games the calculator’s job is survival and budget control, not growth. PVPspinArena is 18+; treat any roll you stake on Jackpot, Coinflip or Roulette as money you can lose.",
  facts: [
    "Bankroll is the cash you will not top up mid-session; stake is one bet from that roll.",
    "Units in bankroll = bankroll ÷ stake. Fifty units is a common entertainment floor for flat bets.",
    "Expected loss ≈ stake × n × house edge. Edge drives the mean; variance drives the swings.",
    "Risk of ruin rises when stake is large relative to bankroll and when win chance is below 50%.",
    "Kelly sizing applies to plus-EV bets. On a casino colour it returns 0% — bet nothing to “grow.”",
  ],
  sections: [
    {
      id: "what",
      title: "What a bankroll calculator does",
      body: `A **bankroll calculator** answers a boring question with arithmetic: given this roll and this stake, what session are you buying?

It is not a tip sheet. It will not tell you which colour is “due.” It will tell you that a $100 roll at $10 a spin is ten first-pass bets, and that recycling wins into more spins stretches turnover and therefore expected leak. That is the same identity used on an [RTP calculator mindset](/guides/rtp-explained): mean cost follows handle, not deposit.

### What it is for

- Sizing a flat stake so a planned number of bets fits the roll.
- Checking whether a stop-loss is reachable before the roll is gone.
- Comparing two stakes at the same edge (for example $2 vs $5 on a Purple or Silver bet).

### What it is not for

- Beating [house edge](/guides/house-edge).
- Turning a progression into a growth engine.
- Replacing a written [gambling budget](/guides/gambling-budget).

More odds and sizing pieces live in the [Games and odds topic](/guides/topics/games-and-odds). Adults only.`,
    },
    {
      id: "inputs",
      title: "Inputs you need",
      body: `You need four numbers before any formula is useful.

1. **Bankroll ($)** — cash set aside for play. Not next month’s rent.
2. **Stake ($)** — one bet. On [Roulette](/roulette) that is one colour stake; on [Coinflip](/coinflip) it is your side of the pot; on Jackpot it is your buy-in.
3. **Win probability p** — the true chance the bet pays. Purple or Silver on a 33-slot wheel is 16/33 ≈ 48.48%. A fair coin is 50%. A posted crash target uses RTP ÷ multiplier (see the crash cashout page in this cluster).
4. **House edge e** (or RTP) — keep-rate of the bet. Purple or Silver on this site returns about 92.12% after the win fee. Green returns about 40.30%. A 0% fee PvP duel is 0% edge between players before anyone talks about skill or match quality.

### Derived quantities

| Symbol | Meaning | Formula |
| --- | --- | --- |
| U | Units in roll | bankroll ÷ stake |
| n | Planned bets | chosen session length |
| W | Turnover | stake × n |
| EL | Expected loss | W × e |

If you cannot name p and e, you are guessing. Read the game rules or [how it works](/how-it-works) before you size a stake.

### Deposit is not bankroll

Transferring $200 to a wallet and then deciding the stake at the table is how rolls become rent money. The bankroll input is the subset you already labelled entertainment. If that subset is $40, type $40 — not $200. The calculator cannot invent discipline you refused to write down.

### Session bankroll vs lifetime bankroll

Some players keep a monthly gambling budget of $200 and a per-session slice of $40. Type the session slice when you size tonight’s stake. Type the monthly figure only when you are checking whether four $40 nights still fit the month. Mixing the two inflates U and quietly authorises a stake you cannot repeat.`,
    },
    {
      id: "ruin",
      title: "Risk of ruin explained",
      body: `Risk of ruin is the chance your bankroll hits zero (or your stop) before you finish the plan — or, in the infinite-horizon version, the chance you eventually go broke if you keep playing the same stake forever.

### Flat-bet intuition

On a fair even-money game (p = 0.5, e = 0), ruin is driven only by finite bankroll and stubborn play. On a minus-EV even-money-style bet, the drift is against you, so ruin probability climbs.

A useful teaching approximation for repeated independent bets with win +stake and loss −stake is sensitive to p and to units U. Exact closed forms exist in gambling theory texts; for session planning you usually want a simpler check:

- If U is small (under ~20), one cold streak ends the night.
- If U is large (50–100+) at a modest edge, you can finish a planned n without touching zero more often — you still expect to lose EL dollars.

### Worked streak lengths

P(k losses in a row) = (1 − p)^k.

| p | P(5 losses) | P(10 losses) | Cash at risk if stake = $2 |
| --- | --- | --- | --- |
| 0.50 | 3.13% | 0.10% | $10 / $20 |
| 0.4848 | 4.33% | 0.19% | $10 / $20 |
| 0.40 | 7.78% | 0.60% | $10 / $20 |

### Stop-loss as a softer ruin line

If your stop is −20 units rather than zero, replace “ruin” with “stop hit.” For a $2 stake and a $40 stop, k = 20 losses empties the stop even if cash remains elsewhere. P(20 losses) at p = 0.4848 is (0.5152)^20 ≈ 0.0000017 — tiny for a pure streak, but you do not need a pure streak to lose 20 units. A mix of wins and losses with negative drift gets there often enough that the stop exists for a reason.

A bankroll calculator that only prints “units” without showing streak risk is half a tool. Pair units with (1 − p)^k for the k that empties your stop-loss. [Variance in gambling](/guides/variance-in-gambling) explains why short samples look nothing like the mean.

### Infinite-horizon warning

If you top up forever at a minus-EV game, eventual loss of any finite fortune is the usual story in the classic ruin models. The entertainment framing rejects that horizon: you play a planned n, then stop. The calculator is for the planned n, not for “until I win it back.”`,
    },
    {
      id: "volatility",
      title: "Stake sizing by game volatility",
      body: `Volatility is how wide the outcomes swing around the mean. Same edge, different feel.

### Low relative swing (frequent small results)

Even-money style bets (colours, coinflips) hit often and miss often. Stake can be a smaller slice of bankroll if your goal is a long session, because single-bet swings are ±1 unit.

### High relative swing (rare large pays)

A 14x green-style payout, a high crash cashout, or a long-shot multi-leg ticket can go many bets without a hit. You need more units in the roll for the same planned n, or a smaller stake — not a “system.”

### Same edge, two stake maps

Hold e ≈ 7.88% on Purple or Silver and bankroll = $300.

| Style | Stake | U | Feel |
| --- | --- | --- | --- |
| Colour 2x | $6 | 50 | Frequent ±$6 |
| Green 14x | $3 | 100 | Long quiet spells, rare +$39 |

Expected loss still tracks turnover. If both plans wager $180, EL ≈ $12 either way. The green plan needs the extra units because droughts are longer, not because the edge changed.

### Kelly is the wrong growth tool on house games

The [Kelly criterion](/guides/kelly-criterion) fraction for a binary bet that pays b-to-1 net is f* = (bp − q) / b with q = 1 − p. For a 1-to-1 colour with p = 0.4848:

f* = 2p − 1 = −0.0666 → **bet nothing** to grow the roll.

That is the calculator’s honest output when someone pastes casino odds into a Kelly sheet. Entertainment staking is a budget fraction, not f*.

### Practical entertainment fractions

Many players cap a single stake at 1–2% of the session bankroll on high-swing bets and 2–5% on even-money style bets. Those are discipline rules, not edges. A $200 roll → $4–$10 colours, or $2–$4 on a long shot. If 5% already feels like rent money, the roll is too small for that game.

### Progressive stake sizes

Raising the stake after losses shrinks U exactly when variance just hurt you. A bankroll calculator that re-runs after each loss with a doubled stake will show rising ruin risk — that is the tool working, not a bug. Do not “fix” it by ignoring the new U.`,
    },
    {
      id: "session",
      title: "Session and stop-loss settings",
      body: `A bankroll without a session plan is a leak with a longer fuse.

### Write three stops before the first click

1. **Loss stop** — for example 40% of the session roll. At $150, stop at −$60.
2. **Time stop** — for example 45 minutes. Clock beats “one more.”
3. **Win park** — optional: bank a slice of profit and leave. Not required; ego often ignores it.

### How the calculator talks to the stops

- Stake such that expected loss over planned n is ≤ loss stop (ideally well under it).
- Example: e ≈ 7.88% on Purple or Silver, stake $3, n = 40 → W = $120 → EL ≈ $8.00. A $60 stop is loose relative to the mean; the stop exists for variance, not for the mean.
- If EL already exceeds the stop, you planned too much handle. Cut stake or n.

### Recycle warning

Deposit $50, stake $2, plan “until it’s gone.” First-pass n ≈ 25. If you rebet wins, n and W grow. Expected loss grows with W. A session budget calculator that ignores recycle understates cost. Count the bets you will actually click.

Link the money rules to [poker bankroll management](/guides/poker-bankroll-management) for unit thinking, and to [responsible gambling](/responsible-gambling) if stops are already broken.`,
    },
    {
      id: "worked",
      title: "Worked examples at three bankrolls",
      body: `Same Purple or Silver edge, about 7.88% after the win fee. Same goal: about forty bets of entertainment. Scale stake with the roll.

| Bankroll | Stake | Units U | n | Turnover W | Expected loss EL |
| --- | --- | --- | --- | --- | --- |
| $50 | $1 | 50 | 40 | $40 | ≈ $2.67 |
| $150 | $3 | 50 | 40 | $120 | ≈ $8.00 |
| $500 | $10 | 50 | 40 | $400 | ≈ $26.68 |

### Reading the table

- Units stay near 50 so streak risk stays in the same ballpark.
- EL scales with handle. A bigger roll does not buy a better edge; it buys a larger entertainment budget.
- If $26.68 expected for forty $10 colours feels wrong, the stake is wrong — not the wheel.

### Coinflip contrast

$50 into a 0% fee head-to-head pot: edge between players is 0% before matchup quality. Expected fee leak is $0. Ruin is still real: you can lose the $50 in one pot. Units = 1. That is a different calculator row — one bet, binary outcome — not forty colours.

### Jackpot contrast

Buy-in $20 into a multi-player pot. Your ticket share is your fraction of the pot; variance is high; “units” is not forty flat spins. Size the buy-in as a small percent of the weekly gambling budget, not as a colour stake.

### Aggressive contrast (same $150 roll)

| Stake | U | n = 40 W | EL | Note |
| --- | --- | --- | --- | --- |
| $3 | 50 | $120 | ≈ $8 | Matches the main table |
| $10 | 15 | $400 | ≈ $27 | Short fuse; only 15 units |
| $25 | 6 | $1,000 | ≈ $67 | Plan collapses into ruin risk |

### Weekly roll example

Monthly entertainment budget $200 → four weekly slices of $50. Each slice uses the $50 row above. If week one burns the $50, week two does not borrow from week three. The bankroll calculator is per slice; the budget is the parent.

Home page live pots: [PVPspinArena](/).`,
    },
    {
      id: "using",
      title: "Using the calculator",
      body: `Work the page as a worksheet, not as permission.

1. Fix the bankroll and the loss stop in writing.
2. Pick the game and write p and e from the real rules.
3. Choose n (how many bets you will sit for).
4. Solve stake ≈ bankroll / target units, then check EL = stake × n × e against the stop.
5. If EL or streak risk fails the stop, lower stake or shorten n. Do not raise edge in your head.

### Sanity checks

- Stake > 10% of bankroll on a minus-EV colour is a short night by design.
- “I need this stake to hit a profit target” is not an input. Targets do not change e.
- Topping up the roll mid-session resets the calculator and usually violates the budget.
- If you change p because you “feel hot,” you left the tool. Re-enter the published chance.

### After the session

Compare actual net to EL. A $8 expected night that finished −$2 or −$30 is normal variance, not proof the edge moved. A night that finished +$40 does not raise next session’s stake. Log the stake, n, and result; do not log a narrative about being due.

### Two clocks, one roll

A loss stop without a time stop invites “I still have cash, so one more.” A time stop without a loss stop invites speeding up stakes to “make the hour worth it.” Run both. If either trips, the session is over — recalculating a higher stake is a new session with a new written roll, not a continuation.

### Foundations first

If edge, EV and probability still blur together, start in the [Foundations topic](/guides/topics/foundations) and [expected value gambling](/guides/expected-value-gambling), then return here to size the stake.

A bankroll calculator is a fence. Climbing it after a loss is how rolls disappear. 18+ only.

The calculator sizes a roll; [risk of ruin](/guides/risk-of-ruin) is the formula for the chance that roll hits zero.`,
    },
  ],
  faqs: [
    {
      q: "What does a bankroll calculator show?",
      a: "How a stake, a roll, a win chance and an edge combine into units, planned turnover, expected loss and a sense of ruin or streak risk. It does not show a way to beat the house.",
    },
    {
      q: "How many units should I keep for casino colours?",
      a: "A common entertainment floor is about 50 units (bankroll ÷ stake). Fewer units means one cold run ends the session faster. More units stretch time; they do not improve RTP.",
    },
    {
      q: "Can Kelly criterion size my roulette bets?",
      a: "On a minus-EV colour Kelly’s growth fraction is zero or negative. Use a fixed entertainment stake and a written stop instead.",
    },
    {
      q: "Does a bigger bankroll raise my win rate?",
      a: "No. It lowers the chance a short streak ends the night and lets you choose a stake that matches your budget. The edge is unchanged.",
    },
    {
      q: "How do I use this on PVPspinArena?",
      a: "For Roulette colours use p ≈ 48.48% and e ≈ 7.88% on Purple or Silver. For 0% fee Coinflip or Jackpot, fee edge can be 0% between players, but one pot can still take the whole buy-in — size that buy-in as a budget line, not as forty flat units.",
    },
  ],
  sources: [
    { label: "Wikipedia: Risk of ruin", url: "https://en.wikipedia.org/wiki/Risk_of_ruin" },
    { label: "Wikipedia: Kelly criterion", url: "https://en.wikipedia.org/wiki/Kelly_criterion" },
  ],
  related: [
    "gambling-budget",
    "kelly-criterion",
    "variance-in-gambling",
    "poker-bankroll-management",
    "house-edge",
    "risk-of-ruin",
  ],
  updated: "2026-09-26",
};
