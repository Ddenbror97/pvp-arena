import type { Guide } from "./types";

export const guide: Guide = {
  slug: "kelly-criterion-calculator",
  cluster: "Games & odds",
  keyword: "kelly criterion calculator",
  secondary: [
    "full kelly stake",
    "half kelly fraction",
    "negative kelly",
    "kelly percent of bankroll",
  ],
  title: "Kelly Criterion Calculator: Worked Stake Numbers",
  description:
    "Kelly criterion calculator: plug in odds and win probability and read the stake. Worked rows show full, half, and negative Kelly.",
  h1: "Kelly criterion calculator: worked stakes for full, half, and negative Kelly",
  answer:
    "A kelly criterion calculator plugs in net odds and a win probability and reads the stake as a fraction of the bankroll. The worked rows use one formula: a fair 2x coin is 0%, a 55% coin at 2x is 10% of bankroll at full Kelly and 5% at half Kelly, and a negative fraction means the growth stake is zero. Purple on PVPspinArena roulette pays 2x with p = 16/33, so the fraction is about -3.03%. Play is for adults 18 and older, and only with money you can afford to lose.",
  facts: [
    "The stake fraction is f* = (b*p - q) / b, with q = 1 - p and b equal to net odds.",
    "A 2x payout has net odds b = 1, so the fraction simplifies to 2p - 1.",
    "A fair 2x coin (p = 50%) has Kelly f* = 0%.",
    "A 55% coin at 2x has full Kelly equal to 10% of bankroll and half Kelly equal to 5%.",
    "Purple pays 2x with p = 16/33, so f* = -1/33, about -3.03%.",
    "A negative fraction means do not bet that side to grow the roll.",
  ],
  sections: [
    {
      id: "what-you-plug-in",
      title: "What you plug in",
      body: `A **kelly criterion calculator** is a stake reader. You supply the net odds and the win probability, and the formula returns the fraction of the current bankroll that maximizes long-run growth when that probability is real. This page is the arithmetic. The 1956 paper, the growth-rate argument, and the essay on why house games make the fraction ugly live on the [Kelly criterion](/guides/kelly-criterion) page. Stay here when you want a row you can check with a pencil.

Net odds b are the profit per unit you risk. A 2x payout returns your stake plus an equal profit, so b = 1. Win probability p is the chance of that win. Loss probability q = 1 - p. The fraction is:

f* = (b*p - q) / b

On a 2x bet that collapses to f* = p - q = 2p - 1. You multiply f* by the bankroll you are willing to resize after every bet. The product is the stake. If f* is zero or negative, the product you use for growth is zero.

### The three inputs

- Net odds b, profit per unit risked, not the total cash returned.
- Win probability p you can defend from the rules or from a real edge.
- Bankroll, the roll the fraction multiplies, updated after each settled bet.

Write p as a fraction when the rules publish a slot count, and turn it into a percent only after you subtract, so rounding cannot flatter the stake. More sizing pieces sit in the [Games and odds topic](/guides/topics/games-and-odds). Adults 18 and older only.`,
    },
    {
      id: "worked-rows",
      title: "Worked rows: full, half, and negative",
      body: `The table uses an example roll of 100 units so the percents become stakes. The units are a pencil example. They are not a suggested deposit. Full Kelly is f* itself. Half Kelly is half of that fraction, and only when the fraction is positive. Negative Kelly is a fraction below zero. You do not stake a negative number of units. The growth stake is zero.

| Case | p | b | Full Kelly | Half Kelly | Stake on 100 units |
| --- | --- | --- | --- | --- | --- |
| Fair 2x coin | 50% | 1 | 0% | 0% | 0 |
| 55% coin at 2x | 55% | 1 | 10% | 5% | 10 full, or 5 half |
| Purple 2x | 16/33 | 1 | about -3.03% | still negative | 0 to grow |

Read the first row as a fair even-money coin. p = 0.50 and q = 0.50, so f* = 0.50 - 0.50 = 0. Half of zero is zero. The second row is the plus-edge toy: p = 0.55 and q = 0.45, so f* = 0.10. Ten units of a 100-unit roll is the full stake. Five units is half Kelly. The third row is a house price. p = 16/33 and q = 17/33, so f* = 16/33 - 17/33 = -1/33, about -3.03%. Half of a negative fraction is still negative, and the stake to grow stays 0.

### How to read a row

- Match b to the payout before you touch p.
- Use the true p from the rules when the game publishes it.
- If the percent is negative, write 0 in the stake column.

The same three rows are the whole calculator. Extra columns do not create an edge. Pencil the units in the margin.`,
    },
    {
      id: "fair-and-plus",
      title: "The fair coin and the 55% coin",
      body: `Start with the fair 2x coin because the arithmetic is the cleanest warning. You win 1 unit net or you lose 1 unit, each with probability 1/2. Expected value per unit staked is zero. The growth fraction is also zero. A calculator that prints a positive stake for this coin has been fed a p above 50%, or it has treated the 2x return as if b were 2. That second mistake is common. If the ticket says 2x, you receive twice the stake back, which is a profit of 1, so b = 1. Decimal odds of 2.00 are the same contract.

The 55% coin is the smallest plus-edge example that still uses a 2x payout. p = 0.55, q = 0.45, b = 1. Then b*p - q = 0.55 - 0.45 = 0.10, and dividing by b = 1 leaves 10% of bankroll. After a win the bankroll is larger, so the next full-Kelly stake is 10% of the new roll, not another flat 10 units. After a loss the next stake is 10% of what remains. Half Kelly freezes the fraction at 5% of whatever the roll is now. On a 100-unit start that is 5 units, then 5% of 95 after a loss, and so on.

### What half Kelly changes

- It cuts the stake in half when f* is positive.
- It slows growth on a real edge and shrinks the drawdown.
- It does not turn a negative f* into a reason to bet.

[Expected value](/guides/expected-value-gambling) is the mean those percents sit on. Kelly is the stake on top of that mean, and only when the mean is positive.`,
    },
    {
      id: "purple",
      title: "Purple on a 2x wheel",
      body: `Purple on [Roulette](/roulette) pays 2x. There are 33 slots and 7 of them are Purple, so p = 16/33. That is the published count, not a forecast. q = 17/33. With b = 1:

f* = (1 * 16/33 - 17/33) / 1 = -1/33

-1/33 is about -3.03%. The calculator’s growth stake is zero. You do not bet Purple to grow a bankroll. A smaller positive stake is a different decision: entertainment inside a budget. It is not a “gentle Kelly.” The formula has already refused the growth job.

Silver uses that same p and that same b, so it prints the same negative fraction and the same zero stake. Record zero for Silver as well. The same wheel pays Silver at 2x on 16 slots, so the Silver fraction is the same negative number. Green pays 14x, which is a different b, and this page does not invent a Green row. If you size Green, compute b from the net profit, use p = 1/33, and expect the sign to stay a warning unless your p is higher than the price implies. [Flat betting](/guides/flat-betting) is the constant-stake alternative once you have decided the bet is a cost.

### What zero means on this wheel

- The edge is negative, so expected wealth shrinks as you bet.
- Resizing after each spin does not flip the sign.
- A hot run is a sample, not a new p.

Bring the 0 from the table to the table. If you still want a spin, cap it with a [bankroll calculator](/guides/bankroll-calculator) and a stop you wrote down first.`,
    },
    {
      id: "negative-stake",
      title: "What a negative fraction tells you to stake",
      body: `Negative Kelly is the row people try to “fix” by betting less. The sign is the result. f* below zero means the bet, at that p and b, reduces the expected log of wealth. The stake that avoids that reduction is zero. Betting 1% because -3.03% felt harsh is a budget choice. Label it as a budget choice. The calculator did not recommend 1%.

You also cannot stake a negative amount and somehow take the house’s side on a casino color wheel unless the game offers that contract. This roulette bet is the color you click. The other side of the formula is not a button. When f* is negative, the practical output of the calculator is a blank stake box.

Half Kelly inherits the sign. Half of -1/33 is -1/30, still below zero, still a stake of zero if growth is the goal. Quarter Kelly does the same. Fractional Kelly is a haircut for a positive fraction whose variance you do not want to swallow whole. It is defined after you know f* is positive.

### A short decision list

- If f* is above zero, the full stake is f* times bankroll, and half is half of that.
- If f* is zero, the growth stake is zero.
- If f* is below zero, the growth stake is zero.

Write the sign before you write the chips. The history of why the logarithm shows up is on the [Kelly criterion](/guides/kelly-criterion) page, next to the reason fractional Kelly exists for a genuine edge.`,
    },
    {
      id: "errors",
      title: "Errors that print a fake stake",
      body: `Most bad calculator output is a bad input, not a mysterious formula. The first error is using the cash return as b. A 2x ticket has b = 1. If you type b = 2, you are pricing a 3x return and the fraction will look kinder than the bet you actually hold. The second error is typing a hoped-for p. Purple is 16/33 because seven slots pay, not because the last few spins missed. The third error is sizing a stake off a bankroll you will refill from rent. The fraction assumes the roll you named is the roll that grows or shrinks.

A fourth error is mixing a plus-edge toy with a house game. The 10% row is a 55% coin at 2x. It is not a roulette setting. Paste it onto Purple and you have swapped 0.55 for 16/33 without saying so. The fifth error is treating half Kelly as a moral discount that repairs a negative edge. Half of a leak is a smaller leak. The expected log still falls, just slower, and slower ruin is still ruin if you play long enough.

### Checks before you trust the percent

- Confirm b is profit, not the multiple printed on the button.
- Confirm p is a count of outcomes or a real forecast you could defend.
- Confirm the bankroll is the roll you will not silently top up.

[Expected value](/guides/expected-value-gambling) catches the mean. This page catches the stake. If either one is negative, stop looking for a clever percent. Check the sign twice.`,
    },
    {
      id: "beside-a-budget",
      title: "Put the percent beside a fixed stake",
      body: `Use the calculator, then decide what the session actually is. If the row says 0, a growth plan is finished. Any chips you still slide forward belong in a written entertainment cap. [Flat betting](/guides/flat-betting) keeps that cap the same size every bet so a loss does not recruit a larger one. A [bankroll calculator](/guides/bankroll-calculator) turns the cap into a count of bets and a stop. Those tools answer a different question: how long a minus-edge session lasts. Kelly answered whether the session should exist as an investment. On Purple, it should not.

Keep the example roll of 100 units in pencil. Ten units is the 55% coin at full Kelly. Five units is the same coin at half Kelly. Zero units is the fair coin and the Purple bet. If your real roll is a different size, scale only the positive row: 10% or 5% of that roll. Do not scale the negative row into a “small” bet and call it Kelly. Call it a cost, and keep it inside the budget you already accepted.

### After the number

- Record p, b, f*, and the stake in units.
- If f* is positive, say whether you are using full or half, and why.
- If f* is negative, leave the growth stake at zero and close the investment story.

Scale a positive percent only, and always leave every negative row at a stake of zero units. The [Games and odds topic](/guides/topics/games-and-odds) holds the neighboring pages. This one holds the worked stakes. 18+ only.`,
    },
  ],
  faqs: [
    {
      q: "What does a kelly criterion calculator return?",
      a: "It returns f* = (b*p - q) / b as a fraction of bankroll. For a 2x bet, b = 1, so f* = 2p - 1. You multiply a positive fraction by the current bankroll to get the stake.",
    },
    {
      q: "Why is a fair 2x coin a 0% stake?",
      a: "Because p = 0.50 and q = 0.50. Then f* = 0.50 - 0.50 = 0. Half Kelly is also 0. The bet is fair in expectation, and the growth stake is nothing.",
    },
    {
      q: "What is the stake for a 55% coin at 2x?",
      a: "Full Kelly is 10% of bankroll. On an example roll of 100 units that is 10 units. Half Kelly is 5% of bankroll, or 5 units on that same example.",
    },
    {
      q: "What is Kelly for Purple at 2x?",
      a: "Purple pays 2x with p = 16/33, so f* = -1/33, about -3.03%. The growth stake is zero. A smaller bet is a budget decision, not a Kelly recommendation.",
    },
    {
      q: "Does half Kelly fix a negative edge?",
      a: "No. Half of a negative fraction is still negative, so the stake to grow stays zero. Half Kelly only shrinks a stake that was already positive.",
    },
  ],
  sources: [
    { label: "Wikipedia: Kelly criterion", url: "https://en.wikipedia.org/wiki/Kelly_criterion" },
    {
      label: "J. L. Kelly, Jr., A New Interpretation of Information Rate (1956)",
      url: "https://www.princeton.edu/~wbialek/rome/refs/kelly_56.pdf",
    },
  ],
  related: ["kelly-criterion", "expected-value-gambling", "bankroll-calculator", "flat-betting"],
  updated: "2026-09-29",
};
