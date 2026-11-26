import type { Guide } from "./types";

export const guide: Guide = {
  slug: "underdog-fantasy-review",
  cluster: "Prediction markets",
  keyword: "underdog fantasy",
  secondary: ["underdog pick em", "underdog best ball", "underdog payouts"],
  title: "Underdog Fantasy Review: Drafts and Pick Formats",
  description:
    "Understand Underdog Fantasy best ball and pick-based formats, how weekly scoring differs from player props and which contest terms determine the cost.",
  h1: "Underdog Fantasy review: best ball and pick-based contests",
  answer:
    "Underdog Fantasy includes drafted fantasy contests such as best ball and separate pick-based products. In best ball, the platform selects the highest-scoring eligible players from your drafted roster at each required position for the scoring period. Pick-based products grade selected outcomes under their own rules. Entry costs, payouts and eligibility depend on the exact contest.",
  facts: [
    "Best ball automates lineup selection within the contest’s roster rules.",
    "A draft position and a player-stat pick are different decisions.",
    "Use the actual contest’s scoring, payout table and advancement rules.",
    "This is a documentation review; no deposit or withdrawal test was performed.",
  ],
  sections: [
    {
      id: "best-ball",
      title: "What best ball automates",
      body: "Underdog’s best ball guidelines describe automatic selection of each entrant’s highest-scoring eligible players at the designated positions for the week. It does not count every player’s score at once or always choose one player’s single best game for the season. Draft quality, roster composition, injuries and the scoring period still matter.\n\nA tournament can have regular-season and playoff advancement stages. Read those stages, the roster requirements and the prize distribution before entering.",
    },
    {
      id: "picks",
      title: "Keep pick-based payout assumptions separate",
      body: "A stat-based pick entry is graded against its own accepted selections and payout rules. A multiplier quoted for another operator, product or promotion is not a usable Underdog price. Record whether a multiplier is total return or profit and what happens to ties and non-participating players.\n\nAs a generic arithmetic example only, a $10 entry returning 6x pays $60 total, or $50 profit. That calculation does not assert that a particular Underdog entry offers 6x.",
    },
    {
      id: "review",
      title: "What to check in the contest details",
      body: "Confirm product availability, minimum age for that product and location, entry fee, maximum entries, scoring, tie rules, payout tiers and withdrawal terms. Best ball and pick-based products can have different eligibility. A promotion does not expand legal access.\n\nCompare [PrizePicks’ formats](/guides/how-does-prizepicks-work), [DFS strategy](/guides/dfs-strategy) and [fantasy payout schedules](/guides/fantasy-football-payouts) through the [prediction market topic](/guides/topics/prediction-markets). Use [responsible gambling limits](/responsible-gambling) for a total contest budget, including entries that remain open for months.",
    },
  ],
  faqs: [
    {
      q: "Does best ball need a manual weekly starting lineup?",
      a: "Under the cited format, eligible starters are selected automatically from the drafted roster at each required position.",
    },
    {
      q: "Does best ball use every player’s best game of the season?",
      a: "No. The scoring period and position requirements matter. Weekly best ball selects eligible scores for that week.",
    },
    {
      q: "Can I use another app’s multiplier for an Underdog entry?",
      a: "No. Use the payout displayed for the actual product and entry.",
    },
    {
      q: "Was this review based on a cash-out test?",
      a: "No. It explains published contest documentation. It does not establish a measured withdrawal speed or customer-service result.",
    },
  ],
  sources: [
    {
      label: "Underdog: best ball contest guidelines",
      url: "https://help.underdogsports.com/en/articles/8991638-best-ball-contest-guidelines",
    },
    {
      label: "Underdog: daily versus best ball scoring",
      url: "https://help.underdogsports.com/en/articles/11159786-daily-vs-best-ball-scoring",
    },
  ],
  related: [
    "how-does-prizepicks-work",
    "prop-bets-explained",
    "dfs-strategy",
    "implied-probability",
  ],
  updated: "2026-11-26",
};
