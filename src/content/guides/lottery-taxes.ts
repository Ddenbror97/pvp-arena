import type { Guide } from "./types";

export const guide: Guide = {
  slug: "lottery-taxes",
  cluster: "Lottery",
  keyword: "lottery taxes",
  secondary: [
    "lottery winning tax",
    "federal withholding lottery",
    "state tax on lottery",
    "how much tax on lottery winnings",
  ],
  title: "Lottery Taxes: How Much You Keep After Federal and State",
  description:
    "Find out how lottery winnings are taxed: federal withholding, state rates, lump sum vs annuity impact and a worked example of what you really keep.",
  h1: "Lottery taxes are withholding plus a final bill",
  answer:
    "Lottery taxes start with a simple fact: lottery prizes are taxable income. On a large prize, the payer often withholds 24 percent for federal tax before you see the check. That 24 percent is withholding, not the final bill. Your return can owe more, or in thinner cases less, once your bracket and other income are counted. States may tax the same prize or not tax it at all. Rates change. This page is not tax advice and it is not a Form W-2G manual.",
  facts: [
    "Federal withholding on large lottery prizes is often 24 percent. Withholding is a prepayment.",
    "The final federal tax depends on your return for that year, not on the withholding rate alone.",
    "Some states tax lottery prizes and some do not. A few withhold state tax at claim time.",
    "A prize of $5,000 or under often misses the federal withholding threshold and can still be taxable.",
    "The form that reports many gambling prizes is covered on the report-gambling-winnings guide, not here.",
  ],
  sections: [
    {
      id: "income",
      title: "Lottery prizes are income",
      body: `Lottery taxes exist because a prize is income, not a gift from the state. IRS Topic 419 treats gambling winnings, including lottery prizes, as taxable. You report them even when a form is late or, for a small prize, never arrives. The form itself, when a payer must issue one, is explained on the [report gambling winnings](/guides/report-gambling-winnings) page. This guide stops at the lottery arithmetic: what is withheld, what may still be due, and why the gross prize is the wrong number to spend.

### What this is not

This is not tax advice, not a preparation checklist for a return, and not a prediction of brackets in a future year. Congress changes rates. States change rates. A prize claimed in January sits on a different return from a prize claimed in December. Use the current IRS publications and a tax professional who will sign the return with you.

These [Lottery guides](/guides/topics/lottery) also refuse the fantasy that tax planning raises your chance of winning. A Powerball line remains 1 in 292,201,338 whether you understand withholding or not.`,
    },
    {
      id: "withholding",
      title: "Federal withholding of 24 percent is not the tax",
      body: `On lottery prizes large enough to trigger federal withholding, the rate you will hear is 24 percent. The usual threshold people plan around is a prize over $5,000. The payer sends that slice to the IRS under your tax identity and pays you the rest. You then file a return. If your real federal tax on that income is higher than 24 percent, you owe the difference. If it is lower, you may be due a refund of part of the withholding. High prizes land in high brackets more often than they land under 24 percent, which is why winners who spend the post-withholding check still get a bill.

| Line on a large prize | What it is |
| --- | --- |
| Gross prize | The cash you won, or the annuity payment you received this year |
| 24 percent withheld | A prepayment, often taken before the check |
| Tax on your return | Bracket, other income, and current law |
| Extra due or refund | Return tax minus withholding |

Confirm the threshold and the rate in the current IRS instructions. Calling 24 percent “the lottery tax” is the expensive version of this topic.

State withholding is a second pipe. Some lotteries withhold state income tax as well. Some do not, and you still owe the state when you file. A state with no income tax may still be the wrong place to assume zero if you live elsewhere or if the ticket was bought under another state’s rules. Residency is a lawyer’s question when the sums are large.`,
    },
    {
      id: "worked-ten-million",
      title: "Worked example: a $10 million cash prize",
      body: `Use a $10,000,000 cash option. The figures are arithmetic on stated assumptions. They are not your assessment.

Federal withholding at 24 percent = 0.24 × 10,000,000 = $2,400,000.

Check after that withholding = $7,600,000.

Suppose, as an example only, the final federal rate that applies to this prize on your return is 37 percent. The federal tax would be 0.37 × 10,000,000 = $3,700,000. You already prepaid $2,400,000, so the extra federal amount in this example is $1,300,000. Cash left after that example federal total, and before state tax, is $6,300,000.

### Add an example state

A flat example state rate of 5 percent is 0.05 × 10,000,000 = $500,000. Subtract it and the illustration keeps $5,800,000. A state rate of 0 percent keeps the $6,300,000. A state rate of 8 percent takes $800,000 and keeps $5,500,000 before any local tax or any deduction a professional can actually use. Do not stack these as a national rule. Pick the row your state statute supports, then let a preparer replace the 37 percent example with the bracket that is law for that tax year.

| Example state rate | State tax on $10,000,000 | Left after example 37% federal and this state line |
| --- | --- | --- |
| 0% | $0 | $6,300,000 |
| 5% | $500,000 | $5,800,000 |
| 8% | $800,000 | $5,500,000 |

The combination that makes a prize this size rare is unchanged by the table. Powerball’s match-every-ball list is C(69, 5) × 26 = 11,238,513 × 26 = 292,201,338. The $1,000,000 fixed tier for five white balls and a wrong Powerball is only 25 of those ways, and a prize at that size is already in withholding territory if the published dollar amount still applies. Confirm the prize card, then confirm the tax.`,
    },
    {
      id: "small-prizes",
      title: "Worked example: $4,000 versus $10,000",
      body: `Withholding and tax are not the same gate.

A $4,000 prize sits under a $5,000 federal withholding threshold. In the ordinary case nobody withholds 24 percent at the counter. The $4,000 can still be taxable income on your return. Spending it as “tax free because they didn’t take anything” is how a small win becomes a spring surprise.

A $10,000 prize is over that threshold. Withholding at 24 percent = 0.24 × 10,000 = $2,400. You might be handed $7,600. The return still computes the real tax. For some households $2,400 is more than enough. For others it is not. Topic 419 is the IRS page to read beside your preparer, not a substitute for one.

### Annuity checks repeat the problem

On the 5 percent illustration from the payout guide, a $300,000,000 advertised annuity starts with a payment near $4,515,431. Withholding at 24 percent of that one check is about 0.24 × 4,515,431 ≈ $1,083,703, leaving about $3.4 million of that payment before state tax and before the final return. The next year’s larger check is a new income event. You do not withhold the whole annuity on day one unless you took the cash option instead.

Choose the annuity and each year’s payment is income that year. A 30-year schedule can keep a single year’s bracket lower than a lump sum of the whole cash option, and it can also keep you exposed to rate changes for decades. The payout comparison, before this tax layer, is the [lump sum vs annuity](/guides/lump-sum-vs-annuity) page. The definition of prize times probability, before this tax layer, is [expected value](/guides/expected-value-gambling). Losses and how they interact with wins are a different, narrower topic on the [gambling loss deduction](/guides/gambling-loss-deduction) page. Crypto-site wins are not lottery tickets; their reporting notes are on [crypto gambling taxes](/guides/crypto-gambling-taxes).`,
    },
    {
      id: "lump-versus-checks",
      title: "How the payout choice hits the return",
      body: `Lottery taxes follow the cash you receive in the tax year.

Take the lump sum and the cash option, minus whatever was withheld, lands mostly in one year. That is the year your bracket cares about. Take the annuity and you spread receipts. You do not erase tax. You reschedule it. A winner who moves states between payments may change the state column. A winner who dies may change who reports the remaining payments. Those are planning facts for the claim week, which is why the first calls are a tax professional and a lawyer, not a car dealer.

Nonresidents sometimes owe tax to the state that sold the ticket and also have a home-state return. Credits between states exist in some pairs and not in others. Do not assume the selling state’s withholding satisfied your home state.

Charitable gifts, income timing, and the legal name of the claimant can change the picture. They cannot change it after you have cashed and spent the gross. Park the money until the return is sketched. The order of those steps is [what to do if you win the lottery](/guides/what-to-do-if-you-win-the-lottery), not a second copy of the rate table.`,
    },
    {
      id: "checklist",
      title: "Checklist before you spend past the withholding",
      body: `Keep the gross, the withholding, and the guess far apart.

- Write the gross prize and the amount actually withheld. The difference is not your spendable fortune until the return is drafted.
- Read IRS Topic 419 and the current withholding instructions, or have your preparer do it.
- Identify every state that might tax the ticket, including where you live and where you bought it.
- Replace any 37 percent or 5 percent example on this page with the rates that apply to your year.
- If the prize is under the withholding threshold, still ask whether it is taxable income.
- If you won in a pool, agree who reports what before anyone deposits the check. The form guide covers the paperwork.
- Do not pay a stranger a cut to “lower the lottery tax” with a story. Fees to licensed professionals are enough.
- Remember you almost certainly will not need this page. The jackpot list is hundreds of millions long.

Adults only. Tax literacy is not an edge against the draw.`,
    },
    {
      id: "pvp-still-income",
      title: "A PvP pot is not exempt from the income idea",
      body: `PVPspinArena is not a state lottery and does not run lottery withholding. A PvP Jackpot still can be gambling income if you win a pot. Topic 419 is about gambling winnings, not about one brand of ticket. What this site will not do is invent a tax rate, issue legal advice, or show you a fake W-2G walkthrough.

### Different cashier, same reason to ask

A state lottery often withholds because it is a payer with a rulebook and a large prize. A player pot may not withhold anything, which does not mean the win is invisible on a return. That gap is why people get surprised. Read the reporting guide, then talk to a professional about your facts. Crypto casinos raise extra unit questions; the lottery prize in this article is dollars from a state draw.

Check a finished round on [Fairness](/fairness) if the win you are staring at is a PvP pot. The game is [Jackpot](/). Neither page is the IRS, and neither page changes lottery taxes on a Powerball claim.

Adults 18 and older. Knowing the 24 percent line is not a reason to buy more combinations.`,
    },
  ],
  faqs: [
    {
      q: "How much federal tax is withheld from a lottery jackpot?",
      a: "Large lottery prizes are often withheld at 24 percent for federal tax. On a $10,000,000 cash prize that is $2,400,000 withheld and $7,600,000 paid, before state tax. The 24 percent is a prepayment. Your return may show a higher federal amount. Confirm the current rate and the $5,000-style threshold, because rules change. This is not tax advice.",
    },
    {
      q: "Do all states tax lottery winnings?",
      a: "No. Some states have no income tax on a lottery prize, and some tax it at ordinary state rates. A few withhold state tax when you claim. Where you live and where the ticket was sold can both matter. Check that state’s lottery site and a tax professional. Do not rely on a national average.",
    },
    {
      q: "Is a small lottery prize tax free if nothing was withheld?",
      a: "Not automatically. A prize under the federal withholding threshold, such as a $4,000 win in the ordinary case, may still be taxable income under Topic 419. Withholding is a collection method. The tax is whatever your return computes. Keep the ticket and the payout record anyway.",
    },
    {
      q: "Does the annuity lower lottery taxes?",
      a: "It changes the year the income arrives. Each annuity payment is generally taxed when you receive it, so you may avoid putting the entire cash option into one bracket. You do not get a special lottery rate. Future law and future residency can change later payments. Compare after-tax paths, not gross headlines.",
    },
    {
      q: "Where do I learn about Form W-2G?",
      a: "On the report gambling winnings guide, and on the IRS page about Form W-2G. This article does not walk through that form. A lottery payer often issues information returns when prizes cross the IRS thresholds. Receiving a form, or not receiving one, does not by itself decide whether the prize is income.",
    },
  ],
  sources: [
    { label: "IRS Topic 419, Gambling Income and Losses", url: "https://www.irs.gov/taxtopics/tc419" },
    { label: "IRS — About Form W-2G", url: "https://www.irs.gov/forms-pubs/about-form-w-2g" },
    { label: "Powerball", url: "https://www.powerball.com/" },
  ],
  related: [
    "report-gambling-winnings",
    "lump-sum-vs-annuity",
    "expected-value-gambling",
    "gambling-loss-deduction",
    "crypto-gambling-taxes",
  ],
  updated: "2026-10-06",
};
