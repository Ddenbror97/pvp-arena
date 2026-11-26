import type { Guide } from "./types";

export const guide: Guide = {
  slug: "poker-equity-calculator",
  cluster: "Poker",
  keyword: "poker equity calculator",
  secondary: [
    "poker equity calculator rules",
    "poker equity calculator strategy",
    "poker equity calculator tips",
  ],
  title: "Poker Equity Calculator: Ranges, Ties and Pot Odds",
  description:
    "Understand poker equity calculator inputs, weighted ranges and split pots. Compare equity with the actual call price, rake and room rules for analysis tools.",
  h1: "Poker equity calculator: define the range before trusting the number",
  answer:
    "A poker equity calculator estimates your share of a pot at showdown from specified hands or ranges and known board cards. Equity includes the value of ties; it is not simply the chance of winning outright. The output depends on the range weights and cards entered. It does not automatically account for future betting, fold equity or a room’s rake.",
  facts: [
    "Exact hands and weighted ranges answer different questions.",
    "A tie contributes your fraction of the split pot to equity.",
    "Enumeration and simulation are different calculation methods.",
    "Calling decisions also need the price, future action and applicable fees.",
  ],
  sections: [
    {
      id: "what-it-is",
      title: "Enter a complete situation",
      body: `Choose the game variant, enter the known hole cards and board, and remove duplicate or impossible cards. For an opponent range, check which combinations are included and how frequently each is weighted. “Any two cards” is a different assumption from a tight three-betting range.

Use [poker rules](/guides/how-to-play-poker), [range strategy](/guides/texas-holdem-strategy) and the [poker topic](/guides/topics/poker) to establish the situation first.`,
    },
    {
      id: "not-pot-odds",
      title: "Read win, tie and equity separately",
      body: `For a hypothetical set of 1,000 equally weighted heads-up outcomes, suppose there are 600 wins, 100 ties and 300 losses. Equity is (600 + 100/2) / 1,000 = 65%, whereas outright wins are 60%. These are illustrative counts, not a tested hand or tool result.

A simulation samples possible deals and has sampling uncertainty. Exhaustive enumeration counts the legal possibilities under the stated model, but an exact count cannot correct an unrealistic opponent range.`,
    },
    {
      id: "fees",
      title: "Compare with the actual call price",
      body: `If calling $20 would create a final $100 pot, the basic break-even equity is 20% before rake and later action. That shortcut applies when the call closes the betting and equity can be realised as assumed. Future bets, folds and multiple opponents can change the decision.

[Pot odds](/guides/poker-pot-odds) describe the price; equity describes a showdown share. [GTO analysis](/guides/gto-poker-strategy) adds strategic actions and frequencies under its own assumptions.`,
    },
    {
      id: "dollars",
      title: "Apply fees and use the tool within room rules",
      body: `PVPspinArena’s [six-max Hold’em](/poker) charges 5% of the pot only after a flop. A $12 pot with a flop has a $0.60 fee and $11.40 remaining for distribution. A hand ending before a flop has no poker fee. Use the actual fee model when comparing expected values.

Study between sessions if the room prohibits live assistance. A calculator does not authorise a banned display or guarantee that a favourite wins. Keep a loss limit and use [responsible gambling](/responsible-gambling) if analysis is becoming a reason to chase.`,
    },
  ],
  faqs: [
    {
      q: "Is equity just my win percentage?",
      a: "Not when ties are possible. Equity includes the share of split pots as well as outright wins.",
    },
    {
      q: "Why does changing a range change the answer?",
      a: "Different combinations and weights change the legal outcomes being evaluated. The output is conditional on those inputs.",
    },
    {
      q: "Is simulation exact?",
      a: "Simulation samples deals and has sampling uncertainty. Enumeration can count the model’s legal deals exactly, but still depends on valid assumptions.",
    },
    {
      q: "Can I call whenever equity exceeds pot odds?",
      a: "Only after considering whether the call closes action, equity realisation, fees and future betting. A raw showdown number alone may be insufficient.",
    },
    {
      q: "May I use a calculator during a hand?",
      a: "Follow the room’s current assistance policy. A study tool is not permission to use live analysis where it is prohibited.",
    },
  ],
  sources: [
    {
      label: "Pagat — public card-game rules",
      url: "https://www.pagat.com/",
    },
    {
      label: "World Series of Poker",
      url: "https://www.wsop.com/",
    },
  ],
  related: [
    "poker-pot-odds",
    "gto-poker-strategy",
    "texas-holdem-rules",
    "how-to-play-poker",
    "straddle-poker",
  ],
  updated: "2026-11-26",
};
