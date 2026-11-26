import type { Guide } from "./types";

export const guide: Guide = {
  slug: "is-kalshi-gambling",
  cluster: "Prediction markets",
  keyword: "is kalshi gambling",
  secondary: ["kalshi gambling or trading", "kalshi cftc", "kalshi state lawsuits"],
  title: "Is Kalshi Gambling? Event Contracts and Risk",
  description:
    "See why Kalshi resembles gambling economically, how CFTC event-contract regulation differs from sportsbook licensing and what state disputes mean.",
  h1: "Is Kalshi gambling?",
  answer:
    "Is Kalshi gambling? Economically, an event contract risks money on an uncertain outcome, so it can resemble a wager. Legally, Kalshi operates in the federal derivatives-exchange framework, while state authorities have disputed certain event contracts under gambling laws. The everyday comparison and the legal classification answer different questions.",
  facts: [
    "A binary winning contract generally pays its stated settlement value.",
    "A losing contract can expire at zero.",
    "Trading fees and the bid–ask spread affect the net result.",
    "Federal oversight does not mean a risk-free investment or universal access.",
  ],
  sections: [
    {
      id: "economics",
      title: "What the trader risks",
      body: "For a hypothetical $1 binary contract bought at $0.60, a winning outcome gives $0.40 gross profit and a losing outcome loses $0.60. Fees reduce the profit and increase the total cost. Selling early can produce another result, depending on the executable bid.\n\nThis is a contingent payoff rather than ownership of a company’s productive assets. It can be used for speculation or a genuine hedge, but the label does not prevent loss or chasing.",
    },
    {
      id: "law",
      title: "How the legal question differs",
      body: "Kalshi is a CFTC-regulated exchange, rather than a state-licensed sportsbook simply because it lists sports events. The conflict over federal and state jurisdiction remains active. The CFTC’s November 2026 Arkansas lawsuit illustrates that dispute; a complaint is not a final nationwide decision. Check the applicable product and customer-location rules.\n\nSee [US prediction-market law](/guides/prediction-market-legal-us), [Polymarket versus Kalshi](/guides/polymarket-vs-kalshi) and [election odds](/guides/election-betting-odds).",
    },
    {
      id: "cost-and-harm",
      title: "Assess cost and behavior separately from the label",
      body: "Read the current series fee schedule, not a blanket claim that every contract is free. A narrow spread, deep order book and clear settlement source are separate questions. Record the amount at risk and the maximum loss before entering a position.\n\nRepeated attempts to recover losses or spending essential money are warning signs regardless of whether the interface says trading or betting. The [prediction market topic](/guides/topics/prediction-markets) explains related products; [responsible gambling resources](/responsible-gambling) provide tools for limits and breaks.",
    },
  ],
  faqs: [
    {
      q: "Can I lose the whole purchase price?",
      a: "Yes. An ordinary losing binary contract settles at zero; fees can add to the cost.",
    },
    {
      q: "Is Kalshi a state sportsbook?",
      a: "Kalshi’s exchange operates under federal derivatives oversight. That differs from a sportsbook licensed by a state gaming regulator.",
    },
    {
      q: "Does a 60-cent contract guarantee a 60% chance?",
      a: "No. It is an executable or displayed price for a defined payoff, influenced by liquidity, fees and trader views.",
    },
    {
      q: "Do legal labels remove gambling-like behavior risks?",
      a: "No. Chasing losses, excessive position sizes and repeated speculative trades can cause harm whatever the product’s classification.",
    },
  ],
  sources: [
    {
      label: "CFTC: 2026 advisory on event-contract markets",
      url: "https://www.cftc.gov/csl/26-08/download",
    },
    {
      label: "CFTC: Arkansas event-contract jurisdiction lawsuit, November 13, 2026",
      url: "https://www.cftc.gov/PressRoom/PressReleases/9325-26",
    },
    {
      label: "Kalshi: current fee schedule",
      url: "https://kalshi.com/fee-schedule",
    },
  ],
  related: ["prediction-market-legal-us", "is-crypto-gambling-legal", "polymarket-vs-kalshi"],
  updated: "2026-11-26",
};
