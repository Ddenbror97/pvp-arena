import type { Guide } from "./types";

export const guide: Guide = {
  slug: "novig-review",
  cluster: "Sports betting",
  keyword: "novig",
  secondary: ["no-vig betting", "sports trading", "event contract price"],
  title: "Novig Review: Exchange Prices, Fees and Orders",
  description:
    "Review Novig’s published exchange fee schedule, maker and taker orders, liquidity and contract settlement, with an original fee calculation example.",
  h1: "Novig review: exchange orders and the current fee schedule",
  answer:
    "Novig’s current help center describes a peer-to-peer event-contract exchange. The published schedule distinguishes fee-free pregame straight trades from taker fees on live and many futures trades, with separate parlay pricing. A no-vig label does not mean every transaction is free. Check the product, order type, executable price and accepted fee.",
  facts: [
    "A maker posts an order that rests; a taker matches an existing order.",
    "Some straight trades are fee-free under the reviewed schedule.",
    "Live and many futures taker trades use a probability-based fee formula.",
    "This review uses published documentation, without a funded-account test.",
  ],
  sections: [
    {
      id: "fees",
      title: "What the published schedule says",
      body: "The Novig help article reviewed November 26, 2026 lists no trading fee for pregame straight trades on app, web and API. It lists a live/futures straight taker fee using 0.06 × price × (1 − price) per contract. The page excludes golf and tennis futures from that futures-fee scope and gives a separate formula for parlays. Read the current table and preview for the precise market and route. Maker credits and restrictions are not the same as a guaranteed cash rebate on every order.",
    },
    {
      id: "example",
      title: "An original fee calculation",
      body: "For 100 hypothetical live straight contracts at $0.50, the stated taker formula gives 0.06 × 0.50 × 0.50 × 100 = $1.50 before any applicable rounding. The contracts cost $50 before that fee. If they pay $100 on a winning resolution, gross profit before the fee is $50 and profit after this entry fee is $48.50, excluding other costs.\n\nAt another price, market or order type, recalculate rather than applying $1.50 universally. An order that rests can be unfilled; an order that matches immediately needs enough depth at the quoted price.",
    },
    {
      id: "checks",
      title: "Access, settlement and review limits",
      body: "The operator currently describes its exchange as CFTC-regulated. Verify the exact legal entity and current customer eligibility; a historical sweepstakes description is not a reliable account of the current product. Read the event’s source, period, cancellation and correction rules. A filled position is different from an unfilled order, and an order-book quote is not a promised withdrawal result.\n\nSee [betting exchanges](/guides/betting-exchange-explained), [line shopping](/guides/line-shopping) and [vig](/guides/vig-betting) in the [sports betting topic](/guides/topics/sports-betting). Use [responsible gambling tools](/responsible-gambling) to cap total exposure across resting orders and filled positions.",
    },
  ],
  faqs: [
    {
      q: "Is every Novig trade fee-free?",
      a: "No. The reviewed schedule distinguishes pregame straight trades, live and futures taker trades, and parlays.",
    },
    {
      q: "What is the difference between maker and taker?",
      a: "A maker posts a resting order; a taker matches an order already available. Partial immediate and later fills can have different fee treatment.",
    },
    {
      q: "Does an order guarantee a filled bet?",
      a: "No. A resting order needs a matching counterparty; available size and price can change.",
    },
    {
      q: "Did this review test deposits or withdrawals?",
      a: "No. It reviews current published documentation and provides original arithmetic, without claiming measured payment performance.",
    },
  ],
  sources: [
    {
      label: "Novig: current trading-fee schedule and maker/taker definitions",
      url: "https://support.novig.com/en/articles/16195057-fees-on-novig",
    },
  ],
  related: ["betting-exchange-explained"],
  updated: "2026-11-26",
};
