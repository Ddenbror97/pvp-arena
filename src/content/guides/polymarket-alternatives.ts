import type { Guide } from "./types";

export const guide: Guide = {
  slug: "polymarket-alternatives",
  cluster: "Prediction markets",
  keyword: "polymarket alternatives",
  secondary: ["compare prediction venues", "event market custody"],
  title: "Polymarket Alternatives: Compare Event Markets",
  h1: "Polymarket alternatives: compare the contract and venue",
  description:
    "Compare alternatives to Polymarket using eligibility, exchange status, contract wording, fees, order-book depth and custody rather than a brand ranking.",
  answer:
    "Polymarket alternatives should be compared by the product you can actually use: eligibility, event definition, resolution source, custody, executable price and total fees. Kalshi and Polymarket US operate in the US exchange framework; Polymarket International has separate access and resolution arrangements. Similar headlines do not make their contracts interchangeable.",
  facts: [
    "Start with the exact exchange entity and eligible location.",
    "Compare the same event, deadline and settlement test.",
    "Check available size at the buy and sell prices.",
    "Include fees and transfer costs in the comparison.",
  ],
  sections: [
    {
      id: "venue",
      title: "Which alternatives are relevant?",
      body: "Kalshi is one comparison for US event contracts. Polymarket US is distinct from the international venue even though they share a brand. A state sportsbook can be a comparison for a sports outcome where licensed, but its ticket is not an exchange share. Free forecasting sites provide another option when the goal is expressing a forecast without staking money. Eligibility comes before catalog size. The [US legal overview](/guides/prediction-market-legal-us) explains why federal registration and state disputes must be checked together.",
    },
    {
      id: "contract",
      title: "Compare the same contract",
      body: "Record who holds the funds, what source resolves the event, its deadline and time zone, the dispute rule, the executable ask and bid, available quantity and total fees. If one market resolves on a media projection and another on certification, the price gap can reflect different contracts rather than a cheap substitute.",
    },
    {
      id: "cost",
      title: "Compare the amount received after costs",
      body: "For an original example, 100 shares at $0.58 cost $58 before fees. The same payoff at $0.57 with $2 of fees costs $59, so the lower sticker price is more expensive. An early exit also depends on the bid, not the last trade.\n\nRead [crypto prediction markets](/guides/crypto-prediction-markets) for the payoff and [Polymarket versus Kalshi](/guides/polymarket-vs-kalshi) for the venue distinction. The [prediction market topic](/guides/topics/prediction-markets) collects related guides. Use [responsible gambling tools](/responsible-gambling) to cap the total amount committed across venues.",
    },
  ],
  faqs: [
    {
      q: "Is Kalshi an alternative to Polymarket?",
      a: "It can be a comparison for event contracts, subject to location and contract access. Compare fees and resolution wording rather than assuming identical products.",
    },
    {
      q: "Is Polymarket US the same venue as International?",
      a: "No. Check the legal entity, terms and product documentation for the venue actually opened.",
    },
    {
      q: "Does a lower price always mean a cheaper trade?",
      a: "No. Fees, available size, transfer costs and different resolution conditions can reverse the apparent advantage.",
    },
    {
      q: "What is an option without money at risk?",
      a: "A free forecasting platform can let you record probabilities and track accuracy without buying paid event contracts.",
    },
  ],
  sources: [
    {
      label: "CFTC: 2026 advisory on event-contract markets",
      url: "https://www.cftc.gov/csl/26-08/download",
    },
    {
      label: "Kalshi: current fee schedule",
      url: "https://kalshi.com/fee-schedule",
    },
    {
      label: "Polymarket International: resolution rules",
      url: "https://help.polymarket.com/en/articles/13364518-how-are-prediction-markets-resolved",
    },
    {
      label: "Polymarket International: trading fees",
      url: "https://help.polymarket.com/en/articles/13364478-trading-fees",
    },
  ],
  related: ["crypto-prediction-markets"],
  updated: "2026-11-26",
};
