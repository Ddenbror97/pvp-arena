import type { Guide } from "./types";

export const guide: Guide = {
  slug: "lump-sum-vs-annuity",
  cluster: "Lottery",
  keyword: "lump sum vs annuity",
  secondary: [
    "lottery cash option",
    "lottery annuity payments",
    "cash value vs jackpot",
    "lottery payout choice",
  ],
  title: "Lump Sum vs Annuity: Which Lottery Payout Is Better?",
  description:
    "Lump sum vs annuity compared with real numbers: taxes, investment returns and risks, so you can decide which lottery payout option fits you best.",
  h1: "Lump sum vs annuity on a real jackpot choice",
  answer:
    "Lump sum vs annuity is a choice you get only after a jackpot hit. The advertised jackpot is usually a stream of payments. The lump sum, or cash option, is the smaller amount the lottery would use to fund that stream. If a $300,000,000 annuity grew 5 percent a year for 30 payments, the first check is about $4,515,431 and a 5 percent discount puts the cash near $135.5 million. The live cash figure is whatever that draw publishes. Taxes apply either way. This is not a system, and it is not tax advice.",
  facts: [
    "The annuity headline is the sum of the payments, not the cash sitting in the prize pool.",
    "Powerball’s annuity is 30 payments that step up. Mega Millions also offers an annuity and a cash option.",
    "A 5 percent step-up over 30 payments has a growth factor of about 66.44 on the first payment.",
    "Federal withholding on a large prize is often 24 percent. That is not the final tax.",
    "The payout choice does not change the odds. One Powerball line is still 1 in 292,201,338.",
  ],
  sections: [
    {
      id: "two-names",
      title: "What the two payouts are",
      body: `Lump sum vs annuity is not a difference in who won. It is a difference in when the same win is paid.

The annuity is a schedule. For Powerball, the published structure is 30 annual payments, one now and the rest over the following years, with each payment larger than the last. Mega Millions also advertises an annuity jackpot and a cash option. The exact step-up and the number of payments are in the game rules. Read them for the draw you won, because a redesign can change the schedule even when the balls look familiar.

The lump sum is the cash option. It is the money available to fund those future checks, not a casual “half off” coupon. Interest rates move it. When rates are higher, the cash option is a larger share of the advertised annuity, because the lottery needs less cash today to buy the same future checks. When rates are lower, the cash share shrinks. The only cash number that matters is the one posted for that drawing.

These [Lottery guides](/guides/topics/lottery) are for adults who already understand that the ticket was a long shot. The choice shows up after the combination hits. It does not help you hit.`,
    },
    {
      id: "worked-annuity",
      title: "Worked example: a $300 million annuity at a 5 percent step-up",
      body: `This example uses a $300,000,000 advertised annuity, 30 payments, each 5 percent larger than the previous one. It is an illustration of the algebra. Your draw’s cash option is the figure the lottery prints, which will not match this illustration unless the funding rate happens to be 5 percent.

### The first payment

A payment stream P, 1.05P, 1.05²P, through 1.05²⁹P sums to

P × (1.05³⁰ − 1) / 0.05.

1.05³⁰ ≈ 4.32194. Subtract 1 to get 3.32194. Divide by 0.05 to get 66.4388.

P = 300,000,000 / 66.4388 ≈ $4,515,431.

Year 10, which is the 9th step-up, is about $4,515,431 × 1.05⁹ ≈ $7,004,915. The 30th payment is about $4,515,431 × 1.05²⁹ ≈ $18,586,124. Add all 30 and you return to $300,000,000. That addition is why the billboard can show a number nobody receives on day one.

### Discounting at the same 5 percent

If each payment is discounted at 5 percent, the step-up and the discount cancel, and today’s value is 30 × $4,515,431 ≈ $135,462,916. So a lump sum near $135.5 million funds a $300 million advertised annuity when the rate really is 5 percent. Use the published cash option for the real decision. Use this paragraph to see why the two headlines are not supposed to match.

The ticket that created the choice, if it was Powerball, was still 1 combination in C(69, 5) × 26 = 11,238,513 × 26 = 292,201,338. The payout switch does not edit that count.`,
    },
    {
      id: "side-by-side",
      title: "Side-by-side: cash now or checks for decades",
      body: `Put the illustration in one view, then hang the real decision on the published cash figure rather than on the $300 million sign.

| Question | Annuity in the example | Lump sum in the example |
| --- | --- | --- |
| Headline | $300,000,000 over 30 growing payments | About $135,462,916 if the rate is 5% |
| First cash you can touch | About $4,515,431 | The published cash option, after claim rules |
| Who invests | The lottery’s payment schedule | You, after tax |
| Dies or overspends | Remaining rules depend on the game and the state | The residual is yours to lose |
| Odds of having won | 1 in 292,201,338 on a Powerball line | Same ticket, same count |

| Year | Example payment |
| --- | --- |
| 1 | $4,515,431 |
| 10 | $7,004,915 |
| 30 | $18,586,124 |
| Sum of all 30 | $300,000,000 |

Nothing in either table raises your chance on the next draw. The tables start after you have already matched.

A cash option of $135 million against a $300 million sign is about 45 percent. People memorize “take half.” The live ratio moves with interest rates. Quote the draw’s cash option, then do the tax line. Rate details stay on the [lottery taxes](/guides/lottery-taxes) page so this page does not pretend to be the tax code. The present-value subtraction is the same kind of sum as [expected value](/guides/expected-value-gambling), applied to a schedule of checks rather than to a probability.`,
    },
    {
      id: "tax-changes-it",
      title: "Worked example: withholding on the cash illustration",
      body: `Taxes are why a pure interest-rate comparison is incomplete. Federal withholding on large lottery prizes is often 24 percent of the prize. Withholding is a down payment. The final federal bill can be higher once your bracket and other income are known. State tax may apply on top. Rates change. This is not tax advice.

On the $135,462,916 illustration:

24 percent withholding = 0.24 × 135,462,916 ≈ $32,511,100.

Cash left after that withholding line ≈ $102,951,816.

An example state tax of 5 percent, which is not your state unless your state says so, would be about $6,773,146. Subtracting both illustrations leaves about $96.2 million. Some states have no tax on this income. Some withhold their own percentage at claim time. Replace the 5 percent with the statute that applies to the ticket’s state, then ask a tax professional whether the federal 24 percent was enough.

### Annuity taxes do not vanish

Each annuity check is taxed in the year you receive it. You avoid a single giant bracket in year one, and you take the risk that rates, your residency, and your other income change for 30 years. The lump sum stacks more tax into the claim year and leaves you with a portfolio you can mismanage. Neither path is a secret discount. The [lottery taxes](/guides/lottery-taxes) page is where withholding and the leftover bill sit on top of this subtraction.

The combination count is still the reason the choice is rare. Mega Millions is 1 in 290,472,336 under the current matrix, from C(70, 5) × 24 = 12,103,014 × 24. You do not optimize a payout you almost certainly will not see.`,
    },
    {
      id: "invest-or-spend",
      title: "Investment return is the real argument, and it can fail",
      body: `If you take the lump sum and earn the same rate the annuity was built on, before tax and before spending, you have reconstructed the annuity yourself. The 5 percent illustration is that tie. You break the tie with things the formula does not know.

Spending is the common break. A person who will invade the principal does worse than a locked payment schedule. A person who will invest a diversified portfolio and live on a slice can do better than the annuity, especially when the lottery’s bonds yield less than a careful portfolio’s expected return. “Expected” is not “guaranteed.” A bad decade early in retirement can eat a lump sum that looked obvious on a spreadsheet.

The annuity can be the better product for someone who wants a payroll and does not want a second job as a family bank. The lump sum can be the better product for someone with real creditors, a short horizon, or the discipline and advice to invest. Gifts and business ideas belong after that choice, not before. Sign the ticket under your state's rule, then read the withholding arithmetic on [lottery taxes](/guides/lottery-taxes) before you spend the gross.

Estate rules differ. Some annuities continue to heirs under the game’s rule. Some stop or shrink. Read the rule for that game instead of assuming the remaining checks are automatically inheritable.`,
    },
    {
      id: "checklist",
      title: "Checklist before you pick lump sum vs annuity",
      body: `Decide with the published numbers, not with the billboard.

- Write the advertised annuity and the published cash option for this draw. Do not invent the cash figure from a rule of thumb.
- Ask a tax professional for federal and state tax on each path. Withholding at 24 percent is not the final federal number.
- Compare the after-tax cash with the after-tax payment stream, using a rate you can defend.
- Assume you might spend too much. If that assumption is true, the annuity’s lack of flexibility is a feature.
- Read what happens to remaining payments if you die.
- Decide residency questions before you claim, with a lawyer, if more than one state could tax the win.
- Ignore anyone who wants a fee to “time” the choice. The menu is already on the claim form.
- Remember the odds. This checklist is not a reason to buy more tickets.

Adults only, and only after a real win. Practicing the choice on an imaginary jackpot is fine. Funding that practice with rent money is not.`,
    },
    {
      id: "pvp-pays-the-pot",
      title: "A PvP pot pays the pot, not an annuity",
      body: `Lump sum vs annuity is a lottery claim form. PVPspinArena’s Jackpot does not offer a 30-year schedule. If you win a PvP pot, the prize is that pot, subject to any posted fee, paid as the game pays it. There is no advertised annuity sitting on top of a smaller cash value.

### Do not import the 45 percent shortcut

People hear that lottery cash is “about half” and then halve every prize they see. A player pot is already the money in the pot. Halving it again is a story from a different product. The lottery choice exists because the billboard adds up future checks. The PvP choice, such as it is, is whether to play.

Verify the round on [Fairness](/fairness). The game is [Jackpot](/). Taxes on gambling income, lottery or otherwise, still get reported. The form overview is [report gambling winnings](/guides/report-gambling-winnings), and it is not a substitute for advice on a jackpot claim.

Adults 18 and older. Choosing cash over an annuity does not create a way to beat the next draw.`,
    },
  ],
  faqs: [
    {
      q: "Is the lump sum always half the jackpot?",
      a: "No. The cash option is the amount needed to fund the annuity at current rates, so the percentage moves. In a 30-payment annuity that steps up 5 percent, a 5 percent discount produces a cash value near 30 times the first payment, about $135.5 million on a $300 million headline. Use the cash figure published for your draw.",
    },
    {
      q: "Which is better, lump sum or annuity?",
      a: "Neither wins for every winner. The lump sum is better when you will invest the after-tax cash at a return that beats the annuity’s built-in rate and you will not spend the principal. The annuity is better when a locked schedule protects you from yourself or from requests. Taxes, death rules, and the published cash number decide the rest.",
    },
    {
      q: "Are lottery annuity payments taxed?",
      a: "Yes. Each payment is generally taxed as income in the year you receive it. A lump sum is taxed in the claim year on the cash you took. Federal withholding of about 24 percent on a large prize is only a prepayment. Your final federal and state amounts can be higher. This is not tax advice.",
    },
    {
      q: "Does the payout choice change my odds?",
      a: "No. Lump sum vs annuity is a menu after you match. A Powerball line is still 1 in 292,201,338, from 11,238,513 white-ball sets times 26 red balls. Mega Millions is 1 in 290,472,336 on the current matrix. Buying more tickets to “earn” a smarter payout is just buying more tickets.",
    },
    {
      q: "Can my heirs keep the annuity?",
      a: "Sometimes, under that game’s rule and the state’s claim rule. Some schedules pay a beneficiary the remaining checks. Some treatments are less generous, and a lump sum you already received is simply part of your estate. Read the rule for the game you won and put the answer in a will with a lawyer.",
    },
  ],
  sources: [
    { label: "Powerball", url: "https://www.powerball.com/" },
    { label: "Mega Millions", url: "https://www.megamillions.com/" },
    { label: "IRS Topic 419, Gambling Income and Losses", url: "https://www.irs.gov/taxtopics/tc419" },
  ],
  related: [
    "lottery-taxes",
    "odds-of-winning-the-lottery",
    "powerball-odds",
    "expected-value-gambling",
    "report-gambling-winnings",
  ],
  updated: "2026-10-06",
};
