import type { Guide } from "./types";

export const guide: Guide = {
  slug: "scatter-symbols",
  cluster: "Slots",
  keyword: "scatter symbols",
  secondary: ["scatter pays", "free spins scatter", "scatter vs wild", "slot scatter symbol"],
  title: "Scatter Symbols: Trigger Counts and Payout Rules",
  description:
    "Understand scatter symbols, bonus triggers and scatter pays, with real provider examples showing why position, counts and wild substitution need checking.",
  h1: "Scatter Symbols: Trigger Counts and Payout Rules",
  related: ["slot-paylines-explained", "cluster-pays-slots", "bonus-buy-slots", "rtp-explained"],
  updated: "2026-11-26",
  answer:
    "Scatter symbols are evaluated under special position or count rules rather than an ordinary payline. They may award money, trigger free spins or do both. The required reels, minimum count and whether wilds substitute depend on the specific game.",
  facts: [
    "Sweet Bonanza starts ten free spins from four to six scatters.",
    "Wolf Gold uses three scatters for five free spins.",
  ],
  sections: [
    {
      id: "section-1",
      title: "Anywhere still has a defined scope",
      body: "A paytable can count a symbol across the entire grid or restrict the reels where it can appear. Read that condition rather than treating scatter as a universal promise that every position qualifies. [Paylines](/guides/slot-paylines-explained) explains normal line evaluation.",
    },
    {
      id: "section-2",
      title: "A trigger is not its probability",
      body: "Knowing that four symbols start a feature does not tell you how often four appear. Symbol weights and reel structure determine frequency. Three symbols in [Wolf Gold](/guides/wolf-gold-slot) and four in [Sweet Bonanza](/guides/sweet-bonanza) cannot be compared by count alone. More mechanics are in the [Slots topic](/guides/topics/slots).",
    },
    {
      id: "section-3",
      title: "Money award, free spins and substitutions",
      body: "If a hypothetical scatter payout is 2x total stake on a $0.50 spin, it pays $1. Any free spins awarded alongside it are a separate feature outcome. A wild does not automatically substitute for a scatter. Read the exception list and stop at a pre-set session limit rather than chasing a missing symbol. [Responsible-play tools](/responsible-gambling) can help.",
    },
  ],
  faqs: [
    {
      q: "Do scatters always award free spins?",
      a: "No. Some pay money or activate another feature.",
    },
    {
      q: "Does a smaller trigger count mean a more frequent bonus?",
      a: "Not by itself.",
    },
    {
      q: "Can a wild always replace one?",
      a: "Only if the game’s rules allow it.",
    },
    {
      q: "What is a 2x scatter pay at $0.50?",
      a: "$1.",
    },
  ],
  sources: [
    {
      label: "Pragmatic Play: Sweet Bonanza scatter rules",
      url: "https://www.pragmaticplay.com/en/games/sweet-bonanza-slot/",
    },
    {
      label: "Pragmatic Play: Wolf Gold scatter rules",
      url: "https://www.pragmaticplay.com/en/games/wolf-gold-slot/",
    },
  ],
};
