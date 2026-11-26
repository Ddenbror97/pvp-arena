import type { Guide } from "./types";

export const guide: Guide = {
  slug: "polymarket-vs-kalshi",
  cluster: "Prediction markets",
  keyword: "polymarket vs kalshi",
  secondary: ["kalshi cftc", "polymarket us", "event contracts"],
  title: "Polymarket vs Kalshi: Platforms, Fees and Rules",
  description:
    "Compare Polymarket and Kalshi by legal entity, US versus international access, contract resolution, trading fees, custody and executable prices.",
  h1: "Polymarket vs Kalshi: two event venues, check which one you opened",
  answer:
    "Polymarket vs Kalshi is a comparison of specific exchanges and contracts. Kalshi is a US-regulated event-contract exchange. Polymarket US and Polymarket International are separate products with different documentation and access rules. Compare the exact entity, location eligibility, resolution source, fees and order book before treating two prices as alternatives.",
  facts: [
    "Kalshi's CFTC designation is dated 3 November 2020. The 17 January 2025 amendment removed a limit on intermediated futures trading.",
    "Polymarket US is the name QCX LLC uses. The CFTC lists that designation on 9 July 2025.",
    "A Congressional Research Service note describes Polymarket's largest exchange as offshore and the US exchange as a separate, CFTC-approved venue.",
    "Event contracts are priced by traders. They are not a house wheel with a posted RTP.",
    "Fees, blocked countries, and which contracts are listed change. Compare the current fee schedule for the exact market series and order type.",
  ],
  sections: [
    {
      id: "designations",
      title: "What the CFTC has actually designated",
      body: "A designated contract market is a US derivatives exchange under the Commodity Exchange Act. The CFTC's industry-filings list is the document, not a blog.\n\nKalshi's row says the organisation was designated on 3 November 2020. The remark on that row, and the amended order itself, say that on 17 January 2025 the Commission granted Kalshi's petition to modify the order so futures commission merchants may intermediate trades. The amended order also says Kalshi must keep complying with the Act and with DCM core principles, and that the Commission can modify or restrict the designation.\n\nPolymarket US is a different row: QCX LLC, doing business as Polymarket US, designated on 9 July 2025. The remark says QCX LLC operates under that assumed name. If you are not on that venue, you are not on that designation.\n\nThe [prediction markets topic](/guides/topics/prediction-markets) explains the surrounding contract structures. It is not a recommendation to trade either market. [Is Kalshi gambling](/guides/is-kalshi-gambling) takes the classification question. [How Polymarket works](/guides/how-does-polymarket-work) is the mechanics page for that brand.",
    },
    {
      id: "two-polymarkets",
      title: "Do not treat every Polymarket URL as the US exchange",
      body: 'The Congressional Research Service, in "Prediction Markets: Policy Issues for Congress" (IF13187), describes the split in plain language. Kalshi runs a CFTC-regulated exchange. Polymarket\'s largest prediction-market exchange is described as domiciled offshore and as claiming to block US users, so that offshore exchange is not effectively under CFTC rules. The same note says Polymarket has acquired a smaller CFTC-approved exchange for US customers, which is a dual structure.\n\nThat is why "Polymarket" in a headline is not yet a fact. Look at the legal name on the account you opened and match it to the CFTC row. A geo-block, a terms-of-service line, and a designation order are three different sentences.\n\nContracts on these venues are typically quoted in cents or as a price between zero and one, which people translate into a probability. The translation is a price. It is not a promise that the event will happen that often, and it ignores fees. [Expected value](/guides/expected-value-gambling) is the arithmetic once you know the fee. Use the schedule and order preview in force when the trade is submitted.',
    },
    {
      id: "check",
      title: "A check that stays valid when the brands move",
      body: 'Write the legal entity, the URL, and the date. Then open the CFTC designated-contract-market list and see whether that entity is on it. If the row has moved, the row wins and this paragraph is stale.\n\nDo not copy a fee, a geo-block, or a list of allowed contracts from a screenshot. [House edge](/guides/house-edge) will not describe these venues, because they are not priced as a fixed house percentage. If someone sells "Polymarket versus Kalshi" as a profit method, they are selling a story about two order books.',
    },
    {
      id: "execution",
      title: "Fees and resolution can change the comparison",
      body: "Kalshi publishes a series-aware fee schedule. Polymarket International documents market-specific trading fees and an UMA resolution process; those international rules should not be applied automatically to Polymarket US. Match the event definition and settlement source before comparing prices. A narrow bid-ask spread with little size can still make a larger order expensive.\n\nFor an original example, 50 shares at $0.60 cost $30 before fees. Buying the same payoff at $0.59 saves $0.50 only if additional costs stay below that saving. A contract that settles under a different source is not the same payoff. [How Polymarket works](/guides/how-does-polymarket-work), [crypto prediction markets](/guides/crypto-prediction-markets) and [US legal questions](/guides/prediction-market-legal-us) cover those checks in detail.\n\nUse [responsible gambling tools](/responsible-gambling) to keep spending within an affordable limit.",
    },
  ],
  faqs: [
    {
      q: "Is Kalshi a CFTC-designated contract market?",
      a: "Yes. The CFTC lists KalshiEX LLC as designated on 3 November 2020, with an amended order on 17 January 2025 that permits intermediated futures trading.",
    },
    {
      q: "Is Polymarket the same kind of registration?",
      a: "Polymarket US, which is QCX LLC, was designated on 9 July 2025. A Congressional Research Service brief describes a separate offshore Polymarket exchange that is not that US designation. Check which site you opened.",
    },
    {
      q: "Does the contract price equal the chance the event happens?",
      a: "It is a price traders will pay. Fees, exit liquidity, and disputed resolution sit outside that translation.",
    },
    {
      q: "Which one is better?",
      a: "Compare the cost, eligibility and resolution of the specific contracts. It tells you which legal entity the CFTC has designated and tells you to read the venue you actually use.",
    },
  ],
  sources: [
    {
      label: "CFTC DCM filing: Kalshi",
      url: "https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/42993",
    },
    {
      label: "CFTC amended order of designation, KalshiEX LLC, 17 January 2025",
      url: "https://www.cftc.gov/filings/documents/2025/orgdcmkexkalshiamord250117.pdf",
    },
    {
      label: "CFTC DCM filing: QCX LLC d/b/a Polymarket US",
      url: "https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/49571",
    },
    {
      label: "Congressional Research Service, IF13187",
      url: "https://www.congress.gov/crs-product/IF13187",
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
    {
      label: "CFTC: Arkansas event-contract jurisdiction lawsuit, November 13, 2026",
      url: "https://www.cftc.gov/PressRoom/PressReleases/9325-26",
    },
  ],
  related: ["is-kalshi-gambling", "how-does-polymarket-work", "expected-value-gambling"],
  updated: "2026-11-26",
};
