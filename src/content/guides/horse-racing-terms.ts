import type { Guide } from "./types";

export const guide: Guide = {
  slug: "horse-racing-terms",
  cluster: "Horse racing",
  keyword: "horse racing terms",
  secondary: ["morning line", "furlong", "exacta and trifecta"],
  title: "Horse Racing Terms: Odds, Pools and Bet Types",
  description:
    "Understand horse racing terms including furlongs, morning lines, tote odds, takeout, win-place-show bets, exactas, trifectas and official results.",
  h1: "Horse racing terms for reading the race card and ticket",
  answer:
    "Horse racing terms describe race conditions, prices and the bet’s winning requirement. A furlong is one eighth of a mile. A morning line is a forecast of betting odds, not a locked-in price. Win requires first, place first or second, and show first, second or third in the usual US format. Exactas and trifectas require the correct finish order.",
  facts: [
    "Eight furlongs equal one mile.",
    "Pari-mutuel odds depend on the relevant betting pool.",
    "A box buys additional finish-order combinations.",
    "The official result and wager rules determine payment.",
  ],
  sections: [
    {
      id: "card",
      title: "Distance and conditions",
      body: "A furlong is 220 yards: six furlongs is three quarters of a mile, and eight furlongs is one mile. Race cards also identify surface, distance and eligibility conditions. A maiden race is for horses that have not yet won under the applicable rules. A scratch removes a horse from the race; it may trigger a refund or a substitution depending on the wager.\n\nUse the actual card for the date and track rather than inferring conditions from a famous race name.",
    },
    {
      id: "pools",
      title: "Morning line, tote and takeout",
      body: "The morning line forecasts where public betting may settle. Tote odds reflect pool betting and can change after you place a pari-mutuel bet. Takeout is the amount retained from a pool before dividends are distributed; it varies by track and wager. The displayed payoff has a base unit, often $1 or $2, which must match the calculation.\n\nFor an illustrative $2 payoff of $14, a $6 winning stake returns three units, or $42 including stake. The profit is $36. [Horse-racing odds](/guides/horse-racing-odds-explained) explains the difference between odds and total return.",
    },
    {
      id: "tickets",
      title: "Win, place, show and combinations",
      body: "NYRA defines win as first, place as first or second, show as first through third, exacta as the first two in order and trifecta as the first three in order. A quinella covers the first two in either order. An exacta box with three horses buys six ordered pairs; at a hypothetical $1 base it costs $6.\n\nSee [win-place-show bets](/guides/win-place-show-betting), [exactas](/guides/exacta-bet) and [trifectas](/guides/trifecta-bet) in the [horse racing topic](/guides/topics/horse-racing). Wait for the official result after an inquiry or objection. Keep the total combination cost within a set limit using [responsible gambling tools](/responsible-gambling).",
    },
  ],
  faqs: [
    {
      q: "How long is a furlong?",
      a: "220 yards, or one eighth of a mile.",
    },
    {
      q: "Is the morning line a guaranteed payout price?",
      a: "No. It is a forecast of betting odds. Pari-mutuel payoffs depend on the final pool.",
    },
    {
      q: "Does a place bet lose if the horse wins?",
      a: "No. Under the usual US definition, place pays for first or second.",
    },
    {
      q: "What does boxing an exacta do?",
      a: "It buys the possible ordered pairs among the selected horses, increasing both coverage and cost.",
    },
  ],
  sources: [
    {
      label: "NYRA: wager definitions, pools and takeout",
      url: "https://www.nyra.com/saratoga/racing/nyra-wagering-info/",
    },
    {
      label: "Equibase: horse-racing glossary",
      url: "https://www.equibase.com/newfan/glossary-full.cfm",
    },
  ],
  related: ["horse-racing-odds-explained", "kentucky-derby-betting", "how-to-bet-on-horse-racing"],
  updated: "2026-11-26",
};
