import type { Guide } from "./types";

export const guide: Guide = {
  slug: "crypto-prediction-markets",
  cluster: "Prediction markets",
  keyword: "crypto prediction markets",
  secondary: ["event share markets", "crypto event contracts"],
  title: "Crypto Prediction Markets: Shares and Settlement",
  h1: "Crypto prediction markets: event shares and resolution",
  description:
    "Learn how crypto prediction market shares pay, what a quoted price implies, how resolution works and why fees, liquidity and custody affect the result.",
  answer:
    "Crypto prediction markets let traders buy outcome shares using crypto collateral. In a binary market paying $1 on the winning outcome and $0 on the losing outcome, a Yes share bought for $0.62 can earn $0.38 before fees if Yes wins, or lose $0.62 if No wins. The market’s resolution rules decide the result.",
  facts: [
    "A share’s price and its final settlement value are different.",
    "Quoted probability is an interpretation of price, not a guarantee.",
    "Selling early depends on executable bids and available liquidity.",
    "Crypto collateral adds wallet, network and custody risks.",
  ],
  sections: [
    {
      id: "shares",
      title: "What one share pays",
      body: "For a binary $1 contract, 100 Yes shares bought at $0.62 cost $62 before fees. If Yes resolves, they pay $100 and gross profit is $38. If No resolves, they pay zero and the $62 is lost. A trade before resolution can realize a smaller profit or loss at the available bid.\n\nThe last traded price is not necessarily the price available for 100 shares. Check the order book and total cost. [How Polymarket works](/guides/how-does-polymarket-work) applies this structure to a particular venue.",
    },
    {
      id: "resolution",
      title: "Read the event definition before the headline",
      body: "Identify the exact event, deadline, time zone, named result source and treatment of cancellation or ambiguity. “Candidate wins” can refer to a media call, certification or another defined step. Those are different tests. Polymarket International’s help center describes resolution through UMA under predefined market rules, with a proposal and dispute process. A smart contract cannot remove ambiguity from a badly written question.\n\n[Event-contract legality](/guides/prediction-market-legal-us) and [election prices](/guides/election-betting-odds) cover the legal and political contexts separately.",
    },
    {
      id: "costs",
      title: "Fees, collateral and exits",
      body: "Calculate trading fees, bid–ask spread and network costs in the same unit as the payout. Some markets have taker fees; a blanket zero-fee assumption is unsafe. If collateral is a stablecoin, also consider issuer, custody and network risk. A wallet balance, exchange balance and collateral locked in a contract are different claims.\n\nBefore depositing, check the exact venue and location policy. US and international products can have different rules. Use the [prediction market topic](/guides/topics/prediction-markets) for comparisons and [responsible gambling tools](/responsible-gambling) to keep speculative spending within a fixed limit.",
    },
  ],
  faqs: [
    {
      q: "Does a 62-cent price prove a 62% chance?",
      a: "No. It is a trading price for the specified payoff, influenced by fees, liquidity, participant beliefs and resolution risk.",
    },
    {
      q: "Can a winning share still produce a small net profit?",
      a: "Yes. Purchase price, trading fees and transfer costs reduce the difference between the $1 payout and the cost.",
    },
    {
      q: "Can I always sell before resolution?",
      a: "No. An exit needs a buyer at an acceptable price. Thin liquidity can force a worse price or leave the order unfilled.",
    },
    {
      q: "Does on-chain settlement prove the event result?",
      a: "It can expose transactions and resolution steps. The event still needs the named external source and the contract’s dispute procedure.",
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
      label: "CFTC: 2026 advisory on event-contract markets",
      url: "https://www.cftc.gov/csl/26-08/download",
    },
  ],
  related: ["polymarket-alternatives", "prediction-market-legal-us", "is-crypto-gambling-legal"],
  updated: "2026-11-26",
};
