import type { Guide } from "./types";

export const guide: Guide = {
  slug: "w2g-form",
  cluster: "Foundations",
  keyword: "w2g form",
  secondary: ["form w-2g instructions", "gambling withholding rate", "topic 419 gambling income"],
  title: "W2G Form: 2026 Reporting and Withholding Checks",
  description:
    "Understand Form W-2G reporting, 2026 threshold changes and withholding. Separate a payer's form duty from your own obligation to report gambling income.",
  h1: "W2G form: reporting and withholding are different checks",
  answer:
    "A W2G form is Form W-2G, Certain Gambling Winnings: a payer's report of qualifying gambling payments and withholding. Whether a form is required depends on the game, amount and applicable tests. A missing form does not make winnings tax-free. Use the instructions and thresholds for the payment year rather than an old casino article.",
  facts: [
    "A payer's information-reporting duty is separate from the recipient's taxable income.",
    "IRS 2026 guidance increases the relevant minimum reporting threshold to $2,000 for bingo, slots and keno.",
    "Regular withholding and backup withholding have different triggers.",
    "The 24% withholding rate is not a calculation of every winner's final tax.",
  ],
  sections: [
    {
      id: "income",
      title: "Income reporting does not wait for a form",
      body: "[IRS Topic 419](https://www.irs.gov/taxtopics/tc419) says casual gamblers must report all gambling winnings, including those absent from Form W-2G. Keep a diary and supporting receipts. [Reporting gambling winnings](/guides/report-gambling-winnings) covers that recordkeeping question.\n\nAn operator's failure to issue paperwork is not a tax exemption.",
    },
    {
      id: "threshold",
      title: "Use the payment year and game-specific test",
      body: "The [2026 Publication 505](https://www.irs.gov/publications/p505) identifies the increased $2,000 threshold for bingo, slot machines, keno and certain other winnings. Do not reuse an older $1,200 slot threshold for a 2026 payment.\n\nThe [W-2G instructions](https://www.irs.gov/instructions/iw2g) apply different tests by game. Poker tournaments use the relevant net tournament winnings rather than combining unrelated tournament wins and losses. A single generic casino threshold would obscure these distinctions.",
    },
    {
      id: "withhold",
      title: "Regular withholding and missing-TIN withholding",
      body: "The instructions describe regular withholding at 24% for qualifying winnings under the specified game and proceeds tests. Backup withholding concerns circumstances such as a missing taxpayer identification number and has its own reporting conditions.\n\n[Publication 1099](https://www.irs.gov/publications/p1099) explains that backup withholding can require an information return even below a normal filing threshold. Withholding is a payment toward tax; [the tax calculator illustration](/guides/gambling-tax-calculator) is a separate estimate with explicit assumptions.",
    },
    {
      id: "shared",
      title: "Shared tickets and records to retain",
      body: "The instructions describe Form 5754 for situations where the recipient is not the only winner. The payer uses the information to prepare the appropriate W-2G forms; it is not a replacement for each winner's return.\n\nRetain the game, payment date, wager or buy-in, gross payment, withholding and any corrected form. [Crypto gambling taxes](/guides/crypto-gambling-taxes) adds asset-valuation questions. More filing and operator distinctions are in [Foundations](/guides/topics/foundations). If recovering losses is prompting more play, use [responsible gambling](/responsible-gambling). Individual filing treatment needs the applicable year instructions and qualified advice.",
    },
  ],
  faqs: [
    {
      q: "Does a missing W2G form make a win tax-free?",
      a: "No. IRS Topic 419 requires reporting gambling winnings even when they are absent from a W-2G.",
    },
    {
      q: "Is the old $1,200 slot threshold suitable for 2026?",
      a: "IRS 2026 guidance identifies $2,000 as the relevant increased reporting threshold for bingo, slots and keno.",
    },
    {
      q: "Is 24% withholding my final tax rate?",
      a: "No. Withholding is a prepayment. Your final tax depends on your return and applicable rules.",
    },
    {
      q: "Can all gambling games use the same reporting test?",
      a: "No. Use the game-specific instructions, including the applicable net tournament test for poker.",
    },
    {
      q: "What is Form 5754 used for?",
      a: "It supplies information to a payer when the person receiving a payment is not the only winner, so the appropriate W-2G forms can be prepared.",
    },
  ],
  sources: [
    {
      label: "IRS — Instructions for Forms W-2G and 5754, January 2026",
      url: "https://www.irs.gov/instructions/iw2g",
    },
    {
      label: "IRS — Topic 419, Gambling income and losses",
      url: "https://www.irs.gov/taxtopics/tc419",
    },
    {
      label: "IRS — Publication 505, 2026 withholding guidance",
      url: "https://www.irs.gov/publications/p505",
    },
    {
      label: "IRS — Publication 1099, 2026 information returns",
      url: "https://www.irs.gov/publications/p1099",
    },
  ],
  related: [
    "report-gambling-winnings",
    "gambling-loss-deduction",
    "lottery-taxes",
    "crypto-gambling-taxes",
    "house-edge",
    "is-crypto-gambling-legal",
  ],
  updated: "2026-11-26",
};
