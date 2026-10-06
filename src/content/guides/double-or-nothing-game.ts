import type { Guide } from "./types";

export const guide: Guide = {
  slug: "double-or-nothing-game",
  cluster: "Casino games",
  keyword: "double or nothing gambling",
  secondary: ["double or nothing", "double or nothing game", "2x or bust", "streak gambling"],
  title: "Double or Nothing Gambling: Streaks and Edge",
  description:
    "Double or nothing gambling as a streak product: each 2x-or-bust step, how a small edge compounds, and why a planned stop is the only lever.",
  h1: "Double or nothing gambling: streak products and the real cost",
  answer:
    "Double or nothing gambling is a streak button: win, and the stake becomes 2× (or you are offered that 2×); lose, and the line is zero. One fair 50/50 step has 100% RTP. A house step that wins 49% at even money has 98% RTP — and five planned doubles leave you with 0.98^5 ≈ 90% of the starting dollar in expectation if you precommit. PVPspinArena does not offer a double-or-nothing original; Coinflip is a single 50/50, not a streak ladder.",
  facts: [
    "A fair 50/50 that pays 2x has 0% edge on that single step.",
    "If each step wins with probability p and pays 2x, EV per step is 2p; edge is 1 − 2p.",
    "n precommitted doubles multiply those factors: expected remaining ≈ (2p)^n of the first stake’s EV path.",
    "Variance explodes: the typical path is a bust; the mean is held up by rare full streaks.",
    "PVPspinArena does not offer double or nothing gambling as a product; Jackpot, Coinflip and Roulette are the live games.",
  ],
  sections: [
    {
      id: "what",
      title: "What the button is buying",
      body: `Double or nothing gambling is not a strategy you apply to roulette after the fact. It is often a **product**: a widget that offers 2× or bust, again and again, on the same stack.

### Three shapes

1. **Single offer after a win.** A slot or table pops “double?” You risk the prize on a 50/50 (or worse).
2. **Dedicated streak game.** Click to climb 2x, 4x, 8x… until you cash out or die.
3. **Self-imposed streak.** You take a 50/50 (or a colour) and parlay the whole stack. That is a plan, not a new edge.

(1) and (2) are house-banked originals. (3) inherits whatever edge the underlying bet already had. [Martingale](/guides/martingale-strategy) is the cousin that *increases* after a loss; double-or-nothing *presses* after a win. Neither flips a negative EV.

This page is in the [casino games topic](/guides/topics/casino-games). Adults 18+. No casino rankings.

A useful pretest: would you take this same 2x-or-bust from a cold cashier, with no prior win in the last ten minutes? If the answer is no, the optional popup is using the high of the last spin as bait. The p did not improve because you just hit a bonus. The stake only got larger and louder. Fair coins stay fair. House colours stay short. Mood is not a third input in the EV product. If you need the pretest to be a rule, write it down before you open the lobby.`,
    },
    {
      id: "table",
      title: "One step and n steps: an odds table",
      body: `| Underlying step | p(win) | Pay if win | EV per $1 this step | After 5 precommitted steps (cash only at 32x) |
| --- | --- | --- | --- | --- |
| Fair coin | 50% | 2x | 1.00 | 1.00; P(full streak) = 1/32 |
| Coinflip, 0% fee | 50% | 2x | 1.00 | 1.00 (still a transfer between paths) |
| Slider / crash 2x at 1% | 49.5% | 2x | 0.99 | 0.99^5 ≈ 0.951 |
| Even money, p = 49% | 49% | 2x | 0.98 | 0.98^5 ≈ 0.904 |
| European red | 18/37 ≈ 48.65% | 2x | 0.973 | 0.973^5 ≈ 0.872 |
| PVPspinArena Purple | 16/33 ≈ 48.48% | 2x | 0.970 | 0.970^5 ≈ 0.859 |
| Biased “double” p = 45% | 45% | 2x | 0.90 | 0.90^5 ≈ 0.590 |

The last column is the expected return of a **precommitted** “I will only cash at 32× or bust” plan, as a fraction of the first dollar. You do not get five independent $1 costs. You risk the growing stack. The algebra is the same product.

[Crash gambling](/guides/crash-gambling) at a 2x target is row three in animation form. [House edge](/guides/house-edge) is 1 − 2p when the pay is even money. If the double button uses a card colour or a die, compute p first — do not assume 50%.`,
    },
    {
      id: "worked",
      title: "Worked example: $20, five doubles, European red",
      body: `You start with $20. You precommit to five even-money reds on a single-zero wheel, parlaying the whole stack, cashing only at $640 or zero.

- p = 18/37 per step.
- P(survive 5) = (18/37)^5 ≈ 0.0272 (about 1 in 37).
- Terminal win = $20 × 32 = $640.
- Expected return = 0.0272 × $640 ≈ **$17.41**.
- Expected cost ≈ **$2.59** on the original $20 (about 13% of the start), even though each single red is only a 2.70% keep.

The 2.70% applied five times to a *growing* stake is why the session percent looks worse than one spin. You were not charged 2.70% of $20 five times as if you had flat-bet. You put $20, then $40, then $80… on the paths that were still alive.

**Fair coin, same plan:** P(streak) = 1/32, terminal $640, EV = $20. Cost $0. You still bust 31 times in 32. The mean is not the median. That is the whole streak product.

If the casino’s double button is a hidden 45% (red/black card with a joker lose, or a painted wheel), EV per step is 0.90. Five steps: 0.90^5 = 0.590. Same $20 plan, expected return about **$11.80**. Ask for p.`,
    },
    {
      id: "traps",
      title: "Optional doubles, card colours and “one more”",
      body: `**Optional after a slot win.** The bonus you already won is now the stake. A fair 50/50 does not steal EV. A 45% colour does. Many “red or black” cards include a joker or dealer colour that takes the pot. Read the third outcome.

**Dedicated 8-step tower of doubles.** This is [tower game gambling](/guides/tower-game-casino) with p ≈ 0.5 and r = 2. Invert each rung. If rung 6 pays 32x but P(reach) is 0.49^6 ≈ 1.4%, fair is about 72x. A 32x posted on that p is a massacre.

**Stopping rules.** The only EV-preserving move on a fair coin is to stop whenever you like; every prefix has EV 1. On a negative step, **fewer steps** cost less. “I feel lucky so I continue” is how 0.98 becomes 0.90.

Do not confuse this with a 0% fee [Coinflip](/coinflip). One flip is one step. Re-queuing a new flip with a new stake is [flat betting](/guides/flat-betting). Letting the pot ride is the streak plan.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer a double-or-nothing original",
      body: `There is no 2x-or-bust ladder here. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/) — pot share, not a parlay button.
- [Coinflip](/coinflip) — one 50/50 at a time, default 0% fee.
- [Roulette](/roulette) — 33 slots; Purple is 48.48%, not 50%. Parlaying Purple is the 0.970 row, not a fair coin.
- [online casino games](/guides/online-casino-games) — where streak originals sit.

If you want a single fair 50/50, use Coinflip and cash out. If you parlay, write (2p)^n before you click the fifth time.

Parlaying this site’s Purple five times is not a fair-coin ladder. p = 16/33 ≈ 0.4848, 2p ≈ 0.970. A $30 start that cashes only at 32× has expected return (0.970)^5 × $30 ≈ $25.70. Hit rate (16/33)^5 ≈ 2.68%; terminal $960; 0.0268 × 960 ≈ $25.73. Same number both ways. You bust about 98 times in 100. Roulette Purple is not a coin. Write the powers slowly before you click the fifth colour.`,
    },
    {
      id: "plan",
      title: "The only numbers that matter before you press",
      body: `1. What is p on this button? 50%, 49.5%, 18/37, 16/33, or hidden?
2. Is there a third “lose” symbol?
3. Are you optional-cashing each step, or precommitted to n?
4. What is (2p)^n on that plan?
5. Can you tolerate n busts in a row? Because that is the usual path.

If you cannot answer 1, you do not have double-or-nothing. You have a mystery wheel. Walk.

A $50 start and a 49% button, three planned doubles: (0.98)^3 ≈ 0.941, expected about $47, P(streak) = 0.49^3 ≈ 11.8%. That is a cheap-looking keep that still ends at zero about seven times in eight.

If you instead flat-bet $50 three times at 49% even money, EV per bet is $49, three independent expected costs of $1, total expected $147 back from $150. Same three steps, opposite stack. The ladder concentrates the keep onto survivors. Flat betting spends the keep three times on the original stake. Neither beats 2p < 1. Choose the path for the variance you can stand, then stop.`,
    },
    {
      id: "optional",
      title: "Optional doubles after a win versus a planned ladder",
      body: `The popup after a slot hit is a different decision from a dedicated 8-step ladder, even when both say “double.”

### Optional, once

You already have $80 from a spin. The game offers red/black at even money. If p = 50% and there is no joker, EV of taking it is still $80. Taking it changes variance, not expectation. If p = 18/37 (they used a mini roulette), EV becomes $80 × 0.973 = $77.84. If a joker loses (3 outcomes, you pick one of two colours), p = 2/3? No — 18 red, 18 black, 1 joker in a 37-card shoe is roulette again. A 52-card colour with two jokers: p(red) = 26/54 if jokers lose and you picked red? 26 red, 26 black, 2 jokers = 54; p = 26/54 ≈ 48.1%, EV = 0.963. Always count the lose symbol.

### Planned ladder

You start from a fresh $20 and intend to click until 16x. That is four steps. Write (2p)^4 and p^4. On a 49% button: 0.98^4 ≈ 0.922, P(hit) ≈ 5.8%. Most paths are zero. The optional popup at least started from money you had already “won” on another paytable. The ladder starts from cash.

### Stopping in the middle

On a negative step, cashing at 4x instead of 16x is fewer applications of 2p < 1. That is the only EV improvement available. On a fair coin, every stop has EV 1; stop when the entertainment is enough.

### Worked joker colour

$60 optional double, 26/54 win, 2x. EV = $60 × 52/54 ≈ $57.78. Expected cost of clicking **Yes** about $2.22. The slot spin that produced the $60 already charged its own RTP. This click is a second product. Decline unless you want that specific extra variance at that keep.

A dedicated ladder of six 49% doubles from $25: (0.98)^6 ≈ 0.886, expected about $22.15, P(full) ≈ 1.4%, terminal $1,600. You will tell yourself the $1,600 is “close” after four wins ($400). That $400 is now the stake on two more 49% coins. The mean does not care that it came from a streak.

[Coinflip](/coinflip) remains the clean one-step 50/50 on this site. Re-buy a new flip if you want another step with a fresh stake. Letting a mental stack ride on Purple is the 0.970 row, not a fair coin.`,
    },
    {
      id: "limits",
      title: "Streaks, chasing and when to refuse the offer",
      body: `The double button appears when you are already excited. That is the design. If you cannot take a win without pressing, or you are restarting the ladder to get even, stop.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page lists on-site tools.

This site is 18+. Knowing that (2p)^n shrinks is not a reason to start a five-step plan.

Write n before the first click. Two doubles on a 49% button from $40: (0.98)^2 × 40 ≈ $38.40 expected, hit rate about 24%, terminal $160. Four doubles: (0.98)^4 × 40 ≈ $36.90, hit rate about 5.8%, terminal $640. The extra two clicks did not “use a hot streak.” They applied 0.98 two more times to a stack you already liked. Optional slot doubles get the same treatment: one sentence for p, one for the joker, then Yes or No. No is a complete decision. If you cannot take No after a win, you are not pricing a button. You are feeding a streak product that was built for that moment. Close it. Coinflip will still be a single 50/50 tomorrow.

Pressing again is a second bet at the same edge. [Double or nothing strategy](/guides/double-or-nothing-strategy) names the systems. It does not make the press free.`,
    },
  ],
  faqs: [
    {
      q: "What is double or nothing gambling?",
      a: "A 2x-or-bust step, once or in a streak. Fair 50/50 steps keep EV. House steps with p under 50% shrink EV each press.",
    },
    {
      q: "Does double or nothing beat the house?",
      a: "No. It concentrates the same (or worse) edge onto a growing stack. Rare full streaks pay the mean; most paths bust.",
    },
    {
      q: "Is it the same as Martingale?",
      a: "Opposite direction. Martingale raises after a loss. Double-or-nothing presses after a win. Both can ruin a session; neither creates an edge.",
    },
    {
      q: "How do I price five doubles?",
      a: "Write p, confirm the pay is 2x, then (2p)^5 is the expected fraction of the start if you only cash at 32x. Also write p^5 as the hit rate.",
    },
    {
      q: "Does PVPspinArena have a double or nothing game?",
      a: "No. Coinflip is a single 50/50. There is no streak ladder. Roulette Purple is not a fair coin if you parlay it.",
    },
    {
      q: "Is the slot “double” feature safe?",
      a: "Only if p and the third symbols are disclosed and 2p is near 1. A joker-lose colour is a high-edge extra, not a courtesy.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Martingale (betting system)",
      url: "https://en.wikipedia.org/wiki/Martingale_(betting_system)",
    },
    { label: "Wikipedia: Expected value", url: "https://en.wikipedia.org/wiki/Expected_value" },
    { label: "Wizard of Odds: house edge", url: "https://wizardofodds.com/gambling/house-edge/" },
  ],
  related: [
    "crash-gambling",
    "house-edge",
    "martingale-strategy",
    "coin-flip-odds",
    "online-casino-games",
    "double-or-nothing-strategy",
    "flat-betting",
  ],
  updated: "2026-09-26",
};
