import type { Guide } from "./types";

export const guide: Guide = {
  slug: "odds-converter",
  cluster: "Games & odds",
  keyword: "odds converter",
  secondary: [
    "decimal to fractional",
    "american odds converter",
    "convert odds",
    "betting odds format",
  ],
  title: "Odds Converter Guide: Decimal, Fractional, Implied",
  description:
    "An odds converter walkthrough: decimal, fractional and American odds, implied probability, and how to compare a casino payout with a fair price.",
  h1: "Odds converter: decimal, fractional, American and implied chance",
  answer:
    "An odds converter turns one price format into another and into implied probability. Decimal odds are the total return per $1 staked, including stake. Fractional odds are profit relative to stake. American odds are plus or minus a hundred-dollar reference. None of these formats changes the bet. They are labels for the same payout, and the converted implied chance is the chance the price assumes, not the true chance if the house built in an edge.",
  facts: [
    "Decimal odds D mean a $1 stake returns $D in total if you win (profit D − 1).",
    "Fractional a/b means profit a on stake b; decimal equivalent is (a/b) + 1.",
    "American +150 means $100 profit on a $100 stake; −150 means you must risk $150 to profit $100.",
    "Implied probability from decimal odds is 1/D, before you ask whether that matches reality.",
    "A casino 2x colour is decimal 2.00, fractional 1/1, American +100 — then the true chance is below 50%.",
  ],
  sections: [
    {
      id: "why",
      title: "Why an odds converter exists",
      body: `Books, casinos and forums do not share one language. A UK page writes 5/2. A European slip writes 3.50. A US ticket writes +250. The underlying contract can be identical: risk 2 to win 5, total return 3.5 times stake. An odds converter is a unit change, like metres and feet. It does not improve the price.

Once the formats sit on one scale you can do the only comparison that matters: what chance is this price implying, and what chance does the game actually have? That second question is [implied probability](/guides/implied-probability) and [expected value](/guides/expected-value-gambling). This page does the first job and then shows how a house payout sits next to a fair payout. More odds pieces live in the [Games and odds topic](/guides/topics/games-and-odds). PVPspinArena is 18+.

An odds converter will not tell you whether to bet. It will stop you from comparing 5/2 to +150 as if they were different products. They are the same product. The interesting difference is 5/2 versus a fair 15/7 on Purple. That is a price gap, not a format gap. People lose money arguing about formats; they lose more money ignoring the gap.`,
    },
    {
      id: "decimal",
      title: "Decimal odds",
      body: `Decimal odds are the cleanest format for arithmetic. They answer: if I stake $1 and win, how many dollars come back in total?

- Decimal 2.00 returns $2 on a $1 stake (even money).
- Decimal 3.00 returns $3 (2 to 1).
- Decimal 14.00 returns $14, which is how Green is written on a 33-slot wheel.

Profit = stake × (decimal − 1). Total return = stake × decimal. That is why expected return per $1 is simply p × D. If D = 2.00 and p = 16/33, expected return = 0.9697 before the win fee. You do not need a second formula.

### Where you see them

Most of Europe, Australia and almost every crypto site that shows a multiplier. PVPspinArena lists 2x and 14x, which are decimal 2.00 and 14.00. Open [Roulette](/roulette) and you are already looking at decimal odds.

### Worked decimal cash

Stake $12 at decimal 2.00: return $24 if you win, profit $12. Stake $12 at 14.00: return $168, profit $156. Those are conversions, not recommendations. Expected return still needs p. If you only remember one habit from this section, remember that decimal already includes the stake. A page that says “odds of 2” and means “profit 2” is using fractional language and will make your converter off by 1.`,
    },
    {
      id: "fractional",
      title: "Fractional odds",
      body: `Fractional odds are traditional in the UK and Ireland. They quote profit, not total return.

- 1/1 (“evens”) pays profit equal to stake; total return is 2×.
- 5/2 pays $5 profit on a $2 stake; decimal = 5/2 + 1 = 3.50.
- 13/1 pays $13 profit on $1; decimal = 14.00. That is Green written as profit-only.

### Conversion rules

- Fractional a/b → decimal (a ÷ b) + 1.
- Decimal D → fractional (D − 1)/1, then simplify. 2.50 becomes 3/2. 1.50 becomes 1/2.

Fractions that do not simplify cleanly are why people reach for a converter. 11/8 is decimal 2.375. You can do it by hand: 11 ÷ 8 = 1.375, plus the stake 1. The converter only saves arithmetic.

### More fractional drills

- 4/7 → decimal 11/7 ≈ 1.571, American about −175. Implied 63.6%.
- 6/4 (same as 3/2) → 2.50, +150, implied 40%.
- 9/4 → 3.25, +225, implied 30.8%.
- 20/1 → 21.00, +2000, implied 4.76%.

None of those is a casino colour on this site. They are here so you can see the converter is mechanical. When a streamer says “it’s 2 to 1 on Green”, they are wrong about this wheel: Green is 13 to 1 on profit, 14.00 decimal, and still minus-EV.

Track prices are written as a fraction on the tote. [Horse racing odds explained](/guides/horse-racing-odds-explained) turns that board into a payout.`,
    },
    {
      id: "american",
      title: "American odds",
      body: `American (moneyline) odds pivot around $100.

### Positive American (underdogs)

+A means a $100 stake profits $A. Decimal = (A / 100) + 1.

- +100 is evens: decimal 2.00.
- +200 is decimal 3.00.
- +1300 is decimal 14.00 (Green as a moneyline).

### Negative American (favourites)

−A means you must stake $A to profit $100. Decimal = (100 / A) + 1.

- −110 is the classic US juice line: decimal ≈ 1.909.
- −150 is decimal ≈ 1.667.
- There is no negative moneyline for a 2x colour: 2x is +100.

### Conversion back

- If decimal D ≥ 2, American = +100 × (D − 1).
- If decimal D < 2, American = −100 / (D − 1).

A converter is handy here because the minus sign flips the reference from “what I win on $100” to “what I must risk to win $100”.

### Worked American cash

You want $40 profit on a −110 line. Stake required = 40 × 110/100 = $44. Total return if you win = $84. Decimal check: 1.909 × 44 ≈ 84. Same bet at +110 would stake $40 to profit $44. The favourite/underdog split is only a quoting convention. A 2x colour has no favourite side in the moneyline sense; both Purple and “not Purple” would be quoted around plus or minus if a book listed them, and the pair would contain overround.`,
    },
    {
      id: "table",
      title: "Conversion table and worked examples",
      body: `Use this table as a manual odds converter. Implied chance is 1 / decimal, which is the chance the price would be fair at. It is not automatically the true chance.

| Decimal | Fractional | American | Implied chance | Fair use |
| --- | --- | --- | --- | --- |
| 1.50 | 1/2 | −200 | 66.67% | Strong favourite price |
| 1.91 | ≈10/11 | −110 | 52.36% | Typical US −110 side |
| 2.00 | 1/1 | +100 | 50.00% | Even money / 2x |
| 2.50 | 3/2 | +150 | 40.00% | Mid-range plus money |
| 3.50 | 5/2 | +250 | 28.57% | Longer plus money |
| 14.00 | 13/1 | +1300 | 7.14% | 14x long shot |

### Worked casino comparison

Fair even money on a true 50% coin is decimal 2.00. A [Coinflip](/coinflip) with a 0% fee pays that: two $10 stakes, winner takes $20, decimal 2.00, implied 50%, true 50%.

Purple pays the same decimal 2.00, so a naive converter says “implied 50%”. The true chance is 16/33 ≈ 48.48%. The gap is the house edge. The converter did not lie about the format. It cannot see the extra three slots that do not pay Purple.

Green converts to 14.00 / 13/1 / +1300, implied 7.14%. True chance is 1/33 ≈ 3.03%. The gap is much wider than on Purple, because 14x on one slot returns 14/33. Converting the label never closes it.

### A full walkthrough you can copy

A friend texts “+250 on a colour”. 

1. American +250 → decimal 3.50, fractional 5/2, implied 28.57%.
2. Ask which wheel. If they mean a 33-slot colour that is not Green, the true p is 48.48% and a fair decimal is 2.143. +250 would be a gift. They almost certainly mean a different product, or they are mixing a sports line with a wheel.
3. If they mean Green, the posted line is +1300, not +250. +250 would be wildly plus-EV on a 3.03% shot — which is why you will not see it.

The converter got you to 3.50. The rules got you to “this text is confused”. Both steps matter.`,
    },
    {
      id: "implied",
      title: "From converted odds to implied chance",
      body: `After you convert to decimal D, implied probability = 1 / D.

- 2.00 → 50.00%
- 1.91 → 52.36%
- 14.00 → 7.14%

If you convert two sides of a two-way market and add the implied chances, a fair market sums to 100%. A book’s market sums to more than 100%. The surplus is overround, the book’s built-in margin. A single casino colour is not a two-way book in the same way, but the same test applies: if 1/D is higher than the real p, you are being underpaid.

Worked check: European red at 2.00 implies 50%. Real p = 18/37 ≈ 48.65%. You are 1.35 percentage points short on probability, which is a 2.70% edge on the money because you also lose the extra 2.70% of the time the zero hits and you are paid nothing. The [house edge](/guides/house-edge) guide does that multiplication.

Casino terminology for stake versus profit is collected in the [casino terminology](/guides/casino-terminology) glossary if “2x” versus “1/1” still collides.`,
    },
    {
      id: "fair-price",
      title: "Comparing a casino payout with a fair price",
      body: `A fair decimal price is 1 / true probability (when there is a single winning outcome and a total-loss miss).

| Bet | True p | Fair decimal | Posted decimal | Underpay |
| --- | --- | --- | --- | --- |
| Fair coin | 0.50 | 2.00 | 2.00 (0% fee) | none |
| European red | 18/37 | 37/18 ≈ 2.056 | 2.00 | about 2.7% |
| American red | 18/38 | 38/18 ≈ 2.111 | 2.00 | about 5.3% |
| Purple | 16/33 | 33/16 = 2.0625 | 2.00 | 3.03% |
| Green | 1/33 | 33.00 | 14.00 | 57.58% |

That table is the whole point of converting. Once every number is decimal, the fair price and the posted price are comparable. You do not need to argue about +100 versus 1/1.

### Practical habit

1. Convert the posted payout to decimal.
2. Write implied chance 1/D.
3. Write true chance from the rules (count pockets, slots or cards).
4. If implied > true, the price is short. EV is negative.

Watch the wheel on [Roulette](/roulette) or a matched pair on [Coinflip](/coinflip) and run those four lines before you stake. The converter is a dictionary. The comparison is the decision. Gambling is 18+ and still costs the edge on house-banked bets even when the labels look like evens.

### Jackpot is not a fixed decimal

A [Jackpot](/) ticket does not convert like a colour. If you put $8 into a $40 pot with a 0% fee, your true p is 20% and a fair decimal on “win the pot” is 5.00 (you get $40 back). The posted “payout” is the pot, not a 2.00 sticker. Trying to run that through an American converter as +100 is a category error. Convert only when a multiplier is actually posted.

Keep a four-column note: posted format, decimal, implied chance, true chance. After a few rows the converter becomes boring, which is the point. The only interesting column is the last one, and it does not come from the converter. It comes from counting slots on the wheel or shares of a pot. Boring conversion plus an honest count is how you stop paying a 2.00 sticker as if it were a fair coin.`,
    },
  ],
  faqs: [
    {
      q: "How do I convert decimal odds to fractional?",
      a: "Subtract 1, then write that number as a fraction and simplify. Decimal 3.50 becomes 2.50, which is 5/2. Decimal 2.00 becomes 1/1.",
    },
    {
      q: "How do I convert American odds to decimal?",
      a: "For +A, decimal = A/100 + 1. For −A, decimal = 100/A + 1. +150 is 2.50; −150 is about 1.67.",
    },
    {
      q: "What does an odds converter not tell me?",
      a: "It does not tell you the true chance of winning, only the chance implied by the price. A 2.00 line always implies 50%, even when the wheel is shorter than that.",
    },
    {
      q: "Is 2x the same as +100 and 1/1?",
      a: "Yes. Those are decimal, American and fractional labels for even money. On roulette the true chance is still below 50% because of zeros or extra slots.",
    },
    {
      q: "How do I convert odds into implied probability?",
      a: "Use decimal form, then take 1 divided by the decimal. 2.50 implies 40%. Compare that percent with the real probability from the rules.",
    },
    {
      q: "Which odds format does PVPspinArena use?",
      a: "Multipliers: 2x on Purple and Silver, 14x on Green, 2x on a fee-free coinflip pot. Those are decimal 2.00 and 14.00.",
    },
  ],
  sources: [
    { label: "Wikipedia: Odds", url: "https://en.wikipedia.org/wiki/Odds" },
    { label: "Wikipedia: Moneyline odds", url: "https://en.wikipedia.org/wiki/Moneyline_odds" },
    { label: "Wizard of Odds: converting odds", url: "https://wizardofodds.com/" },
  ],
  related: [
    "crypto-jackpot",
    "implied-probability",
    "progressive-jackpot-odds",
    "rtp-explained",
    "rtp-calculator",
    "gambling-odds-calculator",
  ],
  updated: "2026-09-26",
};
