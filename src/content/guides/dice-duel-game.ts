import type { Guide } from "./types";

export const guide: Guide = {
  slug: "dice-duel-game",
  cluster: "Casino games",
  keyword: "dice duel",
  secondary: ["dice war casino", "dice duel odds", "higher dice", "two dice showdown"],
  title: "Dice Duel Guide: Two-Cube Rules, Odds and Edge",
  description:
    "How a dice duel works: two totals compared, what ties do to the price, and why a “higher roll wins” button is not a fair 50/50.",
  h1: "Dice duel: two-cube rules, ties and the house take",
  answer:
    "A dice duel is a showdown of two rolls — usually two dice each, sometimes one. Higher total wins. If ties push and the winner is paid even money, the game is fair before any fee. If ties lose, or the house takes ties, the keep equals the tie rate (about 11.3% for 2d6 vs 2d6). PVPspinArena does not offer a dice duel; Jackpot, Coinflip and Roulette are the live games.",
  facts: [
    "Two independent 2d6 totals tie in 146 of 1,296 ordered outcomes, about 11.27%.",
    "If ties push and winners take 2x, expected return is 100% before a commission.",
    "If ties lose (or the house wins ties), the house edge is about 11.27% on 2d6 versus 2d6.",
    "One die versus one die ties 1/6 of the time; ties-lose then keeps 16.67%.",
    "PVPspinArena does not offer dice duel; the live games are Jackpot, Coinflip and Roulette.",
  ],
  sections: [
    {
      id: "what",
      title: "What a dice duel is buying",
      body: `A dice duel is not craps and it is not a roll-under slider. Two sides roll. Higher sum (or higher face) wins. You might play versus the house or versus another player with the site as banker.

### The usual loop

1. Stake.
2. You roll n dice; the other side rolls n dice (n is usually 1 or 2).
3. Compare totals.
4. Higher wins even money, or a posted multiple. Ties follow a posted rule.

The entire price is **the tie rule plus the pay**. The cubes can be fair and the button still expensive. The combination table lives in [dice roll probability](/guides/dice-roll-probability). This page is the showdown. It sits in the [casino games topic](/guides/topics/casino-games). Adults 18+. No site rankings.

“Dice war,” “higher roll,” “duel 2.0” and “showdown cubes” are marketing. Ask the same three questions every time: how many faces, who rolls when, what does a tie do. If a streamer yells “it’s just 50/50,” they have not written 146/1296. A 50/50 that eats ties is not a 50/50. It is a 44% win button wearing a coin’s reputation. Coinflip on this site does not eat ties because there is no tie. That is the cleaner product, not a “worse” one.`,
    },
    {
      id: "table",
      title: "Ties are the product: an odds table",
      body: `Two distinguishable 2d6 rolls: 36 × 36 = 1,296 equally likely pairs of totals. P(tie) = (1²+2²+3²+4²+5²+6²+5²+4²+3²+2²+1²) / 1296 = 146/1296 ≈ 11.27%. The rest split equally: P(you higher) = P(house higher) = 575/1296 ≈ 44.37%.

| Rule | Win / tie / lose | Typical pay on a win | Expected return | House edge |
| --- | --- | --- | --- | --- |
| 2d6 vs 2d6, ties push | 44.37% / 11.27% / 44.37% | 2x | 1.000 | 0% |
| 2d6 vs 2d6, ties lose | 44.37% / 0 push / 55.63% | 2x | 0.887 | 11.27% |
| 2d6 vs 2d6, ties push, 2% commission on wins | 44.37% win | 1.96x + stake back | ~0.991 | ~0.89% |
| 1d6 vs 1d6, ties push | 15/36 / 6/36 / 15/36 | 2x | 1.000 | 0% |
| 1d6 vs 1d6, ties lose | 15/36 win | 2x | 30/36 = 0.833 | 16.67% |
| 2d6 vs 2d6, you must win by 2+ | Harder | 2x | Well under 1 | Fat |

[Crypto dice](/guides/crypto-dice-game) is a different object: one uniform number, a slider, a built-in 1% (or other) short-pay. Do not quote 11.27% on a roll-under 50.

A PvP duel where both players fund a pot and a 50/50 bit decides — that is [Coinflip](/coinflip), not two totals. If the site actually rolls two 2d6 and pays the higher stake the pot, you still need the tie rule in writing.`,
    },
    {
      id: "worked",
      title: "Worked example: $15, 80 duels, ties lose",
      body: `**2d6, ties lose, even money.** You bet $15, 80 times. Turnover = $1,200. Win chance 575/1296. EV per dollar = 2 × 575/1296 ≈ 0.887. Expected return ≈ $1,065. Expected cost ≈ **$135** (11.27%).

**Same $1,200, ties push.** Wins still 575/1296 of rolls, but 146/1296 return the $15. EV = 1.000. Expected cost $0 before any fee. Variance remains: you can still lose 80 in a row, though that is a 0.44^80 story, not a pricing story.

**1d6, ties lose.** EV = 0.833. Expected cost on $1,200 ≈ **$200**. The “simpler” duel is the worse row if ties are kept.

If the UI says “dice war” and hides the tie line in a footnote, assume the expensive row until proven otherwise. [Craps odds](/guides/craps-odds) use the same 36 pairs for a sequence; they are not a duel. Do not import pass-line 1.41% onto a ties-lose showdown.`,
    },
    {
      id: "variants",
      title: "Variants: extra dice, must-win-by, and instant skins",
      body: `**3d6 versus 3d6.** Tie rate falls (more totals, less collision) but is not zero. If ties lose, the edge equals the new tie rate — compute it if you care; do not guess “about 5%.”

**Must win by 2.** Now some “wins” become losses or pushes. That is a new event. Recompute from the 1,296 grid.

**You roll first, house can match.** If the house wins ties by matching after seeing your total, that is not a simultaneous duel. It is a dealer-advantage rule. Walk unless the pay compensates — it almost never does.

**Provably fair duels.** A hashed pair of rolls can prove the faces. It does not fix a ties-lose pay. Verification is integrity, not EV. The [Fairness](/fairness) page on this site is for committed PvP and wheel results, not a third-party duel.

**House-banked versus PvP.** If both players put $15 in a pot and the higher 2d6 takes it, ties should split or reroll. If the site eats ties, the players are funding the house together.`,
    },
    {
      id: "not-here",
      title: "PVPspinArena does not offer a dice duel",
      body: `There is no two-cube showdown here. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/) — pot share is chance.
- [Coinflip](/coinflip) — a single 50/50 bit, default 0% fee, no tie-eat.
- [Roulette](/roulette) — 33 slots, about 7.88% on Purple or Silver and about 59.70% on Green after the 5% win fee.
- [online casino games](/guides/online-casino-games) — where a duel tile usually sits: instant original.

If you want a 50/50 that does not silently keep ties, use Coinflip or a push-on-tie duel you have read. If the button only says “higher wins,” ask what happens on 8–8.

A night of 120 ties-lose 2d6 duels at $8 is $960 wagered, expected cost about $108. The same 120 push-on-tie duels at $8 have expected cost $0 before a fee, with a lot of 8–8 chips coming back. The same 120 Coinflips at 0% fee are a cleaner 50/50 without a 11% collision tax. If the studio adds a “sudden death” on ties that is a one-die ties-lose, that appendix is a 16.67% game sitting on top of a fair duel. Price the appendix separately or refuse it.`,
    },
    {
      id: "read",
      title: "A 30-second read before you roll",
      body: `1. How many dice per side?
2. Simultaneous, or does someone roll second?
3. Ties: push, reroll, house wins, or you lose?
4. Pay: even money, or a multiple that already includes an edge?
5. Fee on top?

If you cannot answer 3, you do not know the price. Write P(win) × r + P(push) × 1. If that is less than 1, you have found the keep.

Do not “warm up” with one-die ties-lose because it looks faster. That row is 16.67% — American-roulette territory on a worse story.

Write the 6×6 grid once if the duel is one die each. Thirty-six pairs: six ties on the diagonal, fifteen wins, fifteen losses. If ties push, EV = 1. If ties lose, EV = 30/36. That grid fits on a napkin. A UI that will not confirm the diagonal is hiding the only interesting rule. Instant skins that show exploding cubes and a 1.98x “win” on higher-or-tie are a slider in a costume: 21/36 ≈ 58.3% at 1.98x is EV ≈ 1.155 — player edge — which is why they do not actually pay that. They pay higher-only at 1.98x: 15/36 × 1.98 = 0.825, edge 17.5%. Read whether tie is in the win set.`,
    },
    {
      id: "grid",
      title: "Walking the 1,296 grid so the tie rate is not a rumour",
      body: `People accept “about 11% ties” until they lose three 8–8s and decide the generator is broken. Count it.

### Why 146 ties

Two-dice totals 2 through 12 have 1,2,3,4,5,6,5,4,3,2,1 ways. Two independent totals tie when both show the same k. Ways = 1²+2²+…+6²+…+1² = 1+4+9+16+25+36+25+16+9+4+1 = 146. Over 36×36 = 1,296. 146/1296 = 73/648 ≈ 11.27%.

P(you win) = (1296 − 146) / 2 / 1296 = 575/1296. That 575–575–146 split is the whole duel.

### House rolls second

If you roll 9 (4 ways) and the house then rolls, they win on 10–12 (6+5+3+1 wait: 10 has 3, 11 has 2, 12 has 1 → 6 ways), tie on 9 (4 ways), lose on 2–8. If ties then go to the house, every tie in that conditional is a loss. Averaging over your total, the house edge is larger than 11.27% because they play with information. Demand simultaneous rolls or a push-on-tie that does not peek.

### Commission on a fair push game

A “fair” 2d6 duel that takes 5% of pots on wins: you win 44.37% of the time and receive 1.95× stake plus the leftover wording — if they pay 0.95 profit, EV = 0.4437 × 1.95 + 0.1127 × 1 ≈ 0.978. Edge about 2.2% depending on whether the 5% is on the pot or the profit. Still far kinder than ties-lose. Still not a 0% [Coinflip](/coinflip).

### Worked peek rule

Suppose 20% of duels the house may reroll a losing total once. That is a second draw on the 44.37% of rolls they lost. They convert some losses into ties or wins. Even a modest reroll on 6-or-worse is a large extra keep. If the help file mentions “house may roll again,” treat it as a different, worse game.

Eighty $10 ties-lose duels: expected cost about $90. Eighty $10 push-on-tie duels: expected cost $0 before fees, with a bumpy path. Eighty $10 Coinflips at 0% fee: expected cost $0, 50/50 each time, no 11% tie tax. The word “dice” does not pick the row. The tie sentence does.

Sic bo and craps propositions use three dice or one 36-pair table with short pays. They are not duels. Do not import a 16.67% any-seven into a 2d6 showdown, and do not export 11.27% onto a slider.`,
    },
    {
      id: "limits",
      title: "Rematches and knowing when to pocket the cubes",
      body: `Duels are instant and invite instant rematches. If you are doubling the stake after a 7–7 “theft,” the tie rule already did its job.

Use [how to stop gambling](/guides/how-to-stop-gambling) and [gambling self-exclusion](/guides/gambling-self-exclusion). The [responsible gambling](/responsible-gambling) page lists on-site tools.

This site is 18+. Knowing 146/1296 is not a reason to click another duel.

Cap rematches. One hundred $6 ties-lose 2d6 duels is $600 through 11.27%, about $68 expected — an American-roulette-shaped hour with exploding cubes. One hundred push-on-tie duels at $6 have expected keep near $0 before a fee, and you will still see ugly runs of 4–10, 11–5, 9–6. Variance is not a broken generator. If the help file is silent on 8–8, do not start the hundred. If you came here for a 50/50, Coinflip already publishes the fee. A duel that hides the diagonal is asking you to donate the tie rate. Decline the rematch button the same way you would decline a yo hop: it is a new ticket, not a continuation of justice.`,
    },
  ],
  faqs: [
    {
      q: "What is a dice duel?",
      a: "A showdown of two rolls. Higher total wins. The house edge is almost entirely in how ties are paid and whether a commission sits on wins.",
    },
    {
      q: "Is a dice duel a fair 50/50?",
      a: "Only if ties push (or reroll) and the winner is paid even money with no fee. Ties-lose makes it a high-edge game.",
    },
    {
      q: "How often do two 2d6 totals tie?",
      a: "146 times in 1,296, about 11.27%. That is also the house edge if ties lose and winners take 2x.",
    },
    {
      q: "Is dice duel the same as craps or crypto dice?",
      a: "No. Craps is a pass/don’t sequence plus propositions. Crypto dice is usually a 0–100 slider. A duel compares two totals.",
    },
    {
      q: "Does PVPspinArena have a dice duel?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This guide prices duel buttons you will see elsewhere.",
    },
    {
      q: "What should I read first on the help screen?",
      a: "The tie rule. Then the number of dice. Then whether anyone rolls after seeing the other total.",
    },
  ],
  sources: [
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
    {
      label: "Wikipedia: Sic bo (compare other dice banking)",
      url: "https://en.wikipedia.org/wiki/Sic_bo",
    },
    {
      label: "Wizard of Odds: craps (36-pair reference)",
      url: "https://wizardofodds.com/games/craps/",
    },
  ],
  related: [
    "dice-roll-probability",
    "crypto-dice-game",
    "craps-odds",
    "house-edge",
    "online-casino-games",
  ],
  updated: "2026-09-26",
};
