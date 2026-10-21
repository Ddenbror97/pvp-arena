import type { Guide } from "./types";

export const guide: Guide = {
  slug: "deposit-match-bonus",
  cluster: "Foundations",
  keyword: "deposit match bonus",
  secondary: ["welcome match bonus", "wagering on deposit match", "bonus cap"],
  title: "Deposit Match Bonus: Wagering Before the Headline",
  description:
    "A deposit match adds a percentage of what you put in, up to a cap, and then locks it behind wagering. The multiple and the base are the price. Not an offer.",
  h1: "Deposit match bonus: the headline percent is not the price",
  answer:
    "A deposit match bonus credits extra chips as a percentage of a deposit, usually up to a cap. The price is the wagering requirement: how much you must stake, on which games, before the bonus or the winnings can be withdrawn. A 100% match on $100 is $100 of extra chips only if the terms say 100% and your deposit qualifies. This site does not sell deposit matches.",
  facts: [
    "The match percent and the cap are both in the terms. A percent without a cap is not yet an offer.",
    "Wagering can be charged on the bonus alone or on the deposit plus the bonus. Those are different amounts of handle.",
    "Game weighting can make a slot count at 100% and a table game at less, or not at all.",
    "Expiry, a maximum cashout, and a list of excluded games are part of the contract.",
    "Declining the match is a valid choice. The game's edge is still there either way.",
    "A UK Gambling Commission licensee must not set wagering above 10 times the bonus funds. A higher multiple in an example is arithmetic, not a UK offer.",
  ],
  sections: [
    {
      id: "arithmetic",
      title: "The arithmetic, labeled as hypothetical",
      body: `Nothing in this section is an offer from PVPspinArena or from any named casino. The numbers are here so the words have a size.

Suppose the terms say "100% up to $200" and you deposit $50. The match is $50, not $200. The cap only matters if you deposit enough to reach it. Deposit $250 under that same sentence and the bonus is $200, not $250.

Now the requirement. "20x bonus" on a $50 bonus is $1,000 of stakes. "20x deposit plus bonus" on a $50 deposit and a $50 bonus is $2,000 of stakes. Same headline, twice the handle. [Casino wagering requirements](/guides/casino-wagering-requirements) is the longer page on that distinction.

If the terms do not say which base they use, you do not have a number. Leave it blank. Do not borrow 20 from this paragraph.

A UK Gambling Commission licensee must not apply a wagering requirement over 10 times the bonus funds. That cap is in social responsibility code 5.1.1. The 20x sums above show how a multiple scales the handle. They are not a lawful UK offer. An operator outside that licence can still print a different multiple. The contract on your screen is the one that counts.`,
    },
    {
      id: "weighting",
      title: "Weighting, expiry, and the max cashout",
      body: `A weighting of 10% on a table game means $10 of wagers count as $1 toward the requirement, if the terms say that. Some games are excluded, and a bet above a posted max can void the bonus. Those lines are easy to miss because they sit under the percent.

Expiry is a clock. Chips that expire are not chips you can withdraw. A maximum cashout means the terms throw away winnings above a ceiling even if you finished the wagering. Write that ceiling down before you opt in.

This is a [Foundations](/guides/topics/foundations) page because the search is about the offer, not about a particular game. [House edge](/guides/house-edge) is the separate price of the game you are told to wager on. The match does not lower that edge. It adds a pile of required stakes in front of a withdrawal.`,
    },
    {
      id: "decline",
      title: "When the match is worse than no match",
      body: `If you planned a short session, the requirement can force a long one. A $50 bonus at 40x is $2,000 of stakes. At a 4% house edge, the expected cost of that handle is about $80, which is more than the $50 you were given, and the path is noisy enough that you may bust before you finish. The 4% is an illustration of the idea, not a measured edge for a named slot. If the game does not show its edge, you cannot finish this sum.

Declining the offer and playing with the cash deposit is often the smaller contract. [Reload bonus casino](/guides/reload-bonus-casino) deals with the later offer, which has the same shape and a different trigger.

Adults only. [Responsible gambling](/responsible-gambling) matters more, not less, when a counter on the screen is telling you to keep staking.`,
    },
    {
      id: "not-here",
      title: "What to read on the operator's page",
      body: `Match percent, cap, wagering base, weighting, expiry, max cashout, max bet, and country limits. If any of those is missing, the offer is incomplete. A banner is not the terms.

PVPspinArena does not attach a deposit match to Jackpot, Coinflip, Roulette, P2P Slott, or poker. The fees those games use are on [the terms](/terms), and they are not a welcome bonus. [What a crypto casino is](/guides/what-is-a-crypto-casino) explains the cashier. It does not list a match.`,
    },
  ],
  faqs: [
    {
      q: "Is a 100% deposit match free money?",
      a: "No. It is extra chips tied to a wagering rule, a cap, and usually an expiry. You still face the game's edge while you clear it.",
    },
    {
      q: "What is the difference between 20x bonus and 20x deposit plus bonus?",
      a: "The first multiplies only the bonus. The second multiplies the deposit and the bonus together, so the required handle is larger. The terms have to say which one.",
    },
    {
      q: "Do all games count equally?",
      a: "Only if the terms say so. Weighting and excluded games are common. A game at 0% does not move the requirement.",
    },
    {
      q: "Should I always take the match?",
      a: "No. If the required stakes are large relative to the bonus, declining it can be the smaller commitment. Compare the handle with the session you actually wanted.",
    },
    {
      q: "Does PVPspinArena offer a deposit match?",
      a: "No. Its public rules describe game fees, not a welcome match.",
    },
  ],
  sources: [
    { label: "UK Gambling Commission LCCP 5.1.1: rewards and bonuses", url: "https://www.gamblingcommission.gov.uk/licensees-and-businesses/lccp/condition/5-1-1-sr-code" },
    { label: "PVPspinArena terms", url: "https://pvpspinarena.com/terms" },
  ],
  related: ["casino-wagering-requirements", "reload-bonus-casino", "house-edge", "what-is-a-crypto-casino"],
  updated: "2026-10-21",
};
