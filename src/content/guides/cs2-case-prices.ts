import type { Guide } from "./types";

export const guide: Guide = {
  slug: "cs2-case-prices",
  cluster: "CS:GO heritage",
  keyword: "cs2 case prices",
  secondary: ["cs2 case price list", "cheapest cases"],
  title: "CS2 Case Prices: Quotes, Fees and Opening Costs",
  description:
    "Read CS2 case prices using the exact container, market and date. Compare buying a skin with opening costs, selling fees and uncertain resale proceeds.",
  h1: "CS2 case prices: compare the full cost rather than a stale quote",
  answer:
    "CS2 case prices are market quotes for containers. They change with supply, demand and the marketplace’s fees. A container price is separate from an opening key and from the resale value of whatever the case contains. Compare the exact case, currency, date and total charges before treating two listings as equivalent.",
  facts: [
    "A case quote and the price of opening it are different amounts.",
    "An asking price is not evidence of a completed sale.",
    "Steam wallet proceeds and withdrawable cash have different uses.",
    "A rare possible item does not establish the average resale return.",
  ],
  sections: [
    {
      id: "what",
      title: "Read a quote with its context",
      body: `Record the container name, marketplace, currency, date, quantity and buyer charges. A low headline ask can be paired with a minimum order or an additional fee. Compare the total amount you would actually pay.

Use [case-opening mechanics](/guides/csgo-case-opening) and [case odds](/guides/cs2-case-odds) in the [CS:GO heritage topic](/guides/topics/csgo-heritage) to separate the container from the outcome.`,
    },
    {
      id: "compared",
      title: "Opening cost is not the skin’s value",
      body: `If a hypothetical case costs $2 and its opening key costs $2.50, the outlay is $4.50 before any additional charge. This illustration is not a current case or key quote. The item’s sale proceeds then depend on the exact drop, wear, market and fees.

Expected resale value requires probabilities for all possible outcomes and net sale values. The price of the most attractive knife is not enough to calculate it. Buying a finished skin is a separate transaction with a known item.`,
    },
    {
      id: "fees",
      title: "Selling and liquidity",
      body: `For a seller, distinguish the listed ask, executed price and net proceeds. Low-volume cases can have a wide spread or take time to sell. A buy order may execute immediately at a lower price.

[Inventory valuation](/guides/cs2-inventory-value) separates estimated value from spendable money. [Steam wallet limits](/guides/steam-wallet-to-cash) explain why an account balance is not automatically a cash withdrawal.`,
    },
    {
      id: "steps",
      title: "A practical price check",
      body: "Compare more than one listing for the identical case, check completed transactions where available, and read the market’s fees and custody terms. Set the budget before opening a series of cases; a rare outcome does not become due after losses. [Responsible gambling](/responsible-gambling) provides limits and support if openings are becoming difficult to stop.",
    },
  ],
  faqs: [
    {
      q: "Which case is cheapest now?",
      a: "That needs a dated market quote, including buyer fees and currency. A static article cannot establish the cheapest current listing.",
    },
    {
      q: "Does the case price include the key?",
      a: "Usually the container and opening key are separate costs. Read the actual checkout before paying.",
    },
    {
      q: "Is an expensive case more profitable to open?",
      a: "Not necessarily. Profitability requires the full outcome distribution, net resale values and total opening costs.",
    },
    {
      q: "Can I withdraw a Steam sale as cash?",
      a: "Steam wallet credit has its own restrictions and is different from a marketplace cash payout.",
    },
    {
      q: "Are the example prices live quotes?",
      a: "No. The $2 case and $2.50 key are hypothetical amounts illustrating the cost calculation.",
    },
  ],
  sources: [
    {
      label: "Steam Subscriber Agreement",
      url: "https://store.steampowered.com/subscriber_agreement/",
    },
    {
      label: "Steam Support: trade and market holds",
      url: "https://help.steampowered.com/en/faqs/view/34A1-EA3F-83ED-54AB",
    },
  ],
  related: [
    "cs2-skin-prices",
    "csgo-case-opening",
    "csfloat-vs-skinport",
    "sell-skins-for-crypto",
    "cs2-case-simulator",
    "tf2-keys",
  ],
  updated: "2026-11-26",
};
