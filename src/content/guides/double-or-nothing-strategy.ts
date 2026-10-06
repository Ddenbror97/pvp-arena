import type { Guide } from "./types";

export const guide: Guide = {
  slug: "double-or-nothing-strategy",
  cluster: "Games & odds",
  keyword: "double or nothing strategy",
  secondary: ["double or nothing betting", "2x streak", "parlay strategy", "gamble win streak"],
  title: "Double or Nothing: The Doubling Maths | PvP Spin Arena",
  description:
    "Doubling until you lose has a fixed ending. See the probability of consecutive wins, how the edge compounds, and real ruin tables.",
  h1: "Double or Nothing: The Maths of Repeated Doubling",
  answer:
    "Double or nothing strategy is really a stop rule on a streak product: each step offers 2× or zero on the stack you press. A fair 50/50 step has no edge; a 49% win step at even money has 2% edge per step, and n precommitted doubles multiply to (2p)^n of the starting expected value. Variance dominates — most paths bust. The only honest levers are how many doubles you precommit, the underlying p, and a written cash-out or bust line. Martingale chases losses; double-or-nothing presses wins; neither flips negative EV.",
  facts: [
    "One even-money step with win probability p and 2x pay has EV = 2p per dollar at risk on that step.",
    "n precommitted all-in doubles multiply EV: expected fraction remaining ≈ (2p)^n if you only cash at 2^n or bust.",
    "A 2% per-step edge becomes about 10% expected loss across five precommitted doubles (0.98^5).",
    "The typical streak path is zero; rare full streaks hold up the mean and feed screenshot culture.",
    "PVPspinArena does not offer a double-or-nothing ladder; Coinflip is one 50/50, not a streak widget.",
  ],
  sections: [
    {
      id: "product",
      title: "What double or nothing strategy actually controls",
      body: `Double or nothing is a **streak button**: after a win (or on demand), you risk the current stack for 2× or bust. Strategy talk usually means one of three things:

1. **How many doubles** you will attempt before you must cash or accept zero.
2. **Whether the underlying step is fair** (p = 50% on a true 50/50) or short (p < 50%).
3. **Whether you precommit** or renegotiate after each win — renegotiation is where discipline dies.

There is no pattern that makes 2×-or-bust positive if 2p < 1. The product overview lives on [double or nothing game](/guides/double-or-nothing-game). This page is the streak algebra and stop rules.

[Martingale strategy](/guides/martingale-strategy) doubles after **losses**. Double-or-nothing presses after **wins**. Both increase variance; neither removes [house edge](/guides/house-edge).

Adults 18+ only. Topic hub: [games and odds](/guides/topics/games-and-odds).`,
    },
    {
      id: "one-step",
      title: "One step: the p that every strategy inherits",
      body: `Write win probability p and assume total pay is 2× stake on a win (even money on the stack). Expected value per dollar at risk this step:

EV = p × 2 = 2p

Edge = 1 − 2p.

| Step type | p | 2p | Edge |
| --- | --- | --- | --- |
| Fair coin | 50% | 1.00 | 0% |
| 1% short 2× (crash-style) | 49.5% | 0.99 | 1% |
| Even money at 49% | 49% | 0.98 | 2% |
| [Coin flip odds](/guides/coin-flip-odds) at 50% fee-free PvP | 50% | 1.00 | 0% transfer |

If the “double” uses red on a single-zero wheel, p ≈ 18/37 — not 50%. Compute p from the actual prop, not from the word “double.”

[Expected value gambling](/guides/expected-value-gambling) is the dollar view: on a $10 stack, EV after one step is $10 × 2p.`,
    },
    {
      id: "streak",
      title: "n doubles: compounding edge and compounding variance",
      body: `Precommit to n all-in doubles. You cash only at 2^n × starting stake or lose everything trying.

If each step is independent with the same p and 2× pay, expected fraction of the **original** dollar after n steps is (2p)^n — because wins double the stack and losses zero it.

| n | Cash at | Fair coin (2p)^n | p = 49% (0.98^n) | p = 49.5% (0.99^n) |
| --- | --- | --- | --- | --- |
| 1 | 2× | 1.00 | 0.98 | 0.99 |
| 3 | 8× | 1.00 | 0.941 | 0.970 |
| 5 | 32× | 1.00 | 0.904 | 0.951 |
| 8 | 256× | 1.00 | 0.850 | 0.923 |

Probability of **full** streak (all wins) is p^n. At fair coin and n = 5, that is 1/32 ≈ 3.1%. Most sessions end at zero; the mean is still 1.00 on a fair coin because the rare 32× path pays for the busts.

With p = 49%, the mean after five precommitted doubles is 0.904 of the first stake — about 9.6% expected loss **before** you feel the busts.

[Variance in gambling](/guides/variance-in-gambling) explains why your path is almost always zero while forums show the 32× screenshot.`,
    },
    {
      id: "stop",
      title: "Stop rules: the only strategy lever that matters",
      body: `Once p is fixed below 50%, the only choices that change **expected** cost are:

### Precommitted n

Decide “I will attempt at most k doubles” before the first press. Lower k lowers (2p)^n exponent. There is no k that makes 2p > 1.

### Partial cash-out products

Some games let you take a fraction after each win. That is a different payout table — read it. Early cash reduces variance and usually reduces peak pay.

### Hard session cap

Max loss on the **first** stake, not on the parlay stack. A $5 start that grows to $80 is still one decision chain.

### No mid-streak edits

“I’ll stop at 3 unless it feels hot” is not a stop rule. Feelings track variance, not p.

Write: starting stake, max doubles, underlying game (and its p). Stop when any line triggers. Renegotiating after a win is how a 2% step becomes a 20% night.

Compare [gambling budget](/guides/gambling-budget): streak products eat budgets in one button chain.

### Optional stop at 2^k with partial bank

Some UIs let you take the stack after k wins without going to 2^n. That is equivalent to choosing a smaller n. Each time you shorten the ladder, you lower exponent on (2p) and you give up the top multiplier. There is no free lunch: the product’s posted top prize exists to keep you pressing through step four when step three already felt scary.

### Tie-break: same edge, different p visibility

Crash shows the rising multiplier; double buttons hide p behind a card flip. Strategy is harder when p is opaque. If the help screen will not state win rate on the double prop, assume p < 50% and treat the button as a tax on your last win. Declining the double is often the highest-EV click in the whole session — not because you “quit while ahead,” but because you refuse an extra 2p < 1 step on money you already risked to win.`,
    },
    {
      id: "worked",
      title: "Worked example: five doubles at p = 49%",
      body: `Start $20. Underlying step wins 49% at 2×. Precommit to five doubles; cash only at $640 or bust.

- Per-step EV factor 0.98.
- Five steps: 0.98^5 ≈ 0.904 → expected remaining ≈ $18.08 on the **plan**, not on your likely path.
- P(full streak) = 0.49^5 ≈ 2.8%. You bust ~97% of the time on this plan.
- When you bust, you lose $20. When you hit 32×, you win $620. The mean balances; your wallet usually sees the bust.

If the double button appears only after slot wins, you are stacking streak EV on top of slot RTP. The slot was already negative. The double is another 0.98 multiplier on whatever you risk.

Crash at 2× auto cash-out is the same row with animation — see [crash gambling](/guides/crash-gambling). Limbo at 2× target is the instant version.

### Probability of at least one full streak in many attempts

If you restart the five-double plan every time you bust, you are buying many independent trials at $20 each. Expected cost per trial is $20 × (1 − 0.904) ≈ $1.92 at p = 49%, plus you usually lose the whole $20. The mean of “keep restarting until I hit 32×” is not zero — it is worse than one trial because you pay the bust tax repeatedly. That is why “I only need one heater” is a budget plan written in invisible ink.

### Mapping n to human labels

| Precommitted doubles | Cash multiple | Full-streak chance at p=50% |
| --- | --- | --- |
| 2 | 4× | 25% |
| 3 | 8× | 12.5% |
| 4 | 16× | 6.25% |
| 5 | 32× | 3.125% |

Halving p roughly scales the last column by p^n. The cash multiple doubles each step; your chance of seeing it does not.`,
    },
    {
      id: "systems",
      title: "Systems that do not beat double or nothing",
      body: `- **Alternating colours after a win.** Each step still has the same p.
- **Stopping after “near” busts on other players’ screens.** Independence.
- **Kelly sizing on the streak.** [Kelly criterion](/guides/kelly-criterion) needs positive edge. 2p < 1 gives zero Kelly.
- **Using martingale after a busted streak.** You chained two variance engines on the same leak.
- **Believing the widget is “free” after a big slot hit.** Opportunity cost is real money.

Pressing wins feels safer than chasing losses. Mathematically it is the same family: you increase variance while EV compounds downward when p < 50%.

### Slot double buttons after bonus wins

The most expensive version is automatic: you hit a feature, feel rich, and the UI offers double on the **feature prize** with the same short p as always. You already paid slot RTP to win that prize. The double is a second lease on the same dollar at 2p. Declining preserves the win; accepting is a voluntary side bet you did not have to take. If your “strategy” is always accept, write (2p)^n on the feature amount and see if the expected gift is still exciting.

### Table games and “double for even money”

Some blackjack side flows offer even money on insurance-like doubles. That is not the same product as 2× stack parlay, but the streak instinct rhymes. Read the exact pay and p. [Blackjack basic strategy](/guides/blackjack-basic-strategy) covers main-game edges; side doubles are separate rows.`,
    },
    {
      id: "fair-alternatives",
      title: "Where to get a single fair 50/50 instead",
      body: `PVPspinArena does not ship a double-or-nothing ladder. [Coinflip](/coinflip) is one pot-based 50/50 — not a parlay widget. [Roulette](/roulette) is a counted wheel with a published colour edge, not even money.

If you want exactly one fair coin step, use a fee-free 50/50 against another player, not a house double button with hidden p.

[How it works](/how-it-works) explains pot share on Jackpot and Coinflip. [Fairness](/fairness) lets you replay committed outcomes on Roulette.

Double-or-nothing strategy elsewhere still reduces to: know p, cap n, write the stop, accept that most streaks are zero.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Double or nothing strategy is streak arithmetic plus discipline. Each step returns 2p on average; n precommitted doubles multiply to (2p)^n. Small per-step edges compound fast. Variance means you almost always bust while the mean tells a gentler story.

Do not trust popup doubles after wins, mid-streak renegotiation, or martingale recovery. Precommit n, verify p, cap the first stake, and stop.

PVPspinArena offers Jackpot, Coinflip and Roulette — no streak ladder. Use this page when another product flashes 2× or bust, and treat the stop rule as the only lever that is not folklore.

Write the plan on paper: “Max 2 doubles on crash 2×, $5 start, stop.” When the third win tempts you, the paper beats the button. Streak products are designed so the third and fourth wins feel “almost there.” Almost there is still (2p)^3 or (2p)^4 of your original EV — lower than you think if p is 49%. The screenshot is step five; your path is usually step two or bust.

Telegram “double signals” sell the same product with extra steps. The signal does not know p on your widget. If the signal worked, the seller would press privately, not sell subscriptions. Your stop rule and p check beat any external streak map. One declined double is often the best click in the session.`,
    },
  ],
  faqs: [
    {
      q: "What is the best double or nothing strategy?",
      a: "Know the win probability p on each step, precommit a maximum number of doubles, cap the starting stake, and stop on that plan. No pattern beats 2p below 1.",
    },
    {
      q: "How does edge compound on doubles?",
      a: "Each step multiplies expected value by 2p. Five steps at p = 49% leave about 0.98^5 ≈ 90.4% of the starting EV on a precommitted all-in chain.",
    },
    {
      q: "Is double or nothing the same as martingale?",
      a: "No. Double-or-nothing presses wins at 2× or bust. Martingale raises stake after losses. Both fail to flip negative EV.",
    },
    {
      q: "Can I use double or nothing on crash or limbo?",
      a: "A 2× target on a crash-style curve is one step with p ≈ (1 − edge)/2. Chaining steps manually is the same streak product with the same compounding.",
    },
    {
      q: "Does PVPspinArena have double or nothing?",
      a: "No. It offers Jackpot, Coinflip and Roulette only. Coinflip is a single 50/50, not a built-in parlay ladder.",
    },
  ],
  sources: [
    { label: "Wikipedia: Gambler's ruin", url: "https://en.wikipedia.org/wiki/Gambler%27s_ruin" },
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
  ],
  related: ["double-or-nothing-game", "house-edge", "martingale-strategy", "coin-flip-odds"],
  updated: "2026-09-26",
};
