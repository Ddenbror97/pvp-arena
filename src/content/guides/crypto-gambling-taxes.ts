import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-gambling-taxes",
  cluster: "Foundations",
  keyword: "crypto gambling taxes",
  secondary: [
    "gambling winnings tax",
    "crypto casino taxes",
    "report gambling income",
    "irs gambling",
  ],
  title: "Crypto Gambling Taxes: Records, Wins and Common Traps",
  description:
    "Crypto gambling taxes in general US terms: records, wins versus deposits, token price at credit, and why this is not personal tax advice.",
  h1: "Crypto gambling taxes: records, wins and common reporting traps",
  answer:
    "Crypto gambling taxes, in general US terms, start with a record of every deposit, withdrawal, credit and result, plus the dollar value of the token at the time it moved. Winnings are usually income; deposits are not.",
  facts: [
    "The IRS treats gambling winnings as taxable income for casual gamblers and says you must report them even without a Form W-2G.",
    "Gambling-loss deductions, if allowed at all, generally require itemizing and cannot exceed reported winnings; 2026 rules also cap the Schedule A deduction at 90% of losses.",
    "Crypto is treated as property for federal tax purposes, so moving a token can be a separate reporting event from the gambling result.",
    "A deposit is not a win; a credit after a winning round, valued in dollars at that time, is the usual starting point for a gambling record.",
    "PVPspinArena is not a tax preparer and does not tell you how to file.",
  ],
  sections: [
    {
      id: "scope",
      title: "Scope, age and a hard disclaimer",
      body: 'It is not legal advice, not tax advice, and not a filing kit. Tax law changes, states add their own rules, and your facts — residency, whether you are a casual gambler, whether you itemize — can flip the result. Read the current IRS pages and talk to a qualified professional who has your numbers.\n\nIf you live outside the United States, stop treating this as your rulebook. Other countries tax gambling, crypto or both differently, and some do not tax certain domestic casino wins. "I used a wallet" does not pick a jurisdiction for you.\n\nSee [foundations](/guides/topics/foundations) and [crypto casino](/guides/what-is-a-crypto-casino) and [USDC casino](/guides/usdc-casino). If gambling is already costing more than a tax worksheet, use the [responsible gambling page](/responsible-gambling) and the [how to stop gambling guide](/guides/how-to-stop-gambling) first. A clean spreadsheet is not a reason to keep playing.\n\nPVPspinArena offers Coinflip, Roulette, P2P Slott, six-max poker, and Jackpot settled in US dollars. We can describe how our ledger looks. We cannot tell you the line on your Form 1040.',
    },
    {
      id: "income",
      title: "What the IRS generally says about gambling income",
      body: "IRS Topic 419 says casual gamblers must report gambling winnings as income. That includes cash and the fair market value of prizes. You report winnings on Form 1040 (Schedule 1), including amounts that never appeared on a Form W-2G. A W-2G is an information return a payer issues in some situations; it is not the definition of a win.\n\nA crypto casino may never send you a W-2G. That does not make the win invisible. The usual federal idea is still: if you had gambling winnings, they belong on the return.\n\n### Losses are a different door\n\nTopic 419 and Publication 529 describe loss deductions for casual gamblers who itemize on Schedule A, keep records, and deduct losses only up to reported winnings. You do not net them on Schedule 1 and report the difference as if it were a single number. Publication 505 (2026) also states that, beginning in 2026, the Schedule A gambling-loss deduction is limited to the lesser of 90% of gambling losses or your gambling winnings.\n\nLegislation can change that cap. Do not freeze a blog post as law. Check the year's Publication 505 and Schedule A instructions, or ask a professional.\n\nNone of the above decides whether your on-chain transfers are also digital-asset dispositions. That is the next trap.",
    },
    {
      id: "crypto",
      title: "The extra crypto layer: property, basis and FMV",
      body: 'The IRS has long treated convertible virtual currency as property. Disposing of it — selling, exchanging, or sometimes spending it — can be a capital gain or loss measured from your basis to fair market value at the time of the disposal. Gambling and property rules can stack. A professional has to map your facts; this paragraph only flags the stack.\n\n### Practical meaning for a casino trip\n\n- Buying USDC with dollars may be a simple purchase if you pay $1 and receive a $1 token, but keep the receipt.\n- Sending USDC to a casino is a transfer of property. Whether that transfer is a taxable disposal depends on facts and current guidance; do not guess from a tweet.\n- A win credited in ETH when ETH is $3,400 is not the same dollar fact as the same ETH amount a week later.\n- Withdrawing back to a wallet, then selling for dollars, can be another property event.\n\nStablecoins reduce price noise while you play, which is why a USDC balance is easier to journal than an ETH-denominated one. They do not delete the need for records. Our [USDC casino guide](/guides/usdc-casino) explains the product, not the tax lot.\n\n### Why two timestamps beat one memory\n\nA session can contain a deposit, several rounds and a later withdrawal. The gambling diary wants the session result in dollars. The property diary wants FMV when tokens moved. If you only write "I took out 0.05 ETH in March", you have lost the April-usable price.\n\nUse one FMV source for the year — a daily close or the spot at the txid — and document it. Switching sources to pick the nicer number is how a diary becomes an argument.',
    },
    {
      id: "records",
      title: "Records worth keeping — and a worked dollar example",
      body: 'Publication 529 tells casual gamblers to keep a diary of winnings and losses and to hold statements, tickets or other proof. For crypto, add chain data.\n\nWrite down, per session or per day at minimum:\n\n- Date and site.\n- Token and network.\n- Deposit txid, amount and USD fair market value at credit.\n- Withdrawal txid, amount and USD FMV at receipt.\n- Session result as the site shows it (won / lost in account units).\n- Screenshots or CSV exports of the ledger if the site offers them.\n\n### Worked example (illustrative only)\n\nOn 12 March you deposit 100 USDC on Base when USDC is $1.00. The casino credits $100.00. You play [Jackpot](/) and [Coinflip](/coinflip). At 18:00 the ledger shows $142.00. You withdraw 142 USDC. USDC is still $1.00.\n\nA simple gambling diary line might read: deposits $100, withdrawals $142, session gambling result +$42. That +$42 is the kind of figure people discuss with a preparer as gambling winnings for the session. It is not a prepared return.\n\nChange the token to 0.04 ETH deposited when ETH is $3,000 ($120) and 0.05 ETH withdrawn when ETH is $3,200 ($160). You now have a gambling story and a price-move story in the same 0.01 ETH. Do not collapse them into one mental number. That collapse is a common trap.\n\nIf you use ETH on PVPspinArena, the site still shows a dollar balance internally. Your own records should still store the token amounts and timestamps from the chain.\n\n### A second session, same trap\n\nOn 4 April you deposit 80 USDC ($80). You play [Roulette](/roulette) and leave $54 overnight, then withdraw 54 USDC ($54). The diary is not "$54 withdrawn"; it is closer to −$26 if those were the only movements. A forgotten extra deposit makes that number fiction. Keep the site export next to the explorer, then ask a preparer how those facts map to a form.',
    },
    {
      id: "traps",
      title: "Common reporting traps",
      body: 'These mistakes show up constantly. They are still not a substitute for advice.\n\n- **Calling a deposit a win.** Money you sent in is not income.\n- **Calling a withdrawal a win.** A withdrawal can be your own money coming back.\n- **Netted silence.** "I lost overall, so I report nothing" is not how Topic 419 describes casual-gambler winnings.\n- **Ignoring FMV.** An ETH credit must be valued in dollars at a reasonable time stamp, not at whatever price you remember in April.\n- **No diary.** Loss deductions, where they exist, need records. A vibe is not a diary.\n- **Assuming no W-2G means no tax.** Many crypto sites will never issue one.\n- **Mixing countries.** A VPN does not relocate your tax home.\n- **Software that only tracks DEX swaps.** Casino IOUs and off-chain credits may never hit that CSV.\n\nA [gambling budget](/guides/gambling-budget) is a spending tool. It is also the raw material of a diary: if you cannot afford to lose it, you should not need a Form 1040 line for it.',
    },
    {
      id: "2026",
      title: "2026 loss-deduction language and why to re-read it",
      body: 'For the 2026 tax year, IRS Publication 505 states that the Schedule A gambling-loss deduction is limited to the lesser of 90% of your gambling losses or your gambling winnings. Combined with the long-standing "losses only up to winnings" idea, a casual itemizer can be left with taxable income even if the year\'s cash gambling result was roughly flat.\n\nCongress has also debated restoring a full offset. Bills move. The only safe sentence is: read the instructions for the year you are filing, including Publication 505 and Schedule A, or have someone licensed do it.\n\nIf that 90% figure would make a hobby suddenly expensive, that is an argument for a smaller hobby, not for creative journaling. Do not invent a "professional gambler" status to chase a different set of rules unless a professional has actually analysed your activity.',
    },
    {
      id: "next",
      title: "Records to prepare before filing",
      body: "Export what you can. Keep txids. Value tokens when they move. Separate deposits from results. Then take the folder to a human who files returns for a living, including any state return.\n\nPVPspinArena can show you a dollar ledger and on-chain deposits on Base. Use [how it works](/how-it-works) to understand credits and withdrawals. If the map suggests you have been playing bigger than your records can support, shrink the play or stop. Taxes are not the only cost of a bad month, and they are a terrible reason to chase.\n\nA [USDC casino](/guides/usdc-casino) keeps more of the dollar column boring. ETH on the same site still needs a price stamp when it is credited and when it leaves. Do not copy a streamer’s spreadsheet.\n\nIf the records already show harm — hiding sessions, chasing, borrowing — stop before you optimize a form. Use [how to stop gambling](/guides/how-to-stop-gambling) and the [responsible gambling](/responsible-gambling) page. A neat folder of txids is not a reason to keep depositing.\n\nA plain worksheet for wins, losses, and a rate you type in is the [gambling tax calculator](/guides/gambling-tax-calculator). It is an illustration, not a filing.",
    },
    {
      id: "example",
      title: "Worked example: one week, two tokens",
      body: "Numbers below are a teaching story, not a filing position.\n\nSunday you buy 400 USDC for $400 and send it to a casino on Base. That send is a deposit, not a win. Tuesday a pot credits you 80 extra USDC. You now have 480 USDC on the site. Wednesday you withdraw 480 USDC. The gambling result people mean by “win” is the 80, not the 480. Thursday you also withdraw 0.05 ETH that you won on a different night. You note the dollar bid at the minute of credit and again when you later swap the ETH.\n\n| Event | Token | Gambling story | Extra clock |\n| --- | --- | --- | --- |\n| Deposit 400 USDC | USDC | Not a win | Usually little price noise |\n| Pot +80 USDC | USDC | Possible win of 80 | Still ~$1 |\n| Withdraw 0.05 ETH | ETH | Possible win | FMV at credit and at swap |\n\nA [what is a crypto casino](/guides/what-is-a-crypto-casino) balance can sit off-chain between those rows. Your diary still needs the credit time. This remains not personal tax advice. Take the table to a professional if the dollars matter.\n\nPlayer winnings and operator duty are different questions, and a wallet company is a third one. [Gambling tax in the UK](/guides/gambling-tax-uk) follows HMRC's published line on casual play. [Gambling loss deductions](/guides/gambling-loss-deduction) are a US records question. [Whether MetaMask reports to the IRS](/guides/does-metamask-report-to-irs) is about the wallet, not about a casino form.\n\nSee also: [Form W-2G explained](/guides/w2g-form).",
    },
  ],
  faqs: [
    {
      q: "Do I have to report crypto casino winnings in the US?",
      a: "The IRS says casual gamblers must report gambling winnings as income, including amounts not shown on a W-2G. Whether your facts count as winnings is something to confirm with a tax professional and current IRS publications.",
    },
    {
      q: "Is a crypto deposit taxable?",
      a: "A deposit is generally not a gambling win. Moving crypto can still have property-tax consequences depending on the token and the transaction. Do not treat this sentence as a ruling on your transfers.",
    },
    {
      q: "Can I deduct crypto gambling losses?",
      a: "Casual gamblers who itemize may be able to deduct losses only with records and only within IRS limits, including the 2026 90% Schedule A cap described in Publication 505. Ask a professional before you claim a number.",
    },
    {
      q: "What records should I keep?",
      a: "Dates, site, token, network, txids, USD value at deposit and withdrawal, and session results. Publication 529 describes diaries and supporting documents for gambling; keep chain evidence too.",
    },
    {
      q: "Does PVPspinArena send a W-2G or tax form?",
      a: "Treat any casino as unlikely to complete your return for you. Keep your own ledger. Ask a tax professional what forms apply to you.",
    },
    {
      q: "Is this tax advice?",
      a: "No. It is general US education. Check local law if you are not a US taxpayer, and use a qualified adviser for your return.",
    },
  ],
  sources: [
    {
      label: "IRS Topic 419: Gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
    {
      label: "IRS Publication 529, Miscellaneous Deductions",
      url: "https://www.irs.gov/publications/p529",
    },
    {
      label: "IRS Publication 505 (2026), Tax Withholding and Estimated Tax",
      url: "https://www.irs.gov/publications/p505",
    },
    {
      label: "IRS: Frequently asked questions on virtual currency transactions",
      url: "https://www.irs.gov/individuals/international-taxpayers/frequently-asked-questions-on-virtual-currency-transactions",
    },
  ],
  related: [
    "what-is-a-crypto-casino",
    "discord-gambling-bot",
    "telegram-casino-bot",
    "kick-gambling-streamers",
    "twitch-slots-ban",
    "gambling-loss-deduction",
    "report-gambling-winnings",
    "gambling-winnings-tax-canada",
    "gambling-tax-australia",
    "does-metamask-report-to-irs",
  ],
  updated: "2026-11-26",
};
