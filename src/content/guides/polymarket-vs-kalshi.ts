import type { Guide } from "./types";

export const guide: Guide = {
  slug: "polymarket-vs-kalshi",
  cluster: "Foundations",
  keyword: "polymarket vs kalshi",
  secondary: ["kalshi cftc", "polymarket us", "event contracts"],
  title: "Polymarket vs Kalshi: Event Markets, Not a Casino",
  description:
    "Kalshi has been a CFTC-designated contract market since 2020. Polymarket US was designated in 2025. Offshore and US venues are not the same. Not advice.",
  h1: "Polymarket vs Kalshi: two event venues, check which one you opened",
  answer:
    "Polymarket vs Kalshi is a comparison of event-contract venues, not of casino games. The CFTC designated KalshiEX LLC as a contract market on 3 November 2020 and amended that order on 17 January 2025. It designated QCX LLC, doing business as Polymarket US, on 9 July 2025. An offshore Polymarket site is not that US designation.",
  facts: [
    "Kalshi's CFTC designation is dated 3 November 2020. The 17 January 2025 amendment removed a limit on intermediated futures trading.",
    "Polymarket US is the name QCX LLC uses. The CFTC lists that designation on 9 July 2025.",
    "A Congressional Research Service note describes Polymarket's largest exchange as offshore and the US exchange as a separate, CFTC-approved venue.",
    "Event contracts are priced by traders. They are not a house wheel with a posted RTP.",
    "Fees, blocked countries, and which contracts are listed change. This page does not quote a fee.",
  ],
  sections: [
    {
      id: "designations",
      title: "What the CFTC has actually designated",
      body: `A designated contract market is a US derivatives exchange under the Commodity Exchange Act. The CFTC's industry-filings list is the document, not a blog.

Kalshi's row says the organisation was designated on 3 November 2020. The remark on that row, and the amended order itself, say that on 17 January 2025 the Commission granted Kalshi's petition to modify the order so futures commission merchants may intermediate trades. The amended order also says Kalshi must keep complying with the Act and with DCM core principles, and that the Commission can modify or restrict the designation.

Polymarket US is a different row: QCX LLC, doing business as Polymarket US, designated on 9 July 2025. The remark says QCX LLC operates under that assumed name. If you are not on that venue, you are not on that designation.

This note lives in [Foundations](/guides/topics/foundations) because people search the brand pair. It is not a recommendation to trade either market. [Is Kalshi gambling](/guides/is-kalshi-gambling) takes the classification question. [How Polymarket works](/guides/how-does-polymarket-work) is the mechanics page for that brand.`,
    },
    {
      id: "two-polymarkets",
      title: "Do not treat every Polymarket URL as the US exchange",
      body: `The Congressional Research Service, in "Prediction Markets: Policy Issues for Congress" (IF13187), describes the split in plain language. Kalshi runs a CFTC-regulated exchange. Polymarket's largest prediction-market exchange is described as domiciled offshore and as claiming to block US users, so that offshore exchange is not effectively under CFTC rules. The same note says Polymarket has acquired a smaller CFTC-approved exchange for US customers, which is a dual structure.

That is why "Polymarket" in a headline is not yet a fact. Look at the legal name on the account you opened and match it to the CFTC row. A geo-block, a terms-of-service line, and a designation order are three different sentences.

Contracts on these venues are typically quoted in cents or as a price between zero and one, which people translate into a probability. The translation is a price. It is not a promise that the event will happen that often, and it ignores fees. [Expected value](/guides/expected-value-gambling) is the arithmetic once you know the fee. This page does not know today's fee.`,
    },
    {
      id: "not-a-casino",
      title: "How this differs from a house game",
      body: `A house roulette wheel publishes pockets and a payout. Your result does not depend on another customer's opinion. An event contract is a trade against someone who wants the other side, cleared under the venue's rules, and settled when the venue says the event resolved.

Losing a contract can still wipe the stake. Resolution can be disputed. You may be unable to exit if the book is thin. None of that is fixed by calling the price a probability.

PVPspinArena does not list event contracts. The games it does run are described on [how it works](/how-it-works). Do not use a coinflip as a substitute for a contract you meant to buy, or the reverse.

Adults only. If the position is money you cannot afford to lose, stop. [Responsible gambling](/responsible-gambling) applies even when the product is filed as a derivative.`,
    },
    {
      id: "check",
      title: "A check that stays valid when the brands move",
      body: `Write the legal entity, the URL, and the date. Then open the CFTC designated-contract-market list and see whether that entity is on it. If the row has moved, the row wins and this paragraph is stale.

Do not copy a fee, a geo-block, or a list of allowed contracts from a screenshot. [House edge](/guides/house-edge) will not describe these venues, because they are not priced as a fixed house percentage. If someone sells "Polymarket versus Kalshi" as a profit method, they are selling a story about two order books.`,
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
      a: "This page does not rank them. It tells you which legal entity the CFTC has designated and tells you to read the venue you actually use.",
    },
    {
      q: "Can I trade either market on PVPspinArena?",
      a: "No. This site does not list event contracts.",
    },
  ],
  sources: [
    { label: "CFTC DCM filing: Kalshi", url: "https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/42993" },
    { label: "CFTC amended order of designation, KalshiEX LLC, 17 January 2025", url: "https://www.cftc.gov/filings/documents/2025/orgdcmkexkalshiamord250117.pdf" },
    { label: "CFTC DCM filing: QCX LLC d/b/a Polymarket US", url: "https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizations/49571" },
    { label: "Congressional Research Service, IF13187", url: "https://www.congress.gov/crs-product/IF13187" },
  ],
  related: ["is-kalshi-gambling", "how-does-polymarket-work", "expected-value-gambling", "what-is-a-crypto-casino"],
  updated: "2026-10-21",
};
