import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-to-calculate-house-edge",
  cluster: "Games & odds",
  keyword: "how to calculate house edge",
  secondary: [
    "house edge formula",
    "calculate rtp from paytable",
    "expected value house edge",
    "house edge examples",
  ],
  title: "How to Calculate House Edge (Worked) | PvP Spin Arena",
  description:
    "Learn the house edge formula and work through coin flip, roulette, blackjack, crash and Limbo examples you can rebuild in a spreadsheet.",
  h1: "How to Calculate House Edge: Worked Examples by Game",
  answer:
    "To calculate house edge, list every outcome, multiply probability by payout including the stake return, sum to get expected return E per dollar wagered, then subtract from 1. House edge equals 1 − E. RTP equals E as a percentage. The same steps work on a roulette paytable, a plinko bucket row, or a crash cash-out curve if you know reach probabilities.",
  facts: [
    "Expected return E = Σ (probability × total return per unit stake).",
    "House edge = 1 − E when stakes are counted in returns; RTP = E × 100%.",
    "Even-money bets with true 50/50 and 2x return have 0% edge; paying 1.98x creates 1% edge.",
    "Survival games use E = P(reach) × cash-out multiplier on a win, zero on bust.",
    "PVPspinArena Roulette colour bets use a 33-slot table you can count; Coinflip at 0% fee has no house edge on the flip itself.",
  ],
  sections: [
    {
      id: "steps",
      title: "Step-by-step: from paytable to edge",
      body: `Use this recipe on any discrete game. Continuous crash curves use the same idea with integrals; most crypto products give you discrete multipliers or survival steps.

### Steps

1. **Define one unit stake** (usually $1).
2. **List outcomes** i with probability p_i (must sum to 1).
3. **Write total return r_i** on outcome i, including stake back on wins. A win at 2x means r_i = 2.
4. **Compute E = Σ p_i r_i** — expected dollars back per dollar wagered.
5. **House edge = 1 − E.** **RTP = E** (as decimal or percent).

Check: losing everything is r = 0; push is r = 1; even-money win is r = 2.

Our [house edge](/guides/house-edge) guide defines the terms; this page is the worksheet. For automated plinko rows, pair this with [rtp calculator](/guides/rtp-calculator) once you trust your probabilities.

### Why the sum works

Linearity of expectation lets you price weird rules without simulating millions of spins. Each outcome contributes its slice; weights must sum to 1. If you simulate instead, [regression to the mean](/guides/regression-to-the-mean-gambling) still lands on E, but hand calculation catches rule bugs before you deposit.

### Continuous crash as a limit case

If multiplier m runs from 1 to ∞ with density f(m), E = ∫ P(reach m) × m dm over the cash-out policy. Discrete UI tables are Riemann sums of the same object. You rarely need calculus; you need one row at your chosen cash-out.`,
    },
    {
      id: "even-money",
      title: "Worked example: even-money coin",
      body: `Fair coin, $1 stake, pay 2x on win, 0 on loss.

- p_win = 0.5, r_win = 2
- p_loss = 0.5, r_loss = 0
- E = 0.5×2 + 0.5×0 = 1
- Edge = 1 − 1 = 0%

Casino pays 1.98x on win instead:

- E = 0.5×1.98 = 0.99
- Edge = 0.01 = **1%**

That is the entire [coin flip odds](/guides/coin-flip-odds) story: edge lives in the short pay, not in “patterns”.

If the coin were biased 52% win and still paid 2x, E = 1.04 and the player had 4% edge — casinos fix both p and pay so E stays below 1. Your job is to measure whether they succeeded on the game in front of you.

If ties lose on a 47% win ticket, include tie outcomes in the sum. Missing outcomes is the most common hand-calculation bug.`,
    },
    {
      id: "roulette",
      title: "Worked example: roulette colour on 33 slots",
      body: `PVPspinArena uses a 33-slot wheel: 7 red, 7 black, 1 green zero (numbers illustrative — count the published table).

Suppose green pays 0x, red and black pay 2x on a winning colour bet, stake included in the 2x.

- P(win colour) = 16/33
- P(green) = 1/33
- P(lose other colour) = 16/33

For a $1 red bet:

- Win red: r = 2 with p = 16/33
- Green: r = 0 with p = 1/33
- Black: r = 0 with p = 16/33

E = (16/33)×2 = 32/33 ≈ 0.9697

Edge = 1 − 32/33 ≈ **3.03%** before the win fee

Open [roulette](/roulette) and [fairness](/fairness) to reconcile counts with live rules. European 37-pocket single-zero even money gives E = 36/37 ≈ 0.973, edge ≈ 2.7% — same method, different p_i.

This is how to calculate house edge without simulators: arithmetic on the paytable.`,
    },
    {
      id: "survival",
      title: "Survival curve: crash and tower cash-out",
      body: `One-shot crash or tower cash-out at multiplier m:

- Win with probability p, return m (stake included per product wording — confirm).
- Lose with probability 1 − p, return 0.

E = p × m.

Edge = 1 − p×m.

Clean 1% crash: p ≈ 0.99/m, so E ≈ 0.99.

At m=2, p≈0.495, E≈0.99. At m=10, p≈0.099, E≈0.99. The target moves; the product does not on a honest curve. That invariance is why crash “strategy” is variance selection.

### Numeric tower rung

Reach rung 5 with P = 0.59, posted pay 1.68x:

E = 0.59 × 1.68 = 0.9912 → edge ≈ 0.88%

If the UI shows 2.10x at the same reach probability 0.59:

E = 1.239 → would imply player edge; either p is wrong or pay includes bonus text. Recompute p from per-rung survival.

Link [expected value gambling](/guides/expected-value-gambling) when converting edge to dollars over many trials.`,
    },
    {
      id: "plinko",
      title: "Discrete buckets: plinko-style sum",
      body: `List buckets k with probability P_k and multiplier m_k (return per $1).

E = Σ P_k m_k

Example toy 3-bucket board:

| Bucket | P | m | Contribution |
| --- | --- | --- | --- |
| Left | 0.25 | 1.6 | 0.40 |
| Centre | 0.50 | 0.8 | 0.40 |
| Right | 0.25 | 1.6 | 0.40 |

E = 1.20 → **player advantage** — teaching only; real boards sit below 1.

Real 8-row plinko uses binomial P_k = C(n,k)/2^n. [Plinko odds](/guides/plinko-odds) lists path counts; you attach operator multipliers and finish the sum.

Hand example with teaching multipliers on 8 rows, low-risk symmetric pays (5.6, 2.1, 1.1, 1.0, 0.5 centre):

Compute each binomial term, multiply by m, add. If E = 0.99, edge = 1%. Spreadsheets help; the logic is still primary school arithmetic once P_k is known.

If probabilities are hidden, you cannot calculate house edge — only trust a disclosed RTP or estimate from a large sample (noisy).

### Two-outcome shortcut

Many mini-games collapse to win/lose with average pay b on win:

E = p_win × b

Edge = 1 − p_win × b

Memorize that skin. Hi-lo even-money, crash at fixed m, and tower at fixed rung all plug in here after you compute p_win once.`,
    },
    {
      id: "mistakes",
      title: "Common mistakes when you calculate house edge",
      body: `### Confusing profit with return

A 2x pay is return 2, not profit 1. Using profit in the sum without adding stake back doubles errors.

### Forgetting ties and pushes

Hi-lo ties that lose must enter as outcomes. Pushes are r = 1.

### Using hit rate without pay

“40% win rate” means nothing until multiplied by average pay on wins.

### Ignoring max profit

Truncated tail pays lower E on extreme targets. Recompute with effective pay.

### Applying edge to deposit instead of wagered

1% on $500 wagered is $5 expected cost, not 1% of whatever is left in the wallet.

See [rtp explained](/guides/rtp-explained) for vocabulary alignment across providers.

### American roulette split example

$1 on a single number pays 35:1 profit plus stake → return 36 on win.

p = 1/38 on American wheel.

E = (1/38)×36 = 36/38 ≈ 0.947 → edge ≈ 5.26%

Even-money red/black uses the same wheel with different outcome partition — always write the full outcome list, not “I know roulette is 5.26%” without checking zero/double-zero count.

### Bonus step-through

Deposit $100, play through 30× on slots at 96% RTP naive:

Expected loss on $3,000 wagered ≈ 4% × $3,000 = $120 if edge were 4% — often worse than stated slot RTP if you mix games. Bonus math is house edge applied to forced volume. Calculate edge on the game terms lock, not on your favourite low-edge table you hoped to play.

### Variance note

House edge is an average. A 1% edge slot can still eat $100 in twenty spins or return $300 — the calculation describes the centre, not your tonight. Use edge for game choice; use [variance in gambling](/guides/variance-in-gambling) for stake size.`,
    },
    {
      id: "tools",
      title: "When to hand-calc versus use a widget",
      body: `Hand calculation builds intuition. Use it on roulette pockets, small plinko boards, and single cash-out points on crash.

Use spreadsheet or [rtp calculator](/guides/rtp-calculator) when:

- Buckets exceed a dozen rows.
- Rules mix pushes, partial losses, and side bets.
- You sweep many crash targets.

Provably fair verification confirms outcomes match committed seeds; it does not replace the pay sum. [Provably fair calculator](/guides/provably-fair-calculator) helps recompute draws, not RTP unless you also have pays. The pricing shelf for this worksheet is [Games and odds](/guides/topics/games-and-odds).

Walk through [provably fair guides](/guides/topics/provably-fair) docs when a game hides P_i but shows hashed seeds — fairness and pricing are separate checkpoints. A verifiably fair crash at 1.5% edge is still −EV; it is just honest −EV.

On PVPspinArena, derive Roulette from the visible slot table; treat Coinflip as E ≈ 1 before fees because the pot is symmetric. That contrast shows why “how to calculate house edge” is really “how to calculate E on the product in front of you”.

### Worked hi-lo tie lose

Up-card 8, ace high, higher-or-lower at even money, ties lose.

Wins: 24 ranks beat, 24 ranks lower, 3 eights tie.

E on $1 = (24/51)×2 = 48/51 ≈ 0.941 → edge ≈ 5.88%

If ties push instead, wins still pay 2 but ties return 1:

E = (24/51)×2 + (3/51)×1 = 51/51 = 1 → 0% edge before any other rule — rare in casino UI, common in teaching examples.

The tie row is why you must read felt text before you calculate house edge on card products.

### Jackpot-style PvP fee (optional)

Two players, pot $100, winner take all, house fee f on the pot. Winner return on $50 stake ≈ (100−f)/50 if fee taken from pot; definitions vary — read terms. Symmetric 50/50 with f=0 gives E=1 for each side before skill. Adding 5% fee pulls E to 0.95 for each dollar of contest entry. That is how to calculate house edge when there is no paytable, only a rake.`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `How to calculate house edge: list outcomes, multiply probability by total return, sum to E, subtract from 1. RTP is E. Even-money coins, roulette pockets, plinko buckets, and crash cash-outs are the same recipe with different p and r.

Check ties, pushes, max profit, and whether pay includes stake. Compare E to published RTP; mismatch means hidden rules or wrong probabilities.

PVPspinArena Roulette is countable on 33 slots; PvP Coinflip has no house curve on the flip itself. Use this worksheet anywhere else a paytable or cash-out curve is shown — and refuse strategy claims that skip the sum.

Practice once per week on a new product: copy the pay row from the info panel, estimate p from rules or binomial counts, finish E in five minutes. When streamers skip that step, you keep your wallet — how to calculate house edge is ultimately how to decline marketing that cannot show arithmetic.

Mines teaching row: five mines, two safes, pay 1.35x → P ≈ 0.633, E ≈ 0.855, edge ≈ 14.5%. Same five-step recipe every time.

When two sources disagree on RTP, your hand calculation is the tie-breaker. Trust arithmetic you can show, not icons on a banner.

Keep a pocket formula card: E equals sum of p times r; edge equals one minus E. Every new mini-game is just new rows on the card. How to calculate house edge is a habit, not a one-off homework problem you skip when the UI looks polished or too familiar.

Once you have the percentage, the [law of large numbers](/guides/law-of-large-numbers-gambling) is what turns it into a session cost.`,
    },
  ],
  faqs: [
    {
      q: "What is the formula for house edge?",
      a: "House edge = 1 − E, where E is expected return per unit wagered, the sum of probability times total return for each outcome.",
    },
    {
      q: "How do I convert house edge to RTP?",
      a: "RTP equals E as a percentage. A 1% house edge means 99% RTP.",
    },
    {
      q: "How do I calculate house edge on crash?",
      a: "If cash-out at m wins with probability p and pays m, E = p×m and edge = 1 − p×m. Use the game’s stated reach formula for p.",
    },
    {
      q: "Can house edge be negative?",
      a: "If E exceeds 1, the player has positive expected value. Casinos avoid that; find a math error or a promotion with wagering constraints.",
    },
    {
      q: "Does PVPspinArena publish edge I can verify?",
      a: "Roulette uses a fixed slot table you can count. Coinflip and Jackpot are PvP with default 0% fee on the pot, not a house paytable on the flip.",
    },
  ],
  sources: [
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    {
      label: "Wizard of Odds: house edge of casino games",
      url: "https://wizardofodds.com/gambling/house-edge/",
    },
  ],
  related: [
    "house-edge",
    "rtp-explained",
    "expected-value-gambling",
    "rtp-calculator",
    "law-of-large-numbers-gambling",
    "regression-to-the-mean-gambling",
  ],
  updated: "2026-09-26",
};
