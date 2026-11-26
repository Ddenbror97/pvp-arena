import type { Guide } from "./types";

export const guide: Guide = {
  slug: "how-does-polymarket-work",
  cluster: "Prediction markets",
  pillar: true,
  keyword: "how does polymarket work",
  secondary: ["polymarket shares", "polymarket usdc", "polymarket odds"],
  title: "How Does Polymarket Work? Shares and Resolution",
  description:
    "Follow a Polymarket trade from a Yes or No share to sale or resolution, with a payout example and checks for fees, liquidity and the correct platform.",
  h1: "How does Polymarket work?",
  answer:
    "How does Polymarket work? Traders buy and sell outcome shares under a market’s written resolution rules. In an ordinary binary $1 market, the winning share pays $1 and the losing share pays $0 at resolution. Buying a Yes share below $1 creates a possible profit if Yes wins, but you can lose the purchase price.",
  facts: [
    "The accepted execution price determines your cost.",
    "A market title is only a summary of its resolution rule.",
    "Polymarket International and Polymarket US are separate products.",
    "A displayed price does not guarantee a fill at that price.",
  ],
  sections: [
    {
      id: "trade",
      title: "A trade from entry to payout",
      body: "In a hypothetical binary market, buying 20 Yes shares at $0.40 costs $8 before fees. A Yes resolution pays $20, giving $12 gross profit. A No resolution pays zero. If you instead sell all 20 at an executable $0.55 bid, you receive $11 and realize $3 before fees.\n\nA limit order controls the worst price you accept but can remain unfilled. A marketable order can execute through several price levels. Inspect the confirmation, filled quantity and average price, not just the headline quote.",
    },
    {
      id: "rules",
      title: "International resolution and disputed outcomes",
      body: "Polymarket International’s help center describes an UMA-based proposal and dispute process. Winning shares settle at $1 and losing shares become worthless under the market’s predefined rule. Read the named source, deadline, exceptions and any clarification before trading. An event can end before the resolution process is complete.\n\nThis description concerns the international documentation. Polymarket US has its own terms, product access and oversight; do not infer that one login, fee schedule or eligibility rule applies to both.",
    },
    {
      id: "before-funding",
      title: "Checks before funding or trading",
      body: "Check which legal entity and domain you are using, whether your location is eligible, what collateral and network are supported, and which trading and transfer fees apply. Use the actual current instructions rather than a remembered token or chain. Never send funds on an unsupported network.\n\nCompare [crypto prediction markets](/guides/crypto-prediction-markets), [Polymarket versus Kalshi](/guides/polymarket-vs-kalshi) and [US legal questions](/guides/prediction-market-legal-us) in the [prediction market topic](/guides/topics/prediction-markets). Set a maximum loss before funding; [responsible gambling tools](/responsible-gambling) can help with that limit.",
    },
  ],
  faqs: [
    {
      q: "What does a winning Yes share pay?",
      a: "In an ordinary binary $1 contract it pays $1 at resolution. Subtract the purchase price and all applicable costs to find net profit.",
    },
    {
      q: "Can I cash out before the result?",
      a: "You can attempt to sell, but the order needs liquidity and an acceptable executable price. There is no guaranteed refund of the purchase price.",
    },
    {
      q: "Who decides whether an international market resolves Yes?",
      a: "The predefined rule identifies the evidence, and Polymarket International documents an UMA proposal and dispute process.",
    },
    {
      q: "Are Polymarket US and International interchangeable?",
      a: "No. Check the exact product’s eligibility, rulebook, collateral and fees. International documentation does not establish US access.",
    },
  ],
  sources: [
    {
      label: "Polymarket International: resolution rules",
      url: "https://help.polymarket.com/en/articles/13364518-how-are-prediction-markets-resolved",
    },
    {
      label: "Polymarket International: trading fees",
      url: "https://help.polymarket.com/en/articles/13364478-trading-fees",
    },
    {
      label: "Polymarket US: trust and market oversight",
      url: "https://polymarket.us/trust",
    },
  ],
  related: [
    "polymarket-alternatives",
    "what-is-usdc",
    "crypto-prediction-markets",
    "election-betting-odds",
  ],
  updated: "2026-11-26",
};
