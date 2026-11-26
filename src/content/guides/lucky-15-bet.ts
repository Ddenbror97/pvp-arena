import type { Guide } from "./types";

export const guide: Guide = {
  slug: "lucky-15-bet",
  cluster: "Sports betting",
  keyword: "lucky 15",
  secondary: ["fourfold accumulator", "fifteen line stake", "each-way place terms"],
  title: "Lucky 15 Bet Explained: Lines, Cost and Returns",
  description:
    "A Lucky 15 contains four singles, six doubles, four trebles and a fourfold. Calculate stakes, returns, each-way costs and the effect of one winner.",
  h1: "Lucky 15 bet: fifteen wagers on four selections",
  answer:
    "A Lucky 15 bet combines four selections into 15 wagers: four singles, six doubles, four trebles and one fourfold. A $1 unit therefore costs $15, not $1. Singles mean one winner can produce a return, but that return can still be smaller than the total stake. Each-way doubles the number of staked components.",
  facts: [
    "Four selections produce 15 nonempty combinations.",
    "One winning selection pays only its single unless a separate promotion applies.",
    "An each-way Lucky 15 at a $1 unit normally costs $30.",
    "Place fractions, non-runners and bonuses follow the bookmaker’s specific terms.",
  ],
  sections: [
    {
      id: "lines",
      title: "Count the lines",
      body: "| Bet size | Count | At $1 per line |\n| --- | --- | --- |\n| Singles | 4 | $4 |\n| Doubles | 6 | $6 |\n| Trebles | 4 | $4 |\n| Fourfold | 1 | $1 |\n| Total | 15 | $15 |\n\nA Yankee uses the 11 multiple lines without the four singles. A fourfold alone is only one line. [Parlay betting](/guides/parlay-betting-explained) and [round robins](/guides/round-robin-bet) explain related combination structures.",
    },
    {
      id: "returns",
      title: "An original all-even-money example",
      body: "Assume four independent selections, each decimal 2.00, and $1 per line, with no promotion, push or void. One winner returns $2, a $13 overall loss. Two winners return two singles ($4) plus one double ($4), for $8 and a $7 loss. Three winners return $6 in singles, $12 in doubles and $8 in the treble, totaling $26 and $11 profit. All four return $8 + $24 + $32 + $16 = $80, or $65 profit.\n\nActual odds, deductions and voids change the result. Promotional one-winner or all-winner bonuses are additional terms, not part of the basic combination count.",
    },
    {
      id: "each-way",
      title: "Each-way and non-runner checks",
      body: "An each-way unit funds a win portion and a place portion on each line. At $1 each way across 15 lines, the total outlay is $30. Check each race’s place fraction, paid places, field changes and non-runner deductions; there is no universal place fraction for every race.\n\nRead the operator’s accepted rules for a void leg and any bonus qualification. See [voided bets](/guides/void-bet-meaning) and the [sports betting topic](/guides/topics/sports-betting). Budget for the full ticket using [responsible gambling limits](/responsible-gambling), rather than focusing on the small displayed unit.",
    },
  ],
  faqs: [
    {
      q: "How many wagers are in a Lucky 15?",
      a: "Fifteen: four singles, six doubles, four trebles and one fourfold.",
    },
    {
      q: "Does one winner guarantee profit?",
      a: "No. At example 2.00 odds with $1 units, one winner returns $2 from a $15 ticket, a $13 loss before any separate promotion.",
    },
    {
      q: "What does a $1 each-way Lucky 15 cost?",
      a: "Normally $30: a $1 win part and a $1 place part for each of the 15 lines.",
    },
    {
      q: "Are extra one-winner bonuses automatic?",
      a: "No. They require a specific operator promotion with its own eligibility and payout terms.",
    },
  ],
  sources: [
    {
      label: "DraftKings: betting glossary and settlement terms",
      url: "https://support.draftkings.com/dk/en-us/glossary-of-betting-terms?id=kb_article_view&sysparm_article=KB0010398",
    },
  ],
  related: [
    "parlay-betting-explained",
    "what-is-sports-betting",
    "vig-betting",
    "bonus-bets-explained",
    "double-chance-bet",
  ],
  updated: "2026-11-26",
};
