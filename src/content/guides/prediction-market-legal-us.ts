import type { Guide } from "./types";

export const guide: Guide = {
  slug: "prediction-market-legal-us",
  cluster: "Prediction markets",
  keyword: "prediction market legal us",
  secondary: ["event contracts CFTC", "US prediction market rules"],
  title: "Prediction Market Legal US: Rules and Disputes",
  h1: "Prediction market legal US rules and current disputes",
  description:
    "Understand US prediction market regulation, the CFTC’s role, state disputes and the product, location and contract checks needed before trading.",
  answer:
    "US prediction-market legality depends on the exchange, contract, customer and current court orders. CFTC registration concerns federal derivatives oversight; it does not eliminate disputes with state gambling authorities. As of November 26, 2026, jurisdiction remains contested, including the CFTC’s November 13 lawsuit against Arkansas over event-contract trading.",
  facts: [
    "Federal exchange status and state sportsbook licensing are different authorizations.",
    "One contract type can face restrictions that another does not.",
    "A proposed rule, agency position and final court judgment have different effects.",
    "Platform access is not a legal opinion about every transaction.",
  ],
  sections: [
    {
      id: "framework",
      title: "Start with the exchange and the contract",
      body: "Determine the legal entity operating the exchange, its registration, the type of contract and the customer restrictions. A binary economic-event contract and a sports-related contract can raise different questions. The CFTC’s March 2026 advisory addresses event contracts within the federal exchange framework. It is not a personal permission letter for all products and locations.\n\n[Crypto prediction markets](/guides/crypto-prediction-markets) explains the payoff; [is Kalshi gambling](/guides/is-kalshi-gambling) separates everyday language from regulatory classification.",
    },
    {
      id: "litigation",
      title: "What the 2026 dispute actually establishes",
      body: "On November 13, the CFTC announced a lawsuit seeking to stop Arkansas from restricting trading on CFTC-registered exchanges and imposing civil penalties. That announcement establishes the agency’s asserted jurisdiction and the existence of a dispute. It does not by itself establish that the agency has won or that every state restriction is unenforceable.\n\nCheck the latest applicable order and its scope: parties, products, territory, effective date and any stay or appeal. Avoid treating a preliminary order as a final nationwide judgment.",
    },
    {
      id: "verification",
      title: "What to verify for your location",
      body: "Read the operator’s current eligibility terms and the relevant agency or court material. Confirm whether the restriction concerns all trading, sports contracts, a specific market or new accounts. Identity and geolocation controls are part of access; circumventing a block can violate terms and add legal risk.\n\n[Polymarket versus Kalshi](/guides/polymarket-vs-kalshi) compares product structures, while the [prediction market topic](/guides/topics/prediction-markets) collects related explanations. Seek qualified local advice when the legal position affects a decision to fund an account. Set a spending ceiling with [responsible gambling resources](/responsible-gambling), because event contracts can lose the entire amount paid.",
    },
  ],
  faqs: [
    {
      q: "Does CFTC registration equal a state sportsbook license?",
      a: "No. They concern different regulatory systems; their interaction for certain event contracts is being litigated.",
    },
    {
      q: "Does an available app prove a contract is lawful for me?",
      a: "No. Access is evidence of platform policy, not a definitive ruling about a customer’s circumstances.",
    },
    {
      q: "Does the Arkansas lawsuit settle the issue nationally?",
      a: "No. A filed lawsuit states claims and requested relief. Its current orders, scope and later decisions must be checked.",
    },
    {
      q: "Which source matters more than a promotional legal map?",
      a: "Use the actual regulator record, applicable court order and operator eligibility terms, with their dates and product scope.",
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
  ],
  related: ["crypto-prediction-markets", "is-crypto-gambling-legal"],
  updated: "2026-11-26",
};
