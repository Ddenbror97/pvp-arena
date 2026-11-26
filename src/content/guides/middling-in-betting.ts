import type { Guide } from "./types";

export const guide: Guide = {
  slug: "middling-in-betting",
  cluster: "Sports betting",
  keyword: "middling",
  secondary: ["betting a middle", "middle in sports betting", "line movement gap"],
  title: "Middling in Betting: Two Lines, Costs and Risk",
  description:
    "See how middling uses overlapping spreads or totals, calculate a two-ticket example, and check juice, push boundaries and the risk of an unfilled leg.",
  h1: "Middling in betting: when two tickets can both win",
  answer:
    "Middling in betting means holding opposing bets at different lines so a range of final results wins both tickets. For example, favorite -2.5 and underdog +4.5 both win if the favorite wins by three or four. Outside that range, one wins and one loses. The cost of those ordinary outcomes must be weighed against the chance and payout of the middle.",
  facts: [
    "A middle needs overlapping winning ranges, not merely opposite selections.",
    "Both accepted prices determine the cost outside the overlap.",
    "Whole-number boundaries can produce pushes.",
    "The second ticket may become unavailable before it is accepted.",
  ],
  sections: [
    {
      id: "range",
      title: "Find the overlap before calculating profit",
      body: "A favorite -2.5 ticket wins at margins of three or more. An underdog +4.5 ticket wins when the favorite wins by four or fewer, or does not win. Their overlap is therefore exactly three or four points.\n\nTotals work similarly: over 44.5 and under 47.5 both win on totals of 45, 46 or 47. Over 47.5 and under 44.5 have a gap where both lose instead. The order of the lines matters.\n\nCompare [point spreads](/guides/point-spread-explained), [totals](/guides/over-under-betting) and the [sports betting topic](/guides/topics/sports-betting).",
    },
    {
      id: "money",
      title: "Two -110 tickets: all the outcomes",
      body: "Hypothetically risk $110 on favorite -2.5 and another $110 on underdog +4.5, each to win $100 profit. The total stake is $220.\n\n| Favorite’s margin | Ticket results | Net profit |\n| --- | --- | --- |\n| 3 or 4 | Both win | +$200 |\n| 5 or more | Favorite wins, underdog loses | -$10 |\n| 2 or fewer, including a favorite loss | Favorite loses, underdog wins | -$10 |\n\nIf the middle probability is p, the expected profit for this simplified pair is 200p - 10(1-p) = 210p - 10. Break-even is p = 10 / 210 = 4.76%. This is a threshold implied by the example prices; it is not an estimate of how often a real sport lands on those margins. Unequal stakes, different odds or push boundaries change the calculation.",
    },
    {
      id: "boundaries",
      title: "Pushes and mismatched settlement",
      body: "With favorite -3 and underdog +5, a four-point margin wins both ordinary two-way spread bets. At three, the favorite pushes and the underdog wins. At five, the favorite wins and the underdog pushes. Write each boundary separately instead of counting the entire interval as a double win.\n\nBoth tickets must cover the same event and period under compatible rules. One including overtime and one excluding it can produce unexpected results. Voids, venue changes and interruptions also need matching treatment. [Push rules](/guides/push-in-betting) and [voided bets](/guides/void-bet-meaning) explain those distinctions.",
    },
    {
      id: "execution",
      title: "Execution and loss limits",
      body: "A displayed line is not an accepted bet. A price can move, an order can partially fill, or an operator can reject the second stake. Until both legs are accepted, the position is an ordinary directional bet. Confirm receipts and amounts before calculating the combined exposure.\n\nA profitable outcome chart does not prove the middle happens often enough to cover the cost. Use the relevant sport, scoring distribution and market period when assessing frequency. Repeated small losses still consume a bankroll; set a total loss ceiling using [responsible gambling tools](/responsible-gambling).",
    },
  ],
  faqs: [
    {
      q: "Is a middle the same as arbitrage?",
      a: "No. A middle can lose money outside the overlap. Arbitrage aims to cover all outcomes with a positive return after costs, assuming compatible settlement and successful execution.",
    },
    {
      q: "What results win -2.5 and +4.5 together?",
      a: "The favorite must win by three or four. At other margins one of those tickets loses.",
    },
    {
      q: "What is the cost of the two -110 example tickets?",
      a: "With $110 staked on each side, a double win earns $200 profit. One win and one loss costs $10 overall.",
    },
    {
      q: "Can a whole-number boundary push?",
      a: "Yes. Grade each ticket separately at the boundary and apply the operator’s two-way spread rules.",
    },
    {
      q: "Does the 4.76% example predict a sport’s middle rate?",
      a: "No. It is the break-even probability for the stated stakes and prices. A real probability estimate requires appropriate game data.",
    },
  ],
  sources: [
    {
      label: "DraftKings: betting glossary and settlement terms",
      url: "https://support.draftkings.com/dk/en-us/glossary-of-betting-terms?id=kb_article_view&sysparm_article=KB0010398",
    },
    {
      label: "FanDuel Iowa: sportsbook rules, including sport-specific settlement",
      url: "https://policies.fanduel.com/SB/IA/2026-10-29T12-02-28.html",
    },
  ],
  related: [
    "nfl-betting",
    "house-edge",
    "ats-in-betting",
    "nrfi-betting",
    "first-touchdown-scorer-bets",
  ],
  updated: "2026-11-26",
};
