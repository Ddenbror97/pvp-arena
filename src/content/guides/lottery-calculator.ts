import type { Guide } from "./types";

export const guide: Guide = {
  slug: "lottery-calculator",
  cluster: "Lottery",
  keyword: "lottery calculator",
  secondary: [
    "lottery jackpot calculator",
    "lottery tax calculator",
    "cash value calculator",
    "lottery expected value",
  ],
  title: "Lottery Calculator: Jackpot After Taxes and Payout Type",
  description:
    "Free lottery calculator showing your jackpot after federal and state taxes, lump sum vs annuity, and the expected value of a ticket at any jackpot size.",
  h1: "A lottery calculator you can reuse on paper",
  answer:
    "Lottery calculator, on this page, is the box and the same worksheet. Copy the drawing’s published cash option, subtract federal withholding and an example state rate, then divide by the combination count. For Powerball that count is 292,201,338. A 24 percent withholding line is a prepayment, not the final tax. A 5 percent state line is an example you replace. The annuity headline is not the cash. Adults only. The worksheet does not raise your odds, and it is not tax advice.",
  facts: [
    "Use the cash option printed for that draw. Do not invent it as half the billboard.",
    "Federal withholding on a large prize is often 24 percent of the prize.",
    "Powerball jackpot odds are 1 in 292,201,338. Mega Millions are 1 in 290,472,336.",
    "Jackpot-only expected value ignores smaller prizes, shared winners, and the final tax bill.",
    "A fair PvP pot is not priced with this worksheet. Your share of the pot is the chance.",
  ],
  sections: [
    {
      id: "seven-lines",
      title: "The seven lines of the lottery calculator",
      body: `Use these lines in order. Skip a line you cannot fill and you do not have a result. You have a guess.

1. Write the advertised annuity A. This is the billboard, the sum of the scheduled payments.
2. Write the published cash option C for that same draw. If the site does not list C, stop. Do not use a memorized percent.
3. Federal withholding estimate W = 0.24 × C, for a prize large enough that withholding applies. Label W as withholding.
4. State estimate S = r × C. This page’s tables use r = 0.05 as an example. Your state may use 0, or a higher rate, or a withholding rule of its own.
5. Rough cash in hand H = C − W − S. Then ask a tax professional whether the final federal rate exceeds 24 percent. If it does, H is still high.
6. Jackpot-only value of one line V = H / N. For Powerball, N = 292,201,338. For current Mega Millions, N = 290,472,336. V ignores shared winners and smaller prizes.
7. Compare V, plus any smaller-prize value you added from the prize chart, with the ticket price. The difference is the expected value sketch.

These [Lottery guides](/guides/topics/lottery) explain N on the [odds of winning the lottery](/guides/odds-of-winning-the-lottery) page and the withholding story on the [lottery taxes](/guides/lottery-taxes) page. The worksheet is the arithmetic. It is not a filing position.`,
    },
    {
      id: "worked-four-hundred",
      title: "Worked example: a $400 million headline at a 5 percent illustration",
      body: `The live calculator always starts with the published cash option. This example shows where a cash option comes from when you are practicing and the draw has not posted one.

Take a $400,000,000 annuity, 30 payments, each 5 percent larger than the last. The growth factor on the first payment is (1.05³⁰ − 1) / 0.05 ≈ 66.4388. First payment ≈ 400,000,000 / 66.4388 ≈ $6,020,574. Discount every payment at 5 percent and the step-up cancels: cash value ≈ 30 × $6,020,574 ≈ $180,617,220.

Now run the tax lines on that illustrated cash. They are examples.

W = 0.24 × 180,617,220 ≈ $43,348,133.

S = 0.05 × 180,617,220 ≈ $9,030,861.

H = 180,617,220 − 43,348,133 − 9,030,861 ≈ $128,238,226.

### Divide by the Powerball list

N = C(69, 5) × 26 = 11,238,513 × 26 = 292,201,338.

V = 128,238,226 / 292,201,338 ≈ $0.44.

A $2 ticket has about $0.44 of after-illustration jackpot value before smaller prizes and before a split. The fixed Powerball prizes add value on the order of $0.30 if the published chart is the one counted on the [Powerball odds](/guides/powerball-odds) page. You are still well short of $2. A bigger sign moves V. It does not cross the price in this row.

The payout algebra behind the 30 payments is the [lump sum vs annuity](/guides/lump-sum-vs-annuity) page. Use it when you are choosing how to be paid, and use this page when you are pricing a ticket you have not won.`,
    },
    {
      id: "reuse-table",
      title: "A table you can reuse, with the illustration labeled",
      body: `Each cash figure below is the 5 percent, 30-payment illustration: about 45.15 percent of the annuity headline, the same ratio as $135.5 million of cash on a $300 million sign. Replace the cash column with the real cash option whenever you have it. Withholding is 24 percent of that cash. State tax is an example 5 percent. Expected value is the after-those-two-lines cash, divided by 292,201,338, for one Powerball line, jackpot only.

| Annuity headline | Illustrated cash | 24% withholding | Example 5% state | Cash left | Jackpot-only EV |
| --- | --- | --- | --- | --- | --- |
| $100,000,000 | $45,154,305 | $10,837,033 | $2,257,715 | $32,059,557 | $0.11 |
| $200,000,000 | $90,308,610 | $21,674,066 | $4,515,431 | $64,119,113 | $0.22 |
| $400,000,000 | $180,617,220 | $43,348,133 | $9,030,861 | $128,238,226 | $0.44 |
| $800,000,000 | $361,234,442 | $86,696,266 | $18,061,722 | $256,476,454 | $0.88 |

| Input you must replace | Why the table is not enough |
| --- | --- |
| Published cash option | Interest rates move the real C off the 45 percent illustration |
| Your state rate | Some states take 0 percent. Some take more than 5 |
| Final federal rate | 24 percent withheld can be less than the return |
| Shared winners | A split divides H before you spend it, and V assumed you were alone |
| Smaller prizes | They add a few dimes of value on a $2 Powerball line, not dollars enough to close a $1 gap |
| Mega Millions N | Divide H by 290,472,336 instead of 292,201,338 |

Even the $800,000,000 row is about $0.88 of jackpot value after the example tax lines, plus a few dimes of fixed prizes, against a $2 price. This is not a green light. It is the worksheet showing the light is still red under these assumptions.`,
    },
    {
      id: "worked-breakeven",
      title: "Worked example: the cash level that matches a $2 ticket",
      body: `Ignore taxes, splits, and smaller prizes for one line of algebra. Jackpot-only value equals a $2 Powerball price when

C / 292,201,338 = 2.

C = 2 × 292,201,338 = $584,402,676.

That is the pre-tax cash option, not the annuity headline, at which the jackpot term alone equals the ticket price. You still have not been paid for the chance of sharing the prize with another winner.

Put 24 percent withholding back in, and still ignore state tax, splits, and smaller prizes. You need 0.76 × C / 292,201,338 = 2.

C = 584,402,676 / 0.76 ≈ $768,950,889.

So the cash option has to sit near $769 million before withholding-adjusted jackpot value alone covers $2, on the assumption you do not share and you do not owe federal tax beyond the 24 percent. Add a 5 percent example state tax and the keep fraction becomes 0.71. Then C = 584,402,676 / 0.71 ≈ $823,102,361. The annuity billboard would be larger still, because cash is only a fraction of the advertised sum.

### What the breakeven is for

It stops a false sentence: “the jackpot is over $500 million, so the ticket is worth it.” A $500 million annuity is not a $500 million cash option, and a $500 million cash option is not yet the after-tax breakeven in the line above. Recompute when the published C changes. Do not recompute by buying more lines. Twenty lines at the breakeven are twenty tickets of about $0 value each, not a ticket of positive value. Cost and coverage both scale.

Mega Millions uses 290,472,336, which is C(70, 5) × 24 = 12,103,014 × 24. The pre-tax cash that matches a $5 price, if that is the price on your ticket, is 5 × 290,472,336 = $1,452,361,680 before tax and splits. Confirm the price. The method does not care which game supplied N.`,
    },
    {
      id: "splits-and-annuity",
      title: "Shared prizes and the annuity checkbox",
      body: `The worksheet’s V assumes you are the only winner. Real jackpots split. If two tickets match, each cash share is about half, and V is about half, after you redo the tax lines on the smaller share. You cannot know the split in advance. You can refuse to treat V as a promise.

The annuity checkbox is a different mode. If you will take payments, do not put the billboard into line 2. Either run the worksheet on the cash option and remember you declined it, or discount the payment schedule at a rate you can defend and then tax each year’s payment. Mixing the annuity headline into the cash formula double-counts the future. The lump-sum guide shows one clean 5 percent schedule so you can see the two numbers side by side.

Smaller prizes belong in line 7 as an add-on, not inside N. N is the jackpot list. A $4 prize has its own way count. Add prize times probability for those rows, using the official chart, then subtract the ticket price once.

Expected value is an average over a list you will not live long enough to sample. A negative V does not mean you cannot win. A rare positive sketch does not mean you should buy a stack. Both statements fit in the same [expected value](/guides/expected-value-gambling) definition.`,
    },
    {
      id: "checklist",
      title: "Checklist for one honest pass through the worksheet",
      body: `Run this once per drawing you are tempted by. Then stop.

- C is copied from the official draw page, or clearly marked “5 percent illustration.”
- W is labeled withholding, not “the tax.”
- r is your state’s rate or an example you will not spend against.
- N matches the game: 292,201,338 for Powerball, 290,472,336 for the current Mega Millions matrix.
- You divided the after-tax cash, not the annuity headline.
- You noted that a shared jackpot cuts the result.
- You subtracted the real ticket price, including any add-on you actually buy.
- You did not buy a system, a wheel, or a due-number list because V moved.

Adults 18 and older. A calculator that tells you the ticket is a bad price is working. A calculator you override because the sign is exciting is not.`,
    },
    {
      id: "pvp-different-formula",
      title: "A PvP pot uses a different formula than this lottery calculator",
      body: `Do not feed a player pot into lines 1 through 7. There is no annuity headline and no 292-million list. On PVPspinArena the Jackpot chance is your contribution divided by the pot. If the draw is fair and the fee is zero, expected value of your stake is the stake: you might win the pot or lose it, and the probability weight returns your own money before a fee.

### A fee is a simpler subtraction

If a fee is posted, the pot you can win is smaller by that fee. That is the whole edge. It is not 24 percent withholding, and it is not a state lottery prize table. Withholding and income tax can still matter after you win, which is a reporting question, not a reason to reuse the jackpot worksheet.

Verify the round on [Fairness](/fairness). The pot is [Jackpot](/). A coin flip is priced from 1 in 2, not from C(69, 5). The site explains the games on [how it works](/how-it-works).

Use the lottery calculator on lottery tickets only. It will keep telling you the same uncomfortable thing: the combination count is huge, the cash option is smaller than the sign, and tax takes another slice. That is a reason to buy less. It is not a system. If the worksheet is becoming a ritual you run every draw night, use [responsible gambling](/responsible-gambling) instead of a sharper spreadsheet.`,
    },
  ],
  faqs: [
    {
      q: "How do I calculate a jackpot after taxes?",
      a: "Start with the published cash option, not the annuity headline. Multiply by 24 percent for a federal withholding estimate on a large prize, then by your state rate. Subtract both from the cash. The 24 percent is a prepayment, so a tax professional may tell you the final federal rate is higher. This worksheet is not tax advice, and rates change.",
    },
    {
      q: "What cash option should I type in?",
      a: "The cash option published for that drawing on the official game site. A rule of thumb such as half the billboard is a practice number. In the 5 percent, 30-payment illustration here, cash is about 45 percent of the annuity headline. Live interest rates move the real figure. If the site has not posted cash, you cannot finish the worksheet.",
    },
    {
      q: "How do I get the expected value of one ticket?",
      a: "Divide the after-tax cash by 292,201,338 for one Powerball line, or by 290,472,336 for one current Mega Millions line. That is jackpot-only value before shared winners. Add smaller prizes from the official chart, then subtract the ticket price. A result under zero is the usual outcome and is not a printing error.",
    },
    {
      q: "When is a Powerball ticket worth $2 on the jackpot alone?",
      a: "Before tax and before splits, the cash option has to be about $584 million, because 2 × 292,201,338 = 584,402,676. After 24 percent withholding and no other haircut, the cash option has to be about $769 million. The annuity sign is larger than cash. Shared winners push the level higher still.",
    },
    {
      q: "Does this calculator work for a PvP pot?",
      a: "No. A PvP pot has no annuity and no national combination list. Your chance is your stake divided by the pot. A zero-fee fair pot returns your stake in expected value. This worksheet is only for lottery cash options divided by lottery odds. Using it on a player pot will invent a fake edge or a fake loss.",
    },
  ],
  sources: [
    { label: "Powerball", url: "https://www.powerball.com/" },
    { label: "Mega Millions", url: "https://www.megamillions.com/" },
    { label: "IRS Topic 419, Gambling Income and Losses", url: "https://www.irs.gov/taxtopics/tc419" },
  ],
  related: [
    "lottery-taxes",
    "lump-sum-vs-annuity",
    "powerball-odds",
    "expected-value-gambling",
    "odds-of-winning-the-lottery",
  ],
  widget: "lottery",
  updated: "2026-10-06",
};
