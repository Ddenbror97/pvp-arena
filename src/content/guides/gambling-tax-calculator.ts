import type { Guide } from "./types";

export const guide: Guide = {
  slug: "gambling-tax-calculator",
  cluster: "Foundations",
  keyword: "gambling tax calculator",
  secondary: ["tax on gambling winnings", "gambling winnings calculator", "estimate gambling tax"],
  title: "Gambling Tax Calculator: Estimate Tax on Your Winnings",
  description:
    "Free gambling tax calculator to estimate federal and state tax on casino, sports and crypto winnings, including losses and W-2G withholding.",
  h1: "Gambling tax calculator for a labeled illustration",
  answer:
    "Gambling tax calculator, on this page, means a worked illustration you can rerun. It uses $10,000 of wins, $4,000 of losses, and a 24% rate, and it labels every line as arithmetic, not as your return. Wins are the starting income figure. Losses reduce that figure only in the specific ways current law allows, and that law changes. Withholding is a prepayment, not the tax you owe. Adults 18+ only. This is not tax advice, legal advice, or financial advice.",
  facts: [
    "The illustration starts with $10,000 of wins and $4,000 of losses.",
    "If the full $4,000 were allowed against those wins, the net would be $6,000, and 24% of $6,000 is $1,440.",
    "A 90% loss cap, the kind described for 2026 Schedule A limits, would allow $3,600 and tax $6,400 at 24%, or $1,536.",
    "If no loss deduction is available, 24% of $10,000 is $2,400 in the same illustration.",
    "A 5% state rate on the $6,000 net is $300, and 5% is a teaching rate, not your state's rate.",
    "This page does not walk a W-2G line by line and does not file anything.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "What this gambling tax calculator is",
      body: `Gambling tax calculator here is a sheet of arithmetic with the assumptions written on the sheet. It is not software that files a return, not a form, and not a reading of your documents. You can replace the three inputs, wins, losses, and a rate you choose, and see how the product moves. You cannot replace a preparer or the year's IRS instructions.

The federal starting point, in general US terms, is that gambling winnings are income. [Reporting gambling winnings](/guides/report-gambling-winnings) is the page for that duty, including the fact that a missing form does not define the win away. Losses are a second step, and only for people who qualify to use them. [Gambling loss deduction](/guides/gambling-loss-deduction) covers itemizing and the limits that have been described for recent years, including a 2026 Schedule A cap discussed in IRS Publication 505. Re-read the publication. This calculator shows both a full-offset illustration and a 90% illustration so you can see the cap move the estimate. Congress changes these mechanics. A paragraph can go stale.

Adults 18+ only. This is not tax advice, legal advice, or financial advice. The page lives in [Foundations](/guides/topics/foundations). Crypto adds a dollar value at the time tokens move. That layer is [crypto gambling taxes](/guides/crypto-gambling-taxes). If the worksheet is really about chasing losses, stop and use [responsible gambling](/responsible-gambling). A deduction is not a reason to lose more.`,
    },
    {
      id: "full-offset",
      title: "Example 1: $10,000 of wins and $4,000 of losses",
      body: `Assumption A, labeled as an illustration and not as advice: you have $10,000 of gambling wins and $4,000 of gambling losses, and the law you are imagining allows the entire $4,000 to offset those wins. Nothing else is in the example. No other income, no standard-deduction interaction, no credits, no net investment tax.

Net under that assumption is $10,000 − $4,000 = $6,000. The rate in the illustration is a flat 24%, chosen because people recognize it as a bracket label, not because it is your bracket. Tax at that rate is 0.24 × $6,000 = $1,440.

Say the same steps with the stake visible. The $10,000 is income even though you also lost $4,000. The losses do not erase the wins from the story. They reduce the net only if a deduction is actually allowed. The $1,440 is 24% of the net, not 24% of the losses and not a bill from this website.

If your wins were $2,000 and your losses were still $4,000, you would not get to invent a −$2,000 gambling income figure. Deductible losses, when they exist, stop at the winnings. The unused $2,000 does not become a refund in this illustration. That ceiling is why a calculator that subtracts losses from wins with no cap will overstate the benefit whenever losses are the larger number.

Write your own wins in place of $10,000 and your own losses in place of $4,000. Keep Assumption A visible at the top of the note. The moment the law does not allow the full loss, you are in the next section, not in this product.`,
    },
    {
      id: "limits",
      title: "Losses are deductible only in specific ways",
      body: `Current federal rules, as the IRS describes them for casual gamblers, do not treat losses as a free subtraction on the way to a hobby. Winnings are reported as income. A loss deduction, if you get one, generally lives on the itemized-deduction path, cannot exceed gambling winnings, and has been subject to further limits. Publication 505's 2026 language, as discussed on our loss-deduction guide, limits the Schedule A gambling-loss deduction to the lesser of 90% of losses or the winnings. Confirm that sentence against the publication for the year you file. This page repeats it so the illustration can show the difference, not so you can skip the PDF.

Example 2 applies that 90% figure to the same dollars, still as an illustration. Ninety percent of $4,000 is 0.90 × $4,000 = $3,600. The lesser of $3,600 and the $10,000 of winnings is $3,600. Net becomes $10,000 − $3,600 = $6,400. At the same flat 24%, 0.24 × $6,400 = $1,536. The cap costs $96 relative to the $1,440 full-offset line, because $1,536 − $1,440 = $96. Ninety-six dollars is not your result. It is what this pair of assumptions does to these inputs.

A third branch belongs in the same breath. If you take the standard deduction and no separate gambling-loss deduction is available, the illustration taxes the $10,000 of wins with no offset. 0.24 × $10,000 = $2,400. The gap between $1,440 and $2,400 is the entire value of Assumption A. If Assumption A is false for you, the lower number is fiction.

Professional-gambler status is a different analysis. This calculator will not assign it to you. State conformity is a different analysis too. Some states start from federal income and some do not.`,
    },
    {
      id: "state-and-withholding",
      title: "A teaching state rate, and withholding versus tax",
      body: `State tax is real and local. This gambling tax calculator will not apply one state rate as if it were the country's. To see the shape, use a teaching 5%. Five percent of the $6,000 full-offset net is 0.05 × $6,000 = $300. Added to the federal illustration of $1,440, the combined teaching total is $1,740. If you are in the 90% branch, 5% of $6,400 is $320, and $1,536 + $320 = $1,856. Replace 5% with your state's actual rate, or with zero if a preparer tells you the income is not taxed there. Do not replace it with a number from a forum.

Withholding is a different column. Some gambling wins are reported on Form W-2G, and some of those have federal income tax withheld. This page is not a W-2G manual. It will not list box numbers, thresholds, or which games trigger a form. The IRS publishes that. The only calculator point is that withheld money is a prepayment toward the tax, not the definition of the tax.

Suppose, as a further illustration, that $2,400 had been withheld on the $10,000 of wins, a flat 24% of the gross. In the full-offset illustration the computed tax was $1,440, so the withholding would exceed that illustration by $2,400 − $1,440 = $960. You would be looking at a possible refund of withholding, not at a $2,400 final bill, and only inside these assumptions. In the no-deduction branch the illustration tax is $2,400, and the same withholding would match it with nothing left over. The form did not know which branch you are in. That is why the calculator and the form answer different questions.

[Reporting gambling winnings](/guides/report-gambling-winnings) is where the reporting duty is spelled out. Come back here only for the multiplication.`,
    },
    {
      id: "crypto",
      title: "Crypto winnings need a dollar value first",
      body: `The illustrations above are in dollars. A crypto win is not a number of tokens until you value it. [Crypto gambling taxes](/guides/crypto-gambling-taxes) is the longer version: record the asset, the time, and the dollar value when the credit hits. A 100 USDC credit near one dollar is about $100 of win. A token that moves in price can be a gambling result and a separate property result. This calculator will not net "the coin went up" into the gambling line.

Put valued dollars into the same three inputs. If your diary says $10,000 of valued wins and $4,000 of valued losses, you are back in Example 1, with the same warning that the $4,000 may not all be deductible. Deposits are not losses. Withdrawals are not wins. A session that starts at $200 and ends at $140 is not a $140 win. The movement is the candidate for the diary, and a preparer decides what the movement is on a form.

PVPspinArena can show a ledger for Jackpot, Coinflip, and Roulette. It does not compute this tax and it does not issue a completed return. Export the ledger, value the tokens, and take the folder to a qualified preparer with Publication 525, Publication 529, and Topic 419 open. If the ledger is in a token, write the dollar beside each line before you type anything into the $10,000 slot.

Do not run the 24% rate on a token count. Twenty-four percent of 10,000 tokens is not a tax. Twenty-four percent of the dollar value, under a stated assumption about deductions, is the illustration.`,
    },
    {
      id: "table",
      title: "The illustration in one table",
      body: `Every figure below uses $10,000 of wins, $4,000 of losses, a flat 24% federal illustration, and, where noted, a fake 5% state rate. Change the inputs and redo the multiplication. Do not change the inputs and keep these outputs.

| Line | Illustration |
| --- | --- |
| Wins treated as income | $10,000 |
| Losses you hope to use | $4,000 |
| Net if the full loss were allowed | $6,000 |
| 24% of that $6,000 | $1,440 |
| Deduction if only 90% of losses count | $3,600 |
| Net on that 90% branch | $6,400 |
| 24% of that $6,400 | $1,536 |
| 24% of $10,000 if no loss deduction | $2,400 |
| Teaching 5% state tax on $6,000 | $300 |

| This calculator | What it will not do |
| --- | --- |
| Multiplies a rate you choose by a net you label | Tell you your bracket |
| Shows a 90% cap as a separate branch | Replace Publication 505 |
| Treats withholding as a prepayment | Fill in a W-2G |
| Accepts dollar values of crypto wins | Value the tokens for you |
| Points at IRS Topic 419 | Act as a preparer |

The second table is the scope. If you need a cell it refuses, you need the IRS page or a qualified professional, not a longer blog.`,
    },
    {
      id: "hashed-pot",
      title: "A hashed pot is still income if it pays you",
      body: `The product does not pick the tax. A hashed player-versus-player pot and a casino game can both produce a win that belongs in the income line of this illustration. On [Jackpot](/), players fund a pot, a fee is taken when the round settles, and a committed seed picks a ticket. If you are paid, the dollar amount is a candidate for the wins column. If you lose the buy-in, it is a candidate for the losses column, subject to every limit above. The hash does not create an exemption.

[Fairness](/fairness) lets you recompute the draw. That check is about whether the ticket matches the commit. It is not a tax record by itself, though the published round can sit beside your ledger as evidence of the result. PVPspinArena is not a tax preparer. Jackpot, Coinflip, and Roulette, funded with USDC or ETH on Base, are the games. This guide states no average win and no fee percent.

Checklist before you trust an estimate:

- List wins and losses in dollars, with dates.
- Value crypto when it hits, not when you feel like exporting.
- Mark whether you are assuming a full offset, a 90% cap, or no deduction.
- Use a rate you can point to, and label a state rate you invented.
- Treat any W-2G withholding as a prepayment. Do not rebuild the form here.
- Hand the note to a preparer before you call the result a bill or a refund.

Adults 18+ only. Not tax advice, legal advice, or financial advice.`,
    },
  ],
  faqs: [
    {
      q: "How does this gambling tax calculator treat $10,000 and $4,000?",
      a: "As an illustration. If the full $4,000 of losses were allowed, net income is $6,000 and 24% of that is $1,440. If only 90% of losses were allowed, the deduction is $3,600, the net is $6,400, and 24% is $1,536. If no deduction is available, 24% of $10,000 is $2,400. Not tax advice.",
    },
    {
      q: "Can you always deduct gambling losses from winnings?",
      a: "No. Casual-gambler losses, when deductible, generally require the itemized path, cannot exceed winnings, and have been subject to further limits such as the 90% Schedule A cap described for 2026. The law changes. Read Topic 419, Publication 529, and Publication 505, then ask a preparer.",
    },
    {
      q: "Does W-2G withholding equal the tax you owe?",
      a: "No. Withholding is a prepayment. This page is not a W-2G manual and does not list thresholds. In the illustration, $2,400 withheld against a $1,440 full-offset tax would leave $960 of extra prepayment. On the no-deduction branch, $2,400 withheld matches the $2,400 illustration. Your branch may be neither.",
    },
    {
      q: "How should a state tax rate be entered?",
      a: "Not as a national number. A teaching 5% on the $6,000 net is $300, and 5% is not your state. Some states tax gambling income, some start from federal income, and some do not match the federal loss rules. Use your rate or zero only after a preparer confirms it.",
    },
    {
      q: "Does a Jackpot win go in the calculator?",
      a: "A dollar win is a candidate for the wins line, and a lost buy-in is a candidate for the losses line, under the same limits as any other gambling result. Fairness checks the draw. It does not compute tax. PVPspinArena does not file your return. Adults 18+ only.",
    },
  ],
  sources: [
    { label: "IRS Topic 419, Gambling income and losses", url: "https://www.irs.gov/taxtopics/tc419" },
    { label: "IRS Publication 525", url: "https://www.irs.gov/publications/p525" },
    { label: "IRS Publication 529", url: "https://www.irs.gov/publications/p529" },
    { label: "IRS Publication 505", url: "https://www.irs.gov/publications/p505" },
  ],
  related: [
    "report-gambling-winnings",
    "gambling-loss-deduction",
    "crypto-gambling-taxes",
    "expected-value-gambling",
  ],
  widget: "gambling-tax",
  updated: "2026-10-06",
};
