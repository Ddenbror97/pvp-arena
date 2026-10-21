import type { Guide } from "./types";

export const guide: Guide = {
  slug: "gambling-tax-uk",
  cluster: "Foundations",
  keyword: "gambling tax uk",
  secondary: ["hmrc gambling winnings", "are gambling winnings taxable uk", "remote gaming duty"],
  title: "Gambling Tax UK: What HMRC Tells Casual Players",
  description:
    "HMRC's manual says casual betting is not a trade, so punter profits are not taxed and losses are not relieved. Operators pay duty. Not tax advice.",
  h1: "Gambling tax UK: player winnings and what HMRC publishes",
  answer:
    "Gambling tax UK questions for a casual player start in HMRC's Business Income Manual: betting and gambling, as such, do not constitute a trade. A mere punter is not taxed on the profits and does not get relief for the losses. The operator, not the customer, is the one who registers for gambling duty. That is not a ruling on your own facts.",
  facts: [
    "BIM22015 says betting and gambling as such are not trading, citing Graham v Green.",
    "The same manual says an organised activity that makes profits from the gambling public will normally be trading.",
    "Section 51 of the Taxation of Chargeable Gains Act 1992 says winnings from betting, lotteries, or games with prizes are not chargeable gains.",
    "The Gambling Commission has stated that customer winnings are tax-free and that duty falls on the operator's gross gambling yield.",
    "GOV.UK's gambling-tax registration is for businesses offering betting or gaming, not for a person filing a casual win.",
  ],
  sections: [
    {
      id: "punter",
      title: "What HMRC says about a punter",
      body: `HMRC's Business Income Manual, BIM22015, is the page to open. It says the basic position is that betting and gambling, as such, do not constitute trading. It quotes Rowlatt J in Graham v Green: a bet is an agreement that one person pays another on an event. It also records that courts have not treated a mere punter as carrying on a business. The consequence HMRC states is direct: the punter is not taxable on the profits and receives no relief for the losses.

That is the opposite of the US starting point described on [reporting gambling winnings](/guides/report-gambling-winnings). Do not copy an IRS habit onto a UK return.

The same paragraph draws the line that people skip. An organised activity to make profits out of the gambling public will normally amount to trading. The bookmaker is the example HMRC gives. A person who only stakes is not that person. A person who is in substance running a book is a different question, and this page will not decide which one you are.

This sits in [Foundations](/guides/topics/foundations) next to the other country notes. It is education, not advice. A tax adviser who can see your facts is the person who can apply the manual to you.`,
    },
    {
      id: "gains",
      title: "Winnings are not a capital gain either",
      body: `Section 51 of the Taxation of Chargeable Gains Act 1992 declares that winnings from betting, including pool betting, or from lotteries or games with prizes, are not chargeable gains. No chargeable gain or allowable loss accrues on the disposal of rights to those winnings.

Read that beside BIM22015, not instead of it. One section is about capital gains. The manual is about whether the activity is a trade for income tax. A casual punter is outside both, on the words of those texts. A business that lives off other people's stakes is the case the manual sends the other way.

[Crypto gambling taxes](/guides/crypto-gambling-taxes) is where wallet records come in. A tax-free win can still leave a trail of transfers. Keeping the trail is not the same thing as owing income tax on the win.`,
    },
    {
      id: "duty",
      title: "Duty is the operator's bill",
      body: `The Gambling Commission, answering a freedom-of-information request, said customer winnings in the UK are tax-free regardless of amount, and that tax is levied on the operator's gross gambling yield. GOV.UK's "Register for gambling tax" page is aimed at the business: General Betting Duty, Pool Betting Duty, or Remote Gaming Duty if you offer betting or gaming to people in the UK.

If a site's support chat tells you to pay "your gambling tax" before a withdrawal, that sentence is not BIM22015. It is a reason to stop and check you are on the real domain. [Fake casino sites](/guides/fake-casino-sites) covers the shape of that trick.

Adults 18+ only. Tax status does not make a stake safe. [Responsible gambling](/responsible-gambling) still applies when the money is needed for a bill.`,
    },
    {
      id: "limits",
      title: "What this page refuses to decide",
      body: `It does not tell you whether your company, your syndicate, or your spread-bet account is a trade. BIM22015 points at a further page for spread-bet exceptions and says a spread-bet punter is not normally trading. "Not normally" is HMRC's phrase. Keep it.

It does not cover residency, split years, or crypto that was already a capital asset before you staked it. Those are questions for current HMRC guidance and a qualified adviser.

Country notes that are not this one: [Australian gambling tax](/guides/gambling-tax-australia) and [Canadian gambling winnings tax](/guides/gambling-winnings-tax-canada). Do not mix their rules into a UK return.`,
    },
  ],
  faqs: [
    {
      q: "Does a UK player pay income tax on casual gambling winnings?",
      a: "HMRC's BIM22015 says betting and gambling as such are not a trade, so a mere punter is not taxed on the profits and gets no loss relief. That is not a personal ruling.",
    },
    {
      q: "Are gambling winnings a capital gain in the UK?",
      a: "Section 51 of the Taxation of Chargeable Gains Act 1992 says winnings from betting, lotteries, or games with prizes are not chargeable gains.",
    },
    {
      q: "Who pays UK gambling duty?",
      a: "The operator. GOV.UK tells businesses that offer betting or gaming to people in the UK to register for the relevant duty. The Gambling Commission has said customer winnings are tax-free.",
    },
    {
      q: "Does a large win have to go on a self-assessment return as income?",
      a: "HMRC's manual does not treat a mere punter's win as trading income. If your activity is organised profit from other people's gambling, the same manual says that will normally be trading. Ask an adviser if you are unsure which side you are on.",
    },
    {
      q: "Does this apply to crypto casinos?",
      a: "The punter-versus-trade distinction is about the activity, not the chip. Keep transfer records. Do not assume a wallet makes a win either taxable or invisible.",
    },
  ],
  sources: [
    { label: "HMRC Business Income Manual BIM22015", url: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim22015" },
    { label: "Taxation of Chargeable Gains Act 1992, section 51", url: "https://www.legislation.gov.uk/ukpga/1992/12/section/51" },
    { label: "Gambling Commission: customer winnings", url: "https://www.gamblingcommission.gov.uk/about-us/freedomofinformation/winnings-from-gambling-for-customers" },
    { label: "GOV.UK: register for gambling tax", url: "https://www.gov.uk/register-pay-gambling-tax" },
  ],
  related: ["crypto-gambling-taxes", "report-gambling-winnings", "gambling-tax-australia", "gambling-winnings-tax-canada"],
  updated: "2026-10-21",
};
