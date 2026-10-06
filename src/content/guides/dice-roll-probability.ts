import type { Guide } from "./types";

export const guide: Guide = {
  slug: "dice-roll-probability",
  cluster: "Games & odds",
  keyword: "dice roll probability",
  secondary: ["dice probability", "two dice odds", "craps odds", "probability of rolling 7"],
  title: "Dice Roll Probability: Combinations, Odds and Edge",
  description:
    "Dice roll probability for one die, two dice and casino roll-under games, with combination tables and how a house edge is added on top.",
  h1: "Dice roll probability: combinations, casino odds and added edge",
  answer:
    "Dice roll probability starts with counting equally likely faces, then combinations. One fair six-sided die is 1/6 per face. Two dice make 36 ordered pairs; 7 is the most common total (6/36) and 2 or 12 the rarest (1/36). Casino games take those honest fractions and short-pay them, or replace the cubes with a 0–100 slider that already includes a house edge.",
  facts: [
    "A fair six-sided die has six faces; each face has probability 1/6 if the die is fair.",
    "Two distinguishable dice produce 36 equally likely ordered pairs, not 11 equally likely totals.",
    "The total 7 occurs in 6 of those 36 pairs (16.67%); 2 and 12 occur in 1 pair each (2.78%).",
    "Craps pass-line bets use that two-dice table and still carry about a 1.41% house edge after the payoff rules.",
    "Instant crypto dice is usually not two cubes; it is a roll-under number with a built-in edge on a 0–100 scale.",
  ],
  sections: [
    {
      id: "one",
      title: "One die: faces, not folklore",
      body: `If a cube is fair, the sample space is {1, 2, 3, 4, 5, 6} and each point has probability 1/6 ≈ 16.67%.

P(even) = P(2,4,6) = 3/6 = 1/2. P(4 or higher) = 3/6 = 1/2. P(exactly 6) = 1/6. Those are definitions, not [lucky numbers](/guides/lucky-numbers-gambling).

### Independent rolls

A second roll does not correct the first. After three 6s, P(6) is still 1/6. That is the [gambler's fallacy](/guides/gamblers-fallacy) in cube form. Physical dice can be slightly biased; casino-grade and digital generators are built to remove that story as a strategy.

### Fair payout versus casino payout

A fair even-money bet on “six” would pay 6x (your stake back plus five). A carnival die that pays 5x on a six is already a 16.67% edge: 1/6 × 5 = 0.833. Always write probability × payout before you accept a “simple” die bet. Our [casino terminology guide](/guides/casino-terminology) names stake, payout and edge so the sentence stays short.`,
    },
    {
      id: "two",
      title: "Two dice: the 36-pair table",
      body: `People list totals 2 through 12 and treat them as eleven equal bins. They are not. (1,6) and (6,1) are different ordered pairs. The sample space has 36 points.

| Total | Combinations | Probability | Fair payout on that total |
| --- | --- | --- | --- |
| 2 | 1 (1+1) | 1/36 (2.78%) | 36x |
| 3 | 2 | 2/36 (5.56%) | 18x |
| 4 | 3 | 3/36 (8.33%) | 12x |
| 5 | 4 | 4/36 (11.11%) | 9x |
| 6 | 5 | 5/36 (13.89%) | 7.2x |
| 7 | 6 | 6/36 (16.67%) | 6x |
| 8 | 5 | 5/36 (13.89%) | 7.2x |
| 9 | 4 | 4/36 (11.11%) | 9x |
| 10 | 3 | 3/36 (8.33%) | 12x |
| 11 | 2 | 2/36 (5.56%) | 18x |
| 12 | 1 (6+6) | 1/36 (2.78%) | 36x |

### Worked “probability of rolling 7”

Six pairs: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1). 6/36 = 1/6. That is why craps lives on 7. A fair bet on 7 pays 6x. A proposition bet that pays 4x on 7 is a 33% house edge: 6/36 × 4 = 0.667.

### Any specific pair

P(double six) = 1/36. P(any double) = 6/36 = 1/6. P(total ≥ 10) = 6/36 = 1/6 (3+2+1 pairs). Count pairs. Do not count totals as if they were faces.`,
    },
    {
      id: "craps",
      title: "How craps adds an edge on top of honest cubes",
      body: `A pass-line bet is a sequence that uses the two-dice table, then pays even money.

- Come-out 7 or 11: you win (8/36).
- Come-out 2, 3 or 12: you lose (4/36).
- Any other total becomes the point; you then win if that point repeats before a 7.

The point-phase probabilities are again ratios of pair counts. After all branches, the pass-line house edge is about 1.41%. Don’t-pass is about 1.36% because the 12 is usually a push instead of a win for the dark side.

Those are among the cheaper table bets in a land casino — and they still leak. Side bets and hard-ways use the same 36-pair table with much worse payoffs. The cubes are fair; the posted multiples are not. That split is [house edge](/guides/house-edge) in one sentence.

PVPspinArena does not offer craps. The combination table still matters, because every “roll a 7” argument on the internet starts here.`,
    },
    {
      id: "crypto",
      title: "Crypto roll-under is a different object",
      body: `Instant [dice game crypto](/guides/crypto-dice-game) usually does not throw two cubes. It draws a number on a 0–100 (or 0–10,000) scale and asks whether it sits under or over your slider.

A fair roll-under 25 would pay 4x. A 1% house-edge slider pays about 3.96x. The “dice” name is branding. The probability model is a continuous-looking uniform, not 36 pairs.

### How to translate

- Physical two-dice 7: 6/36, fair 6x.
- Slider “49.5 under” at 1% edge: about 49.5% chance, about 2.00x paid, EV $0.99.
- Do not quote craps numbers on a slider, or slider RTP on a street-craps bet.

If you want a 50/50 that really pays 2x on a player pot, that is [Coinflip](/coinflip), not a die. If you want to recompute a committed result, that is the [Fairness page](/fairness), not a pair of cubes.`,
    },
    {
      id: "edge-on-top",
      title: "Putting a house edge on honest combinations",
      body: `Once you can count combinations, adding an edge is mechanical.

1. Write the true probability p from the table.
2. Write the posted total payout r.
3. Expected return = p × r.
4. House edge = 1 − p × r.

### Worked carnival examples

- “Pay 30 to 1 on double six” means r = 31 if they return the stake, or 30 if they do not — read the wording. True p = 1/36. If r = 31, EV = 31/36 ≈ 0.861, edge ≈ 13.9%.
- “Pay 5 to 1 on any seven” and they keep the stake on a win so r = 6: EV = 6/36 × 6 = 1.00 if they meant 5 to 1 plus stake… wording matters. If they pay 5x total on 7: 6/36 × 5 = 0.833, edge 16.7%.

[Expected value](/guides/expected-value-gambling) is this product. Casinos stay in business by setting r a little under 1/p. The [games and odds topic](/guides/topics/games-and-odds) is the cluster of those products on this site.

### What combinations cannot do

They cannot make the next roll due. They cannot turn a short-paid bet into a long-run winner. They can only tell you the price.`,
    },
    {
      id: "not-here",
      title: "What PVPspinArena uses instead of dice",
      body: `There is no die table and no roll-under slider here. The live games are Jackpot, Coinflip and Roulette.

- [Jackpot](/guides/crypto-jackpot) — chance = your stake / pot.
- [Coinflip](/coinflip) — a single HMAC bit, 50/50, not 6/36.
- [Roulette](/roulette) — 33 slots you can count like faces on a custom die.
- [how it works](/how-it-works) — the published cycles.

Treat any live wheel or pot as a sample space you can write down, the same way you write 36 pairs. If a game will not give you the sample space, you cannot complete a probability sentence.

Physical-dice folklore — “dice have memory”, “the shooter is hot” — is the same independence error as a coin. A fair cube’s next face does not owe you a correction. Loaded or poorly made dice are a different, empirical claim: measure the faces, then rewrite p. Until you have that measurement, use 1/6. Casino-grade and hashed digital rolls are built so that you should not be in the “measure the cube” business at all. You should be in the “read the payoff” business. If a street game pays even money on “7 or 11” with two dice, the true chance is 8/36 ≈ 22.2%, so a fair total payout would be about 4.5x. Even money on that event is a huge edge for the banker. Write 8/36 × 2 = 0.444 before you call it a friendly roll.

### One more worked pair: beating a 4 with an 8

In craps, after a point of 4, you need another 4 before a 7. Ways to 4: 3. Ways to 7: 6. Conditional chance to win the point is 3/(3+6) = 1/3. A fair payoff on that isolated phase would be 3x. The pass-line still pays even money on the whole sequence, which is how the 1.41% appears after you mix come-out wins, come-out losses and point wins. The cubes stayed fair. The payoff schedule did the rest. Write the conditional fraction whenever someone says “8 is an easy point”. An 8 has 5 ways versus 6 ways to 7, so 5/11 ≈ 45.5% — better than a 4, still not even, still paid even money on the line.`,
    },
    {
      id: "more-counts",
      title: "Three dice, streaks and a craps price list",
      body: `Once two-dice pairs are clear, a few extra counts stop the remaining myths.

### Three fair dice

The sample space is 6×6×6 = 216. The total 10 and the total 11 are the most common (27 ways each). A “lucky 10” carnival payoff that pays 8x total on three-dice 10 is then 27/216 × 8 = 1.00 only if they really pay 8x; many pay 7x or less. Count 216, do not invent.

### Streaks of a face

P(six then six) = 1/36. P(three sixes) = 1/216. After two sixes, P(third six) is still 1/6. The joint probability of a named streak is small; the conditional probability given the streak so far is not.

### Worked craps edges you will actually see

| Bet | True chance (pairs) | Typical total payout | Approx. house edge |
| --- | --- | --- | --- |
| Pass line | sequence, ~49.3% win | 2x | 1.41% |
| Don’t pass | sequence, ~37.9% win + 12 push | 2x | 1.36% |
| Any seven | 6/36 | 5x | 16.67% |
| Any craps (2,3,12) | 4/36 | 8x | 11.11% |
| Hard 6 (3+3 before 6 or 7) | 1/10 of relevant endings | 10x | 9.09% |
| Eleven (yo) | 2/36 | 16x | 11.11% |

The first two rows use honest cubes and a mild short-pay in the sequence rules. The proposition rows use the same 36 pairs and ugly multiples. If someone quotes “dice are fair, so the bet is fair”, point at the any-seven row.

### Mapping back to a slider

A crypto roll-under 16.67 at 1% edge is not “betting on 7”. It is a uniform 0–100 draw that happens to share a percentage with 6/36. The generators are different; only the percentage collided. Price each game with its own sample space.

### Two-dice chances people quote wrong

P(total ≥ 7) = 21/36 = 58.33%, not “about half”. P(total ≤ 6) = 15/36 = 41.67%. The distribution is not symmetric around 7 in the way a 1–12 list looks; it is symmetric around 7 in counts (2 mirrors 12, 3 mirrors 11) but the cumulative above 7 includes 7 itself if you write “at least”. Say the inequality out loud before you price a street bet on “seven or higher”.

P(at least one six in two dice) = 1 − (5/6)^2 = 11/36 ≈ 30.6%, not 1/3, not 1/6. The “one six” carnival ticket is usually short-paid against 11/36. Count the 11 pairs: (6,1)(6,2)(6,3)(6,4)(6,5)(6,6)(1,6)(2,6)(3,6)(4,6)(5,6).`,
    },
    {
      id: "summary",
      title: "Summary",
      body: `Dice roll probability is counting. One fair die is 1/6 per face. Two dice are 36 ordered pairs; 7 leads at 6/36, 2 and 12 trail at 1/36. Craps uses that table and then short-pays through its sequence rules. Instant crypto dice is usually a uniform slider with the edge already inside the payout quote.

Write p × r for every bet. If the product is less than 1, you have found the house. PVPspinArena does not offer dice; use Coinflip or Roulette when you want a sample space printed on the page.

Those same dice frequencies show up in [Farkle](/guides/farkle-rules).

A three-dice cage game priced against you is [chuck-a-luck](/guides/chuck-a-luck).`,
    },
  ],
  faqs: [
    {
      q: "What is the probability of rolling a 7 with two dice?",
      a: "6 out of 36 equally likely ordered pairs, which is 16.67%, or 1/6. It is the single most common total.",
    },
    {
      q: "Why are dice totals not equally likely?",
      a: "Because more pairs sum to 7 than to 2. There is one way to make 2 and six ways to make 7. You must count pairs, not totals.",
    },
    {
      q: "How do casinos add a house edge to dice?",
      a: "They pay less than 1/p. A fair 7 would pay 6x total. A proposition that pays less than that on the same 6/36 chance keeps the gap.",
    },
    {
      q: "Is crypto dice the same as two cubes?",
      a: "Usually not. Most crypto dice games draw a 0–100 number and use roll-under odds with a built-in edge. See the dice game crypto guide.",
    },
    {
      q: "Does PVPspinArena have a dice game?",
      a: "No. PVPspinArena offers Jackpot, Coinflip and Roulette only. This guide is the combination-count reference for dice you meet elsewhere.",
    },
    {
      q: "What are the odds of rolling double sixes?",
      a: "1 in 36, about 2.78%. A fair payout would be 36x total. Any posted number below that is an edge.",
    },
  ],
  sources: [
    { label: "Wikipedia: Dice", url: "https://en.wikipedia.org/wiki/Dice" },
    { label: "Wikipedia: Craps", url: "https://en.wikipedia.org/wiki/Craps" },
    { label: "Wizard of Odds: craps", url: "https://wizardofodds.com/games/craps/" },
  ],
  related: [
    "crypto-jackpot",
    "mines-game-casino",
    "limbo-game-strategy",
    "crash-gambling",
    "crypto-blackjack",
    "farkle-rules",
    "chuck-a-luck",
    "lucky-numbers-gambling",
  ],
  updated: "2026-09-26",
};
