import type { Guide } from "./types";

export const guide: Guide = {
  slug: "implied-probability",
  cluster: "Games & odds",
  keyword: "implied probability",
  secondary: ["implied odds", "probability from odds", "overround", "convert odds to probability"],
  title: "Implied Probability: Convert Odds Into True Chance",
  description:
    "Implied probability: how to turn decimal or American odds into a percent, how overround appears, and how that percent compares with real chance.",
  h1: "Implied probability: convert odds into a percentage chance",
  answer:
    "Implied probability is the chance a price would be fair at. From decimal odds D it is 1/D; from American +A it is 100/(A+100); from American −A it is A/(A+100). That percent is what the payout assumes, not automatically the real chance. When a book’s implied chances add up to more than 100%, the extra is overround. When a casino pays 2x on a bet that wins less than half the time, implied 50% sits above the true chance.",
  facts: [
    "Implied probability from decimal odds D is 1/D.",
    "American +150 implies 100/250 = 40%; American −150 implies 150/250 = 60%.",
    "A fair two-way market has implied chances that sum to 100%.",
    "Overround is the sum of implied chances minus 100%, the book’s built-in margin.",
    "A 2x casino colour implies 50% but often wins closer to 47% or 48.48%.",
  ],
  sections: [
    {
      id: "what",
      title: "What implied probability means",
      body: `A posted payout is a sentence about chance, whether the site says so or not. If a book will pay you 3.00 decimal when an event hits, it is treating that event as if it were a 1-in-3 shot for pricing purposes. That 33.33% is the implied probability. It is implied by the odds, not measured from physics or a wheel count.

The useful move is to write that percent next to the real percent. If they match, the price is fair (before limits and timing). If implied chance is higher than real chance, you are being paid as if the event were more likely than it is — which means the payout is too short. Casino colours fail that test on purpose. That gap is the [house edge](/guides/house-edge).

This sits in the [Games and odds topic](/guides/topics/games-and-odds). If you still need to change +150 into 2.50 first, use the [odds converter](/guides/odds-converter). Adults 18+ only.

If you remember only one conversion, remember 1/D. Everything else — American plus, American minus, fractions — is a road to decimal so you can take that reciprocal. The skill is not collecting formats. The skill is refusing to treat the reciprocal as a weather report for the next spin.`,
    },
    {
      id: "convert",
      title: "Convert decimal and American odds into a percent",
      body: `### Decimal

implied % = 100 / D

- D = 2.00 → 50.00%
- D = 2.50 → 40.00%
- D = 14.00 → 7.14%
- D = 1.91 → 52.36%

### American positive (+A)

implied % = 100 / (A + 100)

+100 → 50%. +200 → 33.33%. +1300 → 7.14%.

### American negative (−A)

implied % = A / (A + 100)

−110 → 110/210 ≈ 52.38%. −150 → 150/250 = 60%. −200 → 200/300 ≈ 66.67%.

### Fractional

Convert to decimal first: D = (a/b) + 1, then 1/D. Evens 1/1 → 50%. 5/2 → 1/3.50 ≈ 28.57%.

These identities are exact for a single price. They do not know whether the wheel has 37 pockets or 33 slots. You have to bring the real p from the rules. A converter that stops at the percent has done half a job. The second half is the count: 16 slots in 33, 18 pockets in 37, one share in a pot. Without that count, 50% implied on a 2.00 line is a slogan.

### Worked mixed ticket

A slip shows −120 on side A and +100 on side B. Implied: 120/220 ≈ 54.55% and 50.00%, sum 104.55%, overround 4.55%. A proportional fair split is 52.2% / 47.8%. If you think the true chance of A is 56%, side A is slightly plus after removing juice; if you think it is 50%, both sides are minuses for you. Casino colours skip this inference: you count slots instead of guessing a sports p.`,
    },
    {
      id: "overround",
      title: "How overround appears on a book",
      body: `Take a two-way sports market. Home is 1.91, away is 1.91. Implied chances: 52.36% + 52.36% = 104.72%. The extra 4.72 percentage points are overround (sometimes called vigorish or juice when discussed as a hold). The book does not need to know who wins. If the two prices are balanced, the extra is the margin.

### Removing overround (a rough fair chance)

A simple proportional method: divide each implied chance by the sum.

- Each 52.36% / 1.0472 ≈ 50.00% “fair” chance if the market is symmetric.

Other methods exist (additive, Shin). For casino work you rarely need them, because you can count pockets instead of inferring a fair chance from a two-way screen.

### Casino overround in disguise

A single roulette colour is not quoted as two prices that add past 100%, but the same economics apply. You can invent the missing side: “not Purple” should be the complement. Purple at 2.00 implies 50%. Not-Purple at a fair complement would imply 50% as well, summing to 100%. In reality Purple wins 48.48% and misses 51.52%. The posted 50% is the overround sitting inside one number.

### Three colours on one wheel

If you add implied chances as if Purple, Silver and Green were a three-way book: 50% + 50% + 7.14% = 107.14%. That sum is not how a book would have to quote mutually exclusive sides — you cannot bet all three as a coherent market the way you bet home/draw/away — but it shows the paytable is not a 100% book. The real probabilities 48.48% + 48.48% + 3.03% = 100%. The extra 7.14 implied points are the house speaking.`,
    },
    {
      id: "vs-true",
      title: "Implied percent versus real chance",
      body: `Real chance comes from counting equally likely outcomes, or from a documented RNG map you can verify. Implied chance comes from the payout. [Expected value](/guides/expected-value-gambling) is what happens when you multiply them together with the stake.

EV per $1 = p × D − 1

If p = 1/D, EV is zero. If p < 1/D, EV is negative. That is the entire pricing test.

### Worked wheel numbers

| Bet | Posted D | Implied p | True p | Implied − true | EV per $1 |
| --- | --- | --- | --- | --- | --- |
| Fair 0% fee flip | 2.00 | 50.00% | 50.00% | 0 | $0 |
| European red | 2.00 | 50.00% | 48.65% | +1.35 pts | −$0.0270 |
| American red | 2.00 | 50.00% | 47.37% | +2.63 pts | −$0.0526 |
| Purple | 2.00 | 50.00% | 48.48% | +1.52 pts | −$0.0303 |
| Green | 14.00 | 7.14% | 3.03% | +4.11 pts | −$0.5758 |

Green’s gap is larger in both probability points and dollars. Purple costs about 3 cents per dollar before the win fee. Green costs about 58 cents. Always finish with p × D.

You can count Purple’s 16 slots on the live [Roulette](/roulette) wheel. You do not need a bookmaker screen.

### Another dollar check

Stake $15 on Green. Implied story: 7.14% chance to receive $210, so “fair” EV would be 0.0714 × 210 − 15 ≈ $0. Real story: 3.03% × 210 − 15 ≈ −$8.64, about 58% of $15 before the win fee. A small-looking payout gap on a rare slot is not small money.`,
    },
    {
      id: "use",
      title: "Using implied probability to price a bet",
      body: `A practical sequence:

1. Convert the payout to decimal (the [odds converter](/guides/odds-converter) if the ticket is American).
2. Write implied probability 1/D.
3. Write true probability from the rules or a verified map.
4. If you cannot write true p, you cannot price the bet. Walk away or treat it as entertainment with an unknown cost.
5. Compute EV = p × D − 1. If it is negative, you are buying a product with a fee baked in.

### Language traps

- **“Implied odds”** sometimes means the same as implied probability, and sometimes means the payout expressed as odds. Prefer “implied probability” for the percent.
- **“True odds”** should mean 1/p as a decimal, or (1−p):p as a fraction. Fair Purple would be decimal 15/7 ≈ 2.143, not 2.00.
- **“The implied chance is the chance I will win.”** No. It is the chance the cashier is pricing. The wheel can disagree.

[Casino terminology](/guides/casino-terminology) keeps stake, payout and edge in one place if the words start to slide.

A tote board is the same conversion at the track. [Horse racing odds explained](/guides/horse-racing-odds-explained) reads it. The price a book builds into both sides is the [vig](/guides/vig-betting). An election contract priced in cents is [election betting odds](/guides/election-betting-odds).`,
    },
    {
      id: "pvp",
      title: "Implied chance on PVPspinArena games",
      body: `### Coinflip

A 0% fee [Coinflip](/coinflip) pays 2.00 on a 50% ticket. Implied 50%, true 50%. There is no overround in the payout. Variance still exists: one flip moves the whole stake. Verify the flip on [fairness](/fairness) if you want the honesty check; honesty is not a plus-EV.

### Jackpot

The “odds” are not a fixed decimal. Your chance is your stake divided by the pot. A fair 0% fee pot pays the whole pot, so implied chance from “I win the pot” is your share, which matches true chance. A 5% fee pays 95% of the pot: implied chance from the cash you can take is higher than the chance you should assign to the reduced prize, and EV is −5%.

### Roulette

Every colour’s implied chance from the multiplier is higher than the slot count. That is the product. Do not convert 2x to 50% and then bet as if you had a coin.

### 18+

Implied probability is a calculator step. It is not a reason to raise a stake. If the percent on the ticket and the percent on the wheel disagree, believe the wheel.

A last worked pair you can do without a spreadsheet: Silver is the same 2.00 as Purple, same implied 50%, same true 48.48%, same −$0.0303 per dollar before the win fee. Betting both colours in one round is not a 100% implied book you have beaten; it is two minus-EV tickets that cannot both win. The implied percents adding to 100% is a coincidence of two even-money stickers, not a hedge.`,
    },
    {
      id: "mistakes",
      title: "Common mistakes when converting odds to a chance",
      body: `- **Using profit-only as if it were decimal.** 13/1 is not 13% or 1/13. Decimal is 14; implied is 7.14%.
- **Forgetting the minus on American.** −150 is a favourite. The implied chance is 60%, not 40%.
- **Adding one-way implied chances and stopping.** On a book, add all sides to see overround. On a wheel, compare to counted p.
- **Treating a smaller probability gap as a smaller edge.** On this 33-slot wheel, Green costs much more than Purple.
- **Updating implied chance after a streak.** The price did not change because Red hit four times. Past results do not rewrite 1/D or the pocket count.

Write the two percents. Subtract. Then multiply by the payout. That is the whole skill.

### A one-minute habit

Keep a note with four columns: posted decimal, implied %, true %, EV per $1. Fill it for Purple, Silver, Green, a fee-free flip, and any sports screenshot you are tempted by. After a week the sports rows will show overround; the wheel rows will show about a 3% leak on Purple or Silver and a much larger leak on Green. The implied probability column is there so you never again treat 2.00 as a weather forecast.

Implied probability is a translation, not a measurement. The book or the paytable speaks first; you write down what that sentence would mean if it were fair; then you ask whether the world agrees. On a 33-slot wheel the world is the slot count. On a fee-free flip the world is 1/2. On a jackpot ticket the world is your share of the pot. If you cannot name the world, you cannot finish the comparison, and a lonely implied percent is just a pretty number. Use it as a checkpoint, then spend or walk away on the dollar EV, not on the feeling that 50% is printed on the chip. A second habit: when two implied chances add to more than 100%, write the surplus as a fee. 104.7% is a 4.7-point book charge. 50% implied on a 48.48% colour is the same family of charge wearing a single number.`,
    },
  ],
  faqs: [
    {
      q: "How do I calculate implied probability from decimal odds?",
      a: "Divide 1 by the decimal, or 100 by the decimal for a percent. Odds of 2.50 imply 40%. Odds of 14.00 imply about 7.14%.",
    },
    {
      q: "How do I get implied probability from American odds?",
      a: "For +A use 100/(A+100). For −A use A/(A+100). +200 implies 33.33%; −200 implies 66.67%.",
    },
    {
      q: "What is overround?",
      a: "Overround is how far the implied chances in a market add up above 100%. That surplus is the book’s margin. A fair market sums to 100%.",
    },
    {
      q: "Is implied probability the same as the real chance?",
      a: "Only if the price is fair. Casino even-money bets imply 50% but win less often than that. Always compare 1/D with a count of equally likely outcomes.",
    },
    {
      q: "Why is Green's dollar edge so much larger than Purple's?",
      a: "Purple returns 16/33 times 2, which is 32/33. Green returns 1/33 times 14, which is 14/33. Before the win fee that is about a 3.03% edge on Purple and about 57.6% on Green.",
    },
    {
      q: "Does a 0% fee coinflip have overround?",
      a: "No. Decimal 2.00 on a true 50% match implies 50%. The payout is fair between the two players. You can still lose the flip.",
    },
  ],
  sources: [
    {
      label: "Wikipedia: Odds (implied probability)",
      url: "https://en.wikipedia.org/wiki/Odds#Implied_probabilities",
    },
    {
      label: "Wikipedia: Overround",
      url: "https://en.wikipedia.org/wiki/Mathematics_of_bookmaking",
    },
    { label: "Wizard of Odds: house edge", url: "https://wizardofodds.com/gambling/house-edge/" },
  ],
  related: [
    "crypto-jackpot",
    "progressive-jackpot-odds",
    "rtp-explained",
    "rtp-calculator",
    "expected-value-gambling",
  ],
  updated: "2026-09-26",
};
