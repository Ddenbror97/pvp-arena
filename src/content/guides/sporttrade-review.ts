import type { Guide } from "./types";

export const guide: Guide = {
  slug: "sporttrade-review",
  cluster: "Sports betting",
  keyword: "sporttrade",
  secondary: ["sports contracts", "bid and ask", "buy and sell a game"],
  title: "Sporttrade Review: Relaunch Status and Market Costs",
  description:
    "Sporttrade currently advertises a relaunch and a waitlist. Understand bid-ask costs, liquidity and the difference between a market preview and a live order.",
  h1: "Sporttrade review: a relaunch notice is not a live market",
  answer:
    "Sporttrade’s homepage currently says it is relaunching soon and offers a waitlist. This Sporttrade review explains that public status and the costs of a sports-contract market. A preview price is not evidence that an order can be filled, and this is not a funded-account test or a recommendation to deposit.",
  facts: [
    "The homepage checked on November 15, 2026 advertises a forthcoming relaunch and a waitlist.",
    "The site describes a sports marketplace and markets itself as CFTC-regulated; this review does not independently certify that regulatory claim or local eligibility.",
    "Displayed bids and offers illustrate a market interface. They do not establish executable size or access for a particular customer.",
    "Our examples below illustrate spread costs; they are not Sporttrade’s published fee schedule.",
  ],
  sections: [
    {
      id: "status",
      title: "What is available on the public site?",
      body: "The current homepage presents a relaunch notice, a waitlist and information for institutional participants. That differs from an open consumer market with an order ticket you can submit. Treat previous descriptions of the betting app as historical, not a signup instruction for the new product.\n\nBefore relying on any relaunch, check the new terms, supported locations and account requirements. A marketing statement about regulation does not establish that a particular person can trade. The [sports betting guides](/guides/topics/sports-betting) distinguish product structures from local availability.",
    },
    {
      id: "spread",
      title: "A spread can cost money before a separate fee",
      body: "Suppose a hypothetical contract has a best bid of $0.54 and an offer of $0.56. Buying 100 contracts at the offer costs $56. Selling them immediately at the unchanged bid returns $54: a $2 loss before any separate charges.\n\nThat is our arithmetic, not a Sporttrade quote or fee promise. A claim of low commission does not erase the difference between buy and sell prices. [Odds conversion](/guides/odds-converter) use a different convention; compare units before comparing prices.",
    },
    {
      id: "liquidity",
      title: "A displayed price is not a guarantee of execution",
      body: "An order also needs an available counterparty and sufficient size. A small amount at the best quote may not cover the amount you want to trade. Posting your own offer may leave it unmatched.\n\n[Betting exchanges](/guides/betting-exchange-explained) explains matching and liability. A cash-out button, where a product provides one, still needs an execution rule; its label alone does not guarantee a fixed return.",
    },
    {
      id: "scope",
      title: "What this review establishes",
      body: "This is a review of public product information, with a current homepage check. We have not opened a funded account, placed an order, measured slippage or timed a withdrawal. Those experiences cannot be inferred from a screenshot or a regulatory slogan.\n\nFor another market structure, read the [Novig review](/guides/novig-review), whose terms and access must be checked separately. PVPspinArena does not operate Sporttrade or a sportsbook. [Responsible gambling](/responsible-gambling) applies when considering paid play.",
    },
  ],
  faqs: [
    {
      q: "Can I assume Sporttrade is accepting live orders?",
      a: "No. The public homepage checked on November 15, 2026 says relaunching soon and offers a waitlist. Confirm launch status and account eligibility directly before treating any preview as executable.",
    },
    {
      q: "Is the displayed spread the same as commission?",
      a: "No. A spread is the gap between buying and selling prices. Commission is a separate charge. Both can affect the total cost.",
    },
    {
      q: "Does joining a waitlist establish trading eligibility?",
      a: "No. A waitlist expresses interest. It does not establish that an account will be approved or that a product is available in your location.",
    },
    {
      q: "Did this review test deposits or withdrawals?",
      a: "No. It checks public information and explains market arithmetic. It contains no funded-account result or withdrawal-time claim.",
    },
  ],
  sources: [
    {
      label: "Sporttrade: current relaunch notice and marketplace presentation",
      url: "https://getsporttrade.com/",
    },
    {
      label: "Sporttrade: company information",
      url: "https://getsporttrade.com/about/",
    },
  ],
  related: ["novig-review", "betting-exchange-explained", "odds-converter"],
  updated: "2026-11-15",
};
