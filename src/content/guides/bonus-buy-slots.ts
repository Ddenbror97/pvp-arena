import type { Guide } from "./types";

export const guide: Guide = {
  slug: "bonus-buy-slots",
  cluster: "Slots",
  keyword: "bonus buy slots",
  secondary: ["buy bonus feature", "slot bonus buy", "feature buy slots", "ante bet slots"],
  title: "Bonus Buy Slots: Feature Cost and Return Context",
  description:
    "Calculate the full cost of bonus-buy slots, distinguish feature entry from guaranteed profit, and compare mode-specific rules before accepting a purchase.",
  h1: "Bonus Buy Slots: Feature Cost and Return Context",
  related: [
    "free-slots",
    "slot-volatility",
    "crypto-slots",
    "slot-machine-odds",
    "progressive-jackpot-odds",
    "twitch-slots-ban",
    "wanted-dead-or-a-wild",
    "san-quentin-slot",
  ],
  updated: "2026-11-26",
  answer:
    "Bonus buy slots let a player pay a stated price to enter a feature directly. The purchase guarantees the specified entry, not a payout above its cost. Read the price, base-stake unit, feature rules and applicable return configuration before confirming.",
  facts: [
    "A 100x purchase at a $0.20 base stake costs $20.",
    "Distinct bonus modes can have different prices and outcome distributions.",
  ],
  sections: [
    {
      id: "section-1",
      title: "Translate the multiple into money",
      body: "At a $0.50 stake, an illustrative 80x feature costs $40; a 200x feature costs $100. If the first returns $15, its net result is a $25 loss. The base-stake label is not the full amount exposed.",
    },
    {
      id: "section-2",
      title: "Compare the actual feature",
      body: "[Wanted Dead or a Wild](/guides/wanted-dead-or-a-wild) offers distinct bonuses with different wild behaviour. [Extra Chilli](/guides/extra-chilli-slot) uses Feature Drop terminology. Check the exact menu and edition instead of assuming every buy offers the same experience. See the [Slots topic](/guides/topics/slots).",
    },
    {
      id: "section-3",
      title: "Return and spending limits",
      body: "Do not assign a base-game RTP to every purchase unless its rules cover that mode. A hypothetical $40 purchase at 96% RTP has $38.40 theoretical expected return, not a guaranteed floor; [RTP explained](/guides/rtp-explained) covers this calculation. Set a total purchase limit before opening the menu. Fast feature access can compress substantial spending into a few clicks; use [responsible-play breaks](/responsible-gambling) instead of raising the stake after a poor bonus.",
    },
  ],
  faqs: [
    {
      q: "Is the base stake the purchase cost?",
      a: "No. Apply the stated purchase multiple.",
    },
    {
      q: "Does entry guarantee profit?",
      a: "No. A feature can return less than its cost.",
    },
    {
      q: "What is 100x at $0.20?",
      a: "$20.",
    },
    {
      q: "Can base-game RTP be assumed for a buy?",
      a: "Only when its rules explicitly cover that mode.",
    },
  ],
  sources: [
    {
      label: "Hacksaw: distinct bonus entries",
      url: "https://www.hacksawgaming.com/games/wanted-dead-or-a-wild",
    },
    {
      label: "Big Time Gaming: Feature Drop",
      url: "https://www.bigtimegaming.com/games/extra-chilli",
    },
  ],
};
