import type { Guide } from "./types";

export const guide: Guide = {
  slug: "reload-bonus-casino",
  cluster: "Foundations",
  keyword: "reload bonus casino",
  secondary: ["reload match", "second deposit bonus", "wagering on a reload"],
  title: "Reload Bonus Casino Offers: Read the Second Deal",
  description:
    "A reload is a match on a later deposit, not a better edge. It still has a cap, a clock, and wagering. Compare it with not taking it. Not an offer.",
  h1: "Reload bonus casino deals: the second offer is still a contract",
  answer:
    "A reload bonus casino promotion pays extra chips on a deposit after the welcome offer. It does not lower the house edge. It adds wagering, a cap, and a clock. The only useful comparison is against simply not taking it. This site does not run reload offers.",
  facts: [
    "A reload is triggered by a later deposit. It is not a continuation of the welcome match unless the terms say so.",
    "The cap, the percent, and the wagering base are a new set of numbers. Copy them from the live terms.",
    "A weekly reload can expire faster than a welcome offer. The clock is part of the price.",
    "Opting in can restrict withdrawals until the requirement is finished or the bonus is forfeited.",
    "No percent on this page is a current offer. If the terms are closed, the cell stays blank.",
    "UK licensees must not set wagering above 10 times the bonus funds. The 25x figure below is an illustration of the arithmetic, not a UK offer.",
  ],
  sections: [
    {
      id: "second-contract",
      title: "Why the second offer is not the first one",
      body: `The welcome match and the reload are two contracts. Casinos often make the reload smaller, shorter, or restricted to certain days. People treat the word "reload" as a loyalty gift. The terms treat it as a new bonus with its own playthrough.

Open the terms on the day you would deposit. Write the percent, the cap, whether wagering applies to the bonus or to deposit plus bonus, the expiry, and the maximum cashout. [Casino wagering requirements](/guides/casino-wagering-requirements) explains how the base changes the handle. [Deposit match bonus](/guides/deposit-match-bonus) is the welcome version of the same arithmetic. Do not assume the welcome multiple still applies.

This page is in [Foundations](/guides/topics/foundations). It is not a list of brands.`,
    },
    {
      id: "example",
      title: "A hypothetical 50% reload",
      body: `These figures are an illustration, not an offer.

You deposit $100. The terms say 50% up to $50, so the bonus is $50. They say 25x the bonus. The required stakes are $1,250. They say slots count 100% and blackjack counts 10%. A $10 blackjack hand then counts as $1. Clearing the bonus on blackjack would mean $12,500 of blackjack stakes, not $1,250.

If the terms are silent on weighting, you cannot do this sum. Silence is not 100%.

A UK Gambling Commission licensee must not set that multiple above 10 times the bonus funds, under social responsibility code 5.1.1. Twenty-five times is the illustration of a contract that is not a UK offer. The expected cost of the stakes depends on the game's edge, which this page does not invent. A reload that forces you through a high-edge game can cost more than the $50 it added. [House edge](/guides/house-edge) is how to read that cost once the game actually publishes a number.`,
    },
    {
      id: "forfeit",
      title: "Forfeit is part of the design",
      body: `Many terms let you cancel the bonus and forfeit the bonus chips and the winnings tied to them. That can be the right move when the requirement no longer matches the session you wanted. Read whether cancelling also locks the cash deposit. Some contracts do. The sentence is in the terms, not in the email that announced the reload.

A maximum bet while the bonus is active is another forfeit trigger. A single oversized spin can void the lot. If you will not watch the bet size, do not opt in.

Adults only. A countdown is built to keep you staking. [Responsible gambling](/responsible-gambling) is the control that does not expire when the bonus does.`,
    },
    {
      id: "not-this-site",
      title: "This site is not a reload cashier",
      body: `PVPspinArena's [terms](/terms) describe fees on its games. They do not describe a second-deposit match. Do not write to support asking for a reload code. There isn't a product to code.

[What a crypto casino is](/guides/what-is-a-crypto-casino) covers deposits in USDC or ETH on Base and in Bitcoin. A deposit there buys a US-dollar balance, not bonus chips.`,
    },
  ],
  faqs: [
    {
      q: "Does a reload lower the house edge?",
      a: "No. It adds bonus chips and a wagering requirement. The game's edge is unchanged.",
    },
    {
      q: "Is the welcome wagering number still in force?",
      a: "Only if the reload terms say so. Treat the reload as a new contract and copy its own multiple.",
    },
    {
      q: "What if the terms never state the wagering base?",
      a: "Then you do not know the required handle. Do not fill the blank from a banner or from this page.",
    },
    {
      q: "Can I change my mind after opting in?",
      a: "Only if the terms allow a forfeit, and only on the conditions they state. Read whether the cash deposit is released.",
    },
    {
      q: "Does PVPspinArena run reloads?",
      a: "No.",
    },
  ],
  sources: [
    { label: "UK Gambling Commission LCCP 5.1.1: rewards and bonuses", url: "https://www.gamblingcommission.gov.uk/licensees-and-businesses/lccp/condition/5-1-1-sr-code" },
    { label: "PVPspinArena terms", url: "https://pvpspinarena.com/terms" },
  ],
  related: ["deposit-match-bonus", "casino-wagering-requirements", "house-edge", "what-is-a-crypto-casino"],
  updated: "2026-10-21",
};
